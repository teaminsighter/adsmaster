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
-- Migration: Add audiences table
-- Created: 2026-03-09

-- Create audience types enum
DO $$ BEGIN
    CREATE TYPE audience_type AS ENUM ('REMARKETING', 'CUSTOMER_LIST', 'LOOKALIKE', 'ENGAGEMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audience_status AS ENUM ('ACTIVE', 'PAUSED', 'PENDING', 'ERROR', 'DELETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audience_platform AS ENUM ('google', 'meta');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create audiences table
CREATE TABLE IF NOT EXISTS audiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    ad_account_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    platform VARCHAR(20) NOT NULL,
    type VARCHAR(30) NOT NULL,
    source VARCHAR(100) NOT NULL,
    source_config JSONB DEFAULT '{}'::jsonb,
    lookback_days INTEGER DEFAULT 30,
    membership_days INTEGER DEFAULT 30,
    platform_audience_id VARCHAR(255),
    platform_sync_status VARCHAR(50) DEFAULT 'pending',
    platform_sync_error TEXT,
    last_platform_sync_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    status_reason TEXT,
    estimated_size INTEGER DEFAULT 0,
    actual_size INTEGER,
    size_updated_at TIMESTAMPTZ,
    campaigns_using INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_spend_micros BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audiences_org ON audiences(organization_id);
CREATE INDEX IF NOT EXISTS idx_audiences_platform ON audiences(platform);
CREATE INDEX IF NOT EXISTS idx_audiences_type ON audiences(type);
CREATE INDEX IF NOT EXISTS idx_audiences_status ON audiences(status);

-- Enable RLS
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (API access)
DROP POLICY IF EXISTS audiences_service_role ON audiences;
CREATE POLICY audiences_service_role ON audiences
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_audiences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_audiences_updated_at ON audiences;
CREATE TRIGGER update_audiences_updated_at
    BEFORE UPDATE ON audiences
    FOR EACH ROW
    EXECUTE FUNCTION update_audiences_updated_at();
-- Migration: Add settings tables
-- Created: 2026-03-09

-- ============================================================================
-- USER PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
    currency VARCHAR(3) DEFAULT 'USD',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    theme VARCHAR(20) DEFAULT 'system',
    compact_mode BOOLEAN DEFAULT FALSE,
    show_cents BOOLEAN DEFAULT TRUE,
    default_date_range VARCHAR(10) DEFAULT '30d',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATION SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    organization_id UUID,
    notification_type VARCHAR(50) NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT FALSE,
    slack_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- ============================================================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id UUID,
    invite_email VARCHAR(255),
    invite_token VARCHAR(255),
    invite_expires_at TIMESTAMPTZ,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    permissions JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    last_active_at TIMESTAMPTZ,
    invited_by UUID,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id),
    UNIQUE(organization_id, invite_email)
);

-- ============================================================================
-- API KEYS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    created_by UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions TEXT[] DEFAULT ARRAY['read'],
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 10000,
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SLACK INTEGRATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS slack_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    workspace_id VARCHAR(50) NOT NULL,
    workspace_name VARCHAR(255),
    channel_id VARCHAR(50),
    channel_name VARCHAR(255),
    access_token_encrypted TEXT,
    bot_user_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, workspace_id)
);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    plan_name VARCHAR(50) NOT NULL DEFAULT 'starter',
    plan_price_cents INTEGER DEFAULT 0,
    billing_interval VARCHAR(20) DEFAULT 'month',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    max_ad_accounts INTEGER DEFAULT 2,
    max_team_members INTEGER DEFAULT 1,
    max_api_calls_per_month INTEGER DEFAULT 10000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT METHODS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    stripe_payment_method_id VARCHAR(100) NOT NULL,
    card_brand VARCHAR(20),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_invoice_id VARCHAR(100),
    invoice_number VARCHAR(50) NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    invoice_pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_prefs_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_settings_user ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_settings_org ON notification_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON organization_members(invite_email) WHERE invite_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_members_token ON organization_members(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(organization_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_slack_org ON slack_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_org ON payment_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(organization_id, invoice_date DESC);

-- ============================================================================
-- TRIGGERS (using existing update_updated_at_column function)
-- ============================================================================

-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

DROP TRIGGER IF EXISTS update_slack_integrations_updated_at ON slack_integrations;
CREATE TRIGGER update_slack_integrations_updated_at
    BEFORE UPDATE ON slack_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Service role policies (for API access)
DROP POLICY IF EXISTS user_prefs_service ON user_preferences;
CREATE POLICY user_prefs_service ON user_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS notif_settings_service ON notification_settings;
CREATE POLICY notif_settings_service ON notification_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS org_members_service ON organization_members;
CREATE POLICY org_members_service ON organization_members FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS api_keys_service ON api_keys;
CREATE POLICY api_keys_service ON api_keys FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS slack_service ON slack_integrations;
CREATE POLICY slack_service ON slack_integrations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS subscriptions_service ON subscriptions;
CREATE POLICY subscriptions_service ON subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS payment_methods_service ON payment_methods;
CREATE POLICY payment_methods_service ON payment_methods FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS invoices_service ON invoices;
CREATE POLICY invoices_service ON invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Migration: Add missing columns to recommendations table for full API support
-- ============================================================================

-- Add missing columns to recommendations table
ALTER TABLE recommendations
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50), -- 'keyword', 'campaign', 'ad_group'
    ADD COLUMN IF NOT EXISTS entity_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS impact_summary TEXT,
    ADD COLUMN IF NOT EXISTS applied_option_id INT,
    ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dismiss_reason TEXT;

-- Create index for organization lookup
CREATE INDEX IF NOT EXISTS idx_recommendations_org ON recommendations(organization_id, status);

-- Add RLS policy for service role bypass (drop if exists, then create)
DROP POLICY IF EXISTS "Service role can manage recommendations" ON recommendations;
CREATE POLICY "Service role can manage recommendations"
    ON recommendations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
-- Migration: Add user authentication fields
-- ============================================================================

-- Add password and auth fields to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_verify_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

-- Create user sessions table for JWT refresh tokens
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = TRUE;

-- RLS for user sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_service ON user_sessions;
CREATE POLICY sessions_service ON user_sessions
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- Admin Panel Database Schema
-- Migration: 00006_admin_panel.sql

-- ============================================================================
-- 1. Super Admin Users (separate from regular users)
-- ============================================================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Admin Sessions (for JWT refresh tokens)
-- ============================================================================
CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. Audit Logs (track all admin actions)
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Tracks all admin panel actions for compliance';
COMMENT ON COLUMN audit_logs.action IS 'Action type: user.suspend, config.update, org.delete, etc.';
COMMENT ON COLUMN audit_logs.resource_type IS 'Resource type: user, organization, config, api_key';

-- ============================================================================
-- 4. API Usage Tracking
-- ============================================================================
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    user_id UUID,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT,
    response_time_ms INT,
    request_size_bytes INT,
    response_size_bytes INT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE api_usage_logs IS 'Tracks API usage for analytics and rate limiting';

-- ============================================================================
-- 5. AI Usage Tracking
-- ============================================================================
CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    user_id UUID,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('gemini', 'openai', 'anthropic', 'other')),
    model VARCHAR(100),
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    cost_usd DECIMAL(10, 6) DEFAULT 0,
    endpoint VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ai_usage_logs IS 'Tracks AI/LLM usage for cost monitoring';
COMMENT ON COLUMN ai_usage_logs.endpoint IS 'Which feature used AI: chat, recommendations, forecast, etc.';

-- ============================================================================
-- 6. System Configuration
-- ============================================================================
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_secret BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE system_config IS 'Platform-wide configuration settings';
COMMENT ON COLUMN system_config.is_secret IS 'If true, value should be masked in UI';

-- ============================================================================
-- 7. Page View Analytics
-- ============================================================================
CREATE TABLE page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    user_id UUID,
    page_path VARCHAR(255) NOT NULL,
    referrer VARCHAR(500),
    user_agent TEXT,
    ip_address VARCHAR(45),
    session_id VARCHAR(100),
    duration_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE page_views IS 'Tracks page views for analytics';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Admin users
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;

-- Admin sessions
CREATE INDEX idx_admin_sessions_user ON admin_sessions(admin_user_id);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Audit logs
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- API usage logs
CREATE INDEX idx_api_usage_created ON api_usage_logs(created_at DESC);
CREATE INDEX idx_api_usage_org ON api_usage_logs(organization_id, created_at DESC);
CREATE INDEX idx_api_usage_endpoint ON api_usage_logs(endpoint, created_at DESC);
CREATE INDEX idx_api_usage_status ON api_usage_logs(status_code) WHERE status_code >= 400;

-- AI usage logs
CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_org ON ai_usage_logs(organization_id, created_at DESC);
CREATE INDEX idx_ai_usage_provider ON ai_usage_logs(provider, created_at DESC);

-- Page views
CREATE INDEX idx_page_views_created ON page_views(created_at DESC);
CREATE INDEX idx_page_views_page ON page_views(page_path, created_at DESC);
CREATE INDEX idx_page_views_org ON page_views(organization_id, created_at DESC);
CREATE INDEX idx_page_views_session ON page_views(session_id);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Default System Configuration
-- ============================================================================

INSERT INTO system_config (key, value, description) VALUES
    ('maintenance_mode', 'false', 'Enable maintenance mode to block user access'),
    ('registration_enabled', 'true', 'Allow new user registrations'),
    ('default_plan', '"free"', 'Default subscription plan for new organizations'),
    ('ai_provider', '"gemini"', 'Default AI provider (gemini, openai, anthropic)'),
    ('ai_rate_limit', '{"requests_per_minute": 60, "tokens_per_day": 100000}', 'AI usage rate limits'),
    ('api_rate_limit', '{"requests_per_minute": 100, "requests_per_day": 10000}', 'API rate limits per organization'),
    ('features', '{"ai_chat": true, "recommendations": true, "forecasting": true, "automations": true}', 'Feature flags'),
    ('pricing', '{"starter": 49, "growth": 149, "agency": 299, "enterprise": null}', 'Subscription pricing in USD'),
    ('trial_days', '14', 'Number of trial days for new accounts'),
    ('support_email', '"support@adsmaster.io"', 'Support email address')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Default Super Admin User
-- Password should be changed immediately after first login
-- Default password: 'admin123' (bcrypt hash below)
-- ============================================================================

INSERT INTO admin_users (email, password_hash, name, role) VALUES
    ('admin@adsmaster.io', '$2b$12$HA257l5ug44kqCaqzkpDHuzShNX2gsyjGMEyZte30mHlLn2G8zna.', 'Super Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Default credentials: admin@adsmaster.io / admin123
-- Change the password after first login!
-- ============================================================================
-- 00007_billing.sql
-- Billing tables for admin panel
-- ============================================================================

-- ============================================================================
-- ENUMS (create if not exists)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'trialing',
        'active',
        'past_due',
        'cancelled',
        'unpaid',
        'paused'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE billing_interval AS ENUM ('monthly', 'yearly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SUBSCRIPTION PLANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),
    stripe_product_id VARCHAR(255),
    max_ad_accounts INTEGER DEFAULT 1,
    max_campaigns INTEGER DEFAULT 5,
    max_users INTEGER DEFAULT 1,
    max_ai_messages_per_month INTEGER DEFAULT 100,
    features JSONB DEFAULT '{}'::jsonb,
    is_popular BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    plan_name VARCHAR(50), -- denormalized for quick access
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    billing_interval VARCHAR(20) DEFAULT 'monthly',
    status VARCHAR(50) NOT NULL DEFAULT 'trialing',
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    paused_at TIMESTAMPTZ,
    resume_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVOICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    stripe_invoice_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    invoice_number VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, open, paid, void, uncollectible, refunded
    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    tax_cents INTEGER DEFAULT 0,
    discount_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    amount_paid_cents INTEGER DEFAULT 0,
    amount_due_cents INTEGER NOT NULL DEFAULT 0,
    amount_refunded_cents INTEGER DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    invoice_pdf_url TEXT,
    hosted_invoice_url TEXT,
    line_items JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT METHODS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) UNIQUE,
    type VARCHAR(20) NOT NULL DEFAULT 'card',
    card_brand VARCHAR(20),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    billing_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COUPONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    stripe_coupon_id VARCHAR(255),
    name VARCHAR(100),
    discount_type VARCHAR(20) NOT NULL, -- percent, fixed
    discount_value DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    duration VARCHAR(20) NOT NULL DEFAULT 'once', -- once, repeating, forever
    duration_in_months INTEGER,
    max_redemptions INTEGER,
    redemption_count INTEGER DEFAULT 0,
    applies_to_plans TEXT[], -- plan names, NULL = all
    minimum_amount_cents INTEGER,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COUPON REDEMPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    discount_amount_cents INTEGER,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coupon_id, organization_id)
);

-- ============================================================================
-- FAILED PAYMENTS (for tracking and retry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS failed_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    failure_code VARCHAR(100),
    failure_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution_type VARCHAR(50), -- paid, refunded, written_off
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REVENUE EVENTS (for MRR tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS revenue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- new, upgrade, downgrade, churn, reactivation
    mrr_delta_cents INTEGER NOT NULL DEFAULT 0, -- positive or negative
    mrr_after_cents INTEGER NOT NULL DEFAULT 0,
    plan_from VARCHAR(50),
    plan_to VARCHAR(50),
    event_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_name);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period ON subscriptions(current_period_end);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);

-- Payment methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_org ON payment_methods(organization_id);

-- Coupons
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active) WHERE is_active = TRUE;

-- Failed payments
CREATE INDEX IF NOT EXISTS idx_failed_payments_org ON failed_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_failed_payments_unresolved ON failed_payments(resolved_at) WHERE resolved_at IS NULL;

-- Revenue events
CREATE INDEX IF NOT EXISTS idx_revenue_events_date ON revenue_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_events_type ON revenue_events(event_type, event_date DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Subscription Plans
-- ============================================================================

INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, max_ad_accounts, max_users, max_ai_messages_per_month, features, is_popular, sort_order) VALUES
('free', 'Free', 'Basic features for getting started', 0, 0, 1, 1, 50,
 '{"ai_advisor": true, "recommendations": true, "platforms": ["google_ads"]}'::jsonb, FALSE, 0),
('starter', 'Starter', 'Perfect for small businesses', 49, 470, 2, 2, 200,
 '{"ai_advisor": true, "recommendations": true, "automations": true, "platforms": ["google_ads", "meta"]}'::jsonb, FALSE, 1),
('growth', 'Growth', 'For growing businesses ready to scale', 149, 1430, 5, 5, 1000,
 '{"ai_advisor": true, "recommendations": true, "automations": true, "forecasting": true, "platforms": ["google_ads", "meta"]}'::jsonb, TRUE, 2),
('agency', 'Agency', 'For agencies managing multiple clients', 299, 2870, 25, 15, 5000,
 '{"ai_advisor": true, "recommendations": true, "automations": true, "forecasting": true, "white_label": true, "api_access": true, "platforms": ["google_ads", "meta"]}'::jsonb, FALSE, 3),
('enterprise', 'Enterprise', 'Custom solutions for large organizations', 999, 9590, -1, -1, -1,
 '{"ai_advisor": true, "recommendations": true, "automations": true, "forecasting": true, "white_label": true, "api_access": true, "priority_support": true, "platforms": ["google_ads", "meta"]}'::jsonb, FALSE, 4)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- DEMO DATA: Sample subscriptions, invoices, etc.
-- ============================================================================

-- Insert demo data only if organizations table has data
DO $$
DECLARE
    org_id UUID;
    sub_id UUID;
    plan_id UUID;
