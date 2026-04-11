'use client';

import { useRouter } from 'next/navigation';
import { useRecommendations } from '@/lib/hooks/useApi';
import { formatMicros } from '@/lib/api';

export default function TopRecommendationsWidget() {
  const router = useRouter();
  const { data, loading, error } = useRecommendations({ status: 'pending' });

  if (loading) {
    return (
      <div className="card top-recs-widget">
        <div className="card-header">
          <span className="card-title">AI Recommendations</span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div className="loading-dot" />
        </div>
        <style jsx>{`
          .top-recs-widget {
            min-height: 180px;
          }
          .loading-dot {
            width: 20px;
            height: 20px;
            border: 2px solid var(--border-default);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card top-recs-widget">
        <div className="card-header">
          <span className="card-title">AI Recommendations</span>
        </div>
        <div className="error-state">
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span>Unable to load recommendations</span>
        </div>
        <style jsx>{`
          .top-recs-widget {
            min-height: 180px;
          }
          .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 20px;
            color: var(--text-secondary);
            font-size: 13px;
          }
        `}</style>
      </div>
    );
  }

  const recommendations = data?.recommendations?.slice(0, 3) || [];
  const totalPending = data?.summary?.pending || 0;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'opportunity': return '🟢';
      default: return '🔵';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'var(--error)';
      case 'warning': return 'var(--warning)';
      case 'opportunity': return 'var(--success)';
      default: return 'var(--primary)';
    }
  };

  return (
    <div className="card top-recs-widget">
      <div className="card-header">
        <span className="card-title">AI Recommendations</span>
        {totalPending > 0 && (
          <span className="pending-badge">{totalPending}</span>
        )}
      </div>

      {recommendations.length > 0 ? (
        <div className="recs-list">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="rec-item"
              onClick={() => router.push('/recommendations')}
            >
              <div className="rec-icon" style={{ color: getSeverityColor(rec.severity) }}>
                {getSeverityIcon(rec.severity)}
              </div>
              <div className="rec-content">
                <div className="rec-title">{rec.title}</div>
                {rec.impact_estimate?.monthly_savings && (
                  <div className="rec-impact">
                    Save {formatMicros(rec.impact_estimate.monthly_savings)}/mo
                  </div>
                )}
                {rec.impact_estimate?.potential_gain && !rec.impact_estimate?.monthly_savings && (
                  <div className="rec-impact gain">
                    +{formatMicros(rec.impact_estimate.potential_gain)} potential
                  </div>
                )}
              </div>
              <div className="rec-arrow">›</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span style={{ fontSize: '24px' }}>✨</span>
          <span>All caught up!</span>
        </div>
      )}

      {totalPending > 3 && (
        <button
          className="view-all-btn"
          onClick={() => router.push('/recommendations')}
        >
          View all {totalPending} recommendations →
        </button>
      )}

      <style jsx>{`
        .top-recs-widget {
          display: flex;
          flex-direction: column;
          min-height: 180px;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pending-badge {
          background: var(--error);
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
          min-width: 20px;
          text-align: center;
        }

        .recs-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rec-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: var(--surface-secondary);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .rec-item:hover {
          background: var(--surface-hover);
        }

        .rec-icon {
          font-size: 14px;
          flex-shrink: 0;
        }

        .rec-content {
          flex: 1;
          min-width: 0;
        }

        .rec-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rec-impact {
          font-size: 11px;
          color: var(--success);
          font-weight: 600;
          margin-top: 2px;
        }

        .rec-impact.gain {
          color: var(--primary);
        }

        .rec-arrow {
          color: var(--text-tertiary);
          font-size: 16px;
          font-weight: 300;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .view-all-btn {
          width: 100%;
          margin-top: 12px;
          padding: 10px;
          background: var(--primary-light);
          color: var(--primary);
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .view-all-btn:hover {
          background: var(--primary);
          color: white;
        }
      `}</style>
    </div>
  );
}
