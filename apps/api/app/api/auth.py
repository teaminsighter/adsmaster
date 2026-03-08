"""
Authentication Endpoints

Handles OAuth flows for Google Ads and Meta Ads platforms.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional

from ..core.config import get_settings, Settings
from ..services.google_ads_oauth import GoogleAdsOAuthService
from ..services.supabase_client import get_supabase_client

router = APIRouter(prefix="/auth", tags=["Authentication"])


# =============================================================================
# Request/Response Models
# =============================================================================

class ConnectResponse(BaseModel):
    auth_url: str
    state: str


class CallbackResponse(BaseModel):
    success: bool
    account_id: Optional[str] = None
    account_name: Optional[str] = None
    message: str


class TokenRefreshResponse(BaseModel):
    success: bool
    expires_at: Optional[str] = None


# =============================================================================
# Google Ads OAuth
# =============================================================================

@router.get("/google-ads/connect", response_model=ConnectResponse)
async def google_ads_connect(
    organization_id: str = Query(..., description="Organization ID to connect account to"),
    settings: Settings = Depends(get_settings),
):
    """
    Initiate Google Ads OAuth flow.

    Returns the Google OAuth URL to redirect the user to.
    The user will grant permissions and be redirected back to /callback.
    """
    if not settings.google_ads_client_id:
        raise HTTPException(
            status_code=500,
            detail="Google Ads OAuth not configured. Set GOOGLE_ADS_CLIENT_ID."
        )

    oauth_service = GoogleAdsOAuthService(settings)
    auth_url, state = oauth_service.get_authorization_url(organization_id)

    return ConnectResponse(auth_url=auth_url, state=state)


@router.get("/google-ads/callback")
async def google_ads_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: str = Query(..., description="State parameter for CSRF protection"),
    error: Optional[str] = Query(None, description="Error if authorization failed"),
    settings: Settings = Depends(get_settings),
):
    """
    Handle Google Ads OAuth callback.

    Exchanges authorization code for tokens and fetches accessible accounts.
    Creates ad_account records in the database.
    """
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")

    oauth_service = GoogleAdsOAuthService(settings)

    try:
        # Exchange code for tokens
        tokens = await oauth_service.exchange_code(code)

        # Decode state to get organization_id
        organization_id = oauth_service.decode_state(state)

        # Fetch accessible Google Ads accounts
        accounts = await oauth_service.get_accessible_accounts(tokens["access_token"])

        if not accounts:
            raise HTTPException(
                status_code=400,
                detail="No Google Ads accounts found. Make sure you have access to at least one account."
            )

        # Store accounts in database
        supabase = get_supabase_client()
        created_accounts = []

        for account in accounts:
            # Check if account already exists
            existing = supabase.table("ad_accounts").select("id").eq(
                "external_account_id", account["customer_id"]
            ).execute()

            if existing.data:
                # Update existing account with new tokens
                supabase.table("ad_accounts").update({
                    "access_token": tokens["access_token"],
                    "refresh_token": tokens["refresh_token"],
                    "token_expires_at": tokens["expires_at"],
                    "token_status": "healthy",
                    "token_refresh_attempts": 0,
                    "status": "active",
                }).eq("id", existing.data[0]["id"]).execute()
                created_accounts.append(existing.data[0]["id"])
            else:
                # Create new account
                result = supabase.table("ad_accounts").insert({
                    "organization_id": organization_id,
                    "platform_id": get_google_ads_platform_id(supabase),
                    "external_account_id": account["customer_id"],
                    "name": account["descriptive_name"],
                    "currency_code": account.get("currency_code", "USD"),
                    "timezone": account.get("time_zone", "UTC"),
                    "access_token": tokens["access_token"],
                    "refresh_token": tokens["refresh_token"],
                    "token_expires_at": tokens["expires_at"],
                    "token_status": "healthy",
                    "status": "active",
                }).execute()
                created_accounts.append(result.data[0]["id"])

        # Redirect to frontend success page
        frontend_url = settings.web_url or "http://localhost:3000"
        return RedirectResponse(
            url=f"{frontend_url}/settings/accounts?connected=google_ads&count={len(created_accounts)}"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/google-ads/refresh/{account_id}", response_model=TokenRefreshResponse)
async def refresh_google_ads_token(
    account_id: str,
    settings: Settings = Depends(get_settings),
):
    """
    Manually refresh Google Ads OAuth token for an account.

    Normally tokens are refreshed automatically, but this endpoint
    allows manual refresh if needed.
    """
    supabase = get_supabase_client()

    # Get account
    result = supabase.table("ad_accounts").select("*").eq("id", account_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    account = result.data[0]

    oauth_service = GoogleAdsOAuthService(settings)

    try:
        new_tokens = await oauth_service.refresh_token(account["refresh_token"])

        # Update account
        supabase.table("ad_accounts").update({
            "access_token": new_tokens["access_token"],
            "token_expires_at": new_tokens["expires_at"],
            "token_status": "healthy",
            "token_refresh_attempts": 0,
        }).eq("id", account_id).execute()

        return TokenRefreshResponse(
            success=True,
            expires_at=new_tokens["expires_at"]
        )

    except Exception as e:
        # Update failure count
        supabase.table("ad_accounts").update({
            "token_refresh_attempts": account.get("token_refresh_attempts", 0) + 1,
            "token_status": "refresh_failed",
        }).eq("id", account_id).execute()

        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")


# =============================================================================
# Meta Ads OAuth (Placeholder for Sprint 5)
# =============================================================================

@router.get("/meta/connect")
async def meta_connect():
    """Initiate Meta Ads OAuth flow. (Sprint 5)"""
    raise HTTPException(status_code=501, detail="Meta OAuth not yet implemented")


@router.get("/meta/callback")
async def meta_callback():
    """Handle Meta Ads OAuth callback. (Sprint 5)"""
    raise HTTPException(status_code=501, detail="Meta OAuth not yet implemented")


# =============================================================================
# Helpers
# =============================================================================

def get_google_ads_platform_id(supabase) -> str:
    """Get the platform ID for Google Ads."""
    result = supabase.table("ad_platforms").select("id").eq("name", "google_ads").execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Google Ads platform not found in database")
    return result.data[0]["id"]
