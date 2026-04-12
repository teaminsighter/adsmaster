-- ============================================================================
-- 00008_admin_complete.sql
-- Complete Admin Panel - All New Tables
-- ============================================================================

-- ============================================================================
-- PART 1: MARKETING ANALYTICS
-- ============================================================================

-- 1.1 Landing Page Visits
CREATE TABLE IF NOT EXISTS landing_page_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) NOT NULL,
    visitor_fingerprint VARCHAR(64),

    -- Traffic source
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    referrer VARCHAR(500),
    referrer_domain VARCHAR(255),

    -- Landing page info
    landing_page VARCHAR(255),
    exit_page VARCHAR(255),
    page_views_count INT DEFAULT 1,
    time_on_site_seconds INT,

    -- Visitor info
    ip_address VARCHAR(45),
    country_code VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    device_type VARCHAR(20),
    browser VARCHAR(50),
    browser_version VARCHAR(20),
    os VARCHAR(50),
    os_version VARCHAR(20),
    screen_resolution VARCHAR(20),

    -- Conversion tracking
    converted_to_signup BOOLEAN DEFAULT false,
    converted_at TIMESTAMPTZ,
    signup_user_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Signup Sources
CREATE TABLE IF NOT EXISTS signup_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,

    -- Auth method
    auth_method VARCHAR(50) NOT NULL,
    oauth_provider VARCHAR(50),

    -- Source attribution
    landing_visit_id UUID REFERENCES landing_page_visits(id),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    referrer VARCHAR(500),

    -- First touch vs last touch
    first_touch_source VARCHAR(100),
    last_touch_source VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 Email Subscribers
CREATE TABLE IF NOT EXISTS email_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    source VARCHAR(100),
    utm_campaign VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    user_id UUID,

    UNIQUE(email)
);

-- 1.4 Funnel Events
CREATE TABLE IF NOT EXISTS funnel_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100),
    user_id UUID,

    event_type VARCHAR(100) NOT NULL,
    event_properties JSONB DEFAULT '{}',
    page_path VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: API VERSION MONITORING
-- ============================================================================

-- 2.1 API Version Tracking
CREATE TABLE IF NOT EXISTS api_version_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL UNIQUE,

    current_version VARCHAR(20),
    latest_version VARCHAR(20),
    deprecated_versions TEXT[],
    sunset_dates JSONB DEFAULT '{}',

    adapter_versions_available TEXT[],
    production_adapter_version VARCHAR(20),

    last_health_check TIMESTAMPTZ,
    api_status VARCHAR(50) DEFAULT 'unknown',
    error_rate_24h DECIMAL(5,2) DEFAULT 0,
    avg_latency_ms INT DEFAULT 0,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 API Changelog Entries
CREATE TABLE IF NOT EXISTS api_changelog_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,

    change_type VARCHAR(50),
    title VARCHAR(255),
    description TEXT,
    affected_endpoints TEXT[],
    migration_required BOOLEAN DEFAULT false,

    announced_at TIMESTAMPTZ,
    effective_at TIMESTAMPTZ,
    sunset_at TIMESTAMPTZ,

    migration_status VARCHAR(50) DEFAULT 'not_started',
    migration_notes TEXT,
    completed_at TIMESTAMPTZ,

    source_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 API Expense Logs
CREATE TABLE IF NOT EXISTS api_expense_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    platform VARCHAR(50) NOT NULL,
    service_type VARCHAR(50),
    endpoint VARCHAR(255),

    request_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,

    quota_units_used INT DEFAULT 0,
    estimated_cost_usd DECIMAL(10,4) DEFAULT 0,

    total_latency_ms BIGINT DEFAULT 0,

    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 API Alerts
CREATE TABLE IF NOT EXISTS api_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    alert_type VARCHAR(100),
    severity VARCHAR(20) DEFAULT 'info',
    title VARCHAR(255),
    message TEXT,
    metadata JSONB DEFAULT '{}',
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 3: AI & ML CONTROL
-- ============================================================================

