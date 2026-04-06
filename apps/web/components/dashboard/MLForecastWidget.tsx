'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMLDemoForecast, useMLStatus } from '@/lib/hooks/useApi';
import { TrendingUp, Brain, ChevronRight } from 'lucide-react';

export default function MLForecastWidget() {
  const router = useRouter();
  const [metric, setMetric] = useState<'spend' | 'conversions'>('spend');
  const { data: mlStatus } = useMLStatus();
  const { data: forecastData, loading } = useMLDemoForecast();

  if (loading) {
    return (
      <div className="card forecast-widget">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Loading forecast...</span>
        </div>
        <style jsx>{`
          .forecast-widget {
            height: 100%;
            min-height: 280px;
          }
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 12px;
            color: var(--text-secondary);
            font-size: 13px;
          }
          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--border-default);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!forecastData?.data) {
    return (
      <div className="card forecast-widget">
        <div className="empty-state">
          <Brain size={32} color="var(--text-tertiary)" />
          <span>No forecast available</span>
        </div>
        <style jsx>{`
          .forecast-widget {
            height: 100%;
            min-height: 280px;
          }
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 12px;
            color: var(--text-secondary);
            font-size: 13px;
          }
        `}</style>
      </div>
    );
  }

  const predictions = forecastData.data[metric].predictions;
  const next7Days = predictions.slice(0, 7);
  const next7Total = next7Days.reduce((sum, p) => sum + p.value, 0);
  const next30Total = predictions.reduce((sum, p) => sum + p.value, 0);

  // Calculate chart data
  const maxVal = Math.max(...next7Days.map(p => p.upper_bound));
  const chartBars = next7Days.map(p => ({
    height: (p.value / maxVal) * 100,
    lowerHeight: (p.lower_bound / maxVal) * 100,
    upperHeight: (p.upper_bound / maxVal) * 100,
  }));

  const isConnected = mlStatus?.services?.bigquery_ml === 'connected';

  return (
    <div className="card forecast-widget">
      {/* Header */}
      <div className="widget-header">
        <div className="header-left">
          <div className="icon-box">
            <Brain size={16} />
          </div>
          <div className="header-text">
            <span className="title">AI Forecast</span>
            <span className="subtitle">
              {isConnected ? 'BigQuery ML' : 'Demo'} · 7-day
            </span>
          </div>
        </div>
        <button className="view-all" onClick={() => router.push('/analytics')}>
          Details <ChevronRight size={14} />
        </button>
      </div>

      {/* Metric Toggle */}
      <div className="metric-toggle">
        <button
          className={metric === 'spend' ? 'active' : ''}
          onClick={() => setMetric('spend')}
        >
          Spend
        </button>
        <button
          className={metric === 'conversions' ? 'active' : ''}
          onClick={() => setMetric('conversions')}
        >
          Conversions
        </button>
      </div>

      {/* Summary Stats */}
      <div className="stats-row">
        <div className="stat primary">
          <span className="stat-label">Next 7 Days</span>
          <span className="stat-value mono">
            {metric === 'spend' ? '$' : ''}{next7Total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Next 30 Days</span>
          <span className="stat-value mono">
            {metric === 'spend' ? '$' : ''}{next30Total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="chart-container">
        <div className="chart">
          {chartBars.map((bar, i) => (
            <div key={i} className="bar-wrapper">
              {/* Confidence interval */}
              <div
                className="confidence-bar"
                style={{
                  bottom: `${bar.lowerHeight}%`,
                  height: `${bar.upperHeight - bar.lowerHeight}%`,
                }}
              />
              {/* Value bar */}
              <div
                className="value-bar"
                style={{ height: `${bar.height}%` }}
              />
            </div>
          ))}
        </div>
        <div className="chart-labels">
          <span>Today</span>
          <span>+7d</span>
        </div>
      </div>

      {/* Trend indicator */}
      <div className="trend-indicator">
        <TrendingUp size={14} />
        <span>
          Projected {metric === 'spend' ? 'spend' : 'conversions'} trending{' '}
          {predictions[6].value > predictions[0].value ? 'up' : 'down'}{' '}
          {Math.abs(((predictions[6].value - predictions[0].value) / predictions[0].value) * 100).toFixed(1)}%
        </span>
      </div>

      <style jsx>{`
        .forecast-widget {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .icon-box {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(139, 92, 246, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8B5CF6;
        }

        .header-text {
          display: flex;
          flex-direction: column;
        }

        .title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .subtitle {
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .view-all {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 500;
          color: var(--primary);
          background: var(--primary-light);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .view-all:hover {
          opacity: 0.8;
        }

        .metric-toggle {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: var(--surface-secondary);
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .metric-toggle button {
          flex: 1;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          background: transparent;
          color: var(--text-secondary);
          transition: all 0.15s;
        }

        .metric-toggle button.active {
          background: var(--surface-card);
          color: #8B5CF6;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat {
          padding: 12px;
          background: var(--surface-secondary);
          border-radius: 8px;
        }

        .stat.primary {
          background: rgba(139, 92, 246, 0.1);
          border-left: 3px solid #8B5CF6;
        }

        .stat-label {
          display: block;
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .stat.primary .stat-value {
          color: #8B5CF6;
        }

        .chart-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 80px;
        }

        .chart {
          flex: 1;
          display: flex;
          align-items: flex-end;
          gap: 4px;
          padding-bottom: 8px;
        }

        .bar-wrapper {
          flex: 1;
          position: relative;
          height: 100%;
        }

        .confidence-bar {
          position: absolute;
          left: 20%;
          right: 20%;
          background: rgba(139, 92, 246, 0.15);
          border-radius: 2px;
        }

        .value-bar {
          position: absolute;
          bottom: 0;
          left: 25%;
          right: 25%;
          background: linear-gradient(180deg, #8B5CF6 0%, rgba(139, 92, 246, 0.6) 100%);
          border-radius: 3px 3px 0 0;
        }

        .chart-labels {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: var(--text-tertiary);
          padding-top: 4px;
          border-top: 1px solid var(--border-default);
        }

        .trend-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          margin-top: 12px;
          background: rgba(16, 185, 129, 0.08);
          border-radius: 6px;
          font-size: 11px;
          color: #10B981;
        }

        @media (max-width: 767px) {
          .stats-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
