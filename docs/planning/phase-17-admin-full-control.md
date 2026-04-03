# Phase 17: Admin Panel - Full Control & Missing Features

## Executive Summary

This document identifies all **missing features** from the current admin panel and provides a comprehensive plan for **complete platform control**. The current admin (~60% complete) handles basic user/org management but lacks critical features for:

1. **Landing Page & Marketing Analytics** - Visitor tracking, conversions, UTM campaigns
2. **API Version Monitoring** - Google/Meta API sunset tracking, migration status
3. **Detailed API Cost Control** - Per-provider costs, forecasting, alerts
4. **Advanced Pricing Control** - A/B testing, regional pricing, add-ons
5. **ML/AI Full Control** - Model config, prompts, recommendations engine
6. **Operational Control** - Feature flags, maintenance mode, announcements

---

## Current Implementation Status

### What EXISTS Today

| Area | Backend | Frontend | Database |
|------|---------|----------|----------|
| Admin Auth | ✅ | ✅ | ✅ admin_users, admin_sessions |
| Dashboard Metrics | ✅ | ✅ | ✅ via queries |
| User Management | ✅ | ✅ | ✅ users table |
| Organization Management | ✅ | ✅ | ✅ organizations table |
| Basic Analytics | ✅ | ✅ | ✅ page_views |
| API Usage Stats | ✅ | ✅ | ✅ api_usage_logs |
| AI Usage Stats | ✅ | ✅ | ✅ ai_usage_logs |
| System Config | ✅ | ✅ | ✅ system_config |
| Audit Logs | ✅ | ✅ | ✅ audit_logs |
| Billing Dashboard | ✅ | ✅ | ✅ billing tables |
| Ad Account Management | ✅ | ✅ | ✅ ad_accounts |

### What's MISSING

| Area | Status | Impact |
|------|--------|--------|
| Landing Page Analytics | ❌ Missing | Can't track marketing ROI |
| UTM Campaign Tracking | ❌ Missing | Can't attribute signups |
| Conversion Funnel | ❌ Missing | Can't optimize onboarding |
| API Version Monitor | ❌ Missing | API changes cause emergencies |
| API Cost Forecasting | ❌ Missing | Budget surprises |
| Feature Flags UI | ❌ Missing | Can't toggle features easily |
| Maintenance Mode UI | ❌ Missing | Downtime management |
| User Impersonation | ❌ Missing | Can't debug user issues |
| Support Tickets | ❌ Missing | No support tracking |
| Announcements System | ❌ Missing | Can't notify users |
| Security Events | ❌ Missing | Can't detect threats |
| Admin User Management | ❌ Missing | Can't manage admin team |
| ML Model Control | ❌ Missing | Can't configure AI |
| Email Templates | ❌ Missing | Can't customize emails |
| Background Jobs Monitor | ❌ Missing | Can't monitor workers |
| Real-time Health | ❌ Missing | Can't see live status |

---

## Part 1: Landing Page & Marketing Analytics

### 1.1 Problem Statement

Currently you have NO visibility into:
- How many people visit your landing page
- Which marketing channels drive signups
- Conversion rates at each step
- Which users logged in with Gmail vs email

### 1.2 New Database Tables

