'use client';

import { formatMicros, formatNumber } from '@/lib/api';

interface PlatformData {
  platform: string;
  spend_micros: number;
  conversions: number;
  roas: number;
}

interface PlatformComparisonProps {
  data: PlatformData[];
}

export default function PlatformComparison({ data }: PlatformComparisonProps) {
  const googleData = data.find((p) => p.platform === 'google');
  const metaData = data.find((p) => p.platform === 'meta');

  const totalSpend = data.reduce((sum, p) => sum + p.spend_micros, 0);
  const totalConversions = data.reduce((sum, p) => sum + p.conversions, 0);

  const getSpendShare = (spend: number) => {
    if (totalSpend === 0) return 0;
    return Math.round((spend / totalSpend) * 100);
  };

  const getWinner = (google: number | undefined, meta: number | undefined, higherIsBetter = true) => {
    if (!google || !meta) return null;
    if (google === meta) return null;
    if (higherIsBetter) return google > meta ? 'google' : 'meta';
    return google < meta ? 'google' : 'meta';
  };

  const roasWinner = getWinner(googleData?.roas, metaData?.roas);
  const convWinner = getWinner(googleData?.conversions, metaData?.conversions);

  return (
    <div className="platform-comparison">
      <h3 className="comparison-title">Platform Comparison</h3>

      <div className="platforms-grid">
        {/* Google */}
        <div className="platform-card">
          <div className="platform-header">
            <span className="platform-dot" style={{ background: '#4285F4' }} />
            <span className="platform-name">Google Ads</span>
          </div>
          {googleData ? (
            <div className="platform-stats">
              <div className="stat-row">
                <span className="stat-label">Spend</span>
                <span className="stat-value mono">{formatMicros(googleData.spend_micros)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Share</span>
                <span className="stat-value">{getSpendShare(googleData.spend_micros)}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Conversions</span>
                <span className={`stat-value mono ${convWinner === 'google' ? 'winner' : ''}`}>
                  {formatNumber(googleData.conversions)}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">ROAS</span>
                <span className={`stat-value mono ${roasWinner === 'google' ? 'winner' : ''}`}>
                  {googleData.roas}x
                </span>
              </div>
            </div>
          ) : (
            <div className="no-data">No data</div>
          )}
        </div>

        {/* Meta */}
        <div className="platform-card">
          <div className="platform-header">
            <span className="platform-dot" style={{ background: '#0668E1' }} />
            <span className="platform-name">Meta Ads</span>
          </div>
          {metaData ? (
            <div className="platform-stats">
              <div className="stat-row">
                <span className="stat-label">Spend</span>
                <span className="stat-value mono">{formatMicros(metaData.spend_micros)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Share</span>
                <span className="stat-value">{getSpendShare(metaData.spend_micros)}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Conversions</span>
                <span className={`stat-value mono ${convWinner === 'meta' ? 'winner' : ''}`}>
                  {formatNumber(metaData.conversions)}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">ROAS</span>
                <span className={`stat-value mono ${roasWinner === 'meta' ? 'winner' : ''}`}>
                  {metaData.roas}x
                </span>
              </div>
            </div>
          ) : (
            <div className="no-data">No data</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .platform-comparison {
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 16px;
          height: 100%;
        }

        .comparison-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 12px 0;
        }

        .platforms-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .platform-card {
          background: var(--surface-secondary);
          border-radius: var(--radius-md);
          padding: 12px;
        }

        .platform-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .platform-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .platform-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .platform-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .stat-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-label {
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .stat-value {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .stat-value.winner {
          color: var(--success);
        }

        .no-data {
          text-align: center;
          padding: 16px;
          color: var(--text-tertiary);
          font-size: 13px;
        }

        @media (max-width: 767px) {
          .platforms-grid {
            flex-direction: row;
            gap: 8px;
          }

          .platform-card {
            flex: 1;
            padding: 10px;
          }

          .platform-stats {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .stat-row {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}
