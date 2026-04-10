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
