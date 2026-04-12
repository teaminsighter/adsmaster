"""Offline Conversions API endpoints for managing and syncing conversions."""

from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import uuid4
import hashlib

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, Field

from .user_auth import get_current_user
from ..services.supabase_client import get_supabase_client as get_supabase


router = APIRouter(prefix="/api/v1/conversions/offline", tags=["Offline Conversions"])


# ============================================================================
# Models
# ============================================================================

class ConversionCreate(BaseModel):
    """Request to create an offline conversion."""
    # Contact info (at least one required)
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")

    # Conversion details
    conversion_type: str = Field(default="lead", description="Type: lead, purchase, signup, etc.")
    conversion_name: Optional[str] = None
    value: Optional[float] = Field(None, description="Value in dollars")
    currency: str = Field(default="USD")
    quantity: int = Field(default=1)
    order_id: Optional[str] = None

    # Attribution (optional - for matching)
    gclid: Optional[str] = None
    fbclid: Optional[str] = None
    gbraid: Optional[str] = None
    wbraid: Optional[str] = None

    # UTM (optional)
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None

    # Source
    source: str = Field(default="manual", description="Source: manual, api, webhook, csv, crm")
    source_name: Optional[str] = None
    external_id: Optional[str] = None

    # Lead status
    lead_status: str = Field(default="new", description="Status: new, contacted, qualified, converted, lost")

    # Custom data
    custom_data: Optional[dict] = None

    # When did conversion occur
    occurred_at: Optional[str] = None


class ConversionUpdate(BaseModel):
    """Request to update a conversion."""
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    conversion_type: Optional[str] = None
    conversion_name: Optional[str] = None
    value: Optional[float] = None
    currency: Optional[str] = None
    lead_status: Optional[str] = None
    custom_data: Optional[dict] = None


class ConversionSummary(BaseModel):
    """Summary view of a conversion."""
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    conversion_type: str
    conversion_name: Optional[str] = None
    value_micros: int = 0
    currency: str = "USD"
    lead_status: str = "new"

    # Attribution
    gclid: Optional[str] = None
    fbclid: Optional[str] = None
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None

    # Source
    source: str
    source_name: Optional[str] = None

    # Sync status
    meta_sync_status: str = "pending"
    google_sync_status: str = "pending"

    # Timestamps
    occurred_at: str
    created_at: str


class ConversionDetail(ConversionSummary):
    """Detailed view of a conversion."""
    organization_id: str
    visitor_id: Optional[str] = None

    # All click IDs
    gbraid: Optional[str] = None
    wbraid: Optional[str] = None
    msclkid: Optional[str] = None
    ttclkid: Optional[str] = None
    fbp: Optional[str] = None
    fbc: Optional[str] = None

    # All UTM
    utm_medium: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None

    # Hashes (for sync)
    email_hash: Optional[str] = None
    phone_hash: Optional[str] = None

    # Additional fields
    quantity: int = 1
    order_id: Optional[str] = None
    external_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    # Sync details
    meta_synced_at: Optional[str] = None
    meta_event_id: Optional[str] = None
    meta_error_message: Optional[str] = None
    google_synced_at: Optional[str] = None
    google_error_message: Optional[str] = None

    custom_data: Optional[dict] = None
    updated_at: str


class ConversionListResponse(BaseModel):
    """Response for conversion list endpoint."""
    conversions: List[ConversionSummary]
    total: int
    page: int
    page_size: int
    has_more: bool


class ConversionStatsResponse(BaseModel):
    """Conversion statistics response."""
    total_conversions: int
    total_value_micros: int
    conversions_today: int
    conversions_this_week: int

    # By status
    by_lead_status: dict
    by_conversion_type: dict
    by_source: dict

    # Sync stats
    meta_synced: int
    meta_pending: int
    meta_failed: int
    google_synced: int
    google_pending: int
    google_failed: int

    # Attribution
    with_gclid: int
    with_fbclid: int


class SyncRequest(BaseModel):
    """Request to sync conversions to ad platform."""
    conversion_ids: List[str] = Field(..., description="List of conversion IDs to sync")
    platform: str = Field(..., description="Platform: meta or google")


class SyncResponse(BaseModel):
    """Response from sync operation."""
    status: str
    synced: int = 0
    failed: int = 0
    errors: List[dict] = []


# ============================================================================
# Helper Functions
# ============================================================================