```sql
-- ============================================================================
-- 00008_marketing_analytics.sql
-- ============================================================================

-- Landing page visits (separate from app page_views)
CREATE TABLE landing_page_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL,
    visitor_fingerprint VARCHAR(64), -- hashed browser fingerprint

    -- Traffic source
    utm_source VARCHAR(100),      -- google, facebook, twitter, etc.
    utm_medium VARCHAR(100),      -- cpc, organic, email, social
    utm_campaign VARCHAR(255),    -- campaign name
    utm_term VARCHAR(255),        -- keywords (for paid search)
    utm_content VARCHAR(255),     -- ad variant
    referrer VARCHAR(500),
    referrer_domain VARCHAR(255),

    -- Landing page info
    landing_page VARCHAR(255),    -- /pricing, /features, /home
    exit_page VARCHAR(255),
    page_views_count INT DEFAULT 1,
    time_on_site_seconds INT,

    -- Visitor info
    ip_address VARCHAR(45),
    country_code VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    device_type VARCHAR(20),      -- desktop, mobile, tablet
    browser VARCHAR(50),
    browser_version VARCHAR(20),
    os VARCHAR(50),
    os_version VARCHAR(20),
    screen_resolution VARCHAR(20),

    -- Conversion tracking
    converted_to_signup BOOLEAN DEFAULT false,
    converted_at TIMESTAMPTZ,
    signup_user_id UUID REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signup source tracking
CREATE TABLE signup_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Auth method
    auth_method VARCHAR(50) NOT NULL, -- email, google, github, microsoft
    oauth_provider VARCHAR(50),       -- google, github, microsoft, etc.

    -- Source attribution
    landing_visit_id UUID REFERENCES landing_page_visits(id),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    referrer VARCHAR(500),

    -- First touch vs last touch
    first_touch_source VARCHAR(100),
    last_touch_source VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email subscribers (newsletter, waitlist)
CREATE TABLE email_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    source VARCHAR(100),          -- landing_page, blog, exit_popup, footer
    utm_campaign VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active', -- active, unsubscribed, bounced
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    user_id UUID REFERENCES users(id), -- if they later signed up

    UNIQUE(email)
);

-- Conversion funnel events
CREATE TABLE funnel_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100),
    user_id UUID REFERENCES users(id),

    event_type VARCHAR(100) NOT NULL,
    -- visit_landing, view_pricing, click_signup, complete_signup,
    -- connect_account, first_recommendation, first_payment

    event_properties JSONB,
    page_path VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_landing_visits_created ON landing_page_visits(created_at DESC);
CREATE INDEX idx_landing_visits_utm ON landing_page_visits(utm_source, utm_campaign);
CREATE INDEX idx_landing_visits_session ON landing_page_visits(session_id);
CREATE INDEX idx_landing_visits_converted ON landing_page_visits(converted_to_signup) WHERE converted_to_signup = true;

CREATE INDEX idx_signup_sources_user ON signup_sources(user_id);
CREATE INDEX idx_signup_sources_method ON signup_sources(auth_method);
CREATE INDEX idx_signup_sources_created ON signup_sources(created_at DESC);

CREATE INDEX idx_funnel_events_type ON funnel_events(event_type, created_at DESC);
CREATE INDEX idx_funnel_events_session ON funnel_events(session_id);
```

### 1.3 New API Endpoints

```python
# apps/api/app/api/admin_marketing.py

@router.get("/marketing/landing-visits")
async def get_landing_visits(
    days: int = Query(default=30, le=90),
    utm_source: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Get landing page visit analytics"""
    # Returns: total visits, unique visitors, by source, by page, by device

@router.get("/marketing/traffic-sources")
async def get_traffic_sources(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get traffic source breakdown"""
    # Returns: organic, paid, social, email, referral, direct

@router.get("/marketing/utm-campaigns")
async def get_utm_campaigns(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get UTM campaign performance"""
    # Returns: campaign name, visits, signups, conversion rate, cost per signup

@router.get("/marketing/conversion-funnel")
async def get_conversion_funnel(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get conversion funnel metrics"""
    # Returns: visit → signup → connect → recommendation → paid rates

@router.get("/marketing/signup-methods")
async def get_signup_methods(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get signup method breakdown (Google, email, etc.)"""
    # Returns: count by auth method, conversion rates by method

@router.get("/marketing/subscribers")
async def get_subscribers(
    page: int = Query(default=1),
    status: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Get email subscribers list"""

@router.get("/marketing/geo-analytics")
async def get_geo_analytics(
    days: int = Query(default=30, le=90),
    admin: dict = Depends(get_current_admin)
):
    """Get geographic breakdown of visitors"""
    # Returns: by country, by region, by city
```

