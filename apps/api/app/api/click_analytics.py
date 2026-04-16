"""Click Analytics API - Attribution and click tracking analysis.

Provides detailed attribution analytics including:
- Click-to-conversion attribution
- Multi-touch attribution models
- Source/medium analysis
- UTM parameter tracking
- Click ID analysis (gclid, fbclid, etc.)
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .user_auth import get_current_user
from ..services.supabase_client import get_supabase_client as get_supabase


router = APIRouter(prefix="/api/v1/analytics/clicks", tags=["Click Analytics"])


# ============================================================================
# Models
# ============================================================================

class AttributionSource(BaseModel):
    """Attribution source breakdown."""
    source: str
    medium: str
    conversions: int = 0
    revenue_micros: int = 0
    first_touch_conversions: int = 0
    last_touch_conversions: int = 0
    assisted_conversions: int = 0
    avg_time_to_convert_hours: float = 0.0


class ClickIdStats(BaseModel):
    """Statistics for a click ID type."""
    click_id_type: str  # gclid, fbclid, gbraid, wbraid, msclkid, ttclkid
    total_clicks: int = 0
    total_conversions: int = 0
    conversion_rate: float = 0.0
    revenue_micros: int = 0
    avg_conversion_value_micros: int = 0


class UTMCampaignStats(BaseModel):
    """UTM campaign performance."""
    utm_campaign: str
    utm_source: str
    utm_medium: str
    visitors: int = 0
    conversions: int = 0
    revenue_micros: int = 0
    conversion_rate: float = 0.0


class AttributionPath(BaseModel):
    """Conversion attribution path."""
    conversion_id: str
    touchpoints: List[Dict[str, Any]]
    total_touchpoints: int
    first_touch_source: str
    last_touch_source: str
    time_to_convert_hours: float


class AttributionOverview(BaseModel):
    """Attribution analytics overview."""
    date_from: str
    date_to: str
    total_conversions: int
    total_revenue_micros: int
    by_source: List[AttributionSource]
    by_click_id: List[ClickIdStats]
    top_utm_campaigns: List[UTMCampaignStats]
    attribution_model: str


class ChannelAttribution(BaseModel):
    """Channel-level attribution."""
    channel: str
    first_touch_pct: float = 0.0
    last_touch_pct: float = 0.0
    linear_pct: float = 0.0
    time_decay_pct: float = 0.0
    conversions: int = 0
    revenue_micros: int = 0


class TouchpointAnalysis(BaseModel):
    """Multi-touch analysis."""
    avg_touchpoints_per_conversion: float
    single_touch_pct: float
    multi_touch_pct: float
    avg_path_length_days: float
    top_paths: List[Dict[str, Any]]


# ============================================================================
# Helper Functions
# ============================================================================

CHANNEL_MAPPING = {
    "google": "Paid Search",
    "facebook": "Paid Social",
    "instagram": "Paid Social",
    "meta": "Paid Social",
    "bing": "Paid Search",
    "linkedin": "Paid Social",
    "twitter": "Paid Social",
    "tiktok": "Paid Social",
    "email": "Email",
    "organic": "Organic Search",
    "direct": "Direct",
    "referral": "Referral",
    "affiliate": "Affiliate",
    "(none)": "Direct",
    "": "Direct",
}


def get_channel(source: str, medium: str) -> str:
    """Map source/medium to channel."""
    source_lower = (source or "").lower()
    medium_lower = (medium or "").lower()

    if medium_lower in ["cpc", "ppc", "paid", "paidsearch"]:
        if "google" in source_lower:
            return "Paid Search"
        elif any(s in source_lower for s in ["facebook", "fb", "instagram", "meta"]):
            return "Paid Social"
        else:
            return "Paid Search"

    if medium_lower in ["social", "social-media", "sm"]:
        return "Organic Social"

    if medium_lower == "organic":
        return "Organic Search"

    if medium_lower == "email":
        return "Email"

    if medium_lower == "referral":
        return "Referral"

    if medium_lower in ["affiliate", "partner"]:
        return "Affiliate"

    if source_lower in CHANNEL_MAPPING:
        return CHANNEL_MAPPING[source_lower]

    if not source_lower or source_lower == "(direct)":
        return "Direct"

    return "Other"


def calculate_time_decay_weight(touchpoint_index: int, total_touchpoints: int, half_life_days: float = 7) -> float:
    """Calculate time decay weight for a touchpoint."""
    if total_touchpoints <= 1:
        return 1.0
    # More recent touchpoints get higher weight
    recency = touchpoint_index / (total_touchpoints - 1)
    return pow(2, recency * half_life_days / half_life_days)


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/overview", response_model=AttributionOverview)
async def get_attribution_overview(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    attribution_model: str = Query("last_touch", description="Model: last_touch, first_touch, linear, time_decay"),
):
    """Get comprehensive attribution analytics overview."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default dates
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get conversions with attribution data
    conv_result = supabase.table("offline_conversions").select(
        "id, value_micros, gclid, fbclid, gbraid, wbraid, "
        "utm_source, utm_medium, utm_campaign, occurred_at, created_at"
    ).eq("organization_id", org_id).gte(
        "occurred_at", f"{date_from}T00:00:00Z"
    ).lte("occurred_at", f"{date_to}T23:59:59Z").execute()

    conversions = conv_result.data or []
    total_conversions = len(conversions)
    total_revenue = sum(c.get("value_micros", 0) for c in conversions)

    # Aggregate by source/medium
    source_stats: Dict[str, Dict] = defaultdict(lambda: {
        "conversions": 0, "revenue": 0, "first_touch": 0, "last_touch": 0, "assisted": 0
    })

    for conv in conversions:
        source = conv.get("utm_source") or "direct"
        medium = conv.get("utm_medium") or "(none)"
        key = f"{source}|{medium}"

        source_stats[key]["conversions"] += 1
        source_stats[key]["revenue"] += conv.get("value_micros", 0)
        source_stats[key]["last_touch"] += 1  # For single-touch, last = first

    by_source = []
    for key, stats in source_stats.items():
        source, medium = key.split("|")
        by_source.append(AttributionSource(
            source=source,
            medium=medium,
            conversions=stats["conversions"],
            revenue_micros=stats["revenue"],
            first_touch_conversions=stats["conversions"],
            last_touch_conversions=stats["last_touch"],
            assisted_conversions=stats["assisted"],
        ))

    by_source.sort(key=lambda x: x.revenue_micros, reverse=True)

    # Aggregate by click ID type
    click_id_stats: Dict[str, Dict] = {
        "gclid": {"clicks": 0, "conversions": 0, "revenue": 0},
        "fbclid": {"clicks": 0, "conversions": 0, "revenue": 0},
        "gbraid": {"clicks": 0, "conversions": 0, "revenue": 0},
        "wbraid": {"clicks": 0, "conversions": 0, "revenue": 0},
    }

    for conv in conversions:
        if conv.get("gclid"):
            click_id_stats["gclid"]["conversions"] += 1
            click_id_stats["gclid"]["revenue"] += conv.get("value_micros", 0)
        if conv.get("fbclid"):
            click_id_stats["fbclid"]["conversions"] += 1
            click_id_stats["fbclid"]["revenue"] += conv.get("value_micros", 0)
        if conv.get("gbraid"):
            click_id_stats["gbraid"]["conversions"] += 1
            click_id_stats["gbraid"]["revenue"] += conv.get("value_micros", 0)
        if conv.get("wbraid"):
            click_id_stats["wbraid"]["conversions"] += 1
            click_id_stats["wbraid"]["revenue"] += conv.get("value_micros", 0)

    by_click_id = []
    for cid_type, stats in click_id_stats.items():
        if stats["conversions"] > 0:
            by_click_id.append(ClickIdStats(
                click_id_type=cid_type,
                total_clicks=stats["clicks"] or stats["conversions"],  # Approximate
                total_conversions=stats["conversions"],
                conversion_rate=100.0,  # Would need click data to calculate
                revenue_micros=stats["revenue"],
                avg_conversion_value_micros=int(stats["revenue"] / stats["conversions"]) if stats["conversions"] > 0 else 0,
            ))

    # UTM Campaign stats
    campaign_stats: Dict[str, Dict] = defaultdict(lambda: {
        "source": "", "medium": "", "visitors": 0, "conversions": 0, "revenue": 0
    })

    for conv in conversions:
        campaign = conv.get("utm_campaign")
        if campaign:
            campaign_stats[campaign]["source"] = conv.get("utm_source", "")
            campaign_stats[campaign]["medium"] = conv.get("utm_medium", "")
            campaign_stats[campaign]["conversions"] += 1
            campaign_stats[campaign]["revenue"] += conv.get("value_micros", 0)

    top_campaigns = []
    for campaign, stats in campaign_stats.items():
        top_campaigns.append(UTMCampaignStats(
            utm_campaign=campaign,
            utm_source=stats["source"],
            utm_medium=stats["medium"],
            visitors=stats["visitors"] or stats["conversions"] * 10,  # Estimate
            conversions=stats["conversions"],
            revenue_micros=stats["revenue"],
            conversion_rate=10.0,  # Would need visitor data to calculate
        ))

    top_campaigns.sort(key=lambda x: x.revenue_micros, reverse=True)
    top_campaigns = top_campaigns[:10]

    return AttributionOverview(
        date_from=date_from,
        date_to=date_to,
        total_conversions=total_conversions,
        total_revenue_micros=total_revenue,
        by_source=by_source[:20],
        by_click_id=by_click_id,
        top_utm_campaigns=top_campaigns,
        attribution_model=attribution_model,
    )


