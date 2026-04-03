"""
Admin System Control API
Routes for feature flags, maintenance mode, background jobs, announcements, security
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.services.supabase_client import get_supabase_client
from app.api.admin import get_current_admin

router = APIRouter(prefix="/admin/system", tags=["Admin - System"])


# ============================================================================
# Request/Response Models
# ============================================================================

class FeatureFlagUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    rollout_percentage: Optional[int] = None
    target_plans: Optional[List[str]] = None
    target_org_ids: Optional[List[str]] = None


class MaintenanceModeRequest(BaseModel):
    enabled: bool
    message: str = "We're upgrading our systems. Please check back soon."
    expected_duration_minutes: Optional[int] = None
    allowed_ips: Optional[List[str]] = None
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None
    reason: Optional[str] = None


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    type: str = "banner"
    severity: str = "info"
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    target_plans: Optional[List[str]] = None
    starts_at: str
    ends_at: Optional[str] = None
    dismissible: bool = True


class TriggerJobRequest(BaseModel):
    job_type: str
    job_name: Optional[str] = None


class ImpersonateRequest(BaseModel):
    reason: str


class AdminUserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    role: str = "admin"


# ============================================================================
# System Overview
# ============================================================================

@router.get("/overview")
async def get_system_overview(
    admin: dict = Depends(get_current_admin)
):
    """Get system overview"""
    supabase = get_supabase_client()

    # Check maintenance mode
    maint = supabase.table("system_config").select("value").eq("key", "maintenance_mode").single().execute()
    maintenance_mode = maint.data["value"] if maint.data else False

    # Get recent job stats
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    jobs = supabase.table("background_jobs").select(
        "status", count="exact"
    ).gte("created_at", today.isoformat()).execute()

    job_counts = {"pending": 0, "running": 0, "completed": 0, "failed": 0}
    for job in (jobs.data or []):
        status = job.get("status", "unknown")
        if status in job_counts:
            job_counts[status] += 1

    # Get active feature flags count
    flags = supabase.table("feature_flags").select("id", count="exact").eq("is_enabled", True).execute()

    # Get unacknowledged alerts
    alerts = supabase.table("api_alerts").select(
        "id", count="exact"
    ).is_("acknowledged_at", "null").execute()

    return {
        "maintenance_mode": maintenance_mode,
        "active_feature_flags": flags.count or 0,
        "unacknowledged_alerts": alerts.count or 0,
        "jobs_today": job_counts,
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================================================
# Feature Flags
# ============================================================================

@router.get("/feature-flags")
async def get_feature_flags(
    admin: dict = Depends(get_current_admin)
):
    """Get all feature flags"""
    supabase = get_supabase_client()

    result = supabase.table("feature_flags").select("*").order("name").execute()

    return {"flags": result.data or []}


@router.get("/feature-flags/{flag_name}")
async def get_feature_flag(
    flag_name: str,
    admin: dict = Depends(get_current_admin)
):
    """Get single feature flag"""
    supabase = get_supabase_client()

    result = supabase.table("feature_flags").select("*").eq("name", flag_name).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    return {"flag": result.data}


@router.patch("/feature-flags/{flag_name}")
async def update_feature_flag(
    flag_name: str,
    data: FeatureFlagUpdate,
    admin: dict = Depends(get_current_admin)
):
    """Update feature flag"""
    supabase = get_supabase_client()

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("feature_flags").update(update_data).eq("name", flag_name).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    # Audit log
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "feature_flag.update",
        "resource_type": "feature_flag",
        "new_value": {"flag": flag_name, **update_data}
    }).execute()

    return {"success": True, "flag": result.data[0]}


@router.post("/feature-flags/{flag_name}/toggle")
async def toggle_feature_flag(
    flag_name: str,
    admin: dict = Depends(get_current_admin)
):
    """Toggle feature flag enabled/disabled"""
    supabase = get_supabase_client()

    current = supabase.table("feature_flags").select("is_enabled").eq("name", flag_name).single().execute()

    if not current.data:
        raise HTTPException(status_code=404, detail="Feature flag not found")

    new_state = not current.data["is_enabled"]
    result = supabase.table("feature_flags").update({
        "is_enabled": new_state
    }).eq("name", flag_name).execute()

    # Audit log
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "feature_flag.toggle",
        "resource_type": "feature_flag",
        "old_value": {"is_enabled": current.data["is_enabled"]},
        "new_value": {"is_enabled": new_state, "flag": flag_name}
    }).execute()

    return {"success": True, "is_enabled": new_state}


# ============================================================================
# Maintenance Mode
# ============================================================================

@router.get("/maintenance")
async def get_maintenance_status(
    admin: dict = Depends(get_current_admin)
):
    """Get maintenance mode status"""
    supabase = get_supabase_client()

    # Check current maintenance mode
    config = supabase.table("system_config").select("value").eq("key", "maintenance_mode").single().execute()

    # Get active/scheduled maintenance windows
    windows = supabase.table("maintenance_windows").select("*").in_(
        "status", ["scheduled", "active"]
    ).order("scheduled_start").execute()

    # Get history
    history = supabase.table("maintenance_windows").select("*").eq(
        "status", "completed"
    ).order("actual_end", desc=True).limit(10).execute()

    return {
        "is_active": config.data["value"] if config.data else False,
        "active_windows": [w for w in (windows.data or []) if w.get("status") == "active"],
        "scheduled_windows": [w for w in (windows.data or []) if w.get("status") == "scheduled"],
        "history": history.data or []
    }


@router.post("/maintenance")
async def set_maintenance_mode(
    data: MaintenanceModeRequest,
    admin: dict = Depends(get_current_admin)
):
    """Enable/disable maintenance mode"""
    supabase = get_supabase_client()

    # Update system config
    supabase.table("system_config").upsert({
        "key": "maintenance_mode",
        "value": data.enabled,
        "updated_by": admin["id"]
    }).execute()

    if data.enabled:
        # Create maintenance window record
        window_data = {
            "status": "active",
            "message": data.message,
            "expected_duration_minutes": data.expected_duration_minutes,
            "allowed_ips": data.allowed_ips,
            "actual_start": datetime.utcnow().isoformat(),
            "reason": data.reason,
            "created_by": admin["id"]
        }
        supabase.table("maintenance_windows").insert(window_data).execute()
    else:
        # End active maintenance windows
        supabase.table("maintenance_windows").update({
            "status": "completed",
            "actual_end": datetime.utcnow().isoformat()
        }).eq("status", "active").execute()

    # Audit log
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "maintenance_mode.set",
        "resource_type": "system",
        "new_value": {"enabled": data.enabled, "message": data.message}
    }).execute()

    return {"success": True, "maintenance_mode": data.enabled}


# ============================================================================
# Background Jobs
# ============================================================================

@router.get("/jobs")
async def get_background_jobs(
    status: Optional[str] = None,
    job_type: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get background job status"""
    supabase = get_supabase_client()
    offset = (page - 1) * limit

    query = supabase.table("background_jobs").select("*", count="exact")

    if status:
        query = query.eq("status", status)
    if job_type:
        query = query.eq("job_type", job_type)

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()

    return {
        "jobs": result.data or [],
        "total": result.count or 0,
        "page": page,
        "limit": limit
    }


