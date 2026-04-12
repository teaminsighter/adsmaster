'use client';

import { RefreshCw, Search, Users, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function AdminSubscriptionsPage() {
  // Placeholder stats
  const stats = [
    { label: 'Active', value: 847, trend: '+12%', color: '#10b981' },
    { label: 'Trialing', value: 156, trend: '+8%', color: '#3b82f6' },
    { label: 'Past Due', value: 23, trend: '-5%', color: '#f59e0b' },
    { label: 'Churned (30d)', value: 18, trend: '-2%', color: '#ef4444' },
  ];

  // Placeholder subscriptions
  const subscriptions = [
    { id: 1, org: 'Acme Corp', plan: 'Agency', mrr: 299, status: 'active', trialEnd: null, nextBilling: '2024-02-15' },
    { id: 2, org: 'TechStart Inc', plan: 'Growth', mrr: 149, status: 'active', trialEnd: null, nextBilling: '2024-02-18' },
    { id: 3, org: 'NewCo LLC', plan: 'Starter', mrr: 49, status: 'trialing', trialEnd: '2024-02-10', nextBilling: null },
    { id: 4, org: 'BigBrand Co', plan: 'Enterprise', mrr: 499, status: 'past_due', trialEnd: null, nextBilling: '2024-01-30' },
    { id: 5, org: 'SmallBiz', plan: 'Starter', mrr: 49, status: 'active', trialEnd: null, nextBilling: '2024-02-20' },
  ];

  return (
    <div className="subscriptions-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Subscriptions</h1>
          <span className="page-subtitle">Manage subscription lifecycle and billing</span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-trend ${stat.trend.startsWith('+') ? 'positive' : 'negative'}`}>
              {stat.trend.startsWith('+') ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {stat.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className="tab active">All Subscriptions</button>
        <button className="tab">Active</button>
        <button className="tab">Trialing</button>
        <button className="tab">Past Due</button>
        <button className="tab">Cancelled</button>
      </div>

      {/* Search */}
      <div className="search-bar">
        <Search size={18} />
        <input type="text" placeholder="Search by organization name..." />
      </div>

      {/* Subscriptions Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Plan</th>
              <th>MRR</th>
              <th>Status</th>
              <th>Trial / Next Billing</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => (
              <tr key={sub.id}>
                <td className="org-cell">
                  <Users size={16} />
                  {sub.org}
                </td>
                <td>
                  <span className="plan-badge">{sub.plan}</span>
                </td>
                <td className="mrr">${sub.mrr}/mo</td>
                <td>
                  <span className={`status-badge ${sub.status.replace('_', '-')}`}>
                    {sub.status === 'past_due' && <AlertTriangle size={12} />}
                    {sub.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="date-cell">
                  {sub.trialEnd ? `Trial ends ${sub.trialEnd}` : sub.nextBilling}
                </td>
                <td>
                  <div className="actions">
                    <button className="action-btn">View</button>
                    <button className="action-btn">Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .subscriptions-page {
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
          text-align: center;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          line-height: 1;
        }

        .stat-label {
          font-size: 14px;
          color: var(--admin-text-muted);
          margin-top: 8px;
        }

        .stat-trend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          margin-top: 8px;
          padding: 4px 8px;
          border-radius: 12px;
        }

        .stat-trend.positive {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .stat-trend.negative {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
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

        .search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          color: var(--admin-text-muted);
        }

        .search-bar input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          font-size: 14px;
          color: var(--admin-text);
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

        .org-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
          color: var(--admin-text);
        }

        .plan-badge {
          padding: 4px 10px;
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .mrr {
          font-weight: 600;
          color: #10b981;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .status-badge.trialing {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .status-badge.past-due {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .date-cell {
          color: var(--admin-text-muted);
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
            font-size: 24px;
          }

          .table-container {
            overflow-x: auto;
          }

          .data-table {
            min-width: 700px;
          }
        }
      `}</style>
    </div>
  );
}
