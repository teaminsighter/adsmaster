"""Session Recordings API endpoints for managing and viewing session recordings."""

from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field

from .user_auth import get_current_user
from ..services.supabase_client import get_supabase_client as get_supabase


router = APIRouter(prefix="/api/v1/recordings", tags=["Session Recordings"])


# ============================================================================
# Models
# ============================================================================

class RecordingSummary(BaseModel):
    """Summary view of a session recording."""
    id: str
    visitor_id: str
    session_id: str

    # Visitor info (optional)
    visitor_email: Optional[str] = None
    visitor_name: Optional[str] = None

    # Session info
    duration_seconds: int = 0
    page_count: int = 0
    event_count: int = 0

    # Entry page
    entry_url: Optional[str] = None
    entry_path: Optional[str] = None

    # Device
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    screen_width: Optional[int] = None
    screen_height: Optional[int] = None

    # Location
    country_code: Optional[str] = None
    city: Optional[str] = None

    # Interaction metrics
    rage_clicks: int = 0
    dead_clicks: int = 0
    error_count: int = 0

    # Attribution
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None
    gclid: Optional[str] = None
    fbclid: Optional[str] = None

    # Status
    status: str = "complete"  # recording, complete, processing, error
    is_starred: bool = False

    # Timestamps
    started_at: str
    ended_at: Optional[str] = None


class RecordingDetail(RecordingSummary):
    """Detailed view of a recording including events."""
    organization_id: str

    # Full visitor info
    visitor_phone: Optional[str] = None

    # Full device info
    browser_version: Optional[str] = None
    os_version: Optional[str] = None
    user_agent: Optional[str] = None

    # Full location
    country_name: Optional[str] = None
    region: Optional[str] = None

    # Pages visited
    pages_visited: List[str] = []

    # Referrer
    referrer: Optional[str] = None

    # Custom data
    custom_data: Optional[dict] = None


class RecordingEvent(BaseModel):
    """A single rrweb event in a recording."""
    id: str
    recording_id: str
    chunk_index: int
    event_index: int
    event_type: int  # rrweb event type
    timestamp: int  # milliseconds
    data: dict


class RecordingChunk(BaseModel):
    """A chunk of rrweb events."""
    chunk_index: int
    events: List[dict]
    event_count: int


class RecordingMarker(BaseModel):
    """A marker/bookmark in a recording."""
    id: str
    recording_id: str
    timestamp_ms: int
    marker_type: str  # click, rage_click, dead_click, error, page_view, conversion, custom
    label: Optional[str] = None
    data: Optional[dict] = None
    created_at: str


class RecordingListResponse(BaseModel):
    """Response for recording list endpoint."""
    recordings: List[RecordingSummary]
    total: int
    page: int
    page_size: int
    has_more: bool


class RecordingStatsResponse(BaseModel):
    """Recording statistics response."""
    total_recordings: int
    recordings_today: int
    recordings_this_week: int
    avg_duration_seconds: float
    total_rage_clicks: int
    total_dead_clicks: int
    total_errors: int
    device_breakdown: dict
    top_pages: List[dict]
    top_errors: List[dict]


class RecordingSettingsResponse(BaseModel):
    """Recording settings for the organization."""
    is_enabled: bool
    sample_rate: float
    max_duration_seconds: int
    capture_mouse_movement: bool
    capture_scroll: bool
    capture_input: bool
    mask_all_inputs: bool
    mask_selectors: List[str]
    block_selectors: List[str]
    ignore_selectors: List[str]
    monthly_limit: int
    recordings_this_month: int


class UpdateRecordingSettingsRequest(BaseModel):
    """Request to update recording settings."""
    is_enabled: Optional[bool] = None
    sample_rate: Optional[float] = Field(None, ge=0.0, le=1.0)
    max_duration_seconds: Optional[int] = Field(None, ge=60, le=3600)
    capture_mouse_movement: Optional[bool] = None
    capture_scroll: Optional[bool] = None
    capture_input: Optional[bool] = None
    mask_all_inputs: Optional[bool] = None
    mask_selectors: Optional[List[str]] = None
    block_selectors: Optional[List[str]] = None
    ignore_selectors: Optional[List[str]] = None


