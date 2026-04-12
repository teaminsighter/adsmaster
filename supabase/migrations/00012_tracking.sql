-- Migration: 00012_tracking.sql
-- Description: Add visitor tracking, offline conversions, and session recording tables
-- Created: 2026-04-11

-- ============================================================================
-- VISITORS TABLE
-- Stores visitor data captured by tracker.js
-- ============================================================================
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id VARCHAR(64) NOT NULL,  -- Client-side generated (am_vid cookie)

    -- Click IDs (Ad Attribution)
    gclid VARCHAR(255),               -- Google Ads Click ID
    fbclid VARCHAR(255),              -- Facebook/Meta Click ID
    gbraid VARCHAR(255),              -- Google Ads App Click ID (iOS)
    wbraid VARCHAR(255),              -- Google Ads Web-to-App Click ID
    msclkid VARCHAR(255),             -- Microsoft Ads Click ID
    ttclkid VARCHAR(255),             -- TikTok Click ID
    li_fat_id VARCHAR(255),           -- LinkedIn Click ID

    -- Facebook Cookies
    fbp VARCHAR(255),                 -- _fbp cookie
    fbc VARCHAR(255),                 -- _fbc cookie

    -- UTM Parameters
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),

    -- Landing & Referrer
    landing_page TEXT,
    referrer TEXT,

    -- Device & Browser Info
    ip_address INET,
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(50),
    user_agent TEXT,
    device_type VARCHAR(20),          -- desktop, mobile, tablet
    browser VARCHAR(50),
    browser_version VARCHAR(20),
    os VARCHAR(50),
    os_version VARCHAR(20),
    screen_width INTEGER,
    screen_height INTEGER,

    -- Contact Info (set via identify)
    email VARCHAR(255),
    phone VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),

    -- Custom Data
    custom_data JSONB DEFAULT '{}',

    -- Stats
    page_views INTEGER DEFAULT 1,
    events_count INTEGER DEFAULT 0,

    -- Timestamps
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    identified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique per organization
    CONSTRAINT visitors_org_visitor_unique UNIQUE(organization_id, visitor_id)
);

