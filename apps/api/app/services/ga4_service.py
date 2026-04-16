"""
GA4 Server-Side Events Service

Handles server-side event tracking to Google Analytics 4 via Measurement Protocol.
"""
import hashlib
import json
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings
from app.services.supabase_client import get_supabase_client


# GA4 Measurement Protocol endpoints
GA4_COLLECT_URL = "https://www.google-analytics.com/mp/collect"
GA4_DEBUG_URL = "https://www.google-analytics.com/debug/mp/collect"


class GA4Event:
    """GA4 Event structure."""

    def __init__(
        self,
        name: str,
        params: Optional[Dict[str, Any]] = None,
        timestamp_micros: Optional[int] = None
    ):
        self.name = name
        self.params = params or {}
        self.timestamp_micros = timestamp_micros or int(time.time() * 1_000_000)

    def to_dict(self) -> Dict[str, Any]:
        event = {
            "name": self.name,
            "params": self.params
        }
        if self.timestamp_micros:
            event["timestamp_micros"] = str(self.timestamp_micros)
        return event


class GA4User:
    """GA4 User properties."""

    def __init__(
        self,
        client_id: str,
        user_id: Optional[str] = None,
        user_properties: Optional[Dict[str, Any]] = None
    ):
        self.client_id = client_id
        self.user_id = user_id
        self.user_properties = user_properties or {}


