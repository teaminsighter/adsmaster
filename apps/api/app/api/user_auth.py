"""
User Authentication API

Handles user registration, login, logout, and token management.
Uses JWT tokens for authentication.
"""

from fastapi import APIRouter, HTTPException, Query, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timedelta
import uuid
import secrets
import hashlib
import jwt
import os

from ..services.supabase_client import get_supabase_client

router = APIRouter(prefix="/auth", tags=["User Authentication"])
security = HTTPBearer(auto_error=False)

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30


# =============================================================================
# Request/Response Models
# =============================================================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    full_name: str = Field(..., min_length=2)
    organization_name: Optional[str] = None


class RegisterResponse(BaseModel):
    success: bool
    user_id: str
    email: str
    message: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    expires_in: int


class LogoutResponse(BaseModel):
    success: bool
    message: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    organization_id: Optional[str]
    organization_name: Optional[str]


# =============================================================================
# Helper Functions
# =============================================================================

def hash_password(password: str) -> str:
    """Hash password using SHA256 with salt."""
    salt = secrets.token_hex(16)
    hash_obj = hashlib.sha256((password + salt).encode())
    return f"{salt}:{hash_obj.hexdigest()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash."""
    try:
        salt, stored_hash = password_hash.split(":")
        hash_obj = hashlib.sha256((password + salt).encode())
        return hash_obj.hexdigest() == stored_hash
    except Exception:
        return False


def create_access_token(user_id: str, organization_id: str = None) -> tuple[str, datetime]:
    """Create JWT access token."""
    expires = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),  # Ensure UUID is converted to string
        "org": str(organization_id) if organization_id else None,
        "type": "access",
        "exp": expires,
        "iat": datetime.utcnow(),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires


def create_refresh_token(user_id: str) -> tuple[str, str, datetime]:
    """Create refresh token. Returns (token, token_hash, expires)."""
    token = secrets.token_urlsafe(64)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return token, token_hash, expires


def decode_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# =============================================================================
# Authentication Dependency
# =============================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Dependency to get current authenticated user."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(credentials.credentials)

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    supabase = get_supabase_client()
    result = supabase.table("users").select("*").eq("id", payload["sub"]).execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="User not found")

    return result.data[0]


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[dict]:
    """Optional authentication - returns None if not authenticated."""
    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/register", response_model=RegisterResponse)
async def register(data: RegisterRequest, request: Request):
    """
    Register a new user.

    Creates a user account and optionally an organization.
    Sends verification email (TODO).
    """
    supabase = get_supabase_client()

    # Check if email already exists
    existing = supabase.table("users").select("id").eq("email", data.email.lower()).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create organization if name provided
    organization_id = None
    if data.organization_name:
        org_result = supabase.table("organizations").insert({
            "id": str(uuid.uuid4()),
            "name": data.organization_name,
            "slug": data.organization_name.lower().replace(" ", "-"),
            "owner_email": data.email.lower(),
        }).execute()
        if org_result.data:
            organization_id = org_result.data[0]["id"]

            # Create default subscription (starter plan)
            supabase.table("subscriptions").insert({
                "id": str(uuid.uuid4()),
                "organization_id": organization_id,
                "plan_name": "starter",
                "status": "active",
                "max_ad_accounts": 2,
                "max_team_members": 1,
                "max_api_calls_per_month": 10000,
            }).execute()

    # Hash password
    password_hash = hash_password(data.password)

    # Generate verification token
    verify_token = secrets.token_urlsafe(32)

    # Create user
    user_id = str(uuid.uuid4())
    user_result = supabase.table("users").insert({
        "id": user_id,
        "email": data.email.lower(),
        "full_name": data.full_name,
        "password_hash": password_hash,
        "organization_id": organization_id,
        "email_verified": False,
        "email_verify_token": verify_token,
        "email_verify_expires": (datetime.utcnow() + timedelta(days=1)).isoformat(),
    }).execute()

    if not user_result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    # Add user as organization owner if org was created
    if organization_id:
        supabase.table("organization_members").insert({
            "id": str(uuid.uuid4()),
            "organization_id": organization_id,
            "user_id": user_id,
            "role": "owner",
            "status": "active",
            "accepted_at": datetime.utcnow().isoformat(),
        }).execute()

    # TODO: Send verification email

    return RegisterResponse(
        success=True,
        user_id=user_id,
        email=data.email.lower(),
        message="Registration successful. Please check your email to verify your account."
    )


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, request: Request):
    """
    Login with email and password.

    Returns JWT access token and refresh token.
    """
    supabase = get_supabase_client()

    # Find user
    result = supabase.table("users").select(
        "*, organizations(id, name)"
    ).eq("email", data.email.lower()).execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = result.data[0]

    # Verify password
    if not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check if email is verified (optional - can be enforced later)
    # if not user.get("email_verified"):
    #     raise HTTPException(status_code=403, detail="Please verify your email first")

    # Get organization info
    org = user.get("organizations") or {}
    organization_id = org.get("id") or user.get("organization_id")

    # Create tokens
    access_token, access_expires = create_access_token(user["id"], organization_id)
    refresh_token, refresh_hash, refresh_expires = create_refresh_token(user["id"])

    # Store session
    device_info = request.headers.get("User-Agent", "Unknown")[:255]
    ip_address = request.client.host if request.client else None

    supabase.table("user_sessions").insert({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "refresh_token_hash": refresh_hash,
        "device_info": device_info,
        "ip_address": ip_address,
        "is_active": True,
        "expires_at": refresh_expires.isoformat(),
    }).execute()

    # Update last login
    supabase.table("users").update({
        "last_login_at": datetime.utcnow().isoformat()
    }).eq("id", user["id"]).execute()

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user["id"],
            "email": user["email"],
            "full_name": user.get("full_name"),
            "organization_id": organization_id,
            "organization_name": org.get("name"),
        }
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(data: RefreshRequest):
    """
    Refresh access token using refresh token.
    """
    supabase = get_supabase_client()

    # Hash the provided refresh token
    token_hash = hashlib.sha256(data.refresh_token.encode()).hexdigest()

    # Find session
    result = supabase.table("user_sessions").select(
        "*, users(id, organization_id)"
    ).eq("refresh_token_hash", token_hash).eq("is_active", True).execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    session = result.data[0]

    # Check expiry
    expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00").replace("+00:00", ""))
    if expires_at < datetime.utcnow():
        # Deactivate expired session
        supabase.table("user_sessions").update({"is_active": False}).eq("id", session["id"]).execute()
        raise HTTPException(status_code=401, detail="Refresh token expired")

    # Get user info
    user = session.get("users") or {}
    user_id = user.get("id") or session["user_id"]
    organization_id = user.get("organization_id")

    # Create new access token
    access_token, _ = create_access_token(user_id, organization_id)

    # Update session last_used_at
    supabase.table("user_sessions").update({
        "last_used_at": datetime.utcnow().isoformat()
    }).eq("id", session["id"]).execute()

    return RefreshResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    data: RefreshRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Logout user and invalidate refresh token.
    """
    supabase = get_supabase_client()

    # Hash the provided refresh token
    token_hash = hashlib.sha256(data.refresh_token.encode()).hexdigest()

    # Deactivate session
    result = supabase.table("user_sessions").update({
        "is_active": False
    }).eq("refresh_token_hash", token_hash).eq("user_id", current_user["id"]).execute()

    return LogoutResponse(
        success=True,
        message="Successfully logged out"
    )


@router.post("/logout-all", response_model=LogoutResponse)
async def logout_all(current_user: dict = Depends(get_current_user)):
    """
    Logout from all devices by invalidating all refresh tokens.
    """
    supabase = get_supabase_client()

    # Deactivate all sessions
    supabase.table("user_sessions").update({
        "is_active": False
    }).eq("user_id", current_user["id"]).execute()

    return LogoutResponse(
        success=True,
        message="Successfully logged out from all devices"
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user info.
    """
    supabase = get_supabase_client()

    # Get organization info
    org_name = None
    if current_user.get("organization_id"):
        org_result = supabase.table("organizations").select("name").eq(
            "id", current_user["organization_id"]
        ).execute()
        if org_result.data:
            org_name = org_result.data[0]["name"]

    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user.get("full_name"),
        organization_id=current_user.get("organization_id"),
        organization_name=org_name
    )


