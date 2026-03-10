"""
Token Refresh Worker

Monitors and refreshes OAuth tokens for ad platform integrations.
Implements escalating alerts for failed refresh attempts.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from ..services.supabase_client import get_supabase_client


logger = logging.getLogger(__name__)


class TokenStatus:
    """Token status constants."""
    HEALTHY = "healthy"
    EXPIRING_SOON = "expiring_soon"
    REFRESH_FAILED = "refresh_failed"
    EXPIRED = "expired"


class TokenRefreshWorker:
    """
    Worker that monitors and refreshes OAuth tokens for ad accounts.

    Handles:
    - Meta long-lived tokens (60 day expiry)
    - Google OAuth refresh tokens
    - Escalating alerts for failed refreshes
    """

    # Days before expiry to start warning
    WARNING_DAYS = 7

    # Days before expiry to attempt refresh
    REFRESH_DAYS = 14

    # Maximum refresh attempts before escalating
    MAX_REFRESH_ATTEMPTS = 3

    def __init__(self):
        self.supabase = get_supabase_client()

    async def run(self) -> Dict[str, Any]:
        """
        Run token health check and refresh for all accounts.

        Returns:
            Summary of results.
        """
        summary = {
            "accounts_checked": 0,
            "tokens_refreshed": 0,
            "tokens_expiring": 0,
            "tokens_failed": 0,
            "errors": [],
        }

        try:
            accounts = await self.get_accounts_with_tokens()
            summary["accounts_checked"] = len(accounts)

            for account in accounts:
                try:
                    result = await self.check_and_refresh_token(account)

                    if result.get("refreshed"):
                        summary["tokens_refreshed"] += 1
                    if result.get("expiring"):
                        summary["tokens_expiring"] += 1
                    if result.get("failed"):
                        summary["tokens_failed"] += 1

                except Exception as e:
                    logger.error(f"Error checking token for account {account['id']}: {e}")
                    summary["errors"].append({
                        "account_id": str(account["id"]),
                        "error": str(e),
                    })

        except Exception as e:
            logger.error(f"Error in token refresh run: {e}")
            summary["errors"].append({"error": str(e)})

        return summary

    async def get_accounts_with_tokens(self) -> List[Dict[str, Any]]:
        """Get all active accounts with OAuth tokens."""
        result = self.supabase.table("ad_accounts").select(
            "*, ad_platforms(name)"
        ).eq("status", "active").execute()

        return result.data or []

    async def check_and_refresh_token(
        self, account: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Check token status and refresh if needed.

        Args:
            account: Account record from database.

        Returns:
            Result with status flags.
        """
        result = {
            "refreshed": False,
            "expiring": False,
            "failed": False,
        }

        platform = account.get("ad_platforms", {}).get("name")
        token_expires = account.get("token_expires_at")

        if not token_expires:
            # No expiry tracked - set based on platform
            if platform == "meta_ads":
                # Assume Meta tokens are fresh, set 60 day expiry
                new_expiry = datetime.utcnow() + timedelta(days=60)
                await self.update_token_status(
                    account["id"],
                    token_expires_at=new_expiry,
                    status=TokenStatus.HEALTHY
                )
            return result

        # Parse expiry date
        try:
            if isinstance(token_expires, str):
                expires_dt = datetime.fromisoformat(token_expires.replace("Z", "+00:00"))
            else:
                expires_dt = token_expires
        except:
            return result

        now = datetime.utcnow()
        if hasattr(expires_dt, 'tzinfo') and expires_dt.tzinfo:
            now = now.replace(tzinfo=expires_dt.tzinfo)

        days_until_expiry = (expires_dt - now).days

        # Check if expired
        if days_until_expiry <= 0:
            await self.update_token_status(
                account["id"],
                status=TokenStatus.EXPIRED
            )
            await self.alert_token_expired(account)
            result["failed"] = True
            return result

        # Check if needs refresh
        if days_until_expiry <= self.REFRESH_DAYS:
            if platform == "meta_ads":
                success = await self.refresh_meta_token(account)
                if success:
                    result["refreshed"] = True
                else:
                    result["failed"] = True

        # Check if expiring soon (warning)
        if days_until_expiry <= self.WARNING_DAYS:
            result["expiring"] = True
            await self.update_token_status(
                account["id"],
                status=TokenStatus.EXPIRING_SOON
            )

        return result

    async def refresh_meta_token(self, account: Dict[str, Any]) -> bool:
        """
        Refresh a Meta long-lived access token.

        Meta tokens can be exchanged for new 60-day tokens.

        Returns True on success, False on failure.
        """
        import httpx
        import os

        access_token = account.get("access_token")
        if not access_token:
            return False

        app_id = os.getenv("META_APP_ID")
        app_secret = os.getenv("META_APP_SECRET")

        if not app_id or not app_secret:
            logger.error("Meta app credentials not configured")
            return False

        # Attempt refresh with retries
        for attempt in range(self.MAX_REFRESH_ATTEMPTS):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "https://graph.facebook.com/v21.0/oauth/access_token",
                        params={
                            "grant_type": "fb_exchange_token",
                            "client_id": app_id,
                            "client_secret": app_secret,
                            "fb_exchange_token": access_token,
                        },
                        timeout=30.0,
                    )

                    if response.status_code == 200:
                        data = response.json()
                        new_token = data.get("access_token")
                        expires_in = data.get("expires_in", 5184000)  # 60 days default

                        if new_token:
                            new_expiry = datetime.utcnow() + timedelta(seconds=expires_in)

                            await self.update_token_status(
                                account["id"],
                                access_token=new_token,
                                token_expires_at=new_expiry,
                                status=TokenStatus.HEALTHY,
                                refresh_attempts=0,
                                last_refresh_error=None
                            )

                            logger.info(f"Successfully refreshed Meta token for account {account['id']}")
                            return True

                    # Log error
                    error_msg = response.text[:500] if response.text else f"Status {response.status_code}"
                    logger.warning(
                        f"Meta token refresh attempt {attempt + 1} failed for account {account['id']}: {error_msg}"
                    )

            except Exception as e:
                logger.warning(
                    f"Meta token refresh attempt {attempt + 1} failed for account {account['id']}: {e}"
                )

            # Update attempts counter
            current_attempts = account.get("token_refresh_attempts", 0) + 1
            await self.update_token_status(
                account["id"],
                refresh_attempts=current_attempts,
                last_refresh_error=str(e) if 'e' in locals() else "Unknown error"
            )

            # Backoff before retry
            await asyncio.sleep(60 * (attempt + 1))

        # All attempts failed - escalate
        await self.update_token_status(
            account["id"],
            status=TokenStatus.REFRESH_FAILED
        )
        await self.alert_refresh_failed(account)

        return False

    async def update_token_status(
        self,
        account_id: str,
        access_token: str = None,
        token_expires_at: datetime = None,
        status: str = None,
        refresh_attempts: int = None,
        last_refresh_error: str = None,
    ) -> None:
        """Update token-related fields on an account."""
        update_data = {}

        if access_token is not None:
            update_data["access_token"] = access_token
        if token_expires_at is not None:
            update_data["token_expires_at"] = token_expires_at.isoformat()
        if status is not None:
            update_data["token_status"] = status
        if refresh_attempts is not None:
            update_data["token_refresh_attempts"] = refresh_attempts
        if last_refresh_error is not None:
            update_data["token_last_refresh_error"] = last_refresh_error

        if update_data:
            self.supabase.table("ad_accounts").update(update_data).eq(
                "id", account_id
            ).execute()

    async def alert_refresh_failed(self, account: Dict[str, Any]) -> None:
        """
        Send alerts when token refresh has failed.

        Escalates through multiple channels.
        """
        org_id = account.get("organization_id")
        account_name = account.get("name", "Unknown")
        platform = account.get("ad_platforms", {}).get("name", "Unknown")

        # Get organization admins
        users = self.supabase.table("users").select("id, email, full_name").eq(
            "organization_id", org_id
        ).in_("role", ["owner", "admin"]).execute()

        message = (
            f"Token refresh failed for {platform} account '{account_name}' "
            f"after {self.MAX_REFRESH_ATTEMPTS} attempts. "
            "Your ad tracking may be disrupted. Please reconnect the account."
        )

        for user in (users.data or []):
            # Create in-app notification (critical)
            self.supabase.table("notifications").insert({
                "user_id": user["id"],
                "type": "critical",
                "title": f"⚠️ {platform} Connection Failed",
                "message": message,
                "action_url": f"/settings/accounts/{account['id']}",
            }).execute()

            # Send email alert
            await self.send_email_alert(
                user["email"],
                f"Action Required: {platform} Token Refresh Failed",
                message,
                account
            )

        logger.warning(f"Token refresh failed alerts sent for account {account['id']}")

    async def alert_token_expired(self, account: Dict[str, Any]) -> None:
        """Send alerts when a token has expired."""
        org_id = account.get("organization_id")
        account_name = account.get("name", "Unknown")
        platform = account.get("ad_platforms", {}).get("name", "Unknown")

        users = self.supabase.table("users").select("id, email").eq(
            "organization_id", org_id
        ).in_("role", ["owner", "admin"]).execute()

        message = (
            f"Your {platform} account '{account_name}' connection has expired. "
            "Ad data is no longer syncing. Please reconnect immediately."
        )

        for user in (users.data or []):
            # Critical in-app notification
            self.supabase.table("notifications").insert({
                "user_id": user["id"],
                "type": "critical",
                "title": f"🔴 {platform} Connection Expired",
                "message": message,
                "action_url": f"/settings/accounts/{account['id']}/reconnect",
            }).execute()

            # Send urgent email
            await self.send_email_alert(
                user["email"],
                f"URGENT: {platform} Connection Expired",
                message,
                account
            )

        logger.error(f"Token expired alerts sent for account {account['id']}")

    async def send_email_alert(
        self,
        email: str,
        subject: str,
        message: str,
        account: Dict[str, Any],
    ) -> None:
        """
        Send email alert to user.

        In production, integrate with email service (SendGrid, SES, etc.)
        """
        # Placeholder - implement with your email service
        logger.info(f"Email alert to {email}: {subject}")

        # Example SendGrid integration:
        # import sendgrid
        # from sendgrid.helpers.mail import Mail
        # sg = sendgrid.SendGridAPIClient(api_key=os.environ.get('SENDGRID_API_KEY'))
        # message = Mail(
        #     from_email='alerts@adsmaster.io',
        #     to_emails=email,
        #     subject=subject,
        #     html_content=f'<p>{message}</p><p><a href="https://app.adsmaster.io/settings/accounts/{account["id"]}">Reconnect Account</a></p>'
        # )
        # sg.send(message)


