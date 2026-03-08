'use client';

import Header from '@/components/layout/Header';

const mockAudiences = [
  {
    id: '1',
    name: 'Website Visitors - 30 Days',
    type: 'REMARKETING',
    platform: 'google',
    size: 45000,
    status: 'ACTIVE',
    campaigns: 3,
    conversions: 156,
  },
  {
    id: '2',
    name: 'Cart Abandoners - 7 Days',
    type: 'REMARKETING',
    platform: 'google',
    size: 8500,
    status: 'ACTIVE',
    campaigns: 2,
    conversions: 89,
  },
  {
    id: '3',
    name: 'Purchasers - 180 Days',
    type: 'CUSTOMER_LIST',
    platform: 'google',
    size: 12300,
    status: 'ACTIVE',
    campaigns: 1,
    conversions: 234,
  },
  {
    id: '4',
    name: 'Lookalike - Top Customers 1%',
    type: 'LOOKALIKE',
    platform: 'meta',
    size: 2100000,
    status: 'ACTIVE',
    campaigns: 2,
    conversions: 67,
  },
  {
    id: '5',
    name: 'FB Page Engagers - 90 Days',
    type: 'ENGAGEMENT',
    platform: 'meta',
    size: 125000,
    status: 'ACTIVE',
    campaigns: 1,
    conversions: 45,
  },
  {
    id: '6',
    name: 'Email Subscribers',
    type: 'CUSTOMER_LIST',
    platform: 'meta',
    size: 28000,
    status: 'PAUSED',
    campaigns: 0,
    conversions: 0,
  },
];

const audienceTypes: Record<string, { label: string; color: string }> = {
  REMARKETING: { label: 'Remarketing', color: 'var(--primary)' },
  CUSTOMER_LIST: { label: 'Customer List', color: 'var(--info)' },
  LOOKALIKE: { label: 'Lookalike', color: 'var(--warning)' },
  ENGAGEMENT: { label: 'Engagement', color: 'var(--success)' },
};

export default function AudiencesPage() {
  const stats = {
    total: mockAudiences.length,
    active: mockAudiences.filter((a) => a.status === 'ACTIVE').length,
    totalSize: mockAudiences.reduce((sum, a) => sum + a.size, 0),
    googleAudiences: mockAudiences.filter((a) => a.platform === 'google').length,
    metaAudiences: mockAudiences.filter((a) => a.platform === 'meta').length,
  };

  return (
    <>
      <Header title="Audiences" />
      <div className="page-content">
        {/* Summary Stats */}
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-label">Total Audiences</div>
            <div className="metric-value">{stats.total}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {stats.active} active
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Reach</div>
            <div className="metric-value mono">
              {stats.totalSize > 1000000
                ? `${(stats.totalSize / 1000000).toFixed(1)}M`
                : `${(stats.totalSize / 1000).toFixed(0)}K`}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Google Audiences</div>
            <div className="metric-value">{stats.googleAudiences}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Meta Audiences</div>
            <div className="metric-value">{stats.metaAudiences}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="input"
                placeholder="Search audiences..."
                style={{ width: '250px' }}
              />
              <select className="select">
                <option value="">All Platforms</option>
                <option value="google">Google Ads</option>
                <option value="meta">Meta Ads</option>
              </select>
              <select className="select">
                <option value="">All Types</option>
                <option value="REMARKETING">Remarketing</option>
                <option value="CUSTOMER_LIST">Customer List</option>
                <option value="LOOKALIKE">Lookalike</option>
                <option value="ENGAGEMENT">Engagement</option>
              </select>
            </div>
            <button className="btn btn-primary btn-sm">+ Create Audience</button>
          </div>

          {/* Audiences Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {mockAudiences.map((audience) => (
              <div
                key={audience.id}
                style={{
                  padding: '16px',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  background: audience.status === 'PAUSED' ? 'var(--surface-secondary)' : undefined,
                  opacity: audience.status === 'PAUSED' ? 0.7 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: audience.platform === 'google' ? '#4285F4' : '#0668E1',
                        }}
                      />
                      <span style={{ fontWeight: 500 }}>{audience.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: `${audienceTypes[audience.type].color}20`,
                          color: audienceTypes[audience.type].color,
                        }}
                      >
                        {audienceTypes[audience.type].label}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {audience.platform === 'google' ? 'Google' : 'Meta'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`badge ${audience.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}
                  >
                    {audience.status === 'ACTIVE' ? '● Active' : '○ Paused'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Size</div>
                    <div className="mono" style={{ fontWeight: 500 }}>
                      {audience.size > 1000000
                        ? `${(audience.size / 1000000).toFixed(1)}M`
                        : audience.size > 1000
                        ? `${(audience.size / 1000).toFixed(0)}K`
                        : audience.size}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Campaigns</div>
                    <div className="mono" style={{ fontWeight: 500 }}>{audience.campaigns}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Conversions</div>
                    <div className="mono" style={{ fontWeight: 500, color: audience.conversions > 0 ? 'var(--success)' : 'var(--text-tertiary)' }}>
                      {audience.conversions || '—'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-default)' }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>View</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>Edit</button>
                  <button className="btn btn-ghost btn-sm">...</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
