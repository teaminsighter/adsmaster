'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { useTeamMembers, inviteTeamMember, updateTeamMember, removeTeamMember } from '@/lib/hooks/useApi';

const rolePermissions = {
  owner: 'Full access, billing, delete account',
  admin: 'Manage team, settings, all campaigns',
  editor: 'Edit campaigns, apply recommendations',
  viewer: 'View-only access to dashboards',
};

// Format relative time
const formatRelativeTime = (dateStr: string | null) => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

export default function TeamSettingsPage() {
  // TODO: Get real organization ID from auth context
  const organizationId = 'demo_org';
  const { data, loading, error, refetch } = useTeamMembers(organizationId);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('viewer');
  const [inviting, setInviting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setErrorMessage('');
    try {
      await inviteTeamMember(organizationId, {
        email: inviteEmail,
        role: inviteRole,
      });
      setSuccessMessage(`Invitation sent to ${inviteEmail}`);
      setTimeout(() => setSuccessMessage(''), 5000);
      setInviteEmail('');
      setInviteRole('viewer');
      setShowInvite(false);
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateTeamMember(organizationId, memberId, { role: newRole });
      setSuccessMessage('Role updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) return;

    try {
      await removeTeamMember(organizationId, memberId);
      setSuccessMessage('Team member removed');
      setTimeout(() => setSuccessMessage(''), 3000);
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to remove team member');
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Team Members" showDateFilter={false} />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading team members...</div>
          </div>
        </div>
      </>
    );
  }

  const members = data?.members || [];

  return (
    <>
      <Header title="Team Members" showDateFilter={false} />
      <div className="page-content">
        <div style={{ maxWidth: '900px' }}>
          {/* Success Message */}
          {successMessage && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '24px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--success)',
              color: 'var(--success)',
            }}>
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '24px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
            }}>
              {errorMessage}
            </div>
          )}

          {/* Invite Section */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Invite Team Member</span>
              {data && (
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {data.total} / {data.max_members} members
                </span>
              )}
            </div>
            {showInvite ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="input"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    style={{ width: '100%' }}
                    disabled={inviting}
                  />
                </div>
                <div style={{ width: '150px' }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    Role
                  </label>
                  <select
                    className="select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    style={{ width: '100%' }}
                    disabled={inviting}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowInvite(false)}
                  disabled={inviting}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setShowInvite(true)}
                disabled={data && data.total >= data.max_members}
              >
                + Invite Team Member
              </button>
            )}
            {data && data.total >= data.max_members && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--warning)' }}>
                You've reached the maximum number of team members for your plan.
              </div>
            )}
          </div>

          {/* Team List */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Team Members</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {members.length} members
              </span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '14px',
                        }}>
                          {member.name
                            ? member.name.split(' ').map(n => n[0]).join('')
                            : member.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{member.name || 'Pending'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${member.role === 'owner' ? 'badge-primary' : 'badge-neutral'}`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${member.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {member.status === 'active' ? '● Active' : '○ Pending'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatRelativeTime(member.last_active_at)}
                    </td>
                    <td className="right">
                      {member.role !== 'owner' && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <select
                            className="select"
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            style={{ width: '100px', padding: '4px 8px', fontSize: '12px' }}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--error)' }}
                            onClick={() => handleRemove(member.id, member.name || member.email)}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Role Permissions */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Role Permissions</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {Object.entries(rolePermissions).map(([role, description]) => (
                <div key={role} style={{ padding: '12px', background: 'var(--surface-secondary)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: '4px' }}>{role}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
