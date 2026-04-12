-- ============================================================================
-- Migration: Email System
-- Description: Tables for email templates, logs, and automation
-- ============================================================================

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    description TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    category VARCHAR(50) DEFAULT 'transactional',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email template categories
COMMENT ON COLUMN email_templates.category IS 'transactional, marketing, notification, system';

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- Email Logs Table (sent emails history)
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    template_slug VARCHAR(100),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    subject VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    provider VARCHAR(50) DEFAULT 'resend',
    provider_message_id VARCHAR(255),
    variables_used JSONB,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email log status values
COMMENT ON COLUMN email_logs.status IS 'pending, sent, delivered, opened, clicked, bounced, failed';

-- Create indexes for email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON email_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_org ON email_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_provider_id ON email_logs(provider_message_id);

-- Scheduled Emails Table
CREATE TABLE IF NOT EXISTS scheduled_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    variables JSONB,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    sent_email_log_id UUID REFERENCES email_logs(id),
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN scheduled_emails.status IS 'scheduled, sent, cancelled, failed';

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled ON scheduled_emails(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);

-- Email Automation Rules (triggers)
CREATE TABLE IF NOT EXISTS email_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(100) NOT NULL,
    template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
    delay_minutes INTEGER DEFAULT 0,
    conditions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger events: user.signup, user.password_reset, payment.failed, payment.success,
-- subscription.created, subscription.cancelled, trial.ending, trial.expired
COMMENT ON COLUMN email_automation_rules.trigger_event IS 'Event that triggers this email';

CREATE INDEX IF NOT EXISTS idx_email_automation_trigger ON email_automation_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_email_automation_active ON email_automation_rules(is_active);

-- ============================================================================
-- Seed Default Email Templates
-- ============================================================================