### 1.4 Admin Frontend - Marketing Analytics Page

```
/admin/marketing/
├── overview        # Summary dashboard with all key metrics
├── traffic         # Traffic sources, UTM campaigns
├── funnel          # Conversion funnel visualization
├── signups         # Signup method breakdown (Gmail, email, etc.)
├── subscribers     # Email subscriber management
└── geo             # Geographic analytics with map
```

**Dashboard Metrics:**
- Total Landing Page Visits (today/week/month)
- Unique Visitors
- Signup Conversion Rate
- Paid Conversion Rate
- Top Traffic Sources (pie chart)
- Signup Methods (pie chart: Google 45%, Email 35%, GitHub 20%)
- Conversion Funnel (visual funnel)
- Top UTM Campaigns (table with cost/signup)

---

## Part 2: API Version Monitoring & Change Tracking

### 2.1 Problem Statement

Google Ads API releases a new version **every month**. Meta API updates quarterly. Without monitoring:
- You get 90-day warning before sunset, then panic
- API changes break production
- No migration planning

### 2.2 New Database Tables

```sql
-- API version tracking
CREATE TABLE api_version_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL, -- google_ads, meta

    -- Version info
    current_version VARCHAR(20),
    latest_version VARCHAR(20),
    deprecated_versions TEXT[],
    sunset_dates JSONB, -- {"v22": "2026-06-01", "v23": "2026-09-01"}

    -- Adapter status
    adapter_versions_available TEXT[], -- ["v23", "v23_1", "v24"]
    production_adapter_version VARCHAR(20),

    -- Health
    last_health_check TIMESTAMPTZ,
    api_status VARCHAR(50), -- healthy, degraded, down
    error_rate_24h DECIMAL(5,2),
    avg_latency_ms INT,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API changelog monitoring
CREATE TABLE api_changelog_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,

    -- Change details
    change_type VARCHAR(50), -- new_feature, breaking_change, deprecation, bug_fix
    title VARCHAR(255),
    description TEXT,
    affected_endpoints TEXT[],
    migration_required BOOLEAN DEFAULT false,

    -- Dates
    announced_at TIMESTAMPTZ,
    effective_at TIMESTAMPTZ,
    sunset_at TIMESTAMPTZ,

    -- Our response
    migration_status VARCHAR(50), -- not_started, in_progress, completed, n/a
    migration_notes TEXT,
    completed_at TIMESTAMPTZ,

    source_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API expense tracking (detailed)
CREATE TABLE api_expense_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Categorization
    platform VARCHAR(50) NOT NULL, -- google_ads, meta, internal
    service_type VARCHAR(50), -- read, write, batch, stream
    endpoint VARCHAR(255),

    -- Volume
    request_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,

    -- Cost
    quota_units_used INT DEFAULT 0,
    estimated_cost_usd DECIMAL(10,4) DEFAULT 0,

    -- Performance
    total_latency_ms BIGINT DEFAULT 0,
    avg_latency_ms INT GENERATED ALWAYS AS (
        CASE WHEN request_count > 0 THEN total_latency_ms / request_count ELSE 0 END
    ) STORED,

    -- Aggregation period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert for API issues
CREATE TABLE api_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    alert_type VARCHAR(100), -- version_sunset, deprecation, error_spike, quota_warning
    severity VARCHAR(20), -- info, warning, critical
    title VARCHAR(255),
    message TEXT,
    metadata JSONB,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES admin_users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_changelog_platform ON api_changelog_entries(platform, announced_at DESC);
CREATE INDEX idx_api_expense_period ON api_expense_logs(period_start, platform);
CREATE INDEX idx_api_alerts_unack ON api_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;
```

### 2.3 New API Endpoints

