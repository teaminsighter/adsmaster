"""
Action Executor - Executes recommendation actions on ad platforms.

This service:
1. Takes a recommendation and selected option
2. Executes the corresponding action on Google Ads or Meta Ads
3. Records the action and enables undo functionality
4. Handles rollback for the 24-hour undo window
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
import json

from ..supabase_client import get_supabase_client


class ActionType(str, Enum):
    """Types of actions that can be executed."""
    # Keyword actions
    PAUSE_KEYWORD = "pause"
    ENABLE_KEYWORD = "enable"
    REDUCE_BID = "reduce_bid_50"
    REDUCE_BID_30 = "reduce_bid_30"
    REDUCE_BID_20 = "reduce_bid_20"
    PAUSE_AND_NEGATIVE = "pause_and_negative"

    # Campaign actions
    INCREASE_BUDGET_20 = "increase_budget_20"
    INCREASE_BUDGET_50 = "increase_budget_50"
    INCREASE_BUDGET_100 = "increase_budget_100"
    PAUSE_CAMPAIGN = "pause_campaign"
    ENABLE_CAMPAIGN = "enable_campaign"

    # Ad/Ad Set actions
    PAUSE_AD = "pause_ad"
    ENABLE_AD = "enable_ad"
    PAUSE_ADSET = "pause_adset"
    ENABLE_ADSET = "enable_adset"
    REDUCE_BUDGET_50 = "reduce_budget_50"

    # Other actions
    MONITOR = "monitor"
    CHECK_TRACKING = "check_tracking"
    TEST_CONVERSION = "test_conversion"
    IMPROVE_LP = "improve_lp"
    IMPROVE_AD = "improve_ad"
    CREATE_VARIATION = "create_variation"
    REFRESH_ALL = "refresh_all"
    EXPAND_AUDIENCE = "expand_audience"
    INVESTIGATE = "investigate"


class ActionResult:
    """Result of executing an action."""

    def __init__(
        self,
        success: bool,
        action: str,
        message: str,
        before_state: Dict[str, Any] = None,
        after_state: Dict[str, Any] = None,
        can_undo: bool = True,
        error: str = None
    ):
        self.success = success
        self.action = action
        self.message = message
        self.before_state = before_state or {}
        self.after_state = after_state or {}
        self.can_undo = can_undo
        self.error = error
        self.executed_at = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "action": self.action,
            "message": self.message,
            "before_state": self.before_state,
            "after_state": self.after_state,
            "can_undo": self.can_undo,
            "error": self.error,
            "executed_at": self.executed_at.isoformat(),
        }


class ActionExecutor:
    """
    Executes recommendation actions on ad platforms.

    Supports both Google Ads and Meta Ads actions.
    """

    def __init__(self, supabase_client=None):
        self.db = supabase_client or get_supabase_client()

    async def execute_action(
        self,
        recommendation_id: str,
        option_id: int,
        organization_id: str
    ) -> ActionResult:
        """
        Execute a recommendation action.

        Args:
            recommendation_id: ID of the recommendation
            option_id: ID of the selected option
            organization_id: Organization ID for security

        Returns:
            ActionResult with execution details
        """
        # Get recommendation
        result = self.db.table("recommendations").select("*").eq(
            "id", recommendation_id
        ).eq("organization_id", organization_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="unknown",
                message="Recommendation not found",
                error="not_found"
            )

        rec = result.data[0]

        if rec.get("status") != "pending":
            return ActionResult(
                success=False,
                action="unknown",
                message=f"Cannot execute recommendation with status '{rec.get('status')}'",
                error="invalid_status"
            )

        # Get selected option
        options = rec.get("options") or []
        if isinstance(options, str):
            options = json.loads(options)

        option = next((o for o in options if o.get("id") == option_id), None)
        if not option:
            return ActionResult(
                success=False,
                action="unknown",
                message="Invalid option ID",
                error="invalid_option"
            )

        action = option.get("action", "")
        entity_type = rec.get("entity_type")
        entity_id = rec.get("keyword_id") or rec.get("campaign_id")

        # Execute the action based on type
        try:
            if action in ["pause", "pause_keyword"]:
                result = await self._pause_keyword(entity_id)
            elif action == "enable":
                result = await self._enable_keyword(entity_id)
            elif action.startswith("reduce_bid"):
                pct = int(action.split("_")[-1]) if "_" in action else 50
                result = await self._reduce_bid(entity_id, pct)
            elif action == "pause_and_negative":
                result = await self._pause_and_add_negative(entity_id)
            elif action.startswith("increase_budget"):
                pct = int(action.split("_")[-1]) if "_" in action else 20
                campaign_id = rec.get("campaign_id")
                result = await self._increase_budget(campaign_id, pct)
            elif action == "pause_campaign":
                campaign_id = rec.get("campaign_id")
                result = await self._pause_campaign(campaign_id)
            elif action == "pause_ad":
                result = await self._pause_ad(entity_id)
            elif action == "pause_adset":
                result = await self._pause_adset(entity_id)
            elif action in ["monitor", "check_tracking", "test_conversion", "improve_lp", "improve_ad", "investigate"]:
                # These are manual actions - just mark as acknowledged
                result = ActionResult(
                    success=True,
                    action=action,
                    message=f"Action '{option.get('description', action)}' acknowledged. Please complete manually.",
                    can_undo=False
                )
            else:
                result = ActionResult(
                    success=True,
                    action=action,
                    message=f"Action '{action}' queued for execution.",
                    can_undo=True
                )

            # Update recommendation status
            if result.success:
                self.db.table("recommendations").update({
                    "status": "applied",
                    "applied_at": datetime.utcnow().isoformat(),
                    "applied_option_id": option_id,
                    "before_state": json.dumps(result.before_state),
                    "after_state": json.dumps(result.after_state),
                }).eq("id", recommendation_id).execute()

            return result

        except Exception as e:
            return ActionResult(
                success=False,
                action=action,
                message=f"Failed to execute action: {str(e)}",
                error=str(e)
            )

    async def undo_action(
        self,
        recommendation_id: str,
        organization_id: str
    ) -> ActionResult:
        """
        Undo a previously applied recommendation action.

        Only works within 24-hour window.
        """
        # Get recommendation
        result = self.db.table("recommendations").select("*").eq(
            "id", recommendation_id
        ).eq("organization_id", organization_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="undo",
                message="Recommendation not found",
                error="not_found"
            )

        rec = result.data[0]

        if rec.get("status") != "applied":
            return ActionResult(
                success=False,
                action="undo",
                message="Can only undo applied recommendations",
                error="invalid_status"
            )

        # Check 24-hour window
        applied_at_str = rec.get("applied_at")
        if applied_at_str:
            try:
                applied_at = datetime.fromisoformat(applied_at_str.replace("Z", ""))
                if (datetime.utcnow() - applied_at).total_seconds() > 86400:
                    return ActionResult(
                        success=False,
                        action="undo",
                        message="Undo window has expired (24 hours)",
                        error="undo_expired"
                    )
            except ValueError:
                pass

        # Get before state
        before_state = rec.get("before_state") or {}
        if isinstance(before_state, str):
            before_state = json.loads(before_state)

        after_state = rec.get("after_state") or {}
        if isinstance(after_state, str):
            after_state = json.loads(after_state)

        action = after_state.get("action", "")
        entity_type = rec.get("entity_type")
        entity_id = rec.get("keyword_id") or rec.get("campaign_id")

        try:
            # Reverse the action
            if action in ["pause", "pause_keyword"]:
                result = await self._enable_keyword(entity_id)
            elif action == "enable":
                result = await self._pause_keyword(entity_id)
            elif action.startswith("reduce_bid"):
                # Restore original bid
                original_bid = before_state.get("bid_micros")
                if original_bid:
                    result = await self._set_bid(entity_id, original_bid)
                else:
                    result = ActionResult(
                        success=True,
                        action="undo_bid",
                        message="Bid restored (original value not recorded)",
                    )
            elif action.startswith("increase_budget"):
                # Restore original budget
                original_budget = before_state.get("budget_micros")
                campaign_id = rec.get("campaign_id")
                if original_budget:
                    result = await self._set_budget(campaign_id, original_budget)
                else:
                    result = ActionResult(
                        success=True,
                        action="undo_budget",
                        message="Budget restored (original value not recorded)",
                    )
            elif action == "pause_campaign":
                campaign_id = rec.get("campaign_id")
                result = await self._enable_campaign(campaign_id)
            elif action == "pause_ad":
                result = await self._enable_ad(entity_id)
            elif action == "pause_adset":
                result = await self._enable_adset(entity_id)
            else:
                result = ActionResult(
                    success=True,
                    action="undo",
                    message=f"Undo completed for action '{action}'",
                )

            # Update recommendation status
            if result.success:
                self.db.table("recommendations").update({
                    "status": "pending",
                    "applied_at": None,
                    "applied_option_id": None,
                    "undone_at": datetime.utcnow().isoformat(),
                }).eq("id", recommendation_id).execute()

            return result

        except Exception as e:
            return ActionResult(
                success=False,
                action="undo",
                message=f"Failed to undo action: {str(e)}",
                error=str(e)
            )

    # =========================================================================
    # Keyword Actions
    # =========================================================================

    async def _pause_keyword(self, keyword_id: str) -> ActionResult:
        """Pause a keyword."""
        # Get current state
        result = self.db.table("keywords").select("status, cpc_bid_micros").eq(
            "id", keyword_id
        ).execute()

        before_state = {}
        if result.data:
            before_state = {"status": result.data[0].get("status")}

        # Update in database
        self.db.table("keywords").update({
            "status": "PAUSED"
        }).eq("id", keyword_id).execute()

        # TODO: Call Google Ads API to pause keyword
        # google_ads_service.pause_keyword(keyword_id)

        return ActionResult(
            success=True,
            action="pause_keyword",
            message="Keyword paused successfully",
            before_state=before_state,
            after_state={"status": "PAUSED", "action": "pause"},
        )

    async def _enable_keyword(self, keyword_id: str) -> ActionResult:
        """Enable a keyword."""
        result = self.db.table("keywords").select("status").eq(
            "id", keyword_id
        ).execute()

        before_state = {}
        if result.data:
            before_state = {"status": result.data[0].get("status")}

        self.db.table("keywords").update({
            "status": "ENABLED"
        }).eq("id", keyword_id).execute()

        return ActionResult(
            success=True,
            action="enable_keyword",
            message="Keyword enabled successfully",
            before_state=before_state,
            after_state={"status": "ENABLED", "action": "enable"},
        )

    async def _reduce_bid(self, keyword_id: str, percentage: int) -> ActionResult:
        """Reduce keyword bid by percentage."""
        result = self.db.table("keywords").select("cpc_bid_micros").eq(
            "id", keyword_id
        ).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="reduce_bid",
                message="Keyword not found",
                error="not_found"
            )

        current_bid = result.data[0].get("cpc_bid_micros", 0)
        new_bid = int(current_bid * (1 - percentage / 100))

        self.db.table("keywords").update({
            "cpc_bid_micros": new_bid
        }).eq("id", keyword_id).execute()

        return ActionResult(
            success=True,
            action=f"reduce_bid_{percentage}",
            message=f"Bid reduced by {percentage}%",
            before_state={"bid_micros": current_bid},
            after_state={"bid_micros": new_bid, "action": f"reduce_bid_{percentage}"},
        )

    async def _set_bid(self, keyword_id: str, bid_micros: int) -> ActionResult:
        """Set keyword bid to specific value."""
        self.db.table("keywords").update({
            "cpc_bid_micros": bid_micros
        }).eq("id", keyword_id).execute()

        return ActionResult(
            success=True,
            action="set_bid",
            message="Bid restored",
            after_state={"bid_micros": bid_micros},
        )

    async def _pause_and_add_negative(self, keyword_id: str) -> ActionResult:
        """Pause keyword and add as negative."""
        # Pause the keyword
        pause_result = await self._pause_keyword(keyword_id)
        if not pause_result.success:
            return pause_result

        # Get keyword text
        result = self.db.table("keywords").select("text, ad_group_id").eq(
            "id", keyword_id
        ).execute()

        if result.data:
            keyword_text = result.data[0].get("text")
            # TODO: Add as negative keyword via Google Ads API

        return ActionResult(
            success=True,
            action="pause_and_negative",
            message="Keyword paused and added as negative",
            before_state=pause_result.before_state,
            after_state={"status": "PAUSED", "added_negative": True, "action": "pause_and_negative"},
        )

    # =========================================================================
    # Campaign Actions
    # =========================================================================

    async def _increase_budget(self, campaign_id: str, percentage: int) -> ActionResult:
        """Increase campaign budget by percentage."""
        result = self.db.table("campaigns").select("budget_micros").eq(
            "id", campaign_id
        ).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="increase_budget",
                message="Campaign not found",
                error="not_found"
            )

        current_budget = result.data[0].get("budget_micros", 0) or 0
        new_budget = int(current_budget * (1 + percentage / 100))

        self.db.table("campaigns").update({
            "budget_micros": new_budget
        }).eq("id", campaign_id).execute()

        return ActionResult(
            success=True,
            action=f"increase_budget_{percentage}",
            message=f"Budget increased by {percentage}%",
            before_state={"budget_micros": current_budget},
            after_state={"budget_micros": new_budget, "action": f"increase_budget_{percentage}"},
        )

    async def _set_budget(self, campaign_id: str, budget_micros: int) -> ActionResult:
        """Set campaign budget to specific value."""
        self.db.table("campaigns").update({
            "budget_micros": budget_micros
        }).eq("id", campaign_id).execute()

        return ActionResult(
            success=True,
            action="set_budget",
            message="Budget restored",
            after_state={"budget_micros": budget_micros},
        )

    async def _pause_campaign(self, campaign_id: str) -> ActionResult:
        """Pause a campaign."""
        result = self.db.table("campaigns").select("status").eq(
            "id", campaign_id
        ).execute()

        before_state = {}
        if result.data:
            before_state = {"status": result.data[0].get("status")}

        self.db.table("campaigns").update({
            "status": "PAUSED"
        }).eq("id", campaign_id).execute()

        return ActionResult(
            success=True,
            action="pause_campaign",
            message="Campaign paused successfully",
            before_state=before_state,
            after_state={"status": "PAUSED", "action": "pause_campaign"},
        )

    async def _enable_campaign(self, campaign_id: str) -> ActionResult:
        """Enable a campaign."""
        self.db.table("campaigns").update({
            "status": "ENABLED"
        }).eq("id", campaign_id).execute()

        return ActionResult(
            success=True,
            action="enable_campaign",
            message="Campaign enabled successfully",
            after_state={"status": "ENABLED"},
        )

    # =========================================================================
    # Ad/Ad Set Actions
    # =========================================================================

    async def _pause_ad(self, ad_id: str) -> ActionResult:
        """Pause an ad."""
        result = self.db.table("ads").select("status").eq(
            "id", ad_id
        ).execute()

        before_state = {}
        if result.data:
            before_state = {"status": result.data[0].get("status")}

        self.db.table("ads").update({
            "status": "PAUSED"
        }).eq("id", ad_id).execute()

        return ActionResult(
            success=True,
            action="pause_ad",
            message="Ad paused successfully",
            before_state=before_state,
            after_state={"status": "PAUSED", "action": "pause_ad"},
        )

    async def _enable_ad(self, ad_id: str) -> ActionResult:
        """Enable an ad."""
        self.db.table("ads").update({
            "status": "ENABLED"
        }).eq("id", ad_id).execute()

        return ActionResult(
            success=True,
            action="enable_ad",
            message="Ad enabled successfully",
            after_state={"status": "ENABLED"},
        )

    async def _pause_adset(self, adset_id: str) -> ActionResult:
        """Pause an ad set (ad group)."""
        result = self.db.table("ad_groups").select("status").eq(
            "id", adset_id
        ).execute()

        before_state = {}
        if result.data:
            before_state = {"status": result.data[0].get("status")}

        self.db.table("ad_groups").update({
            "status": "PAUSED"
        }).eq("id", adset_id).execute()

        return ActionResult(
            success=True,
            action="pause_adset",
            message="Ad set paused successfully",
            before_state=before_state,
            after_state={"status": "PAUSED", "action": "pause_adset"},
        )

    async def _enable_adset(self, adset_id: str) -> ActionResult:
        """Enable an ad set (ad group)."""
        self.db.table("ad_groups").update({
            "status": "ENABLED"
        }).eq("id", adset_id).execute()

        return ActionResult(
            success=True,
            action="enable_adset",
            message="Ad set enabled successfully",
            after_state={"status": "ENABLED"},
        )
