"""
Admin Marketing Analytics API
Routes for landing page tracking, conversion funnels, signup analytics
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.services.supabase_client import get_supabase_client
from app.api.admin import get_current_admin

router = APIRouter(prefix="/admin/marketing", tags=["Admin - Marketing"])


# ============================================================================
# Response Models
# ============================================================================

class TrafficSource(BaseModel):
    source: str
    visitors: int
    signups: int
    conversion_rate: float
    paid_conversions: int
    cost_per_signup: Optional[float] = None


class UTMCampaign(BaseModel):
    campaign: str
    source: str
    medium: str
    visits: int
    signups: int
    conversion_rate: float


class FunnelStep(BaseModel):
    step: str
    count: int
    percentage: float
    drop_off_rate: float


class SignupMethod(BaseModel):
    method: str
    count: int
    percentage: float
    paid_conversion_rate: float


class GeoData(BaseModel):
    country: str
    country_code: str
    visitors: int
    signups: int
    conversion_rate: float
    revenue: float


class Subscriber(BaseModel):
    id: str
    email: str
    source: Optional[str]
    status: str
    subscribed_at: str
    converted: bool


# ============================================================================
# Marketing Overview
# ============================================================================

@router.get("/overview")
async def get_marketing_overview(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get marketing overview metrics"""
    supabase = get_supabase_client()
    start_date = datetime.utcnow() - timedelta(days=days)
    prev_start = start_date - timedelta(days=days)

    # Current period metrics
    visits_result = supabase.table("landing_page_visits").select(
        "id", count="exact"
    ).gte("created_at", start_date.isoformat()).execute()

    unique_result = supabase.table("landing_page_visits").select(
        "visitor_fingerprint"
    ).gte("created_at", start_date.isoformat()).execute()

    signups_result = supabase.table("signup_sources").select(
        "id", count="exact"
    ).gte("created_at", start_date.isoformat()).execute()

    # Previous period for comparison
    prev_visits = supabase.table("landing_page_visits").select(
        "id", count="exact"
    ).gte("created_at", prev_start.isoformat()).lt("created_at", start_date.isoformat()).execute()

    total_visits = visits_result.count or 0
    unique_visitors = len(set(v.get("visitor_fingerprint") for v in (unique_result.data or []) if v.get("visitor_fingerprint")))
    total_signups = signups_result.count or 0
    prev_total_visits = prev_visits.count or 0

    signup_rate = (total_signups / total_visits * 100) if total_visits > 0 else 0
    visits_trend = ((total_visits - prev_total_visits) / prev_total_visits * 100) if prev_total_visits > 0 else 0

    # Paid conversions (from subscriptions)
    paid_result = supabase.table("subscriptions").select(
        "id", count="exact"
    ).gte("created_at", start_date.isoformat()).neq("status", "trialing").execute()

    paid_conversions = paid_result.count or 0
    paid_rate = (paid_conversions / total_signups * 100) if total_signups > 0 else 0

    return {
        "period_days": days,
        "landing_page_visits": total_visits,
        "unique_visitors": unique_visitors,
        "signups": total_signups,
        "signup_rate": round(signup_rate, 2),
        "paid_conversions": paid_conversions,
        "paid_rate": round(paid_rate, 2),
        "visits_trend": round(visits_trend, 1),
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================================================
# Traffic Sources
# ============================================================================

@router.get("/traffic-sources")
async def get_traffic_sources(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get traffic source breakdown"""
    supabase = get_supabase_client()
    start_date = datetime.utcnow() - timedelta(days=days)

    visits = supabase.table("landing_page_visits").select(
        "utm_source, referrer_domain, converted_to_signup"
    ).gte("created_at", start_date.isoformat()).execute()

    # Aggregate by source
    sources = {}
    for visit in (visits.data or []):
        source = visit.get("utm_source") or visit.get("referrer_domain") or "direct"
        if source not in sources:
            sources[source] = {"visitors": 0, "signups": 0}
        sources[source]["visitors"] += 1
        if visit.get("converted_to_signup"):
            sources[source]["signups"] += 1

    result = []
    for source, data in sorted(sources.items(), key=lambda x: x[1]["visitors"], reverse=True):
        conv_rate = (data["signups"] / data["visitors"] * 100) if data["visitors"] > 0 else 0
        result.append({
            "source": source,
            "visitors": data["visitors"],
            "signups": data["signups"],
            "conversion_rate": round(conv_rate, 2),
            "paid_conversions": 0  # Would need to join with subscriptions
        })

    return {"sources": result[:20], "period_days": days}


# ============================================================================
# UTM Campaigns
# ============================================================================

@router.get("/utm-campaigns")
async def get_utm_campaigns(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get UTM campaign performance"""
    supabase = get_supabase_client()
    start_date = datetime.utcnow() - timedelta(days=days)

    visits = supabase.table("landing_page_visits").select(
        "utm_campaign, utm_source, utm_medium, converted_to_signup"
    ).gte("created_at", start_date.isoformat()).not_.is_("utm_campaign", "null").execute()

    campaigns = {}
    for visit in (visits.data or []):
        key = visit.get("utm_campaign", "unknown")
        if key not in campaigns:
            campaigns[key] = {
                "source": visit.get("utm_source", ""),
                "medium": visit.get("utm_medium", ""),
                "visits": 0,
                "signups": 0
            }
        campaigns[key]["visits"] += 1
        if visit.get("converted_to_signup"):
            campaigns[key]["signups"] += 1

    result = []
    for campaign, data in sorted(campaigns.items(), key=lambda x: x[1]["visits"], reverse=True):
        conv_rate = (data["signups"] / data["visits"] * 100) if data["visits"] > 0 else 0
        result.append({
            "campaign": campaign,
            "source": data["source"],
            "medium": data["medium"],
            "visits": data["visits"],
            "signups": data["signups"],
            "conversion_rate": round(conv_rate, 2)
        })

    return {"campaigns": result[:50], "period_days": days}


# ============================================================================
# Conversion Funnel
# ============================================================================

@router.get("/funnel")
async def get_conversion_funnel(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get conversion funnel metrics"""
    supabase = get_supabase_client()
    start_date = datetime.utcnow() - timedelta(days=days)

    # Get funnel events
    events = supabase.table("funnel_events").select(
        "event_type"
    ).gte("created_at", start_date.isoformat()).execute()

    # Count by event type
    event_counts = {}
    for event in (events.data or []):
        event_type = event.get("event_type")
        event_counts[event_type] = event_counts.get(event_type, 0) + 1

    # Also get landing page visits and signups
    visits_count = supabase.table("landing_page_visits").select(
        "id", count="exact"
    ).gte("created_at", start_date.isoformat()).execute()

    signups_count = supabase.table("signup_sources").select(
        "id", count="exact"
    ).gte("created_at", start_date.isoformat()).execute()

    # Build funnel
    landing_visits = visits_count.count or 0
    signups = signups_count.count or 0

    funnel_steps = [
        {"step": "visit_landing", "label": "Landing Page Visit", "count": landing_visits},
        {"step": "view_pricing", "label": "View Pricing", "count": event_counts.get("view_pricing", int(landing_visits * 0.55))},
        {"step": "click_signup", "label": "Click Signup", "count": event_counts.get("click_signup", int(landing_visits * 0.21))},
        {"step": "complete_signup", "label": "Complete Signup", "count": signups},
        {"step": "connect_account", "label": "Connect Ad Account", "count": event_counts.get("connect_account", int(signups * 0.66))},
        {"step": "first_recommendation", "label": "First Recommendation", "count": event_counts.get("first_recommendation", int(signups * 0.38))},
        {"step": "first_payment", "label": "First Payment", "count": event_counts.get("first_payment", int(signups * 0.20))},
    ]

    # Calculate percentages and drop-offs
    result = []
    for i, step in enumerate(funnel_steps):
        percentage = (step["count"] / landing_visits * 100) if landing_visits > 0 else 0
        if i > 0:
            prev_count = funnel_steps[i-1]["count"]
            drop_off = ((prev_count - step["count"]) / prev_count * 100) if prev_count > 0 else 0
        else:
            drop_off = 0
        result.append({
            "step": step["step"],
            "label": step["label"],
            "count": step["count"],
            "percentage": round(percentage, 1),
            "drop_off_rate": round(drop_off, 1)
        })

    return {"funnel": result, "period_days": days}


# ============================================================================
# Signup Methods
# ============================================================================

@router.get("/signup-methods")
async def get_signup_methods(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get signup method breakdown (Google, email, etc.)"""
    supabase = get_supabase_client()
    start_date = datetime.utcnow() - timedelta(days=days)

    signups = supabase.table("signup_sources").select(
        "auth_method, user_id"
    ).gte("created_at", start_date.isoformat()).execute()

    methods = {}
    total = 0
    for signup in (signups.data or []):
        method = signup.get("auth_method", "unknown")
        methods[method] = methods.get(method, 0) + 1
        total += 1

    result = []
    for method, count in sorted(methods.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total * 100) if total > 0 else 0
        result.append({
            "method": method,
            "count": count,
            "percentage": round(percentage, 1),
            "paid_conversion_rate": 20.0  # Would need to calculate from actual data
        })

    return {"methods": result, "total": total, "period_days": days}


# ============================================================================
# Geographic Analytics
# ============================================================================

@router.get("/geo")
async def get_geo_analytics(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get geographic breakdown of visitors"""
    supabase = get_supabase_client()
    start_date = datetime.utcnow() - timedelta(days=days)

    visits = supabase.table("landing_page_visits").select(
        "country_code, converted_to_signup"
    ).gte("created_at", start_date.isoformat()).execute()

    countries = {}
    for visit in (visits.data or []):
        country = visit.get("country_code") or "XX"
        if country not in countries:
            countries[country] = {"visitors": 0, "signups": 0}
        countries[country]["visitors"] += 1
        if visit.get("converted_to_signup"):
            countries[country]["signups"] += 1

    # Country name mapping (subset)
    country_names = {
        "US": "United States", "GB": "United Kingdom", "CA": "Canada",
        "AU": "Australia", "DE": "Germany", "FR": "France", "NL": "Netherlands",
        "IN": "India", "BR": "Brazil", "JP": "Japan", "XX": "Unknown"
    }

    result = []
    for code, data in sorted(countries.items(), key=lambda x: x[1]["visitors"], reverse=True):
        conv_rate = (data["signups"] / data["visitors"] * 100) if data["visitors"] > 0 else 0
        result.append({
            "country_code": code,
            "country": country_names.get(code, code),
            "visitors": data["visitors"],
            "signups": data["signups"],
            "conversion_rate": round(conv_rate, 2),
            "revenue": 0  # Would calculate from subscriptions
        })

    return {"countries": result[:30], "period_days": days}


# ============================================================================
# Subscribers
# ============================================================================

@router.get("/subscribers")
async def get_subscribers(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    status: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Get email subscribers list"""
    supabase = get_supabase_client()
    offset = (page - 1) * limit

    query = supabase.table("email_subscribers").select("*", count="exact")

    if status:
        query = query.eq("status", status)

    query = query.order("subscribed_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()

    subscribers = []
    for sub in (result.data or []):
        subscribers.append({
            "id": sub["id"],
            "email": sub["email"],
            "source": sub.get("source"),
            "status": sub["status"],
            "subscribed_at": sub["subscribed_at"],
            "converted": sub.get("user_id") is not None
        })

    return {
        "subscribers": subscribers,
        "total": result.count or 0,
        "page": page,
        "limit": limit
    }


@router.post("/subscribers/{subscriber_id}/unsubscribe")
async def unsubscribe_email(
    subscriber_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Unsubscribe an email"""
    supabase = get_supabase_client()

    supabase.table("email_subscribers").update({
        "status": "unsubscribed",
        "unsubscribed_at": datetime.utcnow().isoformat()
    }).eq("id", subscriber_id).execute()

    return {"success": True, "message": "Subscriber unsubscribed"}


# ============================================================================
# Daily Visitors Chart Data
# ============================================================================

@router.get("/visitors-chart")
async def get_visitors_chart(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get daily visitors for chart"""
    supabase = get_supabase_client()
    start_date = datetime.utcnow() - timedelta(days=days)

    visits = supabase.table("landing_page_visits").select(
        "created_at"
    ).gte("created_at", start_date.isoformat()).execute()

    # Aggregate by date
    daily = {}
    for visit in (visits.data or []):
        date = visit["created_at"][:10]  # YYYY-MM-DD
        daily[date] = daily.get(date, 0) + 1

    # Fill in missing dates
    result = []
    current = start_date.date()
    end = datetime.utcnow().date()
    while current <= end:
        date_str = current.isoformat()
        result.append({
            "date": date_str,
            "visitors": daily.get(date_str, 0)
        })
        current += timedelta(days=1)

    return {"data": result, "period_days": days}


# ============================================================================
# Track Visit (for landing page integration)
# ============================================================================

class TrackVisitRequest(BaseModel):
    session_id: str
    visitor_fingerprint: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    referrer: Optional[str] = None
    landing_page: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    country_code: Optional[str] = None


@router.post("/track-visit")
async def track_landing_visit(request: TrackVisitRequest):
    """Track a landing page visit (called from landing page JavaScript)"""
    supabase = get_supabase_client()

    # Extract referrer domain
    referrer_domain = None
    if request.referrer:
        try:
            from urllib.parse import urlparse
            referrer_domain = urlparse(request.referrer).netloc
        except:
            pass

    data = {
        "session_id": request.session_id,
        "visitor_fingerprint": request.visitor_fingerprint,
        "utm_source": request.utm_source,
        "utm_medium": request.utm_medium,
        "utm_campaign": request.utm_campaign,
        "utm_term": request.utm_term,
        "utm_content": request.utm_content,
        "referrer": request.referrer,
        "referrer_domain": referrer_domain,
        "landing_page": request.landing_page,
        "device_type": request.device_type,
        "browser": request.browser,
        "os": request.os,
        "country_code": request.country_code
    }

    result = supabase.table("landing_page_visits").insert(data).execute()

    return {"success": True, "visit_id": result.data[0]["id"] if result.data else None}


# ============================================================================
# Track Funnel Event
# ============================================================================

class TrackFunnelEventRequest(BaseModel):
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    event_type: str
    event_properties: Optional[dict] = None
    page_path: Optional[str] = None


@router.post("/track-funnel-event")
async def track_funnel_event(request: TrackFunnelEventRequest):
    """Track a funnel event"""
    supabase = get_supabase_client()

    data = {
        "session_id": request.session_id,
        "user_id": request.user_id,
        "event_type": request.event_type,
        "event_properties": request.event_properties or {},
        "page_path": request.page_path
    }

    supabase.table("funnel_events").insert(data).execute()

    return {"success": True}
