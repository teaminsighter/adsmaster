"""
Settings API endpoints
Handles user preferences, notification settings, team members, API keys, and billing

Connected to Supabase database.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import hashlib
import secrets

from ..services.supabase_client import get_supabase_client
from .user_auth import get_current_user

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None


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


class TeamMemberInvite(BaseModel):
    email: str
    role: str = "viewer"


class TeamMemberUpdate(BaseModel):
    role: Optional[str] = None


class ApiKeyCreate(BaseModel):
    name: str
    permissions: List[str] = ["read"]
    rate_limit_per_minute: int = 60
    rate_limit_per_day: int = 10000
    expires_in_days: Optional[int] = None


# ============================================================================
# NOTIFICATION TYPES
# ============================================================================

NOTIFICATION_TYPES = [
    "budget_alerts",
    "performance_drops",
    "ai_recommendations",
    "campaign_status",
    "weekly_report",
    "billing"
]


# ============================================================================
# USER PROFILE ENDPOINTS
# ============================================================================

@router.get("/profile")
async def get_profile(
    current_user: dict = Depends(get_current_user),
):
    """Get user profile from database"""
    supabase = get_supabase_client()
    user_id = current_user["id"]

    # Get user with organization info
    result = supabase.table("users").select(
        "*, organizations(id, name, slug, plan)"
    ).eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data[0]
    org = user.get("organizations") or {}

    # Get user's role in organization
    role = "member"
    if org.get("id"):
        member_result = supabase.table("organization_members").select("role").eq(
            "organization_id", org["id"]
        ).eq("user_id", user_id).execute()
        if member_result.data:
            role = member_result.data[0].get("role", "member")

    # Get subscription info
    subscription = {"plan_name": "starter", "status": "active"}
    if org.get("id"):
        sub_result = supabase.table("subscriptions").select("*").eq(
            "organization_id", org["id"]
        ).execute()
        if sub_result.data:
            sub = sub_result.data[0]
            subscription = {
                "plan_name": sub.get("plan_name", "starter"),
                "status": sub.get("status", "active")
            }

    return {
        "id": user["id"],
        "email": user.get("email"),
        "name": user.get("full_name"),
        "avatar_url": user.get("avatar_url"),
        "organization": {
            "id": org.get("id"),
            "name": org.get("name"),
            "role": role
        } if org.get("id") else None,
        "subscription": subscription,
        "created_at": user.get("created_at"),
        "last_login_at": user.get("last_login_at")
    }


@router.put("/profile")
async def update_profile(
    data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update user profile in database"""
    supabase = get_supabase_client()
    user_id = current_user["id"]

    # Build update data
    update_data = {}
    if data.name is not None:
        update_data["full_name"] = data.name
    if data.email is not None:
        update_data["email"] = data.email
    if data.avatar_url is not None:
        update_data["avatar_url"] = data.avatar_url

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Update user
    result = supabase.table("users").update(update_data).eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data[0]

    return {
        "success": True,
        "message": "Profile updated successfully",
        "profile": {
            "id": user["id"],
            "name": user.get("full_name"),
            "email": user.get("email"),
            "avatar_url": user.get("avatar_url"),
            "updated_at": user.get("updated_at")
        }
    }


# ============================================================================
# USER PREFERENCES ENDPOINTS
# ============================================================================

@router.get("/preferences")
async def get_preferences(
    current_user: dict = Depends(get_current_user),
):
    """Get user preferences from database"""
    supabase = get_supabase_client()
    user_id = current_user["id"]

    result = supabase.table("user_preferences").select("*").eq("user_id", user_id).execute()

    if not result.data:
        # Create default preferences if not exists
        default_prefs = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "timezone": "America/Los_Angeles",
            "currency": "USD",
            "date_format": "MM/DD/YYYY",
            "theme": "system",
            "compact_mode": False,
            "show_cents": True,
            "default_date_range": "30d"
        }
        supabase.table("user_preferences").insert(default_prefs).execute()
        return default_prefs

    prefs = result.data[0]
    return {
        "id": prefs["id"],
        "user_id": prefs["user_id"],
        "timezone": prefs.get("timezone", "America/Los_Angeles"),
        "currency": prefs.get("currency", "USD"),
        "date_format": prefs.get("date_format", "MM/DD/YYYY"),
        "theme": prefs.get("theme", "system"),
        "compact_mode": prefs.get("compact_mode", False),
        "show_cents": prefs.get("show_cents", True),
        "default_date_range": prefs.get("default_date_range", "30d"),
        "created_at": prefs.get("created_at"),
        "updated_at": prefs.get("updated_at")
    }


