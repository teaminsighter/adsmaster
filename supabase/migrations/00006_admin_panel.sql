-- Admin Panel Database Schema
-- Migration: 00006_admin_panel.sql

-- ============================================================================
-- 1. Super Admin Users (separate from regular users)
-- ============================================================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Admin Sessions (for JWT refresh tokens)
-- ============================================================================
CREATE TABLE admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. Audit Logs (track all admin actions)
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Tracks all admin panel actions for compliance';
COMMENT ON COLUMN audit_logs.action IS 'Action type: user.suspend, config.update, org.delete, etc.';
COMMENT ON COLUMN audit_logs.resource_type IS 'Resource type: user, organization, config, api_key';

-- ============================================================================
-- 4. API Usage Tracking
-- ============================================================================
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    user_id UUID,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT,
    response_time_ms INT,
    request_size_bytes INT,
    response_size_bytes INT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE api_usage_logs IS 'Tracks API usage for analytics and rate limiting';

-- ============================================================================
-- 5. AI Usage Tracking
-- ============================================================================
CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    user_id UUID,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('gemini', 'openai', 'anthropic', 'other')),
    model VARCHAR(100),
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    cost_usd DECIMAL(10, 6) DEFAULT 0,
    endpoint VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ai_usage_logs IS 'Tracks AI/LLM usage for cost monitoring';
COMMENT ON COLUMN ai_usage_logs.endpoint IS 'Which feature used AI: chat, recommendations, forecast, etc.';

-- ============================================================================
-- 6. System Configuration
-- ============================================================================
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_secret BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE system_config IS 'Platform-wide configuration settings';
COMMENT ON COLUMN system_config.is_secret IS 'If true, value should be masked in UI';

-- ============================================================================
-- 7. Page View Analytics
-- ============================================================================
CREATE TABLE page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    user_id UUID,
    page_path VARCHAR(255) NOT NULL,
    referrer VARCHAR(500),
    user_agent TEXT,
    ip_address VARCHAR(45),
    session_id VARCHAR(100),
    duration_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE page_views IS 'Tracks page views for analytics';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Admin users
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;

-- Admin sessions
CREATE INDEX idx_admin_sessions_user ON admin_sessions(admin_user_id);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Audit logs
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- API usage logs
CREATE INDEX idx_api_usage_created ON api_usage_logs(created_at DESC);
CREATE INDEX idx_api_usage_org ON api_usage_logs(organization_id, created_at DESC);
CREATE INDEX idx_api_usage_endpoint ON api_usage_logs(endpoint, created_at DESC);
CREATE INDEX idx_api_usage_status ON api_usage_logs(status_code) WHERE status_code >= 400;

-- AI usage logs
CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_org ON ai_usage_logs(organization_id, created_at DESC);
CREATE INDEX idx_ai_usage_provider ON ai_usage_logs(provider, created_at DESC);

-- Page views
CREATE INDEX idx_page_views_created ON page_views(created_at DESC);
CREATE INDEX idx_page_views_page ON page_views(page_path, created_at DESC);
CREATE INDEX idx_page_views_org ON page_views(organization_id, created_at DESC);
CREATE INDEX idx_page_views_session ON page_views(session_id);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Default System Configuration
-- ============================================================================

INSERT INTO system_config (key, value, description) VALUES
    ('maintenance_mode', 'false', 'Enable maintenance mode to block user access'),
    ('registration_enabled', 'true', 'Allow new user registrations'),
    ('default_plan', '"free"', 'Default subscription plan for new organizations'),
    ('ai_provider', '"gemini"', 'Default AI provider (gemini, openai, anthropic)'),
    ('ai_rate_limit', '{"requests_per_minute": 60, "tokens_per_day": 100000}', 'AI usage rate limits'),
    ('api_rate_limit', '{"requests_per_minute": 100, "requests_per_day": 10000}', 'API rate limits per organization'),
    ('features', '{"ai_chat": true, "recommendations": true, "forecasting": true, "automations": true}', 'Feature flags'),
    ('pricing', '{"starter": 49, "growth": 149, "agency": 299, "enterprise": null}', 'Subscription pricing in USD'),
    ('trial_days', '14', 'Number of trial days for new accounts'),
    ('support_email', '"support@adsmaster.io"', 'Support email address')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Default Super Admin User
-- Password should be changed immediately after first login
-- Default password: 'admin123' (bcrypt hash below)
-- ============================================================================

INSERT INTO admin_users (email, password_hash, name, role) VALUES
    ('admin@adsmaster.io', '$2b$12$HA257l5ug44kqCaqzkpDHuzShNX2gsyjGMEyZte30mHlLn2G8zna.', 'Super Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Default credentials: admin@adsmaster.io / admin123
-- Change the password after first login!