BEGIN
    -- Get first organization if exists
    SELECT id INTO org_id FROM organizations LIMIT 1;

    IF org_id IS NOT NULL THEN
        -- Get growth plan
        SELECT id INTO plan_id FROM subscription_plans WHERE name = 'growth';

        -- Create subscription if not exists
        INSERT INTO subscriptions (organization_id, plan_id, plan_name, status, billing_interval, current_period_start, current_period_end)
        VALUES (org_id, plan_id, 'growth', 'active', 'monthly', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days')
        ON CONFLICT DO NOTHING
        RETURNING id INTO sub_id;

        -- Create sample invoices
        IF sub_id IS NOT NULL THEN
            INSERT INTO invoices (organization_id, subscription_id, invoice_number, status, subtotal_cents, total_cents, amount_paid_cents, amount_due_cents, invoice_date, paid_at) VALUES
            (org_id, sub_id, 'INV-2024-001', 'paid', 14900, 14900, 14900, 0, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
            (org_id, sub_id, 'INV-2024-002', 'paid', 14900, 14900, 14900, 0, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
            (org_id, sub_id, 'INV-2024-003', 'open', 14900, 14900, 0, 14900, NOW() + INTERVAL '15 days', NULL)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- Sample coupons
INSERT INTO coupons (code, name, discount_type, discount_value, duration, max_redemptions, valid_until, is_active) VALUES
('WELCOME20', 'Welcome Discount', 'percent', 20, 'once', 1000, NOW() + INTERVAL '1 year', TRUE),
('ANNUAL50', 'Annual Plan Discount', 'percent', 50, 'once', 500, NOW() + INTERVAL '6 months', TRUE),
('AGENCY100', 'Agency Plan Credit', 'fixed', 100, 'once', 100, NOW() + INTERVAL '3 months', TRUE)
ON CONFLICT (code) DO NOTHING;
-- ============================================================================
-- 00008_admin_complete.sql
-- Complete Admin Panel - All New Tables
-- ============================================================================

-- ============================================================================
-- PART 1: MARKETING ANALYTICS
-- ============================================================================

-- 1.1 Landing Page Visits
CREATE TABLE IF NOT EXISTS landing_page_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL,
    visitor_fingerprint VARCHAR(64),

    -- Traffic source
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    referrer VARCHAR(500),
    referrer_domain VARCHAR(255),

    -- Landing page info
    landing_page VARCHAR(255),
    exit_page VARCHAR(255),
    page_views_count INT DEFAULT 1,
    time_on_site_seconds INT,

    -- Visitor info
    ip_address VARCHAR(45),
    country_code VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    device_type VARCHAR(20),
    browser VARCHAR(50),
    browser_version VARCHAR(20),
    os VARCHAR(50),
    os_version VARCHAR(20),
    screen_resolution VARCHAR(20),

    -- Conversion tracking
    converted_to_signup BOOLEAN DEFAULT false,
    converted_at TIMESTAMPTZ,
    signup_user_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Signup Sources
CREATE TABLE IF NOT EXISTS signup_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,

    -- Auth method
    auth_method VARCHAR(50) NOT NULL,
    oauth_provider VARCHAR(50),

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

-- 1.3 Email Subscribers
CREATE TABLE IF NOT EXISTS email_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    source VARCHAR(100),
    utm_campaign VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    user_id UUID,

    UNIQUE(email)
);

-- 1.4 Funnel Events
CREATE TABLE IF NOT EXISTS funnel_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100),
    user_id UUID,

    event_type VARCHAR(100) NOT NULL,
    event_properties JSONB DEFAULT '{}',
    page_path VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: API VERSION MONITORING
-- ============================================================================

-- 2.1 API Version Tracking
CREATE TABLE IF NOT EXISTS api_version_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL UNIQUE,

    current_version VARCHAR(20),
    latest_version VARCHAR(20),
    deprecated_versions TEXT[],
    sunset_dates JSONB DEFAULT '{}',

    adapter_versions_available TEXT[],
    production_adapter_version VARCHAR(20),

    last_health_check TIMESTAMPTZ,
    api_status VARCHAR(50) DEFAULT 'unknown',
    error_rate_24h DECIMAL(5,2) DEFAULT 0,
    avg_latency_ms INT DEFAULT 0,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 API Changelog Entries
CREATE TABLE IF NOT EXISTS api_changelog_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,

    change_type VARCHAR(50),
    title VARCHAR(255),
    description TEXT,
    affected_endpoints TEXT[],
    migration_required BOOLEAN DEFAULT false,

    announced_at TIMESTAMPTZ,
    effective_at TIMESTAMPTZ,
    sunset_at TIMESTAMPTZ,

    migration_status VARCHAR(50) DEFAULT 'not_started',
    migration_notes TEXT,
    completed_at TIMESTAMPTZ,

    source_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 API Expense Logs
CREATE TABLE IF NOT EXISTS api_expense_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    platform VARCHAR(50) NOT NULL,
    service_type VARCHAR(50),
    endpoint VARCHAR(255),

    request_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,

    quota_units_used INT DEFAULT 0,
    estimated_cost_usd DECIMAL(10,4) DEFAULT 0,

    total_latency_ms BIGINT DEFAULT 0,

    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 API Alerts
CREATE TABLE IF NOT EXISTS api_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    alert_type VARCHAR(100),
    severity VARCHAR(20) DEFAULT 'info',
    title VARCHAR(255),
    message TEXT,
    metadata JSONB DEFAULT '{}',
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 3: AI & ML CONTROL
-- ============================================================================

-- 3.1 AI Model Configurations
CREATE TABLE IF NOT EXISTS ai_model_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    feature VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,

    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INT DEFAULT 2048,
    top_p DECIMAL(3,2) DEFAULT 1.0,
    frequency_penalty DECIMAL(3,2) DEFAULT 0,
    presence_penalty DECIMAL(3,2) DEFAULT 0,

    fallback_provider VARCHAR(50),
    fallback_model VARCHAR(100),

    is_active BOOLEAN DEFAULT true,
    priority INT DEFAULT 0,

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 AI Prompts
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL UNIQUE,
    feature VARCHAR(100) NOT NULL,
    version INT DEFAULT 1,

    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT,

    is_active BOOLEAN DEFAULT true,
    is_production BOOLEAN DEFAULT false,

    ab_test_id UUID,
    ab_test_variant VARCHAR(50),

    usage_count INT DEFAULT 0,
    avg_rating DECIMAL(3,2),

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 AI Prompts History
CREATE TABLE IF NOT EXISTS ai_prompts_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES ai_prompts(id) ON DELETE CASCADE,
    version INT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT,
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 Recommendation Rules Configuration
CREATE TABLE IF NOT EXISTS recommendation_rules_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    rule_type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    is_enabled BOOLEAN DEFAULT true,
    priority INT DEFAULT 50,

    thresholds JSONB NOT NULL DEFAULT '{}',

    min_confidence_score DECIMAL(3,2) DEFAULT 0.7,
    require_approval BOOLEAN DEFAULT true,

    applies_to_plans TEXT[],
    applies_to_platforms TEXT[],

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5 AI Cost Budgets
CREATE TABLE IF NOT EXISTS ai_cost_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    scope_type VARCHAR(50) NOT NULL,
    scope_id VARCHAR(255),

    daily_budget_usd DECIMAL(10,2),
    monthly_budget_usd DECIMAL(10,2),

    current_daily_spend DECIMAL(10,4) DEFAULT 0,
    current_monthly_spend DECIMAL(10,4) DEFAULT 0,

    alert_at_percentage INT DEFAULT 80,
    action_at_limit VARCHAR(50) DEFAULT 'alert',

    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 4: FEATURE FLAGS & SYSTEM
-- ============================================================================

-- 4.1 Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    is_enabled BOOLEAN DEFAULT false,
    rollout_percentage INT DEFAULT 0,

    target_plans TEXT[],
    target_org_ids UUID[],

    metadata JSONB DEFAULT '{}',

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 Maintenance Windows
CREATE TABLE IF NOT EXISTS maintenance_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    message TEXT,
    expected_duration_minutes INT,

    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,

    allowed_ips TEXT[],
    reason TEXT,

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3 Admin Impersonation Sessions
CREATE TABLE IF NOT EXISTS admin_impersonation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL,
    impersonated_user_id UUID NOT NULL,
    reason TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    actions_performed JSONB DEFAULT '[]'
);

-- ============================================================================
-- PART 5: ANNOUNCEMENTS & NOTIFICATIONS
-- ============================================================================

-- 5.1 Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,

    type VARCHAR(50) NOT NULL DEFAULT 'banner',
    severity VARCHAR(20) DEFAULT 'info',
    cta_text VARCHAR(100),
    cta_url VARCHAR(500),

    target_plans TEXT[],
    target_user_ids UUID[],

    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,

    dismissible BOOLEAN DEFAULT true,

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.2 Announcement Dismissals
CREATE TABLE IF NOT EXISTS announcement_dismissals (
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    dismissed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (announcement_id, user_id)
);

-- ============================================================================
-- PART 6: SECURITY
-- ============================================================================

-- 6.1 Security Events
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',

    user_id UUID,
    admin_user_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,

    description TEXT,
    metadata JSONB DEFAULT '{}',

    country VARCHAR(100),
    city VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 7: BACKGROUND JOBS
-- ============================================================================

-- 7.1 Background Jobs
CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_type VARCHAR(100) NOT NULL,
    job_name VARCHAR(255),

    status VARCHAR(50) NOT NULL DEFAULT 'pending',

    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    progress_percent INT DEFAULT 0,
    progress_message TEXT,

    result JSONB,
    error_message TEXT,
    retry_count INT DEFAULT 0,

    triggered_by VARCHAR(50),
    triggered_by_admin_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 8: ADMIN SETTINGS
-- ============================================================================

-- 8.1 Admin Settings (per admin user)
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL UNIQUE,

    theme VARCHAR(20) DEFAULT 'dark',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    dashboard_default_view VARCHAR(50) DEFAULT 'overview',

    email_alerts_critical BOOLEAN DEFAULT true,
    email_alerts_failed_payments BOOLEAN DEFAULT true,
    email_alerts_new_signups BOOLEAN DEFAULT false,

    slack_webhook_url VARCHAR(500),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Landing page visits
