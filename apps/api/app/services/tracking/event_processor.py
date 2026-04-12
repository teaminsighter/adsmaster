"""Event processor for tracking events and visitor identification."""

from datetime import datetime, timezone
from typing import Optional, Any
from uuid import uuid4

from ..supabase_client import get_supabase_client as get_supabase
from .device_parser import parse_user_agent
from .geo_lookup import lookup_ip, get_client_ip


async def process_tracking_event(
    org_id: str,
    visitor_id: str,
    event_type: str,
    event_data: dict,
    request_headers: dict,
    direct_ip: str,
) -> dict:
    """Process an incoming tracking event.

    Creates or updates visitor record and stores the event.

    Args:
        org_id: Organization ID
        visitor_id: Client-generated visitor ID
        event_type: Type of event (pageview, click, form_submit, custom)
        event_data: Event payload
        request_headers: HTTP headers from request
        direct_ip: Direct IP from request

    Returns:
        Dict with processing result
    """
    supabase = get_supabase()

    # Extract real IP
    ip = get_client_ip(dict(request_headers), direct_ip)

    # Parse user agent
    user_agent = request_headers.get("user-agent", "")
    device_info = parse_user_agent(user_agent)

    # Skip bots
    if device_info.is_bot:
        return {"status": "skipped", "reason": "bot"}

    # Lookup geo info
    geo_info = await lookup_ip(ip)

    # Extract click IDs and UTM from event data
    click_ids = {
        "gclid": event_data.get("gclid"),
        "fbclid": event_data.get("fbclid"),
        "gbraid": event_data.get("gbraid"),
        "wbraid": event_data.get("wbraid"),
        "msclkid": event_data.get("msclkid"),
        "ttclkid": event_data.get("ttclkid"),
        "li_fat_id": event_data.get("li_fat_id"),
    }

    fb_cookies = {
        "fbp": event_data.get("fbp") or event_data.get("_fbp"),
        "fbc": event_data.get("fbc") or event_data.get("_fbc"),
    }

    utm_params = {
        "utm_source": event_data.get("utm_source"),
        "utm_medium": event_data.get("utm_medium"),
        "utm_campaign": event_data.get("utm_campaign"),
        "utm_content": event_data.get("utm_content"),
        "utm_term": event_data.get("utm_term"),
    }

    # Check if visitor exists
    existing = supabase.table("visitors").select("id, page_views").eq(
        "organization_id", org_id
    ).eq("visitor_id", visitor_id).maybe_single().execute()

    now = datetime.now(timezone.utc).isoformat()

    if existing.data:
        # Update existing visitor
        visitor_db_id = existing.data["id"]

        # Only update fields that aren't already set (don't overwrite attribution)
        update_data = {
            "last_seen_at": now,
            "updated_at": now,
            "ip_address": ip,
            "user_agent": user_agent,
            "device_type": device_info.device_type,
            "browser": device_info.browser,
            "browser_version": device_info.browser_version,
            "os": device_info.os,
            "os_version": device_info.os_version,
        }

        # Add geo info
        if geo_info.country_code:
            update_data["country_code"] = geo_info.country_code
            update_data["country_name"] = geo_info.country_name
            update_data["region"] = geo_info.region
            update_data["city"] = geo_info.city
            update_data["timezone"] = geo_info.timezone

        supabase.table("visitors").update(update_data).eq(
            "id", visitor_db_id
        ).execute()
    else:
        # Create new visitor
        visitor_record = {
            "id": str(uuid4()),
            "organization_id": org_id,
            "visitor_id": visitor_id,
            "ip_address": ip,
            "user_agent": user_agent,
            "device_type": device_info.device_type,
            "browser": device_info.browser,
            "browser_version": device_info.browser_version,
            "os": device_info.os,
            "os_version": device_info.os_version,
            "landing_page": event_data.get("url"),
            "referrer": event_data.get("referrer"),
            "screen_width": event_data.get("screen_width"),
            "screen_height": event_data.get("screen_height"),
            "first_seen_at": now,
            "last_seen_at": now,
            "page_views": 1 if event_type == "pageview" else 0,
            "events_count": 1,
        }

        # Add click IDs (only non-null)
        for key, value in click_ids.items():
            if value:
                visitor_record[key] = value

        # Add FB cookies
        for key, value in fb_cookies.items():
            if value:
                visitor_record[key] = value

        # Add UTM params (only non-null)
        for key, value in utm_params.items():
            if value:
                visitor_record[key] = value

        # Add geo info
        if geo_info.country_code:
            visitor_record["country_code"] = geo_info.country_code
            visitor_record["country_name"] = geo_info.country_name
            visitor_record["region"] = geo_info.region
            visitor_record["city"] = geo_info.city
            visitor_record["timezone"] = geo_info.timezone

        result = supabase.table("visitors").insert(visitor_record).execute()
        visitor_db_id = result.data[0]["id"]

    # Store the event
    event_record = {
        "id": str(uuid4()),
        "organization_id": org_id,
        "visitor_id": visitor_db_id,
        "session_id": event_data.get("session_id"),
        "event_type": event_type,
        "event_name": event_data.get("event_name"),
        "page_url": event_data.get("url"),
        "page_path": event_data.get("path"),
        "page_title": event_data.get("title"),
        "referrer": event_data.get("referrer"),
        "event_data": {
            k: v for k, v in event_data.items()
            if k not in ["gclid", "fbclid", "gbraid", "wbraid", "msclkid",
                        "ttclkid", "li_fat_id", "fbp", "fbc", "_fbp", "_fbc",
                        "utm_source", "utm_medium", "utm_campaign",
                        "utm_content", "utm_term", "url", "path", "title",
                        "referrer", "session_id", "event_name", "screen_width",
                        "screen_height"]
        },
        "occurred_at": now,
    }

    supabase.table("visitor_events").insert(event_record).execute()

    return {
        "status": "success",
        "visitor_id": visitor_db_id,
        "event_id": event_record["id"],
    }


