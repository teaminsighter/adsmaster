'use client';

import Link from 'next/link';
import { LayoutDashboard, Users, CreditCard, Bot, Settings, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

interface AdminBottomNavProps {
  currentPath: string;
  theme: 'light' | 'dark';
  onMoreClick: () => void;
}

const quickTabs = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/admin/ai', label: 'AI', icon: Bot },
  { href: '/admin/system', label: 'System', icon: Settings },
];

export default function AdminBottomNav({ currentPath, theme, onMoreClick }: AdminBottomNavProps) {
  const isActive = (href: string) => {
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  // Check if current path is one of the quick tabs or needs "More" to be highlighted
  const isMoreActive = !quickTabs.some((tab) => isActive(tab.href));

  return (
    <nav className={`admin-bottom-nav ${theme}`}>
      {quickTabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`nav-tab ${active ? 'active' : ''}`}>
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            <span className="nav-label">{tab.label}</span>
          </Link>
        );
      })}
      <button
        className={`nav-tab more-btn ${isMoreActive ? 'active' : ''}`}
        onClick={onMoreClick}
        aria-label="More options"
      >
        <MoreHorizontal size={22} strokeWidth={isMoreActive ? 2.5 : 2} />
        <span className="nav-label">More</span>
      </button>

      <style jsx>{`
        .admin-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: #1e293b;
          border-top: 1px solid #334155;
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0 8px;
          padding-bottom: env(safe-area-inset-bottom, 0);
          z-index: 200;
        }

        .admin-bottom-nav.light {
          background: #ffffff;
          border-top-color: #e2e8f0;
        }

        :global(.nav-tab) {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 12px;
          min-width: 56px;
          color: #64748b;
          text-decoration: none;
          font-size: 11px;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.15s ease;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        :global(.admin-bottom-nav.light .nav-tab) {
          color: #94a3b8;
        }

        :global(.nav-tab:hover) {
          color: #94a3b8;
        }

        :global(.admin-bottom-nav.light .nav-tab:hover) {
          color: #64748b;
        }

        :global(.nav-tab.active) {
          color: #10b981;
        }

        :global(.admin-bottom-nav.light .nav-tab.active) {
          color: #059669;
        }

        .nav-label {
          line-height: 1;
        }

        .more-btn {
          font-family: inherit;
        }
      `}</style>
    </nav>
  );
}
