"""
Campaigns API Endpoints

CRUD operations for campaigns and campaign metrics.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta

from ..services.supabase_client import get_supabase_client
from ..integrations.google_ads.adapter_factory import get_adapter_for_account
from .user_auth import get_current_user

router = APIRouter(prefix="/accounts/{account_id}/campaigns", tags=["Campaigns"])


# =============================================================================
# Response Models
# =============================================================================

class CampaignResponse(BaseModel):
    id: str
    external_campaign_id: str
    name: str
    status: str
    campaign_type: str
    budget_micros: Optional[int]
    budget_type: Optional[str]
    currency_code: str
    start_date: Optional[str]
    end_date: Optional[str]
    created_at: str


class CampaignMetricsResponse(BaseModel):
    campaign_id: str
    date_from: str
    date_to: str
    impressions: int
    clicks: int
    cost_micros: int
    conversions: float
    ctr: Optional[float]
    avg_cpc_micros: Optional[int]
    avg_cpa_micros: Optional[int]
    roas: Optional[float]


class CampaignListResponse(BaseModel):
    campaigns: list[CampaignResponse]
    total: int


class PMaxNetworkBreakdownResponse(BaseModel):
    campaign_id: str
    breakdown: list[dict]  # [{network: "SEARCH", cost_micros: 1234, ...}]


class AuctionInsightEntry(BaseModel):
    """Single competitor entry in auction insights."""
    domain: str
    impression_share: Optional[float] = None  # 0-100%
    overlap_rate: Optional[float] = None  # How often you both appeared
    position_above_rate: Optional[float] = None  # How often they beat you
    top_impression_pct: Optional[float] = None  # Their top-of-page rate
    abs_top_impression_pct: Optional[float] = None  # Their absolute top rate
    outranking_share: Optional[float] = None  # How often you outranked them


class AuctionInsightsResponse(BaseModel):
    """Auction insights showing competitor landscape for a campaign."""
    campaign_id: str
    campaign_name: str
    date_from: str
    date_to: str
    your_impression_share: Optional[float] = None
    insights: list[AuctionInsightEntry]
    total_competitors: int
    lead_gen_insights: Optional[dict] = None  # Lead gen specific analysis


# =============================================================================
# Endpoints
# =============================================================================

@router.get("", response_model=CampaignListResponse)
async def list_campaigns(
    account_id: str,
    status: Optional[str] = Query(None, description="Filter by status (ENABLED, PAUSED)"),
    campaign_type: Optional[str] = Query(None, description="Filter by type (SEARCH, PMAX, etc)"),
    current_user: dict = Depends(get_current_user),
):
    """
    List all campaigns for an ad account.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # First verify the account belongs to user's organization
    if organization_id:
        account_check = supabase.table("ad_accounts").select("id").eq(
            "id", account_id
        ).eq("organization_id", organization_id).execute()
        if not account_check.data:
            raise HTTPException(status_code=404, detail="Ad account not found")

    query = supabase.table("campaigns").select("*").eq("ad_account_id", account_id)

    if status:
        query = query.eq("status", status)
    if campaign_type:
        query = query.eq("campaign_type", campaign_type)

    result = query.order("name").execute()

    campaigns = [
        CampaignResponse(
            id=row["id"],
            external_campaign_id=row["external_campaign_id"],
            name=row["name"],
            status=row["status"],
            campaign_type=row["campaign_type"],
            budget_micros=row.get("budget_micros"),
            budget_type=row.get("budget_type"),
            currency_code=row.get("currency_code", "USD"),
            start_date=row.get("start_date"),
            end_date=row.get("end_date"),
            created_at=row["created_at"],
        )
        for row in result.data
    ]

    return CampaignListResponse(campaigns=campaigns, total=len(campaigns))


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    account_id: str,
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get a single campaign by ID.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify account belongs to user's organization
    if organization_id:
        account_check = supabase.table("ad_accounts").select("id").eq(
            "id", account_id
        ).eq("organization_id", organization_id).execute()
        if not account_check.data:
            raise HTTPException(status_code=404, detail="Ad account not found")

    result = supabase.table("campaigns").select("*").eq(
        "id", campaign_id
    ).eq("ad_account_id", account_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    row = result.data[0]
    return CampaignResponse(
        id=row["id"],
        external_campaign_id=row["external_campaign_id"],
        name=row["name"],
        status=row["status"],
        campaign_type=row["campaign_type"],
        budget_micros=row.get("budget_micros"),
        budget_type=row.get("budget_type"),
        currency_code=row.get("currency_code", "USD"),
        start_date=row.get("start_date"),
        end_date=row.get("end_date"),
        created_at=row["created_at"],
    )


@router.get("/{campaign_id}/metrics", response_model=CampaignMetricsResponse)
async def get_campaign_metrics(
    account_id: str,
    campaign_id: str,
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get aggregated metrics for a campaign.

    Defaults to last 30 days if no dates specified.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify account belongs to user's organization
    if organization_id:
        account_check = supabase.table("ad_accounts").select("id").eq(
            "id", account_id
        ).eq("organization_id", organization_id).execute()
        if not account_check.data:
            raise HTTPException(status_code=404, detail="Ad account not found")

    # Default to last 30 days
    if not date_to:
        date_to = date.today().isoformat()
    if not date_from:
        date_from = (date.today() - timedelta(days=30)).isoformat()

    result = supabase.table("metrics_daily").select(
        "impressions, clicks, cost_micros, conversions, conversion_value_micros"
    ).eq("campaign_id", campaign_id).gte(
        "metric_date", date_from
    ).lte("metric_date", date_to).execute()

    # Aggregate metrics
    total_impressions = sum(m.get("impressions", 0) or 0 for m in result.data)
    total_clicks = sum(m.get("clicks", 0) or 0 for m in result.data)
    total_cost = sum(m.get("cost_micros", 0) or 0 for m in result.data)
    total_conversions = sum(m.get("conversions", 0) or 0 for m in result.data)
    total_value = sum(m.get("conversion_value_micros", 0) or 0 for m in result.data)

    # Calculate derived metrics
    ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else None
    avg_cpc = int(total_cost / total_clicks) if total_clicks > 0 else None
    avg_cpa = int(total_cost / total_conversions) if total_conversions > 0 else None
    roas = (total_value / total_cost) if total_cost > 0 else None

    return CampaignMetricsResponse(
        campaign_id=campaign_id,
        date_from=date_from,
        date_to=date_to,
        impressions=total_impressions,
        clicks=total_clicks,
        cost_micros=total_cost,
        conversions=total_conversions,
        ctr=round(ctr, 2) if ctr else None,
        avg_cpc_micros=avg_cpc,
        avg_cpa_micros=avg_cpa,
        roas=round(roas, 2) if roas else None,
    )


@router.get("/{campaign_id}/pmax-breakdown", response_model=PMaxNetworkBreakdownResponse)
async def get_pmax_network_breakdown(
    account_id: str,
    campaign_id: str,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Get Performance Max network breakdown.

    Shows how spend is distributed across Search, YouTube, Display, Discovery.
    This is a v23+ feature.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify account belongs to user's organization
    if organization_id:
        account_check = supabase.table("ad_accounts").select("id").eq(
            "id", account_id
        ).eq("organization_id", organization_id).execute()
        if not account_check.data:
            raise HTTPException(status_code=404, detail="Ad account not found")

    # Verify campaign is PMax
    campaign = supabase.table("campaigns").select(
        "campaign_type"
    ).eq("id", campaign_id).execute()

    if not campaign.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.data[0]["campaign_type"] != "PERFORMANCE_MAX":
        raise HTTPException(
            status_code=400,
            detail="Network breakdown only available for Performance Max campaigns"
        )

    # Default to last 30 days
    if not date_to:
        date_to = date.today().isoformat()
    if not date_from:
        date_from = (date.today() - timedelta(days=30)).isoformat()

    # Get breakdown from metrics_daily (grouped by network_type)
    result = supabase.table("metrics_daily").select(
        "network_type, impressions, clicks, cost_micros, conversions"
    ).eq("campaign_id", campaign_id).gte(
        "metric_date", date_from
    ).lte("metric_date", date_to).not_.is_("network_type", "null").execute()

    # Aggregate by network
    networks = {}
    for row in result.data:
        network = row.get("network_type", "UNKNOWN")
        if network not in networks:
            networks[network] = {
                "network": network,
                "impressions": 0,
                "clicks": 0,
                "cost_micros": 0,
                "conversions": 0,
            }
        networks[network]["impressions"] += row.get("impressions", 0) or 0
        networks[network]["clicks"] += row.get("clicks", 0) or 0
        networks[network]["cost_micros"] += row.get("cost_micros", 0) or 0
        networks[network]["conversions"] += row.get("conversions", 0) or 0

    breakdown = list(networks.values())

    return PMaxNetworkBreakdownResponse(
        campaign_id=campaign_id,
        breakdown=breakdown,
    )


@router.get("/{campaign_id}/auction-insights", response_model=AuctionInsightsResponse)
async def get_auction_insights(
    account_id: str,
    campaign_id: str,
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get auction insights showing competitor impression share and positioning.

    This endpoint reveals:
    - Which competitors are bidding on the same keywords
    - Your impression share vs competitors
    - Position above rate (who's capturing leads first)
    - Overlap rate (how often you compete directly)

    **Lead Gen Value:** Identify who's competing for your lead gen keywords
    and understand if you're losing potential leads to competitors.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify account belongs to user's organization
    if organization_id:
        account_check = supabase.table("ad_accounts").select("id").eq(
            "id", account_id
        ).eq("organization_id", organization_id).execute()
        if not account_check.data:
            raise HTTPException(status_code=404, detail="Ad account not found")

    # Get campaign details
    campaign_result = supabase.table("campaigns").select("name, campaign_type").eq(
        "id", campaign_id
    ).eq("ad_account_id", account_id).execute()

    if not campaign_result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign = campaign_result.data[0]

    # Default to last 30 days
    if not date_to:
        date_to = date.today().isoformat()
    if not date_from:
        date_from = (date.today() - timedelta(days=30)).isoformat()

    try:
        # Call Google Ads API via adapter
        adapter = await get_adapter_for_account(account_id)

        # Get external campaign ID for API call
        ext_campaign = supabase.table("campaigns").select(
            "external_campaign_id"
        ).eq("id", campaign_id).execute()

        if ext_campaign.data:
            external_id = ext_campaign.data[0]["external_campaign_id"]
            raw_insights = await adapter.get_auction_insights(
                campaign_id=external_id,
                date_from=date.fromisoformat(date_from),
                date_to=date.fromisoformat(date_to),
            )

            # Transform to response model
            insights = [
                AuctionInsightEntry(
                    domain=entry.get("domain", "Unknown"),
                    impression_share=entry.get("search_impression_share"),
                    overlap_rate=entry.get("search_overlap_rate"),
                    position_above_rate=entry.get("search_position_above_rate"),
                    top_impression_pct=entry.get("search_top_impression_percentage"),
                    abs_top_impression_pct=entry.get("search_absolute_top_impression_percentage"),
                    outranking_share=entry.get("search_outranking_share"),
                )
                for entry in raw_insights
                if entry.get("domain") != "Your domain"  # Exclude self
            ]

            # Find your own metrics
            your_metrics = next(
                (e for e in raw_insights if e.get("domain") == "Your domain"),
                {}
            )

            # Lead gen specific insights
            lead_gen_insights = None
            if campaign["campaign_type"] in ["SEARCH", "PERFORMANCE_MAX"]:
                # Calculate lead gen specific metrics
                total_competitor_share = sum(
                    (i.impression_share or 0) for i in insights
                )
                your_share = your_metrics.get("search_impression_share", 0) or 0

                # Estimate missed leads based on lost impression share
                lost_share = 100 - your_share if your_share > 0 else 0

                lead_gen_insights = {
                    "impression_share_lost": round(lost_share, 1),
                    "top_competitor": insights[0].domain if insights else None,
                    "top_competitor_share": insights[0].impression_share if insights else None,
                    "potential_leads_missed_pct": round(lost_share * 0.7, 1),  # Estimate
                    "recommendation": _get_auction_recommendation(your_share, insights),
                }

            return AuctionInsightsResponse(
                campaign_id=campaign_id,
                campaign_name=campaign["name"],
                date_from=date_from,
                date_to=date_to,
                your_impression_share=your_metrics.get("search_impression_share"),
                insights=insights,
                total_competitors=len(insights),
                lead_gen_insights=lead_gen_insights,
            )

    except NotImplementedError:
        # Adapter not connected - return demo data for development
        demo_insights = _get_demo_auction_insights(campaign["name"])
        return AuctionInsightsResponse(
            campaign_id=campaign_id,
            campaign_name=campaign["name"],
            date_from=date_from,
            date_to=date_to,
            your_impression_share=demo_insights["your_share"],
            insights=demo_insights["competitors"],
            total_competitors=len(demo_insights["competitors"]),
            lead_gen_insights=demo_insights["lead_gen_insights"],
        )


def _get_auction_recommendation(your_share: float, competitors: list) -> str:
    """Generate lead gen specific recommendation based on auction data."""
    if your_share >= 80:
        return "Strong position. Focus on conversion rate optimization."
    elif your_share >= 50:
        return "Good visibility. Consider increasing bids on high-intent lead gen keywords."
    elif your_share >= 30:
        return "Moderate visibility. Competitors may be capturing 40%+ of potential leads."
    else:
        return "Low visibility. Significant lead volume being lost to competitors. Review budget and bids."


def _get_demo_auction_insights(campaign_name: str) -> dict:
    """Return demo auction insights for development/testing."""
    demo_competitors = [
        AuctionInsightEntry(
            domain="competitor-a.com",
            impression_share=42.5,
            overlap_rate=78.3,
            position_above_rate=35.2,
            top_impression_pct=58.4,
            abs_top_impression_pct=32.1,
            outranking_share=45.8,
        ),
        AuctionInsightEntry(
            domain="competitor-b.com",
            impression_share=38.2,
            overlap_rate=65.1,
            position_above_rate=28.7,
            top_impression_pct=45.2,
            abs_top_impression_pct=22.8,
            outranking_share=52.3,
        ),
        AuctionInsightEntry(
            domain="competitor-c.com",
            impression_share=25.8,
            overlap_rate=52.4,
            position_above_rate=18.3,
            top_impression_pct=35.6,
            abs_top_impression_pct=15.2,
            outranking_share=61.5,
        ),
        AuctionInsightEntry(
            domain="local-competitor.com",
            impression_share=18.3,
            overlap_rate=41.2,
            position_above_rate=12.5,
            top_impression_pct=28.4,
            abs_top_impression_pct=8.7,
            outranking_share=72.1,
        ),
    ]

    your_share = 52.3

    return {
        "your_share": your_share,
        "competitors": demo_competitors,
        "lead_gen_insights": {
            "impression_share_lost": round(100 - your_share, 1),
            "top_competitor": "competitor-a.com",
            "top_competitor_share": 42.5,
            "potential_leads_missed_pct": round((100 - your_share) * 0.7, 1),
            "recommendation": _get_auction_recommendation(your_share, demo_competitors),
        },
    }


@router.post("/{campaign_id}/pause")
async def pause_campaign(
    account_id: str,
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Pause a campaign.

    Calls Google Ads API to pause, then updates local database.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify account belongs to user's organization
    if organization_id:
        account_check = supabase.table("ad_accounts").select("id").eq(
            "id", account_id
        ).eq("organization_id", organization_id).execute()
        if not account_check.data:
            raise HTTPException(status_code=404, detail="Ad account not found")

    # Get campaign
    result = supabase.table("campaigns").select("*").eq("id", campaign_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign = result.data[0]

    if campaign["status"] == "PAUSED":
        return {"success": True, "message": "Campaign already paused"}

    try:
        # Call Google Ads API via adapter
        adapter = await get_adapter_for_account(account_id)
        result = await adapter.pause_campaign(campaign["external_campaign_id"])

        if not result.success:
            raise HTTPException(status_code=500, detail=result.error_message)

        # Update local database
        supabase.table("campaigns").update({
            "status": "PAUSED"
        }).eq("id", campaign_id).execute()

        return {"success": True, "message": "Campaign paused"}

    except NotImplementedError:
        # Adapter not fully implemented yet - just update local DB for now
        supabase.table("campaigns").update({
            "status": "PAUSED"
        }).eq("id", campaign_id).execute()
        return {"success": True, "message": "Campaign paused (local only - API not connected)"}


@router.post("/{campaign_id}/enable")
async def enable_campaign(
    account_id: str,
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Enable a paused campaign.
    """
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    # Verify account belongs to user's organization
    if organization_id:
        account_check = supabase.table("ad_accounts").select("id").eq(
            "id", account_id
        ).eq("organization_id", organization_id).execute()
        if not account_check.data:
            raise HTTPException(status_code=404, detail="Ad account not found")

    result = supabase.table("campaigns").select("*").eq("id", campaign_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign = result.data[0]

    if campaign["status"] == "ENABLED":
        return {"success": True, "message": "Campaign already enabled"}

    try:
        adapter = await get_adapter_for_account(account_id)
        result = await adapter.enable_campaign(campaign["external_campaign_id"])

        if not result.success:
            raise HTTPException(status_code=500, detail=result.error_message)

        supabase.table("campaigns").update({
            "status": "ENABLED"
        }).eq("id", campaign_id).execute()

        return {"success": True, "message": "Campaign enabled"}

    except NotImplementedError:
        supabase.table("campaigns").update({
            "status": "ENABLED"
        }).eq("id", campaign_id).execute()
        return {"success": True, "message": "Campaign enabled (local only - API not connected)"}