class GA4Service:
    """Service for sending server-side events to GA4."""

    def __init__(
        self,
        measurement_id: str,
        api_secret: str,
        debug: bool = False
    ):
        """
        Initialize GA4 service.

        Args:
            measurement_id: GA4 Measurement ID (G-XXXXXXX)
            api_secret: GA4 Measurement Protocol API secret
            debug: Use debug endpoint for validation
        """
        self.measurement_id = measurement_id
        self.api_secret = api_secret
        self.debug = debug
        self.base_url = GA4_DEBUG_URL if debug else GA4_COLLECT_URL

    async def send_event(
        self,
        client_id: str,
        event: GA4Event,
        user_id: Optional[str] = None,
        user_properties: Optional[Dict[str, Dict[str, Any]]] = None,
        non_personalized_ads: bool = False
    ) -> Dict[str, Any]:
        """
        Send a single event to GA4.

        Args:
            client_id: GA4 client ID (required)
            event: GA4Event object
            user_id: Optional user ID for cross-device tracking
            user_properties: Optional user properties
            non_personalized_ads: Set to True for non-personalized ads

        Returns:
            Response with validation messages (debug mode) or empty (production)
        """
        return await self.send_events(
            client_id=client_id,
            events=[event],
            user_id=user_id,
            user_properties=user_properties,
            non_personalized_ads=non_personalized_ads
        )

    async def send_events(
        self,
        client_id: str,
        events: List[GA4Event],
        user_id: Optional[str] = None,
        user_properties: Optional[Dict[str, Dict[str, Any]]] = None,
        non_personalized_ads: bool = False
    ) -> Dict[str, Any]:
        """
        Send multiple events to GA4 (max 25 events per request).

        Args:
            client_id: GA4 client ID (required)
            events: List of GA4Event objects (max 25)
            user_id: Optional user ID for cross-device tracking
            user_properties: Optional user properties
            non_personalized_ads: Set to True for non-personalized ads

        Returns:
            Response with validation messages (debug mode) or empty (production)
        """
        if len(events) > 25:
            raise ValueError("Maximum 25 events per request")

        # Build payload
        payload: Dict[str, Any] = {
            "client_id": client_id,
            "events": [e.to_dict() for e in events]
        }

        if user_id:
            payload["user_id"] = user_id

        if user_properties:
            payload["user_properties"] = user_properties

        if non_personalized_ads:
            payload["non_personalized_ads"] = True

        # Build URL with query params
        url = f"{self.base_url}?measurement_id={self.measurement_id}&api_secret={self.api_secret}"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )

            # Debug endpoint returns validation messages
            if self.debug:
                return response.json() if response.content else {}

            # Production endpoint returns 204 No Content on success
            return {
                "success": response.status_code == 204,
                "status_code": response.status_code
            }

    async def track_conversion(
        self,
        client_id: str,
        conversion_name: str,
        value: Optional[float] = None,
        currency: str = "USD",
        transaction_id: Optional[str] = None,
        user_id: Optional[str] = None,
        additional_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Track a conversion event.

        Args:
            client_id: GA4 client ID
            conversion_name: Conversion event name
            value: Conversion value
            currency: Currency code (default: USD)
            transaction_id: Unique transaction ID
            user_id: Optional user ID
            additional_params: Additional event parameters

        Returns:
            GA4 response
        """
        params = additional_params or {}

        if value is not None:
            params["value"] = value
            params["currency"] = currency

        if transaction_id:
            params["transaction_id"] = transaction_id

        event = GA4Event(name=conversion_name, params=params)
        return await self.send_event(
            client_id=client_id,
            event=event,
            user_id=user_id
        )

    async def track_purchase(
        self,
        client_id: str,
        transaction_id: str,
        value: float,
        currency: str = "USD",
        items: Optional[List[Dict[str, Any]]] = None,
        coupon: Optional[str] = None,
        shipping: Optional[float] = None,
        tax: Optional[float] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track a purchase event (ecommerce).

        Args:
            client_id: GA4 client ID
            transaction_id: Unique transaction ID
            value: Total purchase value
            currency: Currency code
            items: List of purchased items
            coupon: Coupon code used
            shipping: Shipping cost
            tax: Tax amount
            user_id: Optional user ID

        Returns:
            GA4 response
        """
        params: Dict[str, Any] = {
            "transaction_id": transaction_id,
            "value": value,
            "currency": currency
        }

        if items:
            params["items"] = items

        if coupon:
            params["coupon"] = coupon

        if shipping is not None:
            params["shipping"] = shipping

        if tax is not None:
            params["tax"] = tax

        event = GA4Event(name="purchase", params=params)
        return await self.send_event(
            client_id=client_id,
            event=event,
            user_id=user_id
        )

    async def track_lead(
        self,
        client_id: str,
        value: Optional[float] = None,
        currency: str = "USD",
        user_id: Optional[str] = None,
        lead_source: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track a lead generation event.
        """
        params: Dict[str, Any] = {}

        if value is not None:
            params["value"] = value
            params["currency"] = currency

        if lead_source:
            params["lead_source"] = lead_source

        event = GA4Event(name="generate_lead", params=params)
        return await self.send_event(
            client_id=client_id,
            event=event,
            user_id=user_id
        )

    async def track_sign_up(
        self,
        client_id: str,
        method: str = "website",
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track a sign up event.
        """
        event = GA4Event(name="sign_up", params={"method": method})
        return await self.send_event(
            client_id=client_id,
            event=event,
            user_id=user_id
        )

    async def track_login(
        self,
        client_id: str,
        method: str = "website",
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track a login event.
        """
        event = GA4Event(name="login", params={"method": method})
        return await self.send_event(
            client_id=client_id,
            event=event,
            user_id=user_id
        )

    async def track_page_view(
        self,
        client_id: str,
        page_location: str,
        page_title: Optional[str] = None,
        page_referrer: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track a page view event (server-side).
        """
        params = {"page_location": page_location}

        if page_title:
            params["page_title"] = page_title

        if page_referrer:
            params["page_referrer"] = page_referrer

        event = GA4Event(name="page_view", params=params)
        return await self.send_event(
            client_id=client_id,
            event=event,
            user_id=user_id
        )

    @staticmethod
    def generate_client_id() -> str:
        """Generate a new GA4 client ID."""
        return f"{uuid.uuid4()}.{int(time.time())}"

    @staticmethod
    def hash_user_data(data: str) -> str:
        """
        Hash user data for enhanced conversions.

        Use SHA256 for hashing PII (email, phone, etc.)
        """
        return hashlib.sha256(data.lower().strip().encode()).hexdigest()


class GA4ServiceFactory:
    """Factory for creating GA4 service instances from stored credentials."""

    @staticmethod
    async def get_service(org_id: str) -> Optional[GA4Service]:
        """
        Get GA4 service for an organization.

        Args:
            org_id: Organization ID

        Returns:
            GA4Service instance or None if not configured
        """
        supabase = get_supabase_client()

        # Get GA4 credentials from organization settings
        result = supabase.table("organization_settings").select(
            "ga4_measurement_id, ga4_api_secret"
        ).eq("organization_id", org_id).execute()

        if not result.data:
            return None

        settings_data = result.data[0]
        measurement_id = settings_data.get("ga4_measurement_id")
        api_secret = settings_data.get("ga4_api_secret")

        if not measurement_id or not api_secret:
            return None

        return GA4Service(
            measurement_id=measurement_id,
            api_secret=api_secret,
            debug=False
        )


# =============================================================================
# Event Queue for Batching
# =============================================================================

class GA4EventQueue:
    """Queue for batching GA4 events."""

    def __init__(self, max_batch_size: int = 25, flush_interval_seconds: int = 10):
        self.events: Dict[str, List[Dict[str, Any]]] = {}  # client_id -> events
        self.max_batch_size = max_batch_size
        self.flush_interval = flush_interval_seconds
        self.last_flush = time.time()

    def add_event(
        self,
        client_id: str,
        event: GA4Event,
        user_id: Optional[str] = None
    ):
        """Add event to queue."""
        if client_id not in self.events:
            self.events[client_id] = []

        self.events[client_id].append({
            "event": event.to_dict(),
            "user_id": user_id
        })

    def should_flush(self) -> bool:
        """Check if queue should be flushed."""
        # Flush if any client has max events
        for client_events in self.events.values():
            if len(client_events) >= self.max_batch_size:
                return True

        # Flush if interval exceeded
        if time.time() - self.last_flush >= self.flush_interval:
            return True

        return False

    def get_batches(self) -> List[Dict[str, Any]]:
        """Get batched events for sending."""
        batches = []

        for client_id, client_events in self.events.items():
            # Group by user_id
            by_user: Dict[Optional[str], List[Dict[str, Any]]] = {}
            for e in client_events:
                user_id = e.get("user_id")
                if user_id not in by_user:
                    by_user[user_id] = []
                by_user[user_id].append(e["event"])

            for user_id, events in by_user.items():
                # Split into chunks of 25
                for i in range(0, len(events), self.max_batch_size):
                    chunk = events[i:i + self.max_batch_size]
                    batches.append({
                        "client_id": client_id,
                        "user_id": user_id,
                        "events": chunk
                    })

        return batches

    def clear(self):
        """Clear the queue."""
        self.events = {}
        self.last_flush = time.time()


# =============================================================================
# API Router for GA4 Events
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/ga4", tags=["GA4 Events"])


class GA4EventRequest(BaseModel):
    """Request to send GA4 event."""
    client_id: str
    event_name: str
    params: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None


class GA4ConversionRequest(BaseModel):
    """Request to track conversion in GA4."""
    client_id: str
    conversion_name: str
    value: Optional[float] = None
    currency: str = "USD"
    transaction_id: Optional[str] = None
    user_id: Optional[str] = None
    params: Optional[Dict[str, Any]] = None


class GA4PurchaseRequest(BaseModel):
    """Request to track purchase in GA4."""
    client_id: str
    transaction_id: str
    value: float
    currency: str = "USD"
    items: Optional[List[Dict[str, Any]]] = None
    coupon: Optional[str] = None
    shipping: Optional[float] = None
    tax: Optional[float] = None
    user_id: Optional[str] = None


class GA4ConfigRequest(BaseModel):
    """Request to configure GA4 for organization."""
    measurement_id: str
    api_secret: str


from app.api.user_auth import get_current_user


@router.post("/config")
async def configure_ga4(
    config: GA4ConfigRequest,
    user: dict = Depends(get_current_user)
):
    """
    Configure GA4 Measurement Protocol credentials for the organization.
    """
    supabase = get_supabase_client()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    # Validate credentials with debug endpoint
    test_service = GA4Service(
        measurement_id=config.measurement_id,
        api_secret=config.api_secret,
        debug=True
    )

    test_event = GA4Event(name="test_event", params={"test": True})
    result = await test_service.send_event(
        client_id=GA4Service.generate_client_id(),
        event=test_event
    )

    if "validationMessages" in result and result["validationMessages"]:
        errors = [msg.get("description", "Unknown error") for msg in result["validationMessages"]]
        raise HTTPException(status_code=400, detail=f"Invalid GA4 credentials: {', '.join(errors)}")

    # Save credentials
    supabase.table("organization_settings").upsert({
        "organization_id": org_id,
        "ga4_measurement_id": config.measurement_id,
        "ga4_api_secret": config.api_secret,
        "updated_at": datetime.utcnow().isoformat()
    }, on_conflict="organization_id").execute()

    return {"success": True, "message": "GA4 configured successfully"}


@router.post("/event")
async def send_ga4_event(
    request: GA4EventRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Send a custom event to GA4.
    """
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    service = await GA4ServiceFactory.get_service(org_id)
    if not service:
        raise HTTPException(status_code=400, detail="GA4 not configured for this organization")

    event = GA4Event(name=request.event_name, params=request.params)

    # Send in background
    async def send():
        await service.send_event(
            client_id=request.client_id,
            event=event,
            user_id=request.user_id
        )

    background_tasks.add_task(send)

    return {"success": True, "message": "Event queued"}


@router.post("/conversion")
async def track_ga4_conversion(
    request: GA4ConversionRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Track a conversion event in GA4.
    """
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    service = await GA4ServiceFactory.get_service(org_id)
    if not service:
        raise HTTPException(status_code=400, detail="GA4 not configured for this organization")

    # Send in background
    async def send():
        await service.track_conversion(
            client_id=request.client_id,
            conversion_name=request.conversion_name,
            value=request.value,
            currency=request.currency,
            transaction_id=request.transaction_id,
            user_id=request.user_id,
            additional_params=request.params
        )

    background_tasks.add_task(send)

    return {"success": True, "message": "Conversion tracked"}


@router.post("/purchase")
async def track_ga4_purchase(
    request: GA4PurchaseRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Track a purchase event in GA4 (ecommerce).
    """
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    service = await GA4ServiceFactory.get_service(org_id)
    if not service:
        raise HTTPException(status_code=400, detail="GA4 not configured for this organization")

    # Send in background
    async def send():
        await service.track_purchase(
            client_id=request.client_id,
            transaction_id=request.transaction_id,
            value=request.value,
            currency=request.currency,
            items=request.items,
            coupon=request.coupon,
            shipping=request.shipping,
            tax=request.tax,
            user_id=request.user_id
        )

    background_tasks.add_task(send)

    return {"success": True, "message": "Purchase tracked"}


@router.get("/status")
async def get_ga4_status(
    user: dict = Depends(get_current_user)
):
    """
    Check if GA4 is configured for the organization.
    """
    org_id = user.get("org")

    if not org_id:
        return {"configured": False, "message": "No organization"}

    supabase = get_supabase_client()
    result = supabase.table("organization_settings").select(
        "ga4_measurement_id"
    ).eq("organization_id", org_id).execute()

    if not result.data or not result.data[0].get("ga4_measurement_id"):
        return {"configured": False, "measurement_id": None}

    return {
        "configured": True,
        "measurement_id": result.data[0]["ga4_measurement_id"]
    }


@router.get("/validate")
async def validate_ga4_event(
    event_name: str,
    params: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """
    Validate a GA4 event using the debug endpoint.
    """
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization required")

    supabase = get_supabase_client()
    result = supabase.table("organization_settings").select(
        "ga4_measurement_id, ga4_api_secret"
    ).eq("organization_id", org_id).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="GA4 not configured")

    settings_data = result.data[0]
    measurement_id = settings_data.get("ga4_measurement_id")
    api_secret = settings_data.get("ga4_api_secret")

    if not measurement_id or not api_secret:
        raise HTTPException(status_code=400, detail="GA4 not configured")

    # Parse params if provided
    event_params = {}
    if params:
        try:
            event_params = json.loads(params)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid params JSON")

    # Use debug endpoint
    service = GA4Service(
        measurement_id=measurement_id,
        api_secret=api_secret,
        debug=True
    )

    event = GA4Event(name=event_name, params=event_params)
    validation_result = await service.send_event(
        client_id=GA4Service.generate_client_id(),
        event=event
    )

    return validation_result
