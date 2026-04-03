'use client';

import { useRouter } from 'next/navigation';
import { LayoutGrid, Bot, BarChart3, Settings, Link2, Zap } from 'lucide-react';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  href: string;
  color?: string;
}

const actions: QuickAction[] = [
  { icon: <LayoutGrid size={20} />, label: 'All Campaigns', href: '/campaigns' },
  { icon: <Bot size={20} />, label: 'AI Advisor', href: '/advisor', color: 'var(--primary)' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', href: '/analytics' },
  { icon: <Settings size={20} />, label: 'Settings', href: '/settings' },
  { icon: <Link2 size={20} />, label: 'Connect Account', href: '/connect' },
  { icon: <Zap size={20} />, label: 'Keywords', href: '/keywords' },
];

export default function QuickActionsGrid() {
  const router = useRouter();

  return (
    <div className="quick-actions">
      <h3 className="quick-title">Quick Actions</h3>
      <div className="actions-grid">
        {actions.map((action) => (
          <button
            key={action.href}
            className="action-btn"
            onClick={() => router.push(action.href)}
            style={{ '--action-color': action.color || 'var(--text-secondary)' } as React.CSSProperties}
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>

      <style jsx>{`
        .quick-actions {
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 16px;
        }

        .quick-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 12px 0;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 12px;
          background: var(--surface-secondary);
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .action-btn:hover {
          background: var(--surface-hover);
          border-color: var(--border-default);
        }

        .action-icon {
          color: var(--action-color);
        }

        .action-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
          text-align: center;
        }

        @media (max-width: 767px) {
          .actions-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
          }

          .action-btn {
            padding: 12px 8px;
            gap: 6px;
          }

          .action-label {
            font-size: 11px;
          }
        }

        @media (max-width: 400px) {
          .actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
