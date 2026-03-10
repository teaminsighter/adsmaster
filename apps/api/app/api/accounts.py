"""
Ad Accounts API Endpoints

CRUD operations for ad accounts (Google Ads, Meta Ads).
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..services.supabase_client import get_supabase_client
from .user_auth import get_current_user

router = APIRouter(prefix="/accounts", tags=["Ad Accounts"])


def _to_str(val):
    """Convert UUID/datetime to string, handle None."""
    if val is None:
        return None
    return str(val)


# =============================================================================
# Response Models
# =============================================================================

class AdAccountResponse(BaseModel):
    id: str
    organization_id: str
    platform: str  # google_ads, meta_ads
    external_account_id: str
    name: str
    currency_code: str
    timezone: str
    status: str
    token_status: str
    last_sync_at: Optional[str]
    created_at: str


class AdAccountListResponse(BaseModel):
    accounts: list[AdAccountResponse]
    total: int


class AdAccountStatsResponse(BaseModel):
    account_id: str
    campaigns_count: int
    active_campaigns: int
    total_spend_30d: int  # micros
    total_conversions_30d: float


# =============================================================================
# Endpoints
# =============================================================================

@router.get("", response_model=AdAccountListResponse)
async def list_accounts(
    platform: Optional[str] = Query(None, description="Filter by platform (google_ads, meta_ads)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: dict = Depends(get_current_user),
):
    """
    List all ad accounts for an organization.

    Returns accounts with their connection status and last sync time.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        return AdAccountListResponse(accounts=[], total=0)

    # Build query
    query = supabase.table("ad_accounts").select(
        "*, ad_platforms(name, display_name)"
    ).eq("organization_id", organization_id)

    if status:
        query = query.eq("status", status)

    result = query.order("created_at", desc=True).execute()

    accounts = []
    for row in result.data:
        platform_info = row.get("ad_platforms", {})
        accounts.append(AdAccountResponse(
            id=_to_str(row["id"]),
            organization_id=_to_str(row["organization_id"]),
            platform=platform_info.get("name", "unknown"),
            external_account_id=row["external_account_id"],
            name=row["name"],
            currency_code=row["currency_code"],
            timezone=row["timezone"],
            status=row["status"],
            token_status=row["token_status"],
            last_sync_at=_to_str(row.get("last_sync_at")),
            created_at=_to_str(row["created_at"]),
        ))

    # Filter by platform if specified
    if platform:
        accounts = [a for a in accounts if a.platform == platform]

    return AdAccountListResponse(accounts=accounts, total=len(accounts))


