'use client';

import { usePathname } from 'next/navigation';
import AIAdvisor from './AIAdvisor';

export default function AIAdvisorWrapper() {
  const pathname = usePathname();

  // Don't show floating chatbot on the full AI Advisor page
  if (pathname === '/advisor') {
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
