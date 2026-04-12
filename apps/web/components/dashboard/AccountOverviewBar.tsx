'use client';

import { useConnectedAccounts } from '@/lib/hooks/useApi';
import { RefreshCw, Sparkles, Bell, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { formatMicros } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  link?: string;
}

// Mock alerts - in production, these would come from the API
const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'critical',
    title: 'Budget Overspend',
    message: '2 campaigns exceeded daily budget',
    link: '/campaigns?filter=overspend',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Low Quality Score',
    message: '5 keywords below quality threshold',
    link: '/keywords?filter=low-quality',
  },
  {
    id: '3',
    type: 'info',
    title: 'Token Expiring',
    message: 'Google Ads token expires in 7 days',
    link: '/settings/accounts',
  },
];

interface AccountOverviewBarProps {
  healthScore: number;
  aiSavings?: number;
  onSyncAll?: () => void;
  alerts?: Alert[];
}

export default function AccountOverviewBar({
  healthScore,
  aiSavings = 0,
  onSyncAll,
  alerts = mockAlerts
}: AccountOverviewBarProps) {
  const router = useRouter();
  const { data, loading } = useConnectedAccounts();
  const accounts = data?.accounts || [];
  const [showAlerts, setShowAlerts] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);

  const googleCount = accounts.filter((a: any) => a.platform === 'google').length;
  const metaCount = accounts.filter((a: any) => a.platform === 'meta').length;
  const totalAccounts = googleCount + metaCount;

  // Alert counts
  const criticalCount = alerts.filter((a) => a.type === 'critical').length;
  const warningCount = alerts.filter((a) => a.type === 'warning').length;
  const infoCount = alerts.filter((a) => a.type === 'info').length;
  const totalAlerts = alerts.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setShowAlerts(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle size={14} />;
      case 'warning':
        return <AlertCircle size={14} />;
      default:
        return <Info size={14} />;
    }
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

      {/* Right section: Alerts + Sync */}
      <div className="right-actions">
        {/* Alert Notifications */}
        <div className="alerts-dropdown" ref={alertsRef}>
          <button
            className={`alerts-trigger ${totalAlerts > 0 ? 'has-alerts' : ''}`}
            onClick={() => setShowAlerts(!showAlerts)}
          >
            <Bell size={16} />
            {totalAlerts > 0 && (
              <div className="alerts-badges">
                {criticalCount > 0 && <span className="badge critical">{criticalCount}</span>}
                {warningCount > 0 && <span className="badge warning">{warningCount}</span>}
                {infoCount > 0 && <span className="badge info">{infoCount}</span>}
              </div>
            )}
          </button>

          {showAlerts && (
            <div className="alerts-panel">
              <div className="alerts-header">
                <span className="alerts-title">Alerts</span>
                <button className="close-btn" onClick={() => setShowAlerts(false)}>
                  <X size={14} />
                </button>
              </div>
              {alerts.length === 0 ? (
                <div className="alerts-empty">
                  <span>✓</span>
                  <span>All clear!</span>
                </div>
              ) : (
                <div className="alerts-list">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`alert-item ${alert.type}`}
                      onClick={() => {
                        if (alert.link) router.push(alert.link);
                        setShowAlerts(false);
                      }}
                    >
                      <div className={`alert-icon ${alert.type}`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="alert-content">
                        <div className="alert-title">{alert.title}</div>
                        <div className="alert-message">{alert.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync Button */}
        <button
          className="sync-btn"
          onClick={onSyncAll}
          disabled={totalAccounts === 0}
        >
          <RefreshCw size={14} />
          <span className="sync-text">Sync</span>
        </button>
      </div>

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

        .right-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Alerts Dropdown */
        .alerts-dropdown {
          position: relative;
        }

        .alerts-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: transparent;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .alerts-trigger:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .alerts-trigger.has-alerts {
          border-color: var(--warning);
        }

        .alerts-badges {
          display: flex;
          gap: 3px;
        }

        .badge {
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .badge.critical {
          background: var(--error);
          color: white;
        }

        .badge.warning {
          background: var(--warning);
          color: white;
        }

        .badge.info {
          background: var(--info);
          color: white;
        }

        .alerts-panel {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 320px;
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          z-index: 100;
          overflow: hidden;
        }

        .alerts-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-default);
        }

        .alerts-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: var(--surface-hover);
          color: var(--text-primary);
        }

        .alerts-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 24px;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .alerts-empty span:first-child {
          font-size: 20px;
          color: var(--success);
        }

        .alerts-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .alert-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.15s ease;
          border-bottom: 1px solid var(--border-default);
        }

        .alert-item:last-child {
          border-bottom: none;
        }

        .alert-item:hover {
          background: var(--surface-hover);
        }

        .alert-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .alert-icon.critical {
          background: rgba(239, 68, 68, 0.15);
          color: var(--error);
        }

        .alert-icon.warning {
          background: rgba(245, 158, 11, 0.15);
          color: var(--warning);
        }

        .alert-icon.info {
          background: rgba(59, 130, 246, 0.15);
          color: var(--info);
        }

        .alert-content {
          flex: 1;
          min-width: 0;
        }

        .alert-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .alert-message {
          font-size: 12px;
          color: var(--text-secondary);
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

          .right-actions {
            gap: 6px;
          }

          .sync-btn {
            padding: 8px 12px;
          }

          .sync-text {
            display: none;
          }

          .alerts-panel {
            width: 280px;
            right: -60px;
          }
        }
      `}</style>
    </div>
  );
}
