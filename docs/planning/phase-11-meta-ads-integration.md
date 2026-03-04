# Phase 11: Meta Ads Integration

## Overview

Comprehensive integration plan for Meta (Facebook/Instagram) Ads platform, enabling users to manage Facebook, Instagram, Messenger, and Audience Network ads alongside Google Ads.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      META ADS ECOSYSTEM                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│   │  Facebook   │    │  Instagram  │    │  Messenger  │    │  Audience   │  │
│   │    Feed     │    │  Feed/Story │    │    Inbox    │    │   Network   │  │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│          │                  │                  │                  │          │
│          └──────────────────┴──────────────────┴──────────────────┘          │
│                                    │                                         │
│                         ┌──────────▼──────────┐                              │
│                         │   Meta Marketing    │                              │
│                         │     API v21.0       │                              │
│                         └──────────┬──────────┘                              │
│                                    │                                         │
│                         ┌──────────▼──────────┐                              │
│                         │     AdsMaster       │                              │
│                         │    Integration      │                              │
│                         └─────────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1. Meta Marketing API Overview

### 1.1 API Version
- **Current Version**: v21.0 (2024-2025)
- **Base URL**: `https://graph.facebook.com/v21.0/`
- **Rate Limits**: Business Use Case rate limiting (BUC)

### 1.2 Key Differences: Meta vs Google Ads

| Aspect | Google Ads | Meta Ads |
|--------|------------|----------|
| **Structure** | Account → Campaign → Ad Group → Ad | Ad Account → Campaign → Ad Set → Ad |
| **Bidding Entity** | Ad Group level | Ad Set level |
| **Targeting** | Keywords + Audiences | Audiences only (no keywords) |
| **Creative** | Text-based RSAs | Visual (images, videos, carousels) |
| **Placements** | Search, Display, YouTube | Facebook, Instagram, Messenger, AN |
| **Pixel** | Conversion tracking tag | Meta Pixel + Conversions API (CAPI) |
| **API Style** | gRPC + REST | GraphQL-style REST |
| **Auth** | OAuth 2.0 + Developer Token | OAuth 2.0 + System User Token |

### 1.3 Account Hierarchy

```
Business Manager (Business ID)
├── Ad Account 1 (act_123456789)
│   ├── Campaign (Awareness)
│   │   ├── Ad Set (Targeting Group 1)
│   │   │   ├── Ad (Creative 1)
│   │   │   └── Ad (Creative 2)
│   │   └── Ad Set (Targeting Group 2)
│   │       └── Ad (Creative 3)
│   └── Campaign (Conversions)
│       └── Ad Set (Retargeting)
│           └── Ad (Dynamic Product Ad)
├── Ad Account 2 (act_987654321)
│   └── ...
├── Pages
│   ├── Facebook Page 1
│   └── Facebook Page 2
├── Instagram Accounts
│   └── Instagram Business Account
├── Pixels
│   └── Meta Pixel (for conversion tracking)
└── Product Catalogs
    └── E-commerce Catalog
```

---

## 2. Authentication & Permissions

### 2.1 OAuth 2.0 Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │ AdsMaster│     │ Facebook │     │ Meta API │
│          │     │ Frontend │     │  Login   │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Click "Connect │                │                │
     │ Meta Ads"      │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ Redirect to FB │                │
     │                │ OAuth Dialog   │                │
     │                │───────────────>│                │
     │                │                │                │
     │<───────────────────────────────│                │
     │     Facebook Login Dialog      │                │
     │                                │                │
     │ User approves permissions      │                │
     │───────────────────────────────>│                │
     │                                │                │
     │                │<──────────────│                │
     │                │ Authorization │                │
     │                │ Code          │                │
     │                │                │                │
     │                │ Exchange code │                │
     │                │ for tokens    │                │
     │                │───────────────────────────────>│
     │                │                                │
     │                │<───────────────────────────────│
     │                │ Access Token + User Token      │
     │                │                                │
     │                │ Get long-lived token           │
     │                │───────────────────────────────>│
     │                │                                │
     │                │<───────────────────────────────│
     │                │ Long-lived User Token (60 days)│
     │<───────────────│                                │
     │ Connected!     │                                │
     │                │                                │
```

### 2.2 Required Permissions

```python
META_PERMISSIONS = [
    # Core Ad Management
    "ads_management",           # Create, edit, delete ads
    "ads_read",                 # Read ad account data

    # Business Management
    "business_management",      # Manage business assets

    # Page & Instagram
    "pages_read_engagement",    # Read page data
    "pages_show_list",          # List pages
    "instagram_basic",          # Instagram account info
    "instagram_manage_insights",# Instagram insights

    # Insights & Reporting
    "read_insights",            # Read ad insights

    # Catalog (for Dynamic Ads)
    "catalog_management",       # Product catalogs
]
```

### 2.3 Token Types & Lifecycle

| Token Type | Duration | Use Case |
|------------|----------|----------|
| Short-lived User Token | 1-2 hours | Initial OAuth |
| Long-lived User Token | 60 days | Standard API calls |
| System User Token | Never expires | Server-to-server (recommended) |
| Page Access Token | Never expires | Page-specific operations |

### 2.4 Token Management

```python
# backend/app/services/meta_auth_service.py
from datetime import datetime, timedelta
import httpx

