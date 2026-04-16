"""Live Debug API for real-time tracking event streaming.

Uses Server-Sent Events (SSE) to stream tracking events as they happen.
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .user_auth import get_current_user
from ..services.supabase_client import get_supabase_client as get_supabase


router = APIRouter(prefix="/api/v1/live-debug", tags=["Live Debug"])


# ============================================================================
# Models
# ============================================================================

class LiveEvent(BaseModel):
    """Real-time tracking event."""
    id: str
    event_type: str
    timestamp: str
    visitor_id: str
    session_id: Optional[str] = None
    page_url: Optional[str] = None
    page_title: Optional[str] = None
    referrer: Optional[str] = None
    data: dict = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None


class RecentEventsResponse(BaseModel):
    """Response for recent events endpoint."""
    events: List[LiveEvent]
    total: int


class EventStats(BaseModel):
    """Real-time event statistics."""
    total_events_last_hour: int
    events_by_type: dict
    active_visitors: int
    top_pages: List[dict]
    top_referrers: List[dict]


# ============================================================================
# In-memory event buffer for SSE
# ============================================================================

# Simple in-memory buffer for recent events (per organization)
# In production, you'd use Redis pub/sub
EVENT_BUFFERS: dict = {}
MAX_BUFFER_SIZE = 1000
BUFFER_LOCK = asyncio.Lock()


async def add_event_to_buffer(org_id: str, event: dict):
    """Add event to organization's buffer."""
    async with BUFFER_LOCK:
        if org_id not in EVENT_BUFFERS:
            EVENT_BUFFERS[org_id] = []
        EVENT_BUFFERS[org_id].append(event)
        # Keep buffer size limited
        if len(EVENT_BUFFERS[org_id]) > MAX_BUFFER_SIZE:
            EVENT_BUFFERS[org_id] = EVENT_BUFFERS[org_id][-MAX_BUFFER_SIZE:]


async def get_events_since(org_id: str, since_timestamp: str) -> List[dict]:
    """Get events since a timestamp."""
    async with BUFFER_LOCK:
        if org_id not in EVENT_BUFFERS:
            return []
        return [
            e for e in EVENT_BUFFERS[org_id]
            if e.get("timestamp", "") > since_timestamp
        ]


# ============================================================================
# SSE Generator
# ============================================================================

async def event_stream(org_id: str, event_types: Optional[List[str]] = None) -> AsyncGenerator:
    """Generate SSE stream of tracking events."""
    last_check = datetime.now(timezone.utc).isoformat()

    # Send initial connection message
    yield f"data: {json.dumps({'type': 'connected', 'timestamp': last_check})}\n\n"

    while True:
        try:
            # Poll for new events (in production, use Redis pub/sub)
            events = await get_events_since(org_id, last_check)

            for event in events:
                # Filter by event type if specified
                if event_types and event.get("event_type") not in event_types:
                    continue

                yield f"data: {json.dumps(event)}\n\n"

            # Update last check time
            if events:
                last_check = events[-1].get("timestamp", last_check)

            # Send heartbeat every 15 seconds
            yield f": heartbeat {datetime.now(timezone.utc).isoformat()}\n\n"

            # Wait before next poll
            await asyncio.sleep(1)

        except asyncio.CancelledError:
            break
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            await asyncio.sleep(5)


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/stream")
async def stream_events(
    request: Request,
    user: dict = Depends(get_current_user),
    event_types: Optional[str] = Query(None, description="Comma-separated event types to filter"),
):
    """Stream real-time tracking events via Server-Sent Events.

    Connect to this endpoint to receive live tracking events.
    Events are streamed as they occur on tracked websites.

    Example with curl:
    ```
    curl -N -H "Authorization: Bearer TOKEN" \\
      "http://localhost:8081/api/v1/live-debug/stream"
    ```

    Example with JavaScript:
    ```javascript
    const eventSource = new EventSource('/api/v1/live-debug/stream', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    eventSource.onmessage = (e) => console.log(JSON.parse(e.data));
    ```
    """
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    types = event_types.split(",") if event_types else None

    return StreamingResponse(
        event_stream(org_id, types),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@router.get("/recent", response_model=RecentEventsResponse)
async def get_recent_events(
    user: dict = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=500),
    event_type: Optional[str] = Query(None),
    minutes: int = Query(30, ge=1, le=1440),
):
    """Get recent tracking events (non-streaming).

    Returns the most recent events within the specified time window.
    """
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    since = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()

    query = supabase.table("tracking_events").select(
        "id, event_type, timestamp, visitor_id, session_id, "
        "page_url, page_title, referrer, event_data, "
        "ip_address, user_agent, device_type, country, city",
        count="exact"
    ).eq("organization_id", org_id).gte("timestamp", since)

    if event_type:
        query = query.eq("event_type", event_type)

    query = query.order("timestamp", desc=True).limit(limit)

    result = await query.execute()

    events = []
    for e in result.data:
        events.append(LiveEvent(
            id=e["id"],
            event_type=e["event_type"],
            timestamp=e["timestamp"],
            visitor_id=e["visitor_id"],
            session_id=e.get("session_id"),
            page_url=e.get("page_url"),
            page_title=e.get("page_title"),
            referrer=e.get("referrer"),
            data=e.get("event_data") or {},
            ip_address=e.get("ip_address"),
            user_agent=e.get("user_agent"),
            device_type=e.get("device_type"),
            country=e.get("country"),
            city=e.get("city"),
        ))

    return RecentEventsResponse(
        events=events,
        total=result.count or len(events),
    )


