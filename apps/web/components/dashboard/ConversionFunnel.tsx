'use client';

import { formatNumber } from '@/lib/api';

interface ConversionFunnelProps {
  impressions: number;
  clicks: number;
  conversions: number;
}

export default function ConversionFunnel({ impressions, clicks, conversions }: ConversionFunnelProps) {
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0';
  const convRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0';

  const stages = [
    { label: 'Impressions', value: impressions, color: 'var(--primary)', width: 100 },
    { label: 'Clicks', value: clicks, color: '#3B82F6', width: 70 },
    { label: 'Conversions', value: conversions, color: '#8B5CF6', width: 45 },
  ];

  return (
    <div className="funnel-card">
      <h3 className="funnel-title">Conversion Funnel</h3>

      <div className="funnel-container">
        {stages.map((stage, index) => (
          <div key={stage.label} className="funnel-stage">
            <div
              className="funnel-bar"
              style={{
                width: `${stage.width}%`,
                background: stage.color,
              }}
            >
              <span className="funnel-value mono">{formatNumber(stage.value)}</span>
            </div>
            <span className="funnel-label">{stage.label}</span>
            {index < stages.length - 1 && (
              <div className="funnel-arrow">
                <span className="rate-badge">
                  {index === 0 ? `${ctr}% CTR` : `${convRate}% Conv`}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .funnel-card {
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 16px;
          height: 100%;
        }

        .funnel-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 16px 0;
        }

        .funnel-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .funnel-stage {
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: relative;
        }

        .funnel-bar {
          height: 36px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: width 0.5s ease;
          margin: 0 auto;
        }

        .funnel-value {
          color: white;
          font-size: 13px;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }

        .funnel-label {
          font-size: 11px;
          color: var(--text-tertiary);
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .funnel-arrow {
          display: flex;
          justify-content: center;
          margin: 4px 0;
        }

        .rate-badge {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--surface-secondary);
          padding: 2px 8px;
          border-radius: 10px;
        }

        @media (max-width: 767px) {
          .funnel-bar {
            height: 32px;
          }

          .funnel-value {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
