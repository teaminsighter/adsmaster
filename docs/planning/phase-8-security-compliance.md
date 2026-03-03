# Phase 8: Security & Compliance Plan

## Executive Summary

| Area | Standard/Approach | Priority |
|------|-------------------|----------|
| **Data Protection** | GDPR, CCPA compliant | P0 |
| **Authentication** | OAuth 2.0, JWT, MFA | P0 |
| **Encryption** | AES-256 at rest, TLS 1.3 in transit | P0 |
| **API Security** | Rate limiting, input validation, OWASP Top 10 | P0 |
| **Infrastructure** | GCP security best practices | P0 |
| **Compliance** | SOC 2 Type II (future), PCI DSS (Stripe handles) | P1 |
| **Audit** | Full audit logging, change tracking | P0 |

---

## Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
└─────────────────────────────────────────────────────────────────────────────┘

LAYER 1: EDGE SECURITY
┌─────────────────────────────────────────────────────────────────────────────┐
│  Cloud CDN + Cloud Armor                                                     │
│  ├── DDoS Protection                                                         │
│  ├── WAF Rules (OWASP Top 10)                                               │
│  ├── Geo-blocking (optional)                                                │
│  ├── Rate limiting (L7)                                                     │
│  └── Bot detection                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
LAYER 2: NETWORK SECURITY
┌─────────────────────────────────────────────────────────────────────────────┐
│  VPC + Private Services                                                      │
│  ├── Private Cloud SQL (no public IP)                                       │
│  ├── Private Redis (Memorystore)                                            │
│  ├── VPC Service Controls                                                   │
│  ├── Cloud NAT for outbound                                                 │
│  └── Firewall rules (deny by default)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
LAYER 3: APPLICATION SECURITY
┌─────────────────────────────────────────────────────────────────────────────┐
│  FastAPI + Next.js                                                           │
│  ├── JWT authentication                                                      │
│  ├── RBAC authorization                                                      │
│  ├── Input validation (Pydantic/Zod)                                        │
│  ├── Output encoding                                                         │
│  ├── CORS configuration                                                      │
│  ├── Security headers (CSP, HSTS, etc.)                                     │
│  └── Rate limiting (per-user)                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
LAYER 4: DATA SECURITY
┌─────────────────────────────────────────────────────────────────────────────┐
│  Encryption + Access Control                                                 │
│  ├── AES-256 encryption at rest (Cloud SQL, GCS)                            │
│  ├── TLS 1.3 encryption in transit                                          │
│  ├── Application-level encryption (OAuth tokens)                            │
│  ├── Row-level security (PostgreSQL RLS)                                    │
│  ├── Column-level encryption (PII)                                          │
│  └── Key management (Cloud KMS)                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
LAYER 5: MONITORING & AUDIT
┌─────────────────────────────────────────────────────────────────────────────┐
│  Logging + Detection                                                         │
│  ├── Cloud Audit Logs                                                        │
│  ├── Application audit logs                                                  │
│  ├── Security Command Center                                                 │
│  ├── Anomaly detection                                                       │
│  └── Alerting (PagerDuty/Slack)                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Authentication Security

### JWT Implementation

```python
# app/core/security/jwt.py
from datetime import datetime, timedelta
from typing import Optional
import jwt
from cryptography.fernet import Fernet

from app.config import settings

class JWTService:
    """Secure JWT token management."""

    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 15
    REFRESH_TOKEN_EXPIRE_DAYS = 30

    def __init__(self):
        self.secret_key = settings.JWT_SECRET_KEY
        self.refresh_secret = settings.JWT_REFRESH_SECRET_KEY

    def create_access_token(
        self,
        user_id: str,
        organization_id: str,
        role: str,
        scopes: list[str]
    ) -> str:
        """Create short-lived access token."""
        now = datetime.utcnow()
        payload = {
            "sub": user_id,
            "org": organization_id,
            "role": role,
            "scopes": scopes,
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES),
            "jti": self._generate_jti()  # Unique token ID for revocation
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.ALGORITHM)

    def create_refresh_token(
        self,
        user_id: str,
        device_id: Optional[str] = None
    ) -> str:
        """Create long-lived refresh token."""
        now = datetime.utcnow()
        payload = {
            "sub": user_id,
            "type": "refresh",
            "device": device_id,
            "iat": now,
            "exp": now + timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS),
            "jti": self._generate_jti()
        }
        return jwt.encode(payload, self.refresh_secret, algorithm=self.ALGORITHM)

    def verify_access_token(self, token: str) -> dict:
        """Verify and decode access token."""
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.ALGORITHM],
                options={
                    "require": ["sub", "org", "exp", "iat", "jti"],
                    "verify_exp": True
                }
            )

            # Check if token is revoked
            if self._is_token_revoked(payload["jti"]):
                raise jwt.InvalidTokenError("Token has been revoked")

            return payload

        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.InvalidTokenError as e:
            raise AuthenticationError(f"Invalid token: {e}")

    def revoke_token(self, jti: str, expires_at: datetime):
        """Add token to revocation list (stored in Redis)."""
        ttl = int((expires_at - datetime.utcnow()).total_seconds())
        if ttl > 0:
            redis.setex(f"revoked_token:{jti}", ttl, "1")

    def revoke_all_user_tokens(self, user_id: str):
        """Revoke all tokens for a user (logout everywhere)."""
        # Increment user's token version
        redis.incr(f"token_version:{user_id}")

    def _is_token_revoked(self, jti: str) -> bool:
        return redis.exists(f"revoked_token:{jti}")

    def _generate_jti(self) -> str:
        return secrets.token_urlsafe(32)
```

