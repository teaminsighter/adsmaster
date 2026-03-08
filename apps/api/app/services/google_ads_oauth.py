"""
Google Ads OAuth Service

Handles OAuth 2.0 flow for Google Ads API access.
"""

import base64
import hashlib
import json
import secrets
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx

from ..core.config import Settings


class GoogleAdsOAuthService:
    """
    Google Ads OAuth 2.0 implementation.

    Flow:
    1. get_authorization_url() - Generate URL to redirect user to Google
    2. exchange_code() - Exchange authorization code for tokens
    3. get_accessible_accounts() - Fetch accounts user has access to
    4. refresh_token() - Refresh expired access token
    """

    # Google OAuth endpoints
    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"

    # Required scopes for Google Ads API
    SCOPES = [
        "https://www.googleapis.com/auth/adwords",  # Google Ads API access
    ]

    def __init__(self, settings: Settings):
        self.client_id = settings.google_ads_client_id
        self.client_secret = settings.google_ads_client_secret
        self.redirect_uri = settings.google_ads_redirect_uri
        self.developer_token = settings.google_ads_developer_token

    def get_authorization_url(self, organization_id: str) -> tuple[str, str]:
        """
        Generate Google OAuth authorization URL.

        Args:
            organization_id: The org to associate the connected account with

        Returns:
            Tuple of (auth_url, state)
        """
        # Generate state for CSRF protection (includes org_id)
        state = self._generate_state(organization_id)

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.SCOPES),
            "access_type": "offline",  # Required for refresh token
            "prompt": "consent",  # Always show consent screen to get refresh token
            "state": state,
        }

        auth_url = f"{self.AUTH_URL}?{urlencode(params)}"
        return auth_url, state

    async def exchange_code(self, code: str) -> dict:
        """
        Exchange authorization code for access and refresh tokens.

        Args:
            code: Authorization code from OAuth callback

        Returns:
            Dict with access_token, refresh_token, expires_at
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": self.redirect_uri,
                },
            )

            if response.status_code != 200:
                raise Exception(f"Token exchange failed: {response.text}")

            data = response.json()

            # Calculate expiry time
            expires_in = data.get("expires_in", 3600)
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            return {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token"),
                "expires_at": expires_at.isoformat(),
            }

    async def refresh_token(self, refresh_token: str) -> dict:
        """
        Refresh an expired access token.

        Args:
            refresh_token: The refresh token to use

        Returns:
            Dict with new access_token and expires_at
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )

            if response.status_code != 200:
                raise Exception(f"Token refresh failed: {response.text}")

            data = response.json()

            expires_in = data.get("expires_in", 3600)
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            return {
                "access_token": data["access_token"],
                "expires_at": expires_at.isoformat(),
            }

    async def get_accessible_accounts(self, access_token: str) -> list[dict]:
        """
        Fetch all Google Ads accounts the user has access to.

        Uses the Google Ads API to list accessible customers.

        Args:
            access_token: Valid OAuth access token

        Returns:
            List of account dicts with customer_id, descriptive_name, etc.
        """
        # Use Google Ads API to list accessible customers
        url = "https://googleads.googleapis.com/v17/customers:listAccessibleCustomers"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "developer-token": self.developer_token,
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to list accounts: {response.text}")

            data = response.json()
            resource_names = data.get("resourceNames", [])

            # Fetch details for each account
            accounts = []
            for resource_name in resource_names:
                # Extract customer ID from resource name (customers/1234567890)
                customer_id = resource_name.split("/")[-1]

                # Fetch account details
                account_details = await self._get_account_details(
                    access_token, customer_id
                )
                if account_details:
                    accounts.append(account_details)

            return accounts

    async def _get_account_details(
        self, access_token: str, customer_id: str
    ) -> Optional[dict]:
        """
        Fetch details for a specific Google Ads account.

        Args:
            access_token: Valid OAuth access token
            customer_id: Google Ads customer ID

        Returns:
            Account details dict or None if not accessible
        """
        url = f"https://googleads.googleapis.com/v17/customers/{customer_id}"
        query = """
            SELECT
                customer.id,
                customer.descriptive_name,
                customer.currency_code,
                customer.time_zone,
                customer.manager
            FROM customer
            LIMIT 1
        """

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{url}/googleAds:search",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "developer-token": self.developer_token,
                    "login-customer-id": customer_id,
                },
                json={"query": query},
            )

            if response.status_code != 200:
                # Account might be a manager account or inaccessible
                return None

            data = response.json()
            results = data.get("results", [])

            if not results:
                return None

            customer = results[0].get("customer", {})

            # Skip manager accounts (they don't have campaigns)
            if customer.get("manager", False):
                return None

            return {
                "customer_id": str(customer.get("id")),
                "descriptive_name": customer.get("descriptiveName", f"Account {customer_id}"),
                "currency_code": customer.get("currencyCode", "USD"),
                "time_zone": customer.get("timeZone", "UTC"),
            }

    def _generate_state(self, organization_id: str) -> str:
        """
        Generate a secure state parameter that includes org_id.

        The state is base64-encoded JSON with a random token for CSRF protection.
        """
        state_data = {
            "org_id": organization_id,
            "nonce": secrets.token_urlsafe(16),
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
