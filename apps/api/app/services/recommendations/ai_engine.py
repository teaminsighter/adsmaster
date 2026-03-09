"""
AI-Enhanced Recommendation Engine.

Uses LLM to generate better recommendation text:
- Human-readable titles
- Detailed descriptions with context
- Actionable impact summaries
- Smart options based on risk tolerance
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from uuid import uuid4
import asyncio
import json

from .rules import RULES, Rule, Severity
from ..ai import get_ai_provider, AIProviderType
from ..ai.base import AIMessage, MessageRole


class AIRecommendationEngine:
    """
    AI-powered recommendation engine.

    Combines rule-based detection with LLM-generated text.
    """

    def __init__(
        self,
        ai_provider_type: Optional[AIProviderType] = None,
        supabase_client=None
    ):
        self.supabase = supabase_client
        self.ai_provider = get_ai_provider(provider_type=ai_provider_type)

    async def generate_recommendations(
        self,
        ad_account_id: str,
        organization_id: str,
        use_ai_text: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Generate AI-enhanced recommendations for an ad account.

        Args:
            ad_account_id: Account to analyze
            organization_id: Organization ID
            use_ai_text: Whether to use AI for text generation

        Returns:
            List of recommendation objects with AI-generated text
        """
        recommendations = []

        # Get keywords with metrics
        keywords = await self._get_keywords_with_metrics(ad_account_id)
        for keyword in keywords:
            for rule in RULES:
                if rule.type.value in ["pause_keyword", "reduce_bid"]:
                    if rule.check(keyword):
                        rec = await self._create_ai_recommendation(
                            rule=rule,
                            entity=keyword,
                            entity_type="keyword",
                            ad_account_id=ad_account_id,
                            organization_id=organization_id,
                            use_ai_text=use_ai_text
                        )
                        recommendations.append(rec)

        # Get campaigns with metrics
        campaigns = await self._get_campaigns_with_metrics(ad_account_id)
        for campaign in campaigns:
            for rule in RULES:
                if rule.type.value in ["increase_budget", "fix_tracking"]:
                    if rule.check(campaign):
                        rec = await self._create_ai_recommendation(
                            rule=rule,
                            entity=campaign,
                            entity_type="campaign",
                            ad_account_id=ad_account_id,
                            organization_id=organization_id,
                            use_ai_text=use_ai_text
                        )
                        recommendations.append(rec)

        # Deduplicate and prioritize
        recommendations = self._prioritize(recommendations)

        return recommendations

    async def _create_ai_recommendation(
        self,
        rule: Rule,
        entity: Dict[str, Any],
        entity_type: str,
        ad_account_id: str,
        organization_id: str,
        use_ai_text: bool = True
    ) -> Dict[str, Any]:
        """Create a recommendation with AI-generated text."""
        impact = rule.calculate_impact(entity)
        options = rule.get_options(entity)

        # Generate AI text or use templates
        if use_ai_text:
            ai_text = await self._generate_ai_text(rule, entity, entity_type, impact)
            title = ai_text.get("title", rule.name)
            description = ai_text.get("description", self._format_description(rule, entity, entity_type))
            impact_summary = ai_text.get("impact_summary", rule.impact_template.format(impact=impact))
        else:
            title = rule.name
            description = self._format_description(rule, entity, entity_type)
            impact_summary = rule.impact_template.format(impact=impact)

        return {
            "id": str(uuid4()),
            "ad_account_id": ad_account_id,
            "organization_id": organization_id,
            "rule_id": rule.id,
            "type": rule.type.value,
            "severity": rule.severity.value,
            "title": title,
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
            "ai_generated": use_ai_text,
            "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "created_at": datetime.utcnow().isoformat(),
        }

    async def _generate_ai_text(
        self,
        rule: Rule,
        entity: Dict[str, Any],
        entity_type: str,
        impact: float
    ) -> Dict[str, str]:
        """Generate recommendation text using AI."""
        try:
            system_prompt = """You are an expert Google Ads and Meta Ads optimizer.
Generate clear, actionable recommendation text for advertising managers.
Be specific with numbers. Be concise but impactful.
Output ONLY valid JSON with these exact keys: title, description, impact_summary"""

            entity_name = entity.get("text") or entity.get("name", "Unknown")
            metrics_info = self._format_metrics_for_ai(entity, entity_type)

            prompt = f"""Generate recommendation text for this advertising issue:

Rule Type: {rule.type.value}
Severity: {rule.severity.value}
Entity Type: {entity_type}
Entity Name: {entity_name}
Metrics: {metrics_info}
Estimated Impact: ${impact:.2f}/month

Generate JSON with:
- title: Action-oriented headline (max 8 words)
- description: Specific problem explanation with numbers (max 40 words)
- impact_summary: Brief benefit statement (max 10 words)

Output valid JSON only, no markdown:"""

            response = await self.ai_provider.generate_text(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3,
                max_tokens=300
            )

            # Parse JSON response - be flexible with format
            clean = response.strip()

            # Remove markdown code blocks
            if "```json" in clean:
                clean = clean.split("```json")[1].split("```")[0]
            elif "```" in clean:
                parts = clean.split("```")
                clean = parts[1] if len(parts) > 1 else parts[0]

            # Try to find JSON object
            start = clean.find("{")
            end = clean.rfind("}") + 1
            if start >= 0 and end > start:
                clean = clean[start:end]

            result = json.loads(clean)

            # Validate required keys
            if not all(k in result for k in ["title", "description", "impact_summary"]):
                raise ValueError("Missing required keys")

            return result

        except Exception as e:
            # Fallback to template-based text
            print(f"AI text generation failed: {e}")
            return {
                "title": rule.name,
                "description": self._format_description(rule, entity, entity_type),
                "impact_summary": rule.impact_template.format(impact=impact)
            }

    def _format_metrics_for_ai(self, entity: Dict[str, Any], entity_type: str) -> str:
        """Format entity metrics for AI prompt."""
        if entity_type == "keyword":
            return f"""
- Spend (7d): ${entity.get('spend_7d', 0):.2f}
- Conversions (7d): {entity.get('conversions_7d', 0)}
- Clicks (7d): {entity.get('clicks_7d', 0)}
- Impressions (7d): {entity.get('impressions_7d', 0)}
- Quality Score: {entity.get('quality_score', 'N/A')}/10
- CPC vs Average: {entity.get('cpc_vs_avg', 0):+.0f}%"""
        else:
            return f"""
- ROAS: {entity.get('roas', 0):.1f}x
- Conversions (7d): {entity.get('conversions_7d', 0)}
- Conversions (prev 7d): {entity.get('conversions_prev_7d', 0)}
- Impression Share Lost to Budget: {entity.get('impression_share_lost_to_budget', 0)}%
- Clicks (7d): {entity.get('clicks_7d', 0)}"""

    def _format_description(self, rule: Rule, entity: Dict[str, Any], entity_type: str) -> str:
        """Format description using template."""
        try:
            if entity_type == "keyword":
                return rule.description_template.format(
                    keyword=entity.get("text", "Unknown"),
                    spend=entity.get("spend_7d", 0),
                    qs=entity.get("quality_score", 0),
                    cpc_pct=entity.get("cpc_vs_avg", 0)
                )
            else:
                return rule.description_template.format(
                    campaign=entity.get("name", "Unknown"),
                    roas=entity.get("roas", 0),
                    is_lost=entity.get("impression_share_lost_to_budget", 0),
                    prev_conv=entity.get("conversions_prev_7d", 0),
                    clicks=entity.get("clicks_7d", 0)
                )
        except KeyError:
            return f"Review {entity.get('text') or entity.get('name', 'this entity')} for optimization opportunities."

    def _calculate_confidence(self, rule: Rule, entity: Dict[str, Any]) -> int:
        """Calculate confidence score 0-100."""
        base = {
            Severity.CRITICAL: 95,
            Severity.WARNING: 85,
            Severity.OPPORTUNITY: 75,
            Severity.INFO: 65,
        }.get(rule.severity, 70)

        impressions = entity.get("impressions_7d", 0)
        if impressions > 10000:
            base += 5
        elif impressions < 1000:
            base -= 10

        return min(100, max(50, base))

    def _prioritize(self, recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sort recommendations by severity and impact."""
        severity_order = {"critical": 0, "warning": 1, "opportunity": 2, "info": 3}

        def sort_key(rec):
            sev = severity_order.get(rec["severity"], 99)
            impact = (
                rec["impact_estimate"].get("monthly_savings") or
                rec["impact_estimate"].get("potential_gain") or
                0
            )
            return (sev, -impact)

        return sorted(recommendations, key=sort_key)[:50]

    async def _get_keywords_with_metrics(self, ad_account_id: str) -> List[Dict[str, Any]]:
        """Get keywords with metrics (mock data for demo)."""
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
        ]

    async def _get_campaigns_with_metrics(self, ad_account_id: str) -> List[Dict[str, Any]]:
        """Get campaigns with metrics (mock data for demo)."""
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


async def generate_ai_recommendations_for_demo() -> List[Dict[str, Any]]:
    """
    Generate AI-powered recommendations for demo mode.

    Called by the demo API endpoint.
    """
    engine = AIRecommendationEngine()
    recommendations = await engine.generate_recommendations(
        ad_account_id="demo_account",
        organization_id="demo_org",
        use_ai_text=True
    )
    return recommendations
