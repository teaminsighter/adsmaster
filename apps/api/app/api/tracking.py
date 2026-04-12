"""Tracking API endpoints for receiving events from tracker.js.

These endpoints are PUBLIC (no auth required) but rate-limited.
They use org_id from the request body for identification.
"""

from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel, Field

from ..services.tracking import process_tracking_event, process_identify
from ..services.supabase_client import get_supabase_client as get_supabase


router = APIRouter(prefix="/api/v1/track", tags=["Tracking"])


# ============================================================================
# Request/Response Models
# ============================================================================

class TrackEventRequest(BaseModel):
    """Request body for tracking an event."""
    org_id: str = Field(..., description="Organization ID")
    visitor_id: str = Field(..., description="Client-generated visitor ID")
    event: str = Field(default="pageview", description="Event type")
    event_name: Optional[str] = Field(None, description="Custom event name")

    # Page info
    url: Optional[str] = None
    path: Optional[str] = None
    title: Optional[str] = None
    referrer: Optional[str] = None

    # Session
    session_id: Optional[str] = None

    # Click IDs
    gclid: Optional[str] = None
    fbclid: Optional[str] = None
    gbraid: Optional[str] = None
    wbraid: Optional[str] = None
    msclkid: Optional[str] = None
    ttclkid: Optional[str] = None
    li_fat_id: Optional[str] = None

    # Facebook cookies
    fbp: Optional[str] = Field(None, alias="_fbp")
    fbc: Optional[str] = Field(None, alias="_fbc")

    # UTM parameters
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None

    # Device info
    screen_width: Optional[int] = None
    screen_height: Optional[int] = None

    # Custom data (any additional fields)
    class Config:
        extra = "allow"  # Allow additional fields


class IdentifyRequest(BaseModel):
    """Request body for identifying a visitor."""
    org_id: str = Field(..., description="Organization ID")
    visitor_id: str = Field(..., description="Client-generated visitor ID")

    # Identity fields
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")

    # Custom data
    class Config:
        extra = "allow"


class TrackConversionRequest(BaseModel):
    """Request body for tracking a conversion."""
    org_id: str = Field(..., description="Organization ID")
    visitor_id: str = Field(..., description="Client-generated visitor ID")

    # Conversion details
    conversion_type: str = Field(default="lead", description="Type of conversion")
    conversion_name: Optional[str] = None
    value: Optional[float] = Field(None, description="Conversion value in dollars")
    currency: str = Field(default="USD")
    order_id: Optional[str] = None

    # Contact info (optional, will use visitor's if not provided)
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")

    # Custom data
    custom_data: Optional[dict] = None

    class Config:
        extra = "allow"


class TrackResponse(BaseModel):
    """Response for tracking requests."""
    status: str
    visitor_id: Optional[str] = None
    event_id: Optional[str] = None
    conversion_id: Optional[str] = None
    message: Optional[str] = None


class BatchTrackRequest(BaseModel):
    """Request body for batch tracking events."""
    org_id: str
    events: List[dict]


# ============================================================================
# Endpoints
# ============================================================================

@router.post("", response_model=TrackResponse)
async def track_event(
    request: Request,
    body: TrackEventRequest,
    x_forwarded_for: Optional[str] = Header(None),
):
    """Track a single event (pageview, click, custom event).

    This endpoint is PUBLIC - no authentication required.
    Rate limited per IP address.

    The tracker.js script calls this endpoint on every page view
    and custom event.
    """
    # Validate org_id exists
    supabase = get_supabase()
    org = supabase.table("organizations").select("id").eq(
        "id", body.org_id
    ).maybe_single().execute()

    if not org.data:
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    # Get client IP
    client_ip = x_forwarded_for.split(",")[0].strip() if x_forwarded_for else request.client.host

    # Convert request to dict for processing
    event_data = body.model_dump(by_alias=True, exclude_none=True)

    # Process the event
    result = await process_tracking_event(
        org_id=body.org_id,
        visitor_id=body.visitor_id,
        event_type=body.event,
        event_data=event_data,
        request_headers=dict(request.headers),
        direct_ip=client_ip,
    )

    return TrackResponse(**result)


