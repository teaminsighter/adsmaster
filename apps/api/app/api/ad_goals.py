"""
Ad Goals & Alerts API

Provides endpoints for managing performance goals, alerts, and budget pacing.
Updated to use single-metric design matching database schema.
"""
from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import json

from app.api.user_auth import get_current_user
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/v1/goals", tags=["Ad Goals & Alerts"])


# =============================================================================
# Pydantic Models - Goals (Single Metric Design)
# =============================================================================

class GoalCreate(BaseModel):
    """Create a new ad goal."""
    name: str
    description: Optional[str] = None
    metric: str  # spend, revenue, conversions, roas, ctr, cpa, impressions, clicks, leads
    target_value: float
    period_type: str = "monthly"  # daily, weekly, monthly, quarterly, custom
    period_start: date
    period_end: date
    ad_account_id: Optional[str] = None
    campaign_id: Optional[str] = None
    platform: Optional[str] = None  # google, meta


class GoalUpdate(BaseModel):
    """Update an existing goal."""
    name: Optional[str] = None
    description: Optional[str] = None
    target_value: Optional[float] = None
    period_type: Optional[str] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    is_active: Optional[bool] = None


class GoalResponse(BaseModel):
    """Goal with current progress."""
    id: str
    name: str
    description: Optional[str]
    metric: str
    target_value: float
    current_value: float
    progress_pct: float
    period_type: str
    period_start: str  # Keep as string for JSON serialization
    period_end: str
    platform: Optional[str]
    ad_account_id: Optional[str]
    campaign_id: Optional[str]
    status: str  # not_started, in_progress, on_track, at_risk, behind, achieved, failed
    is_active: bool
    last_updated_at: Optional[str]
    created_at: str


class GoalProgress(BaseModel):
    """Detailed progress breakdown for a goal."""
    goal_id: str
    name: str
    metric: str
    target_value: float
    current_value: float
    progress_pct: float
    status: str
    period_start: str
    period_end: str
    days_elapsed: int
    days_total: int
    days_remaining: int
    daily_avg_needed: float
    current_daily_avg: float
    on_track: bool
    history: List[dict]  # [{date, value}]


# =============================================================================
# Pydantic Models - Alerts
# =============================================================================

class AlertCreate(BaseModel):
    """Create a new alert rule."""
    name: str
    description: Optional[str] = None
    metric: str  # spend, cpl, cpa, roas, ctr, conversions, impressions, clicks
    condition: str  # above, below, increases_by, decreases_by, equals
    threshold: float
    time_window: str = "day"  # hour, day, week, month
    check_frequency: str = "hourly"  # hourly, daily
    notification_channels: List[str] = ["email", "in_app"]  # email, slack, sms, in_app
    cooldown_minutes: int = 60
    max_alerts_per_day: int = 10
    ad_account_id: Optional[str] = None
    campaign_id: Optional[str] = None
    platform: Optional[str] = None


class AlertUpdate(BaseModel):
    """Update an alert rule."""
    name: Optional[str] = None
    description: Optional[str] = None
    threshold: Optional[float] = None
    time_window: Optional[str] = None
    check_frequency: Optional[str] = None
    notification_channels: Optional[List[str]] = None
    cooldown_minutes: Optional[int] = None
    max_alerts_per_day: Optional[int] = None
    is_active: Optional[bool] = None


class AlertResponse(BaseModel):
    """Alert rule response."""
    id: str
    name: str
    description: Optional[str]
    metric: str
    condition: str
    threshold: float
    time_window: str
    check_frequency: str
    notification_channels: List[str]
    cooldown_minutes: int
    max_alerts_per_day: int
    platform: Optional[str]
    ad_account_id: Optional[str]
    campaign_id: Optional[str]
    is_active: bool
    is_muted: bool
    muted_until: Optional[str]
    alerts_today: int
    last_checked_at: Optional[str]
    last_triggered_at: Optional[str]
    created_at: str


class AlertHistoryItem(BaseModel):
    """Alert history entry."""
    id: str
    alert_id: str
    alert_name: str
    metric: str
    condition: str
    threshold: float
    triggered_value: float
    previous_value: Optional[float]
    change_pct: Optional[float]
    severity: str  # info, warning, critical
    message: str
    notification_channels: List[str]
    notification_sent: bool
    acknowledged: bool
    acknowledged_at: Optional[str]
    resolved: bool
    resolved_at: Optional[str]
    notes: Optional[str]
    triggered_at: str


# =============================================================================
# Pydantic Models - Budget Pacing
# =============================================================================

class BudgetPacingCreate(BaseModel):
    """Create budget pacing."""
    name: Optional[str] = None
    monthly_budget_micros: int
    ad_account_id: Optional[str] = None
    campaign_id: Optional[str] = None
    platform: Optional[str] = None
    period: Optional[str] = None  # YYYY-MM format, defaults to current month
    alert_threshold_pct: int = 80


