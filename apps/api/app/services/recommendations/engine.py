"""
Recommendation Engine - Generates AI recommendations from rules.

This engine:
1. Fetches metrics data from the database
2. Evaluates rules against each entity
3. Generates recommendations with options
4. Stores recommendations in database
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from uuid import uuid4

from .rules import RULES, Rule, Severity, get_rules_for_platform


# Legacy mock data - kept for backward compatibility
# Now recommendations are generated from real database data
MOCK_RECOMMENDATIONS: List[Dict[str, Any]] = []


class RecommendationEngine:
    """
    Generates AI recommendations by evaluating rules against ad account data.

    Fetches real data from the database for analysis.
    """

    def __init__(self, supabase_client=None):
        self.supabase = supabase_client

    async def generate_recommendations(
        self,
        ad_account_id: str,
        organization_id: str
    ) -> List[Dict[str, Any]]:
        """
        Generate all recommendations for an ad account.

        Returns list of recommendation objects ready to store.
        """
        recommendations = []

        # Determine platform
        platform = await self._get_account_platform(ad_account_id)
        rules = get_rules_for_platform(platform)

        # Get keywords with metrics (Google Ads)
        if platform in ["google", "all"]:
            keywords = await self._get_keywords_with_metrics(ad_account_id)
            for keyword in keywords:
                for rule in rules:
                    if rule.type.value in ["pause_keyword", "reduce_bid", "improve_quality_score"]:
                        if rule.check(keyword):
                            rec = self._create_recommendation(
                                rule=rule,
                                entity=keyword,
                                entity_type="keyword",
                                ad_account_id=ad_account_id,
                                organization_id=organization_id
                            )
                            recommendations.append(rec)

        # Get campaigns with metrics
        campaigns = await self._get_campaigns_with_metrics(ad_account_id)
        for campaign in campaigns:
            for rule in rules:
                if rule.type.value in ["increase_budget", "fix_tracking", "anomaly_detected"]:
                    if rule.check(campaign):
                        rec = self._create_recommendation(
                            rule=rule,
                            entity=campaign,
                            entity_type="campaign",
                            ad_account_id=ad_account_id,
                            organization_id=organization_id
                        )
                        recommendations.append(rec)

        # Get ad sets with metrics (Meta Ads)
        if platform in ["meta", "all"]:
            adsets = await self._get_adsets_with_metrics(ad_account_id)
            for adset in adsets:
                for rule in rules:
                    if rule.type.value in ["pause_adset", "scale_adset", "audience_overlap"]:
                        if rule.check(adset):
                            rec = self._create_recommendation(
                                rule=rule,
                                entity=adset,
                                entity_type="adset",
                                ad_account_id=ad_account_id,
                                organization_id=organization_id
                            )
                            recommendations.append(rec)

            # Get ads with metrics (Meta Ads)
            ads = await self._get_ads_with_metrics(ad_account_id)
            for ad in ads:
                for rule in rules:
                    if rule.type.value in ["pause_ad", "creative_fatigue", "refresh_creative"]:
                        if rule.check(ad):
                            rec = self._create_recommendation(
                                rule=rule,
                                entity=ad,
                                entity_type="ad",
                                ad_account_id=ad_account_id,
                                organization_id=organization_id
                            )
                            recommendations.append(rec)

        # Deduplicate and prioritize
        recommendations = self._prioritize(recommendations)

        return recommendations

    def _create_recommendation(
        self,
        rule: Rule,
        entity: Dict[str, Any],
        entity_type: str,
        ad_account_id: str,
        organization_id: str
    ) -> Dict[str, Any]:
        """Create a recommendation object from a rule match."""
        impact = rule.calculate_impact(entity)
        options = rule.get_options(entity)

        # Format description based on entity type
        description = self._format_description(rule, entity, entity_type)
        impact_summary = rule.impact_template.format(impact=impact)

        return {
            "id": str(uuid4()),
            "ad_account_id": ad_account_id,
            "organization_id": organization_id,
            "rule_id": rule.id,
            "type": rule.type.value,
            "severity": rule.severity.value,
            "title": rule.name,
            "description": description,
            "impact_estimate": {
                "monthly_savings": impact if "pause" in rule.type.value or "reduce" in rule.type.value else None,
                "potential_gain": impact if "increase" in rule.type.value or "scale" in rule.type.value else None,
                "summary": impact_summary
            },
            "affected_entity": {
                "type": entity_type,
                "id": entity.get("id"),
                "name": entity.get("text") or entity.get("name"),
                "campaign_id": entity.get("campaign_id"),
                "campaign_name": entity.get("campaign_name"),
            },
            "options": options,
            "status": "pending",
            "confidence": self._calculate_confidence(rule, entity),
            "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "created_at": datetime.utcnow().isoformat(),
        }

    def _format_description(
        self,
        rule: Rule,
        entity: Dict[str, Any],
        entity_type: str
    ) -> str:
        """Format the description template with entity data."""
        try:
            if entity_type == "keyword":
                return rule.description_template.format(
                    keyword=entity.get("text", "Unknown"),
                    spend=entity.get("spend_7d", 0),
                    qs=entity.get("quality_score", 0),
                    cpc_pct=entity.get("cpc_vs_avg", 0)
                )
            elif entity_type == "campaign":
                return rule.description_template.format(
                    campaign=entity.get("name", "Unknown"),
                    roas=entity.get("roas", 0),
                    is_lost=entity.get("impression_share_lost_to_budget", 0),
                    prev_conv=entity.get("conversions_prev_7d", 0),
                    clicks=entity.get("clicks_7d", 0),
                    direction="increased" if entity.get("spend_today", 0) > entity.get("spend_7d_avg", 0) else "decreased",
                    change_pct=abs((entity.get("spend_today", 0) - entity.get("spend_7d_avg", 1)) / max(entity.get("spend_7d_avg", 1), 1) * 100),
                    drop_pct=((entity.get("conversions_prev_7d", 0) - entity.get("conversions_7d", 0)) / max(entity.get("conversions_prev_7d", 1), 1) * 100) if entity.get("conversions_prev_7d", 0) > 0 else 0
                )
            elif entity_type == "adset":
                return rule.description_template.format(
                    adset_name=entity.get("name", "Unknown"),
                    roas=entity.get("roas", 0),
                    target_roas=entity.get("target_roas", 2.0),
                    frequency=entity.get("frequency", 0),
                    adset1=entity.get("name", ""),
                    adset2=entity.get("overlap_adset_name", ""),
                    overlap_pct=entity.get("overlap_pct", 0)
                )
            elif entity_type == "ad":
                return rule.description_template.format(
                    ad_name=entity.get("name", "Unknown"),
                    spend=entity.get("spend_7d", 0),
                    ctr=entity.get("ctr_7d", 0),
                    ctr_drop=((entity.get("ctr_prev_7d", 0) - entity.get("ctr_7d", 0)) / max(entity.get("ctr_prev_7d", 0.01), 0.01) * 100) if entity.get("ctr_prev_7d", 0) > 0 else 0
                )
            else:
                return rule.description_template
        except (KeyError, ValueError):
            return f"Review {entity.get('name', 'entity')} based on recent performance."

    def _calculate_confidence(self, rule: Rule, entity: Dict[str, Any]) -> int:
        """Calculate confidence score 0-100 based on data quality."""
        # Base confidence by severity
        base = {
            Severity.CRITICAL: 95,
            Severity.WARNING: 85,
            Severity.OPPORTUNITY: 75,
            Severity.INFO: 65,
        }.get(rule.severity, 70)

        # Adjust based on data volume
        impressions = entity.get("impressions_7d", 0)
        if impressions > 10000:
            base += 5
        elif impressions < 1000:
            base -= 10

        return min(100, max(50, base))

    def _prioritize(
        self,
        recommendations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Sort recommendations by severity and impact."""
        severity_order = {
            "critical": 0,
            "warning": 1,
            "opportunity": 2,
            "info": 3
        }

        def sort_key(rec):
            sev = severity_order.get(rec["severity"], 99)
            impact = (
                rec["impact_estimate"].get("monthly_savings") or
                rec["impact_estimate"].get("potential_gain") or
                0
            )
            return (sev, -impact)

        sorted_recs = sorted(recommendations, key=sort_key)

        # Limit to 50 total
        return sorted_recs[:50]

    async def _get_account_platform(self, ad_account_id: str) -> str:
        """Determine the platform for an ad account."""
        if not self.supabase:
            return "all"

        result = self.supabase.table("ad_accounts").select(
            "platform_id"
        ).eq("id", ad_account_id).execute()

        if not result.data:
            return "all"

        platform_id = result.data[0].get("platform_id")
        if not platform_id:
            return "all"

        # Get platform name
        platform_result = self.supabase.table("ad_platforms").select(
            "name"
        ).eq("id", platform_id).execute()

        if platform_result.data:
            name = platform_result.data[0].get("name", "")
            if "google" in name.lower():
                return "google"
            elif "meta" in name.lower():
                return "meta"

        return "all"

    async def _get_keywords_with_metrics(
        self,
        ad_account_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get keywords with performance metrics from database.
        """
        if not self.supabase:
            return self._get_mock_keywords()

        # Get campaigns for this account
        campaigns_result = self.supabase.table("campaigns").select(
            "id, name"
        ).eq("ad_account_id", ad_account_id).execute()

        campaign_map = {c["id"]: c["name"] for c in (campaigns_result.data or [])}
        campaign_ids = list(campaign_map.keys())

        if not campaign_ids:
            return []

        # Get ad groups
        ad_groups_result = self.supabase.table("ad_groups").select(
            "id, campaign_id"
        ).execute()

        ad_group_campaign = {}
        ad_group_ids = []
        for ag in (ad_groups_result.data or []):
            if ag.get("campaign_id") in campaign_ids:
                ad_group_campaign[ag["id"]] = ag["campaign_id"]
                ad_group_ids.append(ag["id"])

        if not ad_group_ids:
            return []

        # Get keywords
        keywords_result = self.supabase.table("keywords").select("*").execute()
        keywords = []

        for kw in (keywords_result.data or []):
            ad_group_id = kw.get("ad_group_id")
            if ad_group_id not in ad_group_ids:
                continue

            campaign_id = ad_group_campaign.get(ad_group_id)

            # Get metrics for this keyword
            metrics = self._aggregate_keyword_metrics(kw["id"])

            keywords.append({
                "id": kw["id"],
                "text": kw.get("text", ""),
                "campaign_id": campaign_id,
                "campaign_name": campaign_map.get(campaign_id, ""),
                "status": kw.get("status", "ENABLED"),
                "quality_score": kw.get("quality_score", 7),
                **metrics
            })

        return keywords

    def _aggregate_keyword_metrics(self, keyword_id: str) -> Dict[str, Any]:
        """Aggregate metrics for a keyword."""
        if not self.supabase:
            return {"spend_7d": 0, "conversions_7d": 0, "impressions_7d": 0, "clicks_7d": 0}

        result = self.supabase.table("metrics_daily").select(
            "impressions, clicks, cost_micros, conversions"
        ).eq("keyword_id", keyword_id).execute()

        total_impressions = 0
        total_clicks = 0
        total_cost = 0
        total_conversions = 0

        for row in (result.data or []):
            total_impressions += row.get("impressions", 0)
            total_clicks += row.get("clicks", 0)
            total_cost += row.get("cost_micros", 0)
            total_conversions += int(row.get("conversions", 0) or 0)

        # Convert micros to dollars
        spend_dollars = total_cost / 1_000_000

        return {
            "spend_7d": spend_dollars,
            "conversions_7d": total_conversions,
            "impressions_7d": total_impressions,
            "clicks_7d": total_clicks,
            "cpc_vs_avg": 0,  # Would need account-level CPC to calculate
        }

    async def _get_campaigns_with_metrics(
        self,
        ad_account_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get campaigns with performance metrics from database.
        """
        if not self.supabase:
            return self._get_mock_campaigns()

        campaigns_result = self.supabase.table("campaigns").select("*").eq(
            "ad_account_id", ad_account_id
        ).execute()

        campaigns = []
        for c in (campaigns_result.data or []):
            metrics = self._aggregate_campaign_metrics(c["id"])

            # Calculate ROAS
            spend = metrics.get("spend_7d", 0)
            revenue = metrics.get("revenue_7d", 0)
            roas = revenue / spend if spend > 0 else 0

            campaigns.append({
                "id": c["id"],
                "name": c.get("name", ""),
                "status": c.get("status", "ENABLED"),
                "roas": roas,
                "impression_share_lost_to_budget": 0,  # Would need search impression share data
                **metrics
            })

        return campaigns

    def _aggregate_campaign_metrics(self, campaign_id: str) -> Dict[str, Any]:
        """Aggregate metrics for a campaign."""
        if not self.supabase:
            return {}

        result = self.supabase.table("metrics_daily").select(
            "impressions, clicks, cost_micros, conversions, conversion_value_micros"
        ).eq("campaign_id", campaign_id).execute()

        total_impressions = 0
        total_clicks = 0
        total_cost = 0
        total_conversions = 0
        total_value = 0

        for row in (result.data or []):
            total_impressions += row.get("impressions", 0)
            total_clicks += row.get("clicks", 0)
            total_cost += row.get("cost_micros", 0)
            total_conversions += int(row.get("conversions", 0) or 0)
            total_value += row.get("conversion_value_micros", 0) or 0

        return {
            "spend_7d": total_cost / 1_000_000,
            "conversions_7d": total_conversions,
            "conversions_30d": total_conversions,  # Would need 30d data
            "conversions_prev_7d": 0,  # Would need previous period
            "impressions_7d": total_impressions,
            "clicks_7d": total_clicks,
            "revenue_7d": total_value / 1_000_000,
            "spend_today": 0,
            "spend_7d_avg": total_cost / 7 / 1_000_000 if total_cost > 0 else 0,
        }

    async def _get_adsets_with_metrics(
        self,
        ad_account_id: str
    ) -> List[Dict[str, Any]]:
        """Get ad sets (ad groups) with metrics for Meta accounts."""
        if not self.supabase:
            return []

        # Get campaigns for this account
        campaigns_result = self.supabase.table("campaigns").select(
            "id, name"
        ).eq("ad_account_id", ad_account_id).execute()

        campaign_ids = [c["id"] for c in (campaigns_result.data or [])]
        campaign_map = {c["id"]: c["name"] for c in (campaigns_result.data or [])}

        if not campaign_ids:
            return []

        # Get ad groups
        ad_groups_result = self.supabase.table("ad_groups").select("*").execute()

        adsets = []
        for ag in (ad_groups_result.data or []):
            if ag.get("campaign_id") not in campaign_ids:
                continue

            metrics = self._aggregate_adset_metrics(ag["id"])

            # Calculate ROAS and frequency
            spend = metrics.get("spend_7d", 0)
            revenue = metrics.get("revenue_7d", 0)
            impressions = metrics.get("impressions_7d", 0)
            reach = metrics.get("reach_7d", impressions * 0.7)  # Estimate
            roas = revenue / spend if spend > 0 else 0
            frequency = impressions / reach if reach > 0 else 0

            adsets.append({
                "id": ag["id"],
                "name": ag.get("name", ""),
                "campaign_id": ag.get("campaign_id"),
                "campaign_name": campaign_map.get(ag.get("campaign_id"), ""),
                "status": ag.get("status", "ENABLED"),
                "roas": roas,
                "target_roas": 2.0,  # Default target
                "frequency": frequency,
                **metrics
            })

        return adsets

    def _aggregate_adset_metrics(self, ad_group_id: str) -> Dict[str, Any]:
        """Aggregate metrics for an ad set."""
        if not self.supabase:
            return {}

        result = self.supabase.table("metrics_daily").select(
            "impressions, clicks, cost_micros, conversions, conversion_value_micros"
        ).eq("ad_group_id", ad_group_id).execute()

        total_impressions = 0
        total_clicks = 0
        total_cost = 0
        total_conversions = 0
        total_value = 0

        for row in (result.data or []):
            total_impressions += row.get("impressions", 0)
            total_clicks += row.get("clicks", 0)
            total_cost += row.get("cost_micros", 0)
            total_conversions += int(row.get("conversions", 0) or 0)
            total_value += row.get("conversion_value_micros", 0) or 0

        return {
            "spend_7d": total_cost / 1_000_000,
            "conversions_7d": total_conversions,
            "impressions_7d": total_impressions,
            "clicks_7d": total_clicks,
            "revenue_7d": total_value / 1_000_000,
            "reach_7d": int(total_impressions * 0.7),
        }

    async def _get_ads_with_metrics(
        self,
        ad_account_id: str
    ) -> List[Dict[str, Any]]:
        """Get individual ads with metrics."""
        if not self.supabase:
            return []

        # Get campaigns and ad groups for this account
        campaigns_result = self.supabase.table("campaigns").select(
            "id"
        ).eq("ad_account_id", ad_account_id).execute()

        campaign_ids = [c["id"] for c in (campaigns_result.data or [])]
        if not campaign_ids:
            return []

        ad_groups_result = self.supabase.table("ad_groups").select(
            "id, campaign_id, name"
        ).execute()

        ad_group_ids = []
        ad_group_map = {}
        for ag in (ad_groups_result.data or []):
            if ag.get("campaign_id") in campaign_ids:
                ad_group_ids.append(ag["id"])
                ad_group_map[ag["id"]] = ag.get("name", "")

        if not ad_group_ids:
            return []

        # Get ads
        ads_result = self.supabase.table("ads").select("*").execute()

        ads = []
        for ad in (ads_result.data or []):
            if ad.get("ad_group_id") not in ad_group_ids:
                continue

            # For now, use placeholder metrics (would need ad-level metrics table)
            ads.append({
                "id": ad["id"],
                "name": ad.get("name", ""),
                "ad_group_id": ad.get("ad_group_id"),
                "ad_group_name": ad_group_map.get(ad.get("ad_group_id"), ""),
                "status": ad.get("status", "ENABLED"),
                "spend_7d": 0,
                "conversions_7d": 0,
                "impressions_7d": 0,
                "clicks_7d": 0,
                "ctr_7d": 0,
                "ctr_prev_7d": 0,
            })

        return ads

    # ==========================================================================
    # Mock Data (fallback when no database connection)
    # ==========================================================================

    def _get_mock_keywords(self) -> List[Dict[str, Any]]:
        """Mock keyword data for testing."""
        return [
            {
                "id": "kw_1",
                "text": "cheap widgets online",
                "campaign_id": "camp_1",
                "campaign_name": "Search - Non-Brand",
                "status": "ENABLED",
                "spend_7d": 85.50,
                "conversions_7d": 0,
                "impressions_7d": 4500,
                "clicks_7d": 120,
                "quality_score": 4,
                "cpc_vs_avg": 45,
            },
            {
                "id": "kw_2",
                "text": "discount product deals",
                "campaign_id": "camp_1",
                "campaign_name": "Search - Non-Brand",
                "status": "ENABLED",
                "spend_7d": 62.30,
                "conversions_7d": 0,
                "impressions_7d": 3200,
                "clicks_7d": 95,
                "quality_score": 5,
                "cpc_vs_avg": 30,
            },
        ]

    def _get_mock_campaigns(self) -> List[Dict[str, Any]]:
        """Mock campaign data for testing."""
        return [
            {
                "id": "camp_1",
                "name": "Search - Non-Brand",
                "status": "ENABLED",
                "roas": 2.8,
                "impression_share_lost_to_budget": 35,
                "conversions_30d": 45,
                "conversions_7d": 12,
                "conversions_prev_7d": 14,
                "clicks_7d": 450,
                "spend_7d": 500,
                "spend_today": 75,
                "spend_7d_avg": 71,
            },
            {
                "id": "camp_2",
                "name": "PMax - Products",
                "status": "ENABLED",
                "roas": 3.5,
                "impression_share_lost_to_budget": 42,
                "conversions_30d": 78,
                "conversions_7d": 18,
                "conversions_prev_7d": 22,
                "clicks_7d": 1200,
                "spend_7d": 800,
                "spend_today": 120,
                "spend_7d_avg": 114,
            },
        ]
