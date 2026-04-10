"""
Webhooks API Router
Handles incoming webhooks from Stripe, Resend, and other providers
"""

import logging
from fastapi import APIRouter, Request, HTTPException, Header, Depends, Query
from typing import Optional
from datetime import datetime, timezone

from app.core.config import get_settings
from app.services.database import get_db_client
from app.services.stripe_service import (
    verify_stripe_signature,
    get_webhook_processor,
)
from app.api.admin import get_current_admin


logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(tags=["Webhooks"])


# =============================================================================
# Stripe Webhook
# =============================================================================

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
):
    """
    Handle Stripe webhook events.

    This endpoint receives all Stripe webhook events and processes them accordingly.
    The webhook secret must be configured in settings.
    """
    db = get_db_client()

    # Get raw payload
    try:
        payload = await request.body()
    except Exception as e:
        logger.error(f"Failed to read webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")

    # Verify signature if endpoint secret is configured
    event = None
    if settings.stripe_webhook_secret:
        if not stripe_signature:
            logger.warning("No Stripe signature header")
            raise HTTPException(status_code=400, detail="Missing signature")

        event = verify_stripe_signature(
            payload=payload,
            signature=stripe_signature,
            endpoint_secret=settings.stripe_webhook_secret,
        )

        if not event:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # No secret configured, parse payload directly (dev mode)
        import json
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON")

    # Extract event details
    event_id = event.get("id")
    event_type = event.get("type")
    event_data = event.get("data", {})

    logger.info(f"Received Stripe webhook: {event_type} ({event_id})")

    # Check for duplicate event
    existing = db.table("webhook_logs").select("id, status").eq("event_id", event_id).execute()
    if existing.data:
        logger.info(f"Duplicate event {event_id}, status: {existing.data[0]['status']}")
        # Return success for duplicates to prevent retries
        return {"status": "duplicate", "event_id": event_id}

    # Log the webhook
    log_result = db.table("webhook_logs").insert({
        "provider": "stripe",
        "event_type": event_type,
        "event_id": event_id,
        "payload": event,
        "status": "received",
    }).execute()

    webhook_log_id = log_result.data[0]["id"] if log_result.data else None

    # Process the event
    processor = get_webhook_processor()
    result = processor.process_event(event_type, event_data, webhook_log_id)

    # Update webhook log
    if webhook_log_id:
        update_data = {
            "status": "processed" if result.get("success") else "failed",
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }

        if not result.get("success"):
            update_data["error_message"] = result.get("message")

        if result.get("skipped"):
            update_data["status"] = "skipped"

        db.table("webhook_logs").update(update_data).eq("id", webhook_log_id).execute()

    # Always return 200 to Stripe to prevent retries
    return {
        "status": "ok",
        "event_id": event_id,
        "event_type": event_type,
        "processed": result.get("success", False),
    }


# =============================================================================
# Resend Webhook (Email delivery events)
# =============================================================================

@router.post("/webhooks/resend")
async def resend_webhook(request: Request):
    """
    Handle Resend webhook events for email delivery tracking.

    Events: email.sent, email.delivered, email.bounced, email.complained, etc.
    """
    db = get_db_client()

    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse Resend webhook: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = payload.get("type")
    event_data = payload.get("data", {})
    event_id = payload.get("id", f"resend_{datetime.now().timestamp()}")

    logger.info(f"Received Resend webhook: {event_type}")

    # Log the webhook
    db.table("webhook_logs").insert({
        "provider": "resend",
        "event_type": event_type,
        "event_id": event_id,
        "payload": payload,
        "status": "received",
    }).execute()

    # Update email log based on event
    email_id = event_data.get("email_id")
    if email_id:
        status_map = {
            "email.sent": "sent",
            "email.delivered": "delivered",
            "email.bounced": "bounced",
            "email.complained": "complained",
            "email.delivery_delayed": "delayed",
        }

        new_status = status_map.get(event_type)
        if new_status:
            db.table("email_logs").update({
                "status": new_status,
                "delivered_at": datetime.now(timezone.utc).isoformat() if new_status == "delivered" else None,
            }).eq("provider_message_id", email_id).execute()

    return {"status": "ok", "event_type": event_type}


# =============================================================================
# Admin: Webhook Logs
# =============================================================================

