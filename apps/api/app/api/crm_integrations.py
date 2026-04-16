"""
CRM Integrations API
Manage Pipedrive, ActiveCampaign, and other CRM connections
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import secrets
from cryptography.fernet import Fernet
import base64
import hashlib
import os

from ..services.supabase_client import get_supabase_client
from .user_auth import get_current_user

router = APIRouter(prefix="/api/v1/crm", tags=["CRM Integrations"])

# Encryption key from environment or generate one
ENCRYPTION_KEY = os.getenv("CRM_ENCRYPTION_KEY", Fernet.generate_key().decode())

def get_cipher():
    """Get Fernet cipher for encrypting credentials"""
    # Ensure key is valid Fernet key (32 url-safe base64-encoded bytes)
    key = ENCRYPTION_KEY
    if len(key) != 44:  # Fernet keys are 44 chars
        # Derive a proper key from the secret
        key = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
    else:
        key = key.encode() if isinstance(key, str) else key
    return Fernet(key)


def encrypt_credentials(credentials: dict) -> str:
    """Encrypt credentials dictionary"""
    cipher = get_cipher()
    return cipher.encrypt(json.dumps(credentials).encode()).decode()


def decrypt_credentials(encrypted: str) -> dict:
    """Decrypt credentials string"""
    try:
        cipher = get_cipher()
        return json.loads(cipher.decrypt(encrypted.encode()).decode())
    except Exception:
        return {}


# =====================================================
# Pydantic Models
# =====================================================

class IntegrationCreate(BaseModel):
    provider: str = Field(..., description="CRM provider: pipedrive, activecampaign, hubspot")
    name: str = Field(..., description="User-friendly name for this integration")
    credentials: Dict[str, Any] = Field(..., description="Provider-specific credentials")
    settings: Optional[Dict[str, Any]] = Field(default={})
    sync_direction: str = Field(default="both", description="to_crm, from_crm, or both")
    sync_frequency: str = Field(default="realtime", description="realtime, hourly, or daily")


class IntegrationUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    sync_direction: Optional[str] = None
    sync_frequency: Optional[str] = None
    sync_enabled: Optional[bool] = None
    field_mapping: Optional[Dict[str, str]] = None


class IntegrationResponse(BaseModel):
    id: str
    provider: str
    name: str
    description: Optional[str]
    settings: Dict[str, Any]
    sync_direction: str
    sync_frequency: str
    sync_enabled: bool
    is_active: bool
    connection_status: str
    last_sync_at: Optional[datetime]
    last_sync_status: Optional[str]
    last_sync_records: int
    total_synced: int
    field_mapping: Dict[str, str]
    created_at: datetime
    updated_at: datetime


class PipelineStage(BaseModel):
    id: str
    name: str
    display_order: int
    color: str
    is_won: bool
    is_lost: bool
    is_default: bool
    leads_count: int
    total_value_micros: int


class Lead(BaseModel):
    id: str
    visitor_id: Optional[str]
    conversion_id: Optional[str]
    email: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    company: Optional[str]
    phone: Optional[str]
    value_micros: int
    stage_id: str
    stage_name: Optional[str]
    source: Optional[str]
    ad_platform: Optional[str]
    campaign_name: Optional[str]
    crm_contact_id: Optional[str]
    crm_contact_url: Optional[str]
    created_at: datetime
    updated_at: datetime


class LeadUpdate(BaseModel):
    stage_id: Optional[str] = None
    value_micros: Optional[int] = None
    notes: Optional[str] = None


class SyncLog(BaseModel):
    id: str
    integration_id: str
    sync_type: str
    direction: str
    status: str
    total_records: int
    success_count: int
    failure_count: int
    started_at: datetime
    completed_at: Optional[datetime]
    duration_ms: Optional[int]


# =====================================================
# Integration Management Endpoints
# =====================================================

@router.get("/integrations", response_model=List[IntegrationResponse])
async def list_integrations(
    current_user: dict = Depends(get_current_user)
):
    """List all CRM integrations for the organization"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    result = supabase.table("crm_integrations").select("*").eq("organization_id", org_id).order("created_at", desc=True).execute()

    integrations = []
    for row in result.data or []:
        # Don't expose encrypted credentials
        row.pop("credentials_encrypted", None)
        row.pop("access_token", None)
        row.pop("refresh_token", None)
        integrations.append(row)

    return integrations