class BudgetPacingResponse(BaseModel):
    """Budget pacing status."""
    id: str
    name: Optional[str]
    ad_account_id: Optional[str]
    campaign_id: Optional[str]
    platform: Optional[str]
    period: str
    monthly_budget_micros: int
    total_spent_micros: int
    daily_target_micros: int
    current_pacing_pct: float
    ideal_pacing_pct: float
    days_remaining: int
    projected_spend_micros: int
    status: str  # on_track, over_pace, under_pace, critical_over, critical_under
    alert_threshold_pct: int
    alert_sent: bool
    last_updated_at: Optional[str]
    created_at: str


# =============================================================================
# Helper Functions
# =============================================================================

def parse_notification_channels(data) -> List[str]:
    """Parse notification channels from database (could be string or list)."""
    if isinstance(data, list):
        return data
    if isinstance(data, str):
        try:
            return json.loads(data)
        except:
            return ["email", "in_app"]
    return ["email", "in_app"]


def calculate_goal_status(progress_pct: float, days_elapsed: int, days_total: int) -> str:
    """Calculate goal status based on progress and time elapsed."""
    if days_total == 0:
        return "not_started"

    time_pct = (days_elapsed / days_total) * 100

    if progress_pct >= 100:
        return "achieved"
    elif progress_pct >= time_pct * 0.9:  # Within 10% of expected
        return "on_track"
    elif progress_pct >= time_pct * 0.7:  # 70-90% of expected
        return "at_risk"
    elif progress_pct > 0:
        return "behind"
    else:
        return "not_started"


# =============================================================================
# API Endpoints - Specific Routes MUST come before /{goal_id} wildcard
# =============================================================================

# Forward reference: /summary endpoint (defined later, but routed first)
@router.get("/summary")
async def get_goals_summary(
    user: dict = Depends(get_current_user)
) -> dict:
    """Get summary of goals and alerts for dashboard widget."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    today = date.today()

    # Active goals within date range
    goals_result = supabase.table("ad_goals").select("*").eq("organization_id", org_id).eq("is_active", True).lte("period_start", today.isoformat()).gte("period_end", today.isoformat()).execute()

    active_goals = goals_result.data or []

    achieved = sum(1 for g in active_goals if g.get("status") == "achieved")
    at_risk = sum(1 for g in active_goals if g.get("status") in ("at_risk", "behind"))
    in_progress = sum(1 for g in active_goals if g.get("status") in ("not_started", "in_progress", "on_track"))

    # Top goals (sorted by urgency/progress)
    top_goals = []
    sorted_goals = sorted(active_goals, key=lambda x: x.get("progress_pct", 0))[:5]
    for g in sorted_goals:
        period_end = date.fromisoformat(str(g["period_end"]))
        days_remaining = max(0, (period_end - today).days)
        top_goals.append({
            "id": g["id"],
            "name": g["name"],
            "metric": g["metric"],
            "progress_pct": float(g.get("progress_pct", 0)),
            "status": g.get("status", "not_started"),
            "days_remaining": days_remaining
        })

    # Recent alerts (last 24h)
    since = datetime.utcnow() - timedelta(hours=24)
    alerts_result = supabase.table("alert_history").select("*").eq("organization_id", org_id).gte("triggered_at", since.isoformat()).order("triggered_at", desc=True).limit(10).execute()

    recent_alerts = []
    for a in alerts_result.data or []:
        recent_alerts.append({
            "id": a["id"],
            "alert_name": a.get("alert_name", ""),
            "metric": a["metric"],
            "condition": a["condition"],
            "threshold": float(a["threshold"]),
            "triggered_value": float(a["triggered_value"]),
            "severity": a.get("severity", "warning"),
            "message": a.get("message", ""),
            "triggered_at": a["triggered_at"]
        })

    unread_alerts = sum(1 for a in (alerts_result.data or []) if not a.get("acknowledged", False))

    # Active alerts count
    active_alerts_result = supabase.table("ad_alerts").select("id", count="exact").eq("organization_id", org_id).eq("is_active", True).execute()
    active_alerts = active_alerts_result.count or 0

    # Budget pacing
    period = datetime.utcnow().strftime("%Y-%m")
    pacing_result = supabase.table("budget_pacing").select("status").eq("organization_id", org_id).eq("period", period).execute()

    budget_pacing = {
        "on_track": 0,
        "over_pace": 0,
        "under_pace": 0,
        "critical": 0
    }
    for p in pacing_result.data or []:
        status = p.get("status", "on_track")
        if status in ("critical_over", "critical_under"):
            budget_pacing["critical"] += 1
        elif status in budget_pacing:
            budget_pacing[status] += 1

    return {
        "total_goals": len(active_goals),
        "achieved_goals": achieved,
        "at_risk_goals": at_risk,
        "in_progress_goals": in_progress,
        "active_alerts": active_alerts,
        "unread_alerts": unread_alerts,
        "alerts_triggered_today": len(alerts_result.data or []),
        "budget_pacing": budget_pacing,
        "top_goals": top_goals,
        "recent_alerts": recent_alerts
    }


# =============================================================================
# API Endpoints - Goals
# =============================================================================

@router.get("")
@router.get("/")
async def list_goals(
    status: Optional[str] = None,
    metric: Optional[str] = None,
    platform: Optional[str] = None,
    is_active: Optional[bool] = True,
    limit: int = Query(default=50, ge=1, le=200),
    user: dict = Depends(get_current_user)
) -> dict:
    """List all goals for the organization."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    query = supabase.table("ad_goals").select("*").eq("organization_id", org_id)

    if is_active is not None:
        query = query.eq("is_active", is_active)

    if status:
        query = query.eq("status", status)

    if metric:
        query = query.eq("metric", metric)

    if platform:
        query = query.eq("platform", platform)

    query = query.order("created_at", desc=True).limit(limit)
    result = query.execute()

    goals = []
    for row in result.data or []:
        goals.append(GoalResponse(
            id=str(row["id"]),
            name=row["name"],
            description=row.get("description"),
            metric=row["metric"],
            target_value=float(row.get("target_value", 0)),
            current_value=float(row.get("current_value", 0)),
            progress_pct=float(row.get("progress_pct", 0)),
            period_type=row.get("period_type", "monthly"),
            period_start=str(row["period_start"]),
            period_end=str(row["period_end"]),
            platform=row.get("platform"),
            ad_account_id=str(row["ad_account_id"]) if row.get("ad_account_id") else None,
            campaign_id=str(row["campaign_id"]) if row.get("campaign_id") else None,
            status=row.get("status", "not_started"),
            is_active=row.get("is_active", True),
            last_updated_at=str(row["last_updated_at"]) if row.get("last_updated_at") else None,
            created_at=str(row["created_at"])
        ))

    return {"goals": goals, "total": len(goals)}