@router.get("/admin/webhooks/logs")
async def get_webhook_logs(
    provider: Optional[str] = None,
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=100),
    admin: dict = Depends(get_current_admin),
):
    """Get webhook logs for admin dashboard."""
    db = get_db_client()
    offset = (page - 1) * limit

    query = db.table("webhook_logs").select("*", count="exact")

    if provider:
        query = query.eq("provider", provider)
    if event_type:
        query = query.eq("event_type", event_type)
    if status:
        query = query.eq("status", status)

    query = query.order("received_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()

    return {
        "logs": result.data or [],
        "total": result.count or 0,
        "page": page,
        "limit": limit,
    }


@router.get("/admin/webhooks/logs/{log_id}")
async def get_webhook_log_detail(
    log_id: str,
    admin: dict = Depends(get_current_admin),
):
    """Get single webhook log detail including full payload."""
    db = get_db_client()

    result = db.table("webhook_logs").select("*").eq("id", log_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Webhook log not found")

    return {"log": result.data[0]}


@router.post("/admin/webhooks/logs/{log_id}/retry")
async def retry_webhook(
    log_id: str,
    admin: dict = Depends(get_current_admin),
):
    """Retry processing a failed webhook."""
    db = get_db_client()

    # Get the log
    result = db.table("webhook_logs").select("*").eq("id", log_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Webhook log not found")

    log = result.data[0]

    if log["status"] not in ["failed", "skipped"]:
        raise HTTPException(status_code=400, detail="Can only retry failed or skipped webhooks")

    if log["provider"] != "stripe":
        raise HTTPException(status_code=400, detail="Only Stripe webhooks can be retried")

    # Re-process
    processor = get_webhook_processor()
    event_data = log["payload"].get("data", {})
    process_result = processor.process_event(log["event_type"], event_data, log_id)

    # Update log
    update_data = {
        "status": "processed" if process_result.get("success") else "failed",
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "retry_count": log.get("retry_count", 0) + 1,
    }

    if not process_result.get("success"):
        update_data["error_message"] = process_result.get("message")

    db.table("webhook_logs").update(update_data).eq("id", log_id).execute()

    return {
        "success": process_result.get("success", False),
        "message": process_result.get("message"),
    }


@router.get("/admin/webhooks/stats")
async def get_webhook_stats(
    hours: int = Query(default=24, ge=1, le=168),
    admin: dict = Depends(get_current_admin),
):
    """Get webhook processing statistics."""
    db = get_db_client()

    result = db.table("webhook_logs").select("provider, event_type, status").execute()

    stats = {
        "total": 0,
        "by_provider": {},
        "by_status": {"received": 0, "processed": 0, "failed": 0, "skipped": 0},
        "by_event_type": {},
    }

    for log in (result.data or []):
        stats["total"] += 1

        provider = log.get("provider", "unknown")
        if provider not in stats["by_provider"]:
            stats["by_provider"][provider] = 0
        stats["by_provider"][provider] += 1

        status = log.get("status", "unknown")
        if status in stats["by_status"]:
            stats["by_status"][status] += 1

        event_type = log.get("event_type", "unknown")
        if event_type not in stats["by_event_type"]:
            stats["by_event_type"][event_type] = 0
        stats["by_event_type"][event_type] += 1

    # Calculate success rate
    processed = stats["by_status"]["processed"]
    total_attempted = processed + stats["by_status"]["failed"]
    stats["success_rate"] = round((processed / total_attempted * 100), 1) if total_attempted > 0 else 100

    return stats


@router.get("/admin/webhooks/event-types")
async def get_webhook_event_types(
    admin: dict = Depends(get_current_admin),
):
    """Get list of distinct webhook event types for filtering."""
    db = get_db_client()

    result = db.table("webhook_logs").select("event_type, provider").execute()

    # Get unique event types grouped by provider
    event_types = {}
    for log in (result.data or []):
        provider = log.get("provider", "unknown")
        event_type = log.get("event_type")
        if provider not in event_types:
            event_types[provider] = set()
        event_types[provider].add(event_type)

    # Convert sets to sorted lists
    return {
        provider: sorted(list(types))
        for provider, types in event_types.items()
    }


# =============================================================================
# Admin: Subscription Events
# =============================================================================

@router.get("/admin/webhooks/subscription-events")
async def get_subscription_events(
    subscription_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    event_type: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=100),
    admin: dict = Depends(get_current_admin),
):
    """Get subscription lifecycle events."""
    db = get_db_client()
    offset = (page - 1) * limit

    query = db.table("subscription_events").select("*", count="exact")

    if subscription_id:
        query = query.eq("subscription_id", subscription_id)
    if organization_id:
        query = query.eq("organization_id", organization_id)
    if event_type:
        query = query.eq("event_type", event_type)

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()

    return {
        "events": result.data or [],
        "total": result.count or 0,
        "page": page,
        "limit": limit,
    }