@router.post("/identify", response_model=TrackResponse)
async def identify_visitor(
    request: Request,
    body: IdentifyRequest,
    x_forwarded_for: Optional[str] = Header(None),
):
    """Identify a visitor with email, phone, or name.

    Called when a user fills out a form or logs in.
    Associates the anonymous visitor_id with PII.
    """
    # Validate org_id exists
    supabase = get_supabase()
    org = supabase.table("organizations").select("id").eq(
        "id", body.org_id
    ).maybe_single().execute()

    if not org.data:
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    # Get client IP
    client_ip = x_forwarded_for.split(",")[0].strip() if x_forwarded_for else request.client.host

    # Convert request to dict
    identify_data = body.model_dump(by_alias=True, exclude_none=True)

    # Process identification
    result = await process_identify(
        org_id=body.org_id,
        visitor_id=body.visitor_id,
        identify_data=identify_data,
        request_headers=dict(request.headers),
        direct_ip=client_ip,
    )

    return TrackResponse(**result)


@router.post("/conversion", response_model=TrackResponse)
async def track_conversion(
    request: Request,
    body: TrackConversionRequest,
    x_forwarded_for: Optional[str] = Header(None),
):
    """Track a conversion event.

    Creates an offline conversion record that can be synced
    to Meta CAPI or Google Ads.
    """
    from ..services.tracking.event_processor import create_conversion_from_visitor

    # Validate org_id exists
    supabase = get_supabase()
    org = supabase.table("organizations").select("id").eq(
        "id", body.org_id
    ).maybe_single().execute()

    if not org.data:
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    # Get client IP
    client_ip = x_forwarded_for.split(",")[0].strip() if x_forwarded_for else request.client.host

    # First, ensure visitor exists and identify if contact info provided
    if body.email or body.phone or body.first_name or body.last_name:
        identify_data = {
            "email": body.email,
            "phone": body.phone,
            "first_name": body.first_name,
            "last_name": body.last_name,
        }
        await process_identify(
            org_id=body.org_id,
            visitor_id=body.visitor_id,
            identify_data=identify_data,
            request_headers=dict(request.headers),
            direct_ip=client_ip,
        )

    # Find the visitor's database ID
    visitor = supabase.table("visitors").select("id").eq(
        "organization_id", body.org_id
    ).eq("visitor_id", body.visitor_id).maybe_single().execute()

    if not visitor.data:
        raise HTTPException(status_code=400, detail="Visitor not found. Send a pageview first.")

    # Convert value to micros
    value_micros = int(body.value * 1_000_000) if body.value else 0

    # Create conversion
    result = await create_conversion_from_visitor(
        org_id=body.org_id,
        visitor_db_id=visitor.data["id"],
        conversion_type=body.conversion_type,
        value_micros=value_micros,
        currency=body.currency,
        conversion_name=body.conversion_name,
        order_id=body.order_id,
        custom_data=body.custom_data,
    )

    return TrackResponse(**result)


@router.post("/batch", response_model=TrackResponse)
async def track_batch(
    request: Request,
    body: BatchTrackRequest,
    x_forwarded_for: Optional[str] = Header(None),
):
    """Track multiple events in a single request.

    Useful for sending queued events or replaying offline events.
    """
    # Validate org_id exists
    supabase = get_supabase()
    org = supabase.table("organizations").select("id").eq(
        "id", body.org_id
    ).maybe_single().execute()

    if not org.data:
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    # Get client IP
    client_ip = x_forwarded_for.split(",")[0].strip() if x_forwarded_for else request.client.host

    # Process each event
    processed = 0
    errors = 0

    for event in body.events:
        try:
            visitor_id = event.get("visitor_id")
            event_type = event.get("event", "pageview")

            if not visitor_id:
                errors += 1
                continue

            await process_tracking_event(
                org_id=body.org_id,
                visitor_id=visitor_id,
                event_type=event_type,
                event_data=event,
                request_headers=dict(request.headers),
                direct_ip=client_ip,
            )
            processed += 1
        except Exception:
            errors += 1

    return TrackResponse(
        status="success",
        message=f"Processed {processed} events, {errors} errors",
    )


@router.options("")
@router.options("/identify")
@router.options("/conversion")
@router.options("/batch")
async def options_handler():
    """Handle CORS preflight requests."""
    return {"status": "ok"}
