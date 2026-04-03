'use client';

import { useState } from 'react';
import { useAuditLogs } from '@/lib/hooks/useAdminApi';

const actionTypes = [
  { value: '', label: 'All Actions' },
  { value: 'user.suspend', label: 'User Suspended' },
  { value: 'user.activate', label: 'User Activated' },
  { value: 'org.plan_update', label: 'Plan Updated' },
  { value: 'config.update', label: 'Config Updated' },
  { value: 'admin.login', label: 'Admin Login' },
  { value: 'admin.logout', label: 'Admin Logout' },
];

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');

  const { data, loading, error, refetch } = useAuditLogs(page, action, resourceType);

  const formatAction = (actionStr: string) => {
    const parts = actionStr.split('.');
    if (parts.length === 2) {
      return `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} ${parts[1].replace('_', ' ')}`;
    }
    return actionStr;
  };

  const getActionIcon = (actionStr: string) => {
    if (actionStr.includes('login')) return '🔑';
    if (actionStr.includes('logout')) return '🚪';
    if (actionStr.includes('suspend')) return '⛔';
    if (actionStr.includes('activate')) return '✅';
    if (actionStr.includes('plan')) return '💳';
    if (actionStr.includes('config')) return '⚙️';
    if (actionStr.includes('create')) return '➕';
    if (actionStr.includes('delete')) return '🗑️';
    return '📝';
  };

  return (
    <div className="audit-logs-page">
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <span className="page-count">{data?.total || 0} entries</span>
      </div>

      {/* Filters */}
      <div className="filters">
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="filter-select"
        >
          {actionTypes.map(a => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
        <select
          value={resourceType}
          onChange={(e) => { setResourceType(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Resources</option>
          <option value="user">User</option>
          <option value="organization">Organization</option>
          <option value="config">Config</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={() => refetch()} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="loading">Loading audit logs...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : (
        <>
          <div className="logs-list">
            {data?.logs.map((log) => (
              <div key={log.id} className="log-item">
                <div className="log-icon">{getActionIcon(log.action)}</div>
                <div className="log-content">
                  <div className="log-header">
                    <span className="log-action">{formatAction(log.action)}</span>
                    {log.resource_type && (
                      <span className="log-resource">
                        on {log.resource_type}
                        {log.resource_id && ` (${log.resource_id.slice(0, 8)}...)`}
                      </span>
                    )}
                  </div>
                  <div className="log-meta">
                    <span className="log-admin">
                      {log.admin_users?.email || 'System'}
                    </span>
                    <span className="log-separator">•</span>
                    <span className="log-time">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                    {log.ip_address && (
                      <>
                        <span className="log-separator">•</span>
                        <span className="log-ip">{log.ip_address}</span>
                      </>
                    )}
                  </div>
                  {(log.old_value !== null || log.new_value !== null) && (
                    <div className="log-changes">
                      {log.old_value !== null && (
                        <div className="change old">
                          <span className="change-label">Before:</span>
                          <code className="change-value">
                            {JSON.stringify(log.old_value, null, 2)}
                          </code>
                        </div>
                      )}
                      {log.new_value !== null && (
                        <div className="change new">
                          <span className="change-label">After:</span>
                          <code className="change-value">
                            {JSON.stringify(log.new_value, null, 2)}
                          </code>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {!data?.logs.length && (
              <div className="empty">No audit logs found</div>
            )}
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="page-btn"
              >
                ← Previous
              </button>
              <span className="page-info">
                Page {page} of {data.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="page-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .audit-logs-page {
          max-width: 1000px;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0;
        }

        .page-count {
          font-size: 14px;
          color: #64748b;
          background: #334155;
          padding: 4px 12px;
          border-radius: 12px;
        }

        .filters {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .filter-select {
          padding: 10px 16px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 14px;
          outline: none;
          cursor: pointer;
        }

        .refresh-btn {
          padding: 10px 16px;
          background: #334155;
          border: none;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 14px;
          cursor: pointer;
          margin-left: auto;
        }

        .refresh-btn:hover {
          background: #475569;
        }

        .loading, .error, .empty {
          padding: 40px;
          text-align: center;
          color: #94a3b8;
        }

        .error {
          color: #f87171;
        }

        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .log-item {
          display: flex;
          gap: 16px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px;
        }

        .log-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
          flex-shrink: 0;
        }

        .log-content {
          flex: 1;
          min-width: 0;
        }

        .log-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }

        .log-action {
          font-weight: 600;
          color: #f1f5f9;
          font-size: 14px;
        }

        .log-resource {
          font-size: 13px;
          color: #94a3b8;
        }

        .log-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .log-admin {
          font-size: 13px;
          color: #10b981;
        }

        .log-separator {
          color: #475569;
        }

        .log-time {
          font-size: 13px;
          color: #64748b;
        }

        .log-ip {
          font-size: 12px;
          color: #64748b;
          font-family: monospace;
        }

        .log-changes {
          margin-top: 12px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .change {
          flex: 1;
          min-width: 200px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 10px;
        }

        .change.old {
          border-left: 3px solid #f87171;
        }

        .change.new {
          border-left: 3px solid #10b981;
        }

        .change-label {
          display: block;
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .change-value {
          display: block;
          font-size: 12px;
          color: #e2e8f0;
          font-family: monospace;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 24px;
        }

        .page-btn {
          padding: 8px 16px;
          background: #334155;
          border: none;
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 14px;
          cursor: pointer;
        }

        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-btn:hover:not(:disabled) {
          background: #475569;
        }

        .page-info {
          font-size: 14px;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
