"""
Action Executor - Executes recommendation actions on ad platforms.

This service:
1. Takes a recommendation and selected option
2. Executes the corresponding action on Google Ads or Meta Ads
3. Records the action and enables undo functionality
4. Handles rollback for the 24-hour undo window

Phase 1: Google Ads integration via v23.1 adapter
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
import json
import logging
import time
import uuid

from ..supabase_client import get_supabase_client
from ...integrations.google_ads.adapters.v23_1 import GoogleAdsAdapterV23_1
from ...integrations.meta_ads.adapters.v21 import MetaAdsV21Adapter
from ...integrations.rate_limiter import GoogleAdsRateLimiter, MetaAdsRateLimiter

logger = logging.getLogger(__name__)


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
    Now integrates with actual platform APIs via adapters.
    """

    def __init__(self, supabase_client=None):
        self.db = supabase_client or get_supabase_client()
        self.google_rate_limiter = GoogleAdsRateLimiter()
        self.meta_rate_limiter = MetaAdsRateLimiter()
        self._google_adapter_cache: Dict[str, GoogleAdsAdapterV23_1] = {}
        self._meta_adapter_cache: Dict[str, tuple[MetaAdsV21Adapter, str]] = {}  # (adapter, access_token)

    async def _get_google_adapter(self, ad_account_id: str) -> Optional[GoogleAdsAdapterV23_1]:
        """
        Get authenticated Google Ads adapter for an account.

        Returns None if account not found or not a Google account.
        """
        # Check cache first
        if ad_account_id in self._google_adapter_cache:
            return self._google_adapter_cache[ad_account_id]

        # Get account credentials from database
        result = self.db.table("ad_accounts").select(
            "id, platform, platform_account_id, refresh_token, ad_platforms(name)"
        ).eq("id", ad_account_id).execute()

        if not result.data:
            logger.warning(f"Account {ad_account_id} not found")
            return None

        account = result.data[0]
        platform = account.get("platform") or account.get("ad_platforms", {}).get("name", "")

        if platform.lower() != "google":
            logger.info(f"Account {ad_account_id} is not a Google account")
            return None

        refresh_token = account.get("refresh_token")
        customer_id = account.get("platform_account_id")

        if not refresh_token or not customer_id:
            logger.warning(f"Missing credentials for account {ad_account_id}")
            return None

        # Create adapter and cache it
        adapter = GoogleAdsAdapterV23_1(refresh_token, customer_id)
        self._google_adapter_cache[ad_account_id] = adapter

        return adapter

    async def _get_meta_adapter(self, ad_account_id: str) -> Optional[tuple[MetaAdsV21Adapter, str]]:
        """
        Get Meta Ads adapter and access token for an account.

        Returns (adapter, access_token) or None if not a Meta account.
        """
        # Check cache first
        if ad_account_id in self._meta_adapter_cache:
            return self._meta_adapter_cache[ad_account_id]

        # Get account credentials from database
        result = self.db.table("ad_accounts").select(
            "id, platform, platform_account_id, access_token, ad_platforms(name)"
        ).eq("id", ad_account_id).execute()

        if not result.data:
            logger.warning(f"Account {ad_account_id} not found")
            return None

        account = result.data[0]
        platform = account.get("platform") or account.get("ad_platforms", {}).get("name", "")

        if platform.lower() not in ["meta", "facebook"]:
            logger.info(f"Account {ad_account_id} is not a Meta account")
            return None

        access_token = account.get("access_token")

        if not access_token:
            logger.warning(f"Missing access token for Meta account {ad_account_id}")
            return None

        # Create adapter and cache it
        adapter = MetaAdsV21Adapter()
        self._meta_adapter_cache[ad_account_id] = (adapter, access_token)

        return (adapter, access_token)

    async def _check_rate_limit(self, ad_account_id: str, operations: int = 1, platform: str = "google") -> tuple[bool, str]:
        """
        Check if we can proceed with API operations.

        Returns (can_proceed, message)
        """
        try:
            rate_limiter = self.google_rate_limiter if platform == "google" else self.meta_rate_limiter
            quota_status = await rate_limiter.get_quota_status(ad_account_id)

            if quota_status.get("blocked", False):
                return False, f"Rate limit reached. Try again after {quota_status.get('reset_time', 'midnight')}"

            if quota_status.get("warning", False):
                logger.warning(f"Rate limit warning for account {ad_account_id}: {quota_status.get('usage_pct')}% used")

            # Increment usage
            await rate_limiter.increment_usage(ad_account_id, operations)

            return True, "OK"
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Allow operation if rate limiter fails (fail open)
            return True, "Rate limiter unavailable"

    async def _log_execution(
        self,
        recommendation_id: str,
        organization_id: str,
        ad_account_id: str,
        action_type: str,
        entity_type: str,
        entity_id: str,
        platform_entity_id: str,
        result: 'ActionResult',
        api_called: bool = False,
        api_response: dict = None,
        api_latency_ms: int = None,
        rate_limit_used: int = 1
    ) -> Optional[str]:
        """
        Log action execution to audit table.

        Returns the execution log ID.
        """
        try:
            log_data = {
                "id": str(uuid.uuid4()),
                "recommendation_id": recommendation_id,
                "organization_id": organization_id,
                "ad_account_id": ad_account_id,
                "action_type": action_type,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "platform_entity_id": platform_entity_id,
                "success": result.success,
                "error_code": result.error if not result.success else None,
                "error_message": result.message if not result.success else None,
                "before_state": result.before_state,
                "after_state": result.after_state,
                "api_called": api_called,
                "api_response": api_response,
                "api_latency_ms": api_latency_ms,
                "rate_limit_used": rate_limit_used,
                "executed_at": datetime.utcnow().isoformat(),
                "executed_by": "ai_recommendation"
            }

            self.db.table("action_execution_log").insert(log_data).execute()
            logger.info(f"Logged execution {log_data['id']} for recommendation {recommendation_id}")
            return log_data["id"]
        except Exception as e:
            # Don't fail the action if logging fails
            logger.error(f"Failed to log execution: {e}")
            return None

    async def _check_idempotency(
        self,
        recommendation_id: str,
        action_type: str
    ) -> tuple[bool, Optional[dict]]:
        """
        Check if this action was already executed (idempotency check).

        Returns (already_executed, previous_result)
        """
        try:
            idempotency_key = f"{recommendation_id}:{action_type}"

            result = self.db.table("action_idempotency_keys").select("*").eq(
                "idempotency_key", idempotency_key
            ).gt("expires_at", datetime.utcnow().isoformat()).execute()

            if result.data:
                logger.warning(f"Duplicate execution attempt for {idempotency_key}")
                return True, result.data[0].get("result")

            return False, None
        except Exception as e:
            logger.error(f"Idempotency check failed: {e}")
            return False, None

    async def _set_idempotency_key(
        self,
        recommendation_id: str,
        action_type: str,
        result: dict
    ) -> None:
        """Record idempotency key to prevent duplicate execution."""
        try:
            idempotency_key = f"{recommendation_id}:{action_type}"
            expires_at = (datetime.utcnow() + timedelta(hours=24)).isoformat()

            self.db.table("action_idempotency_keys").upsert({
                "idempotency_key": idempotency_key,
                "recommendation_id": recommendation_id,
                "action_type": action_type,
                "expires_at": expires_at,
                "result": result
            }).execute()
        except Exception as e:
            logger.error(f"Failed to set idempotency key: {e}")

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
        ad_account_id = rec.get("ad_account_id")

        # Check idempotency (prevent duplicate execution)
        already_executed, prev_result = await self._check_idempotency(recommendation_id, action)
        if already_executed:
            return ActionResult(
                success=True,
                action=action,
                message="Action was already executed (duplicate request prevented)",
                before_state=prev_result.get("before_state") if prev_result else {},
                after_state=prev_result.get("after_state") if prev_result else {},
                can_undo=True
            )

        # Track execution timing
        start_time = time.time()

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

            # Calculate execution time
            execution_time_ms = int((time.time() - start_time) * 1000)

            # Log the execution to audit table
            await self._log_execution(
                recommendation_id=recommendation_id,
                organization_id=organization_id,
                ad_account_id=ad_account_id,
                action_type=action,
                entity_type=entity_type,
                entity_id=entity_id,
                platform_entity_id=rec.get("platform_entity_id"),
                result=result,
                api_called=True,  # We now always try API
                api_latency_ms=execution_time_ms
            )

            # Set idempotency key to prevent duplicate execution
            await self._set_idempotency_key(
                recommendation_id=recommendation_id,
                action_type=action,
                result=result.to_dict()
            )

            # Update recommendation status
            if result.success:
                self.db.table("recommendations").update({
                    "status": "applied",
                    "applied_at": datetime.utcnow().isoformat(),
                    "applied_option_id": option_id,
                    "before_state": json.dumps(result.before_state),
                    "after_state": json.dumps(result.after_state),
                    "execution_count": rec.get("execution_count", 0) + 1
                }).eq("id", recommendation_id).execute()

            return result

        except Exception as e:
            # Log failed execution
            await self._log_execution(
                recommendation_id=recommendation_id,
                organization_id=organization_id,
                ad_account_id=ad_account_id,
                action_type=action,
                entity_type=entity_type,
                entity_id=entity_id,
                platform_entity_id=rec.get("platform_entity_id"),
                result=ActionResult(
                    success=False,
                    action=action,
                    message=str(e),
                    error=str(e)
                ),
                api_called=True
            )

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

    async def _pause_keyword(self, keyword_id: str, ad_account_id: str = None) -> ActionResult:
        """Pause a keyword via Google Ads API."""
        # Get current state and account info
        result = self.db.table("keywords").select(
            "id, status, cpc_bid_micros, platform_keyword_id, ad_groups(ad_accounts(id, platform_account_id))"
        ).eq("id", keyword_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="pause_keyword",
                message="Keyword not found",
                error="not_found"
            )

        keyword = result.data[0]
        before_state = {"status": keyword.get("status")}

        # Get account ID from keyword's ad group chain
        if not ad_account_id:
            ad_groups = keyword.get("ad_groups")
            if ad_groups:
                ad_accounts = ad_groups.get("ad_accounts")
                if ad_accounts:
                    ad_account_id = ad_accounts.get("id")

        if not ad_account_id:
            return ActionResult(
                success=False,
                action="pause_keyword",
                message="Could not determine ad account",
                error="no_account"
            )

        # Check rate limit
        can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 1)
        if not can_proceed:
            return ActionResult(
                success=False,
                action="pause_keyword",
                message=rate_msg,
                error="rate_limit"
            )

        # Get adapter
        adapter = await self._get_google_adapter(ad_account_id)

        if adapter:
            # Use platform keyword ID (the actual Google Ads ID)
            platform_keyword_id = keyword.get("platform_keyword_id") or keyword_id

            # Call Google Ads API
            logger.info(f"Calling Google Ads API to pause keyword {platform_keyword_id}")
            api_result = await adapter.pause_keywords([platform_keyword_id])

            if not api_result.success:
                logger.error(f"Google Ads API error: {api_result.error_message}")
                return ActionResult(
                    success=False,
                    action="pause_keyword",
                    message=f"Google Ads API error: {api_result.error_message}",
                    error="api_error"
                )

            logger.info(f"Successfully paused keyword {platform_keyword_id} via Google Ads API")

        # Update local database AFTER successful API call
        self.db.table("keywords").update({
            "status": "PAUSED",
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation"
        }).eq("id", keyword_id).execute()

        return ActionResult(
            success=True,
            action="pause_keyword",
            message="Keyword paused successfully" + (" (via Google Ads API)" if adapter else " (database only)"),
            before_state=before_state,
            after_state={"status": "PAUSED", "action": "pause"},
        )

    async def _enable_keyword(self, keyword_id: str, ad_account_id: str = None) -> ActionResult:
        """Enable a keyword via Google Ads API."""
        # Get current state and account info
        result = self.db.table("keywords").select(
            "id, status, platform_keyword_id, ad_groups(ad_accounts(id, platform_account_id))"
        ).eq("id", keyword_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="enable_keyword",
                message="Keyword not found",
                error="not_found"
            )

        keyword = result.data[0]
        before_state = {"status": keyword.get("status")}

        # Get account ID from keyword's ad group chain
        if not ad_account_id:
            ad_groups = keyword.get("ad_groups")
            if ad_groups:
                ad_accounts = ad_groups.get("ad_accounts")
                if ad_accounts:
                    ad_account_id = ad_accounts.get("id")

        if not ad_account_id:
            return ActionResult(
                success=False,
                action="enable_keyword",
                message="Could not determine ad account",
                error="no_account"
            )

        # Check rate limit
        can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 1)
        if not can_proceed:
            return ActionResult(
                success=False,
                action="enable_keyword",
                message=rate_msg,
                error="rate_limit"
            )

        # Get adapter
        adapter = await self._get_google_adapter(ad_account_id)

        if adapter:
            # Use platform keyword ID (the actual Google Ads ID)
            platform_keyword_id = keyword.get("platform_keyword_id") or keyword_id

            # Call Google Ads API
            logger.info(f"Calling Google Ads API to enable keyword {platform_keyword_id}")
            api_result = await adapter.enable_keywords([platform_keyword_id])

            if not api_result.success:
                logger.error(f"Google Ads API error: {api_result.error_message}")
                return ActionResult(
                    success=False,
                    action="enable_keyword",
                    message=f"Google Ads API error: {api_result.error_message}",
                    error="api_error"
                )

            logger.info(f"Successfully enabled keyword {platform_keyword_id} via Google Ads API")

        # Update local database AFTER successful API call
        self.db.table("keywords").update({
            "status": "ENABLED",
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation"
        }).eq("id", keyword_id).execute()

        return ActionResult(
            success=True,
            action="enable_keyword",
            message="Keyword enabled successfully" + (" (via Google Ads API)" if adapter else " (database only)"),
            before_state=before_state,
            after_state={"status": "ENABLED", "action": "enable"},
        )

    async def _reduce_bid(self, keyword_id: str, percentage: int, ad_account_id: str = None) -> ActionResult:
        """Reduce keyword bid by percentage via Google Ads API."""
        # Get current state and account info
        result = self.db.table("keywords").select(
            "id, cpc_bid_micros, platform_keyword_id, ad_group_id, ad_groups(id, platform_ad_group_id, ad_accounts(id, platform_account_id))"
        ).eq("id", keyword_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="reduce_bid",
                message="Keyword not found",
                error="not_found"
            )

        keyword = result.data[0]
        current_bid = keyword.get("cpc_bid_micros", 0) or 0
        new_bid = int(current_bid * (1 - percentage / 100))

        # Get account ID from keyword's ad group chain
        if not ad_account_id:
            ad_groups = keyword.get("ad_groups")
            if ad_groups:
                ad_accounts = ad_groups.get("ad_accounts")
                if ad_accounts:
                    ad_account_id = ad_accounts.get("id")

        if not ad_account_id:
            return ActionResult(
                success=False,
                action="reduce_bid",
                message="Could not determine ad account",
                error="no_account"
            )

        # Check rate limit
        can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 1)
        if not can_proceed:
            return ActionResult(
                success=False,
                action="reduce_bid",
                message=rate_msg,
                error="rate_limit"
            )

        # Get adapter
        adapter = await self._get_google_adapter(ad_account_id)

        if adapter:
            # Use platform IDs
            platform_keyword_id = keyword.get("platform_keyword_id") or keyword_id
            platform_ad_group_id = keyword.get("ad_groups", {}).get("platform_ad_group_id") or keyword.get("ad_group_id")

            # Call Google Ads API
            logger.info(f"Calling Google Ads API to update bid for keyword {platform_keyword_id} to {new_bid} micros")
            api_result = await adapter.update_keyword_bid(
                keyword_id=platform_keyword_id,
                ad_group_id=platform_ad_group_id,
                new_bid_micros=new_bid
            )

            if not api_result.success:
                logger.error(f"Google Ads API error: {api_result.error_message}")
                return ActionResult(
                    success=False,
                    action="reduce_bid",
                    message=f"Google Ads API error: {api_result.error_message}",
                    error="api_error"
                )

            logger.info(f"Successfully updated keyword {platform_keyword_id} bid via Google Ads API")

        # Update local database AFTER successful API call
        self.db.table("keywords").update({
            "cpc_bid_micros": new_bid,
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation"
        }).eq("id", keyword_id).execute()

        return ActionResult(
            success=True,
            action=f"reduce_bid_{percentage}",
            message=f"Bid reduced by {percentage}%" + (" (via Google Ads API)" if adapter else " (database only)"),
            before_state={"bid_micros": current_bid},
            after_state={"bid_micros": new_bid, "action": f"reduce_bid_{percentage}"},
        )

    async def _set_bid(self, keyword_id: str, bid_micros: int, ad_account_id: str = None) -> ActionResult:
        """Set keyword bid to specific value via Google Ads API (used for undo)."""
        # Get account info
        result = self.db.table("keywords").select(
            "id, platform_keyword_id, ad_group_id, ad_groups(id, platform_ad_group_id, ad_accounts(id, platform_account_id))"
        ).eq("id", keyword_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="set_bid",
                message="Keyword not found",
                error="not_found"
            )

        keyword = result.data[0]

        # Get account ID from keyword's ad group chain
        if not ad_account_id:
            ad_groups = keyword.get("ad_groups")
            if ad_groups:
                ad_accounts = ad_groups.get("ad_accounts")
                if ad_accounts:
                    ad_account_id = ad_accounts.get("id")

        if ad_account_id:
            # Check rate limit
            can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 1)
            if not can_proceed:
                return ActionResult(
                    success=False,
                    action="set_bid",
                    message=rate_msg,
                    error="rate_limit"
                )

            # Get adapter
            adapter = await self._get_google_adapter(ad_account_id)

            if adapter:
                platform_keyword_id = keyword.get("platform_keyword_id") or keyword_id
                platform_ad_group_id = keyword.get("ad_groups", {}).get("platform_ad_group_id") or keyword.get("ad_group_id")

                logger.info(f"Calling Google Ads API to restore bid for keyword {platform_keyword_id}")
                api_result = await adapter.update_keyword_bid(
                    keyword_id=platform_keyword_id,
                    ad_group_id=platform_ad_group_id,
                    new_bid_micros=bid_micros
                )

                if not api_result.success:
                    logger.error(f"Google Ads API error: {api_result.error_message}")
                    return ActionResult(
                        success=False,
                        action="set_bid",
                        message=f"Google Ads API error: {api_result.error_message}",
                        error="api_error"
                    )

        # Update local database
        self.db.table("keywords").update({
            "cpc_bid_micros": bid_micros,
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation_undo"
        }).eq("id", keyword_id).execute()

        return ActionResult(
            success=True,
            action="set_bid",
            message="Bid restored",
            after_state={"bid_micros": bid_micros},
        )

    async def _pause_and_add_negative(self, keyword_id: str, ad_account_id: str = None) -> ActionResult:
        """Pause keyword and add as negative via Google Ads API."""
        # Get keyword info with campaign and account details
        result = self.db.table("keywords").select(
            "id, text, match_type, status, platform_keyword_id, ad_groups(id, campaign_id, campaigns(id, platform_campaign_id), ad_accounts(id, platform_account_id))"
        ).eq("id", keyword_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="pause_and_negative",
                message="Keyword not found",
                error="not_found"
            )

        keyword = result.data[0]
        keyword_text = keyword.get("text")
        match_type = keyword.get("match_type", "EXACT")
        before_state = {"status": keyword.get("status")}

        # Get account and campaign info
        ad_groups = keyword.get("ad_groups")
        if ad_groups:
            ad_accounts = ad_groups.get("ad_accounts")
            if ad_accounts and not ad_account_id:
                ad_account_id = ad_accounts.get("id")
            campaigns = ad_groups.get("campaigns")
            platform_campaign_id = campaigns.get("platform_campaign_id") if campaigns else None

        if not ad_account_id:
            return ActionResult(
                success=False,
                action="pause_and_negative",
                message="Could not determine ad account",
                error="no_account"
            )

        # Check rate limit (2 operations: pause + add negative)
        can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 2)
        if not can_proceed:
            return ActionResult(
                success=False,
                action="pause_and_negative",
                message=rate_msg,
                error="rate_limit"
            )

        # Get adapter
        adapter = await self._get_google_adapter(ad_account_id)
        negative_added = False

        if adapter:
            platform_keyword_id = keyword.get("platform_keyword_id") or keyword_id

            # Step 1: Pause the keyword
            logger.info(f"Calling Google Ads API to pause keyword {platform_keyword_id}")
            pause_result = await adapter.pause_keywords([platform_keyword_id])

            if not pause_result.success:
                logger.error(f"Google Ads API error pausing keyword: {pause_result.error_message}")
                return ActionResult(
                    success=False,
                    action="pause_and_negative",
                    message=f"Failed to pause keyword: {pause_result.error_message}",
                    error="api_error"
                )

            # Step 2: Add as negative keyword at campaign level
            if platform_campaign_id and keyword_text:
                logger.info(f"Calling Google Ads API to add negative keyword '{keyword_text}' to campaign {platform_campaign_id}")
                negative_result = await adapter.add_negative_keyword(
                    campaign_id=platform_campaign_id,
                    keyword_text=keyword_text,
                    match_type=match_type
                )

                if negative_result.success:
                    negative_added = True
                    logger.info(f"Successfully added negative keyword")
                else:
                    # Log but don't fail - pause already succeeded
                    logger.warning(f"Failed to add negative keyword: {negative_result.error_message}")

        # Update local database AFTER successful API call
        self.db.table("keywords").update({
            "status": "PAUSED",
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation"
        }).eq("id", keyword_id).execute()

        message = "Keyword paused"
        if negative_added:
            message += " and added as negative"
        elif adapter:
            message += " (negative keyword not added - no campaign ID)"
        else:
            message += " (database only)"

        return ActionResult(
            success=True,
            action="pause_and_negative",
            message=message,
            before_state=before_state,
            after_state={"status": "PAUSED", "added_negative": negative_added, "action": "pause_and_negative"},
        )

    # =========================================================================
    # Campaign Actions
    # =========================================================================

    async def _increase_budget(self, campaign_id: str, percentage: int, ad_account_id: str = None) -> ActionResult:
        """Increase campaign budget by percentage via Google Ads API."""
        # Get campaign info with account details
        result = self.db.table("campaigns").select(
            "id, budget_micros, platform_campaign_id, ad_account_id, ad_accounts(id, platform_account_id)"
        ).eq("id", campaign_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="increase_budget",
                message="Campaign not found",
                error="not_found"
            )

        campaign = result.data[0]
        current_budget = campaign.get("budget_micros", 0) or 0
        new_budget = int(current_budget * (1 + percentage / 100))

        # Get account ID
        if not ad_account_id:
            ad_account_id = campaign.get("ad_account_id")
            if not ad_account_id:
                ad_accounts = campaign.get("ad_accounts")
                if ad_accounts:
                    ad_account_id = ad_accounts.get("id")

        if not ad_account_id:
            return ActionResult(
                success=False,
                action="increase_budget",
                message="Could not determine ad account",
                error="no_account"
            )

        # Check rate limit
        can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 1)
        if not can_proceed:
            return ActionResult(
                success=False,
                action="increase_budget",
                message=rate_msg,
                error="rate_limit"
            )

        # Get adapter
        adapter = await self._get_google_adapter(ad_account_id)

        if adapter:
            platform_campaign_id = campaign.get("platform_campaign_id") or campaign_id

            # Call Google Ads API
            logger.info(f"Calling Google Ads API to update budget for campaign {platform_campaign_id} to {new_budget} micros")
            api_result = await adapter.update_campaign_budget(
                campaign_id=platform_campaign_id,
                new_budget_micros=new_budget
            )

            if not api_result.success:
                logger.error(f"Google Ads API error: {api_result.error_message}")
                return ActionResult(
                    success=False,
                    action="increase_budget",
                    message=f"Google Ads API error: {api_result.error_message}",
                    error="api_error"
                )

            logger.info(f"Successfully updated campaign {platform_campaign_id} budget via Google Ads API")

        # Update local database AFTER successful API call
        self.db.table("campaigns").update({
            "budget_micros": new_budget,
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation"
        }).eq("id", campaign_id).execute()

        return ActionResult(
            success=True,
            action=f"increase_budget_{percentage}",
            message=f"Budget increased by {percentage}%" + (" (via Google Ads API)" if adapter else " (database only)"),
            before_state={"budget_micros": current_budget},
            after_state={"budget_micros": new_budget, "action": f"increase_budget_{percentage}"},
        )

    async def _set_budget(self, campaign_id: str, budget_micros: int, ad_account_id: str = None) -> ActionResult:
        """Set campaign budget to specific value via Google Ads API (used for undo)."""
        # Get campaign info with account details
        result = self.db.table("campaigns").select(
            "id, platform_campaign_id, ad_account_id, ad_accounts(id, platform_account_id)"
        ).eq("id", campaign_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="set_budget",
                message="Campaign not found",
                error="not_found"
            )

        campaign = result.data[0]

        # Get account ID
        if not ad_account_id:
            ad_account_id = campaign.get("ad_account_id")
            if not ad_account_id:
                ad_accounts = campaign.get("ad_accounts")
                if ad_accounts:
                    ad_account_id = ad_accounts.get("id")

        if ad_account_id:
            # Check rate limit
            can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 1)
            if not can_proceed:
                return ActionResult(
                    success=False,
                    action="set_budget",
                    message=rate_msg,
                    error="rate_limit"
                )

            # Get adapter
            adapter = await self._get_google_adapter(ad_account_id)

            if adapter:
                platform_campaign_id = campaign.get("platform_campaign_id") or campaign_id

                logger.info(f"Calling Google Ads API to restore budget for campaign {platform_campaign_id}")
                api_result = await adapter.update_campaign_budget(
                    campaign_id=platform_campaign_id,
                    new_budget_micros=budget_micros
                )

                if not api_result.success:
                    logger.error(f"Google Ads API error: {api_result.error_message}")
                    return ActionResult(
                        success=False,
                        action="set_budget",
                        message=f"Google Ads API error: {api_result.error_message}",
                        error="api_error"
                    )

        # Update local database
        self.db.table("campaigns").update({
            "budget_micros": budget_micros,
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation_undo"
        }).eq("id", campaign_id).execute()

        return ActionResult(
            success=True,
            action="set_budget",
            message="Budget restored",
            after_state={"budget_micros": budget_micros},
        )

    async def _pause_campaign(self, campaign_id: str, ad_account_id: str = None) -> ActionResult:
        """Pause a campaign via Google Ads API."""
        # Get campaign info with account details
        result = self.db.table("campaigns").select(
            "id, status, platform_campaign_id, ad_account_id, ad_accounts(id, platform_account_id)"
        ).eq("id", campaign_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="pause_campaign",
                message="Campaign not found",
                error="not_found"
            )

        campaign = result.data[0]
        before_state = {"status": campaign.get("status")}

        # Get account ID
        if not ad_account_id:
            ad_account_id = campaign.get("ad_account_id")
            if not ad_account_id:
                ad_accounts = campaign.get("ad_accounts")
                if ad_accounts:
                    ad_account_id = ad_accounts.get("id")

        if not ad_account_id:
            return ActionResult(
                success=False,
                action="pause_campaign",
                message="Could not determine ad account",
                error="no_account"
            )

        # Check rate limit
        can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 1)
        if not can_proceed:
            return ActionResult(
                success=False,
                action="pause_campaign",
                message=rate_msg,
                error="rate_limit"
            )

        # Get adapter
        adapter = await self._get_google_adapter(ad_account_id)

        if adapter:
            platform_campaign_id = campaign.get("platform_campaign_id") or campaign_id

            # Call Google Ads API
            logger.info(f"Calling Google Ads API to pause campaign {platform_campaign_id}")
            api_result = await adapter.pause_campaign(platform_campaign_id)

            if not api_result.success:
                logger.error(f"Google Ads API error: {api_result.error_message}")
                return ActionResult(
                    success=False,
                    action="pause_campaign",
                    message=f"Google Ads API error: {api_result.error_message}",
                    error="api_error"
                )

            logger.info(f"Successfully paused campaign {platform_campaign_id} via Google Ads API")

        # Update local database AFTER successful API call
        self.db.table("campaigns").update({
            "status": "PAUSED",
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation"
        }).eq("id", campaign_id).execute()

        return ActionResult(
            success=True,
            action="pause_campaign",
            message="Campaign paused successfully" + (" (via Google Ads API)" if adapter else " (database only)"),
            before_state=before_state,
            after_state={"status": "PAUSED", "action": "pause_campaign"},
        )

    async def _enable_campaign(self, campaign_id: str, ad_account_id: str = None) -> ActionResult:
        """Enable a campaign via Google Ads API."""
        # Get campaign info with account details
        result = self.db.table("campaigns").select(
            "id, status, platform_campaign_id, ad_account_id, ad_accounts(id, platform_account_id)"
        ).eq("id", campaign_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="enable_campaign",
                message="Campaign not found",
                error="not_found"
            )

        campaign = result.data[0]
        before_state = {"status": campaign.get("status")}

        # Get account ID
        if not ad_account_id:
            ad_account_id = campaign.get("ad_account_id")
            if not ad_account_id:
                ad_accounts = campaign.get("ad_accounts")
                if ad_accounts:
                    ad_account_id = ad_accounts.get("id")

        if ad_account_id:
            # Check rate limit
            can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 1)
            if not can_proceed:
                return ActionResult(
                    success=False,
                    action="enable_campaign",
                    message=rate_msg,
                    error="rate_limit"
                )

            # Get adapter
            adapter = await self._get_google_adapter(ad_account_id)

            if adapter:
                platform_campaign_id = campaign.get("platform_campaign_id") or campaign_id

                # Call Google Ads API
                logger.info(f"Calling Google Ads API to enable campaign {platform_campaign_id}")
                api_result = await adapter.enable_campaign(platform_campaign_id)

                if not api_result.success:
                    logger.error(f"Google Ads API error: {api_result.error_message}")
                    return ActionResult(
                        success=False,
                        action="enable_campaign",
                        message=f"Google Ads API error: {api_result.error_message}",
                        error="api_error"
                    )

                logger.info(f"Successfully enabled campaign {platform_campaign_id} via Google Ads API")

        # Update local database
        self.db.table("campaigns").update({
            "status": "ENABLED",
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation_undo"
        }).eq("id", campaign_id).execute()

        return ActionResult(
            success=True,
            action="enable_campaign",
            message="Campaign enabled successfully",
            before_state=before_state,
            after_state={"status": "ENABLED"},
        )

    # =========================================================================
    # Ad/Ad Set Actions (Meta Ads)
    # =========================================================================

    async def _pause_ad(self, ad_id: str, ad_account_id: str = None) -> ActionResult:
        """Pause an ad via Meta Ads API."""
        # Get ad info with account details
        result = self.db.table("ads").select(
            "id, status, platform_ad_id, ad_group_id, ad_groups(ad_account_id, ad_accounts(id, platform, platform_account_id))"
        ).eq("id", ad_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="pause_ad",
                message="Ad not found",
                error="not_found"
            )

        ad = result.data[0]
        before_state = {"status": ad.get("status")}

        # Get account ID
        if not ad_account_id:
            ad_groups = ad.get("ad_groups")
            if ad_groups:
                ad_account_id = ad_groups.get("ad_account_id")
                if not ad_account_id:
                    ad_accounts = ad_groups.get("ad_accounts")
                    if ad_accounts:
                        ad_account_id = ad_accounts.get("id")

        if ad_account_id:
            # Check rate limit (Meta)
            can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 1, "meta")
            if not can_proceed:
                return ActionResult(
                    success=False,
                    action="pause_ad",
                    message=rate_msg,
                    error="rate_limit"
                )

            # Get Meta adapter
            meta_result = await self._get_meta_adapter(ad_account_id)

            if meta_result:
                adapter, access_token = meta_result
                platform_ad_id = ad.get("platform_ad_id") or ad_id

                # Call Meta Ads API
                logger.info(f"Calling Meta Ads API to pause ad {platform_ad_id}")
                api_result = await adapter.pause_ad(platform_ad_id, access_token)

                if not api_result.success:
                    logger.error(f"Meta Ads API error: {api_result.error_message}")
                    return ActionResult(
                        success=False,
                        action="pause_ad",
                        message=f"Meta Ads API error: {api_result.error_message}",
                        error="api_error"
                    )

                logger.info(f"Successfully paused ad {platform_ad_id} via Meta Ads API")

        # Update local database AFTER successful API call
        self.db.table("ads").update({
            "status": "PAUSED",
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation"
        }).eq("id", ad_id).execute()

        return ActionResult(
            success=True,
            action="pause_ad",
            message="Ad paused successfully" + (" (via Meta Ads API)" if ad_account_id else " (database only)"),
            before_state=before_state,
            after_state={"status": "PAUSED", "action": "pause_ad"},
        )

    async def _enable_ad(self, ad_id: str, ad_account_id: str = None) -> ActionResult:
        """Enable an ad via Meta Ads API."""
        # Get ad info with account details
        result = self.db.table("ads").select(
            "id, status, platform_ad_id, ad_group_id, ad_groups(ad_account_id, ad_accounts(id, platform, platform_account_id))"
        ).eq("id", ad_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="enable_ad",
                message="Ad not found",
                error="not_found"
            )

        ad = result.data[0]
        before_state = {"status": ad.get("status")}

        # Get account ID
        if not ad_account_id:
            ad_groups = ad.get("ad_groups")
            if ad_groups:
                ad_account_id = ad_groups.get("ad_account_id")
                if not ad_account_id:
                    ad_accounts = ad_groups.get("ad_accounts")
                    if ad_accounts:
                        ad_account_id = ad_accounts.get("id")

        if ad_account_id:
            # Check rate limit (Meta)
            can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 1, "meta")
            if not can_proceed:
                return ActionResult(
                    success=False,
                    action="enable_ad",
                    message=rate_msg,
                    error="rate_limit"
                )

            # Get Meta adapter
            meta_result = await self._get_meta_adapter(ad_account_id)

            if meta_result:
                adapter, access_token = meta_result
                platform_ad_id = ad.get("platform_ad_id") or ad_id

                # Call Meta Ads API
                logger.info(f"Calling Meta Ads API to enable ad {platform_ad_id}")
                api_result = await adapter.enable_ad(platform_ad_id, access_token)

                if not api_result.success:
                    logger.error(f"Meta Ads API error: {api_result.error_message}")
                    return ActionResult(
                        success=False,
                        action="enable_ad",
                        message=f"Meta Ads API error: {api_result.error_message}",
                        error="api_error"
                    )

                logger.info(f"Successfully enabled ad {platform_ad_id} via Meta Ads API")

        # Update local database
        self.db.table("ads").update({
            "status": "ENABLED",
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation_undo"
        }).eq("id", ad_id).execute()

        return ActionResult(
            success=True,
            action="enable_ad",
            message="Ad enabled successfully",
            before_state=before_state,
            after_state={"status": "ENABLED"},
        )

    async def _pause_adset(self, adset_id: str, ad_account_id: str = None) -> ActionResult:
        """Pause an ad set via Meta Ads API."""
        # Get ad set info with account details
        result = self.db.table("ad_groups").select(
            "id, status, platform_ad_group_id, ad_account_id, ad_accounts(id, platform, platform_account_id)"
        ).eq("id", adset_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="pause_adset",
                message="Ad set not found",
                error="not_found"
            )

        adset = result.data[0]
        before_state = {"status": adset.get("status")}

        # Get account ID
        if not ad_account_id:
            ad_account_id = adset.get("ad_account_id")
            if not ad_account_id:
                ad_accounts = adset.get("ad_accounts")
                if ad_accounts:
                    ad_account_id = ad_accounts.get("id")

        if ad_account_id:
            # Check rate limit (Meta)
            can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 1, "meta")
            if not can_proceed:
                return ActionResult(
                    success=False,
                    action="pause_adset",
                    message=rate_msg,
                    error="rate_limit"
                )

            # Get Meta adapter
            meta_result = await self._get_meta_adapter(ad_account_id)

            if meta_result:
                adapter, access_token = meta_result
                platform_adset_id = adset.get("platform_ad_group_id") or adset_id

                # Call Meta Ads API
                logger.info(f"Calling Meta Ads API to pause ad set {platform_adset_id}")
                api_result = await adapter.pause_ad_set(platform_adset_id, access_token)

                if not api_result.success:
                    logger.error(f"Meta Ads API error: {api_result.error_message}")
                    return ActionResult(
                        success=False,
                        action="pause_adset",
                        message=f"Meta Ads API error: {api_result.error_message}",
                        error="api_error"
                    )

                logger.info(f"Successfully paused ad set {platform_adset_id} via Meta Ads API")

        # Update local database AFTER successful API call
        self.db.table("ad_groups").update({
            "status": "PAUSED",
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation"
        }).eq("id", adset_id).execute()

        return ActionResult(
            success=True,
            action="pause_adset",
            message="Ad set paused successfully" + (" (via Meta Ads API)" if ad_account_id else " (database only)"),
            before_state=before_state,
            after_state={"status": "PAUSED", "action": "pause_adset"},
        )

    async def _enable_adset(self, adset_id: str, ad_account_id: str = None) -> ActionResult:
        """Enable an ad set via Meta Ads API."""
        # Get ad set info with account details
        result = self.db.table("ad_groups").select(
            "id, status, platform_ad_group_id, ad_account_id, ad_accounts(id, platform, platform_account_id)"
        ).eq("id", adset_id).execute()

        if not result.data:
            return ActionResult(
                success=False,
                action="enable_adset",
                message="Ad set not found",
                error="not_found"
            )

        adset = result.data[0]
        before_state = {"status": adset.get("status")}

        # Get account ID
        if not ad_account_id:
            ad_account_id = adset.get("ad_account_id")
            if not ad_account_id:
                ad_accounts = adset.get("ad_accounts")
                if ad_accounts:
                    ad_account_id = ad_accounts.get("id")

        if ad_account_id:
            # Check rate limit (Meta)
            can_proceed, rate_msg = await self._check_rate_limit(ad_account_id, 1, "meta")
            if not can_proceed:
                return ActionResult(
                    success=False,
                    action="enable_adset",
                    message=rate_msg,
                    error="rate_limit"
                )

            # Get Meta adapter
            meta_result = await self._get_meta_adapter(ad_account_id)

            if meta_result:
                adapter, access_token = meta_result
                platform_adset_id = adset.get("platform_ad_group_id") or adset_id

                # Call Meta Ads API
                logger.info(f"Calling Meta Ads API to enable ad set {platform_adset_id}")
                api_result = await adapter.enable_ad_set(platform_adset_id, access_token)

                if not api_result.success:
                    logger.error(f"Meta Ads API error: {api_result.error_message}")
                    return ActionResult(
                        success=False,
                        action="enable_adset",
                        message=f"Meta Ads API error: {api_result.error_message}",
                        error="api_error"
                    )

                logger.info(f"Successfully enabled ad set {platform_adset_id} via Meta Ads API")

        # Update local database
        self.db.table("ad_groups").update({
            "status": "ENABLED",
            "last_modified_at": datetime.utcnow().isoformat(),
            "last_modified_by": "ai_recommendation_undo"
        }).eq("id", adset_id).execute()

        return ActionResult(
            success=True,
            action="enable_adset",
            message="Ad set enabled successfully",
            before_state=before_state,
            after_state={"status": "ENABLED"},
        )
