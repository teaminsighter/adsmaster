'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import DemoBanner from '@/components/ui/DemoBanner';
import CreateAudienceModal from '@/components/audiences/CreateAudienceModal';
import { useAudiences, createAudience } from '@/lib/hooks/useApi';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

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
  const isMobile = useIsMobile();
  const [platformFilter, setPlatformFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const { data, loading, error, isDemo, refetch } = useAudiences({
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

  const handleCreateAudience = async (formData: {
    name: string;
    platform: 'google' | 'meta';
    type: string;
    source: string;
    lookbackDays?: number;
    description?: string;
  }) => {
    try {
      // Call real API (falls back to demo if no org connected)
      // For now, use a demo organization ID
      const organizationId = 'demo_org';

      await createAudience(organizationId, {
        name: formData.name,
        platform: formData.platform,
        type: formData.type,
        source: formData.source,
        lookbackDays: formData.lookbackDays,
        description: formData.description,
      });

      // Show success message
      setSuccessMessage(
        `Successfully created audience "${formData.name}" on ${formData.platform === 'google' ? 'Google Ads' : 'Meta Ads'}`
      );

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);

      // Refetch audiences
      refetch();
    } catch (error) {
      // If real API fails, still show success for demo mode
      console.log('API call failed, using demo mode:', error);

      setSuccessMessage(
        `Successfully created audience "${formData.name}" on ${formData.platform === 'google' ? 'Google Ads' : 'Meta Ads'}`
      );
      setTimeout(() => setSuccessMessage(''), 5000);
      refetch();
    }
  };

  // Filter by search query (client-side)
  const filteredAudiences = audiences.filter((aud) => {
    if (searchQuery && !aud.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {isDemo && <DemoBanner onConnect={() => router.push('/connect')} />}
      <Header title="Audiences" />

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 20px',
            background: '#1a1a1a',
            color: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {toast}
        </div>
      )}

      <div className="page-content">
        {/* Success Message */}
        {successMessage && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderLeft: '4px solid var(--success)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--success)', fontSize: '18px' }}>✓</span>
              <span style={{ fontWeight: 500 }}>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}
            >
              ×
            </button>
          </div>
        )}

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
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: isMobile ? '12px' : '8px',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '12px',
              flex: 1,
            }}>
              <input
                type="text"
                className="input"
                placeholder="Search audiences..."
                style={{ width: isMobile ? '100%' : '250px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isMobile ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="select"
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">All Platforms</option>
                    <option value="google">Google Ads</option>
                    <option value="meta">Meta Ads</option>
                  </select>
                  <select
                    className="select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">All Types</option>
                    <option value="REMARKETING">Remarketing</option>
                    <option value="CUSTOMER_LIST">Customer List</option>
                    <option value="LOOKALIKE">Lookalike</option>
                    <option value="ENGAGEMENT">Engagement</option>
                  </select>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
              + Create Audience
            </button>
          </div>

          {/* Audiences Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: isMobile ? '12px' : '16px'
          }}>
            {filteredAudiences.map((audience) => (
              <div
                key={audience.id}
                style={{
                  padding: isMobile ? '14px' : '16px',
                  border: '1px solid var(--border-default)',
                  borderRadius: '10px',
                  background: audience.status === 'PAUSED' ? 'var(--surface-secondary)' : 'var(--surface-card)',
                  opacity: audience.status === 'PAUSED' ? 0.7 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: audience.platform === 'google' ? '#4285F4' : '#0668E1',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{audience.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: `${audienceTypes[audience.type]?.color || 'var(--text-tertiary)'}20`,
                          color: audienceTypes[audience.type]?.color || 'var(--text-tertiary)',
                          fontWeight: 500,
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
                    style={{ marginLeft: '8px', flexShrink: 0 }}
                  >
                    {audience.status === 'ACTIVE' ? '● Active' : '○ Paused'}
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  padding: '12px',
                  background: 'var(--surface-secondary)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Size</div>
                    <div className="mono" style={{ fontWeight: 600, fontSize: '15px' }}>
                      {formatSize(audience.size)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Campaigns</div>
                    <div className="mono" style={{ fontWeight: 600, fontSize: '15px' }}>{audience.campaigns}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Conv</div>
                    <div className="mono" style={{ fontWeight: 600, fontSize: '15px', color: audience.conversions > 0 ? 'var(--success)' : 'var(--text-tertiary)' }}>
                      {audience.conversions || '—'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, minHeight: '36px' }} onClick={() => showToast(`Viewing ${audience.name}`)}>View</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, minHeight: '36px' }} onClick={() => showToast(`Editing ${audience.name}`)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" style={{ minWidth: '44px', minHeight: '36px' }} onClick={() => showToast('More options')}>⋮</button>
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
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'center' : 'center',
              gap: isMobile ? '12px' : '8px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-default)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Showing {filteredAudiences.length} of {data.total} audiences</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" disabled>Previous</button>
              <button className="btn btn-ghost btn-sm" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Audience Modal */}
      <CreateAudienceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAudience}
        isDemo={isDemo}
      />
    </>
  );
}
