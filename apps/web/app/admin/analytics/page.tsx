'use client';

import { useState } from 'react';
import { useAnalyticsOverview, usePageViewAnalytics } from '@/lib/hooks/useAdminApi';

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data: overview, loading: overviewLoading } = useAnalyticsOverview(days);
  const { data: pageViews, loading: pageViewsLoading } = usePageViewAnalytics(7);

  const loading = overviewLoading || pageViewsLoading;

  // Convert signups data to chart format
  const signupDates = Object.keys(overview?.user_signups || {}).sort();
  const maxSignups = Math.max(...Object.values(overview?.user_signups || { '': 1 }));

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="period-select"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading analytics...</div>
      ) : (
        <>
          {/* User Signups Chart */}
          <div className="panel">
            <h2 className="panel-title">User Signups ({days} days)</h2>
            <div className="stat-row">
              <div className="stat-big">
                <span className="stat-number">{overview?.total_signups || 0}</span>
                <span className="stat-label">Total Signups</span>
              </div>
            </div>
            <div className="chart-container">
              {signupDates.length > 0 ? (
                <div className="bar-chart">
                  {signupDates.map(date => (
                    <div key={date} className="bar-item">
                      <div
                        className="bar"
                        style={{ height: `${((overview?.user_signups[date] || 0) / maxSignups) * 100}%` }}
                      />
                      <span className="bar-label">{date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-chart">No data for this period</div>
              )}
            </div>
          </div>

          {/* Page Views */}
          <div className="panel">
            <h2 className="panel-title">Top Pages (7 days)</h2>
            <div className="stat-row">
              <div className="stat-big">
                <span className="stat-number">{pageViews?.total_views || 0}</span>
                <span className="stat-label">Total Page Views</span>
              </div>
            </div>
            <div className="pages-list">
              {pageViews?.top_pages?.map((p, i) => (
                <div key={p.page} className="page-item">
                  <span className="page-rank">#{i + 1}</span>
                  <span className="page-path">{p.page}</span>
                  <span className="page-views">{p.views} views</span>
                </div>
              ))}
              {!pageViews?.top_pages?.length && (
                <div className="empty-list">No page view data</div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .analytics-page {
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

        .period-select {
          padding: 10px 16px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 14px;
        }

        .loading {
          padding: 40px;
          text-align: center;
          color: #94a3b8;
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

        .stat-row {
          margin-bottom: 20px;
        }

        .stat-big {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .stat-number {
          font-size: 36px;
          font-weight: 700;
          color: #10b981;
        }

        .stat-label {
          font-size: 14px;
          color: #94a3b8;
        }

        .chart-container {
          height: 200px;
        }

        .bar-chart {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 100%;
          padding-top: 20px;
        }

        .bar-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }

        .bar {
          width: 100%;
          max-width: 30px;
          background: linear-gradient(180deg, #10b981, rgba(16, 185, 129, 0.3));
          border-radius: 4px 4px 0 0;
          min-height: 4px;
        }

        .bar-label {
          font-size: 10px;
          color: #64748b;
          margin-top: 8px;
        }

        .empty-chart {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #64748b;
        }

        .pages-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .page-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .page-rank {
          font-size: 12px;
          color: #64748b;
          width: 30px;
        }

        .page-path {
          flex: 1;
          font-family: monospace;
          font-size: 13px;
          color: #e2e8f0;
        }

        .page-views {
          font-size: 13px;
          color: #10b981;
        }

        .empty-list {
          text-align: center;
          color: #64748b;
          padding: 20px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .page-header { flex-direction: column; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
          .page-title { font-size: 20px; }
          .date-select { width: 100%; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .chart-panel { padding: 16px; margin-bottom: 16px; }
          .chart-container { height: 180px; }
          .page-item { padding: 10px; gap: 8px; }
          .page-path { font-size: 12px; }
        }
      `}</style>
    </div>
  );
}