@router.get("/jobs/summary")
async def get_jobs_summary(
    admin: dict = Depends(get_current_admin)
):
    """Get background jobs summary by type"""
    supabase = get_supabase_client()

    # Get job types with latest status
    result = supabase.table("background_jobs").select(
        "job_type, status, started_at, completed_at"
    ).order("created_at", desc=True).execute()

    # Group by job type, get latest
    job_types = {}
    for job in (result.data or []):
        jt = job.get("job_type")
        if jt not in job_types:
            job_types[jt] = {
                "job_type": jt,
                "status": job.get("status"),
                "last_run": job.get("started_at"),
                "last_completed": job.get("completed_at")
            }

    return {"job_types": list(job_types.values())}


@router.post("/jobs/trigger")
async def trigger_job(
    data: TriggerJobRequest,
    admin: dict = Depends(get_current_admin)
):
    """Manually trigger a background job"""
    supabase = get_supabase_client()

    job_data = {
        "job_type": data.job_type,
        "job_name": data.job_name or f"Manual: {data.job_type}",
        "status": "pending",
        "triggered_by": "manual",
        "triggered_by_admin_id": admin["id"]
    }

    result = supabase.table("background_jobs").insert(job_data).execute()

    # In real implementation, would also enqueue the actual job

    return {"success": True, "job": result.data[0] if result.data else None}


