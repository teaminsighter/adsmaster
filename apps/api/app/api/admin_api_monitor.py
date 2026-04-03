"""
Admin API Monitoring
Routes for API version tracking, changelog, expenses, and alerts
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.services.supabase_client import get_supabase_client
from app.api.admin import get_current_admin

router = APIRouter(prefix="/admin/api-monitor", tags=["Admin - API Monitor"])


# ============================================================================
# Request/Response Models
# ============================================================================

class UpdateMigrationStatusRequest(BaseModel):
    status: str
    notes: Optional[str] = None


class CreateAlertRequest(BaseModel):
    platform: str
    alert_type: str
    severity: str = "info"
    title: str
    message: str
    metadata: Optional[dict] = None


# ============================================================================
# API Versions Overview
# ============================================================================

@router.get("/versions")
async def get_api_versions(
    admin: dict = Depends(get_current_admin)
):
    """Get current API versions and adapter status"""
    supabase = get_supabase_client()

    result = supabase.table("api_version_tracking").select("*").execute()

    return {"platforms": result.data or []}


@router.patch("/versions/{platform}")
async def update_api_version(
    platform: str,
    production_adapter_version: str,
    admin: dict = Depends(get_current_admin)
):
    """Update production adapter version for a platform"""
    supabase = get_supabase_client()

    result = supabase.table("api_version_tracking").update({
        "production_adapter_version": production_adapter_version,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("platform", platform).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Platform not found")

    return {"success": True, "platform": result.data[0]}


# ============================================================================
# Changelog
# ============================================================================

@router.get("/changelog")
async def get_api_changelog(
    platform: Optional[str] = None,
    change_type: Optional[str] = None,
    migration_status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get API changelog entries"""
    supabase = get_supabase_client()
    offset = (page - 1) * limit

    query = supabase.table("api_changelog_entries").select("*", count="exact")

    if platform:
        query = query.eq("platform", platform)
    if change_type:
        query = query.eq("change_type", change_type)
    if migration_status:
        query = query.eq("migration_status", migration_status)

    query = query.order("announced_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()

    return {
        "entries": result.data or [],
        "total": result.count or 0,
        "page": page,
        "limit": limit
    }


@router.get("/changelog/{entry_id}")
async def get_changelog_entry(
    entry_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Get single changelog entry"""
    supabase = get_supabase_client()

    result = supabase.table("api_changelog_entries").select("*").eq("id", entry_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Entry not found")

    return {"entry": result.data}


@router.post("/changelog/{entry_id}/migration-status")
async def update_migration_status(
    entry_id: str,
    data: UpdateMigrationStatusRequest,
    admin: dict = Depends(get_current_admin)
):
    """Update migration status for a changelog entry"""
    supabase = get_supabase_client()

    update_data = {
        "migration_status": data.status,
        "migration_notes": data.notes
    }

    if data.status == "completed":
        update_data["completed_at"] = datetime.utcnow().isoformat()

    result = supabase.table("api_changelog_entries").update(update_data).eq("id", entry_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Entry not found")

    return {"success": True, "entry": result.data[0]}


# ============================================================================
# API Expenses
# ============================================================================

@router.get("/expenses")
async def get_api_expenses(
    days: int = Query(default=30, le=90),
    platform: Optional[str] = None,
    group_by: str = Query(default="day"),
    admin: dict = Depends(get_current_admin)
):
    """Get detailed API expense breakdown"""
    supabase = get_supabase_client()
    start_date = datetime.utcnow() - timedelta(days=days)

    query = supabase.table("api_expense_logs").select("*")
    query = query.gte("period_start", start_date.isoformat())

    if platform:
        query = query.eq("platform", platform)

    result = query.order("period_start", desc=True).execute()

    # Aggregate based on group_by
    if group_by == "day":
        aggregated = {}
        for log in (result.data or []):
            date = log["period_start"][:10]
            if date not in aggregated:
                aggregated[date] = {"requests": 0, "errors": 0, "cost": 0, "latency_total": 0}
            aggregated[date]["requests"] += log.get("request_count", 0)
            aggregated[date]["errors"] += log.get("error_count", 0)
            aggregated[date]["cost"] += float(log.get("estimated_cost_usd", 0) or 0)
            aggregated[date]["latency_total"] += log.get("total_latency_ms", 0)

        data = []
        for date, vals in sorted(aggregated.items()):
            avg_latency = vals["latency_total"] // vals["requests"] if vals["requests"] > 0 else 0
            data.append({
                "date": date,
                "requests": vals["requests"],
                "errors": vals["errors"],
                "cost": round(vals["cost"], 4),
                "avg_latency_ms": avg_latency
            })
        return {"data": data, "group_by": group_by, "period_days": days}

    elif group_by == "endpoint":
        aggregated = {}
        for log in (result.data or []):
            endpoint = log.get("endpoint", "unknown")
            if endpoint not in aggregated:
                aggregated[endpoint] = {"requests": 0, "errors": 0, "cost": 0, "latency_total": 0}
            aggregated[endpoint]["requests"] += log.get("request_count", 0)
            aggregated[endpoint]["errors"] += log.get("error_count", 0)
            aggregated[endpoint]["cost"] += float(log.get("estimated_cost_usd", 0) or 0)
            aggregated[endpoint]["latency_total"] += log.get("total_latency_ms", 0)

        data = []
        for endpoint, vals in sorted(aggregated.items(), key=lambda x: x[1]["requests"], reverse=True):
            avg_latency = vals["latency_total"] // vals["requests"] if vals["requests"] > 0 else 0
            data.append({
                "endpoint": endpoint,
                "requests": vals["requests"],
                "errors": vals["errors"],
                "error_rate": round(vals["errors"] / vals["requests"] * 100, 2) if vals["requests"] > 0 else 0,
                "cost": round(vals["cost"], 4),
                "avg_latency_ms": avg_latency
            })
        return {"data": data[:50], "group_by": group_by, "period_days": days}

    else:  # platform
        aggregated = {}
        for log in (result.data or []):
            plat = log.get("platform", "unknown")
            if plat not in aggregated:
                aggregated[plat] = {"requests": 0, "errors": 0, "cost": 0, "latency_total": 0}
            aggregated[plat]["requests"] += log.get("request_count", 0)
            aggregated[plat]["errors"] += log.get("error_count", 0)
            aggregated[plat]["cost"] += float(log.get("estimated_cost_usd", 0) or 0)
            aggregated[plat]["latency_total"] += log.get("total_latency_ms", 0)

        data = []
        for plat, vals in aggregated.items():
            avg_latency = vals["latency_total"] // vals["requests"] if vals["requests"] > 0 else 0
            data.append({
                "platform": plat,
                "requests": vals["requests"],
                "errors": vals["errors"],
                "error_rate": round(vals["errors"] / vals["requests"] * 100, 2) if vals["requests"] > 0 else 0,
                "cost": round(vals["cost"], 4),
                "avg_latency_ms": avg_latency
            })
        return {"data": data, "group_by": group_by, "period_days": days}


# ============================================================================
# API Health
# ============================================================================

@router.get("/health")
async def get_api_health(
    admin: dict = Depends(get_current_admin)
):
    """Get real-time API health status"""
    supabase = get_supabase_client()

    # Get version tracking with health info
    versions = supabase.table("api_version_tracking").select("*").execute()

    # Get recent error rates (last hour)
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_logs = supabase.table("api_expense_logs").select(
        "platform, request_count, error_count, total_latency_ms"
    ).gte("period_start", one_hour_ago.isoformat()).execute()

    # Calculate health per platform
    health = {}
    for log in (recent_logs.data or []):
        platform = log.get("platform", "unknown")
        if platform not in health:
            health[platform] = {"requests": 0, "errors": 0, "latency_total": 0}
        health[platform]["requests"] += log.get("request_count", 0)
        health[platform]["errors"] += log.get("error_count", 0)
        health[platform]["latency_total"] += log.get("total_latency_ms", 0)

    platforms = []
    for v in (versions.data or []):
        plat = v["platform"]
        h = health.get(plat, {"requests": 0, "errors": 0, "latency_total": 0})
        error_rate = (h["errors"] / h["requests"] * 100) if h["requests"] > 0 else 0
        avg_latency = h["latency_total"] // h["requests"] if h["requests"] > 0 else 0

        status = "healthy"
        if error_rate > 5:
            status = "degraded"
        if error_rate > 20:
            status = "unhealthy"

        platforms.append({
            "platform": plat,
            "current_version": v.get("current_version"),
            "latest_version": v.get("latest_version"),
            "production_adapter": v.get("production_adapter_version"),
            "status": status,
            "error_rate_1h": round(error_rate, 2),
            "avg_latency_ms": avg_latency,
            "requests_1h": h["requests"]
        })

    return {"platforms": platforms, "timestamp": datetime.utcnow().isoformat()}


# ============================================================================
# Alerts
# ============================================================================

@router.get("/alerts")
async def get_api_alerts(
    acknowledged: Optional[bool] = None,
    severity: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get API alerts"""
    supabase = get_supabase_client()
    offset = (page - 1) * limit

    query = supabase.table("api_alerts").select("*", count="exact")

    if acknowledged is not None:
        if acknowledged:
            query = query.not_.is_("acknowledged_at", "null")
        else:
            query = query.is_("acknowledged_at", "null")

    if severity:
        query = query.eq("severity", severity)

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()

    return {
        "alerts": result.data or [],
        "total": result.count or 0,
        "page": page,
        "limit": limit
    }


@router.post("/alerts")
async def create_api_alert(
    data: CreateAlertRequest,
    admin: dict = Depends(get_current_admin)
):
    """Create a new API alert (for manual alerts)"""
    supabase = get_supabase_client()

    insert_data = data.model_dump()
    result = supabase.table("api_alerts").insert(insert_data).execute()

    return {"success": True, "alert": result.data[0] if result.data else None}


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Acknowledge an API alert"""
    supabase = get_supabase_client()

    result = supabase.table("api_alerts").update({
        "acknowledged_at": datetime.utcnow().isoformat(),
        "acknowledged_by": admin["id"]
    }).eq("id", alert_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"success": True, "alert": result.data[0]}


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Resolve an API alert"""
    supabase = get_supabase_client()

    result = supabase.table("api_alerts").update({
        "resolved_at": datetime.utcnow().isoformat()
    }).eq("id", alert_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"success": True, "alert": result.data[0]}


# ============================================================================
# Adapters
# ============================================================================

@router.get("/adapters")
async def get_adapters(
    admin: dict = Depends(get_current_admin)
):
    """Get adapter status for all platforms"""
    supabase = get_supabase_client()

    result = supabase.table("api_version_tracking").select(
        "platform, adapter_versions_available, production_adapter_version"
    ).execute()

    # Get feature flag info for adapter rollouts
    flags = supabase.table("feature_flags").select("*").like("name", "%adapter%").execute()

    adapters = []
    for v in (result.data or []):
        adapters.append({
            "platform": v["platform"],
            "available": v.get("adapter_versions_available", []),
            "production": v.get("production_adapter_version"),
            "feature_flags": []  # Would map from flags
        })

    return {"adapters": adapters}


@router.post("/adapters/{platform}/set-production")
async def set_production_adapter(
    platform: str,
    version: str,
    admin: dict = Depends(get_current_admin)
):
    """Set production adapter version for a platform"""
    supabase = get_supabase_client()

    # Verify version is available
    current = supabase.table("api_version_tracking").select(
        "adapter_versions_available"
    ).eq("platform", platform).single().execute()

    if not current.data:
        raise HTTPException(status_code=404, detail="Platform not found")

    available = current.data.get("adapter_versions_available", [])
    if version not in available:
        raise HTTPException(status_code=400, detail=f"Version {version} not available. Available: {available}")

    result = supabase.table("api_version_tracking").update({
        "production_adapter_version": version,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("platform", platform).execute()

    # Log to audit
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "adapter.set_production",
        "resource_type": "api_adapter",
        "old_value": {"version": current.data.get("production_adapter_version")},
        "new_value": {"version": version, "platform": platform}
    }).execute()

    return {"success": True, "platform": result.data[0]}


# ============================================================================
# Sunsets & Timeline
# ============================================================================

@router.get("/sunset-timeline")
async def get_sunset_timeline(
    admin: dict = Depends(get_current_admin)
):
    """Get upcoming API version sunsets"""
    supabase = get_supabase_client()

    result = supabase.table("api_version_tracking").select(
        "platform, sunset_dates"
    ).execute()

    timeline = []
    today = datetime.utcnow().date()

    for v in (result.data or []):
        sunset_dates = v.get("sunset_dates", {})
        for version, date_str in sunset_dates.items():
            try:
                sunset_date = datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()
                days_until = (sunset_date - today).days
                timeline.append({
                    "platform": v["platform"],
                    "version": version,
                    "sunset_date": date_str,
                    "days_until": days_until,
                    "urgency": "critical" if days_until < 30 else "warning" if days_until < 90 else "info"
                })
            except:
                pass

    # Sort by days until sunset
    timeline.sort(key=lambda x: x["days_until"])

    return {"timeline": timeline}