```python
# apps/api/app/api/admin_api_monitoring.py

@router.get("/api-monitoring/versions")
async def get_api_versions(admin: dict = Depends(get_current_admin)):
    """Get current API versions and adapter status"""
    # Returns: current versions, available adapters, sunset dates

@router.get("/api-monitoring/changelog")
async def get_api_changelog(
    platform: Optional[str] = None,
    change_type: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Get API changelog entries"""

@router.post("/api-monitoring/changelog/{entry_id}/migration-status")
async def update_migration_status(
    entry_id: str,
    status: str,
    notes: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Update migration status for a changelog entry"""

@router.get("/api-monitoring/expenses")
async def get_api_expenses(
    days: int = Query(default=30, le=90),
    platform: Optional[str] = None,
    group_by: str = Query(default="day"), # day, week, endpoint
    admin: dict = Depends(get_current_admin)
):
    """Get detailed API expense breakdown"""

@router.get("/api-monitoring/alerts")
async def get_api_alerts(
    acknowledged: Optional[bool] = None,
    admin: dict = Depends(get_current_admin)
):
    """Get API alerts"""

@router.post("/api-monitoring/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Acknowledge an API alert"""

@router.get("/api-monitoring/health")
async def get_api_health(admin: dict = Depends(get_current_admin)):
    """Get real-time API health status"""
    # Returns: Google Ads status, Meta status, error rates, latency
```

### 2.4 Background Worker - API Monitor

```python
# apps/api/app/workers/api_version_monitor.py

class APIVersionMonitor:
    """
    Runs daily via Cloud Scheduler to:
    1. Check Google Ads API release notes RSS
    2. Check Meta API changelog
    3. Update api_version_tracking table
    4. Create alerts for new versions/deprecations
    5. Post to Slack #engineering-alerts
    """

    GOOGLE_ADS_CHANGELOG_URL = "https://developers.google.com/google-ads/api/docs/release-notes"
    META_API_CHANGELOG_URL = "https://developers.facebook.com/docs/graph-api/changelog"

    async def check_google_ads_versions(self):
        # Scrape/parse Google Ads release notes
        # Compare with stored versions
        # Create changelog entries for new versions
        # Create alerts if sunset < 90 days
        pass

    async def check_meta_versions(self):
        # Similar for Meta
        pass

    async def send_slack_alert(self, message: str, severity: str):
        # Post to Slack webhook
        pass
```

### 2.5 Admin Frontend - API Monitor Page

```
/admin/api-monitor/
├── overview        # Current versions, health status, alerts
├── changelog       # All API changes with migration status
├── expenses        # Cost breakdown by platform/endpoint
├── alerts          # Unacknowledged alerts
└── adapters        # Adapter version management
```

**Dashboard Widgets:**
- Google Ads API Status (healthy/degraded/down)
- Meta API Status
- Current Adapter Versions
- Days Until Next Sunset (countdown)
- Pending Migrations (count)
- API Costs This Month (by platform)
- Alert Banner (critical alerts)

---

## Part 3: ML/AI Full Control

### 3.1 Problem Statement

Current admin shows basic AI usage stats but lacks:
- Model selection per feature
- Prompt management
- Recommendation rule configuration
- ML model monitoring
- Cost alerts and budgets

### 3.2 New Database Tables

