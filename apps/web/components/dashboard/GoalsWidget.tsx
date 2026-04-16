'use client';

import Link from 'next/link';
import { useGoalsAlertsSummary } from '@/lib/hooks/useApi';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'achieved':
    case 'on_track':
      return 'var(--success)';
    case 'at_risk':
    case 'behind':
      return 'var(--warning)';
    case 'failed':
      return 'var(--error)';
    default:
      return 'var(--text-secondary)';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'var(--error)';
    case 'warning':
      return 'var(--warning)';
    default:
      return 'var(--info)';
  }
};

const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export default function GoalsWidget() {
  const { data, loading, error } = useGoalsAlertsSummary();

  if (loading) {
    return (
      <div className="goals-widget-card">
        <div className="widget-header">
          <h3 className="widget-title">Goals & Alerts</h3>
        </div>
        <div className="loading-state">Loading...</div>
        <style jsx>{widgetStyles}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="goals-widget-card">
        <div className="widget-header">
          <h3 className="widget-title">Goals & Alerts</h3>
          <Link href="/settings/goals" className="view-all-link">
            Set up
          </Link>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>No goals configured</p>
          <Link href="/settings/goals" className="setup-link">
            Set up goals & alerts
          </Link>
        </div>
        <style jsx>{widgetStyles}</style>
      </div>
    );
  }

  const hasGoals = data.total_goals > 0;
  const hasAlerts = data.recent_alerts && data.recent_alerts.length > 0;

  return (
    <div className="goals-widget-card">
      <div className="widget-header">
        <h3 className="widget-title">Goals & Alerts</h3>
        <Link href="/settings/goals" className="view-all-link">
          Manage
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="summary-row">
        <div className="summary-item">
          <span className="summary-value">{data.achieved_goals}</span>
          <span className="summary-label">Achieved</span>
        </div>
        <div className="summary-item">
          <span className="summary-value" style={{ color: 'var(--warning)' }}>
            {data.at_risk_goals}
          </span>
          <span className="summary-label">At Risk</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">{data.in_progress_goals}</span>
          <span className="summary-label">In Progress</span>
        </div>
        {data.unread_alerts > 0 && (
          <div className="summary-item">
            <span className="summary-value" style={{ color: 'var(--error)' }}>
              {data.unread_alerts}
            </span>
            <span className="summary-label">Unread Alerts</span>
          </div>
        )}
      </div>

      {/* Top Goals */}
      {hasGoals && data.top_goals && data.top_goals.length > 0 && (
        <div className="goals-section">
          <div className="section-title">Top Goals</div>
          <div className="goals-list">
            {data.top_goals.slice(0, 3).map((goal) => (
              <div key={goal.id} className="goal-item">
                <div className="goal-info">
                  <span className="goal-name">{goal.name}</span>
                  <span className="goal-meta">
                    {goal.days_remaining > 0 ? `${goal.days_remaining}d left` : 'Ended'}
                  </span>
                </div>
                <div className="goal-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(goal.progress_pct, 100)}%`,
                        background: getStatusColor(goal.status),
                      }}
                    />
                  </div>
                  <span className="progress-text" style={{ color: getStatusColor(goal.status) }}>
                    {goal.progress_pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {hasAlerts && (
        <div className="alerts-section">
          <div className="section-title">
            Recent Alerts
            {data.alerts_triggered_today > 0 && (
              <span className="alerts-badge">{data.alerts_triggered_today} today</span>
            )}
          </div>
          <div className="alerts-list">
            {data.recent_alerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="alert-item">
                <div
                  className="alert-indicator"
                  style={{ background: getSeverityColor(alert.severity) }}
                />
                <div className="alert-content">
                  <span className="alert-message">{alert.message}</span>
                  <span className="alert-time">{formatTimeAgo(alert.triggered_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Pacing Summary */}
      {data.budget_pacing && (
        <div className="budget-section">
          <div className="section-title">Budget Pacing</div>
          <div className="budget-summary">
            <div className="budget-stat">
              <span className="budget-dot on-track" />
              <span>{data.budget_pacing.on_track} on track</span>
            </div>
            {data.budget_pacing.over_pace > 0 && (
              <div className="budget-stat">
                <span className="budget-dot over" />
                <span>{data.budget_pacing.over_pace} over pace</span>
              </div>
            )}
            {data.budget_pacing.under_pace > 0 && (
              <div className="budget-stat">
                <span className="budget-dot under" />
                <span>{data.budget_pacing.under_pace} under pace</span>
              </div>
            )}
            {data.budget_pacing.critical > 0 && (
              <div className="budget-stat">
                <span className="budget-dot critical" />
                <span>{data.budget_pacing.critical} critical</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasGoals && !hasAlerts && (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <p>No goals or alerts configured</p>
          <Link href="/settings/goals" className="setup-link">
            Set up goals & alerts
          </Link>
        </div>
      )}

      <style jsx>{widgetStyles}</style>
    </div>
  );
}

const widgetStyles = `
  .goals-widget-card {
    background: var(--surface-card);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: 16px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .widget-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .widget-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .view-all-link {
    font-size: 12px;
    color: var(--primary);
    text-decoration: none;
  }

  .view-all-link:hover {
    text-decoration: underline;
  }

  .loading-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .summary-row {
    display: flex;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-default);
    margin-bottom: 12px;
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 50px;
  }

  .summary-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .summary-label {
    font-size: 10px;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .alerts-badge {
    font-size: 10px;
    padding: 2px 6px;
    background: var(--error);
    color: white;
    border-radius: 10px;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
  }

  .goals-section,
  .alerts-section,
  .budget-section {
    margin-bottom: 12px;
  }

  .goals-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .goal-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .goal-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .goal-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }

  .goal-meta {
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .goal-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .progress-bar {
    flex: 1;
    height: 6px;
    background: var(--surface-secondary);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 12px;
    font-weight: 600;
    min-width: 35px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .alerts-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .alert-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .alert-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-top: 5px;
    flex-shrink: 0;
  }

  .alert-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .alert-message {
    font-size: 12px;
    color: var(--text-primary);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .alert-time {
    font-size: 10px;
    color: var(--text-tertiary);
  }

  .budget-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .budget-stat {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .budget-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .budget-dot.on-track {
    background: var(--success);
  }

  .budget-dot.over {
    background: var(--warning);
  }

  .budget-dot.under {
    background: var(--info);
  }

  .budget-dot.critical {
    background: var(--error);
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 20px 0;
  }

  .empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .empty-state p {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 12px 0;
  }

  .setup-link {
    font-size: 13px;
    color: var(--primary);
    text-decoration: none;
  }

  .setup-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 767px) {
    .summary-row {
      flex-wrap: wrap;
      gap: 12px;
    }

    .summary-item {
      min-width: calc(50% - 6px);
    }

    .goal-name {
      max-width: 120px;
    }
  }
`;
