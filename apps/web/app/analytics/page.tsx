'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import DemoBanner from '@/components/ui/DemoBanner';
import { useAnalytics } from '@/lib/hooks/useApi';

// Helper to format micros to dollars
const formatMoney = (micros: number) => {
  return (micros / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState('30d');
  const { data, loading, error, isDemo } = useAnalytics(period);

  // Loading state
  if (loading) {
    return (
      <>
        <Header title="Analytics" />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="loading-spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Loading analytics...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <>
        <Header title="Analytics" />
        <div className="page-content">
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ marginBottom: '8px' }}>Unable to load analytics</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{error || 'Please try again later'}</p>
          </div>
        </div>
      </>
    );
  }

  const { overview, changes, platform_breakdown, top_campaigns, trend_data } = data;

  // Calculate chart heights from trend data
  const maxSpend = Math.max(...trend_data.map(d => d.spend_micros));
  const chartHeights = trend_data.map(d => Math.round((d.spend_micros / maxSpend) * 100));

  // Get chart date labels (every few days)
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const labelIndices = [0, Math.floor(trend_data.length / 4), Math.floor(trend_data.length / 2), Math.floor(trend_data.length * 3 / 4), trend_data.length - 1];

  return (
    <>
      {isDemo && <DemoBanner onConnect={() => router.push('/connect')} />}
      <Header title="Analytics" />
      <div className="page-content">
        {/* Export Report Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <button className="btn btn-secondary">Export Report</button>
        </div>

        {/* Overview Metrics */}
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-label">Total Spend</div>
            <div className="metric-value mono">${formatMoney(overview.spend_micros)}</div>
            <div className={`metric-change ${changes.spend >= 0 ? 'up' : 'down'}`}>
              {changes.spend >= 0 ? '+' : ''}{changes.spend}% vs last period
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Revenue</div>
            <div className="metric-value mono">${formatMoney(overview.revenue_micros)}</div>
            <div className={`metric-change ${changes.revenue >= 0 ? 'up' : 'down'}`}>
              {changes.revenue >= 0 ? '+' : ''}{changes.revenue}% vs last period
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">ROAS</div>
            <div className="metric-value mono">{overview.roas}x</div>
            <div className={`metric-change ${changes.roas >= 0 ? 'up' : 'down'}`}>
              {changes.roas >= 0 ? '+' : ''}{changes.roas}x vs last period
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Conversions</div>
            <div className="metric-value mono">{overview.conversions.toLocaleString()}</div>
            <div className={`metric-change ${changes.conversions >= 0 ? 'up' : 'down'}`}>
              {changes.conversions >= 0 ? '+' : ''}{changes.conversions}% vs last period
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg CPA</div>
            <div className="metric-value mono">${formatMoney(overview.cpa_micros)}</div>
            <div className={`metric-change ${changes.cpa <= 0 ? 'down' : 'up'}`}>
              {changes.cpa}% vs last period
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">CTR</div>
            <div className="metric-value mono">{overview.ctr}%</div>
            <div className={`metric-change ${changes.ctr >= 0 ? 'up' : 'down'}`}>
              {changes.ctr >= 0 ? '+' : ''}{changes.ctr}% vs last period
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Performance Chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Performance Trend</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost btn-sm" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>Spend</button>
                <button className="btn btn-ghost btn-sm">Revenue</button>
                <button className="btn btn-ghost btn-sm">ROAS</button>
              </div>
            </div>
            <div style={{ height: '250px', display: 'flex', alignItems: 'flex-end', gap: '4px', padding: '16px 0' }}>
              {chartHeights.map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: `linear-gradient(180deg, var(--primary) 0%, rgba(16, 185, 129, 0.3) 100%)`,
                    borderRadius: '4px 4px 0 0',
                    minHeight: '4px',
                  }}
                  title={`$${formatMoney(trend_data[i].spend_micros)}`}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', paddingTop: '8px', borderTop: '1px solid var(--border-default)' }}>
              {labelIndices.map((idx) => (
                <span key={idx}>{trend_data[idx] ? getDateLabel(trend_data[idx].date) : ''}</span>
              ))}
            </div>
          </div>

          {/* Platform Breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Platform Breakdown</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {platform_breakdown.map((platform) => (
                <div key={platform.platform} style={{ padding: '12px', background: 'var(--surface-secondary)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 500 }}>
                      {platform.platform === 'google' ? 'Google Ads' : 'Meta Ads'}
                    </span>
                    <span className="mono" style={{ fontWeight: 600 }}>${formatMoney(platform.spend_micros)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>{platform.conversions} conv</span>
                    <span>{platform.roas}x ROAS</span>
                  </div>
                  <div style={{ marginTop: '8px', height: '4px', background: 'var(--border-default)', borderRadius: '2px' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(platform.spend_micros / overview.spend_micros) * 100}%`,
                        background: platform.platform === 'google' ? '#4285F4' : '#0668E1',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <span className="card-title">Top Performing Campaigns</span>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/campaigns')}>View All</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Platform</th>
                <th className="right">Spend</th>
                <th className="right">Conversions</th>
                <th className="right">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {top_campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/campaigns/${campaign.id}`)}
                >
                  <td style={{ fontWeight: 500 }}>{campaign.name}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: campaign.platform === 'google' ? 'rgba(66, 133, 244, 0.1)' : 'rgba(6, 104, 225, 0.1)',
                      color: campaign.platform === 'google' ? '#4285F4' : '#0668E1',
                    }}>
                      {campaign.platform === 'google' ? 'Google' : 'Meta'}
                    </span>
                  </td>
                  <td className="right mono">${formatMoney(campaign.spend_micros)}</td>
                  <td className="right mono">{campaign.conversions}</td>
                  <td className="right mono" style={{ color: campaign.roas >= 4 ? 'var(--success)' : campaign.roas >= 2 ? 'var(--warning)' : 'var(--error)' }}>
                    {campaign.roas}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
