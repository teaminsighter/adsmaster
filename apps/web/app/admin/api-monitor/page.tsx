'use client';

import { useState } from 'react';
import {
  useAPIVersions,
  useAPIHealth,
  useAPIAlerts,
  useSunsetTimeline,
  adminFetch,
} from '@/lib/hooks/useAdminApi';

type TabType = 'health' | 'versions' | 'alerts' | 'sunset';

function StatusBadge({ status }: { status: string }) {
  const getColor = () => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'ok':
      case 'operational':
        return '#10b981';
      case 'degraded':
      case 'warning':
        return '#f59e0b';
      case 'down':
      case 'critical':
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <span className="status-badge" style={{ backgroundColor: `${getColor()}20`, color: getColor() }}>
      {status}
      <style jsx>{`
        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
      `}</style>
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const getColor = () => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  return (
    <span className="severity-badge" style={{ backgroundColor: `${getColor()}20`, color: getColor() }}>
      {severity}
      <style jsx>{`
        .severity-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
      `}</style>
    </span>
  );
}

function UrgencyBadge({ urgency, days }: { urgency: string; days: number }) {
  const getColor = () => {
    if (days <= 30) return '#ef4444';
    if (days <= 90) return '#f59e0b';
    return '#10b981';
  };

  return (
    <span className="urgency-badge" style={{ backgroundColor: `${getColor()}20`, color: getColor() }}>
      {days} days
      <style jsx>{`
        .urgency-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
      `}</style>
    </span>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const icon = platform.toLowerCase().includes('google') ? '🔷' :
               platform.toLowerCase().includes('meta') ? '📘' : '🔌';
  return <span className="platform-icon">{icon}</span>;
}

function HealthTab() {
  const { data: health, loading, refetch } = useAPIHealth();

  if (loading) {
    return <div className="loading">Loading API health...</div>;
  }

  return (
    <div className="health-tab">
      <div className="section-header">
        <h3>Platform Health Status</h3>
        <button onClick={refetch} className="refresh-btn">Refresh</button>
      </div>

      <div className="health-grid">
        {health?.platforms.map((platform) => (
          <div key={platform.platform} className="health-card">
            <div className="health-header">
              <div className="platform-name">
                <PlatformIcon platform={platform.platform} />
                <span>{platform.platform}</span>
              </div>
              <StatusBadge status={platform.status} />
            </div>

            <div className="health-metrics">
              <div className="metric">
                <span className="metric-label">Current Version</span>
                <span className="metric-value">{platform.current_version}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Latest Available</span>
                <span className="metric-value">{platform.latest_version}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Production Adapter</span>
                <span className="metric-value">{platform.production_adapter}</span>
              </div>
            </div>

            <div className="health-stats">
              <div className="stat">
                <span className="stat-value">{platform.requests_1h.toLocaleString()}</span>
                <span className="stat-label">Requests/hr</span>
              </div>
              <div className="stat">
                <span className="stat-value" style={{ color: platform.error_rate_1h > 5 ? '#ef4444' : '#10b981' }}>
                  {platform.error_rate_1h.toFixed(2)}%
                </span>
                <span className="stat-label">Error Rate</span>
              </div>
              <div className="stat">
                <span className="stat-value">{platform.avg_latency_ms.toFixed(0)}ms</span>
                <span className="stat-label">Avg Latency</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .health-tab { padding: 0; }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .section-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .refresh-btn {
          padding: 8px 16px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .refresh-btn:hover { opacity: 0.9; }
        .health-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }
        .health-card {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
        }
        .health-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .platform-name {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
          color: var(--admin-text);
        }
        .health-metrics {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--admin-border);
        }
        .metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .metric-label {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .metric-value {
          font-size: 14px;
          font-weight: 500;
          color: var(--admin-text);
          font-family: 'JetBrains Mono', monospace;
        }
        .health-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .stat {
          text-align: center;
        }
        .stat-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: var(--admin-accent);
        }
        .stat-label {
          font-size: 11px;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

function VersionsTab() {
  const { data: versions, loading } = useAPIVersions();

  if (loading) {
    return <div className="loading">Loading API versions...</div>;
  }

  return (
    <div className="versions-tab">
      <h3>API Version Tracking</h3>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Current Version</th>
              <th>Latest Version</th>
              <th>Production Adapter</th>
              <th>Status</th>
              <th>Error Rate (24h)</th>
              <th>Avg Latency</th>
            </tr>
          </thead>
          <tbody>
            {versions?.platforms.map((platform) => (
              <tr key={platform.platform}>
                <td>
                  <div className="platform-cell">
                    <PlatformIcon platform={platform.platform} />
                    <span>{platform.platform}</span>
                  </div>
                </td>
                <td className="mono">{platform.current_version}</td>
                <td className="mono">
                  {platform.latest_version}
                  {platform.current_version !== platform.latest_version && (
                    <span className="update-badge">Update Available</span>
                  )}
                </td>
                <td className="mono">{platform.production_adapter_version}</td>
                <td><StatusBadge status={platform.api_status} /></td>
                <td style={{ color: platform.error_rate_24h > 5 ? '#ef4444' : '#10b981' }}>
                  {platform.error_rate_24h.toFixed(2)}%
                </td>
                <td>{platform.avg_latency_ms.toFixed(0)}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .versions-tab h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 20px 0;
        }
        .table-container {
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th,
        .data-table td {
          padding: 14px 16px;
          text-align: left;
          border-bottom: 1px solid var(--admin-border);
        }
        .data-table th {
          font-size: 11px;
          font-weight: 600;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: var(--admin-inner-bg);
        }
        .data-table td {
          color: var(--admin-text);
          font-size: 14px;
        }
        .platform-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
        }
        .mono {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }
        .update-badge {
          display: inline-block;
          margin-left: 8px;
          padding: 2px 8px;
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          font-size: 10px;
          font-weight: 600;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

function AlertsTab() {
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const { data: alerts, loading, refetch } = useAPIAlerts(showAcknowledged ? undefined : false);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await adminFetch(`/admin/api-monitor/alerts/${alertId}/acknowledge`, { method: 'POST' });
      refetch();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading alerts...</div>;
  }

  return (
    <div className="alerts-tab">
      <div className="alerts-header">
        <h3>API Alerts</h3>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showAcknowledged}
            onChange={(e) => setShowAcknowledged(e.target.checked)}
          />
          Show acknowledged
        </label>
      </div>

      {alerts?.alerts.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">✓</span>
          <p>No unacknowledged alerts</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts?.alerts.map((alert) => (
            <div key={alert.id} className={`alert-card ${alert.acknowledged_at ? 'acknowledged' : ''}`}>
              <div className="alert-header">
                <div className="alert-info">
                  <PlatformIcon platform={alert.platform} />
                  <span className="alert-platform">{alert.platform}</span>
                  <SeverityBadge severity={alert.severity} />
                  <span className="alert-type">{alert.alert_type.replace(/_/g, ' ')}</span>
                </div>
                <span className="alert-time">
                  {new Date(alert.created_at).toLocaleString()}
                </span>
              </div>

              <h4 className="alert-title">{alert.title}</h4>
              <p className="alert-message">{alert.message}</p>

              <div className="alert-actions">
                {alert.acknowledged_at ? (
                  <span className="acknowledged-badge">
                    Acknowledged {new Date(alert.acknowledged_at).toLocaleDateString()}
                  </span>
                ) : (
                  <button onClick={() => acknowledgeAlert(alert.id)} className="acknowledge-btn">
                    Acknowledge
                  </button>
                )}
                {alert.resolved_at && (
                  <span className="resolved-badge">
                    Resolved {new Date(alert.resolved_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .alerts-tab {}
        .alerts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .alerts-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .toggle-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--admin-text-muted);
          cursor: pointer;
        }
        .toggle-label input {
          cursor: pointer;
        }
        .empty-state {
          text-align: center;
          padding: 60px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
        }
        .empty-icon {
          display: inline-block;
          width: 60px;
          height: 60px;
          line-height: 60px;
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border-radius: 50%;
          font-size: 28px;
          margin-bottom: 16px;
        }
        .empty-state p {
          color: var(--admin-text-muted);
          margin: 0;
        }
        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .alert-card {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
        }
        .alert-card.acknowledged {
          opacity: 0.7;
        }
        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .alert-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .alert-platform {
          font-weight: 500;
          color: var(--admin-text);
        }
        .alert-type {
          font-size: 12px;
          color: var(--admin-text-muted);
          text-transform: capitalize;
        }
        .alert-time {
          font-size: 12px;
          color: var(--admin-text-dim);
        }
        .alert-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 8px 0;
        }
        .alert-message {
          font-size: 14px;
          color: var(--admin-text-muted);
          margin: 0 0 16px 0;
          line-height: 1.5;
        }
        .alert-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .acknowledge-btn {
          padding: 8px 16px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .acknowledge-btn:hover { opacity: 0.9; }
        .acknowledged-badge,
        .resolved-badge {
          font-size: 12px;
          color: var(--admin-text-dim);
        }
        .resolved-badge {
          color: #10b981;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

function SunsetTab() {
  const { data: sunset, loading } = useSunsetTimeline();

  if (loading) {
    return <div className="loading">Loading sunset timeline...</div>;
  }

  return (
    <div className="sunset-tab">
      <h3>API Version Sunset Timeline</h3>
      <p className="subtitle">Track upcoming API version deprecations and plan migrations accordingly.</p>

      {sunset?.timeline.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📅</span>
          <p>No upcoming API deprecations</p>
        </div>
      ) : (
        <div className="timeline">
          {sunset?.timeline.map((item, index) => (
            <div key={`${item.platform}-${item.version}`} className="timeline-item">
              <div className="timeline-marker">
                <div className="marker-dot" style={{
                  backgroundColor: item.days_until <= 30 ? '#ef4444' :
                                   item.days_until <= 90 ? '#f59e0b' : '#10b981'
                }} />
                {index < (sunset?.timeline.length || 0) - 1 && <div className="marker-line" />}
              </div>

              <div className="timeline-content">
                <div className="timeline-header">
                  <div className="platform-version">
                    <PlatformIcon platform={item.platform} />
                    <span className="platform-name">{item.platform}</span>
                    <span className="version-badge">v{item.version}</span>
                  </div>
                  <UrgencyBadge urgency={item.urgency} days={item.days_until} />
                </div>

                <div className="sunset-date">
                  <span className="date-label">Sunset Date:</span>
                  <span className="date-value">
                    {new Date(item.sunset_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {item.days_until <= 30 && (
                  <div className="warning-message">
                    Action Required: Migrate to a newer API version immediately to avoid service disruption.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .sunset-tab {}
        .sunset-tab h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 8px 0;
        }
        .subtitle {
          font-size: 14px;
          color: var(--admin-text-muted);
          margin: 0 0 24px 0;
        }
        .empty-state {
          text-align: center;
          padding: 60px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
        }
        .empty-icon {
          display: inline-block;
          font-size: 40px;
          margin-bottom: 16px;
        }
        .empty-state p {
          color: var(--admin-text-muted);
          margin: 0;
        }
        .timeline {
          display: flex;
          flex-direction: column;
        }
        .timeline-item {
          display: flex;
          gap: 20px;
        }
        .timeline-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 20px;
        }
        .marker-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .marker-line {
          width: 2px;
          flex: 1;
          background: var(--admin-border);
          margin-top: 4px;
        }
        .timeline-content {
          flex: 1;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .platform-version {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .platform-name {
          font-weight: 600;
          color: var(--admin-text);
        }
        .version-badge {
          padding: 4px 10px;
          background: var(--admin-inner-bg);
          border-radius: 6px;
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--admin-text-muted);
        }
        .sunset-date {
          display: flex;
          gap: 10px;
          font-size: 14px;
        }
        .date-label {
          color: var(--admin-text-muted);
        }
        .date-value {
          color: var(--admin-text);
          font-weight: 500;
        }
        .warning-message {
          margin-top: 16px;
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          font-size: 13px;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

export default function APIMonitorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('health');

  const tabs = [
    { id: 'health' as TabType, label: 'Health', icon: '💚' },
    { id: 'versions' as TabType, label: 'Versions', icon: '📦' },
    { id: 'alerts' as TabType, label: 'Alerts', icon: '🔔' },
    { id: 'sunset' as TabType, label: 'Sunset Timeline', icon: '📅' },
  ];

  return (
    <div className="api-monitor-page">
      <h1 className="page-title">API Monitor</h1>
      <p className="page-subtitle">Track Google Ads and Meta Marketing API versions, health, and upcoming changes.</p>

      <div className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'health' && <HealthTab />}
        {activeTab === 'versions' && <VersionsTab />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'sunset' && <SunsetTab />}
      </div>

      <style jsx>{`
        .api-monitor-page {
          max-width: 1400px;
        }
        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 8px 0;
        }
        .page-subtitle {
          font-size: 14px;
          color: var(--admin-text-muted);
          margin: 0 0 24px 0;
        }
        .tab-nav {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          padding: 4px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
          width: fit-content;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--admin-text-muted);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          color: var(--admin-text);
        }
        .tab-btn.active {
          background: var(--admin-card);
          color: var(--admin-accent);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .tab-icon {
          font-size: 16px;
        }
        .tab-content {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 24px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .page-title { font-size: 20px; }
          .page-subtitle { margin-bottom: 16px; }
          .tab-nav {
            flex-wrap: wrap;
            width: 100%;
            gap: 4px;
            margin-bottom: 16px;
          }
          .tab-btn {
            flex: 1;
            min-width: calc(50% - 4px);
            padding: 8px 12px;
            font-size: 13px;
            justify-content: center;
            gap: 6px;
          }
          .tab-icon { font-size: 14px; }
          .tab-content { padding: 16px; }
        }
      `}</style>
    </div>
  );
}
