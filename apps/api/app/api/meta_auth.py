"""
Meta Ads Authentication API Endpoints

Handles OAuth 2.0 flow for connecting Meta (Facebook/Instagram) ad accounts.
Connected to PostgreSQL database.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os

from ..services.supabase_client import get_supabase_client
from ..services.meta_ads_oauth import MetaAdsOAuthService
from .user_auth import get_current_user


router = APIRouter(prefix="/auth/meta", tags=["Meta Authentication"])


# =============================================================================
# Response Models
# =============================================================================

class ConnectResponse(BaseModel):
    authorization_url: str
    state: str


class AdAccountInfo(BaseModel):
    id: str
    account_id: str
    name: str
    status: str
    currency: str
    timezone: str
    business_id: Optional[str] = None
    business_name: Optional[str] = None
    amount_spent: Optional[int] = None


class CallbackResponse(BaseModel):
    success: bool
    message: str
    accounts: List[AdAccountInfo]
    user_id: Optional[str] = None
    user_name: Optional[str] = None


class TokenStatusResponse(BaseModel):
    is_valid: bool
    expires_at: Optional[str] = None
    scopes: List[str] = []


class TokenRefreshResponse(BaseModel):
    success: bool
    message: str
    expires_at: Optional[str] = None


# =============================================================================
# Helper Functions
# =============================================================================

def get_meta_oauth_service() -> MetaAdsOAuthService:
    """Get Meta OAuth service instance."""
    from ..core.config import get_settings
    settings = get_settings()
    return MetaAdsOAuthService(settings)


def get_meta_platform_id() -> Optional[str]:
    """Get the Meta Ads platform ID from database."""
    db = get_supabase_client()
    result = db.table("ad_platforms").select("id").eq("name", "meta_ads").execute()
    if result.data:
        return result.data[0]["id"]
    return None


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/connect", response_model=ConnectResponse)
async def meta_connect(
    current_user: dict = Depends(get_current_user),
):
    """
    Start Meta Ads OAuth flow.

    Returns a URL to redirect the user to Facebook's OAuth consent screen.
    After the user authorizes, they'll be redirected back to /auth/meta/callback.
    """
    oauth_service = get_meta_oauth_service()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    if not oauth_service.app_id:
        raise HTTPException(
            status_code=500,
            detail="Meta Ads integration not configured. Set META_APP_ID and META_APP_SECRET."
        )

    auth_url, state = oauth_service.get_authorization_url(organization_id)

    return ConnectResponse(
        authorization_url=auth_url,
        state=state
    )


@router.get("/callback")
async def meta_callback(
    code: str = Query(None, description="Authorization code from Meta"),
    state: str = Query(None, description="State parameter for CSRF protection"),
    error: Optional[str] = Query(None, description="Error code if authorization failed"),
    error_reason: Optional[str] = Query(None, description="Error reason"),
    error_description: Optional[str] = Query(None, description="Error description"),
):
    """
    Handle OAuth callback from Meta.

    Exchanges the authorization code for tokens and fetches accessible ad accounts.
    Stores accounts and tokens in database.
    """
    oauth_service = get_meta_oauth_service()
    db = get_supabase_client()

    # Handle errors from Meta
    if error:
        error_msg = error_description or error_reason or error
        web_url = os.getenv("WEB_URL", "http://localhost:3000")
        return RedirectResponse(url=f"{web_url}/settings/accounts?platform=meta&status=error&message={error_msg}")

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state parameter")

    try:
        # Decode state to get organization_id
        organization_id = oauth_service.decode_state(state)

        # Exchange code for short-lived token
        token_data = await oauth_service.exchange_code(code)
        short_lived_token = token_data.get("access_token")

        if not short_lived_token:
            raise HTTPException(status_code=400, detail="Failed to obtain access token")

        # Exchange for long-lived token (60 days)
        long_lived_data = await oauth_service.get_long_lived_token(short_lived_token)
        access_token = long_lived_data["access_token"]
        expires_at = long_lived_data.get("expires_at")

        # Get user info
        user_info = await oauth_service.get_user_info(access_token)

        # Fetch accessible ad accounts
        accounts = await oauth_service.get_ad_accounts(access_token)

        # Get Meta platform ID
        platform_id = get_meta_platform_id()

        # Store accounts in database
        import uuid
        accounts_created = 0

        for account in accounts:
            external_account_id = account["account_id"]

            # Check if account already exists
            existing = db.table("ad_accounts").select("id").eq(
                "external_account_id", external_account_id
            ).eq("organization_id", organization_id).execute()

            if existing.data:
                # Update existing account
                db.table("ad_accounts").update({
                    "access_token": access_token,
                    "token_expires_at": expires_at,
                    "token_status": "valid",
                    "status": "active",
                    "name": account.get("name", external_account_id),
                }).eq("id", existing.data[0]["id"]).execute()
            else:
                # Create new account
                db.table("ad_accounts").insert({
                    "id": str(uuid.uuid4()),
                    "organization_id": organization_id,
                    "platform_id": platform_id,
                    "external_account_id": external_account_id,
                    "name": account.get("name", f"Meta Account {external_account_id}"),
                    "currency_code": account.get("currency", "USD"),
                    "timezone": account.get("timezone", "UTC"),
                    "status": "active",
                    "token_status": "valid",
                    "access_token": access_token,
                    "token_expires_at": expires_at,
                }).execute()
                accounts_created += 1

        # Redirect to frontend with success
        web_url = os.getenv("WEB_URL", "http://localhost:3000")
        redirect_url = f"{web_url}/settings/accounts?platform=meta&status=success&count={len(accounts)}"
        return RedirectResponse(url=redirect_url)

    except Exception as e:
        web_url = os.getenv("WEB_URL", "http://localhost:3000")
        redirect_url = f"{web_url}/settings/accounts?platform=meta&status=error&message={str(e)}"
        return RedirectResponse(url=redirect_url)


@router.get("/accounts", response_model=List[AdAccountInfo])
async def list_meta_accounts(
    current_user: dict = Depends(get_current_user),
):
    """
    List all connected Meta ad accounts for the user's organization.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        return []

    # Get Meta platform ID
    platform_id = get_meta_platform_id()

    result = db.table("ad_accounts").select("*").eq(
        "organization_id", organization_id
    ).eq("platform_id", platform_id).neq("status", "disconnected").execute()

    accounts = []
    for row in result.data or []:
        accounts.append(AdAccountInfo(
            id=row["id"],
            account_id=row["external_account_id"],
            name=row.get("name", ""),
            status=row.get("status", "active"),
            currency=row.get("currency_code", "USD"),
            timezone=row.get("timezone", "UTC"),
        ))

    return accounts


