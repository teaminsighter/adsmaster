"""Webhook ingestion endpoints for receiving data from external systems.

These endpoints are PUBLIC but authenticated via webhook secret key.
Used to receive conversions from Zapier, Make, forms, etc.
"""

from datetime import datetime, timezone
from typing import Optional, Any
from uuid import uuid4

from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel

from ..services.supabase_client import get_supabase_client as get_supabase


router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks Ingest"])


# ============================================================================
# Models
# ============================================================================

class WebhookPayload(BaseModel):
    """Generic webhook payload - accepts any fields."""
    class Config:
        extra = "allow"


class WebhookResponse(BaseModel):
    """Response from webhook processing."""
    status: str
    conversion_id: Optional[str] = None
    message: Optional[str] = None


# ============================================================================
# Helper Functions
# ============================================================================

def extract_field(data: dict, field_name: str, mapping: dict) -> Optional[str]:
    """Extract a field value using the configured mapping."""
    # Check if there's a custom mapping
    mapped_field = mapping.get(field_name, field_name)

    # Try mapped field first
    if mapped_field in data:
        return str(data[mapped_field]).strip() if data[mapped_field] else None

    # Try common variations
    variations = {
        "email": ["email", "Email", "EMAIL", "e-mail", "emailAddress", "email_address"],
        "phone": ["phone", "Phone", "PHONE", "phoneNumber", "phone_number", "tel", "telephone", "mobile"],
        "first_name": ["first_name", "firstName", "firstname", "first", "First Name", "FirstName"],
        "last_name": ["last_name", "lastName", "lastname", "last", "Last Name", "LastName"],
        "value": ["value", "Value", "amount", "Amount", "price", "total", "revenue"],
        "gclid": ["gclid", "GCLID", "google_click_id", "googleClickId"],
        "fbclid": ["fbclid", "FBCLID", "facebook_click_id", "facebookClickId"],
        "utm_source": ["utm_source", "utmSource", "source", "Source"],
        "utm_medium": ["utm_medium", "utmMedium", "medium", "Medium"],
        "utm_campaign": ["utm_campaign", "utmCampaign", "campaign", "Campaign"],
    }

    if field_name in variations:
        for var in variations[field_name]:
            if var in data and data[var]:
                return str(data[var]).strip()

    return None


