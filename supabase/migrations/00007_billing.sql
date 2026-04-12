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
