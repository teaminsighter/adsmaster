"""
First-Party Domains API
Manage custom tracking domains with CNAME verification
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import secrets
import re
import dns.resolver
import asyncio

from ..services.supabase_client import get_supabase_client
from .user_auth import get_current_user

router = APIRouter(prefix="/api/v1/domains", tags=["First-Party Domains"])

# Constants
CNAME_TARGET = "cname.adsmaster.io"
MAX_VERIFICATION_ATTEMPTS = 10
VERIFICATION_COOLDOWN_MINUTES = 5

# Domain limits by subscription tier
DOMAIN_LIMITS = {
    "free": 0,
    "starter": 0,
    "growth": 1,
    "agency": 5,
    "enterprise": 999
}


# =====================================================
# Pydantic Models
# =====================================================

class DomainCreate(BaseModel):
    domain: str = Field(..., description="Full domain including subdomain, e.g., track.example.com")
    verification_method: str = Field(default="cname", description="Verification method: cname, txt")

    @validator('domain')
    def validate_domain(cls, v):
        # Basic domain validation
        pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid domain format')
        if len(v) > 255:
            raise ValueError('Domain too long')
        return v.lower()

    @validator('verification_method')
    def validate_method(cls, v):
        if v not in ['cname', 'txt']:
            raise ValueError('Verification method must be cname or txt')
        return v


class DomainUpdate(BaseModel):
    is_active: Optional[bool] = None


class DomainResponse(BaseModel):
    id: str
    domain: str
    root_domain: str
    subdomain: str
    verification_code: str
    cname_target: str
    status: str
    verification_method: str
    ssl_status: Optional[str]
    verified_at: Optional[datetime]
    is_active: bool
    request_count: int
    last_verification_attempt: Optional[datetime]
    verification_attempts: int
    last_verification_error: Optional[str]
    created_at: datetime
    updated_at: datetime


class DomainListResponse(BaseModel):
    domains: List[DomainResponse]
    total: int
    limit: int
    can_add_more: bool


class VerificationResult(BaseModel):
    success: bool
    status: str
    message: str
    dns_records: Optional[List[Dict[str, Any]]] = None
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None


class DNSTemplate(BaseModel):
    id: str
    name: str
    provider: str
    instructions: List[Dict[str, Any]]
    example_records: Dict[str, Any]
    provider_docs_url: Optional[str]
    estimated_propagation_minutes: int


# =====================================================
# Helper Functions
# =====================================================

def parse_domain(full_domain: str) -> tuple:
    """Parse domain into root domain and subdomain"""
    parts = full_domain.split('.')
    if len(parts) <= 2:
        return full_domain, ""
    else:
        root = f"{parts[-2]}.{parts[-1]}"
        subdomain = ".".join(parts[:-2])
        return root, subdomain


def generate_verification_code() -> str:
    """Generate a random verification code"""
    return secrets.token_hex(32)


async def check_cname_record(domain: str, expected_target: str) -> dict:
    """Check if CNAME record points to expected target"""
    try:
        # Run DNS lookup in thread pool to not block
        loop = asyncio.get_event_loop()
        answers = await loop.run_in_executor(
            None,
            lambda: dns.resolver.resolve(domain, 'CNAME')
        )

        records = []
        for rdata in answers:
            target = str(rdata.target).rstrip('.')
            records.append({
                "type": "CNAME",
                "target": target
            })

            if target.lower() == expected_target.lower():
                return {
                    "success": True,
                    "records": records,
                    "actual_value": target
                }

        return {
            "success": False,
            "records": records,
            "actual_value": records[0]["target"] if records else None,
            "error": f"CNAME points to {records[0]['target']} instead of {expected_target}"
        }

    except dns.resolver.NXDOMAIN:
        return {
            "success": False,
            "records": [],
            "error": "Domain does not exist (NXDOMAIN)"
        }
    except dns.resolver.NoAnswer:
        return {
            "success": False,
            "records": [],
            "error": "No CNAME record found"
        }
    except dns.resolver.Timeout:
        return {
            "success": False,
            "records": [],
            "error": "DNS lookup timed out"
        }
    except Exception as e:
        return {
            "success": False,
            "records": [],
            "error": str(e)
        }


async def check_txt_record(domain: str, expected_code: str) -> dict:
    """Check if TXT record contains verification code"""
    try:
        # Check for _adsmaster-verification subdomain
        verification_domain = f"_adsmaster-verification.{domain}"

        loop = asyncio.get_event_loop()
        answers = await loop.run_in_executor(
            None,
            lambda: dns.resolver.resolve(verification_domain, 'TXT')
        )

        records = []
        for rdata in answers:
            txt_value = str(rdata).strip('"')
            records.append({
                "type": "TXT",
                "value": txt_value
            })

            if expected_code in txt_value:
                return {
                    "success": True,
                    "records": records,
                    "actual_value": txt_value
                }

        return {
            "success": False,
            "records": records,
            "error": "Verification code not found in TXT records"
        }

    except dns.resolver.NXDOMAIN:
        return {
            "success": False,
            "records": [],
            "error": f"TXT record not found at {verification_domain}"
        }
    except dns.resolver.NoAnswer:
        return {
            "success": False,
            "records": [],
            "error": "No TXT record found"
        }
    except Exception as e:
        return {
            "success": False,
            "records": [],
            "error": str(e)
        }


# =====================================================
# API Endpoints
# =====================================================

@router.get("/", response_model=DomainListResponse)
async def list_domains(
    current_user: dict = Depends(get_current_user)
):
    """List all domains for the organization"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Get user's subscription tier
    tier_result = supabase.table("organizations").select("subscription_tier").eq("id", org_id).single().execute()
    tier = tier_result.data.get("subscription_tier", "free") if tier_result.data else "free"
    domain_limit = DOMAIN_LIMITS.get(tier, 0)

    # Fetch domains
    result = supabase.table("domains").select("*").eq("organization_id", org_id).order("created_at", desc=True).execute()

    domains = result.data or []
    total = len(domains)

    return {
        "domains": domains,
        "total": total,
        "limit": domain_limit,
        "can_add_more": total < domain_limit
    }


