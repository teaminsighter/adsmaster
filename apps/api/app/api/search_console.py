"""
Google Search Console Integration API

Provides access to Search Console data for organic search analysis.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.user_auth import get_current_user
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/v1/analytics/search-console", tags=["Search Console"])


# =============================================================================
# Pydantic Models
# =============================================================================

class SearchConsoleProperty(BaseModel):
    """Connected GSC property."""
    id: str
    site_url: str
    permission_level: str  # owner, full, restricted
    connected_at: datetime
    last_sync: Optional[datetime] = None


class QueryPerformanceRow(BaseModel):
    """Search query performance data."""
    query: str
    clicks: int = 0
    impressions: int = 0
    ctr: float = 0.0  # Click-through rate (0-1)
    position: float = 0.0  # Average position


class PagePerformanceRow(BaseModel):
    """Page performance data."""
    page: str
    clicks: int = 0
    impressions: int = 0
    ctr: float = 0.0
    position: float = 0.0


class SearchPerformanceOverview(BaseModel):
    """Overall search performance metrics."""
    total_clicks: int = 0
    total_impressions: int = 0
    average_ctr: float = 0.0
    average_position: float = 0.0
    # Comparison to previous period
    clicks_change_pct: float = 0.0
    impressions_change_pct: float = 0.0
    ctr_change_pct: float = 0.0
    position_change: float = 0.0  # Negative is better


class QueryReport(BaseModel):
    """Query performance report."""
    queries: List[QueryPerformanceRow]
    total_queries: int = 0
    date_range: str = ""


class PageReport(BaseModel):
    """Page performance report."""
    pages: List[PagePerformanceRow]
    total_pages: int = 0
    date_range: str = ""


class CountryPerformance(BaseModel):
    """Performance by country."""
    country: str
    country_name: str
    clicks: int = 0
    impressions: int = 0
    ctr: float = 0.0
    position: float = 0.0


class DevicePerformance(BaseModel):
    """Performance by device type."""
    device: str  # DESKTOP, MOBILE, TABLET
    clicks: int = 0
    impressions: int = 0
    ctr: float = 0.0
    position: float = 0.0


class SearchAppearance(BaseModel):
    """Search appearance type performance."""
    appearance_type: str  # AMP, RICH_RESULTS, etc.
    clicks: int = 0
    impressions: int = 0


class TrendDataPoint(BaseModel):
    """Daily trend data point."""
    date: str
    clicks: int = 0
    impressions: int = 0
    ctr: float = 0.0
    position: float = 0.0


class SearchConsoleDashboard(BaseModel):
    """Complete GSC dashboard data."""
    overview: SearchPerformanceOverview
    trends: List[TrendDataPoint]
    top_queries: List[QueryPerformanceRow]
    top_pages: List[PagePerformanceRow]
    by_country: List[CountryPerformance]
    by_device: List[DevicePerformance]
    search_appearance: List[SearchAppearance]


class SitemapInfo(BaseModel):
    """Sitemap information."""
    path: str
    last_submitted: Optional[datetime] = None
    last_downloaded: Optional[datetime] = None
    is_pending: bool = False
    is_sitemaps_index: bool = False
    warnings: int = 0
    errors: int = 0
    contents_count: int = 0


class URLInspectionResult(BaseModel):
    """URL inspection result."""
    url: str
    verdict: str  # PASS, NEUTRAL, FAIL
    coverage_state: str  # Indexed, not indexed, etc.
    indexing_state: str
    last_crawl_time: Optional[datetime] = None
    crawled_as: Optional[str] = None  # DESKTOP, MOBILE
    robots_txt_state: str
    page_fetch_state: str
    mobile_usability: str


# =============================================================================
# Country code to name mapping
# =============================================================================

COUNTRY_NAMES = {
    "usa": "United States",
    "gbr": "United Kingdom",
    "can": "Canada",
    "aus": "Australia",
    "deu": "Germany",
    "fra": "France",
    "ind": "India",
    "bra": "Brazil",
    "jpn": "Japan",
    "mex": "Mexico",
    "esp": "Spain",
    "ita": "Italy",
    "nld": "Netherlands",
    "phl": "Philippines",
    "idn": "Indonesia",
    # Add more as needed
}


def get_country_name(code: str) -> str:
    """Get country name from ISO code."""
    return COUNTRY_NAMES.get(code.lower(), code.upper())


# =============================================================================
# API Endpoints
# =============================================================================

@router.get("/properties")
async def list_properties(
    user: dict = Depends(get_current_user)
) -> List[SearchConsoleProperty]:
    """
    List connected Google Search Console properties.
    """
    supabase = get_supabase_client()
    org_id = user.get("org")

    # Query search_console_properties table
    query = supabase.table("search_console_properties").select("*")

    if org_id:
        query = query.eq("organization_id", org_id)
    else:
        query = query.eq("user_id", user["sub"])

    result = query.execute()

    properties = []
    for row in result.data or []:
        properties.append(SearchConsoleProperty(
            id=row["id"],
            site_url=row["site_url"],
            permission_level=row.get("permission_level", "full"),
            connected_at=row["created_at"],
            last_sync=row.get("last_sync")
        ))

    return properties


@router.get("/dashboard")
async def get_dashboard(
    property_id: Optional[str] = None,
    days: int = Query(default=28, ge=1, le=90),
    user: dict = Depends(get_current_user)
) -> SearchConsoleDashboard:
    """
    Get complete Search Console dashboard data.

    Returns overview metrics, trends, top queries, pages, country/device breakdown.
    """
    supabase = get_supabase_client()
    org_id = user.get("org")

    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)
    prev_start = start_date - timedelta(days=days)

    # Build query for search_console_data
    query = supabase.table("search_console_data").select("*")

    if org_id:
        query = query.eq("organization_id", org_id)
    else:
        query = query.eq("user_id", user["sub"])

    if property_id:
        query = query.eq("property_id", property_id)

    query = query.gte("date", start_date.isoformat())
    query = query.lte("date", end_date.isoformat())

    result = query.execute()
    data = result.data or []

    # Get previous period for comparison
    prev_query = supabase.table("search_console_data").select("*")
    if org_id:
        prev_query = prev_query.eq("organization_id", org_id)
    else:
        prev_query = prev_query.eq("user_id", user["sub"])
    if property_id:
        prev_query = prev_query.eq("property_id", property_id)
    prev_query = prev_query.gte("date", prev_start.isoformat())
    prev_query = prev_query.lt("date", start_date.isoformat())

    prev_result = prev_query.execute()
    prev_data = prev_result.data or []

    # Aggregate current period
    total_clicks = sum(row.get("clicks", 0) for row in data)
    total_impressions = sum(row.get("impressions", 0) for row in data)
    total_position_sum = sum(row.get("position", 0) * row.get("impressions", 1) for row in data)

    avg_ctr = total_clicks / total_impressions if total_impressions > 0 else 0
    avg_position = total_position_sum / total_impressions if total_impressions > 0 else 0

    # Aggregate previous period
    prev_clicks = sum(row.get("clicks", 0) for row in prev_data)
    prev_impressions = sum(row.get("impressions", 0) for row in prev_data)
    prev_position_sum = sum(row.get("position", 0) * row.get("impressions", 1) for row in prev_data)
    prev_avg_ctr = prev_clicks / prev_impressions if prev_impressions > 0 else 0
    prev_avg_position = prev_position_sum / prev_impressions if prev_impressions > 0 else 0

    # Calculate changes
    clicks_change = ((total_clicks - prev_clicks) / prev_clicks * 100) if prev_clicks > 0 else 0
    impressions_change = ((total_impressions - prev_impressions) / prev_impressions * 100) if prev_impressions > 0 else 0
    ctr_change = ((avg_ctr - prev_avg_ctr) / prev_avg_ctr * 100) if prev_avg_ctr > 0 else 0
    position_change = avg_position - prev_avg_position  # Lower is better

    overview = SearchPerformanceOverview(
        total_clicks=total_clicks,
        total_impressions=total_impressions,
        average_ctr=round(avg_ctr, 4),
        average_position=round(avg_position, 1),
        clicks_change_pct=round(clicks_change, 1),
        impressions_change_pct=round(impressions_change, 1),
        ctr_change_pct=round(ctr_change, 1),
        position_change=round(position_change, 1)
    )

    # Build trends by date
    trends_by_date = {}
    for row in data:
        date = row.get("date", "")[:10]
        if date not in trends_by_date:
            trends_by_date[date] = {
                "clicks": 0,
                "impressions": 0,
                "position_sum": 0
            }
        trends_by_date[date]["clicks"] += row.get("clicks", 0)
        trends_by_date[date]["impressions"] += row.get("impressions", 0)
        trends_by_date[date]["position_sum"] += row.get("position", 0) * row.get("impressions", 1)

    trends = []
    for date in sorted(trends_by_date.keys()):
        t = trends_by_date[date]
        ctr = t["clicks"] / t["impressions"] if t["impressions"] > 0 else 0
        pos = t["position_sum"] / t["impressions"] if t["impressions"] > 0 else 0
        trends.append(TrendDataPoint(
            date=date,
            clicks=t["clicks"],
            impressions=t["impressions"],
            ctr=round(ctr, 4),
            position=round(pos, 1)
        ))

    # Aggregate by query
    queries_agg = {}
    for row in data:
        q = row.get("query", "")
        if not q:
            continue
        if q not in queries_agg:
            queries_agg[q] = {"clicks": 0, "impressions": 0, "position_sum": 0}
        queries_agg[q]["clicks"] += row.get("clicks", 0)
        queries_agg[q]["impressions"] += row.get("impressions", 0)
        queries_agg[q]["position_sum"] += row.get("position", 0) * row.get("impressions", 1)

    top_queries = []
    for q, stats in sorted(queries_agg.items(), key=lambda x: x[1]["clicks"], reverse=True)[:20]:
        ctr = stats["clicks"] / stats["impressions"] if stats["impressions"] > 0 else 0
        pos = stats["position_sum"] / stats["impressions"] if stats["impressions"] > 0 else 0
        top_queries.append(QueryPerformanceRow(
            query=q,
            clicks=stats["clicks"],
            impressions=stats["impressions"],
            ctr=round(ctr, 4),
            position=round(pos, 1)
        ))

    # Aggregate by page
    pages_agg = {}
    for row in data:
        p = row.get("page", "")
        if not p:
            continue
        if p not in pages_agg:
            pages_agg[p] = {"clicks": 0, "impressions": 0, "position_sum": 0}
        pages_agg[p]["clicks"] += row.get("clicks", 0)
        pages_agg[p]["impressions"] += row.get("impressions", 0)
        pages_agg[p]["position_sum"] += row.get("position", 0) * row.get("impressions", 1)

    top_pages = []
    for p, stats in sorted(pages_agg.items(), key=lambda x: x[1]["clicks"], reverse=True)[:20]:
        ctr = stats["clicks"] / stats["impressions"] if stats["impressions"] > 0 else 0
        pos = stats["position_sum"] / stats["impressions"] if stats["impressions"] > 0 else 0
        top_pages.append(PagePerformanceRow(
            page=p,
            clicks=stats["clicks"],
            impressions=stats["impressions"],
            ctr=round(ctr, 4),
            position=round(pos, 1)
        ))

    # Aggregate by country
    country_agg = {}
    for row in data:
        c = row.get("country", "")
        if not c:
            continue
        if c not in country_agg:
            country_agg[c] = {"clicks": 0, "impressions": 0, "position_sum": 0}
        country_agg[c]["clicks"] += row.get("clicks", 0)
        country_agg[c]["impressions"] += row.get("impressions", 0)
        country_agg[c]["position_sum"] += row.get("position", 0) * row.get("impressions", 1)

    by_country = []
    for c, stats in sorted(country_agg.items(), key=lambda x: x[1]["clicks"], reverse=True)[:10]:
        ctr = stats["clicks"] / stats["impressions"] if stats["impressions"] > 0 else 0
        pos = stats["position_sum"] / stats["impressions"] if stats["impressions"] > 0 else 0
        by_country.append(CountryPerformance(
            country=c,
            country_name=get_country_name(c),
            clicks=stats["clicks"],
            impressions=stats["impressions"],
            ctr=round(ctr, 4),
            position=round(pos, 1)
        ))

    # Aggregate by device
    device_agg = {}
    for row in data:
        d = row.get("device", "DESKTOP")
        if d not in device_agg:
            device_agg[d] = {"clicks": 0, "impressions": 0, "position_sum": 0}
        device_agg[d]["clicks"] += row.get("clicks", 0)
        device_agg[d]["impressions"] += row.get("impressions", 0)
        device_agg[d]["position_sum"] += row.get("position", 0) * row.get("impressions", 1)

    by_device = []
    for d, stats in device_agg.items():
        ctr = stats["clicks"] / stats["impressions"] if stats["impressions"] > 0 else 0
        pos = stats["position_sum"] / stats["impressions"] if stats["impressions"] > 0 else 0
        by_device.append(DevicePerformance(
            device=d,
            clicks=stats["clicks"],
            impressions=stats["impressions"],
            ctr=round(ctr, 4),
            position=round(pos, 1)
        ))

    # Search appearance (from search_appearance column if available)
    appearance_agg = {}
    for row in data:
        appearances = row.get("search_appearance", [])
        if isinstance(appearances, str):
            appearances = [appearances] if appearances else []
        for a in appearances:
            if a not in appearance_agg:
                appearance_agg[a] = {"clicks": 0, "impressions": 0}
            appearance_agg[a]["clicks"] += row.get("clicks", 0)
            appearance_agg[a]["impressions"] += row.get("impressions", 0)

    search_appearance = [
        SearchAppearance(appearance_type=a, clicks=s["clicks"], impressions=s["impressions"])
        for a, s in appearance_agg.items()
    ]

    return SearchConsoleDashboard(
        overview=overview,
        trends=trends,
        top_queries=top_queries,
        top_pages=top_pages,
        by_country=by_country,
        by_device=by_device,
        search_appearance=search_appearance
    )


@router.get("/queries")
async def get_query_report(
    property_id: Optional[str] = None,
    days: int = Query(default=28, ge=1, le=90),
    limit: int = Query(default=100, ge=1, le=1000),
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
) -> QueryReport:
    """
    Get detailed query performance report.

    Supports filtering by search term.
    """
    supabase = get_supabase_client()
    org_id = user.get("org")

    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)

    query = supabase.table("search_console_data").select("*")

    if org_id:
        query = query.eq("organization_id", org_id)
    else:
        query = query.eq("user_id", user["sub"])

    if property_id:
        query = query.eq("property_id", property_id)

    query = query.gte("date", start_date.isoformat())
    query = query.lte("date", end_date.isoformat())
    query = query.not_.is_("query", "null")

    result = query.execute()
    data = result.data or []

    # Aggregate by query
    queries_agg = {}
    for row in data:
        q = row.get("query", "")
        if not q:
            continue
        if search and search.lower() not in q.lower():
            continue
        if q not in queries_agg:
            queries_agg[q] = {"clicks": 0, "impressions": 0, "position_sum": 0}
        queries_agg[q]["clicks"] += row.get("clicks", 0)
        queries_agg[q]["impressions"] += row.get("impressions", 0)
        queries_agg[q]["position_sum"] += row.get("position", 0) * row.get("impressions", 1)

    queries = []
    for q, stats in sorted(queries_agg.items(), key=lambda x: x[1]["clicks"], reverse=True)[:limit]:
        ctr = stats["clicks"] / stats["impressions"] if stats["impressions"] > 0 else 0
        pos = stats["position_sum"] / stats["impressions"] if stats["impressions"] > 0 else 0
        queries.append(QueryPerformanceRow(
            query=q,
            clicks=stats["clicks"],
            impressions=stats["impressions"],
            ctr=round(ctr, 4),
            position=round(pos, 1)
        ))

    return QueryReport(
        queries=queries,
        total_queries=len(queries_agg),
        date_range=f"{start_date.isoformat()} to {end_date.isoformat()}"
    )


@router.get("/pages")
async def get_page_report(
    property_id: Optional[str] = None,
    days: int = Query(default=28, ge=1, le=90),
    limit: int = Query(default=100, ge=1, le=1000),
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
) -> PageReport:
    """
    Get detailed page performance report.
    """
    supabase = get_supabase_client()
    org_id = user.get("org")

    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)

    query = supabase.table("search_console_data").select("*")

    if org_id:
        query = query.eq("organization_id", org_id)
    else:
        query = query.eq("user_id", user["sub"])

    if property_id:
        query = query.eq("property_id", property_id)

    query = query.gte("date", start_date.isoformat())
    query = query.lte("date", end_date.isoformat())
    query = query.not_.is_("page", "null")

    result = query.execute()
    data = result.data or []

    # Aggregate by page
    pages_agg = {}
    for row in data:
        p = row.get("page", "")
        if not p:
            continue
        if search and search.lower() not in p.lower():
            continue
        if p not in pages_agg:
            pages_agg[p] = {"clicks": 0, "impressions": 0, "position_sum": 0}
        pages_agg[p]["clicks"] += row.get("clicks", 0)
        pages_agg[p]["impressions"] += row.get("impressions", 0)
        pages_agg[p]["position_sum"] += row.get("position", 0) * row.get("impressions", 1)

    pages = []
    for p, stats in sorted(pages_agg.items(), key=lambda x: x[1]["clicks"], reverse=True)[:limit]:
        ctr = stats["clicks"] / stats["impressions"] if stats["impressions"] > 0 else 0
        pos = stats["position_sum"] / stats["impressions"] if stats["impressions"] > 0 else 0
        pages.append(PagePerformanceRow(
            page=p,
            clicks=stats["clicks"],
            impressions=stats["impressions"],
            ctr=round(ctr, 4),
            position=round(pos, 1)
        ))

    return PageReport(
        pages=pages,
        total_pages=len(pages_agg),
        date_range=f"{start_date.isoformat()} to {end_date.isoformat()}"
    )


@router.get("/sitemaps")
async def list_sitemaps(
    property_id: str,
    user: dict = Depends(get_current_user)
) -> List[SitemapInfo]:
    """
    List sitemaps for a Search Console property.
    """
    supabase = get_supabase_client()
    org_id = user.get("org")

    # Verify property access
    prop_query = supabase.table("search_console_properties").select("*").eq("id", property_id)
    if org_id:
        prop_query = prop_query.eq("organization_id", org_id)
    else:
        prop_query = prop_query.eq("user_id", user["sub"])

    prop_result = prop_query.execute()
    if not prop_result.data:
        raise HTTPException(status_code=404, detail="Property not found")

    # Query sitemaps
    result = supabase.table("search_console_sitemaps").select("*").eq("property_id", property_id).execute()

    sitemaps = []
    for row in result.data or []:
        sitemaps.append(SitemapInfo(
            path=row["path"],
            last_submitted=row.get("last_submitted"),
            last_downloaded=row.get("last_downloaded"),
            is_pending=row.get("is_pending", False),
            is_sitemaps_index=row.get("is_sitemaps_index", False),
            warnings=row.get("warnings", 0),
            errors=row.get("errors", 0),
            contents_count=row.get("contents_count", 0)
        ))

    return sitemaps


@router.post("/inspect-url")
async def inspect_url(
    property_id: str,
    url: str,
    user: dict = Depends(get_current_user)
) -> URLInspectionResult:
    """
    Inspect a URL using Search Console URL Inspection API.

    Note: This is a placeholder - actual implementation requires
    Google Search Console API integration with OAuth.
    """
    supabase = get_supabase_client()
    org_id = user.get("org")

    # Verify property access
    prop_query = supabase.table("search_console_properties").select("*").eq("id", property_id)
    if org_id:
        prop_query = prop_query.eq("organization_id", org_id)
    else:
        prop_query = prop_query.eq("user_id", user["sub"])

    prop_result = prop_query.execute()
    if not prop_result.data:
        raise HTTPException(status_code=404, detail="Property not found")

    # Check for cached inspection result
    cached = supabase.table("url_inspection_cache").select("*").eq("property_id", property_id).eq("url", url).execute()

    if cached.data:
        row = cached.data[0]
        return URLInspectionResult(
            url=url,
            verdict=row.get("verdict", "NEUTRAL"),
            coverage_state=row.get("coverage_state", "Unknown"),
            indexing_state=row.get("indexing_state", "Unknown"),
            last_crawl_time=row.get("last_crawl_time"),
            crawled_as=row.get("crawled_as"),
            robots_txt_state=row.get("robots_txt_state", "Unknown"),
            page_fetch_state=row.get("page_fetch_state", "Unknown"),
            mobile_usability=row.get("mobile_usability", "Unknown")
        )

    # Return placeholder - real implementation calls GSC API
    return URLInspectionResult(
        url=url,
        verdict="NEUTRAL",
        coverage_state="URL inspection requires Google Search Console API connection",
        indexing_state="Unknown",
        last_crawl_time=None,
        crawled_as=None,
        robots_txt_state="Unknown",
        page_fetch_state="Unknown",
        mobile_usability="Unknown"
    )


@router.get("/compare")
async def compare_periods(
    property_id: Optional[str] = None,
    period1_start: str = Query(..., description="Start date of first period (YYYY-MM-DD)"),
    period1_end: str = Query(..., description="End date of first period (YYYY-MM-DD)"),
    period2_start: str = Query(..., description="Start date of second period (YYYY-MM-DD)"),
    period2_end: str = Query(..., description="End date of second period (YYYY-MM-DD)"),
    user: dict = Depends(get_current_user)
) -> dict:
    """
    Compare search performance between two periods.
    """
    supabase = get_supabase_client()
    org_id = user.get("org")

    def get_period_data(start: str, end: str):
        query = supabase.table("search_console_data").select("*")
        if org_id:
            query = query.eq("organization_id", org_id)
        else:
            query = query.eq("user_id", user["sub"])
        if property_id:
            query = query.eq("property_id", property_id)
        query = query.gte("date", start).lte("date", end)
        return query.execute().data or []

    period1_data = get_period_data(period1_start, period1_end)
    period2_data = get_period_data(period2_start, period2_end)

    def aggregate_period(data):
        total_clicks = sum(row.get("clicks", 0) for row in data)
        total_impressions = sum(row.get("impressions", 0) for row in data)
        total_position_sum = sum(row.get("position", 0) * row.get("impressions", 1) for row in data)
        avg_ctr = total_clicks / total_impressions if total_impressions > 0 else 0
        avg_position = total_position_sum / total_impressions if total_impressions > 0 else 0
        return {
            "clicks": total_clicks,
            "impressions": total_impressions,
            "ctr": round(avg_ctr, 4),
            "position": round(avg_position, 1)
        }

    p1 = aggregate_period(period1_data)
    p2 = aggregate_period(period2_data)

    # Calculate changes
    def calc_change(current, previous):
        if previous == 0:
            return 0.0
        return round((current - previous) / previous * 100, 1)

    return {
        "period1": {
            "range": f"{period1_start} to {period1_end}",
            "metrics": p1
        },
        "period2": {
            "range": f"{period2_start} to {period2_end}",
            "metrics": p2
        },
        "changes": {
            "clicks_pct": calc_change(p1["clicks"], p2["clicks"]),
            "impressions_pct": calc_change(p1["impressions"], p2["impressions"]),
            "ctr_pct": calc_change(p1["ctr"], p2["ctr"]),
            "position_change": round(p1["position"] - p2["position"], 1)  # Lower is better
        }
    }
