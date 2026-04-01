'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MobileHeaderProps {
  title?: string;
  onMenuClick: () => void;
}

export default function MobileHeader({ title = 'Dashboard', onMenuClick }: MobileHeaderProps) {
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      setTheme(saved as 'light' | 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <header style={{
      display: 'flex',
      height: '56px',
      background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-default)',
      padding: '0 12px',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    }}>
      <div className="mobile-header-left">
        <button className="hamburger-btn" onClick={onMenuClick} aria-label="Open menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{title}</h1>
      </div>

      <div className="mobile-header-right">
        {/* AI Chat Button */}
        <button
          className="hamburger-btn"
          onClick={() => router.push('/advisor')}
          aria-label="AI Advisor"
          style={{ color: 'var(--primary)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            <path d="M5 19l1 3 3-1" />
            <path d="M19 19l-1 3-3-1" />
          </svg>
        </button>

        {/* Theme Toggle */}
        <button
          className="hamburger-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* Profile */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            className="hamburger-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            JD
          </button>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                width: '240px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '12px', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>John Doe</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>john@example.com</div>
              </div>
              <div style={{ padding: '8px' }}>
                <Link
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  ⚙️ Settings
                </Link>
                <Link
                  href="/settings/billing"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  💳 Billing
                </Link>
              </div>
              <div style={{ padding: '8px', borderTop: '1px solid var(--border-default)' }}>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    alert('Logout not available in demo mode.');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--error)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  🚪 Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
