-- Migration: 00017_studio_dashboards.sql
-- Description: Add Studio dashboard builder tables (custom dashboards, widgets, data sources)
-- Created: 2026-04-13

-- ============================================================================
-- STUDIO DASHBOARDS TABLE
-- Main dashboard definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),

    -- Dashboard Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail TEXT,                         -- Base64 or URL for preview image

    -- Layout Configuration (for react-grid-layout)
    layout JSONB DEFAULT '[]',              -- [{i: 'widget-1', x: 0, y: 0, w: 4, h: 3}, ...]

    -- Global Settings
    settings JSONB DEFAULT '{
        "theme": "light",
        "refreshInterval": 0,
        "backgroundColor": "#ffffff"
    }',

    -- Date Filter Defaults
    default_date_range VARCHAR(50) DEFAULT 'last_30_days',
    default_timezone VARCHAR(50) DEFAULT 'UTC',
    default_comparison VARCHAR(50) DEFAULT 'previous_period',

    -- Publishing
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,

    -- Template
    is_template BOOLEAN DEFAULT false,
    template_category VARCHAR(50),          -- marketing, ecommerce, leads, social, analytics
    template_description TEXT,

    -- Sharing
    share_token VARCHAR(100) UNIQUE,
    is_public BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),             -- Optional password protection
    allowed_emails JSONB DEFAULT '[]',      -- Specific emails allowed to view

    -- Stats
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_studio_dashboards_org_id ON studio_dashboards(organization_id);
CREATE INDEX idx_studio_dashboards_created_by ON studio_dashboards(created_by);
CREATE INDEX idx_studio_dashboards_share_token ON studio_dashboards(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_studio_dashboards_is_template ON studio_dashboards(is_template) WHERE is_template = true;
CREATE INDEX idx_studio_dashboards_is_public ON studio_dashboards(is_public) WHERE is_public = true;

-- Enable RLS
ALTER TABLE studio_dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY studio_dashboards_org_policy ON studio_dashboards
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- STUDIO WIDGETS TABLE
-- Individual widgets within dashboards
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES studio_dashboards(id) ON DELETE CASCADE,

    -- Widget Type
    type VARCHAR(50) NOT NULL,              -- metric, line_chart, bar_chart, pie_chart, donut_chart,
                                            -- area_chart, funnel, heatmap, table, text, image, embed

    -- Display
    title VARCHAR(255),
    subtitle VARCHAR(255),
    icon VARCHAR(50),                       -- Icon name from lucide-react

    -- Grid Position (react-grid-layout)
    grid_x INTEGER NOT NULL DEFAULT 0,
    grid_y INTEGER NOT NULL DEFAULT 0,
    grid_w INTEGER NOT NULL DEFAULT 4,
    grid_h INTEGER NOT NULL DEFAULT 4,
    min_w INTEGER DEFAULT 2,
    min_h INTEGER DEFAULT 2,

    -- Data Source
    data_source VARCHAR(50) NOT NULL,       -- meta_ads, google_ads, ga4, conversions, visitors,
                                            -- csv, google_sheets, api, manual, calculated
    data_source_id UUID,                    -- Reference to studio_data_sources for CSV/Sheets
    ad_account_id UUID,                     -- Reference to ad_accounts for ad platform data

    -- Query Configuration
    metrics JSONB DEFAULT '[]',             -- [{field: 'spend', aggregation: 'sum', label: 'Total Spend', format: 'currency'}]
    dimensions JSONB DEFAULT '[]',          -- [{field: 'campaign_name', label: 'Campaign'}]
    filters JSONB DEFAULT '[]',             -- [{field: 'status', operator: 'eq', value: 'active'}]
    sort_by JSONB DEFAULT '{}',             -- {field: 'spend', direction: 'desc'}
    limit_rows INTEGER DEFAULT 10,

    -- Date Override (null = use dashboard default)
    date_range VARCHAR(50),
    custom_date_start DATE,
    custom_date_end DATE,

    -- Visualization Config
    visual_config JSONB DEFAULT '{
        "colors": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
        "showLegend": true,
        "showGrid": true,
        "showLabels": true,
        "stacked": false,
        "smooth": false
    }',

    -- Comparison
    show_comparison BOOLEAN DEFAULT false,
    comparison_type VARCHAR(30),            -- previous_period, previous_year, custom

    -- Calculated Field (for type='calculated')
    formula TEXT,                           -- e.g., "{{spend}} / {{conversions}}" for CPL

    -- Manual Data (for type='manual')
    manual_data JSONB,

    -- Conditional Formatting
    conditional_rules JSONB DEFAULT '[]',   -- [{condition: '>100', color: '#10B981', icon: 'arrow-up'}]

    -- Drill-down Configuration
    drilldown_enabled BOOLEAN DEFAULT false,
    drilldown_dimension VARCHAR(100),

    -- Order
    z_index INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_studio_widgets_dashboard_id ON studio_widgets(dashboard_id);
CREATE INDEX idx_studio_widgets_type ON studio_widgets(type);
CREATE INDEX idx_studio_widgets_data_source ON studio_widgets(data_source);