@router.post("")
@router.post("/")
async def create_goal(
    goal: GoalCreate,
    user: dict = Depends(get_current_user)
) -> GoalResponse:
    """Create a new performance goal."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    # Validate metric
    valid_metrics = ["spend", "revenue", "conversions", "roas", "ctr", "cpa", "impressions", "clicks", "leads"]
    if goal.metric not in valid_metrics:
        raise HTTPException(status_code=400, detail=f"Invalid metric. Must be one of: {valid_metrics}")

    data = {
        "organization_id": org_id,
        "name": goal.name,
        "description": goal.description,
        "metric": goal.metric,
        "target_value": goal.target_value,
        "current_value": 0,
        "progress_pct": 0,
        "period_type": goal.period_type,
        "period_start": goal.period_start.isoformat(),
        "period_end": goal.period_end.isoformat(),
        "platform": goal.platform,
        "ad_account_id": goal.ad_account_id,
        "campaign_id": goal.campaign_id,
        "status": "not_started",
        "is_active": True,
    }

    result = supabase.table("ad_goals").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create goal")

    row = result.data[0]
    return GoalResponse(
        id=str(row["id"]),
        name=row["name"],
        description=row.get("description"),
        metric=row["metric"],
        target_value=float(row.get("target_value", 0)),
        current_value=float(row.get("current_value", 0)),
        progress_pct=float(row.get("progress_pct", 0)),
        period_type=row.get("period_type", "monthly"),
        period_start=str(row["period_start"]),
        period_end=str(row["period_end"]),
        platform=row.get("platform"),
        ad_account_id=str(row["ad_account_id"]) if row.get("ad_account_id") else None,
        campaign_id=str(row["campaign_id"]) if row.get("campaign_id") else None,
        status=row.get("status", "not_started"),
        is_active=row.get("is_active", True),
        last_updated_at=str(row["last_updated_at"]) if row.get("last_updated_at") else None,
        created_at=str(row["created_at"])
    )


# =============================================================================
# API Endpoints - Alerts (MUST be before /{goal_id} wildcard)
# =============================================================================

@router.get("/alerts")
@router.get("/alerts/")
async def list_alerts(
    is_active: Optional[bool] = True,
    is_muted: Optional[bool] = None,
    metric: Optional[str] = None,
    platform: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    user: dict = Depends(get_current_user)
) -> dict:
    """List all alert rules for the organization."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    query = supabase.table("ad_alerts").select("*").eq("organization_id", org_id)

    if is_active is not None:
        query = query.eq("is_active", is_active)

    if is_muted is not None:
        query = query.eq("is_muted", is_muted)

    if metric:
        query = query.eq("metric", metric)

    if platform:
        query = query.eq("platform", platform)

    query = query.order("created_at", desc=True).limit(limit)
    result = query.execute()

    alerts = []
    for row in result.data or []:
        alerts.append(AlertResponse(
            id=str(row["id"]),
            name=row["name"],
            description=row.get("description"),
            metric=row["metric"],
            condition=row["condition"],
            threshold=float(row["threshold"]),
            time_window=row.get("time_window", "day"),
            check_frequency=row.get("check_frequency", "hourly"),
            notification_channels=parse_notification_channels(row.get("notification_channels")),
            cooldown_minutes=row.get("cooldown_minutes", 60),
            max_alerts_per_day=row.get("max_alerts_per_day", 10),
            platform=row.get("platform"),
            ad_account_id=str(row["ad_account_id"]) if row.get("ad_account_id") else None,
            campaign_id=str(row["campaign_id"]) if row.get("campaign_id") else None,
            is_active=row.get("is_active", True),
            is_muted=row.get("is_muted", False),
            muted_until=str(row["muted_until"]) if row.get("muted_until") else None,
            alerts_today=row.get("alerts_today", 0),
            last_checked_at=str(row["last_checked_at"]) if row.get("last_checked_at") else None,
            last_triggered_at=str(row["last_triggered_at"]) if row.get("last_triggered_at") else None,
            created_at=str(row["created_at"])
        ))

    return {"alerts": alerts, "total": len(alerts)}


