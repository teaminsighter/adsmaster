"""
Reconciliation Worker

Daily job that compares DB values against live ad platform values.
Runs at 3 AM when API quota is fresh.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from uuid import UUID

from ..services.supabase_client import get_supabase_client
from ..integrations.google_ads.adapter_factory import get_adapter as get_google_adapter


logger = logging.getLogger(__name__)


class ReconciliationWorker:
    """
    Reconciliation worker that compares database values against live ad platform values.
    Detects drift between local DB and remote API state.
    """

    def __init__(self):
        self.supabase = get_supabase_client()

    async def run(self) -> Dict[str, Any]:
        """
        Run reconciliation for all active accounts.

        Returns:
            Summary of reconciliation results.
        """
        summary = {
            "accounts_checked": 0,
            "accounts_with_mismatches": 0,
            "total_mismatches": 0,
            "total_resolved": 0,
            "errors": [],
        }

        try:
            accounts = await self.get_all_active_accounts()
            summary["accounts_checked"] = len(accounts)

            for account in accounts:
                try:
                    result = await self.reconcile_account(account)
                    if result["mismatches_found"] > 0:
                        summary["accounts_with_mismatches"] += 1
                        summary["total_mismatches"] += result["mismatches_found"]
                        summary["total_resolved"] += result["mismatches_resolved"]
                except Exception as e:
                    logger.error(f"Error reconciling account {account['id']}: {e}")
                    summary["errors"].append({
                        "account_id": str(account["id"]),
                        "error": str(e),
                    })

        except Exception as e:
            logger.error(f"Error in reconciliation run: {e}")
            summary["errors"].append({"error": str(e)})

        return summary

    async def get_all_active_accounts(self) -> List[Dict[str, Any]]:
        """Get all active ad accounts with their platform info."""
        result = self.supabase.table("ad_accounts").select(
            "*, ad_platforms(name)"
        ).eq("status", "active").execute()

        return result.data or []

    async def reconcile_account(self, account: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reconcile a single ad account.

        Args:
            account: Account record from database.

        Returns:
            Reconciliation results for this account.
        """
        platform = account.get("ad_platforms", {}).get("name")

        if platform == "google_ads":
            result = await self.reconcile_google_ads_account(account)
        elif platform == "meta_ads":
            result = await self.reconcile_meta_ads_account(account)
        else:
            logger.warning(f"Unknown platform for account {account['id']}: {platform}")
            return {
                "campaigns_checked": 0,
                "mismatches_found": 0,
                "mismatches_resolved": 0,
            }

        # Log the reconciliation run
        await self.log_reconciliation(account["id"], result)

        return result

    async def reconcile_google_ads_account(
        self, account: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Reconcile a Google Ads account.

        Compares budget values in DB against live Google Ads API values.
        """
        result = {
            "campaigns_checked": 0,
            "mismatches_found": 0,
            "mismatches_resolved": 0,
            "mismatches": [],
        }

        try:
            # Get adapter for this account
            adapter = get_google_adapter(
                refresh_token=account["refresh_token"],
                customer_id=account["external_account_id"],
                org_id=account["organization_id"],
            )

            # Get campaigns from database
            db_campaigns = self.supabase.table("campaigns").select("*").eq(
                "ad_account_id", account["id"]
            ).neq("status", "REMOVED").execute()

            if not db_campaigns.data:
                return result

            # Get live campaigns from Google Ads
            live_campaigns = await adapter.get_campaigns()
            live_campaigns_map = {c.id: c for c in live_campaigns}

            result["campaigns_checked"] = len(db_campaigns.data)

            for db_camp in db_campaigns.data:
                external_id = db_camp["external_campaign_id"]
                live_camp = live_campaigns_map.get(external_id)

                if not live_camp:
                    # Campaign exists in DB but not in Google Ads
                    # Mark as potentially removed
                    continue

                mismatches = []

                # Check budget
                if db_camp.get("budget_micros") and live_camp.budget_micros:
                    if db_camp["budget_micros"] != live_camp.budget_micros:
                        mismatches.append({
                            "field": "budget_micros",
                            "db_value": db_camp["budget_micros"],
                            "live_value": live_camp.budget_micros,
                            "drift_amount": abs(
                                db_camp["budget_micros"] - live_camp.budget_micros
                            ),
                        })

                # Check status
                if db_camp.get("status") and live_camp.status:
                    db_status = db_camp["status"]
                    live_status = live_camp.status.value if hasattr(live_camp.status, "value") else str(live_camp.status)
                    if db_status != live_status:
                        mismatches.append({
                            "field": "status",
                            "db_value": db_status,
                            "live_value": live_status,
                        })

                if mismatches:
                    result["mismatches_found"] += 1
                    result["mismatches"].append({
                        "campaign_id": db_camp["id"],
                        "campaign_name": db_camp["name"],
                        "mismatches": mismatches,
                    })

                    # Flag the campaign as mismatched
                    await self.flag_campaign_mismatch(db_camp["id"], mismatches)

                    # Alert user about the mismatch
                    await self.alert_user_mismatch(account, db_camp, mismatches)
                else:
                    # Mark as verified
                    await self.mark_campaign_verified(db_camp["id"])

            # Update account last_verified_at
            self.supabase.table("ad_accounts").update({
                "last_verified_at": datetime.utcnow().isoformat(),
            }).eq("id", account["id"]).execute()

        except Exception as e:
            logger.error(f"Error reconciling Google Ads account {account['id']}: {e}")
            raise

        return result

    async def reconcile_meta_ads_account(
        self, account: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Reconcile a Meta Ads account.

        Similar to Google Ads reconciliation but uses Meta Graph API.
        """
        result = {
            "campaigns_checked": 0,
            "mismatches_found": 0,
            "mismatches_resolved": 0,
            "mismatches": [],
        }

        try:
            from ..services.meta_ads_service import MetaAdsService

            # Get campaigns from database
            db_campaigns = self.supabase.table("campaigns").select("*").eq(
                "ad_account_id", account["id"]
            ).neq("status", "DELETED").execute()

            if not db_campaigns.data:
                return result

            # Get live campaigns from Meta
            meta_service = MetaAdsService(access_token=account["access_token"])
            live_campaigns = await meta_service.get_campaigns(
                account["external_account_id"]
            )
            live_campaigns_map = {c["id"]: c for c in live_campaigns}

            result["campaigns_checked"] = len(db_campaigns.data)

            for db_camp in db_campaigns.data:
                external_id = db_camp["external_campaign_id"]
                live_camp = live_campaigns_map.get(external_id)

                if not live_camp:
                    continue

                mismatches = []

                # Check budget (Meta uses daily_budget in cents for some objectives)
                if db_camp.get("budget_micros") and live_camp.get("daily_budget"):
                    # Convert Meta's cents to micros (1 cent = 10,000 micros)
                    live_budget_micros = int(live_camp["daily_budget"]) * 10000
                    if db_camp["budget_micros"] != live_budget_micros:
                        mismatches.append({
                            "field": "budget_micros",
                            "db_value": db_camp["budget_micros"],
                            "live_value": live_budget_micros,
                            "drift_amount": abs(
                                db_camp["budget_micros"] - live_budget_micros
                            ),
                        })

                # Check status
                if db_camp.get("status") and live_camp.get("status"):
                    if db_camp["status"] != live_camp["status"]:
                        mismatches.append({
                            "field": "status",
                            "db_value": db_camp["status"],
                            "live_value": live_camp["status"],
                        })

                if mismatches:
                    result["mismatches_found"] += 1
                    result["mismatches"].append({
                        "campaign_id": db_camp["id"],
                        "campaign_name": db_camp["name"],
                        "mismatches": mismatches,
                    })

                    await self.flag_campaign_mismatch(db_camp["id"], mismatches)
                    await self.alert_user_mismatch(account, db_camp, mismatches)
                else:
                    await self.mark_campaign_verified(db_camp["id"])

            # Update account last_verified_at
            self.supabase.table("ad_accounts").update({
                "last_verified_at": datetime.utcnow().isoformat(),
            }).eq("id", account["id"]).execute()

        except Exception as e:
            logger.error(f"Error reconciling Meta Ads account {account['id']}: {e}")
            raise

        return result

    async def flag_campaign_mismatch(
        self, campaign_id: str, mismatches: List[Dict]
    ) -> None:
        """Flag a campaign as having mismatches."""
        self.supabase.table("campaigns").update({
            "verification_status": "mismatch",
            "last_verified_at": datetime.utcnow().isoformat(),
        }).eq("id", campaign_id).execute()

    async def mark_campaign_verified(self, campaign_id: str) -> None:
        """Mark a campaign as verified (no mismatches)."""
        self.supabase.table("campaigns").update({
            "verification_status": "verified",
            "last_verified_at": datetime.utcnow().isoformat(),
        }).eq("id", campaign_id).execute()

    async def alert_user_mismatch(
        self,
        account: Dict[str, Any],
        campaign: Dict[str, Any],
        mismatches: List[Dict],
    ) -> None:
        """
        Alert user about data mismatches.

        Creates in-app notification. Email/WhatsApp alerts can be added.
        """
        # Get organization owner/admins
        org_id = account["organization_id"]
        users = self.supabase.table("users").select("id, email").eq(
            "organization_id", org_id
        ).in_("role", ["owner", "admin"]).execute()

        if not users.data:
            return

        # Create notification for each admin
        mismatch_summary = ", ".join(
            f"{m['field']}: DB={m['db_value']} vs Live={m['live_value']}"
            for m in mismatches
        )

        for user in users.data:
            # Create in-app notification
            self.supabase.table("notifications").insert({
                "user_id": user["id"],
                "type": "warning",
                "title": f"Data mismatch detected: {campaign['name']}",
                "message": f"Campaign '{campaign['name']}' has mismatches: {mismatch_summary}. Please review and sync.",
                "action_url": f"/campaigns/{campaign['id']}",
            }).execute()

    async def log_reconciliation(
        self, account_id: str, result: Dict[str, Any]
    ) -> None:
        """Log the reconciliation run."""
        self.supabase.table("reconciliation_logs").insert({
            "ad_account_id": account_id,
            "run_at": datetime.utcnow().isoformat(),
            "campaigns_checked": result["campaigns_checked"],
            "mismatches_found": result["mismatches_found"],
            "mismatches_resolved": result["mismatches_resolved"],
            "details": {
                "mismatches": result.get("mismatches", []),
            },
        }).execute()


class DataFreshnessGuard:
    """
    Guard that checks data freshness before allowing actions on recommendations.
    Prevents AI from taking action on stale data.
    """

    # Maximum hours of staleness before blocking actions
    MAX_FRESHNESS_HOURS = 4.0

    # Warning threshold
    WARNING_FRESHNESS_HOURS = 2.0

    def __init__(self):
        self.supabase = get_supabase_client()

    async def check_freshness(self, account_id: str) -> Dict[str, Any]:
        """
        Check data freshness for an account.

        Returns:
            Dict with freshness info and whether actions should be blocked.
        """
        # Get last sync time
        result = self.supabase.table("ad_accounts").select(
            "last_sync_at, last_verified_at"
        ).eq("id", account_id).execute()

        if not result.data:
            return {
                "freshness_hours": None,
                "is_stale": True,
                "should_block": True,
                "message": "Account not found",
            }

        account = result.data[0]
        last_sync = account.get("last_sync_at")

        if not last_sync:
            return {
                "freshness_hours": None,
                "is_stale": True,
                "should_block": True,
                "message": "No sync data available. Please sync first.",
            }

        # Calculate freshness - handle both datetime objects and strings
        if isinstance(last_sync, datetime):
            last_sync_dt = last_sync
        else:
            last_sync_dt = datetime.fromisoformat(str(last_sync).replace("Z", "+00:00"))

        now = datetime.utcnow()
        if last_sync_dt.tzinfo:
            now = now.replace(tzinfo=last_sync_dt.tzinfo)
        freshness_hours = (now - last_sync_dt).total_seconds() / 3600

        is_stale = freshness_hours > self.WARNING_FRESHNESS_HOURS
        should_block = freshness_hours > self.MAX_FRESHNESS_HOURS

        message = None
        if should_block:
            message = f"Data is {freshness_hours:.1f}h old. Refresh before applying recommendations."
        elif is_stale:
            message = f"Data is {freshness_hours:.1f}h old. Consider refreshing for accuracy."

        return {
            "freshness_hours": round(freshness_hours, 2),
            "last_sync_at": last_sync_dt.isoformat() if isinstance(last_sync_dt, datetime) else str(last_sync),
            "last_verified_at": str(account.get("last_verified_at")) if account.get("last_verified_at") else None,
            "is_stale": is_stale,
            "should_block": should_block,
            "message": message,
        }

    async def guard_recommendation_apply(
        self,
        recommendation_id: str,
        force: bool = False,
    ) -> Dict[str, Any]:
        """
        Guard check before applying a recommendation.

        Args:
            recommendation_id: The recommendation to check.
            force: If True, skip freshness check (admin override).

        Returns:
            Dict with allowed status and any warnings/errors.
        """
        # Get recommendation with account info
        result = self.supabase.table("recommendations").select(
            "*, ad_accounts(id, last_sync_at)"
        ).eq("id", recommendation_id).execute()

        if not result.data:
            return {
                "allowed": False,
                "error": "Recommendation not found",
            }

        rec = result.data[0]
        account_id = rec["ad_account_id"]

        # Check freshness
        freshness = await self.check_freshness(account_id)

        if freshness["should_block"] and not force:
            # Update recommendation status
            self.supabase.table("recommendations").update({
                "status": "pending_refresh",
                "data_freshness_hours": freshness["freshness_hours"],
            }).eq("id", recommendation_id).execute()

            return {
                "allowed": False,
                "error": freshness["message"],
                "freshness": freshness,
                "can_force": True,
            }

        # Update recommendation with current freshness
        self.supabase.table("recommendations").update({
            "data_freshness_hours": freshness["freshness_hours"],
            "data_as_of": freshness["last_sync_at"],
        }).eq("id", recommendation_id).execute()

        return {
            "allowed": True,
            "warning": freshness["message"] if freshness["is_stale"] else None,
            "freshness": freshness,
        }


async def run_reconciliation():
    """Entry point for running reconciliation as a scheduled job."""
    worker = ReconciliationWorker()
    result = await worker.run()
    logger.info(f"Reconciliation completed: {result}")
    return result
