'use client';

import Link from 'next/link';

interface AdminSidebarProps {
  currentPath: string;
  theme?: 'light' | 'dark';
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

export default function AdminSidebar({ currentPath, theme = 'dark' }: AdminSidebarProps) {
  return (
    <aside className={`admin-sidebar ${theme}`}>
      <div className="admin-sidebar-header">
        <div className="admin-logo">
          <span className="admin-logo-icon">A</span>
          <span className="admin-logo-text">AdsMaster</span>
        </div>
        <div className="admin-badge">Admin</div>
      </div>

      <nav className="admin-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-nav-item ${currentPath === item.href || currentPath.startsWith(item.href + '/') ? 'active' : ''}`}
          >
            <span className="admin-nav-icon">{item.icon}</span>
            <span className="admin-nav-label">{item.label}</span>
          </Link>
        ))}

        <div className="admin-nav-divider" />

        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-nav-item ${currentPath === item.href ? 'active' : ''}`}
          >
            <span className="admin-nav-icon">{item.icon}</span>
            <span className="admin-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <Link href="/" className="admin-nav-item">
          <span className="admin-nav-icon">🌐</span>
          <span className="admin-nav-label">Back to App</span>
        </Link>
      </div>

      <style jsx>{`
        .admin-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 240px;
          background: #1e293b;
          border-right: 1px solid #334155;
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: all 0.2s ease;
        }

        .admin-sidebar.light {
          background: #ffffff;
          border-right-color: #e2e8f0;
        }

        .admin-sidebar-header {
          padding: 20px;
          border-bottom: 1px solid #334155;
        }

        .admin-sidebar.light .admin-sidebar-header {
          border-bottom-color: #e2e8f0;
        }

        .admin-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .admin-logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          color: white;
        }

        .admin-logo-text {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .admin-sidebar.light .admin-logo-text {
          color: #1e293b;
        }

        .admin-badge {
          display: inline-block;
          padding: 4px 8px;
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          font-size: 11px;
          font-weight: 600;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .admin-nav {
          flex: 1;
          padding: 16px 12px;
          overflow-y: auto;
        }

        :global(.admin-nav-item) {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          transition: all 0.15s ease;
          margin-bottom: 4px;
        }

        :global(.admin-sidebar.light .admin-nav-item) {
          color: #64748b;
        }

        :global(.admin-nav-item:hover) {
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
        }

        :global(.admin-sidebar.light .admin-nav-item:hover) {
          background: #f1f5f9;
          color: #334155;
        }

        :global(.admin-nav-item.active) {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        :global(.admin-sidebar.light .admin-nav-item.active) {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .admin-nav-icon {
          font-size: 18px;
          width: 24px;
          text-align: center;
        }

        .admin-nav-label {
          font-weight: 500;
        }

        .admin-nav-divider {
          height: 1px;
          background: #334155;
          margin: 12px 16px;
        }

        .admin-sidebar.light .admin-nav-divider {
          background: #e2e8f0;
        }

        .admin-sidebar-footer {
          padding: 16px 12px;
          border-top: 1px solid #334155;
        }

        .admin-sidebar.light .admin-sidebar-footer {
          border-top-color: #e2e8f0;
        }
      `}</style>
    </aside>
  );
}