class MetaAuthService:
    """Handle Meta OAuth and token management."""

    GRAPH_API_VERSION = "v21.0"
    BASE_URL = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret

    def get_oauth_url(self, redirect_uri: str, state: str) -> str:
        """Generate Facebook OAuth URL."""
        permissions = ",".join(META_PERMISSIONS)
        return (
            f"https://www.facebook.com/{self.GRAPH_API_VERSION}/dialog/oauth?"
            f"client_id={self.app_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope={permissions}"
            f"&state={state}"
            f"&response_type=code"
        )

    async def exchange_code_for_token(
        self,
        code: str,
        redirect_uri: str
    ) -> dict:
        """Exchange authorization code for access token."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/oauth/access_token",
                params={
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "redirect_uri": redirect_uri,
                    "code": code,
                }
            )
            return response.json()

    async def get_long_lived_token(self, short_lived_token: str) -> dict:
        """Exchange short-lived token for long-lived token (60 days)."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "fb_exchange_token": short_lived_token,
                }
            )
            data = response.json()
            # Calculate expiry (60 days from now)
            data["expires_at"] = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 5184000))
            return data

    async def refresh_token_if_needed(self, ad_account_id: str) -> str:
        """Check token expiry and refresh if within 7 days of expiration."""
        token_data = await self.get_stored_token(ad_account_id)

        if token_data["expires_at"] < datetime.utcnow() + timedelta(days=7):
            # Refresh the token
            new_token_data = await self.get_long_lived_token(token_data["access_token"])
            await self.store_token(ad_account_id, new_token_data)
            return new_token_data["access_token"]

        return token_data["access_token"]

    async def get_ad_accounts(self, access_token: str) -> list:
        """Get all ad accounts the user has access to."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/me/adaccounts",
                params={
                    "access_token": access_token,
                    "fields": "id,name,account_status,currency,timezone_name,business"
                }
            )
            return response.json().get("data", [])
```

---

## 3. Database Schema Additions

### 3.1 Meta-Specific Tables

```sql
-- Meta Ad Account Extensions
CREATE TABLE meta_ad_account_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,

    -- Meta-specific fields
    business_id VARCHAR(50),           -- Business Manager ID
    business_name VARCHAR(255),
    facebook_page_id VARCHAR(50),
    facebook_page_name VARCHAR(255),
    instagram_account_id VARCHAR(50),
    instagram_username VARCHAR(100),

    -- Pixel & Tracking
    pixel_id VARCHAR(50),
    pixel_name VARCHAR(255),

    -- Account settings
    funding_source_type VARCHAR(50),   -- CREDIT_CARD, PAYPAL, etc.
    spend_cap BIGINT,                  -- In micros
    amount_spent BIGINT,               -- Lifetime spend in micros

    -- Permissions
    permitted_tasks TEXT[],            -- MANAGE, ADVERTISE, ANALYZE

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ad_account_id)
);

-- Meta Campaigns (extends base campaigns table)
CREATE TABLE meta_campaign_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

    -- Meta-specific campaign fields
    objective VARCHAR(50) NOT NULL,    -- OUTCOME_AWARENESS, OUTCOME_ENGAGEMENT,
                                       -- OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_TRAFFIC
    special_ad_categories TEXT[],      -- HOUSING, EMPLOYMENT, CREDIT, POLITICAL
    buying_type VARCHAR(20),           -- AUCTION, RESERVED

    -- Advantage+ Campaign Budget (formerly CBO)
    is_campaign_budget_optimization BOOLEAN DEFAULT false,
    daily_budget BIGINT,               -- In micros (if CBO enabled)
    lifetime_budget BIGINT,            -- In micros (if CBO enabled)

    -- Bid Strategy
    bid_strategy VARCHAR(50),          -- LOWEST_COST_WITHOUT_CAP, LOWEST_COST_WITH_BID_CAP,
                                       -- COST_CAP, MINIMUM_ROAS

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(campaign_id)
);

-- Meta Ad Sets (equivalent to Google Ad Groups but with targeting)
CREATE TABLE meta_ad_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    platform_ad_set_id VARCHAR(50) NOT NULL,

    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,       -- ACTIVE, PAUSED, DELETED, ARCHIVED

    -- Budget (if not using CBO)
    daily_budget BIGINT,
    lifetime_budget BIGINT,

    -- Bidding
    bid_amount BIGINT,                 -- In micros
    billing_event VARCHAR(30),         -- IMPRESSIONS, LINK_CLICKS, POST_ENGAGEMENT
    optimization_goal VARCHAR(50),     -- REACH, IMPRESSIONS, LINK_CLICKS, CONVERSIONS

    -- Schedule
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,

    -- Targeting (stored as JSONB for flexibility)
    targeting JSONB NOT NULL,          -- See targeting structure below

    -- Placements
    placements JSONB,                  -- Automatic or manual placements

    -- Attribution
    attribution_spec JSONB,            -- Click-through, view-through windows

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(platform_ad_set_id)
);

-- Targeting structure example:
-- {
--   "geo_locations": {
--     "countries": ["US", "CA"],
--     "cities": [{"key": "123456", "name": "New York"}]
--   },
--   "age_min": 25,
--   "age_max": 54,
--   "genders": [1, 2],  -- 1=male, 2=female
--   "interests": [
--     {"id": "6003139266461", "name": "Fitness"}
--   ],
--   "behaviors": [...],
--   "custom_audiences": [
--     {"id": "123456789", "name": "Website Visitors 30d"}
--   ],
--   "lookalike_audiences": [...],
--   "excluded_custom_audiences": [...]
-- }

-- Meta Ads (Creative-focused)
CREATE TABLE meta_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_set_id UUID NOT NULL REFERENCES meta_ad_sets(id) ON DELETE CASCADE,
    platform_ad_id VARCHAR(50) NOT NULL,

    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,

    -- Creative Type
    creative_type VARCHAR(30),         -- IMAGE, VIDEO, CAROUSEL, COLLECTION, INSTANT_EXPERIENCE

    -- Creative Reference
    creative_id VARCHAR(50),           -- Meta Creative ID

    -- Ad Content
    primary_text TEXT,                 -- Main ad copy
    headline VARCHAR(255),
    description VARCHAR(255),
    call_to_action VARCHAR(50),        -- SHOP_NOW, LEARN_MORE, SIGN_UP, etc.
    link_url TEXT,
    display_url VARCHAR(255),

    -- Media
    image_url TEXT,
    image_hash VARCHAR(32),
    video_id VARCHAR(50),
    thumbnail_url TEXT,

    -- Carousel (if applicable)
    carousel_cards JSONB,              -- Array of card objects

    -- Tracking
    url_parameters TEXT,               -- UTM parameters

    -- Review Status
    review_status VARCHAR(30),         -- PENDING, APPROVED, DISAPPROVED
    disapproval_reasons TEXT[],

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(platform_ad_id)
);

-- Meta Ad Set Metrics Daily
CREATE TABLE meta_ad_set_metrics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_set_id UUID NOT NULL REFERENCES meta_ad_sets(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Core Metrics
    impressions BIGINT DEFAULT 0,
    reach BIGINT DEFAULT 0,            -- Unique people who saw the ad
    frequency DECIMAL(10,4),           -- impressions / reach
    clicks BIGINT DEFAULT 0,
    link_clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,

    -- Engagement
    post_engagements BIGINT DEFAULT 0,
    post_reactions BIGINT DEFAULT 0,
    post_comments BIGINT DEFAULT 0,
    post_shares BIGINT DEFAULT 0,
    video_views BIGINT DEFAULT 0,
    video_views_p25 BIGINT DEFAULT 0,
    video_views_p50 BIGINT DEFAULT 0,
    video_views_p75 BIGINT DEFAULT 0,
    video_views_p100 BIGINT DEFAULT 0,

    -- Conversions (from Pixel/CAPI)
    conversions BIGINT DEFAULT 0,
    conversion_value_micros BIGINT DEFAULT 0,
    purchases BIGINT DEFAULT 0,
    purchase_value_micros BIGINT DEFAULT 0,
    leads BIGINT DEFAULT 0,
    add_to_carts BIGINT DEFAULT 0,

    -- Calculated (stored for performance)
    ctr DECIMAL(10,6) GENERATED ALWAYS AS (
        CASE WHEN impressions > 0 THEN clicks::DECIMAL / impressions ELSE 0 END
    ) STORED,
    cpc_micros BIGINT GENERATED ALWAYS AS (
        CASE WHEN clicks > 0 THEN cost_micros / clicks ELSE 0 END
    ) STORED,
    cpm_micros BIGINT GENERATED ALWAYS AS (
        CASE WHEN impressions > 0 THEN (cost_micros * 1000) / impressions ELSE 0 END
    ) STORED,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ad_set_id, date)
) PARTITION BY RANGE (date);

-- Create partitions
CREATE TABLE meta_ad_set_metrics_daily_2026_01 PARTITION OF meta_ad_set_metrics_daily
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Meta Audiences (Custom & Lookalike)
CREATE TABLE meta_audiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
    platform_audience_id VARCHAR(50) NOT NULL,

    name VARCHAR(255) NOT NULL,
    audience_type VARCHAR(30) NOT NULL, -- CUSTOM, LOOKALIKE, SAVED
    subtype VARCHAR(50),               -- WEBSITE, CUSTOMER_FILE, ENGAGEMENT, VIDEO, etc.

    -- Audience Details
    description TEXT,
    approximate_count BIGINT,          -- Estimated audience size

    -- Lookalike specific
    lookalike_spec JSONB,              -- Source audience, country, ratio

    -- Custom Audience specific
    retention_days INT,                -- For website audiences
    rule JSONB,                        -- Audience rule definition

    -- Status
    status VARCHAR(20),                -- READY, UPDATING, TOO_SMALL
    operation_status JSONB,            -- Detailed status info

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(platform_audience_id)
);

-- Meta Creative Assets
CREATE TABLE meta_creative_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,

    asset_type VARCHAR(20) NOT NULL,   -- IMAGE, VIDEO
    platform_asset_id VARCHAR(50),     -- image_hash or video_id

    -- File info
    file_name VARCHAR(255),
    file_url TEXT,
    thumbnail_url TEXT,

    -- Dimensions
    width INT,
    height INT,
    aspect_ratio VARCHAR(10),          -- 1:1, 4:5, 9:16, 16:9

    -- Video specific
    duration_seconds INT,

    -- Status
    status VARCHAR(20),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(platform_asset_id)
);
```

### 3.2 Indexes for Meta Tables

```sql
-- Meta Ad Sets
CREATE INDEX idx_meta_ad_sets_campaign ON meta_ad_sets(campaign_id, status);
CREATE INDEX idx_meta_ad_sets_platform_id ON meta_ad_sets(platform_ad_set_id);

-- Meta Ads
CREATE INDEX idx_meta_ads_ad_set ON meta_ads(ad_set_id, status);
CREATE INDEX idx_meta_ads_review ON meta_ads(review_status) WHERE review_status = 'DISAPPROVED';

-- Meta Metrics
CREATE INDEX idx_meta_metrics_lookup ON meta_ad_set_metrics_daily(ad_set_id, date DESC);

-- Meta Audiences
CREATE INDEX idx_meta_audiences_account ON meta_audiences(ad_account_id, audience_type);
```

---

## 4. Meta Ads API Client

### 4.1 Core Client Implementation

```python
# backend/app/services/meta_ads_client.py
from typing import Optional, List, Dict, Any
from datetime import date, timedelta
import httpx
from pydantic import BaseModel

from app.core.config import settings
from app.services.meta_auth_service import MetaAuthService


class MetaAdsClient:
    """Client for Meta Marketing API."""

    GRAPH_API_VERSION = "v21.0"
    BASE_URL = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={"Authorization": f"Bearer {access_token}"}
        )

    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make API request with error handling."""
        url = f"{self.BASE_URL}/{endpoint}"

        response = await self.client.request(
            method=method,
            url=url,
            params=params,
            json=json
        )

        data = response.json()

        if "error" in data:
            raise MetaAPIError(
                code=data["error"].get("code"),
                message=data["error"].get("message"),
                error_subcode=data["error"].get("error_subcode")
            )

        return data

    async def _paginate(
        self,
        endpoint: str,
        params: Dict,
        limit: int = 500
    ) -> List[Dict]:
        """Handle pagination for list endpoints."""
        params["limit"] = limit
        all_data = []

        while True:
            response = await self._request("GET", endpoint, params=params)
            all_data.extend(response.get("data", []))

            paging = response.get("paging", {})
            if "next" not in paging:
                break

            # Extract cursor for next page
            params["after"] = paging.get("cursors", {}).get("after")

        return all_data

    # ==================== Account Methods ====================

    async def get_ad_account(self, account_id: str) -> Dict:
        """Get ad account details."""
        fields = [
            "id", "name", "account_status", "currency", "timezone_name",
            "business", "funding_source", "spend_cap", "amount_spent",
            "owner", "permitted_tasks"
        ]
        return await self._request(
            "GET",
            f"act_{account_id}",
            params={"fields": ",".join(fields)}
        )

    # ==================== Campaign Methods ====================

    async def get_campaigns(
        self,
        account_id: str,
        status_filter: Optional[List[str]] = None
    ) -> List[Dict]:
        """Get all campaigns for an ad account."""
        fields = [
            "id", "name", "status", "objective", "special_ad_categories",
            "buying_type", "daily_budget", "lifetime_budget",
            "budget_remaining", "bid_strategy", "created_time", "updated_time"
        ]

        params = {"fields": ",".join(fields)}

        if status_filter:
            params["filtering"] = f'[{{"field":"status","operator":"IN","value":{status_filter}}}]'

        return await self._paginate(f"act_{account_id}/campaigns", params)

    async def create_campaign(
        self,
        account_id: str,
        name: str,
        objective: str,
        status: str = "PAUSED",
        special_ad_categories: Optional[List[str]] = None,
        daily_budget: Optional[int] = None,
        lifetime_budget: Optional[int] = None,
        bid_strategy: str = "LOWEST_COST_WITHOUT_CAP"
    ) -> Dict:
        """Create a new campaign."""
        data = {
            "name": name,
            "objective": objective,
            "status": status,
            "special_ad_categories": special_ad_categories or [],
            "bid_strategy": bid_strategy,
        }

        if daily_budget:
            data["daily_budget"] = daily_budget
        if lifetime_budget:
            data["lifetime_budget"] = lifetime_budget

        return await self._request(
            "POST",
            f"act_{account_id}/campaigns",
            json=data
        )

    async def update_campaign(
        self,
        campaign_id: str,
        updates: Dict[str, Any]
    ) -> Dict:
        """Update campaign settings."""
        return await self._request("POST", campaign_id, json=updates)

    # ==================== Ad Set Methods ====================

    async def get_ad_sets(
        self,
        account_id: str,
        campaign_id: Optional[str] = None
    ) -> List[Dict]:
        """Get ad sets for account or specific campaign."""
        fields = [
            "id", "name", "status", "campaign_id", "daily_budget", "lifetime_budget",
            "bid_amount", "billing_event", "optimization_goal",
            "targeting", "start_time", "end_time", "attribution_spec",
            "promoted_object", "created_time", "updated_time"
        ]

        endpoint = f"act_{account_id}/adsets"
        params = {"fields": ",".join(fields)}

        if campaign_id:
            params["filtering"] = f'[{{"field":"campaign_id","operator":"EQUAL","value":"{campaign_id}"}}]'

        return await self._paginate(endpoint, params)

    async def create_ad_set(
        self,
        account_id: str,
        campaign_id: str,
        name: str,
        targeting: Dict,
        optimization_goal: str,
        billing_event: str,
        bid_amount: Optional[int] = None,
        daily_budget: Optional[int] = None,
        lifetime_budget: Optional[int] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        status: str = "PAUSED"
    ) -> Dict:
        """Create a new ad set."""
        data = {
            "name": name,
            "campaign_id": campaign_id,
            "targeting": targeting,
            "optimization_goal": optimization_goal,
            "billing_event": billing_event,
            "status": status,
        }

        if bid_amount:
            data["bid_amount"] = bid_amount
        if daily_budget:
            data["daily_budget"] = daily_budget
        if lifetime_budget:
            data["lifetime_budget"] = lifetime_budget
        if start_time:
            data["start_time"] = start_time
        if end_time:
            data["end_time"] = end_time

        return await self._request(
            "POST",
            f"act_{account_id}/adsets",
            json=data
        )

    # ==================== Ad Methods ====================

    async def get_ads(
        self,
        account_id: str,
        ad_set_id: Optional[str] = None
    ) -> List[Dict]:
        """Get ads for account or specific ad set."""
        fields = [
            "id", "name", "status", "adset_id", "creative",
            "tracking_specs", "conversion_specs",
            "created_time", "updated_time"
        ]

        endpoint = f"act_{account_id}/ads"
        params = {"fields": ",".join(fields)}

        if ad_set_id:
            params["filtering"] = f'[{{"field":"adset_id","operator":"EQUAL","value":"{ad_set_id}"}}]'

        return await self._paginate(endpoint, params)

    async def create_ad(
        self,
        account_id: str,
        ad_set_id: str,
        name: str,
        creative_id: str,
        status: str = "PAUSED",
        tracking_specs: Optional[Dict] = None
    ) -> Dict:
        """Create a new ad."""
        data = {
            "name": name,
            "adset_id": ad_set_id,
            "creative": {"creative_id": creative_id},
            "status": status,
        }

        if tracking_specs:
            data["tracking_specs"] = tracking_specs

        return await self._request(
            "POST",
            f"act_{account_id}/ads",
            json=data
        )

    # ==================== Creative Methods ====================

    async def create_creative(
        self,
        account_id: str,
        name: str,
        page_id: str,
        creative_type: str,
        creative_data: Dict
    ) -> Dict:
        """Create an ad creative."""
        data = {
            "name": name,
            **creative_data
        }

        # Add page ID for link ads
        if "object_story_spec" in creative_data:
            data["object_story_spec"]["page_id"] = page_id

        return await self._request(
            "POST",
            f"act_{account_id}/adcreatives",
            json=data
        )

    async def upload_image(
        self,
        account_id: str,
        image_bytes: bytes,
        file_name: str
    ) -> Dict:
        """Upload an image and get hash."""
        # Use multipart form data
        files = {"source": (file_name, image_bytes)}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/act_{account_id}/adimages",
                files=files,
                params={"access_token": self.access_token}
            )

        data = response.json()
        if "images" in data:
            return list(data["images"].values())[0]
        return data

    # ==================== Insights (Metrics) Methods ====================

    async def get_insights(
        self,
        object_id: str,
        level: str,  # account, campaign, adset, ad
        date_start: date,
        date_end: date,
        fields: Optional[List[str]] = None,
        breakdowns: Optional[List[str]] = None,
        time_increment: str = "1"  # 1 = daily, "monthly", "all_days"
    ) -> List[Dict]:
        """Get performance insights/metrics."""
        default_fields = [
            "impressions", "reach", "frequency", "clicks", "spend",
            "cpc", "cpm", "ctr", "actions", "action_values",
            "conversions", "cost_per_conversion", "video_p25_watched_actions",
            "video_p50_watched_actions", "video_p75_watched_actions",
            "video_p100_watched_actions"
        ]

        params = {
            "fields": ",".join(fields or default_fields),
            "time_range": f'{{"since":"{date_start}","until":"{date_end}"}}',
            "time_increment": time_increment,
            "level": level,
        }

        if breakdowns:
            params["breakdowns"] = ",".join(breakdowns)

        return await self._paginate(f"{object_id}/insights", params)

    async def get_account_insights(
        self,
        account_id: str,
        date_start: date,
        date_end: date
    ) -> List[Dict]:
        """Get account-level insights."""
        return await self.get_insights(
            f"act_{account_id}",
            "account",
            date_start,
            date_end
        )

    async def get_campaign_insights(
        self,
        account_id: str,
        date_start: date,
        date_end: date
    ) -> List[Dict]:
        """Get campaign-level insights with daily breakdown."""
        return await self.get_insights(
            f"act_{account_id}",
            "campaign",
            date_start,
            date_end
        )

    # ==================== Audience Methods ====================

    async def get_custom_audiences(
        self,
        account_id: str
    ) -> List[Dict]:
        """Get custom audiences for account."""
        fields = [
            "id", "name", "subtype", "description", "approximate_count",
            "data_source", "retention_days", "rule", "lookalike_spec",
            "operation_status", "delivery_status"
        ]

        return await self._paginate(
            f"act_{account_id}/customaudiences",
            {"fields": ",".join(fields)}
        )

    async def create_custom_audience(
        self,
        account_id: str,
        name: str,
        subtype: str,
        description: Optional[str] = None,
        rule: Optional[Dict] = None,
        retention_days: int = 30
    ) -> Dict:
        """Create a custom audience (website, engagement, etc.)."""
        data = {
            "name": name,
            "subtype": subtype,
            "retention_days": retention_days,
        }

        if description:
            data["description"] = description
        if rule:
            data["rule"] = rule

        return await self._request(
            "POST",
            f"act_{account_id}/customaudiences",
            json=data
        )

    async def create_lookalike_audience(
        self,
        account_id: str,
        name: str,
        source_audience_id: str,
        country: str,
        ratio: float  # 0.01 to 0.20 (1% to 20%)
    ) -> Dict:
        """Create a lookalike audience from source audience."""
        data = {
            "name": name,
            "subtype": "LOOKALIKE",
            "origin_audience_id": source_audience_id,
            "lookalike_spec": {
                "country": country,
                "ratio": ratio,
                "type": "similarity"  # or "reach"
            }
        }

        return await self._request(
            "POST",
            f"act_{account_id}/customaudiences",
            json=data
        )


