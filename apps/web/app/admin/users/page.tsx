'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  useEnhancedUsers,
  UserFilters as FiltersType,
  EnhancedUser,
  suspendUser,
  activateUser,
  bulkSuspendUsers,
  bulkActivateUsers,
  impersonateUser,
  resetUserPassword,
  deleteUser,
  exportUsers,
} from '@/lib/hooks/useAdminApi';

import UserStatsBar from '@/components/admin/users/UserStatsBar';
import UserFilters from '@/components/admin/users/UserFilters';
import UserTable from '@/components/admin/users/UserTable';
import BulkActionBar from '@/components/admin/users/BulkActionBar';
import UserQuickView from '@/components/admin/users/UserQuickView';

export default function AdminUsersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FiltersType>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<EnhancedUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data, loading, error, refetch } = useEnhancedUsers(page, filters);

  const handleFiltersChange = useCallback((newFilters: FiltersType) => {
    setFilters(newFilters);
    setPage(1);
    setSelectedIds([]);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    setSelectedIds([]);
  }, [refetch]);

  const handleExport = useCallback(async () => {
    try {
      const result = await exportUsers('csv', JSON.stringify(filters));
      alert(result.message);
    } catch (err) {
      alert('Export failed');
    }
  }, [filters]);

  const handleUserClick = useCallback((user: EnhancedUser) => {
    setSelectedUser(user);
  }, []);

  const handleAction = useCallback(async (action: string, user: EnhancedUser) => {
    setActionLoading(true);
    try {
      switch (action) {
        case 'view':
          router.push(`/admin/users/${user.id}`);
          break;

        case 'impersonate':
          const impResult = await impersonateUser(user.id);
          if (impResult.success) {
            // Store impersonation token and redirect
            alert(`Impersonation token created. Expires in ${impResult.expires_in / 60} minutes.\n\nNote: In production, this would redirect to the main app with the impersonation token.`);
          }
          break;

        case 'email':
          // Open email modal or mailto
          window.location.href = `mailto:${user.email}`;
          break;

        case 'activity':
          setSelectedUser(user);
          break;

        case 'reset-password':
          if (confirm(`Send password reset email to ${user.email}?`)) {
            const resetResult = await resetUserPassword(user.id);
            alert(resetResult.message);
          }
          break;

        case 'suspend':
          if (confirm(`Suspend user ${user.email}?`)) {
            await suspendUser(user.id);
            refetch();
            setSelectedUser(null);
          }
          break;

        case 'activate':
          await activateUser(user.id);
          refetch();
          setSelectedUser(null);
          break;

        case 'delete':
          if (confirm(`PERMANENTLY DELETE user ${user.email}? This cannot be undone.`)) {
            if (confirm('Are you absolutely sure?')) {
              await deleteUser(user.id);
              refetch();
              setSelectedUser(null);
            }
          }
          break;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }, [router, refetch]);

  const handleBulkSuspend = useCallback(async () => {
    if (!confirm(`Suspend ${selectedIds.length} users?`)) return;
    setActionLoading(true);
    try {
      await bulkSuspendUsers(selectedIds);
      refetch();
      setSelectedIds([]);
    } catch (err) {
      alert('Bulk suspend failed');
    } finally {
      setActionLoading(false);
    }
  }, [selectedIds, refetch]);

  const handleBulkActivate = useCallback(async () => {
    setActionLoading(true);
    try {
      await bulkActivateUsers(selectedIds);
      refetch();
      setSelectedIds([]);
    } catch (err) {
      alert('Bulk activate failed');
    } finally {
      setActionLoading(false);
    }
  }, [selectedIds, refetch]);

  const handleBulkEmail = useCallback(() => {
    const emails = data?.users
      .filter(u => selectedIds.includes(u.id))
      .map(u => u.email)
      .join(',');
    if (emails) {
      window.location.href = `mailto:${emails}`;
    }
  }, [data, selectedIds]);

  const handleBulkExport = useCallback(async () => {
    try {
      const result = await exportUsers('csv', JSON.stringify({ user_ids: selectedIds }));
      alert(result.message);
    } catch (err) {
      alert('Export failed');
    }
  }, [selectedIds]);

  return (
    <div className="users-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Users</h1>
          <span className="page-count">{data?.total || 0} total</span>
        </div>
      </div>

      {/* Stats Bar */}
      <UserStatsBar />

      {/* Filters */}
      <UserFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onSuspend={handleBulkSuspend}
        onActivate={handleBulkActivate}
        onEmail={handleBulkEmail}
        onExport={handleBulkExport}
        onClear={() => setSelectedIds([])}
        loading={actionLoading}
      />

      {/* Error State */}
      {error && (
        <div className="error-state">
          Error loading users: {error}
        </div>
      )}

      {/* Users Table */}
      <UserTable
        users={data?.users || []}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        onUserClick={handleUserClick}
        onActionClick={handleAction}
        loading={loading}
      />

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="page-btn"
          >
            Previous
          </button>
          <div className="page-numbers">
            {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
              let pageNum: number;
              if (data.pages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= data.pages - 2) {
                pageNum = data.pages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`page-num ${page === pageNum ? 'active' : ''}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage(p => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="page-btn"
          >
            Next
          </button>
        </div>
      )}

      {/* Quick View Panel */}
      {selectedUser && (
        <UserQuickView
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onAction={handleAction}
        />
      )}

      <style jsx>{`
        .users-page {
          max-width: 1400px;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
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

        .error-state {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--admin-error);
          border-radius: 8px;
          padding: 16px;
          color: var(--admin-error);
          margin-bottom: 16px;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
          padding: 16px 0;
        }

        .page-btn {
          padding: 8px 16px;
          background: var(--admin-card);
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

        .page-numbers {
          display: flex;
          gap: 4px;
        }

        .page-num {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .page-num:hover {
          background: var(--admin-card-hover);
        }

        .page-num.active {
          background: var(--admin-accent);
          border-color: var(--admin-accent);
          color: white;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .page-title {
            font-size: 20px;
          }

          .pagination {
            flex-wrap: wrap;
            gap: 8px;
          }

          .page-numbers {
            order: -1;
            width: 100%;
            justify-content: center;
          }

          .page-btn {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
