'use client';

import { useState, useEffect } from 'react';

interface AdminHeaderProps {
  admin: { email: string; name: string; role: string } | null;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export default function AdminHeader({ admin, onLogout, theme, onThemeToggle }: AdminHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className={`admin-header ${theme}`}>
      <div className="admin-header-left">
        <h1 className="admin-header-title">Admin Panel</h1>
      </div>

      <div className="admin-header-right">
        {/* Theme Toggle */}
        <button
          className="theme-toggle"
          onClick={onThemeToggle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <button className="admin-refresh-btn" onClick={() => window.location.reload()}>
          🔄 Refresh
        </button>

        <div className="admin-user-menu">
          <button className="admin-user-btn" onClick={() => setShowMenu(!showMenu)}>
            <div className="admin-user-avatar">
              {admin?.name?.[0] || admin?.email?.[0] || 'A'}
            </div>
            <div className="admin-user-info">
              <span className="admin-user-name">{admin?.name || admin?.email || 'Admin'}</span>
              <span className="admin-user-role">{admin?.role || 'admin'}</span>
            </div>
            <span className="admin-user-chevron">▼</span>
          </button>

          {showMenu && (
            <div className="admin-dropdown">
              <button className="admin-dropdown-item" onClick={onLogout}>
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          transition: all 0.2s ease;
        }

        .admin-header.light {
          background: #ffffff;
          border-bottom-color: #e2e8f0;
        }

        .admin-header-title {
          font-size: 20px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0;
        }

        .admin-header.light .admin-header-title {
          color: #1e293b;
        }

        .admin-header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .theme-toggle {
          padding: 8px 12px;
          background: #334155;
          border: none;
          border-radius: 6px;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .admin-header.light .theme-toggle {
          background: #f1f5f9;
        }

        .theme-toggle:hover {
          background: #475569;
          transform: scale(1.05);
        }

        .admin-header.light .theme-toggle:hover {
          background: #e2e8f0;
        }

        .admin-refresh-btn {
          padding: 8px 16px;
          background: #334155;
          border: none;
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .admin-header.light .admin-refresh-btn {
          background: #f1f5f9;
          color: #334155;
        }

        .admin-refresh-btn:hover {
          background: #475569;
        }

        .admin-header.light .admin-refresh-btn:hover {
          background: #e2e8f0;
        }

        .admin-user-menu {
          position: relative;
        }

        .admin-user-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: transparent;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #e2e8f0;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .admin-header.light .admin-user-btn {
          border-color: #e2e8f0;
          color: #334155;
        }

        .admin-user-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: #475569;
        }

        .admin-header.light .admin-user-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .admin-user-avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          color: white;
        }

        .admin-user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .admin-user-name {
          font-size: 14px;
          font-weight: 500;
        }

        .admin-user-role {
          font-size: 11px;
          color: #94a3b8;
          text-transform: capitalize;
        }

        .admin-header.light .admin-user-role {
          color: #64748b;
        }

        .admin-user-chevron {
          font-size: 10px;
          color: #94a3b8;
        }

        .admin-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          min-width: 160px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          z-index: 1000;
        }

        .admin-header.light .admin-dropdown {
          background: #ffffff;
          border-color: #e2e8f0;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        .admin-dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 14px;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease;
        }

        .admin-header.light .admin-dropdown-item {
          color: #334155;
        }

        .admin-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .admin-header.light .admin-dropdown-item:hover {
          background: #f1f5f9;
        }
      `}</style>
    </header>
  );
}