### Password Security

```python
# app/core/security/password.py
import bcrypt
import secrets
import re
from typing import Tuple

class PasswordService:
    """Secure password hashing and validation."""

    # Password requirements
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = False  # Optional but recommended

    # bcrypt cost factor (12 = ~250ms on modern hardware)
    BCRYPT_ROUNDS = 12

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt."""
        self._validate_password_strength(password)
        salt = bcrypt.gensalt(rounds=self.BCRYPT_ROUNDS)
        return bcrypt.hashpw(password.encode(), salt).decode()

    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash."""
        return bcrypt.checkpw(password.encode(), hashed.encode())

    def _validate_password_strength(self, password: str) -> None:
        """Validate password meets security requirements."""
        errors = []

        if len(password) < self.MIN_LENGTH:
            errors.append(f"Password must be at least {self.MIN_LENGTH} characters")

        if len(password) > self.MAX_LENGTH:
            errors.append(f"Password must be at most {self.MAX_LENGTH} characters")

        if self.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")

        if self.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")

        if self.REQUIRE_DIGIT and not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")

        # Check against common passwords
        if self._is_common_password(password):
            errors.append("Password is too common")

        if errors:
            raise ValidationError("Password requirements not met", {"password": errors})

    def _is_common_password(self, password: str) -> bool:
        """Check against list of common passwords."""
        # Load from file or use a set
        common_passwords = {"password", "123456", "password123", ...}
        return password.lower() in common_passwords

    def generate_reset_token(self) -> Tuple[str, str]:
        """Generate password reset token (token, hash)."""
        token = secrets.token_urlsafe(32)
        token_hash = self.hash_password(token)
        return token, token_hash
```

### Multi-Factor Authentication (MFA)

```python
# app/core/security/mfa.py
import pyotp
import qrcode
import io
import base64
from typing import Tuple

class MFAService:
    """Time-based One-Time Password (TOTP) MFA."""

    ISSUER_NAME = "AdsMaster"

    def generate_secret(self) -> str:
        """Generate new MFA secret for user."""
        return pyotp.random_base32()

    def get_provisioning_uri(
        self,
        secret: str,
        user_email: str
    ) -> str:
        """Get URI for authenticator app."""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(
            name=user_email,
            issuer_name=self.ISSUER_NAME
        )

    def generate_qr_code(
        self,
        secret: str,
        user_email: str
    ) -> str:
        """Generate QR code as base64 image."""
        uri = self.get_provisioning_uri(secret, user_email)

        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")

        return base64.b64encode(buffer.getvalue()).decode()

    def verify_code(self, secret: str, code: str) -> bool:
        """Verify MFA code."""
        totp = pyotp.TOTP(secret)
        # Allow 1 time step tolerance (30 seconds)
        return totp.verify(code, valid_window=1)

    def generate_backup_codes(self, count: int = 10) -> list[str]:
        """Generate one-time backup codes."""
        return [secrets.token_hex(4).upper() for _ in range(count)]
```

---

## 2. OAuth Token Security

### Encrypted Token Storage

