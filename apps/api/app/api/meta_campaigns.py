"""
Meta Ads Campaigns API Endpoints

Provides endpoints for managing Meta (Facebook/Instagram) campaigns, ad sets, and ads.
Connected to PostgreSQL database.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from ..services.supabase_client import get_supabase_client
from ..services.meta_ads_service import MetaAdsService
from .user_auth import get_current_user


router = APIRouter(prefix="/api/v1/meta", tags=["Meta Campaigns"])


# =============================================================================
# Response Models
# =============================================================================

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


# =============================================================================
# Helper Functions
# =============================================================================

def get_meta_platform_id() -> Optional[str]:
    """Get the Meta Ads platform ID from database."""
    db = get_supabase_client()
    result = db.table("ad_platforms").select("id").eq("name", "meta_ads").execute()
    if result.data:
        return result.data[0]["id"]
    return None


def verify_account_access(account_id: str, organization_id: str) -> dict:
    """Verify user has access to the ad account and return account data."""
    db = get_supabase_client()
    platform_id = get_meta_platform_id()

    result = db.table("ad_accounts").select("*").eq(
        "id", account_id
    ).eq("organization_id", organization_id).eq(
        "platform_id", platform_id
    ).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Meta ad account not found")

    return result.data[0]


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/accounts/{account_id}/campaigns", response_model=CampaignsResponse)
async def list_meta_campaigns(
    account_id: str,
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, PAUSED)"),
    objective: Optional[str] = Query(None, description="Filter by objective"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """
    List all campaigns for a Meta ad account.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Verify access to account
    verify_account_access(account_id, organization_id)

    # Build query
    query = db.table("campaigns").select("*").eq("ad_account_id", account_id)

    if status:
        # Map ACTIVE/PAUSED to database ENABLED/PAUSED
        db_status = "ENABLED" if status.upper() == "ACTIVE" else status.upper()
        query = query.eq("status", db_status)

    result = query.execute()
    campaigns_data = result.data or []

    # Get metrics for each campaign
    campaign_ids = [c["id"] for c in campaigns_data]
    metrics = {}

    if campaign_ids:
        # Get aggregated metrics for last 30 days
        metrics_result = db.table("metrics_daily").select(
            "campaign_id, impressions, clicks, cost_micros, conversions"
        ).execute()

        for m in (metrics_result.data or []):
            cid = m.get("campaign_id")
            if cid in campaign_ids:
                if cid not in metrics:
                    metrics[cid] = {"impressions": 0, "clicks": 0, "spend": 0, "conversions": 0}
                metrics[cid]["impressions"] += m.get("impressions", 0)
                metrics[cid]["clicks"] += m.get("clicks", 0)
                # Convert micros to cents (divide by 10000)
                metrics[cid]["spend"] += int(m.get("cost_micros", 0) / 10000)
                metrics[cid]["conversions"] += int(m.get("conversions", 0) or 0)

    # Build response
    campaigns = []
    for c in campaigns_data:
        cid = c["id"]
        m = metrics.get(cid, {"impressions": 0, "clicks": 0, "spend": 0, "conversions": 0})

        # Map database status to Meta status
        meta_status = "ACTIVE" if c.get("status") == "ENABLED" else c.get("status", "PAUSED")

        # Get budget in cents (micros / 10000)
        daily_budget = None
        lifetime_budget = None
        if c.get("budget_type") == "DAILY":
            daily_budget = int(c.get("budget_micros", 0) / 10000) if c.get("budget_micros") else None
        else:
            lifetime_budget = int(c.get("budget_micros", 0) / 10000) if c.get("budget_micros") else None

        # Get objective from settings
        settings = c.get("settings") or {}
        objective_value = settings.get("objective", "OUTCOME_TRAFFIC")

        campaigns.append(MetaCampaign(
            id=cid,
            name=c.get("name", ""),
            status=meta_status,
            objective=objective_value,
            daily_budget=daily_budget,
            lifetime_budget=lifetime_budget,
            spend=m["spend"],
            impressions=m["impressions"],
            clicks=m["clicks"],
            conversions=m["conversions"],
            created_time=c.get("created_at", datetime.utcnow().isoformat()),
            updated_time=c.get("updated_at", datetime.utcnow().isoformat()),
        ))

    # Apply objective filter (after building campaigns)
    if objective:
        campaigns = [c for c in campaigns if c.objective == objective.upper()]

    total = len(campaigns)
    campaigns = campaigns[offset:offset + limit]

    return CampaignsResponse(campaigns=campaigns, total=total)


