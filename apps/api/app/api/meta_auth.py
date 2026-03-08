"""
Meta Ads Authentication API Endpoints

Handles OAuth 2.0 flow for connecting Meta (Facebook/Instagram) ad accounts.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from ..core.config import Settings, get_settings
from ..services.meta_ads_oauth import MetaAdsOAuthService


router = APIRouter(prefix="/auth/meta", tags=["Meta Authentication"])


# Response Models
class ConnectResponse(BaseModel):
    authorization_url: str
    state: str


class AdAccountInfo(BaseModel):
    account_id: str
    name: str
    status: str
    currency: str
    timezone: str
    business_id: Optional[str] = None
    business_name: Optional[str] = None
    amount_spent: int


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


# In-memory store for MVP (would be database in production)
_connected_accounts = {}
_tokens = {}


def get_meta_oauth_service(settings: Settings = Depends(get_settings)) -> MetaAdsOAuthService:
    return MetaAdsOAuthService(settings)


@router.get("/connect", response_model=ConnectResponse)
async def meta_connect(
    organization_id: str = Query(..., description="Organization ID to associate account with"),
    oauth_service: MetaAdsOAuthService = Depends(get_meta_oauth_service),
):
    """
    Start Meta Ads OAuth flow.

    Returns a URL to redirect the user to Facebook's OAuth consent screen.
    After the user authorizes, they'll be redirected back to /auth/meta/callback.
    """
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
    oauth_service: MetaAdsOAuthService = Depends(get_meta_oauth_service),
    settings: Settings = Depends(get_settings),
):
    """
    Handle OAuth callback from Meta.

    Exchanges the authorization code for tokens and fetches accessible ad accounts.
    """
    # Handle errors from Meta
    if error:
        error_msg = error_description or error_reason or error
        raise HTTPException(status_code=400, detail=f"Authorization failed: {error_msg}")

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

        # Get user info
        user_info = await oauth_service.get_user_info(access_token)

        # Fetch accessible ad accounts
        accounts = await oauth_service.get_ad_accounts(access_token)

        # Store tokens (in production, store in database)
        for account in accounts:
            account_id = account["account_id"]
            _tokens[account_id] = {
                "access_token": access_token,
                "expires_at": long_lived_data["expires_at"],
                "organization_id": organization_id,
                "user_id": user_info.get("id"),
            }
            _connected_accounts[account_id] = {
                **account,
                "organization_id": organization_id,
                "platform": "meta",
                "connected_at": datetime.utcnow().isoformat(),
            }

        # Redirect to frontend with success
        redirect_url = f"{settings.web_url}/settings/accounts?platform=meta&status=success&count={len(accounts)}"
        return RedirectResponse(url=redirect_url)

    except Exception as e:
        # Redirect to frontend with error
        redirect_url = f"{settings.web_url}/settings/accounts?platform=meta&status=error&message={str(e)}"
        return RedirectResponse(url=redirect_url)


@router.get("/accounts", response_model=List[AdAccountInfo])
async def list_meta_accounts(
    organization_id: str = Query(..., description="Organization ID to filter accounts"),
):
    """
    List all connected Meta ad accounts for an organization.
    """
    accounts = [
        AdAccountInfo(**acc)
        for acc in _connected_accounts.values()
        if acc.get("organization_id") == organization_id
    ]
    return accounts


@router.get("/token-status/{account_id}", response_model=TokenStatusResponse)
async def get_token_status(
    account_id: str,
    oauth_service: MetaAdsOAuthService = Depends(get_meta_oauth_service),
):
    """
    Check the status of an account's access token.
    """
    token_data = _tokens.get(account_id)
    if not token_data:
        raise HTTPException(status_code=404, detail="Account not found")

    try:
        validation = await oauth_service.validate_token(token_data["access_token"])
        return TokenStatusResponse(
            is_valid=validation["is_valid"],
            expires_at=validation["expires_at"],
            scopes=validation["scopes"],
        )
    except Exception as e:
        return TokenStatusResponse(
            is_valid=False,
            expires_at=None,
            scopes=[],
        )


@router.post("/refresh/{account_id}", response_model=TokenRefreshResponse)
async def refresh_meta_token(
    account_id: str,
    oauth_service: MetaAdsOAuthService = Depends(get_meta_oauth_service),
):
    """
    Refresh the access token for a Meta ad account.

    Should be called before the token expires (within 7 days of expiry).
    """
    token_data = _tokens.get(account_id)
    if not token_data:
        raise HTTPException(status_code=404, detail="Account not found")

    try:
        new_token_data = await oauth_service.refresh_token(token_data["access_token"])

        # Update stored token
        _tokens[account_id] = {
            **token_data,
            "access_token": new_token_data["access_token"],
            "expires_at": new_token_data["expires_at"],
        }

        return TokenRefreshResponse(
            success=True,
            message="Token refreshed successfully",
            expires_at=new_token_data["expires_at"],
        )

    except Exception as e:
        return TokenRefreshResponse(
            success=False,
            message=f"Token refresh failed: {str(e)}",
            expires_at=None,
        )


@router.delete("/disconnect/{account_id}")
async def disconnect_meta_account(account_id: str):
    """
    Disconnect a Meta ad account.
    """
    if account_id not in _connected_accounts:
        raise HTTPException(status_code=404, detail="Account not found")

    del _connected_accounts[account_id]
    if account_id in _tokens:
        del _tokens[account_id]

    return {"success": True, "message": "Account disconnected"}