@router.post("/", response_model=DomainResponse)
async def create_domain(
    data: DomainCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a new first-party domain"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")
    user_id = current_user.get("sub")

    # Check subscription tier limit
    tier_result = supabase.table("organizations").select("subscription_tier").eq("id", org_id).single().execute()
    tier = tier_result.data.get("subscription_tier", "free") if tier_result.data else "free"
    domain_limit = DOMAIN_LIMITS.get(tier, 0)

    # Count existing domains
    count_result = supabase.table("domains").select("id", count="exact").eq("organization_id", org_id).execute()
    current_count = count_result.count or 0

    if current_count >= domain_limit:
        raise HTTPException(
            status_code=403,
            detail=f"Domain limit reached ({domain_limit}). Upgrade your plan to add more domains."
        )

    # Check if domain already exists globally
    existing = supabase.table("domains").select("id").eq("domain", data.domain).execute()
    if existing.data:
        raise HTTPException(
            status_code=400,
            detail="This domain is already registered"
        )

    # Parse domain
    root_domain, subdomain = parse_domain(data.domain)

    if not subdomain:
        raise HTTPException(
            status_code=400,
            detail="Please use a subdomain (e.g., track.yourdomain.com). Root domains are not supported."
        )

    # Generate verification code
    verification_code = generate_verification_code()

    # Create domain record
    domain_data = {
        "organization_id": org_id,
        "domain": data.domain,
        "root_domain": root_domain,
        "subdomain": subdomain,
        "verification_code": verification_code,
        "cname_target": CNAME_TARGET,
        "status": "pending",
        "verification_method": data.verification_method,
        "ssl_status": "pending",
        "is_active": False,
        "created_by": user_id
    }

    result = supabase.table("domains").insert(domain_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create domain")

    return result.data[0]


@router.get("/{domain_id}", response_model=DomainResponse)
async def get_domain(
    domain_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get domain details"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    result = supabase.table("domains").select("*").eq("id", domain_id).eq("organization_id", org_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Domain not found")

    return result.data


@router.delete("/{domain_id}")
async def delete_domain(
    domain_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a domain"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Check ownership
    existing = supabase.table("domains").select("id").eq("id", domain_id).eq("organization_id", org_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Domain not found")

    # Delete
    supabase.table("domains").delete().eq("id", domain_id).execute()

    return {"success": True, "message": "Domain deleted"}


@router.post("/{domain_id}/verify", response_model=VerificationResult)
async def verify_domain(
    domain_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Verify domain DNS configuration"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Get domain
    result = supabase.table("domains").select("*").eq("id", domain_id).eq("organization_id", org_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Domain not found")

    domain = result.data

    # Check cooldown
    if domain.get("last_verification_attempt"):
        last_attempt = datetime.fromisoformat(domain["last_verification_attempt"].replace('Z', '+00:00'))
        cooldown_end = last_attempt + timedelta(minutes=VERIFICATION_COOLDOWN_MINUTES)
        if datetime.now(last_attempt.tzinfo) < cooldown_end:
            remaining = (cooldown_end - datetime.now(last_attempt.tzinfo)).seconds
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} seconds before verifying again"
            )

    # Check max attempts
    if domain.get("verification_attempts", 0) >= MAX_VERIFICATION_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Maximum verification attempts reached. Please contact support."
        )

    # Perform verification
    if domain["verification_method"] == "cname":
        check_result = await check_cname_record(domain["domain"], CNAME_TARGET)
        expected_value = CNAME_TARGET
    else:  # txt
        check_result = await check_txt_record(domain["domain"], domain["verification_code"])
        expected_value = domain["verification_code"]

    # Update domain record
    update_data = {
        "last_verification_attempt": datetime.utcnow().isoformat(),
        "verification_attempts": domain.get("verification_attempts", 0) + 1
    }

    if check_result["success"]:
        update_data["status"] = "verified"
        update_data["verified_at"] = datetime.utcnow().isoformat()
        update_data["is_active"] = True
        update_data["last_verification_error"] = None
        # TODO: Trigger SSL provisioning in background
    else:
        update_data["status"] = "failed"
        update_data["last_verification_error"] = check_result.get("error")

    supabase.table("domains").update(update_data).eq("id", domain_id).execute()

    # Log verification attempt
    log_data = {
        "domain_id": domain_id,
        "verification_type": domain["verification_method"],
        "status": "success" if check_result["success"] else "failed",
        "dns_records": check_result.get("records"),
        "expected_value": expected_value,
        "actual_value": check_result.get("actual_value"),
        "error_message": check_result.get("error"),
        "completed_at": datetime.utcnow().isoformat()
    }
    supabase.table("domain_verification_logs").insert(log_data).execute()

    return VerificationResult(
        success=check_result["success"],
        status="verified" if check_result["success"] else "failed",
        message="Domain verified successfully!" if check_result["success"] else check_result.get("error", "Verification failed"),
        dns_records=check_result.get("records"),
        expected_value=expected_value,
        actual_value=check_result.get("actual_value")
    )


@router.patch("/{domain_id}", response_model=DomainResponse)
async def update_domain(
    domain_id: str,
    data: DomainUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update domain settings"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Get existing domain
    existing = supabase.table("domains").select("*").eq("id", domain_id).eq("organization_id", org_id).single().execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Domain not found")

    domain = existing.data

    # Can only activate verified domains
    if data.is_active is True and domain["status"] != "verified":
        raise HTTPException(
            status_code=400,
            detail="Cannot activate unverified domain. Please verify the domain first."
        )

    update_data = {}
    if data.is_active is not None:
        update_data["is_active"] = data.is_active

    if update_data:
        result = supabase.table("domains").update(update_data).eq("id", domain_id).execute()
        return result.data[0]

    return domain


@router.get("/{domain_id}/verification-history")
async def get_verification_history(
    domain_id: str,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get verification attempt history for a domain"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Verify ownership
    existing = supabase.table("domains").select("id").eq("id", domain_id).eq("organization_id", org_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Domain not found")

    # Get history
    result = supabase.table("domain_verification_logs").select("*").eq("domain_id", domain_id).order("created_at", desc=True).limit(limit).execute()

    return {"history": result.data or []}


@router.get("/dns/templates", response_model=List[DNSTemplate])
async def get_dns_templates(
    current_user: dict = Depends(get_current_user)
):
    """Get DNS setup templates for common providers"""
    supabase = get_supabase_client()

    result = supabase.table("domain_dns_templates").select("*").eq("is_active", True).order("name").execute()

    return result.data or []


@router.get("/dns/templates/{provider}", response_model=DNSTemplate)
async def get_dns_template(
    provider: str,
    current_user: dict = Depends(get_current_user)
):
    """Get DNS setup template for specific provider"""
    supabase = get_supabase_client()

    result = supabase.table("domain_dns_templates").select("*").eq("provider", provider).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")

    return result.data


@router.get("/{domain_id}/setup-instructions")
async def get_setup_instructions(
    domain_id: str,
    provider: str = "other",
    current_user: dict = Depends(get_current_user)
):
    """Get personalized setup instructions for a domain"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Get domain
    domain_result = supabase.table("domains").select("*").eq("id", domain_id).eq("organization_id", org_id).single().execute()

    if not domain_result.data:
        raise HTTPException(status_code=404, detail="Domain not found")

    domain = domain_result.data

    # Get template
    template_result = supabase.table("domain_dns_templates").select("*").eq("provider", provider).single().execute()
    template = template_result.data if template_result.data else None

    # Build instructions
    if domain["verification_method"] == "cname":
        dns_record = {
            "type": "CNAME",
            "name": domain["subdomain"],
            "target": domain["cname_target"],
            "ttl": "Auto or 3600"
        }
        instructions_text = f"Add a CNAME record pointing {domain['subdomain']} to {domain['cname_target']}"
    else:  # txt
        dns_record = {
            "type": "TXT",
            "name": f"_adsmaster-verification.{domain['domain']}",
            "value": f"adsmaster-verification={domain['verification_code']}",
            "ttl": "Auto or 3600"
        }
        instructions_text = f"Add a TXT record at _adsmaster-verification.{domain['domain']}"

    return {
        "domain": domain["domain"],
        "subdomain": domain["subdomain"],
        "verification_method": domain["verification_method"],
        "dns_record": dns_record,
        "instructions_text": instructions_text,
        "template": template,
        "cname_target": CNAME_TARGET,
        "verification_code": domain["verification_code"],
        "estimated_propagation_minutes": template.get("estimated_propagation_minutes", 60) if template else 60
    }


@router.post("/{domain_id}/refresh-verification-code")
async def refresh_verification_code(
    domain_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate a new verification code for the domain"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Get domain
    existing = supabase.table("domains").select("*").eq("id", domain_id).eq("organization_id", org_id).single().execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Domain not found")

    domain = existing.data

    if domain["status"] == "verified":
        raise HTTPException(
            status_code=400,
            detail="Cannot refresh verification code for already verified domain"
        )

    # Generate new code and reset attempts
    new_code = generate_verification_code()

    supabase.table("domains").update({
        "verification_code": new_code,
        "verification_attempts": 0,
        "status": "pending",
        "last_verification_error": None
    }).eq("id", domain_id).execute()

    return {
        "success": True,
        "verification_code": new_code,
        "message": "Verification code refreshed. Please update your DNS records."
    }


@router.get("/{domain_id}/stats")
async def get_domain_stats(
    domain_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get usage statistics for a domain"""
    supabase = get_supabase_client()
    org_id = current_user.get("org")

    # Get domain
    result = supabase.table("domains").select("id, domain, request_count, last_request_at, is_active, status").eq("id", domain_id).eq("organization_id", org_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Domain not found")

    domain = result.data

    return {
        "domain": domain["domain"],
        "is_active": domain["is_active"],
        "status": domain["status"],
        "total_requests": domain.get("request_count", 0),
        "last_request_at": domain.get("last_request_at")
    }
