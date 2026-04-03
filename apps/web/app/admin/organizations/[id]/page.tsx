'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrganizationDetail, updateOrganizationPlan } from '@/lib/hooks/useAdminApi';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string | null): string {
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

  if (diffMins < 0) return 'In the future';
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

const PLANS = ['free', 'starter', 'growth', 'agency', 'enterprise'];

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const { data, loading, error, refetch } = useOrganizationDetail(orgId);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleChangePlan = async () => {
    if (!selectedPlan) return;
    setActionLoading(true);
    try {
      await updateOrganizationPlan(orgId, selectedPlan);
      setSelectedPlan(null);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>Loading organization details...</p>
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
        <p>Error loading organization: {error || 'Organization not found'}</p>
        <Link href="/admin/organizations" className="back-link">← Back to Organizations</Link>
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

  const { organization, members, ad_accounts, subscription } = data;

  return (
    <div className="org-detail">
      {/* Header */}
      <div className="page-header">
        <Link href="/admin/organizations" className="back-link">← Back to Organizations</Link>
        <h1 className="page-title">Organization Details</h1>
      </div>

      <div className="content-grid">
        {/* Overview Card */}
        <div className="card overview-card">
          <div className="card-header">
            <h2 className="card-title">Overview</h2>
            <span className={`plan-badge plan-${organization.plan}`}>
              {organization.plan}
            </span>
          </div>

          <div className="overview-content">
            <div className="org-icon">🏢</div>
            <div className="info-grid">
              <div className="info-item">
                <label>Name</label>
                <span className="value">{organization.name}</span>
              </div>
              <div className="info-item">
                <label>Slug</label>
                <span className="value mono">{organization.slug || '—'}</span>
              </div>
              <div className="info-item">
                <label>Organization ID</label>
                <span className="value mono small">{organization.id}</span>
              </div>
              <div className="info-item">
                <label>Created</label>
                <span className="value">{formatDate(organization.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="card subscription-card">
          <div className="card-header">
            <h2 className="card-title">Subscription</h2>
            {subscription && (
              <span className={`status-badge status-${subscription.status}`}>
                {subscription.status}
              </span>
            )}
          </div>

          <div className="subscription-content">
            {subscription ? (
              <>
                <div className="sub-info">
                  <div className="sub-item">
                    <label>Plan</label>
                    <span>{subscription.plan_name}</span>
                  </div>
                  <div className="sub-item">
                    <label>Billing</label>
                    <span>{subscription.billing_interval}</span>
                  </div>
                  <div className="sub-item">
                    <label>Current Period</label>
                    <span>
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                  {subscription.cancel_at_period_end && (
                    <div className="cancel-warning">
                      Cancels at period end
                    </div>
                  )}
                </div>

                <div className="plan-change">
                  <label>Change Plan</label>
                  <div className="plan-change-row">
                    <select
                      value={selectedPlan || organization.plan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="plan-select"
                    >
                      {PLANS.map((plan) => (
                        <option key={plan} value={plan}>
                          {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleChangePlan}
                      disabled={actionLoading || !selectedPlan || selectedPlan === organization.plan}
                      className="change-btn"
                    >
                      {actionLoading ? '...' : 'Update'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-subscription">
                <p>No active subscription</p>
                <p className="muted">Organization is on free plan</p>
              </div>
            )}
          </div>
        </div>

        {/* Members Card */}
        <div className="card members-card">
          <div className="card-header">
            <h2 className="card-title">Members</h2>
            <span className="count-badge">{members.length}</span>
          </div>

          {members.length === 0 ? (
            <p className="empty">No members</p>
          ) : (
            <div className="members-list">
              {members.map((member, idx) => (
                <div key={idx} className="member-item">
                  <div className="member-avatar">
                    {(member.users?.name || member.users?.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="member-content">
                    <span className="member-name">
                      {member.users?.name || 'Unknown User'}
                    </span>
                    <span className="member-email">
                      {member.users?.email || 'No email'}
                    </span>
                  </div>
                  <span className="role-badge">{member.role}</span>
                  <Link
                    href={`/admin/users/${member.user_id}`}
                    className="view-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ad Accounts Card */}
        <div className="card accounts-card">
          <div className="card-header">
            <h2 className="card-title">Ad Accounts</h2>
            <span className="count-badge">{ad_accounts.length}</span>
          </div>

          {ad_accounts.length === 0 ? (
            <p className="empty">No ad accounts connected</p>
          ) : (
            <div className="accounts-list">
              {ad_accounts.map((account) => (
                <div key={account.id} className="account-item">
                  <div className={`platform-icon ${account.platform}`}>
                    {account.platform === 'google' ? '🔵' : account.platform === 'meta' ? '🔷' : '📊'}
                  </div>
                  <div className="account-content">
                    <span className="account-name">{account.name}</span>
                    <span className="account-id">{account.external_account_id}</span>
                  </div>
                  <div className="account-meta">
                    <span className={`status-badge status-${account.status}`}>
                      {account.status}
                    </span>
                    <span className={`token-badge token-${account.token_status}`}>
                      Token: {account.token_status}
                    </span>
                  </div>
                  <div className="account-sync">
                    <span className="sync-label">Last Sync</span>
                    <span className="sync-time">{formatRelativeTime(account.last_sync_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions Card */}
        <div className="card actions-card">
          <div className="card-header">
            <h2 className="card-title">Admin Actions</h2>
          </div>

          <div className="actions-list">
            <button className="action-btn" disabled>
              <span className="action-icon">👤</span>
              <div className="action-content">
                <span className="action-label">Transfer Ownership</span>
                <span className="action-desc">Move to a different owner</span>
              </div>
              <span className="coming-soon">Coming Soon</span>
            </button>

            <button className="action-btn" disabled>
              <span className="action-icon">💰</span>
              <div className="action-content">
                <span className="action-label">Add Credit</span>
                <span className="action-desc">Apply account credit</span>
              </div>
              <span className="coming-soon">Coming Soon</span>
            </button>

            <button className="action-btn" disabled>
              <span className="action-icon">🔄</span>
              <div className="action-content">
                <span className="action-label">Force Sync All Accounts</span>
                <span className="action-desc">Trigger sync for all ad accounts</span>
              </div>
              <span className="coming-soon">Coming Soon</span>
            </button>

            <button className="action-btn danger-outline" disabled>
              <span className="action-icon">🗑️</span>
              <div className="action-content">
                <span className="action-label">Delete Organization</span>
                <span className="action-desc">Permanently remove organization</span>
              </div>
              <span className="coming-soon">Coming Soon</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .org-detail {
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
          grid-template-columns: 1fr 1fr;
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

        .plan-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .plan-badge.plan-free { background: var(--admin-inner-bg); color: var(--admin-text-muted); }
        .plan-badge.plan-starter { background: rgba(59, 130, 246, 0.15); color: var(--admin-info); }
        .plan-badge.plan-growth { background: rgba(16, 185, 129, 0.15); color: var(--admin-accent); }
        .plan-badge.plan-agency { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
        .plan-badge.plan-enterprise { background: rgba(245, 158, 11, 0.15); color: var(--admin-warning); }

        .status-badge {
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 500;
        }

        .status-badge.status-active { background: rgba(16, 185, 129, 0.15); color: var(--admin-accent); }
        .status-badge.status-trialing { background: rgba(59, 130, 246, 0.15); color: var(--admin-info); }
        .status-badge.status-past_due { background: rgba(245, 158, 11, 0.15); color: var(--admin-warning); }
        .status-badge.status-cancelled { background: rgba(239, 68, 68, 0.15); color: var(--admin-error); }
        .status-badge.status-paused { background: var(--admin-inner-bg); color: var(--admin-text-muted); }

        .token-badge {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .token-badge.token-valid { background: rgba(16, 185, 129, 0.15); color: var(--admin-accent); }
        .token-badge.token-expiring { background: rgba(245, 158, 11, 0.15); color: var(--admin-warning); }
        .token-badge.token-expired { background: rgba(239, 68, 68, 0.15); color: var(--admin-error); }

        .count-badge {
          background: var(--admin-inner-bg);
          color: var(--admin-text-muted);
          padding: 2px 10px;
          border-radius: 10px;
          font-size: 12px;
        }

        /* Overview Card */
        .overview-card {
          grid-column: 1;
        }

        .overview-content {
          padding: 20px;
          display: flex;
          gap: 24px;
        }

        .org-icon {
          width: 64px;
          height: 64px;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          flex-shrink: 0;
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

        .info-item .value.mono {
          font-family: monospace;
          font-size: 13px;
        }

        .info-item .value.small {
          font-size: 11px;
          color: var(--admin-text-muted);
        }

        /* Subscription Card */
        .subscription-card {
          grid-column: 2;
        }

        .subscription-content {
          padding: 20px;
        }

        .sub-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .sub-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .sub-item label {
          color: var(--admin-text-dim);
        }

        .sub-item span {
          color: var(--admin-text);
        }

        .cancel-warning {
          background: rgba(239, 68, 68, 0.1);
          color: var(--admin-error);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          text-align: center;
        }

        .plan-change {
          border-top: 1px solid var(--admin-border);
          padding-top: 16px;
        }

        .plan-change label {
          display: block;
          font-size: 12px;
          color: var(--admin-text-dim);
          margin-bottom: 8px;
        }

        .plan-change-row {
          display: flex;
          gap: 8px;
        }

        .plan-select {
          flex: 1;
          padding: 8px 12px;
          background: var(--admin-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          font-size: 13px;
        }

        .change-btn {
          padding: 8px 16px;
          background: var(--admin-accent);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .change-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .no-subscription {
          text-align: center;
          padding: 20px;
        }

        .no-subscription p {
          margin: 0;
          color: var(--admin-text);
        }

        .no-subscription .muted {
          color: var(--admin-text-dim);
          font-size: 13px;
          margin-top: 4px;
        }

        /* Members Card */
        .members-card {
          grid-column: 1;
        }

        .members-list {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .member-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--admin-inner-bg);
          border-radius: 8px;
        }

        .member-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: white;
        }

        .member-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .member-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--admin-text);
        }

        .member-email {
          font-size: 12px;
          color: var(--admin-text-dim);
          font-family: monospace;
        }

        .role-badge {
          font-size: 11px;
          padding: 3px 10px;
          background: rgba(59, 130, 246, 0.15);
          color: var(--admin-info);
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

        /* Ad Accounts Card */
        .accounts-card {
          grid-column: 2;
        }

        .accounts-list {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .account-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--admin-inner-bg);
          border-radius: 8px;
        }

        .platform-icon {
          font-size: 20px;
        }

        .account-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .account-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--admin-text);
        }

        .account-id {
          font-size: 11px;
          color: var(--admin-text-dim);
          font-family: monospace;
        }

        .account-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-end;
        }

        .account-sync {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .sync-label {
          font-size: 10px;
          color: var(--admin-text-dim);
        }

        .sync-time {
          font-size: 12px;
          color: var(--admin-text-muted);
        }

        /* Actions Card */
        .actions-card {
          grid-column: 1 / 3;
        }

        .actions-list {
          padding: 12px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          cursor: pointer;
          text-align: left;
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .action-btn.danger-outline {
          border-color: rgba(239, 68, 68, 0.3);
          color: var(--admin-error);
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

          .overview-card,
          .subscription-card,
          .members-card,
          .accounts-card,
          .actions-card {
            grid-column: 1;
          }

          .actions-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