async def process_identify(
    org_id: str,
    visitor_id: str,
    identify_data: dict,
    request_headers: dict,
    direct_ip: str,
) -> dict:
    """Process visitor identification (associate with email/phone/name).

    Args:
        org_id: Organization ID
        visitor_id: Client-generated visitor ID
        identify_data: Identification payload (email, phone, name, etc.)
        request_headers: HTTP headers from request
        direct_ip: Direct IP from request

    Returns:
        Dict with processing result
    """
    supabase = get_supabase()

    # Find existing visitor
    existing = supabase.table("visitors").select("id").eq(
        "organization_id", org_id
    ).eq("visitor_id", visitor_id).maybe_single().execute()

    now = datetime.now(timezone.utc).isoformat()

    if not existing.data:
        # Create visitor first with basic info
        ip = get_client_ip(dict(request_headers), direct_ip)
        user_agent = request_headers.get("user-agent", "")
        device_info = parse_user_agent(user_agent)

        visitor_record = {
            "id": str(uuid4()),
            "organization_id": org_id,
            "visitor_id": visitor_id,
            "ip_address": ip,
            "user_agent": user_agent,
            "device_type": device_info.device_type,
            "browser": device_info.browser,
            "browser_version": device_info.browser_version,
            "os": device_info.os,
            "os_version": device_info.os_version,
            "first_seen_at": now,
            "last_seen_at": now,
        }

        result = supabase.table("visitors").insert(visitor_record).execute()
        visitor_db_id = result.data[0]["id"]
    else:
        visitor_db_id = existing.data["id"]

    # Update with identification data
    update_data = {
        "updated_at": now,
        "identified_at": now,
    }

    if identify_data.get("email"):
        update_data["email"] = identify_data["email"].lower().strip()

    if identify_data.get("phone"):
        update_data["phone"] = identify_data["phone"].strip()

    if identify_data.get("first_name"):
        update_data["first_name"] = identify_data["first_name"].strip()

    if identify_data.get("last_name"):
        update_data["last_name"] = identify_data["last_name"].strip()

    # Store any additional custom data
    custom_fields = {
        k: v for k, v in identify_data.items()
        if k not in ["email", "phone", "first_name", "last_name", "firstName", "lastName"]
    }
    if custom_fields:
        update_data["custom_data"] = custom_fields

    supabase.table("visitors").update(update_data).eq(
        "id", visitor_db_id
    ).execute()

    return {
        "status": "success",
        "visitor_id": visitor_db_id,
        "identified": True,
    }


async def create_conversion_from_visitor(
    org_id: str,
    visitor_db_id: str,
    conversion_type: str,
    value_micros: int = 0,
    currency: str = "USD",
    conversion_name: Optional[str] = None,
    order_id: Optional[str] = None,
    custom_data: Optional[dict] = None,
    occurred_at: Optional[str] = None,
) -> dict:
    """Create an offline conversion linked to a visitor.

    Copies attribution data (click IDs, UTM) from visitor to conversion.
    """
    supabase = get_supabase()

    # Get visitor data for attribution
    visitor = supabase.table("visitors").select("*").eq(
        "id", visitor_db_id
    ).single().execute()

    if not visitor.data:
        return {"status": "error", "message": "Visitor not found"}

    v = visitor.data
    now = datetime.now(timezone.utc).isoformat()

    conversion_record = {
        "id": str(uuid4()),
        "organization_id": org_id,
        "visitor_id": visitor_db_id,

        # Contact from visitor
        "email": v.get("email"),
        "phone": v.get("phone"),
        "first_name": v.get("first_name"),
        "last_name": v.get("last_name"),

        # Conversion details
        "conversion_type": conversion_type,
        "conversion_name": conversion_name,
        "value_micros": value_micros,
        "currency": currency,
        "order_id": order_id,

        # Attribution from visitor
        "gclid": v.get("gclid"),
        "fbclid": v.get("fbclid"),
        "gbraid": v.get("gbraid"),
        "wbraid": v.get("wbraid"),
        "msclkid": v.get("msclkid"),
        "ttclkid": v.get("ttclkid"),
        "fbp": v.get("fbp"),
        "fbc": v.get("fbc"),
        "utm_source": v.get("utm_source"),
        "utm_medium": v.get("utm_medium"),
        "utm_campaign": v.get("utm_campaign"),
        "utm_content": v.get("utm_content"),
        "utm_term": v.get("utm_term"),

        # Source
        "source": "website",
        "ip_address": v.get("ip_address"),
        "user_agent": v.get("user_agent"),

        # Custom data
        "custom_data": custom_data or {},

        # Timestamps
        "occurred_at": occurred_at or now,
        "created_at": now,
    }

    result = supabase.table("offline_conversions").insert(
        conversion_record
    ).execute()

    return {
        "status": "success",
        "conversion_id": result.data[0]["id"],
    }