```python
# app/core/security/encryption.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from google.cloud import kms
import base64
import os

class EncryptionService:
    """
    Application-level encryption for sensitive data.
    Uses envelope encryption with Cloud KMS.
    """

    def __init__(self):
        self.kms_client = kms.KeyManagementServiceClient()
        self.key_name = (
            f"projects/{settings.GCP_PROJECT_ID}/"
            f"locations/{settings.GCP_LOCATION}/"
            f"keyRings/adsmaster-keys/"
            f"cryptoKeys/oauth-token-key"
        )

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt data using envelope encryption.
        1. Generate a Data Encryption Key (DEK)
        2. Encrypt data with DEK
        3. Encrypt DEK with Cloud KMS
        4. Store encrypted DEK + encrypted data
        """
        # Generate random DEK
        dek = Fernet.generate_key()
        f = Fernet(dek)

        # Encrypt the data
        encrypted_data = f.encrypt(plaintext.encode())

        # Encrypt the DEK with Cloud KMS
        encrypted_dek = self.kms_client.encrypt(
            request={
                "name": self.key_name,
                "plaintext": dek
            }
        ).ciphertext

        # Combine: encrypted_dek_length (4 bytes) + encrypted_dek + encrypted_data
        dek_length = len(encrypted_dek).to_bytes(4, byteorder='big')
        combined = dek_length + encrypted_dek + encrypted_data

        return base64.b64encode(combined).decode()

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt data using envelope encryption."""
        combined = base64.b64decode(ciphertext.encode())

        # Extract components
        dek_length = int.from_bytes(combined[:4], byteorder='big')
        encrypted_dek = combined[4:4+dek_length]
        encrypted_data = combined[4+dek_length:]

        # Decrypt DEK with Cloud KMS
        dek = self.kms_client.decrypt(
            request={
                "name": self.key_name,
                "ciphertext": encrypted_dek
            }
        ).plaintext

        # Decrypt data with DEK
        f = Fernet(dek)
        return f.decrypt(encrypted_data).decode()


class OAuthTokenEncryption:
    """Specialized encryption for OAuth tokens."""

    def __init__(self, encryption_service: EncryptionService):
        self.encryption = encryption_service

    def encrypt_tokens(
        self,
        access_token: str,
        refresh_token: str
    ) -> Tuple[str, str]:
        """Encrypt OAuth tokens."""
        return (
            self.encryption.encrypt(access_token),
            self.encryption.encrypt(refresh_token)
        )

    def decrypt_access_token(self, encrypted: str) -> str:
        """Decrypt access token."""
        return self.encryption.decrypt(encrypted)

    def decrypt_refresh_token(self, encrypted: str) -> str:
        """Decrypt refresh token."""
        return self.encryption.decrypt(encrypted)
```

### Token Rotation

```python
# app/services/oauth_service.py
class OAuthService:
    """Secure OAuth token management."""

    # Refresh token 5 minutes before expiry
    REFRESH_BUFFER_MINUTES = 5

    async def get_valid_token(self, ad_account_id: str) -> str:
        """Get valid access token, refreshing if needed."""
        token = await self.token_repo.get_active(ad_account_id)

        if not token:
            raise AuthenticationError("No valid token found")

        # Check if token needs refresh
        if self._needs_refresh(token):
            token = await self._refresh_token(token)

        return self.encryption.decrypt_access_token(token.access_token_encrypted)

    def _needs_refresh(self, token) -> bool:
        """Check if token should be refreshed."""
        if not token.access_token_expires_at:
            return False

        buffer = timedelta(minutes=self.REFRESH_BUFFER_MINUTES)
        return datetime.utcnow() + buffer >= token.access_token_expires_at

    async def _refresh_token(self, token) -> OAuthToken:
        """Refresh OAuth token with platform."""
        refresh_token = self.encryption.decrypt_refresh_token(
            token.refresh_token_encrypted
        )

        # Call platform OAuth endpoint
        if token.ad_account.platform == "google_ads":
            new_tokens = await self.google_auth.refresh_token(refresh_token)
        elif token.ad_account.platform == "meta":
            new_tokens = await self.meta_auth.refresh_token(refresh_token)

        # Encrypt and store new tokens
        encrypted_access, encrypted_refresh = self.encryption.encrypt_tokens(
            new_tokens["access_token"],
            new_tokens.get("refresh_token", refresh_token)
        )

        return await self.token_repo.update(token.id, {
            "access_token_encrypted": encrypted_access,
            "refresh_token_encrypted": encrypted_refresh,
            "access_token_expires_at": datetime.utcnow() + timedelta(
                seconds=new_tokens["expires_in"]
            ),
            "refresh_count": token.refresh_count + 1,
            "last_refresh_at": datetime.utcnow()
        })
```