@router.put("/preferences")
async def update_preferences(
    data: UserPreferencesUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update user preferences in database"""
    supabase = get_supabase_client()
    user_id = current_user["id"]

    # Build update data
    update_data = data.model_dump(exclude_none=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Check if preferences exist
    existing = supabase.table("user_preferences").select("id").eq("user_id", user_id).execute()

    if not existing.data:
        # Create new preferences
        new_prefs = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            **update_data
        }
        result = supabase.table("user_preferences").insert(new_prefs).execute()
    else:
        # Update existing
        result = supabase.table("user_preferences").update(update_data).eq("user_id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update preferences")

    return {
        "success": True,
        "message": "Preferences updated successfully",
        "preferences": result.data[0]
    }


# ============================================================================
# NOTIFICATION SETTINGS ENDPOINTS
# ============================================================================

@router.get("/notifications")
async def get_notification_settings(
    current_user: dict = Depends(get_current_user),
):
    """Get notification settings from database"""
    supabase = get_supabase_client()
    user_id = current_user["id"]
    organization_id = current_user.get("organization_id")

    query = supabase.table("notification_settings").select("*").eq("user_id", user_id)
    if organization_id:
        query = query.eq("organization_id", organization_id)

    result = query.execute()

    # Map existing settings
    settings_map = {s["notification_type"]: s for s in (result.data or [])}

    # Build full settings list with defaults
    settings = []
    for ntype in NOTIFICATION_TYPES:
        if ntype in settings_map:
            s = settings_map[ntype]
            settings.append({
                "notification_type": ntype,
                "email_enabled": s.get("email_enabled", True),
                "push_enabled": s.get("push_enabled", False),
                "slack_enabled": s.get("slack_enabled", False)
            })
        else:
            # Default settings
            settings.append({
                "notification_type": ntype,
                "email_enabled": ntype in ["budget_alerts", "performance_drops", "ai_recommendations", "billing"],
                "push_enabled": ntype in ["budget_alerts", "ai_recommendations"],
                "slack_enabled": ntype in ["budget_alerts"]
            })

    # Check if Slack is connected
    slack_connected = False
    if organization_id:
        slack_result = supabase.table("slack_integrations").select("id").eq(
            "organization_id", organization_id
        ).eq("is_active", True).execute()
        slack_connected = bool(slack_result.data)

    return {
        "user_id": user_id,
        "organization_id": organization_id,
        "settings": settings,
        "slack_connected": slack_connected
    }


@router.put("/notifications")
async def update_notification_settings(
    data: NotificationSettingsUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update notification settings in database"""
    supabase = get_supabase_client()
    user_id = current_user["id"]
    organization_id = current_user.get("organization_id")

    updated_settings = []

    for setting in data.settings:
        # Upsert each notification setting
        record = {
            "user_id": user_id,
            "organization_id": organization_id,
            "notification_type": setting.notification_type,
            "email_enabled": setting.email_enabled,
            "push_enabled": setting.push_enabled,
            "slack_enabled": setting.slack_enabled
        }

        # Check if exists
        existing = supabase.table("notification_settings").select("id").eq(
            "user_id", user_id
        ).eq("notification_type", setting.notification_type).execute()

        if existing.data:
            # Update
            result = supabase.table("notification_settings").update({
                "email_enabled": setting.email_enabled,
                "push_enabled": setting.push_enabled,
                "slack_enabled": setting.slack_enabled
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            # Insert
            record["id"] = str(uuid.uuid4())
            result = supabase.table("notification_settings").insert(record).execute()

        if result.data:
            updated_settings.append(result.data[0])

    return {
        "success": True,
        "message": "Notification settings updated",
        "settings": [s.notification_type for s in data.settings]
    }


# ============================================================================
# TEAM MEMBERS ENDPOINTS
# ============================================================================

@router.get("/team")
async def get_team_members(
    current_user: dict = Depends(get_current_user),
):
    """Get all team members for an organization from database"""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Get organization members with user details
    result = supabase.table("organization_members").select(
        "*, users(email, full_name, avatar_url, last_login_at)"
    ).eq("organization_id", organization_id).order("created_at").execute()

    members = []
    for row in (result.data or []):
        user = row.get("users") or {}
        members.append({
            "id": row["id"],
            "email": user.get("email") or row.get("invite_email"),
            "name": user.get("full_name"),
            "avatar_url": user.get("avatar_url"),
            "role": row.get("role", "viewer"),
            "status": row.get("status", "pending"),
            "last_active_at": row.get("last_active_at") or user.get("last_login_at"),
            "invited_at": row.get("invited_at"),
            "accepted_at": row.get("accepted_at")
        })

    # Get subscription for max members limit
    sub_result = supabase.table("subscriptions").select("max_team_members").eq(
        "organization_id", organization_id
    ).execute()
    max_members = 5  # default
    if sub_result.data:
        max_members = sub_result.data[0].get("max_team_members", 5)

    return {
        "organization_id": organization_id,
        "members": members,
        "total": len(members),
        "max_members": max_members
    }


@router.post("/team/invite")
async def invite_team_member(
    data: TeamMemberInvite,
    current_user: dict = Depends(get_current_user),
):
    """Invite a new team member"""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")
    invited_by = current_user["id"]

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Check if already invited
    existing = supabase.table("organization_members").select("id, status").eq(
        "organization_id", organization_id
    ).eq("invite_email", data.email).execute()

    if existing.data:
        status = existing.data[0].get("status")
        if status == "active":
            raise HTTPException(status_code=400, detail="User is already a member")
        else:
            raise HTTPException(status_code=400, detail="Invitation already pending")

    # Check member limit
    count_result = supabase.table("organization_members").select("id", count="exact").eq(
        "organization_id", organization_id
    ).execute()
    current_count = count_result.count or 0

    sub_result = supabase.table("subscriptions").select("max_team_members").eq(
        "organization_id", organization_id
    ).execute()
    max_members = 5
    if sub_result.data:
        max_members = sub_result.data[0].get("max_team_members", 5)

    if current_count >= max_members:
        raise HTTPException(status_code=400, detail=f"Team member limit reached ({max_members})")

    # Generate invite token
    invite_token = secrets.token_urlsafe(32)

    # Create invite record
    new_member = {
        "id": str(uuid.uuid4()),
        "organization_id": organization_id,
        "invite_email": data.email,
        "invite_token": invite_token,
        "invite_expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "role": data.role,
        "status": "pending",
        "invited_by": invited_by,
        "invited_at": datetime.utcnow().isoformat()
    }

    result = supabase.table("organization_members").insert(new_member).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create invitation")

    # TODO: Send invitation email

    return {
        "success": True,
        "message": f"Invitation sent to {data.email}",
        "member": {
            "id": result.data[0]["id"],
            "email": data.email,
            "role": data.role,
            "status": "pending",
            "invited_at": result.data[0]["invited_at"]
        }
    }


@router.patch("/team/{member_id}")
async def update_team_member(
    member_id: str,
    data: TeamMemberUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a team member's role"""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    valid_roles = ["owner", "admin", "editor", "viewer"]
    if data.role and data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    # Get current member
    existing = supabase.table("organization_members").select("role").eq(
        "id", member_id
    ).eq("organization_id", organization_id).execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Team member not found")

    # Prevent changing the only owner
    if existing.data[0]["role"] == "owner" and data.role != "owner":
        owner_count = supabase.table("organization_members").select("id", count="exact").eq(
            "organization_id", organization_id
        ).eq("role", "owner").execute()
        if (owner_count.count or 0) <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the only owner")

    # Update role
    update_data = {}
    if data.role:
        update_data["role"] = data.role

    result = supabase.table("organization_members").update(update_data).eq("id", member_id).execute()

    return {
        "success": True,
        "message": "Team member updated",
        "member": {
            "id": member_id,
            "role": data.role,
            "updated_at": result.data[0]["updated_at"] if result.data else None
        }
    }


@router.delete("/team/{member_id}")
async def remove_team_member(
    member_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove a team member from the organization"""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Get member to check role
    existing = supabase.table("organization_members").select("role").eq(
        "id", member_id
    ).eq("organization_id", organization_id).execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Team member not found")

    # Prevent removing the only owner
    if existing.data[0]["role"] == "owner":
        owner_count = supabase.table("organization_members").select("id", count="exact").eq(
            "organization_id", organization_id
        ).eq("role", "owner").execute()
        if (owner_count.count or 0) <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the only owner")

    # Delete member
    supabase.table("organization_members").delete().eq("id", member_id).execute()

    return {
        "success": True,
        "message": "Team member removed"
    }


@router.post("/team/{member_id}/resend-invite")
async def resend_invite(
    member_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Resend invitation to a pending team member"""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Get member
    existing = supabase.table("organization_members").select("*").eq(
        "id", member_id
    ).eq("organization_id", organization_id).eq("status", "pending").execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Pending invitation not found")

    # Generate new token and update expiry
    new_token = secrets.token_urlsafe(32)
    supabase.table("organization_members").update({
        "invite_token": new_token,
        "invite_expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat()
    }).eq("id", member_id).execute()

    # TODO: Send invitation email

    return {
        "success": True,
        "message": "Invitation resent"
    }


# ============================================================================
# API KEYS ENDPOINTS
# ============================================================================

@router.get("/api-keys")
async def get_api_keys(
    current_user: dict = Depends(get_current_user),
):
    """Get all API keys for an organization from database"""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    result = supabase.table("api_keys").select("*").eq(
        "organization_id", organization_id
    ).is_("revoked_at", "null").order("created_at", desc=True).execute()

    keys = []
    for row in (result.data or []):
        keys.append({
            "id": row["id"],
            "name": row.get("name"),
            "key_prefix": row.get("key_prefix"),
            "permissions": row.get("permissions", ["read"]),
            "rate_limit_per_minute": row.get("rate_limit_per_minute", 60),
            "rate_limit_per_day": row.get("rate_limit_per_day", 10000),
            "last_used_at": row.get("last_used_at"),
            "usage_count": row.get("usage_count", 0),
            "is_active": row.get("is_active", True),
            "created_at": row.get("created_at"),
            "expires_at": row.get("expires_at")
        })

    return {
        "organization_id": organization_id,
        "api_keys": keys,
        "total": len(keys),
        "max_keys": 10
    }


@router.post("/api-keys")
async def create_api_key(
    data: ApiKeyCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new API key"""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")
    created_by = current_user["id"]

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Generate secure API key
    secret_key = f"am_{secrets.token_urlsafe(32)}"
    key_prefix = secret_key[:12]
    key_hash = hashlib.sha256(secret_key.encode()).hexdigest()

    # Calculate expiry
    expires_at = None
    if data.expires_in_days:
        expires_at = (datetime.utcnow() + timedelta(days=data.expires_in_days)).isoformat()

    # Create key record
    new_key = {
        "id": str(uuid.uuid4()),
        "organization_id": organization_id,
        "created_by": created_by,
        "name": data.name,
        "key_prefix": key_prefix,
        "key_hash": key_hash,
        "permissions": data.permissions,
        "rate_limit_per_minute": data.rate_limit_per_minute,
        "rate_limit_per_day": data.rate_limit_per_day,
        "expires_at": expires_at,
        "is_active": True,
        "usage_count": 0
    }

    result = supabase.table("api_keys").insert(new_key).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create API key")

    return {
        "success": True,
        "message": "API key created. Make sure to copy the secret key - it won't be shown again!",
        "api_key": {
            "id": result.data[0]["id"],
            "name": data.name,
            "key_prefix": key_prefix,
            "permissions": data.permissions,
            "rate_limit_per_minute": data.rate_limit_per_minute,
            "rate_limit_per_day": data.rate_limit_per_day,
            "is_active": True,
            "created_at": result.data[0]["created_at"],
            "expires_at": expires_at
        },
        "secret_key": secret_key  # Only returned on creation!
    }


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Revoke an API key"""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")
    revoked_by = current_user["id"]

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    result = supabase.table("api_keys").update({
        "is_active": False,
        "revoked_at": datetime.utcnow().isoformat(),
        "revoked_by": revoked_by
    }).eq("id", key_id).eq("organization_id", organization_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="API key not found")

    return {
        "success": True,
        "message": "API key revoked",
        "key_id": key_id,
        "revoked_at": result.data[0]["revoked_at"]
    }


@router.patch("/api-keys/{key_id}/toggle")
async def toggle_api_key(
    key_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Toggle an API key's active status"""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Get current status
    existing = supabase.table("api_keys").select("is_active").eq(
        "id", key_id
    ).eq("organization_id", organization_id).execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="API key not found")

    new_status = not existing.data[0]["is_active"]

    result = supabase.table("api_keys").update({
        "is_active": new_status
    }).eq("id", key_id).execute()

    return {
        "success": True,
        "message": f"API key {'activated' if new_status else 'deactivated'}",
        "key_id": key_id,
        "is_active": new_status
    }


# ============================================================================
# BILLING ENDPOINTS
# ============================================================================

@router.get("/billing")
async def get_billing_info(
    current_user: dict = Depends(get_current_user),
):
    """Get billing information for an organization from database"""
    supabase = get_supabase_client()
    organization_id = current_user.get("organization_id")

    if not organization_id:
        raise HTTPException(status_code=400, detail="User not part of an organization")

    # Get subscription
    sub_result = supabase.table("subscriptions").select("*").eq(
        "organization_id", organization_id
    ).execute()

    subscription = {
        "id": None,
        "plan_name": "starter",
        "plan_price_cents": 0,
        "billing_interval": "month",
        "status": "active",
        "trial_ends_at": None,
        "current_period_start": None,
        "current_period_end": None,
        "cancel_at_period_end": False,
        "max_ad_accounts": 2,
        "max_team_members": 1,
        "max_api_calls_per_month": 10000
    }

    if sub_result.data:
        sub = sub_result.data[0]
        subscription = {
            "id": sub["id"],
            "plan_name": sub.get("plan_name", "starter"),
            "plan_price_cents": sub.get("plan_price_cents", 0),
            "billing_interval": sub.get("billing_interval", "month"),
            "status": sub.get("status", "active"),
            "trial_ends_at": sub.get("trial_ends_at"),
            "current_period_start": sub.get("current_period_start"),
            "current_period_end": sub.get("current_period_end"),
            "cancel_at_period_end": sub.get("cancel_at_period_end", False),
            "max_ad_accounts": sub.get("max_ad_accounts", 2),
            "max_team_members": sub.get("max_team_members", 1),
            "max_api_calls_per_month": sub.get("max_api_calls_per_month", 10000)
        }

    # Get payment method
    pm_result = supabase.table("payment_methods").select("*").eq(
        "organization_id", organization_id
    ).eq("is_default", True).execute()

    payment_method = None
    if pm_result.data:
        pm = pm_result.data[0]
        payment_method = {
            "id": pm["id"],
            "card_brand": pm.get("card_brand"),
            "card_last4": pm.get("card_last4"),
            "card_exp_month": pm.get("card_exp_month"),
            "card_exp_year": pm.get("card_exp_year"),
            "is_default": True
        }

    # Get usage stats
    ad_accounts_result = supabase.table("ad_accounts").select("id", count="exact").eq(
        "organization_id", organization_id
    ).neq("status", "disconnected").execute()

    team_result = supabase.table("organization_members").select("id", count="exact").eq(
        "organization_id", organization_id
    ).execute()

    usage = {
        "ad_accounts_used": ad_accounts_result.count or 0,
        "team_members_used": team_result.count or 0,
        "api_calls_this_month": 0  # TODO: Track API usage
    }

    # Get recent invoices
    invoices_result = supabase.table("invoices").select("*").eq(
        "organization_id", organization_id
    ).order("invoice_date", desc=True).limit(5).execute()

    invoices = []
    for inv in (invoices_result.data or []):
        invoices.append({
            "id": inv["id"],
            "invoice_number": inv.get("invoice_number"),
            "amount_cents": inv.get("amount_cents", 0),
            "currency": inv.get("currency", "USD"),
            "status": inv.get("status"),
            "invoice_date": inv.get("invoice_date"),
            "paid_at": inv.get("paid_at")
        })

    return {
        "organization_id": organization_id,
        "subscription": subscription,
        "payment_method": payment_method,
        "usage": usage,
        "invoices": invoices
    }


@router.get("/billing/plans")
async def get_available_plans():
    """Get available subscription plans"""
    # These could be stored in database, but static for now
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