class MetaAPIError(Exception):
    """Meta API error with code and message."""

    def __init__(self, code: int, message: str, error_subcode: Optional[int] = None):
        self.code = code
        self.message = message
        self.error_subcode = error_subcode
        super().__init__(f"Meta API Error {code}: {message}")
```

---

## 5. Campaign Objectives Mapping

### 5.1 Meta Objectives (2024+)

Meta uses "Outcome-Based" objectives:

| Objective | Use Case | Optimization Goals |
|-----------|----------|-------------------|
| `OUTCOME_AWARENESS` | Brand awareness, reach | REACH, IMPRESSIONS, AD_RECALL_LIFT |
| `OUTCOME_TRAFFIC` | Website/app visits | LINK_CLICKS, LANDING_PAGE_VIEWS |
| `OUTCOME_ENGAGEMENT` | Post engagement, video views | POST_ENGAGEMENT, VIDEO_VIEWS |
| `OUTCOME_LEADS` | Lead generation | LEAD_GENERATION, CONVERSATIONS |
| `OUTCOME_APP_PROMOTION` | App installs | APP_INSTALLS, APP_EVENTS |
| `OUTCOME_SALES` | Conversions, catalog sales | CONVERSIONS, VALUE |

### 5.2 Objective Mapping Service

```python
# backend/app/services/meta_objective_service.py

