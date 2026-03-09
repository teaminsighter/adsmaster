"""
Demo API endpoints - Returns mock data for demo mode.
Used when no real ad account is connected.
"""

from fastapi import APIRouter, Query
from datetime import datetime, timedelta
import random

from ..services.recommendations.ai_engine import AIRecommendationEngine

router = APIRouter(prefix="/api/v1/demo", tags=["demo"])

# Cache for AI-generated recommendations
_ai_recommendations_cache = None
_ai_recommendations_timestamp = None


# =============================================================================
# Mock Data Generators
# =============================================================================

def generate_date_range(days: int = 30):
    """Generate date strings for the last N days."""
    today = datetime.now()
    return [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]


DEMO_CAMPAIGNS = [
    {
        "id": "demo_camp_1",
        "name": "Search - Brand Keywords",
        "platform": "google",
        "status": "ENABLED",
        "type": "SEARCH",
        "budget_micros": 50_000_000,
        "budget_type": "DAILY",
        "spend_micros": 42_500_000,
        "impressions": 125000,
        "clicks": 4500,
        "conversions": 156,
        "ctr": 3.6,
        "cpc_micros": 9_444_444,
        "cpa_micros": 272_435_897,
        "roas": 5.2,
        "quality_score": 8,
    },
    {
        "id": "demo_camp_2",
        "name": "PMax - All Products",
        "platform": "google",
        "status": "ENABLED",
        "type": "PERFORMANCE_MAX",
        "budget_micros": 100_000_000,
        "budget_type": "DAILY",
        "spend_micros": 89_000_000,
        "impressions": 450000,
        "clicks": 8900,
        "conversions": 234,
        "ctr": 1.98,
        "cpc_micros": 10_000_000,
        "cpa_micros": 380_341_880,
        "roas": 4.8,
        "quality_score": None,
    },
    {
        "id": "demo_camp_3",
        "name": "Display - Remarketing",
        "platform": "google",
        "status": "ENABLED",
        "type": "DISPLAY",
        "budget_micros": 25_000_000,
        "budget_type": "DAILY",
        "spend_micros": 21_000_000,
        "impressions": 890000,
        "clicks": 2100,
        "conversions": 67,
        "ctr": 0.24,
        "cpc_micros": 10_000_000,
        "cpa_micros": 313_432_835,
        "roas": 3.9,
        "quality_score": 7,
    },
    {
        "id": "demo_camp_4",
        "name": "FB - Retargeting Warm",
        "platform": "meta",
        "status": "ENABLED",
        "type": "CONVERSIONS",
        "budget_micros": 40_000_000,
        "budget_type": "DAILY",
        "spend_micros": 38_500_000,
        "impressions": 320000,
        "clicks": 5600,
        "conversions": 89,
        "ctr": 1.75,
        "cpc_micros": 6_875_000,
        "cpa_micros": 432_584_269,
        "roas": 4.1,
        "quality_score": None,
    },
    {
        "id": "demo_camp_5",
        "name": "IG - Prospecting Lookalike",
        "platform": "meta",
        "status": "PAUSED",
        "type": "CONVERSIONS",
        "budget_micros": 30_000_000,
        "budget_type": "DAILY",
        "spend_micros": 28_000_000,
        "impressions": 280000,
        "clicks": 3200,
        "conversions": 45,
        "ctr": 1.14,
        "cpc_micros": 8_750_000,
        "cpa_micros": 622_222_222,
        "roas": 2.8,
        "quality_score": None,
    },
    {
        "id": "demo_camp_6",
        "name": "Search - Non-Brand Generic",
        "platform": "google",
        "status": "ENABLED",
        "type": "SEARCH",
        "budget_micros": 75_000_000,
        "budget_type": "DAILY",
        "spend_micros": 72_000_000,
        "impressions": 210000,
        "clicks": 6300,
        "conversions": 98,
        "ctr": 3.0,
        "cpc_micros": 11_428_571,
        "cpa_micros": 734_693_877,
        "roas": 3.2,
        "quality_score": 6,
    },
]

