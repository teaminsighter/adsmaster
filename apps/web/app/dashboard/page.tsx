'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import DemoBanner from '@/components/ui/DemoBanner';
import { useDashboard } from '@/lib/hooks/useApi';
import { formatMicros, formatNumber } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { data, loading, error, isDemo } = useDashboard();

  if (loading) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="loading-spinner" style={{ marginBottom: '16px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="page-content">
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>!</div>
            <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>Unable to load dashboard</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error || 'Unknown error'}</div>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  const { metrics, metrics_change, health_score, platform_breakdown, chart_data, top_campaigns, pending_recommendations, ai_savings_this_month } = data;

  return (
    <>
      {isDemo && <DemoBanner onConnect={() => router.push('/connect')} />}
      <Header title="Dashboard" />
      <div className="page-content">
        {/* AI Savings Banner */}
        {ai_savings_this_month > 0 && (
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
              border: '1px solid var(--success)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>$</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                  {formatMicros(ai_savings_this_month)} saved this month by AI
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  From {pending_recommendations} applied recommendations
                </div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/recommendations')}>
              View All Recommendations
            </button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-label">Total Spend (30d)</div>
            <div className="metric-value mono">{formatMicros(metrics.spend_micros)}</div>
            <div className={`metric-change ${metrics_change.spend >= 0 ? 'up' : 'down'}`}>
              {metrics_change.spend >= 0 ? '+' : ''}{metrics_change.spend}% vs last period
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Revenue</div>
            <div className="metric-value mono">{formatMicros(metrics.revenue_micros)}</div>
            <div className={`metric-change ${metrics_change.revenue >= 0 ? 'up' : 'down'}`}>
              {metrics_change.revenue >= 0 ? '+' : ''}{metrics_change.revenue}% vs last period
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">ROAS</div>
            <div className="metric-value mono">{metrics.roas}x</div>
            <div className={`metric-change ${metrics_change.roas >= 0 ? 'up' : 'down'}`}>
              {metrics_change.roas >= 0 ? '+' : ''}{metrics_change.roas}x vs last period
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Conversions</div>
            <div className="metric-value mono">{formatNumber(metrics.conversions)}</div>
            <div className={`metric-change ${metrics_change.conversions >= 0 ? 'up' : 'down'}`}>
              {metrics_change.conversions >= 0 ? '+' : ''}{metrics_change.conversions}% vs last period
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg CPA</div>
            <div className="metric-value mono">{formatMicros(metrics.cpa_micros)}</div>
            <div className={`metric-change ${metrics_change.cpa <= 0 ? 'down' : 'up'}`}>
              {metrics_change.cpa}% (better)
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">CTR</div>
            <div className="metric-value mono">{metrics.ctr}%</div>
            <div className={`metric-change ${metrics_change.ctr >= 0 ? 'up' : 'down'}`}>
              {metrics_change.ctr >= 0 ? '+' : ''}{metrics_change.ctr}% vs last period
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Performance Chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Performance Trend (14 Days)</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost btn-sm" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  Spend
                </button>
                <button className="btn btn-ghost btn-sm">Conversions</button>
              </div>
            </div>
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px', padding: '16px 0' }}>
              {chart_data.map((day, i) => {
                const maxSpend = Math.max(...chart_data.map(d => d.spend));
                const height = maxSpend > 0 ? (day.spend / maxSpend) * 100 : 0;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${height}%`,
                      background: 'linear-gradient(180deg, var(--primary) 0%, rgba(16, 185, 129, 0.3) 100%)',
                      borderRadius: '4px 4px 0 0',
                      minHeight: '4px',
                    }}
                    title={`${day.date}: ${formatMicros(day.spend * 1000000)}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Health Score */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Account Health</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: health_score.overall >= 80 ? 'var(--success)' : health_score.overall >= 60 ? 'var(--warning)' : 'var(--error)' }}>
                  {health_score.overall}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Overall</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: health_score.budget_utilization >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                  {health_score.budget_utilization}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Budget</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: health_score.quality_score >= 70 ? 'var(--success)' : health_score.quality_score >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                  {health_score.quality_score}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Quality</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: health_score.conversion_rate >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                  {health_score.conversion_rate}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Conv Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Breakdown + AI Recommendations */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
          {/* Platform Breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Platform Breakdown</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {platform_breakdown.map((platform) => (
                <div
                  key={platform.platform}
                  style={{
                    padding: '12px',
                    background: 'var(--surface-secondary)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: platform.platform === 'google' ? '#4285F4' : '#0668E1',
                        }}
                      />
                      <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{platform.platform}</span>
                    </div>
                    <span className="mono" style={{ fontWeight: 600 }}>{formatMicros(platform.spend_micros)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>{platform.conversions} conversions</span>
                    <span>{platform.roas}x ROAS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Recommendations */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">AI Recommendations</span>
              <button className="btn btn-ghost btn-sm" onClick={() => router.push('/recommendations')}>
                View All ({pending_recommendations})
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '48px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
                {pending_recommendations}
              </div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                pending recommendations
              </div>
              <button className="btn btn-primary" onClick={() => router.push('/recommendations')}>
                Review Now
              </button>
            </div>
          </div>
        </div>

        {/* Top Campaigns Table */}
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <span className="card-title">Top Campaigns</span>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/campaigns')}>
              View All
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Platform</th>
                <th>Status</th>
                <th className="right">Spend</th>
                <th className="right">Conv</th>
                <th className="right">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {top_campaigns.slice(0, 5).map((campaign) => (
                <tr
                  key={campaign.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/campaigns/${campaign.id}`)}
                >
                  <td style={{ fontWeight: 500 }}>{campaign.name}</td>
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
                    <span style={{ color: campaign.status === 'ENABLED' ? 'var(--success)' : 'var(--text-tertiary)' }}>
                      {campaign.status === 'ENABLED' ? '●' : '○'}
                    </span>
                  </td>
                  <td className="right mono">{formatMicros(campaign.spend_micros)}</td>
                  <td className="right mono">{campaign.conversions}</td>
                  <td
                    className="right mono"
                    style={{
                      color: campaign.roas >= 4 ? 'var(--success)' : campaign.roas >= 3 ? 'var(--warning)' : 'var(--error)',
                    }}
                  >
                    {campaign.roas}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
