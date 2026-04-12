"""Visitors API endpoints for viewing and managing tracked visitors."""

from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .user_auth import get_current_user
from ..services.supabase_client import get_supabase_client as get_supabase


router = APIRouter(prefix="/api/v1/visitors", tags=["Visitors"])


# ============================================================================
# Models
# ============================================================================

class VisitorSummary(BaseModel):
    """Summary view of a visitor."""
    id: str
    visitor_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    # Attribution
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None
    gclid: Optional[str] = None
    fbclid: Optional[str] = None

    # Location
    country_code: Optional[str] = None
    city: Optional[str] = None

    # Device
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None

    # Stats
    page_views: int = 0
    events_count: int = 0

    # Timestamps
    first_seen_at: str
    last_seen_at: str
    identified_at: Optional[str] = None


class VisitorDetail(VisitorSummary):
    """Detailed view of a visitor including all fields."""
    organization_id: str

    # All click IDs
    gbraid: Optional[str] = None
    wbraid: Optional[str] = None
    msclkid: Optional[str] = None
    ttclkid: Optional[str] = None
    li_fat_id: Optional[str] = None
    fbp: Optional[str] = None
    fbc: Optional[str] = None

    # All UTM
    utm_medium: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None

    # Full location
    country_name: Optional[str] = None
    region: Optional[str] = None
    timezone: Optional[str] = None

    # Full device
    browser_version: Optional[str] = None
    os_version: Optional[str] = None
    screen_width: Optional[int] = None
    screen_height: Optional[int] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None

    # Landing
    landing_page: Optional[str] = None
    referrer: Optional[str] = None

    # Custom data
    custom_data: Optional[dict] = None


class VisitorEvent(BaseModel):
    """A single visitor event."""
    id: str
    event_type: str
    event_name: Optional[str] = None
    page_url: Optional[str] = None
    page_path: Optional[str] = None
    page_title: Optional[str] = None
    event_data: Optional[dict] = None
    occurred_at: str


class VisitorListResponse(BaseModel):
    """Response for visitor list endpoint."""
    visitors: List[VisitorSummary]
    total: int
    page: int
    page_size: int
    has_more: bool


