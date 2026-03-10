"""
Automation Service

Handles execution of automation rules with idempotency protection.
Prevents double-fire of rules that could cause budget issues.
"""

import asyncio
import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from uuid import UUID

from .supabase_client import get_supabase_client
from ..integrations.google_ads.adapter_factory import get_adapter as get_google_adapter


logger = logging.getLogger(__name__)


class IdempotencyError(Exception):
    """Raised when an operation would violate idempotency."""
    pass


class AutomationService:
    """
    Service for executing automation rules with idempotency protection.

    Uses idempotency keys to prevent double-fire of rules that could cause
    budget issues (e.g., INCREASE_BUDGET +20% firing twice = 44% increase).
    """

    def __init__(self):
        self.supabase = get_supabase_client()

    async def execute_rule(
        self,
        rule_id: str,
        campaign_id: str,
        window: str = "daily",
    ) -> Optional[Dict[str, Any]]:
        """
        Execute an automation rule with idempotency protection.

        Args:
            rule_id: The automation rule ID.
            campaign_id: The campaign to apply the rule to.
            window: Time window for idempotency (daily, hourly, weekly).

        Returns:
            Execution result dict or None if already executed in this window.
        """
        # Generate idempotency key
        idempotency_key = self._generate_idempotency_key(rule_id, campaign_id, window)

        # Try to claim this execution slot
        try:
            claimed = await self._claim_execution_slot(
                rule_id, campaign_id, idempotency_key
            )
            if not claimed:
                logger.info(
                    f"Rule {rule_id} already executed for campaign {campaign_id} "
                    f"in this {window} window"
                )
                return None
        except IdempotencyError as e:
            logger.warning(str(e))
            return None

        # Get rule details
        rule = await self._get_rule(rule_id)
        if not rule:
            await self._fail_execution(rule_id, campaign_id, idempotency_key, "Rule not found")
            return None

        # Get campaign details
        campaign = await self._get_campaign(campaign_id)
        if not campaign:
            await self._fail_execution(rule_id, campaign_id, idempotency_key, "Campaign not found")
            return None

        # Check if rule conditions are met
        conditions_met = await self._evaluate_conditions(rule, campaign)
        if not conditions_met:
            await self._skip_execution(rule_id, campaign_id, idempotency_key, "Conditions not met")
            return {"status": "skipped", "reason": "conditions_not_met"}

        # Execute the rule action
        try:
            result = await self._execute_action(rule, campaign)

            # Mark execution as successful
            await self._complete_execution(
                rule_id, campaign_id, idempotency_key,
                result.get("before_state"), result.get("after_state"),
                result.get("action_taken")
            )

            return result

        except Exception as e:
            logger.error(f"Error executing rule {rule_id}: {e}")
            await self._fail_execution(rule_id, campaign_id, idempotency_key, str(e))
            raise

    def _generate_idempotency_key(
        self,
        rule_id: str,
        campaign_id: str,
        window: str,
    ) -> str:
        """
        Generate an idempotency key for the execution window.

        Format: {rule_id}:{campaign_id}:{window_value}
        """
        today = date.today()

        if window == "hourly":
            window_value = datetime.utcnow().strftime("%Y-%m-%d-%H")
        elif window == "weekly":
            # ISO week number
            window_value = today.strftime("%Y-W%W")
        else:
            # Default to daily
            window_value = today.isoformat()

        return f"{rule_id}:{campaign_id}:{window_value}"

    async def _claim_execution_slot(
        self,
        rule_id: str,
        campaign_id: str,
        idempotency_key: str,
    ) -> bool:
        """
        Try to claim the execution slot using the idempotency key.

        Uses INSERT with unique constraint to prevent race conditions.

        Returns True if slot was claimed, False if already taken.
        """
        try:
            self.supabase.table("automation_executions").insert({
                "rule_id": rule_id,
                "campaign_id": campaign_id,
                "idempotency_key": idempotency_key,
                "status": "pending",
                "executed_at": datetime.utcnow().isoformat(),
            }).execute()
            return True

        except Exception as e:
            error_str = str(e).lower()
            # Check for unique constraint violation
            if "unique" in error_str or "duplicate" in error_str or "23505" in error_str:
                return False
            raise

    async def _get_rule(self, rule_id: str) -> Optional[Dict[str, Any]]:
        """Get automation rule by ID."""
        result = self.supabase.table("automation_rules").select("*").eq(
            "id", rule_id
        ).eq("is_active", True).execute()

        return result.data[0] if result.data else None

    async def _get_campaign(self, campaign_id: str) -> Optional[Dict[str, Any]]:
        """Get campaign by ID with account info."""
        result = self.supabase.table("campaigns").select(
            "*, ad_accounts(*)"
        ).eq("id", campaign_id).execute()

        return result.data[0] if result.data else None

    async def _evaluate_conditions(
        self,
        rule: Dict[str, Any],
        campaign: Dict[str, Any],
    ) -> bool:
        """
        Evaluate rule conditions against campaign state.

        Returns True if all conditions are met.
        """
        conditions = rule.get("conditions") or {}

        # Get recent metrics
        metrics = await self._get_campaign_metrics(campaign["id"], days=7)

        # Evaluate each condition type
        for condition_type, condition_value in conditions.items():
            if condition_type == "min_spend_7d":
                total_spend = sum(m.get("cost_micros", 0) for m in metrics) / 1_000_000
                if total_spend < condition_value:
                    return False

            elif condition_type == "min_conversions_7d":
                total_conversions = sum(m.get("conversions", 0) for m in metrics)
                if total_conversions < condition_value:
                    return False

            elif condition_type == "max_cpa":
                total_spend = sum(m.get("cost_micros", 0) for m in metrics)
                total_conversions = sum(m.get("conversions", 0) for m in metrics)
                if total_conversions > 0:
                    cpa = (total_spend / 1_000_000) / total_conversions
                    if cpa > condition_value:
                        return False

            elif condition_type == "min_roas":
                total_spend = sum(m.get("cost_micros", 0) for m in metrics)
                total_value = sum(m.get("conversion_value_micros", 0) for m in metrics)
                if total_spend > 0:
                    roas = total_value / total_spend
                    if roas < condition_value:
                        return False

            elif condition_type == "status_is":
                if campaign.get("status") != condition_value:
                    return False

            elif condition_type == "budget_below_percent":
                # Budget utilization check
                budget = campaign.get("budget_micros") or 0
                if budget > 0:
                    recent_spend = sum(m.get("cost_micros", 0) for m in metrics[:1])  # Yesterday
                    utilization = recent_spend / budget
                    if utilization >= condition_value / 100:
                        return False

        return True

    async def _get_campaign_metrics(
        self,
        campaign_id: str,
        days: int = 7,
    ) -> List[Dict[str, Any]]:
        """Get recent metrics for a campaign."""
        from_date = (date.today() - timedelta(days=days)).isoformat()

        result = self.supabase.table("metrics_daily").select("*").eq(
            "campaign_id", campaign_id
        ).gte("metric_date", from_date).order("metric_date", desc=True).execute()

        return result.data or []

    async def _execute_action(
        self,
        rule: Dict[str, Any],
        campaign: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Execute the rule action on the campaign.

        Returns result with before_state, after_state, and action_taken.
        """
        actions = rule.get("actions") or {}
        action_type = actions.get("type")

        before_state = {
            "budget_micros": campaign.get("budget_micros"),
            "status": campaign.get("status"),
        }

        account = campaign.get("ad_accounts") or {}
        platform_name = await self._get_platform_name(account.get("platform_id"))

        result = {
            "before_state": before_state,
            "after_state": {},
            "action_taken": None,
        }

        if action_type == "increase_budget":
            percentage = actions.get("percentage", 20)
            result = await self._increase_budget(campaign, percentage, platform_name, account)

        elif action_type == "decrease_budget":
            percentage = actions.get("percentage", 20)
            result = await self._decrease_budget(campaign, percentage, platform_name, account)

        elif action_type == "pause_campaign":
            result = await self._pause_campaign(campaign, platform_name, account)

        elif action_type == "enable_campaign":
            result = await self._enable_campaign(campaign, platform_name, account)

        return result

    async def _get_platform_name(self, platform_id: str) -> str:
        """Get platform name from ID."""
        if not platform_id:
            return "google_ads"

        result = self.supabase.table("ad_platforms").select("name").eq(
            "id", platform_id
        ).execute()

        return result.data[0]["name"] if result.data else "google_ads"

    async def _increase_budget(
        self,
        campaign: Dict[str, Any],
        percentage: float,
        platform: str,
        account: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Increase campaign budget by percentage."""
        old_budget = campaign.get("budget_micros") or 0
        new_budget = int(old_budget * (1 + percentage / 100))

        # Update in platform
        if platform == "google_ads":
            adapter = get_google_adapter(
                refresh_token=account.get("refresh_token"),
                customer_id=account.get("external_account_id"),
                org_id=account.get("organization_id"),
            )
            await adapter.update_campaign_budget(
                campaign["external_campaign_id"],
                new_budget
            )
        else:
            # Meta Ads
            from ..services.meta_ads_service import MetaAdsService
            service = MetaAdsService(access_token=account.get("access_token"))
            await service.update_campaign(
                campaign["external_campaign_id"],
                {"daily_budget": new_budget // 10000}  # Convert micros to cents
            )

        # Update in database
        self.supabase.table("campaigns").update({
            "budget_micros": new_budget,
        }).eq("id", campaign["id"]).execute()

        return {
            "before_state": {"budget_micros": old_budget},
            "after_state": {"budget_micros": new_budget},
            "action_taken": f"Increased budget by {percentage}%: {old_budget/1_000_000:.2f} → {new_budget/1_000_000:.2f}",
        }

    async def _decrease_budget(
        self,
        campaign: Dict[str, Any],
        percentage: float,
        platform: str,
        account: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Decrease campaign budget by percentage."""
        old_budget = campaign.get("budget_micros") or 0
        new_budget = int(old_budget * (1 - percentage / 100))

        # Update in platform
        if platform == "google_ads":
            adapter = get_google_adapter(
                refresh_token=account.get("refresh_token"),
                customer_id=account.get("external_account_id"),
                org_id=account.get("organization_id"),
            )
            await adapter.update_campaign_budget(
                campaign["external_campaign_id"],
                new_budget
            )
        else:
            from ..services.meta_ads_service import MetaAdsService
            service = MetaAdsService(access_token=account.get("access_token"))
            await service.update_campaign(
                campaign["external_campaign_id"],
                {"daily_budget": new_budget // 10000}
            )

        # Update in database
        self.supabase.table("campaigns").update({
            "budget_micros": new_budget,
        }).eq("id", campaign["id"]).execute()

        return {
            "before_state": {"budget_micros": old_budget},
            "after_state": {"budget_micros": new_budget},
            "action_taken": f"Decreased budget by {percentage}%: {old_budget/1_000_000:.2f} → {new_budget/1_000_000:.2f}",
        }

    async def _pause_campaign(
        self,
        campaign: Dict[str, Any],
        platform: str,
        account: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Pause a campaign."""
        old_status = campaign.get("status")

        if platform == "google_ads":
            adapter = get_google_adapter(
                refresh_token=account.get("refresh_token"),
                customer_id=account.get("external_account_id"),
                org_id=account.get("organization_id"),
            )
            await adapter.update_campaign_status(
                campaign["external_campaign_id"],
                "PAUSED"
            )
        else:
            from ..services.meta_ads_service import MetaAdsService
            service = MetaAdsService(access_token=account.get("access_token"))
            await service.update_campaign(
                campaign["external_campaign_id"],
                {"status": "PAUSED"}
            )

        self.supabase.table("campaigns").update({
            "status": "PAUSED",
        }).eq("id", campaign["id"]).execute()

        return {
            "before_state": {"status": old_status},
            "after_state": {"status": "PAUSED"},
            "action_taken": f"Paused campaign (was {old_status})",
        }

    async def _enable_campaign(
        self,
        campaign: Dict[str, Any],
        platform: str,
        account: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Enable a campaign."""
        old_status = campaign.get("status")

        if platform == "google_ads":
            adapter = get_google_adapter(
                refresh_token=account.get("refresh_token"),
                customer_id=account.get("external_account_id"),
                org_id=account.get("organization_id"),
            )
            await adapter.update_campaign_status(
                campaign["external_campaign_id"],
                "ENABLED"
            )
        else:
            from ..services.meta_ads_service import MetaAdsService
            service = MetaAdsService(access_token=account.get("access_token"))
            await service.update_campaign(
                campaign["external_campaign_id"],
                {"status": "ACTIVE"}
            )

        self.supabase.table("campaigns").update({
            "status": "ENABLED",
        }).eq("id", campaign["id"]).execute()

        return {
            "before_state": {"status": old_status},
            "after_state": {"status": "ENABLED"},
            "action_taken": f"Enabled campaign (was {old_status})",
        }

    async def _complete_execution(
        self,
        rule_id: str,
        campaign_id: str,
        idempotency_key: str,
        before_state: Dict,
        after_state: Dict,
        action_taken: str,
    ) -> None:
        """Mark execution as completed."""
        self.supabase.table("automation_executions").update({
            "status": "success",
            "before_state": before_state,
            "after_state": after_state,
            "action_taken": action_taken,
        }).eq("rule_id", rule_id).eq(
            "campaign_id", campaign_id
        ).eq("idempotency_key", idempotency_key).execute()

    async def _fail_execution(
        self,
        rule_id: str,
        campaign_id: str,
        idempotency_key: str,
        error: str,
    ) -> None:
        """Mark execution as failed."""
        self.supabase.table("automation_executions").update({
            "status": "failed",
            "error_message": error,
        }).eq("rule_id", rule_id).eq(
            "campaign_id", campaign_id
        ).eq("idempotency_key", idempotency_key).execute()

    async def _skip_execution(
        self,
        rule_id: str,
        campaign_id: str,
        idempotency_key: str,
        reason: str,
    ) -> None:
        """Mark execution as skipped."""
        self.supabase.table("automation_executions").update({
            "status": "skipped",
            "error_message": reason,
        }).eq("rule_id", rule_id).eq(
            "campaign_id", campaign_id
        ).eq("idempotency_key", idempotency_key).execute()

    async def undo_execution(
        self,
        execution_id: str,
        organization_id: str,
    ) -> Dict[str, Any]:
        """
        Undo an automation execution within 24 hours.

        Args:
            execution_id: The execution to undo.
            organization_id: For authorization.

        Returns:
            Result of the undo operation.
        """
        # Get execution with campaign
        result = self.supabase.table("automation_executions").select(
            "*, campaigns(*, ad_accounts(*))"
        ).eq("id", execution_id).execute()

        if not result.data:
            return {"success": False, "error": "Execution not found"}

        execution = result.data[0]
        campaign = execution.get("campaigns")

        if not campaign:
            return {"success": False, "error": "Campaign not found"}

        account = campaign.get("ad_accounts") or {}

        # Check organization
        if account.get("organization_id") != organization_id:
            return {"success": False, "error": "Not authorized"}

        # Check if within 24 hours
        executed_at = execution.get("executed_at")
        if executed_at:
            executed_dt = datetime.fromisoformat(executed_at.replace("Z", "+00:00"))
            if datetime.utcnow().replace(tzinfo=executed_dt.tzinfo) - executed_dt > timedelta(hours=24):
                return {"success": False, "error": "Undo window expired (24 hours)"}

        # Check status
        if execution.get("status") != "success":
            return {"success": False, "error": f"Cannot undo execution with status '{execution.get('status')}'"}

        if execution.get("undone_at"):
            return {"success": False, "error": "Already undone"}

        # Get before state
        before_state = execution.get("before_state") or {}

        if not before_state:
            return {"success": False, "error": "No state to restore"}

        # Restore state
        platform_name = await self._get_platform_name(account.get("platform_id"))

        if "budget_micros" in before_state:
            # Restore budget
            if platform_name == "google_ads":
                adapter = get_google_adapter(
                    refresh_token=account.get("refresh_token"),
                    customer_id=account.get("external_account_id"),
                    org_id=account.get("organization_id"),
                )
                await adapter.update_campaign_budget(
                    campaign["external_campaign_id"],
                    before_state["budget_micros"]
                )
            else:
                from ..services.meta_ads_service import MetaAdsService
                service = MetaAdsService(access_token=account.get("access_token"))
                await service.update_campaign(
                    campaign["external_campaign_id"],
                    {"daily_budget": before_state["budget_micros"] // 10000}
                )

            self.supabase.table("campaigns").update({
                "budget_micros": before_state["budget_micros"],
            }).eq("id", campaign["id"]).execute()

        if "status" in before_state:
            # Restore status
            if platform_name == "google_ads":
                adapter = get_google_adapter(
                    refresh_token=account.get("refresh_token"),
                    customer_id=account.get("external_account_id"),
                    org_id=account.get("organization_id"),
                )
                await adapter.update_campaign_status(
                    campaign["external_campaign_id"],
                    before_state["status"]
                )
            else:
                from ..services.meta_ads_service import MetaAdsService
                service = MetaAdsService(access_token=account.get("access_token"))
                meta_status = "ACTIVE" if before_state["status"] == "ENABLED" else before_state["status"]
                await service.update_campaign(
                    campaign["external_campaign_id"],
                    {"status": meta_status}
                )

            self.supabase.table("campaigns").update({
                "status": before_state["status"],
            }).eq("id", campaign["id"]).execute()

        # Mark as undone
        self.supabase.table("automation_executions").update({
            "undone_at": datetime.utcnow().isoformat(),
        }).eq("id", execution_id).execute()

        return {
            "success": True,
            "message": "Execution undone successfully",
            "restored_state": before_state,
        }


class AutomationScheduler:
    """
    Scheduler for running automation rules at their configured intervals.

    Should be run by a background worker (e.g., Cloud Scheduler, Celery).
    """

    def __init__(self):
        self.supabase = get_supabase_client()
        self.service = AutomationService()

    async def run_due_rules(self) -> Dict[str, Any]:
        """
        Run all automation rules that are due for execution.

        Returns:
            Summary of execution results.
        """
        summary = {
            "rules_checked": 0,
            "rules_executed": 0,
            "campaigns_affected": 0,
            "errors": [],
        }

        # Get rules due for execution
        now = datetime.utcnow().isoformat()
        rules = self.supabase.table("automation_rules").select(
            "*, ad_accounts(id, organization_id)"
        ).eq("is_active", True).or_(
            f"next_run_at.is.null,next_run_at.lte.{now}"
        ).execute()

        summary["rules_checked"] = len(rules.data or [])

        for rule in (rules.data or []):
            try:
                # Get campaigns for this rule
                campaigns = await self._get_rule_campaigns(rule)

                for campaign in campaigns:
                    # Determine window from schedule
                    schedule = rule.get("schedule", "daily")
                    if schedule == "hourly":
                        window = "hourly"
                    elif schedule == "weekly":
                        window = "weekly"
                    else:
                        window = "daily"

                    result = await self.service.execute_rule(
                        rule["id"],
                        campaign["id"],
                        window=window,
                    )

                    if result and result.get("status") != "skipped":
                        summary["campaigns_affected"] += 1

                summary["rules_executed"] += 1

                # Update next run time
                await self._update_next_run(rule)

            except Exception as e:
                logger.error(f"Error running rule {rule['id']}: {e}")
                summary["errors"].append({
                    "rule_id": rule["id"],
                    "error": str(e),
                })

        return summary

    async def _get_rule_campaigns(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get campaigns that this rule applies to."""
        # If rule has specific account, get campaigns from that account
        if rule.get("ad_account_id"):
            result = self.supabase.table("campaigns").select("*").eq(
                "ad_account_id", rule["ad_account_id"]
            ).eq("status", "ENABLED").execute()
            return result.data or []

        # Otherwise get all campaigns for the organization
        account_info = rule.get("ad_accounts") or {}
        org_id = account_info.get("organization_id") or rule.get("organization_id")

        if org_id:
            # Get all accounts for org
            accounts = self.supabase.table("ad_accounts").select("id").eq(
                "organization_id", org_id
            ).execute()

            if accounts.data:
                account_ids = [a["id"] for a in accounts.data]
                result = self.supabase.table("campaigns").select("*").in_(
                    "ad_account_id", account_ids
                ).eq("status", "ENABLED").execute()
                return result.data or []

        return []

    async def _update_next_run(self, rule: Dict[str, Any]) -> None:
        """Update the next run time for a rule based on its schedule."""
        schedule = rule.get("schedule", "daily")
        now = datetime.utcnow()

        if schedule == "hourly":
            next_run = now + timedelta(hours=1)
        elif schedule == "weekly":
            next_run = now + timedelta(weeks=1)
        else:
            next_run = now + timedelta(days=1)

        self.supabase.table("automation_rules").update({
            "last_run_at": now.isoformat(),
            "next_run_at": next_run.isoformat(),
        }).eq("id", rule["id"]).execute()
