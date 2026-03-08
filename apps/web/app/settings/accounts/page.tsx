'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { getGoogleAdsConnectUrl, getMetaAdsConnectUrl } from '@/lib/api';

interface ConnectedAccount {
  id: string;
  name: string;
  platform: 'google' | 'meta';
  status: 'active' | 'paused' | 'error';
  lastSync: string;
  spend30d: number;
}

// Mock connected accounts
const mockAccounts: ConnectedAccount[] = [
  {
    id: 'google_1',
    name: 'Acme Corp - Google Ads',
    platform: 'google',
    status: 'active',
    lastSync: '2026-03-08T10:30:00Z',
    spend30d: 45678,
  },
  {
    id: 'meta_1',
    name: 'Acme Corp - Meta Ads',
    platform: 'meta',
    status: 'active',
    lastSync: '2026-03-08T10:25:00Z',
    spend30d: 21119,
  },
];

const platformConfig = {
  google: {
    name: 'Google Ads',
    icon: '🔵',
    color: '#4285F4',
    description: 'Connect your Google Ads account to manage Search, Display, Shopping, and YouTube campaigns.',
  },
  meta: {
    name: 'Meta Ads',
    icon: '🔷',
    color: '#0668E1',
    description: 'Connect your Meta account to manage Facebook, Instagram, and Messenger ads.',
  },
};

export default function AccountsSettingsPage() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(mockAccounts);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Handle OAuth callback status
  useEffect(() => {
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const count = searchParams.get('count');
    const message = searchParams.get('message');

    if (platform && status) {
      if (status === 'success') {
        setNotification({
          type: 'success',
          message: `Successfully connected ${count || 1} ${platform === 'google' ? 'Google' : 'Meta'} ad account(s)!`,
        });
      } else {
        setNotification({
          type: 'error',
          message: message || `Failed to connect ${platform === 'google' ? 'Google' : 'Meta'} Ads account.`,
        });
      }

      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    }
  }, [searchParams]);

  const handleConnect = (platform: 'google' | 'meta') => {
    const orgId = 'org_demo'; // In production, get from auth context
    const url = platform === 'google'
      ? getGoogleAdsConnectUrl(orgId)
      : getMetaAdsConnectUrl(orgId);
    window.location.href = url;
  };

  const handleDisconnect = (accountId: string) => {
    if (confirm('Are you sure you want to disconnect this account? This will stop syncing data.')) {
      setAccounts(accounts.filter((a) => a.id !== accountId));
      setNotification({
        type: 'success',
        message: 'Account disconnected successfully.',
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSync = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (account) {
      setNotification({
        type: 'success',
        message: `Syncing ${account.name}... This may take a few minutes.`,
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <>
      <Header title="Connected Accounts" />
      <div className="page-content">
        {/* Notification */}
        {notification && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: '24px',
              borderRadius: '8px',
              background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${notification.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
              color: notification.type === 'success' ? 'var(--success)' : 'var(--error)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{notification.type === 'success' ? '✓' : '✕'}</span>
            <span>{notification.message}</span>
          </div>
        )}

        {/* Connect New Account */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <span className="card-title">Connect New Account</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {/* Google Ads */}
            <div
              style={{
                padding: '20px',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#4285F4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}
                >
                  <span style={{ filter: 'grayscale(100%) brightness(100)' }}>G</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>Google Ads</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Search, Display, Shopping, YouTube
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                {platformConfig.google.description}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => handleConnect('google')}
                style={{ marginTop: 'auto' }}
              >
                Connect Google Ads
              </button>
            </div>

            {/* Meta Ads */}
            <div
              style={{
                padding: '20px',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#0668E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}
                >
                  <span style={{ filter: 'grayscale(100%) brightness(100)' }}>f</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>Meta Ads</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Facebook, Instagram, Messenger
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                {platformConfig.meta.description}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => handleConnect('meta')}
                style={{ marginTop: 'auto' }}
              >
                Connect Meta Ads
              </button>
            </div>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Connected Accounts</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
            </span>
          </div>

          {accounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>📭</div>
              <div style={{ fontSize: '16px', fontWeight: 500 }}>No accounts connected</div>
              <div style={{ fontSize: '14px' }}>Connect your first ad account to get started</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Platform</th>
                  <th>Status</th>
                  <th className="right">Spend (30d)</th>
                  <th>Last Sync</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td style={{ fontWeight: 500 }}>{account.name}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: account.platform === 'google' ? 'rgba(66, 133, 244, 0.1)' : 'rgba(6, 104, 225, 0.1)',
                          color: account.platform === 'google' ? '#4285F4' : '#0668E1',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                      >
                        {platformConfig[account.platform].icon}
                        {platformConfig[account.platform].name}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${account.status === 'active' ? 'badge-success' : account.status === 'error' ? 'badge-error' : 'badge-warning'}`}
                      >
                        {account.status === 'active' ? '● Connected' : account.status === 'error' ? '● Error' : '● Paused'}
                      </span>
                    </td>
                    <td className="right mono">${account.spend30d.toLocaleString()}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(account.lastSync).toLocaleString()}
                    </td>
                    <td className="right">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleSync(account.id)}
                          title="Sync now"
                        >
                          🔄
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDisconnect(account.id)}
                          title="Disconnect"
                          style={{ color: 'var(--error)' }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Help Text */}
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: 'var(--surface-secondary)',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          <strong>Need help?</strong> Check our{' '}
          <a href="/help" style={{ color: 'var(--primary)' }}>
            documentation
          </a>{' '}
          for step-by-step guides on connecting your ad accounts.
        </div>
      </div>
    </>
  );
}