DEMO_RECOMMENDATIONS = [
    {
        "id": "demo_rec_1",
        "rule_id": "budget_pacing_fast",
        "type": "BUDGET",
        "severity": "critical",
        "title": "Budget exhausted by 2pm daily",
        "description": "Campaign 'Search - Brand Keywords' has spent 85% of daily budget by 2pm for the last 5 days. You're missing afternoon/evening traffic when CPCs are often lower.",
        "confidence": 94,
        "impact_estimate": {
            "monthly_savings": None,
            "potential_gain": 2340_000000,
            "summary": "+$2,340/mo potential revenue"
        },
        "affected_entity": {
            "type": "campaign",
            "id": "demo_camp_1",
            "name": "Search - Brand Keywords"
        },
        "options": [
            {"id": 1, "label": "Increase budget 25%", "action": "increase_budget", "description": "Raise daily budget from $50 to $62.50", "risk": "low"},
            {"id": 2, "label": "Enable ad scheduling", "action": "add_schedule", "description": "Pause ads 6am-10am when CPCs are highest", "risk": "medium"},
            {"id": 3, "label": "Lower bids 15%", "action": "decrease_bids", "description": "Reduce max CPC to spread budget throughout day", "risk": "medium"}
        ],
        "status": "pending",
        "created_at": (datetime.now() - timedelta(hours=2)).isoformat(),
        "expires_at": (datetime.now() + timedelta(days=7)).isoformat()
    },
    {
        "id": "demo_rec_2",
        "rule_id": "wasting_keywords",
        "type": "KEYWORDS",
        "severity": "critical",
        "title": "2 keywords wasting $632 with 0 conversions",
        "description": "Keywords 'free shipping products' and 'cheap widgets online' have spent $632 combined in the last 30 days with zero conversions.",
        "confidence": 100,
        "impact_estimate": {
            "monthly_savings": 632_000000,
            "potential_gain": None,
            "summary": "Save $632/mo"
        },
        "affected_entity": {
            "type": "keyword",
            "id": "demo_kw_1",
            "name": "free shipping products",
            "campaign_id": "demo_camp_6",
            "campaign_name": "Search - Non-Brand Generic"
        },
        "options": [
            {"id": 1, "label": "Pause keywords", "action": "pause_keywords", "description": "Stop spending on these keywords immediately", "risk": "low"},
            {"id": 2, "label": "Add as negatives", "action": "add_negatives", "description": "Add as negative keywords to prevent future matching", "risk": "low"}
        ],
        "status": "pending",
        "created_at": (datetime.now() - timedelta(hours=5)).isoformat(),
        "expires_at": (datetime.now() + timedelta(days=7)).isoformat()
    },
    {
        "id": "demo_rec_3",
        "rule_id": "low_quality_score",
        "type": "KEYWORDS",
        "severity": "warning",
        "title": "3 keywords with Quality Score below 5",
        "description": "Low Quality Scores are increasing your CPCs by an estimated 25-40%. Improving ad relevance and landing page experience can significantly reduce costs.",
        "confidence": 87,
        "impact_estimate": {
            "monthly_savings": 450_000000,
            "potential_gain": None,
            "summary": "Save up to $450/mo on CPCs"
        },
        "affected_entity": {
            "type": "keyword",
            "id": "demo_kw_2",
            "name": "cheap alternative to acme",
            "campaign_id": "demo_camp_6",
            "campaign_name": "Search - Non-Brand Generic"
        },
        "options": [
            {"id": 1, "label": "View improvement tips", "action": "view_tips", "description": "See specific recommendations for each keyword", "risk": "none"},
            {"id": 2, "label": "Pause low QS keywords", "action": "pause_keywords", "description": "Stop spending until improved", "risk": "medium"}
        ],
        "status": "pending",
        "created_at": (datetime.now() - timedelta(days=1)).isoformat(),
        "expires_at": (datetime.now() + timedelta(days=14)).isoformat()
    },
    {
        "id": "demo_rec_4",
        "rule_id": "high_cpa_campaign",
        "type": "PERFORMANCE",
        "severity": "warning",
        "title": "Campaign CPA 2.3x above account average",
        "description": "IG - Prospecting Lookalike has a CPA of $62.22 vs account average of $27.00. Consider pausing or restructuring.",
        "confidence": 91,
        "impact_estimate": {
            "monthly_savings": 780_000000,
            "potential_gain": None,
            "summary": "Save $780/mo by reallocating budget"
        },
        "affected_entity": {
            "type": "campaign",
            "id": "demo_camp_5",
            "name": "IG - Prospecting Lookalike"
        },
        "options": [
            {"id": 1, "label": "Pause campaign", "action": "pause_campaign", "description": "Stop spending on this underperforming campaign", "risk": "low"},
            {"id": 2, "label": "Reduce budget 50%", "action": "reduce_budget", "description": "Cut budget while testing optimizations", "risk": "low"},
            {"id": 3, "label": "Keep monitoring", "action": "snooze", "description": "Snooze this recommendation for 7 days", "risk": "none"}
        ],
        "status": "pending",
        "created_at": (datetime.now() - timedelta(days=2)).isoformat(),
        "expires_at": (datetime.now() + timedelta(days=7)).isoformat()
    },
    {
        "id": "demo_rec_5",
        "rule_id": "missing_extensions",
        "type": "ASSETS",
        "severity": "opportunity",
        "title": "Add sitelink extensions to improve CTR",
        "description": "Search - Non-Brand Generic is missing sitelink extensions. Adding them typically improves CTR by 10-15%.",
        "confidence": 85,
        "impact_estimate": {
            "monthly_savings": None,
            "potential_gain": 520_000000,
            "summary": "+$520/mo potential from higher CTR"
        },
        "affected_entity": {
            "type": "campaign",
            "id": "demo_camp_6",
            "name": "Search - Non-Brand Generic"
        },
        "options": [
            {"id": 1, "label": "Add sitelinks", "action": "add_extensions", "description": "Create 4 sitelink extensions", "risk": "none"},
            {"id": 2, "label": "Dismiss", "action": "dismiss", "description": "Not applicable for this campaign", "risk": "none"}
        ],
        "status": "pending",
        "created_at": (datetime.now() - timedelta(days=3)).isoformat(),
        "expires_at": (datetime.now() + timedelta(days=30)).isoformat()
    },
]

