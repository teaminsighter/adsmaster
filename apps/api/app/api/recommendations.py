"""
AI Recommendations API Endpoints

Provides endpoints for:
- Listing recommendations with filters
- Applying recommendations (execute action)
- Dismissing recommendations
- Undoing applied recommendations

Connected to Supabase database.
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime, timedelta
import json

from ..services.supabase_client import get_supabase_client
from .user_auth import get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/v1/recommendations", tags=["Recommendations"])


# =============================================================================
# Response Models
# =============================================================================

class AffectedEntity(BaseModel):
    type: str
    id: str
    name: str
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None


class Option(BaseModel):
    id: int
    label: str
    action: str
    description: str
    risk: str


class ImpactEstimate(BaseModel):
    monthly_savings: Optional[float] = None
    potential_gain: Optional[float] = None
    summary: str


class Recommendation(BaseModel):
    id: str
    ad_account_id: str
    organization_id: str
    rule_id: str
    type: str
    severity: Literal["critical", "warning", "opportunity", "info"]
    title: str
    description: str
    impact_estimate: ImpactEstimate
    affected_entity: AffectedEntity
    options: List[Option]
    status: Literal["pending", "applied", "dismissed", "expired"]
    confidence: int
    expires_at: str
    created_at: str
    applied_at: Optional[str] = None
    applied_option_id: Optional[int] = None
    dismissed_at: Optional[str] = None
    dismiss_reason: Optional[str] = None


class RecommendationsResponse(BaseModel):
    recommendations: List[Recommendation]
    total: int
    pending: int
    applied: int
    dismissed: int
    total_savings: float
    total_potential_gain: float


class ApplyRequest(BaseModel):
    option_id: int


class ApplyResponse(BaseModel):
    success: bool
    recommendation_id: str
    action_taken: str
    message: str
    can_undo: bool
    undo_expires_at: Optional[str] = None


class DismissRequest(BaseModel):
    reason: Optional[str] = None


class DismissResponse(BaseModel):
    success: bool
    recommendation_id: str
    message: str


class UndoResponse(BaseModel):
    success: bool
    recommendation_id: str
    message: str
    reverted_action: str


class SummaryResponse(BaseModel):
    total: int
    by_severity: dict
    by_type: dict
    total_savings: float
    total_potential_gain: float


# =============================================================================
# Helper Functions
# =============================================================================

def _to_str(val):
    """Convert UUID/datetime to string, handle None."""
    if val is None:
        return None
    return str(val)


def db_row_to_recommendation(row: dict) -> Recommendation:
    """Convert database row to Recommendation model."""
    # Parse options from JSONB
    options = row.get("options") or []
    if isinstance(options, str):
        options = json.loads(options)

    # Build impact estimate
    savings = row.get("estimated_savings_micros")
    if savings:
        savings = savings / 1_000_000  # Convert micros to dollars

    impact_estimate = ImpactEstimate(
        monthly_savings=savings,
        potential_gain=row.get("estimated_conversions_gain"),
        summary=row.get("impact_summary") or ""
    )

    # Build affected entity
    affected_entity = AffectedEntity(
        type=row.get("entity_type") or "keyword",
        id=_to_str(row.get("keyword_id") or row.get("campaign_id")) or "",
        name=row.get("entity_name") or "",
        campaign_id=_to_str(row.get("campaign_id")),
        campaign_name=row.get("campaign_name")
    )

    return Recommendation(
        id=_to_str(row["id"]),
        ad_account_id=_to_str(row["ad_account_id"]),
        organization_id=_to_str(row.get("organization_id")) or "",
        rule_id=row.get("rule_type") or "",
        type=row.get("rule_type") or "",
        severity=row.get("severity") or "warning",
        title=row.get("title") or "",
        description=row.get("description") or "",
        impact_estimate=impact_estimate,
        affected_entity=affected_entity,
        options=[Option(**o) for o in options] if options else [],
        status=row.get("status") or "pending",
        confidence=int(row.get("confidence_score") or 80),
        expires_at=_to_str(row.get("expires_at")) or "",
        created_at=_to_str(row.get("created_at")) or "",
        applied_at=_to_str(row.get("applied_at")),
        applied_option_id=row.get("applied_option_id"),
        dismissed_at=_to_str(row.get("dismissed_at")),
        dismiss_reason=row.get("dismiss_reason"),
    )


def recommendation_to_db_row(rec: dict, organization_id: str = None) -> dict:
    """Convert recommendation dict (from engine) to database row format."""
    impact = rec.get("impact_estimate", {})
    entity = rec.get("affected_entity", {})

    savings_micros = None
    if impact.get("monthly_savings"):
        savings_micros = int(impact["monthly_savings"] * 1_000_000)

    return {
        "id": rec["id"],
        "ad_account_id": rec["ad_account_id"],
        "organization_id": organization_id or rec.get("organization_id"),
        "campaign_id": entity.get("campaign_id"),
        "keyword_id": entity.get("id") if entity.get("type") == "keyword" else None,
        "rule_type": rec.get("type") or rec.get("rule_id"),
        "severity": rec.get("severity"),
        "status": rec.get("status", "pending"),
        "title": rec.get("title"),
        "description": rec.get("description"),
        "confidence_score": rec.get("confidence"),
        "estimated_savings_micros": savings_micros,
        "estimated_conversions_gain": impact.get("potential_gain"),
        "impact_summary": impact.get("summary"),
        "entity_type": entity.get("type"),
        "entity_name": entity.get("name"),
        "campaign_name": entity.get("campaign_name"),
        "options": json.dumps(rec.get("options", [])),
        "expires_at": rec.get("expires_at"),
        "created_at": rec.get("created_at") or datetime.utcnow().isoformat(),
    }


# =============================================================================
# Endpoints
# =============================================================================

@router.get("", response_model=RecommendationsResponse)
async def list_recommendations(
    account_id: Optional[str] = Query(None, description="Filter by ad account ID"),
    severity: Optional[str] = Query(None, description="Filter by severity (critical,warning,opportunity,info)"),
    type: Optional[str] = Query(None, description="Filter by type (pause_keyword,increase_budget,etc)"),
    status: Optional[str] = Query(None, description="Filter by status (pending,applied,dismissed)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """
    List all recommendations with optional filters.

    Supports filtering by account, severity, type, and status.
    Returns summary statistics along with the recommendations.
    Requires authentication - filters by user's organization.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Build query
    query = supabase.table("recommendations").select("*")

    # Always filter by user's organization for security
    if organization_id:
        query = query.eq("organization_id", organization_id)
    if account_id:
        query = query.eq("ad_account_id", account_id)
    if severity:
        severities = severity.split(",")
        query = query.in_("severity", severities)
    if type:
        types = type.split(",")
        query = query.in_("rule_type", types)
    if status:
        statuses = status.split(",")
        query = query.in_("status", statuses)

    # Execute query
    result = query.order("created_at", desc=True).execute()

    all_recs = result.data or []

    # Calculate stats from all matching records (before pagination)
    total = len(all_recs)
    pending = len([r for r in all_recs if r.get("status") == "pending"])
    applied = len([r for r in all_recs if r.get("status") == "applied"])
    dismissed = len([r for r in all_recs if r.get("status") == "dismissed"])

    total_savings = sum(
        (r.get("estimated_savings_micros") or 0) / 1_000_000
        for r in all_recs if r.get("status") == "pending"
    )
    total_potential_gain = sum(
        r.get("estimated_conversions_gain") or 0
        for r in all_recs if r.get("status") == "pending"
    )

    # Apply pagination
    paginated_recs = all_recs[offset:offset + limit]

    # Convert to response model
    recommendations = [db_row_to_recommendation(row) for row in paginated_recs]

    return RecommendationsResponse(
        recommendations=recommendations,
        total=total,
        pending=pending,
        applied=applied,
        dismissed=dismissed,
        total_savings=total_savings,
        total_potential_gain=total_potential_gain,
    )