class MetaObjectiveService:
    """Map business goals to Meta campaign objectives."""

    OBJECTIVE_CONFIGS = {
        "OUTCOME_AWARENESS": {
            "optimization_goals": ["REACH", "IMPRESSIONS", "AD_RECALL_LIFT"],
            "billing_events": ["IMPRESSIONS"],
            "recommended_budget_min": 5_000_000,  # $5/day in micros
            "typical_cpm_range": (3.00, 15.00),
        },
        "OUTCOME_TRAFFIC": {
            "optimization_goals": ["LINK_CLICKS", "LANDING_PAGE_VIEWS"],
            "billing_events": ["IMPRESSIONS", "LINK_CLICKS"],
            "recommended_budget_min": 10_000_000,  # $10/day
            "typical_cpc_range": (0.30, 2.00),
        },
        "OUTCOME_ENGAGEMENT": {
            "optimization_goals": ["POST_ENGAGEMENT", "VIDEO_VIEWS", "THRUPLAY"],
            "billing_events": ["IMPRESSIONS", "POST_ENGAGEMENT"],
            "recommended_budget_min": 5_000_000,
            "typical_cpe_range": (0.05, 0.50),
        },
        "OUTCOME_LEADS": {
            "optimization_goals": ["LEAD_GENERATION", "CONVERSATIONS"],
            "billing_events": ["IMPRESSIONS"],
            "recommended_budget_min": 20_000_000,  # $20/day
            "typical_cpl_range": (5.00, 50.00),
        },
        "OUTCOME_SALES": {
            "optimization_goals": ["CONVERSIONS", "VALUE"],
            "billing_events": ["IMPRESSIONS"],
            "recommended_budget_min": 30_000_000,  # $30/day
            "typical_cpa_range": (10.00, 100.00),
        },
    }

    @classmethod
    def get_recommended_setup(
        cls,
        business_goal: str,
        target_audience_size: int,
        daily_budget_micros: int
    ) -> dict:
        """Get recommended campaign setup based on business goal."""

        # Map business goals to objectives
        goal_to_objective = {
            "brand_awareness": "OUTCOME_AWARENESS",
            "website_traffic": "OUTCOME_TRAFFIC",
            "social_engagement": "OUTCOME_ENGAGEMENT",
            "lead_generation": "OUTCOME_LEADS",
            "online_sales": "OUTCOME_SALES",
            "app_installs": "OUTCOME_APP_PROMOTION",
        }

        objective = goal_to_objective.get(business_goal, "OUTCOME_TRAFFIC")
        config = cls.OBJECTIVE_CONFIGS.get(objective, {})

        return {
            "objective": objective,
            "recommended_optimization_goal": config["optimization_goals"][0],
            "billing_event": config["billing_events"][0],
            "budget_sufficient": daily_budget_micros >= config.get("recommended_budget_min", 0),
            "estimated_reach": cls._estimate_reach(audience_size, daily_budget_micros),
        }
```

---

## 6. Targeting Builder

### 6.1 Targeting Service

```python
# backend/app/services/meta_targeting_service.py
from typing import Optional, List, Dict
from pydantic import BaseModel


class GeoLocation(BaseModel):
    countries: Optional[List[str]] = None
    regions: Optional[List[Dict]] = None  # {"key": "123", "name": "California"}
    cities: Optional[List[Dict]] = None
    zips: Optional[List[Dict]] = None
    geo_markets: Optional[List[Dict]] = None  # DMAs


class Demographics(BaseModel):
    age_min: int = 18
    age_max: int = 65
    genders: Optional[List[int]] = None  # 1=male, 2=female

    # Detailed demographics
    relationship_statuses: Optional[List[int]] = None
    education_statuses: Optional[List[int]] = None
    life_events: Optional[List[Dict]] = None


class Interests(BaseModel):
    interests: Optional[List[Dict]] = None  # {"id": "123", "name": "Fitness"}
    behaviors: Optional[List[Dict]] = None

    # Exclusions
    excluded_interests: Optional[List[Dict]] = None


class Audiences(BaseModel):
    custom_audiences: Optional[List[Dict]] = None  # {"id": "123456"}
    lookalike_audiences: Optional[List[Dict]] = None
    excluded_custom_audiences: Optional[List[Dict]] = None


class MetaTargetingBuilder:
    """Build Meta Ads targeting specification."""

    def __init__(self):
        self.targeting = {}

    def set_locations(
        self,
        countries: Optional[List[str]] = None,
        regions: Optional[List[str]] = None,
        cities: Optional[List[str]] = None,
        radius_miles: Optional[int] = None
    ) -> "MetaTargetingBuilder":
        """Set geographic targeting."""
        geo = {}

        if countries:
            geo["countries"] = countries

        if regions:
            geo["regions"] = [{"key": r} for r in regions]

        if cities:
            geo["cities"] = [{"key": c, "radius": radius_miles or 25, "distance_unit": "mile"} for c in cities]

        self.targeting["geo_locations"] = geo
        return self

    def set_demographics(
        self,
        age_min: int = 18,
        age_max: int = 65,
        genders: Optional[List[str]] = None  # ["male", "female"]
    ) -> "MetaTargetingBuilder":
        """Set demographic targeting."""
        self.targeting["age_min"] = age_min
        self.targeting["age_max"] = age_max

        if genders:
            gender_map = {"male": 1, "female": 2}
            self.targeting["genders"] = [gender_map[g] for g in genders if g in gender_map]

        return self

    def add_interests(
        self,
        interests: List[Dict]  # [{"id": "123", "name": "Running"}]
    ) -> "MetaTargetingBuilder":
        """Add interest targeting."""
        if "flexible_spec" not in self.targeting:
            self.targeting["flexible_spec"] = [{}]

        self.targeting["flexible_spec"][0]["interests"] = interests
        return self

    def add_behaviors(
        self,
        behaviors: List[Dict]
    ) -> "MetaTargetingBuilder":
        """Add behavior targeting."""
        if "flexible_spec" not in self.targeting:
            self.targeting["flexible_spec"] = [{}]

        self.targeting["flexible_spec"][0]["behaviors"] = behaviors
        return self

    def add_custom_audiences(
        self,
        audience_ids: List[str]
    ) -> "MetaTargetingBuilder":
        """Add custom audience targeting."""
        self.targeting["custom_audiences"] = [{"id": aid} for aid in audience_ids]
        return self

    def exclude_custom_audiences(
        self,
        audience_ids: List[str]
    ) -> "MetaTargetingBuilder":
        """Exclude custom audiences."""
        self.targeting["excluded_custom_audiences"] = [{"id": aid} for aid in audience_ids]
        return self

    def set_placements(
        self,
        automatic: bool = True,
        manual_placements: Optional[Dict] = None
    ) -> "MetaTargetingBuilder":
        """Set placement targeting."""
        if automatic:
            # Advantage+ Placements (recommended)
            self.targeting["publisher_platforms"] = ["facebook", "instagram", "messenger", "audience_network"]
        elif manual_placements:
            self.targeting.update(manual_placements)

        return self

    def build(self) -> Dict:
        """Build final targeting specification."""
        return self.targeting


# Example usage:
def create_ecommerce_targeting():
    """Create targeting for e-commerce campaign."""
    targeting = (
        MetaTargetingBuilder()
        .set_locations(countries=["US", "CA"])
        .set_demographics(age_min=25, age_max=54, genders=["female"])
        .add_interests([
            {"id": "6003139266461", "name": "Online shopping"},
            {"id": "6003598764485", "name": "Fashion"},
        ])
        .add_behaviors([
            {"id": "6002714895372", "name": "Engaged Shoppers"},
        ])
        .set_placements(automatic=True)
        .build()
    )
    return targeting
```

---

## 7. Sync Service

### 7.1 Meta Sync Worker

```python
# backend/app/workers/meta_sync_worker.py
from datetime import date, timedelta
from typing import Optional
import asyncio

from app.services.meta_ads_client import MetaAdsClient
from app.repositories.meta_repository import MetaRepository
from app.models import SyncJob, AdAccount


