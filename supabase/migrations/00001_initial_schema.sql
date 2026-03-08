-- AdsMaster Initial Schema
-- Phase 1: Core Tables (Sprint 1)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ORGANIZATIONS & USERS
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'free', -- free, starter, pro, agency
    plan_expires_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    role VARCHAR(50) DEFAULT 'member', -- owner, admin, member, viewer
    preferences JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AD PLATFORMS & ACCOUNTS
-- ============================================================================

CREATE TABLE ad_platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL, -- google_ads, meta_ads
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    api_version VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert supported platforms
INSERT INTO ad_platforms (name, display_name, api_version) VALUES
    ('google_ads', 'Google Ads', 'v23.1'),
    ('meta_ads', 'Meta Ads', 'v21.0');

CREATE TABLE ad_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    platform_id UUID NOT NULL REFERENCES ad_platforms(id),
    external_account_id VARCHAR(100) NOT NULL, -- Google customer ID or Meta ad account ID
    name VARCHAR(255) NOT NULL,
    currency_code VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    status VARCHAR(50) DEFAULT 'active', -- active, paused, suspended, disconnected

    -- OAuth tokens (encrypted in production)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    token_status VARCHAR(20) DEFAULT 'healthy', -- healthy, expiring_soon, refresh_failed, expired
    token_refresh_attempts INT DEFAULT 0,

    -- Sync status
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(50), -- success, partial, failed
    last_verified_at TIMESTAMPTZ,

    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(platform_id, external_account_id)
);

-- ============================================================================
-- CAMPAIGNS
-- ============================================================================

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
    external_campaign_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- ENABLED, PAUSED, REMOVED
    campaign_type VARCHAR(50) NOT NULL, -- SEARCH, DISPLAY, SHOPPING, VIDEO, PERFORMANCE_MAX

    -- Budget (all in micros - 1 USD = 1,000,000 micros)
    budget_micros BIGINT,
    budget_type VARCHAR(50), -- DAILY, TOTAL
    currency_code VARCHAR(3) DEFAULT 'USD',

    -- Dates
    start_date DATE,
    end_date DATE,

    -- Verification (for reconciliation)
    last_verified_at TIMESTAMPTZ,
    verification_status VARCHAR(20) DEFAULT 'pending', -- verified, mismatch, pending

    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ad_account_id, external_campaign_id)
);

-- ============================================================================
-- AD GROUPS
-- ============================================================================

CREATE TABLE ad_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    external_ad_group_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    cpc_bid_micros BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(campaign_id, external_ad_group_id)
);

-- ============================================================================
-- KEYWORDS
-- ============================================================================

CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_group_id UUID NOT NULL REFERENCES ad_groups(id) ON DELETE CASCADE,
    external_keyword_id VARCHAR(100) NOT NULL,
    text VARCHAR(500) NOT NULL,
    match_type VARCHAR(20) NOT NULL, -- EXACT, PHRASE, BROAD
    status VARCHAR(50) NOT NULL,
    quality_score INT, -- 1-10
    cpc_bid_micros BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ad_group_id, external_keyword_id)
);

-- ============================================================================
-- METRICS (Daily aggregates)
-- ============================================================================

CREATE TABLE metrics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    ad_group_id UUID REFERENCES ad_groups(id) ON DELETE CASCADE,
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,

    metric_date DATE NOT NULL,

    -- Core metrics (all monetary values in micros)
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(12, 4) DEFAULT 0,
    conversion_value_micros BIGINT DEFAULT 0,

    -- Calculated metrics (stored for query performance)
    ctr DECIMAL(8, 6), -- click-through rate
    avg_cpc_micros BIGINT,
    avg_cpa_micros BIGINT,
    roas DECIMAL(10, 4), -- return on ad spend

    -- PMax network breakdown (v23+ feature)
    network_type VARCHAR(50), -- SEARCH, YOUTUBE, DISPLAY, DISCOVERY

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Partition by date for performance
    UNIQUE(ad_account_id, campaign_id, ad_group_id, keyword_id, metric_date, network_type)
);