# =============================================================================
# API Endpoints - Budget Pacing (MUST be before /{goal_id} wildcard)
# =============================================================================

@router.get("/budget-pacing")
@router.get("/budget-pacing/")
async def list_budget_pacing(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    period: Optional[str] = None,  # YYYY-MM format
    user: dict = Depends(get_current_user)
) -> dict:
    """Get budget pacing for all accounts."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    if not period:
        period = datetime.utcnow().strftime("%Y-%m")

    query = supabase.table("budget_pacing").select("*").eq("organization_id", org_id).eq("period", period)

    if platform:
        query = query.eq("platform", platform)

    if status:
        query = query.eq("status", status)

    result = query.execute()

    pacing = []
    for row in result.data or []:
        pacing.append(BudgetPacingResponse(
            id=str(row["id"]),
            name=row.get("name"),
            ad_account_id=str(row["ad_account_id"]) if row.get("ad_account_id") else None,
            campaign_id=str(row["campaign_id"]) if row.get("campaign_id") else None,
            platform=row.get("platform"),
            period=row["period"],
            monthly_budget_micros=row["monthly_budget_micros"],
            total_spent_micros=row.get("total_spent_micros", 0),
            daily_target_micros=row.get("daily_target_micros", 0),
            current_pacing_pct=float(row.get("current_pacing_pct", 0)),
            ideal_pacing_pct=float(row.get("ideal_pacing_pct", 0)),
            days_remaining=row.get("days_remaining", 0),
            projected_spend_micros=row.get("projected_spend_micros", 0),
            status=row.get("status", "on_track"),
            alert_threshold_pct=row.get("alert_threshold_pct", 80),
            alert_sent=row.get("alert_sent", False),
            last_updated_at=str(row["last_updated_at"]) if row.get("last_updated_at") else None,
            created_at=str(row["created_at"])
        ))

    return {"pacing": pacing, "total": len(pacing)}


# =============================================================================
# API Endpoints - Goal by ID (wildcard route - MUST be after specific routes)
# =============================================================================

@router.get("/{goal_id}")
async def get_goal(
    goal_id: str,
    user: dict = Depends(get_current_user)
) -> GoalResponse:
    """Get a specific goal by ID."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    query = supabase.table("ad_goals").select("*").eq("id", goal_id)
    if org_id:
        query = query.eq("organization_id", org_id)

    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Goal not found")

    row = result.data[0]
    return GoalResponse(
        id=str(row["id"]),
        name=row["name"],
        description=row.get("description"),
        metric=row["metric"],
        target_value=float(row.get("target_value", 0)),
        current_value=float(row.get("current_value", 0)),
        progress_pct=float(row.get("progress_pct", 0)),
        period_type=row.get("period_type", "monthly"),
        period_start=str(row["period_start"]),
        period_end=str(row["period_end"]),
        platform=row.get("platform"),
        ad_account_id=str(row["ad_account_id"]) if row.get("ad_account_id") else None,
        campaign_id=str(row["campaign_id"]) if row.get("campaign_id") else None,
        status=row.get("status", "not_started"),
        is_active=row.get("is_active", True),
        last_updated_at=str(row["last_updated_at"]) if row.get("last_updated_at") else None,
        created_at=str(row["created_at"])
    )