DEMO_KEYWORDS = [
    {"id": "kw_1", "text": "acme products", "match_type": "EXACT", "status": "ENABLED", "campaign": "Search - Brand Keywords", "impressions": 45000, "clicks": 1234, "conversions": 45, "spend_micros": 1234_000000, "cpa_micros": 27_420000, "quality_score": 10},
    {"id": "kw_2", "text": "buy acme online", "match_type": "PHRASE", "status": "ENABLED", "campaign": "Search - Brand Keywords", "impressions": 32000, "clicks": 987, "conversions": 38, "spend_micros": 1108_000000, "cpa_micros": 29_180000, "quality_score": 9},
    {"id": "kw_3", "text": "acme store near me", "match_type": "BROAD", "status": "ENABLED", "campaign": "Search - Brand Keywords", "impressions": 28000, "clicks": 654, "conversions": 28, "spend_micros": 875_000000, "cpa_micros": 31_250000, "quality_score": 8},
    {"id": "kw_4", "text": "cheap alternative to acme", "match_type": "BROAD", "status": "ENABLED", "campaign": "Search - Non-Brand Generic", "impressions": 18765, "clicks": 534, "conversions": 12, "spend_micros": 756_000000, "cpa_micros": 63_000000, "quality_score": 4},
    {"id": "kw_5", "text": "acme discount code", "match_type": "EXACT", "status": "ENABLED", "campaign": "Search - Brand Keywords", "impressions": 12000, "clicks": 456, "conversions": 23, "spend_micros": 523_000000, "cpa_micros": 22_739130, "quality_score": 9},
    {"id": "kw_6", "text": "free shipping products", "match_type": "BROAD", "status": "PAUSED", "campaign": "Search - Non-Brand Generic", "impressions": 8765, "clicks": 234, "conversions": 0, "spend_micros": 345_000000, "cpa_micros": 0, "quality_score": 3},
    {"id": "kw_7", "text": "cheap widgets online", "match_type": "BROAD", "status": "PAUSED", "campaign": "Search - Non-Brand Generic", "impressions": 6543, "clicks": 187, "conversions": 0, "spend_micros": 287_000000, "cpa_micros": 0, "quality_score": 4},
]


