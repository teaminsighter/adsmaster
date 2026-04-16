'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/campaigns', label: 'Campaigns', icon: '📢' },
  { href: '/recommendations', label: 'AI Recommendations', icon: '🤖' },
  { href: '/analytics', label: 'Analytics', icon: '📈' },
  { href: '/keywords', label: 'Keywords', icon: '🔑' },
  { href: '/audiences', label: 'Audiences', icon: '👥' },
  { href: '/advisor', label: 'AdsMaster AI', icon: '💬' },
];

const bottomNavItems = [
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

interface SidebarMobileProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SidebarMobile({ isOpen, onClose }: SidebarMobileProps) {
  const pathname = usePathname();

  // Close sidebar when route changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 150,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '280px',
        background: 'var(--surface-card)',
        zIndex: 200,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div className="sidebar-mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                background: 'var(--primary)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              A
            </div>
            <span style={{ fontWeight: '600', fontSize: '18px' }}>AdsMaster</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Account Selector */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
          <select className="select" style={{ width: '100%' }} defaultValue="all">
            <option value="all">🌐 All Accounts</option>
            <option value="google_1">🔵 Acme Corp (Google)</option>
            <option value="meta_1">🔷 Acme Corp (Meta)</option>
          </select>
          <Link
            href="/settings/accounts"
            onClick={onClose}
            style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--primary)',
              marginTop: '8px',
              textAlign: 'center',
            }}
          >
            + Connect Account
          </Link>
        </div>

        {/* Main Navigation */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={onClose}
              style={{ minHeight: '44px' }}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div style={{ borderTop: '1px solid var(--border-default)', padding: '12px 0' }}>
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={onClose}
              style={{ minHeight: '44px' }}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </aside>
    </>
  );
}
