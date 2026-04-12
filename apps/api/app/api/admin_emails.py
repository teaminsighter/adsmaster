"""
Admin Email Management API
Routes for managing email templates, sending test emails, viewing logs, and statistics
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

from app.services.supabase_client import get_supabase_client
from app.services.email_service import (
    list_templates,
    get_template_by_id,
    create_template,
    update_template,
    delete_template,
    send_email,
    send_template_email,
    send_bulk_emails,
    get_email_logs,
    get_email_stats,
)
from app.api.admin import get_current_admin

router = APIRouter(prefix="/admin/emails", tags=["Admin - Email"])


# ============================================================================
# Request/Response Models
# ============================================================================

class TemplateCreate(BaseModel):
    name: str
    slug: str
    subject: str
    html_content: str
    text_content: Optional[str] = None
    variables: Optional[List[str]] = None
    category: str = "transactional"


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    subject: Optional[str] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    variables: Optional[List[str]] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class SendTestEmailRequest(BaseModel):
    template_id: str
    to_email: EmailStr
    variables: Optional[dict] = None


class SendEmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    html_content: str
    text_content: Optional[str] = None


class SendBulkEmailRequest(BaseModel):
    template_slug: str
    recipients: List[dict]  # Each has: email, variables (optional), user_id (optional)


# ============================================================================
# Templates CRUD
# ============================================================================

@router.get("/templates")
async def get_templates(
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=100),
    admin: dict = Depends(get_current_admin)
):
    """List all email templates"""
    offset = (page - 1) * limit

    templates = list_templates(
        category=category,
        is_active=is_active,
        limit=limit,
        offset=offset
    )

    # Get total count
    supabase = get_supabase_client()
    query = supabase.table("email_templates").select("id", count="exact")
    if category:
        query = query.eq("category", category)
    if is_active is not None:
        query = query.eq("is_active", is_active)
    result = query.execute()

    return {
        "templates": templates,
        "total": result.count or len(templates),
        "page": page,
        "limit": limit
    }


@router.get("/templates/{template_id}")
async def get_template(
    template_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Get single email template by ID"""
    template = get_template_by_id(template_id)

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return {"template": template}


@router.post("/templates")
async def create_email_template(
    data: TemplateCreate,
    admin: dict = Depends(get_current_admin)
):
    """Create new email template"""
    # Check for duplicate slug
    supabase = get_supabase_client()
    existing = supabase.table("email_templates").select("id").eq("slug", data.slug).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Template with this slug already exists")

    template = create_template(
        name=data.name,
        slug=data.slug,
        subject=data.subject,
        html_content=data.html_content,
        text_content=data.text_content,
        variables=data.variables,
        category=data.category,
    )

    if not template:
        raise HTTPException(status_code=500, detail="Failed to create template")

    # Audit log
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "email_template.create",
        "resource_type": "email_template",
        "resource_id": template["id"],
        "new_value": {"name": data.name, "slug": data.slug}
    }).execute()

    return {"success": True, "template": template}


@router.put("/templates/{template_id}")
async def update_email_template(
    template_id: str,
    data: TemplateUpdate,
    admin: dict = Depends(get_current_admin)
):
    """Update email template"""
    # Check template exists
    existing = get_template_by_id(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check for duplicate slug if changing
    if data.slug and data.slug != existing.get("slug"):
        supabase = get_supabase_client()
        dup = supabase.table("email_templates").select("id").eq("slug", data.slug).execute()
        if dup.data:
            raise HTTPException(status_code=400, detail="Template with this slug already exists")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    template = update_template(template_id, updates)

    if not template:
        raise HTTPException(status_code=500, detail="Failed to update template")

    # Audit log
    supabase = get_supabase_client()
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "email_template.update",
        "resource_type": "email_template",
        "resource_id": template_id,
        "old_value": {"name": existing.get("name")},
        "new_value": updates
    }).execute()

    return {"success": True, "template": template}