# =============================================================================
# Demo Endpoints
# =============================================================================

@router.get("/status")
async def demo_status():
    """Check if demo mode is active."""
    return {
        "demo_mode": True,
        "message": "No ad accounts connected. Showing demo data.",
        "features_available": [
            "dashboard",
            "campaigns",
            "recommendations",
            "analytics",
            "keywords"
        ]
    }


@router.get("/dashboard")
async def demo_dashboard():
    """Get demo dashboard data."""
    # Calculate totals from campaigns
    total_spend = sum(c["spend_micros"] for c in DEMO_CAMPAIGNS)
    total_impressions = sum(c["impressions"] for c in DEMO_CAMPAIGNS)
    total_clicks = sum(c["clicks"] for c in DEMO_CAMPAIGNS)
    total_conversions = sum(c["conversions"] for c in DEMO_CAMPAIGNS)

    # Generate chart data (last 14 days)
    dates = generate_date_range(14)
    chart_data = []
    base_spend = total_spend / 30
    for i, date in enumerate(reversed(dates)):
        variance = random.uniform(0.85, 1.15)
        chart_data.append({
            "date": date,
            "spend": int(base_spend * variance),
            "conversions": int((total_conversions / 30) * variance),
            "impressions": int((total_impressions / 30) * variance),
        })

    return {
        "demo_mode": True,
        "period": "last_30_days",
        "metrics": {
            "spend_micros": total_spend,
            "revenue_micros": int(total_spend * 4.1),  # ~4.1x ROAS
            "roas": 4.1,
            "conversions": total_conversions,
            "impressions": total_impressions,
            "clicks": total_clicks,
            "ctr": round((total_clicks / total_impressions) * 100, 2) if total_impressions > 0 else 0,
            "cpa_micros": int(total_spend / total_conversions) if total_conversions > 0 else 0,
        },
        "metrics_change": {
            "spend": 12.3,
            "revenue": 18.5,
            "roas": 0.3,
            "conversions": 22.1,
            "ctr": 0.15,
            "cpa": -8.2,
        },
        "health_score": {
            "overall": 82,
            "budget_utilization": 94,
            "quality_score": 61,
            "conversion_rate": 88,
        },
        "platform_breakdown": [
            {
                "platform": "google",
                "spend_micros": sum(c["spend_micros"] for c in DEMO_CAMPAIGNS if c["platform"] == "google"),
                "conversions": sum(c["conversions"] for c in DEMO_CAMPAIGNS if c["platform"] == "google"),
                "roas": 4.5,
            },
            {
                "platform": "meta",
                "spend_micros": sum(c["spend_micros"] for c in DEMO_CAMPAIGNS if c["platform"] == "meta"),
                "conversions": sum(c["conversions"] for c in DEMO_CAMPAIGNS if c["platform"] == "meta"),
                "roas": 3.4,
            },
        ],
        "chart_data": chart_data,
        "top_campaigns": sorted(DEMO_CAMPAIGNS, key=lambda x: x["conversions"], reverse=True)[:5],
        "pending_recommendations": len([r for r in DEMO_RECOMMENDATIONS if r["status"] == "pending"]),
        "ai_savings_this_month": 1247_000000,
    }


@router.get("/campaigns")
async def demo_campaigns(
    status: str = None,
    platform: str = None,
    sort_by: str = "spend_micros",
    sort_order: str = "desc"
):
    """Get demo campaigns list."""
    campaigns = DEMO_CAMPAIGNS.copy()

    # Filter
    if status:
        campaigns = [c for c in campaigns if c["status"] == status.upper()]
    if platform:
        campaigns = [c for c in campaigns if c["platform"] == platform.lower()]

    # Sort
    reverse = sort_order.lower() == "desc"
    if sort_by in campaigns[0]:
        campaigns = sorted(campaigns, key=lambda x: x.get(sort_by, 0) or 0, reverse=reverse)

    return {
        "demo_mode": True,
        "campaigns": campaigns,
        "total": len(campaigns),
        "filters": {
            "status": status,
            "platform": platform,
        }
    }