CREATE INDEX IF NOT EXISTS idx_landing_visits_created ON landing_page_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_visits_utm ON landing_page_visits(utm_source, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_landing_visits_session ON landing_page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_landing_visits_converted ON landing_page_visits(converted_to_signup) WHERE converted_to_signup = true;

-- Signup sources
CREATE INDEX IF NOT EXISTS idx_signup_sources_user ON signup_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_sources_method ON signup_sources(auth_method);
CREATE INDEX IF NOT EXISTS idx_signup_sources_created ON signup_sources(created_at DESC);

-- Email subscribers
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON email_subscribers(status);

-- Funnel events
CREATE INDEX IF NOT EXISTS idx_funnel_events_type ON funnel_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_user ON funnel_events(user_id);

-- API version tracking
CREATE INDEX IF NOT EXISTS idx_api_version_platform ON api_version_tracking(platform);

-- API changelog
CREATE INDEX IF NOT EXISTS idx_api_changelog_platform ON api_changelog_entries(platform, announced_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_changelog_status ON api_changelog_entries(migration_status);

-- API expenses
CREATE INDEX IF NOT EXISTS idx_api_expense_period ON api_expense_logs(period_start, platform);
CREATE INDEX IF NOT EXISTS idx_api_expense_platform ON api_expense_logs(platform);

-- API alerts
CREATE INDEX IF NOT EXISTS idx_api_alerts_unack ON api_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_alerts_created ON api_alerts(created_at DESC);

-- AI model configs
CREATE INDEX IF NOT EXISTS idx_ai_model_configs_feature ON ai_model_configs(feature, is_active);

-- AI prompts
CREATE INDEX IF NOT EXISTS idx_ai_prompts_name ON ai_prompts(name);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_feature ON ai_prompts(feature);

-- Recommendation rules
CREATE INDEX IF NOT EXISTS idx_rec_rules_type ON recommendation_rules_config(rule_type, is_enabled);

-- Feature flags
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);

-- Security events
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- Background jobs
CREATE INDEX IF NOT EXISTS idx_bg_jobs_status ON background_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_type ON background_jobs(job_type, created_at DESC);

-- Announcements (index without NOW() since it's not immutable)
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_announcements_current ON announcements(ends_at) WHERE ends_at IS NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_landing_visits_updated_at
    BEFORE UPDATE ON landing_page_visits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_model_configs_updated_at
    BEFORE UPDATE ON ai_model_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_prompts_updated_at
    BEFORE UPDATE ON ai_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rec_rules_updated_at
    BEFORE UPDATE ON recommendation_rules_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_budgets_updated_at
    BEFORE UPDATE ON ai_cost_budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- API Version Tracking
INSERT INTO api_version_tracking (platform, current_version, latest_version, adapter_versions_available, production_adapter_version, api_status) VALUES
    ('google_ads', 'v23.1', 'v24', ARRAY['v23', 'v23_1'], 'v23_1', 'healthy'),
    ('meta', 'v21', 'v21', ARRAY['v20', 'v21'], 'v21', 'healthy')
ON CONFLICT (platform) DO NOTHING;

-- Feature Flags
INSERT INTO feature_flags (name, description, is_enabled, rollout_percentage, target_plans) VALUES
    ('ai_chat', 'AI-powered chat assistant', true, 100, NULL),
    ('recommendations', 'Automated recommendations engine', true, 100, NULL),
    ('forecasting', 'ML-based spend forecasting', true, 100, ARRAY['growth', 'agency', 'enterprise']),
    ('automations', 'Rule-based automations', true, 50, NULL),
    ('white_label', 'White-label for agencies', false, 0, ARRAY['agency', 'enterprise']),
    ('api_access', 'External API access', false, 0, ARRAY['agency', 'enterprise'])
ON CONFLICT (name) DO NOTHING;

-- AI Model Configurations
INSERT INTO ai_model_configs (feature, provider, model_name, temperature, max_tokens, is_active) VALUES
    ('chat', 'gemini', 'gemini-1.5-pro', 0.7, 2048, true),
    ('recommendations', 'gemini', 'gemini-1.5-flash', 0.3, 1024, true),
    ('forecasting', 'openai', 'gpt-4o', 0.2, 512, true),
    ('audience_builder', 'gemini', 'gemini-1.5-pro', 0.5, 1024, true)
ON CONFLICT DO NOTHING;

-- AI Prompts (sample)
INSERT INTO ai_prompts (name, feature, system_prompt, is_active, is_production) VALUES
    ('chat_system', 'chat', 'You are an expert digital advertising consultant for AdsMaster. Help users optimize their Google Ads and Meta Ads campaigns. Be concise, data-driven, and actionable.', true, true),
    ('recommendation_budget', 'recommendations', 'Analyze the campaign data and identify budget optimization opportunities. Focus on ROI improvement and waste reduction.', true, true),
    ('recommendation_keywords', 'recommendations', 'Analyze keyword performance and identify underperforming keywords that should be paused or negative keywords to add.', true, true)
ON CONFLICT (name) DO NOTHING;

-- Recommendation Rules Configuration
INSERT INTO recommendation_rules_config (rule_type, name, description, thresholds, is_enabled, priority) VALUES
    ('keyword_pause', 'Pause Low Quality Score Keywords', 'Recommend pausing keywords with QS < 4 and significant spend', '{"min_quality_score": 4, "min_spend": 50, "min_days": 14}', true, 80),
    ('budget_optimization', 'Budget Reallocation', 'Recommend shifting budget from low ROAS to high ROAS campaigns', '{"min_roas_diff": 1.5, "min_spend": 100}', true, 70),
    ('bid_adjustment', 'Device Bid Adjustment', 'Recommend bid adjustments based on device performance', '{"min_conv_diff_percent": 20, "min_clicks": 100}', true, 60),
    ('negative_keyword', 'Add Negative Keywords', 'Recommend negative keywords from search terms with no conversions', '{"min_clicks": 10, "max_conversions": 0, "min_spend": 25}', true, 75)
ON CONFLICT DO NOTHING;

-- AI Cost Budgets
INSERT INTO ai_cost_budgets (scope_type, scope_id, daily_budget_usd, monthly_budget_usd, alert_at_percentage) VALUES
    ('platform', 'total', 50.00, 1500.00, 80),
    ('feature', 'chat', 20.00, 600.00, 80),
    ('feature', 'recommendations', 15.00, 450.00, 80),
    ('feature', 'forecasting', 10.00, 300.00, 80)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE landing_page_visits IS 'Tracks all landing page visits for marketing analytics';
COMMENT ON TABLE signup_sources IS 'Tracks how users signed up (auth method, UTM source)';
COMMENT ON TABLE email_subscribers IS 'Newsletter and waitlist subscribers';
COMMENT ON TABLE funnel_events IS 'Conversion funnel event tracking';
COMMENT ON TABLE api_version_tracking IS 'Tracks Google/Meta API versions and adapter status';
COMMENT ON TABLE api_changelog_entries IS 'API changelog entries with migration status';
COMMENT ON TABLE api_expense_logs IS 'Detailed API cost tracking';
COMMENT ON TABLE api_alerts IS 'API-related alerts (version sunset, errors, etc.)';
COMMENT ON TABLE ai_model_configs IS 'AI model configuration per feature';
COMMENT ON TABLE ai_prompts IS 'System and user prompts for AI features';
COMMENT ON TABLE ai_prompts_history IS 'Version history for AI prompts';
COMMENT ON TABLE recommendation_rules_config IS 'Configuration for recommendation rules';
COMMENT ON TABLE ai_cost_budgets IS 'AI cost budgets and alerts';
COMMENT ON TABLE feature_flags IS 'Feature flag management';
COMMENT ON TABLE maintenance_windows IS 'Scheduled and active maintenance windows';
COMMENT ON TABLE admin_impersonation_sessions IS 'Audit trail for admin user impersonation';
COMMENT ON TABLE announcements IS 'Platform announcements for users';
COMMENT ON TABLE security_events IS 'Security event logging';
COMMENT ON TABLE background_jobs IS 'Background job status tracking';
COMMENT ON TABLE admin_settings IS 'Per-admin settings and preferences';
-- Action Execution Audit Logging
-- Phase 1: Track all recommendation action executions for debugging and compliance

-- Table for logging all action executions
CREATE TABLE IF NOT EXISTS action_execution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was executed
    recommendation_id UUID REFERENCES recommendations(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    ad_account_id UUID REFERENCES ad_accounts(id),

    -- Action details
    action_type VARCHAR(50) NOT NULL,  -- pause_keyword, enable_keyword, reduce_bid, etc.
    entity_type VARCHAR(50),           -- keyword, campaign, ad_group, ad
    entity_id VARCHAR(255),            -- Internal ID
    platform_entity_id VARCHAR(255),   -- Google Ads or Meta ID

    -- Execution result
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_code VARCHAR(100),
    error_message TEXT,

    -- State tracking for undo
    before_state JSONB,                -- State before action
    after_state JSONB,                 -- State after action
    rollback_data JSONB,               -- Data needed to undo

    -- API call details
    api_called BOOLEAN DEFAULT FALSE,  -- TRUE if real API was called
    api_response JSONB,                -- Raw API response for debugging
    api_latency_ms INTEGER,            -- How long the API call took

    -- Rate limiting info
    rate_limit_used INTEGER,           -- Quota points used
    rate_limit_remaining INTEGER,      -- Quota points remaining

    -- Metadata
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_by VARCHAR(100) DEFAULT 'ai_recommendation',  -- Could be user_id or 'ai_recommendation'
    undone_at TIMESTAMPTZ,
    undone_by VARCHAR(100),

    -- For debugging
    request_id VARCHAR(100),           -- For correlating with logs
    user_agent TEXT
);

-- Indexes for common queries
CREATE INDEX idx_action_log_recommendation ON action_execution_log(recommendation_id);
CREATE INDEX idx_action_log_org ON action_execution_log(organization_id);
CREATE INDEX idx_action_log_account ON action_execution_log(ad_account_id);
CREATE INDEX idx_action_log_executed_at ON action_execution_log(executed_at DESC);
CREATE INDEX idx_action_log_action_type ON action_execution_log(action_type);
CREATE INDEX idx_action_log_success ON action_execution_log(success);

-- RLS Policies
ALTER TABLE action_execution_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their organization's execution logs
CREATE POLICY action_log_select ON action_execution_log
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Only the system can insert logs (via service role)
CREATE POLICY action_log_insert ON action_execution_log
    FOR INSERT WITH CHECK (TRUE);  -- Service role bypasses RLS

-- Summary view for dashboard
CREATE OR REPLACE VIEW action_execution_summary AS
SELECT
    organization_id,
    ad_account_id,
    action_type,
    DATE_TRUNC('day', executed_at) as execution_date,
    COUNT(*) as total_executions,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed,
    AVG(api_latency_ms) as avg_latency_ms,
    SUM(rate_limit_used) as total_quota_used
FROM action_execution_log
GROUP BY organization_id, ad_account_id, action_type, DATE_TRUNC('day', executed_at);

-- Table for tracking idempotency (prevent double-execution)
CREATE TABLE IF NOT EXISTS action_idempotency_keys (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    recommendation_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    result JSONB
);

-- Index for cleanup
CREATE INDEX idx_idempotency_expires ON action_idempotency_keys(expires_at);

-- Cleanup function for expired idempotency keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
    DELETE FROM action_idempotency_keys WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add columns to recommendations table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recommendations' AND column_name = 'last_execution_id') THEN
        ALTER TABLE recommendations ADD COLUMN last_execution_id UUID REFERENCES action_execution_log(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recommendations' AND column_name = 'execution_count') THEN
        ALTER TABLE recommendations ADD COLUMN execution_count INTEGER DEFAULT 0;
    END IF;
END $$;

COMMENT ON TABLE action_execution_log IS 'Audit log of all recommendation action executions for debugging and compliance';
COMMENT ON TABLE action_idempotency_keys IS 'Prevents duplicate execution of the same action within 24 hours';
-- ============================================================================
-- Migration: Email System
-- Description: Tables for email templates, logs, and automation
-- ============================================================================

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    description TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    category VARCHAR(50) DEFAULT 'transactional',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email template categories
COMMENT ON COLUMN email_templates.category IS 'transactional, marketing, notification, system';

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- Email Logs Table (sent emails history)
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    template_slug VARCHAR(100),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    subject VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    provider VARCHAR(50) DEFAULT 'resend',
    provider_message_id VARCHAR(255),
    variables_used JSONB,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email log status values
COMMENT ON COLUMN email_logs.status IS 'pending, sent, delivered, opened, clicked, bounced, failed';

-- Create indexes for email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON email_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_org ON email_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_provider_id ON email_logs(provider_message_id);

-- Scheduled Emails Table
CREATE TABLE IF NOT EXISTS scheduled_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    variables JSONB,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    sent_email_log_id UUID REFERENCES email_logs(id),
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN scheduled_emails.status IS 'scheduled, sent, cancelled, failed';

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled ON scheduled_emails(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);

-- Email Automation Rules (triggers)
CREATE TABLE IF NOT EXISTS email_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(100) NOT NULL,
    template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
    delay_minutes INTEGER DEFAULT 0,
    conditions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger events: user.signup, user.password_reset, payment.failed, payment.success,
-- subscription.created, subscription.cancelled, trial.ending, trial.expired
COMMENT ON COLUMN email_automation_rules.trigger_event IS 'Event that triggers this email';

CREATE INDEX IF NOT EXISTS idx_email_automation_trigger ON email_automation_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_email_automation_active ON email_automation_rules(is_active);

-- ============================================================================
-- Seed Default Email Templates
-- ============================================================================

INSERT INTO email_templates (name, slug, subject, html_content, text_content, description, variables, category)
VALUES
(
    'Welcome Email',
    'welcome',
    'Welcome to AdsMaster, {{user_name}}!',
    E'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 24px; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
        </div>
        <div class="content">
            <h1>Welcome to AdsMaster!</h1>
            <p>Hi {{user_name}},</p>
            <p>Thank you for signing up for AdsMaster. We''re excited to help you optimize your advertising campaigns with AI-powered recommendations.</p>
            <p>Here''s what you can do next:</p>
            <ul>
                <li>Connect your Google Ads or Meta Ads account</li>
                <li>Review AI-generated recommendations</li>
                <li>Apply optimizations with one click</li>
            </ul>
            <a href="{{app_url}}/connect" class="btn">Connect Your Ad Account</a>
        </div>
        <div class="footer">
            <p>&copy; {{year}} AdsMaster. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
    E'Welcome to AdsMaster!\n\nHi {{user_name}},\n\nThank you for signing up for AdsMaster. We''re excited to help you optimize your advertising campaigns with AI-powered recommendations.\n\nHere''s what you can do next:\n- Connect your Google Ads or Meta Ads account\n- Review AI-generated recommendations\n- Apply optimizations with one click\n\nGet started: {{app_url}}/connect\n\n© {{year}} AdsMaster',
    'Sent when a new user signs up',
    '["user_name", "app_url", "year"]',
    'transactional'
),
(
    'Password Reset',
    'password-reset',
    'Reset Your AdsMaster Password',
    E'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 24px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-top: 24px; color: #92400e; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
        </div>
        <div class="content">
            <h1>Reset Your Password</h1>
            <p>Hi {{user_name}},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="{{reset_url}}" class="btn">Reset Password</a>
            <div class="warning">
                <strong>Didn''t request this?</strong> If you didn''t request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </div>
            <p style="margin-top: 24px; color: #64748b; font-size: 14px;">This link will expire in 1 hour.</p>
        </div>
        <div class="footer">
            <p>&copy; {{year}} AdsMaster. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
    E'Reset Your Password\n\nHi {{user_name}},\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n{{reset_url}}\n\nThis link will expire in 1 hour.\n\nDidn''t request this? If you didn''t request a password reset, you can safely ignore this email.\n\n© {{year}} AdsMaster',
    'Sent when user requests password reset',
    '["user_name", "reset_url", "year"]',
    'transactional'
),
(
    'Payment Failed',
    'payment-failed',
    'Action Required: Your Payment Failed',
    E'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px; color: #991b1b; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 24px; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
        </div>
        <div class="content">
            <div class="alert">
                <strong>Payment Failed</strong>
            </div>
            <h1>We couldn''t process your payment</h1>
            <p>Hi {{user_name}},</p>
            <p>We tried to charge your payment method for your {{plan_name}} subscription (${{amount}}) but the payment failed.</p>
            <p><strong>Reason:</strong> {{failure_reason}}</p>
            <p>Please update your payment information to avoid any interruption to your service.</p>
            <a href="{{billing_url}}" class="btn">Update Payment Method</a>
            <p style="margin-top: 24px; color: #64748b; font-size: 14px;">We''ll retry the payment in 3 days. If you need assistance, contact support@adsmaster.io</p>
        </div>
        <div class="footer">
            <p>&copy; {{year}} AdsMaster. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
    E'Payment Failed\n\nHi {{user_name}},\n\nWe tried to charge your payment method for your {{plan_name}} subscription (${{amount}}) but the payment failed.\n\nReason: {{failure_reason}}\n\nPlease update your payment information: {{billing_url}}\n\nWe''ll retry the payment in 3 days.\n\n© {{year}} AdsMaster',
    'Sent when a payment fails',
    '["user_name", "plan_name", "amount", "failure_reason", "billing_url", "year"]',
    'transactional'
),
(
    'Invoice',
    'invoice',
    'Your AdsMaster Invoice #{{invoice_number}}',
    E'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .invoice-box { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0; }
        .invoice-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .invoice-row:last-child { border-bottom: none; font-weight: bold; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
        </div>
        <div class="content">
            <h1>Invoice #{{invoice_number}}</h1>
            <p>Hi {{user_name}},</p>
            <p>Thank you for your payment. Here''s your invoice:</p>
            <div class="invoice-box">
                <div class="invoice-row">
                    <span>{{plan_name}} Plan</span>
                    <span>${{amount}}</span>
                </div>
                <div class="invoice-row">
                    <span>Period</span>
                    <span>{{period}}</span>
                </div>
                <div class="invoice-row">
                    <span><strong>Total</strong></span>
                    <span><strong>${{amount}}</strong></span>
                </div>
            </div>
            <a href="{{invoice_url}}" class="btn">View Invoice</a>
        </div>
        <div class="footer">
            <p>&copy; {{year}} AdsMaster. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
    E'Invoice #{{invoice_number}}\n\nHi {{user_name}},\n\nThank you for your payment.\n\n{{plan_name}} Plan: ${{amount}}\nPeriod: {{period}}\nTotal: ${{amount}}\n\nView Invoice: {{invoice_url}}\n\n© {{year}} AdsMaster',
    'Sent when invoice is generated',
    '["user_name", "invoice_number", "plan_name", "amount", "period", "invoice_url", "year"]',
    'transactional'
),
(
    'Trial Ending Soon',
    'trial-ending',
    'Your AdsMaster trial ends in {{days}} days',
    E'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .highlight { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center; }
        .highlight-number { font-size: 36px; font-weight: bold; color: #f59e0b; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
        </div>
        <div class="content">
            <h1>Your trial is ending soon</h1>
            <p>Hi {{user_name}},</p>
            <div class="highlight">
                <div class="highlight-number">{{days}}</div>
                <div>days left in your trial</div>
            </div>
            <p>Don''t lose access to your AI-powered ad optimization. Upgrade now to continue:</p>
            <ul>
                <li>Unlimited AI recommendations</li>
                <li>Advanced analytics & forecasting</li>
                <li>Priority support</li>
            </ul>
            <a href="{{upgrade_url}}" class="btn">Upgrade Now</a>
        </div>
        <div class="footer">
            <p>&copy; {{year}} AdsMaster. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
    E'Your trial is ending soon\n\nHi {{user_name}},\n\nYou have {{days}} days left in your trial.\n\nDon''t lose access to your AI-powered ad optimization. Upgrade now:\n{{upgrade_url}}\n\n© {{year}} AdsMaster',
    'Sent when trial is about to expire',
    '["user_name", "days", "upgrade_url", "year"]',
    'transactional'
),
(
    'Weekly AI Digest',
    'weekly-digest',
    'Your Weekly AI Recommendations Summary',
    E'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .stats-row { display: flex; gap: 16px; margin: 24px 0; }
        .stat-box { flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #10b981; }
        .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
        </div>
        <div class="content">
            <h1>Your Weekly Summary</h1>
            <p>Hi {{user_name}},</p>
            <p>Here''s what happened with your ad campaigns this week:</p>
            <div class="stats-row">
                <div class="stat-box">
                    <div class="stat-value">{{recommendations_count}}</div>
                    <div class="stat-label">New Recommendations</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${{savings}}</div>
                    <div class="stat-label">Potential Savings</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">{{applied_count}}</div>
                    <div class="stat-label">Applied</div>
                </div>
            </div>
            <p>{{top_recommendation}}</p>
            <a href="{{dashboard_url}}" class="btn">View All Recommendations</a>
        </div>
        <div class="footer">
            <p>&copy; {{year}} AdsMaster. All rights reserved.</p>
            <p><a href="{{unsubscribe_url}}">Unsubscribe from weekly digest</a></p>
        </div>
    </div>
</body>
</html>',
    E'Your Weekly Summary\n\nHi {{user_name}},\n\nNew Recommendations: {{recommendations_count}}\nPotential Savings: ${{savings}}\nApplied: {{applied_count}}\n\n{{top_recommendation}}\n\nView Dashboard: {{dashboard_url}}\n\n© {{year}} AdsMaster\n\nUnsubscribe: {{unsubscribe_url}}',
    'Weekly email digest with AI recommendations summary',
    '["user_name", "recommendations_count", "savings", "applied_count", "top_recommendation", "dashboard_url", "unsubscribe_url", "year"]',
    'notification'
)
ON CONFLICT (slug) DO NOTHING;

-- Create default automation rules
INSERT INTO email_automation_rules (name, description, trigger_event, template_id, delay_minutes, is_active)
SELECT
    'Welcome Email',
    'Send welcome email when user signs up',
    'user.signup',
    (SELECT id FROM email_templates WHERE slug = 'welcome'),
    0,
    true
WHERE EXISTS (SELECT 1 FROM email_templates WHERE slug = 'welcome')
ON CONFLICT DO NOTHING;

INSERT INTO email_automation_rules (name, description, trigger_event, template_id, delay_minutes, is_active)
SELECT
    'Trial Ending Reminder',
    'Send reminder 3 days before trial ends',
    'trial.ending',
    (SELECT id FROM email_templates WHERE slug = 'trial-ending'),
    0,
    true
WHERE EXISTS (SELECT 1 FROM email_templates WHERE slug = 'trial-ending')
ON CONFLICT DO NOTHING;

INSERT INTO email_automation_rules (name, description, trigger_event, template_id, delay_minutes, is_active)
SELECT
    'Payment Failed Alert',
    'Send alert when payment fails',
    'payment.failed',
    (SELECT id FROM email_templates WHERE slug = 'payment-failed'),
    0,
    true
WHERE EXISTS (SELECT 1 FROM email_templates WHERE slug = 'payment-failed')
ON CONFLICT DO NOTHING;
-- ============================================================================
-- 00011_webhook_logs.sql
-- Webhook event logging and processing
-- ============================================================================

-- ============================================================================
-- WEBHOOK LOGS
-- Track all incoming webhook events from providers (Stripe, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Provider info
    provider VARCHAR(50) NOT NULL, -- 'stripe', 'resend', etc.
    event_type VARCHAR(100) NOT NULL, -- 'customer.subscription.created', etc.
    event_id VARCHAR(255) NOT NULL, -- Provider's unique event ID

    -- Payload
    payload JSONB NOT NULL,

    -- Processing status
    status VARCHAR(50) NOT NULL DEFAULT 'received', -- 'received', 'processing', 'processed', 'failed', 'skipped'
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,

    -- Related entities
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

    -- Timestamps
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure we don't process the same event twice
    UNIQUE(provider, event_id)
);

-- ============================================================================
-- STRIPE CUSTOMERS
-- Map Stripe customers to organizations
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    name VARCHAR(255),
    phone VARCHAR(50),
    address JSONB,
    balance_cents INTEGER DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    delinquent BOOLEAN DEFAULT FALSE,
    default_payment_method_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id)
);

-- ============================================================================
-- WEBHOOK PROCESSING QUEUE
-- For async processing of webhook events
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_log_id UUID NOT NULL REFERENCES webhook_logs(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    priority INTEGER DEFAULT 0, -- Higher = more urgent
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(255), -- Worker ID
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SUBSCRIPTION LIFECYCLE EVENTS
-- Track subscription state changes for analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    event_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'trial_started', 'trial_ended', 'activated', 'cancelled', 'paused', 'resumed', 'renewed', 'payment_failed', 'payment_succeeded'

    -- State change
    status_before VARCHAR(50),
    status_after VARCHAR(50),
    plan_before VARCHAR(50),
    plan_after VARCHAR(50),

    -- Financial impact
    mrr_delta_cents INTEGER DEFAULT 0,

    -- Context
    triggered_by VARCHAR(50), -- 'webhook', 'admin', 'user', 'system'
    webhook_log_id UUID REFERENCES webhook_logs(id) ON DELETE SET NULL,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Webhook logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received ON webhook_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_org ON webhook_logs(organization_id) WHERE organization_id IS NOT NULL;

-- Stripe customers
CREATE INDEX IF NOT EXISTS idx_stripe_customers_org ON stripe_customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

-- Processing queue
CREATE INDEX IF NOT EXISTS idx_webhook_queue_pending ON webhook_processing_queue(status, next_attempt_at)
    WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_webhook_queue_provider ON webhook_processing_queue(provider, event_type);

-- Subscription events
CREATE INDEX IF NOT EXISTS idx_subscription_events_sub ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_org ON subscription_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type, created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_stripe_customers_updated_at
    BEFORE UPDATE ON stripe_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to record subscription event
CREATE OR REPLACE FUNCTION record_subscription_event(
    p_subscription_id UUID,
    p_event_type VARCHAR(50),
    p_status_before VARCHAR(50) DEFAULT NULL,
    p_status_after VARCHAR(50) DEFAULT NULL,
    p_plan_before VARCHAR(50) DEFAULT NULL,
    p_plan_after VARCHAR(50) DEFAULT NULL,
    p_mrr_delta_cents INTEGER DEFAULT 0,
    p_triggered_by VARCHAR(50) DEFAULT 'system',
    p_webhook_log_id UUID DEFAULT NULL,
    p_admin_user_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
    v_event_id UUID;
BEGIN
    -- Get organization ID from subscription
    SELECT organization_id INTO v_org_id
    FROM subscriptions
    WHERE id = p_subscription_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Subscription not found: %', p_subscription_id;
    END IF;

    -- Insert event
    INSERT INTO subscription_events (
        subscription_id, organization_id, event_type,
        status_before, status_after, plan_before, plan_after,
        mrr_delta_cents, triggered_by, webhook_log_id, admin_user_id, metadata
    ) VALUES (
        p_subscription_id, v_org_id, p_event_type,
        p_status_before, p_status_after, p_plan_before, p_plan_after,
        p_mrr_delta_cents, p_triggered_by, p_webhook_log_id, p_admin_user_id, p_metadata
    ) RETURNING id INTO v_event_id;

    -- Also record in revenue_events if there's MRR change
    IF p_mrr_delta_cents != 0 THEN
        INSERT INTO revenue_events (
            organization_id, subscription_id, event_type,
            mrr_delta_cents, plan_from, plan_to, metadata
        ) VALUES (
            v_org_id, p_subscription_id,
            CASE
                WHEN p_mrr_delta_cents > 0 AND p_plan_before IS NULL THEN 'new'
                WHEN p_mrr_delta_cents > 0 THEN 'upgrade'
                WHEN p_mrr_delta_cents < 0 AND p_status_after = 'cancelled' THEN 'churn'
                ELSE 'downgrade'
            END,
            p_mrr_delta_cents,
            p_plan_before,
            p_plan_after,
            p_metadata
        );
    END IF;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Webhook summary for admin dashboard
CREATE OR REPLACE VIEW webhook_summary AS
SELECT
    provider,
    event_type,
    status,
    COUNT(*) as count,
    MIN(received_at) as first_received,
    MAX(received_at) as last_received,
    AVG(EXTRACT(EPOCH FROM (processed_at - received_at)))::INTEGER as avg_processing_seconds
FROM webhook_logs
WHERE received_at > NOW() - INTERVAL '7 days'
GROUP BY provider, event_type, status
ORDER BY provider, event_type, status;

-- Recent webhook activity
CREATE OR REPLACE VIEW recent_webhooks AS
SELECT
    id,
    provider,
    event_type,
    status,
    error_message,
    organization_id,
    received_at,
    processed_at,
    EXTRACT(EPOCH FROM (processed_at - received_at))::INTEGER as processing_seconds
FROM webhook_logs
ORDER BY received_at DESC
LIMIT 100;
-- Migration: 00012_tracking.sql
-- Description: Add visitor tracking, offline conversions, and session recording tables
-- Created: 2026-04-11

-- ============================================================================
-- VISITORS TABLE
-- Stores visitor data captured by tracker.js
-- ============================================================================
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id VARCHAR(64) NOT NULL,  -- Client-side generated (am_vid cookie)

    -- Click IDs (Ad Attribution)
    gclid VARCHAR(255),               -- Google Ads Click ID
    fbclid VARCHAR(255),              -- Facebook/Meta Click ID
    gbraid VARCHAR(255),              -- Google Ads App Click ID (iOS)
    wbraid VARCHAR(255),              -- Google Ads Web-to-App Click ID
    msclkid VARCHAR(255),             -- Microsoft Ads Click ID
    ttclkid VARCHAR(255),             -- TikTok Click ID
    li_fat_id VARCHAR(255),           -- LinkedIn Click ID

    -- Facebook Cookies
    fbp VARCHAR(255),                 -- _fbp cookie
    fbc VARCHAR(255),                 -- _fbc cookie

    -- UTM Parameters
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),

    -- Landing & Referrer
    landing_page TEXT,
    referrer TEXT,

    -- Device & Browser Info
    ip_address INET,
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(50),
    user_agent TEXT,
    device_type VARCHAR(20),          -- desktop, mobile, tablet
    browser VARCHAR(50),
    browser_version VARCHAR(20),
    os VARCHAR(50),
    os_version VARCHAR(20),
    screen_width INTEGER,
    screen_height INTEGER,

    -- Contact Info (set via identify)
    email VARCHAR(255),
    phone VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),

    -- Custom Data
    custom_data JSONB DEFAULT '{}',

    -- Stats
    page_views INTEGER DEFAULT 1,
    events_count INTEGER DEFAULT 0,

    -- Timestamps
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    identified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique per organization
    CONSTRAINT visitors_org_visitor_unique UNIQUE(organization_id, visitor_id)
);

-- Indexes for visitors
CREATE INDEX idx_visitors_org_id ON visitors(organization_id);
CREATE INDEX idx_visitors_gclid ON visitors(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX idx_visitors_fbclid ON visitors(fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX idx_visitors_email ON visitors(email) WHERE email IS NOT NULL;
CREATE INDEX idx_visitors_first_seen ON visitors(first_seen_at DESC);
CREATE INDEX idx_visitors_last_seen ON visitors(last_seen_at DESC);
CREATE INDEX idx_visitors_utm_source ON visitors(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX idx_visitors_utm_campaign ON visitors(utm_campaign) WHERE utm_campaign IS NOT NULL;

-- ============================================================================
-- VISITOR EVENTS TABLE
-- Stores individual tracking events (pageviews, custom events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS visitor_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    session_id VARCHAR(64),

    -- Event Info
    event_type VARCHAR(50) NOT NULL,  -- pageview, click, form_submit, custom
    event_name VARCHAR(100),          -- Custom event name

    -- Page Info
    page_url TEXT,
    page_path VARCHAR(500),
    page_title VARCHAR(500),
    referrer TEXT,

    -- Event Data
    event_data JSONB DEFAULT '{}',

    -- Timestamps
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for visitor_events
CREATE INDEX idx_visitor_events_org_id ON visitor_events(organization_id);
CREATE INDEX idx_visitor_events_visitor_id ON visitor_events(visitor_id);
CREATE INDEX idx_visitor_events_session_id ON visitor_events(session_id);
CREATE INDEX idx_visitor_events_type ON visitor_events(event_type);
CREATE INDEX idx_visitor_events_occurred_at ON visitor_events(occurred_at DESC);

-- ============================================================================
-- OFFLINE CONVERSIONS TABLE
-- Stores conversions to sync to ad platforms (Meta CAPI, Google Ads)
-- ============================================================================
CREATE TABLE IF NOT EXISTS offline_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,

    -- Contact Info (required for hashing and matching)
    email VARCHAR(255),
    email_hash VARCHAR(64),           -- SHA256 hash for API calls
    phone VARCHAR(50),
    phone_hash VARCHAR(64),           -- SHA256 hash for API calls
    first_name VARCHAR(100),
    first_name_hash VARCHAR(64),
    last_name VARCHAR(100),
    last_name_hash VARCHAR(64),

    -- Conversion Details
    conversion_type VARCHAR(50) NOT NULL,  -- lead, purchase, signup, add_to_cart, etc.
    conversion_name VARCHAR(255),          -- Custom name/label
    value_micros BIGINT DEFAULT 0,         -- Value in micros (1 USD = 1,000,000)
    currency VARCHAR(3) DEFAULT 'USD',
    quantity INTEGER DEFAULT 1,
    order_id VARCHAR(255),                 -- External order/transaction ID

    -- Click ID Attribution
    gclid VARCHAR(255),
    fbclid VARCHAR(255),
    gbraid VARCHAR(255),
    wbraid VARCHAR(255),
    msclkid VARCHAR(255),
    ttclkid VARCHAR(255),

    -- Facebook Cookies
    fbp VARCHAR(255),
    fbc VARCHAR(255),

    -- UTM Attribution
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),

    -- Source of Conversion
    source VARCHAR(50) NOT NULL DEFAULT 'manual',  -- manual, website, webhook, crm, csv, api
    source_name VARCHAR(100),                       -- Specific source (e.g., "Pipedrive", "Contact Form")
    external_id VARCHAR(255),                       -- ID in source system
    webhook_id UUID,                                -- If from webhook

    -- Client Info (for API calls)
    ip_address INET,
    user_agent TEXT,

    -- Lead Status
    lead_status VARCHAR(50) DEFAULT 'new',  -- new, contacted, qualified, converted, lost

    -- Meta (Facebook) CAPI Sync
    meta_sync_status VARCHAR(20) DEFAULT 'pending',  -- pending, synced, failed, skipped
    meta_synced_at TIMESTAMPTZ,
    meta_event_id VARCHAR(255),
    meta_error_message TEXT,
    meta_pixel_id VARCHAR(50),

    -- Google Ads Offline Conversions Sync
    google_sync_status VARCHAR(20) DEFAULT 'pending',
    google_synced_at TIMESTAMPTZ,
    google_conversion_action_id VARCHAR(50),
    google_error_message TEXT,

    -- Microsoft Ads Sync
    microsoft_sync_status VARCHAR(20) DEFAULT 'pending',
    microsoft_synced_at TIMESTAMPTZ,
    microsoft_error_message TEXT,

    -- TikTok Events API Sync
    tiktok_sync_status VARCHAR(20) DEFAULT 'pending',
    tiktok_synced_at TIMESTAMPTZ,
    tiktok_error_message TEXT,

    -- Custom Data
    custom_data JSONB DEFAULT '{}',

    -- Timestamps
    occurred_at TIMESTAMPTZ NOT NULL,      -- When conversion actually happened
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for offline_conversions
CREATE INDEX idx_offline_conv_org_id ON offline_conversions(organization_id);
CREATE INDEX idx_offline_conv_visitor_id ON offline_conversions(visitor_id);
CREATE INDEX idx_offline_conv_email ON offline_conversions(email) WHERE email IS NOT NULL;
CREATE INDEX idx_offline_conv_gclid ON offline_conversions(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX idx_offline_conv_fbclid ON offline_conversions(fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX idx_offline_conv_type ON offline_conversions(conversion_type);
CREATE INDEX idx_offline_conv_source ON offline_conversions(source);
CREATE INDEX idx_offline_conv_occurred_at ON offline_conversions(occurred_at DESC);
CREATE INDEX idx_offline_conv_meta_status ON offline_conversions(meta_sync_status);
CREATE INDEX idx_offline_conv_google_status ON offline_conversions(google_sync_status);
CREATE INDEX idx_offline_conv_lead_status ON offline_conversions(lead_status);

-- ============================================================================
-- SESSION RECORDINGS TABLE
-- Stores rrweb session recordings for replay
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    session_id VARCHAR(64) NOT NULL,

    -- Session Info
    start_url TEXT,
    start_path VARCHAR(500),
    pages_visited INTEGER DEFAULT 1,

    -- Duration
    duration_ms INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,

    -- Device Info (snapshot)
    device_type VARCHAR(20),
    viewport_width INTEGER,
    viewport_height INTEGER,

    -- Recording Status
    status VARCHAR(20) DEFAULT 'recording',  -- recording, completed, error

    -- Events stored in separate table for performance
    -- or inline for small recordings
    events_inline JSONB,                      -- For small recordings < 1MB
    events_storage_url TEXT,                  -- For large recordings (S3/GCS)

    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT session_recordings_org_session_unique UNIQUE(organization_id, session_id)
);

-- Indexes for session_recordings
CREATE INDEX idx_session_rec_org_id ON session_recordings(organization_id);
CREATE INDEX idx_session_rec_visitor_id ON session_recordings(visitor_id);
CREATE INDEX idx_session_rec_started_at ON session_recordings(started_at DESC);
CREATE INDEX idx_session_rec_duration ON session_recordings(duration_ms DESC);

-- ============================================================================
-- WEBHOOK ENDPOINTS TABLE
-- Stores webhook configurations for receiving external data
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Webhook Config
    name VARCHAR(255) NOT NULL,
    description TEXT,
    secret_key VARCHAR(64) NOT NULL,       -- For webhook URL: /webhooks/{id}?key={secret_key}

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Field Mapping (how to map incoming fields to conversion fields)
    field_mapping JSONB DEFAULT '{
        "email": "email",
        "phone": "phone",
        "firstName": "first_name",
        "lastName": "last_name",
        "value": "value",
        "gclid": "gclid",
        "fbclid": "fbclid"
    }',

    -- Default Values
    default_conversion_type VARCHAR(50) DEFAULT 'lead',
    default_source_name VARCHAR(100),

    -- Stats
    events_received INTEGER DEFAULT 0,
    events_success INTEGER DEFAULT 0,
    events_failed INTEGER DEFAULT 0,
    last_event_at TIMESTAMPTZ,
    last_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook_endpoints
CREATE INDEX idx_webhook_endpoints_org_id ON webhook_endpoints(organization_id);
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(is_active);

-- ============================================================================
-- WEBHOOK EVENTS LOG TABLE
-- Logs all incoming webhook events for debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Request Info
    request_body JSONB,
    request_headers JSONB,
    ip_address INET,

    -- Processing Result
    status VARCHAR(20) NOT NULL,  -- success, failed, invalid
    error_message TEXT,
    conversion_id UUID REFERENCES offline_conversions(id),

    -- Timestamps
    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook_events_log
CREATE INDEX idx_webhook_events_webhook_id ON webhook_events_log(webhook_id);
CREATE INDEX idx_webhook_events_received_at ON webhook_events_log(received_at DESC);
-- Note: Auto-cleanup of old logs (>30 days) should be done via scheduled job, not partial index

-- ============================================================================
-- TRACKING DOMAINS TABLE
-- Custom subdomains for first-party tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS tracking_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Domain Info
    subdomain VARCHAR(100) NOT NULL,       -- e.g., "track" for track.example.com
    domain VARCHAR(255) NOT NULL,          -- e.g., "example.com"
    full_domain VARCHAR(355) GENERATED ALWAYS AS (subdomain || '.' || domain) STORED,

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(64),
    verified_at TIMESTAMPTZ,

    -- SSL
    ssl_status VARCHAR(20) DEFAULT 'pending',  -- pending, active, failed
    ssl_issued_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT tracking_domains_unique UNIQUE(subdomain, domain)
);

-- Indexes for tracking_domains
CREATE INDEX idx_tracking_domains_org_id ON tracking_domains(organization_id);
CREATE INDEX idx_tracking_domains_full ON tracking_domains(full_domain);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their organization's data)
CREATE POLICY visitors_org_policy ON visitors
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY visitor_events_org_policy ON visitor_events
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY offline_conversions_org_policy ON offline_conversions
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY session_recordings_org_policy ON session_recordings
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY webhook_endpoints_org_policy ON webhook_endpoints
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY webhook_events_log_org_policy ON webhook_events_log
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY tracking_domains_org_policy ON tracking_domains
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update visitor stats
CREATE OR REPLACE FUNCTION update_visitor_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE visitors
    SET
        page_views = page_views + CASE WHEN NEW.event_type = 'pageview' THEN 1 ELSE 0 END,
        events_count = events_count + 1,
        last_seen_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.visitor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update visitor stats on new event
CREATE TRIGGER trigger_update_visitor_stats
    AFTER INSERT ON visitor_events
    FOR EACH ROW
    EXECUTE FUNCTION update_visitor_stats();

-- Function to hash PII for API calls
CREATE OR REPLACE FUNCTION hash_pii(input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF input IS NULL OR input = '' THEN
        RETURN NULL;
    END IF;
    -- Normalize: lowercase, trim whitespace
    RETURN encode(sha256(lower(trim(input))::bytea), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-hash PII on offline_conversions insert/update
CREATE OR REPLACE FUNCTION hash_conversion_pii()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_hash := hash_pii(NEW.email);
    NEW.phone_hash := hash_pii(regexp_replace(NEW.phone, '[^0-9+]', '', 'g'));
    NEW.first_name_hash := hash_pii(NEW.first_name);
    NEW.last_name_hash := hash_pii(NEW.last_name);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hash_conversion_pii
    BEFORE INSERT OR UPDATE ON offline_conversions
    FOR EACH ROW
    EXECUTE FUNCTION hash_conversion_pii();

-- ============================================================================
-- SEED DATA: Conversion Types
-- ============================================================================
COMMENT ON TABLE offline_conversions IS 'Standard conversion types: lead, purchase, signup, add_to_cart, initiate_checkout, complete_registration, subscribe, start_trial, contact, schedule, view_content, search, add_payment_info, add_to_wishlist, custom';
-- ============================================================================
-- Migration 00013: Sync Logs for Conversion Tracking
-- ============================================================================
-- Tracks sync attempts to Meta CAPI and Google Ads for auditing and debugging.

-- Drop old sync_logs if it exists with wrong schema, then recreate
DROP TABLE IF EXISTS sync_logs CASCADE;

-- Sync logs table
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- What was synced
    conversion_id UUID REFERENCES offline_conversions(id) ON DELETE SET NULL,

    -- Platform and result
    platform TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
    success BOOLEAN NOT NULL DEFAULT false,

    -- Request/response for debugging (stored as JSONB)
    request_payload JSONB,
    response_data JSONB,
    error_message TEXT,

    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sync_logs_org ON sync_logs(organization_id);
CREATE INDEX idx_sync_logs_conversion ON sync_logs(conversion_id);
CREATE INDEX idx_sync_logs_platform ON sync_logs(platform);
CREATE INDEX idx_sync_logs_created ON sync_logs(created_at DESC);
CREATE INDEX idx_sync_logs_success ON sync_logs(success);

-- Composite index for common queries
CREATE INDEX idx_sync_logs_org_platform_created
    ON sync_logs(organization_id, platform, created_at DESC);

-- RLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_logs_org_policy ON sync_logs
    FOR ALL USING (organization_id = current_setting('app.organization_id', true)::uuid);

-- Add any missing columns to offline_conversions for sync tracking
DO $$
BEGIN
    -- Meta sync columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'offline_conversions' AND column_name = 'meta_sync_id') THEN
        ALTER TABLE offline_conversions ADD COLUMN meta_sync_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'offline_conversions' AND column_name = 'meta_sync_error') THEN
        ALTER TABLE offline_conversions ADD COLUMN meta_sync_error TEXT;
    END IF;

    -- Google sync columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'offline_conversions' AND column_name = 'google_sync_id') THEN
        ALTER TABLE offline_conversions ADD COLUMN google_sync_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'offline_conversions' AND column_name = 'google_sync_error') THEN
        ALTER TABLE offline_conversions ADD COLUMN google_sync_error TEXT;
    END IF;

    -- FBC cookie (Meta) if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'offline_conversions' AND column_name = 'fbc') THEN
        ALTER TABLE offline_conversions ADD COLUMN fbc TEXT;
    END IF;

    -- FBP cookie (Meta) if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'offline_conversions' AND column_name = 'fbp') THEN
        ALTER TABLE offline_conversions ADD COLUMN fbp TEXT;
    END IF;
END $$;

-- Add ad_account platform credentials columns if missing
DO $$
BEGIN
    -- Meta Pixel ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ad_accounts' AND column_name = 'meta_pixel_id') THEN
        ALTER TABLE ad_accounts ADD COLUMN meta_pixel_id TEXT;
    END IF;

    -- Google Ads specific
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ad_accounts' AND column_name = 'google_customer_id') THEN
        ALTER TABLE ad_accounts ADD COLUMN google_customer_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ad_accounts' AND column_name = 'google_conversion_action_id') THEN
        ALTER TABLE ad_accounts ADD COLUMN google_conversion_action_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ad_accounts' AND column_name = 'google_developer_token') THEN
        ALTER TABLE ad_accounts ADD COLUMN google_developer_token TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ad_accounts' AND column_name = 'google_login_customer_id') THEN
        ALTER TABLE ad_accounts ADD COLUMN google_login_customer_id TEXT;
    END IF;
END $$;

-- Comment
COMMENT ON TABLE sync_logs IS 'Audit log for conversion sync attempts to Meta CAPI and Google Ads';
-- Migration: 00014_session_recordings_enhanced.sql
-- Description: Enhance session recordings with rrweb-specific fields and analytics
-- Created: 2026-04-13

-- ============================================================================
-- ENHANCE SESSION RECORDINGS TABLE
-- Add rrweb-specific fields for better session analysis
-- ============================================================================

-- Add new columns to session_recordings
ALTER TABLE session_recordings
ADD COLUMN IF NOT EXISTS page_url TEXT,
ADD COLUMN IF NOT EXISTS page_title VARCHAR(500),
ADD COLUMN IF NOT EXISTS browser VARCHAR(100),
ADD COLUMN IF NOT EXISTS os VARCHAR(100),
ADD COLUMN IF NOT EXISTS screen_width INTEGER,
ADD COLUMN IF NOT EXISTS screen_height INTEGER,
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS rage_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dead_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS console_errors JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS has_conversion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS conversion_id UUID REFERENCES offline_conversions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_session_rec_email ON session_recordings(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_rec_has_conversion ON session_recordings(has_conversion) WHERE has_conversion = true;
CREATE INDEX IF NOT EXISTS idx_session_rec_is_starred ON session_recordings(is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_session_rec_rage_clicks ON session_recordings(rage_clicks DESC) WHERE rage_clicks > 0;

-- ============================================================================
-- SESSION RECORDING EVENTS TABLE
-- For storing large recordings in chunks (better performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_recording_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES session_recordings(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    events JSONB NOT NULL,
    events_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT session_recording_chunks_unique UNIQUE(recording_id, chunk_index)
);

CREATE INDEX idx_session_chunks_recording_id ON session_recording_chunks(recording_id);

-- Enable RLS
ALTER TABLE session_recording_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_recording_chunks_policy ON session_recording_chunks
    FOR ALL USING (recording_id IN (
        SELECT id FROM session_recordings WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- ============================================================================
-- SESSION RECORDING MARKERS TABLE
-- For marking specific moments in recordings (conversions, errors, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_recording_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES session_recordings(id) ON DELETE CASCADE,

    -- Marker Info
    marker_type VARCHAR(50) NOT NULL,  -- conversion, error, rage_click, dead_click, form_submit, custom
    label VARCHAR(255),
    timestamp_ms INTEGER NOT NULL,     -- Milliseconds from recording start

    -- Associated data
    event_data JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_markers_recording_id ON session_recording_markers(recording_id);
CREATE INDEX idx_session_markers_type ON session_recording_markers(marker_type);

-- Enable RLS
ALTER TABLE session_recording_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_recording_markers_policy ON session_recording_markers
    FOR ALL USING (recording_id IN (
        SELECT id FROM session_recordings WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- ============================================================================
-- RECORDING SETTINGS TABLE
-- Per-org settings for session recording
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_recording_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Recording Settings
    is_enabled BOOLEAN DEFAULT true,
    sample_rate INTEGER DEFAULT 100,            -- Percentage of sessions to record (1-100)
    max_duration_seconds INTEGER DEFAULT 1800,  -- 30 minutes default

    -- Privacy Settings
    mask_all_inputs BOOLEAN DEFAULT true,
    mask_text_content BOOLEAN DEFAULT false,
    block_selectors JSONB DEFAULT '[]',         -- CSS selectors to block

    -- Capture Settings
    capture_console BOOLEAN DEFAULT true,
    capture_network BOOLEAN DEFAULT false,
    capture_mouse_moves BOOLEAN DEFAULT true,

    -- Retention
    retention_days INTEGER DEFAULT 30,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT session_recording_settings_org_unique UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE session_recording_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_recording_settings_policy ON session_recording_settings
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE session_recording_chunks IS 'Stores large session recordings in chunks for better performance. Each chunk contains a subset of rrweb events.';
COMMENT ON TABLE session_recording_markers IS 'Marks specific moments in session recordings for quick navigation (conversions, errors, rage clicks).';
COMMENT ON TABLE session_recording_settings IS 'Per-organization settings for session recording behavior and privacy.';
COMMENT ON COLUMN session_recordings.rage_clicks IS 'Count of rapid repeated clicks on same element (indicates user frustration).';
COMMENT ON COLUMN session_recordings.dead_clicks IS 'Count of clicks that had no effect (on non-interactive elements).';
-- Migration: 00015_products_ecommerce.sql
-- Description: Add products table for e-commerce conversion tracking
-- Created: 2026-04-13

-- ============================================================================
-- PRODUCTS TABLE
-- Individual products/line items within e-commerce conversions
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversion_id UUID REFERENCES offline_conversions(id) ON DELETE CASCADE,

    -- Product Identification
    product_id VARCHAR(255) NOT NULL,       -- External product ID/SKU
    product_name VARCHAR(255),
    sku VARCHAR(100),

    -- Categorization
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),

    -- Pricing (in micros: 1 USD = 1,000,000 micros)
    quantity INTEGER DEFAULT 1,
    unit_price_micros BIGINT,
    total_price_micros BIGINT,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Additional Info
    image_url TEXT,
    product_url TEXT,
    variant VARCHAR(255),                   -- Size, color, etc.

    -- Custom Data
    custom_data JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_org_id ON products(organization_id);
CREATE INDEX idx_products_conversion_id ON products(conversion_id);
CREATE INDEX idx_products_product_id ON products(product_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_org_policy ON products
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- PRODUCT CATALOG TABLE
-- Master product catalog for quick lookups and analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Product Info
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255),
    sku VARCHAR(100),

    -- Categorization
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),

    -- Default Pricing
    default_price_micros BIGINT,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Media
    image_url TEXT,
    product_url TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Stats (updated by triggers/jobs)
    total_sales INTEGER DEFAULT 0,
    total_revenue_micros BIGINT DEFAULT 0,
    last_sold_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT product_catalog_unique UNIQUE(organization_id, product_id)
);

-- Indexes
CREATE INDEX idx_product_catalog_org_id ON product_catalog(organization_id);
CREATE INDEX idx_product_catalog_category ON product_catalog(category);
CREATE INDEX idx_product_catalog_brand ON product_catalog(brand);
CREATE INDEX idx_product_catalog_total_sales ON product_catalog(total_sales DESC);

-- Enable RLS
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_catalog_org_policy ON product_catalog
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- UPDATE PRODUCT CATALOG STATS FUNCTION
-- Auto-updates catalog stats when products are added
-- ============================================================================
CREATE OR REPLACE FUNCTION update_product_catalog_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO product_catalog (
        organization_id,
        product_id,
        product_name,
        sku,
        category,
        subcategory,
        brand,
        default_price_micros,
        currency,
        image_url,
        product_url,
        total_sales,
        total_revenue_micros,
        last_sold_at
    )
    VALUES (
        NEW.organization_id,
        NEW.product_id,
        NEW.product_name,
        NEW.sku,
        NEW.category,
        NEW.subcategory,
        NEW.brand,
        NEW.unit_price_micros,
        NEW.currency,
        NEW.image_url,
        NEW.product_url,
        NEW.quantity,
        COALESCE(NEW.total_price_micros, NEW.unit_price_micros * NEW.quantity),
        NOW()
    )
    ON CONFLICT (organization_id, product_id) DO UPDATE SET
        product_name = COALESCE(EXCLUDED.product_name, product_catalog.product_name),
        category = COALESCE(EXCLUDED.category, product_catalog.category),
        subcategory = COALESCE(EXCLUDED.subcategory, product_catalog.subcategory),
        brand = COALESCE(EXCLUDED.brand, product_catalog.brand),
        total_sales = product_catalog.total_sales + EXCLUDED.total_sales,
        total_revenue_micros = product_catalog.total_revenue_micros + EXCLUDED.total_revenue_micros,
        last_sold_at = NOW(),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_catalog
    AFTER INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_catalog_stats();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE products IS 'Individual products/line items within e-commerce conversions. Links to offline_conversions for order-level data.';
COMMENT ON TABLE product_catalog IS 'Master product catalog with aggregated sales stats. Auto-populated from products table.';
COMMENT ON COLUMN products.unit_price_micros IS 'Price per unit in micros (1 USD = 1,000,000 micros).';
COMMENT ON COLUMN products.total_price_micros IS 'Total line item price (quantity * unit_price) in micros.';
-- Migration: 00016_crm_integrations.sql
-- Description: Add CRM integrations (Pipedrive, ActiveCampaign, etc.) and sync tables
-- Created: 2026-04-13

-- ============================================================================
-- CRM INTEGRATIONS TABLE
-- Stores credentials and settings for external CRM connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Integration Info
    provider VARCHAR(50) NOT NULL,          -- pipedrive, activecampaign, hubspot, salesforce, zoho
    name VARCHAR(255) NOT NULL,             -- User-friendly name
    description TEXT,

    -- Encrypted Credentials (JSON encrypted with AES-256)
    credentials_encrypted TEXT NOT NULL,

    -- Provider-Specific Settings
    settings JSONB DEFAULT '{}',
    -- For Pipedrive: {api_token, company_domain, pipeline_id, stage_mapping}
    -- For ActiveCampaign: {api_url, api_key, list_id, automation_id}
    -- For HubSpot: {access_token, refresh_token, portal_id}

    -- Sync Configuration
    sync_direction VARCHAR(20) DEFAULT 'both',  -- to_crm, from_crm, both
    sync_frequency VARCHAR(20) DEFAULT 'realtime',  -- realtime, hourly, daily
    sync_enabled BOOLEAN DEFAULT true,

    -- Field Mapping (AdsMaster field → CRM field)
    field_mapping JSONB DEFAULT '{
        "email": "email",
        "phone": "phone",
        "first_name": "first_name",
        "last_name": "last_name",
        "value_micros": "value",
        "conversion_type": "lead_source",
        "lead_status": "status"
    }',

    -- Status
    is_active BOOLEAN DEFAULT true,
    connection_status VARCHAR(20) DEFAULT 'pending',  -- pending, connected, error, expired

    -- Sync Stats
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),           -- success, partial, failed
    last_sync_records INTEGER DEFAULT 0,
    last_error TEXT,
    total_synced INTEGER DEFAULT 0,

    -- OAuth Tokens (for providers using OAuth)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_crm_integrations_org_id ON crm_integrations(organization_id);
CREATE INDEX idx_crm_integrations_provider ON crm_integrations(provider);
CREATE INDEX idx_crm_integrations_active ON crm_integrations(is_active) WHERE is_active = true;
CREATE INDEX idx_crm_integrations_sync_enabled ON crm_integrations(sync_enabled) WHERE sync_enabled = true;

-- Enable RLS
ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_integrations_org_policy ON crm_integrations
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- CRM SYNC LOGS TABLE
-- History of CRM synchronization operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,

    -- Sync Info
    sync_type VARCHAR(50) NOT NULL,         -- manual, scheduled, realtime, webhook
    direction VARCHAR(20) NOT NULL,         -- to_crm, from_crm

    -- Status
    status VARCHAR(50) NOT NULL,            -- started, completed, partial, failed

    -- Stats
    total_records INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,

    -- Error Details
    error_details JSONB DEFAULT '[]',       -- [{record_id, error_message}, ...]

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
);

-- Indexes
CREATE INDEX idx_crm_sync_logs_org_id ON crm_sync_logs(organization_id);
CREATE INDEX idx_crm_sync_logs_integration_id ON crm_sync_logs(integration_id);
CREATE INDEX idx_crm_sync_logs_started_at ON crm_sync_logs(started_at DESC);
CREATE INDEX idx_crm_sync_logs_status ON crm_sync_logs(status);

-- Enable RLS
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_sync_logs_org_policy ON crm_sync_logs
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- CRM CONTACT MAPPING TABLE
-- Maps AdsMaster visitors/conversions to CRM contacts
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_contact_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,

    -- AdsMaster Reference
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    conversion_id UUID REFERENCES offline_conversions(id) ON DELETE SET NULL,
    email VARCHAR(255),

    -- CRM Reference
    crm_contact_id VARCHAR(255) NOT NULL,   -- ID in external CRM
    crm_contact_type VARCHAR(50),           -- person, deal, lead, contact, etc.
    crm_contact_url TEXT,                   -- Direct link to CRM record

    -- Sync Status
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_direction VARCHAR(20),             -- to_crm, from_crm

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT crm_contact_mapping_unique UNIQUE(integration_id, crm_contact_id)
);

-- Indexes
CREATE INDEX idx_crm_contact_mapping_org_id ON crm_contact_mapping(organization_id);
CREATE INDEX idx_crm_contact_mapping_integration_id ON crm_contact_mapping(integration_id);
CREATE INDEX idx_crm_contact_mapping_visitor_id ON crm_contact_mapping(visitor_id);
CREATE INDEX idx_crm_contact_mapping_conversion_id ON crm_contact_mapping(conversion_id);
CREATE INDEX idx_crm_contact_mapping_email ON crm_contact_mapping(email);
CREATE INDEX idx_crm_contact_mapping_crm_id ON crm_contact_mapping(crm_contact_id);

-- Enable RLS
ALTER TABLE crm_contact_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_contact_mapping_org_policy ON crm_contact_mapping
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- LEADS PIPELINE TABLE
-- Custom lead stages for CRM-like functionality
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Stage Info
    name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL,
    color VARCHAR(20) DEFAULT '#6B7280',    -- Hex color for UI

    -- Behavior
    is_won BOOLEAN DEFAULT false,           -- Marks successful conversion
    is_lost BOOLEAN DEFAULT false,          -- Marks lost lead
    is_default BOOLEAN DEFAULT false,       -- Default stage for new leads

    -- Stats (updated by triggers)
    leads_count INTEGER DEFAULT 0,
    total_value_micros BIGINT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT lead_pipeline_stages_order_unique UNIQUE(organization_id, display_order)
);

-- Indexes
CREATE INDEX idx_lead_pipeline_stages_org_id ON lead_pipeline_stages(organization_id);
CREATE INDEX idx_lead_pipeline_stages_order ON lead_pipeline_stages(organization_id, display_order);

-- Enable RLS
ALTER TABLE lead_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_pipeline_stages_org_policy ON lead_pipeline_stages
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- SEED DEFAULT PIPELINE STAGES
-- Function to create default stages for new organizations
-- ============================================================================
CREATE OR REPLACE FUNCTION create_default_pipeline_stages(org_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO lead_pipeline_stages (organization_id, name, display_order, color, is_default)
    VALUES
        (org_id, 'New', 1, '#3B82F6', true),
        (org_id, 'Contacted', 2, '#8B5CF6', false),
        (org_id, 'Qualified', 3, '#F59E0B', false),
        (org_id, 'Proposal', 4, '#EC4899', false),
        (org_id, 'Negotiation', 5, '#14B8A6', false),
        (org_id, 'Won', 6, '#10B981', false),
        (org_id, 'Lost', 7, '#EF4444', false)
    ON CONFLICT DO NOTHING;

    UPDATE lead_pipeline_stages SET is_won = true WHERE organization_id = org_id AND name = 'Won';
    UPDATE lead_pipeline_stages SET is_lost = true WHERE organization_id = org_id AND name = 'Lost';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE crm_integrations IS 'External CRM connections (Pipedrive, ActiveCampaign, HubSpot, etc.) with encrypted credentials.';
COMMENT ON TABLE crm_sync_logs IS 'History of CRM synchronization operations with success/failure stats.';
COMMENT ON TABLE crm_contact_mapping IS 'Maps AdsMaster visitors/conversions to external CRM contact IDs.';
COMMENT ON TABLE lead_pipeline_stages IS 'Custom lead pipeline stages for CRM-like lead management.';
COMMENT ON COLUMN crm_integrations.credentials_encrypted IS 'AES-256 encrypted JSON containing API keys, tokens, and secrets.';
COMMENT ON COLUMN crm_integrations.field_mapping IS 'Maps AdsMaster fields to CRM fields for data sync.';
-- Migration: 00017_studio_dashboards.sql
-- Description: Add Studio dashboard builder tables (custom dashboards, widgets, data sources)
-- Created: 2026-04-13

-- ============================================================================
-- STUDIO DASHBOARDS TABLE
-- Main dashboard definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),

    -- Dashboard Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail TEXT,                         -- Base64 or URL for preview image

    -- Layout Configuration (for react-grid-layout)
    layout JSONB DEFAULT '[]',              -- [{i: 'widget-1', x: 0, y: 0, w: 4, h: 3}, ...]

    -- Global Settings
    settings JSONB DEFAULT '{
        "theme": "light",
        "refreshInterval": 0,
        "backgroundColor": "#ffffff"
    }',

    -- Date Filter Defaults
    default_date_range VARCHAR(50) DEFAULT 'last_30_days',
    default_timezone VARCHAR(50) DEFAULT 'UTC',
    default_comparison VARCHAR(50) DEFAULT 'previous_period',

    -- Publishing
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,

    -- Template
    is_template BOOLEAN DEFAULT false,
    template_category VARCHAR(50),          -- marketing, ecommerce, leads, social, analytics
    template_description TEXT,

    -- Sharing
    share_token VARCHAR(100) UNIQUE,
    is_public BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),             -- Optional password protection
    allowed_emails JSONB DEFAULT '[]',      -- Specific emails allowed to view

    -- Stats
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_studio_dashboards_org_id ON studio_dashboards(organization_id);
CREATE INDEX idx_studio_dashboards_created_by ON studio_dashboards(created_by);
CREATE INDEX idx_studio_dashboards_share_token ON studio_dashboards(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_studio_dashboards_is_template ON studio_dashboards(is_template) WHERE is_template = true;
CREATE INDEX idx_studio_dashboards_is_public ON studio_dashboards(is_public) WHERE is_public = true;

-- Enable RLS
ALTER TABLE studio_dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY studio_dashboards_org_policy ON studio_dashboards
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- STUDIO WIDGETS TABLE
-- Individual widgets within dashboards
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES studio_dashboards(id) ON DELETE CASCADE,

    -- Widget Type
    type VARCHAR(50) NOT NULL,              -- metric, line_chart, bar_chart, pie_chart, donut_chart,
                                            -- area_chart, funnel, heatmap, table, text, image, embed

    -- Display
    title VARCHAR(255),
    subtitle VARCHAR(255),
    icon VARCHAR(50),                       -- Icon name from lucide-react

    -- Grid Position (react-grid-layout)
    grid_x INTEGER NOT NULL DEFAULT 0,
    grid_y INTEGER NOT NULL DEFAULT 0,
    grid_w INTEGER NOT NULL DEFAULT 4,
    grid_h INTEGER NOT NULL DEFAULT 4,
    min_w INTEGER DEFAULT 2,
    min_h INTEGER DEFAULT 2,

    -- Data Source
    data_source VARCHAR(50) NOT NULL,       -- meta_ads, google_ads, ga4, conversions, visitors,
                                            -- csv, google_sheets, api, manual, calculated
    data_source_id UUID,                    -- Reference to studio_data_sources for CSV/Sheets
    ad_account_id UUID,                     -- Reference to ad_accounts for ad platform data

    -- Query Configuration
    metrics JSONB DEFAULT '[]',             -- [{field: 'spend', aggregation: 'sum', label: 'Total Spend', format: 'currency'}]
    dimensions JSONB DEFAULT '[]',          -- [{field: 'campaign_name', label: 'Campaign'}]
    filters JSONB DEFAULT '[]',             -- [{field: 'status', operator: 'eq', value: 'active'}]
    sort_by JSONB DEFAULT '{}',             -- {field: 'spend', direction: 'desc'}
    limit_rows INTEGER DEFAULT 10,

    -- Date Override (null = use dashboard default)
    date_range VARCHAR(50),
    custom_date_start DATE,
    custom_date_end DATE,

    -- Visualization Config
    visual_config JSONB DEFAULT '{
        "colors": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
        "showLegend": true,
        "showGrid": true,
        "showLabels": true,
        "stacked": false,
        "smooth": false
    }',

    -- Comparison
    show_comparison BOOLEAN DEFAULT false,
    comparison_type VARCHAR(30),            -- previous_period, previous_year, custom

    -- Calculated Field (for type='calculated')
    formula TEXT,                           -- e.g., "{{spend}} / {{conversions}}" for CPL

    -- Manual Data (for type='manual')
    manual_data JSONB,

    -- Conditional Formatting
    conditional_rules JSONB DEFAULT '[]',   -- [{condition: '>100', color: '#10B981', icon: 'arrow-up'}]

    -- Drill-down Configuration
    drilldown_enabled BOOLEAN DEFAULT false,
    drilldown_dimension VARCHAR(100),

    -- Order
    z_index INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_studio_widgets_dashboard_id ON studio_widgets(dashboard_id);
