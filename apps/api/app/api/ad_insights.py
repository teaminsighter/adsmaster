"""Ad Insights API - Cross-platform campaign analytics.

Provides unified insights across Google Ads and Meta Ads including:
- Combined metrics (spend, conversions, ROAS)
- Platform comparison
- Campaign performance trends
- Audience insights
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .user_auth import get_current_user
from ..services.supabase_client import get_supabase_client as get_supabase


router = APIRouter(prefix="/api/v1/analytics/insights", tags=["Ad Insights"])


# ============================================================================
# Models
# ============================================================================

class PlatformMetrics(BaseModel):
    """Metrics for a single platform."""
    platform: str
    spend_micros: int = 0
    revenue_micros: int = 0
    conversions: int = 0
    clicks: int = 0
    impressions: int = 0
    roas: float = 0.0
    ctr: float = 0.0
    cpc_micros: int = 0
    cpa_micros: int = 0


class CombinedMetrics(BaseModel):
    """Combined metrics across all platforms."""
    total_spend_micros: int = 0
    total_revenue_micros: int = 0
    total_conversions: int = 0
    total_clicks: int = 0
    total_impressions: int = 0
    blended_roas: float = 0.0
    blended_ctr: float = 0.0
    blended_cpc_micros: int = 0
    blended_cpa_micros: int = 0


class CampaignInsight(BaseModel):
    """Insights for a single campaign."""
    campaign_id: str
    campaign_name: str
    platform: str
    status: str
    spend_micros: int = 0
    revenue_micros: int = 0
    conversions: int = 0
    roas: float = 0.0
    spend_change_pct: Optional[float] = None
    roas_change_pct: Optional[float] = None
    recommendation: Optional[str] = None
    health_score: Optional[int] = None


class AudienceInsight(BaseModel):
    """Audience performance insights."""
    audience_name: str
    audience_type: str  # interest, custom, lookalike, remarketing
    platform: str
    reach: int = 0
    spend_micros: int = 0
    conversions: int = 0
    cpa_micros: int = 0
    conversion_rate: float = 0.0


class TrendPoint(BaseModel):
    """Single data point in a time series."""
    date: str
    spend_micros: int = 0
    revenue_micros: int = 0
    conversions: int = 0
    roas: float = 0.0


class InsightsOverview(BaseModel):
    """Complete insights overview response."""
    date_from: str
    date_to: str
    combined: CombinedMetrics
    by_platform: List[PlatformMetrics]
    top_campaigns: List[CampaignInsight]
    trends: List[TrendPoint]
    insights_summary: List[str]


class PlatformComparison(BaseModel):
    """Platform comparison data."""
    google: PlatformMetrics
    meta: PlatformMetrics
    winner_spend_efficiency: str
    winner_conversions: str
    winner_roas: str
    recommendations: List[str]


class CampaignBreakdown(BaseModel):
    """Detailed campaign breakdown."""
    campaigns: List[CampaignInsight]
    total: int
    summary: Dict[str, Any]


# ============================================================================
# Helper Functions
# ============================================================================

def calculate_roas(revenue: int, spend: int) -> float:
    """Calculate ROAS from micros."""
    if spend == 0:
        return 0.0
    return round(revenue / spend, 2)


def calculate_ctr(clicks: int, impressions: int) -> float:
    """Calculate CTR percentage."""
    if impressions == 0:
        return 0.0
    return round((clicks / impressions) * 100, 2)


def calculate_cpc(spend: int, clicks: int) -> int:
    """Calculate CPC in micros."""
    if clicks == 0:
        return 0
    return int(spend / clicks)


def calculate_cpa(spend: int, conversions: int) -> int:
    """Calculate CPA in micros."""
    if conversions == 0:
        return 0
    return int(spend / conversions)


def generate_insights(combined: CombinedMetrics, by_platform: List[PlatformMetrics]) -> List[str]:
    """Generate actionable insights from metrics."""
    insights = []

    # ROAS insights
    if combined.blended_roas >= 4:
        insights.append("Strong ROAS performance across all platforms. Consider scaling budget.")
    elif combined.blended_roas < 2 and combined.total_spend_micros > 1000_000_000:
        insights.append("ROAS below target. Review underperforming campaigns for optimization.")

    # Platform comparison
    if len(by_platform) >= 2:
        google = next((p for p in by_platform if p.platform == 'google'), None)
        meta = next((p for p in by_platform if p.platform == 'meta'), None)

        if google and meta:
            if google.roas > meta.roas * 1.5:
                insights.append("Google Ads outperforming Meta by 50%+ on ROAS. Consider budget reallocation.")
            elif meta.roas > google.roas * 1.5:
                insights.append("Meta Ads outperforming Google by 50%+ on ROAS. Consider budget reallocation.")

            if google.cpa_micros > 0 and meta.cpa_micros > 0:
                if google.cpa_micros < meta.cpa_micros * 0.7:
                    insights.append("Google Ads has 30%+ lower CPA than Meta. More efficient for conversions.")
                elif meta.cpa_micros < google.cpa_micros * 0.7:
                    insights.append("Meta Ads has 30%+ lower CPA than Google. More efficient for conversions.")

    # Spend pacing
    if combined.total_spend_micros < 100_000_000:  # Less than $100
        insights.append("Low ad spend detected. Ensure budget is properly allocated.")

    # CTR insights
    if combined.blended_ctr < 1.0:
        insights.append("Below-average CTR. Review ad creatives and targeting.")
    elif combined.blended_ctr > 3.0:
        insights.append("Excellent CTR performance. Ads are resonating well with audience.")

    return insights[:5]  # Return top 5 insights


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/overview", response_model=InsightsOverview)
async def get_insights_overview(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    account_ids: Optional[str] = Query(None, description="Comma-separated account IDs"),
):
    """Get comprehensive ad insights overview across all platforms."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default to last 30 days
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    account_id_list = account_ids.split(",") if account_ids else None

    # Get campaign metrics from database
    query = supabase.table("campaign_metrics").select(
        "campaign_id, platform, date, spend_micros, revenue_micros, conversions, clicks, impressions"
    ).gte("date", date_from).lte("date", date_to)

    # Filter by accounts if specified
    if account_id_list:
        query = query.in_("account_id", account_id_list)

    # Get org's accounts
    accounts_result = supabase.table("ad_accounts").select("id").eq(
        "organization_id", org_id
    ).execute()
    org_account_ids = [a["id"] for a in accounts_result.data]

    if org_account_ids:
        query = query.in_("account_id", org_account_ids)

    result = query.execute()
    metrics_data = result.data or []

    # Aggregate by platform
    platform_totals: Dict[str, Dict] = {}
    daily_totals: Dict[str, Dict] = {}

    for row in metrics_data:
        platform = row.get("platform", "google")
        date = row.get("date", "")

        if platform not in platform_totals:
            platform_totals[platform] = {
                "spend": 0, "revenue": 0, "conversions": 0, "clicks": 0, "impressions": 0
            }

        platform_totals[platform]["spend"] += row.get("spend_micros", 0)
        platform_totals[platform]["revenue"] += row.get("revenue_micros", 0)
        platform_totals[platform]["conversions"] += row.get("conversions", 0)
        platform_totals[platform]["clicks"] += row.get("clicks", 0)
        platform_totals[platform]["impressions"] += row.get("impressions", 0)

        # Daily aggregation for trends
        if date not in daily_totals:
            daily_totals[date] = {"spend": 0, "revenue": 0, "conversions": 0}
        daily_totals[date]["spend"] += row.get("spend_micros", 0)
        daily_totals[date]["revenue"] += row.get("revenue_micros", 0)
        daily_totals[date]["conversions"] += row.get("conversions", 0)

    # Build platform metrics
    by_platform = []
    total_spend = 0
    total_revenue = 0
    total_conversions = 0
    total_clicks = 0
    total_impressions = 0

    for platform, totals in platform_totals.items():
        pm = PlatformMetrics(
            platform=platform,
            spend_micros=totals["spend"],
            revenue_micros=totals["revenue"],
            conversions=totals["conversions"],
            clicks=totals["clicks"],
            impressions=totals["impressions"],
            roas=calculate_roas(totals["revenue"], totals["spend"]),
            ctr=calculate_ctr(totals["clicks"], totals["impressions"]),
            cpc_micros=calculate_cpc(totals["spend"], totals["clicks"]),
            cpa_micros=calculate_cpa(totals["spend"], totals["conversions"]),
        )
        by_platform.append(pm)

        total_spend += totals["spend"]
        total_revenue += totals["revenue"]
        total_conversions += totals["conversions"]
        total_clicks += totals["clicks"]
        total_impressions += totals["impressions"]

    # Combined metrics
    combined = CombinedMetrics(
        total_spend_micros=total_spend,
        total_revenue_micros=total_revenue,
        total_conversions=total_conversions,
        total_clicks=total_clicks,
        total_impressions=total_impressions,
        blended_roas=calculate_roas(total_revenue, total_spend),
        blended_ctr=calculate_ctr(total_clicks, total_impressions),
        blended_cpc_micros=calculate_cpc(total_spend, total_clicks),
        blended_cpa_micros=calculate_cpa(total_spend, total_conversions),
    )

    # Build trends
    trends = []
    for date in sorted(daily_totals.keys()):
        d = daily_totals[date]
        trends.append(TrendPoint(
            date=date,
            spend_micros=d["spend"],
            revenue_micros=d["revenue"],
            conversions=d["conversions"],
            roas=calculate_roas(d["revenue"], d["spend"]),
        ))

    # Get top campaigns
    campaigns_query = supabase.table("campaigns").select(
        "id, name, platform, status"
    )
    if org_account_ids:
        campaigns_query = campaigns_query.in_("account_id", org_account_ids)
    campaigns_result = campaigns_query.limit(10).execute()

    top_campaigns = []
    for camp in campaigns_result.data or []:
        # Sum metrics for this campaign
        camp_metrics = [m for m in metrics_data if m.get("campaign_id") == camp["id"]]
        camp_spend = sum(m.get("spend_micros", 0) for m in camp_metrics)
        camp_revenue = sum(m.get("revenue_micros", 0) for m in camp_metrics)
        camp_conv = sum(m.get("conversions", 0) for m in camp_metrics)

        top_campaigns.append(CampaignInsight(
            campaign_id=camp["id"],
            campaign_name=camp["name"],
            platform=camp.get("platform", "google"),
            status=camp.get("status", "active"),
            spend_micros=camp_spend,
            revenue_micros=camp_revenue,
            conversions=camp_conv,
            roas=calculate_roas(camp_revenue, camp_spend),
        ))

    # Sort by spend
    top_campaigns.sort(key=lambda x: x.spend_micros, reverse=True)
    top_campaigns = top_campaigns[:10]

    # Generate insights
    insights_summary = generate_insights(combined, by_platform)

    return InsightsOverview(
        date_from=date_from,
        date_to=date_to,
        combined=combined,
        by_platform=by_platform,
        top_campaigns=top_campaigns,
        trends=trends[-30:],  # Last 30 days
        insights_summary=insights_summary,
    )