@router.delete("/templates/{template_id}")
async def delete_email_template(
    template_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Delete email template"""
    existing = get_template_by_id(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")

    success = delete_template(template_id)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete template")

    # Audit log
    supabase = get_supabase_client()
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "email_template.delete",
        "resource_type": "email_template",
        "resource_id": template_id,
        "old_value": {"name": existing.get("name"), "slug": existing.get("slug")}
    }).execute()

    return {"success": True, "message": "Template deleted"}


@router.post("/templates/{template_id}/duplicate")
async def duplicate_template(
    template_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Duplicate an existing email template"""
    existing = get_template_by_id(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")

    # Create new slug
    base_slug = existing.get("slug", "template")
    new_slug = f"{base_slug}-copy"

    # Check for collision and add number if needed
    supabase = get_supabase_client()
    counter = 1
    while True:
        check = supabase.table("email_templates").select("id").eq("slug", new_slug).execute()
        if not check.data:
            break
        counter += 1
        new_slug = f"{base_slug}-copy-{counter}"

    template = create_template(
        name=f"{existing.get('name')} (Copy)",
        slug=new_slug,
        subject=existing.get("subject", ""),
        html_content=existing.get("html_content", ""),
        text_content=existing.get("text_content"),
        variables=existing.get("variables"),
        category=existing.get("category", "transactional"),
    )

    return {"success": True, "template": template}


# ============================================================================
# Email Sending
# ============================================================================

@router.post("/send-test")
async def send_test_email(
    data: SendTestEmailRequest,
    admin: dict = Depends(get_current_admin)
):
    """Send test email using a template"""
    template = get_template_by_id(data.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Merge default test variables
    variables = {
        "user_name": "Test User",
        "app_name": "AdsMaster",
        "login_url": "https://app.adsmaster.io/login",
        "reset_url": "https://app.adsmaster.io/reset-password?token=test",
        "upgrade_url": "https://app.adsmaster.io/settings/billing",
        "billing_url": "https://app.adsmaster.io/settings/billing",
        "days_remaining": "3",
        "amount": "$99.00",
        "invoice_number": "INV-TEST-001",
        "invoice_url": "https://app.adsmaster.io/invoices/test",
        **(data.variables or {})
    }

    result = send_template_email(
        to=data.to_email,
        template_slug=template.get("slug"),
        variables=variables,
    )

    # Audit log
    supabase = get_supabase_client()
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "email.send_test",
        "resource_type": "email_template",
        "resource_id": data.template_id,
        "new_value": {"to_email": data.to_email, "template": template.get("slug")}
    }).execute()

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send test email"))

    return {
        "success": True,
        "message": f"Test email sent to {data.to_email}",
        "message_id": result.get("message_id")
    }


@router.post("/send")
async def send_custom_email(
    data: SendEmailRequest,
    admin: dict = Depends(get_current_admin)
):
    """Send custom email (no template)"""
    result = send_email(
        to=data.to_email,
        subject=data.subject,
        html_content=data.html_content,
        text_content=data.text_content,
    )

    # Audit log
    supabase = get_supabase_client()
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "email.send_custom",
        "resource_type": "email",
        "new_value": {"to_email": data.to_email, "subject": data.subject}
    }).execute()

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send email"))

    return {
        "success": True,
        "message": f"Email sent to {data.to_email}",
        "message_id": result.get("message_id")
    }


@router.post("/send-bulk")
async def send_bulk_email(
    data: SendBulkEmailRequest,
    admin: dict = Depends(get_current_admin)
):
    """Send bulk emails using a template"""
    if not data.recipients:
        raise HTTPException(status_code=400, detail="No recipients provided")

    if len(data.recipients) > 1000:
        raise HTTPException(status_code=400, detail="Maximum 1000 recipients per request")

    result = send_bulk_emails(
        recipients=data.recipients,
        template_slug=data.template_slug,
    )

    # Audit log
    supabase = get_supabase_client()
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "email.send_bulk",
        "resource_type": "email",
        "new_value": {
            "template": data.template_slug,
            "recipient_count": len(data.recipients),
            "sent": result.get("sent"),
            "failed": result.get("failed")
        }
    }).execute()

    return result


# ============================================================================
# Email Logs
# ============================================================================