---

## 3. API Security

### Input Validation

```python
# app/core/security/validation.py
from pydantic import BaseModel, validator, constr, EmailStr
from typing import Optional
import re
import bleach

class SecureBaseModel(BaseModel):
    """Base model with security validations."""

    class Config:
        # Forbid extra fields (prevent mass assignment)
        extra = "forbid"
        # Strip whitespace
        anystr_strip_whitespace = True

    @validator('*', pre=True)
    def sanitize_strings(cls, v):
        """Sanitize all string inputs."""
        if isinstance(v, str):
            # Remove null bytes
            v = v.replace('\x00', '')
            # Limit length to prevent DoS
            v = v[:10000]
        return v


class CreateCampaignRequest(SecureBaseModel):
    """Example secure request model."""

    name: constr(min_length=1, max_length=255)
    budget_amount: int  # Always use int for money (micros)

    @validator('name')
    def sanitize_name(cls, v):
        # Remove HTML/scripts
        return bleach.clean(v, tags=[], strip=True)

    @validator('budget_amount')
    def validate_budget(cls, v):
        if v < 0:
            raise ValueError("Budget cannot be negative")
        if v > 1_000_000_000_000:  # $1M max
            raise ValueError("Budget exceeds maximum")
        return v
```

### SQL Injection Prevention

```python
# app/repositories/base.py
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

class SecureRepository:
    """Repository with SQL injection prevention."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def search_campaigns(
        self,
        account_id: str,
        search_term: str,
        status: list[str]
    ):
        """
        SECURE: Uses parameterized queries.
        """
        # NEVER do this:
        # query = f"SELECT * FROM campaigns WHERE name LIKE '%{search_term}%'"

        # ALWAYS use parameterized queries:
        query = text("""
            SELECT * FROM campaigns
            WHERE ad_account_id = :account_id
            AND name ILIKE :search_pattern
            AND status = ANY(:statuses)
        """)

        result = await self.db.execute(query, {
            "account_id": account_id,
            "search_pattern": f"%{search_term}%",
            "statuses": status
        })

        return result.fetchall()
```

### Rate Limiting

```python
# app/core/security/rate_limit.py
from typing import Tuple
import time
import hashlib

class RateLimiter:
    """
    Multi-tier rate limiting.
    - Per-user limits
    - Per-endpoint limits
    - Global limits
    """

    def __init__(self, redis_client):
        self.redis = redis_client

    async def check_rate_limit(
        self,
        user_id: str,
        endpoint: str,
        plan: str
    ) -> Tuple[bool, dict]:
        """
        Check if request is within rate limits.

        Returns:
            (allowed, headers)
        """
        limits = self._get_limits(plan)
        now = int(time.time())

        # Check all limit types
        checks = [
            self._check_limit(f"user:{user_id}", limits["per_minute"], 60, now),
            self._check_limit(f"user:{user_id}:hour", limits["per_hour"], 3600, now),
            self._check_limit(f"endpoint:{endpoint}", limits["per_endpoint"], 60, now),
        ]

        results = await asyncio.gather(*checks)

        # All checks must pass
        allowed = all(r[0] for r in results)

        # Return most restrictive headers
        headers = min(results, key=lambda r: r[1]["X-RateLimit-Remaining"])[1]

        if not allowed:
            # Log rate limit violation
            await self._log_violation(user_id, endpoint)

        return allowed, headers

    async def _check_limit(
        self,
        key: str,
        limit: int,
        window: int,
        now: int
    ) -> Tuple[bool, dict]:
        """Check single rate limit using sliding window."""
        window_key = f"ratelimit:{key}:{now // window}"

        async with self.redis.pipeline() as pipe:
            pipe.incr(window_key)
            pipe.expire(window_key, window)
            results = await pipe.execute()

        current = results[0]
        remaining = max(0, limit - current)
        reset = (now // window + 1) * window

        headers = {
            "X-RateLimit-Limit": limit,
            "X-RateLimit-Remaining": remaining,
            "X-RateLimit-Reset": reset
        }

        return current <= limit, headers

    def _get_limits(self, plan: str) -> dict:
        """Get rate limits for plan."""
        limits = {
            "free_audit": {"per_minute": 60, "per_hour": 1000, "per_endpoint": 30},
            "starter": {"per_minute": 120, "per_hour": 3000, "per_endpoint": 60},
            "growth": {"per_minute": 300, "per_hour": 10000, "per_endpoint": 150},
            "agency": {"per_minute": 600, "per_hour": 30000, "per_endpoint": 300},
        }
        return limits.get(plan, limits["free_audit"])

    async def _log_violation(self, user_id: str, endpoint: str):
        """Log rate limit violation for security monitoring."""
        logger.warning(
            "Rate limit exceeded",
            extra={
                "user_id": user_id,
                "endpoint": endpoint,
                "severity": "SECURITY"
            }
        )
```

