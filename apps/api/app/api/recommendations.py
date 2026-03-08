"""
AI Recommendations API Endpoints

Provides endpoints for:
- Listing recommendations with filters
- Applying recommendations (execute action)
- Dismissing recommendations
- Undoing applied recommendations
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime
from uuid import uuid4

from ..services.recommendations.engine import MOCK_RECOMMENDATIONS

router = APIRouter(prefix="/api/v1/recommendations", tags=["Recommendations"])


# Response Models
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


# In-memory store for MVP (would be database in production)
_recommendations_store = {rec["id"]: dict(rec) for rec in MOCK_RECOMMENDATIONS}
_undo_history = {}  # rec_id -> previous_state


@router.get("", response_model=RecommendationsResponse)
async def list_recommendations(
    account_id: Optional[str] = Query(None, description="Filter by ad account ID"),
    severity: Optional[str] = Query(None, description="Filter by severity (critical,warning,opportunity,info)"),
    type: Optional[str] = Query(None, description="Filter by type (pause_keyword,increase_budget,etc)"),
    status: Optional[str] = Query(None, description="Filter by status (pending,applied,dismissed)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    List all recommendations with optional filters.

    Supports filtering by account, severity, type, and status.
    Returns summary statistics along with the recommendations.
    """
    recs = list(_recommendations_store.values())

    # Apply filters
    if account_id:
        recs = [r for r in recs if r["ad_account_id"] == account_id]
    if severity:
        severities = severity.split(",")
        recs = [r for r in recs if r["severity"] in severities]
    if type:
        types = type.split(",")
        recs = [r for r in recs if r["type"] in types]
    if status:
        statuses = status.split(",")
        recs = [r for r in recs if r["status"] in statuses]

    # Calculate stats
    total = len(recs)
    pending = len([r for r in recs if r["status"] == "pending"])
    applied = len([r for r in recs if r["status"] == "applied"])
    dismissed = len([r for r in recs if r["status"] == "dismissed"])

    total_savings = sum(
        r["impact_estimate"].get("monthly_savings") or 0
        for r in recs if r["status"] == "pending"
    )
    total_potential_gain = sum(
        r["impact_estimate"].get("potential_gain") or 0
        for r in recs if r["status"] == "pending"
    )

    # Paginate
    recs = recs[offset:offset + limit]

    return RecommendationsResponse(
        recommendations=recs,
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
):
    """Get summary statistics for recommendations."""
    recs = list(_recommendations_store.values())

    if account_id:
        recs = [r for r in recs if r["ad_account_id"] == account_id]

    pending_recs = [r for r in recs if r["status"] == "pending"]

    by_severity = {}
    by_type = {}

    for rec in pending_recs:
        sev = rec["severity"]
        by_severity[sev] = by_severity.get(sev, 0) + 1

        typ = rec["type"]
        by_type[typ] = by_type.get(typ, 0) + 1

    total_savings = sum(
        r["impact_estimate"].get("monthly_savings") or 0
        for r in pending_recs
    )
    total_potential_gain = sum(
        r["impact_estimate"].get("potential_gain") or 0
        for r in pending_recs
    )

    return SummaryResponse(
        total=len(pending_recs),
        by_severity=by_severity,
        by_type=by_type,
        total_savings=total_savings,
        total_potential_gain=total_potential_gain,
    )