CREATE INDEX idx_studio_widgets_type ON studio_widgets(type);
CREATE INDEX idx_studio_widgets_data_source ON studio_widgets(data_source);

-- Enable RLS (inherits from dashboard)
ALTER TABLE studio_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY studio_widgets_policy ON studio_widgets
    FOR ALL USING (dashboard_id IN (
        SELECT id FROM studio_dashboards WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- ============================================================================
-- STUDIO DATA SOURCES TABLE
-- External data connections (CSV, Google Sheets, API)
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),

    -- Source Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL,              -- csv, google_sheets, api, database

    -- Connection Config
    connection_config JSONB DEFAULT '{}',
    -- For CSV: {fileUrl, fileName, delimiter, hasHeader}
    -- For Sheets: {spreadsheetId, sheetName, range, credentials}
    -- For API: {url, method, headers, auth, refreshInterval}
    -- For Database: {host, port, database, username, password (encrypted), query}

    -- File Upload (for CSV)
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,

    -- Google Sheets
    spreadsheet_id VARCHAR(255),
    sheet_name VARCHAR(255),
    range VARCHAR(100),                     -- e.g., 'A1:Z1000'

    -- Schema Definition
    schema JSONB DEFAULT '[]',              -- [{name: 'date', type: 'date', format: 'YYYY-MM-DD'}, ...]

    -- Refresh Settings
    auto_refresh BOOLEAN DEFAULT false,
    refresh_interval_minutes INTEGER,       -- null = manual only
    last_refreshed_at TIMESTAMPTZ,

    -- Cached Data
    cached_data JSONB,
    row_count INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'active',    -- active, error, refreshing, deleted
    last_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_studio_data_sources_org_id ON studio_data_sources(organization_id);
CREATE INDEX idx_studio_data_sources_type ON studio_data_sources(type);
CREATE INDEX idx_studio_data_sources_status ON studio_data_sources(status);

-- Enable RLS
ALTER TABLE studio_data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY studio_data_sources_org_policy ON studio_data_sources
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- STUDIO TEMPLATES TABLE
-- Pre-built dashboard templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail TEXT,
    category VARCHAR(50) NOT NULL,          -- marketing, ecommerce, leads, social, analytics, reporting

    -- Required Data Sources
    required_sources JSONB DEFAULT '[]',    -- ['meta_ads', 'google_ads', 'conversions']

    -- Template Configuration (widgets, layout)
    config JSONB NOT NULL,                  -- Full dashboard config to clone

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    is_premium BOOLEAN DEFAULT false,       -- Requires paid plan
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,

    -- Author (null = AdsMaster official)
    author_name VARCHAR(255),
    author_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_studio_templates_category ON studio_templates(category);
CREATE INDEX idx_studio_templates_is_active ON studio_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_studio_templates_is_premium ON studio_templates(is_premium);
CREATE INDEX idx_studio_templates_usage ON studio_templates(usage_count DESC);

-- ============================================================================
-- STUDIO SCHEDULED REPORTS TABLE
-- Automated report delivery
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES studio_dashboards(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),

    -- Schedule Info
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,

    -- Frequency
    frequency VARCHAR(20) NOT NULL,         -- daily, weekly, monthly
    day_of_week INTEGER,                    -- 0-6 for weekly (0 = Sunday)
    day_of_month INTEGER,                   -- 1-31 for monthly
    hour INTEGER NOT NULL DEFAULT 9,        -- 0-23 (24-hour format)
    minute INTEGER NOT NULL DEFAULT 0,      -- 0-59
    timezone VARCHAR(50) DEFAULT 'UTC',

    -- Recipients
    recipients JSONB NOT NULL DEFAULT '[]', -- [{email: '...', name: '...'}, ...]

    -- Format
    format VARCHAR(20) DEFAULT 'pdf',       -- pdf, png, csv, excel
    include_comparison BOOLEAN DEFAULT true,
    custom_date_range VARCHAR(50),          -- Override dashboard default

    -- Email Customization
    email_subject VARCHAR(255),
    email_body TEXT,
    include_inline_preview BOOLEAN DEFAULT true,

    -- Status
    last_sent_at TIMESTAMPTZ,
    next_scheduled_at TIMESTAMPTZ,
    send_count INTEGER DEFAULT 0,
    last_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_studio_scheduled_reports_dashboard_id ON studio_scheduled_reports(dashboard_id);
CREATE INDEX idx_studio_scheduled_reports_active ON studio_scheduled_reports(is_active) WHERE is_active = true;
CREATE INDEX idx_studio_scheduled_reports_next ON studio_scheduled_reports(next_scheduled_at);

-- Enable RLS
ALTER TABLE studio_scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY studio_scheduled_reports_policy ON studio_scheduled_reports
    FOR ALL USING (dashboard_id IN (
        SELECT id FROM studio_dashboards WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- ============================================================================
-- SEED DEFAULT TEMPLATES
-- ============================================================================
INSERT INTO studio_templates (name, description, thumbnail, category, required_sources, config, is_premium) VALUES
(
    'Marketing Overview',
    'High-level marketing performance across all ad platforms',
    NULL,
    'marketing',
    '["meta_ads", "google_ads"]',
    '{"widgets": []}',
    false
),
(
    'E-commerce Sales Dashboard',
    'Track sales, revenue, and product performance',
    NULL,
    'ecommerce',
    '["conversions", "products"]',
    '{"widgets": []}',
    false
),
(
    'Lead Generation Tracker',
    'Monitor lead funnel and conversion rates',
    NULL,
    'leads',
    '["conversions", "visitors"]',
    '{"widgets": []}',
    false
),
(
    'Agency Client Report',
    'Professional client-facing report with branding',
    NULL,
    'reporting',
    '["meta_ads", "google_ads", "conversions"]',
    '{"widgets": []}',
    true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE studio_dashboards IS 'Custom dashboard definitions with layout, settings, and sharing options.';
COMMENT ON TABLE studio_widgets IS 'Individual widgets within dashboards with data source and visualization config.';
COMMENT ON TABLE studio_data_sources IS 'External data connections (CSV, Google Sheets, APIs) for dashboard widgets.';
COMMENT ON TABLE studio_templates IS 'Pre-built dashboard templates users can clone.';
COMMENT ON TABLE studio_scheduled_reports IS 'Automated report delivery schedules with email configuration.';
COMMENT ON COLUMN studio_widgets.formula IS 'Calculation formula for derived metrics. Use {{field_name}} for references.';
-- Migration: 00018_ad_goals_alerts.sql
-- Description: Add ad performance goals, alerts, and budget pacing tables
-- Created: 2026-04-13
-- Updated: 2026-04-14 - Simplified to single-metric design

-- ============================================================================
-- AD GOALS TABLE
-- Performance targets with single metric focus
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,  -- null = all accounts
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,      -- null = all campaigns

    -- Goal Info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Metric & Target
    metric VARCHAR(50) NOT NULL,                -- spend, revenue, conversions, roas, ctr, cpa, impressions, clicks, leads
    target_value DECIMAL(15, 2) NOT NULL,       -- Target value (micros for currency, raw for counts/percentages)
    current_value DECIMAL(15, 2) DEFAULT 0,     -- Current progress value
    progress_pct DECIMAL(5, 2) DEFAULT 0,       -- Progress percentage (0-100+)

    -- Period
    period_type VARCHAR(20) NOT NULL DEFAULT 'monthly',  -- daily, weekly, monthly, quarterly, custom
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Platform Filter
    platform VARCHAR(20),                       -- google, meta (null = all)

    -- Status
    status VARCHAR(20) DEFAULT 'not_started',   -- not_started, in_progress, on_track, at_risk, behind, achieved, failed
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_goals_org_id ON ad_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_ad_goals_account_id ON ad_goals(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_goals_period ON ad_goals(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_ad_goals_active ON ad_goals(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ad_goals_status ON ad_goals(status);

-- Enable RLS
ALTER TABLE ad_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ad_goals_org_policy ON ad_goals;
CREATE POLICY ad_goals_org_policy ON ad_goals
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- AD ALERTS TABLE
-- Threshold-based alert rules with flexible notification channels
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,  -- null = all accounts
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,      -- null = all campaigns

    -- Alert Info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Condition
    metric VARCHAR(50) NOT NULL,                -- spend, cpl, cpa, roas, ctr, conversions, impressions, clicks
    condition VARCHAR(20) NOT NULL,             -- above, below, increases_by, decreases_by, equals
    threshold DECIMAL(15, 2) NOT NULL,          -- Threshold value

    -- Time Window
    time_window VARCHAR(20) DEFAULT 'day',      -- hour, day, week, month

    -- Platform Filter
    platform VARCHAR(20),                       -- google, meta (null = all)

    -- Notification Settings (JSONB array for flexibility)
    notification_channels JSONB DEFAULT '["email", "in_app"]',  -- ["email", "slack", "sms", "in_app"]

    -- Frequency Control
    check_frequency VARCHAR(20) DEFAULT 'hourly',  -- hourly, daily
    cooldown_minutes INTEGER DEFAULT 60,        -- Min minutes between alerts for same rule
    max_alerts_per_day INTEGER DEFAULT 10,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_muted BOOLEAN DEFAULT false,
    muted_until TIMESTAMPTZ,

    -- Stats
    alerts_today INTEGER DEFAULT 0,
    last_checked_at TIMESTAMPTZ,
    last_triggered_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_alerts_org_id ON ad_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_ad_alerts_account_id ON ad_alerts(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_alerts_metric ON ad_alerts(metric);
CREATE INDEX IF NOT EXISTS idx_ad_alerts_active ON ad_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ad_alerts_check_freq ON ad_alerts(check_frequency);

-- Enable RLS
ALTER TABLE ad_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ad_alerts_org_policy ON ad_alerts;
CREATE POLICY ad_alerts_org_policy ON ad_alerts
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- ALERT HISTORY TABLE
-- Log of triggered alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES ad_alerts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Alert Info (snapshot at trigger time)
    alert_name VARCHAR(255) NOT NULL,
    metric VARCHAR(50) NOT NULL,
    condition VARCHAR(20) NOT NULL,
    threshold DECIMAL(15, 2) NOT NULL,

    -- Triggered Values
    triggered_value DECIMAL(15, 2) NOT NULL,    -- Value that triggered the alert
    previous_value DECIMAL(15, 2),              -- Previous value for comparison
    change_pct DECIMAL(8, 2),                   -- % change if applicable

    -- Severity & Message
    severity VARCHAR(20) DEFAULT 'warning',     -- info, warning, critical
    message TEXT NOT NULL,

    -- Notification
    notification_channels JSONB DEFAULT '[]',
    notification_sent BOOLEAN DEFAULT false,

    -- User Actions
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id),
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    notes TEXT,

    -- Timestamps
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_org_id ON alert_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON alert_history(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_acknowledged ON alert_history(acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_alert_history_severity ON alert_history(severity);

-- Enable RLS
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alert_history_org_policy ON alert_history;
CREATE POLICY alert_history_org_policy ON alert_history
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- BUDGET PACING TABLE
-- Track monthly budget utilization
-- ============================================================================
CREATE TABLE IF NOT EXISTS budget_pacing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,  -- null = overall
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,      -- null = account level

    -- Budget Info
    name VARCHAR(255),
    platform VARCHAR(20),                       -- google, meta (null = all)

    -- Period
    period VARCHAR(7) NOT NULL,                 -- 'YYYY-MM' format

    -- Budget & Spend
    monthly_budget_micros BIGINT NOT NULL,
    total_spent_micros BIGINT DEFAULT 0,
    daily_target_micros BIGINT DEFAULT 0,       -- monthly / days in month

    -- Pacing
    current_pacing_pct DECIMAL(5, 2) DEFAULT 0, -- % of budget spent
    ideal_pacing_pct DECIMAL(5, 2) DEFAULT 0,   -- Expected % based on days elapsed
    days_remaining INTEGER DEFAULT 0,
    projected_spend_micros BIGINT DEFAULT 0,    -- Projected end-of-month spend

    -- Status
    status VARCHAR(20) DEFAULT 'on_track',      -- on_track, over_pace, under_pace, critical_over, critical_under

    -- Alert Settings
    alert_threshold_pct INTEGER DEFAULT 80,     -- Alert when this % of budget used
    alert_sent BOOLEAN DEFAULT false,

    -- Timestamps
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT budget_pacing_unique UNIQUE(organization_id, ad_account_id, campaign_id, period)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_pacing_org_id ON budget_pacing(organization_id);
CREATE INDEX IF NOT EXISTS idx_budget_pacing_account_id ON budget_pacing(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_budget_pacing_period ON budget_pacing(period);
CREATE INDEX IF NOT EXISTS idx_budget_pacing_status ON budget_pacing(status);

-- Enable RLS
ALTER TABLE budget_pacing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS budget_pacing_org_policy ON budget_pacing;
CREATE POLICY budget_pacing_org_policy ON budget_pacing
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- DEMO DATA
-- Insert sample goals, alerts, and budget pacing for testing
-- ============================================================================

-- Insert demo goals (if demo org exists)
INSERT INTO ad_goals (organization_id, name, description, metric, target_value, current_value, progress_pct, period_type, period_start, period_end, status, is_active)
SELECT
    o.id,
    'Q2 Revenue Target',
    'Reach $50,000 in attributed revenue this quarter',
    'revenue',
    50000000000,  -- $50,000 in micros
    32500000000,  -- $32,500 current
    65.00,
    'quarterly',
    '2026-04-01',
    '2026-06-30',
    'on_track',
    true
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ad_goals (organization_id, name, description, metric, target_value, current_value, progress_pct, period_type, period_start, period_end, status, is_active)
SELECT
    o.id,
    'April Conversions',
    'Get 500 conversions this month',
    'conversions',
    500,
    287,
    57.40,
    'monthly',
    '2026-04-01',
    '2026-04-30',
    'at_risk',
    true
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ad_goals (organization_id, name, description, metric, target_value, current_value, progress_pct, period_type, period_start, period_end, status, is_active)
SELECT
    o.id,
    'Maintain ROAS Above 3.0',
    'Keep blended ROAS at or above 3.0x',
    'roas',
    3.00,
    3.42,
    100.00,
    'monthly',
    '2026-04-01',
    '2026-04-30',
    'achieved',
    true
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert demo alerts
INSERT INTO ad_alerts (organization_id, name, description, metric, condition, threshold, time_window, notification_channels, check_frequency, cooldown_minutes, is_active)
SELECT
    o.id,
    'High Spend Alert',
    'Alert when daily spend exceeds $500',
    'spend',
    'above',
    500000000,  -- $500 in micros
    'day',
    '["email", "in_app"]',
    'hourly',
    120,
    true
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ad_alerts (organization_id, name, description, metric, condition, threshold, time_window, notification_channels, check_frequency, cooldown_minutes, is_active)
SELECT
    o.id,
    'Low ROAS Warning',
    'Alert when ROAS drops below 2.0',
    'roas',
    'below',
    2.00,
    'day',
    '["email", "slack", "in_app"]',
    'daily',
    1440,
    true
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ad_alerts (organization_id, name, description, metric, condition, threshold, time_window, notification_channels, check_frequency, cooldown_minutes, is_active)
SELECT
    o.id,
    'CPA Spike Alert',
    'Alert when CPA increases by more than 25%',
    'cpa',
    'increases_by',
    25.00,
    'day',
    '["email", "in_app"]',
    'hourly',
    60,
    true
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert demo alert history
INSERT INTO alert_history (alert_id, organization_id, alert_name, metric, condition, threshold, triggered_value, previous_value, change_pct, severity, message, notification_channels, notification_sent, triggered_at)
SELECT
    a.id,
    a.organization_id,
    a.name,
    a.metric,
    a.condition,
    a.threshold,
    CASE
        WHEN a.metric = 'spend' THEN 625000000  -- $625
        WHEN a.metric = 'roas' THEN 1.85
        ELSE 32.50
    END,
    CASE
        WHEN a.metric = 'spend' THEN 450000000
        WHEN a.metric = 'roas' THEN 2.45
        ELSE 26.00
    END,
    CASE
        WHEN a.metric = 'spend' THEN 38.89
        WHEN a.metric = 'roas' THEN -24.49
        ELSE 25.00
    END,
    CASE
        WHEN a.metric = 'roas' THEN 'critical'
        ELSE 'warning'
    END,
    CASE
        WHEN a.metric = 'spend' THEN 'Daily spend ($625) exceeded threshold ($500)'
        WHEN a.metric = 'roas' THEN 'ROAS dropped to 1.85, below threshold of 2.0'
        ELSE 'CPA increased by 25% from $26.00 to $32.50'
    END,
    a.notification_channels,
    true,
    NOW() - INTERVAL '2 hours'
FROM ad_alerts a
WHERE a.organization_id IN (
    SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%'
)
LIMIT 3
ON CONFLICT DO NOTHING;

-- Insert demo budget pacing
INSERT INTO budget_pacing (organization_id, name, period, monthly_budget_micros, total_spent_micros, daily_target_micros, current_pacing_pct, ideal_pacing_pct, days_remaining, projected_spend_micros, status)
SELECT
    o.id,
    'Overall Ad Budget',
    to_char(NOW(), 'YYYY-MM'),
    15000000000,  -- $15,000 monthly budget
    6750000000,   -- $6,750 spent so far
    500000000,    -- $500/day target
    45.00,
    46.67,        -- 14/30 days = 46.67%
    16,
    14850000000,  -- Projected $14,850
    'on_track'
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO budget_pacing (organization_id, name, platform, period, monthly_budget_micros, total_spent_micros, daily_target_micros, current_pacing_pct, ideal_pacing_pct, days_remaining, projected_spend_micros, status)
SELECT
    o.id,
    'Google Ads Budget',
    'google',
    to_char(NOW(), 'YYYY-MM'),
    10000000000,  -- $10,000 monthly
    5200000000,   -- $5,200 spent
    333333333,    -- ~$333/day
    52.00,
    46.67,
    16,
    11400000000,  -- Projected $11,400 (over)
    'over_pace'
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO budget_pacing (organization_id, name, platform, period, monthly_budget_micros, total_spent_micros, daily_target_micros, current_pacing_pct, ideal_pacing_pct, days_remaining, projected_spend_micros, status)
SELECT
    o.id,
    'Meta Ads Budget',
    'meta',
    to_char(NOW(), 'YYYY-MM'),
    5000000000,   -- $5,000 monthly
    1550000000,   -- $1,550 spent
    166666667,    -- ~$167/day
    31.00,
    46.67,
    16,
    3410000000,   -- Projected $3,410 (under)
    'under_pace'
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE ad_goals IS 'Performance targets for ad accounts with single metric focus and automatic progress tracking.';
COMMENT ON TABLE ad_alerts IS 'Threshold-based alert rules with flexible multi-channel notifications.';
COMMENT ON TABLE alert_history IS 'Log of triggered alerts with acknowledgment and resolution tracking.';
COMMENT ON TABLE budget_pacing IS 'Monthly budget utilization tracking with pacing analysis.';
COMMENT ON COLUMN ad_goals.metric IS 'Single metric to track: spend, revenue, conversions, roas, ctr, cpa, impressions, clicks, leads';
COMMENT ON COLUMN ad_goals.status IS 'Goal status: not_started, in_progress, on_track, at_risk, behind, achieved, failed';
COMMENT ON COLUMN ad_alerts.notification_channels IS 'JSONB array of channels: email, slack, sms, in_app';
COMMENT ON COLUMN budget_pacing.status IS 'Pacing status: on_track, over_pace, under_pace, critical_over, critical_under';
-- Migration: 00019_tracking_pixels.sql
-- Description: Add tracking pixel configurations (Meta Pixel, GA4, Google Ads, TikTok, LinkedIn)
-- Created: 2026-04-13

-- ============================================================================
-- TRACKING PIXELS TABLE
-- Configuration for ad platform pixels and server-side APIs
-- ============================================================================
CREATE TABLE IF NOT EXISTS tracking_pixels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ================================
    -- META (FACEBOOK) PIXEL
    -- ================================
    -- Primary Pixel
    meta_pixel_id VARCHAR(50),              -- e.g., '1234567890'
    meta_access_token TEXT,                 -- Long-lived access token for CAPI
    meta_test_event_code VARCHAR(50),       -- For testing (e.g., 'TEST12345')

    -- Additional Pixels (for agencies managing multiple pixels)
    meta_pixel_id_2 VARCHAR(50),
    meta_pixel_id_3 VARCHAR(50),

    -- Meta Settings
    enable_meta_pixel BOOLEAN DEFAULT false,
    enable_meta_capi BOOLEAN DEFAULT false,  -- Conversions API
    meta_capi_dedup BOOLEAN DEFAULT true,    -- Deduplicate browser + server events

    -- ================================
    -- GOOGLE ANALYTICS 4
    -- ================================
    ga4_measurement_id VARCHAR(50),         -- e.g., 'G-XXXXXXXXXX'
    ga4_api_secret VARCHAR(100),            -- For Measurement Protocol (server-side)

    enable_ga4 BOOLEAN DEFAULT false,
    enable_ga4_server_side BOOLEAN DEFAULT false,

    -- ================================
    -- GOOGLE ADS
    -- ================================
    google_ads_id VARCHAR(50),              -- e.g., 'AW-1234567890'
    google_ads_conversion_label VARCHAR(100),  -- Default conversion label

    -- Per-event conversion labels
    google_ads_labels JSONB DEFAULT '{
        "lead": null,
        "purchase": null,
        "signup": null,
        "add_to_cart": null,
        "initiate_checkout": null,
        "contact": null
    }',

    enable_google_ads BOOLEAN DEFAULT false,
    enable_google_enhanced_conversions BOOLEAN DEFAULT true,

    -- ================================
    -- TIKTOK PIXEL
    -- ================================
    tiktok_pixel_id VARCHAR(50),
    tiktok_access_token TEXT,               -- For Events API (server-side)

    enable_tiktok BOOLEAN DEFAULT false,
    enable_tiktok_server_side BOOLEAN DEFAULT false,

    -- ================================
    -- LINKEDIN INSIGHT TAG
    -- ================================
    linkedin_partner_id VARCHAR(50),
    linkedin_conversion_ids JSONB DEFAULT '{}',  -- {event_type: conversion_id}

    enable_linkedin BOOLEAN DEFAULT false,

    -- ================================
    -- PINTEREST TAG
    -- ================================
    pinterest_tag_id VARCHAR(50),
    pinterest_access_token TEXT,

    enable_pinterest BOOLEAN DEFAULT false,

    -- ================================
    -- MICROSOFT ADS (UET TAG)
    -- ================================
    microsoft_uet_id VARCHAR(50),           -- UET Tag ID
    microsoft_conversion_goals JSONB DEFAULT '{}',  -- {event_type: goal_id}

    enable_microsoft BOOLEAN DEFAULT false,

    -- ================================
    -- EVENT MAPPING
    -- ================================
    -- Map internal event types to platform-specific events
    event_mapping JSONB DEFAULT '{
        "lead": {"meta": "Lead", "ga4": "generate_lead", "google_ads": true, "tiktok": "SubmitForm"},
        "purchase": {"meta": "Purchase", "ga4": "purchase", "google_ads": true, "tiktok": "CompletePayment"},
        "signup": {"meta": "CompleteRegistration", "ga4": "sign_up", "google_ads": true, "tiktok": "CompleteRegistration"},
        "add_to_cart": {"meta": "AddToCart", "ga4": "add_to_cart", "google_ads": false, "tiktok": "AddToCart"},
        "initiate_checkout": {"meta": "InitiateCheckout", "ga4": "begin_checkout", "google_ads": false, "tiktok": "InitiateCheckout"},
        "contact": {"meta": "Contact", "ga4": "contact", "google_ads": true, "tiktok": "Contact"},
        "phone_call": {"meta": "Contact", "ga4": "contact", "google_ads": true, "tiktok": "Contact"},
        "form_submit": {"meta": "Lead", "ga4": "generate_lead", "google_ads": true, "tiktok": "SubmitForm"},
        "page_view": {"meta": "PageView", "ga4": "page_view", "google_ads": false, "tiktok": "ViewContent"},
        "view_content": {"meta": "ViewContent", "ga4": "view_item", "google_ads": false, "tiktok": "ViewContent"},
        "search": {"meta": "Search", "ga4": "search", "google_ads": false, "tiktok": "Search"},
        "add_payment_info": {"meta": "AddPaymentInfo", "ga4": "add_payment_info", "google_ads": false, "tiktok": "AddPaymentInfo"},
        "subscribe": {"meta": "Subscribe", "ga4": "sign_up", "google_ads": true, "tiktok": "Subscribe"}
    }',

    -- ================================
    -- SITE CONFIGURATION
    -- ================================
    -- Site type determines default event capture behavior
    site_type VARCHAR(50) DEFAULT 'leadgen',  -- leadgen, ecommerce, ecommerce_leadgen, saas
    ecommerce_platform VARCHAR(50),           -- woocommerce, shopify, magento, bigcommerce, custom

    -- ================================
    -- ADVANCED SETTINGS
    -- ================================
    -- Privacy & Consent
    respect_dnt BOOLEAN DEFAULT false,        -- Respect Do Not Track header
    require_consent BOOLEAN DEFAULT false,    -- Require cookie consent before tracking
    consent_mode VARCHAR(20) DEFAULT 'granted',  -- granted, denied, pending

    -- Data Enhancement
    enhanced_conversions BOOLEAN DEFAULT true,  -- Send hashed PII for better matching
    auto_capture_forms BOOLEAN DEFAULT true,    -- Auto-capture form submissions
    auto_capture_clicks BOOLEAN DEFAULT true,   -- Auto-capture button/link clicks
    auto_capture_ecommerce BOOLEAN DEFAULT true,  -- Auto-capture dataLayer events

    -- Debug
    debug_mode BOOLEAN DEFAULT false,           -- Console log all pixel fires

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One config per organization
    CONSTRAINT tracking_pixels_org_unique UNIQUE(organization_id)
);

-- Indexes
CREATE INDEX idx_tracking_pixels_org_id ON tracking_pixels(organization_id);

-- Enable RLS
ALTER TABLE tracking_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY tracking_pixels_org_policy ON tracking_pixels
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- PIXEL FIRE LOGS TABLE
-- Debug log of pixel fires (optional, for debugging)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pixel_fire_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Event Info
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255),
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    conversion_id UUID REFERENCES offline_conversions(id) ON DELETE SET NULL,

    -- Pixels Fired
    platforms_fired JSONB DEFAULT '[]',     -- ['meta', 'ga4', 'google_ads']

    -- Request/Response (for debugging)
    request_payload JSONB,
    response_status INTEGER,
    response_body TEXT,

    -- Status
    status VARCHAR(20) NOT NULL,            -- success, partial, failed
    error_message TEXT,

    -- Timing
    fired_at TIMESTAMPTZ DEFAULT NOW(),
    duration_ms INTEGER
);

-- Indexes
CREATE INDEX idx_pixel_fire_logs_org_id ON pixel_fire_logs(organization_id);
CREATE INDEX idx_pixel_fire_logs_fired_at ON pixel_fire_logs(fired_at DESC);
CREATE INDEX idx_pixel_fire_logs_status ON pixel_fire_logs(status);

-- Retention: Auto-delete after 7 days (should be done via cron job)
COMMENT ON TABLE pixel_fire_logs IS 'Debug log of pixel fires. Retain for 7 days maximum.';

-- Enable RLS
ALTER TABLE pixel_fire_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pixel_fire_logs_org_policy ON pixel_fire_logs
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE tracking_pixels IS 'Configuration for all tracking pixels (Meta, GA4, Google Ads, TikTok, LinkedIn, Microsoft).';
COMMENT ON COLUMN tracking_pixels.meta_access_token IS 'Long-lived access token for Meta Conversions API. Refresh every 60 days.';
COMMENT ON COLUMN tracking_pixels.event_mapping IS 'Maps internal event types to platform-specific event names.';
COMMENT ON COLUMN tracking_pixels.site_type IS 'leadgen: forms/clicks, ecommerce: purchases/carts, ecommerce_leadgen: both, saas: trials/signups';
COMMENT ON COLUMN tracking_pixels.enhanced_conversions IS 'Send hashed PII (email, phone) for better cross-device attribution.';
-- Migration: 00020_outgoing_webhooks.sql
-- Description: Add outgoing webhooks for sending data to external systems
-- Created: 2026-04-13

-- ============================================================================
-- OUTGOING WEBHOOKS TABLE
-- Send conversion/visitor data to external systems
-- ============================================================================
CREATE TABLE IF NOT EXISTS outgoing_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Webhook Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT NOT NULL,                      -- Webhook endpoint URL

    -- Authentication
    auth_type VARCHAR(20) DEFAULT 'none',   -- none, api_key, bearer, basic, hmac
    auth_header VARCHAR(100),               -- Header name (e.g., 'X-API-Key', 'Authorization')
    auth_value_encrypted TEXT,              -- Encrypted auth value (API key, token)
    hmac_secret VARCHAR(255),               -- Secret for HMAC signature

    -- Request Configuration
    method VARCHAR(10) DEFAULT 'POST',      -- POST, PUT, PATCH
    content_type VARCHAR(50) DEFAULT 'application/json',
    headers JSONB DEFAULT '{}',             -- Additional headers

    -- Events to Trigger
    trigger_events JSONB NOT NULL DEFAULT '["conversion.created"]',
    -- Available events:
    -- conversion.created, conversion.updated, conversion.synced
    -- visitor.created, visitor.identified
    -- lead.status_changed

    -- Filters
    filters JSONB DEFAULT '{}',             -- {conversion_type: ['lead', 'purchase'], source: ['website']}

    -- Payload Template (null = default payload)
    payload_template JSONB,                 -- Custom payload mapping

    -- Retry Configuration
    retry_enabled BOOLEAN DEFAULT true,
    max_retries INTEGER DEFAULT 3,
    retry_interval_seconds INTEGER DEFAULT 60,  -- Initial retry interval
    retry_backoff VARCHAR(20) DEFAULT 'exponential',  -- linear, exponential

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Stats
    total_deliveries INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    last_error TEXT,
    avg_response_time_ms INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_outgoing_webhooks_org_id ON outgoing_webhooks(organization_id);
CREATE INDEX idx_outgoing_webhooks_active ON outgoing_webhooks(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE outgoing_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY outgoing_webhooks_org_policy ON outgoing_webhooks
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- WEBHOOK DELIVERIES TABLE
-- Log of each webhook delivery attempt
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES outgoing_webhooks(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Event Info
    event_type VARCHAR(100) NOT NULL,       -- conversion.created, etc.
    event_id UUID,                          -- ID of the triggering record
    payload JSONB NOT NULL,                 -- Actual payload sent

    -- Delivery Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, success, failed, retrying
    attempt INTEGER DEFAULT 1,

    -- Response
    response_status_code INTEGER,
    response_headers JSONB,
    response_body TEXT,
    response_time_ms INTEGER,

    -- Retry Info
    next_retry_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,

    -- Error
    error_type VARCHAR(50),                 -- timeout, connection_error, http_error, parse_error
    error_message TEXT,

    -- Timestamps
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_org_id ON webhook_deliveries(organization_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_queued_at ON webhook_deliveries(queued_at DESC);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at)
    WHERE status = 'retrying' AND next_retry_at IS NOT NULL;

-- Enable RLS
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_deliveries_org_policy ON webhook_deliveries
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- WEBHOOK TEMPLATES TABLE
-- Pre-built webhook configurations for popular integrations
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),                       -- Icon name or URL
    category VARCHAR(50) NOT NULL,          -- crm, automation, analytics, marketing, custom

    -- Target Platform
    platform VARCHAR(100),                  -- zapier, make, n8n, slack, discord, custom

    -- Default Configuration
    default_url TEXT,
    default_headers JSONB DEFAULT '{}',
    default_auth_type VARCHAR(20) DEFAULT 'none',
    default_payload_template JSONB,

    -- Instructions
    setup_instructions TEXT,
    documentation_url TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed webhook templates
INSERT INTO webhook_templates (name, description, icon, category, platform, setup_instructions) VALUES
(
    'Zapier Webhook',
    'Send data to Zapier for automation workflows',
    'zap',
    'automation',
    'zapier',
    'Create a new Zap with "Webhooks by Zapier" as the trigger. Copy the webhook URL and paste it here.'
),
(
    'Make (Integromat)',
    'Connect to Make scenarios',
    'code',
    'automation',
    'make',
    'Create a new scenario with "Webhooks" module. Copy the webhook URL and paste it here.'
),
(
    'Slack Notification',
    'Send conversion notifications to Slack',
    'slack',
    'marketing',
    'slack',
    'Create an Incoming Webhook in your Slack workspace settings. Copy the webhook URL.'
),
(
    'Discord Notification',
    'Send notifications to Discord channel',
    'discord',
    'marketing',
    'discord',
    'Create a webhook in your Discord channel settings. Copy the webhook URL.'
),
(
    'Google Sheets',
    'Append rows to Google Sheets via Apps Script',
    'sheet',
    'analytics',
    'google_sheets',
    'Deploy a Google Apps Script web app that accepts POST requests and appends to your sheet.'
),
(
    'Custom Webhook',
    'Send to any HTTP endpoint',
    'webhook',
    'custom',
    'custom',
    'Enter your webhook URL. Configure authentication and payload mapping as needed.'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTION: Update Webhook Stats
-- ============================================================================
CREATE OR REPLACE FUNCTION update_webhook_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'success' THEN
        UPDATE outgoing_webhooks SET
            total_deliveries = total_deliveries + 1,
            success_count = success_count + 1,
            last_triggered_at = NEW.completed_at,
            last_success_at = NEW.completed_at,
            avg_response_time_ms = CASE
                WHEN avg_response_time_ms IS NULL THEN NEW.response_time_ms
                ELSE (avg_response_time_ms + NEW.response_time_ms) / 2
            END,
            updated_at = NOW()
        WHERE id = NEW.webhook_id;
    ELSIF NEW.status = 'failed' AND NEW.retry_count >= (
        SELECT max_retries FROM outgoing_webhooks WHERE id = NEW.webhook_id
    ) THEN
        UPDATE outgoing_webhooks SET
            total_deliveries = total_deliveries + 1,
            failure_count = failure_count + 1,
            last_triggered_at = NEW.completed_at,
            last_failure_at = NEW.completed_at,
            last_error = NEW.error_message,
            updated_at = NOW()
        WHERE id = NEW.webhook_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webhook_stats
    AFTER UPDATE OF status ON webhook_deliveries
    FOR EACH ROW
    WHEN (NEW.status IN ('success', 'failed'))
    EXECUTE FUNCTION update_webhook_stats();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE outgoing_webhooks IS 'Webhooks to send conversion/visitor data to external systems (Zapier, Make, Slack, etc.).';
COMMENT ON TABLE webhook_deliveries IS 'Log of each webhook delivery attempt with status, response, and retry info.';
COMMENT ON TABLE webhook_templates IS 'Pre-built webhook configurations for popular integrations.';
COMMENT ON COLUMN outgoing_webhooks.auth_value_encrypted IS 'Encrypted API key or token. Decrypt before sending.';
COMMENT ON COLUMN outgoing_webhooks.hmac_secret IS 'Secret for HMAC-SHA256 signature. Sent in X-Signature header.';
COMMENT ON COLUMN outgoing_webhooks.payload_template IS 'Custom payload mapping. Use {{field}} for placeholders.';
-- Migration: 00021_google_sheets_sync.sql
-- Description: Add Google Sheets sync for exporting conversions to spreadsheets
-- Created: 2026-04-13

-- ============================================================================
-- GOOGLE SHEETS SYNC TABLE
-- Configuration for syncing conversions to Google Sheets
-- ============================================================================
CREATE TABLE IF NOT EXISTS google_sheets_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Sheet Info
    name VARCHAR(255) NOT NULL,             -- User-friendly name
    sheet_url TEXT NOT NULL,                -- Full Google Sheet URL
    spreadsheet_id VARCHAR(255) NOT NULL,   -- Extracted spreadsheet ID
    sheet_name VARCHAR(255) DEFAULT 'Sheet1',  -- Tab/sheet name
    sheet_gid VARCHAR(50),                  -- Sheet GID (for multi-tab sheets)

    -- Format
    format VARCHAR(50) DEFAULT 'default',   -- default, google_ads, meta, microsoft, custom
    -- default: createdAt, type, email, phone, name, value, source
    -- google_ads: Google Ads offline conversion format
    -- meta: Meta CAPI format
    -- microsoft: Microsoft Ads format
    -- custom: User-defined columns

    -- Timezone for date formatting
    timezone VARCHAR(10) DEFAULT '+0000',   -- Offset format: '+0500', '-0800'

    -- What to sync
    sync_on_events JSONB DEFAULT '["conversion.created"]',
    conversion_types JSONB DEFAULT '[]',    -- Empty = all types, otherwise filter

    -- Column Configuration (for custom format)
    columns JSONB DEFAULT '[
        "occurred_at",
        "conversion_type",
        "email",
        "phone",
        "first_name",
        "last_name",
        "value_micros",
        "currency",
        "source",
        "gclid",
        "fbclid"
    ]',

    -- Column Headers (custom header names)
    column_headers JSONB DEFAULT '{}',      -- {"occurred_at": "Date", "value_micros": "Revenue"}

    -- Value Formatting
    format_micros_as_currency BOOLEAN DEFAULT true,  -- Convert micros to decimal
    date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD HH:mm:ss',

    -- Sync Settings
    is_active BOOLEAN DEFAULT true,
    append_new_rows BOOLEAN DEFAULT true,   -- Append to bottom (vs overwrite)
    include_headers BOOLEAN DEFAULT true,   -- Add header row if sheet is empty
    start_row INTEGER DEFAULT 1,            -- Starting row for data

    -- OAuth Credentials (encrypted)
    credentials_encrypted TEXT,             -- Service account JSON or OAuth tokens

    -- Stats
    total_rows_synced INTEGER DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),           -- success, partial, failed
    last_sync_rows INTEGER DEFAULT 0,
    last_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_google_sheets_sync_org_id ON google_sheets_sync(organization_id);
CREATE INDEX idx_google_sheets_sync_active ON google_sheets_sync(is_active) WHERE is_active = true;
CREATE INDEX idx_google_sheets_sync_spreadsheet ON google_sheets_sync(spreadsheet_id);

-- Enable RLS
ALTER TABLE google_sheets_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY google_sheets_sync_org_policy ON google_sheets_sync
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- GOOGLE SHEETS SYNC LOG TABLE
-- Log of sync operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS google_sheets_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_config_id UUID NOT NULL REFERENCES google_sheets_sync(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Sync Info
    sync_type VARCHAR(20) NOT NULL,         -- realtime, manual, scheduled
    status VARCHAR(20) NOT NULL,            -- started, success, partial, failed

    -- Stats
    rows_attempted INTEGER DEFAULT 0,
    rows_synced INTEGER DEFAULT 0,
    rows_failed INTEGER DEFAULT 0,

    -- Error Details
    error_details JSONB DEFAULT '[]',

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
);

-- Indexes
CREATE INDEX idx_google_sheets_sync_log_config ON google_sheets_sync_log(sync_config_id);
CREATE INDEX idx_google_sheets_sync_log_org ON google_sheets_sync_log(organization_id);
CREATE INDEX idx_google_sheets_sync_log_started ON google_sheets_sync_log(started_at DESC);

-- Enable RLS
ALTER TABLE google_sheets_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY google_sheets_sync_log_org_policy ON google_sheets_sync_log
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- SEARCH CONSOLE INTEGRATION TABLE
-- Google Search Console data sync
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_console_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Site Info
    site_url TEXT NOT NULL,                 -- e.g., 'https://example.com' or 'sc-domain:example.com'
    site_type VARCHAR(20) DEFAULT 'url_prefix',  -- url_prefix, domain

    -- OAuth Credentials
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,

    -- Sync Settings
    is_active BOOLEAN DEFAULT true,
    sync_frequency VARCHAR(20) DEFAULT 'daily',  -- daily, weekly
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),
    last_error TEXT,

    -- Data Range
    date_range_days INTEGER DEFAULT 90,     -- How many days of data to fetch

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT search_console_org_site_unique UNIQUE(organization_id, site_url)
);

-- Indexes
CREATE INDEX idx_search_console_org_id ON search_console_integrations(organization_id);
CREATE INDEX idx_search_console_active ON search_console_integrations(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE search_console_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY search_console_org_policy ON search_console_integrations
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- SEARCH CONSOLE DATA TABLE
-- Cached Search Console performance data
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_console_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES search_console_integrations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Date
    date DATE NOT NULL,

    -- Query/Page (dimension)
    query TEXT,
    page TEXT,
    device VARCHAR(20),                     -- DESKTOP, MOBILE, TABLET
    country VARCHAR(3),

    -- Metrics
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    ctr DECIMAL(5, 4),                      -- Click-through rate (0.0000 - 1.0000)
    position DECIMAL(6, 2),                 -- Average position

    -- Timestamps
    fetched_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique per day/query/page combination
    CONSTRAINT search_console_data_unique UNIQUE(integration_id, date, query, page, device, country)
);

-- Indexes
CREATE INDEX idx_search_console_data_integration ON search_console_data(integration_id);
CREATE INDEX idx_search_console_data_org ON search_console_data(organization_id);
CREATE INDEX idx_search_console_data_date ON search_console_data(date DESC);
CREATE INDEX idx_search_console_data_query ON search_console_data(query);
CREATE INDEX idx_search_console_data_page ON search_console_data(page);

-- Enable RLS
ALTER TABLE search_console_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY search_console_data_org_policy ON search_console_data
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- GA4 SERVER-SIDE EVENTS TABLE
-- Log of GA4 Measurement Protocol events sent
-- ============================================================================
CREATE TABLE IF NOT EXISTS ga4_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Event Info
    event_name VARCHAR(100) NOT NULL,
    client_id VARCHAR(255),
    user_id VARCHAR(255),
    conversion_id UUID REFERENCES offline_conversions(id) ON DELETE SET NULL,

    -- Payload
    payload JSONB NOT NULL,

    -- Response
    status VARCHAR(20) NOT NULL,            -- success, failed
    response_code INTEGER,
    error_message TEXT,

    -- Timestamps
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ga4_events_log_org ON ga4_events_log(organization_id);
CREATE INDEX idx_ga4_events_log_sent_at ON ga4_events_log(sent_at DESC);
CREATE INDEX idx_ga4_events_log_event ON ga4_events_log(event_name);
CREATE INDEX idx_ga4_events_log_status ON ga4_events_log(status);

-- Retention: Keep for 30 days (implement via cron job)
COMMENT ON TABLE ga4_events_log IS 'Log of GA4 Measurement Protocol events. Retain for 30 days.';

-- Enable RLS
ALTER TABLE ga4_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ga4_events_log_org_policy ON ga4_events_log
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE google_sheets_sync IS 'Configuration for syncing conversions to Google Sheets in real-time or batch.';
COMMENT ON TABLE google_sheets_sync_log IS 'Log of Google Sheets sync operations with row counts and errors.';
COMMENT ON TABLE search_console_integrations IS 'Google Search Console OAuth connections for fetching search performance data.';
COMMENT ON TABLE search_console_data IS 'Cached Search Console performance data (queries, pages, clicks, impressions).';
COMMENT ON TABLE ga4_events_log IS 'Log of GA4 server-side events sent via Measurement Protocol.';
COMMENT ON COLUMN google_sheets_sync.format IS 'Predefined formats: default (simple), google_ads (offline conversion import), meta (CAPI format), custom.';
COMMENT ON COLUMN google_sheets_sync.timezone IS 'Timezone offset for date formatting. Use format: +0000, -0500, +0530';
-- =====================================================
-- Migration: 00022_domains_cname.sql
-- Description: First-party domains with CNAME verification
-- =====================================================

-- First-party domains for tracking (bypass ad blockers)
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Domain configuration
    domain VARCHAR(255) NOT NULL,              -- e.g., "track.example.com"
    root_domain VARCHAR(255) NOT NULL,         -- e.g., "example.com"
    subdomain VARCHAR(100) NOT NULL,           -- e.g., "track"

    -- Verification
    verification_code VARCHAR(64) NOT NULL,    -- Random code for TXT record verification
    cname_target VARCHAR(255) NOT NULL,        -- Our CNAME target, e.g., "cname.adsmaster.io"

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, verifying, verified, failed, expired
    verification_method VARCHAR(20) NOT NULL DEFAULT 'cname',  -- cname, txt, http

    -- SSL/TLS
    ssl_status VARCHAR(20) DEFAULT 'pending',  -- pending, provisioning, active, failed
    ssl_certificate_id VARCHAR(100),           -- Reference to SSL cert (e.g., Cloudflare cert ID)
    ssl_expires_at TIMESTAMPTZ,

    -- Verification attempts
    last_verification_attempt TIMESTAMPTZ,
    verification_attempts INT DEFAULT 0,
    last_verification_error TEXT,
    verified_at TIMESTAMPTZ,

    -- Usage tracking
    is_active BOOLEAN DEFAULT false,           -- Only verified domains can be active
    request_count BIGINT DEFAULT 0,            -- Total requests through this domain
    last_request_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT domains_domain_unique UNIQUE (domain),
    CONSTRAINT domains_status_check CHECK (status IN ('pending', 'verifying', 'verified', 'failed', 'expired')),
    CONSTRAINT domains_ssl_status_check CHECK (ssl_status IN ('pending', 'provisioning', 'active', 'failed')),
    CONSTRAINT domains_verification_method_check CHECK (verification_method IN ('cname', 'txt', 'http'))
);

-- Indexes for domains
CREATE INDEX IF NOT EXISTS idx_domains_org ON domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
CREATE INDEX IF NOT EXISTS idx_domains_root_domain ON domains(root_domain);
CREATE INDEX IF NOT EXISTS idx_domains_verification_code ON domains(verification_code);

-- Domain verification history
CREATE TABLE IF NOT EXISTS domain_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,

    -- Verification details
    verification_type VARCHAR(20) NOT NULL,    -- cname, txt, http
    status VARCHAR(20) NOT NULL,               -- success, failed, timeout

    -- DNS records found
    dns_records JSONB,                         -- Array of DNS records checked
    expected_value VARCHAR(500),
    actual_value VARCHAR(500),

    -- Error details
    error_code VARCHAR(50),
    error_message TEXT,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_verification_logs_domain ON domain_verification_logs(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_verification_logs_status ON domain_verification_logs(status);
CREATE INDEX IF NOT EXISTS idx_domain_verification_logs_created ON domain_verification_logs(created_at DESC);

-- Domain DNS configuration templates
CREATE TABLE IF NOT EXISTS domain_dns_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template info
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,             -- cloudflare, godaddy, namecheap, route53, etc.

    -- Instructions
    instructions JSONB NOT NULL,               -- Step-by-step setup instructions
    example_records JSONB NOT NULL,            -- Example DNS records

    -- Provider-specific
    provider_docs_url VARCHAR(500),
    estimated_propagation_minutes INT DEFAULT 60,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common DNS provider templates
INSERT INTO domain_dns_templates (name, provider, instructions, example_records, provider_docs_url, estimated_propagation_minutes) VALUES
('Cloudflare', 'cloudflare',
 '[
   {"step": 1, "title": "Log in to Cloudflare", "description": "Go to dash.cloudflare.com and select your domain"},
   {"step": 2, "title": "Go to DNS settings", "description": "Click on DNS in the left sidebar"},
   {"step": 3, "title": "Add CNAME record", "description": "Click Add Record, select CNAME type"},
   {"step": 4, "title": "Configure the record", "description": "Set Name to your subdomain and Target to our CNAME target"},
   {"step": 5, "title": "Disable proxy (important)", "description": "Click the orange cloud to turn it gray (DNS only)"},
   {"step": 6, "title": "Save", "description": "Click Save to add the record"}
 ]'::jsonb,
 '{"type": "CNAME", "name": "track", "target": "cname.adsmaster.io", "ttl": "Auto", "proxy": false}'::jsonb,
 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
 5
),
('GoDaddy', 'godaddy',
 '[
   {"step": 1, "title": "Log in to GoDaddy", "description": "Go to godaddy.com and sign in to your account"},
   {"step": 2, "title": "Go to DNS Management", "description": "Click My Products, then DNS next to your domain"},
   {"step": 3, "title": "Add CNAME record", "description": "Scroll to Records section and click Add"},
   {"step": 4, "title": "Configure the record", "description": "Select CNAME, enter your subdomain as Host and our target as Points to"},
   {"step": 5, "title": "Save", "description": "Click Save to add the record"}
 ]'::jsonb,
 '{"type": "CNAME", "host": "track", "points_to": "cname.adsmaster.io", "ttl": "1 Hour"}'::jsonb,
 'https://www.godaddy.com/help/add-a-cname-record-19236',
 60
),
('Namecheap', 'namecheap',
 '[
   {"step": 1, "title": "Log in to Namecheap", "description": "Go to namecheap.com and sign in"},
   {"step": 2, "title": "Go to Domain List", "description": "Click Domain List in the left sidebar"},
   {"step": 3, "title": "Manage DNS", "description": "Click Manage next to your domain, then Advanced DNS"},
   {"step": 4, "title": "Add CNAME record", "description": "Click Add New Record, select CNAME"},
   {"step": 5, "title": "Configure the record", "description": "Enter subdomain as Host and our target as Target"},
   {"step": 6, "title": "Save", "description": "Click the checkmark to save"}
 ]'::jsonb,
 '{"type": "CNAME", "host": "track", "target": "cname.adsmaster.io", "ttl": "Automatic"}'::jsonb,
 'https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/',
 30
),
('AWS Route 53', 'route53',
 '[
   {"step": 1, "title": "Open Route 53 Console", "description": "Go to AWS Console and navigate to Route 53"},
   {"step": 2, "title": "Select Hosted Zone", "description": "Click Hosted zones, then select your domain"},
   {"step": 3, "title": "Create Record", "description": "Click Create record"},
   {"step": 4, "title": "Configure CNAME", "description": "Enter subdomain, select CNAME, enter our target"},
   {"step": 5, "title": "Create", "description": "Click Create records"}
 ]'::jsonb,
 '{"type": "CNAME", "record_name": "track.example.com", "value": "cname.adsmaster.io", "ttl": 300}'::jsonb,
 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html',
 60
),
('Google Domains / Cloud DNS', 'google',
 '[
   {"step": 1, "title": "Open Google Domains", "description": "Go to domains.google.com and select your domain"},
   {"step": 2, "title": "Go to DNS", "description": "Click DNS in the left menu"},
   {"step": 3, "title": "Manage custom records", "description": "Scroll to Custom records section"},
   {"step": 4, "title": "Create CNAME", "description": "Click Manage custom records, then Create new record"},
   {"step": 5, "title": "Configure", "description": "Enter subdomain, select CNAME, enter our target"},
   {"step": 6, "title": "Save", "description": "Click Save"}
 ]'::jsonb,
 '{"type": "CNAME", "host_name": "track", "data": "cname.adsmaster.io", "ttl": "1H"}'::jsonb,
 'https://support.google.com/domains/answer/3290350',
 60
),
('Other / Generic', 'other',
 '[
   {"step": 1, "title": "Access DNS settings", "description": "Log in to your domain registrar or DNS provider"},
   {"step": 2, "title": "Find DNS management", "description": "Look for DNS, Zone Editor, or DNS Management"},
   {"step": 3, "title": "Add a new record", "description": "Find the option to add a new DNS record"},
   {"step": 4, "title": "Select CNAME type", "description": "Choose CNAME as the record type"},
   {"step": 5, "title": "Enter subdomain", "description": "In the Name/Host field, enter your chosen subdomain (e.g., track)"},
   {"step": 6, "title": "Enter target", "description": "In the Value/Target field, enter our CNAME target"},
   {"step": 7, "title": "Save", "description": "Save the record and wait for DNS propagation"}
 ]'::jsonb,
 '{"type": "CNAME", "name": "[subdomain]", "value": "cname.adsmaster.io", "ttl": "3600 or Auto"}'::jsonb,
 null,
 120
)
ON CONFLICT DO NOTHING;

