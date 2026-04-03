'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminOrganizations, updateOrganizationPlan } from '@/lib/hooks/useAdminApi';

const plans = ['free', 'starter', 'growth', 'agency', 'enterprise'];

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAdminOrganizations(page, search, planFilter);

  const handlePlanChange = async (orgId: string, newPlan: string) => {
    if (!confirm(`Change plan to ${newPlan}?`)) return;
    setActionLoading(orgId);
    try {
      await updateOrganizationPlan(orgId, newPlan);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="orgs-page">
      <div className="page-header">
        <h1 className="page-title">Organizations</h1>
        <span className="page-count">{data?.total || 0} total</span>
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="search-input"
        />
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Plans</option>
          {plans.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <button onClick={() => refetch()} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading">Loading organizations...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Plan</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.organizations.map((org) => (
                <tr key={org.id} className="clickable-row" onClick={() => router.push(`/admin/organizations/${org.id}`)}>
                  <td>
                    <div className="org-name">{org.name}</div>
                    <div className="org-id">{org.id.slice(0, 8)}...</div>
                  </td>
                  <td>
                    <span className={`plan-badge plan-${org.plan}`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="date-cell">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons">
                      <select
                        value={org.plan}
                        onChange={(e) => handlePlanChange(org.id, e.target.value)}
                        disabled={actionLoading === org.id}
                        className="plan-select"
                      >
                        {plans.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => router.push(`/admin/organizations/${org.id}`)}
                        className="view-btn"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data?.organizations.length && (
                <tr>
                  <td colSpan={4} className="empty-cell">No organizations found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .orgs-page {
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

        .search-input, .filter-select {
          padding: 10px 16px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
          outline: none;
        }

        .search-input {
          flex: 1;
          max-width: 300px;
        }

        .search-input::placeholder {
          color: var(--admin-text-dim);
        }

        .search-input:focus {
          border-color: var(--admin-accent);
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

        .org-name {
          font-weight: 500;
        }

        .org-id {
          font-size: 11px;
          color: var(--admin-text-dim);
          font-family: monospace;
        }

        .date-cell {
          color: var(--admin-text-muted);
        }

        .plan-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .plan-free { background: var(--admin-inner-bg); color: var(--admin-text-muted); }
        .plan-starter { background: rgba(59, 130, 246, 0.15); color: var(--admin-info); }
        .plan-growth { background: rgba(16, 185, 129, 0.15); color: var(--admin-accent); }
        .plan-agency { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
        .plan-enterprise { background: rgba(245, 158, 11, 0.15); color: var(--admin-warning); }

        .plan-select {
          padding: 6px 12px;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          font-size: 13px;
          cursor: pointer;
        }

        .clickable-row {
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .clickable-row:hover td {
          background: var(--admin-card-hover);
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .view-btn {
          padding: 6px 12px;
          background: rgba(59, 130, 246, 0.15);
          border: none;
          border-radius: 6px;
          color: var(--admin-info);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .view-btn:hover {
          background: rgba(59, 130, 246, 0.25);
        }

        .empty-cell {
          text-align: center;
          color: var(--admin-text-dim);
          padding: 40px !important;
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
            min-width: 500px;
          }
          .data-table th,
          .data-table td {
            padding: 10px 12px;
            font-size: 12px;
          }
          .action-buttons {
            flex-direction: column;
            gap: 4px;
          }
          .plan-select {
            width: 100%;
            font-size: 12px;
          }
          .view-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