@router.get("/{recommendation_id}", response_model=Recommendation)
async def get_recommendation(recommendation_id: str):
    """Get a single recommendation by ID."""
    rec = _recommendations_store.get(recommendation_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return rec


@router.post("/{recommendation_id}/apply", response_model=ApplyResponse)
async def apply_recommendation(
    recommendation_id: str,
    request: ApplyRequest,
    background_tasks: BackgroundTasks,
):
    """
    Apply a recommendation with the selected option.

    This executes the action (e.g., pause keyword, increase budget)
    and marks the recommendation as applied.

    Returns undo information - actions can be undone within 24 hours.
    """
    rec = _recommendations_store.get(recommendation_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if rec["status"] != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot apply recommendation with status '{rec['status']}'"
        )

    # Find the selected option
    option = next((o for o in rec["options"] if o["id"] == request.option_id), None)
    if not option:
        raise HTTPException(status_code=400, detail="Invalid option ID")

    # Store previous state for undo
    _undo_history[recommendation_id] = {
        "previous_status": rec["status"],
        "action": option["action"],
        "entity": rec["affected_entity"],
        "timestamp": datetime.utcnow().isoformat(),
    }

    # Update recommendation status
    rec["status"] = "applied"
    rec["applied_at"] = datetime.utcnow().isoformat()
    rec["applied_option_id"] = request.option_id
    _recommendations_store[recommendation_id] = rec

    # In production, this would actually execute the action via Google Ads API
    # background_tasks.add_task(execute_action, rec, option)

    return ApplyResponse(
        success=True,
        recommendation_id=recommendation_id,
        action_taken=option["description"],
        message=f"Successfully applied: {option['description']}",
        can_undo=True,
        undo_expires_at=(datetime.utcnow().replace(hour=23, minute=59, second=59)).isoformat(),
    )


@router.post("/{recommendation_id}/dismiss", response_model=DismissResponse)
async def dismiss_recommendation(
    recommendation_id: str,
    request: DismissRequest,
):
    """
    Dismiss a recommendation.

    Optionally provide a reason for dismissal.
    Dismissed recommendations won't be regenerated for 7 days.
    """
    rec = _recommendations_store.get(recommendation_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if rec["status"] != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot dismiss recommendation with status '{rec['status']}'"
        )

    rec["status"] = "dismissed"
    rec["dismissed_at"] = datetime.utcnow().isoformat()
    rec["dismiss_reason"] = request.reason
    _recommendations_store[recommendation_id] = rec

    return DismissResponse(
        success=True,
        recommendation_id=recommendation_id,
        message="Recommendation dismissed",
    )


@router.post("/{recommendation_id}/undo", response_model=UndoResponse)
async def undo_recommendation(recommendation_id: str):
    """
    Undo an applied recommendation.

    Only available within 24 hours of applying.
    Reverts the action and sets the recommendation back to pending.
    """
    rec = _recommendations_store.get(recommendation_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if rec["status"] != "applied":
        raise HTTPException(
            status_code=400,
            detail="Can only undo applied recommendations"
        )

    undo_info = _undo_history.get(recommendation_id)
    if not undo_info:
        raise HTTPException(
            status_code=400,
            detail="Undo information not available"
        )

    # Check if undo window has expired (24 hours)
    applied_at = datetime.fromisoformat(rec["applied_at"].replace("Z", "+00:00"))
    now = datetime.utcnow()
    if hasattr(applied_at, 'tzinfo') and applied_at.tzinfo:
        from datetime import timezone
        now = now.replace(tzinfo=timezone.utc)

    # In production, would check 24-hour window
    # For MVP, always allow undo

    # Revert status
    rec["status"] = "pending"
    rec["applied_at"] = None
    rec["applied_option_id"] = None
    _recommendations_store[recommendation_id] = rec

    # Clean up undo history
    del _undo_history[recommendation_id]

    # In production, would revert the actual action via Google Ads API

    return UndoResponse(
        success=True,
        recommendation_id=recommendation_id,
        message="Action successfully reverted",
        reverted_action=undo_info["action"],
    )


@router.post("/bulk/apply")
async def bulk_apply_recommendations(
    recommendation_ids: List[str],
    option_id: int = Query(..., description="Option ID to apply to all"),
):
    """Apply multiple recommendations at once with the same option."""
    results = []

    for rec_id in recommendation_ids:
        rec = _recommendations_store.get(rec_id)
        if not rec or rec["status"] != "pending":
            results.append({"id": rec_id, "success": False, "error": "Not found or not pending"})
            continue

        option = next((o for o in rec["options"] if o["id"] == option_id), None)
        if not option:
            results.append({"id": rec_id, "success": False, "error": "Invalid option"})
            continue

        # Store for undo
        _undo_history[rec_id] = {
            "previous_status": rec["status"],
            "action": option["action"],
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Apply
        rec["status"] = "applied"
        rec["applied_at"] = datetime.utcnow().isoformat()
        rec["applied_option_id"] = option_id
        _recommendations_store[rec_id] = rec

        results.append({"id": rec_id, "success": True, "action": option["description"]})

    return {
        "success": all(r["success"] for r in results),
        "results": results,
        "applied_count": sum(1 for r in results if r["success"]),
    }


@router.post("/bulk/dismiss")
async def bulk_dismiss_recommendations(
    recommendation_ids: List[str],
    reason: Optional[str] = None,
):
    """Dismiss multiple recommendations at once."""
    results = []

    for rec_id in recommendation_ids:
        rec = _recommendations_store.get(rec_id)
        if not rec or rec["status"] != "pending":
            results.append({"id": rec_id, "success": False, "error": "Not found or not pending"})
            continue

        rec["status"] = "dismissed"
        rec["dismissed_at"] = datetime.utcnow().isoformat()
        rec["dismiss_reason"] = reason
        _recommendations_store[rec_id] = rec

        results.append({"id": rec_id, "success": True})

    return {
        "success": all(r["success"] for r in results),
        "results": results,
        "dismissed_count": sum(1 for r in results if r["success"]),
    }
