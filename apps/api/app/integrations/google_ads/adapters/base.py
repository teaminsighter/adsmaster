"""
Google Ads API Adapter Base Interface

This is the most important abstraction in the codebase.
All Google Ads API calls go through adapters that implement this interface.
When Google releases a new API version, only the adapter changes - not your services.

Pattern: Adapter Pattern for API Version Isolation
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from enum import Enum
from typing import Optional


class CampaignStatus(str, Enum):
    ENABLED = "ENABLED"
    PAUSED = "PAUSED"
    REMOVED = "REMOVED"


class CampaignType(str, Enum):
    SEARCH = "SEARCH"
    DISPLAY = "DISPLAY"
    SHOPPING = "SHOPPING"
    VIDEO = "VIDEO"
    PERFORMANCE_MAX = "PERFORMANCE_MAX"
    DEMAND_GEN = "DEMAND_GEN"


class NetworkType(str, Enum):
    SEARCH = "SEARCH"
    YOUTUBE = "YOUTUBE"
    DISPLAY = "DISPLAY"
    DISCOVERY = "DISCOVERY"
    GMAIL = "GMAIL"


@dataclass
class CampaignData:
    """Normalized campaign data returned by all adapter versions."""
    id: str
    name: str
    status: CampaignStatus
    campaign_type: CampaignType
    budget_micros: int
    currency_code: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None


@dataclass
class CampaignMetrics:
    """Campaign performance metrics."""
    campaign_id: str
    date: date
    impressions: int
    clicks: int
    cost_micros: int
    conversions: float
    conversion_value_micros: int
    ctr: float
    avg_cpc_micros: int
    avg_cpa_micros: Optional[int] = None
    roas: Optional[float] = None


@dataclass
class NetworkBreakdown:
    """PMax network breakdown (v23+ feature)."""
    campaign_id: str
    network_type: NetworkType
    impressions: int
    clicks: int
    cost_micros: int
    conversions: float


@dataclass
class KeywordData:
    """Keyword data."""
    id: str
    ad_group_id: str
    text: str
    match_type: str  # EXACT, PHRASE, BROAD
    status: str
    quality_score: Optional[int] = None
    cpc_bid_micros: Optional[int] = None


@dataclass
class KeywordMetrics:
    """Keyword performance metrics."""
    keyword_id: str
    date: date
    impressions: int
    clicks: int
    cost_micros: int
    conversions: float
    avg_cpc_micros: int
    quality_score: Optional[int] = None


@dataclass
class AudienceDefinition:
    """NLP-generated audience definition (v23+ feature)."""
    description: str
    segments: list[dict]
    estimated_reach: Optional[int] = None


@dataclass
class BenchmarkData:
    """Industry benchmark comparison (v23+ feature)."""
    campaign_id: str
    metric_name: str  # avg_cpc, avg_cpa, ctr
    your_value: float
    benchmark_value: float
    percentile: int  # 0-100


@dataclass
class MutateResult:
    """Result of a mutation operation."""
    success: bool
    resource_name: Optional[str] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    rollback_data: Optional[dict] = None  # Data needed to undo this action


class GoogleAdsAdapterBase(ABC):
    """
    Abstract base class for Google Ads API adapters.

    Every adapter version (v23, v23.1, v24, etc.) must implement all methods.
    Services call the adapter, never the SDK directly.

    When Google releases a new API version:
    1. Create new adapter file (e.g., v24.py)
    2. Implement all abstract methods
    3. Run existing test suite against new adapter
    4. Deploy behind feature flag
    5. Gradual rollout
    """

    def __init__(self, refresh_token: str, customer_id: str):
        self.refresh_token = refresh_token
        self.customer_id = customer_id

    # =========================================================================
    # CAMPAIGN OPERATIONS
    # =========================================================================

    @abstractmethod
    async def get_campaigns(
        self,
        include_metrics: bool = False,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[CampaignData]:
        """Fetch all campaigns for the customer."""
        pass

    @abstractmethod
    async def get_campaign_metrics(
        self,
        campaign_id: str,
        date_from: date,
        date_to: date,
    ) -> list[CampaignMetrics]:
        """Fetch daily metrics for a campaign."""
        pass

    @abstractmethod
    async def pause_campaign(self, campaign_id: str) -> MutateResult:
        """Pause a campaign."""
        pass

    @abstractmethod
    async def enable_campaign(self, campaign_id: str) -> MutateResult:
        """Enable a paused campaign."""
        pass

    @abstractmethod
    async def update_campaign_budget(
        self,
        campaign_id: str,
        new_budget_micros: int,
    ) -> MutateResult:
        """Update campaign daily budget."""
        pass

    # =========================================================================
    # PMAX NETWORK BREAKDOWN (v23+ FEATURE)
    # =========================================================================

    @abstractmethod
    async def get_pmax_network_breakdown(
        self,
        campaign_id: str,
        date_from: date,
        date_to: date,
    ) -> list[NetworkBreakdown]:
        """
        Get Performance Max network breakdown.
        Shows spend split across Search, YouTube, Display, Discovery.
        Available in API v23+.
        """
        pass

    # =========================================================================
    # KEYWORD OPERATIONS
    # =========================================================================

    @abstractmethod
    async def get_keywords(
        self,
        ad_group_id: Optional[str] = None,
    ) -> list[KeywordData]:
        """Fetch keywords, optionally filtered by ad group."""
        pass

    @abstractmethod
    async def get_keyword_metrics(
        self,
        keyword_ids: list[str],
        date_from: date,
        date_to: date,
    ) -> list[KeywordMetrics]:
        """Fetch metrics for specified keywords."""
        pass

    @abstractmethod
    async def pause_keywords(self, keyword_ids: list[str]) -> MutateResult:
        """Pause multiple keywords."""
        pass

    @abstractmethod
    async def enable_keywords(self, keyword_ids: list[str]) -> MutateResult:
        """Enable multiple keywords."""
        pass

    @abstractmethod
    async def update_keyword_bid(
        self,
        keyword_id: str,
        ad_group_id: str,
        new_bid_micros: int,
    ) -> MutateResult:
        """Update a keyword's CPC bid."""
        pass

    @abstractmethod
    async def add_negative_keyword(
        self,
        campaign_id: str,
        keyword_text: str,
        match_type: str = "EXACT",
    ) -> MutateResult:
        """Add a negative keyword to a campaign."""
        pass

    # =========================================================================
    # AI-POWERED FEATURES (v23+ FEATURES)
    # =========================================================================

    @abstractmethod
    async def generate_audience_from_text(
        self,
        description: str,
    ) -> AudienceDefinition:
        """
        Generate audience definition from natural language.
        Uses GenerateAudienceDefinition API (v23+).
        Example: "women aged 30-45 interested in yoga"
        """
        pass

    @abstractmethod
    async def get_benchmark_metrics(
        self,
        campaign_ids: list[str],
    ) -> list[BenchmarkData]:
        """
        Get industry benchmark comparisons.
        Uses BenchmarksService (v23+).
        """
        pass

    # =========================================================================
    # SEARCH TERMS
    # =========================================================================

    @abstractmethod
    async def get_search_terms(
        self,
        campaign_id: str,
        date_from: date,
        date_to: date,
    ) -> list[dict]:
        """Fetch search terms report for a campaign."""
        pass

    # =========================================================================
    # AUCTION INSIGHTS (COMPETITOR DATA)
    # =========================================================================

    @abstractmethod
    async def get_auction_insights(
        self,
        campaign_id: str,
        date_from: date,
        date_to: date,
    ) -> list[dict]:
        """Get auction insights showing competitor impression share."""
        pass

    # =========================================================================
    # VERIFICATION METHODS (Phase 3: Post-execution verification)
    # =========================================================================

    @abstractmethod
    async def verify_keyword_status(
        self,
        keyword_id: str,
        expected_status: str,
    ) -> 'VerificationResult':
        """Verify a keyword has the expected status."""
        pass

    @abstractmethod
    async def verify_campaign_status(
        self,
        campaign_id: str,
        expected_status: str,
    ) -> 'VerificationResult':
        """Verify a campaign has the expected status."""
        pass

    @abstractmethod
    async def verify_campaign_budget(
        self,
        campaign_id: str,
        expected_budget_micros: int,
    ) -> 'VerificationResult':
        """Verify a campaign has the expected budget."""
        pass

    @abstractmethod
    async def verify_keyword_bid(
        self,
        keyword_id: str,
        ad_group_id: str,
        expected_bid_micros: int,
    ) -> 'VerificationResult':
        """Verify a keyword has the expected bid."""
        pass


@dataclass
class VerificationResult:
    """Result of a verification check."""
    verified: bool
    expected_value: str
    actual_value: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    error_message: Optional[str] = None
    checked_at: Optional[str] = None
