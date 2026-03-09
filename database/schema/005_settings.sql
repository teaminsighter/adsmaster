-- ============================================================================
-- 005_settings.sql
-- User preferences, notification settings, team members, and API keys
-- ============================================================================

-- ============================================================================
-- USER PREFERENCES TABLE
-- ============================================================================

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    user_id UUID NOT NULL UNIQUE,

    -- Regional settings
    timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
    currency VARCHAR(3) DEFAULT 'USD',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',

    -- Display settings
    theme VARCHAR(20) DEFAULT 'system', -- 'light', 'dark', 'system'
    compact_mode BOOLEAN DEFAULT FALSE,
    show_cents BOOLEAN DEFAULT TRUE,
    default_date_range VARCHAR(10) DEFAULT '30d',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATION SETTINGS TABLE
-- ============================================================================

CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    user_id UUID NOT NULL,
    organization_id UUID,

    -- Notification type
    notification_type VARCHAR(50) NOT NULL,

    -- Channels
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT FALSE,
    slack_enabled BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, notification_type)
);

-- Default notification types
-- budget_alerts, performance_drops, ai_recommendations, campaign_status, weekly_report, billing

-- ============================================================================
-- TEAM MEMBERS / ORGANIZATION MEMBERS TABLE
-- ============================================================================

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL,
    user_id UUID, -- NULL if invite pending

    -- Invite info
    invite_email VARCHAR(255),
    invite_token VARCHAR(255),
    invite_expires_at TIMESTAMPTZ,

    -- Role & permissions
    role VARCHAR(20) NOT NULL DEFAULT 'viewer', -- 'owner', 'admin', 'editor', 'viewer'
    permissions JSONB DEFAULT '[]'::jsonb,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'active', 'pending', 'suspended'

    -- Activity tracking
    last_active_at TIMESTAMPTZ,
    invited_by UUID,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, user_id),
    UNIQUE(organization_id, invite_email)
);

-- ============================================================================
-- API KEYS TABLE
-- ============================================================================

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL,
    created_by UUID NOT NULL,

    -- Key info
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- First few chars for identification
    key_hash VARCHAR(255) NOT NULL, -- SHA256 hash of full key

    -- Permissions
    permissions TEXT[] DEFAULT ARRAY['read'], -- 'read', 'write', 'admin'

    -- Rate limiting
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 10000,

    -- Usage tracking
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SLACK INTEGRATIONS TABLE
-- ============================================================================

CREATE TABLE slack_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL,

    -- Slack info
    workspace_id VARCHAR(50) NOT NULL,
    workspace_name VARCHAR(255),
    channel_id VARCHAR(50),
    channel_name VARCHAR(255),

    -- OAuth tokens (encrypted)
    access_token_encrypted TEXT,
    bot_user_id VARCHAR(50),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, workspace_id)
);

-- ============================================================================
-- BILLING / SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL UNIQUE,

    -- Stripe IDs
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),

    -- Plan info
    plan_name VARCHAR(50) NOT NULL DEFAULT 'starter', -- 'starter', 'pro', 'agency', 'enterprise'
    plan_price_cents INTEGER DEFAULT 0,
    billing_interval VARCHAR(20) DEFAULT 'month', -- 'month', 'year'

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'trialing'
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,

    -- Usage limits
    max_ad_accounts INTEGER DEFAULT 2,
    max_team_members INTEGER DEFAULT 1,
    max_api_calls_per_month INTEGER DEFAULT 10000,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT METHODS TABLE
-- ============================================================================

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL,

    -- Stripe info
    stripe_payment_method_id VARCHAR(100) NOT NULL,

    -- Card info (non-sensitive)
    card_brand VARCHAR(20), -- 'visa', 'mastercard', 'amex'
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,

    -- Status
    is_default BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL,
    subscription_id UUID REFERENCES subscriptions(id),

    -- Stripe info
    stripe_invoice_id VARCHAR(100),

    -- Invoice details
    invoice_number VARCHAR(50) NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL, -- 'draft', 'open', 'paid', 'void', 'uncollectible'

    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE,
    paid_at TIMESTAMPTZ,

    -- PDF
    invoice_pdf_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User preferences
CREATE INDEX idx_user_prefs_user ON user_preferences(user_id);

-- Notification settings
CREATE INDEX idx_notif_settings_user ON notification_settings(user_id);
CREATE INDEX idx_notif_settings_org ON notification_settings(organization_id);

-- Organization members
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_email ON organization_members(invite_email) WHERE invite_email IS NOT NULL;
CREATE INDEX idx_org_members_token ON organization_members(invite_token) WHERE invite_token IS NOT NULL;

-- API keys
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(organization_id, is_active) WHERE is_active = TRUE;

-- Slack integrations
CREATE INDEX idx_slack_org ON slack_integrations(organization_id);

-- Subscriptions
CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_customer_id);

-- Payment methods
CREATE INDEX idx_payment_methods_org ON payment_methods(organization_id);

-- Invoices
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_date ON invoices(organization_id, invoice_date DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slack_integrations_updated_at
    BEFORE UPDATE ON slack_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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
CREATE POLICY user_prefs_service ON user_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY notif_settings_service ON notification_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY org_members_service ON organization_members FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY api_keys_service ON api_keys FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY slack_service ON slack_integrations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY subscriptions_service ON subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY payment_methods_service ON payment_methods FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY invoices_service ON invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