```sql
-- AI model configurations
CREATE TABLE ai_model_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Feature this config applies to
    feature VARCHAR(100) NOT NULL, -- chat, recommendations, forecasting, audience_builder

    -- Model settings
    provider VARCHAR(50) NOT NULL, -- gemini, openai, anthropic
    model_name VARCHAR(100) NOT NULL, -- gemini-1.5-pro, gpt-4o, claude-3-opus

    -- Parameters
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INT DEFAULT 2048,
    top_p DECIMAL(3,2) DEFAULT 1.0,
    frequency_penalty DECIMAL(3,2) DEFAULT 0,
    presence_penalty DECIMAL(3,2) DEFAULT 0,

    -- Fallback
    fallback_provider VARCHAR(50),
    fallback_model VARCHAR(100),

    -- Status
    is_active BOOLEAN DEFAULT true,
    priority INT DEFAULT 0, -- for A/B testing

    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System prompts management
CREATE TABLE ai_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification
    name VARCHAR(100) NOT NULL UNIQUE, -- chat_system, recommendation_budget, etc.
    feature VARCHAR(100) NOT NULL,
    version INT DEFAULT 1,

    -- Content
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT, -- with {{variables}}

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_production BOOLEAN DEFAULT false,

    -- A/B testing
    ab_test_id UUID,
    ab_test_variant VARCHAR(50),

    -- Metrics
    usage_count INT DEFAULT 0,
    avg_rating DECIMAL(3,2),

    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI prompt history (for rollback)
CREATE TABLE ai_prompts_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES ai_prompts(id),
    version INT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT,
    changed_by UUID REFERENCES admin_users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendation rules configuration
CREATE TABLE recommendation_rules_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Rule identification
    rule_type VARCHAR(100) NOT NULL, -- budget_optimization, keyword_pause, bid_adjustment
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Configuration
    is_enabled BOOLEAN DEFAULT true,
    priority INT DEFAULT 50, -- 1-100, higher = check first

    -- Thresholds (JSONB for flexibility)
    thresholds JSONB NOT NULL,
    -- Example: {"min_spend": 100, "min_days": 7, "max_cpa_ratio": 2.0}

    -- Confidence settings
    min_confidence_score DECIMAL(3,2) DEFAULT 0.7,
    require_approval BOOLEAN DEFAULT true,

    -- Scope
    applies_to_plans TEXT[], -- which subscription plans
    applies_to_platforms TEXT[], -- google, meta, all

    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI cost budgets and alerts
CREATE TABLE ai_cost_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scope
    scope_type VARCHAR(50) NOT NULL, -- platform, organization, feature
    scope_id VARCHAR(255), -- org_id or feature name

    -- Budget
    daily_budget_usd DECIMAL(10,2),
    monthly_budget_usd DECIMAL(10,2),

    -- Current spend
    current_daily_spend DECIMAL(10,4) DEFAULT 0,
    current_monthly_spend DECIMAL(10,4) DEFAULT 0,

    -- Alerts
    alert_at_percentage INT DEFAULT 80, -- alert at 80% of budget
    action_at_limit VARCHAR(50) DEFAULT 'alert', -- alert, throttle, block

    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_model_configs_feature ON ai_model_configs(feature, is_active);
CREATE INDEX idx_ai_prompts_name ON ai_prompts(name);
CREATE INDEX idx_rec_rules_type ON recommendation_rules_config(rule_type, is_enabled);
```

### 3.3 New API Endpoints

