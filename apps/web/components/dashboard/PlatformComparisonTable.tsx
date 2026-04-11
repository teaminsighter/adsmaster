'use client';

import { useState } from 'react';
import { formatMicros, formatNumber } from '@/lib/api';

interface PlatformData {
  platform: string;
  spend_micros: number;
  conversions: number;
  roas: number;
}

interface PlatformComparisonTableProps {
  data: PlatformData[];
}

type TabType = 'all' | 'google' | 'meta';

export default function PlatformComparisonTable({ data }: PlatformComparisonTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const googleData = data.find((p) => p.platform === 'google');
  const metaData = data.find((p) => p.platform === 'meta');

  const totalSpend = data.reduce((sum, p) => sum + p.spend_micros, 0);
  const totalConversions = data.reduce((sum, p) => sum + p.conversions, 0);
  const totalRevenue = data.reduce((sum, p) => sum + (p.spend_micros * p.roas), 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const getSpendShare = (spend: number) => {
    if (totalSpend === 0) return 0;
    return Math.round((spend / totalSpend) * 100);
  };

  const getFilteredData = () => {
    switch (activeTab) {
      case 'google':
        return googleData ? [googleData] : [];
      case 'meta':
        return metaData ? [metaData] : [];
      default:
        return data;
    }
  };

  const filteredData = getFilteredData();

  const getPlatformIcon = (platform: string) => {
    if (platform === 'google') {
      return (
        <span className="platform-icon google">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </span>
      );
    }
    return (
      <span className="platform-icon meta">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
        </svg>
      </span>
    );
  };

  return (
    <div className="platform-table-container">
      <div className="table-header">
        <h3 className="table-title">Platform Comparison</h3>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`tab ${activeTab === 'google' ? 'active' : ''}`}
            onClick={() => setActiveTab('google')}
          >
            Google Ads
          </button>
          <button
            className={`tab ${activeTab === 'meta' ? 'active' : ''}`}
            onClick={() => setActiveTab('meta')}
          >
            Meta Ads
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th className="text-right">Spend</th>
              <th className="text-right">Share</th>
              <th className="text-right">Conversions</th>
              <th className="text-right">ROAS</th>
              <th className="text-right">CPA</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((platform) => {
              const cpa = platform.conversions > 0
                ? platform.spend_micros / platform.conversions
                : 0;
              return (
                <tr key={platform.platform}>
                  <td>
                    <div className="platform-cell">
                      {getPlatformIcon(platform.platform)}
                      <span className="platform-name">
                        {platform.platform === 'google' ? 'Google Ads' : 'Meta Ads'}
                      </span>
                    </div>
                  </td>
                  <td className="text-right mono">{formatMicros(platform.spend_micros)}</td>
                  <td className="text-right">{getSpendShare(platform.spend_micros)}%</td>
                  <td className="text-right mono">{formatNumber(platform.conversions)}</td>
                  <td className="text-right">
                    <span className={`roas-value ${platform.roas >= 4 ? 'good' : platform.roas >= 2 ? 'ok' : 'bad'}`}>
                      {platform.roas}x
                    </span>
                  </td>
                  <td className="text-right mono">{formatMicros(cpa)}</td>
                </tr>
              );
            })}
            {activeTab === 'all' && filteredData.length > 1 && (
              <tr className="total-row">
                <td>
                  <div className="platform-cell">
                    <span className="platform-icon total">Σ</span>
                    <span className="platform-name">Total</span>
                  </div>
                </td>
                <td className="text-right mono">{formatMicros(totalSpend)}</td>
                <td className="text-right">100%</td>
                <td className="text-right mono">{formatNumber(totalConversions)}</td>
                <td className="text-right">
                  <span className={`roas-value ${avgRoas >= 4 ? 'good' : avgRoas >= 2 ? 'ok' : 'bad'}`}>
                    {avgRoas.toFixed(1)}x
                  </span>
                </td>
                <td className="text-right mono">
                  {totalConversions > 0 ? formatMicros(totalSpend / totalConversions) : '-'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .platform-table-container {
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--border-default);
        }

        .table-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .tabs {
          display: flex;
          gap: 4px;
          background: var(--surface-secondary);
          padding: 4px;
          border-radius: var(--radius-md);
        }

        .tab {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .tab:hover {
          color: var(--text-primary);
        }

        .tab.active {
          background: var(--surface-card);
          color: var(--text-primary);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .comparison-table {
          width: 100%;
          border-collapse: collapse;
        }

        .comparison-table th {
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
          background: var(--surface-secondary);
          border-bottom: 1px solid var(--border-default);
        }

        .comparison-table td {
          padding: 14px 16px;
          font-size: 13px;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-light, var(--border-default));
        }

        .comparison-table tr:last-child td {
          border-bottom: none;
        }

        .comparison-table tr:hover td {
          background: var(--surface-hover);
        }

        .text-right {
          text-align: right;
        }

        .platform-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .platform-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }

        .platform-icon.google {
          background: rgba(66, 133, 244, 0.1);
          color: #4285F4;
        }

        .platform-icon.meta {
          background: rgba(6, 104, 225, 0.1);
          color: #0668E1;
        }

        .platform-icon.total {
          background: var(--surface-tertiary, rgba(0,0,0,0.05));
          color: var(--text-secondary);
        }

        .platform-name {
          font-weight: 500;
        }

        .roas-value {
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .roas-value.good {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
        }

        .roas-value.ok {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }

        .roas-value.bad {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }

        .total-row td {
          background: var(--surface-secondary);
          font-weight: 600;
        }

        .total-row:hover td {
          background: var(--surface-secondary);
        }

        @media (max-width: 767px) {
          .table-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .comparison-table th,
          .comparison-table td {
            padding: 10px 12px;
          }

          .platform-icon {
            width: 24px;
            height: 24px;
          }
        }
      `}</style>
    </div>
  );
}