@router.get("/summary", response_model=SummaryResponse)
async def get_recommendations_summary(
    account_id: Optional[str] = Query(None, description="Filter by ad account ID"),
    current_user: dict = Depends(get_current_user),
):
    """Get summary statistics for recommendations."""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Build query for pending recommendations
    query = supabase.table("recommendations").select("*").eq("status", "pending")

    # Always filter by organization
    if organization_id:
        query = query.eq("organization_id", organization_id)
    if account_id:
        query = query.eq("ad_account_id", account_id)

    result = query.execute()
    recs = result.data or []

    by_severity = {}
    by_type = {}

    for rec in recs:
        sev = rec.get("severity")
        if sev:
            by_severity[sev] = by_severity.get(sev, 0) + 1

        typ = rec.get("rule_type")
        if typ:
            by_type[typ] = by_type.get(typ, 0) + 1

    total_savings = sum(
        (r.get("estimated_savings_micros") or 0) / 1_000_000
        for r in recs
    )
    total_potential_gain = sum(
        r.get("estimated_conversions_gain") or 0
        for r in recs
    )

    return SummaryResponse(
        total=len(recs),
        by_severity=by_severity,
        by_type=by_type,
        total_savings=total_savings,
        total_potential_gain=total_potential_gain,
    )


# =============================================================================
# Undo/Rollback Endpoints (24-hour window) - Must be before /{recommendation_id}
# =============================================================================

