'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useAdAccounts,
  useTokenHealth,
  useExpiringTokens,
  forceSyncAccount,
} from '@/lib/hooks/useAdminApi';

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 0) {
    // Future date
    const futureDays = Math.abs(diffDays);
    if (futureDays === 0) return 'Today';
    if (futureDays === 1) return 'Tomorrow';
    return `In ${futureDays} days`;
  }
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function HealthCard({ label, value, subValue, status }: {
  label: string;
  value: string | number;
  subValue?: string;
  status?: 'good' | 'warning' | 'danger';
}) {
  return (
    <div className={`health-card ${status || ''}`}>
      <div className="health-value">{value}</div>
      <div className="health-label">{label}</div>
      {subValue && <div className="health-sub">{subValue}</div>}
      <style jsx>{`
        .health-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .health-card.good { border-color: rgba(16, 185, 129, 0.3); }
        .health-card.warning { border-color: rgba(245, 158, 11, 0.3); }
        .health-card.danger { border-color: rgba(239, 68, 68, 0.3); }
        .health-value {
          font-size: 32px;
          font-weight: 700;
          color: #f1f5f9;
          line-height: 1.2;
        }
        .health-card.good .health-value { color: #10b981; }
        .health-card.warning .health-value { color: #f59e0b; }
        .health-card.danger .health-value { color: #f87171; }
        .health-label {
          font-size: 13px;
          color: #94a3b8;
          margin-top: 4px;
        }
        .health-sub {
          font-size: 11px;
          color: #64748b;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

export default function AdminAdAccountsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [tokenStatus, setTokenStatus] = useState('');
  const [search, setSearch] = useState('');
  const [syncLoading, setSyncLoading] = useState<string | null>(null);

  const { data: accounts, loading, error, refetch } = useAdAccounts(page, platform, status, tokenStatus, search);
  const { data: tokenHealth } = useTokenHealth();
  const { data: expiringAccounts } = useExpiringTokens(7);

  const handleSync = async (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncLoading(accountId);
    try {
      await forceSyncAccount(accountId);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to trigger sync');
    } finally {
      setSyncLoading(null);
    }
  };

  return (
    <div className="ad-accounts-page">
      <div className="page-header">
        <h1 className="page-title">Ad Accounts</h1>
        <span className="page-count">{accounts?.total || 0} total</span>
      </div>

      {/* Token Health Summary */}
      <div className="health-grid">
        <HealthCard
          label="Total Accounts"
          value={tokenHealth?.total_accounts || 0}
        />
        <HealthCard
          label="Healthy Tokens"
          value={`${tokenHealth?.healthy_percentage || 0}%`}
          subValue={`${tokenHealth?.by_status.valid || 0} accounts`}
          status="good"
        />
        <HealthCard
          label="Expiring Soon"
          value={tokenHealth?.by_status.expiring || 0}
          subValue="Needs refresh"
          status={tokenHealth?.by_status.expiring ? 'warning' : undefined}
        />
        <HealthCard
          label="Expired"
          value={tokenHealth?.by_status.expired || 0}
          subValue="Immediate action"
          status={tokenHealth?.by_status.expired ? 'danger' : undefined}
        />
      </div>

      {/* Expiring/Expired Alerts */}
      {expiringAccounts && expiringAccounts.total > 0 && (
        <div className="alerts-section">
          <h2 className="section-title">Accounts Needing Attention</h2>
          <div className="alerts-list">
            {expiringAccounts.accounts.map((acc) => (
              <div key={acc.id} className={`alert-item ${acc.token_status}`}>
                <div className="alert-icon">
                  {acc.token_status === 'expired' ? '🔴' : '🟡'}
                </div>
                <div className="alert-content">
                  <span className="alert-name">{acc.name}</span>
                  <span className="alert-org">{acc.organizations?.name || 'Unknown Org'}</span>
                </div>
                <div className="alert-meta">
                  <span className={`token-badge ${acc.token_status}`}>
                    {acc.token_status === 'expired' ? 'Expired' : 'Expiring'}
                  </span>
                  <span className="token-time">
                    {formatRelativeTime(acc.token_expires_at)}
                  </span>
                </div>
                <Link
                  href={`/admin/organizations/${acc.organization_id}`}
                  className="alert-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Org →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="search-input"
        />
        <select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Platforms</option>
          <option value="google">Google Ads</option>
          <option value="meta">Meta Ads</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="disabled">Disabled</option>
        </select>
        <select
          value={tokenStatus}
          onChange={(e) => { setTokenStatus(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Token Status</option>
          <option value="valid">Valid</option>
          <option value="expiring">Expiring</option>
          <option value="expired">Expired</option>
        </select>
        <button onClick={() => refetch()} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Accounts Table */}
      {loading ? (
        <div className="loading">Loading ad accounts...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Organization</th>
                  <th>Platform</th>
                  <th>Status</th>
                  <th>Token</th>
                  <th>Last Sync</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts?.ad_accounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className="clickable-row"
                    onClick={() => router.push(`/admin/organizations/${acc.organization_id}`)}
                  >
                    <td>
                      <div className="account-name">{acc.name}</div>
                      <div className="account-id">{acc.external_account_id}</div>
                    </td>
                    <td>
                      <div className="org-name">{acc.organizations?.name || 'Unknown'}</div>
                      <div className="org-plan">{acc.organizations?.plan || '—'}</div>
                    </td>
                    <td>
                      <span className={`platform-badge ${acc.platform}`}>
                        {acc.platform === 'google' ? '🔵 Google' : '🔷 Meta'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${acc.status}`}>
                        {acc.status}
                      </span>
                    </td>
                    <td>
                      <span className={`token-badge ${acc.token_status}`}>
                        {acc.token_status}
                      </span>
                    </td>
                    <td className="sync-cell">
                      {formatRelativeTime(acc.last_sync_at)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="action-buttons">
                        <button
                          onClick={(e) => handleSync(acc.id, e)}
                          disabled={syncLoading === acc.id}
                          className="sync-btn"
                        >
                          {syncLoading === acc.id ? '...' : '🔄 Sync'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!accounts?.ad_accounts.length && (
                  <tr>
                    <td colSpan={7} className="empty-cell">No ad accounts found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {accounts && accounts.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="page-btn"
              >
                ← Previous
              </button>
              <span className="page-info">
                Page {page} of {accounts.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(accounts.pages, p + 1))}
                disabled={page === accounts.pages}
                className="page-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .ad-accounts-page {
          max-width: 1400px;
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

        .health-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 12px 0;
        }

        .alerts-section {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .alert-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          border-left: 3px solid #f59e0b;
        }

        .alert-item.expired {
          border-left-color: #f87171;
        }

        .alert-icon {
          font-size: 18px;
        }

        .alert-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .alert-name {
          font-size: 14px;
          font-weight: 500;
          color: #e2e8f0;
        }

        .alert-org {
          font-size: 12px;
          color: #64748b;
        }

        .alert-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .token-time {
          font-size: 11px;
          color: #64748b;
        }

        .alert-link {
          font-size: 13px;
          color: #10b981;
          text-decoration: none;
        }

        .alert-link:hover {
          text-decoration: underline;
        }

        .filters {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
          max-width: 300px;
          padding: 10px 16px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 14px;
          outline: none;
        }

        .search-input:focus {
          border-color: #10b981;
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
        }

        .refresh-btn:hover {
          background: #475569;
        }

        .loading, .error {
          padding: 40px;
          text-align: center;
          color: #94a3b8;
        }

        .error {
          color: #f87171;
        }

        .table-container {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          overflow: hidden;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          padding: 14px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid #334155;
        }

        .data-table td {
          padding: 14px 16px;
          font-size: 14px;
          color: #e2e8f0;
          border-bottom: 1px solid #334155;
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .clickable-row {
          cursor: pointer;
        }

        .clickable-row:hover td {
          background: rgba(16, 185, 129, 0.05);
        }

        .account-name {
          font-weight: 500;
        }

        .account-id {
          font-size: 11px;
          color: #64748b;
          font-family: monospace;
        }

        .org-name {
          font-weight: 500;
        }

        .org-plan {
          font-size: 11px;
          color: #64748b;
          text-transform: capitalize;
        }

        .platform-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
        }

        .platform-badge.google {
          background: rgba(66, 133, 244, 0.15);
          color: #4285f4;
        }

        .platform-badge.meta {
          background: rgba(24, 119, 242, 0.15);
          color: #1877f2;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .status-badge.status-active {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .status-badge.status-paused {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .status-badge.status-disabled {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        .token-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .token-badge.valid {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .token-badge.expiring {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .token-badge.expired {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
        }

        .sync-cell {
          font-size: 13px;
          color: #94a3b8;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .sync-btn {
          padding: 6px 12px;
          background: rgba(59, 130, 246, 0.15);
          border: none;
          border-radius: 6px;
          color: #3b82f6;
          font-size: 12px;
          cursor: pointer;
        }

        .sync-btn:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.25);
        }

        .sync-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-cell {
          text-align: center;
          color: #64748b;
          padding: 40px !important;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 20px;
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

        @media (max-width: 1200px) {
          .health-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .health-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .page-header { flex-direction: column; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
          .page-title { font-size: 20px; }
          .filters { flex-direction: column; gap: 8px; }
          .filters select, .filters input, .filters button { width: 100%; }
          .table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .data-table { min-width: 600px; }
          .data-table th, .data-table td { padding: 10px 12px; font-size: 12px; }
          .pagination { flex-wrap: wrap; gap: 8px; }
        }
      `}</style>
    </div>
  );
}
