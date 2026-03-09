'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { getGoogleAdsConnectUrl, getMetaAdsConnectUrl } from '@/lib/api';
import { useConnectedAccounts, disconnectAccount, syncAccount } from '@/lib/hooks/useApi';

const platformConfig = {
  google: {
    name: 'Google Ads',
    icon: 'G',
    color: '#4285F4',
    description: 'Connect your Google Ads account to manage Search, Display, Shopping, and YouTube campaigns.',
  },
  meta: {
    name: 'Meta Ads',
    icon: 'f',
    color: '#0668E1',
    description: 'Connect your Meta account to manage Facebook, Instagram, and Messenger ads.',
  },
};

// Format currency from micros
const formatSpend = (micros: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(micros / 1_000_000);
};

// Format relative time
const formatLastSync = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return date.toLocaleString();
};

export default function AccountsSettingsPage() {
  const searchParams = useSearchParams();
  const { data, loading, error, refetch, isDemo } = useConnectedAccounts();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

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
        refetch(); // Refresh the list
      } else {
        setNotification({
          type: 'error',
          message: message || `Failed to connect ${platform === 'google' ? 'Google' : 'Meta'} Ads account.`,
        });
      }

      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    }
  }, [searchParams, refetch]);

  const handleConnect = (platform: 'google' | 'meta') => {
    const orgId = 'org_demo'; // In production, get from auth context
    const url = platform === 'google'
      ? getGoogleAdsConnectUrl(orgId)
      : getMetaAdsConnectUrl(orgId);
    window.location.href = url;
  };

  const handleDisconnect = async (accountId: string, accountName: string) => {
    if (!confirm(`Are you sure you want to disconnect "${accountName}"? This will stop syncing data.`)) {
      return;
    }

    try {
      await disconnectAccount(accountId);
      setNotification({
        type: 'success',
        message: 'Account disconnected successfully.',
      });
      refetch();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to disconnect account',
      });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSync = async (accountId: string, accountName: string) => {
    setSyncing(accountId);
    try {
      await syncAccount(accountId);
      setNotification({
        type: 'success',
        message: `Syncing ${accountName}... This may take a few minutes.`,
      });
      refetch();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to trigger sync',
      });
    } finally {
      setSyncing(null);
    }
    setTimeout(() => setNotification(null), 3000);
  };

  if (loading) {
    return (
      <>
        <Header title="Connected Accounts" showDateFilter={false} />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading accounts...</div>
          </div>
        </div>
      </>
    );
  }

  const accounts = data?.accounts || [];

  return (
    <>
      <Header title="Connected Accounts" showDateFilter={false} />
      <div className="page-content">
        {/* Demo Mode Banner */}
        {isDemo && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: '24px',
              borderRadius: '8px',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid var(--warning)',
              color: 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>Demo Mode</span>
            <span style={{ color: 'var(--text-secondary)' }}>- Connect your real ad accounts to see your actual data</span>
          </div>
        )}

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
                    color: 'white',
                    fontWeight: 700,
                  }}
                >
                  G
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
                    color: 'white',
                    fontWeight: 700,
                  }}
                >
                  f
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
                    <td>
                      <div style={{ fontWeight: 500 }}>{account.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{account.external_id}</div>
                    </td>
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
                        className={`badge ${
                          account.status === 'active' ? 'badge-success' :
                          account.status === 'error' ? 'badge-error' :
                          account.status === 'disconnected' ? 'badge-neutral' :
                          'badge-warning'
                        }`}
                      >
                        {account.status === 'active' ? '● Connected' :
                         account.status === 'error' ? '● Error' :
                         account.status === 'disconnected' ? '○ Disconnected' :
                         '● Paused'}
                      </span>
                    </td>
                    <td className="right mono">{formatSpend(account.spend_30d_micros)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatLastSync(account.last_sync)}
                    </td>
                    <td className="right">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleSync(account.id, account.name)}
                          disabled={syncing === account.id}
                          title="Sync now"
                        >
                          {syncing === account.id ? '...' : '🔄'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDisconnect(account.id, account.name)}
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
