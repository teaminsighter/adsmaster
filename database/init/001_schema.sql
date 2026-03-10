-- ============================================================================
-- AdsMaster Database Schema - Full VPS Setup
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    owner_email VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'starter',
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    password_hash VARCHAR(255),
    avatar_url TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verify_token VARCHAR(255),
    email_verify_expires TIMESTAMPTZ,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER SESSIONS (JWT Refresh Tokens)
-- ============================================================================

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

-- ============================================================================
-- USER PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
    currency VARCHAR(3) DEFAULT 'USD',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    theme VARCHAR(20) DEFAULT 'system',
    compact_mode BOOLEAN DEFAULT FALSE,
    show_cents BOOLEAN DEFAULT TRUE,
    default_date_range VARCHAR(20) DEFAULT '30d',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ORGANIZATION MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    invite_email VARCHAR(255),
    invite_token VARCHAR(255),
    invite_expires_at TIMESTAMPTZ,
    role VARCHAR(50) DEFAULT 'viewer',
    status VARCHAR(50) DEFAULT 'pending',
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    plan_name VARCHAR(50) DEFAULT 'starter',
    plan_price_cents INTEGER DEFAULT 0,
    billing_interval VARCHAR(20) DEFAULT 'month',
    status VARCHAR(50) DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    max_ad_accounts INTEGER DEFAULT 2,
    max_team_members INTEGER DEFAULT 1,
    max_api_calls_per_month INTEGER DEFAULT 10000,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AD PLATFORMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default platforms
INSERT INTO ad_platforms (name, display_name) VALUES
    ('google_ads', 'Google Ads'),
    ('meta_ads', 'Meta Ads')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- AD ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    platform_id UUID REFERENCES ad_platforms(id),
    external_account_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    currency_code VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(100) DEFAULT 'UTC',
    status VARCHAR(50) DEFAULT 'active',
    token_status VARCHAR(50) DEFAULT 'valid',
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CAMPAIGNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
    external_campaign_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ENABLED',
    campaign_type VARCHAR(50),
    budget_micros BIGINT,
    budget_type VARCHAR(50),
    currency_code VARCHAR(3) DEFAULT 'USD',
    start_date DATE,
    end_date DATE,
    target_roas DECIMAL(10,2),
    target_cpa_micros BIGINT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AD GROUPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    external_ad_group_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ENABLED',
    ad_group_type VARCHAR(50),
    cpc_bid_micros BIGINT,
    cpm_bid_micros BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- KEYWORDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_group_id UUID NOT NULL REFERENCES ad_groups(id) ON DELETE CASCADE,
    external_keyword_id VARCHAR(255),
    text VARCHAR(255) NOT NULL,
    match_type VARCHAR(50) DEFAULT 'BROAD',
    status VARCHAR(50) DEFAULT 'ENABLED',
    cpc_bid_micros BIGINT,
    quality_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ADS (Individual Ads within Ad Groups/Ad Sets)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_group_id UUID NOT NULL REFERENCES ad_groups(id) ON DELETE CASCADE,
    external_ad_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ENABLED',
    ad_type VARCHAR(50),  -- IMAGE, VIDEO, CAROUSEL, COLLECTION
    creative_id VARCHAR(255),
    headline VARCHAR(500),
    description TEXT,
    call_to_action VARCHAR(100),
    image_url TEXT,
    video_url TEXT,
    preview_url TEXT,
    destination_url TEXT,
    tracking_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- METRICS DAILY
-- ============================================================================

CREATE TABLE IF NOT EXISTS metrics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    ad_group_id UUID REFERENCES ad_groups(id) ON DELETE CASCADE,
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    network_type VARCHAR(50),
    device VARCHAR(50),
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(10,2) DEFAULT 0,
    conversion_value_micros BIGINT DEFAULT 0,
    view_through_conversions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,
    rule_type VARCHAR(100),
    severity VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    title VARCHAR(500),
    description TEXT,
    confidence_score INTEGER,
    estimated_savings_micros BIGINT,
    estimated_conversions_gain DECIMAL(10,2),
    impact_summary TEXT,
    entity_type VARCHAR(50),
    entity_name VARCHAR(255),
    campaign_name VARCHAR(255),
    options JSONB DEFAULT '[]'::jsonb,
    applied_at TIMESTAMPTZ,
    applied_option_id INTEGER,
    dismissed_at TIMESTAMPTZ,
    dismiss_reason TEXT,
    before_state JSONB,
    after_state JSONB,
    undone_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATION SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT FALSE,
    slack_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- API KEYS
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20),
    key_hash VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '["read"]'::jsonb,
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 10000,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVOICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50),
    amount_cents INTEGER DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    invoice_date DATE,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    stripe_invoice_id VARCHAR(255),
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT METHODS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255),
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS audiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    platform VARCHAR(50) DEFAULT 'google',  -- 'google' or 'meta'
    type VARCHAR(50),  -- REMARKETING, CUSTOMER_LIST, LOOKALIKE, ENGAGEMENT
    source VARCHAR(100),  -- all_visitors, cart_abandoners, purchasers, etc.
    status VARCHAR(50) DEFAULT 'ACTIVE',
    lookback_days INTEGER DEFAULT 30,
    estimated_size INTEGER DEFAULT 0,
    campaigns_using INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_spend_micros BIGINT DEFAULT 0,
    platform_audience_id VARCHAR(255),  -- External ID on Google/Meta
    platform_sync_status VARCHAR(50) DEFAULT 'pending',  -- pending, synced, failed
    rules JSONB DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,  -- For soft delete
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SLACK INTEGRATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS slack_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id VARCHAR(255),
    channel_id VARCHAR(255),
    access_token TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_org ON ad_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_account ON campaigns(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics_daily(metric_date);
CREATE INDEX IF NOT EXISTS idx_metrics_campaign ON metrics_daily(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_org ON recommendations(organization_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_ads_ad_group ON ads(ad_group_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);

-- ============================================================================
-- UPDATE TIMESTAMP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON %s
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;
