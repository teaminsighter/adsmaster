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