```python
# apps/api/app/api/admin_ai.py

# Model Configuration
@router.get("/ai/models")
async def get_ai_models(admin: dict = Depends(get_current_admin)):
    """Get all AI model configurations"""

@router.post("/ai/models")
async def create_ai_model_config(data: AIModelConfigCreate, admin: dict = Depends(get_current_admin)):
    """Create new AI model configuration"""

@router.patch("/ai/models/{model_id}")
async def update_ai_model_config(model_id: str, data: AIModelConfigUpdate, admin: dict = Depends(get_current_admin)):
    """Update AI model configuration"""

# Prompts Management
@router.get("/ai/prompts")
async def get_ai_prompts(feature: Optional[str] = None, admin: dict = Depends(get_current_admin)):
    """Get all system prompts"""

@router.post("/ai/prompts")
async def create_ai_prompt(data: AIPromptCreate, admin: dict = Depends(get_current_admin)):
    """Create new prompt"""

@router.patch("/ai/prompts/{prompt_id}")
async def update_ai_prompt(prompt_id: str, data: AIPromptUpdate, admin: dict = Depends(get_current_admin)):
    """Update prompt (creates history entry)"""

@router.get("/ai/prompts/{prompt_id}/history")
async def get_prompt_history(prompt_id: str, admin: dict = Depends(get_current_admin)):
    """Get prompt version history"""

@router.post("/ai/prompts/{prompt_id}/rollback/{version}")
async def rollback_prompt(prompt_id: str, version: int, admin: dict = Depends(get_current_admin)):
    """Rollback prompt to previous version"""

# Recommendation Rules
@router.get("/ai/recommendation-rules")
async def get_recommendation_rules(admin: dict = Depends(get_current_admin)):
    """Get all recommendation rule configurations"""

@router.patch("/ai/recommendation-rules/{rule_id}")
async def update_recommendation_rule(rule_id: str, data: RuleConfigUpdate, admin: dict = Depends(get_current_admin)):
    """Update rule thresholds and settings"""

@router.post("/ai/recommendation-rules/{rule_id}/toggle")
async def toggle_recommendation_rule(rule_id: str, admin: dict = Depends(get_current_admin)):
    """Enable/disable a recommendation rule"""

# Cost Budgets
@router.get("/ai/budgets")
async def get_ai_budgets(admin: dict = Depends(get_current_admin)):
    """Get AI cost budgets"""

@router.post("/ai/budgets")
async def create_ai_budget(data: AIBudgetCreate, admin: dict = Depends(get_current_admin)):
    """Create cost budget"""

@router.patch("/ai/budgets/{budget_id}")
async def update_ai_budget(budget_id: str, data: AIBudgetUpdate, admin: dict = Depends(get_current_admin)):
    """Update cost budget"""

# Testing
@router.post("/ai/test-prompt")
async def test_prompt(
    prompt_id: str,
    test_input: str,
    admin: dict = Depends(get_current_admin)
):
    """Test a prompt with sample input"""
```

### 3.4 Admin Frontend - AI Control Center

```
/admin/ai/
├── overview        # AI usage, costs, model status
├── models          # Model configuration per feature
├── prompts         # Prompt management with editor
├── rules           # Recommendation rules configuration
├── budgets         # Cost budgets and alerts
└── testing         # Prompt testing playground
```

---

## Part 4: Operational Control Features

### 4.1 Feature Flags UI

Current system has feature flags in `system_config` but no dedicated UI.

```python
# Dedicated feature flags management
@router.get("/feature-flags")
async def get_feature_flags(admin: dict = Depends(get_current_admin)):
    """Get all feature flags with status"""

@router.patch("/feature-flags/{flag_name}")
async def update_feature_flag(
    flag_name: str,
    enabled: bool,
    plans: Optional[List[str]] = None, # Enable only for specific plans
    percentage: Optional[int] = None,   # Gradual rollout
    admin: dict = Depends(get_current_admin)
):
    """Update feature flag"""
```

**Frontend: `/admin/feature-flags`**
- Toggle switches for each feature
- Plan-based targeting
- Percentage rollout controls
- Feature flag history

### 4.2 Maintenance Mode Control

```python
@router.post("/system/maintenance-mode")
async def set_maintenance_mode(
    enabled: bool,
    message: str,
    expected_duration_minutes: Optional[int] = None,
    allowed_ips: Optional[List[str]] = None, # Allow admin access
    admin: dict = Depends(get_current_admin)
):
    """Enable/disable maintenance mode"""

@router.get("/system/maintenance-status")
async def get_maintenance_status(admin: dict = Depends(get_current_admin)):
    """Get current maintenance status"""
```

### 4.3 User Impersonation (Critical for Support)

```sql
-- Add to admin_sessions or new table
CREATE TABLE admin_impersonation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id),
    impersonated_user_id UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    actions_performed JSONB DEFAULT '[]'
);
```

