"""
Stripe Service - Webhook Processing & API Integration

Handles Stripe webhook events and provides API integration for billing operations.
"""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from decimal import Decimal

import stripe

from app.core.config import get_settings
from app.services.database import get_db_client
from app.services.email_service import (
    send_payment_failed_email,
    send_invoice_email,
)


logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

settings = get_settings()

# Initialize Stripe
if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


# =============================================================================
# Webhook Event Handlers
# =============================================================================

class WebhookProcessor:
    """Process Stripe webhook events."""

    def __init__(self):
        self.db = get_db_client()

    def process_event(self, event_type: str, event_data: Dict[str, Any], webhook_log_id: str) -> Dict[str, Any]:
        """
        Process a Stripe webhook event.

        Returns dict with 'success', 'message', and optional 'data'.
        """
        handler_map = {
            # Subscription events
            "customer.subscription.created": self.handle_subscription_created,
            "customer.subscription.updated": self.handle_subscription_updated,
            "customer.subscription.deleted": self.handle_subscription_deleted,
            "customer.subscription.trial_will_end": self.handle_trial_will_end,
            "customer.subscription.paused": self.handle_subscription_paused,
            "customer.subscription.resumed": self.handle_subscription_resumed,

            # Invoice events
            "invoice.created": self.handle_invoice_created,
            "invoice.paid": self.handle_invoice_paid,
            "invoice.payment_failed": self.handle_invoice_payment_failed,
            "invoice.finalized": self.handle_invoice_finalized,
            "invoice.voided": self.handle_invoice_voided,

            # Payment events
            "charge.succeeded": self.handle_charge_succeeded,
            "charge.failed": self.handle_charge_failed,
            "charge.refunded": self.handle_charge_refunded,

            # Customer events
            "customer.created": self.handle_customer_created,
            "customer.updated": self.handle_customer_updated,
            "customer.deleted": self.handle_customer_deleted,

            # Payment method events
            "payment_method.attached": self.handle_payment_method_attached,
            "payment_method.detached": self.handle_payment_method_detached,
        }

        handler = handler_map.get(event_type)

        if not handler:
            logger.info(f"No handler for event type: {event_type}")
            return {"success": True, "message": f"Event type {event_type} not handled", "skipped": True}

        try:
            result = handler(event_data, webhook_log_id)
            return {"success": True, "message": f"Processed {event_type}", "data": result}
        except Exception as e:
            logger.error(f"Error processing {event_type}: {str(e)}")
            return {"success": False, "message": str(e)}

    # =========================================================================
    # Subscription Handlers
    # =========================================================================

    def handle_subscription_created(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle customer.subscription.created event."""
        subscription = data.get("object", {})
        stripe_sub_id = subscription.get("id")
        stripe_customer_id = subscription.get("customer")

        # Find organization by Stripe customer
        org = self._get_org_by_stripe_customer(stripe_customer_id)
        if not org:
            logger.warning(f"No organization found for customer {stripe_customer_id}")
            return {"status": "org_not_found"}

        # Get plan info
        items = subscription.get("items", {}).get("data", [])
        price_id = items[0].get("price", {}).get("id") if items else None
        plan = self._get_plan_by_stripe_price(price_id) if price_id else None
        plan_name = plan.get("name", "unknown") if plan else "unknown"

        # Calculate MRR
        amount = subscription.get("items", {}).get("data", [{}])[0].get("price", {}).get("unit_amount", 0)
        interval = subscription.get("items", {}).get("data", [{}])[0].get("price", {}).get("recurring", {}).get("interval", "month")
        mrr_cents = amount if interval == "month" else amount // 12

        # Create or update subscription
        sub_data = {
            "organization_id": org["id"],
            "plan_id": plan["id"] if plan else None,
            "plan_name": plan_name,
            "stripe_subscription_id": stripe_sub_id,
            "stripe_customer_id": stripe_customer_id,
            "billing_interval": interval + "ly",
            "status": self._map_stripe_status(subscription.get("status")),
            "current_period_start": self._timestamp_to_iso(subscription.get("current_period_start")),
            "current_period_end": self._timestamp_to_iso(subscription.get("current_period_end")),
            "trial_start": self._timestamp_to_iso(subscription.get("trial_start")),
            "trial_end": self._timestamp_to_iso(subscription.get("trial_end")),
            "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
        }

        result = self.db.table("subscriptions").insert(sub_data).execute()

        if result.data:
            # Record subscription event
            self._record_subscription_event(
                subscription_id=result.data[0]["id"],
                event_type="created",
                status_after=sub_data["status"],
                plan_after=plan_name,
                mrr_delta_cents=mrr_cents,
                webhook_log_id=webhook_log_id,
            )

        # Update webhook log with org/sub reference
        self._update_webhook_log(webhook_log_id, {
            "organization_id": org["id"],
            "subscription_id": result.data[0]["id"] if result.data else None,
        })

        return {"subscription_id": result.data[0]["id"] if result.data else None}

    def handle_subscription_updated(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle customer.subscription.updated event."""
        subscription = data.get("object", {})
        stripe_sub_id = subscription.get("id")
        previous = data.get("previous_attributes", {})

        # Find existing subscription
        sub = self._get_subscription_by_stripe_id(stripe_sub_id)
        if not sub:
            logger.warning(f"Subscription not found: {stripe_sub_id}")
            return {"status": "not_found"}

        old_status = sub.get("status")
        old_plan = sub.get("plan_name")

        # Get new plan info
        items = subscription.get("items", {}).get("data", [])
        price_id = items[0].get("price", {}).get("id") if items else None
        plan = self._get_plan_by_stripe_price(price_id) if price_id else None
        new_plan = plan.get("name") if plan else old_plan

        new_status = self._map_stripe_status(subscription.get("status"))

        # Calculate MRR change
        old_mrr = self._get_plan_mrr(old_plan)
        new_mrr = self._get_plan_mrr(new_plan)
        mrr_delta = new_mrr - old_mrr

        # Update subscription
        update_data = {
            "status": new_status,
            "plan_name": new_plan,
            "plan_id": plan["id"] if plan else sub.get("plan_id"),
            "current_period_start": self._timestamp_to_iso(subscription.get("current_period_start")),
            "current_period_end": self._timestamp_to_iso(subscription.get("current_period_end")),
            "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        if subscription.get("canceled_at"):
            update_data["cancelled_at"] = self._timestamp_to_iso(subscription.get("canceled_at"))

        self.db.table("subscriptions").update(update_data).eq("id", sub["id"]).execute()

        # Determine event type
        if old_status != new_status:
            if new_status == "active" and old_status == "trialing":
                event_type = "activated"
            elif new_status == "cancelled":
                event_type = "cancelled"
            elif new_status == "past_due":
                event_type = "payment_failed"
            else:
                event_type = "updated"
        elif old_plan != new_plan:
            event_type = "plan_changed"
        else:
            event_type = "updated"

        # Record event
        self._record_subscription_event(
            subscription_id=sub["id"],
            event_type=event_type,
            status_before=old_status,
            status_after=new_status,
            plan_before=old_plan,
            plan_after=new_plan,
            mrr_delta_cents=mrr_delta,
            webhook_log_id=webhook_log_id,
        )

        self._update_webhook_log(webhook_log_id, {
            "organization_id": sub.get("organization_id"),
            "subscription_id": sub["id"],
        })

        return {"subscription_id": sub["id"], "event_type": event_type}

    def handle_subscription_deleted(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle customer.subscription.deleted event."""
        subscription = data.get("object", {})
        stripe_sub_id = subscription.get("id")

        sub = self._get_subscription_by_stripe_id(stripe_sub_id)
        if not sub:
            return {"status": "not_found"}

        old_mrr = self._get_plan_mrr(sub.get("plan_name"))

        # Mark as cancelled
        self.db.table("subscriptions").update({
            "status": "cancelled",
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", sub["id"]).execute()

        # Record churn event
        self._record_subscription_event(
            subscription_id=sub["id"],
            event_type="cancelled",
            status_before=sub.get("status"),
            status_after="cancelled",
            plan_before=sub.get("plan_name"),
            mrr_delta_cents=-old_mrr,
            webhook_log_id=webhook_log_id,
        )

        self._update_webhook_log(webhook_log_id, {
            "organization_id": sub.get("organization_id"),
            "subscription_id": sub["id"],
        })

        return {"subscription_id": sub["id"], "churned": True}

    def handle_trial_will_end(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle customer.subscription.trial_will_end event (3 days before trial ends)."""
        subscription = data.get("object", {})
        stripe_sub_id = subscription.get("id")

        sub = self._get_subscription_by_stripe_id(stripe_sub_id)
        if not sub:
            return {"status": "not_found"}

        # Send trial ending email
        org = self._get_org_by_id(sub.get("organization_id"))
        if org:
            owner = self._get_org_owner(org["id"])
            if owner:
                days_remaining = 3  # Standard Stripe trial_will_end is 3 days before
                from app.services.email_service import send_trial_ending_email
                send_trial_ending_email(
                    to=owner.get("email"),
                    user_name=owner.get("name") or owner.get("email"),
                    days_remaining=days_remaining,
                    user_id=owner.get("id"),
                )

        return {"subscription_id": sub["id"], "notification_sent": True}

    def handle_subscription_paused(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle customer.subscription.paused event."""
        subscription = data.get("object", {})
        stripe_sub_id = subscription.get("id")

        sub = self._get_subscription_by_stripe_id(stripe_sub_id)
        if not sub:
            return {"status": "not_found"}

        self.db.table("subscriptions").update({
            "status": "paused",
            "paused_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", sub["id"]).execute()

        self._record_subscription_event(
            subscription_id=sub["id"],
            event_type="paused",
            status_before=sub.get("status"),
            status_after="paused",
            webhook_log_id=webhook_log_id,
        )

        return {"subscription_id": sub["id"], "paused": True}

    def handle_subscription_resumed(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle customer.subscription.resumed event."""
        subscription = data.get("object", {})
        stripe_sub_id = subscription.get("id")

        sub = self._get_subscription_by_stripe_id(stripe_sub_id)
        if not sub:
            return {"status": "not_found"}

        self.db.table("subscriptions").update({
            "status": "active",
            "paused_at": None,
        }).eq("id", sub["id"]).execute()

        self._record_subscription_event(
            subscription_id=sub["id"],
            event_type="resumed",
            status_before="paused",
            status_after="active",
            webhook_log_id=webhook_log_id,
        )

        return {"subscription_id": sub["id"], "resumed": True}

    # =========================================================================
    # Invoice Handlers
    # =========================================================================

    def handle_invoice_created(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle invoice.created event."""
        invoice = data.get("object", {})
        return self._upsert_invoice(invoice, webhook_log_id)

    def handle_invoice_finalized(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle invoice.finalized event."""
        invoice = data.get("object", {})
        return self._upsert_invoice(invoice, webhook_log_id)

    def handle_invoice_paid(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle invoice.paid event."""
        invoice = data.get("object", {})
        result = self._upsert_invoice(invoice, webhook_log_id, status="paid")

        # Send invoice email
        if result.get("invoice_id"):
            inv = self.db.table("invoices").select("*").eq("id", result["invoice_id"]).execute()
            if inv.data:
                inv_data = inv.data[0]
                org = self._get_org_by_id(inv_data.get("organization_id"))
                if org:
                    owner = self._get_org_owner(org["id"])
                    if owner:
                        send_invoice_email(
                            to=owner.get("email"),
                            user_name=owner.get("name") or owner.get("email"),
                            invoice_number=inv_data.get("invoice_number", "N/A"),
                            amount=f"${inv_data.get('total_cents', 0) / 100:.2f}",
                            invoice_url=invoice.get("hosted_invoice_url", ""),
                            user_id=owner.get("id"),
                        )

        # Record payment success on subscription
        stripe_sub_id = invoice.get("subscription")
        if stripe_sub_id:
            sub = self._get_subscription_by_stripe_id(stripe_sub_id)
            if sub:
                self._record_subscription_event(
                    subscription_id=sub["id"],
                    event_type="payment_succeeded",
                    webhook_log_id=webhook_log_id,
                )

        return result

    def handle_invoice_payment_failed(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle invoice.payment_failed event."""
        invoice = data.get("object", {})
        result = self._upsert_invoice(invoice, webhook_log_id)

        # Get organization and send notification
        stripe_customer_id = invoice.get("customer")
        org = self._get_org_by_stripe_customer(stripe_customer_id)

        if org:
            # Record failed payment
            self.db.table("failed_payments").insert({
                "organization_id": org["id"],
                "invoice_id": result.get("invoice_id"),
                "stripe_payment_intent_id": invoice.get("payment_intent"),
                "amount_cents": invoice.get("amount_due", 0),
                "currency": invoice.get("currency", "usd").upper(),
                "failure_code": invoice.get("last_payment_error", {}).get("code"),
                "failure_message": invoice.get("last_payment_error", {}).get("message"),
            }).execute()

            # Send payment failed email
            owner = self._get_org_owner(org["id"])
            if owner:
                send_payment_failed_email(
                    to=owner.get("email"),
                    user_name=owner.get("name") or owner.get("email"),
                    amount=f"${invoice.get('amount_due', 0) / 100:.2f}",
                    user_id=owner.get("id"),
                )

            # Record on subscription
            stripe_sub_id = invoice.get("subscription")
            if stripe_sub_id:
                sub = self._get_subscription_by_stripe_id(stripe_sub_id)
                if sub:
                    self._record_subscription_event(
                        subscription_id=sub["id"],
                        event_type="payment_failed",
                        webhook_log_id=webhook_log_id,
                    )

        return result

    def handle_invoice_voided(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle invoice.voided event."""
        invoice = data.get("object", {})
        return self._upsert_invoice(invoice, webhook_log_id, status="void")

    # =========================================================================
    # Charge Handlers
    # =========================================================================

    def handle_charge_succeeded(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle charge.succeeded event."""
        # Most logic is in invoice.paid, just log this
        charge = data.get("object", {})
        return {"charge_id": charge.get("id"), "amount": charge.get("amount")}

    def handle_charge_failed(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle charge.failed event."""
        charge = data.get("object", {})
        return {"charge_id": charge.get("id"), "failure_code": charge.get("failure_code")}

    def handle_charge_refunded(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle charge.refunded event."""
        charge = data.get("object", {})
        invoice_id = charge.get("invoice")

        if invoice_id:
            # Update invoice
            self.db.table("invoices").update({
                "status": "refunded",
                "amount_refunded_cents": charge.get("amount_refunded", 0),
                "refunded_at": datetime.now(timezone.utc).isoformat(),
            }).eq("stripe_invoice_id", invoice_id).execute()

        return {"charge_id": charge.get("id"), "refunded": True}

    # =========================================================================
    # Customer Handlers
    # =========================================================================

    def handle_customer_created(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle customer.created event."""
        customer = data.get("object", {})
        # Customer creation is typically handled during checkout, just log
        return {"customer_id": customer.get("id")}

    def handle_customer_updated(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle customer.updated event."""
        customer = data.get("object", {})
        stripe_customer_id = customer.get("id")

        # Update stripe_customers if exists
        self.db.table("stripe_customers").update({
            "email": customer.get("email"),
            "name": customer.get("name"),
            "phone": customer.get("phone"),
            "balance_cents": customer.get("balance", 0),
            "delinquent": customer.get("delinquent", False),
            "default_payment_method_id": customer.get("invoice_settings", {}).get("default_payment_method"),
        }).eq("stripe_customer_id", stripe_customer_id).execute()

        return {"customer_id": stripe_customer_id}

    def handle_customer_deleted(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle customer.deleted event."""
        customer = data.get("object", {})
        # In most cases, we keep the record but maybe mark it
        return {"customer_id": customer.get("id"), "deleted": True}

    # =========================================================================
    # Payment Method Handlers
    # =========================================================================

    def handle_payment_method_attached(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle payment_method.attached event."""
        pm = data.get("object", {})
        stripe_customer_id = pm.get("customer")

        org = self._get_org_by_stripe_customer(stripe_customer_id)
        if not org:
            return {"status": "org_not_found"}

        card = pm.get("card", {})

        self.db.table("payment_methods").insert({
            "organization_id": org["id"],
            "stripe_payment_method_id": pm.get("id"),
            "type": pm.get("type", "card"),
            "card_brand": card.get("brand"),
            "card_last4": card.get("last4"),
            "card_exp_month": card.get("exp_month"),
            "card_exp_year": card.get("exp_year"),
            "billing_details": pm.get("billing_details", {}),
        }).execute()

        return {"payment_method_id": pm.get("id")}

    def handle_payment_method_detached(self, data: Dict, webhook_log_id: str) -> Dict:
        """Handle payment_method.detached event."""
        pm = data.get("object", {})

        self.db.table("payment_methods").update({
            "is_active": False,
        }).eq("stripe_payment_method_id", pm.get("id")).execute()

        return {"payment_method_id": pm.get("id"), "detached": True}

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _get_org_by_stripe_customer(self, stripe_customer_id: str) -> Optional[Dict]:
        """Get organization by Stripe customer ID."""
        # Check stripe_customers table
        result = self.db.table("stripe_customers").select("organization_id").eq(
            "stripe_customer_id", stripe_customer_id
        ).execute()

        if result.data:
            org_id = result.data[0]["organization_id"]
            org_result = self.db.table("organizations").select("*").eq("id", org_id).execute()
            return org_result.data[0] if org_result.data else None

        # Fallback: check subscriptions table
        sub_result = self.db.table("subscriptions").select("organization_id").eq(
            "stripe_customer_id", stripe_customer_id
        ).execute()

        if sub_result.data:
            org_id = sub_result.data[0]["organization_id"]
            org_result = self.db.table("organizations").select("*").eq("id", org_id).execute()
            return org_result.data[0] if org_result.data else None

        return None

    def _get_org_by_id(self, org_id: str) -> Optional[Dict]:
        """Get organization by ID."""
        if not org_id:
            return None
        result = self.db.table("organizations").select("*").eq("id", org_id).execute()
        return result.data[0] if result.data else None

    def _get_org_owner(self, org_id: str) -> Optional[Dict]:
        """Get organization owner (first admin member)."""
        result = self.db.table("organization_members").select(
            "user_id, users(id, email, name)"
        ).eq("organization_id", org_id).eq("role", "owner").execute()

        if result.data and result.data[0].get("users"):
            return result.data[0]["users"]

        # Fallback to admin
        result = self.db.table("organization_members").select(
            "user_id, users(id, email, name)"
        ).eq("organization_id", org_id).eq("role", "admin").execute()

        if result.data and result.data[0].get("users"):
            return result.data[0]["users"]

        return None

    def _get_subscription_by_stripe_id(self, stripe_sub_id: str) -> Optional[Dict]:
        """Get subscription by Stripe subscription ID."""
        result = self.db.table("subscriptions").select("*").eq(
            "stripe_subscription_id", stripe_sub_id
        ).execute()
        return result.data[0] if result.data else None

    def _get_plan_by_stripe_price(self, price_id: str) -> Optional[Dict]:
        """Get plan by Stripe price ID."""
        result = self.db.table("subscription_plans").select("*").eq(
            "stripe_price_id_monthly", price_id
        ).execute()

        if result.data:
            return result.data[0]

        result = self.db.table("subscription_plans").select("*").eq(
            "stripe_price_id_yearly", price_id
        ).execute()

        return result.data[0] if result.data else None

    def _get_plan_mrr(self, plan_name: str) -> int:
        """Get MRR in cents for a plan."""
        if not plan_name:
            return 0
        result = self.db.table("subscription_plans").select("price_monthly").eq("name", plan_name).execute()
        if result.data:
            return int(result.data[0].get("price_monthly", 0) * 100)
        return 0

    def _map_stripe_status(self, status: str) -> str:
        """Map Stripe subscription status to our status."""
        mapping = {
            "trialing": "trialing",
            "active": "active",
            "past_due": "past_due",
            "canceled": "cancelled",
            "unpaid": "unpaid",
            "incomplete": "trialing",
            "incomplete_expired": "cancelled",
            "paused": "paused",
        }
        return mapping.get(status, status)

    def _timestamp_to_iso(self, ts: Optional[int]) -> Optional[str]:
        """Convert Unix timestamp to ISO string."""
        if not ts:
            return None
        return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()

    def _upsert_invoice(self, invoice: Dict, webhook_log_id: str, status: Optional[str] = None) -> Dict:
        """Create or update invoice from Stripe data."""
        stripe_invoice_id = invoice.get("id")
        stripe_customer_id = invoice.get("customer")

        org = self._get_org_by_stripe_customer(stripe_customer_id)
        if not org:
            return {"status": "org_not_found"}

        # Get subscription if exists
        stripe_sub_id = invoice.get("subscription")
        sub = self._get_subscription_by_stripe_id(stripe_sub_id) if stripe_sub_id else None

        invoice_data = {
            "organization_id": org["id"],
            "subscription_id": sub["id"] if sub else None,
            "stripe_invoice_id": stripe_invoice_id,
            "stripe_payment_intent_id": invoice.get("payment_intent"),
            "invoice_number": invoice.get("number"),
            "status": status or invoice.get("status", "draft"),
            "subtotal_cents": invoice.get("subtotal", 0),
            "tax_cents": invoice.get("tax", 0),
            "discount_cents": invoice.get("total_discount_amounts", [{}])[0].get("amount", 0) if invoice.get("total_discount_amounts") else 0,
            "total_cents": invoice.get("total", 0),
            "amount_paid_cents": invoice.get("amount_paid", 0),
            "amount_due_cents": invoice.get("amount_due", 0),
            "currency": invoice.get("currency", "usd").upper(),
            "invoice_date": self._timestamp_to_iso(invoice.get("created")),
            "due_date": self._timestamp_to_iso(invoice.get("due_date")),
            "invoice_pdf_url": invoice.get("invoice_pdf"),
            "hosted_invoice_url": invoice.get("hosted_invoice_url"),
        }

        if status == "paid" or invoice.get("status") == "paid":
            invoice_data["paid_at"] = datetime.now(timezone.utc).isoformat()

        # Try update first, then insert
        existing = self.db.table("invoices").select("id").eq("stripe_invoice_id", stripe_invoice_id).execute()

        if existing.data:
            invoice_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            self.db.table("invoices").update(invoice_data).eq("id", existing.data[0]["id"]).execute()
            invoice_id = existing.data[0]["id"]
        else:
            result = self.db.table("invoices").insert(invoice_data).execute()
            invoice_id = result.data[0]["id"] if result.data else None

        self._update_webhook_log(webhook_log_id, {
            "organization_id": org["id"],
            "invoice_id": invoice_id,
        })

        return {"invoice_id": invoice_id}

    def _record_subscription_event(
        self,
        subscription_id: str,
        event_type: str,
        status_before: str = None,
        status_after: str = None,
        plan_before: str = None,
        plan_after: str = None,
        mrr_delta_cents: int = 0,
        webhook_log_id: str = None,
    ) -> None:
        """Record a subscription lifecycle event."""
        # Get org_id from subscription
        sub = self.db.table("subscriptions").select("organization_id").eq("id", subscription_id).execute()
        if not sub.data:
            return

        self.db.table("subscription_events").insert({
            "subscription_id": subscription_id,
            "organization_id": sub.data[0]["organization_id"],
            "event_type": event_type,
            "status_before": status_before,
            "status_after": status_after,
            "plan_before": plan_before,
            "plan_after": plan_after,
            "mrr_delta_cents": mrr_delta_cents,
            "triggered_by": "webhook",
            "webhook_log_id": webhook_log_id,
        }).execute()

    def _update_webhook_log(self, webhook_log_id: str, updates: Dict) -> None:
        """Update webhook log with additional info."""
        if not webhook_log_id:
            return
        self.db.table("webhook_logs").update(updates).eq("id", webhook_log_id).execute()


# =============================================================================
# Webhook Signature Verification
# =============================================================================

def verify_stripe_signature(payload: bytes, signature: str, endpoint_secret: str) -> Optional[Dict]:
    """
    Verify Stripe webhook signature.

    Returns the event object if valid, None if invalid.
    """
    try:
        event = stripe.Webhook.construct_event(payload, signature, endpoint_secret)
        return event
    except ValueError:
        logger.error("Invalid payload")
        return None
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid signature")
        return None


# =============================================================================
# Singleton Instance
# =============================================================================

_webhook_processor: Optional[WebhookProcessor] = None


def get_webhook_processor() -> WebhookProcessor:
    """Get the webhook processor singleton."""
    global _webhook_processor
    if _webhook_processor is None:
        _webhook_processor = WebhookProcessor()
    return _webhook_processor
