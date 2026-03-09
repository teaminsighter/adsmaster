'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import DemoBanner from '@/components/ui/DemoBanner';
import { useCampaigns } from '@/lib/hooks/useApi';
import { formatMicros, formatNumber } from '@/lib/api';

export default function CampaignsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, loading, error, isDemo, refetch } = useCampaigns({
    status: statusFilter || undefined,
    platform: platformFilter || undefined,
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
    if (selected && data?.campaigns) {
      setSelectedIds(new Set(data.campaigns.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkAction = async (action: 'pause' | 'enable') => {
    alert(`Demo: Would ${action} ${selectedIds.size} campaigns`);
    setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <>
        <Header title="Campaigns" />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="loading-spinner" style={{ marginBottom: '16px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Loading campaigns...</div>
            </div>
          </div>
        </div>
        <style jsx>{`
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-default);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header title="Campaigns" />
        <div className="page-content">
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>!</div>
            <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>Unable to load campaigns</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</div>
            <button className="btn btn-primary" onClick={() => refetch()}>Retry</button>
          </div>
        </div>
      </>
    );
  }

  const campaigns = data.campaigns;

  // Calculate summary stats
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend_micros, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const enabledCount = campaigns.filter((c) => c.status === 'ENABLED').length;
  const avgRoas = campaigns.length > 0
    ? (campaigns.reduce((sum, c) => sum + c.roas, 0) / campaigns.length).toFixed(1)
    : '0';

  return (
    <>
      {isDemo && <DemoBanner onConnect={() => router.push('/connect')} />}
      <Header title="Campaigns" />
      <div className="page-content">
        {/* Summary Stats */}
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-label">Total Campaigns</div>
            <div className="metric-value">{data.total}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {enabledCount} active
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Spend (30d)</div>
            <div className="metric-value mono">{formatMicros(totalSpend)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Conversions</div>
            <div className="metric-value mono">{formatNumber(totalConversions)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg ROAS</div>
            <div className="metric-value mono">{avgRoas}x</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="ENABLED">Active</option>
                <option value="PAUSED">Paused</option>
              </select>
              <select
                className="select"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
              >
                <option value="">All Platforms</option>
                <option value="google">Google Ads</option>
                <option value="meta">Meta Ads</option>
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
              <button className="btn btn-primary btn-sm" onClick={() => router.push('/campaigns/new')}>
                + Create Campaign
              </button>
            </div>
          </div>

          {/* Campaigns Table */}
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === campaigns.length && campaigns.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Campaign</th>
                <th>Platform</th>
                <th>Type</th>
                <th>Status</th>
                <th className="right">Budget</th>
                <th className="right">Spend</th>
                <th className="right">Impr</th>
                <th className="right">Clicks</th>
                <th className="right">Conv</th>
                <th className="right">ROAS</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    // Don't navigate if clicking checkbox or action button
                    if ((e.target as HTMLElement).closest('input, button')) return;
                    router.push(`/campaigns/${campaign.id}`);
                  }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(campaign.id)}
                      onChange={(e) => handleSelect(campaign.id, e.target.checked)}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{campaign.name}</div>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: campaign.platform === 'google' ? '#4285F4' : '#0668E1',
                        }}
                      />
                      {campaign.platform === 'google' ? 'Google' : 'Meta'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                      {campaign.type}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: campaign.status === 'ENABLED' ? 'var(--success)' : 'var(--text-tertiary)' }}>
                      {campaign.status === 'ENABLED' ? '● Active' : '○ Paused'}
                    </span>
                  </td>
                  <td className="right mono">{formatMicros(campaign.budget_micros)}/day</td>
                  <td className="right mono">{formatMicros(campaign.spend_micros)}</td>
                  <td className="right mono">{formatNumber(campaign.impressions)}</td>
                  <td className="right mono">{formatNumber(campaign.clicks)}</td>
                  <td className="right mono" style={{ color: campaign.conversions > 0 ? undefined : 'var(--text-tertiary)' }}>
                    {campaign.conversions || '—'}
                  </td>
                  <td
                    className="right mono"
                    style={{
                      color: campaign.roas >= 4 ? 'var(--success)' : campaign.roas >= 3 ? 'var(--warning)' : 'var(--error)',
                      fontWeight: 600,
                    }}
                  >
                    {campaign.roas}x
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        const action = campaign.status === 'ENABLED' ? 'pause' : 'enable';
                        alert(`Demo: Would ${action} "${campaign.name}"`);
                      }}
                    >
                      ...
                    </button>
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
            <span>Showing {campaigns.length} of {data.total} campaigns</span>
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