-- Enable RLS (inherits from dashboard)
ALTER TABLE studio_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY studio_widgets_policy ON studio_widgets
    FOR ALL USING (dashboard_id IN (
        SELECT id FROM studio_dashboards WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- ============================================================================
-- STUDIO DATA SOURCES TABLE
-- External data connections (CSV, Google Sheets, API)
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),

    -- Source Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL,              -- csv, google_sheets, api, database

    -- Connection Config
    connection_config JSONB DEFAULT '{}',
    -- For CSV: {fileUrl, fileName, delimiter, hasHeader}
    -- For Sheets: {spreadsheetId, sheetName, range, credentials}
    -- For API: {url, method, headers, auth, refreshInterval}
    -- For Database: {host, port, database, username, password (encrypted), query}

    -- File Upload (for CSV)
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,

    -- Google Sheets
    spreadsheet_id VARCHAR(255),
    sheet_name VARCHAR(255),
    range VARCHAR(100),                     -- e.g., 'A1:Z1000'

    -- Schema Definition
    schema JSONB DEFAULT '[]',              -- [{name: 'date', type: 'date', format: 'YYYY-MM-DD'}, ...]

    -- Refresh Settings
    auto_refresh BOOLEAN DEFAULT false,
    refresh_interval_minutes INTEGER,       -- null = manual only
    last_refreshed_at TIMESTAMPTZ,

    -- Cached Data
    cached_data JSONB,
    row_count INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'active',    -- active, error, refreshing, deleted
    last_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_studio_data_sources_org_id ON studio_data_sources(organization_id);
CREATE INDEX idx_studio_data_sources_type ON studio_data_sources(type);
CREATE INDEX idx_studio_data_sources_status ON studio_data_sources(status);

-- Enable RLS
ALTER TABLE studio_data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY studio_data_sources_org_policy ON studio_data_sources
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- STUDIO TEMPLATES TABLE
-- Pre-built dashboard templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail TEXT,
    category VARCHAR(50) NOT NULL,          -- marketing, ecommerce, leads, social, analytics, reporting

    -- Required Data Sources
    required_sources JSONB DEFAULT '[]',    -- ['meta_ads', 'google_ads', 'conversions']

    -- Template Configuration (widgets, layout)
    config JSONB NOT NULL,                  -- Full dashboard config to clone

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    is_premium BOOLEAN DEFAULT false,       -- Requires paid plan
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,

    -- Author (null = AdsMaster official)
    author_name VARCHAR(255),
    author_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_studio_templates_category ON studio_templates(category);
CREATE INDEX idx_studio_templates_is_active ON studio_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_studio_templates_is_premium ON studio_templates(is_premium);
CREATE INDEX idx_studio_templates_usage ON studio_templates(usage_count DESC);

-- ============================================================================
-- STUDIO SCHEDULED REPORTS TABLE
-- Automated report delivery
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES studio_dashboards(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),

    -- Schedule Info
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,

    -- Frequency
    frequency VARCHAR(20) NOT NULL,         -- daily, weekly, monthly
    day_of_week INTEGER,                    -- 0-6 for weekly (0 = Sunday)
    day_of_month INTEGER,                   -- 1-31 for monthly
    hour INTEGER NOT NULL DEFAULT 9,        -- 0-23 (24-hour format)
    minute INTEGER NOT NULL DEFAULT 0,      -- 0-59
    timezone VARCHAR(50) DEFAULT 'UTC',

    -- Recipients
    recipients JSONB NOT NULL DEFAULT '[]', -- [{email: '...', name: '...'}, ...]

    -- Format
    format VARCHAR(20) DEFAULT 'pdf',       -- pdf, png, csv, excel
    include_comparison BOOLEAN DEFAULT true,
    custom_date_range VARCHAR(50),          -- Override dashboard default

    -- Email Customization
    email_subject VARCHAR(255),
    email_body TEXT,
    include_inline_preview BOOLEAN DEFAULT true,

    -- Status
    last_sent_at TIMESTAMPTZ,
    next_scheduled_at TIMESTAMPTZ,
    send_count INTEGER DEFAULT 0,
    last_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_studio_scheduled_reports_dashboard_id ON studio_scheduled_reports(dashboard_id);
CREATE INDEX idx_studio_scheduled_reports_active ON studio_scheduled_reports(is_active) WHERE is_active = true;
CREATE INDEX idx_studio_scheduled_reports_next ON studio_scheduled_reports(next_scheduled_at);

-- Enable RLS
ALTER TABLE studio_scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY studio_scheduled_reports_policy ON studio_scheduled_reports
    FOR ALL USING (dashboard_id IN (
        SELECT id FROM studio_dashboards WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    ));

-- ============================================================================
-- SEED DEFAULT TEMPLATES
-- ============================================================================
INSERT INTO studio_templates (name, description, thumbnail, category, required_sources, config, is_premium) VALUES
(
    'Marketing Overview',
    'High-level marketing performance across all ad platforms',
    NULL,
    'marketing',
    '["meta_ads", "google_ads"]',
    '{"widgets": []}',
    false
),
(
    'E-commerce Sales Dashboard',
    'Track sales, revenue, and product performance',
    NULL,
    'ecommerce',
    '["conversions", "products"]',
    '{"widgets": []}',
    false
),
(
    'Lead Generation Tracker',
    'Monitor lead funnel and conversion rates',
    NULL,
    'leads',
    '["conversions", "visitors"]',
    '{"widgets": []}',
    false
),
(
    'Agency Client Report',
    'Professional client-facing report with branding',
    NULL,
    'reporting',
    '["meta_ads", "google_ads", "conversions"]',
    '{"widgets": []}',
    true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE studio_dashboards IS 'Custom dashboard definitions with layout, settings, and sharing options.';
COMMENT ON TABLE studio_widgets IS 'Individual widgets within dashboards with data source and visualization config.';
COMMENT ON TABLE studio_data_sources IS 'External data connections (CSV, Google Sheets, APIs) for dashboard widgets.';
COMMENT ON TABLE studio_templates IS 'Pre-built dashboard templates users can clone.';
COMMENT ON TABLE studio_scheduled_reports IS 'Automated report delivery schedules with email configuration.';
COMMENT ON COLUMN studio_widgets.formula IS 'Calculation formula for derived metrics. Use {{field_name}} for references.';
