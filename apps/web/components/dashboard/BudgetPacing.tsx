'use client';

import { useDashboard } from '@/lib/hooks/useApi';
import { formatMicros } from '@/lib/api';

export default function BudgetPacing() {
  const { data } = useDashboard();

  // Calculate budget pacing from available data
  const spent = data?.metrics?.spend_micros || 0;
  const budget = spent * 1.5; // Estimate budget as 1.5x spent (demo)

  // Get current day of month
  const now = new Date();
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const spentPercent = budget > 0 ? (spent / budget) * 100 : 0;
  const expectedPercent = (daysElapsed / daysInMonth) * 100;
  const pacingStatus = spentPercent > expectedPercent + 10 ? 'fast' : spentPercent < expectedPercent - 10 ? 'slow' : 'on-track';

  const projectedOverspend = pacingStatus === 'fast' && daysElapsed > 0
    ? Math.round((spent / daysElapsed) * daysInMonth - budget)
    : 0;

  return (
    <div className="budget-pacing-card">
      <div className="pacing-header">
        <h3 className="pacing-title">Budget Pacing</h3>
        {pacingStatus === 'fast' && (
          <span className="pacing-badge fast">Pacing Fast</span>
        )}
        {pacingStatus === 'slow' && (
          <span className="pacing-badge slow">Pacing Slow</span>
        )}
        {pacingStatus === 'on-track' && (
          <span className="pacing-badge on-track">On Track</span>
        )}
      </div>

      <div className="pacing-stats">
        <div className="pacing-stat">
          <span className="stat-label">Spent</span>
          <span className="stat-value mono">{formatMicros(spent)}</span>
        </div>
        <div className="pacing-stat">
          <span className="stat-label">Budget</span>
          <span className="stat-value mono">{formatMicros(budget)}</span>
        </div>
        <div className="pacing-stat">
          <span className="stat-label">Month Progress</span>
          <span className="stat-value">{daysElapsed}/{daysInMonth} days ({expectedPercent.toFixed(0)}%)</span>
        </div>
      </div>

      <div className="pacing-bar-container">
        <div className="pacing-bar">
          <div
            className={`pacing-fill ${pacingStatus}`}
            style={{ width: `${Math.min(spentPercent, 100)}%` }}
          />
          <div
            className="pacing-marker"
            style={{ left: `${expectedPercent}%` }}
            title={`Expected: ${expectedPercent.toFixed(0)}%`}
          />
        </div>
        <div className="pacing-labels">
          <span>{spentPercent.toFixed(0)}% spent</span>
          <span className="expected-label">{expectedPercent.toFixed(0)}% of month</span>
        </div>
      </div>

      {pacingStatus === 'fast' && projectedOverspend > 0 && (
        <div className="pacing-warning">
          Projected to overspend by {formatMicros(projectedOverspend)}
        </div>
      )}

      <style jsx>{`
        .budget-pacing-card {
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 16px;
          height: 100%;
        }

        .pacing-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .pacing-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .pacing-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .pacing-badge.fast {
          background: rgba(245, 158, 11, 0.15);
          color: var(--warning);
        }

        .pacing-badge.slow {
          background: rgba(59, 130, 246, 0.15);
          color: var(--info);
        }

        .pacing-badge.on-track {
          background: rgba(16, 185, 129, 0.15);
          color: var(--success);
        }

        .pacing-stats {
          display: flex;
          gap: 24px;
          margin-bottom: 16px;
        }

        .pacing-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 11px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .pacing-bar-container {
          margin-bottom: 8px;
        }

        .pacing-bar {
          position: relative;
          height: 12px;
          background: var(--surface-secondary);
          border-radius: 6px;
          overflow: visible;
          margin-bottom: 8px;
        }

        .pacing-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        .pacing-fill.on-track {
          background: var(--success);
        }

        .pacing-fill.fast {
          background: var(--warning);
        }

        .pacing-fill.slow {
          background: var(--info);
        }

        .pacing-marker {
          position: absolute;
          top: -3px;
          bottom: -3px;
          width: 2px;
          background: var(--text-secondary);
          border-radius: 1px;
        }

        .pacing-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .expected-label {
          color: var(--text-secondary);
        }

        .pacing-warning {
          padding: 8px 12px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid var(--warning);
          border-radius: var(--radius-md);
          font-size: 12px;
          color: var(--warning);
          margin-top: 8px;
        }

        @media (max-width: 767px) {
          .pacing-stats {
            flex-wrap: wrap;
            gap: 12px;
          }

          .pacing-stat {
            min-width: calc(50% - 6px);
          }

          .stat-value {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
