'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  slack: boolean;
}

const defaultSettings: NotificationSetting[] = [
  { id: 'budget_alerts', label: 'Budget Alerts', description: 'Get notified when campaigns exceed budget thresholds', email: true, push: true, slack: true },
  { id: 'performance_drops', label: 'Performance Drops', description: 'Alert when ROAS or conversion rates drop significantly', email: true, push: true, slack: false },
  { id: 'ai_recommendations', label: 'AI Recommendations', description: 'New AI-powered optimization suggestions', email: true, push: false, slack: false },
  { id: 'campaign_status', label: 'Campaign Status Changes', description: 'Notifications when campaigns are paused or enabled', email: false, push: true, slack: true },
  { id: 'weekly_report', label: 'Weekly Performance Report', description: 'Summary of account performance sent every Monday', email: true, push: false, slack: false },
  { id: 'billing', label: 'Billing Notifications', description: 'Invoice and payment related notifications', email: true, push: false, slack: false },
];

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);
  const [saved, setSaved] = useState(false);

  const handleToggle = (id: string, channel: 'email' | 'push' | 'slack') => {
    setSettings(settings.map(s =>
      s.id === id ? { ...s, [channel]: !s[channel] } : s
    ));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <Header title="Notification Settings" />
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
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
              <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
            </div>
          </div>

          {/* Slack Integration */}
          <div className="card" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <span className="card-title">Slack Integration</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Connect to Slack</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Receive notifications directly in your Slack workspace
                </div>
              </div>
              <button className="btn btn-secondary">Connect Slack</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
