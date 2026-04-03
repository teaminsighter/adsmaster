'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import DemoBanner from '@/components/ui/DemoBanner';
import AccountOverviewBar from '@/components/dashboard/AccountOverviewBar';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import PlatformComparison from '@/components/dashboard/PlatformComparison';
import AIRecommendationsSummary from '@/components/dashboard/AIRecommendationsSummary';
import QuickActionsGrid from '@/components/dashboard/QuickActionsGrid';
import BudgetPacing from '@/components/dashboard/BudgetPacing';
import SpendDistributionChart from '@/components/dashboard/SpendDistributionChart';
import ConversionFunnel from '@/components/dashboard/ConversionFunnel';
import DeviceBreakdown from '@/components/dashboard/DeviceBreakdown';
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
          <div className="loading-container">
            <div className="loading-spinner" />
            <div className="loading-text">Loading dashboard...</div>
          </div>
        </div>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 400px;
            gap: 16px;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-default);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .loading-text {
            color: var(--text-secondary);
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
          <div className="error-card">
            <div className="error-icon">!</div>
            <div className="error-title">Unable to load dashboard</div>
            <div className="error-message">{error || 'Unknown error'}</div>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
        <style jsx>{`
          .error-card {
            background: var(--surface-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            text-align: center;
            padding: 48px;
          }
          .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
            color: var(--error);
          }
          .error-title {
            font-size: 18px;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 8px;
          }
          .error-message {
            color: var(--text-secondary);
            margin-bottom: 24px;
          }
        `}</style>
      </>
    );
  }

  const { metrics, metrics_change, health_score, platform_breakdown, chart_data, top_campaigns, pending_recommendations, ai_savings_this_month } = data;

  return (
    <>
      {isDemo && <DemoBanner onConnect={() => router.push('/connect')} />}
      <Header title="Dashboard" />
      <div className="page-content dashboard">
        {/* Row 1: Account Overview Bar */}
        <AccountOverviewBar
          healthScore={health_score.overall}
          aiSavings={ai_savings_this_month}
          onSyncAll={() => console.log('Sync all accounts')}
        />

        {/* Row 2: Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Total Spend (30d)</div>
            <div className="metric-value mono">{formatMicros(metrics.spend_micros)}</div>
            <div className={`metric-change ${metrics_change.spend >= 0 ? 'up' : 'down'}`}>
              {metrics_change.spend >= 0 ? '+' : ''}{metrics_change.spend}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Revenue</div>
            <div className="metric-value mono">{formatMicros(metrics.revenue_micros)}</div>
            <div className={`metric-change ${metrics_change.revenue >= 0 ? 'up' : 'down'}`}>
              {metrics_change.revenue >= 0 ? '+' : ''}{metrics_change.revenue}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">ROAS</div>
            <div className="metric-value mono">{metrics.roas}x</div>
            <div className={`metric-change ${metrics_change.roas >= 0 ? 'up' : 'down'}`}>
              {metrics_change.roas >= 0 ? '+' : ''}{metrics_change.roas}x
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Conversions</div>
            <div className="metric-value mono">{formatNumber(metrics.conversions)}</div>
            <div className={`metric-change ${metrics_change.conversions >= 0 ? 'up' : 'down'}`}>
              {metrics_change.conversions >= 0 ? '+' : ''}{metrics_change.conversions}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg CPA</div>
            <div className="metric-value mono">{formatMicros(metrics.cpa_micros)}</div>
            <div className={`metric-change ${metrics_change.cpa <= 0 ? 'down' : 'up'}`}>
              {metrics_change.cpa}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">CTR</div>
            <div className="metric-value mono">{metrics.ctr}%</div>
            <div className={`metric-change ${metrics_change.ctr >= 0 ? 'up' : 'down'}`}>
              {metrics_change.ctr >= 0 ? '+' : ''}{metrics_change.ctr}%
            </div>
          </div>
        </div>

        {/* Row 3: Budget Pacing + Alerts */}
        <div className="row-3">
          <div className="budget-section">
            <BudgetPacing />
          </div>
          <div className="alerts-section">
            <AlertsPanel />
          </div>
        </div>

        {/* Row 4: Performance Chart + Platform Comparison */}
        <div className="row-4">
          <div className="chart-section">
            <PerformanceChart data={chart_data} />
          </div>
          <div className="comparison-section">
            <PlatformComparison data={platform_breakdown} />
          </div>
        </div>

        {/* Row 5: Top Campaigns + AI Recommendations */}
        <div className="row-5">
          <div className="campaigns-section">
            <div className="card campaigns-card">
              <div className="card-header">
                <span className="card-title">Top Campaigns</span>
                <button className="btn btn-ghost btn-sm" onClick={() => router.push('/campaigns')}>
                  View All
                </button>
              </div>
              <div className="campaigns-list">
                {top_campaigns.slice(0, 5).map((campaign) => (
                  <div
                    key={campaign.id}
                    className="campaign-item"
                    onClick={() => router.push(`/campaigns/${campaign.id}`)}
                  >
                    <div className="campaign-info">
                      <span className={`status-dot ${campaign.status === 'ENABLED' ? 'active' : 'paused'}`} />
                      <div className="campaign-details">
                        <div className="campaign-name">{campaign.name}</div>
                        <div className="campaign-platform">
                          <span
                            className="platform-dot"
                            style={{ background: campaign.platform === 'google' ? '#4285F4' : '#0668E1' }}
                          />
                          {campaign.platform === 'google' ? 'Google' : 'Meta'}
                        </div>
                      </div>
                    </div>
                    <div className="campaign-metrics">
                      <div className="campaign-metric">
                        <span className="metric-label">Spend</span>
                        <span className="metric-value mono">{formatMicros(campaign.spend_micros)}</span>
                      </div>
                      <div className="campaign-metric">
                        <span className="metric-label">Conv</span>
                        <span className="metric-value mono">{campaign.conversions}</span>
                      </div>
                      <div className="campaign-metric">
                        <span className="metric-label">ROAS</span>
                        <span
                          className="metric-value mono"
                          style={{
                            color: campaign.roas >= 4 ? 'var(--success)' : campaign.roas >= 3 ? 'var(--warning)' : 'var(--error)',
                          }}
                        >
                          {campaign.roas}x
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="ai-section">
            <AIRecommendationsSummary
              pendingCount={pending_recommendations}
              aiSavings={ai_savings_this_month}
            />
          </div>
        </div>

        {/* Row 6: Additional Charts */}
        <div className="row-6">
          <SpendDistributionChart
            googleSpend={platform_breakdown.find(p => p.platform === 'google')?.spend_micros || 0}
            metaSpend={platform_breakdown.find(p => p.platform === 'meta')?.spend_micros || 0}
          />
          <ConversionFunnel
            impressions={metrics.impressions}
            clicks={metrics.clicks}
            conversions={metrics.conversions}
          />
          <DeviceBreakdown />
        </div>

        {/* Row 7: Quick Actions */}
        <QuickActionsGrid />
      </div>

      <style jsx>{`
        .dashboard {
          max-width: 1400px;
        }

        /* Row 2: Metrics Grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .metric-card {
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 16px;
          text-align: center;
        }

        .metric-label {
          font-size: 11px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .metric-change {
          font-size: 12px;
          margin-top: 6px;
          font-weight: 500;
        }

        .metric-change.up { color: var(--success); }
        .metric-change.down { color: var(--error); }

        /* Row 3: Budget + Alerts */
        .row-3 {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        /* Row 4: Chart + Platform */
        .row-4 {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        /* Row 5: Campaigns + AI */
        .row-5 {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        /* Row 6: Additional Charts */
        .row-6 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }

        /* Campaigns Card */
        .campaigns-card {
          height: 100%;
        }

        .campaigns-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .campaign-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--surface-secondary);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .campaign-item:hover {
          background: var(--surface-hover);
        }

        .campaign-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.active { background: var(--success); }
        .status-dot.paused { background: var(--text-tertiary); }

        .campaign-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .campaign-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .campaign-platform {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .platform-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .campaign-metrics {
          display: flex;
          gap: 16px;
        }

        .campaign-metric {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .campaign-metric .metric-label {
          font-size: 10px;
          margin-bottom: 0;
        }

        .campaign-metric .metric-value {
          font-size: 13px;
          font-weight: 600;
        }

        /* Mobile Responsive */
        @media (max-width: 1200px) {
          .metrics-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 900px) {
          .row-3,
          .row-4,
          .row-5 {
            grid-template-columns: 1fr;
          }

          .row-6 {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 767px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .metric-card {
            padding: 12px;
          }

          .metric-value {
            font-size: 20px;
          }

          .row-3,
          .row-4,
          .row-5,
          .row-6 {
            gap: 16px;
            margin-bottom: 16px;
          }

          .campaign-metrics {
            display: none;
          }

          .campaign-item {
            padding: 10px;
          }
        }
      `}</style>
    </>
  );
}