@router.get("/platform-comparison", response_model=PlatformComparison)
async def compare_platforms(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Compare performance between Google Ads and Meta Ads."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default to last 30 days
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get org's accounts
    accounts_result = supabase.table("ad_accounts").select("id, platform").eq(
        "organization_id", org_id
    ).execute()

    account_map = {a["id"]: a["platform"] for a in accounts_result.data}
    org_account_ids = list(account_map.keys())

    if not org_account_ids:
        # Return empty comparison
        empty = PlatformMetrics(platform="google")
        return PlatformComparison(
            google=empty,
            meta=PlatformMetrics(platform="meta"),
            winner_spend_efficiency="tie",
            winner_conversions="tie",
            winner_roas="tie",
            recommendations=["Connect ad accounts to see platform comparison."],
        )

    # Get metrics
    result = supabase.table("campaign_metrics").select(
        "account_id, spend_micros, revenue_micros, conversions, clicks, impressions"
    ).gte("date", date_from).lte("date", date_to).in_(
        "account_id", org_account_ids
    ).execute()

    # Aggregate by platform
    google_totals = {"spend": 0, "revenue": 0, "conversions": 0, "clicks": 0, "impressions": 0}
    meta_totals = {"spend": 0, "revenue": 0, "conversions": 0, "clicks": 0, "impressions": 0}

    for row in result.data or []:
        platform = account_map.get(row.get("account_id"), "google")
        totals = google_totals if platform == "google" else meta_totals

        totals["spend"] += row.get("spend_micros", 0)
        totals["revenue"] += row.get("revenue_micros", 0)
        totals["conversions"] += row.get("conversions", 0)
        totals["clicks"] += row.get("clicks", 0)
        totals["impressions"] += row.get("impressions", 0)

    google = PlatformMetrics(
        platform="google",
        spend_micros=google_totals["spend"],
        revenue_micros=google_totals["revenue"],
        conversions=google_totals["conversions"],
        clicks=google_totals["clicks"],
        impressions=google_totals["impressions"],
        roas=calculate_roas(google_totals["revenue"], google_totals["spend"]),
        ctr=calculate_ctr(google_totals["clicks"], google_totals["impressions"]),
        cpc_micros=calculate_cpc(google_totals["spend"], google_totals["clicks"]),
        cpa_micros=calculate_cpa(google_totals["spend"], google_totals["conversions"]),
    )

    meta = PlatformMetrics(
        platform="meta",
        spend_micros=meta_totals["spend"],
        revenue_micros=meta_totals["revenue"],
        conversions=meta_totals["conversions"],
        clicks=meta_totals["clicks"],
        impressions=meta_totals["impressions"],
        roas=calculate_roas(meta_totals["revenue"], meta_totals["spend"]),
        ctr=calculate_ctr(meta_totals["clicks"], meta_totals["impressions"]),
        cpc_micros=calculate_cpc(meta_totals["spend"], meta_totals["clicks"]),
        cpa_micros=calculate_cpa(meta_totals["spend"], meta_totals["conversions"]),
    )

    # Determine winners
    winner_efficiency = "google" if google.cpa_micros < meta.cpa_micros and google.cpa_micros > 0 else "meta" if meta.cpa_micros > 0 else "tie"
    winner_conversions = "google" if google.conversions > meta.conversions else "meta" if meta.conversions > google.conversions else "tie"
    winner_roas = "google" if google.roas > meta.roas else "meta" if meta.roas > google.roas else "tie"

    # Generate recommendations
    recommendations = []
    if google.roas > meta.roas * 1.3 and google.spend_micros > 0:
        recommendations.append("Google Ads showing better ROAS. Consider shifting 10-20% budget from Meta.")
    elif meta.roas > google.roas * 1.3 and meta.spend_micros > 0:
        recommendations.append("Meta Ads showing better ROAS. Consider shifting 10-20% budget from Google.")

    if google.ctr > meta.ctr * 1.5:
        recommendations.append("Google ads have higher engagement. Review Meta ad creatives.")
    elif meta.ctr > google.ctr * 1.5:
        recommendations.append("Meta ads have higher engagement. Review Google ad copy.")

    if not recommendations:
        recommendations.append("Platforms are performing similarly. Continue monitoring for changes.")

    return PlatformComparison(
        google=google,
        meta=meta,
        winner_spend_efficiency=winner_efficiency,
        winner_conversions=winner_conversions,
        winner_roas=winner_roas,
        recommendations=recommendations,
    )


@router.get("/campaigns", response_model=CampaignBreakdown)
async def get_campaign_breakdown(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    platform: Optional[str] = Query(None, description="Filter by platform: google or meta"),
    status: Optional[str] = Query(None, description="Filter by status: active, paused, etc."),
    sort_by: str = Query("spend", description="Sort by: spend, roas, conversions, ctr"),
    sort_dir: str = Query("desc"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Get detailed campaign performance breakdown."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default to last 30 days
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get org's accounts
    accounts_result = supabase.table("ad_accounts").select("id, platform").eq(
        "organization_id", org_id
    ).execute()

    org_account_ids = [a["id"] for a in accounts_result.data]

    if not org_account_ids:
        return CampaignBreakdown(campaigns=[], total=0, summary={})

    # Get campaigns
    campaigns_query = supabase.table("campaigns").select("*").in_(
        "account_id", org_account_ids
    )

    if platform:
        campaigns_query = campaigns_query.eq("platform", platform)
    if status:
        campaigns_query = campaigns_query.eq("status", status)

    campaigns_result = campaigns_query.execute()

    # Get metrics for date range
    metrics_result = supabase.table("campaign_metrics").select(
        "campaign_id, spend_micros, revenue_micros, conversions, clicks, impressions"
    ).gte("date", date_from).lte("date", date_to).in_(
        "account_id", org_account_ids
    ).execute()

    # Aggregate metrics by campaign
    campaign_metrics: Dict[str, Dict] = {}
    for row in metrics_result.data or []:
        cid = row.get("campaign_id")
        if cid not in campaign_metrics:
            campaign_metrics[cid] = {"spend": 0, "revenue": 0, "conversions": 0, "clicks": 0, "impressions": 0}
        campaign_metrics[cid]["spend"] += row.get("spend_micros", 0)
        campaign_metrics[cid]["revenue"] += row.get("revenue_micros", 0)
        campaign_metrics[cid]["conversions"] += row.get("conversions", 0)
        campaign_metrics[cid]["clicks"] += row.get("clicks", 0)
        campaign_metrics[cid]["impressions"] += row.get("impressions", 0)

    # Build campaign insights
    campaigns = []
    for camp in campaigns_result.data or []:
        cid = camp["id"]
        metrics = campaign_metrics.get(cid, {})

        spend = metrics.get("spend", 0)
        revenue = metrics.get("revenue", 0)
        conversions = metrics.get("conversions", 0)

        campaigns.append(CampaignInsight(
            campaign_id=cid,
            campaign_name=camp["name"],
            platform=camp.get("platform", "google"),
            status=camp.get("status", "active"),
            spend_micros=spend,
            revenue_micros=revenue,
            conversions=conversions,
            roas=calculate_roas(revenue, spend),
        ))

    # Sort
    sort_key_map = {
        "spend": lambda x: x.spend_micros,
        "roas": lambda x: x.roas,
        "conversions": lambda x: x.conversions,
        "revenue": lambda x: x.revenue_micros,
    }
    sort_func = sort_key_map.get(sort_by, sort_key_map["spend"])
    campaigns.sort(key=sort_func, reverse=(sort_dir.lower() == "desc"))

    total = len(campaigns)
    campaigns = campaigns[offset:offset + limit]

    # Summary
    summary = {
        "total_campaigns": total,
        "active_campaigns": len([c for c in campaigns_result.data if c.get("status") == "active"]),
        "total_spend": sum(c.spend_micros for c in campaigns),
        "total_conversions": sum(c.conversions for c in campaigns),
    }

    return CampaignBreakdown(campaigns=campaigns, total=total, summary=summary)


@router.get("/audiences")
async def get_audience_insights(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
):
    """Get audience performance insights."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Get audiences from database
    query = supabase.table("audiences").select("*").eq("organization_id", org_id)
    if platform:
        query = query.eq("platform", platform)
    query = query.limit(limit)

    result = query.execute()

    audiences = []
    for aud in result.data or []:
        audiences.append(AudienceInsight(
            audience_name=aud.get("name", "Unknown"),
            audience_type=aud.get("audience_type", "custom"),
            platform=aud.get("platform", "google"),
            reach=aud.get("size_estimate", 0),
            spend_micros=0,  # Would need to join with ad set data
            conversions=0,
            cpa_micros=0,
            conversion_rate=0.0,
        ))

    return {"audiences": audiences, "total": len(audiences)}


@router.get("/funnel")
async def get_conversion_funnel(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Get conversion funnel analytics."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default to last 30 days
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get tracking events for funnel
    events_result = supabase.table("tracking_events").select(
        "event_type"
    ).eq("organization_id", org_id).gte(
        "timestamp", f"{date_from}T00:00:00Z"
    ).lte("timestamp", f"{date_to}T23:59:59Z").limit(10000).execute()

    # Count by event type
    event_counts: Dict[str, int] = {}
    for e in events_result.data or []:
        et = e.get("event_type", "unknown")
        event_counts[et] = event_counts.get(et, 0) + 1

    # Get conversions
    conv_result = supabase.table("offline_conversions").select(
        "conversion_type"
    ).eq("organization_id", org_id).gte(
        "occurred_at", f"{date_from}T00:00:00Z"
    ).lte("occurred_at", f"{date_to}T23:59:59Z").execute()

    conversion_counts: Dict[str, int] = {}
    for c in conv_result.data or []:
        ct = c.get("conversion_type", "unknown")
        conversion_counts[ct] = conversion_counts.get(ct, 0) + 1

    # Build funnel stages
    funnel = [
        {"stage": "Impressions", "count": event_counts.get("page_view", 0) * 10, "rate": 100.0},
        {"stage": "Page Views", "count": event_counts.get("page_view", 0), "rate": 100.0},
        {"stage": "Clicks", "count": event_counts.get("click", 0), "rate": 0.0},
        {"stage": "Form Starts", "count": event_counts.get("form_start", 0), "rate": 0.0},
        {"stage": "Form Submits", "count": event_counts.get("form_submit", 0), "rate": 0.0},
        {"stage": "Leads", "count": conversion_counts.get("lead", 0), "rate": 0.0},
        {"stage": "Purchases", "count": conversion_counts.get("purchase", 0), "rate": 0.0},
    ]

    # Calculate rates
    for i in range(1, len(funnel)):
        if funnel[i-1]["count"] > 0:
            funnel[i]["rate"] = round((funnel[i]["count"] / funnel[i-1]["count"]) * 100, 1)

    return {
        "date_from": date_from,
        "date_to": date_to,
        "funnel": funnel,
        "total_visitors": event_counts.get("page_view", 0),
        "total_conversions": sum(conversion_counts.values()),
        "overall_conversion_rate": round(
            sum(conversion_counts.values()) / max(event_counts.get("page_view", 1), 1) * 100, 2
        ),
    }
