"""
Meta Ads Data Service

Fetches campaign, ad set, and ad performance data from Meta Marketing API
and syncs to local database.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
import httpx

from ..core.config import Settings, get_settings


class MetaAdsService:
    """
    Service for fetching Meta Ads data via Graph API.
    """

    GRAPH_API_VERSION = "v21.0"
    BASE_URL = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

    # Standard metrics to fetch
    CAMPAIGN_FIELDS = [
        "id", "name", "status", "objective", "daily_budget", "lifetime_budget",
        "created_time", "updated_time", "start_time", "stop_time",
    ]

    ADSET_FIELDS = [
        "id", "campaign_id", "name", "status", "daily_budget", "lifetime_budget",
        "billing_event", "optimization_goal", "targeting", "created_time",
    ]

    AD_FIELDS = [
        "id", "adset_id", "name", "status", "creative", "created_time",
        "preview_shareable_link",
    ]

    INSIGHTS_FIELDS = [
        "spend", "impressions", "clicks", "reach", "frequency",
        "ctr", "cpc", "cpm", "conversions", "cost_per_conversion",
        "actions", "action_values",
    ]

    def __init__(self, access_token: str):
        self.access_token = access_token

    async def get_campaigns(self, ad_account_id: str) -> List[Dict]:
        """
        Fetch all campaigns for an ad account.

        Args:
            ad_account_id: Meta ad account ID (without 'act_' prefix)

        Returns:
            List of campaign dictionaries
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/act_{ad_account_id}/campaigns",
                params={
                    "access_token": self.access_token,
                    "fields": ",".join(self.CAMPAIGN_FIELDS),
                    "limit": 500,
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to fetch campaigns: {response.text}")

            data = response.json()
            return data.get("data", [])

    async def get_adsets(self, campaign_id: str) -> List[Dict]:
        """
        Fetch all ad sets for a campaign.

        Args:
            campaign_id: Meta campaign ID

        Returns:
            List of ad set dictionaries
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{campaign_id}/adsets",
                params={
                    "access_token": self.access_token,
                    "fields": ",".join(self.ADSET_FIELDS),
                    "limit": 500,
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to fetch ad sets: {response.text}")

            data = response.json()
            return data.get("data", [])

    async def get_ads(self, adset_id: str) -> List[Dict]:
        """
        Fetch all ads for an ad set.

        Args:
            adset_id: Meta ad set ID

        Returns:
            List of ad dictionaries
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{adset_id}/ads",
                params={
                    "access_token": self.access_token,
                    "fields": ",".join(self.AD_FIELDS),
                    "limit": 500,
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to fetch ads: {response.text}")

            data = response.json()
            return data.get("data", [])

    async def get_campaign_insights(
        self,
        campaign_id: str,
        date_preset: str = "last_30d",
        time_increment: int = 1,  # Daily breakdown
    ) -> List[Dict]:
        """
        Fetch performance insights for a campaign.

        Args:
            campaign_id: Meta campaign ID
            date_preset: Date range (today, yesterday, last_7d, last_30d, etc.)
            time_increment: 1 for daily, 7 for weekly, 28 for monthly

        Returns:
            List of daily insight dictionaries
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{campaign_id}/insights",
                params={
                    "access_token": self.access_token,
                    "fields": ",".join(self.INSIGHTS_FIELDS),
                    "date_preset": date_preset,
                    "time_increment": time_increment,
                    "level": "campaign",
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to fetch insights: {response.text}")

            data = response.json()
            return data.get("data", [])

    async def get_adset_insights(
        self,
        adset_id: str,
        date_preset: str = "last_30d",
    ) -> List[Dict]:
        """
        Fetch performance insights for an ad set.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{adset_id}/insights",
                params={
                    "access_token": self.access_token,
                    "fields": ",".join(self.INSIGHTS_FIELDS),
                    "date_preset": date_preset,
                    "time_increment": 1,
                    "level": "adset",
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to fetch ad set insights: {response.text}")

            data = response.json()
            return data.get("data", [])

    async def get_ad_insights(
        self,
        ad_id: str,
        date_preset: str = "last_30d",
    ) -> List[Dict]:
        """
        Fetch performance insights for an ad.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{ad_id}/insights",
                params={
                    "access_token": self.access_token,
                    "fields": ",".join(self.INSIGHTS_FIELDS),
                    "date_preset": date_preset,
                    "time_increment": 1,
                    "level": "ad",
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to fetch ad insights: {response.text}")

            data = response.json()
            return data.get("data", [])

    async def get_account_insights(
        self,
        ad_account_id: str,
        date_preset: str = "last_30d",
    ) -> List[Dict]:
        """
        Fetch account-level performance insights.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/act_{ad_account_id}/insights",
                params={
                    "access_token": self.access_token,
                    "fields": ",".join(self.INSIGHTS_FIELDS),
                    "date_preset": date_preset,
                    "time_increment": 1,
                    "level": "account",
                },
            )

            if response.status_code != 200:
                raise Exception(f"Failed to fetch account insights: {response.text}")

            data = response.json()
            return data.get("data", [])

    @staticmethod
    def parse_insights_to_metrics(insights: List[Dict]) -> List[Dict]:
        """
        Convert Meta insights response to our metrics_daily format.

        Args:
            insights: Raw insights from Meta API

        Returns:
            List of metrics ready for database insertion
        """
        metrics = []

        for day in insights:
            # Parse spend (Meta returns as string in account currency)
            spend_str = day.get("spend", "0")
            spend_cents = int(float(spend_str) * 100)  # Convert to cents
            spend_micros = spend_cents * 10000  # Convert to micros

            # Parse conversions from actions array
            conversions = 0
            actions = day.get("actions", [])
            for action in actions:
                if action.get("action_type") in ["purchase", "lead", "complete_registration"]:
                    conversions += int(action.get("value", 0))

            # Parse conversion value
            conversion_value = 0
            action_values = day.get("action_values", [])
            for av in action_values:
                if av.get("action_type") == "purchase":
                    conversion_value += float(av.get("value", 0))

            metrics.append({
                "metric_date": day.get("date_start"),
                "impressions": int(day.get("impressions", 0)),
                "clicks": int(day.get("clicks", 0)),
                "cost_micros": spend_micros,
                "conversions": conversions,
                "conversion_value_micros": int(conversion_value * 1000000),
                "reach": int(day.get("reach", 0)),
            })

        return metrics
