'use client';

import { useState, useEffect } from 'react';
import DateRangePicker from '@/components/ui/DateRangePicker';

interface DateRange {
  start: Date;
  end: Date;
}

interface HeaderProps {
  title?: string;
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

export default function Header({ title = 'Dashboard', onDateRangeChange }: HeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);

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
        {/* Date Range Picker */}
        <DateRangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
        />

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

        {/* AI Chat Button */}
        <button
          className="btn btn-primary"
          style={{ gap: '6px' }}
          onClick={() => window.dispatchEvent(new CustomEvent('openAIAdvisor'))}
        >
          AI Advisor
        </button>

        {/* User Avatar */}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          cursor: 'pointer',
        }}>
          👤
        </div>
      </div>
    </header>
  );
}
