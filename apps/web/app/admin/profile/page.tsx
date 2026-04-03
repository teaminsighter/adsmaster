'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/hooks/useAdminApi';

interface AdminProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface Session {
  id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_active_at: string;
  is_current: boolean;
}

function ProfileTab({ profile, onUpdate }: { profile: AdminProfile; onUpdate: () => void }) {
  const [name, setName] = useState(profile.name || '');
  const [email, setEmail] = useState(profile.email);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminFetch('/admin/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, email }),
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-tab">
      <div className="avatar-section">
        <div className="avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.name || 'Admin'} />
          ) : (
            <span>{(profile.name?.[0] || profile.email[0]).toUpperCase()}</span>
          )}
        </div>
        <button className="change-avatar-btn">Change Avatar</button>
      </div>

      <div className="form-section">
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Role</label>
          <input
            type="text"
            value={profile.role}
            disabled
            className="disabled"
          />
          <span className="help-text">Contact a super admin to change your role</span>
        </div>

        <div className="form-group">
          <label>Member Since</label>
          <input
            type="text"
            value={new Date(profile.created_at).toLocaleDateString()}
            disabled
            className="disabled"
          />
        </div>
      </div>

      <div className="actions">
        <button onClick={handleSave} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <style jsx>{`
        .profile-tab {}
        .avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--admin-border);
        }
        .avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          overflow: hidden;
        }
        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar span {
          font-size: 48px;
          font-weight: 700;
          color: white;
        }
        .change-avatar-btn {
          padding: 8px 16px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          font-size: 13px;
          cursor: pointer;
        }
        .form-section {
          max-width: 500px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--admin-text);
          margin-bottom: 8px;
        }
        .form-group input {
          width: 100%;
          padding: 12px 14px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
        }
        .form-group input:focus {
          outline: none;
          border-color: var(--admin-accent);
        }
        .form-group input.disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .help-text {
          font-size: 12px;
          color: var(--admin-text-dim);
          margin-top: 4px;
          display: block;
        }
        .actions {
          margin-top: 24px;
        }
        .save-btn {
          padding: 12px 24px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .save-btn:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

function SecurityTab({ profile, onUpdate }: { profile: AdminProfile; onUpdate: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [enabling2FA, setEnabling2FA] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setChanging(true);
    try {
      await adminFetch('/admin/profile/password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Password changed successfully');
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('Failed to change password');
    } finally {
      setChanging(false);
    }
  };

  const handleEnable2FA = async () => {
    setEnabling2FA(true);
    try {
      const response = await adminFetch<{ qr_code: string; secret: string }>('/admin/profile/2fa/setup', {
        method: 'POST',
      });
      setQrCode(response.qr_code);
    } catch (error) {
      console.error('Failed to setup 2FA:', error);
    } finally {
      setEnabling2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    try {
      await adminFetch('/admin/profile/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: totpCode }),
      });
      setQrCode(null);
      setTotpCode('');
      onUpdate();
    } catch (error) {
      console.error('Failed to verify 2FA:', error);
      alert('Invalid code');
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA?')) return;
    try {
      await adminFetch('/admin/profile/2fa', {
        method: 'DELETE',
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
    }
  };

  return (
    <div className="security-tab">
      <div className="section">
        <h3>Change Password</h3>

        <div className="form-group">
          <label>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          onClick={handleChangePassword}
          disabled={changing || !currentPassword || !newPassword || !confirmPassword}
          className="action-btn"
        >
          {changing ? 'Changing...' : 'Change Password'}
        </button>
      </div>

      <div className="section">
        <h3>Two-Factor Authentication</h3>

        {profile.two_factor_enabled ? (
          <div className="tfa-status enabled">
            <div className="status-info">
              <span className="status-icon">✓</span>
              <div>
                <span className="status-text">2FA is enabled</span>
                <span className="status-desc">Your account is protected with two-factor authentication</span>
              </div>
            </div>
            <button onClick={handleDisable2FA} className="disable-btn">
              Disable 2FA
            </button>
          </div>
        ) : qrCode ? (
          <div className="tfa-setup">
            <p>Scan this QR code with your authenticator app:</p>
            <div className="qr-placeholder">
              <img src={qrCode} alt="2FA QR Code" />
            </div>
            <div className="verify-form">
              <div className="form-group">
                <label>Enter verification code</label>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              <button onClick={handleVerify2FA} disabled={totpCode.length !== 6} className="action-btn">
                Verify & Enable
              </button>
            </div>
          </div>
        ) : (
          <div className="tfa-status disabled">
            <div className="status-info">
              <span className="status-icon warning">!</span>
              <div>
                <span className="status-text">2FA is not enabled</span>
                <span className="status-desc">Add an extra layer of security to your account</span>
              </div>
            </div>
            <button onClick={handleEnable2FA} disabled={enabling2FA} className="enable-btn">
              {enabling2FA ? 'Setting up...' : 'Enable 2FA'}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .security-tab {}
        .section {
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--admin-border);
        }
        .section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        .section h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 20px 0;
        }
        .form-group {
          margin-bottom: 16px;
          max-width: 400px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--admin-text);
          margin-bottom: 8px;
        }
        .form-group input {
          width: 100%;
          padding: 12px 14px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
        }
        .form-group input:focus {
          outline: none;
          border-color: var(--admin-accent);
        }
        .action-btn {
          padding: 10px 20px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .action-btn:disabled {
          opacity: 0.5;
        }
        .tfa-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-radius: 12px;
        }
        .tfa-status.enabled {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .tfa-status.disabled {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .status-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .status-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #10b981;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
        }
        .status-icon.warning {
          background: #f59e0b;
        }
        .status-text {
          display: block;
          font-weight: 600;
          color: var(--admin-text);
        }
        .status-desc {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .enable-btn {
          padding: 10px 20px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .enable-btn:disabled {
          opacity: 0.5;
        }
        .disable-btn {
          padding: 10px 20px;
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .tfa-setup {
          max-width: 400px;
        }
        .tfa-setup p {
          font-size: 14px;
          color: var(--admin-text-muted);
          margin: 0 0 16px 0;
        }
        .qr-placeholder {
          width: 200px;
          height: 200px;
          background: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .qr-placeholder img {
          max-width: 180px;
          max-height: 180px;
        }
        .verify-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      `}</style>
    </div>
  );
}