class IngestRecordingRequest(BaseModel):
    """Request to ingest recording events from tracker."""
    session_id: str
    visitor_id: str
    chunk_index: int = 0
    events: List[dict]

    # Session metadata (first chunk only)
    entry_url: Optional[str] = None
    entry_path: Optional[str] = None
    referrer: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    browser_version: Optional[str] = None
    os: Optional[str] = None
    os_version: Optional[str] = None
    screen_width: Optional[int] = None
    screen_height: Optional[int] = None
    user_agent: Optional[str] = None


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=RecordingListResponse)
async def list_recordings(
    user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by visitor email or URL"),
    visitor_id: Optional[str] = Query(None, description="Filter by visitor ID"),
    device: Optional[str] = Query(None, description="Filter by device type"),
    has_rage_clicks: Optional[bool] = Query(None, description="Filter by rage clicks"),
    has_errors: Optional[bool] = Query(None, description="Filter by errors"),
    min_duration: Optional[int] = Query(None, ge=0, description="Minimum duration in seconds"),
    max_duration: Optional[int] = Query(None, ge=0, description="Maximum duration in seconds"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    starred_only: Optional[bool] = Query(None, description="Only show starred recordings"),
    order_by: str = Query("started_at", description="Sort field"),
    order_dir: str = Query("desc", description="Sort direction (asc/desc)"),
):
    """List session recordings for the organization with filtering and pagination."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Build query
    query = supabase.table("session_recordings").select(
        "id, visitor_id, session_id, visitor_email, visitor_name, "
        "duration_seconds, page_count, event_count, "
        "entry_url, entry_path, device_type, browser, os, screen_width, screen_height, "
        "country_code, city, rage_clicks, dead_clicks, error_count, "
        "utm_source, utm_campaign, gclid, fbclid, status, is_starred, started_at, ended_at",
        count="exact"
    ).eq("organization_id", org_id)

    # Apply filters
    if search:
        query = query.or_(
            f"visitor_email.ilike.%{search}%,"
            f"entry_url.ilike.%{search}%,"
            f"entry_path.ilike.%{search}%"
        )

    if visitor_id:
        query = query.eq("visitor_id", visitor_id)

    if device:
        query = query.eq("device_type", device)

    if has_rage_clicks is True:
        query = query.gt("rage_clicks", 0)

    if has_errors is True:
        query = query.gt("error_count", 0)

    if min_duration is not None:
        query = query.gte("duration_seconds", min_duration)

    if max_duration is not None:
        query = query.lte("duration_seconds", max_duration)

    if date_from:
        query = query.gte("started_at", date_from)

    if date_to:
        query = query.lte("started_at", date_to)

    if starred_only:
        query = query.eq("is_starred", True)

    # Apply ordering
    order_col = order_by if order_by in [
        "started_at", "ended_at", "duration_seconds", "rage_clicks", "error_count"
    ] else "started_at"
    query = query.order(order_col, desc=(order_dir.lower() == "desc"))

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)

    # Execute
    result = query.execute()

    total = result.count or 0
    recordings = [RecordingSummary(**r) for r in result.data]

    return RecordingListResponse(
        recordings=recordings,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(recordings)) < total,
    )


@router.get("/stats", response_model=RecordingStatsResponse)
async def get_recording_stats(
    user: dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
):
    """Get recording statistics for the organization."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    period_start = today_start - timedelta(days=days)

    # Total recordings
    total_result = supabase.table("session_recordings").select(
        "id", count="exact"
    ).eq("organization_id", org_id).execute()
    total_recordings = total_result.count or 0

    # Recordings today
    today_result = supabase.table("session_recordings").select(
        "id", count="exact"
    ).eq("organization_id", org_id).gte(
        "started_at", today_start.isoformat()
    ).execute()
    recordings_today = today_result.count or 0

    # Recordings this week
    week_result = supabase.table("session_recordings").select(
        "id", count="exact"
    ).eq("organization_id", org_id).gte(
        "started_at", week_start.isoformat()
    ).execute()
    recordings_this_week = week_result.count or 0

    # Get aggregated stats
    stats_result = supabase.table("session_recordings").select(
        "duration_seconds, rage_clicks, dead_clicks, error_count, device_type, entry_path"
    ).eq("organization_id", org_id).gte(
        "started_at", period_start.isoformat()
    ).limit(1000).execute()

    total_duration = 0
    total_rage = 0
    total_dead = 0
    total_errors = 0
    device_counts = {"desktop": 0, "mobile": 0, "tablet": 0, "unknown": 0}
    page_counts = {}

    for r in stats_result.data:
        total_duration += r.get("duration_seconds", 0) or 0
        total_rage += r.get("rage_clicks", 0) or 0
        total_dead += r.get("dead_clicks", 0) or 0
        total_errors += r.get("error_count", 0) or 0

        dt = r.get("device_type", "unknown")
        if dt in device_counts:
            device_counts[dt] += 1
        else:
            device_counts["unknown"] += 1

        path = r.get("entry_path")
        if path:
            page_counts[path] = page_counts.get(path, 0) + 1

    count = len(stats_result.data) or 1
    avg_duration = total_duration / count

    top_pages = sorted(
        [{"path": k, "count": v} for k, v in page_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:10]

    # Top errors - would need error logging table in production
    top_errors: List[dict] = []

    return RecordingStatsResponse(
        total_recordings=total_recordings,
        recordings_today=recordings_today,
        recordings_this_week=recordings_this_week,
        avg_duration_seconds=avg_duration,
        total_rage_clicks=total_rage,
        total_dead_clicks=total_dead,
        total_errors=total_errors,
        device_breakdown=device_counts,
        top_pages=top_pages,
        top_errors=top_errors,
    )


@router.get("/settings", response_model=RecordingSettingsResponse)
async def get_recording_settings(
    user: dict = Depends(get_current_user),
):
    """Get recording settings for the organization."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Get or create settings
    result = supabase.table("session_recording_settings").select("*").eq(
        "organization_id", org_id
    ).maybe_single().execute()

    if result.data:
        settings = result.data
    else:
        # Default settings
        settings = {
            "is_enabled": True,
            "sample_rate": 1.0,
            "max_duration_seconds": 1800,  # 30 minutes
            "capture_mouse_movement": True,
            "capture_scroll": True,
            "capture_input": True,
            "mask_all_inputs": True,
            "mask_selectors": [],
            "block_selectors": [],
            "ignore_selectors": [],
            "monthly_limit": 100,  # Based on plan
        }

    # Count recordings this month
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    count_result = supabase.table("session_recordings").select(
        "id", count="exact"
    ).eq("organization_id", org_id).gte(
        "started_at", month_start.isoformat()
    ).execute()

    return RecordingSettingsResponse(
        is_enabled=settings.get("is_enabled", True),
        sample_rate=settings.get("sample_rate", 1.0),
        max_duration_seconds=settings.get("max_duration_seconds", 1800),
        capture_mouse_movement=settings.get("capture_mouse_movement", True),
        capture_scroll=settings.get("capture_scroll", True),
        capture_input=settings.get("capture_input", True),
        mask_all_inputs=settings.get("mask_all_inputs", True),
        mask_selectors=settings.get("mask_selectors", []),
        block_selectors=settings.get("block_selectors", []),
        ignore_selectors=settings.get("ignore_selectors", []),
        monthly_limit=settings.get("monthly_limit", 100),
        recordings_this_month=count_result.count or 0,
    )


@router.put("/settings", response_model=RecordingSettingsResponse)
async def update_recording_settings(
    request: UpdateRecordingSettingsRequest,
    user: dict = Depends(get_current_user),
):
    """Update recording settings for the organization."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Build update data
    update_data = {k: v for k, v in request.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Upsert settings
    result = supabase.table("session_recording_settings").upsert({
        "organization_id": org_id,
        **update_data
    }, on_conflict="organization_id").execute()

    return await get_recording_settings(user)


@router.get("/{recording_id}", response_model=RecordingDetail)
async def get_recording(
    recording_id: str,
    user: dict = Depends(get_current_user),
):
    """Get detailed information about a specific recording."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    result = supabase.table("session_recordings").select("*").eq(
        "organization_id", org_id
    ).eq("id", recording_id).maybe_single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Recording not found")

    return RecordingDetail(**result.data)


@router.get("/{recording_id}/events")
async def get_recording_events(
    recording_id: str,
    user: dict = Depends(get_current_user),
    chunk: Optional[int] = Query(None, ge=0, description="Specific chunk index"),
):
    """Get rrweb events for a recording (for playback)."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Verify recording belongs to org
    recording = supabase.table("session_recordings").select("id").eq(
        "organization_id", org_id
    ).eq("id", recording_id).maybe_single().execute()

    if not recording.data:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Get events
    query = supabase.table("session_recording_chunks").select(
        "chunk_index, events, event_count"
    ).eq("recording_id", recording_id)

    if chunk is not None:
        query = query.eq("chunk_index", chunk)

    query = query.order("chunk_index", desc=False)
    result = query.execute()

    # Flatten events from all chunks
    all_events = []
    for chunk_data in result.data:
        events = chunk_data.get("events", [])
        all_events.extend(events)

    return {
        "recording_id": recording_id,
        "chunks": len(result.data),
        "total_events": len(all_events),
        "events": all_events
    }


@router.get("/{recording_id}/markers", response_model=List[RecordingMarker])
async def get_recording_markers(
    recording_id: str,
    user: dict = Depends(get_current_user),
):
    """Get markers/bookmarks for a recording."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Verify recording belongs to org
    recording = supabase.table("session_recordings").select("id, organization_id").eq(
        "organization_id", org_id
    ).eq("id", recording_id).maybe_single().execute()

    if not recording.data:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Get markers
    markers = supabase.table("session_recording_markers").select("*").eq(
        "recording_id", recording_id
    ).order("timestamp_ms", desc=False).execute()

    return [RecordingMarker(**m) for m in markers.data]


@router.post("/{recording_id}/star")
async def star_recording(
    recording_id: str,
    user: dict = Depends(get_current_user),
):
    """Star/unstar a recording."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Get current state
    result = supabase.table("session_recordings").select("is_starred").eq(
        "organization_id", org_id
    ).eq("id", recording_id).maybe_single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Toggle star
    new_state = not result.data.get("is_starred", False)
    supabase.table("session_recordings").update({
        "is_starred": new_state,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", recording_id).execute()

    return {"status": "success", "is_starred": new_state}


@router.delete("/{recording_id}")
async def delete_recording(
    recording_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a recording and all associated data."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Verify recording belongs to org
    recording = supabase.table("session_recordings").select("id").eq(
        "organization_id", org_id
    ).eq("id", recording_id).maybe_single().execute()

    if not recording.data:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Delete chunks and markers (cascades via FK)
    supabase.table("session_recording_chunks").delete().eq(
        "recording_id", recording_id
    ).execute()

    supabase.table("session_recording_markers").delete().eq(
        "recording_id", recording_id
    ).execute()

    # Delete recording
    supabase.table("session_recordings").delete().eq(
        "id", recording_id
    ).execute()

    return {"status": "success", "message": "Recording deleted"}


# ============================================================================
# Ingest Endpoint (for tracker)
# ============================================================================

@router.post("/ingest")
async def ingest_recording_events(
    request: IngestRecordingRequest,
    org_id: str = Query(..., description="Organization ID"),
):
    """
    Ingest recording events from the tracker.
    This endpoint is called by the Infinity Tracker to send rrweb events.
    """
    supabase = get_supabase()

    # Verify organization exists
    org = supabase.table("organizations").select("id").eq(
        "id", org_id
    ).maybe_single().execute()

    if not org.data:
        raise HTTPException(status_code=400, detail="Invalid organization")

    # Check if recording exists
    existing = supabase.table("session_recordings").select("id, event_count").eq(
        "session_id", request.session_id
    ).eq("organization_id", org_id).maybe_single().execute()

    now = datetime.now(timezone.utc).isoformat()

    if existing.data:
        # Update existing recording
        recording_id = existing.data["id"]
        current_count = existing.data.get("event_count", 0) or 0

        # Calculate duration from events
        if request.events:
            first_ts = request.events[0].get("timestamp", 0)
            last_ts = request.events[-1].get("timestamp", 0)
            duration_ms = last_ts - first_ts

            # Count interaction markers
            rage_clicks = sum(1 for e in request.events if e.get("type") == 3 and e.get("data", {}).get("source") == 2)

            supabase.table("session_recordings").update({
                "event_count": current_count + len(request.events),
                "duration_seconds": duration_ms // 1000,
                "ended_at": now,
                "updated_at": now,
            }).eq("id", recording_id).execute()
    else:
        # Create new recording
        # Get visitor info
        visitor = supabase.table("visitors").select(
            "id, email, first_name, last_name, utm_source, utm_campaign, gclid, fbclid, country_code, city"
        ).eq("visitor_id", request.visitor_id).eq(
            "organization_id", org_id
        ).maybe_single().execute()

        visitor_data = visitor.data or {}
        visitor_name = None
        if visitor_data.get("first_name") or visitor_data.get("last_name"):
            visitor_name = f"{visitor_data.get('first_name', '')} {visitor_data.get('last_name', '')}".strip()

        recording_data = {
            "organization_id": org_id,
            "visitor_id": request.visitor_id,
            "session_id": request.session_id,
            "visitor_email": visitor_data.get("email"),
            "visitor_name": visitor_name,
            "entry_url": request.entry_url,
            "entry_path": request.entry_path,
            "referrer": request.referrer,
            "device_type": request.device_type,
            "browser": request.browser,
            "browser_version": request.browser_version,
            "os": request.os,
            "os_version": request.os_version,
            "screen_width": request.screen_width,
            "screen_height": request.screen_height,
            "user_agent": request.user_agent,
            "country_code": visitor_data.get("country_code"),
            "city": visitor_data.get("city"),
            "utm_source": visitor_data.get("utm_source"),
            "utm_campaign": visitor_data.get("utm_campaign"),
            "gclid": visitor_data.get("gclid"),
            "fbclid": visitor_data.get("fbclid"),
            "status": "recording",
            "event_count": len(request.events),
            "page_count": 1,
            "started_at": now,
        }

        result = supabase.table("session_recordings").insert(recording_data).execute()
        recording_id = result.data[0]["id"]

    # Store events as chunk
    if request.events:
        chunk_data = {
            "recording_id": recording_id,
            "chunk_index": request.chunk_index,
            "events": request.events,
            "event_count": len(request.events),
        }
        supabase.table("session_recording_chunks").upsert(
            chunk_data, on_conflict="recording_id,chunk_index"
        ).execute()

    return {
        "status": "success",
        "recording_id": recording_id,
        "events_received": len(request.events),
    }