@router.patch("/{goal_id}")
async def update_goal(
    goal_id: str,
    updates: GoalUpdate,
    user: dict = Depends(get_current_user)
) -> GoalResponse:
    """Update a goal."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    data = {"updated_at": datetime.utcnow().isoformat()}
    for field, value in updates.model_dump(exclude_unset=True).items():
        if value is not None:
            if field in ("period_start", "period_end"):
                data[field] = value.isoformat()
            else:
                data[field] = value

    query = supabase.table("ad_goals").update(data).eq("id", goal_id)
    if org_id:
        query = query.eq("organization_id", org_id)

    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Goal not found")

    return await get_goal(goal_id, user)


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a goal."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    query = supabase.table("ad_goals").delete().eq("id", goal_id)
    if org_id:
        query = query.eq("organization_id", org_id)

    query.execute()
    return {"success": True, "message": "Goal deleted"}


@router.get("/{goal_id}/progress")
async def get_goal_progress(
    goal_id: str,
    user: dict = Depends(get_current_user)
) -> GoalProgress:
    """Get detailed progress breakdown for a goal."""
    goal = await get_goal(goal_id, user)

    today = date.today()
    period_start = date.fromisoformat(goal.period_start)
    period_end = date.fromisoformat(goal.period_end)

    days_total = (period_end - period_start).days + 1
    days_elapsed = max(0, min((today - period_start).days + 1, days_total))
    days_remaining = max(0, (period_end - today).days)

    # Calculate daily averages
    target = goal.target_value
    current = goal.current_value

    daily_avg_needed = (target - current) / days_remaining if days_remaining > 0 else 0
    current_daily_avg = current / days_elapsed if days_elapsed > 0 else 0

    on_track = goal.progress_pct >= ((days_elapsed / days_total) * 100 * 0.9) if days_total > 0 else True

    return GoalProgress(
        goal_id=goal.id,
        name=goal.name,
        metric=goal.metric,
        target_value=target,
        current_value=current,
        progress_pct=goal.progress_pct,
        status=goal.status,
        period_start=goal.period_start,
        period_end=goal.period_end,
        days_elapsed=days_elapsed,
        days_total=days_total,
        days_remaining=days_remaining,
        daily_avg_needed=round(daily_avg_needed, 2),
        current_daily_avg=round(current_daily_avg, 2),
        on_track=on_track,
        history=[]  # TODO: Fetch from metrics history
    )


# =============================================================================
# API Endpoints - Alerts
# =============================================================================

@router.get("/alerts")
@router.get("/alerts/")
async def list_alerts(
    is_active: Optional[bool] = True,
    is_muted: Optional[bool] = None,
    metric: Optional[str] = None,
    platform: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    user: dict = Depends(get_current_user)
) -> dict:
    """List all alert rules for the organization."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    query = supabase.table("ad_alerts").select("*").eq("organization_id", org_id)

    if is_active is not None:
        query = query.eq("is_active", is_active)

    if is_muted is not None:
        query = query.eq("is_muted", is_muted)

    if metric:
        query = query.eq("metric", metric)

    if platform:
        query = query.eq("platform", platform)

    query = query.order("created_at", desc=True).limit(limit)
    result = query.execute()

    alerts = []
    for row in result.data or []:
        alerts.append(AlertResponse(
            id=str(row["id"]),
            name=row["name"],
            description=row.get("description"),
            metric=row["metric"],
            condition=row["condition"],
            threshold=float(row["threshold"]),
            time_window=row.get("time_window", "day"),
            check_frequency=row.get("check_frequency", "hourly"),
            notification_channels=parse_notification_channels(row.get("notification_channels")),
            cooldown_minutes=row.get("cooldown_minutes", 60),
            max_alerts_per_day=row.get("max_alerts_per_day", 10),
            platform=row.get("platform"),
            ad_account_id=str(row["ad_account_id"]) if row.get("ad_account_id") else None,
            campaign_id=str(row["campaign_id"]) if row.get("campaign_id") else None,
            is_active=row.get("is_active", True),
            is_muted=row.get("is_muted", False),
            muted_until=str(row["muted_until"]) if row.get("muted_until") else None,
            alerts_today=row.get("alerts_today", 0),
            last_checked_at=str(row["last_checked_at"]) if row.get("last_checked_at") else None,
            last_triggered_at=str(row["last_triggered_at"]) if row.get("last_triggered_at") else None,
            created_at=str(row["created_at"])
        ))

    return {"alerts": alerts, "total": len(alerts)}


