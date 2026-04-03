'use client';

import { Menu, Moon, Sun, LogOut } from 'lucide-react';

interface AdminMobileHeaderProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onMenuToggle: () => void;
  onLogout: () => void;
  admin: { name: string; email: string } | null;
}

export default function AdminMobileHeader({
  theme,
  onThemeToggle,
  onMenuToggle,
  onLogout,
  admin,
}: AdminMobileHeaderProps) {
  return (
    <header className={`admin-mobile-header ${theme}`}>
      <button className="menu-btn" onClick={onMenuToggle} aria-label="Open menu">
        <Menu size={24} />
      </button>

      <div className="header-center">
        <span className="logo-icon">A</span>
        <span className="header-title">Admin</span>
      </div>

      <div className="header-right">
        <button className="icon-btn" onClick={onThemeToggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button className="icon-btn" onClick={onLogout} aria-label="Logout">
          <LogOut size={20} />
        </button>
      </div>

      <style jsx>{`
        .admin-mobile-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 56px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          z-index: 200;
        }

        .admin-mobile-header.light {
          background: #ffffff;
          border-bottom-color: #e2e8f0;
        }

        .menu-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.15s ease;
        }

        .admin-mobile-header.light .menu-btn {
          color: #64748b;
        }

        .menu-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
        }

        .admin-mobile-header.light .menu-btn:hover {
          background: #f1f5f9;
          color: #334155;
        }

        .header-center {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-icon {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          color: white;
        }

        .header-title {
          font-size: 16px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .admin-mobile-header.light .header-title {
          color: #1e293b;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .icon-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.15s ease;
        }

        .admin-mobile-header.light .icon-btn {
          color: #64748b;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
        }

        .admin-mobile-header.light .icon-btn:hover {
          background: #f1f5f9;
          color: #334155;
        }
      `}</style>
    </header>
  );
}