@router.get("/campaigns/{campaign_id}")
async def demo_campaign_detail(campaign_id: str):
    """Get demo campaign details."""
    campaign = next((c for c in DEMO_CAMPAIGNS if c["id"] == campaign_id), None)
    if not campaign:
        return {"error": "Campaign not found", "demo_mode": True}

    # Generate daily metrics for last 30 days
    dates = generate_date_range(30)
    daily_metrics = []
    for date in reversed(dates):
        variance = random.uniform(0.8, 1.2)
        daily_metrics.append({
            "date": date,
            "spend_micros": int((campaign["spend_micros"] / 30) * variance),
            "impressions": int((campaign["impressions"] / 30) * variance),
            "clicks": int((campaign["clicks"] / 30) * variance),
            "conversions": max(0, int((campaign["conversions"] / 30) * variance)),
        })

    # Get keywords for this campaign
    campaign_keywords = [k for k in DEMO_KEYWORDS if k["campaign"] == campaign["name"]]

    return {
        "demo_mode": True,
        "campaign": campaign,
        "daily_metrics": daily_metrics,
        "keywords": campaign_keywords,
        "ad_groups": [
            {"id": "ag_1", "name": "Ad Group 1", "status": "ENABLED", "keywords": 5},
            {"id": "ag_2", "name": "Ad Group 2", "status": "ENABLED", "keywords": 3},
        ]
    }


@router.get("/recommendations")
async def demo_recommendations(
    severity: str = None,
    status: str = None,
    limit: int = 20,
    use_ai: bool = Query(default=True, description="Use AI to generate recommendation text")
):
    """
    Get demo recommendations.

    When use_ai=True (default), generates recommendations with AI-powered text.
    When use_ai=False, uses static demo recommendations.
    """
    global _ai_recommendations_cache, _ai_recommendations_timestamp

    if use_ai:
        # Check cache (valid for 5 minutes)
        cache_valid = (
            _ai_recommendations_cache is not None and
            _ai_recommendations_timestamp is not None and
            (datetime.now() - _ai_recommendations_timestamp).seconds < 300
        )

        if not cache_valid:
            try:
                # Generate AI-powered recommendations
                engine = AIRecommendationEngine()
                ai_recs = await engine.generate_recommendations(
                    ad_account_id="demo_account",
                    organization_id="demo_org",
                    use_ai_text=True
                )
                _ai_recommendations_cache = ai_recs
                _ai_recommendations_timestamp = datetime.now()
            except Exception as e:
                print(f"AI recommendation generation failed: {e}")
                # Fallback to static recommendations
                _ai_recommendations_cache = None

        recs = _ai_recommendations_cache if _ai_recommendations_cache else DEMO_RECOMMENDATIONS.copy()
    else:
        recs = DEMO_RECOMMENDATIONS.copy()

    if severity:
        recs = [r for r in recs if r["severity"] == severity.lower()]
    if status:
        recs = [r for r in recs if r["status"] == status.lower()]

    recs = recs[:limit]

    # Calculate summary
    all_recs = _ai_recommendations_cache if _ai_recommendations_cache and use_ai else DEMO_RECOMMENDATIONS
    pending = [r for r in all_recs if r["status"] == "pending"]
    total_savings = sum(
        (r["impact_estimate"].get("monthly_savings") or 0)
        for r in pending
    )
    total_potential = sum(
        (r["impact_estimate"].get("potential_gain") or 0)
        for r in pending
    )

    return {
        "demo_mode": True,
        "ai_generated": use_ai and _ai_recommendations_cache is not None,
        "recommendations": recs,
        "total": len(recs),
        "summary": {
            "pending": len(pending),
            "by_severity": {
                "critical": len([r for r in pending if r["severity"] == "critical"]),
                "warning": len([r for r in pending if r["severity"] == "warning"]),
                "opportunity": len([r for r in pending if r["severity"] == "opportunity"]),
            },
            "total_savings_micros": total_savings,
            "total_potential_micros": total_potential,
        }
    }


