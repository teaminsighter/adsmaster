"""
Base adapter for Meta Marketing API.

Abstracts the Meta API to allow for version changes and testing.

Pattern mirrors Google Ads adapter for consistency.
Phase 2: Meta Ads action execution infrastructure.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from datetime import date


@dataclass
class MetaMutateResult:
    """Result of a mutation operation on Meta Ads."""
    success: bool
    object_id: Optional[str] = None
    object_type: Optional[str] = None  # campaign, adset, ad
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    rollback_data: Optional[dict] = None  # Data needed to undo this action


class MetaAdsBaseAdapter(ABC):
    """
    Abstract base class for Meta Ads API adapters.

    Provides a consistent interface that isolates business logic from
    the underlying Meta Marketing API version.
    """

    @abstractmethod
    async def get_campaigns(
        self,
        account_id: str,
        access_token: str,
        fields: Optional[List[str]] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch campaigns for an ad account."""
        pass

    @abstractmethod
    async def get_campaign(
        self,
        campaign_id: str,
        access_token: str,
        fields: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Fetch a single campaign by ID."""
        pass

    @abstractmethod
    async def get_ad_sets(
        self,
        campaign_id: str,
        access_token: str,
        fields: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch ad sets for a campaign."""
        pass

    @abstractmethod
    async def get_ads(
        self,
        ad_set_id: str,
        access_token: str,
        fields: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch ads for an ad set."""
        pass

    @abstractmethod
    async def get_insights(
        self,
        object_id: str,
        access_token: str,
        date_preset: str = "last_30d",
        level: str = "campaign",
    ) -> Dict[str, Any]:
        """Fetch performance insights."""
        pass

    @abstractmethod
    async def update_campaign_status(
        self,
        campaign_id: str,
        access_token: str,
        status: str,  # ACTIVE, PAUSED
    ) -> Dict[str, Any]:
        """Update campaign status."""
        pass

    @abstractmethod
    async def update_campaign_budget(
        self,
        campaign_id: str,
        access_token: str,
        daily_budget: Optional[int] = None,
        lifetime_budget: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Update campaign budget."""
        pass

    # =========================================================================
    # ACTION METHODS (Phase 2: For recommendation execution)
    # =========================================================================

    @abstractmethod
    async def pause_campaign(
        self,
        campaign_id: str,
        access_token: str,
    ) -> MetaMutateResult:
        """Pause a campaign. Returns result with rollback data."""
        pass

    @abstractmethod
    async def enable_campaign(
        self,
        campaign_id: str,
        access_token: str,
    ) -> MetaMutateResult:
        """Enable a paused campaign. Returns result with rollback data."""
        pass

    @abstractmethod
    async def pause_ad_set(
        self,
        ad_set_id: str,
        access_token: str,
    ) -> MetaMutateResult:
        """Pause an ad set. Returns result with rollback data."""
        pass

    @abstractmethod
    async def enable_ad_set(
        self,
        ad_set_id: str,
        access_token: str,
    ) -> MetaMutateResult:
        """Enable a paused ad set. Returns result with rollback data."""
        pass

    @abstractmethod
    async def pause_ad(
        self,
        ad_id: str,
        access_token: str,
    ) -> MetaMutateResult:
        """Pause an ad. Returns result with rollback data."""
        pass

    @abstractmethod
    async def enable_ad(
        self,
        ad_id: str,
        access_token: str,
    ) -> MetaMutateResult:
        """Enable a paused ad. Returns result with rollback data."""
        pass

    @abstractmethod
    async def update_ad_set_budget(
        self,
        ad_set_id: str,
        access_token: str,
        daily_budget: Optional[int] = None,
        lifetime_budget: Optional[int] = None,
    ) -> MetaMutateResult:
        """Update ad set budget. Returns result with rollback data."""
        pass


class MetaCampaign:
    """Standardized campaign object across API versions."""

    def __init__(
        self,
        id: str,
        name: str,
        status: str,
        objective: str,
        daily_budget: Optional[int] = None,
        lifetime_budget: Optional[int] = None,
        created_time: Optional[str] = None,
        updated_time: Optional[str] = None,
        raw_data: Optional[Dict[str, Any]] = None,
    ):
        self.id = id
        self.name = name
        self.status = status
        self.objective = objective
        self.daily_budget = daily_budget
        self.lifetime_budget = lifetime_budget
        self.created_time = created_time
        self.updated_time = updated_time
        self.raw_data = raw_data or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "objective": self.objective,
            "daily_budget": self.daily_budget,
            "lifetime_budget": self.lifetime_budget,
            "created_time": self.created_time,
            "updated_time": self.updated_time,
        }


class MetaAdSet:
    """Standardized ad set object."""

    def __init__(
        self,
        id: str,
        campaign_id: str,
        name: str,
        status: str,
        daily_budget: Optional[int] = None,
        lifetime_budget: Optional[int] = None,
        billing_event: str = "IMPRESSIONS",
        optimization_goal: str = "REACH",
        targeting: Optional[Dict[str, Any]] = None,
        created_time: Optional[str] = None,
        raw_data: Optional[Dict[str, Any]] = None,
    ):
        self.id = id
        self.campaign_id = campaign_id
        self.name = name
        self.status = status
        self.daily_budget = daily_budget
        self.lifetime_budget = lifetime_budget
        self.billing_event = billing_event
        self.optimization_goal = optimization_goal
        self.targeting = targeting or {}
        self.created_time = created_time
        self.raw_data = raw_data or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "campaign_id": self.campaign_id,
            "name": self.name,
            "status": self.status,
            "daily_budget": self.daily_budget,
            "lifetime_budget": self.lifetime_budget,
            "billing_event": self.billing_event,
            "optimization_goal": self.optimization_goal,
            "created_time": self.created_time,
        }


class MetaInsights:
    """Standardized insights object."""

    def __init__(
        self,
        date_start: str,
        date_stop: str,
        spend: int,
        impressions: int,
        clicks: int,
        reach: int,
        conversions: int = 0,
        raw_data: Optional[Dict[str, Any]] = None,
    ):
        self.date_start = date_start
        self.date_stop = date_stop
        self.spend = spend
        self.impressions = impressions
        self.clicks = clicks
        self.reach = reach
        self.conversions = conversions
        self.raw_data = raw_data or {}

    @property
    def ctr(self) -> float:
        return round((self.clicks / self.impressions * 100) if self.impressions > 0 else 0, 2)

    @property
    def cpc(self) -> int:
        return round(self.spend / self.clicks) if self.clicks > 0 else 0

    @property
    def cpm(self) -> int:
        return round(self.spend / self.impressions * 1000) if self.impressions > 0 else 0

    @property
    def cost_per_conversion(self) -> Optional[int]:
        return round(self.spend / self.conversions) if self.conversions > 0 else None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "date_start": self.date_start,
            "date_stop": self.date_stop,
            "spend": self.spend,
            "impressions": self.impressions,
            "clicks": self.clicks,
            "reach": self.reach,
            "conversions": self.conversions,
            "ctr": self.ctr,
            "cpc": self.cpc,
            "cpm": self.cpm,
            "cost_per_conversion": self.cost_per_conversion,
        }
