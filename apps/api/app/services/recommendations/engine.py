"""
Recommendation Engine - Generates AI recommendations from rules.

This engine:
1. Fetches metrics data for keywords, campaigns, etc.
2. Evaluates rules against each entity
3. Generates recommendations with options
4. Stores recommendations in database
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from uuid import uuid4

from .rules import RULES, Rule, Severity


class RecommendationEngine:
    """
    Generates AI recommendations by evaluating rules against ad account data.

    For MVP, uses mock data. In production, this would query the database
    for real metrics from synced Google Ads data.
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

        # Get keywords with metrics
        keywords = await self._get_keywords_with_metrics(ad_account_id)
        for keyword in keywords:
            for rule in RULES:
                if rule.type.value in ["pause_keyword", "reduce_bid"]:
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
            for rule in RULES:
                if rule.type.value in ["increase_budget", "fix_tracking"]:
                    if rule.check(campaign):
                        rec = self._create_recommendation(
                            rule=rule,
                            entity=campaign,
                            entity_type="campaign",
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

        # Format description with entity data
        if entity_type == "keyword":
            description = rule.description_template.format(
                keyword=entity.get("text", "Unknown"),
                spend=entity.get("spend_7d", 0),
                qs=entity.get("quality_score", 0),
                cpc_pct=entity.get("cpc_vs_avg", 0)
            )
        else:
            description = rule.description_template.format(
                campaign=entity.get("name", "Unknown"),
                roas=entity.get("roas", 0),
                is_lost=entity.get("impression_share_lost_to_budget", 0),
                prev_conv=entity.get("conversions_prev_7d", 0),
                clicks=entity.get("clicks_7d", 0)
            )

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
                "potential_gain": impact if "increase" in rule.type.value else None,
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

    async def _get_keywords_with_metrics(
        self,
        ad_account_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get keywords with performance metrics.

        For MVP, returns mock data. Production would query database.
        """
        # Mock data for testing
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
            {
                "id": "kw_3",
                "text": "free shipping products",
                "campaign_id": "camp_1",
                "campaign_name": "Search - Non-Brand",
                "status": "ENABLED",
                "spend_7d": 35.00,
                "conversions_7d": 0,
                "impressions_7d": 2100,
                "clicks_7d": 50,
                "quality_score": 3,
                "cpc_vs_avg": 60,
            },
            {
                "id": "kw_4",
                "text": "premium quality items",
                "campaign_id": "camp_2",
                "campaign_name": "Search - Brand",
                "status": "ENABLED",
                "spend_7d": 150.00,
                "conversions_7d": 12,
                "impressions_7d": 8000,
                "clicks_7d": 200,
                "quality_score": 8,
                "cpc_vs_avg": -10,
            },
        ]

    async def _get_campaigns_with_metrics(
        self,
        ad_account_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get campaigns with performance metrics.

        For MVP, returns mock data.
        """
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
            },
            {
                "id": "camp_2",
                "name": "Search - Brand",
                "status": "ENABLED",
                "roas": 5.2,
                "impression_share_lost_to_budget": 8,
                "conversions_30d": 120,
                "conversions_7d": 32,
                "conversions_prev_7d": 28,
                "clicks_7d": 890,
            },
            {
                "id": "camp_3",
                "name": "PMax - Products",
                "status": "ENABLED",
                "roas": 3.5,
                "impression_share_lost_to_budget": 42,
                "conversions_30d": 78,
                "conversions_7d": 18,
                "conversions_prev_7d": 22,
                "clicks_7d": 1200,
            },
        ]


