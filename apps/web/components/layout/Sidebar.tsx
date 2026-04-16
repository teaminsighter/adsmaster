'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/campaigns', label: 'Campaigns', icon: '📢' },
  { href: '/recommendations', label: 'AI Recommendations', icon: '🤖' },
  { href: '/analytics', label: 'Analytics', icon: '📈' },
  { href: '/keywords', label: 'Keywords', icon: '🔑' },
  { href: '/audiences', label: 'Audiences', icon: '👥' },
];

const bottomNavItems = [
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

// Mock connected accounts
const connectedAccounts = [
  { id: 'all', name: 'All Accounts', platform: 'all', icon: '🌐' },
  { id: 'google_1', name: 'Acme Corp', platform: 'google', icon: '🔵' },
  { id: 'meta_1', name: 'Acme Corp', platform: 'meta', icon: '🔷' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [selectedAccount, setSelectedAccount] = useState('all');
  const isMobile = useIsMobile();

  // Don't render sidebar on admin pages
  if (pathname.startsWith('/admin')) {
    return null;
  }

  // Don't render on mobile - SidebarMobile handles that
  if (isMobile) {
    return null;
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'var(--primary)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>
            A
          </div>
          <span style={{ fontWeight: '600', fontSize: '18px' }}>AdsMaster</span>
        </div>
      </div>

      {/* Account Selector */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
        <select
          className="select"
          style={{ width: '100%' }}
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
        >
          {connectedAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.icon} {account.name} {account.platform !== 'all' ? `(${account.platform === 'google' ? 'Google' : 'Meta'})` : ''}
            </option>
          ))}
        </select>
        <Link
          href="/settings/accounts"
          style={{
            display: 'block',
            fontSize: '11px',
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
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* AdsMaster AI Link */}
        <Link
          href="/advisor"
          className={`nav-item ${pathname === '/advisor' ? 'active' : ''}`}
          style={{ marginTop: '8px' }}
        >
          <span className="nav-item-icon">💬</span>
          AdsMaster AI
        </Link>
      </nav>

      {/* Bottom Navigation */}
      <div style={{ borderTop: '1px solid var(--border-default)', padding: '12px 0' }}>
        {bottomNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