function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // Mock data for now
      setSessions([
        {
          id: '1',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          is_current: true,
        },
        {
          id: '2',
          ip_address: '10.0.0.50',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          last_active_at: new Date(Date.now() - 3600000).toISOString(),
          is_current: false,
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await adminFetch(`/admin/profile/sessions/${sessionId}`, { method: 'DELETE' });
      fetchSessions();
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const revokeAllSessions = async () => {
    if (!confirm('This will log you out of all other devices. Continue?')) return;
    try {
      await adminFetch('/admin/profile/sessions', { method: 'DELETE' });
      fetchSessions();
    } catch (error) {
      console.error('Failed to revoke sessions:', error);
    }
  };

  const parseUserAgent = (ua: string) => {
    if (ua.includes('iPhone')) return { device: 'iPhone', browser: 'Safari', icon: '📱' };
    if (ua.includes('iPad')) return { device: 'iPad', browser: 'Safari', icon: '📱' };
    if (ua.includes('Android')) return { device: 'Android', browser: 'Chrome', icon: '📱' };
    if (ua.includes('Mac')) return { device: 'Mac', browser: ua.includes('Chrome') ? 'Chrome' : 'Safari', icon: '💻' };
    if (ua.includes('Windows')) return { device: 'Windows', browser: ua.includes('Chrome') ? 'Chrome' : 'Edge', icon: '💻' };
    return { device: 'Unknown', browser: 'Unknown', icon: '🖥️' };
  };

  if (loading) {
    return <div className="loading">Loading sessions...</div>;
  }

  return (
    <div className="sessions-tab">
      <div className="section-header">
        <h3>Active Sessions</h3>
        <button onClick={revokeAllSessions} className="revoke-all-btn">
          Revoke All Other Sessions
        </button>
      </div>

      <div className="sessions-list">
        {sessions.map((session) => {
          const { device, browser, icon } = parseUserAgent(session.user_agent);
          return (
            <div key={session.id} className={`session-item ${session.is_current ? 'current' : ''}`}>
              <div className="session-icon">{icon}</div>
              <div className="session-info">
                <div className="session-device">
                  {device} - {browser}
                  {session.is_current && <span className="current-badge">Current</span>}
                </div>
                <div className="session-meta">
                  <span>IP: {session.ip_address}</span>
                  <span>Last active: {new Date(session.last_active_at).toLocaleString()}</span>
                </div>
              </div>
              {!session.is_current && (
                <button onClick={() => revokeSession(session.id)} className="revoke-btn">
                  Revoke
                </button>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .sessions-tab {}
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .section-header h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .revoke-all-btn {
          padding: 8px 16px;
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .session-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
        }
        .session-item.current {
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .session-icon {
          font-size: 28px;
        }
        .session-info {
          flex: 1;
        }
        .session-device {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
          color: var(--admin-text);
          margin-bottom: 4px;
        }
        .current-badge {
          padding: 2px 8px;
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          font-size: 11px;
          font-weight: 600;
          border-radius: 4px;
        }
        .session-meta {
          display: flex;
          gap: 20px;
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .revoke-btn {
          padding: 6px 14px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          font-size: 13px;
          cursor: pointer;
        }
        .revoke-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

function ActivityTab() {
  const [activities, setActivities] = useState([
    { id: '1', action: 'Logged in', ip: '192.168.1.1', time: new Date().toISOString() },
    { id: '2', action: 'Updated user settings', ip: '192.168.1.1', time: new Date(Date.now() - 3600000).toISOString() },
    { id: '3', action: 'Changed feature flag', ip: '192.168.1.1', time: new Date(Date.now() - 7200000).toISOString() },
    { id: '4', action: 'Viewed user details', ip: '192.168.1.1', time: new Date(Date.now() - 86400000).toISOString() },
    { id: '5', action: 'Logged in', ip: '10.0.0.50', time: new Date(Date.now() - 172800000).toISOString() },
  ]);

  return (
    <div className="activity-tab">
      <h3>Recent Activity</h3>

      <div className="activity-list">
        {activities.map((activity) => (
          <div key={activity.id} className="activity-item">
            <div className="activity-dot" />
            <div className="activity-content">
              <span className="activity-action">{activity.action}</span>
              <div className="activity-meta">
                <span>IP: {activity.ip}</span>
                <span>{new Date(activity.time).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .activity-tab {}
        .activity-tab h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 20px 0;
        }
        .activity-list {
          display: flex;
          flex-direction: column;
        }
        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid var(--admin-border);
        }
        .activity-item:last-child {
          border-bottom: none;
        }
        .activity-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--admin-accent);
          margin-top: 6px;
          flex-shrink: 0;
        }
        .activity-content {
          flex: 1;
        }
        .activity-action {
          display: block;
          font-weight: 500;
          color: var(--admin-text);
          margin-bottom: 4px;
        }
        .activity-meta {
          display: flex;
          gap: 20px;
          font-size: 13px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'sessions' | 'activity'>('profile');
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // For now, use mock data
      setProfile({
        id: '1',
        email: 'admin@adsmaster.io',
        name: 'Admin User',
        role: 'super_admin',
        avatar_url: null,
        is_active: true,
        two_factor_enabled: false,
        last_login_at: new Date().toISOString(),
        created_at: '2024-01-01T00:00:00Z',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: '👤' },
    { id: 'security' as const, label: 'Security', icon: '🔒' },
    { id: 'sessions' as const, label: 'Sessions', icon: '💻' },
    { id: 'activity' as const, label: 'Activity', icon: '📋' },
  ];

  if (loading || !profile) {
    return (
      <div className="profile-page">
        <div className="loading">Loading profile...</div>
        <style jsx>{`
          .profile-page {
            max-width: 800px;
          }
          .loading {
            text-align: center;
            padding: 60px;
            color: var(--admin-text-muted);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <h1 className="page-title">My Profile</h1>
      <p className="page-subtitle">Manage your account settings and security preferences.</p>

      <div className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'profile' && <ProfileTab profile={profile} onUpdate={fetchProfile} />}
        {activeTab === 'security' && <SecurityTab profile={profile} onUpdate={fetchProfile} />}
        {activeTab === 'sessions' && <SessionsTab />}
        {activeTab === 'activity' && <ActivityTab />}
      </div>

      <style jsx>{`
        .profile-page {
          max-width: 800px;
        }
        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 8px 0;
        }
        .page-subtitle {
          font-size: 14px;
          color: var(--admin-text-muted);
          margin: 0 0 24px 0;
        }
        .tab-nav {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          padding: 4px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
          width: fit-content;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--admin-text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          color: var(--admin-text);
        }
        .tab-btn.active {
          background: var(--admin-card);
          color: var(--admin-accent);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .tab-icon {
          font-size: 14px;
        }
        .tab-content {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 24px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .page-title { font-size: 20px; }
          .page-subtitle { margin-bottom: 16px; }
          .tab-nav {
            width: 100%;
            gap: 4px;
            margin-bottom: 16px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .tab-btn {
            padding: 8px 12px;
            font-size: 12px;
            gap: 6px;
            white-space: nowrap;
          }
          .tab-icon { font-size: 13px; }
          .tab-content { padding: 16px; }
        }
      `}</style>
    </div>
  );
}
