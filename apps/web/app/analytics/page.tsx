'use client';

import Header from '@/components/layout/Header';

const mockData = {
  overview: {
    spend: 45678,
    revenue: 187450,
    roas: 4.1,
    conversions: 1234,
    cpa: 37.02,
    clicks: 28456,
    impressions: 1245000,
    ctr: 2.28,
  },
  platforms: [
    { name: 'Google Ads', spend: 32500, conversions: 890, roas: 4.5 },
    { name: 'Meta Ads', spend: 13178, conversions: 344, roas: 3.2 },
  ],
  topCampaigns: [
    { name: 'Search - Brand', spend: 12500, conversions: 156, roas: 5.2 },
    { name: 'PMax - Products', spend: 15600, conversions: 234, roas: 4.8 },
    { name: 'FB - Retargeting', spend: 4235, conversions: 89, roas: 4.1 },
  ],
};

export default function AnalyticsPage() {
  return (
    <>
      <Header title="Analytics" />
      <div className="page-content">
        {/* Date Range Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm">Today</button>
            <button className="btn btn-secondary btn-sm">7 Days</button>
            <button className="btn btn-primary btn-sm">30 Days</button>
            <button className="btn btn-secondary btn-sm">90 Days</button>
            <button className="btn btn-secondary btn-sm">Custom</button>
          </div>
          <button className="btn btn-secondary">Export Report</button>
        </div>

        {/* Overview Metrics */}
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-label">Total Spend</div>
            <div className="metric-value mono">${mockData.overview.spend.toLocaleString()}</div>
            <div className="metric-change up">+12.3% vs last period</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Revenue</div>
            <div className="metric-value mono">${mockData.overview.revenue.toLocaleString()}</div>
            <div className="metric-change up">+18.5% vs last period</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">ROAS</div>
            <div className="metric-value mono">{mockData.overview.roas}x</div>
            <div className="metric-change up">+0.3x vs last period</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Conversions</div>
            <div className="metric-value mono">{mockData.overview.conversions.toLocaleString()}</div>
            <div className="metric-change up">+22.1% vs last period</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg CPA</div>
            <div className="metric-value mono">${mockData.overview.cpa}</div>
            <div className="metric-change down">-8.2% vs last period</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">CTR</div>
            <div className="metric-value mono">{mockData.overview.ctr}%</div>
            <div className="metric-change up">+0.15% vs last period</div>
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
              {[45, 52, 48, 65, 58, 72, 68, 85, 78, 92, 88, 95, 90, 100].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: `linear-gradient(180deg, var(--primary) 0%, rgba(16, 185, 129, 0.3) 100%)`,
                    borderRadius: '4px 4px 0 0',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', paddingTop: '8px', borderTop: '1px solid var(--border-default)' }}>
              <span>Mar 1</span><span>Mar 5</span><span>Mar 10</span><span>Mar 15</span><span>Mar 20</span><span>Mar 25</span><span>Mar 30</span>
            </div>
          </div>

          {/* Platform Breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Platform Breakdown</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mockData.platforms.map((platform) => (
                <div key={platform.name} style={{ padding: '12px', background: 'var(--surface-secondary)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 500 }}>{platform.name}</span>
                    <span className="mono" style={{ fontWeight: 600 }}>${platform.spend.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>{platform.conversions} conv</span>
                    <span>{platform.roas}x ROAS</span>
                  </div>
                  <div style={{ marginTop: '8px', height: '4px', background: 'var(--border-default)', borderRadius: '2px' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(platform.spend / mockData.overview.spend) * 100}%`,
                        background: platform.name.includes('Google') ? '#4285F4' : '#0668E1',
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
            <button className="btn btn-ghost btn-sm">View All</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th className="right">Spend</th>
                <th className="right">Conversions</th>
                <th className="right">ROAS</th>
                <th className="right">Trend</th>
              </tr>
            </thead>
            <tbody>
              {mockData.topCampaigns.map((campaign) => (
                <tr key={campaign.name}>
                  <td style={{ fontWeight: 500 }}>{campaign.name}</td>
                  <td className="right mono">${campaign.spend.toLocaleString()}</td>
                  <td className="right mono">{campaign.conversions}</td>
                  <td className="right mono" style={{ color: 'var(--success)' }}>{campaign.roas}x</td>
                  <td className="right" style={{ color: 'var(--success)' }}>+12%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
