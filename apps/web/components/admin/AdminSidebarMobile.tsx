'use client';

import Link from 'next/link';
import { X, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';

interface AdminSidebarMobileProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  theme: 'light' | 'dark';
}

// Main navigation - 10 tabs
const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/organizations', label: 'Organizations', icon: '🏢' },
  { href: '/admin/marketing', label: 'Marketing', icon: '📈' },
  { href: '/admin/billing', label: 'Billing', icon: '💳' },
  { href: '/admin/ad-accounts', label: 'Ad Accounts', icon: '📱' },
  { href: '/admin/ai', label: 'AI & ML', icon: '🤖' },
  { href: '/admin/api-monitor', label: 'API Monitor', icon: '🔌' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📉' },
  { href: '/admin/system', label: 'System', icon: '⚙️' },
];

// Settings & Profile
const settingsItems = [
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  { href: '/admin/profile', label: 'Profile', icon: '👤' },
];

export default function AdminSidebarMobile({
  isOpen,
  onClose,
  currentPath,
  theme,
}: AdminSidebarMobileProps) {
  // Close on route change
  useEffect(() => {
    onClose();
  }, [currentPath, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar drawer */}
      <aside className={`admin-sidebar-mobile ${theme} ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">A</span>
            <span className="logo-text">AdsMaster</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close menu">
            <X size={24} />
          </button>
        </div>

        <div className="admin-badge">Admin Panel</div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${
                currentPath === item.href || currentPath.startsWith(item.href + '/') ? 'active' : ''
              }`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}

          <div className="nav-divider" />

          {settingsItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${currentPath === item.href ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link href="/" className="nav-item back-link" onClick={onClose}>
            <ExternalLink size={18} />
            <span className="nav-label">Back to App</span>
          </Link>
        </div>
      </aside>

      <style jsx>{`
        .sidebar-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 250;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }

        .sidebar-backdrop.open {
          opacity: 1;
          visibility: visible;
        }

        .admin-sidebar-mobile {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 280px;
          max-width: 85vw;
          background: #1e293b;
          z-index: 300;
          display: flex;
          flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
        }

        .admin-sidebar-mobile.open {
          transform: translateX(0);
        }

        .admin-sidebar-mobile.light {
          background: #ffffff;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 16px 12px;
          border-bottom: 1px solid #334155;
        }

        .admin-sidebar-mobile.light .sidebar-header {
          border-bottom-color: #e2e8f0;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          color: white;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .admin-sidebar-mobile.light .logo-text {
          color: #1e293b;
        }

        .close-btn {
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

        .admin-sidebar-mobile.light .close-btn {
          color: #64748b;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
        }

        .admin-sidebar-mobile.light .close-btn:hover {
          background: #f1f5f9;
          color: #334155;
        }

        .admin-badge {
          margin: 12px 16px;
          padding: 6px 12px;
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          font-size: 12px;
          font-weight: 600;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: center;
        }

        .sidebar-nav {
          flex: 1;
          padding: 8px 12px;
          overflow-y: auto;
        }

        :global(.nav-item) {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 10px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 15px;
          transition: all 0.15s ease;
          margin-bottom: 4px;
        }

        :global(.admin-sidebar-mobile.light .nav-item) {
          color: #64748b;
        }

        :global(.nav-item:hover) {
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
        }

        :global(.admin-sidebar-mobile.light .nav-item:hover) {
          background: #f1f5f9;
          color: #334155;
        }

        :global(.nav-item.active) {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        :global(.admin-sidebar-mobile.light .nav-item.active) {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .nav-icon {
          font-size: 20px;
          width: 28px;
          text-align: center;
        }

        .nav-label {
          font-weight: 500;
        }

        .nav-divider {
          height: 1px;
          background: #334155;
          margin: 12px 16px;
        }

        .admin-sidebar-mobile.light .nav-divider {
          background: #e2e8f0;
        }

        .sidebar-footer {
          padding: 12px;
          border-top: 1px solid #334155;
        }

        .admin-sidebar-mobile.light .sidebar-footer {
          border-top-color: #e2e8f0;
        }

        :global(.back-link) {
          color: #64748b !important;
        }

        :global(.back-link:hover) {
          color: #94a3b8 !important;
        }
      `}</style>
    </>
  );
}