### Security Headers

```python
# app/middleware/security_headers.py
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Prevent XSS
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://js.stripe.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' https://fonts.gstatic.com; "
            "connect-src 'self' https://api.stripe.com wss:; "
            "frame-src https://js.stripe.com https://hooks.stripe.com; "
        )

        # HTTPS enforcement
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions policy
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
            "magnetometer=(), microphone=(), payment=(self), usb=()"
        )

        return response
```

---

## 4. Data Protection

### Row-Level Security (PostgreSQL)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their organization's data
CREATE POLICY organization_isolation ON campaigns
    FOR ALL
    USING (
        ad_account_id IN (
            SELECT id FROM ad_accounts
            WHERE organization_id = current_setting('app.current_organization_id')::uuid
        )
    );

-- Policy: Only account admins can see OAuth tokens
CREATE POLICY token_admin_only ON oauth_tokens
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ad_account_permissions
            WHERE ad_account_id = oauth_tokens.ad_account_id
            AND user_id = current_setting('app.current_user_id')::uuid
            AND permission_level = 'admin'
        )
    );

-- Set session variables in application
-- db.execute("SET app.current_organization_id = :org_id", {"org_id": org_id})
-- db.execute("SET app.current_user_id = :user_id", {"user_id": user_id})
```

### PII Handling

```python
# app/core/security/pii.py
import hashlib
from typing import Optional

class PIIHandler:
    """Handle Personally Identifiable Information securely."""

    # Fields considered PII
    PII_FIELDS = [
        "email",
        "phone_number",
        "billing_address",
        "ip_address",
        "full_name"
    ]

    def __init__(self, encryption_service: EncryptionService):
        self.encryption = encryption_service

    def encrypt_pii(self, data: dict) -> dict:
        """Encrypt PII fields in a dictionary."""
        result = data.copy()
        for field in self.PII_FIELDS:
            if field in result and result[field]:
                result[f"{field}_encrypted"] = self.encryption.encrypt(result[field])
                result[f"{field}_hash"] = self._hash_for_lookup(result[field])
                del result[field]
        return result

    def decrypt_pii(self, data: dict) -> dict:
        """Decrypt PII fields."""
        result = data.copy()
        for field in self.PII_FIELDS:
            encrypted_field = f"{field}_encrypted"
            if encrypted_field in result and result[encrypted_field]:
                result[field] = self.encryption.decrypt(result[encrypted_field])
                del result[encrypted_field]
                del result[f"{field}_hash"]
        return result

    def _hash_for_lookup(self, value: str) -> str:
        """Create hash for lookup without decryption."""
        return hashlib.sha256(
            (value.lower() + settings.PII_HASH_SALT).encode()
        ).hexdigest()

    async def find_by_email(self, email: str) -> Optional[User]:
        """Find user by email without decrypting all emails."""
        email_hash = self._hash_for_lookup(email)
        return await self.user_repo.find_by_email_hash(email_hash)