# Mock recommendations for frontend development
MOCK_RECOMMENDATIONS = [
    {
        "id": "rec_1",
        "ad_account_id": "acc_1",
        "organization_id": "org_1",
        "rule_id": "wasting_keyword_high",
        "type": "pause_keyword",
        "severity": "warning",
        "title": "High-spend wasting keyword",
        "description": "Keyword 'cheap widgets online' spent $85.50 with 0 conversions in the last 7 days",
        "impact_estimate": {
            "monthly_savings": 342,
            "potential_gain": None,
            "summary": "Save ~$342/month by pausing"
        },
        "affected_entity": {
            "type": "keyword",
            "id": "kw_1",
            "name": "cheap widgets online",
            "campaign_id": "camp_1",
            "campaign_name": "Search - Non-Brand"
        },
        "options": [
            {"id": 1, "label": "Conservative", "action": "reduce_bid_50", "description": "Reduce bid by 50%", "risk": "low"},
            {"id": 2, "label": "Recommended", "action": "pause", "description": "Pause keyword", "risk": "low"},
            {"id": 3, "label": "Aggressive", "action": "pause_and_negative", "description": "Pause and add as negative", "risk": "medium"},
        ],
        "status": "pending",
        "confidence": 94,
        "expires_at": "2026-03-15T00:00:00Z",
        "created_at": "2026-03-08T10:00:00Z",
    },
    {
        "id": "rec_2",
        "ad_account_id": "acc_1",
        "organization_id": "org_1",
        "rule_id": "wasting_keyword_high",
        "type": "pause_keyword",
        "severity": "warning",
        "title": "High-spend wasting keyword",
        "description": "Keyword 'discount product deals' spent $62.30 with 0 conversions in the last 7 days",
        "impact_estimate": {
            "monthly_savings": 249,
            "potential_gain": None,
            "summary": "Save ~$249/month by pausing"
        },
        "affected_entity": {
            "type": "keyword",
            "id": "kw_2",
            "name": "discount product deals",
            "campaign_id": "camp_1",
            "campaign_name": "Search - Non-Brand"
        },
        "options": [
            {"id": 1, "label": "Conservative", "action": "reduce_bid_50", "description": "Reduce bid by 50%", "risk": "low"},
            {"id": 2, "label": "Recommended", "action": "pause", "description": "Pause keyword", "risk": "low"},
            {"id": 3, "label": "Aggressive", "action": "pause_and_negative", "description": "Pause and add as negative", "risk": "medium"},
        ],
        "status": "pending",
        "confidence": 91,
        "expires_at": "2026-03-15T00:00:00Z",
        "created_at": "2026-03-08T10:00:00Z",
    },
    {
        "id": "rec_3",
        "ad_account_id": "acc_1",
        "organization_id": "org_1",
        "rule_id": "budget_constrained",
        "type": "increase_budget",
        "severity": "opportunity",
        "title": "Campaign limited by budget",
        "description": "Campaign 'PMax - Products' is profitable (ROAS 3.5x) but losing 42% impression share to budget",
        "impact_estimate": {
            "monthly_savings": None,
            "potential_gain": 33,
            "summary": "Potential additional conversions: +33/month"
        },
        "affected_entity": {
            "type": "campaign",
            "id": "camp_3",
            "name": "PMax - Products",
            "campaign_id": "camp_3",
            "campaign_name": "PMax - Products"
        },
        "options": [
            {"id": 1, "label": "Conservative", "action": "increase_budget_20", "description": "Increase budget by 20%", "risk": "low"},
            {"id": 2, "label": "Moderate", "action": "increase_budget_50", "description": "Increase budget by 50%", "risk": "medium"},
            {"id": 3, "label": "Aggressive", "action": "increase_budget_100", "description": "Double budget", "risk": "medium"},
        ],
        "status": "pending",
        "confidence": 87,
        "expires_at": "2026-03-15T00:00:00Z",
        "created_at": "2026-03-08T10:00:00Z",
    },
    {
        "id": "rec_4",
        "ad_account_id": "acc_1",
        "organization_id": "org_1",
        "rule_id": "budget_constrained",
        "type": "increase_budget",
        "severity": "opportunity",
        "title": "Campaign limited by budget",
        "description": "Campaign 'Search - Non-Brand' is profitable (ROAS 2.8x) but losing 35% impression share to budget",
        "impact_estimate": {
            "monthly_savings": None,
            "potential_gain": 16,
            "summary": "Potential additional conversions: +16/month"
        },
        "affected_entity": {
            "type": "campaign",
            "id": "camp_1",
            "name": "Search - Non-Brand",
            "campaign_id": "camp_1",
            "campaign_name": "Search - Non-Brand"
        },
        "options": [
            {"id": 1, "label": "Conservative", "action": "increase_budget_20", "description": "Increase budget by 20%", "risk": "low"},
            {"id": 2, "label": "Moderate", "action": "increase_budget_50", "description": "Increase budget by 50%", "risk": "medium"},
            {"id": 3, "label": "Aggressive", "action": "increase_budget_100", "description": "Double budget", "risk": "medium"},
        ],
        "status": "pending",
        "confidence": 82,
        "expires_at": "2026-03-15T00:00:00Z",
        "created_at": "2026-03-08T10:00:00Z",
    },
    {
        "id": "rec_5",
        "ad_account_id": "acc_1",
        "organization_id": "org_1",
        "rule_id": "low_quality_score",
        "type": "reduce_bid",
        "severity": "warning",
        "title": "Low quality score keyword",
        "description": "Keyword 'free shipping products' has quality score 3/10 and CPC is 60% above average",
        "impact_estimate": {
            "monthly_savings": 28,
            "potential_gain": None,
            "summary": "Improve QS to reduce CPC by ~$28/month"
        },
        "affected_entity": {
            "type": "keyword",
            "id": "kw_3",
            "name": "free shipping products",
            "campaign_id": "camp_1",
            "campaign_name": "Search - Non-Brand"
        },
        "options": [
            {"id": 1, "label": "Improve landing page", "action": "improve_lp", "description": "Review landing page relevance", "risk": "low"},
            {"id": 2, "label": "Improve ad copy", "action": "improve_ad", "description": "Make ad more relevant to keyword", "risk": "low"},
            {"id": 3, "label": "Reduce bid", "action": "reduce_bid_20", "description": "Lower bid while improving QS", "risk": "low"},
        ],
        "status": "pending",
        "confidence": 78,
        "expires_at": "2026-03-15T00:00:00Z",
        "created_at": "2026-03-08T10:00:00Z",
    },
]
