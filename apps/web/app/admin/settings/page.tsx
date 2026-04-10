'use client';

import { useState, useEffect } from 'react';
import { adminFetch, useSystemConfig, updateConfig } from '@/lib/hooks/useAdminApi';

type TabType = 'general' | 'branding' | 'auth' | 'integrations' | 'security' | 'backups';

// =============================================================================
// GENERAL TAB - Basic application settings
// =============================================================================

function GeneralTab() {
  const { data: config, loading, refetch } = useSystemConfig();
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    app_name: 'AdsMaster',
    support_email: 'support@adsmaster.io',
    default_timezone: 'UTC',
    default_currency: 'USD',
    session_timeout_hours: 24,
    max_login_attempts: 5,
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
    <div className="tab-content-inner">
      <div className="settings-section">
        <h3>Application</h3>
        <p className="section-desc">Basic application configuration and defaults.</p>

        <div className="form-group">
          <label>Application Name</label>
          <input
            type="text"
            value={settings.app_name}
            onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
          />
          <span className="form-hint">Displayed in emails, browser tab, and throughout the app</span>
        </div>

        <div className="form-group">
          <label>Support Email</label>
          <input
            type="email"
            value={settings.support_email}
            onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
          />
          <span className="form-hint">Users will see this for support inquiries</span>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Default Timezone</label>
            <select
              value={settings.default_timezone}
              onChange={(e) => setSettings({ ...settings, default_timezone: e.target.value })}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (US)</option>
              <option value="America/Chicago">Central Time (US)</option>
              <option value="America/Denver">Mountain Time (US)</option>
              <option value="America/Los_Angeles">Pacific Time (US)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Asia/Singapore">Singapore (SGT)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Default Currency</label>
            <select
              value={settings.default_currency}
              onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="CAD">CAD ($)</option>
              <option value="AUD">AUD ($)</option>
              <option value="CHF">CHF (Fr)</option>
              <option value="SGD">SGD ($)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Session Settings</h3>
        <p className="section-desc">Configure session and login behavior.</p>

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
            <span className="form-hint">Users will be logged out after this period of inactivity</span>
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
            <span className="form-hint">Account locked after this many failed attempts</span>
          </div>
        </div>
      </div>

      <div className="actions">
        <button onClick={handleSave} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// BRANDING TAB - Logo, colors, and visual identity
// =============================================================================

function BrandingTab() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    logo_url: '',
    logo_dark_url: '',
    favicon_url: '',
    primary_color: '#10b981',
    accent_color: '#059669',
    email_header_logo: '',
    email_footer_text: '© 2025 AdsMaster. All rights reserved.',
    custom_css: '',
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
  };

  const colorPresets = [
    { name: 'Emerald', primary: '#10b981', accent: '#059669' },
    { name: 'Blue', primary: '#3b82f6', accent: '#2563eb' },
    { name: 'Purple', primary: '#8b5cf6', accent: '#7c3aed' },
    { name: 'Orange', primary: '#f97316', accent: '#ea580c' },
    { name: 'Red', primary: '#ef4444', accent: '#dc2626' },
    { name: 'Pink', primary: '#ec4899', accent: '#db2777' },
  ];

  return (
    <div className="tab-content-inner">
      <div className="settings-section">
        <h3>Logo</h3>
        <p className="section-desc">Upload your brand logo for light and dark themes.</p>

        <div className="logo-upload-grid">
          <div className="logo-upload-card">
            <div className="logo-preview light">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" />
              ) : (
                <span className="logo-placeholder">A</span>
              )}
            </div>
            <span className="logo-label">Light Mode</span>
            <button className="upload-btn">Upload Logo</button>
          </div>

          <div className="logo-upload-card">
            <div className="logo-preview dark">
              {settings.logo_dark_url ? (
                <img src={settings.logo_dark_url} alt="Logo Dark" />
              ) : (
                <span className="logo-placeholder">A</span>
              )}
            </div>
            <span className="logo-label">Dark Mode</span>
            <button className="upload-btn">Upload Logo</button>
          </div>

          <div className="logo-upload-card">
            <div className="logo-preview favicon">
              {settings.favicon_url ? (
                <img src={settings.favicon_url} alt="Favicon" />
              ) : (
                <span className="logo-placeholder small">A</span>
              )}
            </div>
            <span className="logo-label">Favicon</span>
            <button className="upload-btn">Upload Favicon</button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Brand Colors</h3>
        <p className="section-desc">Choose your primary brand color. This affects buttons, links, and accents.</p>

        <div className="color-presets">
          {colorPresets.map((preset) => (
            <button
              key={preset.name}
              className={`color-preset ${settings.primary_color === preset.primary ? 'active' : ''}`}
              onClick={() => setSettings({ ...settings, primary_color: preset.primary, accent_color: preset.accent })}
            >
              <span className="color-swatch" style={{ background: preset.primary }} />
              <span className="color-name">{preset.name}</span>
            </button>
          ))}
        </div>

        <div className="form-row" style={{ marginTop: '20px' }}>
          <div className="form-group">
            <label>Primary Color</label>
            <div className="color-input">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
              />
              <input
                type="text"
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                placeholder="#10b981"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Accent Color</label>
            <div className="color-input">
              <input
                type="color"
                value={settings.accent_color}
                onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
              />
              <input
                type="text"
                value={settings.accent_color}
                onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                placeholder="#059669"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Email Branding</h3>
        <p className="section-desc">Customize how transactional emails look.</p>

        <div className="form-group">
          <label>Email Header Logo URL</label>
          <input
            type="url"
            value={settings.email_header_logo}
            onChange={(e) => setSettings({ ...settings, email_header_logo: e.target.value })}
            placeholder="https://example.com/logo.png"
          />
          <span className="form-hint">Recommended size: 200x50px, PNG or SVG</span>
        </div>

        <div className="form-group">
          <label>Email Footer Text</label>
          <textarea
            value={settings.email_footer_text}
            onChange={(e) => setSettings({ ...settings, email_footer_text: e.target.value })}
            rows={2}
          />
        </div>
      </div>

      <div className="actions">
        <button onClick={handleSave} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <style jsx>{`
        .logo-upload-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          max-width: 600px;
        }
        .logo-upload-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
        }
        .logo-preview {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .logo-preview.light {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        .logo-preview.dark {
          background: #1e293b;
          border: 1px solid #334155;
        }
        .logo-preview.favicon {
          width: 48px;
          height: 48px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
        }
        .logo-preview img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .logo-placeholder {
          font-size: 32px;
          font-weight: 700;
          color: var(--admin-accent);
        }
        .logo-placeholder.small {
          font-size: 20px;
        }
        .logo-label {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .upload-btn {
          padding: 6px 12px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          font-size: 12px;
          cursor: pointer;
        }
        .color-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .color-preset {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: var(--admin-inner-bg);
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .color-preset:hover {
          border-color: var(--admin-border);
        }
        .color-preset.active {
          border-color: var(--admin-accent);
          background: rgba(16, 185, 129, 0.1);
        }
        .color-swatch {
          width: 20px;
          height: 20px;
          border-radius: 50%;
        }
        .color-name {
          font-size: 13px;
          color: var(--admin-text);
        }
        .color-input {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .color-input input[type="color"] {
          width: 44px;
          height: 44px;
          padding: 2px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          cursor: pointer;
        }
        .color-input input[type="text"] {
          flex: 1;
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// AUTH TAB - Authentication and OAuth providers
// =============================================================================

function AuthTab() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enable_signup: true,
    require_email_verification: true,
    enable_google_oauth: true,
    enable_github_oauth: false,
    enable_microsoft_oauth: false,
    google_client_id: '',
    github_client_id: '',
    microsoft_client_id: '',
    enable_sso: false,
    sso_provider: 'saml',
    sso_entity_id: '',
    sso_signon_url: '',
    sso_certificate: '',
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_number: true,
    password_require_special: false,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
  };

  return (
    <div className="tab-content-inner">
      <div className="settings-section">
        <h3>User Registration</h3>
        <p className="section-desc">Control how users can sign up for your platform.</p>

        <div className="toggle-group">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.enable_signup}
              onChange={(e) => setSettings({ ...settings, enable_signup: e.target.checked })}
            />
            <div className="toggle-content">
              <span className="toggle-label">Allow new user signups</span>
              <span className="toggle-desc">When disabled, only invited users can join</span>
            </div>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.require_email_verification}
              onChange={(e) => setSettings({ ...settings, require_email_verification: e.target.checked })}
            />
            <div className="toggle-content">
              <span className="toggle-label">Require email verification</span>
              <span className="toggle-desc">Users must verify their email before accessing the platform</span>
            </div>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>OAuth Providers</h3>
        <p className="section-desc">Enable social login options for your users.</p>

        <div className="oauth-providers">
          <div className="oauth-provider-card">
            <div className="oauth-header">
              <span className="oauth-icon">G</span>
              <div className="oauth-info">
                <span className="oauth-name">Google</span>
                <span className={`oauth-status ${settings.enable_google_oauth ? 'enabled' : 'disabled'}`}>
                  {settings.enable_google_oauth ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.enable_google_oauth}
                  onChange={(e) => setSettings({ ...settings, enable_google_oauth: e.target.checked })}
                />
                <span className="slider" />
              </label>
            </div>
            {settings.enable_google_oauth && (
              <div className="oauth-config">
                <div className="form-group">
                  <label>Client ID</label>
                  <input
                    type="text"
                    value={settings.google_client_id}
                    onChange={(e) => setSettings({ ...settings, google_client_id: e.target.value })}
                    placeholder="your-client-id.apps.googleusercontent.com"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="oauth-provider-card">
            <div className="oauth-header">
              <span className="oauth-icon github">GH</span>
              <div className="oauth-info">
                <span className="oauth-name">GitHub</span>
                <span className={`oauth-status ${settings.enable_github_oauth ? 'enabled' : 'disabled'}`}>
                  {settings.enable_github_oauth ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.enable_github_oauth}
                  onChange={(e) => setSettings({ ...settings, enable_github_oauth: e.target.checked })}
                />
                <span className="slider" />
              </label>
            </div>
            {settings.enable_github_oauth && (
              <div className="oauth-config">
                <div className="form-group">
                  <label>Client ID</label>
                  <input
                    type="text"
                    value={settings.github_client_id}
                    onChange={(e) => setSettings({ ...settings, github_client_id: e.target.value })}
                    placeholder="your-github-client-id"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="oauth-provider-card">
            <div className="oauth-header">
              <span className="oauth-icon microsoft">MS</span>
              <div className="oauth-info">
                <span className="oauth-name">Microsoft</span>
                <span className={`oauth-status ${settings.enable_microsoft_oauth ? 'enabled' : 'disabled'}`}>
                  {settings.enable_microsoft_oauth ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.enable_microsoft_oauth}
                  onChange={(e) => setSettings({ ...settings, enable_microsoft_oauth: e.target.checked })}
                />
                <span className="slider" />
              </label>
            </div>
            {settings.enable_microsoft_oauth && (
              <div className="oauth-config">
                <div className="form-group">
                  <label>Client ID</label>
                  <input
                    type="text"
                    value={settings.microsoft_client_id}
                    onChange={(e) => setSettings({ ...settings, microsoft_client_id: e.target.value })}
                    placeholder="your-microsoft-client-id"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Enterprise SSO</h3>
        <p className="section-desc">Configure SAML or OIDC single sign-on for enterprise customers.</p>

        <label className="toggle-item standalone">
          <input
            type="checkbox"
            checked={settings.enable_sso}
            onChange={(e) => setSettings({ ...settings, enable_sso: e.target.checked })}
          />
          <span className="toggle-label">Enable SSO authentication</span>
        </label>

        {settings.enable_sso && (
          <div className="sso-config">
            <div className="form-group">
              <label>SSO Provider</label>
              <select
                value={settings.sso_provider}
                onChange={(e) => setSettings({ ...settings, sso_provider: e.target.value })}
              >
                <option value="saml">SAML 2.0</option>
                <option value="oidc">OpenID Connect (OIDC)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Entity ID / Issuer</label>
              <input
                type="text"
                value={settings.sso_entity_id}
                onChange={(e) => setSettings({ ...settings, sso_entity_id: e.target.value })}
                placeholder="https://idp.example.com/..."
              />
            </div>

            <div className="form-group">
              <label>Sign-on URL</label>
              <input
                type="url"
                value={settings.sso_signon_url}
                onChange={(e) => setSettings({ ...settings, sso_signon_url: e.target.value })}
                placeholder="https://idp.example.com/sso/saml"
              />
            </div>

            <div className="form-group">
              <label>Certificate (PEM format)</label>
              <textarea
                value={settings.sso_certificate}
                onChange={(e) => setSettings({ ...settings, sso_certificate: e.target.value })}
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                rows={4}
              />
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Password Policy</h3>
        <p className="section-desc">Set requirements for user passwords.</p>

        <div className="form-group" style={{ maxWidth: '200px' }}>
          <label>Minimum Length</label>
          <input
            type="number"
            value={settings.password_min_length}
            onChange={(e) => setSettings({ ...settings, password_min_length: Number(e.target.value) })}
            min={6}
            max={32}
          />
        </div>

        <div className="toggle-group" style={{ marginTop: '16px' }}>
          <label className="toggle-item standalone">
            <input
              type="checkbox"
              checked={settings.password_require_uppercase}
              onChange={(e) => setSettings({ ...settings, password_require_uppercase: e.target.checked })}
            />
            <span className="toggle-label">Require uppercase letter (A-Z)</span>
          </label>

          <label className="toggle-item standalone">
            <input
              type="checkbox"
              checked={settings.password_require_lowercase}
              onChange={(e) => setSettings({ ...settings, password_require_lowercase: e.target.checked })}
            />
            <span className="toggle-label">Require lowercase letter (a-z)</span>
          </label>

          <label className="toggle-item standalone">
            <input
              type="checkbox"
              checked={settings.password_require_number}
              onChange={(e) => setSettings({ ...settings, password_require_number: e.target.checked })}
            />
            <span className="toggle-label">Require number (0-9)</span>
          </label>

          <label className="toggle-item standalone">
            <input
              type="checkbox"
              checked={settings.password_require_special}
              onChange={(e) => setSettings({ ...settings, password_require_special: e.target.checked })}
            />
            <span className="toggle-label">Require special character (!@#$%^&*)</span>
          </label>
        </div>
      </div>

      <div className="actions">
        <button onClick={handleSave} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <style jsx>{`
        .oauth-providers {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .oauth-provider-card {
          background: var(--admin-inner-bg);
          border-radius: 10px;
          overflow: hidden;
        }
        .oauth-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
        }
        .oauth-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #4285f4, #3367d6);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 14px;
        }
        .oauth-icon.github {
          background: linear-gradient(135deg, #333, #24292e);
        }
        .oauth-icon.microsoft {
          background: linear-gradient(135deg, #00a4ef, #0078d4);
        }
        .oauth-info {
          flex: 1;
        }
        .oauth-name {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--admin-text);
        }
        .oauth-status {
          font-size: 12px;
        }
        .oauth-status.enabled {
          color: #10b981;
        }
        .oauth-status.disabled {
          color: var(--admin-text-dim);
        }
        .toggle-switch {
          position: relative;
          width: 44px;
          height: 24px;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .toggle-switch .slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background: #374151;
          border-radius: 24px;
          transition: 0.3s;
        }
        .toggle-switch .slider:before {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: 0.3s;
        }
        .toggle-switch input:checked + .slider {
          background: var(--admin-accent);
        }
        .toggle-switch input:checked + .slider:before {
          transform: translateX(20px);
        }
        .oauth-config {
          padding: 0 16px 16px;
          border-top: 1px solid var(--admin-border);
        }
        .oauth-config .form-group {
          margin-top: 16px;
          margin-bottom: 0;
        }
        .sso-config {
          margin-top: 20px;
          padding: 20px;
          background: var(--admin-inner-bg);
          border-radius: 10px;
        }
        .sso-config .form-group:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// INTEGRATIONS TAB - API keys and third-party services
// =============================================================================

function IntegrationsTab() {
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState({
    // Ad Platforms
    google_ads_client_id: '',
    google_ads_client_secret: '',
    google_ads_developer_token: '',
    meta_app_id: '',
    meta_app_secret: '',
    // AI Providers
    openai_api_key: '',
    anthropic_api_key: '',
    gemini_api_key: '',
    // Email
    resend_api_key: '',
    email_from_address: 'noreply@adsmaster.io',
    // Payments
    stripe_secret_key: '',
    stripe_webhook_secret: '',
    // Notifications
    slack_webhook_url: '',
    slack_channel: '#admin-alerts',
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SecretInput = ({ field, label, placeholder }: { field: string; label: string; placeholder?: string }) => (
    <div className="form-group">
      <label>{label}</label>
      <div className="secret-input">
        <input
          type={showSecrets[field] ? 'text' : 'password'}
          value={(settings as any)[field]}
          onChange={(e) => setSettings({ ...settings, [field]: e.target.value })}
          placeholder={placeholder || '••••••••••••'}
        />
        <button type="button" onClick={() => toggleSecret(field)} className="toggle-secret">
          {showSecrets[field] ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="tab-content-inner">
      <div className="warning-banner">
        <span className="warning-icon">⚠️</span>
        <span>API keys are sensitive credentials. Changes will affect the entire platform.</span>
      </div>

      <div className="settings-section">
        <div className="integration-header">
          <div className="integration-icon google">G</div>
          <div>
            <h3>Google Ads API</h3>
            <p className="section-desc">Connect to Google Ads for campaign management.</p>
          </div>
        </div>

        <SecretInput field="google_ads_client_id" label="Client ID" placeholder="your-client-id.apps.googleusercontent.com" />
        <SecretInput field="google_ads_client_secret" label="Client Secret" />
        <SecretInput field="google_ads_developer_token" label="Developer Token" />
      </div>

      <div className="settings-section">
        <div className="integration-header">
          <div className="integration-icon meta">f</div>
          <div>
            <h3>Meta Marketing API</h3>
            <p className="section-desc">Connect to Facebook and Instagram Ads.</p>
          </div>
        </div>

        <SecretInput field="meta_app_id" label="App ID" />
        <SecretInput field="meta_app_secret" label="App Secret" />
      </div>

      <div className="settings-section">
        <div className="integration-header">
          <div className="integration-icon ai">AI</div>
          <div>
            <h3>AI Providers</h3>
            <p className="section-desc">API keys for AI-powered features and recommendations.</p>
          </div>
        </div>

        <SecretInput field="gemini_api_key" label="Google Gemini API Key" />
        <SecretInput field="openai_api_key" label="OpenAI API Key" />
        <SecretInput field="anthropic_api_key" label="Anthropic API Key" />
      </div>

      <div className="settings-section">
        <div className="integration-header">
          <div className="integration-icon email">@</div>
          <div>
            <h3>Email (Resend)</h3>
            <p className="section-desc">Transactional email delivery service.</p>
          </div>
        </div>

        <SecretInput field="resend_api_key" label="Resend API Key" placeholder="re_..." />
        <div className="form-group">
          <label>From Address</label>
          <input
            type="email"
            value={settings.email_from_address}
            onChange={(e) => setSettings({ ...settings, email_from_address: e.target.value })}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="integration-header">
          <div className="integration-icon stripe">S</div>
          <div>
            <h3>Stripe</h3>
            <p className="section-desc">Payment processing and billing.</p>
          </div>
        </div>

        <SecretInput field="stripe_secret_key" label="Secret Key" placeholder="sk_..." />
        <SecretInput field="stripe_webhook_secret" label="Webhook Secret" placeholder="whsec_..." />
      </div>

      <div className="settings-section">
        <div className="integration-header">
          <div className="integration-icon slack">#</div>
          <div>
            <h3>Slack Notifications</h3>
            <p className="section-desc">Send admin alerts to a Slack channel.</p>
          </div>
        </div>

        <div className="form-group">
          <label>Webhook URL</label>
          <input
            type="url"
            value={settings.slack_webhook_url}
            onChange={(e) => setSettings({ ...settings, slack_webhook_url: e.target.value })}
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

      <div className="actions">
        <button onClick={handleSave} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <style jsx>{`
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
        .integration-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 20px;
        }
        .integration-header h3 {
          margin: 0 0 4px 0;
        }
        .integration-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 16px;
          flex-shrink: 0;
        }
        .integration-icon.google {
          background: linear-gradient(135deg, #4285f4, #3367d6);
        }
        .integration-icon.meta {
          background: linear-gradient(135deg, #1877f2, #0d6efd);
        }
        .integration-icon.ai {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          font-size: 12px;
        }
        .integration-icon.email {
          background: linear-gradient(135deg, #10b981, #059669);
        }
        .integration-icon.stripe {
          background: linear-gradient(135deg, #635bff, #5851ea);
        }
        .integration-icon.slack {
          background: linear-gradient(135deg, #4a154b, #611f69);
        }
        .secret-input {
          display: flex;
          gap: 8px;
        }
        .secret-input input {
          flex: 1;
          font-family: 'JetBrains Mono', monospace;
        }
        .toggle-secret {
          padding: 8px 12px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// SECURITY TAB - 2FA, IP whitelist, rate limiting
// =============================================================================

function SecurityTab() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    require_2fa_admins: true,
    require_2fa_users: false,
    session_single_device: false,
    ip_whitelist_enabled: false,
    ip_whitelist: '',
    rate_limit_enabled: true,
    rate_limit_requests: 100,
    rate_limit_window: 60,
    audit_log_retention_days: 90,
    failed_login_lockout_minutes: 30,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
  };

  return (
    <div className="tab-content-inner">
      <div className="settings-section">
        <h3>Two-Factor Authentication</h3>
        <p className="section-desc">Enhance account security with 2FA requirements.</p>

        <div className="toggle-group">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.require_2fa_admins}
              onChange={(e) => setSettings({ ...settings, require_2fa_admins: e.target.checked })}
            />
            <div className="toggle-content">
              <span className="toggle-label">Require 2FA for admin users</span>
              <span className="toggle-desc">All admin accounts must have 2FA enabled</span>
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
              <span className="toggle-desc">All user accounts must have 2FA enabled</span>
            </div>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Session Security</h3>
        <p className="section-desc">Control how user sessions behave.</p>

        <div className="toggle-group">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={settings.session_single_device}
              onChange={(e) => setSettings({ ...settings, session_single_device: e.target.checked })}
            />
            <div className="toggle-content">
              <span className="toggle-label">Single device sessions</span>
              <span className="toggle-desc">Logging in on a new device will log out other sessions</span>
            </div>
          </label>
        </div>

        <div className="form-group" style={{ marginTop: '16px', maxWidth: '250px' }}>
          <label>Failed Login Lockout (minutes)</label>
          <input
            type="number"
            value={settings.failed_login_lockout_minutes}
            onChange={(e) => setSettings({ ...settings, failed_login_lockout_minutes: Number(e.target.value) })}
            min={5}
            max={1440}
          />
          <span className="form-hint">How long to lock accounts after max failed attempts</span>
        </div>
      </div>

      <div className="settings-section">
        <h3>IP Whitelist</h3>
        <p className="section-desc">Restrict admin panel access to specific IP addresses.</p>

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
              placeholder="192.168.1.1&#10;10.0.0.0/24&#10;203.0.113.0/24"
              rows={5}
              className="mono-textarea"
            />
            <span className="form-hint">CIDR notation supported (e.g., 192.168.1.0/24)</span>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Rate Limiting</h3>
        <p className="section-desc">Protect your API from abuse.</p>

        <label className="toggle-item standalone">
          <input
            type="checkbox"
            checked={settings.rate_limit_enabled}
            onChange={(e) => setSettings({ ...settings, rate_limit_enabled: e.target.checked })}
          />
          <span className="toggle-label">Enable API rate limiting</span>
        </label>

        {settings.rate_limit_enabled && (
          <div className="form-row" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Max Requests</label>
              <input
                type="number"
                value={settings.rate_limit_requests}
                onChange={(e) => setSettings({ ...settings, rate_limit_requests: Number(e.target.value) })}
                min={10}
                max={10000}
              />
            </div>
            <div className="form-group">
              <label>Time Window (seconds)</label>
              <input
                type="number"
                value={settings.rate_limit_window}
                onChange={(e) => setSettings({ ...settings, rate_limit_window: Number(e.target.value) })}
                min={10}
                max={3600}
              />
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Audit Logs</h3>
        <p className="section-desc">Configure audit log retention.</p>

        <div className="form-group" style={{ maxWidth: '250px' }}>
          <label>Retention Period (days)</label>
          <input
            type="number"
            value={settings.audit_log_retention_days}
            onChange={(e) => setSettings({ ...settings, audit_log_retention_days: Number(e.target.value) })}
            min={30}
            max={365}
          />
          <span className="form-hint">Logs older than this will be automatically deleted</span>
        </div>
      </div>

      <div className="actions">
        <button onClick={handleSave} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <style jsx>{`
        .mono-textarea {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// BACKUPS TAB - Backup schedule, restore, GDPR export
// =============================================================================

function BackupsTab() {
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    auto_backup_enabled: true,
    backup_frequency: 'daily',
    backup_time: '03:00',
    retention_days: 30,
    include_uploads: true,
    backup_location: 'gcs',
  });

  const [backups] = useState([
    { id: '1', name: 'Daily Backup', created_at: '2025-01-08T03:00:00Z', size: '2.4 GB', status: 'completed', type: 'automatic' },
    { id: '2', name: 'Daily Backup', created_at: '2025-01-07T03:00:00Z', size: '2.3 GB', status: 'completed', type: 'automatic' },
    { id: '3', name: 'Manual Backup', created_at: '2025-01-05T14:30:00Z', size: '2.3 GB', status: 'completed', type: 'manual' },
  ]);

  const createBackup = async () => {
    setCreating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCreating(false);
  };

  const exportUserData = async () => {
    setExporting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setExporting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
  };

  return (
    <div className="tab-content-inner">
      <div className="settings-section">
        <h3>Automatic Backups</h3>
        <p className="section-desc">Configure scheduled database backups.</p>

        <label className="toggle-item">
          <input
            type="checkbox"
            checked={settings.auto_backup_enabled}
            onChange={(e) => setSettings({ ...settings, auto_backup_enabled: e.target.checked })}
          />
          <div className="toggle-content">
            <span className="toggle-label">Enable automatic backups</span>
            <span className="toggle-desc">Database will be backed up on the configured schedule</span>
          </div>
        </label>

        {settings.auto_backup_enabled && (
          <div className="backup-settings">
            <div className="form-row">
              <div className="form-group">
                <label>Frequency</label>
                <select
                  value={settings.backup_frequency}
                  onChange={(e) => setSettings({ ...settings, backup_frequency: e.target.value })}
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Time (UTC)</label>
                <input
                  type="time"
                  value={settings.backup_time}
                  onChange={(e) => setSettings({ ...settings, backup_time: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Retention (days)</label>
                <input
                  type="number"
                  value={settings.retention_days}
                  onChange={(e) => setSettings({ ...settings, retention_days: Number(e.target.value) })}
                  min={7}
                  max={365}
                />
              </div>
              <div className="form-group">
                <label>Storage Location</label>
                <select
                  value={settings.backup_location}
                  onChange={(e) => setSettings({ ...settings, backup_location: e.target.value })}
                >
                  <option value="gcs">Google Cloud Storage</option>
                  <option value="s3">Amazon S3</option>
                  <option value="local">Local Storage</option>
                </select>
              </div>
            </div>

            <label className="toggle-item standalone" style={{ marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={settings.include_uploads}
                onChange={(e) => setSettings({ ...settings, include_uploads: e.target.checked })}
              />
              <span className="toggle-label">Include user uploads in backups</span>
            </label>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="section-header">
          <div>
            <h3>Recent Backups</h3>
            <p className="section-desc">View and manage database backups.</p>
          </div>
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
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id}>
                  <td className="name-cell">{backup.name}</td>
                  <td className="date-cell">{new Date(backup.created_at).toLocaleString()}</td>
                  <td>{backup.size}</td>
                  <td>
                    <span className={`type-badge ${backup.type}`}>{backup.type}</span>
                  </td>
                  <td>
                    <span className="status-badge completed">{backup.status}</span>
                  </td>
                  <td className="actions-cell">
                    <button className="action-btn">Download</button>
                    <button className="action-btn restore">Restore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="settings-section">
        <h3>Data Export (GDPR)</h3>
        <p className="section-desc">Export all platform data for compliance or migration.</p>

        <div className="export-options">
          <div className="export-card">
            <div className="export-icon">📦</div>
            <div className="export-info">
              <span className="export-title">Full Database Export</span>
              <span className="export-desc">Export all users, organizations, campaigns, and settings</span>
            </div>
            <button onClick={exportUserData} disabled={exporting} className="export-btn">
              {exporting ? 'Exporting...' : 'Export All Data'}
            </button>
          </div>

          <div className="export-card">
            <div className="export-icon">👤</div>
            <div className="export-info">
              <span className="export-title">User Data Export</span>
              <span className="export-desc">Export data for a specific user (GDPR request)</span>
            </div>
            <button className="export-btn secondary">Export User Data</button>
          </div>
        </div>
      </div>

      <div className="actions">
        <button onClick={handleSave} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save Backup Settings'}
        </button>
      </div>

      <style jsx>{`
        .backup-settings {
          margin-top: 20px;
          padding: 20px;
          background: var(--admin-inner-bg);
          border-radius: 10px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .section-header h3 {
          margin: 0 0 4px 0;
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
        .backups-table {
          overflow-x: auto;
        }
        .backups-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .backups-table th,
        .backups-table td {
          padding: 12px 14px;
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
        .name-cell {
          font-weight: 500;
        }
        .date-cell {
          color: var(--admin-text-muted);
        }
        .type-badge {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          text-transform: capitalize;
        }
        .type-badge.automatic {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }
        .type-badge.manual {
          background: rgba(107, 114, 128, 0.15);
          color: #6b7280;
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
        .actions-cell {
          display: flex;
          gap: 6px;
        }
        .action-btn {
          padding: 4px 10px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 4px;
          color: var(--admin-text);
          font-size: 12px;
          cursor: pointer;
        }
        .action-btn.restore {
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.3);
          color: #3b82f6;
        }
        .export-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .export-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--admin-inner-bg);
          border-radius: 10px;
        }
        .export-icon {
          font-size: 28px;
        }
        .export-info {
          flex: 1;
        }
        .export-title {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--admin-text);
        }
        .export-desc {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .export-btn {
          padding: 8px 16px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
        }
        .export-btn.secondary {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          color: var(--admin-text);
        }
        .export-btn:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// MAIN SETTINGS PAGE
// =============================================================================

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const tabs = [
    { id: 'general' as TabType, label: 'General', icon: '⚙️' },
    { id: 'branding' as TabType, label: 'Branding', icon: '🎨' },
    { id: 'auth' as TabType, label: 'Auth', icon: '🔐' },
    { id: 'integrations' as TabType, label: 'Integrations', icon: '🔗' },
    { id: 'security' as TabType, label: 'Security', icon: '🛡️' },
    { id: 'backups' as TabType, label: 'Backups', icon: '💾' },
  ];

  return (
    <div className="settings-page">
      <h1 className="page-title">Admin Settings</h1>
      <p className="page-subtitle">Configure platform settings, branding, authentication, and security.</p>

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
        {activeTab === 'branding' && <BrandingTab />}
        {activeTab === 'auth' && <AuthTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'backups' && <BackupsTab />}
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
          flex-wrap: wrap;
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

        /* Shared tab content styles */
        :global(.tab-content-inner) {}
        :global(.settings-section) {
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--admin-border);
        }
        :global(.settings-section:last-of-type) {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        :global(.settings-section h3) {
          font-size: 15px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 4px 0;
        }
        :global(.section-desc) {
          font-size: 13px;
          color: var(--admin-text-muted);
          margin: 0 0 20px 0;
        }
        :global(.form-group) {
          margin-bottom: 16px;
        }
        :global(.form-row) {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          max-width: 500px;
        }
        :global(.form-group label) {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--admin-text);
          margin-bottom: 8px;
        }
        :global(.form-group input),
        :global(.form-group select),
        :global(.form-group textarea) {
          width: 100%;
          padding: 10px 14px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
        }
        :global(.form-group textarea) {
          resize: vertical;
        }
        :global(.form-group input:focus),
        :global(.form-group select:focus),
        :global(.form-group textarea:focus) {
          outline: none;
          border-color: var(--admin-accent);
        }
        :global(.form-hint) {
          display: block;
          font-size: 12px;
          color: var(--admin-text-dim);
          margin-top: 6px;
        }
        :global(.toggle-group) {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        :global(.toggle-item) {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }
        :global(.toggle-item.standalone) {
          align-items: center;
        }
        :global(.toggle-item input[type="checkbox"]) {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          cursor: pointer;
          accent-color: var(--admin-accent);
        }
        :global(.toggle-content) {
          display: flex;
          flex-direction: column;
        }
        :global(.toggle-label) {
          font-size: 14px;
          font-weight: 500;
          color: var(--admin-text);
        }
        :global(.toggle-desc) {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        :global(.actions) {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--admin-border);
        }
        :global(.save-btn) {
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
        :global(.save-btn:hover) {
          opacity: 0.9;
        }
        :global(.save-btn:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
        }
        :global(.loading) {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
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
          :global(.form-row) {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
