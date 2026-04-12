"""Sync Logs API endpoints for viewing conversion sync history."""

from typing import Optional, List
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from .user_auth import get_current_user
from ..services.supabase_client import get_supabase_client as get_supabase


router = APIRouter(prefix="/api/v1/sync", tags=["Sync Logs"])


# ============================================================================
# Models
# ============================================================================

class SyncLogSummary(BaseModel):
    """Summary of a sync log entry."""
    id: str
    conversion_id: Optional[str] = None
    platform: str
    success: bool
    error_message: Optional[str] = None
    response_data: Optional[dict] = None
    created_at: str


class SyncLogListResponse(BaseModel):
    """Response for sync log list endpoint."""
    logs: List[SyncLogSummary]
    total: int
    page: int
    page_size: int
    has_more: bool


class SyncStatsResponse(BaseModel):
    """Sync statistics response."""
    total_syncs: int
    successful_syncs: int
    failed_syncs: int
    success_rate: float

    # By platform
    meta_syncs: int
    meta_success: int
    meta_failed: int
    google_syncs: int
    google_success: int
    google_failed: int

    # Recent activity
    syncs_today: int
    syncs_this_week: int


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/logs", response_model=SyncLogListResponse)
async def list_sync_logs(
    user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    platform: Optional[str] = Query(None, description="Filter by platform: meta or google"),
    success: Optional[bool] = Query(None, description="Filter by success status"),
    conversion_id: Optional[str] = Query(None, description="Filter by conversion ID"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """List sync log entries with filtering and pagination."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        return SyncLogListResponse(
            logs=[],
            total=0,
            page=page,
            page_size=page_size,
            has_more=False,
        )

    # Build query
    query = supabase.table("sync_logs").select(
        "id, conversion_id, platform, success, error_message, response_data, created_at",
        count="exact"
    ).eq("organization_id", org_id)

    # Apply filters
    if platform:
        query = query.eq("platform", platform)

    if success is not None:
        query = query.eq("success", success)

    if conversion_id:
        query = query.eq("conversion_id", conversion_id)

    if date_from:
        query = query.gte("created_at", date_from)

    if date_to:
        query = query.lte("created_at", date_to)

    # Order by most recent
    query = query.order("created_at", desc=True)

    # Pagination
    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)

    # Execute
    result = await query.execute()

    total = result.count or 0
    logs = [SyncLogSummary(**log) for log in result.data]

    return SyncLogListResponse(
        logs=logs,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(logs)) < total,
    )


@router.get("/logs/{log_id}")
async def get_sync_log(
    log_id: str,
    user: dict = Depends(get_current_user),
):
    """Get detailed sync log entry."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        return {"error": "Organization not found"}

    result = supabase.table("sync_logs").select("*").eq(
        "organization_id", org_id
    ).eq("id", log_id).maybe_single().execute()

    if not result.data:
        return {"error": "Log not found"}

    return result.data


@router.get("/stats", response_model=SyncStatsResponse)
async def get_sync_stats(
    user: dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=365),
):
    """Get sync statistics."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        return SyncStatsResponse(
            total_syncs=0,
            successful_syncs=0,
            failed_syncs=0,
            success_rate=0.0,
            meta_syncs=0,
            meta_success=0,
            meta_failed=0,
            google_syncs=0,
            google_success=0,
            google_failed=0,
            syncs_today=0,
            syncs_this_week=0,
        )

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    period_start = today_start - timedelta(days=days)

    # Total syncs in period
    total_result = supabase.table("sync_logs").select(
        "id", count="exact"
    ).eq("organization_id", org_id).gte("created_at", period_start.isoformat()).execute()
    total_syncs = total_result.count or 0

    # Successful syncs
    success_result = supabase.table("sync_logs").select(
        "id", count="exact"
    ).eq("organization_id", org_id).eq("success", True).gte(
        "created_at", period_start.isoformat()
    ).execute()
    successful_syncs = success_result.count or 0

    # Failed syncs
    failed_syncs = total_syncs - successful_syncs

    # Success rate
    success_rate = (successful_syncs / total_syncs * 100) if total_syncs > 0 else 0.0

    # Meta stats
    meta_total = supabase.table("sync_logs").select(
        "id", count="exact"
    ).eq("organization_id", org_id).eq("platform", "meta").gte(
        "created_at", period_start.isoformat()
    ).execute()
    meta_syncs = meta_total.count or 0

    meta_success_result = supabase.table("sync_logs").select(
        "id", count="exact"
    ).eq("organization_id", org_id).eq("platform", "meta").eq("success", True).gte(
        "created_at", period_start.isoformat()
    ).execute()
    meta_success = meta_success_result.count or 0
    meta_failed = meta_syncs - meta_success

    # Google stats
    google_total = supabase.table("sync_logs").select(
        "id", count="exact"
    ).eq("organization_id", org_id).eq("platform", "google").gte(
        "created_at", period_start.isoformat()
    ).execute()
    google_syncs = google_total.count or 0

    google_success_result = supabase.table("sync_logs").select(
        "id", count="exact"
    ).eq("organization_id", org_id).eq("platform", "google").eq("success", True).gte(
        "created_at", period_start.isoformat()
    ).execute()
    google_success = google_success_result.count or 0
    google_failed = google_syncs - google_success

    # Today
    today_result = supabase.table("sync_logs").select(
        "id", count="exact"
    ).eq("organization_id", org_id).gte("created_at", today_start.isoformat()).execute()
    syncs_today = today_result.count or 0

    # This week
    week_result = supabase.table("sync_logs").select(
        "id", count="exact"
    ).eq("organization_id", org_id).gte("created_at", week_start.isoformat()).execute()
    syncs_this_week = week_result.count or 0

    return SyncStatsResponse(
        total_syncs=total_syncs,
        successful_syncs=successful_syncs,
        failed_syncs=failed_syncs,
        success_rate=success_rate,
        meta_syncs=meta_syncs,
        meta_success=meta_success,
        meta_failed=meta_failed,
        google_syncs=google_syncs,
        google_success=google_success,
        google_failed=google_failed,
        syncs_today=syncs_today,
        syncs_this_week=syncs_this_week,
    )


@router.delete("/logs/{log_id}")
async def delete_sync_log(
    log_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a sync log entry (admin only for cleanup)."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        return {"error": "Organization not found"}

    # Verify exists and belongs to org
    existing = supabase.table("sync_logs").select("id").eq(
        "organization_id", org_id
    ).eq("id", log_id).maybe_single().execute()

    if not existing.data:
        return {"error": "Log not found"}

    supabase.table("sync_logs").delete().eq("id", log_id).execute()

    return {"status": "success", "message": "Log deleted"}
