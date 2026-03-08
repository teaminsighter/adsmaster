"""
Sync API Endpoints

Trigger and monitor data synchronization from ad platforms.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..services.supabase_client import get_supabase_client
from ..workers.sync_worker import run_account_sync

router = APIRouter(prefix="/sync", tags=["Sync"])


# =============================================================================
# Response Models
# =============================================================================

class SyncStatusResponse(BaseModel):
    account_id: str
    last_sync_at: Optional[str]
    last_sync_status: Optional[str]
    sync_in_progress: bool


class SyncTriggerResponse(BaseModel):
    success: bool
    message: str
    sync_id: Optional[str] = None


class SyncLogResponse(BaseModel):
    id: str
    sync_type: str
    status: str
    started_at: str
    completed_at: Optional[str]
    campaigns_synced: int
    ad_groups_synced: int
    keywords_synced: int
    metrics_synced: int
    error_message: Optional[str]


class SyncLogsListResponse(BaseModel):
    logs: list[SyncLogResponse]
    total: int


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/status/{account_id}", response_model=SyncStatusResponse)
async def get_sync_status(account_id: str):
    """
    Get current sync status for an account.
    """
    supabase = get_supabase_client()

    # Get account info
    account = supabase.table("ad_accounts").select(
        "last_sync_at, last_sync_status"
    ).eq("id", account_id).execute()

    if not account.data:
        raise HTTPException(status_code=404, detail="Account not found")

    # Check if sync is in progress
    in_progress = supabase.table("sync_logs").select("id").eq(
        "ad_account_id", account_id
    ).eq("status", "started").execute()

    return SyncStatusResponse(
        account_id=account_id,
        last_sync_at=account.data[0].get("last_sync_at"),
        last_sync_status=account.data[0].get("last_sync_status"),
        sync_in_progress=len(in_progress.data) > 0,
    )


@router.post("/trigger/{account_id}", response_model=SyncTriggerResponse)
async def trigger_sync(
    account_id: str,
    background_tasks: BackgroundTasks,
    sync_type: str = "full",  # full, incremental, metrics_only
):
    """
    Trigger a sync for an ad account.

    The sync runs in the background and updates campaigns, ad groups,
    keywords, and metrics from the ad platform.
    """
    supabase = get_supabase_client()

    # Verify account exists and is connected
    account = supabase.table("ad_accounts").select(
        "id, status, token_status"
    ).eq("id", account_id).execute()

    if not account.data:
        raise HTTPException(status_code=404, detail="Account not found")

    account_data = account.data[0]

    if account_data["status"] != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Account is {account_data['status']}. Cannot sync."
        )

    if account_data["token_status"] not in ["healthy", "expiring_soon"]:
        raise HTTPException(
            status_code=400,
            detail=f"Token status is {account_data['token_status']}. Reconnect account."
        )

    # Check if sync already in progress
    in_progress = supabase.table("sync_logs").select("id").eq(
        "ad_account_id", account_id
    ).eq("status", "started").execute()

    if in_progress.data:
        raise HTTPException(
            status_code=409,
            detail="Sync already in progress for this account"
        )

    # Create sync log entry
    sync_log = supabase.table("sync_logs").insert({
        "ad_account_id": account_id,
        "sync_type": sync_type,
        "status": "started",
        "started_at": datetime.utcnow().isoformat(),
    }).execute()

    sync_id = sync_log.data[0]["id"]

    # Run sync in background
    background_tasks.add_task(run_account_sync, account_id, sync_id, sync_type)

    return SyncTriggerResponse(
        success=True,
        message=f"Sync started ({sync_type})",
        sync_id=sync_id,
    )


@router.get("/logs/{account_id}", response_model=SyncLogsListResponse)
async def get_sync_logs(
    account_id: str,
    limit: int = 10,
):
    """
    Get sync history for an account.
    """
    supabase = get_supabase_client()

    result = supabase.table("sync_logs").select("*").eq(
        "ad_account_id", account_id
    ).order("started_at", desc=True).limit(limit).execute()

    logs = [
        SyncLogResponse(
            id=row["id"],
            sync_type=row["sync_type"],
            status=row["status"],
            started_at=row["started_at"],
            completed_at=row.get("completed_at"),
            campaigns_synced=row.get("campaigns_synced", 0),
            ad_groups_synced=row.get("ad_groups_synced", 0),
            keywords_synced=row.get("keywords_synced", 0),
            metrics_synced=row.get("metrics_synced", 0),
            error_message=row.get("error_message"),
        )
        for row in result.data
    ]

    return SyncLogsListResponse(logs=logs, total=len(logs))


@router.delete("/cancel/{sync_id}")
async def cancel_sync(sync_id: str):
    """
    Cancel an in-progress sync.

    Note: This marks the sync as cancelled but may not immediately
    stop background processing.
    """
    supabase = get_supabase_client()

    result = supabase.table("sync_logs").select("status").eq("id", sync_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Sync not found")

    if result.data[0]["status"] != "started":
        raise HTTPException(
            status_code=400,
            detail=f"Sync is {result.data[0]['status']}, cannot cancel"
        )

    supabase.table("sync_logs").update({
        "status": "cancelled",
        "completed_at": datetime.utcnow().isoformat(),
    }).eq("id", sync_id).execute()

    return {"success": True, "message": "Sync cancelled"}
