'use client';

import { Lightbulb, Search, CheckCircle, Clock, XCircle, TrendingUp, Zap, DollarSign } from 'lucide-react';

export default function AdminRecommendationsPage() {
  // Placeholder stats
  const stats = [
    { label: 'Pending', value: 234, icon: Clock, color: '#f59e0b' },
    { label: 'Applied', value: 1892, icon: CheckCircle, color: '#10b981' },
    { label: 'Dismissed', value: 156, icon: XCircle, color: '#ef4444' },
    { label: 'Savings Generated', value: '$12.4K', icon: DollarSign, color: '#3b82f6' },
  ];

  // Placeholder recommendation rules
  const rules = [
    { id: 1, name: 'Low CTR Keywords', type: 'keyword', enabled: true, autoApply: false, confidence: 0.85, appliedCount: 234 },
    { id: 2, name: 'High CPA Campaigns', type: 'campaign', enabled: true, autoApply: false, confidence: 0.90, appliedCount: 156 },
    { id: 3, name: 'Budget Optimization', type: 'budget', enabled: true, autoApply: true, confidence: 0.95, appliedCount: 89 },
    { id: 4, name: 'Underperforming Ads', type: 'ad', enabled: false, autoApply: false, confidence: 0.80, appliedCount: 45 },
    { id: 5, name: 'Negative Keywords', type: 'keyword', enabled: true, autoApply: false, confidence: 0.88, appliedCount: 312 },
  ];

  return (
    <div className="recommendations-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">AI Recommendations</h1>
          <span className="page-subtitle">Manage recommendation rules and monitor performance</span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <Icon size={24} style={{ color: stat.color }} />
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className="tab active">
          <Zap size={16} />
          Rules
        </button>
        <button className="tab">
          <Clock size={16} />
          Pending Queue
        </button>
        <button className="tab">
          <CheckCircle size={16} />
          Applied
        </button>
        <button className="tab">
          <TrendingUp size={16} />
          Analytics
        </button>
      </div>

      {/* Rules Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rule Name</th>
              <th>Type</th>
              <th>Confidence</th>
              <th>Auto-Apply</th>
              <th>Applied Count</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="rule-name">
                  <Lightbulb size={16} />
                  {rule.name}
                </td>
                <td>
                  <span className="type-badge">{rule.type}</span>
                </td>
                <td className="confidence">{(rule.confidence * 100).toFixed(0)}%</td>
                <td>
                  <span className={`auto-badge ${rule.autoApply ? 'enabled' : 'disabled'}`}>
                    {rule.autoApply ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="count">{rule.appliedCount}</td>
                <td>
                  <label className="toggle">
                    <input type="checkbox" checked={rule.enabled} readOnly />
                    <span className="slider"></span>
                  </label>
                </td>
                <td>
                  <div className="actions">
                    <button className="action-btn">Configure</button>
                    <button className="action-btn">Test</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .recommendations-page {
          max-width: 1400px;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 4px 0;
        }

        .page-subtitle {
          font-size: 14px;
          color: var(--admin-text-muted);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          line-height: 1;
        }

        .stat-label {
          font-size: 13px;
          color: var(--admin-text-muted);
        }

        .tabs {
          display: flex;
          gap: 4px;
          background: var(--admin-inner-bg);
          padding: 4px;
          border-radius: 10px;
          margin-bottom: 20px;
          overflow-x: auto;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--admin-text-muted);
          font-size: 14px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }

        .tab:hover {
          color: var(--admin-text);
        }

        .tab.active {
          background: var(--admin-card);
          color: #10b981;
        }

        .table-container {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          overflow: hidden;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          text-align: left;
          padding: 14px 16px;
          font-size: 12px;
          font-weight: 600;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          background: var(--admin-inner-bg);
          border-bottom: 1px solid var(--admin-border);
        }

        .data-table td {
          padding: 14px 16px;
          font-size: 14px;
          border-bottom: 1px solid var(--admin-border);
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .data-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .rule-name {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
          color: var(--admin-text);
        }

        .type-badge {
          padding: 4px 10px;
          background: rgba(139, 92, 246, 0.15);
          color: #a78bfa;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .confidence {
          font-weight: 600;
          color: #10b981;
        }

        .auto-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .auto-badge.enabled {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .auto-badge.disabled {
          background: rgba(100, 116, 139, 0.15);
          color: #94a3b8;
        }

        .count {
          color: var(--admin-text-muted);
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #334155;
          transition: 0.2s;
          border-radius: 24px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background: white;
          transition: 0.2s;
          border-radius: 50%;
        }

        .toggle input:checked + .slider {
          background: #10b981;
        }

        .toggle input:checked + .slider:before {
          transform: translateX(20px);
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 6px 12px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text-muted);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .action-btn:hover {
          border-color: #10b981;
          color: #10b981;
        }

        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .stat-card {
            padding: 16px;
          }

          .stat-value {
            font-size: 22px;
          }

          .table-container {
            overflow-x: auto;
          }

          .data-table {
            min-width: 800px;
          }
        }
      `}</style>
    </div>
  );
}
