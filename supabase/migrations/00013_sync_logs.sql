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