def clean_phone(phone: Optional[str]) -> Optional[str]:
    """Clean phone number - keep only digits and +."""
    if not phone:
        return None
    import re
    return re.sub(r'[^\d+]', '', phone)


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/{webhook_id}/receive", response_model=WebhookResponse)
async def receive_webhook(
    webhook_id: str,
    request: Request,
    key: str = Query(..., description="Webhook secret key"),
):
    """Receive data from external webhook and create a conversion.

    This endpoint is PUBLIC but authenticated via secret key.

    Example:
    POST /api/v1/webhooks/abc123/receive?key=secret456
    {
        "email": "user@example.com",
        "phone": "+1234567890",
        "firstName": "John",
        "lastName": "Doe",
        "value": "99.99",
        "gclid": "CjwKCAj..."
    }
    """
    supabase = get_supabase()

    # Validate webhook exists and key matches
    webhook = supabase.table("webhook_endpoints").select(
        "id, organization_id, name, is_active, field_mapping, "
        "default_conversion_type, default_source_name"
    ).eq("id", webhook_id).eq("secret_key", key).maybe_single().execute()

    if not webhook.data:
        raise HTTPException(status_code=401, detail="Invalid webhook ID or key")

    if not webhook.data["is_active"]:
        raise HTTPException(status_code=403, detail="Webhook is disabled")

    webhook_data = webhook.data
    org_id = webhook_data["organization_id"]
    field_mapping = webhook_data.get("field_mapping") or {}

    # Parse request body
    try:
        body = await request.json()
    except Exception:
        body = {}

    # Also check form data
    if not body:
        try:
            form = await request.form()
            body = dict(form)
        except Exception:
            pass

    if not body:
        raise HTTPException(status_code=400, detail="No data received")

    # Extract client IP
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not ip:
        ip = request.client.host if request.client else None

    # Log the webhook event
    log_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Extract fields using mapping
    email = extract_field(body, "email", field_mapping)
    phone = clean_phone(extract_field(body, "phone", field_mapping))
    first_name = extract_field(body, "first_name", field_mapping)
    last_name = extract_field(body, "last_name", field_mapping)
    value_str = extract_field(body, "value", field_mapping)
    gclid = extract_field(body, "gclid", field_mapping)
    fbclid = extract_field(body, "fbclid", field_mapping)
    utm_source = extract_field(body, "utm_source", field_mapping)
    utm_medium = extract_field(body, "utm_medium", field_mapping)
    utm_campaign = extract_field(body, "utm_campaign", field_mapping)

    # Validate required fields
    if not email and not phone:
        # Log failed webhook
        supabase.table("webhook_events_log").insert({
            "id": log_id,
            "webhook_id": webhook_id,
            "organization_id": org_id,
            "request_body": body,
            "request_headers": dict(request.headers),
            "ip_address": ip,
            "status": "failed",
            "error_message": "Email or phone required",
            "received_at": now,
        }).execute()

        supabase.table("webhook_endpoints").update({
            "events_received": webhook_data.get("events_received", 0) + 1,
            "events_failed": webhook_data.get("events_failed", 0) + 1,
            "last_event_at": now,
            "last_error": "Email or phone required",
        }).eq("id", webhook_id).execute()

        raise HTTPException(status_code=400, detail="Email or phone is required")

    # Parse value
    value_micros = 0
    if value_str:
        try:
            value_micros = int(float(value_str) * 1_000_000)
        except (ValueError, TypeError):
            pass

    # Create conversion
    conversion_id = str(uuid4())
    conversion = {
        "id": conversion_id,
        "organization_id": org_id,
        "email": email.lower() if email else None,
        "phone": phone,
        "first_name": first_name,
        "last_name": last_name,
        "conversion_type": webhook_data.get("default_conversion_type") or "lead",
        "value_micros": value_micros,
        "currency": body.get("currency", "USD"),
        "gclid": gclid,
        "fbclid": fbclid,
        "utm_source": utm_source,
        "utm_medium": utm_medium,
        "utm_campaign": utm_campaign,
        "source": "webhook",
        "source_name": webhook_data.get("default_source_name") or webhook_data["name"],
        "external_id": body.get("external_id") or body.get("id"),
        "webhook_id": webhook_id,
        "ip_address": ip,
        "custom_data": {k: v for k, v in body.items() if k not in [
            "email", "phone", "first_name", "last_name", "firstName", "lastName",
            "value", "gclid", "fbclid", "utm_source", "utm_medium", "utm_campaign",
            "external_id", "id", "currency"
        ]},
        "occurred_at": body.get("occurred_at") or now,
        "created_at": now,
        "updated_at": now,
    }

    try:
        supabase.table("offline_conversions").insert(conversion).execute()

        # Log success
        supabase.table("webhook_events_log").insert({
            "id": log_id,
            "webhook_id": webhook_id,
            "organization_id": org_id,
            "request_body": body,
            "request_headers": dict(request.headers),
            "ip_address": ip,
            "status": "success",
            "conversion_id": conversion_id,
            "received_at": now,
        }).execute()

        # Update webhook stats
        supabase.table("webhook_endpoints").update({
            "events_received": webhook_data.get("events_received", 0) + 1,
            "events_success": webhook_data.get("events_success", 0) + 1,
            "last_event_at": now,
            "updated_at": now,
        }).eq("id", webhook_id).execute()

        return WebhookResponse(
            status="success",
            conversion_id=conversion_id,
            message="Conversion created successfully"
        )

    except Exception as e:
        # Log error
        supabase.table("webhook_events_log").insert({
            "id": log_id,
            "webhook_id": webhook_id,
            "organization_id": org_id,
            "request_body": body,
            "request_headers": dict(request.headers),
            "ip_address": ip,
            "status": "failed",
            "error_message": str(e),
            "received_at": now,
        }).execute()

        supabase.table("webhook_endpoints").update({
            "events_received": webhook_data.get("events_received", 0) + 1,
            "events_failed": webhook_data.get("events_failed", 0) + 1,
            "last_event_at": now,
            "last_error": str(e),
        }).eq("id", webhook_id).execute()

        raise HTTPException(status_code=500, detail=f"Failed to create conversion: {str(e)}")


@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    key: str = Query(..., description="Webhook secret key"),
):
    """Test a webhook endpoint without creating a conversion.

    Returns the webhook configuration and validates the key.
    """
    supabase = get_supabase()

    webhook = supabase.table("webhook_endpoints").select(
        "id, name, is_active, field_mapping, default_conversion_type"
    ).eq("id", webhook_id).eq("secret_key", key).maybe_single().execute()

    if not webhook.data:
        raise HTTPException(status_code=401, detail="Invalid webhook ID or key")

    return {
        "status": "success",
        "message": "Webhook is valid and active" if webhook.data["is_active"] else "Webhook is valid but disabled",
        "webhook": webhook.data
    }


@router.options("/{webhook_id}/receive")
async def webhook_options():
    """Handle CORS preflight for webhooks."""
    return {"status": "ok"}