INSERT INTO email_templates (name, slug, subject, html_content, text_content, description, variables, category)
VALUES
(
    'Welcome Email',
    'welcome',
    'Welcome to AdsMaster, {{user_name}}!',
    E'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 24px; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
        </div>
        <div class="content">
            <h1>Welcome to AdsMaster!</h1>
            <p>Hi {{user_name}},</p>
            <p>Thank you for signing up for AdsMaster. We''re excited to help you optimize your advertising campaigns with AI-powered recommendations.</p>
            <p>Here''s what you can do next:</p>
            <ul>
                <li>Connect your Google Ads or Meta Ads account</li>
                <li>Review AI-generated recommendations</li>
                <li>Apply optimizations with one click</li>
            </ul>
            <a href="{{app_url}}/connect" class="btn">Connect Your Ad Account</a>
        </div>
        <div class="footer">
            <p>&copy; {{year}} AdsMaster. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
    E'Welcome to AdsMaster!\n\nHi {{user_name}},\n\nThank you for signing up for AdsMaster. We''re excited to help you optimize your advertising campaigns with AI-powered recommendations.\n\nHere''s what you can do next:\n- Connect your Google Ads or Meta Ads account\n- Review AI-generated recommendations\n- Apply optimizations with one click\n\nGet started: {{app_url}}/connect\n\n© {{year}} AdsMaster',
    'Sent when a new user signs up',
    '["user_name", "app_url", "year"]',
    'transactional'
),
(
    'Password Reset',
    'password-reset',
    'Reset Your AdsMaster Password',
    E'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 24px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-top: 24px; color: #92400e; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
        </div>
        <div class="content">
            <h1>Reset Your Password</h1>
            <p>Hi {{user_name}},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="{{reset_url}}" class="btn">Reset Password</a>
            <div class="warning">
                <strong>Didn''t request this?</strong> If you didn''t request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </div>
            <p style="margin-top: 24px; color: #64748b; font-size: 14px;">This link will expire in 1 hour.</p>
        </div>
        <div class="footer">
            <p>&copy; {{year}} AdsMaster. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
    E'Reset Your Password\n\nHi {{user_name}},\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n{{reset_url}}\n\nThis link will expire in 1 hour.\n\nDidn''t request this? If you didn''t request a password reset, you can safely ignore this email.\n\n© {{year}} AdsMaster',
    'Sent when user requests password reset',
    '["user_name", "reset_url", "year"]',
    'transactional'
),
(
    'Payment Failed',
    'payment-failed',
    'Action Required: Your Payment Failed',
    E'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px; color: #991b1b; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 24px; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
        </div>
        <div class="content">
            <div class="alert">
                <strong>Payment Failed</strong>
            </div>
            <h1>We couldn''t process your payment</h1>
            <p>Hi {{user_name}},</p>
            <p>We tried to charge your payment method for your {{plan_name}} subscription (${{amount}}) but the payment failed.</p>
            <p><strong>Reason:</strong> {{failure_reason}}</p>
            <p>Please update your payment information to avoid any interruption to your service.</p>
            <a href="{{billing_url}}" class="btn">Update Payment Method</a>
            <p style="margin-top: 24px; color: #64748b; font-size: 14px;">We''ll retry the payment in 3 days. If you need assistance, contact support@adsmaster.io</p>
        </div>
        <div class="footer">
            <p>&copy; {{year}} AdsMaster. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
    E'Payment Failed\n\nHi {{user_name}},\n\nWe tried to charge your payment method for your {{plan_name}} subscription (${{amount}}) but the payment failed.\n\nReason: {{failure_reason}}\n\nPlease update your payment information: {{billing_url}}\n\nWe''ll retry the payment in 3 days.\n\n© {{year}} AdsMaster',
    'Sent when a payment fails',
    '["user_name", "plan_name", "amount", "failure_reason", "billing_url", "year"]',
    'transactional'
),
(
    'Invoice',
    'invoice',
    'Your AdsMaster Invoice #{{invoice_number}}',
    E'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .invoice-box { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0; }
        .invoice-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .invoice-row:last-child { border-bottom: none; font-weight: bold; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
        </div>
        <div class="content">
            <h1>Invoice #{{invoice_number}}</h1>
            <p>Hi {{user_name}},</p>
            <p>Thank you for your payment. Here''s your invoice:</p>
            <div class="invoice-box">
                <div class="invoice-row">
                    <span>{{plan_name}} Plan</span>
                    <span>${{amount}}</span>
                </div>
                <div class="invoice-row">
                    <span>Period</span>
                    <span>{{period}}</span>
                </div>
                <div class="invoice-row">
                    <span><strong>Total</strong></span>
                    <span><strong>${{amount}}</strong></span>
                </div>
            </div>
            <a href="{{invoice_url}}" class="btn">View Invoice</a>
        </div>
        <div class="footer">
            <p>&copy; {{year}} AdsMaster. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
    E'Invoice #{{invoice_number}}\n\nHi {{user_name}},\n\nThank you for your payment.\n\n{{plan_name}} Plan: ${{amount}}\nPeriod: {{period}}\nTotal: ${{amount}}\n\nView Invoice: {{invoice_url}}\n\n© {{year}} AdsMaster',
    'Sent when invoice is generated',
    '["user_name", "invoice_number", "plan_name", "amount", "period", "invoice_url", "year"]',
    'transactional'
),
(
    'Trial Ending Soon',
    'trial-ending',
    'Your AdsMaster trial ends in {{days}} days',
    E'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .highlight { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center; }
        .highlight-number { font-size: 36px; font-weight: bold; color: #f59e0b; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
        </div>
        <div class="content">
            <h1>Your trial is ending soon</h1>
            <p>Hi {{user_name}},</p>
            <div class="highlight">
                <div class="highlight-number">{{days}}</div>
                <div>days left in your trial</div>
            </div>
            <p>Don''t lose access to your AI-powered ad optimization. Upgrade now to continue:</p>
            <ul>
                <li>Unlimited AI recommendations</li>
                <li>Advanced analytics & forecasting</li>
                <li>Priority support</li>
            </ul>
            <a href="{{upgrade_url}}" class="btn">Upgrade Now</a>
        </div>
        <div class="footer">
            <p>&copy; {{year}} AdsMaster. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
    E'Your trial is ending soon\n\nHi {{user_name}},\n\nYou have {{days}} days left in your trial.\n\nDon''t lose access to your AI-powered ad optimization. Upgrade now:\n{{upgrade_url}}\n\n© {{year}} AdsMaster',
    'Sent when trial is about to expire',
    '["user_name", "days", "upgrade_url", "year"]',
    'transactional'
),
(
    'Weekly AI Digest',
    'weekly-digest',
    'Your Weekly AI Recommendations Summary',
    E'<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
        .content { background: #f8fafc; border-radius: 12px; padding: 32px; }
        h1 { color: #1e293b; margin: 0 0 16px; }
        .stats-row { display: flex; gap: 16px; margin: 24px 0; }
        .stat-box { flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #10b981; }
        .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
        </div>
        <div class="content">
            <h1>Your Weekly Summary</h1>
            <p>Hi {{user_name}},</p>
            <p>Here''s what happened with your ad campaigns this week:</p>
            <div class="stats-row">
                <div class="stat-box">
                    <div class="stat-value">{{recommendations_count}}</div>
                    <div class="stat-label">New Recommendations</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${{savings}}</div>
                    <div class="stat-label">Potential Savings</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">{{applied_count}}</div>
                    <div class="stat-label">Applied</div>
                </div>
            </div>
            <p>{{top_recommendation}}</p>
            <a href="{{dashboard_url}}" class="btn">View All Recommendations</a>
        </div>
        <div class="footer">
            <p>&copy; {{year}} AdsMaster. All rights reserved.</p>
            <p><a href="{{unsubscribe_url}}">Unsubscribe from weekly digest</a></p>
        </div>
    </div>
</body>
</html>',
    E'Your Weekly Summary\n\nHi {{user_name}},\n\nNew Recommendations: {{recommendations_count}}\nPotential Savings: ${{savings}}\nApplied: {{applied_count}}\n\n{{top_recommendation}}\n\nView Dashboard: {{dashboard_url}}\n\n© {{year}} AdsMaster\n\nUnsubscribe: {{unsubscribe_url}}',
    'Weekly email digest with AI recommendations summary',
    '["user_name", "recommendations_count", "savings", "applied_count", "top_recommendation", "dashboard_url", "unsubscribe_url", "year"]',
    'notification'
)
ON CONFLICT (slug) DO NOTHING;

-- Create default automation rules
INSERT INTO email_automation_rules (name, description, trigger_event, template_id, delay_minutes, is_active)
SELECT
    'Welcome Email',
    'Send welcome email when user signs up',
    'user.signup',
    (SELECT id FROM email_templates WHERE slug = 'welcome'),
    0,
    true
WHERE EXISTS (SELECT 1 FROM email_templates WHERE slug = 'welcome')
ON CONFLICT DO NOTHING;

INSERT INTO email_automation_rules (name, description, trigger_event, template_id, delay_minutes, is_active)
SELECT
    'Trial Ending Reminder',
    'Send reminder 3 days before trial ends',
    'trial.ending',
    (SELECT id FROM email_templates WHERE slug = 'trial-ending'),
    0,
    true
WHERE EXISTS (SELECT 1 FROM email_templates WHERE slug = 'trial-ending')
ON CONFLICT DO NOTHING;

INSERT INTO email_automation_rules (name, description, trigger_event, template_id, delay_minutes, is_active)
SELECT
    'Payment Failed Alert',
    'Send alert when payment fails',
    'payment.failed',
    (SELECT id FROM email_templates WHERE slug = 'payment-failed'),
    0,
    true
WHERE EXISTS (SELECT 1 FROM email_templates WHERE slug = 'payment-failed')
ON CONFLICT DO NOTHING;
