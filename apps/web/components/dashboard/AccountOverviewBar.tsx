'use client';

import { useConnectedAccounts } from '@/lib/hooks/useApi';
import { RefreshCw, Sparkles } from 'lucide-react';
import { formatMicros } from '@/lib/api';
import { useState, useEffect } from 'react';

interface AccountOverviewBarProps {
  healthScore: number;
  aiSavings?: number;
  onSyncAll?: () => void;
}

export default function AccountOverviewBar({ healthScore, aiSavings = 0, onSyncAll }: AccountOverviewBarProps) {
  const { data, loading } = useConnectedAccounts();
  const accounts = data?.accounts || [];

  const googleCount = accounts.filter((a: any) => a.platform === 'google').length;
  const metaCount = accounts.filter((a: any) => a.platform === 'meta').length;
  const totalAccounts = googleCount + metaCount;

  // Find most recent sync
  const lastSync = accounts.reduce((latest: Date | null, acc: any) => {
    const syncDate = acc.last_sync ? new Date(acc.last_sync) : null;
    if (!syncDate) return latest;
    if (!latest) return syncDate;
    return syncDate > latest ? syncDate : latest;
  }, null as Date | null);

  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getSyncStatus = (date: Date | null) => {
    if (!date) return 'warning';
    const diffMs = new Date().getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 1) return 'healthy';
    if (diffHours < 6) return 'ok';
    return 'warning';
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--error)';
  };

  const syncStatus = getSyncStatus(lastSync);

  // Animated counter for AI savings
  const [displaySavings, setDisplaySavings] = useState(0);

  useEffect(() => {
    if (aiSavings <= 0) return;

    const duration = 1500; // 1.5 seconds
    const steps = 30;
    const stepValue = aiSavings / steps;
    const stepTime = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= aiSavings) {
        setDisplaySavings(aiSavings);
        clearInterval(timer);
      } else {
        setDisplaySavings(Math.floor(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [aiSavings]);

  return (
    <div className="account-overview-bar">
      {/* Left section: Stats */}
      <div className="stats-section">
        {/* Connected Accounts */}
        <div className="stat-item">
          <span className="stat-label">Accounts</span>
          <span className="stat-value">
            {loading ? '...' : (
              <>
                <span className="platform-dot google" />
                {googleCount}
                <span className="platform-dot meta" />
                {metaCount}
              </>
            )}
          </span>
        </div>

        <div className="stat-divider" />

        {/* Last Sync */}
        <div className="stat-item">
          <span className="stat-label">Synced</span>
          <span className="stat-value">
            <span className={`sync-dot ${syncStatus}`} />
            {formatSyncTime(lastSync)}
          </span>
        </div>

        <div className="stat-divider" />

        {/* Health Score */}
        <div className="stat-item">
          <span className="stat-label">Health</span>
          <span className="stat-value health" style={{ color: getHealthColor(healthScore) }}>
            {healthScore}%
          </span>
        </div>
      </div>

      {/* Center: AI Savings Banner - The Hook! */}
      {aiSavings > 0 && (
        <div className="ai-savings-banner">
          <Sparkles size={18} className="sparkle-icon" />
          <span className="savings-amount mono">{formatMicros(displaySavings)}</span>
          <span className="savings-label">saved by AI</span>
        </div>
      )}

      {/* Right: Sync Button */}
      <button
        className="sync-btn"
        onClick={onSyncAll}
        disabled={totalAccounts === 0}
      >
        <RefreshCw size={14} />
        <span className="sync-text">Sync</span>
      </button>

      <style jsx>{`
        .account-overview-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 10px 16px;
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          margin-bottom: 16px;
        }

        .stats-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .stat-label {
          font-size: 11px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .stat-value {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .stat-value.health {
          font-weight: 700;
        }

        .stat-divider {
          width: 1px;
          height: 20px;
          background: var(--border-default);
        }

        .platform-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .platform-dot.google {
          background: #4285F4;
        }

        .platform-dot.meta {
          background: #0668E1;
          margin-left: 6px;
        }

        .sync-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .sync-dot.healthy {
          background: var(--success);
        }

        .sync-dot.ok {
          background: var(--success);
        }

        .sync-dot.warning {
          background: var(--warning);
        }

        .ai-savings-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
          padding: 8px 16px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%);
          border: 1px solid rgba(16, 185, 129, 0.4);
          border-radius: 24px;
          color: var(--success);
        }

        .ai-savings-banner :global(.sparkle-icon) {
          animation: sparkle 2s ease-in-out infinite;
        }

        @keyframes sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.2) rotate(15deg); opacity: 0.8; }
        }

        .savings-amount {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .savings-label {
          font-size: 12px;
          font-weight: 500;
          opacity: 0.85;
        }

        .sync-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: transparent;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .sync-btn:hover:not(:disabled) {
          border-color: var(--primary);
          color: var(--primary);
        }

        .sync-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Mobile Layout */
        @media (max-width: 767px) {
          .account-overview-bar {
            flex-wrap: wrap;
            padding: 10px 12px;
            gap: 10px;
          }

          .stats-section {
            width: 100%;
            justify-content: space-between;
            gap: 8px;
          }

          .stat-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }

          .stat-label {
            font-size: 10px;
          }

          .stat-value {
            font-size: 12px;
          }

          .stat-divider {
            display: none;
          }

          .ai-savings-banner {
            flex: 1;
            justify-content: center;
            margin-left: 0;
            padding: 10px 16px;
          }

          .savings-amount {
            font-size: 18px;
          }

          .savings-label {
            font-size: 11px;
          }

          .sync-btn {
            padding: 8px 12px;
          }

          .sync-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