class TokenHealthService:
    """
    Service for checking token health status.

    Used by API endpoints to show token status in UI.
    """

    def __init__(self):
        self.supabase = get_supabase_client()

    async def get_account_token_health(
        self, account_id: str
    ) -> Dict[str, Any]:
        """Get token health for a specific account."""
        result = self.supabase.table("ad_accounts").select(
            "id, name, token_status, token_expires_at, token_refresh_attempts, "
            "token_last_refresh_error, ad_platforms(name)"
        ).eq("id", account_id).execute()

        if not result.data:
            return {"error": "Account not found"}

        account = result.data[0]
        return self._build_health_response(account)

    async def get_organization_token_health(
        self, organization_id: str
    ) -> List[Dict[str, Any]]:
        """Get token health for all accounts in an organization."""
        result = self.supabase.table("ad_accounts").select(
            "id, name, token_status, token_expires_at, token_refresh_attempts, "
            "token_last_refresh_error, ad_platforms(name)"
        ).eq("organization_id", organization_id).eq("status", "active").execute()

        return [self._build_health_response(a) for a in (result.data or [])]

    def _build_health_response(self, account: Dict[str, Any]) -> Dict[str, Any]:
        """Build a token health response dict."""
        status = account.get("token_status", TokenStatus.HEALTHY)
        expires_at = account.get("token_expires_at")

        # Calculate days until expiry
        days_remaining = None
        if expires_at:
            try:
                if isinstance(expires_at, str):
                    expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                else:
                    expires_dt = expires_at

                now = datetime.utcnow()
                if hasattr(expires_dt, 'tzinfo') and expires_dt.tzinfo:
                    now = now.replace(tzinfo=expires_dt.tzinfo)

                days_remaining = (expires_dt - now).days
            except:
                pass

        # Determine display status
        if status == TokenStatus.EXPIRED or (days_remaining is not None and days_remaining <= 0):
            display_status = "expired"
            badge_color = "red"
            badge_text = "🔴 Expired — Reconnect Required"
        elif status == TokenStatus.REFRESH_FAILED:
            attempts = account.get("token_refresh_attempts", 0)
            display_status = "refresh_failed"
            badge_color = "red"
            badge_text = f"🔴 Refresh Failed ({attempts} attempts) — Action Required"
        elif status == TokenStatus.EXPIRING_SOON or (days_remaining is not None and days_remaining <= 7):
            display_status = "expiring_soon"
            badge_color = "amber"
            badge_text = f"🟡 Expires in {days_remaining} days — Refresh Now"
        else:
            display_status = "healthy"
            badge_color = "green"
            days_text = f"{days_remaining} days" if days_remaining else "OK"
            badge_text = f"🟢 Token OK ({days_text})"

        # Convert expires_at to string if it's a datetime
        expires_at_str = None
        if expires_at:
            if isinstance(expires_at, datetime):
                expires_at_str = expires_at.isoformat()
            else:
                expires_at_str = str(expires_at)

        return {
            "account_id": str(account["id"]),
            "account_name": account.get("name"),
            "platform": account.get("ad_platforms", {}).get("name"),
            "status": display_status,
            "badge_color": badge_color,
            "badge_text": badge_text,
            "days_remaining": days_remaining,
            "expires_at": expires_at_str,
            "refresh_attempts": account.get("token_refresh_attempts", 0),
            "last_error": account.get("token_last_refresh_error"),
            "needs_action": display_status in ["expired", "refresh_failed", "expiring_soon"],
        }


async def run_token_refresh():
    """Entry point for running token refresh as a scheduled job."""
    worker = TokenRefreshWorker()
    result = await worker.run()
    logger.info(f"Token refresh completed: {result}")
    return result