class MetaSyncWorker:
    """Sync Meta Ads data to our database."""

    def __init__(
        self,
        meta_client: MetaAdsClient,
        repository: MetaRepository
    ):
        self.client = meta_client
        self.repository = repository

    async def sync_account(
        self,
        ad_account_id: str,
        sync_type: str = "incremental"
    ) -> SyncJob:
        """Full account sync."""
        job = await self.repository.create_sync_job(
            ad_account_id=ad_account_id,
            job_type=f"meta_{sync_type}_sync"
        )

        try:
            # 1. Sync campaigns
            await self._sync_campaigns(ad_account_id)

            # 2. Sync ad sets
            await self._sync_ad_sets(ad_account_id)

            # 3. Sync ads
            await self._sync_ads(ad_account_id)

            # 4. Sync audiences
            await self._sync_audiences(ad_account_id)

            # 5. Sync metrics
            days = 7 if sync_type == "incremental" else 90
            await self._sync_metrics(ad_account_id, days=days)

            job.status = "completed"
            job.completed_at = datetime.utcnow()

        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
            raise

        finally:
            await self.repository.update_sync_job(job)

        return job

    async def _sync_campaigns(self, ad_account_id: str):
        """Sync campaigns from Meta."""
        campaigns = await self.client.get_campaigns(ad_account_id)

        for campaign_data in campaigns:
            await self.repository.upsert_campaign(
                ad_account_id=ad_account_id,
                platform_campaign_id=campaign_data["id"],
                data={
                    "name": campaign_data["name"],
                    "status": campaign_data["status"].lower(),
                    "campaign_type": self._map_objective(campaign_data.get("objective")),
                    "budget_amount": campaign_data.get("daily_budget") or campaign_data.get("lifetime_budget"),
                    "budget_type": "daily" if campaign_data.get("daily_budget") else "lifetime",
                    "settings": {
                        "objective": campaign_data.get("objective"),
                        "special_ad_categories": campaign_data.get("special_ad_categories", []),
                        "bid_strategy": campaign_data.get("bid_strategy"),
                    }
                }
            )

    async def _sync_ad_sets(self, ad_account_id: str):
        """Sync ad sets from Meta."""
        ad_sets = await self.client.get_ad_sets(ad_account_id)

        for ad_set_data in ad_sets:
            await self.repository.upsert_meta_ad_set(
                ad_account_id=ad_account_id,
                platform_ad_set_id=ad_set_data["id"],
                data={
                    "name": ad_set_data["name"],
                    "status": ad_set_data["status"].lower(),
                    "campaign_id": ad_set_data["campaign_id"],
                    "daily_budget": ad_set_data.get("daily_budget"),
                    "lifetime_budget": ad_set_data.get("lifetime_budget"),
                    "bid_amount": ad_set_data.get("bid_amount"),
                    "billing_event": ad_set_data.get("billing_event"),
                    "optimization_goal": ad_set_data.get("optimization_goal"),
                    "targeting": ad_set_data.get("targeting", {}),
                    "start_time": ad_set_data.get("start_time"),
                    "end_time": ad_set_data.get("end_time"),
                }
            )

    async def _sync_ads(self, ad_account_id: str):
        """Sync ads from Meta."""
        ads = await self.client.get_ads(ad_account_id)

        for ad_data in ads:
            # Get creative details
            creative = ad_data.get("creative", {})

            await self.repository.upsert_meta_ad(
                ad_set_id=ad_data["adset_id"],
                platform_ad_id=ad_data["id"],
                data={
                    "name": ad_data["name"],
                    "status": ad_data["status"].lower(),
                    "creative_id": creative.get("id"),
                    # Additional creative fields fetched separately if needed
                }
            )

    async def _sync_audiences(self, ad_account_id: str):
        """Sync custom audiences from Meta."""
        audiences = await self.client.get_custom_audiences(ad_account_id)

        for audience_data in audiences:
            await self.repository.upsert_meta_audience(
                ad_account_id=ad_account_id,
                platform_audience_id=audience_data["id"],
                data={
                    "name": audience_data["name"],
                    "audience_type": "LOOKALIKE" if audience_data.get("lookalike_spec") else "CUSTOM",
                    "subtype": audience_data.get("subtype"),
                    "description": audience_data.get("description"),
                    "approximate_count": audience_data.get("approximate_count"),
                    "retention_days": audience_data.get("retention_days"),
                    "lookalike_spec": audience_data.get("lookalike_spec"),
                    "rule": audience_data.get("rule"),
                    "status": audience_data.get("delivery_status", {}).get("status"),
                }
            )

    async def _sync_metrics(self, ad_account_id: str, days: int = 7):
        """Sync metrics/insights from Meta."""
        date_end = date.today()
        date_start = date_end - timedelta(days=days)

        # Get ad set level insights with daily breakdown
        insights = await self.client.get_insights(
            f"act_{ad_account_id}",
            level="adset",
            date_start=date_start,
            date_end=date_end,
            time_increment="1"  # Daily
        )

        for insight in insights:
            metrics = self._parse_metrics(insight)

            await self.repository.upsert_meta_ad_set_metrics(
                ad_set_id=insight["adset_id"],
                date=insight["date_start"],
                metrics=metrics
            )

    def _parse_metrics(self, insight: dict) -> dict:
        """Parse Meta insight data into our metrics format."""
        # Parse actions (conversions, clicks, etc.)
        actions = {a["action_type"]: int(a["value"]) for a in insight.get("actions", [])}
        action_values = {a["action_type"]: int(float(a["value"]) * 1_000_000) for a in insight.get("action_values", [])}

        return {
            "impressions": int(insight.get("impressions", 0)),
            "reach": int(insight.get("reach", 0)),
            "frequency": float(insight.get("frequency", 0)),
            "clicks": int(insight.get("clicks", 0)),
            "link_clicks": actions.get("link_click", 0),
            "cost_micros": int(float(insight.get("spend", 0)) * 1_000_000),
            "post_engagements": actions.get("post_engagement", 0),
            "video_views": actions.get("video_view", 0),
            "conversions": actions.get("purchase", 0) + actions.get("lead", 0),
            "conversion_value_micros": action_values.get("purchase", 0),
            "purchases": actions.get("purchase", 0),
            "purchase_value_micros": action_values.get("purchase", 0),
            "leads": actions.get("lead", 0),
            "add_to_carts": actions.get("add_to_cart", 0),
        }

    def _map_objective(self, meta_objective: str) -> str:
        """Map Meta objective to our campaign_type."""
        mapping = {
            "OUTCOME_AWARENESS": "awareness",
            "OUTCOME_TRAFFIC": "traffic",
            "OUTCOME_ENGAGEMENT": "engagement",
            "OUTCOME_LEADS": "leads",
            "OUTCOME_APP_PROMOTION": "app",
            "OUTCOME_SALES": "conversions",
        }
        return mapping.get(meta_objective, "other")
```

---

## 8. AI Recommendations for Meta

### 8.1 Meta-Specific Recommendation Rules

```python
# backend/app/services/meta_recommendation_rules.py
from typing import List, Dict
from decimal import Decimal
from datetime import date, timedelta

from app.domain.recommendation import Recommendation, RecommendationSeverity


