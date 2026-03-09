"""
Audiences API Endpoints

CRUD operations for custom audiences (remarketing, lookalikes, customer lists).
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from ..services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/v1/audiences", tags=["Audiences"])


# =============================================================================
# Request/Response Models
# =============================================================================

class AudienceCreate(BaseModel):
    name: str
    platform: str  # 'google' or 'meta'
    type: str  # 'REMARKETING', 'CUSTOMER_LIST', 'LOOKALIKE', 'ENGAGEMENT'
    source: str
    lookback_days: Optional[int] = 30
    description: Optional[str] = None
    ad_account_id: Optional[str] = None


class AudienceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    lookback_days: Optional[int] = None


class AudienceResponse(BaseModel):
    id: str
    name: str
    platform: str
    type: str
    source: str
    status: str
    lookback_days: int
    description: Optional[str]
    estimated_size: int
    campaigns_using: int
    total_conversions: int
    total_spend_micros: int
    platform_audience_id: Optional[str]
    platform_sync_status: str
    created_at: str
    updated_at: str


class AudienceSummary(BaseModel):
    total_audiences: int
    active: int
    paused: int
    total_size: int
    total_conversions: int
    google_audiences: int
    meta_audiences: int


class AudienceListResponse(BaseModel):
    audiences: List[AudienceResponse]
    total: int
    summary: AudienceSummary


# =============================================================================
# Endpoints
# =============================================================================

@router.get("", response_model=AudienceListResponse)
async def list_audiences(
    organization_id: str = Query(..., description="Organization ID"),
    platform: Optional[str] = Query(None, description="Filter by platform (google, meta)"),
    type: Optional[str] = Query(None, description="Filter by type"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """
    List all audiences for an organization.
    """
    supabase = get_supabase_client()

    # Build query
    query = supabase.table("audiences").select("*").eq(
        "organization_id", organization_id
    ).is_("deleted_at", "null")

    if platform:
        query = query.eq("platform", platform.lower())
    if type:
        query = query.eq("type", type.upper())
    if status:
        query = query.eq("status", status.upper())

    result = query.order("created_at", desc=True).execute()

    audiences = [
        AudienceResponse(
            id=row["id"],
            name=row["name"],
            platform=row["platform"],
            type=row["type"],
            source=row["source"],
            status=row["status"],
            lookback_days=row.get("lookback_days", 30),
            description=row.get("description"),
            estimated_size=row.get("estimated_size", 0),
            campaigns_using=row.get("campaigns_using", 0),
            total_conversions=row.get("total_conversions", 0),
            total_spend_micros=row.get("total_spend_micros", 0),
            platform_audience_id=row.get("platform_audience_id"),
            platform_sync_status=row.get("platform_sync_status", "pending"),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in result.data
    ]

    # Calculate summary
    all_data = result.data
    summary = AudienceSummary(
        total_audiences=len(all_data),
        active=len([a for a in all_data if a["status"] == "ACTIVE"]),
        paused=len([a for a in all_data if a["status"] == "PAUSED"]),
        total_size=sum(a.get("estimated_size", 0) for a in all_data),
        total_conversions=sum(a.get("total_conversions", 0) for a in all_data),
        google_audiences=len([a for a in all_data if a["platform"] == "google"]),
        meta_audiences=len([a for a in all_data if a["platform"] == "meta"]),
    )

    return AudienceListResponse(
        audiences=audiences,
        total=len(audiences),
        summary=summary,
    )


@router.get("/{audience_id}", response_model=AudienceResponse)
async def get_audience(audience_id: str):
    """
    Get a single audience by ID.
    """
    supabase = get_supabase_client()

    result = supabase.table("audiences").select("*").eq(
        "id", audience_id
    ).is_("deleted_at", "null").execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Audience not found")

    row = result.data[0]
    return AudienceResponse(
        id=row["id"],
        name=row["name"],
        platform=row["platform"],
        type=row["type"],
        source=row["source"],
        status=row["status"],
        lookback_days=row.get("lookback_days", 30),
        description=row.get("description"),
        estimated_size=row.get("estimated_size", 0),
        campaigns_using=row.get("campaigns_using", 0),
        total_conversions=row.get("total_conversions", 0),
        total_spend_micros=row.get("total_spend_micros", 0),
        platform_audience_id=row.get("platform_audience_id"),
        platform_sync_status=row.get("platform_sync_status", "pending"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.post("", response_model=AudienceResponse)
async def create_audience(
    audience: AudienceCreate,
    organization_id: str = Query(..., description="Organization ID"),
):
    """
    Create a new audience.
    """
    supabase = get_supabase_client()

    # Generate estimated size based on type/source (demo values)
    estimated_sizes = {
        "all_visitors": 45000,
        "cart_abandoners": 8500,
        "purchasers": 12300,
        "specific_pages": 15000,
        "email_list": 28000,
        "phone_list": 15000,
        "crm_sync": 35000,
        "top_customers": 2100000,
        "all_purchasers": 1500000,
        "website_visitors": 500000,
        "page_engagers": 125000,
        "video_viewers": 85000,
        "ig_engagers": 95000,
        "lead_form": 12000,
    }
    estimated_size = estimated_sizes.get(audience.source, 10000)

    # Create audience record
    new_audience = {
        "id": str(uuid.uuid4()),
        "organization_id": organization_id,
        "ad_account_id": audience.ad_account_id,
        "name": audience.name,
        "platform": audience.platform.lower(),
        "type": audience.type.upper(),
        "source": audience.source,
        "lookback_days": audience.lookback_days or 30,
        "description": audience.description,
        "status": "ACTIVE",
        "estimated_size": estimated_size,
        "campaigns_using": 0,
        "total_conversions": 0,
        "total_spend_micros": 0,
        "platform_sync_status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    result = supabase.table("audiences").insert(new_audience).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create audience")

    row = result.data[0]
    return AudienceResponse(
        id=row["id"],
        name=row["name"],
        platform=row["platform"],
        type=row["type"],
        source=row["source"],
        status=row["status"],
        lookback_days=row.get("lookback_days", 30),
        description=row.get("description"),
        estimated_size=row.get("estimated_size", 0),
        campaigns_using=row.get("campaigns_using", 0),
        total_conversions=row.get("total_conversions", 0),
        total_spend_micros=row.get("total_spend_micros", 0),
        platform_audience_id=row.get("platform_audience_id"),
        platform_sync_status=row.get("platform_sync_status", "pending"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.patch("/{audience_id}", response_model=AudienceResponse)
async def update_audience(audience_id: str, updates: AudienceUpdate):
    """
    Update an audience.
    """
    supabase = get_supabase_client()

    # Check if audience exists
    existing = supabase.table("audiences").select("id").eq(
        "id", audience_id
    ).is_("deleted_at", "null").execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Audience not found")

    # Build update dict
    update_data = {"updated_at": datetime.utcnow().isoformat()}
    if updates.name is not None:
        update_data["name"] = updates.name
    if updates.description is not None:
        update_data["description"] = updates.description
    if updates.status is not None:
        update_data["status"] = updates.status.upper()
    if updates.lookback_days is not None:
        update_data["lookback_days"] = updates.lookback_days

    result = supabase.table("audiences").update(update_data).eq(
        "id", audience_id
    ).execute()

    row = result.data[0]
    return AudienceResponse(
        id=row["id"],
        name=row["name"],
        platform=row["platform"],
        type=row["type"],
        source=row["source"],
        status=row["status"],
        lookback_days=row.get("lookback_days", 30),
        description=row.get("description"),
        estimated_size=row.get("estimated_size", 0),
        campaigns_using=row.get("campaigns_using", 0),
        total_conversions=row.get("total_conversions", 0),
        total_spend_micros=row.get("total_spend_micros", 0),
        platform_audience_id=row.get("platform_audience_id"),
        platform_sync_status=row.get("platform_sync_status", "pending"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.delete("/{audience_id}")
async def delete_audience(audience_id: str):
    """
    Soft delete an audience.
    """
    supabase = get_supabase_client()

    # Check if audience exists
    existing = supabase.table("audiences").select("id").eq(
        "id", audience_id
    ).is_("deleted_at", "null").execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Audience not found")

    # Soft delete
    supabase.table("audiences").update({
        "deleted_at": datetime.utcnow().isoformat(),
        "status": "DELETED",
    }).eq("id", audience_id).execute()

    return {"success": True, "message": "Audience deleted"}


@router.post("/{audience_id}/pause")
async def pause_audience(audience_id: str):
    """
    Pause an audience.
    """
    supabase = get_supabase_client()

    result = supabase.table("audiences").update({
        "status": "PAUSED",
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", audience_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Audience not found")

    return {"success": True, "message": "Audience paused"}


@router.post("/{audience_id}/activate")
async def activate_audience(audience_id: str):
    """
    Activate a paused audience.
    """
    supabase = get_supabase_client()

    result = supabase.table("audiences").update({
        "status": "ACTIVE",
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", audience_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Audience not found")

    return {"success": True, "message": "Audience activated"}
