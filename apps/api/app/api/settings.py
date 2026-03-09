"""
Settings API endpoints
Handles user preferences, notification settings, team members, and API keys
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
import hashlib
import secrets

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class UserPreferences(BaseModel):
    timezone: str = "America/Los_Angeles"
    currency: str = "USD"
    date_format: str = "MM/DD/YYYY"
    theme: str = "system"
    compact_mode: bool = False
    show_cents: bool = True
    default_date_range: str = "30d"


class UserPreferencesUpdate(BaseModel):
    timezone: Optional[str] = None
    currency: Optional[str] = None
    date_format: Optional[str] = None
    theme: Optional[str] = None
    compact_mode: Optional[bool] = None
    show_cents: Optional[bool] = None
    default_date_range: Optional[str] = None


class NotificationSetting(BaseModel):
    notification_type: str
    email_enabled: bool = True
    push_enabled: bool = False
    slack_enabled: bool = False


class NotificationSettingsUpdate(BaseModel):
    settings: List[NotificationSetting]


class TeamMember(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str = "viewer"
    status: str = "active"
    last_active_at: Optional[str] = None
    invited_at: Optional[str] = None
    accepted_at: Optional[str] = None


class TeamMemberInvite(BaseModel):
    email: str
    role: str = "viewer"


class TeamMemberUpdate(BaseModel):
    role: Optional[str] = None


class ApiKey(BaseModel):
    id: str
    name: str
    key_prefix: str
    permissions: List[str] = ["read"]
    rate_limit_per_minute: int = 60
    rate_limit_per_day: int = 10000
    last_used_at: Optional[str] = None
    usage_count: int = 0
    is_active: bool = True
    created_at: str
    expires_at: Optional[str] = None


class ApiKeyCreate(BaseModel):
    name: str
    permissions: List[str] = ["read"]
    rate_limit_per_minute: int = 60
    rate_limit_per_day: int = 10000
    expires_in_days: Optional[int] = None


class ApiKeyResponse(BaseModel):
    api_key: ApiKey
    secret_key: str  # Only returned on creation


# ============================================================================
# USER PREFERENCES ENDPOINTS
# ============================================================================

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


@router.get("/profile")
async def get_profile(
    user_id: str = Query(..., description="User ID")
):
    """Get user profile"""
    # TODO: Fetch from database
    # For now, return demo data
    return {
        "id": user_id,
        "email": "john@example.com",
        "name": "John Doe",
        "avatar_url": None,
        "organization": {
            "id": "org_demo",
            "name": "Acme Corp",
            "role": "owner"
        },
        "subscription": {
            "plan_name": "pro",
            "status": "active"
        }
    }


@router.put("/profile")
async def update_profile(
    data: ProfileUpdate,
    user_id: str = Query(..., description="User ID")
):
    """Update user profile"""
    # TODO: Update in database
    updates = data.model_dump(exclude_none=True)

    return {
        "success": True,
        "message": "Profile updated successfully",
        "profile": {
            "id": user_id,
            "name": updates.get("name", "John Doe"),
            "email": updates.get("email", "john@example.com"),
            "avatar_url": None,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
    }


@router.get("/preferences")
async def get_preferences(
    user_id: str = Query(..., description="User ID")
):
    """Get user preferences"""
    # TODO: Fetch from database
    # For now, return demo data
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "timezone": "America/Los_Angeles",
        "currency": "USD",
        "date_format": "MM/DD/YYYY",
        "theme": "system",
        "compact_mode": False,
        "show_cents": True,
        "default_date_range": "30d",
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }


@router.put("/preferences")
async def update_preferences(
    data: UserPreferencesUpdate,
    user_id: str = Query(..., description="User ID")
):
    """Update user preferences"""
    # TODO: Update in database
    updates = data.model_dump(exclude_none=True)

    return {
        "success": True,
        "message": "Preferences updated successfully",
        "preferences": {
            "user_id": user_id,
            **updates,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
    }


# ============================================================================
# NOTIFICATION SETTINGS ENDPOINTS
# ============================================================================

NOTIFICATION_TYPES = [
    "budget_alerts",
    "performance_drops",
    "ai_recommendations",
    "campaign_status",
    "weekly_report",
    "billing"
]

@router.get("/notifications")
async def get_notification_settings(
    user_id: str = Query(..., description="User ID"),
    organization_id: Optional[str] = Query(None, description="Organization ID")
):
    """Get notification settings for a user"""
    # Return demo data with all notification types
    settings = []
    for ntype in NOTIFICATION_TYPES:
        settings.append({
            "notification_type": ntype,
            "email_enabled": ntype in ["budget_alerts", "performance_drops", "ai_recommendations", "billing"],
            "push_enabled": ntype in ["budget_alerts", "ai_recommendations"],
            "slack_enabled": ntype in ["budget_alerts"]
        })

    return {
        "user_id": user_id,
        "organization_id": organization_id,
        "settings": settings,
        "slack_connected": False
    }


@router.put("/notifications")
async def update_notification_settings(
    data: NotificationSettingsUpdate,
    user_id: str = Query(..., description="User ID"),
    organization_id: Optional[str] = Query(None, description="Organization ID")
):
    """Update notification settings"""
    # TODO: Update in database
    return {
        "success": True,
        "message": "Notification settings updated",
        "settings": [s.model_dump() for s in data.settings]
    }


# ============================================================================
# TEAM MEMBERS ENDPOINTS
# ============================================================================

@router.get("/team")
async def get_team_members(
    organization_id: str = Query(..., description="Organization ID")
):
    """Get all team members for an organization"""
    # Demo data
    return {
        "organization_id": organization_id,
        "members": [
            {
                "id": "member_1",
                "email": "owner@example.com",
                "name": "John Owner",
                "role": "owner",
                "status": "active",
                "last_active_at": datetime.utcnow().isoformat() + "Z",
                "invited_at": "2024-01-01T10:00:00Z",
                "accepted_at": "2024-01-01T10:00:00Z"
            },
            {
                "id": "member_2",
                "email": "admin@example.com",
                "name": "Jane Admin",
                "role": "admin",
                "status": "active",
                "last_active_at": "2024-03-08T14:30:00Z",
                "invited_at": "2024-01-15T10:00:00Z",
                "accepted_at": "2024-01-15T12:00:00Z"
            },
            {
                "id": "member_3",
                "email": "viewer@example.com",
                "name": None,
                "role": "viewer",
                "status": "pending",
                "last_active_at": None,
                "invited_at": "2024-03-01T10:00:00Z",
                "accepted_at": None
            }
        ],
        "total": 3,
        "max_members": 5
    }


@router.post("/team/invite")
async def invite_team_member(
    data: TeamMemberInvite,
    organization_id: str = Query(..., description="Organization ID")
):
    """Invite a new team member"""
    # TODO: Actually send invite email and store in database
    invite_token = secrets.token_urlsafe(32)

    return {
        "success": True,
        "message": f"Invitation sent to {data.email}",
        "member": {
            "id": str(uuid.uuid4()),
            "email": data.email,
            "name": None,
            "role": data.role,
            "status": "pending",
            "invite_token": invite_token[:8] + "...",  # Truncated for security
            "invited_at": datetime.utcnow().isoformat() + "Z"
        }
    }


@router.patch("/team/{member_id}")
async def update_team_member(
    member_id: str,
    data: TeamMemberUpdate,
    organization_id: str = Query(..., description="Organization ID")
):
    """Update a team member's role"""
    if data.role and data.role not in ["owner", "admin", "editor", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    return {
        "success": True,
        "message": "Team member updated",
        "member": {
            "id": member_id,
            "role": data.role,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
    }


@router.delete("/team/{member_id}")
async def remove_team_member(
    member_id: str,
    organization_id: str = Query(..., description="Organization ID")
):
    """Remove a team member from the organization"""
    return {
        "success": True,
        "message": "Team member removed"
    }


@router.post("/team/{member_id}/resend-invite")
async def resend_invite(
    member_id: str,
    organization_id: str = Query(..., description="Organization ID")
):
    """Resend invitation to a pending team member"""
    return {
        "success": True,
        "message": "Invitation resent"
    }


# ============================================================================
# API KEYS ENDPOINTS
# ============================================================================

@router.get("/api-keys")
async def get_api_keys(
    organization_id: str = Query(..., description="Organization ID")
):
    """Get all API keys for an organization"""
    # Demo data
    return {
        "organization_id": organization_id,
        "api_keys": [
            {
                "id": "key_1",
                "name": "Production API",
                "key_prefix": "am_prod_",
                "permissions": ["read", "write"],
                "rate_limit_per_minute": 60,
                "rate_limit_per_day": 10000,
                "last_used_at": "2024-03-09T08:30:00Z",
                "usage_count": 1523,
                "is_active": True,
                "created_at": "2024-01-15T10:00:00Z",
                "expires_at": None
            },
            {
                "id": "key_2",
                "name": "Development Key",
                "key_prefix": "am_dev_",
                "permissions": ["read"],
                "rate_limit_per_minute": 30,
                "rate_limit_per_day": 5000,
                "last_used_at": "2024-03-05T16:45:00Z",
                "usage_count": 342,
                "is_active": True,
                "created_at": "2024-02-01T10:00:00Z",
                "expires_at": "2024-12-31T23:59:59Z"
            }
        ],
        "total": 2,
        "max_keys": 10
    }


@router.post("/api-keys")
async def create_api_key(
    data: ApiKeyCreate,
    organization_id: str = Query(..., description="Organization ID")
):
    """Create a new API key"""
    # Generate a secure API key
    secret_key = f"am_{secrets.token_urlsafe(32)}"
    key_prefix = secret_key[:12]
    key_hash = hashlib.sha256(secret_key.encode()).hexdigest()

    expires_at = None
    if data.expires_in_days:
        from datetime import timedelta
        expires_at = (datetime.utcnow() + timedelta(days=data.expires_in_days)).isoformat() + "Z"

    return {
        "success": True,
        "message": "API key created. Make sure to copy the secret key - it won't be shown again!",
        "api_key": {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "key_prefix": key_prefix,
            "permissions": data.permissions,
            "rate_limit_per_minute": data.rate_limit_per_minute,
            "rate_limit_per_day": data.rate_limit_per_day,
            "last_used_at": None,
            "usage_count": 0,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "expires_at": expires_at
        },
        "secret_key": secret_key  # Only returned on creation!
    }


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    organization_id: str = Query(..., description="Organization ID")
):
    """Revoke an API key"""
    return {
        "success": True,
        "message": "API key revoked",
        "key_id": key_id,
        "revoked_at": datetime.utcnow().isoformat() + "Z"
    }


@router.patch("/api-keys/{key_id}/toggle")
async def toggle_api_key(
    key_id: str,
    organization_id: str = Query(..., description="Organization ID")
):
    """Toggle an API key's active status"""
    return {
        "success": True,
        "message": "API key status toggled",
        "key_id": key_id,
        "is_active": True  # Would toggle based on current state
    }


# ============================================================================
# BILLING ENDPOINTS
# ============================================================================

@router.get("/billing")
async def get_billing_info(
    organization_id: str = Query(..., description="Organization ID")
):
    """Get billing information for an organization"""
    return {
        "organization_id": organization_id,
        "subscription": {
            "id": "sub_demo",
            "plan_name": "pro",
            "plan_price_cents": 4900,
            "billing_interval": "month",
            "status": "active",
            "trial_ends_at": None,
            "current_period_start": "2024-03-01T00:00:00Z",
            "current_period_end": "2024-03-31T23:59:59Z",
            "cancel_at_period_end": False,
            "max_ad_accounts": 10,
            "max_team_members": 5,
            "max_api_calls_per_month": 100000
        },
        "payment_method": {
            "id": "pm_demo",
            "card_brand": "visa",
            "card_last4": "4242",
            "card_exp_month": 12,
            "card_exp_year": 2025,
            "is_default": True
        },
        "usage": {
            "ad_accounts_used": 3,
            "team_members_used": 3,
            "api_calls_this_month": 15234
        },
        "invoices": [
            {
                "id": "inv_1",
                "invoice_number": "INV-2024-003",
                "amount_cents": 4900,
                "currency": "USD",
                "status": "paid",
                "invoice_date": "2024-03-01",
                "paid_at": "2024-03-01T10:00:00Z"
            },
            {
                "id": "inv_2",
                "invoice_number": "INV-2024-002",
                "amount_cents": 4900,
                "currency": "USD",
                "status": "paid",
                "invoice_date": "2024-02-01",
                "paid_at": "2024-02-01T10:00:00Z"
            }
        ]
    }


@router.get("/billing/plans")
async def get_available_plans():
    """Get available subscription plans"""
    return {
        "plans": [
            {
                "name": "starter",
                "display_name": "Starter",
                "price_cents_monthly": 0,
                "price_cents_yearly": 0,
                "features": {
                    "max_ad_accounts": 2,
                    "max_team_members": 1,
                    "max_api_calls_per_month": 10000,
                    "ai_recommendations": True,
                    "custom_reports": False,
                    "priority_support": False,
                    "white_label": False
                }
            },
            {
                "name": "pro",
                "display_name": "Pro",
                "price_cents_monthly": 4900,
                "price_cents_yearly": 47040,
                "features": {
                    "max_ad_accounts": 10,
                    "max_team_members": 5,
                    "max_api_calls_per_month": 100000,
                    "ai_recommendations": True,
                    "custom_reports": True,
                    "priority_support": False,
                    "white_label": False
                }
            },
            {
                "name": "agency",
                "display_name": "Agency",
                "price_cents_monthly": 14900,
                "price_cents_yearly": 143040,
                "features": {
                    "max_ad_accounts": 50,
                    "max_team_members": 20,
                    "max_api_calls_per_month": 500000,
                    "ai_recommendations": True,
                    "custom_reports": True,
                    "priority_support": True,
                    "white_label": True
                }
            },
            {
                "name": "enterprise",
                "display_name": "Enterprise",
                "price_cents_monthly": None,
                "price_cents_yearly": None,
                "features": {
                    "max_ad_accounts": -1,
                    "max_team_members": -1,
                    "max_api_calls_per_month": -1,
                    "ai_recommendations": True,
                    "custom_reports": True,
                    "priority_support": True,
                    "white_label": True
                }
            }
        ]
    }
