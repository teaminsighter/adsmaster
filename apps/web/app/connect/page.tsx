'use client';

import Header from '@/components/layout/Header';

const platforms = [
  {
    id: 'google',
    name: 'Google Ads',
    description: 'Connect your Google Ads accounts to manage Search, Display, Shopping, and Performance Max campaigns',
    color: '#4285F4',
    features: ['Search Campaigns', 'Display Network', 'Shopping Ads', 'Performance Max', 'YouTube Ads'],
    connected: true,
    accounts: 2,
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    description: 'Connect your Meta Business accounts to manage Facebook and Instagram advertising campaigns',
    color: '#0668E1',
    features: ['Facebook Ads', 'Instagram Ads', 'Audience Network', 'Messenger Ads', 'WhatsApp Ads'],
    connected: false,
    accounts: 0,
  },
];

export default function ConnectPage() {
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

          {/* Platform Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {platforms.map((platform) => (
              <div
                key={platform.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${platform.color}`,
                  opacity: platform.connected ? 1 : 0.9,
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
                        {platform.connected && (
                          <span style={{ fontSize: '12px', color: 'var(--success)' }}>
                            ● {platform.accounts} account{platform.accounts !== 1 ? 's' : ''} connected
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
                    {platform.connected ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button className="btn btn-secondary">Manage</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }}>
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ background: platform.color }}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

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
              Our team can help you set up your ad accounts and get started with AdsMaster
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary">View Documentation</button>
              <button className="btn btn-primary">Contact Support</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
