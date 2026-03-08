'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending';
  lastActive: string;
}

const mockTeam: TeamMember[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'owner', status: 'active', lastActive: '2 minutes ago' },
  { id: '2', name: 'Sarah Smith', email: 'sarah@example.com', role: 'admin', status: 'active', lastActive: '1 hour ago' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'editor', status: 'active', lastActive: '3 hours ago' },
  { id: '4', name: 'Pending User', email: 'pending@example.com', role: 'viewer', status: 'pending', lastActive: 'Never' },
];

const rolePermissions = {
  owner: 'Full access, billing, delete account',
  admin: 'Manage team, settings, all campaigns',
  editor: 'Edit campaigns, apply recommendations',
  viewer: 'View-only access to dashboards',
};

export default function TeamSettingsPage() {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('viewer');

  return (
    <>
      <Header title="Team Members" />
      <div className="page-content">
        <div style={{ maxWidth: '900px' }}>
          {/* Invite Section */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Invite Team Member</span>
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
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button className="btn btn-primary">Send Invite</button>
                <button className="btn btn-ghost" onClick={() => setShowInvite(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
                + Invite Team Member
              </button>
            )}
          </div>

          {/* Team List */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Team Members</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {mockTeam.length} members
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
                {mockTeam.map((member) => (
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
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{member.name}</div>
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
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{member.lastActive}</td>
                    <td className="right">
                      {member.role !== 'owner' && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm">Edit</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }}>Remove</button>
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
