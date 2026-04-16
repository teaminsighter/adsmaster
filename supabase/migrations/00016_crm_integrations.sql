-- Migration: 00016_crm_integrations.sql
-- Description: Add CRM integrations (Pipedrive, ActiveCampaign, etc.) and sync tables
-- Created: 2026-04-13

-- ============================================================================
-- CRM INTEGRATIONS TABLE
-- Stores credentials and settings for external CRM connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Integration Info
    provider VARCHAR(50) NOT NULL,          -- pipedrive, activecampaign, hubspot, salesforce, zoho
    name VARCHAR(255) NOT NULL,             -- User-friendly name
    description TEXT,

    -- Encrypted Credentials (JSON encrypted with AES-256)
    credentials_encrypted TEXT NOT NULL,

    -- Provider-Specific Settings
    settings JSONB DEFAULT '{}',
    -- For Pipedrive: {api_token, company_domain, pipeline_id, stage_mapping}
    -- For ActiveCampaign: {api_url, api_key, list_id, automation_id}
    -- For HubSpot: {access_token, refresh_token, portal_id}

    -- Sync Configuration
    sync_direction VARCHAR(20) DEFAULT 'both',  -- to_crm, from_crm, both
    sync_frequency VARCHAR(20) DEFAULT 'realtime',  -- realtime, hourly, daily
    sync_enabled BOOLEAN DEFAULT true,

    -- Field Mapping (AdsMaster field → CRM field)
    field_mapping JSONB DEFAULT '{
        "email": "email",
        "phone": "phone",
        "first_name": "first_name",
        "last_name": "last_name",
        "value_micros": "value",
        "conversion_type": "lead_source",
        "lead_status": "status"
    }',

    -- Status
    is_active BOOLEAN DEFAULT true,
    connection_status VARCHAR(20) DEFAULT 'pending',  -- pending, connected, error, expired

    -- Sync Stats
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),           -- success, partial, failed
    last_sync_records INTEGER DEFAULT 0,
    last_error TEXT,
    total_synced INTEGER DEFAULT 0,

    -- OAuth Tokens (for providers using OAuth)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_crm_integrations_org_id ON crm_integrations(organization_id);
CREATE INDEX idx_crm_integrations_provider ON crm_integrations(provider);
CREATE INDEX idx_crm_integrations_active ON crm_integrations(is_active) WHERE is_active = true;
CREATE INDEX idx_crm_integrations_sync_enabled ON crm_integrations(sync_enabled) WHERE sync_enabled = true;

-- Enable RLS
ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_integrations_org_policy ON crm_integrations
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- CRM SYNC LOGS TABLE
-- History of CRM synchronization operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,

    -- Sync Info
    sync_type VARCHAR(50) NOT NULL,         -- manual, scheduled, realtime, webhook
    direction VARCHAR(20) NOT NULL,         -- to_crm, from_crm

    -- Status
    status VARCHAR(50) NOT NULL,            -- started, completed, partial, failed

    -- Stats
    total_records INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,

    -- Error Details
    error_details JSONB DEFAULT '[]',       -- [{record_id, error_message}, ...]

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
);

-- Indexes
CREATE INDEX idx_crm_sync_logs_org_id ON crm_sync_logs(organization_id);
CREATE INDEX idx_crm_sync_logs_integration_id ON crm_sync_logs(integration_id);
CREATE INDEX idx_crm_sync_logs_started_at ON crm_sync_logs(started_at DESC);
CREATE INDEX idx_crm_sync_logs_status ON crm_sync_logs(status);

-- Enable RLS
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_sync_logs_org_policy ON crm_sync_logs
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- CRM CONTACT MAPPING TABLE
-- Maps AdsMaster visitors/conversions to CRM contacts
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_contact_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,

    -- AdsMaster Reference
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    conversion_id UUID REFERENCES offline_conversions(id) ON DELETE SET NULL,
    email VARCHAR(255),

    -- CRM Reference
    crm_contact_id VARCHAR(255) NOT NULL,   -- ID in external CRM
    crm_contact_type VARCHAR(50),           -- person, deal, lead, contact, etc.
    crm_contact_url TEXT,                   -- Direct link to CRM record

    -- Sync Status
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_direction VARCHAR(20),             -- to_crm, from_crm

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT crm_contact_mapping_unique UNIQUE(integration_id, crm_contact_id)
);