```

### Data Retention & Deletion

```python
# app/services/data_retention_service.py
class DataRetentionService:
    """Manage data retention and deletion (GDPR compliance)."""

    RETENTION_POLICIES = {
        "campaign_metrics_hourly": timedelta(days=7),
        "campaign_metrics_daily": timedelta(days=365 * 3),  # 3 years
        "search_terms": timedelta(days=90),
        "ai_messages": timedelta(days=365),
        "audit_logs": timedelta(days=365 * 2),  # 2 years
        "sync_jobs": timedelta(days=30),
    }

    async def run_retention_cleanup(self):
        """Delete data past retention period."""
        for table, retention in self.RETENTION_POLICIES.items():
            cutoff = datetime.utcnow() - retention

            await self.db.execute(
                text(f"""
                    DELETE FROM {table}
                    WHERE created_at < :cutoff
                """),
                {"cutoff": cutoff}
            )

            logger.info(f"Cleaned up {table} older than {cutoff}")

    async def delete_user_data(self, user_id: str) -> dict:
        """
        GDPR Right to Erasure: Delete all user data.
        """
        deleted = {}

        # 1. Delete user's organizations (cascades to ad accounts, campaigns, etc.)
        orgs = await self.org_repo.get_owned_by_user(user_id)
        for org in orgs:
            await self._delete_organization_data(org.id)
            deleted["organizations"] = deleted.get("organizations", 0) + 1

        # 2. Remove user from other organizations
        memberships = await self.membership_repo.get_by_user(user_id)
        for membership in memberships:
            await self.membership_repo.delete(membership.id)
            deleted["memberships"] = deleted.get("memberships", 0) + 1

        # 3. Delete AI conversations
        conversations = await self.ai_repo.get_user_conversations(user_id)
        for conv in conversations:
            await self.ai_repo.delete_conversation(conv.id)
            deleted["ai_conversations"] = deleted.get("ai_conversations", 0) + 1

        # 4. Delete user record
        await self.user_repo.hard_delete(user_id)
        deleted["user"] = 1

        # 5. Log deletion (anonymized)
        await self.audit_log.log(
            action="user_data_deleted",
            user_id_hash=hashlib.sha256(user_id.encode()).hexdigest(),
            deleted_counts=deleted
        )

        return deleted

    async def export_user_data(self, user_id: str) -> dict:
        """
        GDPR Right to Data Portability: Export all user data.
        """
        export = {
            "exported_at": datetime.utcnow().isoformat(),
            "user": await self._export_user(user_id),
            "organizations": [],
            "ad_accounts": [],
            "campaigns": [],
            "ai_conversations": []
        }

        # Export all related data
        orgs = await self.org_repo.get_by_user(user_id)
        for org in orgs:
            export["organizations"].append(await self._export_organization(org.id))

        # ... export other data

        return export
```

---

## 5. Infrastructure Security

### GCP Security Configuration

```yaml
# terraform/security.tf (conceptual)

# Enable Security Command Center
resource "google_project_service" "security_center" {
  service = "securitycenter.googleapis.com"
}

# Cloud Armor WAF Policy
resource "google_compute_security_policy" "adsmaster_waf" {
  name = "adsmaster-waf-policy"

  # Block known bad actors
  rule {
    action   = "deny(403)"
    priority = 1000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-stable')"
      }
    }
    description = "Block XSS attacks"
  }

  rule {
    action   = "deny(403)"
    priority = 1001
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-stable')"
      }
    }
    description = "Block SQL injection"
  }

  # Rate limiting
  rule {
    action   = "rate_based_ban"
    priority = 2000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      rate_limit_threshold {
        count        = 1000
        interval_sec = 60
      }
    }
    description = "Rate limit all traffic"
  }

  # Default allow
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow"
  }
}

# VPC for private services
resource "google_compute_network" "private_vpc" {
  name                    = "adsmaster-private-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "private_subnet" {
  name          = "adsmaster-private-subnet"
  ip_cidr_range = "10.0.0.0/24"
  network       = google_compute_network.private_vpc.id
  region        = "us-central1"

  private_ip_google_access = true
}

# Private Cloud SQL
resource "google_sql_database_instance" "main" {
  name             = "adsmaster-db"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier = "db-custom-2-8192"

    ip_configuration {
      ipv4_enabled    = false  # No public IP
      private_network = google_compute_network.private_vpc.id
      require_ssl     = true
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = 30
      }
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }
  }
}

# Cloud KMS for encryption keys
resource "google_kms_key_ring" "adsmaster_keys" {
  name     = "adsmaster-keys"
  location = "us-central1"
}

resource "google_kms_crypto_key" "oauth_token_key" {
  name     = "oauth-token-key"
  key_ring = google_kms_key_ring.adsmaster_keys.id

  rotation_period = "7776000s"  # 90 days

  lifecycle {
    prevent_destroy = true
  }
}
```

### Secret Management

```python
# app/core/security/secrets.py
from google.cloud import secretmanager