@router.get("/token-status/{account_id}", response_model=TokenStatusResponse)
async def get_token_status(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Check the status of an account's access token.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Get account
    result = db.table("ad_accounts").select("access_token, token_expires_at, token_status").eq(
        "id", account_id
    ).eq("organization_id", organization_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    account = result.data[0]
    access_token = account.get("access_token")

    if not access_token:
        return TokenStatusResponse(is_valid=False, expires_at=None, scopes=[])

    try:
        oauth_service = get_meta_oauth_service()
        validation = await oauth_service.validate_token(access_token)
        return TokenStatusResponse(
            is_valid=validation.get("is_valid", False),
            expires_at=validation.get("expires_at"),
            scopes=validation.get("scopes", []),
        )
    except Exception:
        return TokenStatusResponse(is_valid=False, expires_at=None, scopes=[])


@router.post("/refresh/{account_id}", response_model=TokenRefreshResponse)
async def refresh_meta_token(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Refresh the access token for a Meta ad account.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Get account
    result = db.table("ad_accounts").select("access_token").eq(
        "id", account_id
    ).eq("organization_id", organization_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    access_token = result.data[0].get("access_token")
    if not access_token:
        return TokenRefreshResponse(success=False, message="No token to refresh")

    try:
        oauth_service = get_meta_oauth_service()
        new_token_data = await oauth_service.refresh_token(access_token)

        # Update token in database
        db.table("ad_accounts").update({
            "access_token": new_token_data["access_token"],
            "token_expires_at": new_token_data.get("expires_at"),
            "token_status": "valid",
        }).eq("id", account_id).execute()

        return TokenRefreshResponse(
            success=True,
            message="Token refreshed successfully",
            expires_at=new_token_data.get("expires_at"),
        )
    except Exception as e:
        return TokenRefreshResponse(
            success=False,
            message=f"Token refresh failed: {str(e)}",
        )


@router.delete("/disconnect/{account_id}")
async def disconnect_meta_account(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Disconnect a Meta ad account.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify account belongs to user's organization
    result = db.table("ad_accounts").select("id").eq(
        "id", account_id
    ).eq("organization_id", organization_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")

    # Mark as disconnected (preserve data)
    db.table("ad_accounts").update({
        "status": "disconnected",
        "access_token": None,
        "token_status": "revoked",
    }).eq("id", account_id).execute()

    return {"success": True, "message": "Account disconnected"}
