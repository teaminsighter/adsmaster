'use client';

import { useRouter } from 'next/navigation';
import { formatMicros } from '@/lib/api';
import { Sparkles, AlertTriangle, AlertCircle, Lightbulb, ChevronRight } from 'lucide-react';

interface AIRecommendationsSummaryProps {
  pendingCount: number;
  aiSavings: number;
  criticalCount?: number;
  warningCount?: number;
  opportunityCount?: number;
}

export default function AIRecommendationsSummary({
  pendingCount,
  aiSavings,
  criticalCount = 0,
  warningCount = 0,
  opportunityCount = 0,
}: AIRecommendationsSummaryProps) {
  const router = useRouter();

  // If no breakdown provided, assume all are opportunities
  const hasCritical = criticalCount > 0;
  const hasWarning = warningCount > 0;

  return (
    <div className="ai-summary">
      {/* AI Savings Banner */}
      {aiSavings > 0 && (
        <div className="savings-banner">
          <Sparkles size={16} />
          <span>{formatMicros(aiSavings)} saved this month</span>
        </div>
      )}

      {/* Summary Stats */}
      <div className="summary-header">
        <h3 className="summary-title">AI Recommendations</h3>
        <span className="total-badge">{pendingCount}</span>
      </div>

      <div className="severity-breakdown">
        {criticalCount > 0 && (
          <div className="severity-item critical">
            <AlertTriangle size={14} />
            <span className="severity-count">{criticalCount}</span>
            <span className="severity-label">Critical</span>
          </div>
        )}
        {warningCount > 0 && (
          <div className="severity-item warning">
            <AlertCircle size={14} />
            <span className="severity-count">{warningCount}</span>
            <span className="severity-label">Warning</span>
          </div>
        )}
        {opportunityCount > 0 && (
          <div className="severity-item opportunity">
            <Lightbulb size={14} />
            <span className="severity-count">{opportunityCount}</span>
            <span className="severity-label">Opportunities</span>
          </div>
        )}
        {!hasCritical && !hasWarning && opportunityCount === 0 && pendingCount > 0 && (
          <div className="severity-item opportunity">
            <Lightbulb size={14} />
            <span className="severity-count">{pendingCount}</span>
            <span className="severity-label">Pending</span>
          </div>
        )}
      </div>

      {/* CTA Button */}
      <button
        className="review-btn"
        onClick={() => router.push('/recommendations')}
      >
        <span>Review Recommendations</span>
        <ChevronRight size={16} />
      </button>

      <style jsx>{`
        .ai-summary {
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 16px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .savings-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
          border: 1px solid var(--success);
          border-radius: var(--radius-md);
          margin-bottom: 12px;
          font-size: 13px;
          font-weight: 500;
          color: var(--success);
        }

        .summary-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .summary-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .total-badge {
          background: var(--primary);
          color: white;
          padding: 2px 10px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
        }

        .severity-breakdown {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .severity-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: var(--radius-md);
        }

        .severity-item.critical {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }

        .severity-item.warning {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }

        .severity-item.opportunity {
          background: rgba(139, 92, 246, 0.1);
          color: var(--opportunity);
        }

        .severity-count {
          font-size: 16px;
          font-weight: 700;
        }

        .severity-label {
          font-size: 13px;
          font-weight: 500;
        }

        .review-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 12px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
          margin-top: 12px;
        }

        .review-btn:hover {
          background: var(--primary-hover);
        }

        @media (max-width: 767px) {
          .severity-breakdown {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 6px;
          }

          .severity-item {
            flex: 1;
            min-width: calc(50% - 3px);
            padding: 8px 10px;
          }

          .severity-count {
            font-size: 14px;
          }

          .severity-label {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