@router.post("/alerts")
@router.post("/alerts/")
async def create_alert(
    alert: AlertCreate,
    user: dict = Depends(get_current_user)
) -> AlertResponse:
    """Create a new alert rule."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    # Validate metric
    valid_metrics = ["spend", "cpl", "cpa", "roas", "ctr", "conversions", "impressions", "clicks", "revenue"]
    if alert.metric not in valid_metrics:
        raise HTTPException(status_code=400, detail=f"Invalid metric. Must be one of: {valid_metrics}")

    # Validate condition
    valid_conditions = ["above", "below", "increases_by", "decreases_by", "equals"]
    if alert.condition not in valid_conditions:
        raise HTTPException(status_code=400, detail=f"Invalid condition. Must be one of: {valid_conditions}")

    data = {
        "organization_id": org_id,
        "name": alert.name,
        "description": alert.description,
        "metric": alert.metric,
        "condition": alert.condition,
        "threshold": alert.threshold,
        "time_window": alert.time_window,
        "check_frequency": alert.check_frequency,
        "notification_channels": json.dumps(alert.notification_channels),
        "cooldown_minutes": alert.cooldown_minutes,
        "max_alerts_per_day": alert.max_alerts_per_day,
        "ad_account_id": alert.ad_account_id,
        "campaign_id": alert.campaign_id,
        "platform": alert.platform,
        "is_active": True,
        "is_muted": False,
        "alerts_today": 0,
    }

    result = supabase.table("ad_alerts").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create alert")

    row = result.data[0]
    return AlertResponse(
        id=row["id"],
        name=row["name"],
        description=row.get("description"),
        metric=row["metric"],
        condition=row["condition"],
        threshold=float(row["threshold"]),
        time_window=row.get("time_window", "day"),
        check_frequency=row.get("check_frequency", "hourly"),
        notification_channels=parse_notification_channels(row.get("notification_channels")),
        cooldown_minutes=row.get("cooldown_minutes", 60),
        max_alerts_per_day=row.get("max_alerts_per_day", 10),
        platform=row.get("platform"),
        ad_account_id=row.get("ad_account_id"),
        campaign_id=row.get("campaign_id"),
        is_active=row.get("is_active", True),
        is_muted=row.get("is_muted", False),
        muted_until=row.get("muted_until"),
        alerts_today=row.get("alerts_today", 0),
        last_checked_at=row.get("last_checked_at"),
        last_triggered_at=row.get("last_triggered_at"),
        created_at=row["created_at"]
    )


@router.patch("/alerts/{alert_id}")
async def update_alert(
    alert_id: str,
    updates: AlertUpdate,
    user: dict = Depends(get_current_user)
) -> AlertResponse:
    """Update an alert rule."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    data = {"updated_at": datetime.utcnow().isoformat()}
    for field, value in updates.model_dump(exclude_unset=True).items():
        if value is not None:
            if field == "notification_channels":
                data[field] = json.dumps(value)
            else:
                data[field] = value

    query = supabase.table("ad_alerts").update(data).eq("id", alert_id)
    if org_id:
        query = query.eq("organization_id", org_id)

    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Fetch updated alert
    row = supabase.table("ad_alerts").select("*").eq("id", alert_id).execute().data[0]

    return AlertResponse(
        id=row["id"],
        name=row["name"],
        description=row.get("description"),
        metric=row["metric"],
        condition=row["condition"],
        threshold=float(row["threshold"]),
        time_window=row.get("time_window", "day"),
        check_frequency=row.get("check_frequency", "hourly"),
        notification_channels=parse_notification_channels(row.get("notification_channels")),
        cooldown_minutes=row.get("cooldown_minutes", 60),
        max_alerts_per_day=row.get("max_alerts_per_day", 10),
        platform=row.get("platform"),
        ad_account_id=row.get("ad_account_id"),
        campaign_id=row.get("campaign_id"),
        is_active=row.get("is_active", True),
        is_muted=row.get("is_muted", False),
        muted_until=row.get("muted_until"),
        alerts_today=row.get("alerts_today", 0),
        last_checked_at=row.get("last_checked_at"),
        last_triggered_at=row.get("last_triggered_at"),
        created_at=row["created_at"]
    )


@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete an alert rule."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    query = supabase.table("ad_alerts").delete().eq("id", alert_id)
    if org_id:
        query = query.eq("organization_id", org_id)

    query.execute()
    return {"success": True, "message": "Alert deleted"}


@router.post("/alerts/{alert_id}/mute")
async def mute_alert(
    alert_id: str,
    hours: int = Query(default=24, ge=1, le=720),
    user: dict = Depends(get_current_user)
):
    """Mute an alert for a specified number of hours."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    muted_until = datetime.utcnow() + timedelta(hours=hours)

    query = supabase.table("ad_alerts").update({
        "is_muted": True,
        "muted_until": muted_until.isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", alert_id)

    if org_id:
        query = query.eq("organization_id", org_id)

    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"success": True, "muted_until": muted_until.isoformat()}


@router.post("/alerts/{alert_id}/unmute")
async def unmute_alert(
    alert_id: str,
    user: dict = Depends(get_current_user)
):
    """Unmute an alert."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    query = supabase.table("ad_alerts").update({
        "is_muted": False,
        "muted_until": None,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", alert_id)

    if org_id:
        query = query.eq("organization_id", org_id)

    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"success": True, "message": "Alert unmuted"}


