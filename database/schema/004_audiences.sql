-- ============================================================================
-- 004_audiences.sql
-- Custom audiences for remarketing, lookalikes, and customer lists
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE audience_type AS ENUM ('REMARKETING', 'CUSTOMER_LIST', 'LOOKALIKE', 'ENGAGEMENT');
CREATE TYPE audience_status AS ENUM ('ACTIVE', 'PAUSED', 'PENDING', 'ERROR', 'DELETED');
CREATE TYPE audience_platform AS ENUM ('google', 'meta');

-- ============================================================================
-- AUDIENCES TABLE
-- ============================================================================

CREATE TABLE audiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE SET NULL,

    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    platform audience_platform NOT NULL,
    type audience_type NOT NULL,

    -- Source configuration
    source VARCHAR(100) NOT NULL, -- e.g., 'all_visitors', 'cart_abandoners', 'email_list'
    source_config JSONB DEFAULT '{}'::jsonb, -- additional source configuration

    -- Lookback/membership duration
    lookback_days INTEGER DEFAULT 30,
    membership_days INTEGER DEFAULT 30, -- how long users stay in audience

    -- Platform-specific IDs (populated after creation on platform)
    platform_audience_id VARCHAR(255), -- Google audience ID or Meta custom audience ID
    platform_sync_status VARCHAR(50) DEFAULT 'pending', -- pending, synced, error
    platform_sync_error TEXT,
    last_platform_sync_at TIMESTAMPTZ,

    -- Status
    status audience_status NOT NULL DEFAULT 'PENDING',
    status_reason TEXT,

    -- Size metrics (updated periodically)
    estimated_size INTEGER DEFAULT 0,
    actual_size INTEGER,
    size_updated_at TIMESTAMPTZ,

    -- Usage metrics
    campaigns_using INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_spend_micros BIGINT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- soft delete

);

-- ============================================================================
-- AUDIENCE MEMBERS TABLE (for customer list uploads)
-- ============================================================================

CREATE TABLE audience_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    audience_id UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,

    -- Member identification (hashed for privacy)
    email_hash VARCHAR(64), -- SHA256 hash of normalized email
    phone_hash VARCHAR(64), -- SHA256 hash of normalized phone
    external_id VARCHAR(255), -- CRM or user ID

    -- Match status
    matched BOOLEAN DEFAULT FALSE,
    matched_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure at least one identifier
    CONSTRAINT at_least_one_identifier CHECK (
        email_hash IS NOT NULL OR phone_hash IS NOT NULL OR external_id IS NOT NULL
    )
);

-- ============================================================================
-- AUDIENCE RULES TABLE (for remarketing rules)
-- ============================================================================

CREATE TABLE audience_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    audience_id UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,

    -- Rule definition
    rule_type VARCHAR(50) NOT NULL, -- 'url_contains', 'url_equals', 'event', 'page_view'
    rule_operator VARCHAR(20) NOT NULL, -- 'contains', 'equals', 'starts_with', 'regex'
    rule_value TEXT NOT NULL, -- the pattern to match

    -- Rule logic
    is_exclude BOOLEAN DEFAULT FALSE, -- true = exclude matching users

    -- Order for multiple rules
    rule_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIENCE CAMPAIGNS LINK TABLE
-- ============================================================================

CREATE TABLE audience_campaign_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    audience_id UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
    campaign_id VARCHAR(255) NOT NULL, -- platform campaign ID

    -- Link type
    targeting_type VARCHAR(50) NOT NULL DEFAULT 'targeting', -- 'targeting' or 'exclusion'

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(audience_id, campaign_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Audiences
CREATE INDEX idx_audiences_org ON audiences(organization_id);
CREATE INDEX idx_audiences_account ON audiences(ad_account_id);
CREATE INDEX idx_audiences_platform ON audiences(platform);
CREATE INDEX idx_audiences_type ON audiences(type);
CREATE INDEX idx_audiences_status ON audiences(status);
CREATE INDEX idx_audiences_platform_id ON audiences(platform_audience_id) WHERE platform_audience_id IS NOT NULL;
CREATE INDEX idx_audiences_active ON audiences(organization_id, status) WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- Audience members
CREATE INDEX idx_audience_members_audience ON audience_members(audience_id);
CREATE INDEX idx_audience_members_email ON audience_members(email_hash) WHERE email_hash IS NOT NULL;
CREATE INDEX idx_audience_members_phone ON audience_members(phone_hash) WHERE phone_hash IS NOT NULL;

-- Audience rules
CREATE INDEX idx_audience_rules_audience ON audience_rules(audience_id);

-- Audience campaign links
CREATE INDEX idx_audience_campaigns_audience ON audience_campaign_links(audience_id);
CREATE INDEX idx_audience_campaigns_campaign ON audience_campaign_links(campaign_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_audiences_updated_at
    BEFORE UPDATE ON audiences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audience_rules_updated_at
    BEFORE UPDATE ON audience_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audience_campaign_links_updated_at
    BEFORE UPDATE ON audience_campaign_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_campaign_links ENABLE ROW LEVEL SECURITY;

-- Audiences: users can only see their organization's audiences
CREATE POLICY audiences_org_isolation ON audiences
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Audience members: inherit from parent audience
CREATE POLICY audience_members_org_isolation ON audience_members
    FOR ALL
    USING (
        audience_id IN (
            SELECT id FROM audiences
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- Audience rules: inherit from parent audience
CREATE POLICY audience_rules_org_isolation ON audience_rules
    FOR ALL
    USING (
        audience_id IN (
            SELECT id FROM audiences
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- Audience campaign links: inherit from parent audience
CREATE POLICY audience_campaigns_org_isolation ON audience_campaign_links
    FOR ALL
    USING (
        audience_id IN (
            SELECT id FROM audiences
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get audience stats
CREATE OR REPLACE FUNCTION get_audience_stats(p_organization_id UUID)
RETURNS TABLE (
    total_audiences INTEGER,
    active_audiences INTEGER,
    paused_audiences INTEGER,
    total_reach BIGINT,
    google_audiences INTEGER,
    meta_audiences INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_audiences,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::INTEGER as active_audiences,
        COUNT(*) FILTER (WHERE status = 'PAUSED')::INTEGER as paused_audiences,
        COALESCE(SUM(estimated_size), 0)::BIGINT as total_reach,
        COUNT(*) FILTER (WHERE platform = 'google')::INTEGER as google_audiences,
        COUNT(*) FILTER (WHERE platform = 'meta')::INTEGER as meta_audiences
    FROM audiences
    WHERE organization_id = p_organization_id
      AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to soft delete audience
CREATE OR REPLACE FUNCTION soft_delete_audience(p_audience_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE audiences
    SET
        deleted_at = NOW(),
        status = 'DELETED'
    WHERE id = p_audience_id;
END;
$$ LANGUAGE plpgsql;