@router.get("/recommendations/ai")
async def demo_ai_recommendations():
    """
    Generate fresh AI-powered recommendations.

    Forces regeneration (bypasses cache) and returns AI-generated recommendations.
    """
    global _ai_recommendations_cache, _ai_recommendations_timestamp

    try:
        engine = AIRecommendationEngine()
        ai_recs = await engine.generate_recommendations(
            ad_account_id="demo_account",
            organization_id="demo_org",
            use_ai_text=True
        )

        # Update cache
        _ai_recommendations_cache = ai_recs
        _ai_recommendations_timestamp = datetime.now()

        pending = [r for r in ai_recs if r["status"] == "pending"]
        total_savings = sum((r["impact_estimate"].get("monthly_savings") or 0) for r in pending)
        total_potential = sum((r["impact_estimate"].get("potential_gain") or 0) for r in pending)

        return {
            "demo_mode": True,
            "ai_generated": True,
            "ai_provider": engine.ai_provider.provider_name,
            "ai_model": engine.ai_provider.model,
            "recommendations": ai_recs,
            "total": len(ai_recs),
            "summary": {
                "pending": len(pending),
                "by_severity": {
                    "critical": len([r for r in pending if r["severity"] == "critical"]),
                    "warning": len([r for r in pending if r["severity"] == "warning"]),
                    "opportunity": len([r for r in pending if r["severity"] == "opportunity"]),
                },
                "total_savings_micros": total_savings,
                "total_potential_micros": total_potential,
            },
            "generated_at": datetime.now().isoformat()
        }

    except Exception as e:
        return {
            "demo_mode": True,
            "ai_generated": False,
            "error": str(e),
            "fallback": "Using static recommendations",
            "recommendations": DEMO_RECOMMENDATIONS,
        }


@router.post("/recommendations/{recommendation_id}/apply")
async def demo_apply_recommendation(recommendation_id: str, option_id: int = 1):
    """Demo apply recommendation (doesn't actually do anything)."""
    rec = next((r for r in DEMO_RECOMMENDATIONS if r["id"] == recommendation_id), None)
    if not rec:
        return {"error": "Recommendation not found", "demo_mode": True}

    option = next((o for o in rec["options"] if o["id"] == option_id), rec["options"][0])

    return {
        "demo_mode": True,
        "success": True,
        "message": f"Demo: Would apply '{option['label']}' to {rec['affected_entity']['name']}",
        "recommendation_id": recommendation_id,
        "action_taken": option["action"],
        "can_undo": True,
        "undo_expires_at": (datetime.now() + timedelta(hours=24)).isoformat()
    }


@router.post("/recommendations/{recommendation_id}/dismiss")
async def demo_dismiss_recommendation(recommendation_id: str, reason: str = None):
    """Demo dismiss recommendation."""
    return {
        "demo_mode": True,
        "success": True,
        "message": "Demo: Recommendation dismissed",
        "recommendation_id": recommendation_id,
    }


@router.get("/keywords")
async def demo_keywords(
    status: str = None,
    campaign: str = None,
    min_spend: int = None
):
    """Get demo keywords."""
    keywords = DEMO_KEYWORDS.copy()

    if status:
        keywords = [k for k in keywords if k["status"] == status.upper()]
    if campaign:
        keywords = [k for k in keywords if campaign.lower() in k["campaign"].lower()]
    if min_spend:
        keywords = [k for k in keywords if k["spend_micros"] >= min_spend]

    # Summary stats
    total_spend = sum(k["spend_micros"] for k in DEMO_KEYWORDS)
    avg_qs = sum(k["quality_score"] for k in DEMO_KEYWORDS) / len(DEMO_KEYWORDS)
    wasting = [k for k in DEMO_KEYWORDS if k["conversions"] == 0 and k["spend_micros"] > 200_000000]

    return {
        "demo_mode": True,
        "keywords": keywords,
        "total": len(keywords),
        "summary": {
            "total_keywords": len(DEMO_KEYWORDS),
            "enabled": len([k for k in DEMO_KEYWORDS if k["status"] == "ENABLED"]),
            "paused": len([k for k in DEMO_KEYWORDS if k["status"] == "PAUSED"]),
            "total_spend_micros": total_spend,
            "avg_quality_score": round(avg_qs, 1),
            "wasting_keywords": len(wasting),
            "wasting_spend_micros": sum(k["spend_micros"] for k in wasting),
        }
    }


