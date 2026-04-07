"""
Verification Service - Verifies that recommendation actions were executed correctly.

Phase 3: Post-execution verification system.

This service:
1. Verifies actions executed correctly on ad platforms
2. Detects drift between database and platform state
3. Logs verification results for auditing
4. Triggers alerts for verification failures
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum

from ..supabase_client import get_supabase_client
from ...integrations.google_ads.adapters.v23_1 import GoogleAdsAdapterV23_1
from ...integrations.google_ads.adapters.base import VerificationResult
from ...integrations.meta_ads.adapters.v21 import MetaAdsV21Adapter
from ...integrations.meta_ads.adapters.base import MetaVerificationResult

logger = logging.getLogger(__name__)


class VerificationStatus(str, Enum):
    VERIFIED = "verified"
    FAILED = "failed"
    PENDING = "pending"
    SKIPPED = "skipped"
    ERROR = "error"


@dataclass
class ActionVerificationResult:
    """Result of verifying an action execution."""
    recommendation_id: str
    action_type: str
    entity_type: str
    entity_id: str
    status: VerificationStatus
    expected_value: str
    actual_value: Optional[str] = None
    error_message: Optional[str] = None
    verified_at: Optional[str] = None
    latency_ms: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class VerificationService:
    """
    Service for verifying action executions on ad platforms.

    Supports both Google Ads and Meta Ads verification.
    """

    def __init__(self, supabase_client=None):
        self.db = supabase_client or get_supabase_client()
        self._google_adapter_cache: Dict[str, GoogleAdsAdapterV23_1] = {}
        self._meta_adapter_cache: Dict[str, tuple[MetaAdsV21Adapter, str]] = {}

    async def _get_google_adapter(self, ad_account_id: str) -> Optional[GoogleAdsAdapterV23_1]:
        """Get authenticated Google Ads adapter for an account."""
        if ad_account_id in self._google_adapter_cache:
            return self._google_adapter_cache[ad_account_id]

        result = self.db.table("ad_accounts").select(
            "id, platform, platform_account_id, refresh_token"
        ).eq("id", ad_account_id).execute()

        if not result.data:
            return None

        account = result.data[0]
        if account.get("platform", "").lower() != "google":
            return None

        refresh_token = account.get("refresh_token")
        customer_id = account.get("platform_account_id")

        if not refresh_token or not customer_id:
            return None

        adapter = GoogleAdsAdapterV23_1(refresh_token, customer_id)
        self._google_adapter_cache[ad_account_id] = adapter
        return adapter

    async def _get_meta_adapter(self, ad_account_id: str) -> Optional[tuple[MetaAdsV21Adapter, str]]:
        """Get Meta Ads adapter and access token for an account."""
        if ad_account_id in self._meta_adapter_cache:
            return self._meta_adapter_cache[ad_account_id]

        result = self.db.table("ad_accounts").select(
            "id, platform, platform_account_id, access_token"
        ).eq("id", ad_account_id).execute()

        if not result.data:
            return None

        account = result.data[0]
        if account.get("platform", "").lower() not in ["meta", "facebook"]:
            return None

        access_token = account.get("access_token")
        if not access_token:
            return None

        adapter = MetaAdsV21Adapter()
        self._meta_adapter_cache[ad_account_id] = (adapter, access_token)
        return (adapter, access_token)

    async def verify_action(
        self,
        recommendation_id: str,
        action_type: str,
        entity_type: str,
        entity_id: str,
        platform_entity_id: str,
        ad_account_id: str,
        expected_state: Dict[str, Any],
    ) -> ActionVerificationResult:
        """
        Verify that an action was executed correctly on the platform.

        Args:
            recommendation_id: ID of the recommendation
            action_type: Type of action (pause_keyword, enable_campaign, etc.)
            entity_type: Type of entity (keyword, campaign, ad, adset)
            entity_id: Internal entity ID
            platform_entity_id: Platform-specific ID
            ad_account_id: Ad account ID
            expected_state: Expected state after action

        Returns:
            ActionVerificationResult with verification status
        """
        import time
        start_time = time.time()

        try:
            # Try Google Ads first
            google_adapter = await self._get_google_adapter(ad_account_id)
            if google_adapter:
                result = await self._verify_google_action(
                    google_adapter,
                    action_type,
                    entity_type,
                    platform_entity_id,
                    expected_state,
                )
            else:
                # Try Meta Ads
                meta_result = await self._get_meta_adapter(ad_account_id)
                if meta_result:
                    adapter, access_token = meta_result
                    result = await self._verify_meta_action(
                        adapter,
                        access_token,
                        action_type,
                        entity_type,
                        platform_entity_id,
                        expected_state,
                    )
                else:
                    # No adapter available - skip verification
                    return ActionVerificationResult(
                        recommendation_id=recommendation_id,
                        action_type=action_type,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        status=VerificationStatus.SKIPPED,
                        expected_value=str(expected_state),
                        error_message="No adapter available for account",
                        verified_at=datetime.utcnow().isoformat(),
                    )

            latency_ms = int((time.time() - start_time) * 1000)

            verification_result = ActionVerificationResult(
                recommendation_id=recommendation_id,
                action_type=action_type,
                entity_type=entity_type,
                entity_id=entity_id,
                status=VerificationStatus.VERIFIED if result.verified else VerificationStatus.FAILED,
                expected_value=result.expected_value,
                actual_value=result.actual_value,
                error_message=result.error_message,
                verified_at=datetime.utcnow().isoformat(),
                latency_ms=latency_ms,
            )

            # Log the verification result
            await self._log_verification(verification_result)

            return verification_result

        except Exception as e:
            logger.error(f"Verification error for {recommendation_id}: {e}")
            return ActionVerificationResult(
                recommendation_id=recommendation_id,
                action_type=action_type,
                entity_type=entity_type,
                entity_id=entity_id,
                status=VerificationStatus.ERROR,
                expected_value=str(expected_state),
                error_message=str(e),
                verified_at=datetime.utcnow().isoformat(),
            )

    async def _verify_google_action(
        self,
        adapter: GoogleAdsAdapterV23_1,
        action_type: str,
        entity_type: str,
        platform_entity_id: str,
        expected_state: Dict[str, Any],
    ) -> VerificationResult:
        """Verify action on Google Ads."""
        if entity_type == "keyword":
            if "status" in expected_state:
                return await adapter.verify_keyword_status(
                    keyword_id=platform_entity_id,
                    expected_status=expected_state["status"],
                )
            elif "bid_micros" in expected_state:
                ad_group_id = expected_state.get("ad_group_id", "")
                return await adapter.verify_keyword_bid(
                    keyword_id=platform_entity_id,
                    ad_group_id=ad_group_id,
                    expected_bid_micros=expected_state["bid_micros"],
                )

        elif entity_type == "campaign":
            if "status" in expected_state:
                return await adapter.verify_campaign_status(
                    campaign_id=platform_entity_id,
                    expected_status=expected_state["status"],
                )
            elif "budget_micros" in expected_state:
                return await adapter.verify_campaign_budget(
                    campaign_id=platform_entity_id,
                    expected_budget_micros=expected_state["budget_micros"],
                )

        # Default - return unverified
        return VerificationResult(
            verified=False,
            expected_value=str(expected_state),
            error_message=f"Unsupported verification: {entity_type}/{action_type}",
        )

    async def _verify_meta_action(
        self,
        adapter: MetaAdsV21Adapter,
        access_token: str,
        action_type: str,
        entity_type: str,
        platform_entity_id: str,
        expected_state: Dict[str, Any],
    ) -> MetaVerificationResult:
        """Verify action on Meta Ads."""
        if entity_type == "campaign":
            if "status" in expected_state:
                return await adapter.verify_campaign_status(
                    campaign_id=platform_entity_id,
                    access_token=access_token,
                    expected_status=expected_state["status"],
                )

        elif entity_type in ["adset", "ad_group"]:
            if "status" in expected_state:
                return await adapter.verify_ad_set_status(
                    ad_set_id=platform_entity_id,
                    access_token=access_token,
                    expected_status=expected_state["status"],
                )
            elif "daily_budget" in expected_state or "lifetime_budget" in expected_state:
                return await adapter.verify_ad_set_budget(
                    ad_set_id=platform_entity_id,
                    access_token=access_token,
                    expected_daily_budget=expected_state.get("daily_budget"),
                    expected_lifetime_budget=expected_state.get("lifetime_budget"),
                )

        elif entity_type == "ad":
            if "status" in expected_state:
                return await adapter.verify_ad_status(
                    ad_id=platform_entity_id,
                    access_token=access_token,
                    expected_status=expected_state["status"],
                )

        # Default - return unverified
        return MetaVerificationResult(
            verified=False,
            expected_value=str(expected_state),
            error_message=f"Unsupported verification: {entity_type}/{action_type}",
        )

    async def _log_verification(self, result: ActionVerificationResult) -> None:
        """Log verification result to database."""
        try:
            self.db.table("action_execution_log").update({
                "verification_status": result.status.value,
                "verification_result": result.to_dict(),
                "verified_at": result.verified_at,
            }).eq("recommendation_id", result.recommendation_id).execute()
        except Exception as e:
            logger.error(f"Failed to log verification: {e}")

    async def verify_recommendation(
        self,
        recommendation_id: str,
    ) -> ActionVerificationResult:
        """
        Verify a recommendation's action was executed correctly.

        Fetches recommendation details and verifies against platform.
        """
        # Get recommendation with action details
        result = self.db.table("recommendations").select(
            "id, action_type, entity_type, keyword_id, campaign_id, ad_account_id, after_state"
        ).eq("id", recommendation_id).execute()

        if not result.data:
            return ActionVerificationResult(
                recommendation_id=recommendation_id,
                action_type="unknown",
                entity_type="unknown",
                entity_id="unknown",
                status=VerificationStatus.ERROR,
                expected_value="",
                error_message="Recommendation not found",
            )

        rec = result.data[0]
        entity_id = rec.get("keyword_id") or rec.get("campaign_id") or ""
        entity_type = rec.get("entity_type", "")
        after_state = rec.get("after_state") or {}

        if isinstance(after_state, str):
            import json
            after_state = json.loads(after_state)

        # Get platform entity ID
        platform_entity_id = await self._get_platform_entity_id(entity_type, entity_id)

        return await self.verify_action(
            recommendation_id=recommendation_id,
            action_type=rec.get("action_type", ""),
            entity_type=entity_type,
            entity_id=entity_id,
            platform_entity_id=platform_entity_id,
            ad_account_id=rec.get("ad_account_id", ""),
            expected_state=after_state,
        )

    async def _get_platform_entity_id(self, entity_type: str, entity_id: str) -> str:
        """Get the platform-specific ID for an entity."""
        table_map = {
            "keyword": "keywords",
            "campaign": "campaigns",
            "ad_group": "ad_groups",
            "adset": "ad_groups",
            "ad": "ads",
        }

        field_map = {
            "keyword": "platform_keyword_id",
            "campaign": "platform_campaign_id",
            "ad_group": "platform_ad_group_id",
            "adset": "platform_ad_group_id",
            "ad": "platform_ad_id",
        }

        table = table_map.get(entity_type)
        field = field_map.get(entity_type)

        if not table or not field:
            return entity_id

        try:
            result = self.db.table(table).select(field).eq("id", entity_id).execute()
            if result.data:
                return result.data[0].get(field) or entity_id
        except Exception:
            pass

        return entity_id

    async def batch_verify(
        self,
        recommendation_ids: List[str],
    ) -> List[ActionVerificationResult]:
        """Verify multiple recommendations."""
        results = []
        for rec_id in recommendation_ids:
            result = await self.verify_recommendation(rec_id)
            results.append(result)
        return results

    async def get_verification_stats(
        self,
        organization_id: str,
        hours: int = 24,
    ) -> Dict[str, Any]:
        """Get verification statistics for an organization."""
        from datetime import timedelta

        cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()

        try:
            result = self.db.table("action_execution_log").select(
                "verification_status"
            ).eq("organization_id", organization_id).gte("executed_at", cutoff).execute()

            stats = {
                "total": len(result.data),
                "verified": 0,
                "failed": 0,
                "pending": 0,
                "skipped": 0,
                "error": 0,
            }

            for row in result.data:
                status = row.get("verification_status", "pending")
                if status in stats:
                    stats[status] += 1
                else:
                    stats["pending"] += 1

            if stats["total"] > 0:
                stats["success_rate"] = round(stats["verified"] / stats["total"] * 100, 1)
            else:
                stats["success_rate"] = 0

            return stats

        except Exception as e:
            logger.error(f"Failed to get verification stats: {e}")
            return {"error": str(e)}
