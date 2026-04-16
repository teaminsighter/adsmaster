-- Migration: 00021_google_sheets_sync.sql
-- Description: Add Google Sheets sync for exporting conversions to spreadsheets
-- Created: 2026-04-13

-- ============================================================================
-- GOOGLE SHEETS SYNC TABLE
-- Configuration for syncing conversions to Google Sheets
-- ============================================================================
CREATE TABLE IF NOT EXISTS google_sheets_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Sheet Info
    name VARCHAR(255) NOT NULL,             -- User-friendly name
    sheet_url TEXT NOT NULL,                -- Full Google Sheet URL
    spreadsheet_id VARCHAR(255) NOT NULL,   -- Extracted spreadsheet ID
    sheet_name VARCHAR(255) DEFAULT 'Sheet1',  -- Tab/sheet name
    sheet_gid VARCHAR(50),                  -- Sheet GID (for multi-tab sheets)

    -- Format
    format VARCHAR(50) DEFAULT 'default',   -- default, google_ads, meta, microsoft, custom
    -- default: createdAt, type, email, phone, name, value, source
    -- google_ads: Google Ads offline conversion format
    -- meta: Meta CAPI format
    -- microsoft: Microsoft Ads format
    -- custom: User-defined columns

    -- Timezone for date formatting
    timezone VARCHAR(10) DEFAULT '+0000',   -- Offset format: '+0500', '-0800'

    -- What to sync
    sync_on_events JSONB DEFAULT '["conversion.created"]',
    conversion_types JSONB DEFAULT '[]',    -- Empty = all types, otherwise filter

    -- Column Configuration (for custom format)
    columns JSONB DEFAULT '[
        "occurred_at",
        "conversion_type",
        "email",
        "phone",
        "first_name",
        "last_name",
        "value_micros",
        "currency",
        "source",
        "gclid",
        "fbclid"
    ]',

    -- Column Headers (custom header names)
    column_headers JSONB DEFAULT '{}',      -- {"occurred_at": "Date", "value_micros": "Revenue"}

    -- Value Formatting
    format_micros_as_currency BOOLEAN DEFAULT true,  -- Convert micros to decimal
    date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD HH:mm:ss',

    -- Sync Settings
    is_active BOOLEAN DEFAULT true,
    append_new_rows BOOLEAN DEFAULT true,   -- Append to bottom (vs overwrite)
    include_headers BOOLEAN DEFAULT true,   -- Add header row if sheet is empty
    start_row INTEGER DEFAULT 1,            -- Starting row for data

    -- OAuth Credentials (encrypted)
    credentials_encrypted TEXT,             -- Service account JSON or OAuth tokens

    -- Stats
    total_rows_synced INTEGER DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),           -- success, partial, failed
    last_sync_rows INTEGER DEFAULT 0,
    last_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_google_sheets_sync_org_id ON google_sheets_sync(organization_id);
CREATE INDEX idx_google_sheets_sync_active ON google_sheets_sync(is_active) WHERE is_active = true;
CREATE INDEX idx_google_sheets_sync_spreadsheet ON google_sheets_sync(spreadsheet_id);

-- Enable RLS
ALTER TABLE google_sheets_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY google_sheets_sync_org_policy ON google_sheets_sync
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- GOOGLE SHEETS SYNC LOG TABLE
-- Log of sync operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS google_sheets_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_config_id UUID NOT NULL REFERENCES google_sheets_sync(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Sync Info
    sync_type VARCHAR(20) NOT NULL,         -- realtime, manual, scheduled
    status VARCHAR(20) NOT NULL,            -- started, success, partial, failed

    -- Stats
    rows_attempted INTEGER DEFAULT 0,
    rows_synced INTEGER DEFAULT 0,
    rows_failed INTEGER DEFAULT 0,

    -- Error Details
    error_details JSONB DEFAULT '[]',

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
);

-- Indexes
CREATE INDEX idx_google_sheets_sync_log_config ON google_sheets_sync_log(sync_config_id);
CREATE INDEX idx_google_sheets_sync_log_org ON google_sheets_sync_log(organization_id);
CREATE INDEX idx_google_sheets_sync_log_started ON google_sheets_sync_log(started_at DESC);

