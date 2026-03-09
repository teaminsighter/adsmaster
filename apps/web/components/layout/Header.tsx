'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DateRangePicker from '@/components/ui/DateRangePicker';

interface DateRange {
  start: Date;
  end: Date;
}

interface HeaderProps {
  title?: string;
  showDateFilter?: boolean;
  onDateRangeChange?: (range: DateRange) => void;
}

// Get default date range (last 7 days)
function getDefaultDateRange(): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  return { start, end: today };
}

export default function Header({ title = 'Dashboard', showDateFilter = true, onDateRangeChange }: HeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for saved theme or system preference
    const saved = localStorage.getItem('theme');
    if (saved) {
      setTheme(saved as 'light' | 'dark');
      document.body.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.body.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    onDateRangeChange?.(range);
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Date Range Picker - conditionally shown */}
        {showDateFilter && (
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
          />
        )}

        {/* Theme Toggle */}
        <div className="theme-toggle">
          <button
            className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => toggleTheme('light')}
          >
            ☀️
          </button>
          <button
            className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => toggleTheme('dark')}
          >
            🌙
          </button>
        </div>

        {/* User Avatar with Dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 600,
              color: 'white',
              cursor: 'pointer',
            }}
          >
            JD
          </div>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                width: '280px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              {/* Profile Info */}
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    JD
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>John Doe</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>john@example.com</div>
                    <span className="badge badge-success" style={{ marginTop: '4px' }}>Pro Plan</span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div style={{ padding: '8px' }}>
                <Link
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                  className="profile-menu-item"
                >
                  <span style={{ fontSize: '16px' }}>⚙️</span>
                  Settings
                </Link>
                <Link
                  href="/settings/billing"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                  className="profile-menu-item"
                >
                  <span style={{ fontSize: '16px' }}>💳</span>
                  Billing
                </Link>
                <Link
                  href="/help"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                  className="profile-menu-item"
                >
                  <span style={{ fontSize: '16px' }}>❓</span>
                  Help & Support
                </Link>
              </div>

              {/* Logout */}
              <div style={{ padding: '8px', borderTop: '1px solid var(--border-default)' }}>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    alert('Logout not available in demo mode.');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    color: 'var(--error)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  className="profile-menu-item"
                >
                  <span style={{ fontSize: '16px' }}>🚪</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .profile-menu-item:hover {
          background: var(--surface-hover);
        }
      `}</style>
    </header>
  );
}
