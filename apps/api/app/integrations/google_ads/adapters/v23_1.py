"""
Google Ads API v23.1 Adapter Implementation

This adapter wraps the Google Ads Python SDK v25+ (API v18+).
All SDK-specific code is contained here.

Note: google-ads SDK version 25.0.0 maps to Google Ads API v18
The "v23.1" in our adapter name refers to our internal versioning.
"""

import os
from datetime import date
from typing import Optional, List

from .base import (
    GoogleAdsAdapterBase,
    CampaignData,
    CampaignMetrics,
    CampaignStatus,
    CampaignType,
    NetworkBreakdown,
    NetworkType,
    KeywordData,
    KeywordMetrics,
    AudienceDefinition,
    BenchmarkData,
    MutateResult,
)


class GoogleAdsAdapterV23_1(GoogleAdsAdapterBase):
    """
    Google Ads API adapter using google-ads SDK v25+.

    To use:
        adapter = GoogleAdsAdapterV23_1(refresh_token, customer_id)
        campaigns = await adapter.get_campaigns()

    Required environment variables:
        GOOGLE_ADS_DEVELOPER_TOKEN
        GOOGLE_ADS_CLIENT_ID
        GOOGLE_ADS_CLIENT_SECRET
    """

    API_VERSION = "v18"  # SDK v25 uses API v18

    def __init__(self, refresh_token: str, customer_id: str):
        super().__init__(refresh_token, customer_id)
        self._client = None
        self._ga_service = None

    def _get_client(self):
        """
        Lazy load Google Ads client.

        Uses OAuth2 refresh token flow with credentials from environment.
        """
        if self._client is not None:
            return self._client

        try:
            from google.ads.googleads.client import GoogleAdsClient

            # Get credentials from environment
            developer_token = os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN")
            client_id = os.getenv("GOOGLE_ADS_CLIENT_ID")
            client_secret = os.getenv("GOOGLE_ADS_CLIENT_SECRET")

            if not all([developer_token, client_id, client_secret]):
                raise ValueError(
                    "Missing Google Ads credentials. Set GOOGLE_ADS_DEVELOPER_TOKEN, "
                    "GOOGLE_ADS_CLIENT_ID, and GOOGLE_ADS_CLIENT_SECRET environment variables."
                )

            # Build client configuration
            config = {
                "developer_token": developer_token,
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": self.refresh_token,
                "use_proto_plus": True,  # Use proto-plus message types
            }

            self._client = GoogleAdsClient.load_from_dict(config)
            return self._client

        except ImportError:
            raise ImportError(
                "google-ads package not installed. Run: pip install google-ads"
            )

    def _get_ga_service(self):
        """Get the GoogleAdsService for running queries."""
        if self._ga_service is None:
            client = self._get_client()
            self._ga_service = client.get_service("GoogleAdsService")
        return self._ga_service

    def _format_customer_id(self, customer_id: str) -> str:
        """Format customer ID by removing hyphens."""
        return customer_id.replace("-", "")

    # =========================================================================
    # CAMPAIGN OPERATIONS
    # =========================================================================

    async def get_campaigns(
        self,
        include_metrics: bool = False,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[CampaignData]:
        """Fetch all campaigns for the customer."""
        try:
            client = self._get_client()
            ga_service = client.get_service("GoogleAdsService")

            # Build GAQL query
            query = """
                SELECT
                    campaign.id,
                    campaign.name,
                    campaign.status,
                    campaign.advertising_channel_type,
                    campaign_budget.amount_micros,
                    campaign.start_date,
                    campaign.end_date
                FROM campaign
                WHERE campaign.status != 'REMOVED'
                ORDER BY campaign.name
            """

            customer_id = self._format_customer_id(self.customer_id)

            # Execute query
            response = ga_service.search(customer_id=customer_id, query=query)

            campaigns = []
            for row in response:
                campaign = row.campaign
                budget = row.campaign_budget

                # Map status
                status_map = {
                    2: CampaignStatus.ENABLED,  # ENABLED
                    3: CampaignStatus.PAUSED,   # PAUSED
                    4: CampaignStatus.REMOVED,  # REMOVED
                }
                status = status_map.get(campaign.status, CampaignStatus.PAUSED)

                # Map campaign type
                type_map = {
                    2: CampaignType.SEARCH,          # SEARCH
                    3: CampaignType.DISPLAY,         # DISPLAY
                    4: CampaignType.SHOPPING,        # SHOPPING
                    6: CampaignType.VIDEO,           # VIDEO
                    10: CampaignType.PERFORMANCE_MAX, # PERFORMANCE_MAX
                    11: CampaignType.DEMAND_GEN,      # DEMAND_GEN
                }
                campaign_type = type_map.get(
                    campaign.advertising_channel_type, CampaignType.SEARCH
                )

                # Parse dates
                start_date = None
                end_date = None
                if campaign.start_date:
                    start_date = date.fromisoformat(campaign.start_date)
                if campaign.end_date:
                    end_date = date.fromisoformat(campaign.end_date)

                campaigns.append(CampaignData(
                    id=str(campaign.id),
                    name=campaign.name,
                    status=status,
                    campaign_type=campaign_type,
                    budget_micros=budget.amount_micros if budget else 0,
                    currency_code="USD",  # Would need account info for actual currency
                    start_date=start_date,
                    end_date=end_date,
                ))

            return campaigns

        except Exception as e:
            # Log error and return empty list for graceful degradation
            print(f"Error fetching campaigns: {e}")
            return []

    async def get_campaign_metrics(
        self,
        campaign_id: str,
        date_from: date,
        date_to: date,
    ) -> List[CampaignMetrics]:
        """Fetch daily metrics for a campaign."""
        try:
            client = self._get_client()
            ga_service = client.get_service("GoogleAdsService")

            query = f"""
                SELECT
                    campaign.id,
                    segments.date,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.cost_micros,
                    metrics.conversions,
                    metrics.conversions_value,
                    metrics.ctr,
                    metrics.average_cpc
                FROM campaign
                WHERE campaign.id = {campaign_id}
                    AND segments.date BETWEEN '{date_from.isoformat()}' AND '{date_to.isoformat()}'
                ORDER BY segments.date
            """

            customer_id = self._format_customer_id(self.customer_id)
            response = ga_service.search(customer_id=customer_id, query=query)

            metrics = []
            for row in response:
                m = row.metrics
                metrics.append(CampaignMetrics(
                    campaign_id=str(row.campaign.id),
                    date=date.fromisoformat(row.segments.date),
                    impressions=m.impressions,
                    clicks=m.clicks,
                    cost_micros=m.cost_micros,
                    conversions=m.conversions,
                    conversion_value_micros=int(m.conversions_value * 1_000_000),
                    ctr=m.ctr,
                    avg_cpc_micros=m.average_cpc,
                    avg_cpa_micros=int(m.cost_micros / m.conversions) if m.conversions > 0 else None,
                    roas=m.conversions_value / (m.cost_micros / 1_000_000) if m.cost_micros > 0 else None,
                ))

            return metrics

        except Exception as e:
            print(f"Error fetching campaign metrics: {e}")
            return []

    async def pause_campaign(self, campaign_id: str) -> MutateResult:
        """Pause a campaign."""
        return await self._update_campaign_status(campaign_id, "PAUSED")

    async def enable_campaign(self, campaign_id: str) -> MutateResult:
        """Enable a paused campaign."""
        return await self._update_campaign_status(campaign_id, "ENABLED")

    async def _update_campaign_status(
        self, campaign_id: str, status: str
    ) -> MutateResult:
        """Update campaign status."""
        try:
            client = self._get_client()
            campaign_service = client.get_service("CampaignService")

            customer_id = self._format_customer_id(self.customer_id)
            resource_name = f"customers/{customer_id}/campaigns/{campaign_id}"

            # Create operation
            operation = client.get_type("CampaignOperation")
            campaign = operation.update
            campaign.resource_name = resource_name

            # Set status
            if status == "PAUSED":
                campaign.status = client.enums.CampaignStatusEnum.PAUSED
            elif status == "ENABLED":
                campaign.status = client.enums.CampaignStatusEnum.ENABLED

            # Set field mask
            client.copy_from(
                operation.update_mask,
                client.get_type("FieldMask")(paths=["status"])
            )

            # Execute mutation
            response = campaign_service.mutate_campaigns(
                customer_id=customer_id,
                operations=[operation]
            )

            return MutateResult(
                success=True,
                resource_name=response.results[0].resource_name
            )

        except Exception as e:
            return MutateResult(success=False, error_message=str(e))

    async def update_campaign_budget(
        self,
        campaign_id: str,
        new_budget_micros: int,
    ) -> MutateResult:
        """Update campaign daily budget."""
        try:
            client = self._get_client()
            campaign_budget_service = client.get_service("CampaignBudgetService")
            ga_service = client.get_service("GoogleAdsService")

            customer_id = self._format_customer_id(self.customer_id)

            # First, get the campaign's budget resource name
            query = f"""
                SELECT campaign.campaign_budget
                FROM campaign
                WHERE campaign.id = {campaign_id}
            """
            response = ga_service.search(customer_id=customer_id, query=query)

            budget_resource_name = None
            for row in response:
                budget_resource_name = row.campaign.campaign_budget
                break

            if not budget_resource_name:
                return MutateResult(
                    success=False,
                    error_message="Campaign budget not found"
                )

            # Create update operation
            operation = client.get_type("CampaignBudgetOperation")
            budget = operation.update
            budget.resource_name = budget_resource_name
            budget.amount_micros = new_budget_micros

            client.copy_from(
                operation.update_mask,
                client.get_type("FieldMask")(paths=["amount_micros"])
            )

            # Execute mutation
            response = campaign_budget_service.mutate_campaign_budgets(
                customer_id=customer_id,
                operations=[operation]
            )

            return MutateResult(
                success=True,
                resource_name=response.results[0].resource_name
            )

        except Exception as e:
            return MutateResult(success=False, error_message=str(e))

    # =========================================================================
    # PMAX NETWORK BREAKDOWN (v18+ FEATURE)
    # =========================================================================

    async def get_pmax_network_breakdown(
        self,
        campaign_id: str,
        date_from: date,
        date_to: date,
    ) -> List[NetworkBreakdown]:
        """
        Get Performance Max network breakdown using ad_network_type segment.
        Shows spend split across Search, YouTube, Display, Discovery.
        """
        try:
            client = self._get_client()
            ga_service = client.get_service("GoogleAdsService")

            query = f"""
                SELECT
                    campaign.id,
                    segments.ad_network_type,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.cost_micros,
                    metrics.conversions
                FROM campaign
                WHERE campaign.id = {campaign_id}
                    AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
                    AND segments.date BETWEEN '{date_from.isoformat()}' AND '{date_to.isoformat()}'
            """

            customer_id = self._format_customer_id(self.customer_id)
            response = ga_service.search(customer_id=customer_id, query=query)

            # Aggregate by network type
            network_data = {}
            for row in response:
                network_type_value = row.segments.ad_network_type
                m = row.metrics

                # Map network type enum to our NetworkType
                network_map = {
                    2: NetworkType.SEARCH,     # SEARCH
                    3: NetworkType.DISPLAY,    # CONTENT (Display)
                    5: NetworkType.YOUTUBE,    # YOUTUBE_WATCH
                    6: NetworkType.YOUTUBE,    # YOUTUBE_SEARCH
                    9: NetworkType.DISCOVERY,  # GOOGLE_TV (treat as Discovery)
                }
                network_type = network_map.get(network_type_value, NetworkType.DISPLAY)

                if network_type not in network_data:
                    network_data[network_type] = {
                        "impressions": 0,
                        "clicks": 0,
                        "cost_micros": 0,
                        "conversions": 0.0,
                    }

                network_data[network_type]["impressions"] += m.impressions
                network_data[network_type]["clicks"] += m.clicks
                network_data[network_type]["cost_micros"] += m.cost_micros
                network_data[network_type]["conversions"] += m.conversions

            # Convert to NetworkBreakdown objects
            results = []
            for network_type, data in network_data.items():
                results.append(NetworkBreakdown(
                    campaign_id=campaign_id,
                    network_type=network_type,
                    impressions=data["impressions"],
                    clicks=data["clicks"],
                    cost_micros=data["cost_micros"],
                    conversions=data["conversions"],
                ))

            return results

        except Exception as e:
            print(f"Error fetching PMax network breakdown: {e}")
            return []

    # =========================================================================
    # KEYWORD OPERATIONS
    # =========================================================================

    async def get_keywords(
        self,
        ad_group_id: Optional[str] = None,
    ) -> List[KeywordData]:
        """Fetch keywords, optionally filtered by ad group."""
        try:
            client = self._get_client()
            ga_service = client.get_service("GoogleAdsService")

            # Build query
            where_clause = ""
            if ad_group_id:
                where_clause = f"AND ad_group.id = {ad_group_id}"

            query = f"""
                SELECT
                    ad_group_criterion.criterion_id,
                    ad_group.id,
                    ad_group_criterion.keyword.text,
                    ad_group_criterion.keyword.match_type,
                    ad_group_criterion.status,
                    ad_group_criterion.quality_info.quality_score,
                    ad_group_criterion.cpc_bid_micros
                FROM ad_group_criterion
                WHERE ad_group_criterion.type = 'KEYWORD'
                    AND ad_group_criterion.status != 'REMOVED'
                    {where_clause}
                ORDER BY ad_group_criterion.keyword.text
            """

            customer_id = self._format_customer_id(self.customer_id)
            response = ga_service.search(customer_id=customer_id, query=query)

            keywords = []
            for row in response:
                criterion = row.ad_group_criterion

                # Map match type
                match_type_map = {
                    2: "EXACT",
                    3: "PHRASE",
                    4: "BROAD",
                }
                match_type = match_type_map.get(criterion.keyword.match_type, "BROAD")

                # Map status
                status = "ENABLED" if criterion.status == 2 else "PAUSED"

                keywords.append(KeywordData(
                    id=str(criterion.criterion_id),
                    ad_group_id=str(row.ad_group.id),
                    text=criterion.keyword.text,
                    match_type=match_type,
                    status=status,
                    quality_score=criterion.quality_info.quality_score if criterion.quality_info else None,
                    cpc_bid_micros=criterion.cpc_bid_micros,
                ))

            return keywords

        except Exception as e:
            print(f"Error fetching keywords: {e}")
            return []

    async def get_keyword_metrics(
        self,
        keyword_ids: List[str],
        date_from: date,
        date_to: date,
    ) -> List[KeywordMetrics]:
        """Fetch metrics for specified keywords."""
        if not keyword_ids:
            return []

        try:
            client = self._get_client()
            ga_service = client.get_service("GoogleAdsService")

            # Build IN clause for keyword IDs
            ids_str = ", ".join(keyword_ids)

            query = f"""
                SELECT
                    ad_group_criterion.criterion_id,
                    segments.date,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.cost_micros,
                    metrics.conversions,
                    metrics.average_cpc,
                    ad_group_criterion.quality_info.quality_score
                FROM ad_group_criterion
                WHERE ad_group_criterion.type = 'KEYWORD'
                    AND ad_group_criterion.criterion_id IN ({ids_str})
                    AND segments.date BETWEEN '{date_from.isoformat()}' AND '{date_to.isoformat()}'
                ORDER BY ad_group_criterion.criterion_id, segments.date
            """

            customer_id = self._format_customer_id(self.customer_id)
            response = ga_service.search(customer_id=customer_id, query=query)

            metrics = []
            for row in response:
                criterion = row.ad_group_criterion
                m = row.metrics

                metrics.append(KeywordMetrics(
                    keyword_id=str(criterion.criterion_id),
                    date=date.fromisoformat(row.segments.date),
                    impressions=m.impressions,
                    clicks=m.clicks,
                    cost_micros=m.cost_micros,
                    conversions=m.conversions,
                    avg_cpc_micros=m.average_cpc,
                    quality_score=criterion.quality_info.quality_score if criterion.quality_info else None,
                ))

            return metrics

        except Exception as e:
            print(f"Error fetching keyword metrics: {e}")
            return []

    async def pause_keywords(self, keyword_ids: List[str]) -> MutateResult:
        """Pause multiple keywords."""
        try:
            client = self._get_client()
            ad_group_criterion_service = client.get_service("AdGroupCriterionService")
            ga_service = client.get_service("GoogleAdsService")

            customer_id = self._format_customer_id(self.customer_id)

            # First, get the resource names for these keywords
            ids_str = ", ".join(keyword_ids)
            query = f"""
                SELECT
                    ad_group_criterion.resource_name
                FROM ad_group_criterion
                WHERE ad_group_criterion.type = 'KEYWORD'
                    AND ad_group_criterion.criterion_id IN ({ids_str})
            """

            response = ga_service.search(customer_id=customer_id, query=query)

            # Build operations
            operations = []
            for row in response:
                operation = client.get_type("AdGroupCriterionOperation")
                criterion = operation.update
                criterion.resource_name = row.ad_group_criterion.resource_name
                criterion.status = client.enums.AdGroupCriterionStatusEnum.PAUSED

                client.copy_from(
                    operation.update_mask,
                    client.get_type("FieldMask")(paths=["status"])
                )
                operations.append(operation)

            if not operations:
                return MutateResult(success=False, error_message="No keywords found")

            # Execute mutations
            response = ad_group_criterion_service.mutate_ad_group_criteria(
                customer_id=customer_id,
                operations=operations
            )

            return MutateResult(
                success=True,
                resource_name=f"Paused {len(response.results)} keywords",
                rollback_data={"previous_status": "ENABLED", "keyword_ids": keyword_ids}
            )

        except Exception as e:
            return MutateResult(success=False, error_message=str(e))

    async def enable_keywords(self, keyword_ids: List[str]) -> MutateResult:
        """Enable multiple keywords."""
        try:
            client = self._get_client()
            ad_group_criterion_service = client.get_service("AdGroupCriterionService")
            ga_service = client.get_service("GoogleAdsService")

            customer_id = self._format_customer_id(self.customer_id)

            # Get the resource names for these keywords
            ids_str = ", ".join(keyword_ids)
            query = f"""
                SELECT
                    ad_group_criterion.resource_name
                FROM ad_group_criterion
                WHERE ad_group_criterion.type = 'KEYWORD'
                    AND ad_group_criterion.criterion_id IN ({ids_str})
            """

            response = ga_service.search(customer_id=customer_id, query=query)

            # Build operations
            operations = []
            for row in response:
                operation = client.get_type("AdGroupCriterionOperation")
                criterion = operation.update
                criterion.resource_name = row.ad_group_criterion.resource_name
                criterion.status = client.enums.AdGroupCriterionStatusEnum.ENABLED

                client.copy_from(
                    operation.update_mask,
                    client.get_type("FieldMask")(paths=["status"])
                )
                operations.append(operation)

            if not operations:
                return MutateResult(success=False, error_message="No keywords found")

            # Execute mutations
            response = ad_group_criterion_service.mutate_ad_group_criteria(
                customer_id=customer_id,
                operations=operations
            )

            return MutateResult(
                success=True,
                resource_name=f"Enabled {len(response.results)} keywords",
                rollback_data={"previous_status": "PAUSED", "keyword_ids": keyword_ids}
            )

        except Exception as e:
            return MutateResult(success=False, error_message=str(e))

    async def update_keyword_bid(
        self,
        keyword_id: str,
        ad_group_id: str,
        new_bid_micros: int,
    ) -> MutateResult:
        """Update a keyword's CPC bid."""
        try:
            client = self._get_client()
            ad_group_criterion_service = client.get_service("AdGroupCriterionService")
            ga_service = client.get_service("GoogleAdsService")

            customer_id = self._format_customer_id(self.customer_id)

            # First, get current bid for rollback data
            query = f"""
                SELECT
                    ad_group_criterion.resource_name,
                    ad_group_criterion.cpc_bid_micros
                FROM ad_group_criterion
                WHERE ad_group_criterion.type = 'KEYWORD'
                    AND ad_group_criterion.criterion_id = {keyword_id}
            """

            response = ga_service.search(customer_id=customer_id, query=query)

            resource_name = None
            current_bid = None
            for row in response:
                resource_name = row.ad_group_criterion.resource_name
                current_bid = row.ad_group_criterion.cpc_bid_micros
                break

            if not resource_name:
                return MutateResult(success=False, error_message="Keyword not found")

            # Build update operation
            operation = client.get_type("AdGroupCriterionOperation")
            criterion = operation.update
            criterion.resource_name = resource_name
            criterion.cpc_bid_micros = new_bid_micros

            client.copy_from(
                operation.update_mask,
                client.get_type("FieldMask")(paths=["cpc_bid_micros"])
            )

            # Execute mutation
            response = ad_group_criterion_service.mutate_ad_group_criteria(
                customer_id=customer_id,
                operations=[operation]
            )

            return MutateResult(
                success=True,
                resource_name=response.results[0].resource_name,
                rollback_data={"previous_bid_micros": current_bid, "keyword_id": keyword_id}
            )

        except Exception as e:
            return MutateResult(success=False, error_message=str(e))

    async def add_negative_keyword(
        self,
        campaign_id: str,
        keyword_text: str,
        match_type: str = "EXACT",
    ) -> MutateResult:
        """Add a negative keyword to a campaign."""
        try:
            client = self._get_client()
            campaign_criterion_service = client.get_service("CampaignCriterionService")

            customer_id = self._format_customer_id(self.customer_id)
            campaign_resource = f"customers/{customer_id}/campaigns/{campaign_id}"

            # Map match type
            match_type_enum = {
                "EXACT": client.enums.KeywordMatchTypeEnum.EXACT,
                "PHRASE": client.enums.KeywordMatchTypeEnum.PHRASE,
                "BROAD": client.enums.KeywordMatchTypeEnum.BROAD,
            }.get(match_type.upper(), client.enums.KeywordMatchTypeEnum.EXACT)

            # Build create operation
            operation = client.get_type("CampaignCriterionOperation")
            criterion = operation.create
            criterion.campaign = campaign_resource
            criterion.negative = True
            criterion.keyword.text = keyword_text
            criterion.keyword.match_type = match_type_enum

            # Execute mutation
            response = campaign_criterion_service.mutate_campaign_criteria(
                customer_id=customer_id,
                operations=[operation]
            )

            return MutateResult(
                success=True,
                resource_name=response.results[0].resource_name,
                rollback_data={
                    "campaign_id": campaign_id,
                    "keyword_text": keyword_text,
                    "resource_name": response.results[0].resource_name
                }
            )

        except Exception as e:
            return MutateResult(success=False, error_message=str(e))

    # =========================================================================
    # AI-POWERED FEATURES
    # =========================================================================

    async def generate_audience_from_text(
        self,
        description: str,
    ) -> AudienceDefinition:
        """
        Generate audience definition from natural language.
        Uses AudienceInsightsService (if available).

        Note: This feature requires specific API access levels.
        Returns placeholder if not available.
        """
        try:
            client = self._get_client()
            audience_insights_service = client.get_service("AudienceInsightsService")

            # Build request
            customer_id = self._format_customer_id(self.customer_id)

            request = client.get_type("GenerateAudienceCompositionInsightsRequest")
            request.customer_id = customer_id
            request.audience.audience_description = description

            response = audience_insights_service.generate_audience_composition_insights(
                request=request
            )

            # Parse response into segments
            segments = []
            for insight in response.sections:
                segments.append({
                    "type": str(insight.dimension),
                    "name": insight.top_attributes[0].attribute if insight.top_attributes else "",
                })

            return AudienceDefinition(
                description=description,
                segments=segments,
                estimated_reach=None
            )

        except Exception as e:
            print(f"Audience generation not available: {e}")
            # Return placeholder
            return AudienceDefinition(
                description=description,
                segments=[],
                estimated_reach=None
            )

    async def get_benchmark_metrics(
        self,
        campaign_ids: List[str],
    ) -> List[BenchmarkData]:
        """
        Get industry benchmark comparisons.
        This feature may require specific API access levels.
        """
        # Note: Benchmark data requires specific API access
        # For now, return empty list - implement when access is available
        return []

    # =========================================================================
    # SEARCH TERMS
    # =========================================================================

    async def get_search_terms(
        self,
        campaign_id: str,
        date_from: date,
        date_to: date,
    ) -> List[dict]:
        """Fetch search terms report for a campaign."""
        try:
            client = self._get_client()
            ga_service = client.get_service("GoogleAdsService")

            query = f"""
                SELECT
                    search_term_view.search_term,
                    search_term_view.status,
                    campaign.id,
                    ad_group.id,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.cost_micros,
                    metrics.conversions
                FROM search_term_view
                WHERE campaign.id = {campaign_id}
                    AND segments.date BETWEEN '{date_from.isoformat()}' AND '{date_to.isoformat()}'
                ORDER BY metrics.impressions DESC
                LIMIT 1000
            """

            customer_id = self._format_customer_id(self.customer_id)
            response = ga_service.search(customer_id=customer_id, query=query)

            search_terms = []
            for row in response:
                search_terms.append({
                    "search_term": row.search_term_view.search_term,
                    "status": str(row.search_term_view.status),
                    "campaign_id": str(row.campaign.id),
                    "ad_group_id": str(row.ad_group.id),
                    "impressions": row.metrics.impressions,
                    "clicks": row.metrics.clicks,
                    "cost_micros": row.metrics.cost_micros,
                    "conversions": row.metrics.conversions,
                })

            return search_terms

        except Exception as e:
            print(f"Error fetching search terms: {e}")
            return []

    # =========================================================================
    # AUCTION INSIGHTS (COMPETITOR DATA)
    # =========================================================================

    async def get_auction_insights(
        self,
        campaign_id: str,
        date_from: date,
        date_to: date,
    ) -> List[dict]:
        """Get auction insights showing competitor impression share."""
        try:
            client = self._get_client()
            ga_service = client.get_service("GoogleAdsService")

            # Note: auction_insight requires specific permissions
            query = f"""
                SELECT
                    auction_insight.search_impression_share,
                    auction_insight.search_overlap_rate,
                    auction_insight.search_position_above_rate,
                    auction_insight.search_top_impression_percentage,
                    auction_insight.search_absolute_top_impression_percentage,
                    auction_insight.domain
                FROM auction_insight
                WHERE campaign.id = {campaign_id}
                    AND segments.date BETWEEN '{date_from.isoformat()}' AND '{date_to.isoformat()}'
            """

            customer_id = self._format_customer_id(self.customer_id)
            response = ga_service.search(customer_id=customer_id, query=query)

            insights = []
            for row in response:
                ai = row.auction_insight
                insights.append({
                    "domain": ai.domain,
                    "impression_share": ai.search_impression_share,
                    "overlap_rate": ai.search_overlap_rate,
                    "position_above_rate": ai.search_position_above_rate,
                    "top_impression_pct": ai.search_top_impression_percentage,
                    "abs_top_impression_pct": ai.search_absolute_top_impression_percentage,
                })

            return insights

        except Exception as e:
            print(f"Error fetching auction insights: {e}")
            return []