@router.get("/alerts/history")
async def get_alert_history(
    alert_id: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    resolved: Optional[bool] = None,
    severity: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(get_current_user)
) -> dict:
    """Get alert history."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    query = supabase.table("alert_history").select("*").eq("organization_id", org_id)

    if alert_id:
        query = query.eq("alert_id", alert_id)

    if acknowledged is not None:
        query = query.eq("acknowledged", acknowledged)

    if resolved is not None:
        query = query.eq("resolved", resolved)

    if severity:
        query = query.eq("severity", severity)

    query = query.order("triggered_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()

    # Count unread
    unread_result = supabase.table("alert_history").select("id", count="exact").eq("organization_id", org_id).eq("acknowledged", False).execute()
    unread = unread_result.count or 0

    history = []
    for row in result.data or []:
        history.append(AlertHistoryItem(
            id=row["id"],
            alert_id=row["alert_id"],
            alert_name=row.get("alert_name", ""),
            metric=row["metric"],
            condition=row["condition"],
            threshold=float(row["threshold"]),
            triggered_value=float(row["triggered_value"]),
            previous_value=float(row["previous_value"]) if row.get("previous_value") else None,
            change_pct=float(row["change_pct"]) if row.get("change_pct") else None,
            severity=row.get("severity", "warning"),
            message=row.get("message", ""),
            notification_channels=parse_notification_channels(row.get("notification_channels")),
            notification_sent=row.get("notification_sent", False),
            acknowledged=row.get("acknowledged", False),
            acknowledged_at=row.get("acknowledged_at"),
            resolved=row.get("resolved", False),
            resolved_at=row.get("resolved_at"),
            notes=row.get("notes"),
            triggered_at=row["triggered_at"]
        ))

    return {"history": history, "total": len(history), "unread": unread}


@router.post("/alerts/history/{history_id}/acknowledge")
async def acknowledge_alert(
    history_id: str,
    user: dict = Depends(get_current_user)
):
    """Acknowledge an alert."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    data = {
        "acknowledged": True,
        "acknowledged_at": datetime.utcnow().isoformat(),
        "acknowledged_by": user["sub"]
    }

    query = supabase.table("alert_history").update(data).eq("id", history_id)
    if org_id:
        query = query.eq("organization_id", org_id)

    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Alert history not found")

    return {"success": True, "message": "Alert acknowledged"}


@router.post("/alerts/history/{history_id}/resolve")
async def resolve_alert(
    history_id: str,
    notes: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Mark an alert as resolved."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    data = {
        "resolved": True,
        "resolved_at": datetime.utcnow().isoformat()
    }
    if notes:
        data["notes"] = notes

    query = supabase.table("alert_history").update(data).eq("id", history_id)
    if org_id:
        query = query.eq("organization_id", org_id)

    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Alert history not found")

    return {"success": True, "message": "Alert resolved"}


# =============================================================================
# API Endpoints - Budget Pacing
# =============================================================================

