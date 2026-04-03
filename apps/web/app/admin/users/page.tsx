'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminUsers, suspendUser, activateUser } from '@/lib/hooks/useAdminApi';

export default function AdminUsersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAdminUsers(page, search, status);

  const handleSuspend = async (userId: string) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;
    setActionLoading(userId);
    try {
      await suspendUser(userId);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to suspend user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (userId: string) => {
    setActionLoading(userId);
    try {
      await activateUser(userId);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to activate user');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <span className="page-count">{data?.total || 0} total</span>
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="search-input"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button onClick={() => refetch()} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading">Loading users...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.users.map((user) => (
                  <tr key={user.id} className="clickable-row" onClick={() => router.push(`/admin/users/${user.id}`)}>
                    <td className="email-cell">{user.email}</td>
                    <td>{user.name || '—'}</td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'active' : 'suspended'}`}>
                        {user.is_active ? '● Active' : '○ Suspended'}
                      </span>
                    </td>
                    <td className="date-cell">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="date-cell">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td>
                      <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                        {user.is_active ? (
                          <button
                            onClick={() => handleSuspend(user.id)}
                            disabled={actionLoading === user.id}
                            className="action-btn suspend"
                          >
                            {actionLoading === user.id ? '...' : 'Suspend'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(user.id)}
                            disabled={actionLoading === user.id}
                            className="action-btn activate"
                          >
                            {actionLoading === user.id ? '...' : 'Activate'}
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                          className="action-btn view"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.users.length && (
                  <tr>
                    <td colSpan={6} className="empty-cell">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
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
        .users-page {
          max-width: 1200px;
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
          color: var(--admin-text);
          margin: 0;
        }

        .page-count {
          font-size: 14px;
          color: var(--admin-text-muted);
          background: var(--admin-inner-bg);
          padding: 4px 12px;
          border-radius: 12px;
        }

        .filters {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .search-input {
          flex: 1;
          max-width: 300px;
          padding: 10px 16px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
          outline: none;
        }

        .search-input::placeholder {
          color: var(--admin-text-dim);
        }

        .search-input:focus {
          border-color: var(--admin-accent);
        }

        .filter-select {
          padding: 10px 16px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
          outline: none;
          cursor: pointer;
        }

        .refresh-btn {
          padding: 10px 16px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .refresh-btn:hover {
          background: var(--admin-card-hover);
          border-color: var(--admin-accent);
        }

        .loading, .error {
          padding: 40px;
          text-align: center;
          color: var(--admin-text-muted);
        }

        .error {
          color: var(--admin-error);
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
          padding: 14px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: var(--admin-inner-bg);
          border-bottom: 1px solid var(--admin-border);
        }

        .data-table td {
          padding: 14px 16px;
          font-size: 14px;
          color: var(--admin-text);
          border-bottom: 1px solid var(--admin-border);
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .clickable-row {
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .clickable-row:hover td {
          background: var(--admin-card-hover);
        }

        .email-cell {
          font-family: monospace;
          font-size: 13px;
        }

        .date-cell {
          font-size: 13px;
          color: var(--admin-text-muted);
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.15);
          color: var(--admin-accent);
        }

        .status-badge.suspended {
          background: rgba(239, 68, 68, 0.15);
          color: var(--admin-error);
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-btn.suspend {
          background: rgba(239, 68, 68, 0.15);
          color: var(--admin-error);
        }

        .action-btn.suspend:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.25);
        }

        .action-btn.activate {
          background: rgba(16, 185, 129, 0.15);
          color: var(--admin-accent);
        }

        .action-btn.activate:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.25);
        }

        .action-btn.view {
          background: rgba(59, 130, 246, 0.15);
          color: var(--admin-info);
        }

        .action-btn.view:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.25);
        }

        .empty-cell {
          text-align: center;
          color: var(--admin-text-dim);
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
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-btn:hover:not(:disabled) {
          background: var(--admin-card-hover);
          border-color: var(--admin-accent);
        }

        .page-info {
          font-size: 14px;
          color: var(--admin-text-muted);
        }

        /* Mobile Responsive Styles */
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 16px;
          }
          .page-title {
            font-size: 20px;
          }
          .filters {
            flex-direction: column;
            gap: 8px;
          }
          .search-input {
            max-width: none;
            width: 100%;
          }
          .filter-select, .refresh-btn {
            width: 100%;
          }
          .table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .data-table {
            min-width: 600px;
          }
          .data-table th,
          .data-table td {
            padding: 10px 12px;
            font-size: 12px;
          }
          .email-cell {
            font-size: 11px;
          }
          .action-buttons {
            flex-direction: column;
            gap: 4px;
          }
          .action-btn {
            padding: 6px 10px;
            font-size: 11px;
          }
          .pagination {
            flex-wrap: wrap;
            gap: 8px;
          }
          .page-btn {
            padding: 8px 12px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
