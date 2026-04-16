-- Migration: 00018_ad_goals_alerts.sql
-- Description: Add ad performance goals, alerts, and budget pacing tables
-- Created: 2026-04-13
-- Updated: 2026-04-14 - Simplified to single-metric design

-- ============================================================================
-- AD GOALS TABLE
-- Performance targets with single metric focus
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,  -- null = all accounts
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,      -- null = all campaigns

    -- Goal Info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Metric & Target
    metric VARCHAR(50) NOT NULL,                -- spend, revenue, conversions, roas, ctr, cpa, impressions, clicks, leads
    target_value DECIMAL(15, 2) NOT NULL,       -- Target value (micros for currency, raw for counts/percentages)
    current_value DECIMAL(15, 2) DEFAULT 0,     -- Current progress value
    progress_pct DECIMAL(5, 2) DEFAULT 0,       -- Progress percentage (0-100+)

    -- Period
    period_type VARCHAR(20) NOT NULL DEFAULT 'monthly',  -- daily, weekly, monthly, quarterly, custom
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Platform Filter
    platform VARCHAR(20),                       -- google, meta (null = all)

    -- Status
    status VARCHAR(20) DEFAULT 'not_started',   -- not_started, in_progress, on_track, at_risk, behind, achieved, failed
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_goals_org_id ON ad_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_ad_goals_account_id ON ad_goals(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_goals_period ON ad_goals(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_ad_goals_active ON ad_goals(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ad_goals_status ON ad_goals(status);

-- Enable RLS
ALTER TABLE ad_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ad_goals_org_policy ON ad_goals;
CREATE POLICY ad_goals_org_policy ON ad_goals
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- AD ALERTS TABLE
-- Threshold-based alert rules with flexible notification channels
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,  -- null = all accounts
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,      -- null = all campaigns

    -- Alert Info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Condition
    metric VARCHAR(50) NOT NULL,                -- spend, cpl, cpa, roas, ctr, conversions, impressions, clicks
    condition VARCHAR(20) NOT NULL,             -- above, below, increases_by, decreases_by, equals
    threshold DECIMAL(15, 2) NOT NULL,          -- Threshold value

    -- Time Window
    time_window VARCHAR(20) DEFAULT 'day',      -- hour, day, week, month

    -- Platform Filter
    platform VARCHAR(20),                       -- google, meta (null = all)

    -- Notification Settings (JSONB array for flexibility)
    notification_channels JSONB DEFAULT '["email", "in_app"]',  -- ["email", "slack", "sms", "in_app"]

    -- Frequency Control
    check_frequency VARCHAR(20) DEFAULT 'hourly',  -- hourly, daily
    cooldown_minutes INTEGER DEFAULT 60,        -- Min minutes between alerts for same rule
    max_alerts_per_day INTEGER DEFAULT 10,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_muted BOOLEAN DEFAULT false,
    muted_until TIMESTAMPTZ,

    -- Stats
    alerts_today INTEGER DEFAULT 0,
    last_checked_at TIMESTAMPTZ,
    last_triggered_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_alerts_org_id ON ad_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_ad_alerts_account_id ON ad_alerts(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_alerts_metric ON ad_alerts(metric);
CREATE INDEX IF NOT EXISTS idx_ad_alerts_active ON ad_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ad_alerts_check_freq ON ad_alerts(check_frequency);

-- Enable RLS
ALTER TABLE ad_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ad_alerts_org_policy ON ad_alerts;
CREATE POLICY ad_alerts_org_policy ON ad_alerts
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- ALERT HISTORY TABLE
-- Log of triggered alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES ad_alerts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Alert Info (snapshot at trigger time)
    alert_name VARCHAR(255) NOT NULL,
    metric VARCHAR(50) NOT NULL,
    condition VARCHAR(20) NOT NULL,
    threshold DECIMAL(15, 2) NOT NULL,

    -- Triggered Values
    triggered_value DECIMAL(15, 2) NOT NULL,    -- Value that triggered the alert
    previous_value DECIMAL(15, 2),              -- Previous value for comparison
    change_pct DECIMAL(8, 2),                   -- % change if applicable

    -- Severity & Message
    severity VARCHAR(20) DEFAULT 'warning',     -- info, warning, critical
    message TEXT NOT NULL,

    -- Notification
    notification_channels JSONB DEFAULT '[]',
    notification_sent BOOLEAN DEFAULT false,

    -- User Actions
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id),
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    notes TEXT,

    -- Timestamps
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_org_id ON alert_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON alert_history(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_acknowledged ON alert_history(acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_alert_history_severity ON alert_history(severity);

-- Enable RLS
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alert_history_org_policy ON alert_history;
CREATE POLICY alert_history_org_policy ON alert_history
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- BUDGET PACING TABLE
-- Track monthly budget utilization
-- ============================================================================
CREATE TABLE IF NOT EXISTS budget_pacing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,  -- null = overall
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,      -- null = account level

    -- Budget Info
    name VARCHAR(255),
    platform VARCHAR(20),                       -- google, meta (null = all)

    -- Period
    period VARCHAR(7) NOT NULL,                 -- 'YYYY-MM' format

    -- Budget & Spend
    monthly_budget_micros BIGINT NOT NULL,
    total_spent_micros BIGINT DEFAULT 0,
    daily_target_micros BIGINT DEFAULT 0,       -- monthly / days in month

    -- Pacing
    current_pacing_pct DECIMAL(5, 2) DEFAULT 0, -- % of budget spent
    ideal_pacing_pct DECIMAL(5, 2) DEFAULT 0,   -- Expected % based on days elapsed
    days_remaining INTEGER DEFAULT 0,
    projected_spend_micros BIGINT DEFAULT 0,    -- Projected end-of-month spend

    -- Status
    status VARCHAR(20) DEFAULT 'on_track',      -- on_track, over_pace, under_pace, critical_over, critical_under

    -- Alert Settings
    alert_threshold_pct INTEGER DEFAULT 80,     -- Alert when this % of budget used
    alert_sent BOOLEAN DEFAULT false,

    -- Timestamps
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT budget_pacing_unique UNIQUE(organization_id, ad_account_id, campaign_id, period)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_pacing_org_id ON budget_pacing(organization_id);
CREATE INDEX IF NOT EXISTS idx_budget_pacing_account_id ON budget_pacing(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_budget_pacing_period ON budget_pacing(period);
CREATE INDEX IF NOT EXISTS idx_budget_pacing_status ON budget_pacing(status);

-- Enable RLS
ALTER TABLE budget_pacing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS budget_pacing_org_policy ON budget_pacing;
CREATE POLICY budget_pacing_org_policy ON budget_pacing
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- ============================================================================
-- DEMO DATA
-- Insert sample goals, alerts, and budget pacing for testing
-- ============================================================================

-- Insert demo goals (if demo org exists)
INSERT INTO ad_goals (organization_id, name, description, metric, target_value, current_value, progress_pct, period_type, period_start, period_end, status, is_active)
SELECT
    o.id,
    'Q2 Revenue Target',
    'Reach $50,000 in attributed revenue this quarter',
    'revenue',
    50000000000,  -- $50,000 in micros
    32500000000,  -- $32,500 current
    65.00,
    'quarterly',
    '2026-04-01',
    '2026-06-30',
    'on_track',
    true
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ad_goals (organization_id, name, description, metric, target_value, current_value, progress_pct, period_type, period_start, period_end, status, is_active)
SELECT
    o.id,
    'April Conversions',
    'Get 500 conversions this month',
    'conversions',
    500,
    287,
    57.40,
    'monthly',
    '2026-04-01',
    '2026-04-30',
    'at_risk',
    true
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ad_goals (organization_id, name, description, metric, target_value, current_value, progress_pct, period_type, period_start, period_end, status, is_active)
SELECT
    o.id,
    'Maintain ROAS Above 3.0',
    'Keep blended ROAS at or above 3.0x',
    'roas',
    3.00,
    3.42,
    100.00,
    'monthly',
    '2026-04-01',
    '2026-04-30',
    'achieved',
    true
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert demo alerts
INSERT INTO ad_alerts (organization_id, name, description, metric, condition, threshold, time_window, notification_channels, check_frequency, cooldown_minutes, is_active)
SELECT
    o.id,
    'High Spend Alert',
    'Alert when daily spend exceeds $500',
    'spend',
    'above',
    500000000,  -- $500 in micros
    'day',
    '["email", "in_app"]',
    'hourly',
    120,
    true
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ad_alerts (organization_id, name, description, metric, condition, threshold, time_window, notification_channels, check_frequency, cooldown_minutes, is_active)
SELECT
    o.id,
    'Low ROAS Warning',
    'Alert when ROAS drops below 2.0',
    'roas',
    'below',
    2.00,
    'day',
    '["email", "slack", "in_app"]',
    'daily',
    1440,
    true
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO ad_alerts (organization_id, name, description, metric, condition, threshold, time_window, notification_channels, check_frequency, cooldown_minutes, is_active)
SELECT
    o.id,
    'CPA Spike Alert',
    'Alert when CPA increases by more than 25%',
    'cpa',
    'increases_by',
    25.00,
    'day',
    '["email", "in_app"]',
    'hourly',
    60,
    true
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert demo alert history
INSERT INTO alert_history (alert_id, organization_id, alert_name, metric, condition, threshold, triggered_value, previous_value, change_pct, severity, message, notification_channels, notification_sent, triggered_at)
SELECT
    a.id,
    a.organization_id,
    a.name,
    a.metric,
    a.condition,
    a.threshold,
    CASE
        WHEN a.metric = 'spend' THEN 625000000  -- $625
        WHEN a.metric = 'roas' THEN 1.85
        ELSE 32.50
    END,
    CASE
        WHEN a.metric = 'spend' THEN 450000000
        WHEN a.metric = 'roas' THEN 2.45
        ELSE 26.00
    END,
    CASE
        WHEN a.metric = 'spend' THEN 38.89
        WHEN a.metric = 'roas' THEN -24.49
        ELSE 25.00
    END,
    CASE
        WHEN a.metric = 'roas' THEN 'critical'
        ELSE 'warning'
    END,
    CASE
        WHEN a.metric = 'spend' THEN 'Daily spend ($625) exceeded threshold ($500)'
        WHEN a.metric = 'roas' THEN 'ROAS dropped to 1.85, below threshold of 2.0'
        ELSE 'CPA increased by 25% from $26.00 to $32.50'
    END,
    a.notification_channels,
    true,
    NOW() - INTERVAL '2 hours'
FROM ad_alerts a
WHERE a.organization_id IN (
    SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%'
)
LIMIT 3
ON CONFLICT DO NOTHING;

-- Insert demo budget pacing
INSERT INTO budget_pacing (organization_id, name, period, monthly_budget_micros, total_spent_micros, daily_target_micros, current_pacing_pct, ideal_pacing_pct, days_remaining, projected_spend_micros, status)
SELECT
    o.id,
    'Overall Ad Budget',
    to_char(NOW(), 'YYYY-MM'),
    15000000000,  -- $15,000 monthly budget
    6750000000,   -- $6,750 spent so far
    500000000,    -- $500/day target
    45.00,
    46.67,        -- 14/30 days = 46.67%
    16,
    14850000000,  -- Projected $14,850
    'on_track'
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO budget_pacing (organization_id, name, platform, period, monthly_budget_micros, total_spent_micros, daily_target_micros, current_pacing_pct, ideal_pacing_pct, days_remaining, projected_spend_micros, status)
SELECT
    o.id,
    'Google Ads Budget',
    'google',
    to_char(NOW(), 'YYYY-MM'),
    10000000000,  -- $10,000 monthly
    5200000000,   -- $5,200 spent
    333333333,    -- ~$333/day
    52.00,
    46.67,
    16,
    11400000000,  -- Projected $11,400 (over)
    'over_pace'
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO budget_pacing (organization_id, name, platform, period, monthly_budget_micros, total_spent_micros, daily_target_micros, current_pacing_pct, ideal_pacing_pct, days_remaining, projected_spend_micros, status)
SELECT
    o.id,
    'Meta Ads Budget',
    'meta',
    to_char(NOW(), 'YYYY-MM'),
    5000000000,   -- $5,000 monthly
    1550000000,   -- $1,550 spent
    166666667,    -- ~$167/day
    31.00,
    46.67,
    16,
    3410000000,   -- Projected $3,410 (under)
    'under_pace'
FROM organizations o
WHERE o.name LIKE '%Demo%' OR o.id IN (SELECT DISTINCT organization_id FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%')
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE ad_goals IS 'Performance targets for ad accounts with single metric focus and automatic progress tracking.';
COMMENT ON TABLE ad_alerts IS 'Threshold-based alert rules with flexible multi-channel notifications.';
COMMENT ON TABLE alert_history IS 'Log of triggered alerts with acknowledgment and resolution tracking.';
COMMENT ON TABLE budget_pacing IS 'Monthly budget utilization tracking with pacing analysis.';
COMMENT ON COLUMN ad_goals.metric IS 'Single metric to track: spend, revenue, conversions, roas, ctr, cpa, impressions, clicks, leads';
COMMENT ON COLUMN ad_goals.status IS 'Goal status: not_started, in_progress, on_track, at_risk, behind, achieved, failed';
COMMENT ON COLUMN ad_alerts.notification_channels IS 'JSONB array of channels: email, slack, sms, in_app';
COMMENT ON COLUMN budget_pacing.status IS 'Pacing status: on_track, over_pace, under_pace, critical_over, critical_under';
