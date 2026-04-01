'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import DemoBanner from '@/components/ui/DemoBanner';
import AddKeywordsModal from '@/components/keywords/AddKeywordsModal';
import KeywordCard from '@/components/keywords/KeywordCard';
import { useKeywords, useCampaigns } from '@/lib/hooks/useApi';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { formatMicros, formatNumber } from '@/lib/api';

// Toast component
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
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
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {message}
    </div>
  );
}

export default function KeywordsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const { data, loading, error, isDemo, refetch } = useKeywords({
    status: statusFilter || undefined,
  });

  const { data: campaignsData } = useCampaigns({});

  // Loading state
  if (loading) {
    return (
      <>
        <Header title="Keywords" />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="loading-spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Loading keywords...</div>
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
        <Header title="Keywords" />
        <div className="page-content">
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ marginBottom: '8px' }}>Unable to load keywords</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{error || 'Please try again later'}</p>
          </div>
        </div>
      </>
    );
  }

  const { keywords, summary } = data;

  // Filter by search query (client-side since API doesn't support text search)
  const filteredKeywords = keywords.filter((kw) => {
    if (searchQuery && !kw.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(filteredKeywords.map((k) => k.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkAction = (action: 'pause' | 'enable') => {
    showToast(`Would ${action} ${selectedIds.size} keywords`);
    setSelectedIds(new Set());
  };

  const handleAddKeywords = async (formData: {
    campaignId: string;
    adGroupId: string;
    keywords: string[];
    matchType: 'BROAD' | 'PHRASE' | 'EXACT';
    maxCpc?: number;
  }) => {
    // In demo mode, simulate adding keywords
    const campaign = campaignsData?.campaigns.find(c => c.id === formData.campaignId);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Show success message
    setSuccessMessage(
      `Successfully added ${formData.keywords.length} keywords to "${campaign?.name || 'campaign'}" as [${formData.matchType}] match`
    );

    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(''), 5000);

    // Refetch keywords (in real mode this would show the new keywords)
    refetch();
  };

  // Get campaigns for the modal
  const campaigns = campaignsData?.campaigns
    .filter(c => c.platform === 'google') // Keywords are Google-only for now
    .map(c => ({ id: c.id, name: c.name })) || [];

  return (
    <>
      {isDemo && <DemoBanner onConnect={() => router.push('/connect')} />}
      <Header title="Keywords" />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
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
            <div className="metric-label">Total Keywords</div>
            <div className="metric-value">{summary.total_keywords}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {summary.enabled} active, {summary.paused} paused
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Spend (30d)</div>
            <div className="metric-value mono">{formatMicros(summary.total_spend_micros)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg Quality Score</div>
            <div className="metric-value">{summary.avg_quality_score}/10</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Wasting Keywords</div>
            <div className="metric-value" style={{ color: summary.wasting_keywords > 0 ? 'var(--error)' : 'var(--success)' }}>
              {summary.wasting_keywords}
            </div>
            {summary.wasting_keywords > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {formatMicros(summary.wasting_spend_micros)} spent, 0 conversions
              </div>
            )}
          </div>
        </div>

        {/* Wasting Keywords Alert */}
        {summary.wasting_keywords > 0 && (
          <div className="wasting-alert">
            <div className="wasting-content">
              <div className="wasting-info">
                <div style={{ fontWeight: 600, color: 'var(--error)', marginBottom: '4px' }}>
                  ⚠️ {summary.wasting_keywords} Wasting Keywords Detected
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {formatMicros(summary.wasting_spend_micros)} spent with 0 conversions in the last 30 days
                </div>
              </div>
              <div className="wasting-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setStatusFilter('PAUSED')}>
                  Show Paused
                </button>
                <button
                  className="btn btn-sm wasting-pause-btn"
                  onClick={() => showToast('Would pause wasting keywords')}
                >
                  Pause All Wasting
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="keywords-toolbar">
            <div className="keywords-filters">
              <input
                type="text"
                className="input keywords-search"
                placeholder="Search keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="ENABLED">Active</option>
                <option value="PAUSED">Paused</option>
              </select>
            </div>
            <div className="keywords-actions">
              {selectedIds.size > 0 && (
                <>
                  <span className="hide-mobile" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {selectedIds.size} selected
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleBulkAction('pause')}>
                    Pause
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleBulkAction('enable')}>
                    Enable
                  </button>
                  <div className="hide-mobile" style={{ width: '1px', height: '20px', background: 'var(--border-default)' }} />
                </>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                + Add
              </button>
            </div>
          </div>

          {/* Mobile: Card View */}
          {isMobile ? (
            <div className="keyword-cards-container">
              {filteredKeywords.map((kw) => (
                <KeywordCard
                  key={kw.id}
                  keyword={kw}
                  selected={selectedIds.has(kw.id)}
                  onSelect={handleSelect}
                  onAction={(id, action) => showToast(`Would ${action} keyword`)}
                />
              ))}
            </div>
          ) : (
            /* Desktop: Table View */
            <div className="keywords-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredKeywords.length && filteredKeywords.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th>Keyword</th>
                    <th>Match</th>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th className="right">Impr</th>
                    <th className="right">Clicks</th>
                    <th className="right">Conv</th>
                    <th className="right">Spend</th>
                    <th className="right">CPA</th>
                    <th className="center">QS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.map((kw) => (
                    <tr
                      key={kw.id}
                      style={{
                        background: kw.conversions === 0 && kw.spend_micros > 200_000000 ? 'rgba(239, 68, 68, 0.05)' : undefined,
                      }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(kw.id)}
                          onChange={(e) => handleSelect(kw.id, e.target.checked)}
                        />
                      </td>
                      <td className="mono" style={{ fontSize: '12px' }}>{kw.text}</td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{kw.match_type}</span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{kw.campaign}</td>
                      <td>
                        <span style={{ color: kw.status === 'ENABLED' ? 'var(--success)' : 'var(--text-tertiary)' }}>
                          {kw.status === 'ENABLED' ? '● Active' : '○ Paused'}
                        </span>
                      </td>
                      <td className="right mono">{formatNumber(kw.impressions)}</td>
                      <td className="right mono">{formatNumber(kw.clicks)}</td>
                      <td
                        className="right mono"
                        style={{ color: kw.conversions === 0 ? 'var(--error)' : undefined }}
                      >
                        {kw.conversions || '—'}
                      </td>
                      <td className="right mono">{formatMicros(kw.spend_micros)}</td>
                      <td className="right mono">{kw.cpa_micros > 0 ? formatMicros(kw.cpa_micros) : '—'}</td>
                      <td className="center">
                        <span
                          style={{
                            color: kw.quality_score >= 7 ? 'var(--success)' : kw.quality_score >= 5 ? 'var(--warning)' : 'var(--error)',
                            fontWeight: 600,
                          }}
                        >
                          {kw.quality_score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {filteredKeywords.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {searchQuery ? `No keywords matching "${searchQuery}"` : 'No keywords found'}
            </div>
          )}

          {/* Footer */}
          <div className="keywords-footer">
            <span>Showing {filteredKeywords.length} of {data.total} keywords</span>
            <div className="keywords-pagination">
              <button className="btn btn-ghost btn-sm" disabled>Prev</button>
              <button className="btn btn-ghost btn-sm" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Keywords Modal */}
      <AddKeywordsModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddKeywords}
        campaigns={campaigns}
        isDemo={isDemo}
      />

      <style jsx>{`
        .wasting-alert {
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-left: 4px solid var(--error);
          border-radius: 8px;
        }

        .wasting-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .wasting-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .wasting-pause-btn {
          background: var(--error);
          color: white;
        }

        .keywords-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .keywords-filters {
          display: flex;
          gap: 12px;
          flex: 1;
        }

        .keywords-search {
          width: 250px;
        }

        .keywords-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .keywords-table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .keywords-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-default);
          font-size: 13px;
          color: var(--text-secondary);
        }

        .keywords-pagination {
          display: flex;
          gap: 8px;
        }

        @media (max-width: 767px) {
          .wasting-alert {
            margin-bottom: 16px;
            padding: 12px;
          }

          .wasting-content {
            flex-direction: column;
            align-items: stretch;
          }

          .wasting-actions {
            margin-top: 12px;
          }

          .wasting-actions .btn {
            flex: 1;
          }

          .keywords-toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .keywords-filters {
            width: 100%;
            gap: 8px;
          }

          .keywords-search {
            flex: 1;
            min-width: 0;
          }

          .keywords-filters .select {
            width: auto;
            flex-shrink: 0;
          }

          .keywords-actions {
            width: 100%;
            justify-content: space-between;
          }

          .keywords-table-wrapper {
            margin: 0 -12px;
            padding: 0 12px;
          }

          .keywords-table-wrapper table {
            min-width: 700px;
          }

          .keywords-footer {
            flex-direction: column;
            gap: 12px;
            align-items: center;
          }

          .keywords-pagination {
            width: 100%;
            justify-content: center;
          }

          .hide-mobile {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
