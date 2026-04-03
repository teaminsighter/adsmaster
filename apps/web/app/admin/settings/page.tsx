'use client';

import { useState, useEffect } from 'react';
import { adminFetch, useSystemConfig, updateConfig } from '@/lib/hooks/useAdminApi';

type TabType = 'general' | 'notifications' | 'security' | 'api' | 'backup';

function GeneralTab() {
  const { data: config, loading, refetch } = useSystemConfig();
  const [saving, setSaving] = useState(false);

  // Local state for settings
  const [settings, setSettings] = useState({
    app_name: 'AdsMaster',
    support_email: 'support@adsmaster.io',
    default_timezone: 'UTC',
    default_currency: 'USD',
    session_timeout_hours: 24,
    max_login_attempts: 5,
    enable_signup: true,
    enable_google_auth: true,
    enable_github_auth: false,
  });

  useEffect(() => {
    if (config?.configs) {
      const configMap = Object.fromEntries(
        config.configs.map(c => [c.key, c.value])
      );
      setSettings(prev => ({
        ...prev,
        ...configMap,
      }));
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each changed config
      for (const [key, value] of Object.entries(settings)) {
        await updateConfig(key, value);
      }
      refetch();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="general-tab">
      <div className="settings-section">
        <h3>Application Settings</h3>

        <div className="form-group">
          <label>Application Name</label>
          <input
            type="text"
            value={settings.app_name}
            onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Support Email</label>
          <input
            type="email"
            value={settings.support_email}
            onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Default Timezone</label>
            <select
              value={settings.default_timezone}
              onChange={(e) => setSettings({ ...settings, default_timezone: e.target.value })}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>

          <div className="form-group">
            <label>Default Currency</label>
            <select
              value={settings.default_currency}
              onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (&#8364;)</option>
              <option value="GBP">GBP (&#163;)</option>
              <option value="JPY">JPY (&#165;)</option>
              <option value="CAD">CAD ($)</option>
              <option value="AUD">AUD ($)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Authentication Settings</h3>

        <div className="form-row">
          <div className="form-group">
            <label>Session Timeout (hours)</label>
            <input
              type="number"
              value={settings.session_timeout_hours}
              onChange={(e) => setSettings({ ...settings, session_timeout_hours: Number(e.target.value) })}
              min={1}
              max={168}
            />
          </div>

          <div className="form-group">
            <label>Max Login Attempts</label>
            <input
              type="number"
              value={settings.max_login_attempts}
              onChange={(e) => setSettings({ ...settings, max_login_attempts: Number(e.target.value) })}
              min={3}
              max={10}
            />
          </div>
        </div>

        <div className="toggle-group">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.enable_signup}
              onChange={(e) => setSettings({ ...settings, enable_signup: e.target.checked })}
            />
            <span className="toggle-label">Allow new user signups</span>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.enable_google_auth}
              onChange={(e) => setSettings({ ...settings, enable_google_auth: e.target.checked })}
            />
            <span className="toggle-label">Enable Google OAuth</span>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.enable_github_auth}
              onChange={(e) => setSettings({ ...settings, enable_github_auth: e.target.checked })}
            />
            <span className="toggle-label">Enable GitHub OAuth</span>
          </label>
        </div>
      </div>

      <div className="actions">
        <button onClick={handleSave} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <style jsx>{`
        .general-tab {}
        .settings-section {
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--admin-border);
        }
        .settings-section:last-of-type {
          border-bottom: none;
          margin-bottom: 0;
        }
        .settings-section h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 20px 0;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--admin-text);
          margin-bottom: 8px;
        }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 14px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
        }
        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--admin-accent);
        }
        .toggle-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .toggle-item {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }
        .toggle-item input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        .toggle-label {
          font-size: 14px;
          color: var(--admin-text);
        }
        .actions {
          margin-top: 24px;
        }
        .save-btn {
          padding: 12px 24px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .save-btn:hover {
          opacity: 0.9;
        }
        .save-btn:disabled {
          opacity: 0.5;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

function NotificationsTab() {
  const [settings, setSettings] = useState({
    email_new_users: true,
    email_new_subscriptions: true,
    email_failed_payments: true,
    email_api_alerts: true,
    email_security_events: true,
    slack_enabled: false,
    slack_webhook: '',
    slack_channel: '#admin-alerts',
    daily_digest: true,
    digest_time: '09:00',
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
  };

  return (
    <div className="notifications-tab">
      <div className="settings-section">
        <h3>Email Notifications</h3>

        <div className="toggle-group">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.email_new_users}
              onChange={(e) => setSettings({ ...settings, email_new_users: e.target.checked })}
            />
            <div className="toggle-content">
              <span className="toggle-label">New user signups</span>
              <span className="toggle-desc">Get notified when a new user registers</span>
            </div>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.email_new_subscriptions}
              onChange={(e) => setSettings({ ...settings, email_new_subscriptions: e.target.checked })}
            />
            <div className="toggle-content">
              <span className="toggle-label">New subscriptions</span>
              <span className="toggle-desc">Receive alerts for new paid subscriptions</span>
            </div>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.email_failed_payments}
              onChange={(e) => setSettings({ ...settings, email_failed_payments: e.target.checked })}
            />
            <div className="toggle-content">
              <span className="toggle-label">Failed payments</span>
              <span className="toggle-desc">Get notified about payment failures</span>
            </div>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.email_api_alerts}
              onChange={(e) => setSettings({ ...settings, email_api_alerts: e.target.checked })}
            />
            <div className="toggle-content">
              <span className="toggle-label">API alerts</span>
              <span className="toggle-desc">Critical API issues and version updates</span>
            </div>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.email_security_events}
              onChange={(e) => setSettings({ ...settings, email_security_events: e.target.checked })}
            />
            <div className="toggle-content">
              <span className="toggle-label">Security events</span>
              <span className="toggle-desc">High severity security alerts</span>
            </div>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Slack Integration</h3>

        <label className="toggle-item standalone">
          <input
            type="checkbox"
            checked={settings.slack_enabled}
            onChange={(e) => setSettings({ ...settings, slack_enabled: e.target.checked })}
          />
          <span className="toggle-label">Enable Slack notifications</span>
        </label>

        {settings.slack_enabled && (
          <div className="slack-settings">
            <div className="form-group">
              <label>Webhook URL</label>
              <input
                type="url"
                value={settings.slack_webhook}
                onChange={(e) => setSettings({ ...settings, slack_webhook: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
            <div className="form-group">
              <label>Channel</label>
              <input
                type="text"
                value={settings.slack_channel}
                onChange={(e) => setSettings({ ...settings, slack_channel: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Digest Settings</h3>

        <label className="toggle-item standalone">
          <input
            type="checkbox"
            checked={settings.daily_digest}
            onChange={(e) => setSettings({ ...settings, daily_digest: e.target.checked })}
          />
          <span className="toggle-label">Send daily digest email</span>
        </label>

        {settings.daily_digest && (
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Digest Time (UTC)</label>
            <input
              type="time"
              value={settings.digest_time}
              onChange={(e) => setSettings({ ...settings, digest_time: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="actions">
        <button onClick={handleSave} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <style jsx>{`
        .notifications-tab {}
        .settings-section {
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--admin-border);
        }
        .settings-section:last-of-type {
          border-bottom: none;
          margin-bottom: 0;
        }
        .settings-section h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 20px 0;
        }
        .toggle-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .toggle-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }
        .toggle-item.standalone {
          align-items: center;
        }
        .toggle-item input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          cursor: pointer;
        }
        .toggle-content {
          display: flex;
          flex-direction: column;
        }
        .toggle-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--admin-text);
        }
        .toggle-desc {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .slack-settings {
          margin-top: 16px;
          padding-left: 30px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--admin-text);
          margin-bottom: 8px;
        }
        .form-group input {
          width: 100%;
          max-width: 400px;
          padding: 10px 14px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
        }
        .form-group input:focus {
          outline: none;
          border-color: var(--admin-accent);
        }
        .actions {
          margin-top: 24px;
        }
        .save-btn {
          padding: 12px 24px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .save-btn:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

function SecurityTab() {
  const [settings, setSettings] = useState({
    require_2fa_admins: true,
    require_2fa_users: false,
    password_min_length: 8,
    password_require_special: true,
    session_single_device: false,
    ip_whitelist_enabled: false,
    ip_whitelist: '',
    rate_limit_requests: 100,
    rate_limit_window: 60,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
  };

  return (
    <div className="security-tab">
      <div className="settings-section">
        <h3>Two-Factor Authentication</h3>

        <div className="toggle-group">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.require_2fa_admins}
              onChange={(e) => setSettings({ ...settings, require_2fa_admins: e.target.checked })}
            />
            <div className="toggle-content">
              <span className="toggle-label">Require 2FA for admin users</span>
              <span className="toggle-desc">Enforce two-factor authentication for all admin accounts</span>
            </div>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.require_2fa_users}
              onChange={(e) => setSettings({ ...settings, require_2fa_users: e.target.checked })}
            />
            <div className="toggle-content">
              <span className="toggle-label">Require 2FA for all users</span>
              <span className="toggle-desc">Enforce two-factor authentication for all user accounts</span>
            </div>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Password Policy</h3>

        <div className="form-row">
          <div className="form-group">
            <label>Minimum Password Length</label>
            <input
              type="number"
              value={settings.password_min_length}
              onChange={(e) => setSettings({ ...settings, password_min_length: Number(e.target.value) })}
              min={6}
              max={32}
            />
          </div>
        </div>

        <label className="toggle-item standalone">
          <input
            type="checkbox"
            checked={settings.password_require_special}
            onChange={(e) => setSettings({ ...settings, password_require_special: e.target.checked })}
          />
          <span className="toggle-label">Require special characters</span>
        </label>
      </div>

      <div className="settings-section">
        <h3>Session Security</h3>

        <label className="toggle-item">
          <input
            type="checkbox"
            checked={settings.session_single_device}
            onChange={(e) => setSettings({ ...settings, session_single_device: e.target.checked })}
          />
          <div className="toggle-content">
            <span className="toggle-label">Single device sessions</span>
            <span className="toggle-desc">Limit users to one active session at a time</span>
          </div>
        </label>
      </div>

      <div className="settings-section">
        <h3>IP Whitelist</h3>

        <label className="toggle-item standalone">
          <input
            type="checkbox"
            checked={settings.ip_whitelist_enabled}
            onChange={(e) => setSettings({ ...settings, ip_whitelist_enabled: e.target.checked })}
          />
          <span className="toggle-label">Enable IP whitelist for admin access</span>
        </label>

        {settings.ip_whitelist_enabled && (
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Allowed IPs (one per line)</label>
            <textarea
              value={settings.ip_whitelist}
              onChange={(e) => setSettings({ ...settings, ip_whitelist: e.target.value })}
              placeholder="192.168.1.1&#10;10.0.0.0/24"
              rows={4}
            />
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Rate Limiting</h3>

        <div className="form-row">
          <div className="form-group">
            <label>Max Requests</label>
            <input
              type="number"
              value={settings.rate_limit_requests}
              onChange={(e) => setSettings({ ...settings, rate_limit_requests: Number(e.target.value) })}
              min={10}
              max={1000}
            />
          </div>
          <div className="form-group">
            <label>Time Window (seconds)</label>
            <input
              type="number"
              value={settings.rate_limit_window}
              onChange={(e) => setSettings({ ...settings, rate_limit_window: Number(e.target.value) })}
              min={10}
              max={300}
            />
          </div>
        </div>
      </div>

      <div className="actions">
        <button onClick={handleSave} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <style jsx>{`
        .security-tab {}
        .settings-section {
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--admin-border);
        }
        .settings-section:last-of-type {
          border-bottom: none;
          margin-bottom: 0;
        }
        .settings-section h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 20px 0;
        }
        .toggle-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .toggle-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }
        .toggle-item.standalone {
          align-items: center;
        }
        .toggle-item input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          cursor: pointer;
        }
        .toggle-content {
          display: flex;
          flex-direction: column;
        }
        .toggle-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--admin-text);
        }
        .toggle-desc {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          max-width: 500px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--admin-text);
          margin-bottom: 8px;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
        }
        .form-group textarea {
          max-width: 400px;
          resize: vertical;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--admin-accent);
        }
        .actions {
          margin-top: 24px;
        }
        .save-btn {
          padding: 12px 24px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .save-btn:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

function APISettingsTab() {
  const [settings, setSettings] = useState({
    google_ads_client_id: '',
    google_ads_client_secret: '',
    google_ads_developer_token: '',
    meta_app_id: '',
    meta_app_secret: '',
    openai_api_key: '',
    anthropic_api_key: '',
    gemini_api_key: '',
  });

  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSecretInput = (key: string, label: string, value: string, onChange: (v: string) => void) => (
    <div className="form-group">
      <label>{label}</label>
      <div className="secret-input">
        <input
          type={showSecrets[key] ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••••••"
        />
        <button type="button" onClick={() => toggleSecret(key)} className="toggle-secret">
          {showSecrets[key] ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="api-tab">
      <div className="warning-banner">
        <span className="warning-icon">⚠️</span>
        <span>API keys are sensitive. Changes here will affect the entire platform.</span>
      </div>

      <div className="settings-section">
        <h3>Google Ads API</h3>
        {renderSecretInput('google_client_id', 'Client ID', settings.google_ads_client_id, (v) => setSettings({ ...settings, google_ads_client_id: v }))}
        {renderSecretInput('google_client_secret', 'Client Secret', settings.google_ads_client_secret, (v) => setSettings({ ...settings, google_ads_client_secret: v }))}
        {renderSecretInput('google_dev_token', 'Developer Token', settings.google_ads_developer_token, (v) => setSettings({ ...settings, google_ads_developer_token: v }))}
      </div>

      <div className="settings-section">
        <h3>Meta Marketing API</h3>
        {renderSecretInput('meta_app_id', 'App ID', settings.meta_app_id, (v) => setSettings({ ...settings, meta_app_id: v }))}
        {renderSecretInput('meta_app_secret', 'App Secret', settings.meta_app_secret, (v) => setSettings({ ...settings, meta_app_secret: v }))}
      </div>

      <div className="settings-section">
        <h3>AI Providers</h3>
        {renderSecretInput('openai_key', 'OpenAI API Key', settings.openai_api_key, (v) => setSettings({ ...settings, openai_api_key: v }))}
        {renderSecretInput('anthropic_key', 'Anthropic API Key', settings.anthropic_api_key, (v) => setSettings({ ...settings, anthropic_api_key: v }))}
        {renderSecretInput('gemini_key', 'Google Gemini API Key', settings.gemini_api_key, (v) => setSettings({ ...settings, gemini_api_key: v }))}
      </div>

      <div className="actions">
        <button onClick={handleSave} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <style jsx>{`
        .api-tab {}
        .warning-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          color: #f59e0b;
          font-size: 14px;
          margin-bottom: 24px;
        }
        .warning-icon {
          font-size: 20px;
        }
        .settings-section {
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--admin-border);
        }
        .settings-section:last-of-type {
          border-bottom: none;
          margin-bottom: 0;
        }
        .settings-section h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 20px 0;
        }
        .form-group {
          margin-bottom: 16px;
          max-width: 500px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--admin-text);
          margin-bottom: 8px;
        }
        .secret-input {
          display: flex;
          gap: 8px;
        }
        .secret-input input {
          flex: 1;
          padding: 10px 14px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
          font-family: 'JetBrains Mono', monospace;
        }
        .secret-input input:focus {
          outline: none;
          border-color: var(--admin-accent);
        }
        .toggle-secret {
          padding: 8px 12px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
        }
        .actions {
          margin-top: 24px;
        }
        .save-btn {
          padding: 12px 24px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .save-btn:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

function BackupTab() {
  const [backups, setBackups] = useState([
    { id: '1', name: 'Full backup', created_at: '2025-01-08T10:00:00Z', size: '2.4 GB', status: 'completed' },
    { id: '2', name: 'Full backup', created_at: '2025-01-07T10:00:00Z', size: '2.3 GB', status: 'completed' },
    { id: '3', name: 'Full backup', created_at: '2025-01-06T10:00:00Z', size: '2.3 GB', status: 'completed' },
  ]);

  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [retentionDays, setRetentionDays] = useState(30);
  const [creating, setCreating] = useState(false);

  const createBackup = async () => {
    setCreating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCreating(false);
  };

  return (
    <div className="backup-tab">
      <div className="settings-section">
        <div className="section-header">
          <h3>Backup Settings</h3>
        </div>

        <label className="toggle-item">
          <input
            type="checkbox"
            checked={autoBackup}
            onChange={(e) => setAutoBackup(e.target.checked)}
          />
          <div className="toggle-content">
            <span className="toggle-label">Automatic backups</span>
            <span className="toggle-desc">Automatically create database backups on schedule</span>
          </div>
        </label>

        {autoBackup && (
          <div className="form-row" style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label>Frequency</label>
              <select
                value={backupFrequency}
                onChange={(e) => setBackupFrequency(e.target.value)}
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="form-group">
              <label>Retention (days)</label>
              <input
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                min={7}
                max={365}
              />
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="section-header">
          <h3>Recent Backups</h3>
          <button onClick={createBackup} disabled={creating} className="create-btn">
            {creating ? 'Creating...' : '+ Create Backup'}
          </button>
        </div>

        <div className="backups-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Created</th>
                <th>Size</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id}>
                  <td>{backup.name}</td>
                  <td>{new Date(backup.created_at).toLocaleString()}</td>
                  <td>{backup.size}</td>
                  <td>
                    <span className="status-badge completed">{backup.status}</span>
                  </td>
                  <td>
                    <button className="action-btn">Download</button>
                    <button className="action-btn restore">Restore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .backup-tab {}
        .settings-section {
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--admin-border);
        }
        .settings-section:last-of-type {
          border-bottom: none;
          margin-bottom: 0;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .section-header h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .create-btn {
          padding: 8px 16px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .create-btn:disabled {
          opacity: 0.5;
        }
        .toggle-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }
        .toggle-item input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          cursor: pointer;
        }
        .toggle-content {
          display: flex;
          flex-direction: column;
        }
        .toggle-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--admin-text);
        }
        .toggle-desc {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          max-width: 400px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--admin-text);
          margin-bottom: 8px;
        }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 14px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
        }
        .backups-table {
          overflow-x: auto;
        }
        .backups-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .backups-table th,
        .backups-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid var(--admin-border);
        }
        .backups-table th {
          font-size: 11px;
          font-weight: 600;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          background: var(--admin-inner-bg);
        }
        .backups-table td {
          font-size: 13px;
          color: var(--admin-text);
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-badge.completed {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        .action-btn {
          padding: 4px 10px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 4px;
          color: var(--admin-text);
          font-size: 12px;
          cursor: pointer;
          margin-right: 8px;
        }
        .action-btn.restore {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.3);
          color: #3b82f6;
        }
      `}</style>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const tabs = [
    { id: 'general' as TabType, label: 'General', icon: '⚙️' },
    { id: 'notifications' as TabType, label: 'Notifications', icon: '🔔' },
    { id: 'security' as TabType, label: 'Security', icon: '🔒' },
    { id: 'api' as TabType, label: 'API Keys', icon: '🔑' },
    { id: 'backup' as TabType, label: 'Backup', icon: '💾' },
  ];

  return (
    <div className="settings-page">
      <h1 className="page-title">Admin Settings</h1>
      <p className="page-subtitle">Configure platform settings, security, and integrations.</p>

      <div className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'api' && <APISettingsTab />}
        {activeTab === 'backup' && <BackupTab />}
      </div>

      <style jsx>{`
        .settings-page {
          max-width: 1000px;
        }
        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 8px 0;
        }
        .page-subtitle {
          font-size: 14px;
          color: var(--admin-text-muted);
          margin: 0 0 24px 0;
        }
        .tab-nav {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          padding: 4px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
          width: fit-content;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--admin-text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          color: var(--admin-text);
        }
        .tab-btn.active {
          background: var(--admin-card);
          color: var(--admin-accent);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .tab-icon {
          font-size: 14px;
        }
        .tab-content {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 24px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .page-title { font-size: 20px; }
          .page-subtitle { margin-bottom: 16px; }
          .tab-nav {
            width: 100%;
            gap: 4px;
            margin-bottom: 16px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .tab-btn {
            padding: 8px 12px;
            font-size: 12px;
            gap: 6px;
            white-space: nowrap;
          }
          .tab-icon { font-size: 13px; }
          .tab-content { padding: 16px; }
        }
      `}</style>
    </div>
  );
}
