-- =============================================================================
-- AdsMaster Database Schema for Hostinger PostgreSQL
-- =============================================================================
-- This script creates the complete database schema.
-- Run this on a fresh PostgreSQL database.
--
-- Usage:
--   psql -h your-host -U your-user -d adsmaster -f init_database.sql
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Organizations (multi-tenant)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    plan VARCHAR(50) DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    password_salt VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    organization_id UUID REFERENCES organizations(id),
    role VARCHAR(50) DEFAULT 'member',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Sessions (for refresh tokens)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad Accounts (Google Ads, Meta Ads)
CREATE TABLE IF NOT EXISTS ad_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'google_ads', 'meta_ads'
    account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    currency VARCHAR(10) DEFAULT 'USD',
    timezone VARCHAR(100) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'pending',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, platform, account_id)
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'ENABLED',
    campaign_type VARCHAR(100),
    budget_micros BIGINT DEFAULT 0,
    budget_type VARCHAR(50) DEFAULT 'DAILY',
    start_date DATE,
    end_date DATE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad Groups
CREATE TABLE IF NOT EXISTS ad_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'ENABLED',
    cpc_bid_micros BIGINT DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keywords
CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_group_id UUID REFERENCES ad_groups(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    text VARCHAR(500) NOT NULL,
    match_type VARCHAR(50) DEFAULT 'BROAD',
    status VARCHAR(50) DEFAULT 'ENABLED',
    cpc_bid_micros BIGINT DEFAULT 0,
    quality_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Metrics
CREATE TABLE IF NOT EXISTS metrics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    ad_group_id UUID REFERENCES ad_groups(id),
    keyword_id UUID REFERENCES keywords(id),
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions DECIMAL(12,4) DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    revenue_micros BIGINT DEFAULT 0,
    ctr DECIMAL(8,6) DEFAULT 0,
    cpc_micros BIGINT DEFAULT 0,
    cpa_micros BIGINT DEFAULT 0,
    roas DECIMAL(10,4) DEFAULT 0,
    device VARCHAR(50),
    network VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    ad_group_id UUID REFERENCES ad_groups(id),
    keyword_id UUID REFERENCES keywords(id),
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) DEFAULT 'medium',
    title VARCHAR(500) NOT NULL,
    description TEXT,
    impact_estimate JSONB DEFAULT '{}',
    options JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'pending',
    applied_at TIMESTAMPTZ,
    applied_by UUID REFERENCES users(id),
    applied_option_id INTEGER,
    dismissed_at TIMESTAMPTZ,
    dismissed_by UUID REFERENCES users(id),
    dismissed_reason TEXT,
    undone_at TIMESTAMPTZ,
    undone_by UUID REFERENCES users(id),
    undo_data JSONB,
    data_snapshot JSONB DEFAULT '{}',
    data_snapshot_at TIMESTAMPTZ,
    confidence_score DECIMAL(5,4) DEFAULT 0.8,
    source VARCHAR(50) DEFAULT 'rules',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation Rules
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(100) NOT NULL,
    trigger_config JSONB DEFAULT '{}',
    action_type VARCHAR(100) NOT NULL,
    action_config JSONB DEFAULT '{}',
    scope JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation Executions
CREATE TABLE IF NOT EXISTS automation_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    trigger_data JSONB DEFAULT '{}',
    action_result JSONB DEFAULT '{}',
    error_message TEXT,
    idempotency_key VARCHAR(255) UNIQUE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Audiences
CREATE TABLE IF NOT EXISTS audiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    source VARCHAR(100),
    size_estimate INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    definition JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SETTINGS & PREFERENCES