@router.get("/analytics")
async def demo_analytics(period: str = "30d"):
    """Get demo analytics data."""
    days = {"7d": 7, "14d": 14, "30d": 30, "90d": 90}.get(period, 30)
    dates = generate_date_range(days)

    # Generate trend data
    trend_data = []
    for i, date in enumerate(reversed(dates)):
        # Simulate upward trend with variance
        base_multiplier = 1 + (i / days) * 0.3  # 30% growth over period
        variance = random.uniform(0.9, 1.1)
        trend_data.append({
            "date": date,
            "spend_micros": int(10_000_000 * base_multiplier * variance),
            "revenue_micros": int(41_000_000 * base_multiplier * variance),
            "conversions": int(40 * base_multiplier * variance),
            "roas": round(4.1 * variance, 2),
        })

    total_spend = sum(c["spend_micros"] for c in DEMO_CAMPAIGNS)
    total_conversions = sum(c["conversions"] for c in DEMO_CAMPAIGNS)

    return {
        "demo_mode": True,
        "period": period,
        "overview": {
            "spend_micros": total_spend,
            "revenue_micros": int(total_spend * 4.1),
            "roas": 4.1,
            "conversions": total_conversions,
            "cpa_micros": int(total_spend / total_conversions) if total_conversions > 0 else 0,
            "clicks": sum(c["clicks"] for c in DEMO_CAMPAIGNS),
            "impressions": sum(c["impressions"] for c in DEMO_CAMPAIGNS),
            "ctr": 2.28,
        },
        "changes": {
            "spend": 12.3,
            "revenue": 18.5,
            "roas": 0.3,
            "conversions": 22.1,
            "cpa": -8.2,
            "ctr": 0.15,
        },
        "trend_data": trend_data,
        "platform_breakdown": [
            {"platform": "google", "spend_micros": 224_500_000, "conversions": 555, "roas": 4.5},
            {"platform": "meta", "spend_micros": 66_500_000, "conversions": 134, "roas": 3.4},
        ],
        "top_campaigns": sorted(DEMO_CAMPAIGNS, key=lambda x: x["roas"], reverse=True)[:5],
        "campaign_type_breakdown": [
            {"type": "SEARCH", "spend_micros": 114_500_000, "conversions": 254},
            {"type": "PERFORMANCE_MAX", "spend_micros": 89_000_000, "conversions": 234},
            {"type": "DISPLAY", "spend_micros": 21_000_000, "conversions": 67},
            {"type": "CONVERSIONS", "spend_micros": 66_500_000, "conversions": 134},
        ]
    }


@router.get("/accounts")
async def demo_accounts():
    """Get demo connected accounts."""
    return {
        "demo_mode": True,
        "accounts": [
            {
                "id": "demo_google_1",
                "platform": "google",
                "name": "Acme Corp - Google Ads",
                "external_id": "123-456-7890",
                "status": "active",
                "currency": "USD",
                "timezone": "America/Los_Angeles",
                "last_sync": datetime.now().isoformat(),
                "spend_30d_micros": 224_500_000,
            },
            {
                "id": "demo_meta_1",
                "platform": "meta",
                "name": "Acme Corp - Meta Ads",
                "external_id": "act_9876543210",
                "status": "active",
                "currency": "USD",
                "timezone": "America/Los_Angeles",
                "last_sync": datetime.now().isoformat(),
                "spend_30d_micros": 66_500_000,
            }
        ],
        "total": 2
    }
