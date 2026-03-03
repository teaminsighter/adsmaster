-- ============================================================================
-- 002_billing.sql
-- Subscription plans, billing, and usage tracking
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE subscription_status AS ENUM (
    'trialing',
    'active',
    'past_due',
    'cancelled',
    'unpaid',
    'paused'
);

CREATE TYPE billing_interval AS ENUM ('monthly', 'yearly');

-- ============================================================================
-- SUBSCRIPTION PLANS TABLE
-- ============================================================================

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Plan identity
    name VARCHAR(50) NOT NULL UNIQUE, -- free_audit, starter, growth, agency, enterprise
    display_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Pricing
    price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Stripe IDs
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),
    stripe_product_id VARCHAR(255),

    -- Limits
    max_ad_accounts INTEGER DEFAULT 1,
    max_campaigns INTEGER DEFAULT 5,
    max_users INTEGER DEFAULT 1,
    max_ai_messages_per_month INTEGER DEFAULT 100,

    -- Features (what's included)
    features JSONB DEFAULT '{
        "platforms": ["google_ads"],
        "ai_advisor": true,
        "ai_campaign_creator": false,
        "automation_rules": false,
        "whatsapp_alerts": false,
        "slack_integration": false,
        "white_label": false,
        "api_access": false,
        "priority_support": false,
        "custom_reports": false,
        "competitor_tracking": false,
        "multi_user": false
    }'::jsonb,

    -- Display
    is_popular BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE, -- show on pricing page

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),

    -- Stripe
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),

    -- Billing
    billing_interval billing_interval NOT NULL DEFAULT 'monthly',

    -- Status
    status subscription_status NOT NULL DEFAULT 'trialing',

    -- Period
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,

    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Pause
    pause_collection_behavior VARCHAR(50), -- keep_as_draft, mark_uncollectible, void
    paused_at TIMESTAMPTZ,
    resume_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USAGE RECORDS TABLE (for metered billing)
-- ============================================================================

CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

    -- Usage type
    metric_type VARCHAR(50) NOT NULL, -- ad_accounts, ai_messages, api_calls, reports_generated

    -- Quantity
    quantity INTEGER NOT NULL DEFAULT 1,

    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    -- Stripe
    stripe_usage_record_id VARCHAR(255),

    -- Timestamps
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Stripe
    stripe_invoice_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255),

    -- Invoice details
    invoice_number VARCHAR(50),
    status VARCHAR(20) NOT NULL, -- draft, open, paid, void, uncollectible

    -- Amounts (in cents)
    subtotal INTEGER NOT NULL DEFAULT 0,
    tax INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    amount_paid INTEGER DEFAULT 0,
    amount_due INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Dates
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,

    -- PDF
    invoice_pdf_url TEXT,
    hosted_invoice_url TEXT,

    -- Line items
    line_items JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

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
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Stripe
    stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,

    -- Type
    type VARCHAR(20) NOT NULL, -- card, bank_account, etc.

    -- Card details (if card)
    card_brand VARCHAR(20), -- visa, mastercard, amex, etc.
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,

    -- Status
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    billing_details JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COUPONS TABLE
-- ============================================================================

CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Code
    code VARCHAR(50) NOT NULL UNIQUE,

    -- Stripe
    stripe_coupon_id VARCHAR(255),

    -- Discount
    discount_type VARCHAR(20) NOT NULL, -- percent, fixed_amount
    discount_value DECIMAL(10, 2) NOT NULL, -- percentage or amount
    currency VARCHAR(3) DEFAULT 'USD',

    -- Duration
    duration VARCHAR(20) NOT NULL, -- once, repeating, forever
    duration_in_months INTEGER, -- if repeating

    -- Limits
    max_redemptions INTEGER,
    redemption_count INTEGER DEFAULT 0,

    -- Restrictions
    applies_to_plans UUID[], -- specific plan IDs, NULL = all
    minimum_amount INTEGER, -- minimum invoice amount in cents

    -- Validity
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COUPON REDEMPTIONS TABLE
-- ============================================================================

