"""
Meta Marketing API v21.0 Adapter

Implements the Meta Ads adapter for API version 21.0 (2024-2025).
"""

from typing import List, Dict, Any, Optional
from datetime import datetime

import httpx

from .base import MetaAdsBaseAdapter, MetaCampaign, MetaAdSet, MetaInsights, MetaMutateResult, MetaVerificationResult


class MetaAdsV21Adapter(MetaAdsBaseAdapter):
    """
    Meta Marketing API v21.0 implementation.

    Base URL: https://graph.facebook.com/v21.0/
    """

    API_VERSION = "v21.0"
    BASE_URL = f"https://graph.facebook.com/{API_VERSION}"

    # Default fields for each object type
    DEFAULT_CAMPAIGN_FIELDS = [
        "id",
        "name",
        "status",
        "objective",
        "daily_budget",
        "lifetime_budget",
        "created_time",
        "updated_time",
        "effective_status",
        "special_ad_categories",
    ]

    DEFAULT_ADSET_FIELDS = [
        "id",
        "campaign_id",
        "name",
        "status",
        "daily_budget",
        "lifetime_budget",
        "billing_event",
        "optimization_goal",
        "targeting",
        "created_time",
    ]

    DEFAULT_AD_FIELDS = [
        "id",
        "adset_id",
        "name",
        "status",
        "creative",
        "created_time",
    ]

    async def get_campaigns(
        self,
        account_id: str,
        access_token: str,
        fields: Optional[List[str]] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch campaigns for an ad account."""
        fields = fields or self.DEFAULT_CAMPAIGN_FIELDS

        params = {
            "access_token": access_token,
            "fields": ",".join(fields),
        }

        if status:
            params["filtering"] = f'[{{"field":"status","operator":"EQUAL","value":"{status}"}}]'

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/act_{account_id}/campaigns",
                params=params,
            )

            if response.status_code != 200:
                raise Exception(f"Failed to fetch campaigns: {response.text}")

            data = response.json()
            return data.get("data", [])

    async def get_campaign(
        self,
        campaign_id: str,
        access_token: str,
        fields: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Fetch a single campaign by ID."""
        fields = fields or self.DEFAULT_CAMPAIGN_FIELDS

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{campaign_id}",
                params={
                    "access_token": access_token,
                    "fields": ",".join(fields),
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to fetch campaign: {response.text}")

            return response.json()

    async def get_ad_sets(
        self,
        campaign_id: str,
        access_token: str,
        fields: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch ad sets for a campaign."""
        fields = fields or self.DEFAULT_ADSET_FIELDS

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{campaign_id}/adsets",
                params={
                    "access_token": access_token,
                    "fields": ",".join(fields),
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to fetch ad sets: {response.text}")

            data = response.json()
            return data.get("data", [])

    async def get_ads(
        self,
        ad_set_id: str,
        access_token: str,
        fields: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch ads for an ad set."""
        fields = fields or self.DEFAULT_AD_FIELDS

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{ad_set_id}/ads",
                params={
                    "access_token": access_token,
                    "fields": ",".join(fields),
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to fetch ads: {response.text}")

            data = response.json()
            return data.get("data", [])

    async def get_insights(
        self,
        object_id: str,
        access_token: str,
        date_preset: str = "last_30d",
        level: str = "campaign",
    ) -> Dict[str, Any]:
        """Fetch performance insights."""
        # Map our presets to Meta's presets
        preset_map = {
            "today": "today",
            "yesterday": "yesterday",
            "last_7d": "last_7d",
            "last_30d": "last_30d",
            "this_month": "this_month",
            "last_month": "last_month",
        }

        meta_preset = preset_map.get(date_preset, "last_30d")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{object_id}/insights",
                params={
                    "access_token": access_token,
                    "date_preset": meta_preset,
                    "level": level,
                    "fields": "spend,impressions,clicks,reach,actions,cost_per_action_type",
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to fetch insights: {response.text}")

            data = response.json()
            results = data.get("data", [])

            if not results:
                return {}

            return results[0]

    async def update_campaign_status(
        self,
        campaign_id: str,
        access_token: str,
        status: str,
    ) -> Dict[str, Any]:
        """Update campaign status."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/{campaign_id}",
                params={"access_token": access_token},
                data={"status": status},
            )

            if response.status_code != 200:
                raise Exception(f"Failed to update campaign status: {response.text}")

            return {"success": True, "campaign_id": campaign_id, "status": status}

    async def update_campaign_budget(
        self,
        campaign_id: str,
        access_token: str,
        daily_budget: Optional[int] = None,
        lifetime_budget: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Update campaign budget."""
        data = {}
        if daily_budget is not None:
            data["daily_budget"] = daily_budget
        if lifetime_budget is not None:
            data["lifetime_budget"] = lifetime_budget

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/{campaign_id}",
                params={"access_token": access_token},
                data=data,
            )

            if response.status_code != 200:
                raise Exception(f"Failed to update campaign budget: {response.text}")

            return {"success": True, "campaign_id": campaign_id, **data}

    # Helper methods to convert raw data to standardized objects

    def parse_campaign(self, data: Dict[str, Any]) -> MetaCampaign:
        """Convert raw API response to MetaCampaign object."""
        return MetaCampaign(
            id=data.get("id"),
            name=data.get("name"),
            status=data.get("effective_status") or data.get("status"),
            objective=data.get("objective"),
            daily_budget=data.get("daily_budget"),
            lifetime_budget=data.get("lifetime_budget"),
            created_time=data.get("created_time"),
            updated_time=data.get("updated_time"),
            raw_data=data,
        )

    def parse_ad_set(self, data: Dict[str, Any]) -> MetaAdSet:
        """Convert raw API response to MetaAdSet object."""
        return MetaAdSet(
            id=data.get("id"),
            campaign_id=data.get("campaign_id"),
            name=data.get("name"),
            status=data.get("status"),
            daily_budget=data.get("daily_budget"),
            lifetime_budget=data.get("lifetime_budget"),
            billing_event=data.get("billing_event", "IMPRESSIONS"),
            optimization_goal=data.get("optimization_goal", "REACH"),
            targeting=data.get("targeting"),
            created_time=data.get("created_time"),
            raw_data=data,
        )

    def parse_insights(self, data: Dict[str, Any]) -> MetaInsights:
        """Convert raw API response to MetaInsights object."""
        # Extract conversions from actions array
        conversions = 0
        actions = data.get("actions", [])
        for action in actions:
            if action.get("action_type") in ["purchase", "lead", "complete_registration"]:
                conversions += int(action.get("value", 0))

        return MetaInsights(
            date_start=data.get("date_start", ""),
            date_stop=data.get("date_stop", ""),
            spend=int(float(data.get("spend", 0)) * 100),  # Convert to cents
            impressions=int(data.get("impressions", 0)),
            clicks=int(data.get("clicks", 0)),
            reach=int(data.get("reach", 0)),
            conversions=conversions,
            raw_data=data,
        )

    # =========================================================================
    # ACTION METHODS (Phase 2: For recommendation execution)
    # =========================================================================

    async def _get_object_status(
        self,
        object_id: str,
        access_token: str,
    ) -> Optional[str]:
        """Get current status of any Meta object (campaign, adset, ad)."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/{object_id}",
                    params={
                        "access_token": access_token,
                        "fields": "status,effective_status",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("effective_status") or data.get("status")
        except Exception:
            pass
        return None

    async def _update_object_status(
        self,
        object_id: str,
        access_token: str,
        status: str,
        object_type: str,
    ) -> MetaMutateResult:
        """Generic method to update status of any Meta object."""
        try:
            # Get current status for rollback
            current_status = await self._get_object_status(object_id, access_token)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/{object_id}",
                    params={"access_token": access_token},
                    data={"status": status},
                )

                if response.status_code != 200:
                    error_data = response.json()
                    return MetaMutateResult(
                        success=False,
                        object_id=object_id,
                        object_type=object_type,
                        error_message=error_data.get("error", {}).get("message", response.text),
                        error_code=str(error_data.get("error", {}).get("code", response.status_code)),
                    )

                return MetaMutateResult(
                    success=True,
                    object_id=object_id,
                    object_type=object_type,
                    rollback_data={
                        "previous_status": current_status,
                        "object_id": object_id,
                        "object_type": object_type,
                    }
                )

        except Exception as e:
            return MetaMutateResult(
                success=False,
                object_id=object_id,
                object_type=object_type,
                error_message=str(e),
                error_code="exception",
            )

    async def pause_campaign(
        self,
        campaign_id: str,
        access_token: str,
    ) -> MetaMutateResult:
        """Pause a campaign."""
        return await self._update_object_status(
            object_id=campaign_id,
            access_token=access_token,
            status="PAUSED",
            object_type="campaign",
        )

    async def enable_campaign(
        self,
        campaign_id: str,
        access_token: str,
    ) -> MetaMutateResult:
        """Enable a paused campaign."""
        return await self._update_object_status(
            object_id=campaign_id,
            access_token=access_token,
            status="ACTIVE",
            object_type="campaign",
        )

    async def pause_ad_set(
        self,
        ad_set_id: str,
        access_token: str,
    ) -> MetaMutateResult:
        """Pause an ad set."""
        return await self._update_object_status(
            object_id=ad_set_id,
            access_token=access_token,
            status="PAUSED",
            object_type="adset",
        )

    async def enable_ad_set(
        self,
        ad_set_id: str,
        access_token: str,
    ) -> MetaMutateResult:
        """Enable a paused ad set."""
        return await self._update_object_status(
            object_id=ad_set_id,
            access_token=access_token,
            status="ACTIVE",
            object_type="adset",
        )

    async def pause_ad(
        self,
        ad_id: str,
        access_token: str,
    ) -> MetaMutateResult:
        """Pause an ad."""
        return await self._update_object_status(
            object_id=ad_id,
            access_token=access_token,
            status="PAUSED",
            object_type="ad",
        )

    async def enable_ad(
        self,
        ad_id: str,
        access_token: str,
    ) -> MetaMutateResult:
        """Enable a paused ad."""
        return await self._update_object_status(
            object_id=ad_id,
            access_token=access_token,
            status="ACTIVE",
            object_type="ad",
        )

    async def _get_object_budget(
        self,
        object_id: str,
        access_token: str,
    ) -> Dict[str, Optional[int]]:
        """Get current budget of a campaign or ad set."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/{object_id}",
                    params={
                        "access_token": access_token,
                        "fields": "daily_budget,lifetime_budget",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "daily_budget": data.get("daily_budget"),
                        "lifetime_budget": data.get("lifetime_budget"),
                    }
        except Exception:
            pass
        return {"daily_budget": None, "lifetime_budget": None}

    async def update_ad_set_budget(
        self,
        ad_set_id: str,
        access_token: str,
        daily_budget: Optional[int] = None,
        lifetime_budget: Optional[int] = None,
    ) -> MetaMutateResult:
        """Update ad set budget with rollback support."""
        try:
            # Get current budget for rollback
            current_budget = await self._get_object_budget(ad_set_id, access_token)

            data = {}
            if daily_budget is not None:
                data["daily_budget"] = daily_budget
            if lifetime_budget is not None:
                data["lifetime_budget"] = lifetime_budget

            if not data:
                return MetaMutateResult(
                    success=False,
                    object_id=ad_set_id,
                    object_type="adset",
                    error_message="No budget values provided",
                    error_code="invalid_params",
                )

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/{ad_set_id}",
                    params={"access_token": access_token},
                    data=data,
                )

                if response.status_code != 200:
                    error_data = response.json()
                    return MetaMutateResult(
                        success=False,
                        object_id=ad_set_id,
                        object_type="adset",
                        error_message=error_data.get("error", {}).get("message", response.text),
                        error_code=str(error_data.get("error", {}).get("code", response.status_code)),
                    )

                return MetaMutateResult(
                    success=True,
                    object_id=ad_set_id,
                    object_type="adset",
                    rollback_data={
                        "previous_daily_budget": current_budget.get("daily_budget"),
                        "previous_lifetime_budget": current_budget.get("lifetime_budget"),
                        "ad_set_id": ad_set_id,
                    }
                )

        except Exception as e:
            return MetaMutateResult(
                success=False,
                object_id=ad_set_id,
                object_type="adset",
                error_message=str(e),
                error_code="exception",
            )

    # =========================================================================
    # VERIFICATION METHODS (Phase 3: Post-execution verification)
    # =========================================================================

    async def verify_campaign_status(
        self,
        campaign_id: str,
        access_token: str,
        expected_status: str,
    ) -> MetaVerificationResult:
        """Verify a campaign has the expected status."""
        checked_at = datetime.now().isoformat()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/{campaign_id}",
                    params={
                        "access_token": access_token,
                        "fields": "status,effective_status",
                    },
                )

                if response.status_code != 200:
                    error_data = response.json()
                    return MetaVerificationResult(
                        verified=False,
                        expected_value=expected_status,
                        entity_type="campaign",
                        entity_id=campaign_id,
                        error_message=error_data.get("error", {}).get("message", response.text),
                        checked_at=checked_at,
                    )

                data = response.json()
                actual_status = data.get("effective_status") or data.get("status")

                # Meta uses ACTIVE vs Google's ENABLED
                normalized_expected = "ACTIVE" if expected_status == "ENABLED" else expected_status
                verified = actual_status == normalized_expected

                return MetaVerificationResult(
                    verified=verified,
                    expected_value=expected_status,
                    actual_value=actual_status,
                    entity_type="campaign",
                    entity_id=campaign_id,
                    checked_at=checked_at,
                )

        except Exception as e:
            return MetaVerificationResult(
                verified=False,
                expected_value=expected_status,
                entity_type="campaign",
                entity_id=campaign_id,
                error_message=str(e),
                checked_at=checked_at,
            )

    async def verify_ad_set_status(
        self,
        ad_set_id: str,
        access_token: str,
        expected_status: str,
    ) -> MetaVerificationResult:
        """Verify an ad set has the expected status."""
        checked_at = datetime.now().isoformat()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/{ad_set_id}",
                    params={
                        "access_token": access_token,
                        "fields": "status,effective_status",
                    },
                )

                if response.status_code != 200:
                    error_data = response.json()
                    return MetaVerificationResult(
                        verified=False,
                        expected_value=expected_status,
                        entity_type="adset",
                        entity_id=ad_set_id,
                        error_message=error_data.get("error", {}).get("message", response.text),
                        checked_at=checked_at,
                    )

                data = response.json()
                actual_status = data.get("effective_status") or data.get("status")

                normalized_expected = "ACTIVE" if expected_status == "ENABLED" else expected_status
                verified = actual_status == normalized_expected

                return MetaVerificationResult(
                    verified=verified,
                    expected_value=expected_status,
                    actual_value=actual_status,
                    entity_type="adset",
                    entity_id=ad_set_id,
                    checked_at=checked_at,
                )

        except Exception as e:
            return MetaVerificationResult(
                verified=False,
                expected_value=expected_status,
                entity_type="adset",
                entity_id=ad_set_id,
                error_message=str(e),
                checked_at=checked_at,
            )

    async def verify_ad_status(
        self,
        ad_id: str,
        access_token: str,
        expected_status: str,
    ) -> MetaVerificationResult:
        """Verify an ad has the expected status."""
        checked_at = datetime.now().isoformat()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/{ad_id}",
                    params={
                        "access_token": access_token,
                        "fields": "status,effective_status",
                    },
                )

                if response.status_code != 200:
                    error_data = response.json()
                    return MetaVerificationResult(
                        verified=False,
                        expected_value=expected_status,
                        entity_type="ad",
                        entity_id=ad_id,
                        error_message=error_data.get("error", {}).get("message", response.text),
                        checked_at=checked_at,
                    )

                data = response.json()
                actual_status = data.get("effective_status") or data.get("status")

                normalized_expected = "ACTIVE" if expected_status == "ENABLED" else expected_status
                verified = actual_status == normalized_expected

                return MetaVerificationResult(
                    verified=verified,
                    expected_value=expected_status,
                    actual_value=actual_status,
                    entity_type="ad",
                    entity_id=ad_id,
                    checked_at=checked_at,
                )

        except Exception as e:
            return MetaVerificationResult(
                verified=False,
                expected_value=expected_status,
                entity_type="ad",
                entity_id=ad_id,
                error_message=str(e),
                checked_at=checked_at,
            )

    async def verify_ad_set_budget(
        self,
        ad_set_id: str,
        access_token: str,
        expected_daily_budget: Optional[int] = None,
        expected_lifetime_budget: Optional[int] = None,
    ) -> MetaVerificationResult:
        """Verify an ad set has the expected budget."""
        checked_at = datetime.now().isoformat()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/{ad_set_id}",
                    params={
                        "access_token": access_token,
                        "fields": "daily_budget,lifetime_budget",
                    },
                )

                if response.status_code != 200:
                    error_data = response.json()
                    return MetaVerificationResult(
                        verified=False,
                        expected_value=str(expected_daily_budget or expected_lifetime_budget),
                        entity_type="adset_budget",
                        entity_id=ad_set_id,
                        error_message=error_data.get("error", {}).get("message", response.text),
                        checked_at=checked_at,
                    )

                data = response.json()
                verified = True
                actual_values = []

                if expected_daily_budget is not None:
                    actual_daily = int(data.get("daily_budget", 0))
                    # Allow 1% tolerance
                    tolerance = expected_daily_budget * 0.01
                    if abs(actual_daily - expected_daily_budget) > tolerance:
                        verified = False
                    actual_values.append(f"daily:{actual_daily}")

                if expected_lifetime_budget is not None:
                    actual_lifetime = int(data.get("lifetime_budget", 0))
                    tolerance = expected_lifetime_budget * 0.01
                    if abs(actual_lifetime - expected_lifetime_budget) > tolerance:
                        verified = False
                    actual_values.append(f"lifetime:{actual_lifetime}")

                expected_str = f"daily:{expected_daily_budget}" if expected_daily_budget else f"lifetime:{expected_lifetime_budget}"

                return MetaVerificationResult(
                    verified=verified,
                    expected_value=expected_str,
                    actual_value=",".join(actual_values),
                    entity_type="adset_budget",
                    entity_id=ad_set_id,
                    checked_at=checked_at,
                )

        except Exception as e:
            return MetaVerificationResult(
                verified=False,
                expected_value=str(expected_daily_budget or expected_lifetime_budget),
                entity_type="adset_budget",
                entity_id=ad_set_id,
                error_message=str(e),
                checked_at=checked_at,
            )