class VisitorStatsResponse(BaseModel):
    """Visitor statistics response."""
    total_visitors: int
    identified_visitors: int
    visitors_today: int
    visitors_this_week: int
    visitors_with_gclid: int
    visitors_with_fbclid: int
    top_sources: List[dict]
    top_campaigns: List[dict]
    device_breakdown: dict
    country_breakdown: List[dict]


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=VisitorListResponse)
async def list_visitors(
    user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by email, name, or visitor ID"),
    source: Optional[str] = Query(None, description="Filter by utm_source"),
    campaign: Optional[str] = Query(None, description="Filter by utm_campaign"),
    has_gclid: Optional[bool] = Query(None, description="Filter by GCLID presence"),
    has_fbclid: Optional[bool] = Query(None, description="Filter by FBCLID presence"),
    identified_only: Optional[bool] = Query(None, description="Only show identified visitors"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    order_by: str = Query("last_seen_at", description="Sort field"),
    order_dir: str = Query("desc", description="Sort direction (asc/desc)"),
):
    """List visitors for the organization with filtering and pagination."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Build query
    query = supabase.table("visitors").select(
        "id, visitor_id, email, phone, first_name, last_name, "
        "utm_source, utm_campaign, gclid, fbclid, "
        "country_code, city, device_type, browser, os, "
        "page_views, events_count, first_seen_at, last_seen_at, identified_at",
        count="exact"
    ).eq("organization_id", org_id)

    # Apply filters
    if search:
        query = query.or_(
            f"email.ilike.%{search}%,"
            f"first_name.ilike.%{search}%,"
            f"last_name.ilike.%{search}%,"
            f"visitor_id.ilike.%{search}%"
        )

    if source:
        query = query.eq("utm_source", source)

    if campaign:
        query = query.eq("utm_campaign", campaign)

    if has_gclid is True:
        query = query.not_.is_("gclid", "null")
    elif has_gclid is False:
        query = query.is_("gclid", "null")

    if has_fbclid is True:
        query = query.not_.is_("fbclid", "null")
    elif has_fbclid is False:
        query = query.is_("fbclid", "null")

    if identified_only:
        query = query.not_.is_("email", "null")

    if date_from:
        query = query.gte("first_seen_at", date_from)

    if date_to:
        query = query.lte("first_seen_at", date_to)

    # Apply ordering
    order_col = order_by if order_by in [
        "first_seen_at", "last_seen_at", "page_views", "events_count"
    ] else "last_seen_at"
    query = query.order(order_col, desc=(order_dir.lower() == "desc"))

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)

    # Execute
    result = await query.execute()

    total = result.count or 0
    visitors = [VisitorSummary(**v) for v in result.data]

    return VisitorListResponse(
        visitors=visitors,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(visitors)) < total,
    )


@router.get("/stats", response_model=VisitorStatsResponse)
async def get_visitor_stats(
    user: dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
):
    """Get visitor statistics for the organization."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    period_start = today_start - timedelta(days=days)

    # Total visitors
    total_result = supabase.table("visitors").select(
        "id", count="exact"
    ).eq("organization_id", org_id).execute()
    total_visitors = total_result.count or 0

    # Identified visitors
    identified_result = supabase.table("visitors").select(
        "id", count="exact"
    ).eq("organization_id", org_id).not_.is_("email", "null").execute()
    identified_visitors = identified_result.count or 0

    # Visitors today
    today_result = supabase.table("visitors").select(
        "id", count="exact"
    ).eq("organization_id", org_id).gte(
        "first_seen_at", today_start.isoformat()
    ).execute()
    visitors_today = today_result.count or 0

    # Visitors this week
    week_result = supabase.table("visitors").select(
        "id", count="exact"
    ).eq("organization_id", org_id).gte(
        "first_seen_at", week_start.isoformat()
    ).execute()
    visitors_this_week = week_result.count or 0

    # Visitors with GCLID
    gclid_result = supabase.table("visitors").select(
        "id", count="exact"
    ).eq("organization_id", org_id).not_.is_("gclid", "null").execute()
    visitors_with_gclid = gclid_result.count or 0

    # Visitors with FBCLID
    fbclid_result = supabase.table("visitors").select(
        "id", count="exact"
    ).eq("organization_id", org_id).not_.is_("fbclid", "null").execute()
    visitors_with_fbclid = fbclid_result.count or 0

    # Top sources (simplified - in production use SQL aggregation)
    sources_result = supabase.table("visitors").select(
        "utm_source"
    ).eq("organization_id", org_id).not_.is_(
        "utm_source", "null"
    ).gte("first_seen_at", period_start.isoformat()).limit(500).execute()

    source_counts = {}
    for v in sources_result.data:
        src = v.get("utm_source")
        if src:
            source_counts[src] = source_counts.get(src, 0) + 1

    top_sources = sorted(
        [{"source": k, "count": v} for k, v in source_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:10]

    # Top campaigns
    campaigns_result = supabase.table("visitors").select(
        "utm_campaign"
    ).eq("organization_id", org_id).not_.is_(
        "utm_campaign", "null"
    ).gte("first_seen_at", period_start.isoformat()).limit(500).execute()

    campaign_counts = {}
    for v in campaigns_result.data:
        camp = v.get("utm_campaign")
        if camp:
            campaign_counts[camp] = campaign_counts.get(camp, 0) + 1

    top_campaigns = sorted(
        [{"campaign": k, "count": v} for k, v in campaign_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:10]

    # Device breakdown
    device_result = supabase.table("visitors").select(
        "device_type"
    ).eq("organization_id", org_id).gte(
        "first_seen_at", period_start.isoformat()
    ).limit(1000).execute()

    device_counts = {"desktop": 0, "mobile": 0, "tablet": 0, "unknown": 0}
    for v in device_result.data:
        dt = v.get("device_type", "unknown")
        if dt in device_counts:
            device_counts[dt] += 1
        else:
            device_counts["unknown"] += 1

    # Country breakdown
    country_result = supabase.table("visitors").select(
        "country_code, country_name"
    ).eq("organization_id", org_id).not_.is_(
        "country_code", "null"
    ).gte("first_seen_at", period_start.isoformat()).limit(500).execute()

    country_counts = {}
    for v in country_result.data:
        code = v.get("country_code")
        name = v.get("country_name", code)
        if code:
            if code not in country_counts:
                country_counts[code] = {"code": code, "name": name, "count": 0}
            country_counts[code]["count"] += 1

    country_breakdown = sorted(
        list(country_counts.values()),
        key=lambda x: x["count"],
        reverse=True
    )[:10]

    return VisitorStatsResponse(
        total_visitors=total_visitors,
        identified_visitors=identified_visitors,
        visitors_today=visitors_today,
        visitors_this_week=visitors_this_week,
        visitors_with_gclid=visitors_with_gclid,
        visitors_with_fbclid=visitors_with_fbclid,
        top_sources=top_sources,
        top_campaigns=top_campaigns,
        device_breakdown=device_counts,
        country_breakdown=country_breakdown,
    )


@router.get("/{visitor_id}", response_model=VisitorDetail)
async def get_visitor(
    visitor_id: str,
    user: dict = Depends(get_current_user),
):
    """Get detailed information about a specific visitor."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    result = supabase.table("visitors").select("*").eq(
        "organization_id", org_id
    ).eq("id", visitor_id).maybe_single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Visitor not found")

    return VisitorDetail(**result.data)


@router.get("/{visitor_id}/events", response_model=List[VisitorEvent])
async def get_visitor_events(
    visitor_id: str,
    user: dict = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=500),
):
    """Get events for a specific visitor."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Verify visitor belongs to org
    visitor = supabase.table("visitors").select("id").eq(
        "organization_id", org_id
    ).eq("id", visitor_id).maybe_single().execute()

    if not visitor.data:
        raise HTTPException(status_code=404, detail="Visitor not found")

    # Get events
    events = supabase.table("visitor_events").select(
        "id, event_type, event_name, page_url, page_path, page_title, event_data, occurred_at"
    ).eq("visitor_id", visitor_id).order(
        "occurred_at", desc=True
    ).limit(limit).execute()

    return [VisitorEvent(**e) for e in events.data]


@router.delete("/{visitor_id}")
async def delete_visitor(
    visitor_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a visitor and all associated data (GDPR compliance)."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Verify visitor belongs to org
    visitor = supabase.table("visitors").select("id").eq(
        "organization_id", org_id
    ).eq("id", visitor_id).maybe_single().execute()

    if not visitor.data:
        raise HTTPException(status_code=404, detail="Visitor not found")

    # Delete events first (foreign key)
    supabase.table("visitor_events").delete().eq(
        "visitor_id", visitor_id
    ).execute()

    # Delete visitor
    supabase.table("visitors").delete().eq(
        "id", visitor_id
    ).execute()

    return {"status": "success", "message": "Visitor deleted"}
