'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import { useUserProfile, updateProfile } from '@/lib/hooks/useApi';
import EditProfileModal from '@/components/settings/EditProfileModal';

const settingsSections = [
  {
    title: 'Connected Accounts',
    description: 'Manage your Google Ads and Meta Ads account connections',
    href: '/settings/accounts',
    icon: '🔗',
  },
  {
    title: 'Goals & Alerts',
    description: 'Set performance targets, budget pacing, and anomaly alerts',
    href: '/settings/goals',
    icon: '🎯',
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

// Get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Format role for display
const formatRole = (role: string) => {
  const roleMap: Record<string, string> = {
    owner: 'Agency Owner',
    admin: 'Admin',
    editor: 'Editor',
    viewer: 'Viewer',
  };
  return roleMap[role] || role;
};

// Format plan name for display
const formatPlan = (plan: string) => {
  return plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan';
};

export default function SettingsPage() {
  // TODO: Get real user ID from auth context
  const userId = 'demo_user';
  const { data: profile, loading, refetch } = useUserProfile(userId);
  const [showEditModal, setShowEditModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSaveProfile = async (data: { name: string; email: string }) => {
    await updateProfile(userId, data);
    setSuccessMessage('Profile updated successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
    refetch();
  };

  return (
    <>
      <Header title="Settings" showDateFilter={false} />
      <div className="page-content">
        <div style={{ maxWidth: '800px' }}>
          {/* Success Message */}
          {successMessage && (
            <div
              style={{
                padding: '12px 16px',
                marginBottom: '24px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--success)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Profile Section */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Profile</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(true)}>
                Edit
              </button>
            </div>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading profile...
              </div>
            ) : (
              <div className="profile-content">
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
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    getInitials(profile?.name || 'User')
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                    {profile?.name || 'User'}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {profile?.email || ''}
                  </div>
                  <div className="profile-badges">
                    {profile?.subscription && (
                      <span className={`badge ${profile.subscription.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {formatPlan(profile.subscription.plan_name)}
                      </span>
                    )}
                    {profile?.organization && (
                      <span className="badge badge-neutral">
                        {formatRole(profile.organization.role)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings Grid */}
          <div className="settings-grid">
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
          <div className="card danger-zone-card" style={{ marginTop: '24px', borderColor: 'var(--error)' }}>
            <div className="card-header">
              <span className="card-title" style={{ color: 'var(--error)' }}>Danger Zone</span>
            </div>
            <div className="danger-zone-content">
              <div>
                <div style={{ fontWeight: 500 }}>Delete Account</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Permanently delete your account and all data
                </div>
              </div>
              <button
                className="btn danger-btn"
                onClick={() => {
                  if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    alert('Account deletion is not available in demo mode.');
                  }
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveProfile}
        initialData={profile ? { name: profile.name, email: profile.email, avatar_url: profile.avatar_url } : null}
      />

      <style jsx>{`
        .profile-content {
          display: flex;
          gap: 24px;
          align-items: center;
        }

        .profile-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .settings-card:hover {
          border-color: var(--primary);
          background: var(--surface-secondary);
        }

        .danger-zone-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .danger-btn {
          background: var(--error);
          color: white;
          white-space: nowrap;
        }

        @media (max-width: 767px) {
          .profile-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 16px;
          }

          .profile-badges {
            justify-content: center;
          }

          .settings-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .danger-zone-card {
            margin-top: 16px !important;
          }

          .danger-zone-content {
            flex-direction: column;
            align-items: stretch;
          }

          .danger-btn {
            width: 100%;
            margin-top: 12px;
          }
        }
      `}</style>
    </>
  );
}