-- Row Level Security
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_verification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for domains
CREATE POLICY "domains_org_isolation" ON domains
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- RLS Policies for verification logs
CREATE POLICY "domain_verification_logs_org_isolation" ON domain_verification_logs
    FOR ALL USING (
        domain_id IN (
            SELECT id FROM domains WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Function to generate verification code
CREATE OR REPLACE FUNCTION generate_domain_verification_code()
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to extract root domain and subdomain
CREATE OR REPLACE FUNCTION parse_domain(full_domain VARCHAR)
RETURNS TABLE(root_domain VARCHAR, subdomain VARCHAR) AS $$
DECLARE
    parts TEXT[];
    num_parts INT;
BEGIN
    parts := string_to_array(full_domain, '.');
    num_parts := array_length(parts, 1);

    IF num_parts <= 2 THEN
        -- e.g., "example.com" -> root: "example.com", subdomain: ""
        RETURN QUERY SELECT full_domain::VARCHAR, ''::VARCHAR;
    ELSE
        -- e.g., "track.example.com" -> root: "example.com", subdomain: "track"
        RETURN QUERY SELECT
            (parts[num_parts - 1] || '.' || parts[num_parts])::VARCHAR,
            array_to_string(parts[1:num_parts-2], '.')::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER domains_updated_at_trigger
    BEFORE UPDATE ON domains
    FOR EACH ROW
    EXECUTE FUNCTION update_domains_updated_at();

-- Add domain limit to subscription tiers (reference comment)
-- Free: 0 domains
-- Starter: 0 domains
-- Growth: 1 domain
-- Agency: 5 domains
-- Enterprise: Unlimited

COMMENT ON TABLE domains IS 'First-party tracking domains with CNAME verification for bypassing ad blockers';
COMMENT ON TABLE domain_verification_logs IS 'History of domain verification attempts';
COMMENT ON TABLE domain_dns_templates IS 'DNS setup instructions for common providers';
-- ============================================================================
-- Migration: Conversion Templates
-- Sprint 6: Enhanced Conversions
-- ============================================================================

-- Conversion Templates Table
-- Stores quick-create templates for common conversion types
CREATE TABLE IF NOT EXISTS conversion_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template info
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Conversion defaults
    conversion_type VARCHAR(50) NOT NULL DEFAULT 'lead',
    default_value BIGINT, -- In micros (null = no default)
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',

    -- Custom fields schema
    custom_fields JSONB DEFAULT '{}',

    -- Flags
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversion_templates_org
    ON conversion_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversion_templates_type
    ON conversion_templates(conversion_type);

-- RLS Policies
ALTER TABLE conversion_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversion_templates_org_isolation" ON conversion_templates
    USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_conversion_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversion_templates_updated_at
    BEFORE UPDATE ON conversion_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_conversion_templates_updated_at();

-- ============================================================================
-- Import History Table
-- Tracks CSV imports for auditing
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Import details
    filename VARCHAR(255) NOT NULL,
    import_type VARCHAR(50) NOT NULL DEFAULT 'csv', -- csv, api, crm

    -- Results
    total_rows INT NOT NULL DEFAULT 0,
    imported_rows INT NOT NULL DEFAULT 0,
    skipped_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,

    -- Config used
    config JSONB DEFAULT '{}',

    -- Errors (first N)
    errors JSONB DEFAULT '[]',

    -- Who imported
    imported_by UUID REFERENCES users(id),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed

    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_import_history_org
    ON import_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_import_history_created
    ON import_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_history_status
    ON import_history(status);

-- RLS
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_history_org_isolation" ON import_history
    USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ============================================================================
-- Tracking Events Table Enhancement
-- Add fields needed for live debug
-- ============================================================================

-- Add columns if they don't exist
DO $$
BEGIN
    -- Session ID for grouping events
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE tracking_events ADD COLUMN session_id VARCHAR(100);
    END IF;

    -- Page title
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'page_title'
    ) THEN
        ALTER TABLE tracking_events ADD COLUMN page_title VARCHAR(255);
    END IF;

    -- Referrer
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'referrer'
    ) THEN
        ALTER TABLE tracking_events ADD COLUMN referrer TEXT;
    END IF;

    -- Device type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'device_type'
    ) THEN
        ALTER TABLE tracking_events ADD COLUMN device_type VARCHAR(20);
    END IF;

    -- Country
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'country'
    ) THEN
        ALTER TABLE tracking_events ADD COLUMN country VARCHAR(2);
    END IF;

    -- City
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'city'
    ) THEN
        ALTER TABLE tracking_events ADD COLUMN city VARCHAR(100);
    END IF;