class UndoableRecommendation(BaseModel):
    id: str
    title: str
    action_taken: Optional[str]
    applied_at: str
    undo_expires_at: str
    hours_remaining: float
    minutes_remaining: int
    can_undo: bool


class UndoableListResponse(BaseModel):
    recommendations: List[UndoableRecommendation]
    total: int


@router.get("/undoable", response_model=UndoableListResponse)
async def list_undoable_recommendations(
    account_id: Optional[str] = Query(None, description="Filter by ad account ID"),
    current_user: dict = Depends(get_current_user),
):
    """
    List all recommendations that can still be undone.

    Returns recommendations applied within the last 24 hours with time remaining.
    Useful for showing an "Undo" banner or rollback UI.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Get applied recommendations from the last 24 hours
    cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()

    query = supabase.table("recommendations").select("*").eq("status", "applied")

    if organization_id:
        query = query.eq("organization_id", organization_id)
    if account_id:
        query = query.eq("ad_account_id", account_id)

    # Filter by applied_at within 24 hours
    query = query.gte("applied_at", cutoff)

    result = query.order("applied_at", desc=True).execute()

    now = datetime.utcnow()
    undoable = []

    for rec in (result.data or []):
        applied_at_raw = rec.get("applied_at")
        if not applied_at_raw:
            continue

        try:
            # Handle both datetime objects and strings
            if isinstance(applied_at_raw, datetime):
                applied_at = applied_at_raw
                # Make naive if needed for comparison
                if applied_at.tzinfo:
                    now_tz = now.replace(tzinfo=applied_at.tzinfo)
                else:
                    now_tz = now
            else:
                applied_at = datetime.fromisoformat(str(applied_at_raw).replace("Z", ""))
                now_tz = now

            elapsed = now_tz - applied_at
            remaining_seconds = 86400 - elapsed.total_seconds()

            if remaining_seconds <= 0:
                continue

            hours_remaining = remaining_seconds / 3600
            minutes_remaining = int((remaining_seconds % 3600) / 60)
            undo_expires_at = (applied_at + timedelta(hours=24)).isoformat()

            # Get action taken from after_state or options
            action_taken = None
            after_state = rec.get("after_state")
            if isinstance(after_state, str):
                after_state = json.loads(after_state)
            if after_state:
                action_taken = after_state.get("action")

            undoable.append(UndoableRecommendation(
                id=str(rec["id"]),
                title=rec.get("title", ""),
                action_taken=action_taken,
                applied_at=applied_at.isoformat() if isinstance(applied_at, datetime) else str(applied_at_raw),
                undo_expires_at=undo_expires_at,
                hours_remaining=round(hours_remaining, 1),
                minutes_remaining=minutes_remaining,
                can_undo=True,
            ))

        except (ValueError, TypeError) as e:
            continue

    return UndoableListResponse(
        recommendations=undoable,
        total=len(undoable),
    )


@router.get("/undo-history")
async def get_undo_history(
    account_id: Optional[str] = Query(None, description="Filter by ad account ID"),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """
    Get history of undone recommendations.

    Returns recommendations that were applied and then undone.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    query = supabase.table("recommendations").select("*").not_().is_("undone_at", "null")

    if organization_id:
        query = query.eq("organization_id", organization_id)
    if account_id:
        query = query.eq("ad_account_id", account_id)

    result = query.order("undone_at", desc=True).limit(limit).execute()

    history = []
    for rec in (result.data or []):
        before_state = rec.get("before_state")
        after_state = rec.get("after_state")

        if isinstance(before_state, str):
            before_state = json.loads(before_state)
        if isinstance(after_state, str):
            after_state = json.loads(after_state)

        history.append({
            "id": rec["id"],
            "title": rec.get("title"),
            "action_taken": after_state.get("action") if after_state else None,
            "applied_at": rec.get("applied_at"),
            "undone_at": rec.get("undone_at"),
            "before_state": before_state,
            "restored_to": before_state,
        })

    return {
        "history": history,
        "total": len(history),
    }


