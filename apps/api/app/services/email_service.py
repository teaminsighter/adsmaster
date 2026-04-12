"""
Email Service - Resend Integration

Provides transactional email sending with template support.
Uses Resend as the email provider.
"""

import re
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from uuid import UUID

import resend

from app.core.config import get_settings
from app.services.database import get_db_client


logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

settings = get_settings()

# Initialize Resend client
if settings.resend_api_key:
    resend.api_key = settings.resend_api_key


# =============================================================================
# Email Template Service
# =============================================================================

class EmailTemplateNotFoundError(Exception):
    """Raised when email template is not found."""
    pass


class EmailSendError(Exception):
    """Raised when email sending fails."""
    pass


def get_template_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Get email template by slug."""
    db = get_db_client()
    result = db.table("email_templates").select("*").eq("slug", slug).eq("is_active", True).execute()

    if result.error:
        logger.error(f"Error fetching template {slug}: {result.error}")
        return None

    if not result.data:
        return None

    return result.data[0]


def get_template_by_id(template_id: str) -> Optional[Dict[str, Any]]:
    """Get email template by ID."""
    db = get_db_client()
    result = db.table("email_templates").select("*").eq("id", template_id).execute()

    if result.error:
        logger.error(f"Error fetching template {template_id}: {result.error}")
        return None

    if not result.data:
        return None

    return result.data[0]


def list_templates(
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """List email templates with optional filters."""
    db = get_db_client()
    query = db.table("email_templates").select("*")

    if category:
        query = query.eq("category", category)

    if is_active is not None:
        query = query.eq("is_active", is_active)

    query = query.order("created_at", desc=True).limit(limit).offset(offset)
    result = query.execute()

    if result.error:
        logger.error(f"Error listing templates: {result.error}")
        return []

    return result.data


def create_template(
    name: str,
    slug: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    variables: Optional[List[str]] = None,
    category: str = "transactional"
) -> Optional[Dict[str, Any]]:
    """Create a new email template."""
    db = get_db_client()

    template_data = {
        "name": name,
        "slug": slug,
        "subject": subject,
        "html_content": html_content,
        "text_content": text_content,
        "variables": variables or [],
        "category": category,
        "is_active": True,
    }

    result = db.table("email_templates").insert(template_data).execute()

    if result.error:
        logger.error(f"Error creating template: {result.error}")
        return None

    return result.data[0] if result.data else None


def update_template(
    template_id: str,
    updates: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Update an email template."""
    db = get_db_client()

    # Add updated_at timestamp
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = db.table("email_templates").update(updates).eq("id", template_id).execute()

    if result.error:
        logger.error(f"Error updating template {template_id}: {result.error}")
        return None

    return result.data[0] if result.data else None


def delete_template(template_id: str) -> bool:
    """Delete an email template."""
    db = get_db_client()
    result = db.table("email_templates").delete().eq("id", template_id).execute()

    if result.error:
        logger.error(f"Error deleting template {template_id}: {result.error}")
        return False

    return True


# =============================================================================
# Template Rendering
# =============================================================================

def render_template(template: Dict[str, Any], variables: Dict[str, Any]) -> Dict[str, str]:
    """
    Render email template with variables.

    Variables in template use {{variable_name}} syntax.

    Returns dict with 'subject', 'html', and 'text' keys.
    """
    subject = template.get("subject", "")
    html_content = template.get("html_content", "")
    text_content = template.get("text_content", "")

    # Simple variable substitution using regex
    def replace_vars(content: str) -> str:
        if not content:
            return content

        def replacer(match):
            var_name = match.group(1).strip()
            return str(variables.get(var_name, f"{{{{ {var_name} }}}}"))

        return re.sub(r'\{\{\s*(\w+)\s*\}\}', replacer, content)

    return {
        "subject": replace_vars(subject),
        "html": replace_vars(html_content),
        "text": replace_vars(text_content) if text_content else None,
    }


# =============================================================================
# Email Sending
# =============================================================================