class SecretManager:
    """Securely manage application secrets."""

    def __init__(self):
        self.client = secretmanager.SecretManagerServiceClient()
        self.project_id = settings.GCP_PROJECT_ID

    def get_secret(self, secret_name: str) -> str:
        """Retrieve secret from Secret Manager."""
        name = f"projects/{self.project_id}/secrets/{secret_name}/versions/latest"
        response = self.client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")

    def create_secret(self, secret_name: str, value: str) -> str:
        """Create new secret."""
        parent = f"projects/{self.project_id}"

        # Create secret
        secret = self.client.create_secret(
            request={
                "parent": parent,
                "secret_id": secret_name,
                "secret": {"replication": {"automatic": {}}},
            }
        )

        # Add version
        self.client.add_secret_version(
            request={
                "parent": secret.name,
                "payload": {"data": value.encode("UTF-8")},
            }
        )

        return secret.name

# Usage in config
class Settings:
    @property
    def jwt_secret_key(self) -> str:
        if settings.APP_ENV == "production":
            return SecretManager().get_secret("jwt-secret-key")
        return os.environ.get("JWT_SECRET_KEY")
```

---

## 6. Audit Logging

### Comprehensive Audit Log

```python
# app/core/security/audit.py
from enum import Enum
from typing import Optional, Any
import json

class AuditAction(Enum):
    # Authentication
    LOGIN_SUCCESS = "auth.login.success"
    LOGIN_FAILURE = "auth.login.failure"
    LOGOUT = "auth.logout"
    PASSWORD_CHANGE = "auth.password.change"
    MFA_ENABLED = "auth.mfa.enabled"
    MFA_DISABLED = "auth.mfa.disabled"

    # Data access
    DATA_EXPORT = "data.export"
    DATA_DELETE = "data.delete"
    SENSITIVE_VIEW = "data.sensitive.view"

    # Ad account operations
    ACCOUNT_CONNECTED = "account.connected"
    ACCOUNT_DISCONNECTED = "account.disconnected"
    TOKEN_REFRESHED = "account.token.refreshed"

    # Campaign changes
    CAMPAIGN_CREATED = "campaign.created"
    CAMPAIGN_UPDATED = "campaign.updated"
    CAMPAIGN_PAUSED = "campaign.paused"
    BUDGET_CHANGED = "campaign.budget.changed"

    # AI operations
    RECOMMENDATION_APPROVED = "ai.recommendation.approved"
    RECOMMENDATION_REJECTED = "ai.recommendation.rejected"
    AUTOMATION_EXECUTED = "ai.automation.executed"

    # Admin operations
    USER_INVITED = "admin.user.invited"
    USER_REMOVED = "admin.user.removed"
    ROLE_CHANGED = "admin.role.changed"
    PLAN_CHANGED = "billing.plan.changed"