@router.get("/{account_id}", response_model=AdAccountResponse)
async def get_account(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get a single ad account by ID.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    query = supabase.table("ad_accounts").select(
        "*, ad_platforms(name, display_name)"
    ).eq("id", account_id)

    # Filter by organization for security
    if organization_id:
        query = query.eq("organization_id", organization_id)

    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    row = result.data[0]
    platform_info = row.get("ad_platforms", {})

    return AdAccountResponse(
        id=row["id"],
        organization_id=row["organization_id"],
        platform=platform_info.get("name", "unknown"),
        external_account_id=row["external_account_id"],
        name=row["name"],
        currency_code=row["currency_code"],
        timezone=row["timezone"],
        status=row["status"],
        token_status=row["token_status"],
        last_sync_at=row.get("last_sync_at"),
        created_at=row["created_at"],
    )


@router.get("/{account_id}/stats", response_model=AdAccountStatsResponse)
async def get_account_stats(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get statistics for an ad account.

    Returns campaign counts and 30-day spend/conversions.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify account belongs to user's organization
    if organization_id:
        account_check = supabase.table("ad_accounts").select("id").eq(
            "id", account_id
        ).eq("organization_id", organization_id).execute()
        if not account_check.data:
            raise HTTPException(status_code=404, detail="Ad account not found")

    # Get campaign counts
    campaigns_result = supabase.table("campaigns").select(
        "id, status"
    ).eq("ad_account_id", account_id).execute()

    campaigns = campaigns_result.data
    active_campaigns = len([c for c in campaigns if c["status"] == "ENABLED"])

    # Get 30-day metrics
    from datetime import date, timedelta
    date_30d_ago = (date.today() - timedelta(days=30)).isoformat()

    metrics_result = supabase.table("metrics_daily").select(
        "cost_micros, conversions"
    ).eq("ad_account_id", account_id).gte("metric_date", date_30d_ago).execute()

    total_spend = sum(m.get("cost_micros", 0) or 0 for m in metrics_result.data)
    total_conversions = sum(m.get("conversions", 0) or 0 for m in metrics_result.data)

    return AdAccountStatsResponse(
        account_id=account_id,
        campaigns_count=len(campaigns),
        active_campaigns=active_campaigns,
        total_spend_30d=total_spend,
        total_conversions_30d=total_conversions,
    )


@router.delete("/{account_id}")
async def disconnect_account(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Disconnect an ad account.

    This marks the account as disconnected but preserves historical data.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Check if account exists and belongs to user's organization
    query = supabase.table("ad_accounts").select("id").eq("id", account_id)
    if organization_id:
        query = query.eq("organization_id", organization_id)
    result = query.execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    # Mark as disconnected (don't delete - preserve history)
    supabase.table("ad_accounts").update({
        "status": "disconnected",
        "access_token": None,
        "refresh_token": None,
    }).eq("id", account_id).execute()

    return {"success": True, "message": "Account disconnected"}


@router.post("/{account_id}/reconnect")
async def reconnect_account(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get URL to reconnect a disconnected account.

    Returns the OAuth URL to restart the connection flow.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    query = supabase.table("ad_accounts").select(
        "*, ad_platforms(name)"
    ).eq("id", account_id)
    if organization_id:
        query = query.eq("organization_id", organization_id)
    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    account = result.data[0]
    platform = account.get("ad_platforms", {}).get("name")

    if platform == "google_ads":
        return {
            "redirect_url": f"/auth/google-ads/connect?organization_id={account['organization_id']}"
        }
    elif platform == "meta_ads":
        return {
            "redirect_url": f"/auth/meta/connect?organization_id={account['organization_id']}"
        }
    else:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")


# =============================================================================
# Token Health Endpoints
# =============================================================================

class TokenHealthResponse(BaseModel):
    account_id: str
    account_name: Optional[str]
    platform: Optional[str]
    status: str  # healthy, expiring_soon, refresh_failed, expired
    badge_color: str  # green, amber, red
    badge_text: str
    days_remaining: Optional[int]
    expires_at: Optional[str]
    refresh_attempts: int
    last_error: Optional[str]
    needs_action: bool


@router.get("/{account_id}/token-health", response_model=TokenHealthResponse)
async def get_account_token_health(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get token health status for an account.

    Returns:
    - status: healthy, expiring_soon, refresh_failed, or expired
    - badge_color: green, amber, or red
    - badge_text: Display text for UI badge
    - days_remaining: Days until token expires
    - needs_action: Whether user action is required
    """
    from ..workers.token_refresh_worker import TokenHealthService

    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify account belongs to user's organization
    if organization_id:
        account_check = supabase.table("ad_accounts").select("id").eq(
            "id", account_id
        ).eq("organization_id", organization_id).execute()
        if not account_check.data:
            raise HTTPException(status_code=404, detail="Account not found")

    service = TokenHealthService()
    health = await service.get_account_token_health(account_id)

    if health.get("error"):
        raise HTTPException(status_code=404, detail=health["error"])

    return TokenHealthResponse(**health)


@router.get("/token-health/all", response_model=list[TokenHealthResponse])
async def get_all_token_health(
    current_user: dict = Depends(get_current_user),
):
    """
    Get token health status for all accounts in the organization.

    Useful for displaying a token health dashboard.
    """
    from ..workers.token_refresh_worker import TokenHealthService

    organization_id = current_user.get("organization_id")

    if not organization_id:
        return []

    service = TokenHealthService()
    health_list = await service.get_organization_token_health(organization_id)

    return [TokenHealthResponse(**h) for h in health_list]


@router.post("/{account_id}/refresh-token")
async def refresh_account_token(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Manually trigger token refresh for an account.

    Use this when a token is expiring soon or refresh has failed.
    """
    from ..workers.token_refresh_worker import TokenRefreshWorker

    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Get account with platform info
    query = supabase.table("ad_accounts").select(
        "*, ad_platforms(name)"
    ).eq("id", account_id)

    if organization_id:
        query = query.eq("organization_id", organization_id)

    result = query.execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    account = result.data[0]
    platform = account.get("ad_platforms", {}).get("name")

    if platform != "meta_ads":
        # Google tokens use standard OAuth refresh, not manual
        return {
            "success": False,
            "message": "Manual token refresh only supported for Meta accounts",
        }

    worker = TokenRefreshWorker()
    success = await worker.refresh_meta_token(account)

    if success:
        return {
            "success": True,
            "message": "Token refreshed successfully. New token valid for 60 days.",
        }
    else:
        # Get updated status
        updated = supabase.table("ad_accounts").select(
            "token_status, token_refresh_attempts, token_last_refresh_error"
        ).eq("id", account_id).execute()

        error = updated.data[0].get("token_last_refresh_error") if updated.data else "Unknown error"

        return {
            "success": False,
            "message": f"Token refresh failed: {error}",
            "reconnect_required": True,
        }