def send_email(
    to: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    template_id: Optional[str] = None,
    user_id: Optional[str] = None,
    from_email: Optional[str] = None,
    reply_to: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Send an email using Resend.

    Returns dict with 'success', 'message_id', and 'error' keys.
    """
    if not settings.resend_api_key:
        logger.warning("Resend API key not configured - email not sent")
        return {
            "success": False,
            "message_id": None,
            "error": "Email service not configured"
        }

    try:
        # Build email params
        params = {
            "from": from_email or settings.email_from_address,
            "to": [to] if isinstance(to, str) else to,
            "subject": subject,
            "html": html_content,
        }

        if text_content:
            params["text"] = text_content

        if reply_to:
            params["reply_to"] = reply_to

        if tags:
            params["tags"] = [{"name": tag} for tag in tags[:5]]  # Resend supports max 5 tags

        # Send via Resend
        response = resend.Emails.send(params)

        message_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", None)

        # Log the email
        log_email_send(
            template_id=template_id,
            recipient_email=to,
            recipient_user_id=user_id,
            subject=subject,
            status="sent",
            provider_message_id=message_id,
        )

        logger.info(f"Email sent successfully to {to}, message_id: {message_id}")

        return {
            "success": True,
            "message_id": message_id,
            "error": None
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to send email to {to}: {error_msg}")

        # Log the failure
        log_email_send(
            template_id=template_id,
            recipient_email=to,
            recipient_user_id=user_id,
            subject=subject,
            status="failed",
            error_message=error_msg,
        )

        return {
            "success": False,
            "message_id": None,
            "error": error_msg
        }


def send_template_email(
    to: str,
    template_slug: str,
    variables: Dict[str, Any],
    user_id: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Send an email using a template.

    Fetches template by slug, renders with variables, and sends.
    """
    # Get template
    template = get_template_by_slug(template_slug)
    if not template:
        logger.error(f"Template not found: {template_slug}")
        return {
            "success": False,
            "message_id": None,
            "error": f"Template '{template_slug}' not found"
        }

    # Render template
    rendered = render_template(template, variables)

    # Send email
    return send_email(
        to=to,
        subject=rendered["subject"],
        html_content=rendered["html"],
        text_content=rendered["text"],
        template_id=template.get("id"),
        user_id=user_id,
        reply_to=reply_to,
        tags=[template_slug, template.get("category", "transactional")],
    )


def send_bulk_emails(
    recipients: List[Dict[str, Any]],
    template_slug: str,
) -> Dict[str, Any]:
    """
    Send bulk emails using a template.

    Each recipient dict should have:
    - email: str (required)
    - variables: Dict[str, Any] (optional)
    - user_id: str (optional)

    Returns summary of results.
    """
    template = get_template_by_slug(template_slug)
    if not template:
        return {
            "success": False,
            "sent": 0,
            "failed": 0,
            "error": f"Template '{template_slug}' not found"
        }

    sent = 0
    failed = 0
    errors = []

    for recipient in recipients:
        email = recipient.get("email")
        if not email:
            failed += 1
            continue

        variables = recipient.get("variables", {})
        user_id = recipient.get("user_id")

        result = send_template_email(
            to=email,
            template_slug=template_slug,
            variables=variables,
            user_id=user_id,
        )

        if result["success"]:
            sent += 1
        else:
            failed += 1
            errors.append({"email": email, "error": result["error"]})

    return {
        "success": failed == 0,
        "sent": sent,
        "failed": failed,
        "errors": errors[:10] if errors else None,  # Limit error details
    }


# =============================================================================
# Email Logging
# =============================================================================

def log_email_send(
    recipient_email: str,
    subject: str,
    status: str,
    template_id: Optional[str] = None,
    recipient_user_id: Optional[str] = None,
    provider_message_id: Optional[str] = None,
    error_message: Optional[str] = None,
) -> None:
    """Log an email send to the database."""
    db = get_db_client()

    log_data = {
        "template_id": template_id,
        "recipient_email": recipient_email,
        "recipient_user_id": recipient_user_id,
        "subject": subject,
        "status": status,
        "provider_message_id": provider_message_id,
        "error_message": error_message,
    }

    # Remove None values
    log_data = {k: v for k, v in log_data.items() if v is not None}

    result = db.table("email_logs").insert(log_data).execute()

    if result.error:
        logger.error(f"Failed to log email send: {result.error}")


def get_email_logs(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    template_id: Optional[str] = None,
    recipient_email: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get email send logs with optional filters."""
    db = get_db_client()
    query = db.table("email_logs").select("*")

    if status:
        query = query.eq("status", status)

    if template_id:
        query = query.eq("template_id", template_id)

    if recipient_email:
        query = query.ilike("recipient_email", f"%{recipient_email}%")

    query = query.order("sent_at", desc=True).limit(limit).offset(offset)
    result = query.execute()

    if result.error:
        logger.error(f"Error fetching email logs: {result.error}")
        return []

    return result.data


def get_email_stats(hours: int = 24) -> Dict[str, Any]:
    """Get email sending statistics for the last N hours."""
    db = get_db_client()

    # Note: This is a simplified version. In production, you'd use SQL aggregations
    result = db.table("email_logs").select("status").execute()

    if result.error:
        return {"error": result.error}

    stats = {
        "total": 0,
        "sent": 0,
        "delivered": 0,
        "failed": 0,
        "bounced": 0,
    }

    for log in result.data:
        status = log.get("status", "unknown")
        stats["total"] += 1
        if status in stats:
            stats[status] += 1

    stats["delivery_rate"] = (
        round((stats["delivered"] / stats["total"]) * 100, 1)
        if stats["total"] > 0 else 0
    )

    return stats


# =============================================================================
# Pre-built Email Senders (Convenience Functions)
# =============================================================================

def send_welcome_email(
    to: str,
    user_name: str,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send welcome email to new user."""
    return send_template_email(
        to=to,
        template_slug="welcome",
        variables={
            "user_name": user_name,
            "login_url": f"{settings.web_url}/login",
        },
        user_id=user_id,
    )


def send_password_reset_email(
    to: str,
    user_name: str,
    reset_token: str,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send password reset email."""
    return send_template_email(
        to=to,
        template_slug="password-reset",
        variables={
            "user_name": user_name,
            "reset_url": f"{settings.web_url}/reset-password?token={reset_token}",
        },
        user_id=user_id,
    )


def send_payment_failed_email(
    to: str,
    user_name: str,
    amount: str,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send payment failed notification."""
    return send_template_email(
        to=to,
        template_slug="payment-failed",
        variables={
            "user_name": user_name,
            "amount": amount,
            "billing_url": f"{settings.web_url}/settings/billing",
        },
        user_id=user_id,
    )


def send_invoice_email(
    to: str,
    user_name: str,
    invoice_number: str,
    amount: str,
    invoice_url: str,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send invoice email."""
    return send_template_email(
        to=to,
        template_slug="invoice",
        variables={
            "user_name": user_name,
            "invoice_number": invoice_number,
            "amount": amount,
            "invoice_url": invoice_url,
        },
        user_id=user_id,
    )


def send_trial_ending_email(
    to: str,
    user_name: str,
    days_remaining: int,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send trial ending reminder."""
    return send_template_email(
        to=to,
        template_slug="trial-ending",
        variables={
            "user_name": user_name,
            "days_remaining": str(days_remaining),
            "upgrade_url": f"{settings.web_url}/settings/billing",
        },
        user_id=user_id,
    )
