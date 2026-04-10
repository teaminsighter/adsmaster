'use client';

import { useState } from 'react';
import {
  useWebhookLogs,
  useWebhookStats,
  useWebhookEventTypes,
  useSubscriptionEvents,
  retryWebhook,
} from '@/lib/hooks/useAdminApi';

type TabType = 'logs' | 'stats' | 'subscription-events';

function StatsTab() {
  const { data: stats, loading } = useWebhookStats(24);

  if (loading) {
    return <div className="loading">Loading webhook statistics...</div>;
  }

  const successRate = stats?.success_rate || 0;

  return (
    <div className="stats-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📨</div>
          <div className="stat-info">
            <div className="stat-value">{stats?.total || 0}</div>
            <div className="stat-label">Total Webhooks (24h)</div>
          </div>
        </div>

        <div className={`stat-card ${successRate >= 95 ? 'success' : successRate >= 80 ? 'warning' : 'error'}`}>
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{successRate.toFixed(1)}%</div>
            <div className="stat-label">Success Rate</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-info">
            <div className="stat-value">{stats?.by_status?.processed || 0}</div>
            <div className="stat-label">Processed</div>
          </div>
        </div>

        <div className={`stat-card ${(stats?.by_status?.failed || 0) > 0 ? 'error' : ''}`}>
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <div className="stat-value">{stats?.by_status?.failed || 0}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>
      </div>

      <div className="section">
        <h3>By Provider</h3>
        <div className="provider-grid">
          {Object.entries(stats?.by_provider || {}).map(([provider, count]) => (
            <div key={provider} className="provider-card">
              <span className="provider-icon">
                {provider === 'stripe' ? '💳' : provider === 'resend' ? '✉️' : '🔗'}
              </span>
              <span className="provider-name">{provider}</span>
              <span className="provider-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>By Event Type (Top 10)</h3>
        <div className="event-types-list">
          {Object.entries(stats?.by_event_type || {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([eventType, count]) => (
              <div key={eventType} className="event-type-row">
                <span className="event-type-name">{eventType}</span>
                <span className="event-type-count">{count}</span>
              </div>
            ))}
        </div>
      </div>

      <style jsx>{`
        .stats-tab {}
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 30px;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
          padding: 20px;
        }
        .stat-card.success {
          border-left: 4px solid #10b981;
        }
        .stat-card.warning {
          border-left: 4px solid #f59e0b;
        }
        .stat-card.error {
          border-left: 4px solid #ef4444;
        }
        .stat-icon {
          font-size: 28px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--admin-text);
        }
        .stat-label {
          font-size: 12px;
          color: var(--admin-text-muted);
        }
        .section {
          margin-bottom: 24px;
        }
        .section h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 12px 0;
        }
        .provider-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .provider-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: var(--admin-inner-bg);
          border-radius: 8px;
        }
        .provider-icon {
          font-size: 20px;
        }
        .provider-name {
          font-size: 14px;
          color: var(--admin-text);
          text-transform: capitalize;
        }
        .provider-count {
          background: var(--admin-accent);
          color: white;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .event-types-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .event-type-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: var(--admin-inner-bg);
          border-radius: 8px;
        }
        .event-type-name {
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--admin-text);
        }
        .event-type-count {
          font-size: 13px;
          font-weight: 600;
          color: var(--admin-text-muted);
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

function LogsTab() {
  const [providerFilter, setProviderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const { data: logs, loading, refetch } = useWebhookLogs(page, providerFilter || undefined, undefined, statusFilter || undefined);
  const { data: eventTypes } = useWebhookEventTypes();

  const handleRetry = async (logId: string) => {
    setRetrying(logId);
    try {
      await retryWebhook(logId);
      refetch();
    } catch (error) {
      console.error('Failed to retry webhook:', error);
    } finally {
      setRetrying(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'received': return '#3b82f6';
      case 'skipped': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return <div className="loading">Loading webhook logs...</div>;
  }

  return (
    <div className="logs-tab">
      <div className="logs-header">
        <div className="filters">
          <select value={providerFilter} onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}>
            <option value="">All Providers</option>
            <option value="stripe">Stripe</option>
            <option value="resend">Resend</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="received">Received</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
          <button onClick={refetch} className="refresh-btn">Refresh</button>
        </div>
      </div>

      <div className="logs-table">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Provider</th>
              <th>Event Type</th>
              <th>Status</th>
              <th>Event ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs?.logs.map((log) => (
              <tr key={log.id} className={selectedLog === log.id ? 'selected' : ''}>
                <td className="time-cell">
                  {new Date(log.received_at).toLocaleString()}
                </td>
                <td>
                  <span className="provider-badge">
                    {log.provider === 'stripe' ? '💳' : '✉️'} {log.provider}
                  </span>
                </td>
                <td className="event-type-cell">{log.event_type}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: `${getStatusColor(log.status)}20`, color: getStatusColor(log.status) }}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="event-id-cell">{log.event_id.substring(0, 20)}...</td>
                <td className="actions-cell">
                  <button
                    className="view-btn"
                    onClick={() => setSelectedLog(selectedLog === log.id ? null : log.id)}
                  >
                    {selectedLog === log.id ? 'Hide' : 'View'}
                  </button>
                  {(log.status === 'failed' || log.status === 'skipped') && log.provider === 'stripe' && (
                    <button
                      className="retry-btn"
                      onClick={() => handleRetry(log.id)}
                      disabled={retrying === log.id}
                    >
                      {retrying === log.id ? '...' : 'Retry'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLog && logs?.logs && (
        <div className="log-detail">
          <h4>Webhook Details</h4>
          {(() => {
            const log = logs.logs.find((l) => l.id === selectedLog);
            if (!log) return null;
            return (
              <>
                {log.error_message && (
                  <div className="error-message">
                    <strong>Error:</strong> {log.error_message}
                  </div>
                )}
                <div className="payload-section">
                  <strong>Payload:</strong>
                  <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {logs && logs.total > 50 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {Math.ceil(logs.total / 50)}</span>
          <button disabled={page >= Math.ceil(logs.total / 50)} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      <style jsx>{`
        .logs-tab {}
        .logs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .filters {
          display: flex;
          gap: 10px;
        }
        .filters select {
          padding: 8px 12px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          font-size: 13px;
        }
        .refresh-btn {
          padding: 8px 16px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }
        .logs-table {
          overflow-x: auto;
        }
        .logs-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .logs-table th,
        .logs-table td {
          padding: 12px 14px;
          text-align: left;
          border-bottom: 1px solid var(--admin-border);
        }
        .logs-table th {
          font-size: 11px;
          font-weight: 600;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          background: var(--admin-inner-bg);
        }
        .logs-table td {
          font-size: 13px;
          color: var(--admin-text);
        }
        .logs-table tr.selected {
          background: rgba(16, 185, 129, 0.05);
        }
        .time-cell {
          font-size: 12px;
          color: var(--admin-text-muted);
          white-space: nowrap;
        }
        .provider-badge {
          font-size: 12px;
          text-transform: capitalize;
        }
        .event-type-cell {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .event-id-cell {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--admin-text-dim);
        }
        .actions-cell {
          display: flex;
          gap: 6px;
        }
        .view-btn,
        .retry-btn {
          padding: 4px 10px;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
        }
        .view-btn {
          background: var(--admin-inner-bg);
          color: var(--admin-text);
        }
        .retry-btn {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }
        .retry-btn:disabled {
          opacity: 0.5;
        }
        .log-detail {
          margin-top: 20px;
          padding: 20px;
          background: var(--admin-inner-bg);
          border-radius: 10px;
        }
        .log-detail h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 16px 0;
        }
        .error-message {
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: #ef4444;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .payload-section strong {
          display: block;
          margin-bottom: 8px;
          font-size: 12px;
          color: var(--admin-text-muted);
        }
        .payload-section pre {
          padding: 16px;
          background: var(--admin-card);
          border-radius: 8px;
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--admin-text);
          overflow-x: auto;
          max-height: 400px;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
        }
        .pagination button {
          padding: 8px 16px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          cursor: pointer;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

function SubscriptionEventsTab() {
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const { data: events, loading } = useSubscriptionEvents(page, undefined, undefined, eventTypeFilter || undefined);

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created':
      case 'activated':
        return '#10b981';
      case 'cancelled':
      case 'payment_failed':
        return '#ef4444';
      case 'updated':
      case 'renewed':
        return '#3b82f6';
      case 'trial_started':
      case 'trial_ended':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return <div className="loading">Loading subscription events...</div>;
  }

  return (
    <div className="sub-events-tab">
      <div className="events-header">
        <h3>Subscription Lifecycle Events</h3>
        <select value={eventTypeFilter} onChange={(e) => { setEventTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Event Types</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="activated">Activated</option>
          <option value="cancelled">Cancelled</option>
          <option value="trial_started">Trial Started</option>
          <option value="trial_ended">Trial Ended</option>
          <option value="renewed">Renewed</option>
          <option value="payment_failed">Payment Failed</option>
          <option value="payment_succeeded">Payment Succeeded</option>
        </select>
      </div>

      {events?.events.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>No subscription events found</p>
        </div>
      ) : (
        <div className="events-list">
          {events?.events.map((event) => (
            <div key={event.id} className="event-item">
              <div className="event-time">
                {new Date(event.created_at).toLocaleString()}
              </div>
              <div className="event-content">
                <div className="event-header">
                  <span
                    className="event-badge"
                    style={{ backgroundColor: `${getEventColor(event.event_type)}20`, color: getEventColor(event.event_type) }}
                  >
                    {event.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="triggered-by">via {event.triggered_by}</span>
                </div>
                <div className="event-details">
                  {event.plan_before && event.plan_after && event.plan_before !== event.plan_after && (
                    <span className="plan-change">
                      Plan: {event.plan_before} → {event.plan_after}
                    </span>
                  )}
                  {event.status_before && event.status_after && event.status_before !== event.status_after && (
                    <span className="status-change">
                      Status: {event.status_before} → {event.status_after}
                    </span>
                  )}
                  {event.mrr_delta_cents !== 0 && (
                    <span className={`mrr-delta ${event.mrr_delta_cents > 0 ? 'positive' : 'negative'}`}>
                      MRR: {event.mrr_delta_cents > 0 ? '+' : ''}{(event.mrr_delta_cents / 100).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="event-ids">
                  <span>Subscription: {event.subscription_id.substring(0, 8)}...</span>
                  <span>Org: {event.organization_id.substring(0, 8)}...</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {events && events.total > 50 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {Math.ceil(events.total / 50)}</span>
          <button disabled={page >= Math.ceil(events.total / 50)} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      <style jsx>{`
        .sub-events-tab {}
        .events-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .events-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .events-header select {
          padding: 8px 12px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          font-size: 13px;
        }
        .empty-state {
          text-align: center;
          padding: 60px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
        }
        .empty-icon {
          display: block;
          font-size: 40px;
          margin-bottom: 16px;
        }
        .empty-state p {
          color: var(--admin-text-muted);
          margin: 0;
        }
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .event-item {
          display: flex;
          gap: 20px;
          padding: 16px;
          background: var(--admin-inner-bg);
          border-radius: 10px;
        }
        .event-time {
          flex-shrink: 0;
          width: 150px;
          font-size: 12px;
          color: var(--admin-text-dim);
        }
        .event-content {
          flex: 1;
        }
        .event-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .event-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .triggered-by {
          font-size: 12px;
          color: var(--admin-text-dim);
        }
        .event-details {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 8px;
        }
        .plan-change,
        .status-change {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .mrr-delta {
          font-size: 13px;
          font-weight: 600;
        }
        .mrr-delta.positive {
          color: #10b981;
        }
        .mrr-delta.negative {
          color: #ef4444;
        }
        .event-ids {
          display: flex;
          gap: 16px;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--admin-text-dim);
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
        }
        .pagination button {
          padding: 8px 16px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          cursor: pointer;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

export default function WebhooksPage() {
  const [activeTab, setActiveTab] = useState<TabType>('logs');

  const tabs = [
    { id: 'logs' as TabType, label: 'Webhook Logs', icon: '📨' },
    { id: 'stats' as TabType, label: 'Statistics', icon: '📊' },
    { id: 'subscription-events' as TabType, label: 'Subscription Events', icon: '💳' },
  ];

  return (
    <div className="webhooks-page">
      <h1 className="page-title">Webhooks</h1>
      <p className="page-subtitle">Monitor incoming webhooks from Stripe, Resend, and other providers.</p>

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
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'subscription-events' && <SubscriptionEventsTab />}
      </div>

      <style jsx>{`
        .webhooks-page {
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
          flex-wrap: wrap;
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
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--admin-text-muted);
          font-size: 13px;
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
          font-size: 14px;
        }
        .tab-content {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 24px;
        }

        @media (max-width: 768px) {
          .page-title { font-size: 20px; }
          .page-subtitle { margin-bottom: 16px; }
          .tab-nav {
            width: 100%;
            gap: 4px;
            margin-bottom: 16px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .tab-btn {
            padding: 8px 12px;
            font-size: 12px;
            gap: 6px;
            white-space: nowrap;
          }
          .tab-icon { font-size: 13px; }
          .tab-content { padding: 16px; }
        }
      `}</style>
    </div>
  );
}
