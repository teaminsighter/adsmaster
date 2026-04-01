'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import BottomNav from './BottomNav';
import SidebarMobile from './SidebarMobile';

// Page titles mapping
const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/campaigns': 'Campaigns',
  '/recommendations': 'AI Recommendations',
  '/analytics': 'Analytics',
  '/keywords': 'Keywords',
  '/audiences': 'Audiences',
  '/advisor': 'AdsMaster AI',
  '/settings': 'Settings',
  '/help': 'Help',
};

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Get page title from pathname
  const getPageTitle = () => {
    // Check exact match first
    if (pageTitles[pathname]) {
      return pageTitles[pathname];
    }
    // Check for partial matches (e.g., /campaigns/123)
    for (const [path, title] of Object.entries(pageTitles)) {
      if (path !== '/' && pathname.startsWith(path)) {
        return title;
      }
    }
    return 'AdsMaster';
  };

  // Don't render shell on admin pages
  if (pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Desktop Sidebar - Sidebar handles its own mobile visibility */}
      <Sidebar />

      {/* Mobile Header - only render on mobile */}
      {isMobile && <MobileHeader title={getPageTitle()} onMenuClick={openSidebar} />}

      {/* Mobile Sidebar Overlay - only render on mobile */}
      {isMobile && <SidebarMobile isOpen={sidebarOpen} onClose={closeSidebar} />}

      {/* Main Content */}
      <main
        className="main-content"
        style={isMobile ? { marginLeft: 0, paddingBottom: '80px' } : undefined}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation - only render on mobile */}
      {isMobile && <BottomNav />}
    </>
  );
}
