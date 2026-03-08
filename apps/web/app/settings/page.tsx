'use client';

import Header from '@/components/layout/Header';
import Link from 'next/link';

const settingsSections = [
  {
    title: 'Connected Accounts',
    description: 'Manage your Google Ads and Meta Ads account connections',
    href: '/settings/accounts',
    icon: '🔗',
  },
  {
    title: 'Notifications',
    description: 'Configure email and in-app notification preferences',
    href: '/settings/notifications',
    icon: '🔔',
  },
  {
    title: 'Billing',
    description: 'Manage subscription, payment methods, and invoices',
    href: '/settings/billing',
    icon: '💳',
  },
  {
    title: 'Team Members',
    description: 'Invite team members and manage access permissions',
    href: '/settings/team',
    icon: '👥',
  },
  {
    title: 'API Keys',
    description: 'Generate and manage API keys for integrations',
    href: '/settings/api',
    icon: '🔑',
  },
  {
    title: 'Preferences',
    description: 'Set timezone, currency, and display preferences',
    href: '/settings/preferences',
    icon: '⚙️',
  },
];

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" />
      <div className="page-content">
        <div style={{ maxWidth: '800px' }}>
          {/* Profile Section */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Profile</span>
              <button className="btn btn-secondary btn-sm">Edit</button>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                JD
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>John Doe</div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>john@example.com</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="badge badge-success">Pro Plan</span>
                  <span className="badge badge-neutral">Agency Owner</span>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {settingsSections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                style={{
                  padding: '20px',
                  border: '1px solid var(--border-default)',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                className="settings-card"
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '24px' }}>{section.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{section.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{section.description}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ marginTop: '24px', borderColor: 'var(--error)' }}>
            <div className="card-header">
              <span className="card-title" style={{ color: 'var(--error)' }}>Danger Zone</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500 }}>Delete Account</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Permanently delete your account and all data
                </div>
              </div>
              <button className="btn" style={{ background: 'var(--error)', color: 'white' }}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-card:hover {
          border-color: var(--primary);
          background: var(--surface-secondary);
        }
      `}</style>
    </>
  );
}
