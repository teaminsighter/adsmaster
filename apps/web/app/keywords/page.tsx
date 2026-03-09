'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import DemoBanner from '@/components/ui/DemoBanner';
import { useKeywords } from '@/lib/hooks/useApi';
import { formatMicros, formatNumber } from '@/lib/api';

export default function KeywordsPage() {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, loading, error, isDemo } = useKeywords({
    status: statusFilter || undefined,
  });

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
    alert(`Demo: Would ${action} ${selectedIds.size} keywords`);
    setSelectedIds(new Set());
  };

  return (
    <>
      {isDemo && <DemoBanner onConnect={() => router.push('/connect')} />}
      <Header title="Keywords" />
      <div className="page-content">
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
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderLeft: '4px solid var(--error)',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--error)', marginBottom: '4px' }}>
                  ⚠️ {summary.wasting_keywords} Wasting Keywords Detected
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {formatMicros(summary.wasting_spend_micros)} spent with 0 conversions in the last 30 days
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setStatusFilter('PAUSED')}>
                  Show Paused
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--error)', color: 'white' }}
                  onClick={() => alert('Demo: Would pause wasting keywords')}
                >
                  Pause All Wasting
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="input"
                placeholder="Search keywords..."
                style={{ width: '250px' }}
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {selectedIds.size > 0 && (
                <>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {selectedIds.size} selected
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleBulkAction('pause')}>
                    Pause
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleBulkAction('enable')}>
                    Enable
                  </button>
                  <div style={{ width: '1px', height: '20px', background: 'var(--border-default)' }} />
                </>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => alert('Demo: Would open add keywords modal')}>
                + Add Keywords
              </button>
            </div>
          </div>

          {/* Keywords Table */}
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

          {/* Empty State */}
          {filteredKeywords.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {searchQuery ? `No keywords matching "${searchQuery}"` : 'No keywords found'}
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
            <span>Showing {filteredKeywords.length} of {data.total} keywords</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" disabled>Previous</button>
              <button className="btn btn-ghost btn-sm" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
