'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  link?: string;
}

interface AlertsPanelProps {
  alerts?: Alert[];
}

// Mock alerts - in production, these would come from the API
const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'critical',
    title: 'Budget Overspend',
    message: '2 campaigns exceeded daily budget',
    link: '/campaigns?filter=overspend',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Low Quality Score',
    message: '5 keywords below quality threshold',
    link: '/keywords?filter=low-quality',
  },
  {
    id: '3',
    type: 'info',
    title: 'Token Expiring',
    message: 'Google Ads token expires in 7 days',
    link: '/settings/accounts',
  },
];

export default function AlertsPanel({ alerts = mockAlerts }: AlertsPanelProps) {
  const router = useRouter();

  const criticalCount = alerts.filter((a) => a.type === 'critical').length;
  const warningCount = alerts.filter((a) => a.type === 'warning').length;
  const infoCount = alerts.filter((a) => a.type === 'info').length;

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle size={16} />;
      case 'warning':
        return <AlertCircle size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="alerts-panel empty">
        <div className="empty-state">
          <span className="empty-icon">✓</span>
          <span>All clear! No alerts</span>
        </div>
        <style jsx>{`
          .alerts-panel.empty {
            background: var(--surface-card);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            padding: 24px;
            text-align: center;
          }
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: var(--text-secondary);
          }
          .empty-icon {
            font-size: 24px;
            color: var(--success);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <h3 className="alerts-title">Alerts</h3>
        <div className="alerts-badges">
          {criticalCount > 0 && (
            <span className="alert-badge critical">{criticalCount}</span>
          )}
          {warningCount > 0 && (
            <span className="alert-badge warning">{warningCount}</span>
          )}
          {infoCount > 0 && (
            <span className="alert-badge info">{infoCount}</span>
          )}
        </div>
      </div>

      <div className="alerts-list">
        {alerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            className={`alert-item ${alert.type}`}
            onClick={() => alert.link && router.push(alert.link)}
            style={{ cursor: alert.link ? 'pointer' : 'default' }}
          >
            <div className={`alert-icon ${alert.type}`}>{getIcon(alert.type)}</div>
            <div className="alert-content">
              <div className="alert-title">{alert.title}</div>
              <div className="alert-message">{alert.message}</div>
            </div>
            {alert.link && <ChevronRight size={16} className="alert-arrow" />}
          </div>
        ))}
      </div>

      {alerts.length > 3 && (
        <button className="btn btn-ghost btn-sm view-all-btn">
          View All ({alerts.length})
        </button>
      )}

      <style jsx>{`
        .alerts-panel {
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 16px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .alerts-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .alerts-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .alerts-badges {
          display: flex;
          gap: 6px;
        }

        .alert-badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .alert-badge.critical {
          background: rgba(239, 68, 68, 0.15);
          color: var(--error);
        }

        .alert-badge.warning {
          background: rgba(245, 158, 11, 0.15);
          color: var(--warning);
        }

        .alert-badge.info {
          background: rgba(59, 130, 246, 0.15);
          color: var(--info);
        }

        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .alert-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--surface-secondary);
          border-radius: var(--radius-md);
          transition: background 0.15s ease;
        }

        .alert-item:hover {
          background: var(--surface-hover);
        }

        .alert-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .alert-icon.critical {
          background: rgba(239, 68, 68, 0.15);
          color: var(--error);
        }

        .alert-icon.warning {
          background: rgba(245, 158, 11, 0.15);
          color: var(--warning);
        }

        .alert-icon.info {
          background: rgba(59, 130, 246, 0.15);
          color: var(--info);
        }

        .alert-content {
          flex: 1;
          min-width: 0;
        }

        .alert-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .alert-message {
          font-size: 12px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .alert-arrow {
          color: var(--text-tertiary);
          flex-shrink: 0;
        }

        .view-all-btn {
          margin-top: 12px;
          width: 100%;
        }

        @media (max-width: 767px) {
          .alerts-panel {
            padding: 14px;
          }

          .alert-item {
            padding: 8px 10px;
          }
        }
      `}</style>
    </div>
  );
}