-- 3.1 AI Model Configurations
CREATE TABLE IF NOT EXISTS ai_model_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    feature VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,

    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INT DEFAULT 2048,
    top_p DECIMAL(3,2) DEFAULT 1.0,
    frequency_penalty DECIMAL(3,2) DEFAULT 0,
    presence_penalty DECIMAL(3,2) DEFAULT 0,

    fallback_provider VARCHAR(50),
    fallback_model VARCHAR(100),

    is_active BOOLEAN DEFAULT true,
    priority INT DEFAULT 0,

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 AI Prompts
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL UNIQUE,
    feature VARCHAR(100) NOT NULL,
    version INT DEFAULT 1,

    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT,

    is_active BOOLEAN DEFAULT true,
    is_production BOOLEAN DEFAULT false,

    ab_test_id UUID,
    ab_test_variant VARCHAR(50),

    usage_count INT DEFAULT 0,
    avg_rating DECIMAL(3,2),

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 AI Prompts History
CREATE TABLE IF NOT EXISTS ai_prompts_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES ai_prompts(id) ON DELETE CASCADE,
    version INT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT,
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 Recommendation Rules Configuration
CREATE TABLE IF NOT EXISTS recommendation_rules_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    rule_type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    is_enabled BOOLEAN DEFAULT true,
    priority INT DEFAULT 50,

    thresholds JSONB NOT NULL DEFAULT '{}',

    min_confidence_score DECIMAL(3,2) DEFAULT 0.7,
    require_approval BOOLEAN DEFAULT true,

    applies_to_plans TEXT[],
    applies_to_platforms TEXT[],

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5 AI Cost Budgets
CREATE TABLE IF NOT EXISTS ai_cost_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    scope_type VARCHAR(50) NOT NULL,
    scope_id VARCHAR(255),

    daily_budget_usd DECIMAL(10,2),
    monthly_budget_usd DECIMAL(10,2),

    current_daily_spend DECIMAL(10,4) DEFAULT 0,
    current_monthly_spend DECIMAL(10,4) DEFAULT 0,

    alert_at_percentage INT DEFAULT 80,
    action_at_limit VARCHAR(50) DEFAULT 'alert',

    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 4: FEATURE FLAGS & SYSTEM
-- ============================================================================

-- 4.1 Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    is_enabled BOOLEAN DEFAULT false,
    rollout_percentage INT DEFAULT 0,

    target_plans TEXT[],
    target_org_ids UUID[],

    metadata JSONB DEFAULT '{}',

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 Maintenance Windows
CREATE TABLE IF NOT EXISTS maintenance_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    message TEXT,
    expected_duration_minutes INT,

    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,

    allowed_ips TEXT[],
    reason TEXT,

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3 Admin Impersonation Sessions
CREATE TABLE IF NOT EXISTS admin_impersonation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL,
    impersonated_user_id UUID NOT NULL,
    reason TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    actions_performed JSONB DEFAULT '[]'
);

-- ============================================================================
-- PART 5: ANNOUNCEMENTS & NOTIFICATIONS
-- ============================================================================

-- 5.1 Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,

    type VARCHAR(50) NOT NULL DEFAULT 'banner',
    severity VARCHAR(20) DEFAULT 'info',
    cta_text VARCHAR(100),
    cta_url VARCHAR(500),

    target_plans TEXT[],
    target_user_ids UUID[],

    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,

    dismissible BOOLEAN DEFAULT true,

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.2 Announcement Dismissals
CREATE TABLE IF NOT EXISTS announcement_dismissals (
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    dismissed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (announcement_id, user_id)
);

-- ============================================================================
-- PART 6: SECURITY
-- ============================================================================

-- 6.1 Security Events
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',

    user_id UUID,
    admin_user_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,

    description TEXT,
    metadata JSONB DEFAULT '{}',

    country VARCHAR(100),
    city VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 7: BACKGROUND JOBS
-- ============================================================================

-- 7.1 Background Jobs
CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_type VARCHAR(100) NOT NULL,
    job_name VARCHAR(255),

    status VARCHAR(50) NOT NULL DEFAULT 'pending',

    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    progress_percent INT DEFAULT 0,
    progress_message TEXT,

    result JSONB,
    error_message TEXT,
    retry_count INT DEFAULT 0,

    triggered_by VARCHAR(50),
    triggered_by_admin_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 8: ADMIN SETTINGS
-- ============================================================================

