'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMobileHeader from '@/components/admin/AdminMobileHeader';
import AdminSidebarMobile from '@/components/admin/AdminSidebarMobile';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import { AdminThemeProvider, useAdminTheme } from '@/lib/contexts/AdminThemeContext';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [admin, setAdmin] = useState<{ email: string; name: string; role: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useAdminTheme();
  const isMobile = useIsMobile();

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    // Skip auth check on login page
    if (pathname === '/admin/login') {
      setIsLoading(false);
      return;
    }

    // Check for admin token
    const token = localStorage.getItem('admin_token');
    const adminData = localStorage.getItem('admin_user');

    if (!token) {
      router.push('/admin/login');
      return;
    }

    if (adminData) {
      try {
        setAdmin(JSON.parse(adminData));
      } catch (e) {
        console.error('Failed to parse admin data');
      }
    }

    setIsLoading(false);
  }, [pathname, router]);

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        <style jsx>{`
          .admin-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #0f172a;
          }
          .admin-loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Login page has its own layout
  if (pathname === '/admin/login') {
    return (
      <>
        <style jsx global>{`
          .app-layout > aside,
          .app-layout > .sidebar,
          .app-layout > nav,
          #ai-advisor-button,
          .ai-advisor-wrapper {
            display: none !important;
          }
          .app-layout {
            display: block !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 0 !important;
          }
        `}</style>
        {children}
      </>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    router.push('/admin/login');
  };

  return (
    <div className={`admin-layout ${theme} ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* Desktop: Show sidebar */}
      {!isMobile && <AdminSidebar currentPath={pathname} theme={theme} />}

      {/* Mobile: Show mobile header and sidebar drawer */}
      {isMobile && (
        <>
          <AdminMobileHeader
            theme={theme}
            onThemeToggle={toggleTheme}
            onMenuToggle={handleMenuToggle}
            onLogout={handleLogout}
            admin={admin}
          />
          <AdminSidebarMobile
            isOpen={sidebarOpen}
            onClose={handleCloseSidebar}
            currentPath={pathname}
            theme={theme}
          />
        </>
      )}

      <div className="admin-main">
        {/* Desktop: Show header */}
        {!isMobile && (
          <AdminHeader admin={admin} onLogout={handleLogout} theme={theme} onThemeToggle={toggleTheme} />
        )}
        <div className="admin-content">
          {children}
        </div>
      </div>

      {/* Mobile: Show bottom nav */}
      {isMobile && (
        <AdminBottomNav
          currentPath={pathname}
          theme={theme}
          onMoreClick={handleMenuToggle}
        />
      )}

      <style jsx global>{`
        .app-layout > aside,
        .app-layout > .sidebar,
        .app-layout > nav,
        #ai-advisor-button,
        .ai-advisor-wrapper {
          display: none !important;
        }
        .app-layout {
          display: block !important;
        }
        .main-content {
          margin-left: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      <style jsx>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: #0f172a;
          color: #e2e8f0;
          transition: all 0.2s ease;
        }
        .admin-layout.light {
          background: #f1f5f9;
          color: #1e293b;
        }
        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-left: 240px;
        }
        .admin-layout.mobile .admin-main {
          margin-left: 0;
          padding-top: 56px;
          padding-bottom: 64px;
        }
        .admin-content {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }
        .admin-layout.mobile .admin-content {
          padding: 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
        }
      `}</style>
      <style jsx global>{`
        /* Admin Theme Variables */
        .admin-layout {
          --admin-bg: #0f172a;
          --admin-card: #1e293b;
          --admin-card-hover: #334155;
          --admin-border: #334155;
          --admin-text: #f1f5f9;
          --admin-text-muted: #94a3b8;
          --admin-text-dim: #64748b;
          --admin-accent: #10b981;
          --admin-accent-hover: #059669;
          --admin-error: #f87171;
          --admin-warning: #f59e0b;
          --admin-info: #3b82f6;
          --admin-input-bg: #1e293b;
          --admin-inner-bg: rgba(0, 0, 0, 0.2);
        }
        .admin-layout.light {
          --admin-bg: #f1f5f9;
          --admin-card: #ffffff;
          --admin-card-hover: #f8fafc;
          --admin-border: #e2e8f0;
          --admin-text: #1e293b;
          --admin-text-muted: #64748b;
          --admin-text-dim: #94a3b8;
          --admin-accent: #10b981;
          --admin-accent-hover: #059669;
          --admin-error: #dc2626;
          --admin-warning: #d97706;
          --admin-info: #2563eb;
          --admin-input-bg: #ffffff;
          --admin-inner-bg: #f1f5f9;
        }

        /* ========== LIGHT MODE COMPREHENSIVE OVERRIDES ========== */

        /* Page titles and headings */
        .admin-layout.light .page-title,
        .admin-layout.light .panel-title,
        .admin-layout.light h1,
        .admin-layout.light h2,
        .admin-layout.light h3 {
          color: #1e293b !important;
        }

        /* Cards, panels, containers */
        .admin-layout.light .stat-card,
        .admin-layout.light .panel,
        .admin-layout.light .data-card,
        .admin-layout.light .billing-card,
        .admin-layout.light .table-container,
        .admin-layout.light .card,
        .admin-layout.light .metric-card,
        .admin-layout.light [class*="rounded-"][class*="border"],
        .admin-layout.light [class*="bg-slate-800"],
        .admin-layout.light [class*="bg-\\[\\#1e293b\\]"] {
          background: #ffffff !important;
          border-color: #e2e8f0 !important;
        }

        /* Form elements */
        .admin-layout.light .period-select,
        .admin-layout.light select,
        .admin-layout.light input[type="text"],
        .admin-layout.light input[type="search"],
        .admin-layout.light input[type="email"],
        .admin-layout.light input[type="number"],
        .admin-layout.light input[type="password"],
        .admin-layout.light textarea {
          background: #ffffff !important;
          border-color: #e2e8f0 !important;
          color: #1e293b !important;
        }

        .admin-layout.light select option {
          background: #ffffff !important;
          color: #1e293b !important;
        }

        /* Buttons */
        .admin-layout.light .refresh-btn,
        .admin-layout.light button:not([class*="bg-green"]):not([class*="bg-red"]):not([class*="bg-blue"]) {
          background: #f1f5f9 !important;
          border-color: #e2e8f0 !important;
          color: #334155 !important;
        }

        .admin-layout.light .refresh-btn:hover,
        .admin-layout.light button:not([class*="bg-green"]):not([class*="bg-red"]):not([class*="bg-blue"]):hover {
          background: #e2e8f0 !important;
        }

        /* Tab buttons */
        .admin-layout.light .tab-btn,
        .admin-layout.light [class*="tab"] {
          color: #64748b !important;
        }

        .admin-layout.light .tab-btn.active,
        .admin-layout.light [class*="tab"].active,
        .admin-layout.light .tab-btn:hover,
        .admin-layout.light [class*="tab"]:hover {
          color: #10b981 !important;
          border-color: #10b981 !important;
        }

        /* Text colors */
        .admin-layout.light .stat-label,
        .admin-layout.light .empty,
        .admin-layout.light .loading,
        .admin-layout.light [class*="text-slate-400"],
        .admin-layout.light [class*="text-gray-400"] {
          color: #64748b !important;
        }

        .admin-layout.light .stat-value,
        .admin-layout.light [class*="text-slate-200"],
        .admin-layout.light [class*="text-white"],
        .admin-layout.light [class*="text-gray-200"] {
          color: #1e293b !important;
        }

        /* Inner items with dark backgrounds */
        .admin-layout.light .status-item,
        .admin-layout.light .endpoint-item,
        .admin-layout.light .activity-item,
        .admin-layout.light .config-item,
        .admin-layout.light .log-item,
        .admin-layout.light .list-item,
        .admin-layout.light [class*="bg-black\\/"],
        .admin-layout.light [class*="bg-slate-900"] {
          background: #f8fafc !important;
        }

        /* Text in items */
        .admin-layout.light .endpoint-path,
        .admin-layout.light .status-code,
        .admin-layout.light .activity-action,
        .admin-layout.light .config-key,
        .admin-layout.light td,
        .admin-layout.light .cell,
        .admin-layout.light [class*="text-slate-300"] {
          color: #334155 !important;
        }

        /* Table styles */
        .admin-layout.light th,
        .admin-layout.light .table-header {
          color: #64748b !important;
          background: #f8fafc !important;
          border-color: #e2e8f0 !important;
        }

        .admin-layout.light table {
          border-color: #e2e8f0 !important;
        }

        .admin-layout.light tbody tr {
          border-color: #e2e8f0 !important;
        }

        .admin-layout.light tbody tr:hover,
        .admin-layout.light .row:hover {
          background: #f8fafc !important;
        }

        /* Muted/dim text */
        .admin-layout.light .status-value,
        .admin-layout.light .stat-sub,
        .admin-layout.light .activity-resource,
        .admin-layout.light .activity-time,
        .admin-layout.light .config-desc,
        .admin-layout.light [class*="text-slate-500"],
        .admin-layout.light [class*="text-gray-500"] {
          color: #94a3b8 !important;
        }

        /* Status colors - keep them visible in light mode */
        .admin-layout.light [class*="text-green-400"] {
          color: #059669 !important;
        }
        .admin-layout.light [class*="text-red-400"] {
          color: #dc2626 !important;
        }
        .admin-layout.light [class*="text-amber-400"] {
          color: #d97706 !important;
        }
        .admin-layout.light [class*="text-blue-400"] {
          color: #2563eb !important;
        }

        /* Keep accent color consistent */
        .admin-layout.light .stat-value:not(.error) {
          color: #10b981 !important;
        }

        /* Chart containers */
        .admin-layout.light .chart-container,
        .admin-layout.light [class*="recharts"] {
          background: transparent !important;
        }

        /* Space-y containers */
        .admin-layout.light [class*="space-y"] > * {
          border-color: #e2e8f0 !important;
        }

        /* Grid cards */
        .admin-layout.light [class*="grid"] > [class*="rounded"] {
          background: #ffffff !important;
          border-color: #e2e8f0 !important;
        }

        /* Scrollbar for light mode */
        .admin-layout.light ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .admin-layout.light ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
        }
        .admin-layout.light ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminThemeProvider>
  );
}