-- Create index for common queries
CREATE INDEX idx_metrics_daily_account_date ON metrics_daily(ad_account_id, metric_date DESC);
CREATE INDEX idx_metrics_daily_campaign_date ON metrics_daily(campaign_id, metric_date DESC);

-- ============================================================================
-- AI RECOMMENDATIONS
-- ============================================================================

CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,

    rule_type VARCHAR(100) NOT NULL, -- wasting_keywords, low_quality_score, budget_pacing_fast, etc.
    severity VARCHAR(20) NOT NULL, -- critical, warning, opportunity
    status VARCHAR(50) DEFAULT 'pending', -- pending, pending_refresh, applied, dismissed, undone

    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- AI confidence
    confidence_score DECIMAL(5, 2), -- 0-100

    -- Impact estimates
    estimated_savings_micros BIGINT,
    estimated_conversions_gain DECIMAL(10, 2),

    -- Data freshness (for Phase 14 fix)
    data_freshness_hours DECIMAL(6, 2),
    data_as_of TIMESTAMPTZ,

    -- For undo functionality
    before_state JSONB,
    after_state JSONB,
    applied_at TIMESTAMPTZ,
    undone_at TIMESTAMPTZ,

    -- Expiry
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_account_status ON recommendations(ad_account_id, status);

-- ============================================================================
-- AUTOMATION RULES & EXECUTIONS
-- ============================================================================

CREATE TABLE automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,

    -- Rule configuration
    conditions JSONB NOT NULL, -- triggers
    actions JSONB NOT NULL, -- what to do

    -- Scheduling
    schedule VARCHAR(50) DEFAULT 'hourly', -- hourly, daily, weekly
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE automation_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

    -- Idempotency key (Phase 14 fix - prevents double-fire)
    idempotency_key VARCHAR(255),

    status VARCHAR(50) NOT NULL, -- pending, success, failed, skipped

    -- State for undo
    before_state JSONB,
    after_state JSONB,

    -- Results
    action_taken TEXT,
    error_message TEXT,

    executed_at TIMESTAMPTZ DEFAULT NOW(),
    undone_at TIMESTAMPTZ,

    -- Unique constraint prevents double-fire in same execution window
    UNIQUE(rule_id, campaign_id, idempotency_key)
);

CREATE INDEX idx_automation_executions_rule ON automation_executions(rule_id, executed_at DESC);

-- ============================================================================
-- SYNC LOGS
-- ============================================================================

CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,

    sync_type VARCHAR(50) NOT NULL, -- full, incremental, metrics_only
    status VARCHAR(50) NOT NULL, -- started, success, partial, failed

    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Stats
    campaigns_synced INT DEFAULT 0,
    ad_groups_synced INT DEFAULT 0,
    keywords_synced INT DEFAULT 0,
    metrics_synced INT DEFAULT 0,

    error_message TEXT,
    details JSONB
);

CREATE INDEX idx_sync_logs_account ON sync_logs(ad_account_id, started_at DESC);

-- ============================================================================
-- RECONCILIATION LOGS (Phase 14)
-- ============================================================================

CREATE TABLE reconciliation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,

    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    campaigns_checked INT NOT NULL DEFAULT 0,
    mismatches_found INT NOT NULL DEFAULT 0,
    mismatches_resolved INT NOT NULL DEFAULT 0,

    details JSONB
);

-- ============================================================================
-- FX RATES (for multi-currency support)
-- ============================================================================

CREATE TABLE fx_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(12, 6) NOT NULL,
    rate_date DATE NOT NULL,
    source VARCHAR(50) DEFAULT 'openexchangerates',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(from_currency, to_currency, rate_date)
);

CREATE INDEX idx_fx_rates_lookup ON fx_rates(from_currency, to_currency, rate_date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies will be added based on auth implementation
-- For now, service role bypasses RLS

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_accounts_updated_at BEFORE UPDATE ON ad_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_groups_updated_at BEFORE UPDATE ON ad_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON keywords
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
