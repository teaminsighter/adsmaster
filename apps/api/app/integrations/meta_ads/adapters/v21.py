"""
Meta Marketing API v21.0 Adapter

Implements the Meta Ads adapter for API version 21.0 (2024-2025).
"""

from typing import List, Dict, Any, Optional
from datetime import datetime

import httpx

from .base import MetaAdsBaseAdapter, MetaCampaign, MetaAdSet, MetaInsights


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