class MetaRecommendationRules:
    """AI recommendation rules specific to Meta Ads."""

    # ==================== Audience Rules ====================

    @staticmethod
    async def detect_audience_fatigue(
        ad_set_metrics: List[Dict],
        threshold_frequency: float = 3.0,
        threshold_ctr_decline: float = 0.20  # 20% decline
    ) -> List[Recommendation]:
        """Detect ad fatigue based on frequency and declining CTR."""
        recommendations = []

        # Group metrics by ad set
        for ad_set_id, metrics in group_by_ad_set(ad_set_metrics):
            # Calculate rolling 7-day frequency
            recent_metrics = metrics[-7:]
            avg_frequency = sum(m["frequency"] for m in recent_metrics) / len(recent_metrics)

            # Calculate CTR trend
            if len(metrics) >= 14:
                old_ctr = sum(m["ctr"] for m in metrics[-14:-7]) / 7
                new_ctr = sum(m["ctr"] for m in metrics[-7:]) / 7
                ctr_change = (new_ctr - old_ctr) / old_ctr if old_ctr > 0 else 0

                if avg_frequency > threshold_frequency and ctr_change < -threshold_ctr_decline:
                    recommendations.append(Recommendation(
                        recommendation_type="audience_fatigue",
                        severity=RecommendationSeverity.WARNING,
                        title=f"Audience Fatigue Detected",
                        description=(
                            f"Ad set showing signs of fatigue: frequency {avg_frequency:.1f}x "
                            f"with {abs(ctr_change)*100:.0f}% CTR decline. "
                            f"Consider refreshing creative or expanding audience."
                        ),
                        affected_entities={"ad_set_id": ad_set_id},
                        options=[
                            {"label": "Refresh Creative", "action": "prompt_new_creative"},
                            {"label": "Expand Audience", "action": "suggest_audience_expansion"},
                            {"label": "Pause Ad Set", "action": "pause_ad_set"},
                        ]
                    ))

        return recommendations

    @staticmethod
    async def detect_audience_overlap(
        ad_sets: List[Dict],
        overlap_threshold: float = 0.30  # 30% overlap
    ) -> List[Recommendation]:
        """Detect significant audience overlap between ad sets."""
        recommendations = []

        # Compare all ad set pairs in same campaign
        for i, ad_set_a in enumerate(ad_sets):
            for ad_set_b in ad_sets[i+1:]:
                if ad_set_a["campaign_id"] != ad_set_b["campaign_id"]:
                    continue

                # Calculate audience overlap (simplified - real implementation
                # would use Meta's Audience Overlap API)
                overlap = calculate_targeting_overlap(
                    ad_set_a["targeting"],
                    ad_set_b["targeting"]
                )

                if overlap > overlap_threshold:
                    recommendations.append(Recommendation(
                        recommendation_type="audience_overlap",
                        severity=RecommendationSeverity.INFO,
                        title="Significant Audience Overlap",
                        description=(
                            f"Ad sets '{ad_set_a['name']}' and '{ad_set_b['name']}' "
                            f"have ~{overlap*100:.0f}% audience overlap. "
                            f"This may cause them to compete against each other."
                        ),
                        options=[
                            {"label": "Merge Ad Sets", "action": "suggest_merge"},
                            {"label": "Differentiate Targeting", "action": "suggest_differentiation"},
                            {"label": "Ignore", "action": "dismiss"},
                        ]
                    ))

        return recommendations

    # ==================== Budget Rules ====================

    @staticmethod
    async def detect_learning_phase_issues(
        ad_sets: List[Dict],
        min_conversions_per_week: int = 50
    ) -> List[Recommendation]:
        """Detect ad sets stuck in learning phase due to low budget."""
        recommendations = []

        for ad_set in ad_sets:
            if ad_set["status"] != "active":
                continue

            # Check weekly conversions
            weekly_conversions = ad_set.get("conversions_7d", 0)

            if weekly_conversions < min_conversions_per_week:
                # Calculate recommended budget increase
                current_budget = ad_set.get("daily_budget", 0)
                avg_cpa = ad_set.get("cpa_7d", 0)

                if avg_cpa > 0:
                    needed_budget = (min_conversions_per_week / 7) * avg_cpa
                    budget_increase = needed_budget - current_budget

                    if budget_increase > current_budget * 0.20:  # Need >20% increase
                        recommendations.append(Recommendation(
                            recommendation_type="learning_phase_stuck",
                            severity=RecommendationSeverity.WARNING,
                            title="Ad Set Stuck in Learning Phase",
                            description=(
                                f"Ad set '{ad_set['name']}' needs ~50 conversions/week "
                                f"to exit learning phase. Currently getting {weekly_conversions}. "
                                f"Consider increasing budget to ${needed_budget/1_000_000:.0f}/day."
                            ),
                            impact_estimate={
                                "recommended_budget": needed_budget,
                                "current_budget": current_budget,
                            },
                            options=[
                                {"label": f"Increase to ${needed_budget/1_000_000:.0f}/day", "action": "increase_budget"},
                                {"label": "Consolidate ad sets", "action": "suggest_consolidation"},
                                {"label": "Keep current budget", "action": "dismiss"},
                            ]
                        ))

        return recommendations

    # ==================== Creative Rules ====================

    @staticmethod
    async def detect_creative_performance_variance(
        ads: List[Dict],
        variance_threshold: float = 0.50  # 50% variance
    ) -> List[Recommendation]:
        """Detect ads with significantly different performance in same ad set."""
        recommendations = []

        # Group ads by ad set
        for ad_set_id, ad_set_ads in group_by_ad_set(ads):
            if len(ad_set_ads) < 2:
                continue

            # Calculate performance metrics
            performances = []
            for ad in ad_set_ads:
                if ad["impressions"] > 100:  # Minimum data
                    performances.append({
                        "ad_id": ad["id"],
                        "ad_name": ad["name"],
                        "ctr": ad["clicks"] / ad["impressions"],
                        "conversion_rate": ad["conversions"] / ad["clicks"] if ad["clicks"] > 0 else 0,
                        "spend": ad["spend"],
                    })

            if len(performances) < 2:
                continue

            # Find best and worst performers
            best = max(performances, key=lambda x: x["conversion_rate"])
            worst = min(performances, key=lambda x: x["conversion_rate"])

            if best["conversion_rate"] > 0:
                variance = (best["conversion_rate"] - worst["conversion_rate"]) / best["conversion_rate"]

                if variance > variance_threshold and worst["spend"] > 10_000_000:  # >$10 spent
                    recommendations.append(Recommendation(
                        recommendation_type="creative_underperformer",
                        severity=RecommendationSeverity.OPPORTUNITY,
                        title="Underperforming Creative Detected",
                        description=(
                            f"Ad '{worst['ad_name']}' has {variance*100:.0f}% lower conversion rate "
                            f"than best performer. Consider pausing to reallocate budget."
                        ),
                        impact_estimate={
                            "potential_savings": worst["spend"],
                            "performance_gap": variance,
                        },
                        options=[
                            {"label": "Pause underperformer", "action": "pause_ad"},
                            {"label": "Test new variation", "action": "suggest_new_creative"},
                            {"label": "Keep testing", "action": "dismiss"},
                        ]
                    ))

        return recommendations

    # ==================== Placement Rules ====================

    @staticmethod
    async def analyze_placement_performance(
        placement_breakdowns: List[Dict],
        inefficiency_threshold: float = 2.0  # 2x worse than average
    ) -> List[Recommendation]:
        """Analyze performance by placement and recommend exclusions."""
        recommendations = []

        # Calculate average CPA
        total_spend = sum(p["spend"] for p in placement_breakdowns)
        total_conversions = sum(p["conversions"] for p in placement_breakdowns)
        avg_cpa = total_spend / total_conversions if total_conversions > 0 else 0

        # Find underperforming placements
        underperformers = []
        for placement in placement_breakdowns:
            if placement["conversions"] > 0:
                placement_cpa = placement["spend"] / placement["conversions"]
                if placement_cpa > avg_cpa * inefficiency_threshold:
                    underperformers.append({
                        "placement": placement["publisher_platform"],
                        "cpa": placement_cpa,
                        "spend": placement["spend"],
                        "inefficiency": placement_cpa / avg_cpa,
                    })

        if underperformers:
            recommendations.append(Recommendation(
                recommendation_type="placement_optimization",
                severity=RecommendationSeverity.OPPORTUNITY,
                title="Underperforming Placements Detected",
                description=(
                    f"Found {len(underperformers)} placements with CPA "
                    f">{inefficiency_threshold}x the average. Consider excluding or reducing bids."
                ),
                affected_entities={"placements": underperformers},
                options=[
                    {"label": "Exclude worst placements", "action": "exclude_placements"},
                    {"label": "Switch to manual placements", "action": "manual_placements"},
                    {"label": "Keep automatic placements", "action": "dismiss"},
                ]
            ))

        return recommendations
```

---

## 9. Creative Management

### 9.1 Creative Types

```python
# backend/app/services/meta_creative_service.py
from typing import Optional, List, Dict
from pydantic import BaseModel


class ImageAdCreative(BaseModel):
    """Single image ad creative."""
    image_hash: str
    primary_text: str  # Up to 125 chars recommended
    headline: str  # Up to 40 chars
    description: Optional[str] = None  # Up to 30 chars
    link_url: str
    call_to_action: str = "LEARN_MORE"


class VideoAdCreative(BaseModel):
    """Video ad creative."""
    video_id: str
    thumbnail_hash: Optional[str] = None
    primary_text: str
    headline: str
    description: Optional[str] = None
    link_url: str
    call_to_action: str = "LEARN_MORE"


class CarouselCard(BaseModel):
    """Single card in a carousel ad."""
    image_hash: Optional[str] = None
    video_id: Optional[str] = None
    headline: str
    description: Optional[str] = None
    link_url: str
    call_to_action: str = "LEARN_MORE"


class CarouselAdCreative(BaseModel):
    """Carousel ad creative (2-10 cards)."""
    cards: List[CarouselCard]  # 2-10 cards
    primary_text: str
    link_url: str  # Default URL


class MetaCreativeService:
    """Service for creating and managing Meta ad creatives."""

    CTA_OPTIONS = [
        "SHOP_NOW", "LEARN_MORE", "SIGN_UP", "SUBSCRIBE", "CONTACT_US",
        "GET_QUOTE", "APPLY_NOW", "BOOK_NOW", "DOWNLOAD", "GET_OFFER",
        "GET_SHOWTIMES", "LISTEN_NOW", "ORDER_NOW", "PLAY_GAME",
        "SEE_MENU", "WATCH_MORE", "SEND_MESSAGE", "WHATSAPP_MESSAGE"
    ]

    def __init__(self, meta_client):
        self.client = meta_client

    async def create_image_ad_creative(
        self,
        account_id: str,
        page_id: str,
        creative: ImageAdCreative,
        instagram_account_id: Optional[str] = None
    ) -> Dict:
        """Create a single image ad creative."""
        object_story_spec = {
            "page_id": page_id,
            "link_data": {
                "image_hash": creative.image_hash,
                "link": creative.link_url,
                "message": creative.primary_text,
                "name": creative.headline,
                "description": creative.description,
                "call_to_action": {
                    "type": creative.call_to_action,
                    "value": {"link": creative.link_url}
                }
            }
        }

        if instagram_account_id:
            object_story_spec["instagram_actor_id"] = instagram_account_id

        return await self.client.create_creative(
            account_id=account_id,
            name=f"Creative - {creative.headline[:30]}",
            page_id=page_id,
            creative_type="IMAGE",
            creative_data={"object_story_spec": object_story_spec}
        )

    async def create_video_ad_creative(
        self,
        account_id: str,
        page_id: str,
        creative: VideoAdCreative,
        instagram_account_id: Optional[str] = None
    ) -> Dict:
        """Create a video ad creative."""
        video_data = {
            "video_id": creative.video_id,
            "message": creative.primary_text,
            "title": creative.headline,
            "link_description": creative.description,
            "call_to_action": {
                "type": creative.call_to_action,
                "value": {"link": creative.link_url}
            }
        }

        if creative.thumbnail_hash:
            video_data["image_hash"] = creative.thumbnail_hash

        object_story_spec = {
            "page_id": page_id,
            "video_data": video_data
        }

        if instagram_account_id:
            object_story_spec["instagram_actor_id"] = instagram_account_id

        return await self.client.create_creative(
            account_id=account_id,
            name=f"Video Creative - {creative.headline[:30]}",
            page_id=page_id,
            creative_type="VIDEO",
            creative_data={"object_story_spec": object_story_spec}
        )

    async def create_carousel_creative(
        self,
        account_id: str,
        page_id: str,
        creative: CarouselAdCreative,
        instagram_account_id: Optional[str] = None
    ) -> Dict:
        """Create a carousel ad creative."""
        child_attachments = []

        for card in creative.cards:
            attachment = {
                "link": card.link_url,
                "name": card.headline,
                "description": card.description,
                "call_to_action": {
                    "type": card.call_to_action,
                    "value": {"link": card.link_url}
                }
            }

            if card.image_hash:
                attachment["image_hash"] = card.image_hash
            elif card.video_id:
                attachment["video_id"] = card.video_id

            child_attachments.append(attachment)

        object_story_spec = {
            "page_id": page_id,
            "link_data": {
                "link": creative.link_url,
                "message": creative.primary_text,
                "child_attachments": child_attachments,
                "multi_share_optimized": True  # Let Meta optimize card order
            }
        }

        if instagram_account_id:
            object_story_spec["instagram_actor_id"] = instagram_account_id

        return await self.client.create_creative(
            account_id=account_id,
            name=f"Carousel - {len(creative.cards)} cards",
            page_id=page_id,
            creative_type="CAROUSEL",
            creative_data={"object_story_spec": object_story_spec}
        )