-- Indexes
CREATE INDEX idx_crm_contact_mapping_org_id ON crm_contact_mapping(organization_id);
CREATE INDEX idx_crm_contact_mapping_integration_id ON crm_contact_mapping(integration_id);
CREATE INDEX idx_crm_contact_mapping_visitor_id ON crm_contact_mapping(visitor_id);
CREATE INDEX idx_crm_contact_mapping_conversion_id ON crm_contact_mapping(conversion_id);
CREATE INDEX idx_crm_contact_mapping_email ON crm_contact_mapping(email);
CREATE INDEX idx_crm_contact_mapping_crm_id ON crm_contact_mapping(crm_contact_id);

-- Enable RLS
ALTER TABLE crm_contact_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_contact_mapping_org_policy ON crm_contact_mapping
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- LEADS PIPELINE TABLE
-- Custom lead stages for CRM-like functionality
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Stage Info
    name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL,
    color VARCHAR(20) DEFAULT '#6B7280',    -- Hex color for UI

    -- Behavior
    is_won BOOLEAN DEFAULT false,           -- Marks successful conversion
    is_lost BOOLEAN DEFAULT false,          -- Marks lost lead
    is_default BOOLEAN DEFAULT false,       -- Default stage for new leads

    -- Stats (updated by triggers)
    leads_count INTEGER DEFAULT 0,
    total_value_micros BIGINT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT lead_pipeline_stages_order_unique UNIQUE(organization_id, display_order)
);

-- Indexes
CREATE INDEX idx_lead_pipeline_stages_org_id ON lead_pipeline_stages(organization_id);
CREATE INDEX idx_lead_pipeline_stages_order ON lead_pipeline_stages(organization_id, display_order);

-- Enable RLS
ALTER TABLE lead_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_pipeline_stages_org_policy ON lead_pipeline_stages
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- SEED DEFAULT PIPELINE STAGES
-- Function to create default stages for new organizations
-- ============================================================================
CREATE OR REPLACE FUNCTION create_default_pipeline_stages(org_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO lead_pipeline_stages (organization_id, name, display_order, color, is_default)
    VALUES
        (org_id, 'New', 1, '#3B82F6', true),
        (org_id, 'Contacted', 2, '#8B5CF6', false),
        (org_id, 'Qualified', 3, '#F59E0B', false),
        (org_id, 'Proposal', 4, '#EC4899', false),
        (org_id, 'Negotiation', 5, '#14B8A6', false),
        (org_id, 'Won', 6, '#10B981', false),
        (org_id, 'Lost', 7, '#EF4444', false)
    ON CONFLICT DO NOTHING;

    UPDATE lead_pipeline_stages SET is_won = true WHERE organization_id = org_id AND name = 'Won';
    UPDATE lead_pipeline_stages SET is_lost = true WHERE organization_id = org_id AND name = 'Lost';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE crm_integrations IS 'External CRM connections (Pipedrive, ActiveCampaign, HubSpot, etc.) with encrypted credentials.';
COMMENT ON TABLE crm_sync_logs IS 'History of CRM synchronization operations with success/failure stats.';
COMMENT ON TABLE crm_contact_mapping IS 'Maps AdsMaster visitors/conversions to external CRM contact IDs.';
COMMENT ON TABLE lead_pipeline_stages IS 'Custom lead pipeline stages for CRM-like lead management.';
COMMENT ON COLUMN crm_integrations.credentials_encrypted IS 'AES-256 encrypted JSON containing API keys, tokens, and secrets.';
COMMENT ON COLUMN crm_integrations.field_mapping IS 'Maps AdsMaster fields to CRM fields for data sync.';
