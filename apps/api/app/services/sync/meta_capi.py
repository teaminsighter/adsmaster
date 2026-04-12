"""
Meta Conversions API (CAPI) Sync Service

Sends offline conversions to Meta/Facebook using the Conversions API.
https://developers.facebook.com/docs/marketing-api/conversions-api

Key concepts:
- Events are sent to a Pixel ID
- User data is hashed (SHA256) before sending
- Events include fbc/fbp cookies when available
- FBCLID is used for attribution when present
"""

import hashlib
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import uuid4

import httpx


@dataclass
class MetaCAPIEvent:
    """A single event to send to Meta CAPI."""
    event_name: str  # Lead, Purchase, CompleteRegistration, etc.
    event_time: int  # Unix timestamp
    event_id: str  # Unique ID for deduplication

    # User data (will be hashed)
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    # Attribution
    fbc: Optional[str] = None  # _fbc cookie (contains FBCLID)
    fbp: Optional[str] = None  # _fbp cookie

    # Client info
    client_ip_address: Optional[str] = None
    client_user_agent: Optional[str] = None

    # Event data
    value: Optional[float] = None
    currency: str = "USD"
    order_id: Optional[str] = None

    # Custom data
    custom_data: Dict[str, Any] = field(default_factory=dict)

    # Source URL
    event_source_url: Optional[str] = None

    # Action source
    action_source: str = "website"  # website, app, phone_call, chat, email, other


@dataclass
class MetaCAPIResult:
    """Result from Meta CAPI sync."""
    success: bool
    events_received: int = 0
    fbtrace_id: Optional[str] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None