@router.get("/logs")
async def get_logs(
    status: Optional[str] = None,
    template_id: Optional[str] = None,
    recipient: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get email send logs"""
    offset = (page - 1) * limit

    logs = get_email_logs(
        limit=limit,
        offset=offset,
        status=status,
        template_id=template_id,
        recipient_email=recipient,
    )

    # Get total count
    supabase = get_supabase_client()
    query = supabase.table("email_logs").select("id", count="exact")
    if status:
        query = query.eq("status", status)
    if template_id:
        query = query.eq("template_id", template_id)
    if recipient:
        query = query.ilike("recipient_email", f"%{recipient}%")
    result = query.execute()

    return {
        "logs": logs,
        "total": result.count or len(logs),
        "page": page,
        "limit": limit
    }


@router.get("/logs/{log_id}")
async def get_log_detail(
    log_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Get single email log detail"""
    supabase = get_supabase_client()

    result = supabase.table("email_logs").select("*").eq("id", log_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Log not found")

    return {"log": result.data[0]}


# ============================================================================
# Statistics
# ============================================================================

@router.get("/stats")
async def get_stats(
    hours: int = Query(default=24, ge=1, le=720),
    admin: dict = Depends(get_current_admin)
):
    """Get email sending statistics"""
    stats = get_email_stats(hours=hours)

    return {
        "stats": stats,
        "period_hours": hours
    }


@router.get("/stats/by-template")
async def get_stats_by_template(
    admin: dict = Depends(get_current_admin)
):
    """Get email statistics grouped by template"""
    supabase = get_supabase_client()

    result = supabase.table("email_logs").select(
        "template_id, status"
    ).execute()

    # Group by template
    by_template = {}
    for log in (result.data or []):
        tid = log.get("template_id") or "no-template"
        if tid not in by_template:
            by_template[tid] = {"total": 0, "sent": 0, "delivered": 0, "failed": 0, "bounced": 0}
        by_template[tid]["total"] += 1
        status = log.get("status", "unknown")
        if status in by_template[tid]:
            by_template[tid][status] += 1

    # Get template names
    template_ids = [t for t in by_template.keys() if t != "no-template"]
    if template_ids:
        templates = supabase.table("email_templates").select("id, name, slug").in_("id", template_ids).execute()
        template_map = {t["id"]: t for t in (templates.data or [])}
    else:
        template_map = {}

    # Combine with names
    result_data = []
    for tid, stats in by_template.items():
        template_info = template_map.get(tid, {"name": "Custom Email", "slug": None})
        result_data.append({
            "template_id": tid if tid != "no-template" else None,
            "template_name": template_info.get("name"),
            "template_slug": template_info.get("slug"),
            **stats
        })

    return {"stats": sorted(result_data, key=lambda x: x["total"], reverse=True)}


# ============================================================================
# Automation Rules
# ============================================================================

@router.get("/automation-rules")
async def get_automation_rules(
    admin: dict = Depends(get_current_admin)
):
    """Get email automation rules"""
    supabase = get_supabase_client()

    result = supabase.table("email_automation_rules").select(
        "*, email_templates!template_id(name, slug)"
    ).order("trigger_event").execute()

    return {"rules": result.data or []}


@router.patch("/automation-rules/{rule_id}")
async def update_automation_rule(
    rule_id: str,
    is_enabled: bool,
    admin: dict = Depends(get_current_admin)
):
    """Enable/disable email automation rule"""
    supabase = get_supabase_client()

    result = supabase.table("email_automation_rules").update({
        "is_enabled": is_enabled,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", rule_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Automation rule not found")

    # Audit log
    supabase.table("audit_logs").insert({
        "admin_user_id": admin["id"],
        "action": "email_automation.toggle",
        "resource_type": "email_automation_rule",
        "resource_id": rule_id,
        "new_value": {"is_enabled": is_enabled}
    }).execute()

    return {"success": True, "rule": result.data[0]}


# ============================================================================
# Scheduled Emails
# ============================================================================

@router.get("/scheduled")
async def get_scheduled_emails(
    status: Optional[str] = Query(default=None, description="Filter by status: pending, sent, cancelled"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=100),
    admin: dict = Depends(get_current_admin)
):
    """Get scheduled emails"""
    supabase = get_supabase_client()
    offset = (page - 1) * limit

    query = supabase.table("scheduled_emails").select(
        "*, email_templates!template_id(name, slug)",
        count="exact"
    )

    if status:
        query = query.eq("status", status)

    query = query.order("scheduled_for").range(offset, offset + limit - 1)
    result = query.execute()

    return {
        "emails": result.data or [],
        "total": result.count or 0,
        "page": page,
        "limit": limit
    }


@router.post("/scheduled/{email_id}/cancel")
async def cancel_scheduled_email(
    email_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Cancel a scheduled email"""
    supabase = get_supabase_client()

    result = supabase.table("scheduled_emails").update({
        "status": "cancelled"
    }).eq("id", email_id).eq("status", "pending").execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Scheduled email not found or already processed")

    return {"success": True, "message": "Scheduled email cancelled"}
