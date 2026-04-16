'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useConnectedAccounts } from '@/lib/hooks/useApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface Platform {
  id: 'google' | 'meta';
  name: string;
  description: string;
  color: string;
  features: string[];
}

const platformData: Platform[] = [
  {
    id: 'google',
    name: 'Google Ads',
    description: 'Connect your Google Ads accounts to manage Search, Display, Shopping, and Performance Max campaigns',
    color: '#4285F4',
    features: ['Search Campaigns', 'Display Network', 'Shopping Ads', 'Performance Max', 'YouTube Ads'],
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    description: 'Connect your Meta Business accounts to manage Facebook and Instagram advertising campaigns',
    color: '#0668E1',
    features: ['Facebook Ads', 'Instagram Ads', 'Audience Network', 'Messenger Ads', 'WhatsApp Ads'],
  },
];

function ConnectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, getAccessToken, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: accounts, loading: accountsLoading, refetch } = useConnectedAccounts();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Handle OAuth callback notifications
  useEffect(() => {
    const connected = searchParams.get('connected');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const count = searchParams.get('count');
    const message = searchParams.get('message');

    if (connected === 'google_ads' || (platform === 'google' && status === 'success')) {
      setNotification({
        type: 'success',
        message: `Successfully connected ${count || 1} Google Ads account(s)!`,
      });
      refetch();
      // Clear URL params
      router.replace('/connect');
    } else if (platform === 'meta' && status === 'success') {
      setNotification({
        type: 'success',
        message: `Successfully connected ${count || 1} Meta Ads account(s)!`,
      });
      refetch();
      router.replace('/connect');
    } else if (status === 'error') {
      setNotification({
        type: 'error',
        message: message || `Failed to connect ${platform === 'google' ? 'Google' : 'Meta'} Ads account.`,
      });
      router.replace('/connect');
    }
  }, [searchParams, refetch, router]);

  // Count connected accounts per platform
  const getAccountCount = (platformId: 'google' | 'meta') => {
    if (!accounts?.accounts) return 0;
    return accounts.accounts.filter(acc => acc.platform === platformId && acc.status === 'active').length;
  };

  // Handle connect button click
  const handleConnect = async (platformId: 'google' | 'meta') => {
    if (!user?.organization_id) {
      setNotification({
        type: 'error',
        message: 'You must be part of an organization to connect ad accounts.',
      });
      return;
    }

    setConnecting(platformId);
    setNotification(null);

    try {
      if (platformId === 'google') {
        // Google OAuth - fetch URL then redirect
        const response = await fetch(
          `${API_URL}/auth/google-ads/connect?organization_id=${user.organization_id}`
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to start Google OAuth');
        }

        const data = await response.json();
        window.location.href = data.auth_url;
      } else {
        // Meta OAuth - requires auth header
        const token = getAccessToken();
        if (!token) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_URL}/auth/meta/connect`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to start Meta OAuth');
        }

        const data = await response.json();
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error('Connect error:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to connect',
      });
      setConnecting(null);
    }
  };

  // Handle manage button
  const handleManage = () => {
    router.push('/settings/accounts');
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <>
        <Header title="Connect Ad Accounts" />
        <div className="page-content">
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
          </div>
        </div>
      </>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <>
      <Header title="Connect Ad Accounts" />
      <div className="page-content">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
              Connect Your Ad Platforms
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
              Link your advertising accounts to start managing campaigns with AI-powered optimization
            </p>
          </div>

          {/* Notification */}
          {notification && (
            <div
              style={{
                padding: '12px 16px',
                marginBottom: '24px',
                borderRadius: '8px',
                background: notification.type === 'success'
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${notification.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
                color: notification.type === 'success' ? 'var(--success)' : 'var(--error)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '0 4px',
                }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Platform Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {platformData.map((platform) => {
              const accountCount = getAccountCount(platform.id);
              const isConnected = accountCount > 0;
              const isConnecting = connecting === platform.id;

              return (
                <div
                  key={platform.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${platform.color}`,
                    opacity: isConnecting ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: platform.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '18px',
                          }}
                        >
                          {platform.name[0]}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{platform.name}</h3>
                          {isConnected && (
                            <span style={{ fontSize: '12px', color: 'var(--success)' }}>
                              ● {accountCount} account{accountCount !== 1 ? 's' : ''} connected
                            </span>
                          )}
                        </div>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                        {platform.description}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {platform.features.map((feature) => (
                          <span
                            key={feature}
                            className="badge badge-neutral"
                            style={{ fontSize: '11px' }}
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginLeft: '24px' }}>
                      {isConnected ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={handleManage}
                          >
                            Manage
                          </button>
                          <button
                            className="btn btn-primary"
                            style={{ background: platform.color }}
                            onClick={() => handleConnect(platform.id)}
                            disabled={isConnecting}
                          >
                            {isConnecting ? 'Connecting...' : 'Add More'}
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ background: platform.color }}
                          onClick={() => handleConnect(platform.id)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? 'Connecting...' : 'Connect'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Continue button if accounts connected */}
          {accounts?.accounts && accounts.accounts.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '14px 32px', fontSize: '16px' }}
                onClick={() => router.push('/dashboard')}
              >
                Continue to Dashboard →
              </button>
            </div>
          )}

          {/* Help Section */}
          <div
            style={{
              marginTop: '48px',
              padding: '24px',
              background: 'var(--surface-secondary)',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <h3 style={{ marginBottom: '8px' }}>Need Help Connecting?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
              Make sure you have admin access to your ad accounts. You&apos;ll be redirected to Google or Meta to authorize access.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary">View Documentation</button>
              <button className="btn btn-ghost" onClick={() => router.push('/dashboard')}>
                Skip for Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    }>
      <ConnectPageContent />
    </Suspense>
  );
}