@router.get("/stats", response_model=EventStats)
async def get_live_stats(
    user: dict = Depends(get_current_user),
    minutes: int = Query(60, ge=1, le=1440),
):
    """Get real-time statistics for tracking events."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    since = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()

    # Total events
    total_result = supabase.table("tracking_events").select(
        "id", count="exact"
    ).eq("organization_id", org_id).gte("timestamp", since).execute()

    total_events = total_result.count or 0

    # Events by type
    type_result = supabase.table("tracking_events").select(
        "event_type"
    ).eq("organization_id", org_id).gte("timestamp", since).limit(5000).execute()

    events_by_type = {}
    for e in type_result.data:
        t = e.get("event_type", "unknown")
        events_by_type[t] = events_by_type.get(t, 0) + 1

    # Active visitors (unique in last 15 min)
    active_since = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    active_result = supabase.table("tracking_events").select(
        "visitor_id"
    ).eq("organization_id", org_id).gte("timestamp", active_since).limit(5000).execute()

    active_visitors = len(set(e.get("visitor_id") for e in active_result.data if e.get("visitor_id")))

    # Top pages
    page_result = supabase.table("tracking_events").select(
        "page_url"
    ).eq("organization_id", org_id).gte("timestamp", since).eq(
        "event_type", "page_view"
    ).limit(1000).execute()

    page_counts = {}
    for e in page_result.data:
        url = e.get("page_url", "unknown")
        page_counts[url] = page_counts.get(url, 0) + 1

    top_pages = sorted(
        [{"url": k, "count": v} for k, v in page_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:10]

    # Top referrers
    ref_result = supabase.table("tracking_events").select(
        "referrer"
    ).eq("organization_id", org_id).gte("timestamp", since).not_.is_(
        "referrer", "null"
    ).limit(1000).execute()

    ref_counts = {}
    for e in ref_result.data:
        ref = e.get("referrer", "direct")
        if ref:
            # Extract domain from referrer
            try:
                from urllib.parse import urlparse
                domain = urlparse(ref).netloc or "direct"
            except:
                domain = ref
            ref_counts[domain] = ref_counts.get(domain, 0) + 1

    top_referrers = sorted(
        [{"referrer": k, "count": v} for k, v in ref_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:10]

    return EventStats(
        total_events_last_hour=total_events,
        events_by_type=events_by_type,
        active_visitors=active_visitors,
        top_pages=top_pages,
        top_referrers=top_referrers,
    )


@router.post("/test-event")
async def send_test_event(
    user: dict = Depends(get_current_user),
    event_type: str = Query("page_view"),
):
    """Send a test event for debugging purposes.

    This endpoint creates a fake tracking event to verify your
    live debug stream is working correctly.
    """
    from uuid import uuid4

    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    test_event = {
        "id": str(uuid4()),
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "visitor_id": f"test_visitor_{uuid4().hex[:8]}",
        "session_id": f"test_session_{uuid4().hex[:8]}",
        "page_url": "https://example.com/test-page",
        "page_title": "Test Page - Live Debug",
        "referrer": "https://google.com",
        "data": {"test": True, "sent_by": user.get("sub")},
        "device_type": "desktop",
        "country": "US",
        "city": "San Francisco",
    }

    # Add to buffer
    await add_event_to_buffer(org_id, test_event)

    return {
        "status": "success",
        "message": "Test event sent",
        "event": test_event,
    }


@router.get("/visitor/{visitor_id}")
async def get_visitor_events(
    visitor_id: str,
    user: dict = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=500),
):
    """Get all events for a specific visitor.

    Useful for debugging a specific user's journey.
    """
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    result = supabase.table("tracking_events").select(
        "id, event_type, timestamp, visitor_id, session_id, "
        "page_url, page_title, referrer, event_data, "
        "ip_address, user_agent, device_type, country, city"
    ).eq("organization_id", org_id).eq(
        "visitor_id", visitor_id
    ).order("timestamp", desc=True).limit(limit).execute()

    events = []
    for e in result.data:
        events.append(LiveEvent(
            id=e["id"],
            event_type=e["event_type"],
            timestamp=e["timestamp"],
            visitor_id=e["visitor_id"],
            session_id=e.get("session_id"),
            page_url=e.get("page_url"),
            page_title=e.get("page_title"),
            referrer=e.get("referrer"),
            data=e.get("event_data") or {},
            ip_address=e.get("ip_address"),
            user_agent=e.get("user_agent"),
            device_type=e.get("device_type"),
            country=e.get("country"),
            city=e.get("city"),
        ))

    return {"visitor_id": visitor_id, "events": events, "total": len(events)}


@router.get("/session/{session_id}")
async def get_session_events(
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """Get all events for a specific session.

    Useful for replaying a visitor's session journey.
    """
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    result = supabase.table("tracking_events").select(
        "id, event_type, timestamp, visitor_id, session_id, "
        "page_url, page_title, referrer, event_data, "
        "ip_address, user_agent, device_type, country, city"
    ).eq("organization_id", org_id).eq(
        "session_id", session_id
    ).order("timestamp").execute()

    events = []
    for e in result.data:
        events.append(LiveEvent(
            id=e["id"],
            event_type=e["event_type"],
            timestamp=e["timestamp"],
            visitor_id=e["visitor_id"],
            session_id=e.get("session_id"),
            page_url=e.get("page_url"),
            page_title=e.get("page_title"),
            referrer=e.get("referrer"),
            data=e.get("event_data") or {},
            ip_address=e.get("ip_address"),
            user_agent=e.get("user_agent"),
            device_type=e.get("device_type"),
            country=e.get("country"),
            city=e.get("city"),
        ))

    # Calculate session duration
    if events:
        first = datetime.fromisoformat(events[0].timestamp.replace("Z", "+00:00"))
        last = datetime.fromisoformat(events[-1].timestamp.replace("Z", "+00:00"))
        duration_seconds = int((last - first).total_seconds())
    else:
        duration_seconds = 0

    return {
        "session_id": session_id,
        "events": events,
        "total": len(events),
        "duration_seconds": duration_seconds,
    }


# ============================================================================
# Webhook to receive events and add to buffer
# ============================================================================

@router.post("/ingest")
async def ingest_event(
    event: dict,
    org_id: str = Query(..., description="Organization ID"),
):
    """Ingest a tracking event and add to live buffer.

    This endpoint is called by the tracking script or webhook
    to push events into the live debug stream.
    """
    from uuid import uuid4

    # Validate org_id
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization ID required")

    # Normalize event
    normalized = {
        "id": event.get("id") or str(uuid4()),
        "event_type": event.get("event_type") or event.get("type") or "unknown",
        "timestamp": event.get("timestamp") or datetime.now(timezone.utc).isoformat(),
        "visitor_id": event.get("visitor_id") or "unknown",
        "session_id": event.get("session_id"),
        "page_url": event.get("page_url") or event.get("url"),
        "page_title": event.get("page_title") or event.get("title"),
        "referrer": event.get("referrer"),
        "data": event.get("data") or event.get("event_data") or {},
        "device_type": event.get("device_type"),
        "country": event.get("country"),
        "city": event.get("city"),
    }

    # Add to buffer
    await add_event_to_buffer(org_id, normalized)

    return {"status": "success"}
