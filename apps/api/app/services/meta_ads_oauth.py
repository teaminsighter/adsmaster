"""
Meta Ads OAuth Service

Handles OAuth 2.0 flow for Meta (Facebook/Instagram) Ads API access.
"""

import base64
import json
import secrets
from datetime import datetime, timedelta
from typing import Optional, List
from urllib.parse import urlencode

import httpx

from ..core.config import Settings


class MetaAdsOAuthService:
    """
    Meta Ads OAuth 2.0 implementation.

    Flow:
    1. get_authorization_url() - Generate URL to redirect user to Facebook
    2. exchange_code() - Exchange authorization code for short-lived token
    3. get_long_lived_token() - Exchange for 60-day token
    4. get_ad_accounts() - Fetch ad accounts user has access to
    5. refresh_token() - Refresh token before expiry
    """

    # Meta OAuth endpoints
    GRAPH_API_VERSION = "v21.0"
    BASE_URL = f"https://graph.facebook.com/{GRAPH_API_VERSION}"
    AUTH_URL = f"https://www.facebook.com/{GRAPH_API_VERSION}/dialog/oauth"

    # Required permissions for Meta Ads API
    PERMISSIONS = [
        "ads_management",           # Create, edit, delete ads
        "ads_read",                 # Read ad account data
        "business_management",      # Manage business assets
        "pages_read_engagement",    # Read page data
        "pages_show_list",          # List pages
        "read_insights",            # Read ad insights
    ]

    def __init__(self, settings: Settings):
        self.app_id = settings.meta_app_id
        self.app_secret = settings.meta_app_secret
        self.redirect_uri = settings.meta_redirect_uri

    def get_authorization_url(self, organization_id: str) -> tuple[str, str]:
        """
        Generate Meta OAuth authorization URL.

        Args:
            organization_id: The org to associate the connected account with

        Returns:
            Tuple of (auth_url, state)
        """
        state = self._generate_state(organization_id)

        params = {
            "client_id": self.app_id,
            "redirect_uri": self.redirect_uri,
            "scope": ",".join(self.PERMISSIONS),
            "response_type": "code",
            "state": state,
        }

        auth_url = f"{self.AUTH_URL}?{urlencode(params)}"
        return auth_url, state

    async def exchange_code(self, code: str) -> dict:
        """
        Exchange authorization code for access token.

        Args:
            code: Authorization code from OAuth callback

        Returns:
            Dict with access_token, token_type
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/oauth/access_token",
                params={
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "redirect_uri": self.redirect_uri,
                    "code": code,
                },
            )

            if response.status_code != 200:
                raise Exception(f"Token exchange failed: {response.text}")

            return response.json()

    async def get_long_lived_token(self, short_lived_token: str) -> dict:
        """
        Exchange short-lived token for long-lived token (60 days).

        Args:
            short_lived_token: The short-lived token from initial OAuth

        Returns:
            Dict with access_token, token_type, expires_in, expires_at
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "fb_exchange_token": short_lived_token,
                },
            )

            if response.status_code != 200:
                raise Exception(f"Long-lived token exchange failed: {response.text}")

            data = response.json()

            # Calculate expiry (60 days from now)
            expires_in = data.get("expires_in", 5184000)  # Default 60 days
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            return {
                "access_token": data["access_token"],
                "token_type": data.get("token_type", "bearer"),
                "expires_in": expires_in,
                "expires_at": expires_at.isoformat(),
            }

    async def refresh_token(self, access_token: str) -> dict:
        """
        Refresh a long-lived token.

        Meta tokens can be refreshed by exchanging them again
        before they expire.

        Args:
            access_token: Current long-lived token

        Returns:
            Dict with new access_token and expires_at
        """
        return await self.get_long_lived_token(access_token)

    async def get_ad_accounts(self, access_token: str) -> List[dict]:
        """
        Fetch all Meta ad accounts the user has access to.

        Args:
            access_token: Valid OAuth access token

        Returns:
            List of ad account dicts
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/me/adaccounts",
                params={
                    "access_token": access_token,
                    "fields": "id,name,account_status,currency,timezone_name,business,amount_spent",
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to list ad accounts: {response.text}")

            data = response.json()
            accounts = []

            for account in data.get("data", []):
                # account_status: 1=ACTIVE, 2=DISABLED, 3=UNSETTLED, etc.
                status_map = {
                    1: "ACTIVE",
                    2: "DISABLED",
                    3: "UNSETTLED",
                    7: "PENDING_RISK_REVIEW",
                    8: "PENDING_SETTLEMENT",
                    9: "IN_GRACE_PERIOD",
                    100: "PENDING_CLOSURE",
                    101: "CLOSED",
                    201: "ANY_ACTIVE",
                    202: "ANY_CLOSED",
                }

                accounts.append({
                    "account_id": account.get("id", "").replace("act_", ""),
                    "name": account.get("name", "Unnamed Account"),
                    "status": status_map.get(account.get("account_status"), "UNKNOWN"),
                    "currency": account.get("currency", "USD"),
                    "timezone": account.get("timezone_name", "UTC"),
                    "business_id": account.get("business", {}).get("id"),
                    "business_name": account.get("business", {}).get("name"),
                    "amount_spent": int(account.get("amount_spent", 0)),  # In cents
                })

            return accounts

    async def get_user_info(self, access_token: str) -> dict:
        """
        Get basic info about the authenticated user.

        Args:
            access_token: Valid OAuth access token

        Returns:
            Dict with user id, name, email
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/me",
                params={
                    "access_token": access_token,
                    "fields": "id,name,email",
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to get user info: {response.text}")

            return response.json()

    async def validate_token(self, access_token: str) -> dict:
        """
        Debug/validate an access token.

        Args:
            access_token: Token to validate

        Returns:
            Dict with token info including expiry
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/debug_token",
                params={
                    "input_token": access_token,
                    "access_token": f"{self.app_id}|{self.app_secret}",
                },
            )

            if response.status_code != 200:
                raise Exception(f"Token validation failed: {response.text}")

            data = response.json().get("data", {})

            return {
                "is_valid": data.get("is_valid", False),
                "app_id": data.get("app_id"),
                "user_id": data.get("user_id"),
                "expires_at": datetime.fromtimestamp(data.get("expires_at", 0)).isoformat() if data.get("expires_at") else None,
                "scopes": data.get("scopes", []),
            }

    def _generate_state(self, organization_id: str) -> str:
        """
        Generate a secure state parameter that includes org_id.
        """
        state_data = {
            "org_id": organization_id,
            "nonce": secrets.token_urlsafe(16),
            "platform": "meta",
        }
        return base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()

    def decode_state(self, state: str) -> str:
        """
        Decode the state parameter to extract organization_id.

        Args:
            state: Base64-encoded state string

        Returns:
            organization_id from the state
        """
        try:
            state_data = json.loads(base64.urlsafe_b64decode(state).decode())
            return state_data["org_id"]
        except Exception:
            raise Exception("Invalid state parameter")
