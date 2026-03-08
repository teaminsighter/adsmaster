"""
Meta Ads Campaigns API Endpoints

Provides endpoints for managing Meta (Facebook/Instagram) campaigns, ad sets, and ads.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from ..core.config import Settings, get_settings
from ..services.meta_ads_oauth import MetaAdsOAuthService


router = APIRouter(prefix="/api/v1/meta", tags=["Meta Campaigns"])


# Response Models
class MetaCampaign(BaseModel):
    id: str
    name: str
    status: str  # ACTIVE, PAUSED, DELETED, ARCHIVED
    objective: str  # OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES
    daily_budget: Optional[int] = None  # In cents
    lifetime_budget: Optional[int] = None
    spend: int = 0  # In cents
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    created_time: str
    updated_time: str


class MetaAdSet(BaseModel):
    id: str
    campaign_id: str
    name: str
    status: str
    daily_budget: Optional[int] = None
    lifetime_budget: Optional[int] = None
    billing_event: str  # IMPRESSIONS, LINK_CLICKS, etc.
    optimization_goal: str
    targeting_summary: str
    spend: int = 0
    impressions: int = 0
    clicks: int = 0
    created_time: str


class MetaAd(BaseModel):
    id: str
    ad_set_id: str
    name: str
    status: str
    creative_id: str
    preview_url: Optional[str] = None
    spend: int = 0
    impressions: int = 0
    clicks: int = 0
    ctr: float = 0
    created_time: str


class MetaInsights(BaseModel):
    date_start: str
    date_stop: str
    spend: int  # In cents
    impressions: int
    clicks: int
    ctr: float
    cpc: int  # In cents
    cpm: int  # In cents
    conversions: int
    cost_per_conversion: Optional[int] = None
    reach: int
    frequency: float


class CampaignsResponse(BaseModel):
    campaigns: List[MetaCampaign]
    total: int


class AdSetsResponse(BaseModel):
    ad_sets: List[MetaAdSet]
    total: int


class AdsResponse(BaseModel):
    ads: List[MetaAd]
    total: int


# Mock data for MVP
MOCK_META_CAMPAIGNS = [
    {
        "id": "meta_camp_1",
        "name": "FB - Conversions - Retargeting",
        "status": "ACTIVE",
        "objective": "OUTCOME_SALES",
        "daily_budget": 5000,  # $50/day in cents
        "lifetime_budget": None,
        "spend": 4235,
        "impressions": 125000,
        "clicks": 3200,
        "conversions": 89,
        "created_time": "2026-01-15T10:00:00Z",
        "updated_time": "2026-03-08T08:00:00Z",
    },
    {
        "id": "meta_camp_2",
        "name": "IG - Brand Awareness",
        "status": "ACTIVE",
        "objective": "OUTCOME_AWARENESS",
        "daily_budget": 10000,  # $100/day
        "lifetime_budget": None,
        "spend": 8760,
        "impressions": 890000,
        "clicks": 12500,
        "conversions": 0,
        "created_time": "2026-02-01T10:00:00Z",
        "updated_time": "2026-03-08T08:00:00Z",
    },
    {
        "id": "meta_camp_3",
        "name": "FB - Lead Gen - Lookalike",
        "status": "ACTIVE",
        "objective": "OUTCOME_LEADS",
        "daily_budget": 7500,  # $75/day
        "lifetime_budget": None,
        "spend": 6890,
        "impressions": 210000,
        "clicks": 4500,
        "conversions": 156,
        "created_time": "2026-02-10T10:00:00Z",
        "updated_time": "2026-03-08T08:00:00Z",
    },
    {
        "id": "meta_camp_4",
        "name": "FB - Traffic - Blog",
        "status": "PAUSED",
        "objective": "OUTCOME_TRAFFIC",
        "daily_budget": 2500,
        "lifetime_budget": None,
        "spend": 1234,
        "impressions": 45000,
        "clicks": 1800,
        "conversions": 0,
        "created_time": "2026-01-20T10:00:00Z",
        "updated_time": "2026-03-01T08:00:00Z",
    },
]

MOCK_META_AD_SETS = [
    {
        "id": "meta_adset_1",
        "campaign_id": "meta_camp_1",
        "name": "Retargeting - Website Visitors 30d",
        "status": "ACTIVE",
        "daily_budget": 2500,
        "lifetime_budget": None,
        "billing_event": "IMPRESSIONS",
        "optimization_goal": "OFFSITE_CONVERSIONS",
        "targeting_summary": "Custom Audience: Website Visitors (30 days)",
        "spend": 2145,
        "impressions": 65000,
        "clicks": 1800,
        "created_time": "2026-01-15T10:00:00Z",
    },
    {
        "id": "meta_adset_2",
        "campaign_id": "meta_camp_1",
        "name": "Retargeting - Cart Abandoners",
        "status": "ACTIVE",
        "daily_budget": 2500,
        "lifetime_budget": None,
        "billing_event": "IMPRESSIONS",
        "optimization_goal": "OFFSITE_CONVERSIONS",
        "targeting_summary": "Custom Audience: Cart Abandoners (7 days)",
        "spend": 2090,
        "impressions": 60000,
        "clicks": 1400,
        "created_time": "2026-01-15T10:00:00Z",
    },
    {
        "id": "meta_adset_3",
        "campaign_id": "meta_camp_3",
        "name": "Lookalike 1% - Converters",
        "status": "ACTIVE",
        "daily_budget": 5000,
        "lifetime_budget": None,
        "billing_event": "IMPRESSIONS",
        "optimization_goal": "LEAD_GENERATION",
        "targeting_summary": "Lookalike (US, 1%) - Based on Converters",
        "spend": 4560,
        "impressions": 145000,
        "clicks": 3200,
        "created_time": "2026-02-10T10:00:00Z",
    },
]


@router.get("/accounts/{account_id}/campaigns", response_model=CampaignsResponse)
async def list_meta_campaigns(
    account_id: str,
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, PAUSED)"),
    objective: Optional[str] = Query(None, description="Filter by objective"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    List all campaigns for a Meta ad account.
    """
    campaigns = MOCK_META_CAMPAIGNS.copy()

    if status:
        campaigns = [c for c in campaigns if c["status"] == status.upper()]
    if objective:
        campaigns = [c for c in campaigns if c["objective"] == objective.upper()]

    total = len(campaigns)
    campaigns = campaigns[offset:offset + limit]

    return CampaignsResponse(
        campaigns=[MetaCampaign(**c) for c in campaigns],
        total=total,
    )