@router.get("/budget-pacing")
@router.get("/budget-pacing/")
async def list_budget_pacing(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    period: Optional[str] = None,  # YYYY-MM format
    user: dict = Depends(get_current_user)
) -> dict:
    """Get budget pacing for all accounts."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    if not period:
        period = datetime.utcnow().strftime("%Y-%m")

    query = supabase.table("budget_pacing").select("*").eq("organization_id", org_id).eq("period", period)

    if platform:
        query = query.eq("platform", platform)

    if status:
        query = query.eq("status", status)

    result = query.execute()

    pacing = []
    for row in result.data or []:
        pacing.append(BudgetPacingResponse(
            id=str(row["id"]),
            name=row.get("name"),
            ad_account_id=str(row["ad_account_id"]) if row.get("ad_account_id") else None,
            campaign_id=str(row["campaign_id"]) if row.get("campaign_id") else None,
            platform=row.get("platform"),
            period=row["period"],
            monthly_budget_micros=row["monthly_budget_micros"],
            total_spent_micros=row.get("total_spent_micros", 0),
            daily_target_micros=row.get("daily_target_micros", 0),
            current_pacing_pct=float(row.get("current_pacing_pct", 0)),
            ideal_pacing_pct=float(row.get("ideal_pacing_pct", 0)),
            days_remaining=row.get("days_remaining", 0),
            projected_spend_micros=row.get("projected_spend_micros", 0),
            status=row.get("status", "on_track"),
            alert_threshold_pct=row.get("alert_threshold_pct", 80),
            alert_sent=row.get("alert_sent", False),
            last_updated_at=str(row["last_updated_at"]) if row.get("last_updated_at") else None,
            created_at=str(row["created_at"])
        ))

    return {"pacing": pacing, "total": len(pacing)}


@router.post("/budget-pacing")
@router.post("/budget-pacing/")
async def create_budget_pacing(
    data: BudgetPacingCreate,
    user: dict = Depends(get_current_user)
) -> BudgetPacingResponse:
    """Create budget pacing."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    import calendar
    today = datetime.utcnow().date()
    period = data.period or today.strftime("%Y-%m")

    # Calculate days in period
    year, month = map(int, period.split("-"))
    days_in_period = calendar.monthrange(year, month)[1]
    days_elapsed = today.day if today.strftime("%Y-%m") == period else 0
    days_remaining = days_in_period - days_elapsed
    daily_target = data.monthly_budget_micros // days_in_period

    insert_data = {
        "organization_id": org_id,
        "name": data.name,
        "monthly_budget_micros": data.monthly_budget_micros,
        "ad_account_id": data.ad_account_id,
        "campaign_id": data.campaign_id,
        "platform": data.platform,
        "period": period,
        "daily_target_micros": daily_target,
        "days_remaining": days_remaining,
        "alert_threshold_pct": data.alert_threshold_pct,
        "status": "on_track",
    }

    result = supabase.table("budget_pacing").insert(insert_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create budget pacing")

    row = result.data[0]
    return BudgetPacingResponse(
        id=row["id"],
        name=row.get("name"),
        ad_account_id=row.get("ad_account_id"),
        campaign_id=row.get("campaign_id"),
        platform=row.get("platform"),
        period=row["period"],
        monthly_budget_micros=row["monthly_budget_micros"],
        total_spent_micros=row.get("total_spent_micros", 0),
        daily_target_micros=row.get("daily_target_micros", 0),
        current_pacing_pct=float(row.get("current_pacing_pct", 0)),
        ideal_pacing_pct=float(row.get("ideal_pacing_pct", 0)),
        days_remaining=row.get("days_remaining", 0),
        projected_spend_micros=row.get("projected_spend_micros", 0),
        status=row.get("status", "on_track"),
        alert_threshold_pct=row.get("alert_threshold_pct", 80),
        alert_sent=row.get("alert_sent", False),
        last_updated_at=row.get("last_updated_at"),
        created_at=row["created_at"]
    )


# =============================================================================
# API Endpoints - Summary (Dashboard Widget)
# =============================================================================

@router.get("/summary")
async def get_goals_summary(
    user: dict = Depends(get_current_user)
) -> dict:
    """Get summary of goals and alerts for dashboard widget."""
    supabase = get_supabase_client()
    org_id = user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    today = date.today()

    # Active goals within date range
    goals_result = supabase.table("ad_goals").select("*").eq("organization_id", org_id).eq("is_active", True).lte("period_start", today.isoformat()).gte("period_end", today.isoformat()).execute()

    active_goals = goals_result.data or []

    achieved = sum(1 for g in active_goals if g.get("status") == "achieved")
    at_risk = sum(1 for g in active_goals if g.get("status") in ("at_risk", "behind"))
    in_progress = sum(1 for g in active_goals if g.get("status") in ("not_started", "in_progress", "on_track"))

    # Top goals (sorted by urgency/progress)
    top_goals = []
    sorted_goals = sorted(active_goals, key=lambda x: x.get("progress_pct", 0))[:5]
    for g in sorted_goals:
        period_end = date.fromisoformat(str(g["period_end"]))
        days_remaining = max(0, (period_end - today).days)
        top_goals.append({
            "id": g["id"],
            "name": g["name"],
            "metric": g["metric"],
            "progress_pct": float(g.get("progress_pct", 0)),
            "status": g.get("status", "not_started"),
            "days_remaining": days_remaining
        })

    # Recent alerts (last 24h)
    since = datetime.utcnow() - timedelta(hours=24)
    alerts_result = supabase.table("alert_history").select("*").eq("organization_id", org_id).gte("triggered_at", since.isoformat()).order("triggered_at", desc=True).limit(10).execute()

    recent_alerts = []
    for a in alerts_result.data or []:
        recent_alerts.append({
            "id": a["id"],
            "alert_name": a.get("alert_name", ""),
            "metric": a["metric"],
            "condition": a["condition"],
            "threshold": float(a["threshold"]),
            "triggered_value": float(a["triggered_value"]),
            "severity": a.get("severity", "warning"),
            "message": a.get("message", ""),
            "triggered_at": a["triggered_at"]
        })

    unread_alerts = sum(1 for a in (alerts_result.data or []) if not a.get("acknowledged", False))

    # Active alerts count
    active_alerts_result = supabase.table("ad_alerts").select("id", count="exact").eq("organization_id", org_id).eq("is_active", True).execute()
    active_alerts = active_alerts_result.count or 0

    # Budget pacing
    period = datetime.utcnow().strftime("%Y-%m")
    pacing_result = supabase.table("budget_pacing").select("status").eq("organization_id", org_id).eq("period", period).execute()

    budget_pacing = {
        "on_track": 0,
        "over_pace": 0,
        "under_pace": 0,
        "critical": 0
    }
    for p in pacing_result.data or []:
        status = p.get("status", "on_track")
        if status in ("critical_over", "critical_under"):
            budget_pacing["critical"] += 1
        elif status in budget_pacing:
            budget_pacing[status] += 1

    return {
        "total_goals": len(active_goals),
        "achieved_goals": achieved,
        "at_risk_goals": at_risk,
        "in_progress_goals": in_progress,
        "active_alerts": active_alerts,
        "unread_alerts": unread_alerts,
        "alerts_triggered_today": len(alerts_result.data or []),
        "budget_pacing": budget_pacing,
        "top_goals": top_goals,
        "recent_alerts": recent_alerts
    }
