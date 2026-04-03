'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserDetail, suspendUser, activateUser } from '@/lib/hooks/useAdminApi';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateStr);
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const { data, loading, error, refetch } = useUserDetail(userId);
  const [actionLoading, setActionLoading] = useState(false);

  const handleSuspend = async () => {
    if (!confirm('Are you sure you want to suspend this user? They will not be able to log in.')) return;
    setActionLoading(true);
    try {
      await suspendUser(userId);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      await activateUser(userId);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to activate user');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>Loading user details...</p>
        <style jsx>{`
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            color: var(--admin-text-muted);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--admin-border);
            border-top-color: var(--admin-accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="error-state">
        <p>Error loading user: {error || 'User not found'}</p>
        <Link href="/admin/users" className="back-link">← Back to Users</Link>
        <style jsx>{`
          .error-state {
            padding: 40px;
            text-align: center;
            color: var(--admin-error);
          }
          .back-link {
            display: inline-block;
            margin-top: 16px;
            color: var(--admin-accent);
            text-decoration: none;
          }
        `}</style>
      </div>
    );
  }

  const { user, memberships } = data;

  return (
    <div className="user-detail">
      {/* Header */}
      <div className="page-header">
        <Link href="/admin/users" className="back-link">← Back to Users</Link>
        <h1 className="page-title">User Details</h1>
      </div>

      <div className="content-grid">
        {/* Profile Card */}
        <div className="card profile-card">
          <div className="card-header">
            <h2 className="card-title">Profile</h2>
            <span className={`status-badge ${user.is_active ? 'active' : 'suspended'}`}>
              {user.is_active ? '● Active' : '○ Suspended'}
            </span>
          </div>

          <div className="profile-content">
            <div className="avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name || 'User'} />
              ) : (
                <span>{(user.name || user.email)[0].toUpperCase()}</span>
              )}
            </div>

            <div className="info-grid">
              <div className="info-item">
                <label>Email</label>
                <span className="value email">{user.email}</span>
                {user.email_verified && <span className="verified-badge">✓ Verified</span>}
              </div>
              <div className="info-item">
                <label>Name</label>
                <span className="value">{user.name || '—'}</span>
              </div>
              <div className="info-item">
                <label>User ID</label>
                <span className="value mono">{user.id}</span>
              </div>
              <div className="info-item">
                <label>Created</label>
                <span className="value">{formatDate(user.created_at)}</span>
              </div>
              <div className="info-item">
                <label>Last Login</label>
                <span className="value">{formatRelativeTime(user.last_login_at)}</span>
              </div>
              <div className="info-item">
                <label>Updated</label>
                <span className="value">{formatDate(user.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Card */}
        <div className="card actions-card">
          <div className="card-header">
            <h2 className="card-title">Admin Actions</h2>
          </div>

          <div className="actions-list">
            {user.is_active ? (
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                className="action-btn danger"
              >
                <span className="action-icon">🚫</span>
                <div className="action-content">
                  <span className="action-label">Suspend Account</span>
                  <span className="action-desc">Prevent user from logging in</span>
                </div>
              </button>
            ) : (
              <button
                onClick={handleActivate}
                disabled={actionLoading}
                className="action-btn success"
              >
                <span className="action-icon">✓</span>
                <div className="action-content">
                  <span className="action-label">Activate Account</span>
                  <span className="action-desc">Restore user access</span>
                </div>
              </button>
            )}

            <button className="action-btn" disabled>
              <span className="action-icon">🔑</span>
              <div className="action-content">
                <span className="action-label">Reset Password</span>
                <span className="action-desc">Send password reset email</span>
              </div>
              <span className="coming-soon">Coming Soon</span>
            </button>

            <button className="action-btn" disabled>
              <span className="action-icon">👤</span>
              <div className="action-content">
                <span className="action-label">Impersonate User</span>
                <span className="action-desc">Login as this user for debugging</span>
              </div>
              <span className="coming-soon">Coming Soon</span>
            </button>

            <button className="action-btn" disabled>
              <span className="action-icon">🚪</span>
              <div className="action-content">
                <span className="action-label">Force Logout</span>
                <span className="action-desc">Invalidate all sessions</span>
              </div>
              <span className="coming-soon">Coming Soon</span>
            </button>

            <button className="action-btn danger-outline" disabled>
              <span className="action-icon">🗑️</span>
              <div className="action-content">
                <span className="action-label">Delete Account</span>
                <span className="action-desc">Permanently remove user</span>
              </div>
              <span className="coming-soon">Coming Soon</span>
            </button>
          </div>
        </div>

        {/* Organizations Card */}
        <div className="card orgs-card">
          <div className="card-header">
            <h2 className="card-title">Organizations</h2>
            <span className="count-badge">{memberships.length}</span>
          </div>

          {memberships.length === 0 ? (
            <p className="empty">User is not a member of any organization</p>
          ) : (
            <div className="orgs-list">
              {memberships.map((membership, idx) => (
                <div key={idx} className="org-item">
                  <div className="org-icon">🏢</div>
                  <div className="org-content">
                    <span className="org-name">
                      {membership.organizations?.name || 'Unknown Organization'}
                    </span>
                    <div className="org-meta">
                      <span className="role-badge">{membership.role}</span>
                      {membership.organizations?.plan && (
                        <span className="plan-badge">{membership.organizations.plan}</span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/admin/organizations/${membership.organization_id}`}
                    className="view-link"
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Card (placeholder) */}
        <div className="card activity-card">
          <div className="card-header">
            <h2 className="card-title">Recent Activity</h2>
          </div>
          <p className="empty">Activity tracking coming soon</p>
        </div>
      </div>

      <style jsx>{`
        .user-detail {
          max-width: 1200px;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .back-link {
          display: inline-block;
          color: var(--admin-accent);
          text-decoration: none;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        .card {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          overflow: hidden;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--admin-border);
          background: var(--admin-inner-bg);
        }

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }

        .status-badge {
          padding: 4px 12px;
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

        .count-badge {
          background: var(--admin-inner-bg);
          color: var(--admin-text-muted);
          padding: 2px 10px;
          border-radius: 10px;
          font-size: 12px;
        }

        /* Profile Card */
        .profile-card {
          grid-column: 1;
        }

        .profile-content {
          padding: 20px;
          display: flex;
          gap: 24px;
        }

        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar span {
          font-size: 32px;
          font-weight: 600;
          color: white;
        }

        .info-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-item label {
          font-size: 12px;
          color: var(--admin-text-dim);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-item .value {
          font-size: 14px;
          color: var(--admin-text);
        }

        .info-item .value.email {
          font-family: monospace;
          font-size: 13px;
        }

        .info-item .value.mono {
          font-family: monospace;
          font-size: 11px;
          color: var(--admin-text-muted);
        }

        .verified-badge {
          font-size: 11px;
          color: var(--admin-accent);
          margin-top: 2px;
        }

        /* Actions Card */
        .actions-card {
          grid-column: 2;
          grid-row: 1 / 3;
        }

        .actions-list {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 14px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }

        .action-btn:hover:not(:disabled) {
          background: var(--admin-card-hover);
          border-color: var(--admin-accent);
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .action-btn.danger {
          border-color: rgba(239, 68, 68, 0.3);
        }

        .action-btn.danger:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.5);
        }

        .action-btn.danger-outline {
          border-color: rgba(239, 68, 68, 0.3);
          color: var(--admin-error);
        }

        .action-btn.success {
          border-color: rgba(16, 185, 129, 0.3);
        }

        .action-btn.success:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.5);
        }

        .action-icon {
          font-size: 18px;
          width: 28px;
          text-align: center;
        }

        .action-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .action-label {
          font-size: 13px;
          font-weight: 500;
        }

        .action-desc {
          font-size: 11px;
          color: var(--admin-text-dim);
        }

        .coming-soon {
          font-size: 10px;
          color: var(--admin-text-dim);
          background: var(--admin-inner-bg);
          padding: 2px 8px;
          border-radius: 4px;
        }

        /* Organizations Card */
        .orgs-card {
          grid-column: 1;
        }

        .orgs-list {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .org-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--admin-inner-bg);
          border-radius: 8px;
        }

        .org-icon {
          font-size: 24px;
        }

        .org-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .org-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--admin-text);
        }

        .org-meta {
          display: flex;
          gap: 8px;
        }

        .role-badge {
          font-size: 11px;
          padding: 2px 8px;
          background: rgba(59, 130, 246, 0.15);
          color: var(--admin-info);
          border-radius: 4px;
          text-transform: capitalize;
        }

        .plan-badge {
          font-size: 11px;
          padding: 2px 8px;
          background: rgba(16, 185, 129, 0.15);
          color: var(--admin-accent);
          border-radius: 4px;
          text-transform: capitalize;
        }

        .view-link {
          font-size: 13px;
          color: var(--admin-accent);
          text-decoration: none;
        }

        .view-link:hover {
          text-decoration: underline;
        }

        /* Activity Card */
        .activity-card {
          grid-column: 1;
        }

        .empty {
          padding: 24px;
          text-align: center;
          color: var(--admin-text-dim);
          font-size: 14px;
        }

        @media (max-width: 900px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .actions-card {
            grid-column: 1;
            grid-row: auto;
          }

          .profile-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
