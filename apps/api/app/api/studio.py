"""
Studio Dashboard Builder API
Endpoints for creating and managing custom dashboards with widgets
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .user_auth import get_current_user
from ..services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/v1/studio", tags=["Studio Dashboard Builder"])


# ============================================================================
# MODELS
# ============================================================================

class WidgetCreate(BaseModel):
    type: str  # metric, line_chart, bar_chart, pie_chart, etc.
    title: Optional[str] = None
    subtitle: Optional[str] = None
    icon: Optional[str] = None
    grid_x: int = 0
    grid_y: int = 0
    grid_w: int = 4
    grid_h: int = 4
    min_w: int = 2
    min_h: int = 2
    data_source: str  # meta_ads, google_ads, ga4, conversions, visitors, csv, etc.
    data_source_id: Optional[str] = None
    ad_account_id: Optional[str] = None
    metrics: List[Dict] = Field(default_factory=list)
    dimensions: List[Dict] = Field(default_factory=list)
    filters: List[Dict] = Field(default_factory=list)
    sort_by: Dict = Field(default_factory=dict)
    limit_rows: int = 10
    date_range: Optional[str] = None
    visual_config: Dict = Field(default_factory=lambda: {
        "colors": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
        "showLegend": True,
        "showGrid": True,
        "showLabels": True,
        "stacked": False,
        "smooth": False
    })
    show_comparison: bool = False
    comparison_type: Optional[str] = None
    formula: Optional[str] = None
    manual_data: Optional[Dict] = None
    conditional_rules: List[Dict] = Field(default_factory=list)


class WidgetUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    icon: Optional[str] = None
    grid_x: Optional[int] = None
    grid_y: Optional[int] = None
    grid_w: Optional[int] = None
    grid_h: Optional[int] = None
    data_source: Optional[str] = None
    data_source_id: Optional[str] = None
    ad_account_id: Optional[str] = None
    metrics: Optional[List[Dict]] = None
    dimensions: Optional[List[Dict]] = None
    filters: Optional[List[Dict]] = None
    sort_by: Optional[Dict] = None
    limit_rows: Optional[int] = None
    date_range: Optional[str] = None
    visual_config: Optional[Dict] = None
    show_comparison: Optional[bool] = None
    comparison_type: Optional[str] = None
    formula: Optional[str] = None
    manual_data: Optional[Dict] = None
    conditional_rules: Optional[List[Dict]] = None


class LayoutItem(BaseModel):
    i: str  # widget id
    x: int
    y: int
    w: int
    h: int


class DashboardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_date_range: str = "last_30_days"
    default_timezone: str = "UTC"
    settings: Dict = Field(default_factory=lambda: {
        "theme": "light",
        "refreshInterval": 0,
        "backgroundColor": "#ffffff"
    })
    template_id: Optional[str] = None  # Clone from template


class DashboardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[List[LayoutItem]] = None
    settings: Optional[Dict] = None
    default_date_range: Optional[str] = None
    default_timezone: Optional[str] = None
    default_comparison: Optional[str] = None
    is_published: Optional[bool] = None
    is_public: Optional[bool] = None
    password: Optional[str] = None  # For password protection
    allowed_emails: Optional[List[str]] = None


class DashboardSummary(BaseModel):
    id: str
    name: str
    description: Optional[str]
    widget_count: int
    is_published: bool
    is_public: bool
    share_url: Optional[str]
    view_count: int
    created_at: str
    updated_at: str


class DashboardDetail(BaseModel):
    id: str
    name: str
    description: Optional[str]
    layout: List[Dict]
    settings: Dict
    default_date_range: str
    default_timezone: str
    default_comparison: str
    is_published: bool
    is_public: bool
    share_token: Optional[str]
    view_count: int
    widgets: List[Dict]
    created_at: str
    updated_at: str


class DataSourceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str  # csv, google_sheets, api
    connection_config: Dict = Field(default_factory=dict)
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    spreadsheet_id: Optional[str] = None
    sheet_name: Optional[str] = None
    range: Optional[str] = None
    schema: List[Dict] = Field(default_factory=list)
    auto_refresh: bool = False
    refresh_interval_minutes: Optional[int] = None


class DataSourceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    connection_config: Optional[Dict] = None
    schema: Optional[List[Dict]] = None
    auto_refresh: Optional[bool] = None
    refresh_interval_minutes: Optional[int] = None


# ============================================================================
# DASHBOARD ENDPOINTS
# ============================================================================

@router.get("/dashboards")
async def list_dashboards(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """List all dashboards for the organization"""
    supabase = get_supabase_client()
    user_id = current_user["id"]
    org_id = current_user.get("organization_id")

    offset = (page - 1) * limit

    # Get dashboards
    query = supabase.table("studio_dashboards").select(
        "*, studio_widgets(count)"
    ).order("updated_at", desc=True)

    if org_id:
        query = query.eq("organization_id", org_id)
    else:
        query = query.eq("created_by", user_id)

    # Get total count
    count_result = supabase.table("studio_dashboards").select("id", count="exact")
    if org_id:
        count_result = count_result.eq("organization_id", org_id)
    else:
        count_result = count_result.eq("created_by", user_id)
    count_data = count_result.execute()
    total = count_data.count or 0

    # Get paginated results
    result = query.range(offset, offset + limit - 1).execute()

    dashboards = []
    for d in result.data:
        widget_count = 0
        if d.get("studio_widgets"):
            widget_count = d["studio_widgets"][0].get("count", 0) if d["studio_widgets"] else 0

        share_url = None
        if d.get("share_token"):
            share_url = f"/studio/view/{d['share_token']}"

        dashboards.append({
            "id": d["id"],
            "name": d["name"],
            "description": d.get("description"),
            "widget_count": widget_count,
            "is_published": d.get("is_published", False),
            "is_public": d.get("is_public", False),
            "share_url": share_url,
            "view_count": d.get("view_count", 0),
            "thumbnail": d.get("thumbnail"),
            "created_at": d["created_at"],
            "updated_at": d["updated_at"]
        })

    return {
        "dashboards": dashboards,
        "total": total,
        "page": page,
        "limit": limit
    }


@router.post("/dashboards")
async def create_dashboard(
    data: DashboardCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new dashboard"""
    supabase = get_supabase_client()
    user_id = current_user["id"]
    org_id = current_user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    dashboard_data = {
        "organization_id": org_id,
        "created_by": user_id,
        "name": data.name,
        "description": data.description,
        "default_date_range": data.default_date_range,
        "default_timezone": data.default_timezone,
        "settings": data.settings,
        "layout": [],
        "share_token": secrets.token_urlsafe(16)
    }

    result = supabase.table("studio_dashboards").insert(dashboard_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create dashboard")

    dashboard = result.data[0]

    # If template_id provided, clone widgets from template
    if data.template_id:
        template_result = supabase.table("studio_templates").select("config").eq("id", data.template_id).single().execute()
        if template_result.data and template_result.data.get("config", {}).get("widgets"):
            template_widgets = template_result.data["config"]["widgets"]
            for widget in template_widgets:
                widget["dashboard_id"] = dashboard["id"]
                supabase.table("studio_widgets").insert(widget).execute()

            # Update template usage count
            supabase.rpc("increment_template_usage", {"template_id": data.template_id}).execute()

    return {
        "success": True,
        "dashboard": {
            "id": dashboard["id"],
            "name": dashboard["name"],
            "share_token": dashboard["share_token"]
        }
    }


@router.get("/dashboards/{dashboard_id}")
async def get_dashboard(
    dashboard_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard details with all widgets"""
    supabase = get_supabase_client()
    org_id = current_user.get("organization_id")

    # Get dashboard
    query = supabase.table("studio_dashboards").select("*").eq("id", dashboard_id)
    if org_id:
        query = query.eq("organization_id", org_id)

    result = query.single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    dashboard = result.data

    # Get widgets
    widgets_result = supabase.table("studio_widgets").select("*").eq(
        "dashboard_id", dashboard_id
    ).order("grid_y").order("grid_x").execute()

    return {
        "id": dashboard["id"],
        "name": dashboard["name"],
        "description": dashboard.get("description"),
        "layout": dashboard.get("layout", []),
        "settings": dashboard.get("settings", {}),
        "default_date_range": dashboard.get("default_date_range", "last_30_days"),
        "default_timezone": dashboard.get("default_timezone", "UTC"),
        "default_comparison": dashboard.get("default_comparison", "previous_period"),
        "is_published": dashboard.get("is_published", False),
        "is_public": dashboard.get("is_public", False),
        "share_token": dashboard.get("share_token"),
        "view_count": dashboard.get("view_count", 0),
        "widgets": widgets_result.data or [],
        "created_at": dashboard["created_at"],
        "updated_at": dashboard["updated_at"]
    }


@router.patch("/dashboards/{dashboard_id}")
async def update_dashboard(
    dashboard_id: str,
    data: DashboardUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update dashboard settings"""
    supabase = get_supabase_client()
    org_id = current_user.get("organization_id")

    # Verify ownership
    check = supabase.table("studio_dashboards").select("id").eq("id", dashboard_id)
    if org_id:
        check = check.eq("organization_id", org_id)
    check_result = check.single().execute()

    if not check_result.data:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    update_data = {"updated_at": datetime.utcnow().isoformat()}

    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    if data.layout is not None:
        update_data["layout"] = [item.dict() for item in data.layout]
    if data.settings is not None:
        update_data["settings"] = data.settings
    if data.default_date_range is not None:
        update_data["default_date_range"] = data.default_date_range
    if data.default_timezone is not None:
        update_data["default_timezone"] = data.default_timezone
    if data.default_comparison is not None:
        update_data["default_comparison"] = data.default_comparison
    if data.is_published is not None:
        update_data["is_published"] = data.is_published
        if data.is_published:
            update_data["published_at"] = datetime.utcnow().isoformat()
    if data.is_public is not None:
        update_data["is_public"] = data.is_public
    if data.allowed_emails is not None:
        update_data["allowed_emails"] = data.allowed_emails

    result = supabase.table("studio_dashboards").update(update_data).eq("id", dashboard_id).execute()

    return {"success": True, "dashboard": result.data[0] if result.data else None}


@router.delete("/dashboards/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a dashboard and all its widgets"""
    supabase = get_supabase_client()
    org_id = current_user.get("organization_id")

    # Verify ownership
    check = supabase.table("studio_dashboards").select("id").eq("id", dashboard_id)
    if org_id:
        check = check.eq("organization_id", org_id)
    check_result = check.single().execute()

    if not check_result.data:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    # Delete (widgets cascade automatically)
    supabase.table("studio_dashboards").delete().eq("id", dashboard_id).execute()

    return {"success": True}


@router.post("/dashboards/{dashboard_id}/duplicate")
async def duplicate_dashboard(
    dashboard_id: str,
    name: str = Query(..., description="Name for the duplicate"),
    current_user: dict = Depends(get_current_user)
):
    """Duplicate a dashboard with all its widgets"""
    supabase = get_supabase_client()
    user_id = current_user["id"]
    org_id = current_user.get("organization_id")

    # Get original dashboard
    original = supabase.table("studio_dashboards").select("*").eq("id", dashboard_id).single().execute()
    if not original.data:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    # Create new dashboard
    new_dashboard_data = {
        "organization_id": org_id or original.data["organization_id"],
        "created_by": user_id,
        "name": name,
        "description": original.data.get("description"),
        "layout": original.data.get("layout", []),
        "settings": original.data.get("settings", {}),
        "default_date_range": original.data.get("default_date_range", "last_30_days"),
        "default_timezone": original.data.get("default_timezone", "UTC"),
        "share_token": secrets.token_urlsafe(16),
        "is_published": False,
        "is_public": False
    }

    new_dashboard = supabase.table("studio_dashboards").insert(new_dashboard_data).execute()
    new_dashboard_id = new_dashboard.data[0]["id"]

    # Get original widgets
    widgets = supabase.table("studio_widgets").select("*").eq("dashboard_id", dashboard_id).execute()

    # Map old widget IDs to new ones
    id_mapping = {}

    for widget in widgets.data:
        old_id = widget["id"]
        widget_copy = {k: v for k, v in widget.items() if k not in ["id", "created_at", "updated_at"]}
        widget_copy["dashboard_id"] = new_dashboard_id

        new_widget = supabase.table("studio_widgets").insert(widget_copy).execute()
        id_mapping[old_id] = new_widget.data[0]["id"]

    # Update layout with new widget IDs
    new_layout = []
    for item in new_dashboard_data["layout"]:
        new_item = item.copy()
        if item.get("i") in id_mapping:
            new_item["i"] = id_mapping[item["i"]]
        new_layout.append(new_item)

    supabase.table("studio_dashboards").update({"layout": new_layout}).eq("id", new_dashboard_id).execute()

    return {
        "success": True,
        "dashboard": {
            "id": new_dashboard_id,
            "name": name
        }
    }


# ============================================================================
# WIDGET ENDPOINTS
# ============================================================================

@router.post("/dashboards/{dashboard_id}/widgets")
async def create_widget(
    dashboard_id: str,
    data: WidgetCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a widget to a dashboard"""
    supabase = get_supabase_client()
    org_id = current_user.get("organization_id")

    # Verify dashboard ownership
    check = supabase.table("studio_dashboards").select("id, layout").eq("id", dashboard_id)
    if org_id:
        check = check.eq("organization_id", org_id)
    check_result = check.single().execute()

    if not check_result.data:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    widget_data = {
        "dashboard_id": dashboard_id,
        "type": data.type,
        "title": data.title,
        "subtitle": data.subtitle,
        "icon": data.icon,
        "grid_x": data.grid_x,
        "grid_y": data.grid_y,
        "grid_w": data.grid_w,
        "grid_h": data.grid_h,
        "min_w": data.min_w,
        "min_h": data.min_h,
        "data_source": data.data_source,
        "data_source_id": data.data_source_id,
        "ad_account_id": data.ad_account_id,
        "metrics": data.metrics,
        "dimensions": data.dimensions,
        "filters": data.filters,
        "sort_by": data.sort_by,
        "limit_rows": data.limit_rows,
        "date_range": data.date_range,
        "visual_config": data.visual_config,
        "show_comparison": data.show_comparison,
        "comparison_type": data.comparison_type,
        "formula": data.formula,
        "manual_data": data.manual_data,
        "conditional_rules": data.conditional_rules
    }

    result = supabase.table("studio_widgets").insert(widget_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create widget")

    widget = result.data[0]

    # Add to dashboard layout
    layout = check_result.data.get("layout", []) or []
    layout.append({
        "i": widget["id"],
        "x": data.grid_x,
        "y": data.grid_y,
        "w": data.grid_w,
        "h": data.grid_h
    })

    supabase.table("studio_dashboards").update({
        "layout": layout,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", dashboard_id).execute()

    return {"success": True, "widget": widget}


@router.patch("/widgets/{widget_id}")
async def update_widget(
    widget_id: str,
    data: WidgetUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a widget"""
    supabase = get_supabase_client()
    org_id = current_user.get("organization_id")

    # Verify ownership via dashboard
    widget_check = supabase.table("studio_widgets").select(
        "id, dashboard_id"
    ).eq("id", widget_id).single().execute()

    if not widget_check.data:
        raise HTTPException(status_code=404, detail="Widget not found")

    dashboard_check = supabase.table("studio_dashboards").select("id").eq(
        "id", widget_check.data["dashboard_id"]
    )
    if org_id:
        dashboard_check = dashboard_check.eq("organization_id", org_id)
    if not dashboard_check.execute().data:
        raise HTTPException(status_code=404, detail="Widget not found")

    update_data = {"updated_at": datetime.utcnow().isoformat()}

    for field, value in data.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value

    result = supabase.table("studio_widgets").update(update_data).eq("id", widget_id).execute()

    # Update dashboard timestamp
    supabase.table("studio_dashboards").update({
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", widget_check.data["dashboard_id"]).execute()

    return {"success": True, "widget": result.data[0] if result.data else None}


@router.delete("/widgets/{widget_id}")
async def delete_widget(
    widget_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a widget"""
    supabase = get_supabase_client()
    org_id = current_user.get("organization_id")

    # Get widget to find dashboard
    widget_check = supabase.table("studio_widgets").select(
        "id, dashboard_id"
    ).eq("id", widget_id).single().execute()

    if not widget_check.data:
        raise HTTPException(status_code=404, detail="Widget not found")

    dashboard_id = widget_check.data["dashboard_id"]

    # Verify ownership
    dashboard_check = supabase.table("studio_dashboards").select("id, layout").eq("id", dashboard_id)
    if org_id:
        dashboard_check = dashboard_check.eq("organization_id", org_id)
    dashboard = dashboard_check.single().execute()

    if not dashboard.data:
        raise HTTPException(status_code=404, detail="Widget not found")

    # Delete widget
    supabase.table("studio_widgets").delete().eq("id", widget_id).execute()

    # Remove from layout
    layout = dashboard.data.get("layout", []) or []
    layout = [item for item in layout if item.get("i") != widget_id]

    supabase.table("studio_dashboards").update({
        "layout": layout,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", dashboard_id).execute()

    return {"success": True}


@router.post("/dashboards/{dashboard_id}/layout")
async def update_layout(
    dashboard_id: str,
    layout: List[LayoutItem],
    current_user: dict = Depends(get_current_user)
):
    """Update dashboard layout (widget positions)"""
    supabase = get_supabase_client()
    org_id = current_user.get("organization_id")

    # Verify ownership
    check = supabase.table("studio_dashboards").select("id").eq("id", dashboard_id)
    if org_id:
        check = check.eq("organization_id", org_id)
    if not check.execute().data:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    # Update layout
    layout_data = [item.dict() for item in layout]
    supabase.table("studio_dashboards").update({
        "layout": layout_data,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", dashboard_id).execute()

    # Also update individual widget positions
    for item in layout:
        supabase.table("studio_widgets").update({
            "grid_x": item.x,
            "grid_y": item.y,
            "grid_w": item.w,
            "grid_h": item.h,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", item.i).execute()

    return {"success": True}


# ============================================================================
# WIDGET DATA ENDPOINTS
# ============================================================================

@router.get("/widgets/{widget_id}/data")
async def get_widget_data(
    widget_id: str,
    date_range: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get data for a specific widget"""
    supabase = get_supabase_client()

    # Get widget config
    widget = supabase.table("studio_widgets").select("*").eq("id", widget_id).single().execute()
    if not widget.data:
        raise HTTPException(status_code=404, detail="Widget not found")

    widget_config = widget.data
    data_source = widget_config.get("data_source")

    # Use widget's date range or override
    effective_date_range = date_range or widget_config.get("date_range", "last_30_days")

    # Fetch data based on source
    if data_source == "manual":
        return {"data": widget_config.get("manual_data", {})}

    elif data_source == "conversions":
        # Get conversion data
        result = supabase.table("offline_conversions").select(
            "created_at, conversion_type, value_micros, status"
        ).order("created_at", desc=True).limit(widget_config.get("limit_rows", 10)).execute()
        return {"data": result.data}

    elif data_source == "visitors":
        # Get visitor data
        result = supabase.table("visitors").select(
            "created_at, country_code, device_type, landing_page"
        ).order("created_at", desc=True).limit(widget_config.get("limit_rows", 10)).execute()
        return {"data": result.data}

    elif data_source in ["meta_ads", "google_ads"]:
        # Get ad metrics (would need actual ad platform integration)
        # For now return demo data
        return {
            "data": {
                "metrics": {
                    "spend": 12500000000,  # $12,500 in micros
                    "impressions": 450000,
                    "clicks": 15000,
                    "conversions": 450,
                    "ctr": 3.33,
                    "cpc": 833333,  # $0.83 in micros
                    "roas": 2.8
                },
                "comparison": {
                    "spend_change": 12.5,
                    "conversions_change": 8.2,
                    "roas_change": -2.1
                },
                "chart_data": []
            },
            "demo_mode": True
        }

    elif data_source == "csv" and widget_config.get("data_source_id"):
        # Get CSV data source
        ds = supabase.table("studio_data_sources").select(
            "cached_data"
        ).eq("id", widget_config["data_source_id"]).single().execute()
        if ds.data:
            return {"data": ds.data.get("cached_data", [])}

    return {"data": [], "message": f"Data source '{data_source}' not implemented"}


# ============================================================================
# DATA SOURCE ENDPOINTS
# ============================================================================

@router.get("/data-sources")
async def list_data_sources(
    current_user: dict = Depends(get_current_user)
):
    """List available data sources"""
    supabase = get_supabase_client()
    org_id = current_user.get("organization_id")

    query = supabase.table("studio_data_sources").select("*").order("created_at", desc=True)
    if org_id:
        query = query.eq("organization_id", org_id)

    result = query.execute()

    return {"data_sources": result.data or []}


@router.post("/data-sources")
async def create_data_source(
    data: DataSourceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new data source (CSV, Google Sheets, API)"""
    supabase = get_supabase_client()
    user_id = current_user["id"]
    org_id = current_user.get("organization_id")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    source_data = {
        "organization_id": org_id,
        "created_by": user_id,
        "name": data.name,
        "description": data.description,
        "type": data.type,
        "connection_config": data.connection_config,
        "file_url": data.file_url,
        "file_name": data.file_name,
        "spreadsheet_id": data.spreadsheet_id,
        "sheet_name": data.sheet_name,
        "range": data.range,
        "schema": data.schema,
        "auto_refresh": data.auto_refresh,
        "refresh_interval_minutes": data.refresh_interval_minutes,
        "status": "active"
    }

    result = supabase.table("studio_data_sources").insert(source_data).execute()

    return {"success": True, "data_source": result.data[0] if result.data else None}


@router.delete("/data-sources/{source_id}")
async def delete_data_source(
    source_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a data source"""
    supabase = get_supabase_client()
    org_id = current_user.get("organization_id")

    query = supabase.table("studio_data_sources").delete().eq("id", source_id)
    if org_id:
        query = query.eq("organization_id", org_id)

    query.execute()

    return {"success": True}


# ============================================================================
# TEMPLATE ENDPOINTS
# ============================================================================

@router.get("/templates")
async def list_templates(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List available dashboard templates"""
    supabase = get_supabase_client()

    query = supabase.table("studio_templates").select("*").eq("is_active", True).order("usage_count", desc=True)

    if category:
        query = query.eq("category", category)

    result = query.execute()

    return {"templates": result.data or []}


@router.get("/templates/{template_id}")
async def get_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get template details"""
    supabase = get_supabase_client()

    result = supabase.table("studio_templates").select("*").eq("id", template_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")

    return {"template": result.data}


# ============================================================================
# PUBLIC VIEW ENDPOINT
# ============================================================================

@router.get("/view/{share_token}")
async def get_public_dashboard(
    share_token: str,
    password: Optional[str] = None
):
    """Get a publicly shared dashboard (no auth required)"""
    supabase = get_supabase_client()

    # Find dashboard by share token
    result = supabase.table("studio_dashboards").select("*").eq(
        "share_token", share_token
    ).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    dashboard = result.data

    # Check if public or published
    if not dashboard.get("is_public") and not dashboard.get("is_published"):
        raise HTTPException(status_code=403, detail="Dashboard is not public")

    # Check password if set
    if dashboard.get("password_hash") and not password:
        raise HTTPException(status_code=401, detail="Password required")

    # TODO: Verify password hash

    # Increment view count
    supabase.table("studio_dashboards").update({
        "view_count": (dashboard.get("view_count") or 0) + 1,
        "last_viewed_at": datetime.utcnow().isoformat()
    }).eq("id", dashboard["id"]).execute()

    # Get widgets
    widgets = supabase.table("studio_widgets").select("*").eq(
        "dashboard_id", dashboard["id"]
    ).execute()

    return {
        "dashboard": {
            "id": dashboard["id"],
            "name": dashboard["name"],
            "description": dashboard.get("description"),
            "layout": dashboard.get("layout", []),
            "settings": dashboard.get("settings", {}),
            "default_date_range": dashboard.get("default_date_range", "last_30_days"),
            "widgets": widgets.data or []
        }
    }
