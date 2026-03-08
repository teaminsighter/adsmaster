"""
Campaigns API Endpoints

CRUD operations for campaigns and campaign metrics.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta

from ..services.supabase_client import get_supabase_client
from ..integrations.google_ads.adapter_factory import get_adapter_for_account

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


# =============================================================================
# Endpoints
# =============================================================================

@router.get("", response_model=CampaignListResponse)
async def list_campaigns(
    account_id: str,
    status: Optional[str] = Query(None, description="Filter by status (ENABLED, PAUSED)"),
    campaign_type: Optional[str] = Query(None, description="Filter by type (SEARCH, PMAX, etc)"),
):
    """
    List all campaigns for an ad account.
    """
    supabase = get_supabase_client()

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
async def get_campaign(account_id: str, campaign_id: str):
    """
    Get a single campaign by ID.
    """
    supabase = get_supabase_client()

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
):
    """
    Get aggregated metrics for a campaign.

    Defaults to last 30 days if no dates specified.
    """
    supabase = get_supabase_client()

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
):
    """
    Get Performance Max network breakdown.

    Shows how spend is distributed across Search, YouTube, Display, Discovery.
    This is a v23+ feature.
    """
    supabase = get_supabase_client()

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


@router.post("/{campaign_id}/pause")
async def pause_campaign(account_id: str, campaign_id: str):
    """
    Pause a campaign.

    Calls Google Ads API to pause, then updates local database.
    """
    supabase = get_supabase_client()

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
async def enable_campaign(account_id: str, campaign_id: str):
    """
    Enable a paused campaign.
    """
    supabase = get_supabase_client()

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
