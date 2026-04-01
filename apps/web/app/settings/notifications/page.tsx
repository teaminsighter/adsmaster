'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useNotificationSettings, updateNotificationSettings } from '@/lib/hooks/useApi';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  slack: boolean;
}

const notificationLabels: Record<string, { label: string; description: string }> = {
  budget_alerts: { label: 'Budget Alerts', description: 'Get notified when campaigns exceed budget thresholds' },
  performance_drops: { label: 'Performance Drops', description: 'Alert when ROAS or conversion rates drop significantly' },
  ai_recommendations: { label: 'AI Recommendations', description: 'New AI-powered optimization suggestions' },
  campaign_status: { label: 'Campaign Status Changes', description: 'Notifications when campaigns are paused or enabled' },
  weekly_report: { label: 'Weekly Performance Report', description: 'Summary of account performance sent every Monday' },
  billing: { label: 'Billing Notifications', description: 'Invoice and payment related notifications' },
};

export default function NotificationsSettingsPage() {
  // TODO: Get real user/org ID from auth context
  const userId = 'demo_user';
  const organizationId = 'demo_org';
  const { data, loading, error, refetch } = useNotificationSettings(userId, organizationId);

  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update local state when data is fetched
  useEffect(() => {
    if (data?.settings) {
      setSettings(
        data.settings.map((s) => ({
          id: s.notification_type,
          label: notificationLabels[s.notification_type]?.label || s.notification_type,
          description: notificationLabels[s.notification_type]?.description || '',
          email: s.email_enabled,
          push: s.push_enabled,
          slack: s.slack_enabled,
        }))
      );
    }
  }, [data]);

  const handleToggle = (id: string, channel: 'email' | 'push' | 'slack') => {
    setSettings(settings.map(s =>
      s.id === id ? { ...s, [channel]: !s[channel] } : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateNotificationSettings(
        userId,
        organizationId,
        settings.map((s) => ({
          notification_type: s.id,
          email_enabled: s.email,
          push_enabled: s.push,
          slack_enabled: s.slack,
        }))
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      refetch();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Notification Settings" showDateFilter={false} />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading notification settings...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Notification Settings" showDateFilter={false} />
      <div className="page-content">
        <div style={{ maxWidth: '800px' }}>
          {saved && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '24px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--success)',
              color: 'var(--success)',
            }}>
              Settings saved successfully
            </div>
          )}

          {saveError && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '24px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
            }}>
              {saveError}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <span className="card-title">Notification Preferences</span>
            </div>

            {/* Channel Headers - Desktop only */}
            <div className="notif-header">
              <div>Notification Type</div>
              <div style={{ textAlign: 'center' }}>Email</div>
              <div style={{ textAlign: 'center' }}>Push</div>
              <div style={{ textAlign: 'center' }}>Slack</div>
            </div>

            {/* Settings Rows */}
            {settings.map((setting) => (
              <div key={setting.id} className="notif-row">
                <div className="notif-info">
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>{setting.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{setting.description}</div>
                </div>
                <div className="notif-toggles">
                  <label className="notif-toggle">
                    <input
                      type="checkbox"
                      checked={setting.email}
                      onChange={() => handleToggle(setting.id, 'email')}
                    />
                    <span className="notif-toggle-label">Email</span>
                  </label>
                  <label className="notif-toggle">
                    <input
                      type="checkbox"
                      checked={setting.push}
                      onChange={() => handleToggle(setting.id, 'push')}
                    />
                    <span className="notif-toggle-label">Push</span>
                  </label>
                  <label className="notif-toggle">
                    <input
                      type="checkbox"
                      checked={setting.slack}
                      onChange={() => handleToggle(setting.id, 'slack')}
                      disabled={!data?.slack_connected}
                      style={{
                        opacity: data?.slack_connected ? 1 : 0.5,
                      }}
                    />
                    <span className="notif-toggle-label">Slack</span>
                  </label>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Slack Integration */}
          <div className="card slack-card">
            <div className="card-header">
              <span className="card-title">Slack Integration</span>
              {data?.slack_connected && (
                <span className="badge badge-success">Connected</span>
              )}
            </div>
            <div className="slack-content">
              <div>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                  {data?.slack_connected ? 'Slack Connected' : 'Connect to Slack'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {data?.slack_connected
                    ? 'Your Slack workspace is connected. Enable Slack notifications above.'
                    : 'Receive notifications directly in your Slack workspace'}
                </div>
              </div>
              <button className="btn btn-secondary slack-btn">
                {data?.slack_connected ? 'Manage' : 'Connect Slack'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .notif-header {
          display: grid;
          grid-template-columns: 1fr 80px 80px 80px;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-default);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .notif-row {
          display: grid;
          grid-template-columns: 1fr 80px 80px 80px;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-default);
          align-items: center;
        }

        .notif-toggles {
          display: contents;
        }

        .notif-toggle {
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
        }

        .notif-toggle input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .notif-toggle-label {
          display: none;
        }

        .slack-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .slack-card {
          margin-top: 24px;
        }

        @media (max-width: 767px) {
          .notif-header {
            display: none;
          }

          .notif-row {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px 0;
          }

          .notif-info {
            width: 100%;
          }

          .notif-toggles {
            display: flex;
            gap: 16px;
            width: 100%;
          }

          .notif-toggle {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            background: var(--surface-secondary);
            border-radius: 8px;
            flex: 1;
            justify-content: center;
          }

          .notif-toggle-label {
            display: inline;
            font-size: 12px;
            color: var(--text-secondary);
          }

          .slack-card {
            margin-top: 16px;
          }

          .slack-content {
            flex-direction: column;
            align-items: stretch;
          }

          .slack-btn {
            width: 100%;
            margin-top: 12px;
          }
        }
      `}</style>
    </>
  );
}