def hash_pii(value: Optional[str]) -> Optional[str]:
    """Hash PII value using SHA256."""
    if not value:
        return None
    normalized = value.lower().strip()
    return hashlib.sha256(normalized.encode()).hexdigest()


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=ConversionListResponse)
async def list_conversions(
    user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by email or name"),
    conversion_type: Optional[str] = Query(None),
    lead_status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    has_gclid: Optional[bool] = Query(None),
    has_fbclid: Optional[bool] = Query(None),
    meta_sync_status: Optional[str] = Query(None),
    google_sync_status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    order_by: str = Query("occurred_at"),
    order_dir: str = Query("desc"),
):
    """List offline conversions with filtering and pagination."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Build query
    query = supabase.table("offline_conversions").select(
        "id, email, phone, first_name, last_name, "
        "conversion_type, conversion_name, value_micros, currency, lead_status, "
        "gclid, fbclid, utm_source, utm_campaign, "
        "source, source_name, meta_sync_status, google_sync_status, "
        "occurred_at, created_at",
        count="exact"
    ).eq("organization_id", org_id)

    # Apply filters
    if search:
        query = query.or_(
            f"email.ilike.%{search}%,"
            f"first_name.ilike.%{search}%,"
            f"last_name.ilike.%{search}%"
        )

    if conversion_type:
        query = query.eq("conversion_type", conversion_type)

    if lead_status:
        query = query.eq("lead_status", lead_status)

    if source:
        query = query.eq("source", source)

    if has_gclid is True:
        query = query.not_.is_("gclid", "null")
    elif has_gclid is False:
        query = query.is_("gclid", "null")

    if has_fbclid is True:
        query = query.not_.is_("fbclid", "null")
    elif has_fbclid is False:
        query = query.is_("fbclid", "null")

    if meta_sync_status:
        query = query.eq("meta_sync_status", meta_sync_status)

    if google_sync_status:
        query = query.eq("google_sync_status", google_sync_status)

    if date_from:
        query = query.gte("occurred_at", date_from)

    if date_to:
        query = query.lte("occurred_at", date_to)

    # Apply ordering
    order_col = order_by if order_by in [
        "occurred_at", "created_at", "value_micros"
    ] else "occurred_at"
    query = query.order(order_col, desc=(order_dir.lower() == "desc"))

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)

    # Execute
    result = await query.execute()

    total = result.count or 0
    conversions = [ConversionSummary(**c) for c in result.data]

    return ConversionListResponse(
        conversions=conversions,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + len(conversions)) < total,
    )


@router.get("/stats", response_model=ConversionStatsResponse)
async def get_conversion_stats(
    user: dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=365),
):
    """Get conversion statistics."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    # Total conversions
    total_result = supabase.table("offline_conversions").select(
        "id, value_micros", count="exact"
    ).eq("organization_id", org_id).execute()

    total_conversions = total_result.count or 0
    total_value_micros = sum(c.get("value_micros", 0) for c in total_result.data)

    # Today
    today_result = supabase.table("offline_conversions").select(
        "id", count="exact"
    ).eq("organization_id", org_id).gte(
        "occurred_at", today_start.isoformat()
    ).execute()
    conversions_today = today_result.count or 0

    # This week
    week_result = supabase.table("offline_conversions").select(
        "id", count="exact"
    ).eq("organization_id", org_id).gte(
        "occurred_at", week_start.isoformat()
    ).execute()
    conversions_this_week = week_result.count or 0

    # By lead status
    status_result = supabase.table("offline_conversions").select(
        "lead_status"
    ).eq("organization_id", org_id).execute()

    by_lead_status = {}
    for c in status_result.data:
        status = c.get("lead_status", "new")
        by_lead_status[status] = by_lead_status.get(status, 0) + 1

    # By conversion type
    type_result = supabase.table("offline_conversions").select(
        "conversion_type"
    ).eq("organization_id", org_id).execute()

    by_conversion_type = {}
    for c in type_result.data:
        ctype = c.get("conversion_type", "lead")
        by_conversion_type[ctype] = by_conversion_type.get(ctype, 0) + 1

    # By source
    source_result = supabase.table("offline_conversions").select(
        "source"
    ).eq("organization_id", org_id).execute()

    by_source = {}
    for c in source_result.data:
        src = c.get("source", "manual")
        by_source[src] = by_source.get(src, 0) + 1

    # Sync stats
    meta_synced = supabase.table("offline_conversions").select(
        "id", count="exact"
    ).eq("organization_id", org_id).eq("meta_sync_status", "synced").execute()

    meta_pending = supabase.table("offline_conversions").select(
        "id", count="exact"
    ).eq("organization_id", org_id).eq("meta_sync_status", "pending").execute()

    meta_failed = supabase.table("offline_conversions").select(
        "id", count="exact"
    ).eq("organization_id", org_id).eq("meta_sync_status", "failed").execute()

    google_synced = supabase.table("offline_conversions").select(
        "id", count="exact"
    ).eq("organization_id", org_id).eq("google_sync_status", "synced").execute()

    google_pending = supabase.table("offline_conversions").select(
        "id", count="exact"
    ).eq("organization_id", org_id).eq("google_sync_status", "pending").execute()

    google_failed = supabase.table("offline_conversions").select(
        "id", count="exact"
    ).eq("organization_id", org_id).eq("google_sync_status", "failed").execute()

    # Attribution
    with_gclid = supabase.table("offline_conversions").select(
        "id", count="exact"
    ).eq("organization_id", org_id).not_.is_("gclid", "null").execute()

    with_fbclid = supabase.table("offline_conversions").select(
        "id", count="exact"
    ).eq("organization_id", org_id).not_.is_("fbclid", "null").execute()

    return ConversionStatsResponse(
        total_conversions=total_conversions,
        total_value_micros=total_value_micros,
        conversions_today=conversions_today,
        conversions_this_week=conversions_this_week,
        by_lead_status=by_lead_status,
        by_conversion_type=by_conversion_type,
        by_source=by_source,
        meta_synced=meta_synced.count or 0,
        meta_pending=meta_pending.count or 0,
        meta_failed=meta_failed.count or 0,
        google_synced=google_synced.count or 0,
        google_pending=google_pending.count or 0,
        google_failed=google_failed.count or 0,
        with_gclid=with_gclid.count or 0,
        with_fbclid=with_fbclid.count or 0,
    )