@router.get("/accounts/{account_id}/campaigns/{campaign_id}", response_model=MetaCampaign)
async def get_meta_campaign(account_id: str, campaign_id: str):
    """Get details of a specific Meta campaign."""
    campaign = next((c for c in MOCK_META_CAMPAIGNS if c["id"] == campaign_id), None)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return MetaCampaign(**campaign)


@router.get("/accounts/{account_id}/campaigns/{campaign_id}/adsets", response_model=AdSetsResponse)
async def list_meta_ad_sets(
    account_id: str,
    campaign_id: str,
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List all ad sets for a Meta campaign."""
    ad_sets = [a for a in MOCK_META_AD_SETS if a["campaign_id"] == campaign_id]

    if status:
        ad_sets = [a for a in ad_sets if a["status"] == status.upper()]

    total = len(ad_sets)
    ad_sets = ad_sets[offset:offset + limit]

    return AdSetsResponse(
        ad_sets=[MetaAdSet(**a) for a in ad_sets],
        total=total,
    )


@router.get("/accounts/{account_id}/campaigns/{campaign_id}/insights", response_model=MetaInsights)
async def get_meta_campaign_insights(
    account_id: str,
    campaign_id: str,
    date_preset: str = Query("last_30d", description="Date preset: today, yesterday, last_7d, last_30d"),
):
    """Get performance insights for a Meta campaign."""
    campaign = next((c for c in MOCK_META_CAMPAIGNS if c["id"] == campaign_id), None)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Generate mock insights based on campaign data
    today = datetime.utcnow()
    date_ranges = {
        "today": (today, today),
        "yesterday": (today - timedelta(days=1), today - timedelta(days=1)),
        "last_7d": (today - timedelta(days=7), today),
        "last_30d": (today - timedelta(days=30), today),
    }
    date_start, date_stop = date_ranges.get(date_preset, date_ranges["last_30d"])

    spend = campaign["spend"]
    impressions = campaign["impressions"]
    clicks = campaign["clicks"]
    conversions = campaign["conversions"]

    return MetaInsights(
        date_start=date_start.strftime("%Y-%m-%d"),
        date_stop=date_stop.strftime("%Y-%m-%d"),
        spend=spend,
        impressions=impressions,
        clicks=clicks,
        ctr=round((clicks / impressions * 100) if impressions > 0 else 0, 2),
        cpc=round(spend / clicks) if clicks > 0 else 0,
        cpm=round(spend / impressions * 1000) if impressions > 0 else 0,
        conversions=conversions,
        cost_per_conversion=round(spend / conversions) if conversions > 0 else None,
        reach=int(impressions * 0.7),  # Mock: reach is ~70% of impressions
        frequency=round(impressions / (impressions * 0.7), 2) if impressions > 0 else 0,
    )


@router.post("/accounts/{account_id}/campaigns/{campaign_id}/pause")
async def pause_meta_campaign(account_id: str, campaign_id: str):
    """Pause a Meta campaign."""
    campaign = next((c for c in MOCK_META_CAMPAIGNS if c["id"] == campaign_id), None)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # In production, would call Meta API
    campaign["status"] = "PAUSED"
    campaign["updated_time"] = datetime.utcnow().isoformat()

    return {
        "success": True,
        "message": f"Campaign '{campaign['name']}' paused",
        "campaign_id": campaign_id,
    }


@router.post("/accounts/{account_id}/campaigns/{campaign_id}/enable")
async def enable_meta_campaign(account_id: str, campaign_id: str):
    """Enable (unpause) a Meta campaign."""
    campaign = next((c for c in MOCK_META_CAMPAIGNS if c["id"] == campaign_id), None)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign["status"] = "ACTIVE"
    campaign["updated_time"] = datetime.utcnow().isoformat()

    return {
        "success": True,
        "message": f"Campaign '{campaign['name']}' enabled",
        "campaign_id": campaign_id,
    }


@router.get("/accounts/{account_id}/summary")
async def get_meta_account_summary(account_id: str):
    """Get summary statistics for a Meta ad account."""
    campaigns = MOCK_META_CAMPAIGNS

    total_spend = sum(c["spend"] for c in campaigns)
    total_impressions = sum(c["impressions"] for c in campaigns)
    total_clicks = sum(c["clicks"] for c in campaigns)
    total_conversions = sum(c["conversions"] for c in campaigns)

    return {
        "account_id": account_id,
        "total_campaigns": len(campaigns),
        "active_campaigns": len([c for c in campaigns if c["status"] == "ACTIVE"]),
        "total_spend": total_spend,  # In cents
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "total_conversions": total_conversions,
        "avg_ctr": round((total_clicks / total_impressions * 100) if total_impressions > 0 else 0, 2),
        "avg_cpc": round(total_spend / total_clicks) if total_clicks > 0 else 0,
        "cost_per_conversion": round(total_spend / total_conversions) if total_conversions > 0 else None,
    }
