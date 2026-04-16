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
