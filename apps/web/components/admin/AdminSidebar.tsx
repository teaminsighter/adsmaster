'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Building2,
  Megaphone,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Brain,
  Lightbulb,
  BarChart3,
  Activity,
  HeartPulse,
  Cog,
  FileText,
  Mail,
  Bell,
  Settings,
  User,
  Globe,
  Webhook,
  LucideIcon,
} from 'lucide-react';

interface AdminSidebarProps {
  currentPath: string;
  theme?: 'light' | 'dark';
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Grouped navigation structure
const navSections: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'USERS & ACCOUNTS',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/organizations', label: 'Organizations', icon: Building2 },
      { href: '/admin/ad-accounts', label: 'Ad Accounts', icon: Megaphone },
    ],
  },
  {
    title: 'REVENUE',
    items: [
      { href: '/admin/billing', label: 'Billing', icon: CreditCard },
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: RefreshCw },
      { href: '/admin/marketing', label: 'Marketing', icon: TrendingUp },
    ],
  },
  {
    title: 'PLATFORM',
    items: [
      { href: '/admin/ai', label: 'AI Control', icon: Brain },
      { href: '/admin/recommendations', label: 'Recommendations', icon: Lightbulb },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { href: '/admin/api-monitor', label: 'API Monitor', icon: Activity },
      { href: '/admin/system', label: 'System Health', icon: HeartPulse },
      { href: '/admin/jobs', label: 'Background Jobs', icon: Cog },
      { href: '/admin/webhooks', label: 'Webhooks', icon: Webhook },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
    ],
  },
  {
    title: 'COMMUNICATIONS',
    items: [
      { href: '/admin/emails', label: 'Email Templates', icon: Mail },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
    ],
  },
];

// Admin section (Settings & Profile)
const adminItems: NavItem[] = [
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/profile', label: 'Profile', icon: User },
];

export default function AdminSidebar({ currentPath, theme = 'dark' }: AdminSidebarProps) {
  const isActive = (href: string) => {
    return currentPath === href || currentPath.startsWith(href + '/');
  };

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
        {navSections.map((section, sectionIndex) => (
          <div key={section.title} className="admin-nav-section">
            <div className="admin-nav-section-title">{section.title}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-item ${isActive(item.href) ? 'active' : ''}`}
                >
                  <Icon className="admin-nav-icon" size={18} />
                  <span className="admin-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        <div className="admin-nav-divider" />

        <div className="admin-nav-section">
          <div className="admin-nav-section-title">ADMIN</div>
          {adminItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${isActive(item.href) ? 'active' : ''}`}
              >
                <Icon className="admin-nav-icon" size={18} />
                <span className="admin-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="admin-sidebar-footer">
        <Link href="/" className="admin-nav-item">
          <Globe className="admin-nav-icon" size={18} />
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
          padding: 12px 12px;
          overflow-y: auto;
        }

        .admin-nav-section {
          margin-bottom: 8px;
        }

        .admin-nav-section-title {
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px 16px 6px;
          margin-top: 4px;
        }

        .admin-sidebar.light .admin-nav-section-title {
          color: #94a3b8;
        }

        :global(.admin-nav-item) {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-radius: 8px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          transition: all 0.15s ease;
          margin-bottom: 2px;
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

        :global(.admin-nav-icon) {
          flex-shrink: 0;
        }

        .admin-nav-label {
          font-weight: 500;
        }

        .admin-nav-divider {
          height: 1px;
          background: #334155;
          margin: 8px 16px;
        }

        .admin-sidebar.light .admin-nav-divider {
          background: #e2e8f0;
        }

        .admin-sidebar-footer {
          padding: 12px;
          border-top: 1px solid #334155;
        }

        .admin-sidebar.light .admin-sidebar-footer {
          border-top-color: #e2e8f0;
        }
      `}</style>
    </aside>
  );
}