-- Indexes for visitors
CREATE INDEX idx_visitors_org_id ON visitors(organization_id);
CREATE INDEX idx_visitors_gclid ON visitors(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX idx_visitors_fbclid ON visitors(fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX idx_visitors_email ON visitors(email) WHERE email IS NOT NULL;
CREATE INDEX idx_visitors_first_seen ON visitors(first_seen_at DESC);
CREATE INDEX idx_visitors_last_seen ON visitors(last_seen_at DESC);
CREATE INDEX idx_visitors_utm_source ON visitors(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX idx_visitors_utm_campaign ON visitors(utm_campaign) WHERE utm_campaign IS NOT NULL;

-- ============================================================================
-- VISITOR EVENTS TABLE
-- Stores individual tracking events (pageviews, custom events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS visitor_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    session_id VARCHAR(64),

    -- Event Info
    event_type VARCHAR(50) NOT NULL,  -- pageview, click, form_submit, custom
    event_name VARCHAR(100),          -- Custom event name

    -- Page Info
    page_url TEXT,
    page_path VARCHAR(500),
    page_title VARCHAR(500),
    referrer TEXT,

    -- Event Data
    event_data JSONB DEFAULT '{}',

    -- Timestamps
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for visitor_events
CREATE INDEX idx_visitor_events_org_id ON visitor_events(organization_id);
CREATE INDEX idx_visitor_events_visitor_id ON visitor_events(visitor_id);
CREATE INDEX idx_visitor_events_session_id ON visitor_events(session_id);
CREATE INDEX idx_visitor_events_type ON visitor_events(event_type);
CREATE INDEX idx_visitor_events_occurred_at ON visitor_events(occurred_at DESC);

-- ============================================================================
-- OFFLINE CONVERSIONS TABLE
-- Stores conversions to sync to ad platforms (Meta CAPI, Google Ads)
-- ============================================================================
CREATE TABLE IF NOT EXISTS offline_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,

    -- Contact Info (required for hashing and matching)
    email VARCHAR(255),
    email_hash VARCHAR(64),           -- SHA256 hash for API calls
    phone VARCHAR(50),
    phone_hash VARCHAR(64),           -- SHA256 hash for API calls
    first_name VARCHAR(100),
    first_name_hash VARCHAR(64),
    last_name VARCHAR(100),
    last_name_hash VARCHAR(64),

    -- Conversion Details
    conversion_type VARCHAR(50) NOT NULL,  -- lead, purchase, signup, add_to_cart, etc.
    conversion_name VARCHAR(255),          -- Custom name/label
    value_micros BIGINT DEFAULT 0,         -- Value in micros (1 USD = 1,000,000)
    currency VARCHAR(3) DEFAULT 'USD',
    quantity INTEGER DEFAULT 1,
    order_id VARCHAR(255),                 -- External order/transaction ID

    -- Click ID Attribution
    gclid VARCHAR(255),
    fbclid VARCHAR(255),
    gbraid VARCHAR(255),
    wbraid VARCHAR(255),
    msclkid VARCHAR(255),
    ttclkid VARCHAR(255),

    -- Facebook Cookies
    fbp VARCHAR(255),
    fbc VARCHAR(255),

    -- UTM Attribution
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),

    -- Source of Conversion
    source VARCHAR(50) NOT NULL DEFAULT 'manual',  -- manual, website, webhook, crm, csv, api
    source_name VARCHAR(100),                       -- Specific source (e.g., "Pipedrive", "Contact Form")
    external_id VARCHAR(255),                       -- ID in source system
    webhook_id UUID,                                -- If from webhook

    -- Client Info (for API calls)
    ip_address INET,
    user_agent TEXT,

    -- Lead Status
    lead_status VARCHAR(50) DEFAULT 'new',  -- new, contacted, qualified, converted, lost

    -- Meta (Facebook) CAPI Sync
    meta_sync_status VARCHAR(20) DEFAULT 'pending',  -- pending, synced, failed, skipped
    meta_synced_at TIMESTAMPTZ,
    meta_event_id VARCHAR(255),
    meta_error_message TEXT,
    meta_pixel_id VARCHAR(50),

    -- Google Ads Offline Conversions Sync
    google_sync_status VARCHAR(20) DEFAULT 'pending',
    google_synced_at TIMESTAMPTZ,
    google_conversion_action_id VARCHAR(50),
    google_error_message TEXT,

    -- Microsoft Ads Sync
    microsoft_sync_status VARCHAR(20) DEFAULT 'pending',
    microsoft_synced_at TIMESTAMPTZ,
    microsoft_error_message TEXT,

    -- TikTok Events API Sync
    tiktok_sync_status VARCHAR(20) DEFAULT 'pending',
    tiktok_synced_at TIMESTAMPTZ,
    tiktok_error_message TEXT,

    -- Custom Data
    custom_data JSONB DEFAULT '{}',

    -- Timestamps
    occurred_at TIMESTAMPTZ NOT NULL,      -- When conversion actually happened
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for offline_conversions
CREATE INDEX idx_offline_conv_org_id ON offline_conversions(organization_id);
CREATE INDEX idx_offline_conv_visitor_id ON offline_conversions(visitor_id);
CREATE INDEX idx_offline_conv_email ON offline_conversions(email) WHERE email IS NOT NULL;
CREATE INDEX idx_offline_conv_gclid ON offline_conversions(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX idx_offline_conv_fbclid ON offline_conversions(fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX idx_offline_conv_type ON offline_conversions(conversion_type);
CREATE INDEX idx_offline_conv_source ON offline_conversions(source);
CREATE INDEX idx_offline_conv_occurred_at ON offline_conversions(occurred_at DESC);
CREATE INDEX idx_offline_conv_meta_status ON offline_conversions(meta_sync_status);
CREATE INDEX idx_offline_conv_google_status ON offline_conversions(google_sync_status);
CREATE INDEX idx_offline_conv_lead_status ON offline_conversions(lead_status);

-- ============================================================================
-- SESSION RECORDINGS TABLE
-- Stores rrweb session recordings for replay
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    session_id VARCHAR(64) NOT NULL,

    -- Session Info
    start_url TEXT,
    start_path VARCHAR(500),
    pages_visited INTEGER DEFAULT 1,

    -- Duration
    duration_ms INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,

    -- Device Info (snapshot)
    device_type VARCHAR(20),
    viewport_width INTEGER,
    viewport_height INTEGER,

    -- Recording Status
    status VARCHAR(20) DEFAULT 'recording',  -- recording, completed, error

    -- Events stored in separate table for performance
    -- or inline for small recordings
    events_inline JSONB,                      -- For small recordings < 1MB
    events_storage_url TEXT,                  -- For large recordings (S3/GCS)

    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT session_recordings_org_session_unique UNIQUE(organization_id, session_id)
);

-- Indexes for session_recordings
CREATE INDEX idx_session_rec_org_id ON session_recordings(organization_id);
CREATE INDEX idx_session_rec_visitor_id ON session_recordings(visitor_id);
CREATE INDEX idx_session_rec_started_at ON session_recordings(started_at DESC);
CREATE INDEX idx_session_rec_duration ON session_recordings(duration_ms DESC);

-- ============================================================================
-- WEBHOOK ENDPOINTS TABLE
-- Stores webhook configurations for receiving external data
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Webhook Config
    name VARCHAR(255) NOT NULL,
    description TEXT,
    secret_key VARCHAR(64) NOT NULL,       -- For webhook URL: /webhooks/{id}?key={secret_key}

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Field Mapping (how to map incoming fields to conversion fields)
    field_mapping JSONB DEFAULT '{
        "email": "email",
        "phone": "phone",
        "firstName": "first_name",
        "lastName": "last_name",
        "value": "value",
        "gclid": "gclid",
        "fbclid": "fbclid"
    }',

    -- Default Values
    default_conversion_type VARCHAR(50) DEFAULT 'lead',
    default_source_name VARCHAR(100),

    -- Stats
    events_received INTEGER DEFAULT 0,
    events_success INTEGER DEFAULT 0,
    events_failed INTEGER DEFAULT 0,
    last_event_at TIMESTAMPTZ,
    last_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook_endpoints
CREATE INDEX idx_webhook_endpoints_org_id ON webhook_endpoints(organization_id);
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(is_active);

-- ============================================================================
-- WEBHOOK EVENTS LOG TABLE
-- Logs all incoming webhook events for debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Request Info
    request_body JSONB,
    request_headers JSONB,
    ip_address INET,

    -- Processing Result
    status VARCHAR(20) NOT NULL,  -- success, failed, invalid
    error_message TEXT,
    conversion_id UUID REFERENCES offline_conversions(id),

    -- Timestamps
    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook_events_log
CREATE INDEX idx_webhook_events_webhook_id ON webhook_events_log(webhook_id);
CREATE INDEX idx_webhook_events_received_at ON webhook_events_log(received_at DESC);
-- Note: Auto-cleanup of old logs (>30 days) should be done via scheduled job, not partial index

-- ============================================================================
-- TRACKING DOMAINS TABLE
-- Custom subdomains for first-party tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS tracking_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Domain Info
    subdomain VARCHAR(100) NOT NULL,       -- e.g., "track" for track.example.com
    domain VARCHAR(255) NOT NULL,          -- e.g., "example.com"
    full_domain VARCHAR(355) GENERATED ALWAYS AS (subdomain || '.' || domain) STORED,

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(64),
    verified_at TIMESTAMPTZ,

    -- SSL
    ssl_status VARCHAR(20) DEFAULT 'pending',  -- pending, active, failed
    ssl_issued_at TIMESTAMPTZ,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT tracking_domains_unique UNIQUE(subdomain, domain)
);

-- Indexes for tracking_domains
CREATE INDEX idx_tracking_domains_org_id ON tracking_domains(organization_id);
CREATE INDEX idx_tracking_domains_full ON tracking_domains(full_domain);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their organization's data)
CREATE POLICY visitors_org_policy ON visitors
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY visitor_events_org_policy ON visitor_events
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY offline_conversions_org_policy ON offline_conversions
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY session_recordings_org_policy ON session_recordings
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY webhook_endpoints_org_policy ON webhook_endpoints
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY webhook_events_log_org_policy ON webhook_events_log
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY tracking_domains_org_policy ON tracking_domains
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update visitor stats
CREATE OR REPLACE FUNCTION update_visitor_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE visitors
    SET
        page_views = page_views + CASE WHEN NEW.event_type = 'pageview' THEN 1 ELSE 0 END,
        events_count = events_count + 1,
        last_seen_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.visitor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update visitor stats on new event
CREATE TRIGGER trigger_update_visitor_stats
    AFTER INSERT ON visitor_events
    FOR EACH ROW
    EXECUTE FUNCTION update_visitor_stats();

-- Function to hash PII for API calls
CREATE OR REPLACE FUNCTION hash_pii(input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF input IS NULL OR input = '' THEN
        RETURN NULL;
    END IF;
    -- Normalize: lowercase, trim whitespace
    RETURN encode(sha256(lower(trim(input))::bytea), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-hash PII on offline_conversions insert/update
CREATE OR REPLACE FUNCTION hash_conversion_pii()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_hash := hash_pii(NEW.email);
    NEW.phone_hash := hash_pii(regexp_replace(NEW.phone, '[^0-9+]', '', 'g'));
    NEW.first_name_hash := hash_pii(NEW.first_name);
    NEW.last_name_hash := hash_pii(NEW.last_name);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hash_conversion_pii
    BEFORE INSERT OR UPDATE ON offline_conversions
    FOR EACH ROW
    EXECUTE FUNCTION hash_conversion_pii();

-- ============================================================================
-- SEED DATA: Conversion Types
-- ============================================================================
COMMENT ON TABLE offline_conversions IS 'Standard conversion types: lead, purchase, signup, add_to_cart, initiate_checkout, complete_registration, subscribe, start_trial, contact, schedule, view_content, search, add_payment_info, add_to_wishlist, custom';
