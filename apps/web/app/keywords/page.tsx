'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { formatMicros, formatNumber } from '@/lib/api';

const mockKeywords = [
  { id: '1', text: 'acme products', matchType: 'EXACT', status: 'ENABLED', campaign: 'Search - Brand', impressions: 45000, clicks: 1234, conversions: 45, spend: 1234_000000, cpa: 27_420000, qs: 10 },
  { id: '2', text: 'buy acme online', matchType: 'PHRASE', status: 'ENABLED', campaign: 'Search - Brand', impressions: 32000, clicks: 987, conversions: 38, spend: 1108_000000, cpa: 29_180000, qs: 9 },
  { id: '3', text: 'acme store near me', matchType: 'BROAD', status: 'ENABLED', campaign: 'Search - Brand', impressions: 28000, clicks: 654, conversions: 28, spend: 875_000000, cpa: 31_250000, qs: 8 },
  { id: '4', text: 'cheap alternative to acme', matchType: 'BROAD', status: 'ENABLED', campaign: 'Search - Non-Brand', impressions: 18765, clicks: 534, conversions: 12, spend: 756_000000, cpa: 63_000000, qs: 6 },
  { id: '5', text: 'acme discount code', matchType: 'EXACT', status: 'ENABLED', campaign: 'Search - Brand', impressions: 12000, clicks: 456, conversions: 23, spend: 523_000000, cpa: 22_739130, qs: 9 },
  { id: '6', text: 'free shipping products', matchType: 'BROAD', status: 'PAUSED', campaign: 'Search - Non-Brand', impressions: 8765, clicks: 234, conversions: 0, spend: 345_000000, cpa: 0, qs: 3 },
  { id: '7', text: 'cheap widgets online', matchType: 'BROAD', status: 'PAUSED', campaign: 'Search - Non-Brand', impressions: 6543, clicks: 187, conversions: 0, spend: 287_000000, cpa: 0, qs: 4 },
];

export default function KeywordsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredKeywords = mockKeywords.filter((kw) => {
    if (statusFilter !== 'all' && kw.status !== statusFilter) return false;
    if (searchQuery && !kw.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: mockKeywords.length,
    enabled: mockKeywords.filter((k) => k.status === 'ENABLED').length,
    paused: mockKeywords.filter((k) => k.status === 'PAUSED').length,
    totalSpend: mockKeywords.reduce((sum, k) => sum + k.spend, 0),
    avgQS: (mockKeywords.reduce((sum, k) => sum + k.qs, 0) / mockKeywords.length).toFixed(1),
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <>
      <Header title="Keywords" />
      <div className="page-content">
        {/* Summary Stats */}
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-label">Total Keywords</div>
            <div className="metric-value">{stats.total}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {stats.enabled} active, {stats.paused} paused
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Spend (30d)</div>
            <div className="metric-value mono">{formatMicros(stats.totalSpend)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg Quality Score</div>
            <div className="metric-value">{stats.avgQS}/10</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Wasting Keywords</div>
            <div className="metric-value" style={{ color: 'var(--error)' }}>2</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              $632 spent, 0 conversions
            </div>
          </div>
        </div>

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
                <option value="all">All Status</option>
                <option value="ENABLED">Active</option>
                <option value="PAUSED">Paused</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {selectedIds.size > 0 && (
                <>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                    {selectedIds.size} selected
                  </span>
                  <button className="btn btn-secondary btn-sm">Pause</button>
                  <button className="btn btn-secondary btn-sm">Enable</button>
                </>
              )}
              <button className="btn btn-primary btn-sm">+ Add Keywords</button>
            </div>
          </div>

          {/* Keywords Table */}
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filteredKeywords.map((k) => k.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
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
                    background: kw.conversions === 0 && kw.spend > 200_000000 ? 'rgba(239, 68, 68, 0.05)' : undefined,
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
                    <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{kw.matchType}</span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{kw.campaign}</td>
                  <td>
                    <span style={{ color: kw.status === 'ENABLED' ? 'var(--success)' : 'var(--text-tertiary)' }}>
                      {kw.status === 'ENABLED' ? '●' : '○'}
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
                  <td className="right mono">{formatMicros(kw.spend)}</td>
                  <td className="right mono">{kw.cpa > 0 ? formatMicros(kw.cpa) : '—'}</td>
                  <td className="center">
                    <span
                      style={{
                        color: kw.qs >= 7 ? 'var(--success)' : kw.qs >= 5 ? 'var(--warning)' : 'var(--error)',
                        fontWeight: 600,
                      }}
                    >
                      {kw.qs}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
            <span>Showing {filteredKeywords.length} of {mockKeywords.length} keywords</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" disabled>Previous</button>
              <button className="btn btn-ghost btn-sm">Next</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
