'use client';

import { useRouter } from 'next/navigation';
import { useMLDemoAnomalies } from '@/lib/hooks/useApi';
import { Activity, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';

export default function AnomalyAlertsWidget() {
  const router = useRouter();
  const { data: anomalyData, loading } = useMLDemoAnomalies();

  if (loading) {
    return (
      <div className="card anomaly-widget">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Analyzing metrics...</span>
        </div>
        <style jsx>{`
          .anomaly-widget {
            height: 100%;
            min-height: 280px;
          }
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 12px;
            color: var(--text-secondary);
            font-size: 13px;
          }
          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--border-default);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const anomalies = anomalyData?.data?.anomalies || [];
  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const warningCount = anomalies.filter(a => a.severity === 'warning').length;

  return (
    <div className="card anomaly-widget">
      {/* Header */}
      <div className="widget-header">
        <div className="header-left">
          <div className={`icon-box ${anomalies.length > 0 ? 'has-alerts' : 'clear'}`}>
            <Activity size={16} />
          </div>
          <div className="header-text">
            <span className="title">Anomaly Detection</span>
            <span className="subtitle">AI-powered monitoring</span>
          </div>
        </div>
        <button className="view-all" onClick={() => router.push('/analytics')}>
          Details <ChevronRight size={14} />
        </button>
      </div>

      {/* Summary Stats */}
      {anomalies.length > 0 ? (
        <>
          <div className="stats-row">
            <div className={`stat ${criticalCount > 0 ? 'critical' : ''}`}>
              <span className="stat-value mono">{criticalCount}</span>
              <span className="stat-label">Critical</span>
            </div>
            <div className={`stat ${warningCount > 0 ? 'warning' : ''}`}>
              <span className="stat-value mono">{warningCount}</span>
              <span className="stat-label">Warning</span>
            </div>
            <div className="stat">
              <span className="stat-value mono">{anomalies.length}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>

          {/* Anomaly List */}
          <div className="anomaly-list">
            {anomalies.slice(0, 3).map((anomaly, i) => (
              <div
                key={anomaly.id || i}
                className={`anomaly-item ${anomaly.severity}`}
              >
                <div className="anomaly-icon">
                  <AlertTriangle size={14} />
                </div>
                <div className="anomaly-content">
                  <div className="anomaly-header">
                    <span className="anomaly-metric">{anomaly.metric}</span>
                    <span className={`anomaly-deviation ${anomaly.deviation_pct >= 0 ? 'up' : 'down'}`}>
                      {anomaly.deviation_pct >= 0 ? '+' : ''}{anomaly.deviation_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="anomaly-desc">{anomaly.description}</div>
                </div>
              </div>
            ))}
          </div>

          {anomalies.length > 3 && (
            <button className="show-more" onClick={() => router.push('/analytics')}>
              +{anomalies.length - 3} more anomalies
            </button>
          )}
        </>
      ) : (
        <div className="all-clear">
          <CheckCircle size={40} />
          <div className="clear-title">All Clear</div>
          <div className="clear-desc">No anomalies detected in your metrics</div>
        </div>
      )}

      <style jsx>{`
        .anomaly-widget {
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

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .icon-box {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-box.has-alerts {
          background: rgba(239, 68, 68, 0.15);
          color: #EF4444;
        }

        .icon-box.clear {
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
        }

        .header-text {
          display: flex;
          flex-direction: column;
        }

        .title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .subtitle {
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .view-all {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 500;
          color: var(--primary);
          background: var(--primary-light);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .view-all:hover {
          opacity: 0.8;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .stat {
          padding: 10px;
          background: var(--surface-secondary);
          border-radius: 8px;
          text-align: center;
        }

        .stat.critical {
          background: rgba(239, 68, 68, 0.1);
          border-bottom: 2px solid #EF4444;
        }

        .stat.warning {
          background: rgba(245, 158, 11, 0.1);
          border-bottom: 2px solid #F59E0B;
        }

        .stat-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .stat.critical .stat-value { color: #EF4444; }
        .stat.warning .stat-value { color: #F59E0B; }

        .stat-label {
          display: block;
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          margin-top: 2px;
        }

        .anomaly-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow: hidden;
        }

        .anomaly-item {
          display: flex;
          gap: 10px;
          padding: 10px;
          border-radius: 8px;
          background: var(--surface-secondary);
        }

        .anomaly-item.critical {
          background: rgba(239, 68, 68, 0.08);
          border-left: 3px solid #EF4444;
        }

        .anomaly-item.warning {
          background: rgba(245, 158, 11, 0.08);
          border-left: 3px solid #F59E0B;
        }

        .anomaly-item.info {
          background: rgba(59, 130, 246, 0.08);
          border-left: 3px solid #3B82F6;
        }

        .anomaly-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .anomaly-item.critical .anomaly-icon { color: #EF4444; }
        .anomaly-item.warning .anomaly-icon { color: #F59E0B; }
        .anomaly-item.info .anomaly-icon { color: #3B82F6; }

        .anomaly-content {
          flex: 1;
          min-width: 0;
        }

        .anomaly-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .anomaly-metric {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: capitalize;
        }

        .anomaly-deviation {
          font-size: 12px;
          font-weight: 700;
          font-family: var(--font-mono);
        }

        .anomaly-deviation.up { color: #EF4444; }
        .anomaly-deviation.down { color: #10B981; }

        .anomaly-desc {
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .show-more {
          margin-top: 8px;
          padding: 8px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--surface-secondary);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .show-more:hover {
          background: var(--surface-hover);
        }

        .all-clear {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px;
          background: rgba(16, 185, 129, 0.08);
          border-radius: 10px;
          color: #10B981;
        }

        .clear-title {
          font-size: 16px;
          font-weight: 600;
          margin-top: 12px;
        }

        .clear-desc {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
