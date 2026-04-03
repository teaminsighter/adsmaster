'use client';

import { useState, useMemo } from 'react';
import { useApiUsage } from '@/lib/hooks/useAdminApi';
import DateRangePicker, { DateRange } from '@/components/admin/DateRangePicker';
import { useAdminTheme } from '@/lib/contexts/AdminThemeContext';

export default function AdminApiUsagePage() {
  const { theme } = useAdminTheme();
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return { start, end };
  });

  // Calculate days from date range
  const days = useMemo(() => {
    const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [dateRange]);

  const { data, loading, error, refetch } = useApiUsage(days);

  return (
    <div className="api-usage-page">
      <div className="page-header">
        <h1 className="page-title">API Usage</h1>
        <div className="header-actions">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            theme={theme}
          />
          <button onClick={() => refetch()} className="refresh-btn">🔄 Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading API usage...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-value">{(data?.total_requests || 0).toLocaleString()}</div>
              <div className="stat-label">Total Requests</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-value error">{data?.error_count || 0}</div>
              <div className="stat-label">Errors ({data?.error_rate || 0}%)</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚡</div>
              <div className="stat-value">{data?.avg_response_time_ms || 0}ms</div>
              <div className="stat-label">Avg Response Time</div>
            </div>
          </div>

          {/* By Status */}
          <div className="panel">
            <h2 className="panel-title">Response Status Codes</h2>
            <div className="status-grid">
              {Object.entries(data?.by_status || {}).map(([status, count]) => (
                <div key={status} className={`status-item status-${status.charAt(0)}`}>
                  <span className="status-code">{status}</span>
                  <span className="status-count">{count}</span>
                </div>
              ))}
              {!Object.keys(data?.by_status || {}).length && (
                <div className="empty">No data</div>
              )}
            </div>
          </div>

          {/* By Endpoint */}
          <div className="panel">
            <h2 className="panel-title">Top Endpoints</h2>
            <div className="endpoints-list">
              {Object.entries(data?.by_endpoint || {}).slice(0, 15).map(([endpoint, count]) => (
                <div key={endpoint} className="endpoint-item">
                  <span className="endpoint-path">{endpoint}</span>
                  <span className="endpoint-count">{count}</span>
                </div>
              ))}
              {!Object.keys(data?.by_endpoint || {}).length && (
                <div className="empty">No endpoint data</div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .api-usage-page {
          max-width: 1000px;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .period-select {
          padding: 10px 16px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 14px;
        }

        .refresh-btn {
          padding: 10px 16px;
          background: #334155;
          border: none;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 14px;
          cursor: pointer;
        }

        .loading, .error {
          padding: 40px;
          text-align: center;
          color: #94a3b8;
        }

        .error {
          color: #f87171;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }

        .stat-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #10b981;
        }

        .stat-value.error {
          color: #f87171;
        }

        .stat-label {
          font-size: 14px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .panel {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .panel-title {
          font-size: 16px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 16px 0;
        }

        .status-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.2);
        }

        .status-item.status-2 {
          border-left: 3px solid #10b981;
        }

        .status-item.status-3 {
          border-left: 3px solid #60a5fa;
        }

        .status-item.status-4 {
          border-left: 3px solid #f59e0b;
        }

        .status-item.status-5 {
          border-left: 3px solid #f87171;
        }

        .status-code {
          font-family: monospace;
          font-size: 14px;
          color: #e2e8f0;
        }

        .status-count {
          font-size: 14px;
          color: #94a3b8;
        }

        .endpoints-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .endpoint-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .endpoint-path {
          font-family: monospace;
          font-size: 13px;
          color: #e2e8f0;
        }

        .endpoint-count {
          font-size: 14px;
          color: #10b981;
          font-weight: 600;
        }

        .empty {
          text-align: center;
          color: #64748b;
          padding: 20px;
        }
      `}</style>
    </div>
  );
}