@router.post("/verify-email")
async def verify_email(token: str = Query(..., description="Verification token")):
    """
    Verify user email with token.
    """
    supabase = get_supabase_client()

    # Find user with this token
    result = supabase.table("users").select("id, email_verify_expires").eq(
        "email_verify_token", token
    ).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    user = result.data[0]

    # Check expiry
    expires = user.get("email_verify_expires")
    if expires:
        expires_dt = datetime.fromisoformat(expires.replace("Z", "+00:00").replace("+00:00", ""))
        if expires_dt < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Verification token expired")

    # Mark as verified
    supabase.table("users").update({
        "email_verified": True,
        "email_verify_token": None,
        "email_verify_expires": None,
    }).eq("id", user["id"]).execute()

    return {"success": True, "message": "Email verified successfully"}


@router.post("/forgot-password")
async def forgot_password(email: EmailStr):
    """
    Request password reset email.
    """
    supabase = get_supabase_client()

    # Find user
    result = supabase.table("users").select("id").eq("email", email.lower()).execute()

    # Always return success to prevent email enumeration
    if not result.data:
        return {"success": True, "message": "If the email exists, a reset link has been sent"}

    # Generate reset token
    reset_token = secrets.token_urlsafe(32)

    # Store token
    supabase.table("users").update({
        "password_reset_token": reset_token,
        "password_reset_expires": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
    }).eq("id", result.data[0]["id"]).execute()

    # TODO: Send password reset email

    return {"success": True, "message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    token: str = Query(..., description="Reset token"),
    new_password: str = Query(..., min_length=8, description="New password")
):
    """
    Reset password with token.
    """
    supabase = get_supabase_client()

    # Find user with this token
    result = supabase.table("users").select("id, password_reset_expires").eq(
        "password_reset_token", token
    ).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    user = result.data[0]

    # Check expiry
    expires = user.get("password_reset_expires")
    if expires:
        expires_dt = datetime.fromisoformat(expires.replace("Z", "+00:00").replace("+00:00", ""))
        if expires_dt < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Reset token expired")

    # Hash new password
    password_hash = hash_password(new_password)

    # Update password and clear token
    supabase.table("users").update({
        "password_hash": password_hash,
        "password_reset_token": None,
        "password_reset_expires": None,
    }).eq("id", user["id"]).execute()

    # Invalidate all sessions (force re-login)
    supabase.table("user_sessions").update({
        "is_active": False
    }).eq("user_id", user["id"]).execute()

    return {"success": True, "message": "Password reset successfully. Please login with your new password."}