END $$;

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_tracking_events_session
    ON tracking_events(session_id);

-- Index for recent events (live debug)
CREATE INDEX IF NOT EXISTS idx_tracking_events_recent
    ON tracking_events(organization_id, timestamp DESC);

-- ============================================================================
-- Insert Default Templates
-- ============================================================================

-- Function to insert default templates for new organizations
CREATE OR REPLACE FUNCTION insert_default_conversion_templates()
RETURNS TRIGGER AS $$
BEGIN
    -- Lead template
    INSERT INTO conversion_templates (organization_id, name, description, conversion_type, is_default)
    VALUES (NEW.id, 'New Lead', 'Standard lead capture from website form', 'lead', true);

    -- Purchase template
    INSERT INTO conversion_templates (organization_id, name, description, conversion_type, is_default)
    VALUES (NEW.id, 'Purchase', 'E-commerce purchase completion', 'purchase', true);

    -- Sign Up template
    INSERT INTO conversion_templates (organization_id, name, description, conversion_type, is_default)
    VALUES (NEW.id, 'Sign Up', 'Account registration completion', 'signup', true);

    -- Demo Request template
    INSERT INTO conversion_templates (organization_id, name, description, conversion_type, default_value, is_default)
    VALUES (NEW.id, 'Demo Request', 'Demo or consultation request', 'lead', 500000000, true);

    -- Contact Form template
    INSERT INTO conversion_templates (organization_id, name, description, conversion_type, is_default)
    VALUES (NEW.id, 'Contact Form', 'Contact form submission', 'lead', true);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new organizations
DROP TRIGGER IF EXISTS trigger_insert_default_templates ON organizations;
CREATE TRIGGER trigger_insert_default_templates
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION insert_default_conversion_templates();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE conversion_templates IS 'Quick-create templates for common conversion types';
COMMENT ON TABLE import_history IS 'Audit log of CSV and bulk imports';
