'use client';

import { useRouter } from 'next/navigation';
import { useRecommendations } from '@/lib/hooks/useApi';
import { formatMicros } from '@/lib/api';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action?: string;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'critical',
    title: 'Budget Overspend',
    description: '2 campaigns exceeded daily budget',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Low Quality Score',
    description: '5 keywords below quality threshold',
  },
  {
    id: '3',
    type: 'info',
    title: 'Token Expiring',
    description: 'Google Ads token expires in 7 days',
  },
];

export default function RightSidebarPanel() {
  const router = useRouter();
  const { data, loading } = useRecommendations({ status: 'pending' });

  const recommendations = data?.recommendations?.slice(0, 4) || [];
  const totalPending = data?.summary?.pending || 0;
  const totalSavings = data?.summary?.total_savings_micros || 0;

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'var(--error)';
      case 'warning': return 'var(--warning)';
      case 'opportunity': return 'var(--success)';
      default: return 'var(--primary)';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'opportunity': return '🟢';
      default: return '🔵';
    }
  };

  const criticalCount = mockAlerts.filter(a => a.type === 'critical').length;
  const warningCount = mockAlerts.filter(a => a.type === 'warning').length;
  const infoCount = mockAlerts.filter(a => a.type === 'info').length;

  return (
    <div className="right-sidebar">
      {/* Alerts Section */}
      <div className="sidebar-section">
        <div className="section-header">
          <span className="section-title">Alerts</span>
          <div className="alert-badges">
            {criticalCount > 0 && <span className="badge critical">{criticalCount}</span>}
            {warningCount > 0 && <span className="badge warning">{warningCount}</span>}
            {infoCount > 0 && <span className="badge info">{infoCount}</span>}
          </div>
        </div>
        <div className="alerts-list">
          {mockAlerts.map((alert) => (
            <div key={alert.id} className={`alert-item ${alert.type}`}>
              <div className="alert-icon">{getAlertIcon(alert.type)}</div>
              <div className="alert-content">
                <div className="alert-title">{alert.title}</div>
                <div className="alert-desc">{alert.description}</div>
              </div>
              <div className="alert-arrow">›</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations Section */}
      <div className="sidebar-section recommendations-section">
        <div className="section-header">
          <div className="section-title-row">
            <span className="section-title">AI Recommendations</span>
            {totalPending > 0 && <span className="pending-count">{totalPending}</span>}
          </div>
          {totalSavings > 0 && (
            <div className="savings-badge">
              <span className="savings-icon">💰</span>
              <span className="savings-text">Save {formatMicros(totalSavings)}/mo</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
          </div>
        ) : recommendations.length > 0 ? (
          <div className="recs-list">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="rec-item"
                onClick={() => router.push('/recommendations')}
              >
                <div className="rec-severity" style={{ background: getSeverityColor(rec.severity) }}>
                  {getSeverityIcon(rec.severity)}
                </div>
                <div className="rec-content">
                  <div className="rec-title">{rec.title}</div>
                  <div className="rec-entity">
                    {rec.affected_entity?.name || rec.affected_entity?.campaign_name}
                  </div>
                  {rec.impact_estimate?.monthly_savings && (
                    <div className="rec-impact">
                      Save {formatMicros(rec.impact_estimate.monthly_savings)}/mo
                    </div>
                  )}
                </div>
                <div className="rec-confidence">{rec.confidence}%</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">✨</span>
            <span className="empty-text">All caught up!</span>
          </div>
        )}

        {totalPending > 4 && (
          <button
            className="view-all-btn"
            onClick={() => router.push('/recommendations')}
          >
            View all {totalPending} recommendations
          </button>
        )}
      </div>

      <style jsx>{`
        .right-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }

        .sidebar-section {
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 16px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .section-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pending-count {
          background: var(--error);
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }

        .alert-badges {
          display: flex;
          gap: 4px;
        }

        .badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
          color: white;
        }

        .badge.critical { background: var(--error); }
        .badge.warning { background: var(--warning); }
        .badge.info { background: var(--info, #3b82f6); }

        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .alert-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: var(--surface-secondary);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.15s ease;
          border-left: 3px solid transparent;
        }

        .alert-item:hover {
          background: var(--surface-hover);
        }

        .alert-item.critical { border-left-color: var(--error); }
        .alert-item.warning { border-left-color: var(--warning); }
        .alert-item.info { border-left-color: var(--info, #3b82f6); }

        .alert-icon {
          font-size: 12px;
          flex-shrink: 0;
        }

        .alert-content {
          flex: 1;
          min-width: 0;
        }

        .alert-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .alert-desc {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .alert-arrow {
          color: var(--text-tertiary);
          font-size: 16px;
        }

        /* Recommendations Section */
        .recommendations-section {
          flex: 1;
        }

        .savings-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--success-light, rgba(16, 185, 129, 0.1));
          padding: 4px 8px;
          border-radius: 12px;
        }

        .savings-icon {
          font-size: 11px;
        }

        .savings-text {
          font-size: 11px;
          font-weight: 600;
          color: var(--success);
        }

        .recs-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rec-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px;
          background: var(--surface-secondary);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .rec-item:hover {
          background: var(--surface-hover);
        }

        .rec-severity {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          flex-shrink: 0;
          opacity: 0.9;
        }

        .rec-content {
          flex: 1;
          min-width: 0;
        }

        .rec-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.3;
        }

        .rec-entity {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rec-impact {
          font-size: 11px;
          font-weight: 600;
          color: var(--success);
          margin-top: 4px;
        }

        .rec-confidence {
          font-size: 10px;
          font-weight: 500;
          color: var(--text-tertiary);
          background: var(--surface-tertiary, rgba(0,0,0,0.05));
          padding: 2px 6px;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .loading-state {
          display: flex;
          justify-content: center;
          padding: 20px;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border-default);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 24px;
          color: var(--text-secondary);
        }

        .empty-icon {
          font-size: 24px;
        }

        .empty-text {
          font-size: 13px;
        }

        .view-all-btn {
          width: 100%;
          margin-top: 12px;
          padding: 10px;
          background: var(--primary-light, rgba(16, 185, 129, 0.1));
          color: var(--primary);
          border: none;
          border-radius: var(--radius-md);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .view-all-btn:hover {
          background: var(--primary);
          color: white;
        }

        @media (max-width: 1200px) {
          .right-sidebar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
