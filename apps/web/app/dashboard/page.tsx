'use client';

import Header from '@/components/layout/Header';
import { formatMicros, formatNumber } from '@/lib/api';

const mockMetrics = {
  spend: 45678_000000,
  revenue: 187450_000000,
  roas: 4.1,
  conversions: 1234,
  cpa: 37_020000,
  impressions: 1245000,
  clicks: 28456,
  ctr: 2.28,
};

const mockCampaigns = [
  { id: '1', name: 'Search - Brand', platform: 'google', status: 'ENABLED', spend: 12500_000000, conversions: 156, roas: 5.2 },
  { id: '2', name: 'PMax - Products', platform: 'google', status: 'ENABLED', spend: 15600_000000, conversions: 234, roas: 4.8 },
  { id: '3', name: 'Display - Remarketing', platform: 'google', status: 'ENABLED', spend: 4400_000000, conversions: 67, roas: 3.9 },
  { id: '4', name: 'FB - Retargeting', platform: 'meta', status: 'ENABLED', spend: 8235_000000, conversions: 89, roas: 4.1 },
  { id: '5', name: 'IG - Prospecting', platform: 'meta', status: 'PAUSED', spend: 4943_000000, conversions: 45, roas: 2.8 },
];

const mockRecommendations = [
  { id: '1', severity: 'critical', title: 'Budget exhausted by 2pm daily', campaign: 'Search - Brand', impact: '+$2,340/mo potential' },
  { id: '2', severity: 'warning', title: 'Low Quality Score keywords', campaign: 'Search - Non-Brand', impact: '3 keywords QS < 5' },
  { id: '3', severity: 'opportunity', title: 'Add negative keywords', campaign: 'PMax - Products', impact: 'Save $450/mo' },
];

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <div className="page-content">
        {/* Metrics Grid */}
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-label">Total Spend (30d)</div>
            <div className="metric-value mono">{formatMicros(mockMetrics.spend)}</div>
            <div className="metric-change up">+12.3% vs last period</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Revenue</div>
            <div className="metric-value mono">{formatMicros(mockMetrics.revenue)}</div>
            <div className="metric-change up">+18.5% vs last period</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">ROAS</div>
            <div className="metric-value mono">{mockMetrics.roas}x</div>
            <div className="metric-change up">+0.3x vs last period</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Conversions</div>
            <div className="metric-value mono">{formatNumber(mockMetrics.conversions)}</div>
            <div className="metric-change up">+22.1% vs last period</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg CPA</div>
            <div className="metric-value mono">{formatMicros(mockMetrics.cpa)}</div>
            <div className="metric-change down">-8.2% (better)</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">CTR</div>
            <div className="metric-value mono">{mockMetrics.ctr}%</div>
            <div className="metric-change up">+0.15% vs last period</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Campaigns Table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Top Campaigns</span>
              <a href="/campaigns" className="btn btn-ghost btn-sm">View All</a>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Platform</th>
                  <th className="right">Spend</th>
                  <th className="right">Conv</th>
                  <th className="right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {mockCampaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <a href={`/campaigns/${c.id}`} style={{ fontWeight: 500 }}>{c.name}</a>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--text-secondary)'
                      }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: c.platform === 'google' ? '#4285F4' : '#0668E1'
                        }} />
                        {c.platform === 'google' ? 'Google' : 'Meta'}
                      </span>
                    </td>
                    <td className="right mono">{formatMicros(c.spend)}</td>
                    <td className="right mono">{c.conversions}</td>
                    <td className="right mono" style={{ color: c.roas >= 4 ? 'var(--success)' : c.roas >= 3 ? 'var(--warning)' : 'var(--error)' }}>
                      {c.roas}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Recommendations */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">AI Recommendations</span>
              <a href="/recommendations" className="btn btn-ghost btn-sm">View All</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mockRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${
                      rec.severity === 'critical' ? 'var(--error)' :
                      rec.severity === 'warning' ? 'var(--warning)' : 'var(--info)'
                    }`,
                    background: 'var(--surface-secondary)',
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: '13px', marginBottom: '4px' }}>{rec.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{rec.campaign}</div>
                  <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 500 }}>{rec.impact}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Account Health */}
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <span className="card-title">Account Health</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--success)' }}>82%</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Overall Score</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--success)' }}>94%</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Budget Utilization</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--warning)' }}>61%</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Quality Score</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--success)' }}>88%</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Conversion Rate</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
