'use client';

import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import AIAdvisor from './AIAdvisor';

export default function AIAdvisorWrapper() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Don't show floating chatbot on mobile (AI is in bottom nav), on AI Advisor page, or admin pages
  if (isMobile || pathname === '/advisor' || pathname.startsWith('/admin')) {
    return null;
  }

  // Determine context based on current page
  const getContext = () => {
    if (pathname.includes('/recommendations')) {
      return { page: 'recommendations' };
    } else if (pathname.includes('/campaigns')) {
      return { page: 'campaigns' };
    } else if (pathname.includes('/analytics')) {
      return { page: 'analytics' };
    } else if (pathname.includes('/keywords')) {
      return { page: 'keywords' };
    } else if (pathname === '/') {
      return { page: 'dashboard' };
    }
    return { page: pathname.replace('/', '') || 'dashboard' };
  };

  return <AIAdvisor context={getContext()} />;
}
