'use client';

import { EnhancedUser } from '@/lib/hooks/useAdminApi';

interface UserTableProps {
  users: EnhancedUser[];
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
  onUserClick: (user: EnhancedUser) => void;
  onActionClick: (action: string, user: EnhancedUser) => void;
  loading?: boolean;
}

export default function UserTable({
  users,
  selectedIds,
  onSelectChange,
  onUserClick,
  onActionClick,
  loading = false,
}: UserTableProps) {
  const allSelected = users.length > 0 && selectedIds.length === users.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < users.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectChange([]);
    } else {
      onSelectChange(users.map(u => u.id));
    }
  };

  const toggleSelect = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onSelectChange(selectedIds.filter(id => id !== userId));
    } else {
      onSelectChange([...selectedIds, userId]);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatJoinedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getPlanBadgeClass = (plan: string) => {
    const classes: Record<string, string> = {
      free: 'plan-free',
      starter: 'plan-starter',
      growth: 'plan-growth',
      agency: 'plan-agency',
      enterprise: 'plan-enterprise',
    };
    return classes[plan] || 'plan-free';
  };

  if (loading) {
    return (
      <div className="table-container">
        <div className="loading-state">Loading users...</div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="table-container">
        <div className="empty-state">No users found matching your filters</div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="users-table">
        <thead>
          <tr>
            <th className="col-checkbox">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleSelectAll}
                className="checkbox"
              />
            </th>
            <th className="col-user">User</th>
            <th className="col-org">Organization</th>
            <th className="col-plan">Plan</th>
            <th className="col-status">Status</th>
            <th className="col-accounts">Ad Accounts</th>
            <th className="col-joined">Joined</th>
            <th className="col-active">Last Active</th>
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className={`user-row ${selectedIds.includes(user.id) ? 'selected' : ''}`}
            >
              <td className="col-checkbox" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(user.id)}
                  onChange={() => toggleSelect(user.id)}
                  className="checkbox"
                />
              </td>
              <td className="col-user" onClick={() => onUserClick(user)}>
                <div className="user-cell">
                  <div className="user-avatar">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" />
                    ) : (
                      <span>{(user.name || user.email)[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="user-info">
                    <div className="user-name-row">
                      <span className="user-name">{user.name || '—'}</span>
                      {user.signup_method && user.signup_method !== 'email' && (
                        <span className={`signup-badge ${user.signup_method}`}>
                          {user.signup_method === 'google' ? '🔵' : user.signup_method === 'github' ? '⚫' : '🔗'}
                        </span>
                      )}
                    </div>
                    <span className="user-email">{user.email}</span>
                  </div>
                </div>
              </td>
              <td className="col-org" onClick={() => onUserClick(user)}>
                <div className="org-cell">
                  {user.organization ? (
                    <>
                      <span className="org-name">{user.organization}</span>
                      <span className="org-role">{user.role || 'member'}</span>
                    </>
                  ) : (
                    <span className="no-org">No organization</span>
                  )}
                </div>
              </td>
              <td className="col-plan" onClick={() => onUserClick(user)}>
                <span className={`plan-badge ${getPlanBadgeClass(user.plan)}`}>
                  {user.plan}
                </span>
              </td>
              <td className="col-status" onClick={() => onUserClick(user)}>
                <span className={`status-badge ${user.is_active ? 'active' : 'suspended'} ${!user.email_verified ? 'unverified' : ''}`}>
                  {!user.is_active ? 'Suspended' : !user.email_verified ? 'Unverified' : 'Active'}
                </span>
              </td>
              <td className="col-accounts" onClick={() => onUserClick(user)}>
                <span className="accounts-count">
                  {user.ad_accounts_count > 0 ? user.ad_accounts_count : '—'}
                </span>
              </td>
              <td className="col-joined" onClick={() => onUserClick(user)}>
                <span className="joined-date">{formatJoinedDate(user.created_at)}</span>
              </td>
              <td className="col-active" onClick={() => onUserClick(user)}>
                <span className="active-time">{formatDate(user.last_login_at)}</span>
              </td>
              <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                <div className="actions-dropdown">
                  <button className="actions-btn">&#8942;</button>
                  <div className="dropdown-menu">
                    <button onClick={() => onActionClick('view', user)}>View Details</button>
                    <button onClick={() => onActionClick('impersonate', user)}>Impersonate</button>
                    <button onClick={() => onActionClick('email', user)}>Send Email</button>
                    <button onClick={() => onActionClick('activity', user)}>View Activity</button>
                    <hr />
                    <button onClick={() => onActionClick('reset-password', user)}>Reset Password</button>
                    {user.is_active ? (
                      <button className="danger" onClick={() => onActionClick('suspend', user)}>Suspend</button>
                    ) : (
                      <button className="success" onClick={() => onActionClick('activate', user)}>Activate</button>
                    )}
                    <button className="danger" onClick={() => onActionClick('delete', user)}>Delete</button>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .table-container {
    background: var(--admin-card);
    border: 1px solid var(--admin-border);
    border-radius: 12px;
    overflow: hidden;
  }

  .loading-state,
  .empty-state {
    padding: 60px 40px;
    text-align: center;
    color: var(--admin-text-muted);
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
  }

  .users-table th {
    padding: 14px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    color: var(--admin-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: var(--admin-inner-bg);
    border-bottom: 1px solid var(--admin-border);
  }

  .users-table td {
    padding: 14px 16px;
    font-size: 14px;
    color: var(--admin-text);
    border-bottom: 1px solid var(--admin-border);
    vertical-align: middle;
  }

  .users-table tr:last-child td {
    border-bottom: none;
  }

  .user-row {
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .user-row:hover td {
    background: var(--admin-card-hover);
  }

  .user-row.selected td {
    background: rgba(16, 185, 129, 0.08);
  }

  /* Checkbox */
  .col-checkbox {
    width: 40px;
    text-align: center;
  }

  .checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--admin-accent);
  }

  /* User cell */
  .user-cell {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--admin-inner-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: var(--admin-accent);
    font-size: 14px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .user-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .user-name {
    font-weight: 500;
    color: var(--admin-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .signup-badge {
    font-size: 10px;
    line-height: 1;
  }

  .user-email {
    font-size: 12px;
    color: var(--admin-text-muted);
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Organization cell */
  .org-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .org-name {
    font-weight: 500;
  }

  .org-role {
    font-size: 11px;
    color: var(--admin-text-muted);
    text-transform: capitalize;
  }

  .no-org {
    color: var(--admin-text-dim);
    font-style: italic;
    font-size: 13px;
  }

  /* Plan badge */
  .plan-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .plan-free {
    background: var(--admin-inner-bg);
    color: var(--admin-text-muted);
  }

  .plan-starter {
    background: rgba(59, 130, 246, 0.15);
    color: var(--admin-info);
  }

  .plan-growth {
    background: rgba(16, 185, 129, 0.15);
    color: var(--admin-accent);
  }

  .plan-agency {
    background: rgba(139, 92, 246, 0.15);
    color: #8b5cf6;
  }

  .plan-enterprise {
    background: rgba(245, 158, 11, 0.15);
    color: var(--admin-warning);
  }

  /* Status badge */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .status-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .status-badge.active {
    background: rgba(16, 185, 129, 0.15);
    color: var(--admin-accent);
  }

  .status-badge.active::before {
    background: var(--admin-accent);
  }

  .status-badge.suspended {
    background: rgba(239, 68, 68, 0.15);
    color: var(--admin-error);
  }

  .status-badge.suspended::before {
    background: var(--admin-error);
  }

  .status-badge.unverified {
    background: rgba(245, 158, 11, 0.15);
    color: var(--admin-warning);
  }

  .status-badge.unverified::before {
    background: var(--admin-warning);
  }

  /* Accounts count */
  .accounts-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
  }

  /* Joined date */
  .joined-date {
    font-size: 13px;
    color: var(--admin-text);
  }

  /* Active time */
  .active-time {
    font-size: 13px;
    color: var(--admin-text-muted);
  }

  /* Actions dropdown */
  .col-actions {
    width: 60px;
    text-align: center;
  }

  .actions-dropdown {
    position: relative;
    display: inline-block;
  }

  .actions-btn {
    background: transparent;
    border: none;
    color: var(--admin-text-muted);
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.15s ease;
  }

  .actions-btn:hover {
    background: var(--admin-inner-bg);
    color: var(--admin-text);
  }

  .dropdown-menu {
    position: absolute;
    right: 0;
    top: 100%;
    background: var(--admin-card);
    border: 1px solid var(--admin-border);
    border-radius: 8px;
    padding: 6px 0;
    min-width: 160px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    z-index: 100;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px);
    transition: all 0.15s ease;
  }

  .actions-dropdown:hover .dropdown-menu,
  .actions-dropdown:focus-within .dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .dropdown-menu button {
    display: block;
    width: 100%;
    padding: 8px 14px;
    text-align: left;
    background: none;
    border: none;
    color: var(--admin-text);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .dropdown-menu button:hover {
    background: var(--admin-inner-bg);
  }

  .dropdown-menu button.danger {
    color: var(--admin-error);
  }

  .dropdown-menu button.success {
    color: var(--admin-accent);
  }

  .dropdown-menu hr {
    border: none;
    border-top: 1px solid var(--admin-border);
    margin: 6px 0;
  }

  /* Column widths */
  .col-user { min-width: 200px; }
  .col-org { min-width: 150px; }
  .col-plan { width: 100px; }
  .col-status { width: 100px; }
  .col-accounts { width: 100px; text-align: center; }
  .col-joined { width: 100px; }
  .col-active { width: 100px; }

  /* Mobile responsive */
  @media (max-width: 1024px) {
    .table-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .users-table {
      min-width: 900px;
    }
  }

  @media (max-width: 768px) {
    .users-table th,
    .users-table td {
      padding: 10px 12px;
      font-size: 12px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      font-size: 12px;
    }
  }
`;
