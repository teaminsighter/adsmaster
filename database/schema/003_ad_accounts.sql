-- ============================================================================
-- 003_ad_accounts.sql
-- Ad platform connections and OAuth token storage
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE ad_platform AS ENUM ('google_ads', 'meta', 'tiktok', 'linkedin', 'twitter');
CREATE TYPE account_status AS ENUM ('active', 'paused', 'disconnected', 'error', 'pending_auth');

-- ============================================================================
-- AD ACCOUNTS TABLE
-- ============================================================================

CREATE TABLE ad_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Platform identification
    platform ad_platform NOT NULL,
    platform_account_id VARCHAR(255) NOT NULL, -- Google CID, Meta Account ID, etc.

    -- Account info (synced from platform)
    account_name VARCHAR(255),
    currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(100) DEFAULT 'UTC',

    -- Manager account (for Google Ads MCC)
    manager_account_id VARCHAR(255), -- parent MCC if applicable
    is_manager_account BOOLEAN DEFAULT FALSE,

    -- Status
    status account_status NOT NULL DEFAULT 'pending_auth',
    status_reason TEXT, -- error message if status = error

    -- Sync status
    last_sync_at TIMESTAMPTZ,
    last_successful_sync_at TIMESTAMPTZ,
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_frequency_minutes INTEGER DEFAULT 60, -- how often to sync

    -- Account-level settings
    settings JSONB DEFAULT '{
        "auto_pause_waste": true,
        "waste_threshold_days": 7,
        "waste_threshold_spend": 50,
        "daily_budget_limit": null,
        "alert_on_anomaly": true,
        "anomaly_threshold_percent": 50
    }'::jsonb,

    -- Metadata from platform
    platform_metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(platform, platform_account_id)
);

-- ============================================================================
-- OAUTH TOKENS TABLE (encrypted storage)
-- ============================================================================

CREATE TABLE oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,

    -- Token storage (encrypted at application level)
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,

    -- Token info
    token_type VARCHAR(50) DEFAULT 'Bearer',

    -- Expiration
    access_token_expires_at TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,

    -- Scopes granted
    scopes TEXT[], -- array of OAuth scopes

    -- Status
    is_valid BOOLEAN DEFAULT TRUE,
    invalidated_at TIMESTAMPTZ,
    invalidation_reason TEXT,

    -- Refresh tracking
    last_refresh_at TIMESTAMPTZ,
    refresh_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- GOOGLE ADS SPECIFIC: LOGIN CUSTOMER ID MAPPING
-- ============================================================================

CREATE TABLE google_ads_customer_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,

    -- Google Ads specific
    customer_id VARCHAR(20) NOT NULL, -- Google Ads Customer ID (without dashes)
    login_customer_id VARCHAR(20), -- MCC login customer ID

    -- Access level
    access_role VARCHAR(50), -- ADMIN, STANDARD, READ_ONLY

    -- Linked accounts (for MCC)
    linked_account_ids TEXT[], -- child accounts if MCC

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ad_account_id, customer_id)
);

-- ============================================================================
-- META SPECIFIC: AD ACCOUNT TO BUSINESS MAPPING
-- ============================================================================

CREATE TABLE meta_business_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,

    -- Meta specific
    business_id VARCHAR(50), -- Meta Business ID
    ad_account_id_meta VARCHAR(50) NOT NULL, -- act_xxxxx

    -- Permissions
    permitted_tasks TEXT[], -- ADVERTISE, ANALYZE, etc.

    -- Pages connected
    connected_page_ids TEXT[],

    -- Instagram accounts
    connected_instagram_ids TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ad_account_id, ad_account_id_meta)
);

-- ============================================================================
-- AD ACCOUNT SYNC LOG
-- ============================================================================

CREATE TABLE ad_account_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,

    -- Sync info
    sync_type VARCHAR(50) NOT NULL, -- full, incremental, metrics, search_terms
    status VARCHAR(20) NOT NULL, -- started, completed, failed

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Results
    records_synced INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,

    -- Errors
    error_message TEXT,
    error_details JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Ad accounts
CREATE INDEX idx_ad_accounts_org ON ad_accounts(organization_id);
CREATE INDEX idx_ad_accounts_platform ON ad_accounts(platform);
CREATE INDEX idx_ad_accounts_status ON ad_accounts(status);
CREATE INDEX idx_ad_accounts_platform_id ON ad_accounts(platform, platform_account_id);
CREATE INDEX idx_ad_accounts_sync ON ad_accounts(sync_enabled, last_sync_at)
    WHERE sync_enabled = TRUE;

-- OAuth tokens
CREATE INDEX idx_oauth_tokens_account ON oauth_tokens(ad_account_id);
CREATE INDEX idx_oauth_tokens_valid ON oauth_tokens(ad_account_id, is_valid)
    WHERE is_valid = TRUE;
CREATE INDEX idx_oauth_tokens_expiry ON oauth_tokens(access_token_expires_at);

-- Google Ads links
CREATE INDEX idx_google_links_account ON google_ads_customer_links(ad_account_id);
CREATE INDEX idx_google_links_customer ON google_ads_customer_links(customer_id);

-- Meta links
CREATE INDEX idx_meta_links_account ON meta_business_links(ad_account_id);
CREATE INDEX idx_meta_links_business ON meta_business_links(business_id);

-- Sync log
CREATE INDEX idx_sync_log_account ON ad_account_sync_log(ad_account_id);
CREATE INDEX idx_sync_log_started ON ad_account_sync_log(ad_account_id, started_at DESC);
CREATE INDEX idx_sync_log_status ON ad_account_sync_log(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_ad_accounts_updated_at
    BEFORE UPDATE ON ad_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at
    BEFORE UPDATE ON oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_links_updated_at
    BEFORE UPDATE ON google_ads_customer_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_links_updated_at
    BEFORE UPDATE ON meta_business_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get active token for an ad account
CREATE OR REPLACE FUNCTION get_active_oauth_token(p_ad_account_id UUID)
RETURNS TABLE (
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ot.access_token_encrypted,
        ot.refresh_token_encrypted,
        ot.access_token_expires_at
    FROM oauth_tokens ot
    WHERE ot.ad_account_id = p_ad_account_id
      AND ot.is_valid = TRUE
    ORDER BY ot.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to mark token as invalid
CREATE OR REPLACE FUNCTION invalidate_oauth_token(
    p_ad_account_id UUID,
    p_reason TEXT DEFAULT 'Token revoked'
)
RETURNS VOID AS $$
BEGIN
    UPDATE oauth_tokens
    SET
        is_valid = FALSE,
        invalidated_at = NOW(),
        invalidation_reason = p_reason
    WHERE ad_account_id = p_ad_account_id
      AND is_valid = TRUE;

    -- Also update ad account status
    UPDATE ad_accounts
    SET
        status = 'disconnected',
        status_reason = p_reason
    WHERE id = p_ad_account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if sync is needed
CREATE OR REPLACE FUNCTION needs_sync(p_ad_account_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_last_sync TIMESTAMPTZ;
    v_frequency INTEGER;
    v_sync_enabled BOOLEAN;
BEGIN
    SELECT last_sync_at, sync_frequency_minutes, sync_enabled
    INTO v_last_sync, v_frequency, v_sync_enabled
    FROM ad_accounts
    WHERE id = p_ad_account_id;

    IF NOT v_sync_enabled THEN
        RETURN FALSE;
    END IF;

    IF v_last_sync IS NULL THEN
        RETURN TRUE;
    END IF;

    RETURN v_last_sync < NOW() - (v_frequency || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