```python
@router.post("/users/{user_id}/impersonate")
async def start_impersonation(
    user_id: str,
    reason: str,
    admin: dict = Depends(get_current_admin)
):
    """Start impersonation session - returns user token"""

@router.post("/impersonation/end")
async def end_impersonation(admin: dict = Depends(get_current_admin)):
    """End impersonation session"""

@router.get("/impersonation/history")
async def get_impersonation_history(admin: dict = Depends(get_current_admin)):
    """Get impersonation audit log"""
```

### 4.4 Announcements System

```sql
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,

    -- Display settings
    type VARCHAR(50) NOT NULL, -- banner, modal, toast
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
    cta_text VARCHAR(100),
    cta_url VARCHAR(500),

    -- Targeting
    target_plans TEXT[], -- null = all plans
    target_user_ids UUID[], -- specific users

    -- Schedule
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,

    -- Dismissal
    dismissible BOOLEAN DEFAULT true,

    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE announcement_dismissals (
    announcement_id UUID NOT NULL REFERENCES announcements(id),
    user_id UUID NOT NULL REFERENCES users(id),
    dismissed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (announcement_id, user_id)
);
```

```python
@router.get("/announcements")
@router.post("/announcements")
@router.patch("/announcements/{id}")
@router.delete("/announcements/{id}")
```

### 4.5 Security Events Monitoring

```sql
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_type VARCHAR(100) NOT NULL,
    -- failed_login, suspicious_activity, rate_limit_exceeded,
    -- password_reset, mfa_disabled, api_key_created, etc.

    severity VARCHAR(20) NOT NULL, -- info, warning, critical

    -- Actor
    user_id UUID REFERENCES users(id),
    admin_user_id UUID REFERENCES admin_users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Details
    description TEXT,
    metadata JSONB,

    -- Location (from IP)
    country VARCHAR(100),
    city VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity, created_at DESC);
CREATE INDEX idx_security_events_ip ON security_events(ip_address);
```

### 4.6 Admin User Management

```python
@router.get("/security/admins")
async def get_admin_users(admin: dict = Depends(get_current_admin)):
    """List all admin users"""

@router.post("/security/admins")
async def create_admin_user(
    data: AdminUserCreate,
    admin: dict = Depends(get_current_admin)
):
    """Create new admin user (super_admin only)"""

@router.patch("/security/admins/{admin_id}")
async def update_admin_user(
    admin_id: str,
    data: AdminUserUpdate,
    admin: dict = Depends(get_current_admin)
):
    """Update admin user role/status"""

@router.delete("/security/admins/{admin_id}")
async def deactivate_admin_user(
    admin_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Deactivate admin user"""
```

### 4.7 Background Jobs Monitor

```sql
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_type VARCHAR(100) NOT NULL, -- sync, token_refresh, reconciliation, etc.
    job_name VARCHAR(255),

    status VARCHAR(50) NOT NULL, -- pending, running, completed, failed, cancelled

    -- Timing
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Progress
    progress_percent INT DEFAULT 0,
    progress_message TEXT,

    -- Results
    result JSONB,
    error_message TEXT,
    retry_count INT DEFAULT 0,

    -- Context
    triggered_by VARCHAR(50), -- scheduler, manual, webhook
    triggered_by_admin_id UUID REFERENCES admin_users(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bg_jobs_status ON background_jobs(status, created_at DESC);
CREATE INDEX idx_bg_jobs_type ON background_jobs(job_type, created_at DESC);
```

```python
@router.get("/system/jobs")
async def get_background_jobs(
    status: Optional[str] = None,
    job_type: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Get background job status"""

@router.post("/system/jobs/{job_type}/trigger")
async def trigger_job(
    job_type: str,
    admin: dict = Depends(get_current_admin)
):
    """Manually trigger a background job"""

@router.post("/system/jobs/{job_id}/retry")
async def retry_failed_job(
    job_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Retry a failed job"""

@router.post("/system/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Cancel a running/pending job"""
```

---

## Part 5: Real-Time System Health Dashboard

### 5.1 Health Check Endpoints