@router.post("/integrations", response_model=IntegrationResponse)
async def create_integration(
    data: IntegrationCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Create a new CRM integration"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Validate provider
    valid_providers = ["pipedrive", "activecampaign", "hubspot", "salesforce", "zoho"]
    if data.provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {', '.join(valid_providers)}")

    # Encrypt credentials
    encrypted_creds = encrypt_credentials(data.credentials)

    # Create integration
    integration_data = {
        "organization_id": org_id,
        "provider": data.provider,
        "name": data.name,
        "credentials_encrypted": encrypted_creds,
        "settings": data.settings or {},
        "sync_direction": data.sync_direction,
        "sync_frequency": data.sync_frequency,
        "connection_status": "pending",
        "is_active": True
    }

    result = supabase.table("crm_integrations").insert(integration_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create integration")

    integration = result.data[0]

    # Test connection in background
    background_tasks.add_task(test_integration_connection, integration["id"], data.provider, data.credentials)

    # Don't return sensitive data
    integration.pop("credentials_encrypted", None)
    return integration


@router.get("/integrations/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get integration details"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    result = supabase.table("crm_integrations").select("*").eq("id", integration_id).eq("organization_id", org_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Integration not found")

    integration = result.data
    integration.pop("credentials_encrypted", None)
    integration.pop("access_token", None)
    integration.pop("refresh_token", None)

    return integration


@router.patch("/integrations/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: str,
    data: IntegrationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update integration settings"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Check ownership
    existing = supabase.table("crm_integrations").select("id").eq("id", integration_id).eq("organization_id", org_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Integration not found")

    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.settings is not None:
        update_data["settings"] = data.settings
    if data.sync_direction is not None:
        update_data["sync_direction"] = data.sync_direction
    if data.sync_frequency is not None:
        update_data["sync_frequency"] = data.sync_frequency
    if data.sync_enabled is not None:
        update_data["sync_enabled"] = data.sync_enabled
    if data.field_mapping is not None:
        update_data["field_mapping"] = data.field_mapping

    if update_data:
        update_data["updated_at"] = datetime.utcnow().isoformat()
        result = supabase.table("crm_integrations").update(update_data).eq("id", integration_id).execute()
        integration = result.data[0]
    else:
        integration = existing.data[0]

    integration.pop("credentials_encrypted", None)
    return integration


@router.delete("/integrations/{integration_id}")
async def delete_integration(
    integration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a CRM integration"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Check ownership
    existing = supabase.table("crm_integrations").select("id").eq("id", integration_id).eq("organization_id", org_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Integration not found")

    supabase.table("crm_integrations").delete().eq("id", integration_id).execute()

    return {"success": True, "message": "Integration deleted"}


@router.post("/integrations/{integration_id}/test")
async def test_integration(
    integration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Test integration connection"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    result = supabase.table("crm_integrations").select("*").eq("id", integration_id).eq("organization_id", org_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Integration not found")

    integration = result.data
    credentials = decrypt_credentials(integration.get("credentials_encrypted", ""))

    # Test based on provider
    success, message = await test_provider_connection(integration["provider"], credentials)

    # Update connection status
    supabase.table("crm_integrations").update({
        "connection_status": "connected" if success else "error",
        "last_error": None if success else message,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", integration_id).execute()

    return {
        "success": success,
        "message": message,
        "status": "connected" if success else "error"
    }


@router.post("/integrations/{integration_id}/sync")
async def sync_integration(
    integration_id: str,
    direction: str = "both",
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user)
):
    """Trigger a manual sync"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    result = supabase.table("crm_integrations").select("*").eq("id", integration_id).eq("organization_id", org_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Integration not found")

    integration = result.data

    if integration["connection_status"] != "connected":
        raise HTTPException(status_code=400, detail="Integration is not connected. Please test the connection first.")

    # Create sync log
    sync_log = {
        "organization_id": org_id,
        "integration_id": integration_id,
        "sync_type": "manual",
        "direction": direction,
        "status": "started"
    }
    log_result = supabase.table("crm_sync_logs").insert(sync_log).execute()

    if background_tasks:
        # Run sync in background
        background_tasks.add_task(run_sync, integration_id, org_id, direction, log_result.data[0]["id"])
        return {"success": True, "message": "Sync started", "sync_id": log_result.data[0]["id"]}
    else:
        return {"success": True, "message": "Sync queued", "sync_id": log_result.data[0]["id"]}


# =====================================================
# Pipeline Stages Endpoints
# =====================================================

@router.get("/pipeline/stages", response_model=List[PipelineStage])
async def list_pipeline_stages(
    current_user: dict = Depends(get_current_user)
):
    """List pipeline stages for the organization"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    result = supabase.table("lead_pipeline_stages").select("*").eq("organization_id", org_id).order("display_order").execute()

    # If no stages exist, create defaults
    if not result.data:
        supabase.rpc("create_default_pipeline_stages", {"org_id": org_id}).execute()
        result = supabase.table("lead_pipeline_stages").select("*").eq("organization_id", org_id).order("display_order").execute()

    return result.data or []


@router.post("/pipeline/stages")
async def create_pipeline_stage(
    name: str,
    color: str = "#6B7280",
    current_user: dict = Depends(get_current_user)
):
    """Create a new pipeline stage"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Get max display order
    result = supabase.table("lead_pipeline_stages").select("display_order").eq("organization_id", org_id).order("display_order", desc=True).limit(1).execute()
    max_order = result.data[0]["display_order"] if result.data else 0

    stage_data = {
        "organization_id": org_id,
        "name": name,
        "color": color,
        "display_order": max_order + 1
    }

    result = supabase.table("lead_pipeline_stages").insert(stage_data).execute()
    return result.data[0] if result.data else None


@router.patch("/pipeline/stages/{stage_id}")
async def update_pipeline_stage(
    stage_id: str,
    name: Optional[str] = None,
    color: Optional[str] = None,
    display_order: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update a pipeline stage"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    update_data = {}
    if name is not None:
        update_data["name"] = name
    if color is not None:
        update_data["color"] = color
    if display_order is not None:
        update_data["display_order"] = display_order

    if update_data:
        result = supabase.table("lead_pipeline_stages").update(update_data).eq("id", stage_id).eq("organization_id", org_id).execute()
        return result.data[0] if result.data else None

    return {"success": True}


@router.delete("/pipeline/stages/{stage_id}")
async def delete_pipeline_stage(
    stage_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a pipeline stage"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    supabase.table("lead_pipeline_stages").delete().eq("id", stage_id).eq("organization_id", org_id).execute()
    return {"success": True}


# =====================================================
# Leads Endpoints
# =====================================================

@router.get("/leads")
async def list_leads(
    stage_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """List leads from conversions with CRM mapping"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Get leads from offline_conversions with CRM mappings
    query = supabase.table("offline_conversions").select(
        "*, crm_contact_mapping(crm_contact_id, crm_contact_url, crm_contact_type)"
    ).eq("organization_id", org_id)

    if stage_id:
        query = query.eq("lead_status", stage_id)

    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()

    # Get stages for mapping
    stages_result = supabase.table("lead_pipeline_stages").select("id, name").eq("organization_id", org_id).execute()
    stages_map = {s["id"]: s["name"] for s in (stages_result.data or [])}

    leads = []
    for conv in result.data or []:
        crm_mapping = conv.get("crm_contact_mapping", [])
        leads.append({
            "id": conv["id"],
            "visitor_id": conv.get("visitor_id"),
            "conversion_id": conv["id"],
            "email": conv.get("email"),
            "first_name": conv.get("first_name"),
            "last_name": conv.get("last_name"),
            "company": conv.get("metadata", {}).get("company"),
            "phone": conv.get("phone"),
            "value_micros": conv.get("value_micros", 0),
            "stage_id": conv.get("lead_status"),
            "stage_name": stages_map.get(conv.get("lead_status")),
            "source": conv.get("source"),
            "ad_platform": conv.get("ad_platform"),
            "campaign_name": conv.get("campaign_name"),
            "crm_contact_id": crm_mapping[0]["crm_contact_id"] if crm_mapping else None,
            "crm_contact_url": crm_mapping[0]["crm_contact_url"] if crm_mapping else None,
            "created_at": conv["created_at"],
            "updated_at": conv.get("updated_at", conv["created_at"])
        })

    # Get total count
    count_result = supabase.table("offline_conversions").select("id", count="exact").eq("organization_id", org_id).execute()

    return {
        "leads": leads,
        "total": count_result.count or 0,
        "limit": limit,
        "offset": offset
    }


@router.get("/leads/by-stage")
async def get_leads_by_stage(
    current_user: dict = Depends(get_current_user)
):
    """Get leads grouped by pipeline stage"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Get stages
    stages_result = supabase.table("lead_pipeline_stages").select("*").eq("organization_id", org_id).order("display_order").execute()
    stages = stages_result.data or []

    # Get leads for each stage
    result = []
    for stage in stages:
        leads_result = supabase.table("offline_conversions").select(
            "id, email, first_name, last_name, value_micros, source, created_at, metadata"
        ).eq("organization_id", org_id).eq("lead_status", stage["id"]).order("created_at", desc=True).limit(20).execute()

        leads = []
        for conv in leads_result.data or []:
            leads.append({
                "id": conv["id"],
                "name": f"{conv.get('first_name', '')} {conv.get('last_name', '')}".strip() or conv.get("email", "Unknown"),
                "email": conv.get("email"),
                "company": conv.get("metadata", {}).get("company"),
                "value": conv.get("value_micros", 0) / 1000000,
                "source": conv.get("source"),
                "created_at": conv["created_at"]
            })

        result.append({
            "stage": stage,
            "leads": leads,
            "count": len(leads)
        })

    return result


@router.patch("/leads/{lead_id}")
async def update_lead(
    lead_id: str,
    data: LeadUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a lead (move to different stage, update value, etc.)"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    update_data = {}
    if data.stage_id is not None:
        update_data["lead_status"] = data.stage_id
    if data.value_micros is not None:
        update_data["value_micros"] = data.value_micros

    if update_data:
        update_data["updated_at"] = datetime.utcnow().isoformat()
        result = supabase.table("offline_conversions").update(update_data).eq("id", lead_id).eq("organization_id", org_id).execute()
        return result.data[0] if result.data else None

    return {"success": True}


@router.post("/leads/{lead_id}/sync-to-crm")
async def sync_lead_to_crm(
    lead_id: str,
    integration_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Sync a specific lead to CRM"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Get lead
    lead_result = supabase.table("offline_conversions").select("*").eq("id", lead_id).eq("organization_id", org_id).single().execute()
    if not lead_result.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Get integration
    int_result = supabase.table("crm_integrations").select("*").eq("id", integration_id).eq("organization_id", org_id).single().execute()
    if not int_result.data:
        raise HTTPException(status_code=404, detail="Integration not found")

    integration = int_result.data
    credentials = decrypt_credentials(integration.get("credentials_encrypted", ""))

    # Sync based on provider
    try:
        crm_id, crm_url = await sync_lead_to_provider(
            integration["provider"],
            credentials,
            lead_result.data,
            integration.get("field_mapping", {})
        )

        # Save mapping
        mapping_data = {
            "organization_id": org_id,
            "integration_id": integration_id,
            "conversion_id": lead_id,
            "email": lead_result.data.get("email"),
            "crm_contact_id": crm_id,
            "crm_contact_type": "deal" if integration["provider"] == "pipedrive" else "contact",
            "crm_contact_url": crm_url,
            "sync_direction": "to_crm"
        }
        supabase.table("crm_contact_mapping").upsert(mapping_data, on_conflict="integration_id,crm_contact_id").execute()

        return {"success": True, "crm_contact_id": crm_id, "crm_url": crm_url}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# Sync Logs Endpoints
# =====================================================

@router.get("/sync-logs", response_model=List[SyncLog])
async def list_sync_logs(
    integration_id: Optional[str] = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """List sync history"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    query = supabase.table("crm_sync_logs").select("*").eq("organization_id", org_id)

    if integration_id:
        query = query.eq("integration_id", integration_id)

    result = query.order("started_at", desc=True).limit(limit).execute()
    return result.data or []


# =====================================================
# Helper Functions
# =====================================================

async def test_provider_connection(provider: str, credentials: dict) -> tuple:
    """Test connection to CRM provider"""
    try:
        if provider == "pipedrive":
            from ..services.crm.pipedrive_service import PipedriveService
            service = PipedriveService(credentials.get("api_token"), credentials.get("company_domain"))
            return await service.test_connection()

        elif provider == "activecampaign":
            from ..services.crm.activecampaign_service import ActiveCampaignService
            service = ActiveCampaignService(credentials.get("api_url"), credentials.get("api_key"))
            return await service.test_connection()

        else:
            return False, f"Provider {provider} not yet supported"

    except Exception as e:
        return False, str(e)


async def test_integration_connection(integration_id: str, provider: str, credentials: dict):
    """Background task to test integration connection"""
    supabase = get_supabase_client()

    success, message = await test_provider_connection(provider, credentials)

    supabase.table("crm_integrations").update({
        "connection_status": "connected" if success else "error",
        "last_error": None if success else message,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", integration_id).execute()


async def run_sync(integration_id: str, org_id: str, direction: str, sync_log_id: str):
    """Background task to run sync"""
    supabase = get_supabase_client()

    try:
        # Get integration
        result = supabase.table("crm_integrations").select("*").eq("id", integration_id).single().execute()
        if not result.data:
            raise Exception("Integration not found")

        integration = result.data
        credentials = decrypt_credentials(integration.get("credentials_encrypted", ""))

        # Run sync based on provider
        if integration["provider"] == "pipedrive":
            from ..services.crm.pipedrive_service import PipedriveService
            service = PipedriveService(credentials.get("api_token"), credentials.get("company_domain"))
            success_count, failure_count = await service.sync_leads(org_id, direction, integration.get("field_mapping", {}))

        elif integration["provider"] == "activecampaign":
            from ..services.crm.activecampaign_service import ActiveCampaignService
            service = ActiveCampaignService(credentials.get("api_url"), credentials.get("api_key"))
            success_count, failure_count = await service.sync_contacts(org_id, direction, integration.get("field_mapping", {}))

        else:
            raise Exception(f"Provider {integration['provider']} not supported")

        # Update sync log
        supabase.table("crm_sync_logs").update({
            "status": "completed" if failure_count == 0 else "partial",
            "success_count": success_count,
            "failure_count": failure_count,
            "total_records": success_count + failure_count,
            "completed_at": datetime.utcnow().isoformat()
        }).eq("id", sync_log_id).execute()

        # Update integration stats
        supabase.table("crm_integrations").update({
            "last_sync_at": datetime.utcnow().isoformat(),
            "last_sync_status": "success" if failure_count == 0 else "partial",
            "last_sync_records": success_count,
            "total_synced": integration.get("total_synced", 0) + success_count
        }).eq("id", integration_id).execute()

    except Exception as e:
        supabase.table("crm_sync_logs").update({
            "status": "failed",
            "error_details": [{"error": str(e)}],
            "completed_at": datetime.utcnow().isoformat()
        }).eq("id", sync_log_id).execute()


async def sync_lead_to_provider(provider: str, credentials: dict, lead: dict, field_mapping: dict) -> tuple:
    """Sync a single lead to CRM provider"""
    if provider == "pipedrive":
        from ..services.crm.pipedrive_service import PipedriveService
        service = PipedriveService(credentials.get("api_token"), credentials.get("company_domain"))
        return await service.create_deal(lead, field_mapping)

    elif provider == "activecampaign":
        from ..services.crm.activecampaign_service import ActiveCampaignService
        service = ActiveCampaignService(credentials.get("api_url"), credentials.get("api_key"))
        return await service.create_contact(lead, field_mapping)

    else:
        raise Exception(f"Provider {provider} not supported")