@router.post("", response_model=ConversionDetail)
async def create_conversion(
    body: ConversionCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new offline conversion."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Require at least email or phone
    if not body.email and not body.phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    now = datetime.now(timezone.utc).isoformat()
    value_micros = int(body.value * 1_000_000) if body.value else 0

    conversion = {
        "id": str(uuid4()),
        "organization_id": org_id,
        "email": body.email.lower().strip() if body.email else None,
        "phone": body.phone.strip() if body.phone else None,
        "first_name": body.first_name,
        "last_name": body.last_name,
        "conversion_type": body.conversion_type,
        "conversion_name": body.conversion_name,
        "value_micros": value_micros,
        "currency": body.currency,
        "quantity": body.quantity,
        "order_id": body.order_id,
        "gclid": body.gclid,
        "fbclid": body.fbclid,
        "gbraid": body.gbraid,
        "wbraid": body.wbraid,
        "utm_source": body.utm_source,
        "utm_medium": body.utm_medium,
        "utm_campaign": body.utm_campaign,
        "source": body.source,
        "source_name": body.source_name,
        "external_id": body.external_id,
        "lead_status": body.lead_status,
        "custom_data": body.custom_data or {},
        "occurred_at": body.occurred_at or now,
        "created_at": now,
        "updated_at": now,
    }

    result = supabase.table("offline_conversions").insert(conversion).execute()

    return ConversionDetail(**result.data[0])


@router.post("/batch")
async def create_batch_conversions(
    conversions: List[ConversionCreate],
    user: dict = Depends(get_current_user),
):
    """Create multiple conversions in batch."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    if len(conversions) > 1000:
        raise HTTPException(status_code=400, detail="Maximum 1000 conversions per batch")

    now = datetime.now(timezone.utc).isoformat()
    created = 0
    errors = []

    for i, conv in enumerate(conversions):
        try:
            if not conv.email and not conv.phone:
                errors.append({"index": i, "error": "Email or phone required"})
                continue

            value_micros = int(conv.value * 1_000_000) if conv.value else 0

            conversion = {
                "id": str(uuid4()),
                "organization_id": org_id,
                "email": conv.email.lower().strip() if conv.email else None,
                "phone": conv.phone.strip() if conv.phone else None,
                "first_name": conv.first_name,
                "last_name": conv.last_name,
                "conversion_type": conv.conversion_type,
                "conversion_name": conv.conversion_name,
                "value_micros": value_micros,
                "currency": conv.currency,
                "quantity": conv.quantity,
                "order_id": conv.order_id,
                "gclid": conv.gclid,
                "fbclid": conv.fbclid,
                "gbraid": conv.gbraid,
                "wbraid": conv.wbraid,
                "utm_source": conv.utm_source,
                "utm_medium": conv.utm_medium,
                "utm_campaign": conv.utm_campaign,
                "source": conv.source,
                "source_name": conv.source_name,
                "external_id": conv.external_id,
                "lead_status": conv.lead_status,
                "custom_data": conv.custom_data or {},
                "occurred_at": conv.occurred_at or now,
                "created_at": now,
                "updated_at": now,
            }

            supabase.table("offline_conversions").insert(conversion).execute()
            created += 1
        except Exception as e:
            errors.append({"index": i, "error": str(e)})

    return {
        "status": "success",
        "created": created,
        "failed": len(errors),
        "errors": errors[:10],  # Return first 10 errors
    }


@router.get("/{conversion_id}", response_model=ConversionDetail)
async def get_conversion(
    conversion_id: str,
    user: dict = Depends(get_current_user),
):
    """Get detailed information about a conversion."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    result = supabase.table("offline_conversions").select("*").eq(
        "organization_id", org_id
    ).eq("id", conversion_id).maybe_single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Conversion not found")

    return ConversionDetail(**result.data)