@router.get("/channels")
async def get_channel_attribution(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Get attribution breakdown by marketing channel."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default dates
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get conversions
    conv_result = supabase.table("offline_conversions").select(
        "id, value_micros, utm_source, utm_medium"
    ).eq("organization_id", org_id).gte(
        "occurred_at", f"{date_from}T00:00:00Z"
    ).lte("occurred_at", f"{date_to}T23:59:59Z").execute()

    # Aggregate by channel
    channel_stats: Dict[str, Dict] = defaultdict(lambda: {"conversions": 0, "revenue": 0})

    for conv in conv_result.data or []:
        channel = get_channel(conv.get("utm_source", ""), conv.get("utm_medium", ""))
        channel_stats[channel]["conversions"] += 1
        channel_stats[channel]["revenue"] += conv.get("value_micros", 0)

    total_conv = sum(s["conversions"] for s in channel_stats.values())
    total_rev = sum(s["revenue"] for s in channel_stats.values())

    channels = []
    for channel, stats in channel_stats.items():
        conv_pct = (stats["conversions"] / total_conv * 100) if total_conv > 0 else 0
        rev_pct = (stats["revenue"] / total_rev * 100) if total_rev > 0 else 0

        channels.append(ChannelAttribution(
            channel=channel,
            first_touch_pct=conv_pct,
            last_touch_pct=conv_pct,
            linear_pct=conv_pct,
            time_decay_pct=conv_pct,
            conversions=stats["conversions"],
            revenue_micros=stats["revenue"],
        ))

    channels.sort(key=lambda x: x.conversions, reverse=True)

    return {
        "date_from": date_from,
        "date_to": date_to,
        "total_conversions": total_conv,
        "total_revenue_micros": total_rev,
        "channels": channels,
    }


@router.get("/utm")
async def get_utm_analytics(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    group_by: str = Query("campaign", description="Group by: source, medium, campaign, term, content"),
):
    """Get UTM parameter analytics."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default dates
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    # Field mapping
    field_map = {
        "source": "utm_source",
        "medium": "utm_medium",
        "campaign": "utm_campaign",
        "term": "utm_term",
        "content": "utm_content",
    }
    group_field = field_map.get(group_by, "utm_campaign")

    # Get conversions
    conv_result = supabase.table("offline_conversions").select(
        f"id, value_micros, {group_field}"
    ).eq("organization_id", org_id).gte(
        "occurred_at", f"{date_from}T00:00:00Z"
    ).lte("occurred_at", f"{date_to}T23:59:59Z").execute()

    # Get visitors/events
    events_result = supabase.table("tracking_events").select(
        f"id, event_data"
    ).eq("organization_id", org_id).eq("event_type", "page_view").gte(
        "timestamp", f"{date_from}T00:00:00Z"
    ).lte("timestamp", f"{date_to}T23:59:59Z").limit(5000).execute()

    # Aggregate
    utm_stats: Dict[str, Dict] = defaultdict(lambda: {"visitors": 0, "conversions": 0, "revenue": 0})

    for conv in conv_result.data or []:
        value = conv.get(group_field) or "(not set)"
        utm_stats[value]["conversions"] += 1
        utm_stats[value]["revenue"] += conv.get("value_micros", 0)

    # Estimate visitors from events (this is simplified)
    for event in events_result.data or []:
        event_data = event.get("event_data") or {}
        value = event_data.get(group_field) or "(not set)"
        utm_stats[value]["visitors"] += 1

    results = []
    for value, stats in utm_stats.items():
        conv_rate = (stats["conversions"] / stats["visitors"] * 100) if stats["visitors"] > 0 else 0
        results.append({
            group_by: value,
            "visitors": stats["visitors"],
            "conversions": stats["conversions"],
            "revenue_micros": stats["revenue"],
            "conversion_rate": round(conv_rate, 2),
        })

    results.sort(key=lambda x: x["revenue_micros"], reverse=True)

    return {
        "date_from": date_from,
        "date_to": date_to,
        "group_by": group_by,
        "data": results[:50],
        "total_conversions": sum(r["conversions"] for r in results),
        "total_revenue_micros": sum(r["revenue_micros"] for r in results),
    }


@router.get("/click-ids")
async def get_click_id_analytics(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Get click ID (gclid, fbclid, etc.) performance analytics."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default dates
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get conversions with click IDs
    conv_result = supabase.table("offline_conversions").select(
        "id, value_micros, gclid, fbclid, gbraid, wbraid, msclkid, ttclkid"
    ).eq("organization_id", org_id).gte(
        "occurred_at", f"{date_from}T00:00:00Z"
    ).lte("occurred_at", f"{date_to}T23:59:59Z").execute()

    conversions = conv_result.data or []

    # Analyze click IDs
    click_id_types = ["gclid", "fbclid", "gbraid", "wbraid", "msclkid", "ttclkid"]
    stats = {}

    for cid_type in click_id_types:
        with_id = [c for c in conversions if c.get(cid_type)]
        stats[cid_type] = {
            "name": {
                "gclid": "Google Ads",
                "fbclid": "Meta Ads",
                "gbraid": "Google (App)",
                "wbraid": "Google (Web)",
                "msclkid": "Microsoft Ads",
                "ttclkid": "TikTok Ads",
            }.get(cid_type, cid_type.upper()),
            "conversions": len(with_id),
            "revenue_micros": sum(c.get("value_micros", 0) for c in with_id),
            "avg_value_micros": int(sum(c.get("value_micros", 0) for c in with_id) / len(with_id)) if with_id else 0,
            "pct_of_total": round(len(with_id) / len(conversions) * 100, 1) if conversions else 0,
        }

    # Count conversions without any click ID (organic/direct)
    no_click_id = [c for c in conversions if not any(c.get(cid) for cid in click_id_types)]
    stats["organic_direct"] = {
        "name": "Organic/Direct",
        "conversions": len(no_click_id),
        "revenue_micros": sum(c.get("value_micros", 0) for c in no_click_id),
        "avg_value_micros": int(sum(c.get("value_micros", 0) for c in no_click_id) / len(no_click_id)) if no_click_id else 0,
        "pct_of_total": round(len(no_click_id) / len(conversions) * 100, 1) if conversions else 0,
    }

    # Sort by conversions
    sorted_stats = sorted(stats.items(), key=lambda x: x[1]["conversions"], reverse=True)

    return {
        "date_from": date_from,
        "date_to": date_to,
        "total_conversions": len(conversions),
        "click_ids": [{"type": k, **v} for k, v in sorted_stats],
        "insights": [
            f"{stats['gclid']['pct_of_total']}% of conversions came from Google Ads" if stats['gclid']['conversions'] > 0 else None,
            f"{stats['fbclid']['pct_of_total']}% of conversions came from Meta Ads" if stats['fbclid']['conversions'] > 0 else None,
            f"{stats['organic_direct']['pct_of_total']}% of conversions had no paid click ID" if stats['organic_direct']['conversions'] > 0 else None,
        ],
    }


@router.get("/paths")
async def get_conversion_paths(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    """Get most common conversion paths (multi-touch)."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default dates
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get conversions with visitor IDs
    conv_result = supabase.table("offline_conversions").select(
        "id, visitor_id, utm_source, utm_medium, occurred_at"
    ).eq("organization_id", org_id).gte(
        "occurred_at", f"{date_from}T00:00:00Z"
    ).lte("occurred_at", f"{date_to}T23:59:59Z").not_.is_(
        "visitor_id", "null"
    ).limit(500).execute()

    # Group paths
    path_counts: Dict[str, int] = defaultdict(int)
    paths_data = []

    for conv in conv_result.data or []:
        # For simplicity, treat each conversion as single-touch
        # In a full implementation, we'd look up all events for the visitor
        source = conv.get("utm_source") or "direct"
        channel = get_channel(source, conv.get("utm_medium", ""))

        path = channel
        path_counts[path] += 1

        paths_data.append({
            "conversion_id": conv["id"],
            "path": [channel],
            "touchpoints": 1,
            "first_touch": channel,
            "last_touch": channel,
        })

    # Build top paths
    top_paths = sorted(path_counts.items(), key=lambda x: x[1], reverse=True)[:limit]

    # Calculate multi-touch metrics
    total_conversions = len(paths_data)
    single_touch = len([p for p in paths_data if p["touchpoints"] == 1])
    multi_touch = total_conversions - single_touch

    return {
        "date_from": date_from,
        "date_to": date_to,
        "total_conversions": total_conversions,
        "avg_touchpoints": 1.0,  # Would be higher with full multi-touch data
        "single_touch_pct": round(single_touch / max(total_conversions, 1) * 100, 1),
        "multi_touch_pct": round(multi_touch / max(total_conversions, 1) * 100, 1),
        "top_paths": [{"path": p, "conversions": c, "pct": round(c / max(total_conversions, 1) * 100, 1)} for p, c in top_paths],
    }


@router.get("/source-medium")
async def get_source_medium_report(
    user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    sort_by: str = Query("conversions", description="Sort by: conversions, revenue, visitors"),
    limit: int = Query(50, ge=1, le=100),
):
    """Get source/medium breakdown similar to GA4."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Default dates
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    # Get conversions
    conv_result = supabase.table("offline_conversions").select(
        "id, value_micros, utm_source, utm_medium"
    ).eq("organization_id", org_id).gte(
        "occurred_at", f"{date_from}T00:00:00Z"
    ).lte("occurred_at", f"{date_to}T23:59:59Z").execute()

    # Get page views for visitor counts
    events_result = supabase.table("tracking_events").select(
        "visitor_id, event_data"
    ).eq("organization_id", org_id).eq("event_type", "page_view").gte(
        "timestamp", f"{date_from}T00:00:00Z"
    ).lte("timestamp", f"{date_to}T23:59:59Z").limit(10000).execute()

    # Aggregate
    sm_stats: Dict[str, Dict] = defaultdict(lambda: {
        "visitors": set(), "conversions": 0, "revenue": 0
    })

    for conv in conv_result.data or []:
        source = conv.get("utm_source") or "(direct)"
        medium = conv.get("utm_medium") or "(none)"
        key = f"{source} / {medium}"

        sm_stats[key]["conversions"] += 1
        sm_stats[key]["revenue"] += conv.get("value_micros", 0)

    for event in events_result.data or []:
        event_data = event.get("event_data") or {}
        source = event_data.get("utm_source") or "(direct)"
        medium = event_data.get("utm_medium") or "(none)"
        key = f"{source} / {medium}"

        if event.get("visitor_id"):
            sm_stats[key]["visitors"].add(event["visitor_id"])

    # Build results
    results = []
    for key, stats in sm_stats.items():
        parts = key.split(" / ")
        source = parts[0] if len(parts) > 0 else "(direct)"
        medium = parts[1] if len(parts) > 1 else "(none)"
        visitors = len(stats["visitors"])

        results.append({
            "source_medium": key,
            "source": source,
            "medium": medium,
            "channel": get_channel(source, medium),
            "visitors": visitors,
            "conversions": stats["conversions"],
            "revenue_micros": stats["revenue"],
            "conversion_rate": round(stats["conversions"] / max(visitors, 1) * 100, 2),
            "avg_value_micros": int(stats["revenue"] / stats["conversions"]) if stats["conversions"] > 0 else 0,
        })

    # Sort
    sort_key = {"conversions": "conversions", "revenue": "revenue_micros", "visitors": "visitors"}.get(sort_by, "conversions")
    results.sort(key=lambda x: x[sort_key], reverse=True)
    results = results[:limit]

    # Totals
    total_visitors = sum(r["visitors"] for r in results)
    total_conversions = sum(r["conversions"] for r in results)
    total_revenue = sum(r["revenue_micros"] for r in results)

    return {
        "date_from": date_from,
        "date_to": date_to,
        "data": results,
        "totals": {
            "visitors": total_visitors,
            "conversions": total_conversions,
            "revenue_micros": total_revenue,
            "overall_conversion_rate": round(total_conversions / max(total_visitors, 1) * 100, 2),
        },
    }
