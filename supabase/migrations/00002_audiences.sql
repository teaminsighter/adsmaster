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
