'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import DemoBanner from '@/components/ui/DemoBanner';
import MetricCard from '@/components/dashboard/MetricCard';
import BudgetPacing from '@/components/dashboard/BudgetPacing';
import HealthScore from '@/components/dashboard/HealthScore';
import { useDashboard } from '@/lib/hooks/useApi';
import { formatMicros, formatNumber } from '@/lib/api';

export default function HomePage() {
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

  const { metrics, metrics_change, health_score, top_campaigns, pending_recommendations, ai_savings_this_month } = data;

  // Calculate budget pacing from metrics
  const budgetSpent = metrics.spend_micros / 1_000_000;
  const estimatedBudget = budgetSpent * 1.2; // Rough estimate

  const mockHealthItems = [
    { label: 'Waste Control', score: health_score.overall },
    { label: 'Budget Util', score: health_score.budget_utilization },
    { label: 'Quality', score: health_score.quality_score },
    { label: 'Conv Rate', score: health_score.conversion_rate },
  ];

  return (
    <>
      {isDemo && <DemoBanner onConnect={() => router.push('/connect')} />}
      <Header title="Dashboard" />
      <div className="page-content">
        {/* AI Savings Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--primary-light)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>$</span>
            <div>
              <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>
                {formatMicros(ai_savings_this_month)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                saved by AI this month
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push('/recommendations')}
          >
            View details
          </button>
        </div>

        {/* Budget Pacing */}
        <BudgetPacing
          spent={budgetSpent}
          budget={estimatedBudget}
          daysElapsed={14}
          daysInMonth={31}
        />

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <MetricCard
            label="Total Spend"
            value={formatMicros(metrics.spend_micros)}
            change={`${metrics_change.spend >= 0 ? '▲' : '▼'} ${Math.abs(metrics_change.spend)}%`}
            changeDirection={metrics_change.spend >= 0 ? 'up' : 'down'}
          />
          <MetricCard
            label="Conversions"
            value={formatNumber(metrics.conversions)}
            change={`${metrics_change.conversions >= 0 ? '▲' : '▼'} ${Math.abs(metrics_change.conversions)}%`}
            changeDirection={metrics_change.conversions >= 0 ? 'up' : 'down'}
          />
          <MetricCard
            label="Avg CPA"
            value={formatMicros(metrics.cpa_micros)}
            change={`${metrics_change.cpa <= 0 ? '▼' : '▲'} ${Math.abs(metrics_change.cpa)}%`}
            changeDirection={metrics_change.cpa <= 0 ? 'down' : 'up'}
          />
          <MetricCard
            label="ROAS"
            value={`${metrics.roas}x`}
            change={`${metrics_change.roas >= 0 ? '▲' : '▼'} ${Math.abs(metrics_change.roas)}x`}
            changeDirection={metrics_change.roas >= 0 ? 'up' : 'down'}
          />
          <MetricCard
            label="Clicks"
            value={formatNumber(metrics.clicks)}
            change={`${metrics_change.ctr >= 0 ? '▲' : '▼'} ${Math.abs(metrics_change.ctr)}%`}
            changeDirection={metrics_change.ctr >= 0 ? 'up' : 'down'}
          />
          <MetricCard
            label="Impressions"
            value={formatNumber(metrics.impressions)}
            change="▲ 15.2%"
            changeDirection="up"
          />
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
          {/* Left Column - Campaigns */}
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Campaigns</h2>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (isDemo) {
                      alert('Demo: Create Campaign wizard coming soon!');
                    } else {
                      router.push('/campaigns/new');
                    }
                  }}
                >
                  + New Campaign
                </button>
              </div>

              {/* Campaigns Table */}
              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
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
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: campaign.platform === 'google' ? '#4285F4' : '#0668E1',
                            }} />
                            <span style={{ fontWeight: 500 }}>{campaign.name}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: campaign.status === 'ENABLED' ? 'var(--success)' : 'var(--text-tertiary)' }}>
                            {campaign.status === 'ENABLED' ? '● Active' : '○ Paused'}
                          </span>
                        </td>
                        <td className="right mono">{formatMicros(campaign.spend_micros)}</td>
                        <td className="right mono">{campaign.conversions}</td>
                        <td className="right mono" style={{
                          color: campaign.roas >= 4 ? 'var(--success)' : campaign.roas >= 3 ? 'var(--warning)' : 'var(--error)'
                        }}>
                          {campaign.roas}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '12px', borderTop: '1px solid var(--border-default)', textAlign: 'center' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => router.push('/campaigns')}
                  >
                    View all campaigns
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Health Score */}
            <div style={{ marginBottom: '24px' }}>
              <HealthScore overallScore={health_score.overall} items={mockHealthItems} />
            </div>

            {/* AI Recommendations Preview */}
            <div className="card" style={{ borderLeft: '3px solid var(--error)' }}>
              <div className="card-header">
                <span className="card-title">AI Recommendations</span>
                <span className="badge badge-error">{pending_recommendations} Pending</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                    Budget exhausted by 2pm daily
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    +$2,340/mo potential revenue
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  background: 'rgba(245, 158, 11, 0.05)',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                    2 wasting keywords detected
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Save $632/mo by pausing
                  </div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: '12px', width: '100%' }}
                onClick={() => router.push('/recommendations')}
              >
                View all recommendations
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