-- =============================================================================

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(20) DEFAULT 'system',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(100) DEFAULT 'UTC',
    date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD',
    currency VARCHAR(10) DEFAULT 'USD',
    dashboard_layout JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    email_alerts BOOLEAN DEFAULT TRUE,
    email_reports BOOLEAN DEFAULT TRUE,
    email_recommendations BOOLEAN DEFAULT TRUE,
    push_alerts BOOLEAN DEFAULT TRUE,
    push_recommendations BOOLEAN DEFAULT FALSE,
    alert_threshold_spend DECIMAL(12,2),
    alert_threshold_cpa DECIMAL(12,2),
    report_frequency VARCHAR(50) DEFAULT 'weekly',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    permissions JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 1000,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- BILLING & SUBSCRIPTIONS
-- =============================================================================

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    price_monthly_cents INTEGER DEFAULT 0,
    price_yearly_cents INTEGER DEFAULT 0,
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_invoice_id VARCHAR(255) UNIQUE,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'draft',
    invoice_pdf_url TEXT,
    paid_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ADMIN PANEL
-- =============================================================================

-- Admin Users (separate from regular users)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_super_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '[]',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admin_users(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Config
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TRACKING & VISITORS
-- =============================================================================

-- Visitors
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id),
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    total_visits INTEGER DEFAULT 1,
    total_pageviews INTEGER DEFAULT 1,
    total_events INTEGER DEFAULT 0,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(10),
    city VARCHAR(255),
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    first_referrer TEXT,
    traits JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, visitor_id)
);

-- Page Views
CREATE TABLE IF NOT EXISTS pageviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    url TEXT NOT NULL,
    path VARCHAR(1000),
    title VARCHAR(500),
    referrer TEXT,
    duration_ms INTEGER,
    scroll_depth INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    event_name VARCHAR(255) NOT NULL,
    event_category VARCHAR(255),
    properties JSONB DEFAULT '{}',
    revenue_micros BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offline Conversions
CREATE TABLE IF NOT EXISTS offline_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id),
    gclid VARCHAR(255),
    fbclid VARCHAR(255),
    email_hash VARCHAR(255),
    phone_hash VARCHAR(255),
    conversion_name VARCHAR(255) NOT NULL,
    conversion_value_micros BIGINT DEFAULT 0,
    conversion_time TIMESTAMPTZ NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    sync_status VARCHAR(50) DEFAULT 'pending',
    synced_at TIMESTAMPTZ,
    sync_error TEXT,
    external_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync Logs
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
    sync_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'running',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    details JSONB DEFAULT '{}'
);

-- =============================================================================
-- AD GOALS & ALERTS
-- =============================================================================

-- Ad Goals
CREATE TABLE IF NOT EXISTS ad_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    name VARCHAR(255) NOT NULL,
    metric VARCHAR(100) NOT NULL,
    target_value DECIMAL(15,4) NOT NULL,
    current_value DECIMAL(15,4) DEFAULT 0,
    comparison VARCHAR(20) DEFAULT 'gte',
    period VARCHAR(50) DEFAULT 'daily',
    is_active BOOLEAN DEFAULT TRUE,
    last_checked_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal Alerts
CREATE TABLE IF NOT EXISTS goal_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES ad_goals(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning',
    message TEXT NOT NULL,
    current_value DECIMAL(15,4),
    target_value DECIMAL(15,4),
    is_read BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SESSION RECORDINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS session_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_ms INTEGER DEFAULT 0,
    pages_visited INTEGER DEFAULT 1,
    events_count INTEGER DEFAULT 0,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    screen_width INTEGER,
    screen_height INTEGER,
    entry_url TEXT,
    exit_url TEXT,
    is_processed BOOLEAN DEFAULT FALSE,
    storage_path TEXT,
    file_size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- STUDIO (Custom Dashboards)
-- =============================================================================

CREATE TABLE IF NOT EXISTS studio_dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    public_token VARCHAR(255) UNIQUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CRM INTEGRATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS crm_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    credentials JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    sync_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DOMAINS & TRACKING PIXELS
-- =============================================================================

CREATE TABLE IF NOT EXISTS tracking_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    cname_target VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    ssl_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, domain)
);