```

### 9.2 AI-Generated Ad Copy for Meta

```python
# backend/app/services/meta_ai_creative_service.py
from app.services.gemini_client import GeminiClient


class MetaAICreativeService:
    """Generate Meta ad creative using AI."""

    def __init__(self, gemini_client: GeminiClient):
        self.gemini = gemini_client

    async def generate_ad_copy(
        self,
        product_name: str,
        product_description: str,
        target_audience: str,
        objective: str,  # awareness, traffic, conversions
        tone: str = "professional",
        num_variations: int = 3
    ) -> List[Dict]:
        """Generate Meta ad copy variations."""

        prompt = f"""Generate {num_variations} Meta (Facebook/Instagram) ad copy variations for:

**Product:** {product_name}
**Description:** {product_description}
**Target Audience:** {target_audience}
**Campaign Objective:** {objective}
**Tone:** {tone}

For each variation, provide:
1. **Primary Text** (Main ad copy - 125 characters recommended, max 2200)
2. **Headline** (40 characters max, appears below image)
3. **Description** (30 characters max, optional secondary text)
4. **Call to Action** (One of: SHOP_NOW, LEARN_MORE, SIGN_UP, GET_OFFER, BOOK_NOW)

Guidelines:
- Primary text should hook attention in first line (visible without "See more")
- Use emojis sparingly if appropriate for the brand
- Headlines should be action-oriented
- For conversions, focus on benefits and urgency
- For awareness, focus on brand story and values

Format as JSON array.
"""

        response = await self.gemini.generate(
            prompt=prompt,
            model="gemini-2.5-flash",
            response_format="json"
        )

        return response

    async def generate_carousel_cards(
        self,
        products: List[Dict],  # [{"name": "", "description": "", "price": "", "image_url": ""}]
        brand_name: str,
        campaign_theme: str,
        num_cards: int = 5
    ) -> List[Dict]:
        """Generate copy for carousel ad cards."""

        products_text = "\n".join([
            f"- {p['name']}: {p['description']} (${p['price']})"
            for p in products[:num_cards]
        ])

        prompt = f"""Generate carousel ad card copy for {brand_name}:

**Campaign Theme:** {campaign_theme}
**Products:**
{products_text}

For each product card, provide:
1. **Headline** (40 chars max - catchy, product-focused)
2. **Description** (25 chars max - price or key benefit)

Also provide:
- **Primary Text** for the overall carousel (125 chars, introduces the collection)
- Suggested **Card Order** (which should be first to hook users)

Format as JSON.
"""

        response = await self.gemini.generate(
            prompt=prompt,
            model="gemini-2.5-flash",
            response_format="json"
        )

        return response
```

---

## 10. Conversion Tracking

### 10.1 Meta Pixel Integration

```python
# backend/app/services/meta_pixel_service.py
from typing import Optional, List, Dict


class MetaPixelService:
    """Manage Meta Pixel and Conversions API (CAPI)."""

    STANDARD_EVENTS = [
        "PageView", "ViewContent", "Search", "AddToCart",
        "AddToWishlist", "InitiateCheckout", "AddPaymentInfo",
        "Purchase", "Lead", "CompleteRegistration",
        "Contact", "CustomizeProduct", "Donate", "FindLocation",
        "Schedule", "StartTrial", "SubmitApplication", "Subscribe"
    ]

    def __init__(self, meta_client):
        self.client = meta_client

    async def get_pixel_info(self, pixel_id: str) -> Dict:
        """Get pixel information and stats."""
        fields = [
            "id", "name", "code", "last_fired_time",
            "is_created_by_business", "owner_business"
        ]

        return await self.client._request(
            "GET",
            pixel_id,
            params={"fields": ",".join(fields)}
        )

    async def get_pixel_stats(
        self,
        pixel_id: str,
        start_date: str,
        end_date: str
    ) -> Dict:
        """Get pixel event statistics."""
        return await self.client._request(
            "GET",
            f"{pixel_id}/stats",
            params={
                "start_time": start_date,
                "end_time": end_date,
                "aggregation": "event"
            }
        )

    async def send_server_event(
        self,
        pixel_id: str,
        event_name: str,
        event_data: Dict,
        user_data: Dict,
        event_source_url: str,
        event_id: Optional[str] = None  # For deduplication
    ) -> Dict:
        """Send server-side event via Conversions API (CAPI)."""

        event = {
            "event_name": event_name,
            "event_time": int(datetime.utcnow().timestamp()),
            "event_source_url": event_source_url,
            "action_source": "website",
            "user_data": self._hash_user_data(user_data),
            "custom_data": event_data,
        }

        if event_id:
            event["event_id"] = event_id  # Same as browser pixel event_id

        return await self.client._request(
            "POST",
            f"{pixel_id}/events",
            json={
                "data": [event],
                "test_event_code": None  # Set for testing
            }
        )

    def _hash_user_data(self, user_data: Dict) -> Dict:
        """Hash PII fields for privacy (SHA256)."""
        import hashlib

        hashed = {}

        # Fields that need hashing
        hash_fields = ["em", "ph", "fn", "ln", "ct", "st", "zp", "country"]

        for key, value in user_data.items():
            if key in hash_fields and value:
                # Normalize and hash
                normalized = str(value).lower().strip()
                hashed[key] = hashlib.sha256(normalized.encode()).hexdigest()
            else:
                hashed[key] = value

        return hashed

    def generate_pixel_code(self, pixel_id: str) -> str:
        """Generate pixel base code for installation."""
        return f"""
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)}};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{pixel_id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id={pixel_id}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->
"""
```

---

## 11. API Endpoints

### 11.1 Meta-Specific Endpoints

```python
# backend/app/api/v1/meta.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional

from app.services.meta_ads_client import MetaAdsClient
from app.services.meta_auth_service import MetaAuthService
from app.api.deps import get_current_user, get_meta_client

router = APIRouter(prefix="/meta", tags=["Meta Ads"])


# ==================== OAuth ====================

@router.get("/oauth/url")
async def get_oauth_url(
    redirect_uri: str,
    current_user = Depends(get_current_user),
    auth_service: MetaAuthService = Depends()
):
    """Get Facebook OAuth URL for account connection."""
    state = generate_state_token(current_user.id)
    return {"url": auth_service.get_oauth_url(redirect_uri, state)}


@router.post("/oauth/callback")
async def oauth_callback(
    code: str,
    state: str,
    redirect_uri: str,
    current_user = Depends(get_current_user),
    auth_service: MetaAuthService = Depends()
):
    """Handle OAuth callback and store tokens."""
    # Verify state
    verify_state_token(state, current_user.id)

    # Exchange code for token
    token_data = await auth_service.exchange_code_for_token(code, redirect_uri)

    # Get long-lived token
    long_lived = await auth_service.get_long_lived_token(token_data["access_token"])

    # Get available ad accounts
    ad_accounts = await auth_service.get_ad_accounts(long_lived["access_token"])

    return {
        "ad_accounts": ad_accounts,
        "token_expires_at": long_lived["expires_at"]
    }


@router.post("/accounts/{account_id}/connect")
async def connect_ad_account(
    account_id: str,
    access_token: str,
    current_user = Depends(get_current_user)
):
    """Connect a Meta ad account to organization."""
    # Store encrypted token and account info
    # ... implementation
    pass


# ==================== Campaigns ====================

@router.get("/accounts/{account_id}/campaigns")
async def list_campaigns(
    account_id: str,
    status: Optional[List[str]] = None,
    current_user = Depends(get_current_user),
    meta_client: MetaAdsClient = Depends(get_meta_client)
):
    """List all campaigns for Meta ad account."""
    campaigns = await meta_client.get_campaigns(account_id, status_filter=status)
    return {"campaigns": campaigns}


@router.post("/accounts/{account_id}/campaigns")
async def create_campaign(
    account_id: str,
    campaign_data: CampaignCreateRequest,
    current_user = Depends(get_current_user),
    meta_client: MetaAdsClient = Depends(get_meta_client)
):
    """Create a new Meta campaign."""
    campaign = await meta_client.create_campaign(
        account_id=account_id,
        name=campaign_data.name,
        objective=campaign_data.objective,
        daily_budget=campaign_data.daily_budget,
        status="PAUSED"
    )
    return campaign


# ==================== Ad Sets ====================

@router.get("/accounts/{account_id}/ad-sets")
async def list_ad_sets(
    account_id: str,
    campaign_id: Optional[str] = None,
    current_user = Depends(get_current_user),
    meta_client: MetaAdsClient = Depends(get_meta_client)
):
    """List ad sets for account or campaign."""
    ad_sets = await meta_client.get_ad_sets(account_id, campaign_id)
    return {"ad_sets": ad_sets}