CREATE TABLE coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    coupon_id UUID NOT NULL REFERENCES coupons(id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Timestamps
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(coupon_id, organization_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Subscription plans
CREATE INDEX idx_plans_active ON subscription_plans(is_active, is_public)
    WHERE is_active = TRUE AND is_public = TRUE;
CREATE INDEX idx_plans_name ON subscription_plans(name);

-- Subscriptions
CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Usage records
CREATE INDEX idx_usage_subscription ON usage_records(subscription_id);
CREATE INDEX idx_usage_type ON usage_records(subscription_id, metric_type);
CREATE INDEX idx_usage_period ON usage_records(subscription_id, period_start, period_end);

-- Invoices
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date DESC);

-- Payment methods
CREATE INDEX idx_payment_methods_org ON payment_methods(organization_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(organization_id, is_default)
    WHERE is_default = TRUE;

-- Coupons
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active, valid_until)
    WHERE is_active = TRUE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Default subscription plans
-- ============================================================================

INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, max_ad_accounts, max_campaigns, max_users, max_ai_messages_per_month, features, is_popular, sort_order) VALUES

('free_audit', 'Free Audit', 'One-time account scan and waste report', 0, 0, 1, 0, 1, 5,
'{
    "platforms": ["google_ads"],
    "ai_advisor": false,
    "ai_campaign_creator": false,
    "automation_rules": false,
    "whatsapp_alerts": false,
    "slack_integration": false,
    "white_label": false,
    "api_access": false,
    "priority_support": false,
    "custom_reports": false,
    "competitor_tracking": false,
    "multi_user": false,
    "audit_only": true
}'::jsonb, FALSE, 0),

('starter', 'Starter', 'Perfect for small businesses starting with ads', 49, 470, 1, 5, 1, 100,
'{
    "platforms": ["google_ads"],
    "ai_advisor": true,
    "ai_campaign_creator": false,
    "automation_rules": true,
    "whatsapp_alerts": false,
    "slack_integration": false,
    "white_label": false,
    "api_access": false,
    "priority_support": false,
    "custom_reports": false,
    "competitor_tracking": false,
    "multi_user": false
}'::jsonb, FALSE, 1),

('growth', 'Growth', 'For growing businesses ready to scale', 99, 950, 3, -1, 3, 500,
'{
    "platforms": ["google_ads", "meta"],
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
}'::jsonb, TRUE, 2),

('agency', 'Agency', 'For agencies managing multiple clients', 299, 2870, 10, -1, 10, 2000,
'{
    "platforms": ["google_ads", "meta", "tiktok"],
    "ai_advisor": true,
    "ai_campaign_creator": true,
    "automation_rules": true,
    "whatsapp_alerts": true,
    "slack_integration": true,
    "white_label": true,
    "api_access": true,
    "priority_support": true,
    "custom_reports": true,
    "competitor_tracking": true,
    "multi_user": true,
    "client_portal": true,
    "per_client_fee": 29
}'::jsonb, FALSE, 3),

('enterprise', 'Enterprise', 'Custom solutions for large organizations', 0, 0, -1, -1, -1, -1,
'{
    "platforms": ["google_ads", "meta", "tiktok", "linkedin", "twitter"],
    "ai_advisor": true,
    "ai_campaign_creator": true,
    "automation_rules": true,
    "whatsapp_alerts": true,
    "slack_integration": true,
    "white_label": true,
    "api_access": true,
    "priority_support": true,
    "custom_reports": true,
    "competitor_tracking": true,
    "multi_user": true,
    "client_portal": true,
    "dedicated_support": true,
    "custom_integrations": true,
    "sla": true,
    "custom_ai_models": true
}'::jsonb, FALSE, 4);

-- Note: -1 means unlimited