@router.get("/accounts/{account_id}/campaigns/{campaign_id}", response_model=MetaCampaign)
async def get_meta_campaign(
    account_id: str,
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get details of a specific Meta campaign."""
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    verify_account_access(account_id, organization_id)

    result = db.table("campaigns").select("*").eq("id", campaign_id).eq(
        "ad_account_id", account_id
    ).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    c = result.data[0]

    # Get metrics
    metrics_result = db.table("metrics_daily").select(
        "impressions, clicks, cost_micros, conversions"
    ).eq("campaign_id", campaign_id).execute()

    m = {"impressions": 0, "clicks": 0, "spend": 0, "conversions": 0}
    for row in (metrics_result.data or []):
        m["impressions"] += row.get("impressions", 0)
        m["clicks"] += row.get("clicks", 0)
        m["spend"] += int(row.get("cost_micros", 0) / 10000)
        m["conversions"] += int(row.get("conversions", 0) or 0)

    meta_status = "ACTIVE" if c.get("status") == "ENABLED" else c.get("status", "PAUSED")

    daily_budget = None
    lifetime_budget = None
    if c.get("budget_type") == "DAILY":
        daily_budget = int(c.get("budget_micros", 0) / 10000) if c.get("budget_micros") else None
    else:
        lifetime_budget = int(c.get("budget_micros", 0) / 10000) if c.get("budget_micros") else None

    settings = c.get("settings") or {}
    objective_value = settings.get("objective", "OUTCOME_TRAFFIC")

    return MetaCampaign(
        id=c["id"],
        name=c.get("name", ""),
        status=meta_status,
        objective=objective_value,
        daily_budget=daily_budget,
        lifetime_budget=lifetime_budget,
        spend=m["spend"],
        impressions=m["impressions"],
        clicks=m["clicks"],
        conversions=m["conversions"],
        created_time=c.get("created_at", datetime.utcnow().isoformat()),
        updated_time=c.get("updated_at", datetime.utcnow().isoformat()),
    )


@router.get("/accounts/{account_id}/campaigns/{campaign_id}/adsets", response_model=AdSetsResponse)
async def list_meta_ad_sets(
    account_id: str,
    campaign_id: str,
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """List all ad sets for a Meta campaign."""
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    verify_account_access(account_id, organization_id)

    # Verify campaign belongs to account
    campaign_check = db.table("campaigns").select("id").eq("id", campaign_id).eq(
        "ad_account_id", account_id
    ).execute()

    if not campaign_check.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Get ad sets (ad_groups in our schema)
    query = db.table("ad_groups").select("*").eq("campaign_id", campaign_id)

    if status:
        db_status = "ENABLED" if status.upper() == "ACTIVE" else status.upper()
        query = query.eq("status", db_status)

    result = query.execute()
    ad_groups = result.data or []

    # Get metrics for ad groups
    ad_group_ids = [a["id"] for a in ad_groups]
    metrics = {}

    if ad_group_ids:
        metrics_result = db.table("metrics_daily").select(
            "ad_group_id, impressions, clicks, cost_micros"
        ).execute()

        for m in (metrics_result.data or []):
            aid = m.get("ad_group_id")
            if aid in ad_group_ids:
                if aid not in metrics:
                    metrics[aid] = {"impressions": 0, "clicks": 0, "spend": 0}
                metrics[aid]["impressions"] += m.get("impressions", 0)
                metrics[aid]["clicks"] += m.get("clicks", 0)
                metrics[aid]["spend"] += int(m.get("cost_micros", 0) / 10000)

    # Build response
    ad_sets = []
    for a in ad_groups:
        aid = a["id"]
        m = metrics.get(aid, {"impressions": 0, "clicks": 0, "spend": 0})

        meta_status = "ACTIVE" if a.get("status") == "ENABLED" else a.get("status", "PAUSED")

        # Budget from CPC/CPM bids
        daily_budget = int(a.get("cpc_bid_micros", 0) / 10000) if a.get("cpc_bid_micros") else None

        ad_sets.append(MetaAdSet(
            id=aid,
            campaign_id=campaign_id,
            name=a.get("name", ""),
            status=meta_status,
            daily_budget=daily_budget,
            lifetime_budget=None,
            billing_event="IMPRESSIONS" if a.get("cpm_bid_micros") else "LINK_CLICKS",
            optimization_goal=a.get("ad_group_type", "CONVERSIONS"),
            targeting_summary="Targeting configured",  # Would need separate targeting table
            spend=m["spend"],
            impressions=m["impressions"],
            clicks=m["clicks"],
            created_time=a.get("created_at", datetime.utcnow().isoformat()),
        ))

    total = len(ad_sets)
    ad_sets = ad_sets[offset:offset + limit]

    return AdSetsResponse(ad_sets=ad_sets, total=total)


@router.get("/accounts/{account_id}/campaigns/{campaign_id}/insights", response_model=MetaInsights)
async def get_meta_campaign_insights(
    account_id: str,
    campaign_id: str,
    date_preset: str = Query("last_30d", description="Date preset: today, yesterday, last_7d, last_30d"),
    current_user: dict = Depends(get_current_user),
):
    """Get performance insights for a Meta campaign."""
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    verify_account_access(account_id, organization_id)

    # Verify campaign
    campaign_check = db.table("campaigns").select("id").eq("id", campaign_id).eq(
        "ad_account_id", account_id
    ).execute()

    if not campaign_check.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Calculate date range
    today = datetime.utcnow()
    date_ranges = {
        "today": (today, today),
        "yesterday": (today - timedelta(days=1), today - timedelta(days=1)),
        "last_7d": (today - timedelta(days=7), today),
        "last_30d": (today - timedelta(days=30), today),
    }
    date_start, date_stop = date_ranges.get(date_preset, date_ranges["last_30d"])

    # Get metrics
    metrics_result = db.table("metrics_daily").select(
        "impressions, clicks, cost_micros, conversions"
    ).eq("campaign_id", campaign_id).execute()

    # Aggregate
    spend = 0
    impressions = 0
    clicks = 0
    conversions = 0

    for row in (metrics_result.data or []):
        impressions += row.get("impressions", 0)
        clicks += row.get("clicks", 0)
        spend += int(row.get("cost_micros", 0) / 10000)  # Convert to cents
        conversions += int(row.get("conversions", 0) or 0)

    # Calculate metrics
    ctr = round((clicks / impressions * 100) if impressions > 0 else 0, 2)
    cpc = round(spend / clicks) if clicks > 0 else 0
    cpm = round(spend / impressions * 1000) if impressions > 0 else 0
    cost_per_conversion = round(spend / conversions) if conversions > 0 else None
    reach = int(impressions * 0.7)  # Estimate: reach is ~70% of impressions
    frequency = round(impressions / reach, 2) if reach > 0 else 0

    return MetaInsights(
        date_start=date_start.strftime("%Y-%m-%d"),
        date_stop=date_stop.strftime("%Y-%m-%d"),
        spend=spend,
        impressions=impressions,
        clicks=clicks,
        ctr=ctr,
        cpc=cpc,
        cpm=cpm,
        conversions=conversions,
        cost_per_conversion=cost_per_conversion,
        reach=reach,
        frequency=frequency,
    )


@router.post("/accounts/{account_id}/campaigns/{campaign_id}/pause")
async def pause_meta_campaign(
    account_id: str,
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Pause a Meta campaign."""
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    verify_account_access(account_id, organization_id)

    # Get campaign
    result = db.table("campaigns").select("id, name").eq("id", campaign_id).eq(
        "ad_account_id", account_id
    ).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign = result.data[0]

    # Update status
    db.table("campaigns").update({
        "status": "PAUSED",
    }).eq("id", campaign_id).execute()

    # TODO: In production, also call Meta API to pause

    return {
        "success": True,
        "message": f"Campaign '{campaign['name']}' paused",
        "campaign_id": campaign_id,
    }


@router.post("/accounts/{account_id}/campaigns/{campaign_id}/enable")
async def enable_meta_campaign(
    account_id: str,
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Enable (unpause) a Meta campaign."""
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    verify_account_access(account_id, organization_id)

    # Get campaign
    result = db.table("campaigns").select("id, name").eq("id", campaign_id).eq(
        "ad_account_id", account_id
    ).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign = result.data[0]

    # Update status
    db.table("campaigns").update({
        "status": "ENABLED",
    }).eq("id", campaign_id).execute()

    # TODO: In production, also call Meta API to enable

    return {
        "success": True,
        "message": f"Campaign '{campaign['name']}' enabled",
        "campaign_id": campaign_id,
    }


@router.get("/accounts/{account_id}/summary")
async def get_meta_account_summary(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get summary statistics for a Meta ad account."""
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    verify_account_access(account_id, organization_id)

    # Get campaigns
    campaigns_result = db.table("campaigns").select("id, status").eq(
        "ad_account_id", account_id
    ).execute()

    campaigns = campaigns_result.data or []
    total_campaigns = len(campaigns)
    active_campaigns = len([c for c in campaigns if c.get("status") == "ENABLED"])

    # Get aggregated metrics
    metrics_result = db.table("metrics_daily").select(
        "impressions, clicks, cost_micros, conversions"
    ).eq("ad_account_id", account_id).execute()

    total_spend = 0
    total_impressions = 0
    total_clicks = 0
    total_conversions = 0

    for row in (metrics_result.data or []):
        total_impressions += row.get("impressions", 0)
        total_clicks += row.get("clicks", 0)
        total_spend += int(row.get("cost_micros", 0) / 10000)
        total_conversions += int(row.get("conversions", 0) or 0)

    return {
        "account_id": account_id,
        "total_campaigns": total_campaigns,
        "active_campaigns": active_campaigns,
        "total_spend": total_spend,  # In cents
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "total_conversions": total_conversions,
        "avg_ctr": round((total_clicks / total_impressions * 100) if total_impressions > 0 else 0, 2),
        "avg_cpc": round(total_spend / total_clicks) if total_clicks > 0 else 0,
        "cost_per_conversion": round(total_spend / total_conversions) if total_conversions > 0 else None,
    }


# =============================================================================
# Ads Endpoints (Individual ads within ad sets)
# =============================================================================

@router.get("/accounts/{account_id}/adsets/{adset_id}/ads", response_model=AdsResponse)
async def list_meta_ads(
    account_id: str,
    adset_id: str,
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """List all ads for a Meta ad set."""
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    verify_account_access(account_id, organization_id)

    # Verify ad set exists and get campaign
    adset_check = db.table("ad_groups").select("id, campaign_id").eq("id", adset_id).execute()
    if not adset_check.data:
        raise HTTPException(status_code=404, detail="Ad set not found")

    # Verify campaign belongs to account
    campaign_id = adset_check.data[0]["campaign_id"]
    campaign_check = db.table("campaigns").select("id").eq("id", campaign_id).eq(
        "ad_account_id", account_id
    ).execute()

    if not campaign_check.data:
        raise HTTPException(status_code=404, detail="Ad set not found in this account")

    # Get ads
    query = db.table("ads").select("*").eq("ad_group_id", adset_id)

    if status:
        db_status = "ENABLED" if status.upper() == "ACTIVE" else status.upper()
        query = query.eq("status", db_status)

    result = query.execute()
    ads_data = result.data or []

    # Build response
    ads = []
    for a in ads_data:
        meta_status = "ACTIVE" if a.get("status") == "ENABLED" else a.get("status", "PAUSED")

        # Calculate CTR
        impressions = 0  # Would come from metrics in production
        clicks = 0
        ctr = round((clicks / impressions * 100) if impressions > 0 else 0, 2)

        ads.append(MetaAd(
            id=a["id"],
            ad_set_id=adset_id,
            name=a.get("name", ""),
            status=meta_status,
            creative_id=a.get("creative_id", ""),
            preview_url=a.get("preview_url"),
            spend=0,  # Would aggregate from metrics
            impressions=impressions,
            clicks=clicks,
            ctr=ctr,
            created_time=a.get("created_at", datetime.utcnow().isoformat()),
        ))

    total = len(ads)
    ads = ads[offset:offset + limit]

    return AdsResponse(ads=ads, total=total)


@router.get("/accounts/{account_id}/ads/{ad_id}", response_model=MetaAd)
async def get_meta_ad(
    account_id: str,
    ad_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get details of a specific Meta ad."""
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    verify_account_access(account_id, organization_id)

    # Get ad with ad group info
    result = db.table("ads").select("*").eq("id", ad_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Ad not found")

    a = result.data[0]
    ad_group_id = a.get("ad_group_id")

    # Verify ad belongs to account through campaign chain
    adset_check = db.table("ad_groups").select("campaign_id").eq("id", ad_group_id).execute()
    if not adset_check.data:
        raise HTTPException(status_code=404, detail="Ad not found")

    campaign_id = adset_check.data[0]["campaign_id"]
    campaign_check = db.table("campaigns").select("id").eq("id", campaign_id).eq(
        "ad_account_id", account_id
    ).execute()

    if not campaign_check.data:
        raise HTTPException(status_code=404, detail="Ad not found in this account")

    meta_status = "ACTIVE" if a.get("status") == "ENABLED" else a.get("status", "PAUSED")

    return MetaAd(
        id=a["id"],
        ad_set_id=ad_group_id,
        name=a.get("name", ""),
        status=meta_status,
        creative_id=a.get("creative_id", ""),
        preview_url=a.get("preview_url"),
        spend=0,
        impressions=0,
        clicks=0,
        ctr=0,
        created_time=a.get("created_at", datetime.utcnow().isoformat()),
    )


@router.post("/accounts/{account_id}/ads/{ad_id}/pause")
async def pause_meta_ad(
    account_id: str,
    ad_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Pause a Meta ad."""
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    verify_account_access(account_id, organization_id)

    # Get ad
    result = db.table("ads").select("id, name, ad_group_id").eq("id", ad_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Ad not found")

    ad = result.data[0]

    # Verify ownership through campaign chain
    adset_check = db.table("ad_groups").select("campaign_id").eq("id", ad["ad_group_id"]).execute()
    if adset_check.data:
        campaign_check = db.table("campaigns").select("id").eq(
            "id", adset_check.data[0]["campaign_id"]
        ).eq("ad_account_id", account_id).execute()

        if not campaign_check.data:
            raise HTTPException(status_code=404, detail="Ad not found in this account")

    # Update status
    db.table("ads").update({"status": "PAUSED"}).eq("id", ad_id).execute()

    return {
        "success": True,
        "message": f"Ad '{ad['name']}' paused",
        "ad_id": ad_id,
    }


@router.post("/accounts/{account_id}/ads/{ad_id}/enable")
async def enable_meta_ad(
    account_id: str,
    ad_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Enable (unpause) a Meta ad."""
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    verify_account_access(account_id, organization_id)

    # Get ad
    result = db.table("ads").select("id, name, ad_group_id").eq("id", ad_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Ad not found")

    ad = result.data[0]

    # Verify ownership through campaign chain
    adset_check = db.table("ad_groups").select("campaign_id").eq("id", ad["ad_group_id"]).execute()
    if adset_check.data:
        campaign_check = db.table("campaigns").select("id").eq(
            "id", adset_check.data[0]["campaign_id"]
        ).eq("ad_account_id", account_id).execute()

        if not campaign_check.data:
            raise HTTPException(status_code=404, detail="Ad not found in this account")

    # Update status
    db.table("ads").update({"status": "ENABLED"}).eq("id", ad_id).execute()

    return {
        "success": True,
        "message": f"Ad '{ad['name']}' enabled",
        "ad_id": ad_id,
    }


@router.get("/accounts/{account_id}/adsets/{adset_id}/summary")
async def get_meta_adset_summary(
    account_id: str,
    adset_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get summary statistics for a Meta ad set."""
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    verify_account_access(account_id, organization_id)

    # Get ad set
    adset_result = db.table("ad_groups").select("*").eq("id", adset_id).execute()
    if not adset_result.data:
        raise HTTPException(status_code=404, detail="Ad set not found")

    adset = adset_result.data[0]

    # Verify ownership
    campaign_check = db.table("campaigns").select("id").eq(
        "id", adset["campaign_id"]
    ).eq("ad_account_id", account_id).execute()

    if not campaign_check.data:
        raise HTTPException(status_code=404, detail="Ad set not found in this account")

    # Get ads count
    ads_result = db.table("ads").select("id, status").eq("ad_group_id", adset_id).execute()
    ads = ads_result.data or []
    total_ads = len(ads)
    active_ads = len([a for a in ads if a.get("status") == "ENABLED"])

    # Get metrics
    metrics_result = db.table("metrics_daily").select(
        "impressions, clicks, cost_micros, conversions"
    ).eq("ad_group_id", adset_id).execute()

    total_spend = 0
    total_impressions = 0
    total_clicks = 0
    total_conversions = 0

    for row in (metrics_result.data or []):
        total_impressions += row.get("impressions", 0)
        total_clicks += row.get("clicks", 0)
        total_spend += int(row.get("cost_micros", 0) / 10000)
        total_conversions += int(row.get("conversions", 0) or 0)

    return {
        "adset_id": adset_id,
        "adset_name": adset.get("name", ""),
        "status": "ACTIVE" if adset.get("status") == "ENABLED" else adset.get("status", "PAUSED"),
        "total_ads": total_ads,
        "active_ads": active_ads,
        "total_spend": total_spend,
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "total_conversions": total_conversions,
        "avg_ctr": round((total_clicks / total_impressions * 100) if total_impressions > 0 else 0, 2),
        "avg_cpc": round(total_spend / total_clicks) if total_clicks > 0 else 0,
        "cost_per_conversion": round(total_spend / total_conversions) if total_conversions > 0 else None,
    }


# =============================================================================
# Sync Endpoints (Fetch data from Meta API)
# =============================================================================

@router.post("/accounts/{account_id}/sync")
async def sync_meta_account(
    account_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Sync all campaigns and metrics from Meta for an account.
    Fetches latest data from Meta Marketing API and stores in database.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Get account with token
    account = verify_account_access(account_id, organization_id)
    access_token = account.get("access_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="Account not connected. Please reconnect.")

    external_account_id = account.get("external_account_id")

    try:
        # Initialize Meta service
        meta_service = MetaAdsService(access_token)

        # Fetch campaigns from Meta
        meta_campaigns = await meta_service.get_campaigns(external_account_id)

        campaigns_synced = 0
        metrics_synced = 0

        for mc in meta_campaigns:
            # Check if campaign exists in database
            external_id = mc.get("id")
            existing = db.table("campaigns").select("id").eq(
                "external_campaign_id", external_id
            ).eq("ad_account_id", account_id).execute()

            # Map Meta status to our status
            meta_status = mc.get("status", "PAUSED")
            db_status = "ENABLED" if meta_status == "ACTIVE" else meta_status

            # Budget handling
            daily_budget = mc.get("daily_budget")
            lifetime_budget = mc.get("lifetime_budget")
            budget_micros = None
            budget_type = None

            if daily_budget:
                budget_micros = int(daily_budget) * 10000  # cents to micros
                budget_type = "DAILY"
            elif lifetime_budget:
                budget_micros = int(lifetime_budget) * 10000
                budget_type = "LIFETIME"

            campaign_data = {
                "name": mc.get("name", f"Campaign {external_id}"),
                "status": db_status,
                "campaign_type": "META",
                "budget_micros": budget_micros,
                "budget_type": budget_type,
                "settings": {"objective": mc.get("objective", "OUTCOME_TRAFFIC")},
            }

            if existing.data:
                # Update existing
                db.table("campaigns").update(campaign_data).eq(
                    "id", existing.data[0]["id"]
                ).execute()
                campaign_id = existing.data[0]["id"]
            else:
                # Insert new
                campaign_data["id"] = str(uuid.uuid4())
                campaign_data["ad_account_id"] = account_id
                campaign_data["external_campaign_id"] = external_id
                db.table("campaigns").insert(campaign_data).execute()
                campaign_id = campaign_data["id"]

            campaigns_synced += 1

            # Fetch and store insights for this campaign
            try:
                insights = await meta_service.get_campaign_insights(external_id)
                metrics_list = MetaAdsService.parse_insights_to_metrics(insights)

                for m in metrics_list:
                    # Check if metric exists for this date
                    existing_metric = db.table("metrics_daily").select("id").eq(
                        "campaign_id", campaign_id
                    ).eq("metric_date", m["metric_date"]).execute()

                    metric_data = {
                        "ad_account_id": account_id,
                        "campaign_id": campaign_id,
                        "metric_date": m["metric_date"],
                        "impressions": m["impressions"],
                        "clicks": m["clicks"],
                        "cost_micros": m["cost_micros"],
                        "conversions": m["conversions"],
                        "conversion_value_micros": m.get("conversion_value_micros", 0),
                    }

                    if existing_metric.data:
                        db.table("metrics_daily").update(metric_data).eq(
                            "id", existing_metric.data[0]["id"]
                        ).execute()
                    else:
                        metric_data["id"] = str(uuid.uuid4())
                        db.table("metrics_daily").insert(metric_data).execute()

                    metrics_synced += 1

            except Exception as e:
                # Continue even if insights fail for a campaign
                pass

        # Update last sync time
        db.table("ad_accounts").update({
            "last_sync_at": datetime.utcnow().isoformat(),
        }).eq("id", account_id).execute()

        return {
            "success": True,
            "message": f"Synced {campaigns_synced} campaigns, {metrics_synced} metric records",
            "campaigns_synced": campaigns_synced,
            "metrics_synced": metrics_synced,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.post("/accounts/{account_id}/campaigns/{campaign_id}/sync")
async def sync_meta_campaign(
    account_id: str,
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Sync a specific campaign and its ad sets/ads from Meta.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Get account with token
    account = verify_account_access(account_id, organization_id)
    access_token = account.get("access_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="Account not connected. Please reconnect.")

    # Get campaign
    campaign_result = db.table("campaigns").select("*").eq("id", campaign_id).eq(
        "ad_account_id", account_id
    ).execute()

    if not campaign_result.data:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign = campaign_result.data[0]
    external_campaign_id = campaign.get("external_campaign_id")

    if not external_campaign_id:
        raise HTTPException(status_code=400, detail="Campaign not linked to Meta")

    try:
        meta_service = MetaAdsService(access_token)

        # Fetch ad sets
        meta_adsets = await meta_service.get_adsets(external_campaign_id)
        adsets_synced = 0
        ads_synced = 0

        for mas in meta_adsets:
            external_adset_id = mas.get("id")

            # Check if ad set exists
            existing = db.table("ad_groups").select("id").eq(
                "external_ad_group_id", external_adset_id
            ).eq("campaign_id", campaign_id).execute()

            db_status = "ENABLED" if mas.get("status") == "ACTIVE" else mas.get("status", "PAUSED")

            adset_data = {
                "name": mas.get("name", f"Ad Set {external_adset_id}"),
                "status": db_status,
                "ad_group_type": mas.get("optimization_goal", "CONVERSIONS"),
            }

            if existing.data:
                db.table("ad_groups").update(adset_data).eq(
                    "id", existing.data[0]["id"]
                ).execute()
                adset_id = existing.data[0]["id"]
            else:
                adset_data["id"] = str(uuid.uuid4())
                adset_data["campaign_id"] = campaign_id
                adset_data["external_ad_group_id"] = external_adset_id
                db.table("ad_groups").insert(adset_data).execute()
                adset_id = adset_data["id"]

            adsets_synced += 1

            # Fetch ads for this ad set
            try:
                meta_ads = await meta_service.get_ads(external_adset_id)

                for mad in meta_ads:
                    external_ad_id = mad.get("id")

                    existing_ad = db.table("ads").select("id").eq(
                        "external_ad_id", external_ad_id
                    ).eq("ad_group_id", adset_id).execute()

                    ad_status = "ENABLED" if mad.get("status") == "ACTIVE" else mad.get("status", "PAUSED")

                    ad_data = {
                        "name": mad.get("name", f"Ad {external_ad_id}"),
                        "status": ad_status,
                        "creative_id": mad.get("creative", {}).get("id", ""),
                        "preview_url": mad.get("preview_shareable_link"),
                    }

                    if existing_ad.data:
                        db.table("ads").update(ad_data).eq(
                            "id", existing_ad.data[0]["id"]
                        ).execute()
                    else:
                        ad_data["id"] = str(uuid.uuid4())
                        ad_data["ad_group_id"] = adset_id
                        ad_data["external_ad_id"] = external_ad_id
                        db.table("ads").insert(ad_data).execute()

                    ads_synced += 1

            except Exception:
                pass

        return {
            "success": True,
            "message": f"Synced {adsets_synced} ad sets, {ads_synced} ads",
            "adsets_synced": adsets_synced,
            "ads_synced": ads_synced,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")
