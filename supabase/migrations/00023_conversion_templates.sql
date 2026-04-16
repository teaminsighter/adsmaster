-- ============================================================================
-- Migration: Conversion Templates
-- Sprint 6: Enhanced Conversions
-- ============================================================================

-- Conversion Templates Table
-- Stores quick-create templates for common conversion types
CREATE TABLE IF NOT EXISTS conversion_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template info
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Conversion defaults
    conversion_type VARCHAR(50) NOT NULL DEFAULT 'lead',
    default_value BIGINT, -- In micros (null = no default)
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',

    -- Custom fields schema
    custom_fields JSONB DEFAULT '{}',

    -- Flags
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversion_templates_org
    ON conversion_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversion_templates_type
    ON conversion_templates(conversion_type);

-- RLS Policies
ALTER TABLE conversion_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversion_templates_org_isolation" ON conversion_templates
    USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_conversion_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversion_templates_updated_at
    BEFORE UPDATE ON conversion_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_conversion_templates_updated_at();

-- ============================================================================
-- Import History Table
-- Tracks CSV imports for auditing
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Import details
    filename VARCHAR(255) NOT NULL,
    import_type VARCHAR(50) NOT NULL DEFAULT 'csv', -- csv, api, crm

    -- Results
    total_rows INT NOT NULL DEFAULT 0,
    imported_rows INT NOT NULL DEFAULT 0,
    skipped_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,

    -- Config used
    config JSONB DEFAULT '{}',

    -- Errors (first N)
    errors JSONB DEFAULT '[]',

    -- Who imported
    imported_by UUID REFERENCES users(id),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed

    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_import_history_org
    ON import_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_import_history_created
    ON import_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_history_status
    ON import_history(status);

-- RLS
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_history_org_isolation" ON import_history
    USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ============================================================================
-- Tracking Events Table Enhancement
-- Add fields needed for live debug
-- ============================================================================

-- Add columns if they don't exist
DO $$
BEGIN
    -- Session ID for grouping events
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE tracking_events ADD COLUMN session_id VARCHAR(100);
    END IF;

    -- Page title
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'page_title'
    ) THEN
        ALTER TABLE tracking_events ADD COLUMN page_title VARCHAR(255);
    END IF;

    -- Referrer
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'referrer'
    ) THEN
        ALTER TABLE tracking_events ADD COLUMN referrer TEXT;
    END IF;

    -- Device type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'device_type'
    ) THEN
        ALTER TABLE tracking_events ADD COLUMN device_type VARCHAR(20);
    END IF;

    -- Country
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'country'
    ) THEN
        ALTER TABLE tracking_events ADD COLUMN country VARCHAR(2);
    END IF;

    -- City
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'city'
    ) THEN
        ALTER TABLE tracking_events ADD COLUMN city VARCHAR(100);
    END IF;
END $$;

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_tracking_events_session
    ON tracking_events(session_id);

-- Index for recent events (live debug)
CREATE INDEX IF NOT EXISTS idx_tracking_events_recent
    ON tracking_events(organization_id, timestamp DESC);

-- ============================================================================
-- Insert Default Templates
-- ============================================================================

-- Function to insert default templates for new organizations
CREATE OR REPLACE FUNCTION insert_default_conversion_templates()
RETURNS TRIGGER AS $$
BEGIN
    -- Lead template
    INSERT INTO conversion_templates (organization_id, name, description, conversion_type, is_default)
    VALUES (NEW.id, 'New Lead', 'Standard lead capture from website form', 'lead', true);

    -- Purchase template
    INSERT INTO conversion_templates (organization_id, name, description, conversion_type, is_default)
    VALUES (NEW.id, 'Purchase', 'E-commerce purchase completion', 'purchase', true);

    -- Sign Up template
    INSERT INTO conversion_templates (organization_id, name, description, conversion_type, is_default)
    VALUES (NEW.id, 'Sign Up', 'Account registration completion', 'signup', true);

    -- Demo Request template
    INSERT INTO conversion_templates (organization_id, name, description, conversion_type, default_value, is_default)
    VALUES (NEW.id, 'Demo Request', 'Demo or consultation request', 'lead', 500000000, true);

    -- Contact Form template
    INSERT INTO conversion_templates (organization_id, name, description, conversion_type, is_default)
    VALUES (NEW.id, 'Contact Form', 'Contact form submission', 'lead', true);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new organizations
DROP TRIGGER IF EXISTS trigger_insert_default_templates ON organizations;
CREATE TRIGGER trigger_insert_default_templates
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION insert_default_conversion_templates();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE conversion_templates IS 'Quick-create templates for common conversion types';
COMMENT ON TABLE import_history IS 'Audit log of CSV and bulk imports';
