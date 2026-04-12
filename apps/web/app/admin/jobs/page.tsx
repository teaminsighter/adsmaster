'use client';

import { Cog, Play, Pause, RotateCcw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

export default function AdminJobsPage() {
  // Placeholder stats
  const stats = [
    { label: 'Running', value: 3, icon: Loader2, color: '#3b82f6' },
    { label: 'Queued', value: 12, icon: Clock, color: '#f59e0b' },
    { label: 'Completed (24h)', value: 847, icon: CheckCircle, color: '#10b981' },
    { label: 'Failed (24h)', value: 2, icon: XCircle, color: '#ef4444' },
  ];

  // Placeholder jobs
  const jobs = [
    { id: 1, name: 'sync_google_ads', status: 'running', started: '2 min ago', duration: '2m 15s', account: 'Acme Corp' },
    { id: 2, name: 'sync_meta_ads', status: 'running', started: '5 min ago', duration: '5m 32s', account: 'TechStart' },
    { id: 3, name: 'generate_recommendations', status: 'running', started: '1 min ago', duration: '1m 05s', account: 'All' },
    { id: 4, name: 'refresh_tokens', status: 'queued', started: '-', duration: '-', account: 'All' },
    { id: 5, name: 'daily_reconciliation', status: 'completed', started: '1 hour ago', duration: '12m 45s', account: 'All' },
    { id: 6, name: 'sync_google_ads', status: 'failed', started: '2 hours ago', duration: '3m 22s', account: 'BigBrand' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 size={16} className="spin" />;
      case 'queued':
        return <Clock size={16} />;
      case 'completed':
        return <CheckCircle size={16} />;
      case 'failed':
        return <XCircle size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="jobs-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Background Jobs</h1>
          <span className="page-subtitle">Monitor and manage background workers</span>
        </div>
        <button className="trigger-btn">
          <Play size={18} />
          Trigger Job
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <Icon size={24} style={{ color: stat.color }} className={stat.label === 'Running' ? 'spin' : ''} />
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className="tab active">All Jobs</button>
        <button className="tab">Running</button>
        <button className="tab">Queued</button>
        <button className="tab">Completed</button>
        <button className="tab">Failed</button>
      </div>

      {/* Jobs Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Job Name</th>
              <th>Status</th>
              <th>Account</th>
              <th>Started</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="job-name">
                  <Cog size={16} />
                  {job.name}
                </td>
                <td>
                  <span className={`status-badge ${job.status}`}>
                    {getStatusIcon(job.status)}
                    {job.status}
                  </span>
                </td>
                <td className="account">{job.account}</td>
                <td className="time">{job.started}</td>
                <td className="duration">{job.duration}</td>
                <td>
                  <div className="actions">
                    {job.status === 'running' && (
                      <button className="action-btn" title="Cancel">
                        <Pause size={14} />
                      </button>
                    )}
                    {job.status === 'failed' && (
                      <button className="action-btn retry" title="Retry">
                        <RotateCcw size={14} />
                      </button>
                    )}
                    {job.status === 'queued' && (
                      <button className="action-btn" title="Run Now">
                        <Play size={14} />
                      </button>
                    )}
                    <button className="action-btn">View</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .jobs-page {
          max-width: 1400px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }

        .page-subtitle {
          font-size: 14px;
          color: var(--admin-text-muted);
        }

        .trigger-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }

        .trigger-btn:hover {
          background: #059669;
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
          font-size: 32px;
          font-weight: 700;
          line-height: 1;
        }

        .stat-label {
          font-size: 13px;
          color: var(--admin-text-muted);
        }

        :global(.spin) {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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

        .job-name {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: monospace;
          font-weight: 500;
          color: var(--admin-text);
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

        .status-badge.running {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .status-badge.queued {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .status-badge.completed {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .status-badge.failed {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .account {
          color: var(--admin-text-muted);
        }

        .time {
          color: var(--admin-text-muted);
        }

        .duration {
          font-family: monospace;
          color: var(--admin-text-muted);
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
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

        .action-btn.retry:hover {
          border-color: #f59e0b;
          color: #f59e0b;
        }

        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .trigger-btn {
            width: 100%;
            justify-content: center;
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