@router.post("/jobs/{job_id}/retry")
async def retry_job(
    job_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Retry a failed job"""
    supabase = get_supabase_client()

    # Get original job
    original = supabase.table("background_jobs").select("*").eq("id", job_id).single().execute()

    if not original.data:
        raise HTTPException(status_code=404, detail="Job not found")

    if original.data.get("status") != "failed":
        raise HTTPException(status_code=400, detail="Can only retry failed jobs")

    # Update retry count on original
    supabase.table("background_jobs").update({
        "retry_count": original.data.get("retry_count", 0) + 1,
        "status": "pending",
        "error_message": None
    }).eq("id", job_id).execute()

    return {"success": True, "message": "Job queued for retry"}


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Cancel a pending/running job"""
    supabase = get_supabase_client()

    result = supabase.table("background_jobs").update({
        "status": "cancelled",
        "completed_at": datetime.utcnow().isoformat()
    }).eq("id", job_id).in_("status", ["pending", "running"]).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Job not found or cannot be cancelled")

    return {"success": True, "message": "Job cancelled"}


# ============================================================================
# Announcements
# ============================================================================

@router.get("/announcements")
async def get_announcements(
    active_only: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get all announcements"""
    supabase = get_supabase_client()
    offset = (page - 1) * limit

    query = supabase.table("announcements").select("*", count="exact")

    if active_only:
        now = datetime.utcnow().isoformat()
        query = query.lte("starts_at", now)
        # Would also need: .or_("ends_at.is.null,ends_at.gte." + now)

    query = query.order("starts_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()

    return {
        "announcements": result.data or [],
        "total": result.count or 0,
        "page": page,
        "limit": limit
    }


@router.post("/announcements")
async def create_announcement(
    data: AnnouncementCreate,
    admin: dict = Depends(get_current_admin)
):
    """Create new announcement"""
    supabase = get_supabase_client()

    insert_data = data.model_dump()
    insert_data["created_by"] = admin["id"]

    result = supabase.table("announcements").insert(insert_data).execute()

    return {"success": True, "announcement": result.data[0] if result.data else None}


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Delete announcement"""
    supabase = get_supabase_client()

    supabase.table("announcements").delete().eq("id", announcement_id).execute()

    return {"success": True, "message": "Announcement deleted"}


# ============================================================================
# Security Events
# ============================================================================

@router.get("/security-events")
async def get_security_events(
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    days: int = Query(default=7, le=30),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get security events"""
    supabase = get_supabase_client()
    offset = (page - 1) * limit
    start_date = datetime.utcnow() - timedelta(days=days)

    query = supabase.table("security_events").select("*", count="exact")
    query = query.gte("created_at", start_date.isoformat())

    if event_type:
        query = query.eq("event_type", event_type)
    if severity:
        query = query.eq("severity", severity)

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()

    return {
        "events": result.data or [],
        "total": result.count or 0,
        "page": page,
        "limit": limit,
        "period_days": days
    }


@router.get("/security-events/summary")
async def get_security_events_summary(
    days: int = Query(default=7, le=30),
    admin: dict = Depends(get_current_admin)
):
    """Get security events summary"""
    supabase = get_supabase_client()
    start_date = datetime.utcnow() - timedelta(days=days)

    result = supabase.table("security_events").select(
        "event_type, severity"
    ).gte("created_at", start_date.isoformat()).execute()

    by_type = {}
    by_severity = {}
    for event in (result.data or []):
        et = event.get("event_type", "unknown")
        sev = event.get("severity", "info")
        by_type[et] = by_type.get(et, 0) + 1
        by_severity[sev] = by_severity.get(sev, 0) + 1

    return {
        "by_type": by_type,
        "by_severity": by_severity,
        "total": len(result.data or []),
        "period_days": days
    }


# ============================================================================
# Admin Users Management
# ============================================================================

@router.get("/admins")
async def get_admin_users(
    admin: dict = Depends(get_current_admin)
):
    """Get all admin users (super admin only)"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    supabase = get_supabase_client()

    result = supabase.table("admin_users").select(
        "id, email, name, role, is_active, last_login_at, created_at"
    ).order("created_at").execute()

    return {"admins": result.data or []}


@router.post("/admins")
async def create_admin_user(
    data: AdminUserCreate,
    admin: dict = Depends(get_current_admin)
):
    """Create new admin user (super admin only)"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    supabase = get_supabase_client()

    # Hash password
    import bcrypt
    password_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()

    insert_data = {
        "email": data.email,
        "password_hash": password_hash,
        "name": data.name,
        "role": data.role
    }

    try:
        result = supabase.table("admin_users").insert(insert_data).execute()
    except Exception as e:
        if "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail="Email already exists")
        raise

    # Audit log
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "admin.create",
        "resource_type": "admin_user",
        "new_value": {"email": data.email, "role": data.role}
    }).execute()

    return {"success": True, "admin_id": result.data[0]["id"] if result.data else None}


@router.patch("/admins/{admin_id}")
async def update_admin_user(
    admin_id: str,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    admin: dict = Depends(get_current_admin)
):
    """Update admin user (super admin only)"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    supabase = get_supabase_client()

    update_data = {}
    if role is not None:
        update_data["role"] = role
    if is_active is not None:
        update_data["is_active"] = is_active

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("admin_users").update(update_data).eq("id", admin_id).execute()

    return {"success": True, "admin": result.data[0] if result.data else None}


@router.delete("/admins/{admin_id}")
async def deactivate_admin_user(
    admin_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Deactivate admin user (super admin only)"""
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")

    if admin_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    supabase = get_supabase_client()

    supabase.table("admin_users").update({"is_active": False}).eq("id", admin_id).execute()

    return {"success": True, "message": "Admin user deactivated"}


# ============================================================================
# User Impersonation
# ============================================================================

@router.post("/impersonate/{user_id}")
async def start_impersonation(
    user_id: str,
    data: ImpersonateRequest,
    admin: dict = Depends(get_current_admin)
):
    """Start impersonation session"""
    supabase = get_supabase_client()

    # Verify user exists
    user = supabase.table("users").select("id, email").eq("id", user_id).single().execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")

    # Create impersonation session
    session_data = {
        "admin_user_id": admin["id"],
        "impersonated_user_id": user_id,
        "reason": data.reason
    }
    session = supabase.table("admin_impersonation_sessions").insert(session_data).execute()

    # Generate user token (simplified - in real impl would use proper JWT)
    import jwt
    from datetime import datetime, timedelta
    from app.core.config import settings

    token_data = {
        "sub": user_id,
        "type": "impersonation",
        "admin_id": admin["id"],
        "session_id": session.data[0]["id"],
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(token_data, settings.jwt_secret, algorithm="HS256")

    # Audit log
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "user.impersonate",
        "resource_type": "user",
        "resource_id": user_id,
        "new_value": {"reason": data.reason, "user_email": user.data["email"]}
    }).execute()

    return {
        "success": True,
        "session_id": session.data[0]["id"],
        "user_token": token,
        "user_email": user.data["email"]
    }


@router.post("/impersonate/end")
async def end_impersonation(
    session_id: str,
    admin: dict = Depends(get_current_admin)
):
    """End impersonation session"""
    supabase = get_supabase_client()

    supabase.table("admin_impersonation_sessions").update({
        "ended_at": datetime.utcnow().isoformat()
    }).eq("id", session_id).eq("admin_user_id", admin["id"]).execute()

    return {"success": True, "message": "Impersonation session ended"}


@router.get("/impersonation/history")
async def get_impersonation_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get impersonation audit log"""
    supabase = get_supabase_client()
    offset = (page - 1) * limit

    result = supabase.table("admin_impersonation_sessions").select(
        "*, admin_users!admin_user_id(email, name)"
    ).order("started_at", desc=True).range(offset, offset + limit - 1).execute()

    return {"sessions": result.data or [], "page": page, "limit": limit}


# ============================================================================
# Cache Management
# ============================================================================

@router.post("/cache/clear")
async def clear_cache(
    admin: dict = Depends(get_current_admin)
):
    """Clear all cache"""
    # In real implementation, would clear Redis
    # For now, just log the action

    supabase = get_supabase_client()
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "cache.clear",
        "resource_type": "system"
    }).execute()

    return {"success": True, "message": "Cache cleared"}


# ============================================================================
# System Config
# ============================================================================

@router.get("/config")
async def get_system_config(
    admin: dict = Depends(get_current_admin)
):
    """Get all system configuration"""
    supabase = get_supabase_client()

    result = supabase.table("system_config").select("*").order("key").execute()

    # Mask secret values
    configs = []
    for config in (result.data or []):
        if config.get("is_secret"):
            config["value"] = "••••••••"
        configs.append(config)

    return {"configs": configs}


@router.put("/config/{key}")
async def update_system_config(
    key: str,
    value: str,
    admin: dict = Depends(get_current_admin)
):
    """Update system configuration"""
    supabase = get_supabase_client()

    # Parse value (try JSON first)
    import json
    try:
        parsed_value = json.loads(value)
    except:
        parsed_value = value

    result = supabase.table("system_config").upsert({
        "key": key,
        "value": parsed_value,
        "updated_by": admin["id"]
    }).execute()

    # Audit log
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "config.update",
        "resource_type": "system_config",
        "new_value": {"key": key, "value": parsed_value}
    }).execute()

    return {"success": True, "config": result.data[0] if result.data else None}