```python
@router.get("/system/health")
async def get_system_health(admin: dict = Depends(get_current_admin)):
    """Get comprehensive system health"""
    return {
        "api_server": {
            "status": "healthy",
            "uptime_seconds": 86400,
            "memory_usage_mb": 512,
            "cpu_percent": 25
        },
        "database": {
            "status": "healthy",
            "connections_active": 15,
            "connections_max": 100,
            "query_latency_ms": 5
        },
        "redis": {
            "status": "healthy",
            "memory_usage_mb": 128,
            "hit_rate_percent": 95
        },
        "external_apis": {
            "google_ads": {"status": "healthy", "latency_ms": 120},
            "meta": {"status": "healthy", "latency_ms": 95},
            "stripe": {"status": "healthy", "latency_ms": 80}
        },
        "background_workers": {
            "sync_worker": {"status": "running", "last_run": "2026-04-01T10:00:00Z"},
            "token_refresh": {"status": "running", "last_run": "2026-04-01T09:30:00Z"},
            "reconciliation": {"status": "idle", "last_run": "2026-04-01T00:00:00Z"}
        }
    }

@router.get("/system/metrics/realtime")
async def get_realtime_metrics(admin: dict = Depends(get_current_admin)):
    """Get real-time metrics for live dashboard"""
    return {
        "active_users": 42,
        "requests_per_minute": 150,
        "error_rate_percent": 0.5,
        "avg_response_time_ms": 45,
        "ai_requests_pending": 3,
        "sync_jobs_running": 2
    }
```

### 5.2 WebSocket for Live Updates (Future)

```python
# apps/api/app/api/admin_websocket.py

@router.websocket("/ws/admin/metrics")
async def admin_metrics_websocket(websocket: WebSocket):
    """WebSocket endpoint for live admin metrics"""
    await websocket.accept()

    while True:
        metrics = await get_realtime_metrics()
        await websocket.send_json(metrics)
        await asyncio.sleep(5)  # Update every 5 seconds
```

---

## Part 6: Implementation Priority

### Sprint 1: Marketing Analytics (Week 1-2)
1. Create `00008_marketing_analytics.sql` migration
2. Build landing page tracking JavaScript snippet
3. Implement `/admin/marketing/*` endpoints
4. Build Marketing Analytics frontend pages
5. Add signup source tracking to auth flow

### Sprint 2: API Version Monitoring (Week 3-4)
1. Create API monitoring database tables
2. Build `api_version_monitor.py` worker
3. Implement `/admin/api-monitor/*` endpoints
4. Build API Monitor frontend page
5. Set up Slack webhook integration

### Sprint 3: AI Full Control (Week 5-6)
1. Create AI control database tables
2. Implement model config endpoints
3. Build prompt management system
4. Implement recommendation rules config
5. Build AI Control Center frontend

### Sprint 4: Operational Features (Week 7-8)
1. Feature flags dedicated UI
2. Maintenance mode control
3. User impersonation
4. Announcements system
5. Admin user management

### Sprint 5: Security & Monitoring (Week 9-10)
1. Security events tracking
2. Background jobs monitor
3. Real-time health dashboard
4. Alert management
5. Data export tools

---

## Summary

This plan adds **complete platform control** through:

| Feature Area | New Tables | New Endpoints | Frontend Pages |
|--------------|------------|---------------|----------------|
| Marketing Analytics | 4 | 7 | 6 |
| API Monitoring | 4 | 8 | 5 |
| AI Control | 5 | 15 | 6 |
| Operations | 5 | 12 | 5 |
| Security | 2 | 6 | 2 |
| **Total** | **20** | **48** | **24** |

After implementation, the admin will have visibility and control over:
- Every visitor to the landing page
- Every signup and how they found you
- Every API version change before it breaks
- Every AI model and prompt
- Every recommendation rule
- Every background job
- Every security event
- Complete billing and pricing control

This transforms the admin panel from a basic management tool into a **mission control center** for the entire platform.
