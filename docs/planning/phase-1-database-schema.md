# Phase 1: Complete Database Schema Plan

## Overview

**Database**: PostgreSQL 15+
**Total Tables**: 45
**Partitioned Tables**: 8 (for metrics - high volume data)
**Estimated Storage (Year 1)**: 50-100 GB for 1,000 users

---

## Table of Contents

1. [Entity Relationship Diagram](#entity-relationship-diagram)
2. [Module 1: Core Users](#module-1-core-users)
3. [Module 2: Billing & Subscriptions](#module-2-billing--subscriptions)
4. [Module 3: Ad Platform Connections](#module-3-ad-platform-connections)
5. [Module 4: Campaign Data](#module-4-campaign-data)
6. [Module 5: Performance Metrics](#module-5-performance-metrics)
7. [Module 6: AI & Automation](#module-6-ai--automation)
8. [Module 7: Alerts & Notifications](#module-7-alerts--notifications)
9. [Module 8: AI Chat](#module-8-ai-chat)
10. [Module 9: Reports & Analytics](#module-9-reports--analytics)
11. [Module 10: Sync & Audit](#module-10-sync--audit)
12. [Module 11: Agency Management](#module-11-agency-management)
13. [Module 12: Permissions](#module-12-permissions)
14. [Module 13: Competitors](#module-13-competitors)
15. [Data Types & Enums](#data-types--enums)
16. [Indexing Strategy](#indexing-strategy)
17. [Partitioning Strategy](#partitioning-strategy)
18. [Security Considerations](#security-considerations)
19. [Data Retention Policy](#data-retention-policy)

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CORE RELATIONSHIPS                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────┐       ┌──────────────────┐       ┌─────────────┐
│  users   │──1:N──│ org_members      │──N:1──│organizations│
└──────────┘       └──────────────────┘       └─────────────┘
                                                     │
                                                    1:N
                                                     │
                          ┌──────────────────────────┼──────────────────────────┐
                          │                          │                          │
                          ▼                          ▼                          ▼
                   ┌─────────────┐          ┌──────────────┐          ┌─────────────────┐
                   │subscriptions│          │  ad_accounts │          │ agency_clients  │
                   └─────────────┘          └──────────────┘          └─────────────────┘
                                                   │
                                                  1:N
                                                   │
                    ┌──────────────────────────────┼──────────────────────────┐
                    │                              │                          │
                    ▼                              ▼                          ▼
             ┌────────────┐                 ┌───────────┐              ┌───────────┐
             │oauth_tokens│                 │ campaigns │              │ audiences │
             └────────────┘                 └───────────┘              └───────────┘
                                                  │
                                                 1:N
                                                  │
                                           ┌──────────┐
                                           │ad_groups │
                                           └──────────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    │             │             │
                                    ▼             ▼             ▼
                               ┌────────┐   ┌─────────┐   ┌─────────────┐
                               │  ads   │   │keywords │   │search_terms │
                               └────────┘   └─────────┘   └─────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              METRICS & ANALYTICS                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

campaigns ──1:N──► campaign_metrics_daily (partitioned by month)
          ──1:N──► campaign_metrics_hourly (7 days retention)
          ──1:N──► pmax_channel_breakdown (v23 feature)
          ──1:N──► campaign_device_metrics_daily
          ──1:N──► campaign_location_metrics_daily

keywords ──1:N──► keyword_metrics_daily (partitioned)

ads ──1:N──► ad_metrics_daily (partitioned)


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              AI & AUTOMATION                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

ad_accounts ──1:N──► ai_recommendations ◄──approved_by── users
            ──1:N──► automation_rules ──1:N──► automation_executions
            ──1:N──► alerts ──N:1──► users

users ──1:N──► ai_conversations ──1:N──► ai_messages


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              AGENCY & PERMISSIONS                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

organizations (agency) ──1:N──► agency_clients ──1:N──► agency_client_accounts
                                                              │
                                                              ▼
                                                        ad_accounts

users ──1:N──► ad_account_permissions ──N:1──► ad_accounts
      ──1:N──► campaign_permissions ──N:1──► campaigns
```

---

## Module 1: Core Users

### Table: `users`
Primary table for user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| email_verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| password_hash | VARCHAR(255) | NULLABLE | NULL if OAuth-only user |
| name | VARCHAR(255) | NOT NULL | Display name |
| avatar_url | TEXT | | Profile picture URL |
| phone | VARCHAR(50) | | Phone number for WhatsApp |
| phone_verified | BOOLEAN | DEFAULT FALSE | Phone verification status |
| timezone | VARCHAR(100) | DEFAULT 'UTC' | User timezone |
| currency | VARCHAR(3) | DEFAULT 'USD' | Preferred currency |
| language | VARCHAR(10) | DEFAULT 'en' | UI language |
| date_format | VARCHAR(20) | DEFAULT 'YYYY-MM-DD' | Date display format |
| notification_preferences | JSONB | DEFAULT '{}' | Email, WhatsApp, Slack settings |
| onboarding_completed | BOOLEAN | DEFAULT FALSE | Completed onboarding? |
| onboarding_step | INTEGER | DEFAULT 0 | Current onboarding step |
| is_active | BOOLEAN | DEFAULT TRUE | Account active? |
| last_login_at | TIMESTAMPTZ | | Last login timestamp |
| last_activity_at | TIMESTAMPTZ | | Last activity timestamp |
| metadata | JSONB | DEFAULT '{}' | Extra data |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Auto-updated |

**Indexes:**
- `idx_users_email` ON (email)
- `idx_users_active` ON (is_active) WHERE is_active = TRUE

---

### Table: `organizations`
Businesses or agencies using the platform.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| name | VARCHAR(255) | NOT NULL | Organization name |
| slug | VARCHAR(100) | UNIQUE | URL-friendly identifier |
| type | organization_type | NOT NULL, DEFAULT 'individual' | individual/business/agency |
| logo_url | TEXT | | Logo for branding |
| primary_color | VARCHAR(7) | | Hex color for white-label |
| billing_email | VARCHAR(255) | | Invoices sent here |
| website | VARCHAR(255) | | Company website |
| address_line1 | VARCHAR(255) | | Billing address |
| address_line2 | VARCHAR(255) | | |
| city | VARCHAR(100) | | |
| state | VARCHAR(100) | | |
| postal_code | VARCHAR(20) | | |
| country | VARCHAR(2) | | ISO country code |
| white_label_settings | JSONB | DEFAULT '{}' | Custom branding for agencies |
| settings | JSONB | DEFAULT '{}' | Org-level settings |
| is_active | BOOLEAN | DEFAULT TRUE | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**White Label Settings JSONB Structure:**
```json
{
  "enabled": false,
  "custom_domain": "ads.clientname.com",
  "logo_url": "https://...",
  "favicon_url": "https://...",
  "primary_color": "#00E5A0",
  "secondary_color": "#3B82F6",
  "email_from_name": "Client Ad Manager",
  "email_from_address": "ads@clientname.com",
  "hide_powered_by": true
}
```

---

### Table: `organization_members`
Links users to organizations with roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations, NOT NULL | |
| user_id | UUID | FK → users, NOT NULL | |
| role | member_role | NOT NULL, DEFAULT 'member' | owner/admin/member/viewer |
| invited_by_user_id | UUID | FK → users | Who sent the invite |
| invited_at | TIMESTAMPTZ | | When invite was sent |
| accepted_at | TIMESTAMPTZ | | When user accepted |
| is_active | BOOLEAN | DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(organization_id, user_id)

---

### Table: `organization_invitations`
Pending invitations to join an organization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations | |
| invited_by_user_id | UUID | FK → users | |
| email | VARCHAR(255) | NOT NULL | Invitee email |
| role | member_role | DEFAULT 'member' | Role they'll get |
| token | VARCHAR(255) | UNIQUE, NOT NULL | Invite link token |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/accepted/expired/revoked |
| expires_at | TIMESTAMPTZ | NOT NULL | Invitation expiry |
| accepted_at | TIMESTAMPTZ | | When accepted |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Table: `user_sessions`
JWT refresh token storage for session management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK → users | |
| refresh_token_hash | VARCHAR(255) | NOT NULL | Hashed refresh token |
| device_info | JSONB | DEFAULT '{}' | User agent, device type |
| ip_address | INET | | Last known IP |
| is_active | BOOLEAN | DEFAULT TRUE | |
| last_used_at | TIMESTAMPTZ | DEFAULT NOW() | |
| expires_at | TIMESTAMPTZ | NOT NULL | Token expiry |
| revoked_at | TIMESTAMPTZ | | If manually revoked |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

## Module 2: Billing & Subscriptions

### Table: `subscription_plans`
Available pricing plans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| name | VARCHAR(50) | UNIQUE, NOT NULL | free_audit/starter/growth/agency/enterprise |
| display_name | VARCHAR(100) | NOT NULL | "Growth Plan" |
| description | TEXT | | Plan description |
| price_monthly | DECIMAL(10,2) | DEFAULT 0 | Monthly price |
| price_yearly | DECIMAL(10,2) | DEFAULT 0 | Yearly price (discounted) |
| currency | VARCHAR(3) | DEFAULT 'USD' | |
| stripe_price_id_monthly | VARCHAR(255) | | Stripe price ID |
| stripe_price_id_yearly | VARCHAR(255) | | |
| stripe_product_id | VARCHAR(255) | | |
| max_ad_accounts | INTEGER | DEFAULT 1 | -1 = unlimited |
| max_campaigns | INTEGER | DEFAULT 5 | -1 = unlimited |
| max_users | INTEGER | DEFAULT 1 | |
| max_ai_messages_per_month | INTEGER | DEFAULT 100 | |
| features | JSONB | DEFAULT '{}' | Feature flags |
| is_popular | BOOLEAN | DEFAULT FALSE | Show "Popular" badge |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| is_active | BOOLEAN | DEFAULT TRUE | Can be purchased |
| is_public | BOOLEAN | DEFAULT TRUE | Show on pricing page |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Features JSONB Structure:**
```json
{
  "platforms": ["google_ads", "meta", "tiktok"],
  "ai_advisor": true,
  "ai_campaign_creator": true,
  "automation_rules": true,
  "whatsapp_alerts": true,
  "slack_integration": true,
  "white_label": false,
  "api_access": false,
  "priority_support": false,
  "custom_reports": true,
  "competitor_tracking": true,
  "multi_user": true
}
```

**Default Plans:**

| Plan | Monthly | Yearly | Ad Accounts | Campaigns | Users |
|------|---------|--------|-------------|-----------|-------|
| free_audit | $0 | $0 | 1 | 0 | 1 |
| starter | $49 | $470 | 1 | 5 | 1 |
| growth | $99 | $950 | 3 | unlimited | 3 |
| agency | $299 | $2,870 | 10 | unlimited | 10 |
| enterprise | Custom | Custom | unlimited | unlimited | unlimited |

---

### Table: `subscriptions`
Active subscriptions for organizations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations | |
| plan_id | UUID | FK → subscription_plans | |
| stripe_subscription_id | VARCHAR(255) | UNIQUE | |
| stripe_customer_id | VARCHAR(255) | | |
| billing_interval | billing_interval | DEFAULT 'monthly' | monthly/yearly |
| status | subscription_status | DEFAULT 'trialing' | trialing/active/past_due/cancelled/unpaid/paused |
| trial_start | TIMESTAMPTZ | | |
| trial_end | TIMESTAMPTZ | | |
| current_period_start | TIMESTAMPTZ | NOT NULL | |
| current_period_end | TIMESTAMPTZ | NOT NULL | |
| cancel_at_period_end | BOOLEAN | DEFAULT FALSE | Will cancel at end? |
| cancelled_at | TIMESTAMPTZ | | When cancelled |
| cancellation_reason | TEXT | | Why cancelled |
| paused_at | TIMESTAMPTZ | | If paused |
| resume_at | TIMESTAMPTZ | | When to resume |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Table: `usage_records`
Metered billing tracking (for agency per-client fees).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| subscription_id | UUID | FK → subscriptions | |
| metric_type | VARCHAR(50) | NOT NULL | ad_accounts/ai_messages/api_calls |
| quantity | INTEGER | DEFAULT 1 | |
| period_start | TIMESTAMPTZ | NOT NULL | |
| period_end | TIMESTAMPTZ | NOT NULL | |
| stripe_usage_record_id | VARCHAR(255) | | |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Table: `invoices`
Invoice records (synced from Stripe).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations | |
| subscription_id | UUID | FK → subscriptions | |
| stripe_invoice_id | VARCHAR(255) | UNIQUE | |
| stripe_payment_intent_id | VARCHAR(255) | | |
| invoice_number | VARCHAR(50) | | |
| status | VARCHAR(20) | NOT NULL | draft/open/paid/void/uncollectible |
| subtotal | INTEGER | DEFAULT 0 | In cents |
| tax | INTEGER | DEFAULT 0 | |
| discount | INTEGER | DEFAULT 0 | |
| total | INTEGER | NOT NULL | |
| amount_paid | INTEGER | DEFAULT 0 | |
| amount_due | INTEGER | NOT NULL | |
| currency | VARCHAR(3) | DEFAULT 'USD' | |
| invoice_date | TIMESTAMPTZ | DEFAULT NOW() | |
| due_date | TIMESTAMPTZ | | |
| paid_at | TIMESTAMPTZ | | |
| invoice_pdf_url | TEXT | | |
| hosted_invoice_url | TEXT | | |
| line_items | JSONB | DEFAULT '[]' | |
| metadata | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Table: `payment_methods`
Stored payment methods.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations | |
| stripe_payment_method_id | VARCHAR(255) | UNIQUE, NOT NULL | |
| type | VARCHAR(20) | NOT NULL | card/bank_account |
| card_brand | VARCHAR(20) | | visa/mastercard/amex |
| card_last4 | VARCHAR(4) | | |
| card_exp_month | INTEGER | | |
| card_exp_year | INTEGER | | |
| is_default | BOOLEAN | DEFAULT FALSE | |
| is_active | BOOLEAN | DEFAULT TRUE | |
| billing_details | JSONB | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Table: `coupons`
Discount codes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| code | VARCHAR(50) | UNIQUE, NOT NULL | SAVE20 |
| stripe_coupon_id | VARCHAR(255) | | |
| discount_type | VARCHAR(20) | NOT NULL | percent/fixed_amount |
| discount_value | DECIMAL(10,2) | NOT NULL | 20 (for 20%) or 10.00 (for $10) |
| currency | VARCHAR(3) | DEFAULT 'USD' | |
| duration | VARCHAR(20) | NOT NULL | once/repeating/forever |
| duration_in_months | INTEGER | | If repeating |
| max_redemptions | INTEGER | | NULL = unlimited |
| redemption_count | INTEGER | DEFAULT 0 | |
| applies_to_plans | UUID[] | | NULL = all plans |
| minimum_amount | INTEGER | | Min invoice in cents |
| valid_from | TIMESTAMPTZ | DEFAULT NOW() | |
| valid_until | TIMESTAMPTZ | | NULL = no expiry |
| is_active | BOOLEAN | DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Table: `coupon_redemptions`
Track who used which coupon.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| coupon_id | UUID | FK → coupons | |
| organization_id | UUID | FK → organizations | |
| subscription_id | UUID | FK → subscriptions | |
| redeemed_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(coupon_id, organization_id)

---

## Module 3: Ad Platform Connections

### Table: `ad_accounts`
Connected advertising accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| organization_id | UUID | FK → organizations | |
| platform | ad_platform | NOT NULL | google_ads/meta/tiktok/linkedin |
| platform_account_id | VARCHAR(255) | NOT NULL | Google CID, Meta Act ID |
| account_name | VARCHAR(255) | | Synced from platform |
| currency | VARCHAR(3) | DEFAULT 'USD' | Account currency |
| timezone | VARCHAR(100) | DEFAULT 'UTC' | Account timezone |
| manager_account_id | VARCHAR(255) | | Parent MCC if applicable |
| is_manager_account | BOOLEAN | DEFAULT FALSE | Is this an MCC? |
| status | account_status | DEFAULT 'pending_auth' | active/paused/disconnected/error |
| status_reason | TEXT | | Error message if any |
| last_sync_at | TIMESTAMPTZ | | |
| last_successful_sync_at | TIMESTAMPTZ | | |
| sync_enabled | BOOLEAN | DEFAULT TRUE | |
| sync_frequency_minutes | INTEGER | DEFAULT 60 | |
| settings | JSONB | DEFAULT '{}' | Account-level automation settings |
| platform_metadata | JSONB | DEFAULT '{}' | Extra data from platform |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(platform, platform_account_id)

**Settings JSONB Structure:**
```json
{
  "auto_pause_waste": true,
  "waste_threshold_days": 7,
  "waste_threshold_spend": 50,
  "daily_budget_limit": null,
  "alert_on_anomaly": true,
  "anomaly_threshold_percent": 50
}
```

---

### Table: `oauth_tokens`
Encrypted OAuth token storage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| access_token_encrypted | TEXT | NOT NULL | AES-256 encrypted |
| refresh_token_encrypted | TEXT | | |
| token_type | VARCHAR(50) | DEFAULT 'Bearer' | |
| access_token_expires_at | TIMESTAMPTZ | | |
| refresh_token_expires_at | TIMESTAMPTZ | | |
| scopes | TEXT[] | | OAuth scopes granted |
| is_valid | BOOLEAN | DEFAULT TRUE | |
| invalidated_at | TIMESTAMPTZ | | |
| invalidation_reason | TEXT | | |
| last_refresh_at | TIMESTAMPTZ | | |
| refresh_count | INTEGER | DEFAULT 0 | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Security Note:** Tokens are encrypted at the application level using AES-256-GCM. The encryption key is stored in environment variables, not in the database.

---

### Table: `google_ads_customer_links`
Google Ads specific: Customer ID to MCC mapping.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| customer_id | VARCHAR(20) | NOT NULL | Google CID (no dashes) |
| login_customer_id | VARCHAR(20) | | MCC login ID |
| access_role | VARCHAR(50) | | ADMIN/STANDARD/READ_ONLY |
| linked_account_ids | TEXT[] | | Child accounts if MCC |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(ad_account_id, customer_id)

---

### Table: `meta_business_links`
Meta specific: Ad account to business mapping.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| business_id | VARCHAR(50) | | Meta Business ID |
| ad_account_id_meta | VARCHAR(50) | NOT NULL | act_xxxxx |
| permitted_tasks | TEXT[] | | ADVERTISE/ANALYZE/etc |
| connected_page_ids | TEXT[] | | Facebook Pages |
| connected_instagram_ids | TEXT[] | | Instagram accounts |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

## Module 4: Campaign Data

### Table: `campaigns`
Advertising campaigns synced from platforms.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| platform_campaign_id | VARCHAR(255) | NOT NULL | Platform's ID |
| name | VARCHAR(500) | NOT NULL | Campaign name |
| campaign_type | campaign_type | NOT NULL | search/pmax/display/shopping/video |
| status | entity_status | DEFAULT 'enabled' | enabled/paused/removed |
| budget_amount | DECIMAL(15,2) | | Daily or total budget |
| budget_type | budget_type | DEFAULT 'daily' | daily/total/shared |
| budget_shared_id | VARCHAR(255) | | Shared budget ID |
| bidding_strategy | bidding_strategy | | maximize_conversions/target_cpa/etc |
| target_cpa | DECIMAL(15,2) | | Target cost per acquisition |
| target_roas | DECIMAL(10,2) | | Target return on ad spend |
| max_cpc | DECIMAL(15,2) | | Maximum CPC bid |
| start_date | DATE | | Campaign start |
| end_date | DATE | | Campaign end |
| targeting_summary | JSONB | DEFAULT '{}' | Quick view of targeting |
| labels | TEXT[] | | User-applied labels |
| settings | JSONB | DEFAULT '{}' | Platform-specific settings |
| networks | JSONB | | Where ads show (search/display/youtube) |
| pmax_asset_groups_count | INTEGER | DEFAULT 0 | For PMax campaigns |
| platform_created_at | TIMESTAMPTZ | | |
| platform_updated_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(ad_account_id, platform_campaign_id)

---

### Table: `ad_groups`
Ad groups within campaigns.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| campaign_id | UUID | FK → campaigns | |
| platform_ad_group_id | VARCHAR(255) | NOT NULL | |
| name | VARCHAR(500) | NOT NULL | |
| status | entity_status | DEFAULT 'enabled' | |
| cpc_bid | DECIMAL(15,2) | | Default CPC bid |
| cpm_bid | DECIMAL(15,2) | | Default CPM bid |
| cpv_bid | DECIMAL(15,2) | | Default CPV bid |
| ad_rotation | VARCHAR(50) | | OPTIMIZE/ROTATE_FOREVER |
| targeting_settings | JSONB | DEFAULT '{}' | |
| labels | TEXT[] | | |
| settings | JSONB | DEFAULT '{}' | |
| platform_created_at | TIMESTAMPTZ | | |
| platform_updated_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(campaign_id, platform_ad_group_id)

---

### Table: `ads`
Individual advertisements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_group_id | UUID | FK → ad_groups | |
| platform_ad_id | VARCHAR(255) | NOT NULL | |
| name | VARCHAR(500) | | |
| ad_type | ad_type | NOT NULL | responsive_search/video/etc |
| status | entity_status | DEFAULT 'enabled' | |
| headlines | JSONB | DEFAULT '[]' | Array of headlines |
| descriptions | JSONB | DEFAULT '[]' | Array of descriptions |
| long_headline | VARCHAR(255) | | For display ads |
| final_urls | TEXT[] | | Landing page URLs |
| final_mobile_urls | TEXT[] | | Mobile landing pages |
| display_url | VARCHAR(255) | | Visible URL |
| tracking_url_template | TEXT | | Tracking template |
| images | JSONB | DEFAULT '[]' | Image asset references |
| videos | JSONB | DEFAULT '[]' | Video asset references |
| logos | JSONB | DEFAULT '[]' | Logo references |
| call_to_action | VARCHAR(50) | | CTA type |
| policy_summary | JSONB | DEFAULT '{}' | Policy review status |
| disapproval_reasons | TEXT[] | | Why disapproved |
| approval_status | VARCHAR(50) | | APPROVED/DISAPPROVED/UNDER_REVIEW |
| ad_strength | VARCHAR(20) | | EXCELLENT/GOOD/AVERAGE/POOR |
| labels | TEXT[] | | |
| settings | JSONB | DEFAULT '{}' | |
| platform_created_at | TIMESTAMPTZ | | |
| platform_updated_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(ad_group_id, platform_ad_id)

---

### Table: `keywords`
Search keywords (including negatives).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_group_id | UUID | FK → ad_groups | |
| platform_keyword_id | VARCHAR(255) | NOT NULL | |
| text | VARCHAR(500) | NOT NULL | Keyword text |
| match_type | keyword_match_type | NOT NULL | exact/phrase/broad |
| status | entity_status | DEFAULT 'enabled' | |
| is_negative | BOOLEAN | DEFAULT FALSE | Is negative keyword? |
| negative_list_id | VARCHAR(255) | | Shared negative list |
| quality_score | INTEGER | CHECK 1-10 | |
| quality_score_creative | DECIMAL(3,1) | | Ad relevance |
| quality_score_landing_page | DECIMAL(3,1) | | Landing page experience |
| quality_score_expected_ctr | DECIMAL(3,1) | | Expected CTR |
| cpc_bid | DECIMAL(15,2) | | Keyword-level bid |
| cpc_bid_source | VARCHAR(50) | | ADGROUP/CRITERION |
| final_url | TEXT | | Keyword-level URL |
| final_mobile_url | TEXT | | |
| labels | TEXT[] | | |
| settings | JSONB | DEFAULT '{}' | |
| platform_created_at | TIMESTAMPTZ | | |
| platform_updated_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(ad_group_id, platform_keyword_id)

---

### Table: `audiences`
Audience lists for targeting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| platform_audience_id | VARCHAR(255) | NOT NULL | |
| name | VARCHAR(500) | NOT NULL | |
| audience_type | audience_type | NOT NULL | remarketing/custom/in_market/etc |
| description | TEXT | | |
| status | entity_status | DEFAULT 'enabled' | |
| size_lower_bound | BIGINT | | Min audience size |
| size_upper_bound | BIGINT | | Max audience size |
| size_for_display | BIGINT | | Size for display network |
| size_for_search | BIGINT | | Size for search network |
| membership_life_span_days | INTEGER | | How long users stay |
| source_type | VARCHAR(100) | | WEBSITE/APP/CRM |
| source_url | TEXT | | Source URL |
| rules | JSONB | DEFAULT '{}' | Rule-based audience config |
| labels | TEXT[] | | |
| settings | JSONB | DEFAULT '{}' | |
| platform_created_at | TIMESTAMPTZ | | |
| platform_updated_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(ad_account_id, platform_audience_id)

---

### Table: `campaign_audiences`
Junction: campaigns ↔ audiences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| campaign_id | UUID | FK → campaigns | |
| audience_id | UUID | FK → audiences | |
| targeting_type | VARCHAR(20) | DEFAULT 'targeting' | targeting/observation/exclusion |
| bid_modifier | DECIMAL(5,2) | DEFAULT 1.0 | Bid adjustment |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(campaign_id, audience_id)

---

### Table: `pmax_asset_groups`
Performance Max asset groups.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| campaign_id | UUID | FK → campaigns | |
| platform_asset_group_id | VARCHAR(255) | NOT NULL | |
| name | VARCHAR(500) | NOT NULL | |
| status | entity_status | DEFAULT 'enabled' | |
| final_urls | TEXT[] | | |
| final_mobile_urls | TEXT[] | | |
| headlines | JSONB | DEFAULT '[]' | |
| long_headlines | JSONB | DEFAULT '[]' | |
| descriptions | JSONB | DEFAULT '[]' | |
| images | JSONB | DEFAULT '[]' | |
| logos | JSONB | DEFAULT '[]' | |
| videos | JSONB | DEFAULT '[]' | |
| business_name | VARCHAR(255) | | |
| call_to_actions | JSONB | DEFAULT '[]' | |
| asset_group_strength | VARCHAR(20) | | |
| platform_created_at | TIMESTAMPTZ | | |
| platform_updated_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(campaign_id, platform_asset_group_id)

---

### Table: `ad_extensions`
Ad extensions (sitelinks, callouts, etc).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| campaign_id | UUID | FK → campaigns, NULLABLE | Campaign-level |
| ad_group_id | UUID | FK → ad_groups, NULLABLE | Ad group-level |
| platform_extension_id | VARCHAR(255) | NOT NULL | |
| extension_type | VARCHAR(50) | NOT NULL | SITELINK/CALLOUT/CALL/LOCATION |
| status | entity_status | DEFAULT 'enabled' | |
| content | JSONB | NOT NULL | Type-specific content |
| schedules | JSONB | DEFAULT '[]' | When to show |
| device | VARCHAR(20) | | MOBILE/DESKTOP/ALL |
| platform_created_at | TIMESTAMPTZ | | |
| platform_updated_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(ad_account_id, platform_extension_id)

---

## Module 5: Performance Metrics

### Table: `campaign_metrics_daily` (PARTITIONED)
Daily campaign performance metrics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | | |
| campaign_id | UUID | NOT NULL | FK handled at app level |
| date | DATE | NOT NULL | |
| impressions | BIGINT | DEFAULT 0 | |
| clicks | BIGINT | DEFAULT 0 | |
| cost_micros | BIGINT | DEFAULT 0 | Cost in millionths |
| conversions | DECIMAL(15,2) | DEFAULT 0 | |
| conversions_value | DECIMAL(15,2) | DEFAULT 0 | |
| all_conversions | DECIMAL(15,2) | DEFAULT 0 | Including view-through |
| all_conversions_value | DECIMAL(15,2) | DEFAULT 0 | |
| view_through_conversions | BIGINT | DEFAULT 0 | |
| video_views | BIGINT | DEFAULT 0 | |
| video_quartile_p25_rate | DECIMAL(5,2) | | |
| video_quartile_p50_rate | DECIMAL(5,2) | | |
| video_quartile_p75_rate | DECIMAL(5,2) | | |
| video_quartile_p100_rate | DECIMAL(5,2) | | |
| engagements | BIGINT | DEFAULT 0 | |
| interactions | BIGINT | DEFAULT 0 | |
| impression_share | DECIMAL(5,2) | | |
| search_impression_share | DECIMAL(5,2) | | |
| search_top_impression_share | DECIMAL(5,2) | | |
| search_abs_top_impression_share | DECIMAL(5,2) | | |
| search_lost_is_budget | DECIMAL(5,2) | | Lost due to budget |
| search_lost_is_rank | DECIMAL(5,2) | | Lost due to rank |
| ctr | DECIMAL(8,4) | GENERATED | clicks/impressions |
| cpc | DECIMAL(15,2) | GENERATED | cost/clicks |
| cpm | DECIMAL(15,2) | GENERATED | cost/impressions*1000 |
| cpa | DECIMAL(15,2) | GENERATED | cost/conversions |
| roas | DECIMAL(10,2) | GENERATED | value/cost |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Primary Key:** (id, date)
**Partitioned By:** RANGE (date) - Monthly partitions
**Unique Constraint:** (campaign_id, date)

---

### Table: `campaign_metrics_hourly`
Recent hourly metrics (7 days retention).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| campaign_id | UUID | NOT NULL | |
| datetime | TIMESTAMPTZ | NOT NULL | Hour precision |
| impressions | BIGINT | DEFAULT 0 | |
| clicks | BIGINT | DEFAULT 0 | |
| cost_micros | BIGINT | DEFAULT 0 | |
| conversions | DECIMAL(15,2) | DEFAULT 0 | |
| conversions_value | DECIMAL(15,2) | DEFAULT 0 | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Unique Constraint:** (campaign_id, datetime)

---

### Table: `keyword_metrics_daily` (PARTITIONED)
Daily keyword performance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | | |
| keyword_id | UUID | NOT NULL | |
| date | DATE | NOT NULL | |
| impressions | BIGINT | DEFAULT 0 | |
| clicks | BIGINT | DEFAULT 0 | |
| cost_micros | BIGINT | DEFAULT 0 | |
| conversions | DECIMAL(15,2) | DEFAULT 0 | |
| conversions_value | DECIMAL(15,2) | DEFAULT 0 | |
| quality_score | INTEGER | | Snapshot |
| quality_score_creative | DECIMAL(3,1) | | |
| quality_score_landing_page | DECIMAL(3,1) | | |
| quality_score_expected_ctr | DECIMAL(3,1) | | |
| avg_position | DECIMAL(5,2) | | |
| top_impression_percentage | DECIMAL(5,2) | | |
| abs_top_impression_percentage | DECIMAL(5,2) | | |
| ctr | DECIMAL(8,4) | GENERATED | |
| cpc | DECIMAL(15,2) | GENERATED | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Primary Key:** (id, date)
**Partitioned By:** RANGE (date)

---

### Table: `ad_metrics_daily` (PARTITIONED)
Daily ad performance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | | |
| ad_id | UUID | NOT NULL | |
| date | DATE | NOT NULL | |
| impressions | BIGINT | DEFAULT 0 | |
| clicks | BIGINT | DEFAULT 0 | |
| cost_micros | BIGINT | DEFAULT 0 | |
| conversions | DECIMAL(15,2) | DEFAULT 0 | |
| conversions_value | DECIMAL(15,2) | DEFAULT 0 | |
| video_views | BIGINT | DEFAULT 0 | |
| video_view_rate | DECIMAL(5,2) | | |
| interactions | BIGINT | DEFAULT 0 | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Primary Key:** (id, date)
**Partitioned By:** RANGE (date)

---

### Table: `search_terms` (PARTITIONED)
Search term reports.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | | |
| ad_group_id | UUID | NOT NULL | |
| keyword_id | UUID | NULLABLE | Matched keyword |
| search_term | VARCHAR(1000) | NOT NULL | What user searched |
| keyword_text | VARCHAR(500) | | Matched keyword text |
| match_type | keyword_match_type | | |
| date | DATE | NOT NULL | |
| impressions | BIGINT | DEFAULT 0 | |
| clicks | BIGINT | DEFAULT 0 | |
| cost_micros | BIGINT | DEFAULT 0 | |
| conversions | DECIMAL(15,2) | DEFAULT 0 | |
| conversions_value | DECIMAL(15,2) | DEFAULT 0 | |
| is_added_as_keyword | BOOLEAN | DEFAULT FALSE | |
| added_as_keyword_at | TIMESTAMPTZ | | |
| is_added_as_negative | BOOLEAN | DEFAULT FALSE | |
| added_as_negative_at | TIMESTAMPTZ | | |
| ai_relevance_score | INTEGER | CHECK 0-100 | AI-generated |
| ai_classification | VARCHAR(50) | | relevant/irrelevant/unclear |
| ai_analyzed_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Primary Key:** (id, date)
**Partitioned By:** RANGE (date)
**Retention:** 90 days

---

### Table: `pmax_channel_breakdown` (PARTITIONED)
Performance Max channel-level metrics (v23 feature).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | | |
| campaign_id | UUID | NOT NULL | |
| date | DATE | NOT NULL | |
| channel | pmax_channel | NOT NULL | search/youtube/display/gmail/discover/maps |
| impressions | BIGINT | DEFAULT 0 | |
| clicks | BIGINT | DEFAULT 0 | |
| cost_micros | BIGINT | DEFAULT 0 | |
| conversions | DECIMAL(15,2) | DEFAULT 0 | |
| conversions_value | DECIMAL(15,2) | DEFAULT 0 | |
| ctr | DECIMAL(8,4) | GENERATED | |
| cpc | DECIMAL(15,2) | GENERATED | |
| roas | DECIMAL(10,2) | GENERATED | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Primary Key:** (id, date)
**Partitioned By:** RANGE (date)

---

### Table: `campaign_device_metrics_daily` (PARTITIONED)
Device breakdown.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | | |
| campaign_id | UUID | NOT NULL | |
| date | DATE | NOT NULL | |
| device | VARCHAR(20) | NOT NULL | DESKTOP/MOBILE/TABLET/CONNECTED_TV |
| impressions | BIGINT | DEFAULT 0 | |
| clicks | BIGINT | DEFAULT 0 | |
| cost_micros | BIGINT | DEFAULT 0 | |
| conversions | DECIMAL(15,2) | DEFAULT 0 | |
| conversions_value | DECIMAL(15,2) | DEFAULT 0 | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Primary Key:** (id, date)

---

### Table: `campaign_location_metrics_daily` (PARTITIONED)
Geographic breakdown.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | | |
| campaign_id | UUID | NOT NULL | |
| date | DATE | NOT NULL | |
| country_code | VARCHAR(2) | NOT NULL | |
| region | VARCHAR(100) | | |
| city | VARCHAR(100) | | |
| location_type | VARCHAR(50) | | LOCATION_OF_PRESENCE/AREA_OF_INTEREST |
| impressions | BIGINT | DEFAULT 0 | |
| clicks | BIGINT | DEFAULT 0 | |
| cost_micros | BIGINT | DEFAULT 0 | |
| conversions | DECIMAL(15,2) | DEFAULT 0 | |
| conversions_value | DECIMAL(15,2) | DEFAULT 0 | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Primary Key:** (id, date)

---

### Table: `campaign_demographic_metrics_daily` (PARTITIONED)
Age/gender breakdown.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | | |
| campaign_id | UUID | NOT NULL | |
| date | DATE | NOT NULL | |
| age_range | VARCHAR(20) | | 18-24/25-34/35-44/45-54/55-64/65+ |
| gender | VARCHAR(20) | | MALE/FEMALE/UNDETERMINED |
| impressions | BIGINT | DEFAULT 0 | |
| clicks | BIGINT | DEFAULT 0 | |
| cost_micros | BIGINT | DEFAULT 0 | |
| conversions | DECIMAL(15,2) | DEFAULT 0 | |
| conversions_value | DECIMAL(15,2) | DEFAULT 0 | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Primary Key:** (id, date)

---

### Table: `conversion_actions`
Conversion tracking configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| platform_conversion_id | VARCHAR(255) | NOT NULL | |
| name | VARCHAR(500) | NOT NULL | |
| category | VARCHAR(100) | | PURCHASE/LEAD/SIGN_UP |
| origin | VARCHAR(50) | | WEBSITE/APP/PHONE_CALL |
| primary_for_goal | BOOLEAN | DEFAULT FALSE | |
| attribution_model | VARCHAR(50) | | DATA_DRIVEN/LAST_CLICK |
| counting_type | VARCHAR(20) | | ONE_PER_CLICK/MANY_PER_CLICK |
| value_settings | JSONB | DEFAULT '{}' | |
| status | entity_status | DEFAULT 'enabled' | |
| platform_created_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(ad_account_id, platform_conversion_id)

---

## Module 6: AI & Automation

### Table: `ai_recommendations`
AI-generated recommendations for user approval.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| campaign_id | UUID | FK → campaigns, NULLABLE | If campaign-specific |
| recommendation_type | recommendation_type | NOT NULL | pause_keyword/increase_budget/etc |
| severity | severity_level | NOT NULL | info/warning/critical/opportunity |
| title | VARCHAR(255) | NOT NULL | Short title |
| description | TEXT | NOT NULL | Full explanation |
| impact_estimate | JSONB | DEFAULT '{}' | Estimated savings/gains |
| options | JSONB | DEFAULT '[]' | Array of 3 options |
| affected_entities | JSONB | DEFAULT '{}' | Keywords/campaigns/etc affected |
| status | recommendation_status | DEFAULT 'pending' | pending/approved/rejected/auto_applied/expired |
| approved_option | INTEGER | | Which option (1, 2, or 3) |
| approved_by_user_id | UUID | FK → users | Who approved |
| approved_at | TIMESTAMPTZ | | |
| applied_at | TIMESTAMPTZ | | When changes were made |
| expires_at | TIMESTAMPTZ | | Auto-expire if not actioned |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Impact Estimate JSONB:**
```json
{
  "save_amount": 47.50,
  "save_currency": "USD",
  "gain_conversions": 5,
  "improve_cpa_percent": 15,
  "confidence": "high"
}
```

**Options JSONB:**
```json
[
  {
    "option": 1,
    "label": "Safe",
    "description": "Pause keyword only",
    "expected_outcome": "Save $47/week"
  },
  {
    "option": 2,
    "label": "Moderate",
    "description": "Pause keyword + add negative",
    "expected_outcome": "Save $60/week"
  },
  {
    "option": 3,
    "label": "Aggressive",
    "description": "Pause + negative + review similar",
    "expected_outcome": "Save $100/week"
  }
]
```

---

### Table: `automation_rules`
User-defined automation rules.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| name | VARCHAR(255) | NOT NULL | Rule name |
| is_active | BOOLEAN | DEFAULT TRUE | |
| trigger_type | trigger_type | NOT NULL | keyword_waste/budget_overspend/etc |
| conditions | JSONB | NOT NULL | Rule conditions |
| action | automation_action | NOT NULL | pause/alert_only/reduce_bid |
| notification_channels | TEXT[] | | email/whatsapp/slack/in_app |
| last_triggered_at | TIMESTAMPTZ | | |
| trigger_count | INTEGER | DEFAULT 0 | Times triggered |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Conditions JSONB Examples:**

Pause wasting keywords:
```json
{
  "entity": "keyword",
  "metric": "cost",
  "operator": ">",
  "threshold": 50,
  "time_period_days": 7,
  "additional": {
    "conversions": 0
  }
}
```

Budget overspend alert:
```json
{
  "entity": "campaign",
  "metric": "daily_spend",
  "operator": ">",
  "threshold_multiplier": 1.5,
  "compare_to": "daily_budget"
}
```

---

### Table: `automation_executions`
Log of automation rule executions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| rule_id | UUID | FK → automation_rules | |
| recommendation_id | UUID | FK → ai_recommendations, NULLABLE | If created recommendation |
| affected_entities | JSONB | | What was affected |
| action_taken | VARCHAR(100) | | What action was performed |
| before_state | JSONB | | State before action |
| after_state | JSONB | | State after action |
| executed_at | TIMESTAMPTZ | DEFAULT NOW() | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

## Module 7: Alerts & Notifications

### Table: `alerts`
User notifications and alerts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| user_id | UUID | FK → users | |
| alert_type | alert_type | NOT NULL | waste_detected/budget_exceeded/etc |
| severity | severity_level | NOT NULL | info/warning/critical |
| title | VARCHAR(255) | NOT NULL | |
| message | TEXT | NOT NULL | |
| related_entity_type | VARCHAR(50) | | campaign/keyword/ad_group |
| related_entity_id | UUID | | |
| action_url | TEXT | | Deep link to fix |
| is_read | BOOLEAN | DEFAULT FALSE | |
| is_dismissed | BOOLEAN | DEFAULT FALSE | |
| sent_via | TEXT[] | | email/whatsapp/slack/in_app |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Table: `notification_preferences`
Per-user notification settings (alternative to JSONB in users).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK → users | |
| alert_type | alert_type | NOT NULL | |
| email_enabled | BOOLEAN | DEFAULT TRUE | |
| whatsapp_enabled | BOOLEAN | DEFAULT FALSE | |
| slack_enabled | BOOLEAN | DEFAULT FALSE | |
| in_app_enabled | BOOLEAN | DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(user_id, alert_type)

---

## Module 8: AI Chat

### Table: `ai_conversations`
AI Advisor conversation threads.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK → users | |
| ad_account_id | UUID | FK → ad_accounts, NULLABLE | Account context |
| title | VARCHAR(255) | | Auto-generated from first message |
| last_message_at | TIMESTAMPTZ | | |
| message_count | INTEGER | DEFAULT 0 | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Table: `ai_messages`
Individual messages in conversations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| conversation_id | UUID | FK → ai_conversations | |
| role | message_role | NOT NULL | user/assistant/system |
| content | TEXT | NOT NULL | Message content |
| context_data | JSONB | DEFAULT '{}' | Metrics injected into prompt |
| model_used | VARCHAR(50) | | gemini-flash/gemini-pro |
| tokens_input | INTEGER | | Input tokens used |
| tokens_output | INTEGER | | Output tokens used |
| latency_ms | INTEGER | | Response time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

## Module 9: Reports & Analytics

### Table: `reports`
Generated reports.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| report_type | report_type | NOT NULL | weekly_summary/monthly/before_after/audit |
| title | VARCHAR(255) | NOT NULL | |
| date_range_start | DATE | NOT NULL | |
| date_range_end | DATE | NOT NULL | |
| content | JSONB | NOT NULL | Structured report data |
| ai_summary | TEXT | | Plain English summary |
| file_url | TEXT | | PDF download URL |
| is_scheduled | BOOLEAN | DEFAULT FALSE | Auto-generated? |
| scheduled_frequency | VARCHAR(20) | | weekly/monthly |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Table: `account_snapshots`
Point-in-time snapshots for comparison.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| snapshot_type | snapshot_type | NOT NULL | initial/monthly/on_demand |
| snapshot_date | DATE | NOT NULL | |
| metrics | JSONB | NOT NULL | Performance snapshot |
| campaigns_data | JSONB | | Campaign-level snapshot |
| keywords_data | JSONB | | Top keywords snapshot |
| waste_identified | JSONB | | Waste at time of snapshot |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Metrics JSONB:**
```json
{
  "total_spend": 5000.00,
  "total_conversions": 150,
  "avg_cpa": 33.33,
  "avg_roas": 3.2,
  "wasted_spend": 847.50,
  "top_campaign_id": "uuid",
  "worst_campaign_id": "uuid"
}
```

---

### Table: `health_scores`
Daily account health scores.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| date | DATE | NOT NULL | |
| overall_score | INTEGER | CHECK 0-100 | |
| waste_score | DECIMAL(3,1) | CHECK 0-10 | |
| targeting_score | DECIMAL(3,1) | CHECK 0-10 | |
| ad_quality_score | DECIMAL(3,1) | CHECK 0-10 | |
| budget_efficiency_score | DECIMAL(3,1) | CHECK 0-10 | |
| roi_score | DECIMAL(3,1) | CHECK 0-10 | |
| keyword_health_score | DECIMAL(3,1) | CHECK 0-10 | |
| tracking_score | DECIMAL(3,1) | CHECK 0-10 | |
| competitive_score | DECIMAL(3,1) | CHECK 0-10 | |
| details | JSONB | | Breakdown and explanations |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(ad_account_id, date)

---

## Module 10: Sync & Audit

### Table: `sync_jobs`
Background sync job tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| job_type | sync_job_type | NOT NULL | full_sync/incremental/metrics |
| status | job_status | NOT NULL | pending/running/completed/failed |
| started_at | TIMESTAMPTZ | | |
| completed_at | TIMESTAMPTZ | | |
| duration_ms | INTEGER | | |
| records_synced | INTEGER | DEFAULT 0 | |
| records_created | INTEGER | DEFAULT 0 | |
| records_updated | INTEGER | DEFAULT 0 | |
| records_deleted | INTEGER | DEFAULT 0 | |
| error_message | TEXT | | |
| error_details | JSONB | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Table: `change_history`
Audit trail for all changes made.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| user_id | UUID | FK → users, NULLABLE | NULL = AI made change |
| entity_type | VARCHAR(50) | NOT NULL | campaign/keyword/ad/etc |
| entity_id | UUID | NOT NULL | |
| change_type | change_type | NOT NULL | create/update/delete/pause/enable |
| field_changed | VARCHAR(100) | | Specific field |
| old_value | TEXT | | |
| new_value | TEXT | | |
| source | change_source | NOT NULL | user_manual/ai_recommendation/automation_rule |
| recommendation_id | UUID | FK → ai_recommendations, NULLABLE | If from recommendation |
| automation_rule_id | UUID | FK → automation_rules, NULLABLE | If from rule |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

## Module 11: Agency Management

### Table: `agency_clients`
Agency clients (nested model).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| agency_organization_id | UUID | FK → organizations | Parent agency |
| client_name | VARCHAR(255) | NOT NULL | |
| client_logo_url | TEXT | | |
| billing_email | VARCHAR(255) | | |
| monthly_fee | DECIMAL(10,2) | | What agency charges |
| notes | TEXT | | Internal notes |
| is_active | BOOLEAN | DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Table: `agency_client_accounts`
Links clients to ad accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| agency_client_id | UUID | FK → agency_clients, NULLABLE | For nested model |
| organization_id | UUID | FK → organizations, NULLABLE | For separate org model |
| ad_account_id | UUID | FK → ad_accounts | |
| relationship_type | relationship_type | NOT NULL | nested_client/linked_organization |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

## Module 12: Permissions

### Table: `ad_account_permissions`
Account-level access control.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK → users | |
| ad_account_id | UUID | FK → ad_accounts | |
| permission_level | permission_level | NOT NULL | view/edit/admin/owner |
| inherit_to_campaigns | BOOLEAN | DEFAULT TRUE | Apply to all campaigns? |
| granted_by_user_id | UUID | FK → users | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(user_id, ad_account_id)

---

### Table: `campaign_permissions`
Campaign-level access control.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK → users | |
| campaign_id | UUID | FK → campaigns | |
| permission_level | permission_level | NOT NULL | view/edit/admin |
| granted_by_user_id | UUID | FK → users | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(user_id, campaign_id)

---

## Module 13: Competitors

### Table: `competitors`
Tracked competitors.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| ad_account_id | UUID | FK → ad_accounts | |
| competitor_domain | VARCHAR(255) | NOT NULL | |
| competitor_name | VARCHAR(255) | | |
| first_seen_at | TIMESTAMPTZ | | |
| last_seen_at | TIMESTAMPTZ | | |
| is_tracked | BOOLEAN | DEFAULT TRUE | User marked to track |
| notes | TEXT | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

### Table: `competitor_metrics_daily`
Auction insights data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| competitor_id | UUID | FK → competitors | |
| campaign_id | UUID | FK → campaigns | |
| date | DATE | NOT NULL | |
| impression_share | DECIMAL(5,2) | | |
| overlap_rate | DECIMAL(5,2) | | |
| position_above_rate | DECIMAL(5,2) | | |
| top_of_page_rate | DECIMAL(5,2) | | |
| abs_top_of_page_rate | DECIMAL(5,2) | | |
| outranking_share | DECIMAL(5,2) | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- UNIQUE(competitor_id, campaign_id, date)

---

### Table: `competitor_ads`
Observed competitor ads.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| competitor_id | UUID | FK → competitors | |
| ad_type | VARCHAR(50) | | |
| headlines | JSONB | DEFAULT '[]' | |
| descriptions | JSONB | DEFAULT '[]' | |
| display_url | VARCHAR(255) | | |
| observed_keywords | TEXT[] | | Keywords triggered |
| first_seen_at | TIMESTAMPTZ | | |
| last_seen_at | TIMESTAMPTZ | | |
| is_active | BOOLEAN | DEFAULT TRUE | Still being seen? |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

## Data Types & Enums

```sql
-- Module 1: Users
CREATE TYPE organization_type AS ENUM ('individual', 'business', 'agency');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Module 2: Billing
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'unpaid', 'paused');
CREATE TYPE billing_interval AS ENUM ('monthly', 'yearly');

-- Module 3: Ad Accounts
CREATE TYPE ad_platform AS ENUM ('google_ads', 'meta', 'tiktok', 'linkedin', 'twitter');
CREATE TYPE account_status AS ENUM ('active', 'paused', 'disconnected', 'error', 'pending_auth');

-- Module 4: Campaigns
CREATE TYPE campaign_type AS ENUM ('search', 'pmax', 'display', 'shopping', 'video', 'app', 'smart', 'discovery', 'local', 'demand_gen');
CREATE TYPE entity_status AS ENUM ('enabled', 'paused', 'removed', 'pending', 'unknown');
CREATE TYPE bidding_strategy AS ENUM ('manual_cpc', 'manual_cpm', 'maximize_clicks', 'maximize_conversions', 'maximize_conversion_value', 'target_cpa', 'target_roas', 'target_impression_share', 'target_spend', 'enhanced_cpc');
CREATE TYPE budget_type AS ENUM ('daily', 'total', 'shared');
CREATE TYPE ad_type AS ENUM ('responsive_search', 'responsive_display', 'expanded_text', 'image', 'video', 'shopping_product', 'shopping_showcase', 'app_ad', 'call_only', 'discovery_multi_asset', 'pmax_asset_group');
CREATE TYPE keyword_match_type AS ENUM ('exact', 'phrase', 'broad');
CREATE TYPE audience_type AS ENUM ('remarketing', 'custom', 'in_market', 'affinity', 'lookalike', 'combined', 'customer_match', 'similar');

-- Module 5: Metrics
CREATE TYPE pmax_channel AS ENUM ('search', 'youtube', 'display', 'gmail', 'discover', 'maps', 'shopping');

-- Module 6: AI
CREATE TYPE recommendation_type AS ENUM ('pause_keyword', 'increase_budget', 'decrease_budget', 'new_negative', 'change_bidding', 'new_audience', 'ad_copy', 'emergency_stop', 'schedule_change');
CREATE TYPE recommendation_status AS ENUM ('pending', 'approved', 'rejected', 'auto_applied', 'expired');
CREATE TYPE severity_level AS ENUM ('info', 'warning', 'critical', 'opportunity');
CREATE TYPE trigger_type AS ENUM ('keyword_waste', 'budget_overspend', 'low_quality', 'no_conversions', 'anomaly_detected', 'schedule');
CREATE TYPE automation_action AS ENUM ('pause', 'enable', 'alert_only', 'reduce_bid', 'increase_bid', 'adjust_budget');

-- Module 7: Alerts
CREATE TYPE alert_type AS ENUM ('waste_detected', 'budget_exceeded', 'campaign_paused', 'tracking_broken', 'anomaly', 'opportunity', 'emergency', 'system');

-- Module 8: Chat
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

-- Module 9: Reports
CREATE TYPE report_type AS ENUM ('weekly_summary', 'monthly_summary', 'before_after', 'competitor_analysis', 'full_audit', 'custom');
CREATE TYPE snapshot_type AS ENUM ('initial', 'monthly', 'on_demand');

-- Module 10: Sync
CREATE TYPE sync_job_type AS ENUM ('full_sync', 'incremental_sync', 'metrics_sync', 'search_terms_sync');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE change_type AS ENUM ('create', 'update', 'delete', 'pause', 'enable');
CREATE TYPE change_source AS ENUM ('user_manual', 'ai_recommendation', 'automation_rule', 'platform_sync');

-- Module 11: Agency
CREATE TYPE relationship_type AS ENUM ('nested_client', 'linked_organization');

-- Module 12: Permissions
CREATE TYPE permission_level AS ENUM ('view', 'edit', 'admin', 'owner');
```

---

## Indexing Strategy

### Primary Indexes (Auto-created)
All primary keys get automatic B-tree indexes.

### Foreign Key Indexes
```sql
-- CRITICAL: Always index foreign keys for JOIN performance
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_ad_accounts_org ON ad_accounts(organization_id);
CREATE INDEX idx_campaigns_account ON campaigns(ad_account_id);
CREATE INDEX idx_ad_groups_campaign ON ad_groups(campaign_id);
CREATE INDEX idx_ads_ad_group ON ads(ad_group_id);
CREATE INDEX idx_keywords_ad_group ON keywords(ad_group_id);
-- ... (all FKs)
```

### Query-Optimized Indexes
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);

-- Active records only
CREATE INDEX idx_campaigns_active ON campaigns(ad_account_id, status) WHERE status = 'enabled';
CREATE INDEX idx_keywords_active ON keywords(ad_group_id, status) WHERE status = 'enabled';

-- Metrics (most common queries)
CREATE INDEX idx_campaign_metrics_lookup ON campaign_metrics_daily(campaign_id, date DESC);
CREATE INDEX idx_keyword_metrics_lookup ON keyword_metrics_daily(keyword_id, date DESC);
CREATE INDEX idx_pmax_channel_lookup ON pmax_channel_breakdown(campaign_id, date DESC, channel);

-- Waste detection (critical feature)
CREATE INDEX idx_search_terms_waste ON search_terms(ad_group_id, date, conversions) WHERE conversions = 0;
CREATE INDEX idx_keywords_low_quality ON keywords(ad_group_id, quality_score) WHERE quality_score < 5;

-- Recommendations
CREATE INDEX idx_recommendations_pending ON ai_recommendations(ad_account_id, status) WHERE status = 'pending';

-- Alerts
CREATE INDEX idx_alerts_unread ON alerts(user_id, is_read) WHERE is_read = FALSE;

-- Sync jobs
CREATE INDEX idx_sync_jobs_pending ON sync_jobs(status, created_at) WHERE status = 'pending';
```

### Partial Indexes
Only index rows that match common query patterns:
```sql
-- Only active campaigns
CREATE INDEX idx_campaigns_active ON campaigns(ad_account_id) WHERE status = 'enabled';

-- Only pending recommendations
CREATE INDEX idx_recommendations_pending ON ai_recommendations(ad_account_id) WHERE status = 'pending';

-- Only unread alerts
CREATE INDEX idx_alerts_unread ON alerts(user_id) WHERE is_read = FALSE;
```

---

## Partitioning Strategy

### Tables to Partition
Partition tables expected to grow large (millions of rows):

| Table | Partition By | Retention |
|-------|-------------|-----------|
| campaign_metrics_daily | RANGE (date) | 3 years |
| campaign_metrics_hourly | (not partitioned) | 7 days |
| keyword_metrics_daily | RANGE (date) | 3 years |
| ad_metrics_daily | RANGE (date) | 3 years |
| search_terms | RANGE (date) | 90 days |
| pmax_channel_breakdown | RANGE (date) | 3 years |
| campaign_device_metrics_daily | RANGE (date) | 1 year |
| campaign_location_metrics_daily | RANGE (date) | 1 year |
| campaign_demographic_metrics_daily | RANGE (date) | 1 year |

### Partition Creation
```sql
-- Monthly partitions
CREATE TABLE campaign_metrics_daily_2026_01 PARTITION OF campaign_metrics_daily
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Automate with pg_partman or cron job
```

### Partition Maintenance
```sql
-- Function to create next month's partitions
CREATE OR REPLACE FUNCTION create_next_month_partitions()
RETURNS void AS $$
-- Creates partitions for next month for all partitioned tables
$$ LANGUAGE plpgsql;

-- Run monthly via pg_cron
SELECT cron.schedule('create-partitions', '0 0 25 * *', 'SELECT create_next_month_partitions()');
```

---

## Security Considerations

### 1. OAuth Token Encryption
```
- Algorithm: AES-256-GCM
- Key storage: Environment variable (AWS Secrets Manager in production)
- Key rotation: Quarterly
- Never log tokens (even encrypted)
```

### 2. Row-Level Security (RLS)
```sql
-- Enable RLS on sensitive tables
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their organization's accounts
CREATE POLICY ad_accounts_org_policy ON ad_accounts
    FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = current_user_id()
    ));
```

### 3. Data Classification
```
- PII: users.email, users.phone → encrypted at rest
- Secrets: oauth_tokens.* → encrypted at application level
- Business Sensitive: all metrics → standard encryption
```

### 4. Audit Requirements
```
- All changes logged to change_history
- Login/logout to user_sessions
- API access logged (separate logging system)
```

---

## Data Retention Policy

| Data Type | Retention | Reasoning |
|-----------|-----------|-----------|
| User accounts | Forever | Legal requirement |
| OAuth tokens | Until revoked | Security |
| Campaign metrics (daily) | 3 years | Analysis needs |
| Campaign metrics (hourly) | 7 days | Aggregated to daily |
| Keyword metrics | 3 years | Analysis needs |
| Search terms | 90 days | Storage optimization |
| AI messages | 1 year | Debugging, compliance |
| Change history | 2 years | Audit requirement |
| Sync jobs | 30 days | Debugging |
| Alerts (read) | 90 days | Cleanup |
| Reports | 2 years | Business records |

### Cleanup Jobs
```sql
-- Run daily via pg_cron
DELETE FROM campaign_metrics_hourly WHERE datetime < NOW() - INTERVAL '7 days';
DELETE FROM search_terms WHERE date < NOW() - INTERVAL '90 days';
DELETE FROM sync_jobs WHERE status = 'completed' AND created_at < NOW() - INTERVAL '30 days';
DELETE FROM alerts WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '90 days';
```

---

## Summary

### Table Counts by Module

| Module | Tables | Partitioned |
|--------|--------|-------------|
| 1. Core Users | 4 | 0 |
| 2. Billing | 6 | 0 |
| 3. Ad Accounts | 4 | 0 |
| 4. Campaigns | 9 | 0 |
| 5. Metrics | 9 | 8 |
| 6. AI & Automation | 3 | 0 |
| 7. Alerts | 2 | 0 |
| 8. Chat | 2 | 0 |
| 9. Reports | 3 | 0 |
| 10. Sync & Audit | 2 | 0 |
| 11. Agency | 2 | 0 |
| 12. Permissions | 2 | 0 |
| 13. Competitors | 3 | 0 |
| **TOTAL** | **51** | **8** |

### Next Steps
1. Review this schema plan
2. Approve or request changes
3. Then move to Phase 2: System Architecture

---

*Document Version: 1.0*
*Created: March 2026*
*Status: PENDING APPROVAL*
