'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Inline SVG icons for reliability
const icons = {
  dashboard: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  campaigns: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  ),
  ai: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l1 3 3-1" />
      <path d="M19 19l-1 3-3-1" />
    </svg>
  ),
  analytics: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  more: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  ),
};

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' as const },
  { href: '/campaigns', label: 'Campaigns', icon: 'campaigns' as const },
  { href: '/recommendations', label: 'AI', icon: 'ai' as const },
  { href: '/analytics', label: 'Analytics', icon: 'analytics' as const },
  { href: '/settings', label: 'More', icon: 'more' as const },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Don't render on admin pages
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav className="bottom-nav-container">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
          >
            {icons[item.icon](active)}
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
      <style jsx global>{`
        .bottom-nav-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: var(--surface-card);
          border-top: 1px solid var(--border-default);
          z-index: 100;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          display: flex;
        }
        .bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          text-decoration: none;
          color: var(--text-secondary);
          font-size: 10px;
          font-weight: 500;
          padding: 8px 4px;
          transition: color 0.15s ease;
        }
        .bottom-nav-item.active {
          color: var(--primary);
        }
        .bottom-nav-item:active {
          transform: scale(0.95);
        }
        .bottom-nav-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
      `}</style>
    </nav>
  );
}