class AuditLogger:
    """Log all security-relevant events."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        action: AuditAction,
        user_id: Optional[str],
        organization_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        old_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[dict] = None,
        severity: str = "INFO"
    ):
        """Create audit log entry."""
        entry = AuditLogEntry(
            id=uuid4(),
            timestamp=datetime.utcnow(),
            action=action.value,
            user_id=user_id,
            organization_id=organization_id,
            resource_type=resource_type,
            resource_id=resource_id,
            old_value=json.dumps(old_value) if old_value else None,
            new_value=json.dumps(new_value) if new_value else None,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata or {},
            severity=severity
        )

        self.db.add(entry)
        await self.db.flush()

        # Also log to Cloud Logging for real-time monitoring
        logger.info(
            f"AUDIT: {action.value}",
            extra={
                "audit": True,
                "action": action.value,
                "user_id": user_id,
                "resource": f"{resource_type}:{resource_id}",
                "severity": severity
            }
        )

        # Alert on critical events
        if severity == "CRITICAL":
            await self._alert_security_team(entry)

    async def _alert_security_team(self, entry: AuditLogEntry):
        """Send immediate alert for critical security events."""
        await notification_service.send_slack(
            channel="#security-alerts",
            message=f"🚨 Critical security event: {entry.action}",
            details={
                "user_id": entry.user_id,
                "resource": f"{entry.resource_type}:{entry.resource_id}",
                "timestamp": entry.timestamp.isoformat()
            }
        )
```

### Audit Log Queries

```sql
-- Security audit queries

-- Failed login attempts in last hour
SELECT
    ip_address,
    COUNT(*) as attempts,
    array_agg(DISTINCT metadata->>'email') as emails_attempted
FROM audit_logs
WHERE action = 'auth.login.failure'
    AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY attempts DESC;

-- All actions by a specific user
SELECT
    timestamp,
    action,
    resource_type,
    resource_id,
    ip_address
FROM audit_logs
WHERE user_id = :user_id
ORDER BY timestamp DESC
LIMIT 100;

-- Sensitive data access
SELECT
    user_id,
    action,
    resource_type,
    resource_id,
    timestamp
FROM audit_logs
WHERE action IN ('data.export', 'data.sensitive.view')
    AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Budget changes over $1000
SELECT
    user_id,
    resource_id as campaign_id,
    old_value,
    new_value,
    timestamp
FROM audit_logs
WHERE action = 'campaign.budget.changed'
    AND (new_value::jsonb->>'amount')::numeric > 1000000000  -- $1000 in micros
ORDER BY timestamp DESC;
```

---

## 7. Compliance Checklist

### GDPR Compliance

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Lawful basis for processing | Consent at signup + contract | ✅ |
| Right to access | Data export endpoint | ✅ |
| Right to rectification | Profile edit endpoint | ✅ |
| Right to erasure | Account deletion endpoint | ✅ |
| Right to data portability | JSON export | ✅ |
| Data minimization | Only collect necessary data | ✅ |
| Privacy by design | Encryption, RLS, PII handling | ✅ |
| Data breach notification | Incident response plan | ✅ |
| DPO appointment | Required if >250 employees | ⏳ |
| Records of processing | Audit logs | ✅ |

### SOC 2 Readiness (Future)

| Control | Description | Priority |
|---------|-------------|----------|
| CC6.1 | Logical access controls | P0 |
| CC6.2 | Authentication mechanisms | P0 |
| CC6.3 | Authorization controls | P0 |
| CC7.1 | System monitoring | P1 |
| CC7.2 | Anomaly detection | P1 |
| CC8.1 | Change management | P1 |
| A1.2 | Backup procedures | P0 |
| C1.1 | Confidentiality policies | P0 |
| PI1.1 | Privacy notice | P0 |

---

## 8. Incident Response

### Security Incident Playbook

```yaml
incident_response:
  severity_levels:
    critical:
      description: "Active breach, data exfiltration, service down"
      response_time: "15 minutes"
      notification:
        - on_call_engineer
        - security_team
        - cto
        - legal (if data breach)
      actions:
        - isolate_affected_systems
        - preserve_evidence
        - assess_scope
        - notify_affected_users (if required)

    high:
      description: "Potential breach, vulnerability exploited"
      response_time: "1 hour"
      notification:
        - on_call_engineer
        - security_team
      actions:
        - investigate
        - patch_vulnerability
        - monitor_for_exploitation

    medium:
      description: "Security vulnerability discovered, no exploitation"
      response_time: "24 hours"
      notification:
        - security_team
      actions:
        - assess_risk
        - plan_remediation
        - implement_fix

    low:
      description: "Minor security issue, best practice violation"
      response_time: "1 week"
      notification:
        - development_team
      actions:
        - document_issue
        - schedule_fix

  playbooks:
    data_breach:
      1: "Contain - Isolate affected systems"
      2: "Assess - Determine scope and data affected"
      3: "Notify - Inform users within 72 hours (GDPR)"
      4: "Investigate - Root cause analysis"
      5: "Remediate - Fix vulnerability"
      6: "Report - Document incident"

    credential_leak:
      1: "Rotate all affected credentials immediately"
      2: "Revoke all OAuth tokens for affected accounts"
      3: "Force password reset for users"
      4: "Audit logs for unauthorized access"
      5: "Notify affected users"

    ddos_attack:
      1: "Enable Cloud Armor enhanced protection"
      2: "Increase rate limiting"
      3: "Block attacking IPs"
      4: "Scale infrastructure if needed"
      5: "Monitor until attack subsides"
```

---

## Summary

### Security Measures

| Layer | Protection |
|-------|------------|
| Edge | Cloud Armor WAF, DDoS protection |
| Network | VPC, private services, firewall rules |
| Application | JWT, RBAC, input validation, rate limiting |
| Data | AES-256 encryption, RLS, PII handling |
| Audit | Comprehensive logging, monitoring, alerting |

### Compliance

| Standard | Status |
|----------|--------|
| GDPR | Ready |
| CCPA | Ready |
| SOC 2 | Roadmap |
| PCI DSS | Via Stripe |

---

*Document Version: 1.0*
*Created: March 2026*
*Status: READY FOR REVIEW*