# =============================================================================
# Single Recommendation Endpoints
# =============================================================================

@router.get("/{recommendation_id}", response_model=Recommendation)
async def get_recommendation(
    recommendation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single recommendation by ID."""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    query = supabase.table("recommendations").select("*").eq("id", recommendation_id)
    if organization_id:
        query = query.eq("organization_id", organization_id)

    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    return db_row_to_recommendation(result.data[0])


class FreshnessCheckResponse(BaseModel):
    allowed: bool
    freshness_hours: Optional[float] = None
    is_stale: bool = False
    should_block: bool = False
    message: Optional[str] = None
    can_force: bool = False


@router.get("/{recommendation_id}/freshness-check", response_model=FreshnessCheckResponse)
async def check_recommendation_freshness(
    recommendation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Check data freshness before applying a recommendation.

    Returns whether the recommendation can be safely applied based on data age.
    Data older than 4 hours will block auto-apply.
    """
    from ..workers.reconciliation_worker import DataFreshnessGuard

    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    guard = DataFreshnessGuard()
    result = await guard.guard_recommendation_apply(recommendation_id)

    return FreshnessCheckResponse(
        allowed=result.get("allowed", False),
        freshness_hours=result.get("freshness", {}).get("freshness_hours"),
        is_stale=result.get("freshness", {}).get("is_stale", False),
        should_block=result.get("freshness", {}).get("should_block", False),
        message=result.get("error") or result.get("warning"),
        can_force=result.get("can_force", False),
    )


@router.post("/{recommendation_id}/apply", response_model=ApplyResponse)
async def apply_recommendation(
    recommendation_id: str,
    request: ApplyRequest,
    background_tasks: BackgroundTasks,
    execute_now: bool = Query(True, description="Execute action immediately (vs just mark as applied)"),
    force: bool = Query(False, description="Force apply even if data is stale (admin override)"),
    current_user: dict = Depends(get_current_user),
):
    """
    Apply a recommendation with the selected option.

    This executes the action (e.g., pause keyword, increase budget)
    and marks the recommendation as applied.

    Args:
        execute_now: If True, executes the action immediately.
                    If False, just marks as applied without executing.
        force: If True, skips freshness check and applies even with stale data.

    Returns undo information - actions can be undone within 24 hours.
    """
    from ..services.recommendations.action_executor import ActionExecutor
    from ..workers.reconciliation_worker import DataFreshnessGuard

    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Check data freshness before applying (Phase 14 critical fix)
    if execute_now and not force:
        guard = DataFreshnessGuard()
        freshness_result = await guard.guard_recommendation_apply(recommendation_id)

        if not freshness_result.get("allowed"):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "stale_data",
                    "message": freshness_result.get("error"),
                    "freshness_hours": freshness_result.get("freshness", {}).get("freshness_hours"),
                    "can_force": freshness_result.get("can_force", False),
                }
            )

    # Get recommendation (with org filter for security)
    query = supabase.table("recommendations").select("*").eq("id", recommendation_id)
    if organization_id:
        query = query.eq("organization_id", organization_id)
    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec = result.data[0]

    if rec.get("status") != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot apply recommendation with status '{rec.get('status')}'"
        )

    # Get options
    options = rec.get("options") or []
    if isinstance(options, str):
        options = json.loads(options)

    option = next((o for o in options if o.get("id") == request.option_id), None)
    if not option:
        raise HTTPException(status_code=400, detail="Invalid option ID")

    # Execute the action using ActionExecutor
    if execute_now:
        executor = ActionExecutor(supabase_client=supabase)
        action_result = await executor.execute_action(
            recommendation_id=recommendation_id,
            option_id=request.option_id,
            organization_id=organization_id
        )

        if not action_result.success:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to execute action: {action_result.error or action_result.message}"
            )

        # Calculate undo expiry (24 hours from now)
        undo_expires = (datetime.utcnow() + timedelta(hours=24)).isoformat()

        return ApplyResponse(
            success=True,
            recommendation_id=recommendation_id,
            action_taken=action_result.message,
            message=f"Successfully executed: {option.get('description')}",
            can_undo=action_result.can_undo,
            undo_expires_at=undo_expires if action_result.can_undo else None,
        )
    else:
        # Just mark as applied without executing
        before_state = {
            "status": rec.get("status"),
            "applied_at": rec.get("applied_at"),
            "applied_option_id": rec.get("applied_option_id"),
        }

        now = datetime.utcnow().isoformat()
        update_result = supabase.table("recommendations").update({
            "status": "applied",
            "applied_at": now,
            "applied_option_id": request.option_id,
            "before_state": json.dumps(before_state),
            "after_state": json.dumps({"action": option.get("action")}),
        }).eq("id", recommendation_id).execute()

        if not update_result.data:
            raise HTTPException(status_code=500, detail="Failed to apply recommendation")

        undo_expires = (datetime.utcnow() + timedelta(hours=24)).isoformat()

        return ApplyResponse(
            success=True,
            recommendation_id=recommendation_id,
            action_taken=option.get("description", "Action applied"),
            message=f"Marked as applied: {option.get('description')} (action not executed)",
            can_undo=True,
            undo_expires_at=undo_expires,
        )


