'use client';

import Link from 'next/link';
import { X, Globe } from 'lucide-react';
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
  Webhook,
  LucideIcon,
} from 'lucide-react';
import { useEffect } from 'react';

interface AdminSidebarMobileProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  theme: 'light' | 'dark';
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

// Grouped navigation structure (same as desktop)
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

export default function AdminSidebarMobile({
  isOpen,
  onClose,
  currentPath,
  theme,
}: AdminSidebarMobileProps) {
  const isActive = (href: string) => {
    return currentPath === href || currentPath.startsWith(href + '/');
  };

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
          {navSections.map((section) => (
            <div key={section.title} className="nav-section">
              <div className="nav-section-title">{section.title}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <Icon className="nav-icon-svg" size={20} />
                    <span className="nav-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          <div className="nav-divider" />

          <div className="nav-section">
            <div className="nav-section-title">ADMIN</div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <Icon className="nav-icon-svg" size={20} />
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <Link href="/" className="nav-item back-link" onClick={onClose}>
            <Globe size={20} />
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

        .nav-section {
          margin-bottom: 8px;
        }

        .nav-section-title {
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px 16px 6px;
          margin-top: 4px;
        }

        .admin-sidebar-mobile.light .nav-section-title {
          color: #94a3b8;
        }

        :global(.nav-item) {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 15px;
          transition: all 0.15s ease;
          margin-bottom: 2px;
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

        :global(.nav-icon-svg) {
          flex-shrink: 0;
        }

        .nav-label {
          font-weight: 500;
        }

        .nav-divider {
          height: 1px;
          background: #334155;
          margin: 8px 16px;
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
