"""
Google Ads Offline Conversion Sync Service

Uploads offline conversions to Google Ads using the Offline Conversion Import.
https://developers.google.com/google-ads/api/docs/conversions/upload-clicks

Key concepts:
- Conversions are uploaded to a specific Conversion Action
- GCLID (Google Click ID) is required for attribution
- Conversions must occur within 90 days of the click
- Use enhanced conversions for email/phone matching when GCLID unavailable
"""

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import uuid4


@dataclass
class GoogleOfflineEvent:
    """A single offline conversion event for Google Ads."""
    conversion_action_id: str  # Resource name: customers/{customer_id}/conversionActions/{id}
    gclid: Optional[str] = None  # Required for click conversion

    # Conversion details
    conversion_time: Optional[str] = None  # ISO format: "2024-01-15 10:30:00-05:00"
    conversion_value: Optional[float] = None
    currency_code: str = "USD"

    # Order tracking
    order_id: Optional[str] = None
    external_attribution_data: Optional[Dict[str, Any]] = None

    # Enhanced conversions (when GCLID not available)
    # PII will be SHA256 hashed before sending
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "US"

    # Consent signals (required for EU)
    ad_user_data_consent: str = "GRANTED"  # GRANTED, DENIED, UNSPECIFIED
    ad_personalization_consent: str = "GRANTED"

    # Custom variables
    custom_variables: Dict[str, str] = field(default_factory=dict)


@dataclass
class GoogleOfflineResult:
    """Result from Google Ads offline conversion upload."""
    success: bool
    uploaded_count: int = 0
    failed_count: int = 0
    partial_failure_errors: List[Dict[str, Any]] = field(default_factory=list)
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    job_id: Optional[str] = None