@router.patch("/{conversion_id}", response_model=ConversionDetail)
async def update_conversion(
    conversion_id: str,
    body: ConversionUpdate,
    user: dict = Depends(get_current_user),
):
    """Update a conversion."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Verify exists
    existing = supabase.table("offline_conversions").select("id").eq(
        "organization_id", org_id
    ).eq("id", conversion_id).maybe_single().execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Conversion not found")

    # Build update
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if body.email is not None:
        update_data["email"] = body.email.lower().strip()
    if body.phone is not None:
        update_data["phone"] = body.phone.strip()
    if body.first_name is not None:
        update_data["first_name"] = body.first_name
    if body.last_name is not None:
        update_data["last_name"] = body.last_name
    if body.conversion_type is not None:
        update_data["conversion_type"] = body.conversion_type
    if body.conversion_name is not None:
        update_data["conversion_name"] = body.conversion_name
    if body.value is not None:
        update_data["value_micros"] = int(body.value * 1_000_000)
    if body.currency is not None:
        update_data["currency"] = body.currency
    if body.lead_status is not None:
        update_data["lead_status"] = body.lead_status
    if body.custom_data is not None:
        update_data["custom_data"] = body.custom_data

    result = supabase.table("offline_conversions").update(update_data).eq(
        "id", conversion_id
    ).execute()

    return ConversionDetail(**result.data[0])


@router.delete("/{conversion_id}")
async def delete_conversion(
    conversion_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a conversion."""
    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    # Verify exists
    existing = supabase.table("offline_conversions").select("id").eq(
        "organization_id", org_id
    ).eq("id", conversion_id).maybe_single().execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Conversion not found")

    supabase.table("offline_conversions").delete().eq(
        "id", conversion_id
    ).execute()

    return {"status": "success", "message": "Conversion deleted"}


@router.post("/sync", response_model=SyncResponse)
async def sync_conversions(
    body: SyncRequest,
    user: dict = Depends(get_current_user),
):
    """Sync conversions to Meta CAPI or Google Ads.

    Uses the ConversionSyncCoordinator to handle actual API calls
    to Meta Conversions API and Google Ads Offline Conversion Import.
    """
    from ..services.sync import ConversionSyncCoordinator

    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    if body.platform not in ["meta", "google"]:
        raise HTTPException(status_code=400, detail="Platform must be 'meta' or 'google'")

    if not body.conversion_ids:
        return SyncResponse(status="success", synced=0, failed=0)

    # Use the sync coordinator
    coordinator = ConversionSyncCoordinator(supabase)

    # Sync in batch
    result = await coordinator.sync_batch(
        conversion_ids=body.conversion_ids,
        org_id=org_id,
        platforms=[body.platform],
        force=False,
        concurrency=10,
    )

    return SyncResponse(
        status="success",
        synced=result.synced,
        failed=result.failed,
        errors=result.errors[:10],
    )


@router.post("/sync-pending")
async def sync_pending_conversions(
    user: dict = Depends(get_current_user),
    platform: Optional[str] = Query(None, description="Platform to sync: meta, google, or both"),
    limit: int = Query(100, ge=1, le=1000),
):
    """Sync all pending conversions for the organization.

    This is useful for background processing or manual trigger
    to sync all conversions that haven't been synced yet.
    """
    from ..services.sync import ConversionSyncCoordinator

    supabase = get_supabase()
    org_id = user.get("org")

    if not org_id:
        raise HTTPException(status_code=400, detail="User not associated with an organization")

    if platform and platform not in ["meta", "google"]:
        raise HTTPException(status_code=400, detail="Platform must be 'meta' or 'google'")

    coordinator = ConversionSyncCoordinator(supabase)

    result = await coordinator.sync_pending(
        org_id=org_id,
        platform=platform,
        limit=limit,
    )

    return {
        "status": "success",
        "total": result.total,
        "synced": result.synced,
        "failed": result.failed,
        "skipped": result.skipped,
        "errors": result.errors[:10],
    }
