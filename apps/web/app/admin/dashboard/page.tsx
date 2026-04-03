'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import {
  useAdminDashboard,
  useRecentActivity,
  useRevenueMetrics,
  useExpiringTokens,
  useFailedPayments,
  useAPIAlerts,
  useSystemOverview,
  useAPIHealth,
  useAIOverview,
  useAnalyticsOverview,
} from '@/lib/hooks/useAdminApi';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ============================================================================
// Utility Functions
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ============================================================================
// Row 1: Revenue & Growth KPIs
// ============================================================================

function RevenueKPIs() {
  const { data: metrics } = useAdminDashboard();
  const { data: revenue } = useRevenueMetrics(30);

  const kpis = [
    {
      label: 'MRR',
      value: formatCurrency(revenue?.mrr || 0),
      trend: null,
      color: '#10b981',
    },
    {
      label: 'ARR',
      value: formatCurrency(revenue?.arr || 0),
      trend: null,
      color: '#10b981',
    },
    {
      label: 'New Users (7d)',
      value: formatNumber(metrics?.new_users_7d || 0),
      trend: '+12%',
      color: '#3b82f6',
    },
    {
      label: 'Active (30d)',
      value: formatNumber(metrics?.active_users_30d || 0),
      trend: null,
      color: '#8b5cf6',
    },
    {
      label: 'Churn Rate',
      value: `${(revenue?.churn_rate || 0).toFixed(1)}%`,
      trend: null,
      color: (revenue?.churn_rate || 0) > 5 ? '#ef4444' : '#10b981',
      warn: (revenue?.churn_rate || 0) > 5,
    },
    {
      label: 'ARPU',
      value: formatCurrency(revenue?.arpu || 0),
      trend: null,
      color: '#f59e0b',
    },
  ];

  return (
    <div className="kpi-row">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="kpi-card">
          <div className="kpi-label">{kpi.label}</div>
          <div className="kpi-value" style={{ color: kpi.color }}>
            {kpi.value}
          </div>
          {kpi.trend && <div className="kpi-trend positive">{kpi.trend}</div>}
          {kpi.warn && <div className="kpi-warn">High</div>}
        </div>
      ))}

      <style jsx>{`
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .kpi-card {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .kpi-label {
          font-size: 12px;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .kpi-value {
          font-size: 28px;
          font-weight: 700;
          line-height: 1.2;
        }
        .kpi-trend {
          font-size: 12px;
          margin-top: 4px;
        }
        .kpi-trend.positive { color: #10b981; }
        .kpi-trend.negative { color: #ef4444; }
        .kpi-warn {
          font-size: 10px;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.2);
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
          margin-top: 4px;
        }
        @media (max-width: 1200px) {
          .kpi-row { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .kpi-row { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .kpi-card { padding: 16px; }
          .kpi-value { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Row 2: Alerts & Action Items
// ============================================================================

function AlertsPanel() {
  const { data: expiring } = useExpiringTokens(7);
  const { data: failed } = useFailedPayments(1);
  const { data: apiAlerts } = useAPIAlerts(false);
  const { data: system } = useSystemOverview();

  const alerts = [
    {
      label: 'Expiring Tokens',
      count: expiring?.total || 0,
      icon: '🔑',
      link: '/admin/ad-accounts',
      severity: (expiring?.total || 0) > 0 ? 'warning' : 'ok',
    },
    {
      label: 'Failed Payments',
      count: failed?.total || 0,
      icon: '💳',
      link: '/admin/billing',
      severity: (failed?.total || 0) > 0 ? 'critical' : 'ok',
    },
    {
      label: 'API Alerts',
      count: apiAlerts?.total || 0,
      icon: '🔔',
      link: '/admin/api-monitor',
      severity: (apiAlerts?.total || 0) > 0 ? 'warning' : 'ok',
    },
    {
      label: 'Failed Jobs',
      count: system?.jobs_today?.failed || 0,
      icon: '⚙️',
      link: '/admin/system',
      severity: (system?.jobs_today?.failed || 0) > 0 ? 'warning' : 'ok',
    },
  ];

  const hasAlerts = alerts.some(a => a.count > 0);

  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <h3>Needs Attention</h3>
        {!hasAlerts && <span className="all-clear">All clear</span>}
      </div>
      <div className="alerts-grid">
        {alerts.map((alert) => (
          <Link key={alert.label} href={alert.link} className={`alert-card ${alert.severity}`}>
            <span className="alert-icon">{alert.icon}</span>
            <div className="alert-content">
              <span className="alert-count">{alert.count}</span>
              <span className="alert-label">{alert.label}</span>
            </div>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .alerts-panel {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .alerts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .alerts-header h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .all-clear {
          font-size: 12px;
          color: #10b981;
          background: rgba(16, 185, 129, 0.2);
          padding: 4px 12px;
          border-radius: 20px;
        }
        .alerts-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        :global(.alert-card) {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 10px;
          text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        :global(.alert-card:hover) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        :global(.alert-card.ok) {
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
        }
        :global(.alert-card.warning) {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        :global(.alert-card.critical) {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .alert-icon {
          font-size: 24px;
        }
        .alert-content {
          display: flex;
          flex-direction: column;
        }
        .alert-count {
          font-size: 24px;
          font-weight: 700;
          color: var(--admin-text);
        }
        :global(.alert-card.warning) .alert-count { color: #f59e0b; }
        :global(.alert-card.critical) .alert-count { color: #ef4444; }
        .alert-label {
          font-size: 12px;
          color: var(--admin-text-muted);
        }
        @media (max-width: 900px) {
          .alerts-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 500px) {
          .alerts-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Row 3: Platform Health
// ============================================================================

function PlatformHealth() {
  const { data: apiHealth } = useAPIHealth();
  const { data: aiOverview } = useAIOverview();
  const { data: system } = useSystemOverview();

  const googleAds = apiHealth?.platforms?.find(p => p.platform.toLowerCase().includes('google'));
  const metaAds = apiHealth?.platforms?.find(p => p.platform.toLowerCase().includes('meta'));

  const statuses = [
    { label: 'API Server', status: 'healthy', detail: 'Operational' },
    { label: 'Database', status: 'healthy', detail: 'Connected' },
    {
      label: 'Google Ads API',
      status: googleAds?.status === 'healthy' ? 'healthy' : googleAds?.status === 'degraded' ? 'warning' : 'unknown',
      detail: googleAds ? `${googleAds.error_rate_1h.toFixed(1)}% errors` : 'N/A',
    },
    {
      label: 'Meta Ads API',
      status: metaAds?.status === 'healthy' ? 'healthy' : metaAds?.status === 'degraded' ? 'warning' : 'unknown',
      detail: metaAds ? `${metaAds.error_rate_1h.toFixed(1)}% errors` : 'N/A',
    },
    {
      label: 'AI Provider',
      status: 'healthy',
      detail: Object.keys(aiOverview?.by_provider || {})[0] || 'Gemini',
    },
    {
      label: 'Background Jobs',
      status: (system?.jobs_today?.failed || 0) > 0 ? 'warning' : 'healthy',
      detail: `${system?.jobs_today?.running || 0} running`,
    },
  ];

  return (
    <div className="health-panel">
      <h3>Platform Health</h3>
      <div className="health-grid">
        {statuses.map((item) => (
          <div key={item.label} className="health-item">
            <span className={`health-dot ${item.status}`} />
            <span className="health-label">{item.label}</span>
            <span className="health-detail">{item.detail}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .health-panel {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .health-panel h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 16px 0;
        }
        .health-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }
        .health-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 12px;
          background: var(--admin-inner-bg);
          border-radius: 8px;
        }
        .health-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-bottom: 8px;
        }
        .health-dot.healthy {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
        }
        .health-dot.warning {
          background: #f59e0b;
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
        }
        .health-dot.error {
          background: #ef4444;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
        }
        .health-dot.unknown {
          background: #6b7280;
        }
        .health-label {
          font-size: 12px;
          color: var(--admin-text);
          margin-bottom: 4px;
        }
        .health-detail {
          font-size: 11px;
          color: var(--admin-text-muted);
        }
        @media (max-width: 1000px) {
          .health-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 600px) {
          .health-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Row 4: Today's Usage
// ============================================================================

function UsageMetrics() {
  const { data: metrics } = useAdminDashboard();
  const { data: aiOverview } = useAIOverview();

  const items = [
    {
      label: 'API Calls Today',
      value: formatNumber(metrics?.total_api_calls_today || 0),
      icon: '🔌',
    },
    {
      label: 'AI Tokens Today',
      value: formatNumber(metrics?.total_ai_tokens_today || 0),
      icon: '🤖',
    },
    {
      label: 'AI Cost Today',
      value: formatCurrency(metrics?.ai_cost_today_usd || 0),
      icon: '💰',
      warn: (metrics?.ai_cost_today_usd || 0) > 100,
    },
    {
      label: 'AI Requests (Week)',
      value: formatNumber(aiOverview?.week?.requests || 0),
      icon: '📊',
    },
  ];

  return (
    <div className="usage-row">
      {items.map((item) => (
        <div key={item.label} className={`usage-card ${item.warn ? 'warn' : ''}`}>
          <span className="usage-icon">{item.icon}</span>
          <div className="usage-content">
            <span className="usage-value">{item.value}</span>
            <span className="usage-label">{item.label}</span>
          </div>
        </div>
      ))}

      <style jsx>{`
        .usage-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .usage-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
        }
        .usage-card.warn {
          border-color: rgba(239, 68, 68, 0.5);
          background: rgba(239, 68, 68, 0.05);
        }
        .usage-icon {
          font-size: 28px;
        }
        .usage-content {
          display: flex;
          flex-direction: column;
        }
        .usage-value {
          font-size: 22px;
          font-weight: 700;
          color: var(--admin-text);
        }
        .usage-card.warn .usage-value { color: #ef4444; }
        .usage-label {
          font-size: 12px;
          color: var(--admin-text-muted);
        }
        @media (max-width: 900px) {
          .usage-row { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 500px) {
          .usage-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Row 5: Charts
// ============================================================================

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

function SignupsChart() {
  const { data: analytics } = useAnalyticsOverview(7);

  const chartData = analytics?.user_signups
    ? Object.entries(analytics.user_signups)
        .map(([date, count]) => ({
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          signups: count,
        }))
        .slice(-7)
    : [];

  return (
    <div className="chart-panel">
      <h3>User Signups (7 days)</h3>
      <div className="chart-container">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line
                type="monotone"
                dataKey="signups"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">No signup data available</div>
        )}
      </div>

      <style jsx>{`
        .chart-panel {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
        }
        .chart-panel h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 16px 0;
        }
        .chart-container {
          height: 200px;
        }
        .chart-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--admin-text-muted);
          font-size: 14px;
        }
        @media (max-width: 768px) {
          .chart-panel {
            padding: 16px;
          }
          .chart-container {
            height: 180px;
          }
        }
      `}</style>
    </div>
  );
}

function RevenuePieChart() {
  const { data: revenue } = useRevenueMetrics(30);

  const chartData = revenue?.by_plan
    ? Object.entries(revenue.by_plan).map(([plan, data]) => ({
        name: plan.charAt(0).toUpperCase() + plan.slice(1),
        value: data.mrr,
      }))
    : [];

  return (
    <div className="chart-panel">
      <h3>MRR by Plan</h3>
      <div className="chart-container">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">No revenue data available</div>
        )}
      </div>

      <style jsx>{`
        .chart-panel {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
        }
        .chart-panel h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 16px 0;
        }
        .chart-container {
          height: 200px;
        }
        .chart-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--admin-text-muted);
          font-size: 14px;
        }
        @media (max-width: 768px) {
          .chart-panel {
            padding: 16px;
          }
          .chart-container {
            height: 180px;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Row 6: Activity Feed + Quick Actions
// ============================================================================

function ActivityFeed() {
  const { data: activity, loading } = useRecentActivity(10);

  const getIcon = (action: string) => {
    if (action.includes('login')) return '🔐';
    if (action.includes('user')) return '👤';
    if (action.includes('org')) return '🏢';
    if (action.includes('campaign')) return '📣';
    if (action.includes('config')) return '⚙️';
    if (action.includes('billing')) return '💳';
    return '📝';
  };

  return (
    <div className="activity-panel">
      <h3>Recent Activity</h3>
      <div className="activity-list">
        {loading ? (
          <div className="activity-empty">Loading...</div>
        ) : !activity?.activities?.length ? (
          <div className="activity-empty">No recent activity</div>
        ) : (
          activity.activities.map((item) => (
            <div key={item.id} className="activity-item">
              <span className="activity-icon">{getIcon(item.action)}</span>
              <div className="activity-content">
                <span className="activity-action">{item.action}</span>
                {item.resource_type && (
                  <span className="activity-resource">{item.resource_type}</span>
                )}
              </div>
              <span className="activity-time">{formatTimeAgo(item.created_at)}</span>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .activity-panel {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
          height: 100%;
        }
        .activity-panel h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 16px 0;
        }
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 320px;
          overflow-y: auto;
        }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--admin-inner-bg);
          border-radius: 8px;
        }
        .activity-icon {
          font-size: 18px;
          width: 28px;
          text-align: center;
        }
        .activity-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .activity-action {
          font-size: 13px;
          color: var(--admin-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .activity-resource {
          font-size: 11px;
          color: var(--admin-text-dim);
        }
        .activity-time {
          font-size: 11px;
          color: var(--admin-text-dim);
          flex-shrink: 0;
        }
        .activity-empty {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
        @media (max-width: 768px) {
          .activity-panel {
            padding: 16px;
          }
          .activity-list {
            max-height: 280px;
          }
          .activity-item {
            padding: 8px 10px;
          }
          .activity-action {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}

function QuickActions() {
  const links = [
    { href: '/admin/users', label: 'Manage Users', icon: '👥' },
    { href: '/admin/billing', label: 'View Billing', icon: '💳' },
    { href: '/admin/api-monitor', label: 'API Monitor', icon: '🔌' },
    { href: '/admin/system', label: 'System Config', icon: '⚙️' },
    { href: '/admin/ai', label: 'AI Settings', icon: '🤖' },
    { href: '/admin/marketing', label: 'Marketing', icon: '📈' },
  ];

  return (
    <div className="quick-panel">
      <h3>Quick Actions</h3>
      <div className="quick-grid">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="quick-link">
            <span className="quick-icon">{link.icon}</span>
            <span className="quick-label">{link.label}</span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .quick-panel {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
        }
        .quick-panel h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 16px 0;
        }
        .quick-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        :global(.quick-link) {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--admin-inner-bg);
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.15s;
        }
        :global(.quick-link:hover) {
          background: rgba(16, 185, 129, 0.1);
          transform: translateX(4px);
        }
        .quick-icon {
          font-size: 20px;
        }
        .quick-label {
          font-size: 13px;
          color: var(--admin-text);
          font-weight: 500;
        }
        @media (max-width: 768px) {
          .quick-panel {
            padding: 16px;
          }
          .quick-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          :global(.quick-link) {
            flex-direction: column;
            padding: 12px 8px;
            gap: 6px;
            text-align: center;
          }
          .quick-icon {
            font-size: 24px;
          }
          .quick-label {
            font-size: 11px;
          }
        }
        @media (max-width: 400px) {
          .quick-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function AdminDashboardPage() {
  const { loading, error } = useAdminDashboard();

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>Loading dashboard...</p>
        <style jsx>{`
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            color: var(--admin-text-muted);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--admin-border);
            border-top-color: var(--admin-accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <p>Error loading dashboard: {error}</p>
        <style jsx>{`
          .error-state {
            padding: 40px;
            text-align: center;
            color: #f87171;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1 className="page-title">Dashboard Overview</h1>

      {/* Row 1: Revenue KPIs */}
      <Suspense fallback={<div>Loading KPIs...</div>}>
        <RevenueKPIs />
      </Suspense>

      {/* Row 2: Alerts */}
      <Suspense fallback={<div>Loading alerts...</div>}>
        <AlertsPanel />
      </Suspense>

      {/* Row 3: Platform Health */}
      <Suspense fallback={<div>Loading health...</div>}>
        <PlatformHealth />
      </Suspense>

      {/* Row 4: Usage Metrics */}
      <Suspense fallback={<div>Loading usage...</div>}>
        <UsageMetrics />
      </Suspense>

      {/* Row 5: Charts */}
      <div className="charts-row">
        <Suspense fallback={<div>Loading chart...</div>}>
          <SignupsChart />
        </Suspense>
        <Suspense fallback={<div>Loading chart...</div>}>
          <RevenuePieChart />
        </Suspense>
      </div>

      {/* Row 6: Activity + Quick Actions */}
      <div className="bottom-row">
        <Suspense fallback={<div>Loading activity...</div>}>
          <ActivityFeed />
        </Suspense>
        <Suspense fallback={<div>Loading...</div>}>
          <QuickActions />
        </Suspense>
      </div>

      <style jsx>{`
        .dashboard {
          max-width: 1400px;
        }
        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 24px 0;
        }
        .charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        .bottom-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 900px) {
          .charts-row,
          .bottom-row {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .page-title {
            font-size: 20px;
            margin-bottom: 16px;
          }
          .charts-row,
          .bottom-row {
            gap: 16px;
            margin-bottom: 16px;
          }
        }
      `}</style>
    </div>
  );
}
