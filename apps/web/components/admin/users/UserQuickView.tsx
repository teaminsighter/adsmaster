'use client';

import { useState } from 'react';
import { EnhancedUser, useUserActivity, useUserNotes, addUserNote } from '@/lib/hooks/useAdminApi';

interface UserQuickViewProps {
  user: EnhancedUser | null;
  onClose: () => void;
  onAction: (action: string, user: EnhancedUser) => void;
}

export default function UserQuickView({ user, onClose, onAction }: UserQuickViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'notes'>('overview');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const { data: activityData, loading: activityLoading } = useUserActivity(user?.id || '');
  const { data: notesData, loading: notesLoading, refetch: refetchNotes } = useUserNotes(user?.id || '');

  if (!user) return null;

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await addUserNote(user.id, newNote);
      setNewNote('');
      refetchNotes();
    } catch (err) {
      alert('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

  const formatRelativeTime = (dateStr: string | null) => {
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

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="quick-view-panel">
        {/* Header */}
        <div className="panel-header">
          <button className="close-btn" onClick={onClose}>&times;</button>
          <div className="user-header">
            <div className="user-avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" />
              ) : (
                <span>{(user.name || user.email)[0].toUpperCase()}</span>
              )}
            </div>
            <div className="user-info">
              <h2 className="user-name">{user.name || user.email}</h2>
              <span className="user-email">{user.email}</span>
            </div>
            <span className={`status-badge ${user.is_active ? 'active' : 'suspended'}`}>
              {user.is_active ? 'Active' : 'Suspended'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
          <button
            className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
        </div>

        {/* Content */}
        <div className="panel-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              {/* Quick Stats */}
              <div className="stat-row">
                <div className="stat-item">
                  <span className="stat-label">Plan</span>
                  <span className={`plan-badge plan-${user.plan}`}>{user.plan}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Ad Accounts</span>
                  <span className="stat-value">{user.ad_accounts_count}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Last Login</span>
                  <span className="stat-value">{formatRelativeTime(user.last_login_at)}</span>
                </div>
              </div>

              {/* Organization */}
              <div className="section">
                <h3 className="section-title">Organization</h3>
                {user.organization ? (
                  <div className="org-info">
                    <span className="org-name">{user.organization}</span>
                    <span className="org-role">{user.role || 'Member'}</span>
                  </div>
                ) : (
                  <p className="no-data">No organization</p>
                )}
              </div>

              {/* Details */}
              <div className="section">
                <h3 className="section-title">Details</h3>
                <div className="detail-list">
                  <div className="detail-item">
                    <span className="detail-label">User ID</span>
                    <span className="detail-value mono">{user.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Signed Up</span>
                    <span className="detail-value">{formatDate(user.created_at)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email Verified</span>
                    <span className="detail-value">{user.email_verified ? 'Yes' : 'No'}</span>
                  </div>
                  {user.signup_method && (
                    <div className="detail-item">
                      <span className="detail-label">Signup Method</span>
                      <span className="detail-value">{user.signup_method}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="section">
                <h3 className="section-title">Quick Actions</h3>
                <div className="action-grid">
                  <button onClick={() => onAction('impersonate', user)} className="action-btn">
                    Impersonate
                  </button>
                  <button onClick={() => onAction('email', user)} className="action-btn">
                    Send Email
                  </button>
                  <button onClick={() => onAction('reset-password', user)} className="action-btn">
                    Reset Password
                  </button>
                  {user.is_active ? (
                    <button onClick={() => onAction('suspend', user)} className="action-btn danger">
                      Suspend User
                    </button>
                  ) : (
                    <button onClick={() => onAction('activate', user)} className="action-btn success">
                      Activate User
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="activity-tab">
              {activityLoading ? (
                <div className="loading">Loading activity...</div>
              ) : (
                <div className="activity-list">
                  {(activityData?.activities || []).map((activity, idx) => (
                    <div key={idx} className="activity-item">
                      <div className={`activity-icon ${activity.type}`}>
                        {activity.type === 'login' && '🔐'}
                        {activity.type === 'campaign_created' && '📊'}
                        {activity.type === 'recommendation_applied' && '✨'}
                        {activity.type === 'signup' && '🎉'}
                        {activity.type === 'settings_updated' && '⚙️'}
                        {activity.type === 'ad_account_connected' && '🔗'}
                      </div>
                      <div className="activity-content">
                        <span className="activity-desc">{activity.description}</span>
                        <span className="activity-time">{formatRelativeTime(activity.created_at)}</span>
                        {activity.ip_address && (
                          <span className="activity-meta">IP: {activity.ip_address}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!activityData?.activities || activityData.activities.length === 0) && (
                    <p className="no-data">No activity found</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="notes-tab">
              {/* Add note form */}
              <div className="add-note-form">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this user..."
                  className="note-input"
                  rows={3}
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="add-note-btn"
                >
                  {addingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>

              {/* Notes list */}
              {notesLoading ? (
                <div className="loading">Loading notes...</div>
              ) : (
                <div className="notes-list">
                  {(notesData?.notes || []).map((note) => (
                    <div key={note.id} className="note-item">
                      <div className="note-header">
                        <span className="note-author">{note.admin_users?.name || note.admin_users?.email || 'Admin'}</span>
                        <span className="note-time">{formatRelativeTime(note.created_at)}</span>
                      </div>
                      <p className="note-content">{note.content}</p>
                    </div>
                  ))}
                  {(!notesData?.notes || notesData.notes.length === 0) && (
                    <p className="no-data">No notes yet</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <style jsx>{`
          .overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            animation: fadeIn 0.2s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .quick-view-panel {
            position: fixed;
            top: 0;
            right: 0;
            width: 480px;
            max-width: 100%;
            height: 100%;
            background: var(--admin-bg);
            z-index: 1001;
            display: flex;
            flex-direction: column;
            animation: slideIn 0.3s ease;
            border-left: 1px solid var(--admin-border);
          }

          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }

          .panel-header {
            padding: 20px;
            border-bottom: 1px solid var(--admin-border);
          }

          .close-btn {
            position: absolute;
            top: 16px;
            right: 16px;
            background: transparent;
            border: none;
            color: var(--admin-text-muted);
            font-size: 24px;
            cursor: pointer;
            line-height: 1;
            transition: color 0.15s ease;
          }

          .close-btn:hover {
            color: var(--admin-text);
          }

          .user-header {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .user-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: var(--admin-inner-bg);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            color: var(--admin-accent);
            font-size: 18px;
            overflow: hidden;
            flex-shrink: 0;
          }

          .user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .user-info {
            flex: 1;
            min-width: 0;
          }

          .user-name {
            font-size: 18px;
            font-weight: 600;
            color: var(--admin-text);
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .user-email {
            font-size: 13px;
            color: var(--admin-text-muted);
            font-family: monospace;
          }

          .status-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
          }

          .status-badge.active {
            background: rgba(16, 185, 129, 0.15);
            color: var(--admin-accent);
          }

          .status-badge.suspended {
            background: rgba(239, 68, 68, 0.15);
            color: var(--admin-error);
          }

          .tabs {
            display: flex;
            border-bottom: 1px solid var(--admin-border);
            padding: 0 20px;
          }

          .tab {
            padding: 12px 16px;
            background: transparent;
            border: none;
            color: var(--admin-text-muted);
            font-size: 14px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
            transition: all 0.15s ease;
          }

          .tab:hover {
            color: var(--admin-text);
          }

          .tab.active {
            color: var(--admin-accent);
            border-bottom-color: var(--admin-accent);
          }

          .panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
          }

          /* Overview tab */
          .stat-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }

          .stat-item {
            background: var(--admin-card);
            border: 1px solid var(--admin-border);
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }

          .stat-label {
            display: block;
            font-size: 11px;
            color: var(--admin-text-muted);
            text-transform: uppercase;
            margin-bottom: 4px;
          }

          .stat-value {
            font-size: 16px;
            font-weight: 600;
            color: var(--admin-text);
          }

          .plan-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }

          .plan-free { background: var(--admin-inner-bg); color: var(--admin-text-muted); }
          .plan-starter { background: rgba(59, 130, 246, 0.15); color: var(--admin-info); }
          .plan-growth { background: rgba(16, 185, 129, 0.15); color: var(--admin-accent); }
          .plan-agency { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
          .plan-enterprise { background: rgba(245, 158, 11, 0.15); color: var(--admin-warning); }

          .section {
            margin-bottom: 24px;
          }

          .section-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--admin-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
          }

          .org-info {
            background: var(--admin-card);
            border: 1px solid var(--admin-border);
            border-radius: 8px;
            padding: 12px;
          }

          .org-name {
            display: block;
            font-weight: 500;
            color: var(--admin-text);
          }

          .org-role {
            font-size: 12px;
            color: var(--admin-text-muted);
            text-transform: capitalize;
          }

          .detail-list {
            background: var(--admin-card);
            border: 1px solid var(--admin-border);
            border-radius: 8px;
            overflow: hidden;
          }

          .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 12px;
            border-bottom: 1px solid var(--admin-border);
          }

          .detail-item:last-child {
            border-bottom: none;
          }

          .detail-label {
            color: var(--admin-text-muted);
            font-size: 13px;
          }

          .detail-value {
            color: var(--admin-text);
            font-size: 13px;
          }

          .detail-value.mono {
            font-family: monospace;
            font-size: 12px;
          }

          .action-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .action-btn {
            padding: 10px;
            background: var(--admin-card);
            border: 1px solid var(--admin-border);
            border-radius: 8px;
            color: var(--admin-text);
            font-size: 13px;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .action-btn:hover {
            background: var(--admin-card-hover);
            border-color: var(--admin-accent);
          }

          .action-btn.danger {
            color: var(--admin-error);
          }

          .action-btn.danger:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: var(--admin-error);
          }

          .action-btn.success {
            color: var(--admin-accent);
          }

          .action-btn.success:hover {
            background: rgba(16, 185, 129, 0.1);
            border-color: var(--admin-accent);
          }

          /* Activity tab */
          .activity-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .activity-item {
            display: flex;
            gap: 12px;
            padding: 12px;
            background: var(--admin-card);
            border: 1px solid var(--admin-border);
            border-radius: 8px;
          }

          .activity-icon {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
          }

          .activity-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .activity-desc {
            font-size: 13px;
            color: var(--admin-text);
          }

          .activity-time {
            font-size: 11px;
            color: var(--admin-text-muted);
          }

          .activity-meta {
            font-size: 11px;
            color: var(--admin-text-dim);
            font-family: monospace;
          }

          /* Notes tab */
          .add-note-form {
            margin-bottom: 20px;
          }

          .note-input {
            width: 100%;
            padding: 12px;
            background: var(--admin-card);
            border: 1px solid var(--admin-border);
            border-radius: 8px;
            color: var(--admin-text);
            font-size: 14px;
            resize: vertical;
            margin-bottom: 8px;
          }

          .note-input::placeholder {
            color: var(--admin-text-dim);
          }

          .note-input:focus {
            outline: none;
            border-color: var(--admin-accent);
          }

          .add-note-btn {
            padding: 8px 16px;
            background: var(--admin-accent);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            transition: background 0.15s ease;
          }

          .add-note-btn:hover:not(:disabled) {
            background: var(--admin-accent-hover);
          }

          .add-note-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .notes-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .note-item {
            background: var(--admin-card);
            border: 1px solid var(--admin-border);
            border-radius: 8px;
            padding: 12px;
          }

          .note-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }

          .note-author {
            font-size: 12px;
            font-weight: 500;
            color: var(--admin-text-muted);
          }

          .note-time {
            font-size: 11px;
            color: var(--admin-text-dim);
          }

          .note-content {
            font-size: 14px;
            color: var(--admin-text);
            margin: 0;
            line-height: 1.5;
          }

          .loading, .no-data {
            text-align: center;
            color: var(--admin-text-muted);
            padding: 20px;
          }

          /* Mobile responsive */
          @media (max-width: 640px) {
            .quick-view-panel {
              width: 100%;
            }

            .stat-row {
              grid-template-columns: repeat(2, 1fr);
            }

            .action-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </>
  );
}
