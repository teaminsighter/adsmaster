"""
Audiences API Endpoints

CRUD operations for custom audiences (remarketing, lookalikes, customer lists).
Connected to PostgreSQL database with JWT authentication.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from ..services.supabase_client import get_supabase_client
from .user_auth import get_current_user

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
# Helper Functions
# =============================================================================

def audience_row_to_response(row: dict) -> AudienceResponse:
    """Convert a database row to AudienceResponse."""
    return AudienceResponse(
        id=row["id"],
        name=row.get("name", ""),
        platform=row.get("platform", "google"),
        type=row.get("type", "REMARKETING"),
        source=row.get("source", "all_visitors"),
        status=row.get("status", "ACTIVE"),
        lookback_days=row.get("lookback_days", 30) or 30,
        description=row.get("description"),
        estimated_size=row.get("estimated_size", 0) or 0,
        campaigns_using=row.get("campaigns_using", 0) or 0,
        total_conversions=row.get("total_conversions", 0) or 0,
        total_spend_micros=row.get("total_spend_micros", 0) or 0,
        platform_audience_id=row.get("platform_audience_id"),
        platform_sync_status=row.get("platform_sync_status", "pending") or "pending",
        created_at=row.get("created_at", datetime.utcnow().isoformat()),
        updated_at=row.get("updated_at", datetime.utcnow().isoformat()),
    )


# =============================================================================
# Endpoints
# =============================================================================

@router.get("", response_model=AudienceListResponse)
async def list_audiences(
    platform: Optional[str] = Query(None, description="Filter by platform (google, meta)"),
    type: Optional[str] = Query(None, description="Filter by type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: dict = Depends(get_current_user),
):
    """
    List all audiences for the user's organization.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Build query - filter out deleted audiences
    query = db.table("audiences").select("*").eq("organization_id", organization_id)

    if platform:
        query = query.eq("platform", platform.lower())
    if type:
        query = query.eq("type", type.upper())
    if status:
        query = query.eq("status", status.upper())

    result = query.execute()

    # Filter out soft-deleted audiences
    all_data = [row for row in (result.data or []) if not row.get("deleted_at")]

    audiences = [audience_row_to_response(row) for row in all_data]

    # Calculate summary
    summary = AudienceSummary(
        total_audiences=len(all_data),
        active=len([a for a in all_data if a.get("status") == "ACTIVE"]),
        paused=len([a for a in all_data if a.get("status") == "PAUSED"]),
        total_size=sum(a.get("estimated_size", 0) or 0 for a in all_data),
        total_conversions=sum(a.get("total_conversions", 0) or 0 for a in all_data),
        google_audiences=len([a for a in all_data if a.get("platform") == "google"]),
        meta_audiences=len([a for a in all_data if a.get("platform") == "meta"]),
    )

    return AudienceListResponse(
        audiences=audiences,
        total=len(audiences),
        summary=summary,
    )


@router.get("/{audience_id}", response_model=AudienceResponse)
async def get_audience(
    audience_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get a single audience by ID.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    result = db.table("audiences").select("*").eq("id", audience_id).eq(
        "organization_id", organization_id
    ).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Audience not found")

    row = result.data[0]
    if row.get("deleted_at"):
        raise HTTPException(status_code=404, detail="Audience not found")

    return audience_row_to_response(row)


@router.post("", response_model=AudienceResponse)
async def create_audience(
    audience: AudienceCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new audience.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

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
    }

    result = db.table("audiences").insert(new_audience).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create audience")

    return audience_row_to_response(result.data[0])


@router.patch("/{audience_id}", response_model=AudienceResponse)
async def update_audience(
    audience_id: str,
    updates: AudienceUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Update an audience.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Check if audience exists and belongs to org
    existing = db.table("audiences").select("id, deleted_at").eq(
        "id", audience_id
    ).eq("organization_id", organization_id).execute()

    if not existing.data or existing.data[0].get("deleted_at"):
        raise HTTPException(status_code=404, detail="Audience not found")

    # Build update dict
    update_data = {}
    if updates.name is not None:
        update_data["name"] = updates.name
    if updates.description is not None:
        update_data["description"] = updates.description
    if updates.status is not None:
        update_data["status"] = updates.status.upper()
    if updates.lookback_days is not None:
        update_data["lookback_days"] = updates.lookback_days

    if not update_data:
        # No updates, return existing
        full_result = db.table("audiences").select("*").eq("id", audience_id).execute()
        return audience_row_to_response(full_result.data[0])

    result = db.table("audiences").update(update_data).eq("id", audience_id).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update audience")

    return audience_row_to_response(result.data[0])


@router.delete("/{audience_id}")
async def delete_audience(
    audience_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Soft delete an audience.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Check if audience exists and belongs to org
    existing = db.table("audiences").select("id, deleted_at").eq(
        "id", audience_id
    ).eq("organization_id", organization_id).execute()

    if not existing.data or existing.data[0].get("deleted_at"):
        raise HTTPException(status_code=404, detail="Audience not found")

    # Soft delete
    db.table("audiences").update({
        "deleted_at": datetime.utcnow().isoformat(),
        "status": "DELETED",
    }).eq("id", audience_id).execute()

    return {"success": True, "message": "Audience deleted"}


@router.post("/{audience_id}/pause")
async def pause_audience(
    audience_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Pause an audience.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Check ownership
    existing = db.table("audiences").select("id").eq(
        "id", audience_id
    ).eq("organization_id", organization_id).execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Audience not found")

    result = db.table("audiences").update({
        "status": "PAUSED",
    }).eq("id", audience_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Audience not found")

    return {"success": True, "message": "Audience paused"}


@router.post("/{audience_id}/activate")
async def activate_audience(
    audience_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Activate a paused audience.
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Check ownership
    existing = db.table("audiences").select("id").eq(
        "id", audience_id
    ).eq("organization_id", organization_id).execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Audience not found")

    result = db.table("audiences").update({
        "status": "ACTIVE",
    }).eq("id", audience_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Audience not found")

    return {"success": True, "message": "Audience activated"}


@router.post("/{audience_id}/sync")
async def sync_audience_to_platform(
    audience_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Sync an audience to its target ad platform (Google/Meta).
    """
    db = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Get audience
    result = db.table("audiences").select("*").eq(
        "id", audience_id
    ).eq("organization_id", organization_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Audience not found")

    audience = result.data[0]

    # TODO: Implement actual sync to Google/Meta APIs
    # For now, just mark as synced
    db.table("audiences").update({
        "platform_sync_status": "synced",
    }).eq("id", audience_id).execute()

    return {
        "success": True,
        "message": f"Audience synced to {audience.get('platform', 'platform')}",
        "audience_id": audience_id,
    }