class MetaCAPISync:
    """
    Service for syncing conversions to Meta Conversions API.

    Usage:
        sync = MetaCAPISync(pixel_id="123456", access_token="xxx")
        event = MetaCAPIEvent(
            event_name="Lead",
            event_time=int(time.time()),
            event_id=str(uuid4()),
            email="user@example.com",
            fbc="_fbc.1.123456.xxx",
        )
        result = await sync.send_event(event)
    """

    API_VERSION = "v21.0"
    BASE_URL = "https://graph.facebook.com"

    def __init__(
        self,
        pixel_id: str,
        access_token: str,
        test_event_code: Optional[str] = None,
    ):
        """
        Initialize Meta CAPI sync.

        Args:
            pixel_id: Meta Pixel ID
            access_token: Meta access token with ads_management permission
            test_event_code: Optional test event code for Events Manager testing
        """
        self.pixel_id = pixel_id
        self.access_token = access_token
        self.test_event_code = test_event_code

    @staticmethod
    def hash_value(value: Optional[str]) -> Optional[str]:
        """Hash a value using SHA256 as required by Meta CAPI."""
        if not value:
            return None
        # Normalize: lowercase, strip whitespace
        normalized = value.lower().strip()
        return hashlib.sha256(normalized.encode()).hexdigest()

    @staticmethod
    def normalize_phone(phone: Optional[str]) -> Optional[str]:
        """Normalize phone number (remove non-digits except +)."""
        if not phone:
            return None
        import re
        # Keep only digits and +
        cleaned = re.sub(r'[^\d+]', '', phone)
        # Remove leading + if present for hashing
        if cleaned.startswith('+'):
            cleaned = cleaned[1:]
        return cleaned if cleaned else None

    def _build_user_data(self, event: MetaCAPIEvent) -> Dict[str, Any]:
        """Build user_data object with hashed PII."""
        user_data = {}

        # Hash email
        if event.email:
            user_data["em"] = [self.hash_value(event.email)]

        # Hash phone (normalized)
        if event.phone:
            normalized_phone = self.normalize_phone(event.phone)
            if normalized_phone:
                user_data["ph"] = [self.hash_value(normalized_phone)]

        # Hash names
        if event.first_name:
            user_data["fn"] = [self.hash_value(event.first_name)]

        if event.last_name:
            user_data["ln"] = [self.hash_value(event.last_name)]

        # Facebook cookies (not hashed)
        if event.fbc:
            user_data["fbc"] = event.fbc

        if event.fbp:
            user_data["fbp"] = event.fbp

        # Client info (not hashed)
        if event.client_ip_address:
            user_data["client_ip_address"] = event.client_ip_address

        if event.client_user_agent:
            user_data["client_user_agent"] = event.client_user_agent

        return user_data

    def _build_custom_data(self, event: MetaCAPIEvent) -> Dict[str, Any]:
        """Build custom_data object."""
        custom_data = {}

        if event.value is not None:
            custom_data["value"] = event.value

        if event.currency:
            custom_data["currency"] = event.currency

        if event.order_id:
            custom_data["order_id"] = event.order_id

        # Merge additional custom data
        if event.custom_data:
            custom_data.update(event.custom_data)

        return custom_data

    def _build_event_payload(self, event: MetaCAPIEvent) -> Dict[str, Any]:
        """Build a single event payload."""
        payload = {
            "event_name": event.event_name,
            "event_time": event.event_time,
            "event_id": event.event_id,
            "action_source": event.action_source,
            "user_data": self._build_user_data(event),
        }

        # Add custom data if present
        custom_data = self._build_custom_data(event)
        if custom_data:
            payload["custom_data"] = custom_data

        # Add source URL if present
        if event.event_source_url:
            payload["event_source_url"] = event.event_source_url

        return payload

    async def send_event(self, event: MetaCAPIEvent) -> MetaCAPIResult:
        """Send a single event to Meta CAPI."""
        return await self.send_events([event])

    async def send_events(self, events: List[MetaCAPIEvent]) -> MetaCAPIResult:
        """
        Send multiple events to Meta CAPI.

        Meta recommends batching up to 1000 events per request.
        """
        if not events:
            return MetaCAPIResult(success=True, events_received=0)

        # Build payload
        payload = {
            "data": [self._build_event_payload(e) for e in events],
            "access_token": self.access_token,
        }

        # Add test event code if in test mode
        if self.test_event_code:
            payload["test_event_code"] = self.test_event_code

        # Send to Meta
        url = f"{self.BASE_URL}/{self.API_VERSION}/{self.pixel_id}/events"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)

                if response.status_code == 200:
                    data = response.json()
                    return MetaCAPIResult(
                        success=True,
                        events_received=data.get("events_received", len(events)),
                        fbtrace_id=data.get("fbtrace_id"),
                    )
                else:
                    # Parse error response
                    try:
                        error_data = response.json()
                        error = error_data.get("error", {})
                        return MetaCAPIResult(
                            success=False,
                            error_message=error.get("message", response.text),
                            error_code=str(error.get("code", response.status_code)),
                            fbtrace_id=error.get("fbtrace_id"),
                        )
                    except Exception:
                        return MetaCAPIResult(
                            success=False,
                            error_message=response.text,
                            error_code=str(response.status_code),
                        )

        except httpx.TimeoutException:
            return MetaCAPIResult(
                success=False,
                error_message="Request timed out",
                error_code="TIMEOUT",
            )
        except Exception as e:
            return MetaCAPIResult(
                success=False,
                error_message=str(e),
                error_code="UNKNOWN",
            )

    @classmethod
    def from_conversion(
        cls,
        conversion: Dict[str, Any],
        pixel_id: str,
        access_token: str,
        test_event_code: Optional[str] = None,
    ) -> tuple["MetaCAPISync", MetaCAPIEvent]:
        """
        Create a sync service and event from a conversion record.

        Args:
            conversion: Conversion record from database
            pixel_id: Meta Pixel ID
            access_token: Meta access token
            test_event_code: Optional test event code

        Returns:
            Tuple of (sync service, event)
        """
        sync = cls(
            pixel_id=pixel_id,
            access_token=access_token,
            test_event_code=test_event_code,
        )

        # Map conversion type to Meta event name
        event_name_map = {
            "lead": "Lead",
            "purchase": "Purchase",
            "signup": "CompleteRegistration",
            "add_to_cart": "AddToCart",
            "initiate_checkout": "InitiateCheckout",
            "complete_registration": "CompleteRegistration",
            "subscribe": "Subscribe",
            "start_trial": "StartTrial",
            "contact": "Contact",
            "schedule": "Schedule",
            "view_content": "ViewContent",
            "search": "Search",
            "add_payment_info": "AddPaymentInfo",
            "add_to_wishlist": "AddToWishlist",
        }

        event_name = event_name_map.get(
            conversion.get("conversion_type", "lead"),
            "Lead"
        )

        # Parse occurred_at to Unix timestamp
        occurred_at = conversion.get("occurred_at")
        if isinstance(occurred_at, str):
            try:
                dt = datetime.fromisoformat(occurred_at.replace('Z', '+00:00'))
                event_time = int(dt.timestamp())
            except Exception:
                event_time = int(time.time())
        elif isinstance(occurred_at, datetime):
            event_time = int(occurred_at.timestamp())
        else:
            event_time = int(time.time())

        event = MetaCAPIEvent(
            event_name=event_name,
            event_time=event_time,
            event_id=conversion.get("id", str(uuid4())),
            email=conversion.get("email"),
            phone=conversion.get("phone"),
            first_name=conversion.get("first_name"),
            last_name=conversion.get("last_name"),
            fbc=conversion.get("fbc"),
            fbp=conversion.get("fbp"),
            client_ip_address=conversion.get("ip_address"),
            client_user_agent=conversion.get("user_agent"),
            value=conversion.get("value_micros", 0) / 1_000_000 if conversion.get("value_micros") else None,
            currency=conversion.get("currency", "USD"),
            order_id=conversion.get("order_id"),
            action_source="website",
        )

        return sync, event


# Standard Meta event names for reference
META_STANDARD_EVENTS = [
    "AddPaymentInfo",
    "AddToCart",
    "AddToWishlist",
    "CompleteRegistration",
    "Contact",
    "CustomizeProduct",
    "Donate",
    "FindLocation",
    "InitiateCheckout",
    "Lead",
    "Purchase",
    "Schedule",
    "Search",
    "StartTrial",
    "SubmitApplication",
    "Subscribe",
    "ViewContent",
]