-- Enable RLS
ALTER TABLE google_sheets_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY google_sheets_sync_log_org_policy ON google_sheets_sync_log
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- SEARCH CONSOLE INTEGRATION TABLE
-- Google Search Console data sync
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_console_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Site Info
    site_url TEXT NOT NULL,                 -- e.g., 'https://example.com' or 'sc-domain:example.com'
    site_type VARCHAR(20) DEFAULT 'url_prefix',  -- url_prefix, domain

    -- OAuth Credentials
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,

    -- Sync Settings
    is_active BOOLEAN DEFAULT true,
    sync_frequency VARCHAR(20) DEFAULT 'daily',  -- daily, weekly
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),
    last_error TEXT,

    -- Data Range
    date_range_days INTEGER DEFAULT 90,     -- How many days of data to fetch

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT search_console_org_site_unique UNIQUE(organization_id, site_url)
);

-- Indexes
CREATE INDEX idx_search_console_org_id ON search_console_integrations(organization_id);
CREATE INDEX idx_search_console_active ON search_console_integrations(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE search_console_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY search_console_org_policy ON search_console_integrations
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- SEARCH CONSOLE DATA TABLE
-- Cached Search Console performance data
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_console_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES search_console_integrations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Date
    date DATE NOT NULL,

    -- Query/Page (dimension)
    query TEXT,
    page TEXT,
    device VARCHAR(20),                     -- DESKTOP, MOBILE, TABLET
    country VARCHAR(3),

    -- Metrics
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    ctr DECIMAL(5, 4),                      -- Click-through rate (0.0000 - 1.0000)
    position DECIMAL(6, 2),                 -- Average position

    -- Timestamps
    fetched_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique per day/query/page combination
    CONSTRAINT search_console_data_unique UNIQUE(integration_id, date, query, page, device, country)
);

-- Indexes
CREATE INDEX idx_search_console_data_integration ON search_console_data(integration_id);
CREATE INDEX idx_search_console_data_org ON search_console_data(organization_id);
CREATE INDEX idx_search_console_data_date ON search_console_data(date DESC);
CREATE INDEX idx_search_console_data_query ON search_console_data(query);
CREATE INDEX idx_search_console_data_page ON search_console_data(page);

-- Enable RLS
ALTER TABLE search_console_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY search_console_data_org_policy ON search_console_data
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- GA4 SERVER-SIDE EVENTS TABLE
-- Log of GA4 Measurement Protocol events sent
-- ============================================================================
CREATE TABLE IF NOT EXISTS ga4_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Event Info
    event_name VARCHAR(100) NOT NULL,
    client_id VARCHAR(255),
    user_id VARCHAR(255),
    conversion_id UUID REFERENCES offline_conversions(id) ON DELETE SET NULL,

    -- Payload
    payload JSONB NOT NULL,

    -- Response
    status VARCHAR(20) NOT NULL,            -- success, failed
    response_code INTEGER,
    error_message TEXT,

    -- Timestamps
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ga4_events_log_org ON ga4_events_log(organization_id);
CREATE INDEX idx_ga4_events_log_sent_at ON ga4_events_log(sent_at DESC);
CREATE INDEX idx_ga4_events_log_event ON ga4_events_log(event_name);
CREATE INDEX idx_ga4_events_log_status ON ga4_events_log(status);

-- Retention: Keep for 30 days (implement via cron job)
COMMENT ON TABLE ga4_events_log IS 'Log of GA4 Measurement Protocol events. Retain for 30 days.';

-- Enable RLS
ALTER TABLE ga4_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ga4_events_log_org_policy ON ga4_events_log
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE google_sheets_sync IS 'Configuration for syncing conversions to Google Sheets in real-time or batch.';
COMMENT ON TABLE google_sheets_sync_log IS 'Log of Google Sheets sync operations with row counts and errors.';
COMMENT ON TABLE search_console_integrations IS 'Google Search Console OAuth connections for fetching search performance data.';
COMMENT ON TABLE search_console_data IS 'Cached Search Console performance data (queries, pages, clicks, impressions).';
COMMENT ON TABLE ga4_events_log IS 'Log of GA4 server-side events sent via Measurement Protocol.';
COMMENT ON COLUMN google_sheets_sync.format IS 'Predefined formats: default (simple), google_ads (offline conversion import), meta (CAPI format), custom.';
COMMENT ON COLUMN google_sheets_sync.timezone IS 'Timezone offset for date formatting. Use format: +0000, -0500, +0530';