@router.post("/accounts/{account_id}/ad-sets")
async def create_ad_set(
    account_id: str,
    ad_set_data: AdSetCreateRequest,
    current_user = Depends(get_current_user),
    meta_client: MetaAdsClient = Depends(get_meta_client)
):
    """Create a new ad set with targeting."""
    ad_set = await meta_client.create_ad_set(
        account_id=account_id,
        campaign_id=ad_set_data.campaign_id,
        name=ad_set_data.name,
        targeting=ad_set_data.targeting,
        optimization_goal=ad_set_data.optimization_goal,
        billing_event=ad_set_data.billing_event,
        daily_budget=ad_set_data.daily_budget,
        status="PAUSED"
    )
    return ad_set


# ==================== Audiences ====================

@router.get("/accounts/{account_id}/audiences")
async def list_audiences(
    account_id: str,
    current_user = Depends(get_current_user),
    meta_client: MetaAdsClient = Depends(get_meta_client)
):
    """List custom and lookalike audiences."""
    audiences = await meta_client.get_custom_audiences(account_id)
    return {"audiences": audiences}


@router.post("/accounts/{account_id}/audiences/lookalike")
async def create_lookalike(
    account_id: str,
    lookalike_data: LookalikeCreateRequest,
    current_user = Depends(get_current_user),
    meta_client: MetaAdsClient = Depends(get_meta_client)
):
    """Create a lookalike audience from source."""
    audience = await meta_client.create_lookalike_audience(
        account_id=account_id,
        name=lookalike_data.name,
        source_audience_id=lookalike_data.source_audience_id,
        country=lookalike_data.country,
        ratio=lookalike_data.ratio
    )
    return audience


# ==================== Insights ====================

@router.get("/accounts/{account_id}/insights")
async def get_insights(
    account_id: str,
    start_date: date,
    end_date: date,
    level: str = "campaign",  # campaign, adset, ad
    breakdowns: Optional[List[str]] = None,
    current_user = Depends(get_current_user),
    meta_client: MetaAdsClient = Depends(get_meta_client)
):
    """Get performance insights with optional breakdowns."""
    insights = await meta_client.get_insights(
        f"act_{account_id}",
        level=level,
        date_start=start_date,
        date_end=end_date,
        breakdowns=breakdowns
    )
    return {"insights": insights}


# ==================== Creative ====================

@router.post("/accounts/{account_id}/images/upload")
async def upload_image(
    account_id: str,
    file: UploadFile,
    current_user = Depends(get_current_user),
    meta_client: MetaAdsClient = Depends(get_meta_client)
):
    """Upload image for ad creative."""
    contents = await file.read()
    result = await meta_client.upload_image(
        account_id=account_id,
        image_bytes=contents,
        file_name=file.filename
    )
    return result


@router.post("/accounts/{account_id}/creatives")
async def create_creative(
    account_id: str,
    creative_data: CreativeCreateRequest,
    current_user = Depends(get_current_user),
    creative_service = Depends(get_creative_service)
):
    """Create ad creative (image, video, or carousel)."""
    if creative_data.creative_type == "image":
        creative = await creative_service.create_image_ad_creative(
            account_id=account_id,
            page_id=creative_data.page_id,
            creative=creative_data.image_creative
        )
    elif creative_data.creative_type == "carousel":
        creative = await creative_service.create_carousel_creative(
            account_id=account_id,
            page_id=creative_data.page_id,
            creative=creative_data.carousel_creative
        )

    return creative
```

---

## 12. Frontend Components

### 12.1 Meta Account Connection

```typescript
// frontend/src/components/meta/MetaAccountConnect.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Facebook, Instagram, Check } from 'lucide-react';

export function MetaAccountConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<MetaAdAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const handleConnect = async () => {
    setIsConnecting(true);

    // Get OAuth URL from backend
    const response = await fetch('/api/v1/meta/oauth/url?redirect_uri=' +
      encodeURIComponent(window.location.origin + '/meta/callback')
    );
    const { url } = await response.json();

    // Open Facebook OAuth popup
    const popup = window.open(url, 'meta_oauth', 'width=600,height=700');

    // Listen for callback
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'META_OAUTH_SUCCESS') {
        const accounts = event.data.ad_accounts;
        setAvailableAccounts(accounts);
        setIsConnecting(false);
      }
    });
  };

  const handleSelectAccount = async (accountId: string) => {
    // Connect selected account
    await fetch(`/api/v1/meta/accounts/${accountId}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* token data */ })
    });

    setSelectedAccounts([...selectedAccounts, accountId]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Facebook className="h-5 w-5 text-blue-600" />
          Connect Meta Ads
        </CardTitle>
      </CardHeader>
      <CardContent>
        {availableAccounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Connect your Facebook & Instagram ad accounts to manage them with AI
            </p>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : 'Connect with Facebook'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select accounts to manage:
            </p>
            {availableAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ID: {account.id} • {account.currency}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={selectedAccounts.includes(account.id) ? 'outline' : 'default'}
                  onClick={() => handleSelectAccount(account.id)}
                  disabled={selectedAccounts.includes(account.id)}
                >
                  {selectedAccounts.includes(account.id) ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Connected
                    </>
                  ) : (
                    'Connect'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 12.2 Meta Targeting Builder UI

```typescript
// frontend/src/components/meta/TargetingBuilder.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';

interface TargetingBuilderProps {
  value: MetaTargeting;
  onChange: (targeting: MetaTargeting) => void;
  estimatedReach?: number;
}

export function TargetingBuilder({ value, onChange, estimatedReach }: TargetingBuilderProps) {
  const [ageRange, setAgeRange] = useState([value.age_min || 18, value.age_max || 65]);

  const updateTargeting = (updates: Partial<MetaTargeting>) => {
    onChange({ ...value, ...updates });
  };

  return (
    <div className="space-y-6">
      {/* Estimated Reach */}
      {estimatedReach && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-800">Estimated Reach</span>
              <span className="font-bold text-blue-900">
                {formatNumber(estimatedReach)} people
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location */}
      <div className="space-y-2">
        <Label>Locations</Label>
        <LocationSelector
          value={value.geo_locations}
          onChange={(geo) => updateTargeting({ geo_locations: geo })}
        />
      </div>

      {/* Age & Gender */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Age Range: {ageRange[0]} - {ageRange[1]}</Label>
          <Slider
            min={18}
            max={65}
            step={1}
            value={ageRange}
            onValueChange={(val) => {
              setAgeRange(val);
              updateTargeting({ age_min: val[0], age_max: val[1] });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Gender</Label>
          <div className="flex gap-2">
            <Badge
              variant={value.genders?.includes(1) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleGender(1)}
            >
              Male
            </Badge>
            <Badge
              variant={value.genders?.includes(2) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleGender(2)}
            >
              Female
            </Badge>
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-2">
        <Label>Interests</Label>
        <InterestSelector
          value={value.interests || []}
          onChange={(interests) => updateTargeting({
            flexible_spec: [{ interests }]
          })}
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {value.interests?.map((interest) => (
            <Badge key={interest.id} variant="secondary">
              {interest.name}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => removeInterest(interest.id)}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Custom Audiences */}
      <div className="space-y-2">
        <Label>Custom Audiences</Label>
        <AudienceSelector
          value={value.custom_audiences || []}
          onChange={(audiences) => updateTargeting({ custom_audiences: audiences })}
        />
      </div>

      {/* Placements */}
      <div className="space-y-2">
        <Label>Placements</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="placements"
              checked={value.automatic_placements !== false}
              onChange={() => updateTargeting({ automatic_placements: true })}
            />
            <span className="text-sm">Advantage+ Placements (Recommended)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="placements"
              checked={value.automatic_placements === false}
              onChange={() => updateTargeting({ automatic_placements: false })}
            />
            <span className="text-sm">Manual Placements</span>
          </label>
        </div>

        {value.automatic_placements === false && (
          <PlacementSelector
            value={value.publisher_platforms || []}
            onChange={(platforms) => updateTargeting({ publisher_platforms: platforms })}
          />
        )}
      </div>
    </div>
  );
}
```

---

## 13. Summary

### Key Files to Create

| Category | Files |
|----------|-------|
| **Database** | `014_meta_tables.sql`, `015_meta_indexes.sql` |
| **Services** | `meta_auth_service.py`, `meta_ads_client.py`, `meta_targeting_service.py`, `meta_creative_service.py`, `meta_pixel_service.py`, `meta_sync_worker.py`, `meta_recommendation_rules.py` |
| **API** | `api/v1/meta.py` |
| **Frontend** | `MetaAccountConnect.tsx`, `TargetingBuilder.tsx`, `MetaAudienceManager.tsx`, `MetaCreativeBuilder.tsx` |

### Meta vs Google Ads Feature Comparison

| Feature | Google Ads | Meta Ads |
|---------|------------|----------|
| Campaign Structure | Campaign → Ad Group → Ad | Campaign → Ad Set → Ad |
| Keyword Targeting | Yes | No |
| Audience Targeting | Partial | Primary |
| Creative Types | Text RSAs | Visual (Image/Video/Carousel) |
| Bidding Level | Ad Group | Ad Set |
| Learning Phase | ~2 weeks | ~7 days / 50 conversions |
| Pixel/Tracking | Google Ads Tag | Meta Pixel + CAPI |
| API Style | gRPC | REST (GraphQL-style) |

### Estimated Implementation Time

| Component | Effort |
|-----------|--------|
| OAuth & Token Management | 2-3 days |
| Campaign/Ad Set/Ad CRUD | 3-4 days |
| Sync Worker | 2-3 days |
| Targeting Builder | 2-3 days |
| Creative Management | 3-4 days |
| AI Recommendations (Meta-specific) | 2-3 days |
| Frontend Components | 4-5 days |
| Testing | 3-4 days |
| **Total** | **~3-4 weeks** |