-- =============================================================================
-- EMAIL SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    template_id UUID REFERENCES email_templates(id),
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    provider_message_id VARCHAR(255),
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- WEBHOOK LOGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(100) NOT NULL,
    event_type VARCHAR(255),
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'received',
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);

-- Ad Accounts
CREATE INDEX IF NOT EXISTS idx_ad_accounts_org ON ad_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_platform ON ad_accounts(platform);

-- Campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_account ON campaigns(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- Metrics
CREATE INDEX IF NOT EXISTS idx_metrics_org ON metrics_daily(organization_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics_daily(date);
CREATE INDEX IF NOT EXISTS idx_metrics_campaign ON metrics_daily(campaign_id);
CREATE INDEX IF NOT EXISTS idx_metrics_account_date ON metrics_daily(ad_account_id, date);

-- Recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_org ON recommendations(organization_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendations(type);

-- Visitors
CREATE INDEX IF NOT EXISTS idx_visitors_org ON visitors(organization_id);
CREATE INDEX IF NOT EXISTS idx_visitors_visitor_id ON visitors(visitor_id);

-- Events
CREATE INDEX IF NOT EXISTS idx_events_org ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

-- Goals
CREATE INDEX IF NOT EXISTS idx_goals_org ON ad_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_goal_alerts_goal ON goal_alerts(goal_id);

-- Sync Logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_org ON sync_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_account ON sync_logs(ad_account_id);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly_cents, price_yearly_cents, features, limits) VALUES
('free', 'Free', 'Get started with basic features', 0, 0,
 '{"google_ads": true, "meta_ads": false, "ai_chat": true, "recommendations": true}',
 '{"ad_accounts": 1, "ai_messages_monthly": 50, "team_members": 1}'),
('starter', 'Starter', 'For small businesses', 4900, 47000,
 '{"google_ads": true, "meta_ads": true, "ai_chat": true, "recommendations": true, "automations": true}',
 '{"ad_accounts": 2, "ai_messages_monthly": 200, "team_members": 3}'),
('growth', 'Growth', 'For growing businesses', 14900, 143000,
 '{"google_ads": true, "meta_ads": true, "ai_chat": true, "recommendations": true, "automations": true, "forecasting": true, "custom_reports": true}',
 '{"ad_accounts": 5, "ai_messages_monthly": 1000, "team_members": 10}'),
('agency', 'Agency', 'For agencies managing multiple clients', 29900, 287000,
 '{"google_ads": true, "meta_ads": true, "ai_chat": true, "recommendations": true, "automations": true, "forecasting": true, "custom_reports": true, "white_label": true, "api_access": true}',
 '{"ad_accounts": 25, "ai_messages_monthly": 5000, "team_members": 25}'),
('enterprise', 'Enterprise', 'Custom solutions for large organizations', 0, 0,
 '{"google_ads": true, "meta_ads": true, "ai_chat": true, "recommendations": true, "automations": true, "forecasting": true, "custom_reports": true, "white_label": true, "api_access": true, "dedicated_support": true, "custom_integrations": true}',
 '{"ad_accounts": -1, "ai_messages_monthly": -1, "team_members": -1}')
ON CONFLICT (name) DO NOTHING;

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
INSERT INTO admin_users (email, password_hash, full_name, is_super_admin) VALUES
('admin@adsmaster.io', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G8n2ysLHYKRJKq', 'Admin User', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert demo organization and user (password: testpass123 - FOR TESTING ONLY)
INSERT INTO organizations (id, name, slug, plan) VALUES
('a0000000-0000-0000-0000-000000000001', 'Demo Organization', 'demo', 'growth')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, email, password_hash, password_salt, full_name, organization_id, role, email_verified) VALUES
('b0000000-0000-0000-0000-000000000001', 'demo@test.com',
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
 'demo_salt_123',
 'Demo User', 'a0000000-0000-0000-0000-000000000001', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- DONE
-- =============================================================================
SELECT 'AdsMaster database schema created successfully!' as status;