-- 8.1 Admin Settings (per admin user)
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL UNIQUE,

    theme VARCHAR(20) DEFAULT 'dark',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    dashboard_default_view VARCHAR(50) DEFAULT 'overview',

    email_alerts_critical BOOLEAN DEFAULT true,
    email_alerts_failed_payments BOOLEAN DEFAULT true,
    email_alerts_new_signups BOOLEAN DEFAULT false,

    slack_webhook_url VARCHAR(500),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Landing page visits
CREATE INDEX IF NOT EXISTS idx_landing_visits_created ON landing_page_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_visits_utm ON landing_page_visits(utm_source, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_landing_visits_session ON landing_page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_landing_visits_converted ON landing_page_visits(converted_to_signup) WHERE converted_to_signup = true;

-- Signup sources
CREATE INDEX IF NOT EXISTS idx_signup_sources_user ON signup_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_sources_method ON signup_sources(auth_method);
CREATE INDEX IF NOT EXISTS idx_signup_sources_created ON signup_sources(created_at DESC);

-- Email subscribers
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON email_subscribers(status);

-- Funnel events
CREATE INDEX IF NOT EXISTS idx_funnel_events_type ON funnel_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_user ON funnel_events(user_id);

-- API version tracking
CREATE INDEX IF NOT EXISTS idx_api_version_platform ON api_version_tracking(platform);

-- API changelog
CREATE INDEX IF NOT EXISTS idx_api_changelog_platform ON api_changelog_entries(platform, announced_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_changelog_status ON api_changelog_entries(migration_status);

-- API expenses
CREATE INDEX IF NOT EXISTS idx_api_expense_period ON api_expense_logs(period_start, platform);
CREATE INDEX IF NOT EXISTS idx_api_expense_platform ON api_expense_logs(platform);

-- API alerts
CREATE INDEX IF NOT EXISTS idx_api_alerts_unack ON api_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_alerts_created ON api_alerts(created_at DESC);

-- AI model configs
CREATE INDEX IF NOT EXISTS idx_ai_model_configs_feature ON ai_model_configs(feature, is_active);

-- AI prompts
CREATE INDEX IF NOT EXISTS idx_ai_prompts_name ON ai_prompts(name);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_feature ON ai_prompts(feature);

-- Recommendation rules
CREATE INDEX IF NOT EXISTS idx_rec_rules_type ON recommendation_rules_config(rule_type, is_enabled);

-- Feature flags
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);

-- Security events
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- Background jobs
CREATE INDEX IF NOT EXISTS idx_bg_jobs_status ON background_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_type ON background_jobs(job_type, created_at DESC);

-- Announcements (index without NOW() since it's not immutable)
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_announcements_current ON announcements(ends_at) WHERE ends_at IS NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_landing_visits_updated_at
    BEFORE UPDATE ON landing_page_visits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_model_configs_updated_at
    BEFORE UPDATE ON ai_model_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_prompts_updated_at
    BEFORE UPDATE ON ai_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rec_rules_updated_at
    BEFORE UPDATE ON recommendation_rules_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_budgets_updated_at
    BEFORE UPDATE ON ai_cost_budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- API Version Tracking
INSERT INTO api_version_tracking (platform, current_version, latest_version, adapter_versions_available, production_adapter_version, api_status) VALUES
    ('google_ads', 'v23.1', 'v24', ARRAY['v23', 'v23_1'], 'v23_1', 'healthy'),
    ('meta', 'v21', 'v21', ARRAY['v20', 'v21'], 'v21', 'healthy')
ON CONFLICT (platform) DO NOTHING;

-- Feature Flags
INSERT INTO feature_flags (name, description, is_enabled, rollout_percentage, target_plans) VALUES
    ('ai_chat', 'AI-powered chat assistant', true, 100, NULL),
    ('recommendations', 'Automated recommendations engine', true, 100, NULL),
    ('forecasting', 'ML-based spend forecasting', true, 100, ARRAY['growth', 'agency', 'enterprise']),
    ('automations', 'Rule-based automations', true, 50, NULL),
    ('white_label', 'White-label for agencies', false, 0, ARRAY['agency', 'enterprise']),
    ('api_access', 'External API access', false, 0, ARRAY['agency', 'enterprise'])
ON CONFLICT (name) DO NOTHING;

-- AI Model Configurations
INSERT INTO ai_model_configs (feature, provider, model_name, temperature, max_tokens, is_active) VALUES
    ('chat', 'gemini', 'gemini-1.5-pro', 0.7, 2048, true),
    ('recommendations', 'gemini', 'gemini-1.5-flash', 0.3, 1024, true),
    ('forecasting', 'openai', 'gpt-4o', 0.2, 512, true),
    ('audience_builder', 'gemini', 'gemini-1.5-pro', 0.5, 1024, true)
ON CONFLICT DO NOTHING;

-- AI Prompts (sample)
INSERT INTO ai_prompts (name, feature, system_prompt, is_active, is_production) VALUES
    ('chat_system', 'chat', 'You are an expert digital advertising consultant for AdsMaster. Help users optimize their Google Ads and Meta Ads campaigns. Be concise, data-driven, and actionable.', true, true),
    ('recommendation_budget', 'recommendations', 'Analyze the campaign data and identify budget optimization opportunities. Focus on ROI improvement and waste reduction.', true, true),
    ('recommendation_keywords', 'recommendations', 'Analyze keyword performance and identify underperforming keywords that should be paused or negative keywords to add.', true, true)
ON CONFLICT (name) DO NOTHING;

-- Recommendation Rules Configuration
INSERT INTO recommendation_rules_config (rule_type, name, description, thresholds, is_enabled, priority) VALUES
    ('keyword_pause', 'Pause Low Quality Score Keywords', 'Recommend pausing keywords with QS < 4 and significant spend', '{"min_quality_score": 4, "min_spend": 50, "min_days": 14}', true, 80),
    ('budget_optimization', 'Budget Reallocation', 'Recommend shifting budget from low ROAS to high ROAS campaigns', '{"min_roas_diff": 1.5, "min_spend": 100}', true, 70),
    ('bid_adjustment', 'Device Bid Adjustment', 'Recommend bid adjustments based on device performance', '{"min_conv_diff_percent": 20, "min_clicks": 100}', true, 60),
    ('negative_keyword', 'Add Negative Keywords', 'Recommend negative keywords from search terms with no conversions', '{"min_clicks": 10, "max_conversions": 0, "min_spend": 25}', true, 75)
ON CONFLICT DO NOTHING;

-- AI Cost Budgets
INSERT INTO ai_cost_budgets (scope_type, scope_id, daily_budget_usd, monthly_budget_usd, alert_at_percentage) VALUES
    ('platform', 'total', 50.00, 1500.00, 80),
    ('feature', 'chat', 20.00, 600.00, 80),
    ('feature', 'recommendations', 15.00, 450.00, 80),
    ('feature', 'forecasting', 10.00, 300.00, 80)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE landing_page_visits IS 'Tracks all landing page visits for marketing analytics';
COMMENT ON TABLE signup_sources IS 'Tracks how users signed up (auth method, UTM source)';
COMMENT ON TABLE email_subscribers IS 'Newsletter and waitlist subscribers';
COMMENT ON TABLE funnel_events IS 'Conversion funnel event tracking';
COMMENT ON TABLE api_version_tracking IS 'Tracks Google/Meta API versions and adapter status';
COMMENT ON TABLE api_changelog_entries IS 'API changelog entries with migration status';
COMMENT ON TABLE api_expense_logs IS 'Detailed API cost tracking';
COMMENT ON TABLE api_alerts IS 'API-related alerts (version sunset, errors, etc.)';
COMMENT ON TABLE ai_model_configs IS 'AI model configuration per feature';
COMMENT ON TABLE ai_prompts IS 'System and user prompts for AI features';
COMMENT ON TABLE ai_prompts_history IS 'Version history for AI prompts';
COMMENT ON TABLE recommendation_rules_config IS 'Configuration for recommendation rules';
COMMENT ON TABLE ai_cost_budgets IS 'AI cost budgets and alerts';
COMMENT ON TABLE feature_flags IS 'Feature flag management';
COMMENT ON TABLE maintenance_windows IS 'Scheduled and active maintenance windows';
COMMENT ON TABLE admin_impersonation_sessions IS 'Audit trail for admin user impersonation';
COMMENT ON TABLE announcements IS 'Platform announcements for users';
COMMENT ON TABLE security_events IS 'Security event logging';
COMMENT ON TABLE background_jobs IS 'Background job status tracking';
COMMENT ON TABLE admin_settings IS 'Per-admin settings and preferences';
