# Phase 3: API Design Plan

## Executive Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **API Style** | REST + WebSocket | REST for CRUD, WebSocket for real-time |
| **Framework** | FastAPI (Python) | Automatic OpenAPI, async, type hints |
| **Auth** | JWT + OAuth2 | Industry standard, stateless |
| **Versioning** | URL path (`/api/v1/`) | Clear, cacheable |
| **Rate Limiting** | Token bucket (Redis) | Per-user, per-endpoint |
| **Documentation** | Auto-generated OpenAPI | Swagger UI built-in |

---

## API Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│                                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│   │  Web App     │    │  Mobile App  │    │  Third-Party │                  │
│   │  (Next.js)   │    │  (Future)    │    │  Integrations│                  │
│   └──────────────┘    └──────────────┘    └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY LAYER                                  │
│                                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│   │  Cloud Run   │    │  Load        │    │  Cloud       │                  │
│   │  (FastAPI)   │◄───│  Balancer    │◄───│  CDN         │                  │
│   └──────────────┘    └──────────────┘    └──────────────┘                  │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────────────────────────────────────────────────┐              │
│   │                    MIDDLEWARE STACK                       │              │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │              │
│   │  │  Auth   │ │  Rate   │ │  CORS   │ │ Logging │        │              │
│   │  │  JWT    │ │  Limit  │ │         │ │         │        │              │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │              │
│   └──────────────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API ENDPOINTS                                      │
│                                                                              │
│   /api/v1/auth/*           Authentication & session management               │
│   /api/v1/users/*          User profile & preferences                        │
│   /api/v1/organizations/*  Organization & team management                    │
│   /api/v1/billing/*        Subscriptions, plans, invoices                    │
│   /api/v1/accounts/*       Ad account connections                            │
│   /api/v1/campaigns/*      Campaign management                               │
│   /api/v1/metrics/*        Performance data & analytics                      │
│   /api/v1/ai/*             AI chat, recommendations                          │
│   /api/v1/reports/*        Reports & exports                                 │
│   /api/v1/webhooks/*       Incoming webhooks                                 │
│   /ws/v1/*                 WebSocket connections                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication & Authorization

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION METHODS                               │
└─────────────────────────────────────────────────────────────────────────────┘

METHOD 1: Email/Password (Primary)
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────►│  Login   │────►│  Verify  │────►│  Issue   │
│  Input   │     │  Request │     │  Password│     │  JWT     │
└──────────┘     └──────────┘     └──────────┘     └──────────┘

METHOD 2: Google OAuth (Social Login)
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Click   │────►│  Redirect│────►│  Callback│────►│  Issue   │
│  Google  │     │  to OAuth│     │  + Verify│     │  JWT     │
└──────────┘     └──────────┘     └──────────┘     └──────────┘

METHOD 3: API Key (External Integrations)
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Header  │────►│  Validate│────►│  Allow   │
│  X-API-Key     │  Key     │     │  Request │
└──────────┘     └──────────┘     └──────────┘
```

### JWT Token Structure

```python
# Access Token (short-lived: 15 minutes)
{
    "sub": "user_uuid",                      # User ID
    "org": "organization_uuid",              # Current organization
    "role": "admin",                         # Role in organization
    "scopes": ["read", "write", "admin"],    # Permissions
    "type": "access",
    "iat": 1709424000,                       # Issued at
    "exp": 1709424900                        # Expires (15 min)
}

# Refresh Token (long-lived: 30 days)
{
    "sub": "user_uuid",
    "type": "refresh",
    "jti": "unique_token_id",                # For revocation
    "iat": 1709424000,
    "exp": 1712016000                        # Expires (30 days)
}
```

### Authorization Levels

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSION HIERARCHY                                 │
└─────────────────────────────────────────────────────────────────────────────┘

LEVEL 1: SYSTEM
├── Super Admin (platform owner)
│   └── Full access to everything

LEVEL 2: ORGANIZATION
├── Owner
│   └── Full org access, billing, delete org
├── Admin
│   └── Manage members, all ad accounts
├── Member
│   └── Assigned ad accounts only
└── Viewer
    └── Read-only access

LEVEL 3: AD ACCOUNT
├── Admin
│   └── Full account access, settings, connect/disconnect
├── Editor
│   └── Manage campaigns, approve AI recommendations
└── Viewer
    └── View metrics and reports only

LEVEL 4: CAMPAIGN (granular)
├── Edit
│   └── Modify this specific campaign
└── View
    └── View this campaign only
```

### Permission Checking

```python
# Example: Check if user can edit a campaign
async def check_campaign_permission(
    user_id: UUID,
    campaign_id: UUID,
    required_permission: str  # "view" | "edit" | "admin"
) -> bool:

    # 1. Check direct campaign permission
    campaign_perm = await db.fetch_one("""
        SELECT permission_level FROM campaign_permissions
        WHERE user_id = $1 AND campaign_id = $2
    """, user_id, campaign_id)

    if campaign_perm and has_permission(campaign_perm.level, required_permission):
        return True

    # 2. Check ad account permission (with inheritance)
    account_perm = await db.fetch_one("""
        SELECT aap.permission_level, aap.inherit_to_campaigns
        FROM ad_account_permissions aap
        JOIN campaigns c ON c.ad_account_id = aap.ad_account_id
        WHERE aap.user_id = $1 AND c.id = $2
    """, user_id, campaign_id)

    if account_perm and account_perm.inherit_to_campaigns:
        if has_permission(account_perm.level, required_permission):
            return True

    # 3. Check organization role
    org_role = await get_user_org_role(user_id, campaign.organization_id)
    if org_role in ['owner', 'admin']:
        return True

    return False
```

---

## API Endpoints Design

### Module 1: Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Create new account | Public |
| POST | `/login` | Email/password login | Public |
| POST | `/logout` | Invalidate tokens | JWT |
| POST | `/refresh` | Get new access token | Refresh Token |
| POST | `/forgot-password` | Request password reset | Public |
| POST | `/reset-password` | Set new password | Reset Token |
| GET | `/oauth/google` | Initiate Google OAuth | Public |
| GET | `/oauth/google/callback` | Google OAuth callback | Public |
| POST | `/verify-email` | Verify email address | Token |
| POST | `/resend-verification` | Resend verification email | JWT |
| GET | `/me` | Get current user | JWT |

#### Request/Response Examples

```yaml
# POST /api/v1/auth/login
Request:
  {
    "email": "user@example.com",
    "password": "secure_password",
    "remember_me": true
  }

Response (200):
  {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "avatar_url": "https://...",
      "organizations": [
        {
          "id": "uuid",
          "name": "My Company",
          "role": "owner"
        }
      ]
    }
  }

Response (401):
  {
    "error": "invalid_credentials",
    "message": "Email or password is incorrect"
  }
```

---

### Module 2: Users (`/api/v1/users`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/me` | Get current user profile | JWT |
| PATCH | `/me` | Update profile | JWT |
| PUT | `/me/password` | Change password | JWT |
| PUT | `/me/preferences` | Update preferences | JWT |
| DELETE | `/me` | Delete account | JWT |
| GET | `/me/organizations` | List user's organizations | JWT |
| GET | `/me/notifications` | Get notifications | JWT |
| PUT | `/me/notifications/:id/read` | Mark as read | JWT |

#### Request/Response Examples

```yaml
# PATCH /api/v1/users/me
Request:
  {
    "name": "John Smith",
    "timezone": "America/New_York",
    "currency": "USD",
    "language": "en"
  }

Response (200):
  {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Smith",
    "timezone": "America/New_York",
    "currency": "USD",
    "language": "en",
    "avatar_url": "https://...",
    "onboarding_completed": true,
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-03-02T14:00:00Z"
  }
```

---

### Module 3: Organizations (`/api/v1/organizations`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/` | List user's organizations | JWT | Any |
| POST | `/` | Create organization | JWT | Any |
| GET | `/:id` | Get organization details | JWT | Member+ |
| PATCH | `/:id` | Update organization | JWT | Admin+ |
| DELETE | `/:id` | Delete organization | JWT | Owner |
| GET | `/:id/members` | List members | JWT | Member+ |
| POST | `/:id/members/invite` | Invite member | JWT | Admin+ |
| DELETE | `/:id/members/:userId` | Remove member | JWT | Admin+ |
| PATCH | `/:id/members/:userId/role` | Change member role | JWT | Owner |
| GET | `/:id/activity` | Activity log | JWT | Admin+ |

#### Request/Response Examples

```yaml
# POST /api/v1/organizations
Request:
  {
    "name": "Acme Marketing Agency",
    "type": "agency",
    "white_label_settings": {
      "primary_color": "#4F46E5",
      "logo_url": "https://...",
      "custom_domain": "dashboard.acme.com"
    }
  }

Response (201):
  {
    "id": "uuid",
    "name": "Acme Marketing Agency",
    "type": "agency",
    "logo_url": null,
    "white_label_settings": {...},
    "created_at": "2026-03-02T14:00:00Z",
    "member_count": 1,
    "ad_account_count": 0
  }

# POST /api/v1/organizations/:id/members/invite
Request:
  {
    "email": "colleague@example.com",
    "role": "member",
    "message": "Join our team!"
  }

Response (201):
  {
    "invitation_id": "uuid",
    "email": "colleague@example.com",
    "role": "member",
    "status": "pending",
    "expires_at": "2026-03-09T14:00:00Z"
  }
```

---

### Module 4: Billing (`/api/v1/billing`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/plans` | List available plans | Public | - |
| GET | `/subscription` | Current subscription | JWT | Member+ |
| POST | `/subscription` | Create subscription | JWT | Owner |
| PATCH | `/subscription` | Change plan | JWT | Owner |
| DELETE | `/subscription` | Cancel subscription | JWT | Owner |
| GET | `/invoices` | List invoices | JWT | Admin+ |
| GET | `/invoices/:id` | Get invoice details | JWT | Admin+ |
| GET | `/invoices/:id/pdf` | Download PDF | JWT | Admin+ |
| POST | `/payment-methods` | Add payment method | JWT | Owner |
| DELETE | `/payment-methods/:id` | Remove payment method | JWT | Owner |
| GET | `/usage` | Current usage stats | JWT | Admin+ |
| POST | `/portal` | Get Stripe portal URL | JWT | Owner |

#### Request/Response Examples

```yaml
# GET /api/v1/billing/plans
Response (200):
  {
    "plans": [
      {
        "id": "free_audit",
        "name": "Free Audit",
        "price_monthly": 0,
        "price_yearly": 0,
        "features": {
          "max_ad_accounts": 1,
          "max_campaigns": 10,
          "ai_chat": true,
          "recommendations": true,
          "auto_apply": false,
          "reports": false,
          "whatsapp_alerts": false
        }
      },
      {
        "id": "growth",
        "name": "Growth",
        "price_monthly": 99,
        "price_yearly": 948,
        "features": {
          "max_ad_accounts": 5,
          "max_campaigns": 100,
          "ai_chat": true,
          "recommendations": true,
          "auto_apply": true,
          "reports": true,
          "whatsapp_alerts": true
        }
      }
      // ...
    ]
  }

# POST /api/v1/billing/subscription
Request:
  {
    "plan_id": "growth",
    "billing_cycle": "yearly",
    "payment_method_id": "pm_xxx"
  }

Response (201):
  {
    "subscription_id": "uuid",
    "stripe_subscription_id": "sub_xxx",
    "plan": {...},
    "status": "active",
    "current_period_start": "2026-03-02T00:00:00Z",
    "current_period_end": "2027-03-02T00:00:00Z"
  }
```

---

### Module 5: Ad Accounts (`/api/v1/accounts`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/` | List ad accounts | JWT | Member+ |
| POST | `/connect/google` | Initiate Google Ads OAuth | JWT | Admin+ |
| POST | `/connect/meta` | Initiate Meta OAuth | JWT | Admin+ |
| POST | `/connect/tiktok` | Initiate TikTok OAuth | JWT | Admin+ |
| GET | `/callback/:platform` | OAuth callback | Token | - |
| GET | `/:id` | Get account details | JWT | Viewer+ |
| PATCH | `/:id` | Update account settings | JWT | Admin+ |
| DELETE | `/:id` | Disconnect account | JWT | Admin+ |
| POST | `/:id/sync` | Trigger manual sync | JWT | Editor+ |
| GET | `/:id/sync-status` | Get sync status | JWT | Viewer+ |
| GET | `/:id/sync-history` | Get sync history | JWT | Viewer+ |

#### Request/Response Examples

```yaml
# GET /api/v1/accounts
Response (200):
  {
    "accounts": [
      {
        "id": "uuid",
        "platform": "google_ads",
        "platform_account_id": "123-456-7890",
        "account_name": "My Google Ads",
        "currency": "USD",
        "timezone": "America/New_York",
        "status": "active",
        "is_manager_account": false,
        "last_sync_at": "2026-03-02T13:45:00Z",
        "sync_enabled": true,
        "metrics_summary": {
          "spend_today": 150.00,
          "spend_month": 2340.00,
          "campaigns_active": 5,
          "health_score": 78
        }
      }
    ],
    "total": 1
  }

# POST /api/v1/accounts/connect/google
Response (200):
  {
    "auth_url": "https://accounts.google.com/o/oauth2/auth?...",
    "state": "random_state_token"
  }

# PATCH /api/v1/accounts/:id
Request:
  {
    "settings": {
      "auto_pause_waste": true,
      "waste_threshold_days": 7,
      "waste_threshold_spend": 50,
      "daily_budget_limit": 500,
      "alert_on_anomaly": true,
      "anomaly_threshold_percent": 50
    },
    "sync_frequency_minutes": 30
  }

Response (200):
  {
    "id": "uuid",
    "settings": {...},
    "sync_frequency_minutes": 30,
    "updated_at": "2026-03-02T14:00:00Z"
  }
```

---

### Module 6: Campaigns (`/api/v1/campaigns`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/` | List campaigns (filterable) | JWT | Viewer+ |
| GET | `/:id` | Get campaign details | JWT | Viewer+ |
| PATCH | `/:id` | Update campaign | JWT | Editor+ |
| POST | `/:id/pause` | Pause campaign | JWT | Editor+ |
| POST | `/:id/enable` | Enable campaign | JWT | Editor+ |
| GET | `/:id/ad-groups` | List ad groups | JWT | Viewer+ |
| GET | `/:id/ads` | List ads | JWT | Viewer+ |
| GET | `/:id/keywords` | List keywords | JWT | Viewer+ |
| PATCH | `/keywords/:id` | Update keyword | JWT | Editor+ |
| POST | `/keywords/:id/pause` | Pause keyword | JWT | Editor+ |
| GET | `/:id/search-terms` | List search terms | JWT | Viewer+ |
| POST | `/:id/negatives` | Add negative keywords | JWT | Editor+ |
| GET | `/:id/audiences` | List audiences | JWT | Viewer+ |

#### Query Parameters (for listing endpoints)

```yaml
# GET /api/v1/campaigns?...
Parameters:
  - account_id: UUID (required)       # Filter by ad account
  - status: string[]                  # enabled, paused, removed
  - campaign_type: string[]           # search, pmax, display, etc.
  - labels: string[]                  # Filter by labels
  - search: string                    # Search by name
  - sort_by: string                   # name, spend, conversions, etc.
  - sort_order: string                # asc, desc
  - page: int                         # Pagination (default: 1)
  - per_page: int                     # Items per page (default: 20, max: 100)
```

#### Request/Response Examples

```yaml
# GET /api/v1/campaigns?account_id=xxx&status=enabled&sort_by=spend&sort_order=desc
Response (200):
  {
    "campaigns": [
      {
        "id": "uuid",
        "ad_account_id": "uuid",
        "platform_campaign_id": "12345678",
        "name": "Brand Campaign - Search",
        "campaign_type": "search",
        "status": "enabled",
        "budget": {
          "amount_micros": 50000000,
          "amount": 50.00,
          "type": "daily"
        },
        "bidding": {
          "strategy": "target_cpa",
          "target_cpa_micros": 15000000,
          "target_cpa": 15.00
        },
        "labels": ["brand", "high-priority"],
        "metrics_today": {
          "impressions": 1250,
          "clicks": 45,
          "spend": 32.50,
          "conversions": 3,
          "ctr": 3.6,
          "cpc": 0.72,
          "cpa": 10.83
        },
        "metrics_30d": {
          "impressions": 42000,
          "clicks": 1680,
          "spend": 980.00,
          "conversions": 89,
          "ctr": 4.0,
          "cpc": 0.58,
          "cpa": 11.01,
          "roas": 4.2
        },
        "health_score": 85,
        "updated_at": "2026-03-02T13:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 12,
      "total_pages": 1
    }
  }

# PATCH /api/v1/campaigns/:id
Request:
  {
    "budget": {
      "amount": 75.00,
      "type": "daily"
    }
  }

Response (200):
  {
    "id": "uuid",
    "budget": {
      "amount_micros": 75000000,
      "amount": 75.00,
      "type": "daily"
    },
    "change_logged": true,
    "synced_to_platform": true,
    "updated_at": "2026-03-02T14:05:00Z"
  }

# GET /api/v1/campaigns/:id/search-terms?date_from=2026-02-01&date_to=2026-03-01
Response (200):
  {
    "search_terms": [
      {
        "id": "uuid",
        "search_term": "best handmade candles",
        "matched_keyword": "handmade candles",
        "match_type": "phrase",
        "impressions": 234,
        "clicks": 12,
        "spend": 8.50,
        "conversions": 1,
        "ctr": 5.13,
        "cpc": 0.71,
        "ai_relevance_score": 92,
        "is_added_as_keyword": false,
        "is_added_as_negative": false,
        "ai_suggestion": "add_as_exact"
      },
      {
        "id": "uuid",
        "search_term": "candle making supplies",
        "matched_keyword": "candles",
        "match_type": "broad",
        "impressions": 567,
        "clicks": 23,
        "spend": 18.40,
        "conversions": 0,
        "ctr": 4.06,
        "cpc": 0.80,
        "ai_relevance_score": 15,
        "is_added_as_keyword": false,
        "is_added_as_negative": false,
        "ai_suggestion": "add_as_negative"
      }
    ],
    "summary": {
      "total_search_terms": 156,
      "suggested_negatives": 23,
      "suggested_keywords": 8,
      "wasted_spend": 145.00
    }
  }
```

---

### Module 7: Metrics & Analytics (`/api/v1/metrics`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/dashboard` | Dashboard summary | JWT | Viewer+ |
| GET | `/campaigns/:id/daily` | Daily metrics | JWT | Viewer+ |
| GET | `/campaigns/:id/hourly` | Hourly metrics (7 days) | JWT | Viewer+ |
| GET | `/campaigns/:id/trends` | Performance trends | JWT | Viewer+ |
| GET | `/account/:id/summary` | Account-level summary | JWT | Viewer+ |
| GET | `/account/:id/breakdown` | Breakdown by dimension | JWT | Viewer+ |
| GET | `/keywords/:id/history` | Keyword performance history | JWT | Viewer+ |
| GET | `/pmax/:id/channels` | PMax channel breakdown | JWT | Viewer+ |
| GET | `/forecasts/spend` | Spend forecast | JWT | Viewer+ |
| GET | `/forecasts/conversions` | Conversion forecast | JWT | Viewer+ |
| GET | `/anomalies` | Detected anomalies | JWT | Viewer+ |
| GET | `/health-score/:id` | Account health score | JWT | Viewer+ |
| GET | `/waste-analysis/:id` | Waste analysis | JWT | Viewer+ |

#### Request/Response Examples

```yaml
# GET /api/v1/metrics/dashboard?account_id=xxx
Response (200):
  {
    "period": {
      "from": "2026-03-01",
      "to": "2026-03-02",
      "comparison_from": "2026-02-01",
      "comparison_to": "2026-02-28"
    },
    "summary": {
      "spend": {
        "current": 2340.00,
        "previous": 2150.00,
        "change_percent": 8.8,
        "trend": "up"
      },
      "conversions": {
        "current": 156,
        "previous": 132,
        "change_percent": 18.2,
        "trend": "up"
      },
      "cpa": {
        "current": 15.00,
        "previous": 16.29,
        "change_percent": -7.9,
        "trend": "down"  # down is good for CPA
      },
      "roas": {
        "current": 4.2,
        "previous": 3.8,
        "change_percent": 10.5,
        "trend": "up"
      }
    },
    "health_score": {
      "overall": 78,
      "breakdown": {
        "waste": 8,
        "targeting": 7,
        "ad_quality": 9,
        "budget_efficiency": 8,
        "roi": 9,
        "keyword_health": 6,
        "tracking": 10,
        "competitive": 7
      }
    },
    "alerts": {
      "critical": 1,
      "warning": 3,
      "opportunity": 5
    },
    "top_campaigns": [...],
    "waste_summary": {
      "total_wasted": 145.00,
      "wasted_keywords": 23,
      "wasted_search_terms": 56
    }
  }

# GET /api/v1/metrics/campaigns/:id/daily?from=2026-02-01&to=2026-03-01
Response (200):
  {
    "campaign_id": "uuid",
    "campaign_name": "Brand Campaign - Search",
    "metrics": [
      {
        "date": "2026-02-01",
        "impressions": 1450,
        "clicks": 52,
        "cost_micros": 35200000,
        "cost": 35.20,
        "conversions": 4,
        "conversion_value": 180.00,
        "ctr": 3.59,
        "cpc": 0.68,
        "cpa": 8.80,
        "roas": 5.11
      },
      // ... more days
    ],
    "totals": {
      "impressions": 42000,
      "clicks": 1680,
      "cost": 980.00,
      "conversions": 89,
      "conversion_value": 4116.00,
      "avg_ctr": 4.0,
      "avg_cpc": 0.58,
      "avg_cpa": 11.01,
      "roas": 4.2
    }
  }

# GET /api/v1/metrics/forecasts/spend?account_id=xxx&horizon=30
Response (200):
  {
    "model": "ARIMA_PLUS",
    "trained_on_days": 365,
    "forecast": [
      {
        "date": "2026-03-03",
        "predicted_spend": 78.50,
        "confidence_interval": {
          "lower": 65.00,
          "upper": 92.00
        },
        "confidence_level": 0.95
      },
      // ... 30 days
    ],
    "monthly_total": {
      "predicted": 2340.00,
      "confidence_interval": {
        "lower": 2100.00,
        "upper": 2580.00
      }
    },
    "insight": "Based on current trends, expected spend for March 2026 is $2,340 (90% confidence: $2,100 - $2,580)"
  }

# GET /api/v1/metrics/pmax/:id/channels?from=2026-02-01&to=2026-03-01
Response (200):
  {
    "campaign_id": "uuid",
    "campaign_name": "PMax - Ecommerce",
    "period": { "from": "2026-02-01", "to": "2026-03-01" },
    "channels": [
      {
        "channel": "search",
        "impressions": 15000,
        "clicks": 750,
        "cost": 450.00,
        "conversions": 45,
        "conversion_value": 2250.00,
        "share_of_spend": 45,
        "roas": 5.0
      },
      {
        "channel": "youtube",
        "impressions": 50000,
        "clicks": 500,
        "cost": 200.00,
        "conversions": 10,
        "conversion_value": 400.00,
        "share_of_spend": 20,
        "roas": 2.0
      },
      {
        "channel": "display",
        "impressions": 100000,
        "clicks": 300,
        "cost": 150.00,
        "conversions": 5,
        "conversion_value": 200.00,
        "share_of_spend": 15,
        "roas": 1.33
      },
      {
        "channel": "discover",
        "impressions": 30000,
        "clicks": 200,
        "cost": 100.00,
        "conversions": 8,
        "conversion_value": 320.00,
        "share_of_spend": 10,
        "roas": 3.2
      },
      {
        "channel": "gmail",
        "impressions": 20000,
        "clicks": 150,
        "cost": 50.00,
        "conversions": 3,
        "conversion_value": 120.00,
        "share_of_spend": 5,
        "roas": 2.4
      },
      {
        "channel": "maps",
        "impressions": 5000,
        "clicks": 100,
        "cost": 50.00,
        "conversions": 4,
        "conversion_value": 200.00,
        "share_of_spend": 5,
        "roas": 4.0
      }
    ],
    "ai_insight": "Search is your best performing channel with 5.0x ROAS. Consider allocating more budget to Search. Display is underperforming at 1.33x ROAS - monitor for improvement or consider pausing."
  }
```

---

### Module 8: AI Features (`/api/v1/ai`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/recommendations` | List recommendations | JWT | Viewer+ |
| GET | `/recommendations/:id` | Get recommendation details | JWT | Viewer+ |
| POST | `/recommendations/:id/approve` | Approve recommendation | JWT | Editor+ |
| POST | `/recommendations/:id/reject` | Reject recommendation | JWT | Editor+ |
| GET | `/chat/conversations` | List conversations | JWT | Member+ |
| POST | `/chat/conversations` | Create conversation | JWT | Member+ |
| GET | `/chat/conversations/:id` | Get conversation | JWT | Member+ |
| POST | `/chat/conversations/:id/messages` | Send message | JWT | Member+ |
| DELETE | `/chat/conversations/:id` | Delete conversation | JWT | Member+ |
| GET | `/automation-rules` | List automation rules | JWT | Viewer+ |
| POST | `/automation-rules` | Create rule | JWT | Admin+ |
| PATCH | `/automation-rules/:id` | Update rule | JWT | Admin+ |
| DELETE | `/automation-rules/:id` | Delete rule | JWT | Admin+ |
| GET | `/automation-rules/:id/history` | Rule execution history | JWT | Viewer+ |
| POST | `/explain` | AI explain any metric/data | JWT | Member+ |
| POST | `/generate-ad-copy` | Generate ad copy | JWT | Editor+ |

#### Request/Response Examples

```yaml
# GET /api/v1/ai/recommendations?account_id=xxx&status=pending
Response (200):
  {
    "recommendations": [
      {
        "id": "uuid",
        "type": "pause_keyword",
        "severity": "warning",
        "title": "Pause wasting keyword",
        "description": "Keyword 'cheap candles wholesale' has spent $52 with 0 conversions in the last 7 days.",
        "impact_estimate": {
          "monthly_savings": 208.00,
          "risk": "low"
        },
        "affected_entities": {
          "keywords": [
            {
              "id": "uuid",
              "text": "cheap candles wholesale",
              "campaign": "General Keywords",
              "spend_7d": 52.00,
              "conversions_7d": 0
            }
          ]
        },
        "options": [
          {
            "id": 1,
            "label": "Conservative",
            "action": "Reduce bid by 50%",
            "risk": "low"
          },
          {
            "id": 2,
            "label": "Moderate",
            "action": "Pause keyword",
            "risk": "low"
          },
          {
            "id": 3,
            "label": "Aggressive",
            "action": "Pause and add as negative",
            "risk": "medium"
          }
        ],
        "status": "pending",
        "expires_at": "2026-03-09T00:00:00Z",
        "created_at": "2026-03-02T10:00:00Z"
      }
    ],
    "summary": {
      "pending": 8,
      "total_potential_savings": 520.00,
      "total_potential_gain": 1200.00
    }
  }

# POST /api/v1/ai/recommendations/:id/approve
Request:
  {
    "selected_option": 2,
    "comment": "Agreed, this keyword is not converting"
  }

Response (200):
  {
    "id": "uuid",
    "status": "approved",
    "selected_option": 2,
    "applied_at": "2026-03-02T14:10:00Z",
    "change_log": {
      "entity_type": "keyword",
      "entity_id": "uuid",
      "change": "status",
      "old_value": "enabled",
      "new_value": "paused"
    }
  }

# POST /api/v1/ai/chat/conversations/:id/messages
Request:
  {
    "content": "Why is my CPA increasing this week?"
  }

Response (200):
  {
    "message": {
      "id": "uuid",
      "role": "assistant",
      "content": "Looking at your account data, your CPA increased from $12.50 to $15.80 this week (+26%). Here's what I found:\n\n**Main Factors:**\n\n1. **Search Term Quality** - 23% of your spend went to irrelevant search terms. I found 15 new search terms that should be added as negatives.\n\n2. **Competitor Activity** - Your impression share dropped from 45% to 38%, suggesting increased competition. Your average CPC rose from $0.65 to $0.82.\n\n3. **Landing Page Issues** - Conversion rate dropped from 4.2% to 3.1%. Check if your landing page has any issues.\n\n**Recommendations:**\n- Add the 15 negative keywords (see recommendations)\n- Review your bidding strategy\n- Check landing page load times\n\nWould you like me to show you the specific search terms to add as negatives?",
      "context_data": {
        "cpa_change": "+26%",
        "impression_share_change": "-7%",
        "conversion_rate_change": "-1.1%"
      },
      "model_used": "gemini-2.5-flash",
      "tokens_used": 450,
      "created_at": "2026-03-02T14:15:00Z"
    }
  }

# POST /api/v1/ai/automation-rules
Request:
  {
    "name": "Pause zero-conversion keywords",
    "trigger_type": "keyword_waste",
    "conditions": {
      "spend_threshold": 50,
      "days": 7,
      "conversions": 0,
      "quality_score_max": null
    },
    "action": "pause",
    "notification_channels": ["in_app", "email"],
    "is_active": true
  }

Response (201):
  {
    "id": "uuid",
    "name": "Pause zero-conversion keywords",
    "trigger_type": "keyword_waste",
    "conditions": {...},
    "action": "pause",
    "notification_channels": ["in_app", "email"],
    "is_active": true,
    "trigger_count": 0,
    "last_triggered_at": null,
    "created_at": "2026-03-02T14:20:00Z"
  }

# POST /api/v1/ai/explain
Request:
  {
    "metric": "cpa",
    "entity_type": "campaign",
    "entity_id": "uuid",
    "date_range": {
      "from": "2026-02-01",
      "to": "2026-03-01"
    }
  }

Response (200):
  {
    "explanation": "Your Cost Per Acquisition (CPA) for the 'Brand Campaign' is $15.80.\n\n**What this means:**\nYou're paying $15.80 on average to get one customer to complete your desired action (purchase, signup, etc.).\n\n**Is this good?**\nCompared to your account average CPA of $18.50, this campaign is performing 14% better. However, compared to last month ($12.50), it increased by 26%.\n\n**Key factors affecting your CPA:**\n1. Click-through rate: 3.6% (good)\n2. Conversion rate: 3.1% (needs improvement)\n3. Average CPC: $0.49 (competitive)\n\n**Recommendation:**\nFocus on improving your conversion rate. A 1% improvement in conversion rate would lower your CPA to ~$12.50.",
    "data_context": {
      "cpa": 15.80,
      "account_avg_cpa": 18.50,
      "previous_period_cpa": 12.50,
      "ctr": 3.6,
      "conversion_rate": 3.1,
      "avg_cpc": 0.49
    }
  }
```

---

### Module 9: Reports (`/api/v1/reports`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/` | List reports | JWT | Viewer+ |
| POST | `/` | Create report | JWT | Editor+ |
| GET | `/:id` | Get report | JWT | Viewer+ |
| GET | `/:id/download` | Download PDF | JWT | Viewer+ |
| DELETE | `/:id` | Delete report | JWT | Editor+ |
| GET | `/templates` | List report templates | JWT | Viewer+ |
| POST | `/schedule` | Schedule recurring report | JWT | Admin+ |
| GET | `/snapshots` | List account snapshots | JWT | Viewer+ |
| POST | `/snapshots` | Create manual snapshot | JWT | Editor+ |
| GET | `/compare` | Before/after comparison | JWT | Viewer+ |

#### Request/Response Examples

```yaml
# POST /api/v1/reports
Request:
  {
    "account_id": "uuid",
    "report_type": "monthly_summary",
    "date_range": {
      "from": "2026-02-01",
      "to": "2026-02-28"
    },
    "include_sections": [
      "overview",
      "campaigns",
      "keywords",
      "search_terms",
      "recommendations",
      "health_score"
    ],
    "generate_pdf": true
  }

Response (202):
  {
    "report_id": "uuid",
    "status": "generating",
    "estimated_completion": "2026-03-02T14:25:00Z",
    "webhook_url": "/api/v1/reports/uuid"
  }

# GET /api/v1/reports/:id (when complete)
Response (200):
  {
    "id": "uuid",
    "report_type": "monthly_summary",
    "title": "February 2026 Performance Report",
    "date_range": {
      "from": "2026-02-01",
      "to": "2026-02-28"
    },
    "content": {
      "overview": {
        "total_spend": 2850.00,
        "total_conversions": 178,
        "avg_cpa": 16.01,
        "roas": 3.8,
        "health_score": 76
      },
      "campaigns": [...],
      "keywords": {...},
      "search_terms": {...},
      "recommendations_summary": {...}
    },
    "ai_summary": "February was a solid month with 178 conversions at $16.01 CPA. Key highlights:\n\n1. Your 'Brand Campaign' was the top performer with 4.2x ROAS\n2. We identified $145 in wasted spend from irrelevant search terms\n3. Your health score improved from 72 to 76\n\nRecommendations for March:\n- Add the 23 suggested negative keywords\n- Consider increasing budget for 'Product Campaign' which is showing 5.1x ROAS\n- Review landing page for 'Service Campaign' - conversion rate dropped 15%",
    "file_url": "https://storage.googleapis.com/reports/uuid.pdf",
    "created_at": "2026-03-02T14:25:00Z"
  }

# GET /api/v1/reports/compare?account_id=xxx
Response (200):
  {
    "account_id": "uuid",
    "initial_snapshot": {
      "date": "2026-01-15",
      "metrics": {
        "cpa": 22.50,
        "roas": 2.8,
        "waste_percent": 18,
        "health_score": 58
      }
    },
    "current_snapshot": {
      "date": "2026-03-01",
      "metrics": {
        "cpa": 15.80,
        "roas": 4.2,
        "waste_percent": 5,
        "health_score": 78
      }
    },
    "improvement": {
      "cpa": {
        "change": -6.70,
        "change_percent": -29.8,
        "direction": "improved"
      },
      "roas": {
        "change": 1.4,
        "change_percent": 50.0,
        "direction": "improved"
      },
      "waste": {
        "change": -13,
        "direction": "improved"
      },
      "health_score": {
        "change": 20,
        "direction": "improved"
      },
      "estimated_monthly_savings": 520.00
    },
    "ai_summary": "Since you started using AdsMaster 6 weeks ago, your account has improved significantly:\n\n- CPA decreased 30% ($22.50 → $15.80)\n- ROAS increased 50% (2.8x → 4.2x)\n- Waste reduced from 18% to 5%\n- Health score improved from 58 to 78\n\nYou're saving an estimated $520/month compared to when you started."
  }
```

---

### Module 10: Alerts & Notifications (`/api/v1/alerts`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List alerts | JWT |
| GET | `/:id` | Get alert details | JWT |
| PUT | `/:id/read` | Mark as read | JWT |
| PUT | `/:id/dismiss` | Dismiss alert | JWT |
| PUT | `/read-all` | Mark all as read | JWT |
| GET | `/preferences` | Get notification preferences | JWT |
| PUT | `/preferences` | Update preferences | JWT |
| POST | `/test` | Send test notification | JWT |

---

### Module 11: Agency (`/api/v1/agency`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/clients` | List agency clients | JWT | Admin+ |
| POST | `/clients` | Create client | JWT | Admin+ |
| GET | `/clients/:id` | Get client details | JWT | Member+ |
| PATCH | `/clients/:id` | Update client | JWT | Admin+ |
| DELETE | `/clients/:id` | Delete client | JWT | Admin+ |
| POST | `/clients/:id/accounts` | Link ad account | JWT | Admin+ |
| DELETE | `/clients/:id/accounts/:accountId` | Unlink account | JWT | Admin+ |
| GET | `/clients/:id/reports` | Client reports | JWT | Member+ |
| GET | `/overview` | Agency dashboard | JWT | Admin+ |

---

### Module 12: Competitors (`/api/v1/competitors`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/` | List competitors | JWT | Viewer+ |
| POST | `/` | Add competitor to track | JWT | Editor+ |
| GET | `/:id` | Get competitor details | JWT | Viewer+ |
| DELETE | `/:id` | Stop tracking | JWT | Editor+ |
| GET | `/:id/metrics` | Competitor metrics | JWT | Viewer+ |
| GET | `/:id/ads` | Competitor ads | JWT | Viewer+ |
| GET | `/auction-insights` | Auction insights | JWT | Viewer+ |

---

### Module 13: Webhooks (`/api/v1/webhooks`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/stripe` | Stripe webhook | Signature |
| POST | `/google-ads` | Google Ads webhook | Signature |
| POST | `/meta` | Meta webhook | Signature |
| GET | `/outgoing` | List outgoing webhooks | JWT |
| POST | `/outgoing` | Create outgoing webhook | JWT |
| DELETE | `/outgoing/:id` | Delete webhook | JWT |

---

## WebSocket Endpoints

### Real-time Updates (`/ws/v1`)

```
WebSocket: wss://api.adsmaster.com/ws/v1

Authentication:
  - Send JWT token as first message
  - Or include in query param: ?token=xxx

Channels:
  - account:{account_id}:metrics     # Real-time metrics updates
  - account:{account_id}:alerts      # New alerts
  - account:{account_id}:sync        # Sync status updates
  - user:{user_id}:notifications     # User notifications
  - ai:{conversation_id}:messages    # AI chat streaming
```

#### WebSocket Message Format

```yaml
# Client → Server (Subscribe)
{
  "action": "subscribe",
  "channel": "account:uuid:metrics"
}

# Server → Client (Metrics Update)
{
  "channel": "account:uuid:metrics",
  "event": "update",
  "data": {
    "campaign_id": "uuid",
    "timestamp": "2026-03-02T14:30:00Z",
    "metrics": {
      "impressions": 1255,
      "clicks": 46,
      "spend": 33.20,
      "conversions": 3
    }
  }
}

# Server → Client (Alert)
{
  "channel": "account:uuid:alerts",
  "event": "new_alert",
  "data": {
    "id": "uuid",
    "type": "anomaly",
    "severity": "warning",
    "title": "Unusual spend detected",
    "message": "Campaign X is spending 3x faster than usual"
  }
}

# Server → Client (AI Streaming)
{
  "channel": "ai:uuid:messages",
  "event": "token",
  "data": {
    "content": "Based on",
    "is_final": false
  }
}
```

---

## Rate Limiting

### Limits by Tier

| Plan | Requests/minute | Requests/hour | AI calls/day |
|------|-----------------|---------------|--------------|
| Free | 60 | 1,000 | 50 |
| Starter | 120 | 3,000 | 200 |
| Growth | 300 | 10,000 | 1,000 |
| Agency | 600 | 30,000 | 5,000 |
| Enterprise | Custom | Custom | Custom |

### Rate Limit Headers

```yaml
Headers:
  X-RateLimit-Limit: 300
  X-RateLimit-Remaining: 298
  X-RateLimit-Reset: 1709425200
  X-RateLimit-Retry-After: 45  # Only when rate limited

Response (429 - Rate Limited):
  {
    "error": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please retry after 45 seconds.",
    "retry_after": 45
  }
```

### Implementation

```python
# Redis-based token bucket rate limiter
async def check_rate_limit(
    user_id: str,
    endpoint: str,
    plan: str
) -> tuple[bool, dict]:
    """
    Returns (allowed, headers)
    """
    key = f"ratelimit:{user_id}:{endpoint}"
    limits = PLAN_LIMITS[plan]

    async with redis.pipeline() as pipe:
        now = int(time.time())
        window_start = now - 60  # 1-minute window

        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)
        # Add current request
        pipe.zadd(key, {str(now): now})
        # Count requests in window
        pipe.zcard(key)
        # Set expiry
        pipe.expire(key, 60)

        results = await pipe.execute()
        request_count = results[2]

    remaining = max(0, limits['per_minute'] - request_count)
    allowed = request_count <= limits['per_minute']

    headers = {
        'X-RateLimit-Limit': limits['per_minute'],
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': now + 60
    }

    return allowed, headers
```

---

## Error Handling

### Standard Error Response

```yaml
Error Response Format:
  {
    "error": "error_code",           # Machine-readable code
    "message": "Human readable msg", # User-friendly message
    "details": {...},                # Optional additional context
    "request_id": "uuid",            # For support/debugging
    "documentation_url": "https://docs.adsmaster.com/errors/xxx"
  }
```

### Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `bad_request` | Invalid request body/params |
| 400 | `validation_error` | Field validation failed |
| 401 | `unauthorized` | Missing or invalid token |
| 401 | `token_expired` | JWT expired |
| 403 | `forbidden` | Insufficient permissions |
| 403 | `plan_limit_exceeded` | Feature not in plan |
| 404 | `not_found` | Resource not found |
| 409 | `conflict` | Resource conflict (duplicate) |
| 422 | `unprocessable_entity` | Valid syntax, invalid semantics |
| 429 | `rate_limit_exceeded` | Too many requests |
| 500 | `internal_error` | Server error |
| 502 | `upstream_error` | Google/Meta API error |
| 503 | `service_unavailable` | Service temporarily down |

### Validation Error Example

```yaml
Response (400 - Validation Error):
  {
    "error": "validation_error",
    "message": "Request validation failed",
    "details": {
      "fields": {
        "email": "Invalid email format",
        "password": "Password must be at least 8 characters"
      }
    },
    "request_id": "req_abc123"
  }
```

---

## API Versioning

### Strategy

```
URL Path Versioning: /api/v1/, /api/v2/

Rules:
1. Major version changes (v1 → v2) for breaking changes
2. Minor/patch changes are backwards compatible
3. Old versions supported for 12 months after deprecation
4. Deprecation headers added 6 months before EOL
```

### Deprecation Headers

```yaml
Headers (when using deprecated endpoint):
  X-API-Deprecated: true
  X-API-Deprecated-Date: 2026-09-01
  X-API-Sunset-Date: 2027-03-01
  X-API-New-Endpoint: /api/v2/campaigns
```

---

## OpenAPI Specification

### Auto-generated from FastAPI

```python
# FastAPI automatically generates OpenAPI spec

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI(
    title="AdsMaster API",
    description="AI-powered advertising management platform",
    version="1.0.0",
    docs_url="/api/docs",           # Swagger UI
    redoc_url="/api/redoc",         # ReDoc
    openapi_url="/api/openapi.json" # OpenAPI JSON
)

# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="AdsMaster API",
        version="1.0.0",
        description="...",
        routes=app.routes,
    )

    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        },
        "apiKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key"
        }
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

---

## Security Considerations

### Input Validation

```python
from pydantic import BaseModel, EmailStr, constr, validator

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=8, max_length=128)
    name: constr(min_length=1, max_length=100)

    @validator('password')
    def password_strength(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain lowercase')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain digit')
        return v
```

### SQL Injection Prevention

```python
# Always use parameterized queries
# NEVER string concatenation

# BAD - SQL Injection vulnerable
query = f"SELECT * FROM users WHERE email = '{email}'"

# GOOD - Parameterized query
query = "SELECT * FROM users WHERE email = $1"
result = await db.fetch_one(query, email)
```

### XSS Prevention

```python
# All responses are JSON (no HTML injection risk)
# Content-Type: application/json
# X-Content-Type-Options: nosniff

# User input is never rendered as HTML
# Frontend uses proper escaping (React does this automatically)
```

### CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.adsmaster.com",
        "https://staging.adsmaster.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
    max_age=3600,
)
```

---

## Files to Create (Implementation)

```
/backend/
├── app/
│   ├── main.py                 # FastAPI app setup
│   ├── config.py               # Configuration
│   ├── dependencies.py         # Common dependencies
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py       # Main v1 router
│   │   │   ├── auth.py         # Auth endpoints
│   │   │   ├── users.py        # User endpoints
│   │   │   ├── organizations.py
│   │   │   ├── billing.py
│   │   │   ├── accounts.py
│   │   │   ├── campaigns.py
│   │   │   ├── metrics.py
│   │   │   ├── ai.py
│   │   │   ├── reports.py
│   │   │   ├── alerts.py
│   │   │   ├── agency.py
│   │   │   ├── competitors.py
│   │   │   └── webhooks.py
│   │   │
│   │   └── websocket/
│   │       ├── __init__.py
│   │       └── handler.py
│   │
│   ├── core/
│   │   ├── security.py         # JWT, hashing
│   │   ├── permissions.py      # RBAC logic
│   │   └── rate_limit.py       # Rate limiting
│   │
│   ├── models/                 # Pydantic models
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── organization.py
│   │   ├── campaign.py
│   │   └── ...
│   │
│   ├── schemas/                # Database schemas
│   │   └── ...
│   │
│   └── services/               # Business logic
│       ├── auth_service.py
│       ├── campaign_service.py
│       ├── ai_service.py
│       └── ...
│
├── tests/
│   └── api/
│       └── v1/
│           ├── test_auth.py
│           ├── test_campaigns.py
│           └── ...
│
└── requirements.txt
```

---

## Summary

### API Statistics

| Metric | Count |
|--------|-------|
| Total Endpoints | ~90 |
| REST Endpoints | ~85 |
| WebSocket Channels | 5 |
| Auth Methods | 3 (JWT, OAuth, API Key) |
| Permission Levels | 4 (System, Org, Account, Campaign) |

### Key Design Decisions

1. **REST over GraphQL** - Simpler, cacheable, better for our use case
2. **JWT with short expiry** - 15 min access, 30 day refresh
3. **URL versioning** - Clear, cacheable, easy migrations
4. **Token bucket rate limiting** - Flexible, per-user limits
5. **Auto-generated OpenAPI** - Always up-to-date docs
6. **WebSocket for real-time** - Metrics, alerts, AI streaming

---

*Document Version: 1.0*
*Created: March 2026*
*Status: READY FOR REVIEW*
