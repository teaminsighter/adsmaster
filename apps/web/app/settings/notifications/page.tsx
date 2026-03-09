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

            {/* Channel Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 80px 80px',
              gap: '16px',
              padding: '12px 0',
              borderBottom: '1px solid var(--border-default)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}>
              <div>Notification Type</div>
              <div style={{ textAlign: 'center' }}>Email</div>
              <div style={{ textAlign: 'center' }}>Push</div>
              <div style={{ textAlign: 'center' }}>Slack</div>
            </div>

            {/* Settings Rows */}
            {settings.map((setting) => (
              <div
                key={setting.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 80px 80px',
                  gap: '16px',
                  padding: '16px 0',
                  borderBottom: '1px solid var(--border-default)',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>{setting.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{setting.description}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={setting.email}
                    onChange={() => handleToggle(setting.id, 'email')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={setting.push}
                    onChange={() => handleToggle(setting.id, 'push')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={setting.slack}
                    onChange={() => handleToggle(setting.id, 'slack')}
                    disabled={!data?.slack_connected}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: data?.slack_connected ? 'pointer' : 'not-allowed',
                      opacity: data?.slack_connected ? 1 : 0.5,
                    }}
                  />
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
          <div className="card" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <span className="card-title">Slack Integration</span>
              {data?.slack_connected && (
                <span className="badge badge-success">Connected</span>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <button className="btn btn-secondary">
                {data?.slack_connected ? 'Manage' : 'Connect Slack'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
