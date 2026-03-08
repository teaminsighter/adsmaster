'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/campaigns', label: 'Campaigns', icon: '📢' },
  { href: '/recommendations', label: 'AI Recommendations', icon: '🤖' },
  { href: '/analytics', label: 'Analytics', icon: '📈' },
  { href: '/keywords', label: 'Keywords', icon: '🔑' },
  { href: '/audiences', label: 'Audiences', icon: '👥' },
];

const bottomNavItems = [
  { href: '/settings', label: 'Settings', icon: '⚙️' },
  { href: '/help', label: 'Help', icon: '❓' },
];

export default function Sidebar() {
  const pathname = usePathname();

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
        <select className="select" style={{ width: '100%' }}>
          <option>All Accounts</option>
          <option>Acme Corp - Google</option>
          <option>Acme Corp - Meta</option>
        </select>
      </div>

      {/* Main Navigation */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
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
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