@router.post("/{recommendation_id}/dismiss", response_model=DismissResponse)
async def dismiss_recommendation(
    recommendation_id: str,
    request: DismissRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Dismiss a recommendation.

    Optionally provide a reason for dismissal.
    Dismissed recommendations won't be regenerated for 7 days.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Get recommendation (with org filter for security)
    query = supabase.table("recommendations").select("*").eq("id", recommendation_id)
    if organization_id:
        query = query.eq("organization_id", organization_id)
    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec = result.data[0]

    if rec.get("status") != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot dismiss recommendation with status '{rec.get('status')}'"
        )

    # Update recommendation
    now = datetime.utcnow().isoformat()
    update_result = supabase.table("recommendations").update({
        "status": "dismissed",
        "dismissed_at": now,
        "dismiss_reason": request.reason,
    }).eq("id", recommendation_id).execute()

    if not update_result.data:
        raise HTTPException(status_code=500, detail="Failed to dismiss recommendation")

    return DismissResponse(
        success=True,
        recommendation_id=recommendation_id,
        message="Recommendation dismissed",
    )


@router.post("/{recommendation_id}/undo", response_model=UndoResponse)
async def undo_recommendation(
    recommendation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Undo an applied recommendation.

    Only available within 24 hours of applying.
    Reverts the action and sets the recommendation back to pending.
    """
    from ..services.recommendations.action_executor import ActionExecutor

    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Use ActionExecutor to undo
    executor = ActionExecutor(supabase_client=supabase)
    result = await executor.undo_action(
        recommendation_id=recommendation_id,
        organization_id=organization_id
    )

    if not result.success:
        if result.error == "not_found":
            raise HTTPException(status_code=404, detail="Recommendation not found")
        elif result.error == "invalid_status":
            raise HTTPException(status_code=400, detail=result.message)
        elif result.error == "undo_expired":
            raise HTTPException(status_code=400, detail="Undo window has expired (24 hours)")
        else:
            raise HTTPException(status_code=500, detail=result.message)

    return UndoResponse(
        success=True,
        recommendation_id=recommendation_id,
        message=result.message,
        reverted_action=result.action,
    )


@router.post("/bulk/apply")
async def bulk_apply_recommendations(
    recommendation_ids: List[str],
    option_id: int = Query(..., description="Option ID to apply to all"),
    current_user: dict = Depends(get_current_user),
):
    """Apply multiple recommendations at once with the same option."""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")
    results = []
    now = datetime.utcnow().isoformat()

    for rec_id in recommendation_ids:
        # Get recommendation (with org filter for security)
        query = supabase.table("recommendations").select("*").eq("id", rec_id)
        if organization_id:
            query = query.eq("organization_id", organization_id)
        result = query.execute()

        if not result.data or result.data[0].get("status") != "pending":
            results.append({"id": rec_id, "success": False, "error": "Not found or not pending"})
            continue

        rec = result.data[0]
        options = rec.get("options") or []
        if isinstance(options, str):
            options = json.loads(options)

        option = next((o for o in options if o.get("id") == option_id), None)
        if not option:
            results.append({"id": rec_id, "success": False, "error": "Invalid option"})
            continue

        # Store before state
        before_state = {"status": rec.get("status")}

        # Apply
        supabase.table("recommendations").update({
            "status": "applied",
            "applied_at": now,
            "applied_option_id": option_id,
            "before_state": json.dumps(before_state),
            "after_state": json.dumps({"action": option.get("action")}),
        }).eq("id", rec_id).execute()

        results.append({"id": rec_id, "success": True, "action": option.get("description")})

    return {
        "success": all(r["success"] for r in results),
        "results": results,
        "applied_count": sum(1 for r in results if r["success"]),
    }


@router.post("/bulk/dismiss")
async def bulk_dismiss_recommendations(
    recommendation_ids: List[str],
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Dismiss multiple recommendations at once."""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")
    results = []
    now = datetime.utcnow().isoformat()

    for rec_id in recommendation_ids:
        # Get recommendation (with org filter for security)
        query = supabase.table("recommendations").select("*").eq("id", rec_id)
        if organization_id:
            query = query.eq("organization_id", organization_id)
        result = query.execute()

        if not result.data or result.data[0].get("status") != "pending":
            results.append({"id": rec_id, "success": False, "error": "Not found or not pending"})
            continue

        # Dismiss
        supabase.table("recommendations").update({
            "status": "dismissed",
            "dismissed_at": now,
            "dismiss_reason": reason,
        }).eq("id", rec_id).execute()

        results.append({"id": rec_id, "success": True})

    return {
        "success": all(r["success"] for r in results),
        "results": results,
        "dismissed_count": sum(1 for r in results if r["success"]),
    }


@router.post("/bulk/undo")
async def bulk_undo_recommendations(
    recommendation_ids: List[str],
    current_user: dict = Depends(get_current_user),
):
    """
    Undo multiple applied recommendations at once.

    Only recommendations within the 24-hour undo window can be undone.
    """
    from ..services.recommendations.action_executor import ActionExecutor

    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")
    results = []

    executor = ActionExecutor(supabase_client=supabase)

    for rec_id in recommendation_ids:
        undo_result = await executor.undo_action(
            recommendation_id=rec_id,
            organization_id=organization_id
        )

        if undo_result.success:
            results.append({
                "id": rec_id,
                "success": True,
                "message": undo_result.message,
            })
        else:
            results.append({
                "id": rec_id,
                "success": False,
                "error": undo_result.error or undo_result.message,
            })

    return {
        "success": all(r["success"] for r in results),
        "results": results,
        "undone_count": sum(1 for r in results if r["success"]),
    }


# =============================================================================
# Seed/Generate Endpoints (for initial data or demo)
# =============================================================================

@router.post("/generate")
async def generate_recommendations(
    ad_account_id: str = Query(..., description="Ad account ID to generate for"),
    use_ai: bool = Query(False, description="Use AI to enhance recommendation text"),
    current_user: dict = Depends(get_current_user),
):
    """
    Generate recommendations for an ad account using the recommendation engine.

    This triggers the rule engine to analyze the account and create new recommendations.

    Args:
        ad_account_id: Account to analyze
        use_ai: If True, uses LLM to generate enhanced recommendation text
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if use_ai:
        from ..services.recommendations.ai_engine import AIRecommendationEngine
        engine = AIRecommendationEngine(supabase_client=supabase)
        recs = await engine.generate_recommendations(
            ad_account_id,
            organization_id,
            use_ai_text=True
        )
    else:
        from ..services.recommendations.engine import RecommendationEngine
        engine = RecommendationEngine(supabase_client=supabase)
        recs = await engine.generate_recommendations(ad_account_id, organization_id)

    # Insert into database
    inserted = 0
    for rec in recs:
        db_row = recommendation_to_db_row(rec, organization_id)
        try:
            supabase.table("recommendations").insert(db_row).execute()
            inserted += 1
        except Exception as e:
            # Skip duplicates or errors
            print(f"Error inserting recommendation: {e}")

    return {
        "success": True,
        "generated": len(recs),
        "inserted": inserted,
        "ai_enhanced": use_ai,
        "message": f"Generated {len(recs)} recommendations, inserted {inserted} new ones"
    }


@router.post("/generate-ai")
async def generate_ai_recommendations(
    ad_account_id: str = Query(..., description="Ad account ID to generate for"),
    current_user: dict = Depends(get_current_user),
):
    """
    Generate AI-enhanced recommendations with LLM-generated text.

    Returns recommendations without storing them - preview mode.
    """
    from ..services.recommendations.ai_engine import AIRecommendationEngine

    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    engine = AIRecommendationEngine(supabase_client=supabase)
    recs = await engine.generate_recommendations(
        ad_account_id,
        organization_id,
        use_ai_text=True
    )

    # Convert to response format without storing
    recommendations = []
    for rec in recs:
        recommendations.append({
            **rec,
            "preview": True,  # Mark as preview
        })

    return {
        "success": True,
        "preview": True,
        "recommendations": recommendations,
        "total": len(recommendations),
        "message": f"Generated {len(recommendations)} AI-enhanced recommendations (preview mode)"
    }


@router.get("/account/{account_id}/freshness")
async def get_account_freshness(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get data freshness status for an ad account.

    Returns last sync time, verification status, and whether data is stale.
    """
    from ..workers.reconciliation_worker import DataFreshnessGuard

    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify account belongs to user's organization
    account = supabase.table("ad_accounts").select(
        "id, name, last_sync_at, last_sync_status, last_verified_at"
    ).eq("id", account_id).eq("organization_id", organization_id).execute()

    if not account.data:
        raise HTTPException(status_code=404, detail="Account not found")

    guard = DataFreshnessGuard()
    freshness = await guard.check_freshness(account_id)

    return {
        "account_id": account_id,
        "account_name": account.data[0].get("name"),
        "last_sync_at": account.data[0].get("last_sync_at"),
        "last_sync_status": account.data[0].get("last_sync_status"),
        "last_verified_at": account.data[0].get("last_verified_at"),
        "freshness_hours": freshness.get("freshness_hours"),
        "is_stale": freshness.get("is_stale"),
        "should_block_actions": freshness.get("should_block"),
        "message": freshness.get("message"),
    }


@router.post("/account/{account_id}/reconcile")
async def trigger_reconciliation(
    account_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Trigger reconciliation for an ad account.

    Compares database values against live API values and reports mismatches.
    """
    from ..workers.reconciliation_worker import ReconciliationWorker

    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify account belongs to user's organization
    account = supabase.table("ad_accounts").select(
        "*, ad_platforms(name)"
    ).eq("id", account_id).eq("organization_id", organization_id).execute()

    if not account.data:
        raise HTTPException(status_code=404, detail="Account not found")

    # Run reconciliation
    worker = ReconciliationWorker()
    result = await worker.reconcile_account(account.data[0])

    return {
        "success": True,
        "account_id": account_id,
        "campaigns_checked": result.get("campaigns_checked", 0),
        "mismatches_found": result.get("mismatches_found", 0),
        "mismatches_resolved": result.get("mismatches_resolved", 0),
        "mismatches": result.get("mismatches", []),
        "message": f"Reconciliation complete. Found {result.get('mismatches_found', 0)} mismatches.",
    }


@router.get("/analyze/{entity_type}/{entity_id}")
async def analyze_entity(
    entity_type: str,
    entity_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get AI analysis for a specific entity (campaign, ad set, keyword, ad).

    Returns detailed insights and recommendations.
    """
    from ..services.ai import get_ai_provider

    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Fetch entity data based on type
    entity_data = {}
    metrics = {}

    if entity_type == "campaign":
        result = supabase.table("campaigns").select("*").eq("id", entity_id).execute()
        if result.data:
            entity_data = result.data[0]
            # Get metrics
            metrics_result = supabase.table("metrics_daily").select(
                "impressions, clicks, cost_micros, conversions"
            ).eq("campaign_id", entity_id).execute()
            for m in (metrics_result.data or []):
                metrics["impressions"] = metrics.get("impressions", 0) + m.get("impressions", 0)
                metrics["clicks"] = metrics.get("clicks", 0) + m.get("clicks", 0)
                metrics["cost"] = metrics.get("cost", 0) + m.get("cost_micros", 0) / 1_000_000
                metrics["conversions"] = metrics.get("conversions", 0) + int(m.get("conversions", 0) or 0)

    elif entity_type == "adset" or entity_type == "ad_group":
        result = supabase.table("ad_groups").select("*").eq("id", entity_id).execute()
        if result.data:
            entity_data = result.data[0]

    elif entity_type == "keyword":
        result = supabase.table("keywords").select("*").eq("id", entity_id).execute()
        if result.data:
            entity_data = result.data[0]

    elif entity_type == "ad":
        result = supabase.table("ads").select("*").eq("id", entity_id).execute()
        if result.data:
            entity_data = result.data[0]

    if not entity_data:
        raise HTTPException(status_code=404, detail=f"{entity_type} not found")

    # Generate AI analysis
    try:
        ai_provider = get_ai_provider()

        prompt = f"""Analyze this advertising {entity_type} and provide actionable insights:

Entity: {entity_data.get('name', 'Unknown')}
Status: {entity_data.get('status', 'Unknown')}
Metrics: {json.dumps(metrics, indent=2)}

Provide a JSON response with:
- "health_score": 0-100 rating
- "issues": list of problems found
- "opportunities": list of improvement opportunities
- "recommendations": list of specific actions to take
- "summary": brief overall assessment
"""

        response = await ai_provider.generate_text(
            prompt=prompt,
            system_prompt="You are an expert advertising analyst. Provide actionable insights in JSON format.",
            temperature=0.3,
            max_tokens=500
        )

        # Parse JSON response
        try:
            # Clean and parse
            clean = response.strip()
            if "```json" in clean:
                clean = clean.split("```json")[1].split("```")[0]
            elif "```" in clean:
                clean = clean.split("```")[1]

            start = clean.find("{")
            if start >= 0:
                end = clean.rfind("}") + 1
                clean = clean[start:end]

            analysis = json.loads(clean)
        except json.JSONDecodeError:
            analysis = {
                "health_score": 70,
                "summary": "Analysis generated but could not parse structured response.",
                "raw_analysis": response,
            }

        return {
            "success": True,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_name": entity_data.get("name"),
            "metrics": metrics,
            "analysis": analysis,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "entity_type": entity_type,
            "entity_id": entity_id,
        }
