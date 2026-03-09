'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import DemoBanner from '@/components/ui/DemoBanner';
import { useAudiences } from '@/lib/hooks/useApi';

const audienceTypes: Record<string, { label: string; color: string }> = {
  REMARKETING: { label: 'Remarketing', color: 'var(--primary)' },
  CUSTOMER_LIST: { label: 'Customer List', color: 'var(--info)' },
  LOOKALIKE: { label: 'Lookalike', color: 'var(--warning)' },
  ENGAGEMENT: { label: 'Engagement', color: 'var(--success)' },
};

// Format audience size
const formatSize = (size: number) => {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)}M`;
  if (size >= 1_000) return `${(size / 1_000).toFixed(0)}K`;
  return size.toString();
};

export default function AudiencesPage() {
  const router = useRouter();
  const [platformFilter, setPlatformFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, loading, error, isDemo } = useAudiences({
    platform: platformFilter || undefined,
    type: typeFilter || undefined,
  });

  // Loading state
  if (loading) {
    return (
      <>
        <Header title="Audiences" />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="loading-spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Loading audiences...</div>
            </div>
          </div>
        </div>
        <style jsx>{`
          .loading-spinner {
            border: 3px solid var(--border-default);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <>
        <Header title="Audiences" />
        <div className="page-content">
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ marginBottom: '8px' }}>Unable to load audiences</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{error || 'Please try again later'}</p>
          </div>
        </div>
      </>
    );
  }

  const { audiences, summary } = data;

  // Filter by search query (client-side)
  const filteredAudiences = audiences.filter((aud) => {
    if (searchQuery && !aud.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {isDemo && <DemoBanner onConnect={() => router.push('/connect')} />}
      <Header title="Audiences" />
      <div className="page-content">
        {/* Summary Stats */}
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-label">Total Audiences</div>
            <div className="metric-value">{summary.total_audiences}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {summary.active} active, {summary.paused} paused
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Reach</div>
            <div className="metric-value mono">{formatSize(summary.total_size)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Google Audiences</div>
            <div className="metric-value">{summary.google_audiences}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Meta Audiences</div>
            <div className="metric-value">{summary.meta_audiences}</div>
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="select"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
              >
                <option value="">All Platforms</option>
                <option value="google">Google Ads</option>
                <option value="meta">Meta Ads</option>
              </select>
              <select
                className="select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="REMARKETING">Remarketing</option>
                <option value="CUSTOMER_LIST">Customer List</option>
                <option value="LOOKALIKE">Lookalike</option>
                <option value="ENGAGEMENT">Engagement</option>
              </select>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => alert('Demo: Would open Create Audience wizard')}>
              + Create Audience
            </button>
          </div>

          {/* Audiences Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {filteredAudiences.map((audience) => (
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
                          background: `${audienceTypes[audience.type]?.color || 'var(--text-tertiary)'}20`,
                          color: audienceTypes[audience.type]?.color || 'var(--text-tertiary)',
                        }}
                      >
                        {audienceTypes[audience.type]?.label || audience.type}
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

                <div style={{ display: 'flex', gap: '32px', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '11px', fontWeight: 500, opacity: 0.7, marginBottom: '2px' }}>Size</div>
                    <div className="mono" style={{ fontWeight: 500 }}>
                      {formatSize(audience.size)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '11px', fontWeight: 500, opacity: 0.7, marginBottom: '2px' }}>Campaigns</div>
                    <div className="mono" style={{ fontWeight: 500 }}>{audience.campaigns}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '11px', fontWeight: 500, opacity: 0.7, marginBottom: '2px' }}>Conversions</div>
                    <div className="mono" style={{ fontWeight: 500, color: audience.conversions > 0 ? 'var(--success)' : 'var(--text-tertiary)' }}>
                      {audience.conversions || '—'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-default)' }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => alert(`Demo: Would view ${audience.name}`)}>View</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => alert(`Demo: Would edit ${audience.name}`)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => alert('Demo: More options')}>...</button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredAudiences.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {searchQuery ? `No audiences matching "${searchQuery}"` : 'No audiences found'}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-default)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Showing {filteredAudiences.length} of {data.total} audiences</span>
            <div style={{ display: 'flex', gap: '8px', paddingRight: '70px' }}>
              <button className="btn btn-ghost btn-sm" disabled>Previous</button>
              <button className="btn btn-ghost btn-sm" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
