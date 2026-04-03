'use client';

import { useState } from 'react';
import { useAiUsage } from '@/lib/hooks/useAdminApi';

export default function AdminAiUsagePage() {
  const [days, setDays] = useState(7);
  const { data, loading, error, refetch } = useAiUsage(days);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div className="ai-usage-page">
      <div className="page-header">
        <h1 className="page-title">AI Usage & Costs</h1>
        <div className="header-actions">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="period-select"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button onClick={() => refetch()} className="refresh-btn">🔄 Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading AI usage...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🤖</div>
              <div className="stat-value">{(data?.total_requests || 0).toLocaleString()}</div>
              <div className="stat-label">Total Requests</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-value">{(data?.total_tokens || 0).toLocaleString()}</div>
              <div className="stat-label">Total Tokens</div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-icon">💰</div>
              <div className="stat-value">{formatCurrency(data?.total_cost_usd || 0)}</div>
              <div className="stat-label">Total Cost</div>
            </div>
          </div>

          {/* By Provider */}
          <div className="panel">
            <h2 className="panel-title">Usage by Provider</h2>
            <div className="provider-grid">
              {Object.entries(data?.by_provider || {}).map(([provider, stats]) => (
                <div key={provider} className="provider-card">
                  <div className="provider-header">
                    <span className="provider-icon">
                      {provider === 'gemini' ? '🌟' :
                       provider === 'openai' ? '🟢' :
                       provider === 'anthropic' ? '🟠' : '🔵'}
                    </span>
                    <span className="provider-name">{provider}</span>
                  </div>
                  <div className="provider-stats">
                    <div className="provider-stat">
                      <span className="label">Requests</span>
                      <span className="value">{stats.requests.toLocaleString()}</span>
                    </div>
                    <div className="provider-stat">
                      <span className="label">Tokens</span>
                      <span className="value">{stats.tokens.toLocaleString()}</span>
                    </div>
                    <div className="provider-stat">
                      <span className="label">Cost</span>
                      <span className="value cost">{formatCurrency(stats.cost)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {!Object.keys(data?.by_provider || {}).length && (
                <div className="empty">No AI usage data</div>
              )}
            </div>
          </div>

          {/* Daily Breakdown */}
          <div className="panel">
            <h2 className="panel-title">Daily Breakdown</h2>
            <div className="daily-list">
              {Object.entries(data?.by_date || {})
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([date, stats]) => (
                  <div key={date} className="daily-item">
                    <span className="daily-date">{date}</span>
                    <span className="daily-stat">{stats.requests} requests</span>
                    <span className="daily-stat">{stats.tokens.toLocaleString()} tokens</span>
                    <span className="daily-cost">{formatCurrency(stats.cost)}</span>
                  </div>
                ))}
              {!Object.keys(data?.by_date || {}).length && (
                <div className="empty">No daily data</div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .ai-usage-page {
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

        .period-select, .refresh-btn {
          padding: 10px 16px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 14px;
        }

        .refresh-btn {
          background: #334155;
          border: none;
          cursor: pointer;
        }

        .loading, .error, .empty {
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

        .stat-card.highlight {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.05);
        }

        .stat-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #f1f5f9;
        }

        .stat-card.highlight .stat-value {
          color: #10b981;
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

        .provider-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .provider-card {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 16px;
        }

        .provider-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .provider-icon {
          font-size: 24px;
        }

        .provider-name {
          font-size: 16px;
          font-weight: 600;
          color: #f1f5f9;
          text-transform: capitalize;
        }

        .provider-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .provider-stat {
          display: flex;
          justify-content: space-between;
        }

        .provider-stat .label {
          font-size: 13px;
          color: #94a3b8;
        }

        .provider-stat .value {
          font-size: 13px;
          color: #e2e8f0;
          font-weight: 500;
        }

        .provider-stat .value.cost {
          color: #10b981;
        }

        .daily-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .daily-item {
          display: grid;
          grid-template-columns: 100px 1fr 1fr 100px;
          gap: 16px;
          align-items: center;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .daily-date {
          font-size: 13px;
          color: #e2e8f0;
          font-weight: 500;
        }

        .daily-stat {
          font-size: 13px;
          color: #94a3b8;
        }

        .daily-cost {
          font-size: 13px;
          color: #10b981;
          font-weight: 600;
          text-align: right;
        }
      `}</style>
    </div>
  );
}