class GoogleOfflineSync:
    """
    Service for syncing offline conversions to Google Ads.

    Usage:
        sync = GoogleOfflineSync(
            customer_id="1234567890",
            access_token="xxx",
            developer_token="yyy"
        )
        event = GoogleOfflineEvent(
            conversion_action_id="customers/1234567890/conversionActions/123",
            gclid="xxx",
            conversion_time="2024-01-15 10:30:00-05:00",
            conversion_value=99.99,
        )
        result = await sync.upload_conversion(event)
    """

    API_VERSION = "v18"  # Google Ads API version
    BASE_URL = "https://googleads.googleapis.com"

    def __init__(
        self,
        customer_id: str,
        access_token: str,
        developer_token: str,
        login_customer_id: Optional[str] = None,  # For MCC accounts
    ):
        """
        Initialize Google Ads offline conversion sync.

        Args:
            customer_id: Google Ads customer ID (without dashes)
            access_token: OAuth2 access token
            developer_token: Google Ads API developer token
            login_customer_id: Optional MCC customer ID for agency accounts
        """
        self.customer_id = customer_id.replace("-", "")
        self.access_token = access_token
        self.developer_token = developer_token
        self.login_customer_id = login_customer_id

    @staticmethod
    def hash_value(value: Optional[str]) -> Optional[str]:
        """Hash a value using SHA256 as required by Google Ads enhanced conversions."""
        if not value:
            return None
        # Normalize: lowercase, strip whitespace
        normalized = value.lower().strip()
        return hashlib.sha256(normalized.encode()).hexdigest()

    @staticmethod
    def normalize_phone(phone: Optional[str]) -> Optional[str]:
        """Normalize phone number to E.164 format."""
        if not phone:
            return None
        import re
        # Keep only digits and +
        cleaned = re.sub(r'[^\d+]', '', phone)
        # Ensure starts with + for E.164
        if not cleaned.startswith('+'):
            # Assume US if no country code
            if len(cleaned) == 10:
                cleaned = '+1' + cleaned
            elif len(cleaned) == 11 and cleaned.startswith('1'):
                cleaned = '+' + cleaned
        return cleaned if cleaned else None

    def _format_conversion_time(self, dt: Optional[datetime] = None, time_str: Optional[str] = None) -> str:
        """Format conversion time for Google Ads API."""
        if time_str:
            return time_str
        if dt:
            # Format: "yyyy-mm-dd hh:mm:ss+|-hh:mm"
            return dt.strftime("%Y-%m-%d %H:%M:%S%z")
        return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S+00:00")

    def _build_user_identifiers(self, event: GoogleOfflineEvent) -> List[Dict[str, Any]]:
        """Build user identifiers for enhanced conversions."""
        identifiers = []

        # Hashed email
        if event.email:
            identifiers.append({
                "userIdentifierSource": "FIRST_PARTY",
                "hashedEmail": self.hash_value(event.email)
            })

        # Hashed phone
        if event.phone:
            normalized = self.normalize_phone(event.phone)
            if normalized:
                identifiers.append({
                    "userIdentifierSource": "FIRST_PARTY",
                    "hashedPhoneNumber": self.hash_value(normalized)
                })

        # Address info (all hashed)
        if event.first_name or event.last_name or event.street_address:
            address_info = {}

            if event.first_name:
                address_info["hashedFirstName"] = self.hash_value(event.first_name)
            if event.last_name:
                address_info["hashedLastName"] = self.hash_value(event.last_name)
            if event.street_address:
                address_info["hashedStreetAddress"] = self.hash_value(event.street_address)
            if event.city:
                address_info["city"] = event.city
            if event.state:
                address_info["state"] = event.state
            if event.postal_code:
                address_info["postalCode"] = event.postal_code
            if event.country:
                address_info["countryCode"] = event.country

            if address_info:
                identifiers.append({
                    "userIdentifierSource": "FIRST_PARTY",
                    "addressInfo": address_info
                })

        return identifiers

    def _build_click_conversion(self, event: GoogleOfflineEvent) -> Dict[str, Any]:
        """Build a single click conversion payload."""
        conversion = {
            "conversionAction": event.conversion_action_id,
            "conversionDateTime": event.conversion_time or self._format_conversion_time(),
        }

        # GCLID for click attribution
        if event.gclid:
            conversion["gclid"] = event.gclid

        # Value and currency
        if event.conversion_value is not None:
            conversion["conversionValue"] = event.conversion_value
            conversion["currencyCode"] = event.currency_code

        # Order ID for deduplication
        if event.order_id:
            conversion["orderId"] = event.order_id

        # Enhanced conversions user identifiers
        user_identifiers = self._build_user_identifiers(event)
        if user_identifiers:
            conversion["userIdentifiers"] = user_identifiers

        # Consent signals
        conversion["consent"] = {
            "adUserData": event.ad_user_data_consent,
            "adPersonalization": event.ad_personalization_consent
        }

        # Custom variables
        if event.custom_variables:
            conversion["customVariables"] = [
                {
                    "conversionCustomVariable": f"customers/{self.customer_id}/conversionCustomVariables/{k}",
                    "value": v
                }
                for k, v in event.custom_variables.items()
            ]

        return conversion

    async def upload_conversion(self, event: GoogleOfflineEvent) -> GoogleOfflineResult:
        """Upload a single offline conversion."""
        return await self.upload_conversions([event])

    async def upload_conversions(self, events: List[GoogleOfflineEvent]) -> GoogleOfflineResult:
        """
        Upload multiple offline conversions to Google Ads.

        Uses the UploadClickConversions endpoint.
        https://developers.google.com/google-ads/api/rest/reference/rest/v18/customers/uploadClickConversions
        """
        if not events:
            return GoogleOfflineResult(success=True, uploaded_count=0)

        import httpx

        # Build request payload
        payload = {
            "conversions": [self._build_click_conversion(e) for e in events],
            "partialFailure": True,  # Continue even if some fail
            "validateOnly": False,
        }

        # Build headers
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "developer-token": self.developer_token,
            "Content-Type": "application/json",
        }

        # Add login-customer-id for MCC
        if self.login_customer_id:
            headers["login-customer-id"] = self.login_customer_id.replace("-", "")

        # API endpoint
        url = f"{self.BASE_URL}/{self.API_VERSION}/customers/{self.customer_id}:uploadClickConversions"

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload, headers=headers)

                if response.status_code == 200:
                    data = response.json()

                    # Check for partial failures
                    partial_failure_error = data.get("partialFailureError")
                    failed_count = 0
                    partial_errors = []

                    if partial_failure_error:
                        # Parse the partial failure details
                        message = partial_failure_error.get("message", "")
                        failed_count = message.count("errors")
                        partial_errors = [{"message": message}]

                    results = data.get("results", [])
                    uploaded_count = len([r for r in results if r])

                    return GoogleOfflineResult(
                        success=True,
                        uploaded_count=uploaded_count,
                        failed_count=failed_count,
                        partial_failure_errors=partial_errors,
                        job_id=data.get("jobId"),
                    )
                else:
                    # Parse error response
                    try:
                        error_data = response.json()
                        error = error_data.get("error", {})
                        return GoogleOfflineResult(
                            success=False,
                            error_message=error.get("message", response.text),
                            error_code=str(error.get("code", response.status_code)),
                        )
                    except Exception:
                        return GoogleOfflineResult(
                            success=False,
                            error_message=response.text,
                            error_code=str(response.status_code),
                        )

        except httpx.TimeoutException:
            return GoogleOfflineResult(
                success=False,
                error_message="Request timed out",
                error_code="TIMEOUT",
            )
        except Exception as e:
            return GoogleOfflineResult(
                success=False,
                error_message=str(e),
                error_code="UNKNOWN",
            )

    @classmethod
    def from_conversion(
        cls,
        conversion: Dict[str, Any],
        customer_id: str,
        conversion_action_id: str,
        access_token: str,
        developer_token: str,
        login_customer_id: Optional[str] = None,
    ) -> tuple["GoogleOfflineSync", GoogleOfflineEvent]:
        """
        Create a sync service and event from a conversion record.

        Args:
            conversion: Conversion record from database
            customer_id: Google Ads customer ID
            conversion_action_id: Conversion action resource name
            access_token: OAuth2 access token
            developer_token: Developer token
            login_customer_id: Optional MCC customer ID

        Returns:
            Tuple of (sync service, event)
        """
        sync = cls(
            customer_id=customer_id,
            access_token=access_token,
            developer_token=developer_token,
            login_customer_id=login_customer_id,
        )

        # Parse occurred_at to conversion time string
        occurred_at = conversion.get("occurred_at")
        if isinstance(occurred_at, str):
            try:
                dt = datetime.fromisoformat(occurred_at.replace('Z', '+00:00'))
                conversion_time = dt.strftime("%Y-%m-%d %H:%M:%S%z")
                # Insert colon in timezone offset (Google requires it)
                if conversion_time[-2:].isdigit():
                    conversion_time = conversion_time[:-2] + ":" + conversion_time[-2:]
            except Exception:
                conversion_time = None
        elif isinstance(occurred_at, datetime):
            conversion_time = occurred_at.strftime("%Y-%m-%d %H:%M:%S%z")
            if conversion_time[-2:].isdigit():
                conversion_time = conversion_time[:-2] + ":" + conversion_time[-2:]
        else:
            conversion_time = None

        event = GoogleOfflineEvent(
            conversion_action_id=conversion_action_id,
            gclid=conversion.get("gclid"),
            conversion_time=conversion_time,
            conversion_value=conversion.get("value_micros", 0) / 1_000_000 if conversion.get("value_micros") else None,
            currency_code=conversion.get("currency", "USD"),
            order_id=conversion.get("order_id"),
            email=conversion.get("email"),
            phone=conversion.get("phone"),
            first_name=conversion.get("first_name"),
            last_name=conversion.get("last_name"),
        )

        return sync, event


# Google Ads standard conversion action types
GOOGLE_CONVERSION_TYPES = [
    "PURCHASE",
    "SIGNUP",
    "LEAD",
    "PAGE_VIEW",
    "PHONE_CALL",
    "IMPORT",  # For offline conversions
]
