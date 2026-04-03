'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatMicros } from '@/lib/api';

interface ChartDataPoint {
  date: string;
  spend: number;
  conversions: number;
  roas?: number;
  impressions?: number;
}

interface PerformanceChartProps {
  data: ChartDataPoint[];
}

type MetricType = 'spend' | 'conversions' | 'roas';

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>('spend');

  const metrics: { key: MetricType; label: string; color: string }[] = [
    { key: 'spend', label: 'Spend', color: '#10B981' },
    { key: 'conversions', label: 'Conversions', color: '#3B82F6' },
    { key: 'roas', label: 'ROAS', color: '#8B5CF6' },
  ];

  const formatValue = (value: number, metric: MetricType) => {
    switch (metric) {
      case 'spend':
        return formatMicros(value * 1000000);
      case 'roas':
        return `${value}x`;
      default:
        return value.toLocaleString();
    }
  };

  const formatAxisValue = (value: number) => {
    if (activeMetric === 'spend') {
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
      return `$${value}`;
    }
    if (activeMetric === 'roas') return `${value}x`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  // Transform data and compute ROAS if not present
  const chartData = data.map((d) => ({
    ...d,
    roas: d.roas ?? (d.spend > 0 ? Number(((d.conversions * 50) / d.spend).toFixed(1)) : 0), // Estimate ROAS as conversions * $50 AOV / spend
    displayDate: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  }));

  const activeColor = metrics.find((m) => m.key === activeMetric)?.color || '#10B981';

  return (
    <div className="performance-chart">
      <div className="chart-header">
        <h3 className="chart-title">Performance Trend (14 Days)</h3>
        <div className="metric-toggles">
          {metrics.map((metric) => (
            <button
              key={metric.key}
              className={`metric-toggle ${activeMetric === metric.key ? 'active' : ''}`}
              onClick={() => setActiveMetric(metric.key)}
              style={{
                '--toggle-color': metric.color,
              } as React.CSSProperties}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="displayDate"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-default)' }}
            />
            <YAxis
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxisValue}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)',
              }}
              labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
              formatter={(value) => [formatValue(Number(value) || 0, activeMetric), metrics.find((m) => m.key === activeMetric)?.label]}
            />
            <Line
              type="monotone"
              dataKey={activeMetric}
              stroke={activeColor}
              strokeWidth={2}
              dot={{ fill: activeColor, strokeWidth: 0, r: 3 }}
              activeDot={{ fill: activeColor, strokeWidth: 0, r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <style jsx>{`
        .performance-chart {
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 16px;
        }

        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .chart-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .metric-toggles {
          display: flex;
          gap: 4px;
          background: var(--surface-secondary);
          padding: 3px;
          border-radius: 6px;
        }

        .metric-toggle {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .metric-toggle:hover {
          color: var(--text-primary);
        }

        .metric-toggle.active {
          background: var(--surface-card);
          color: var(--toggle-color);
          box-shadow: var(--shadow-sm);
        }

        .chart-container {
          height: 200px;
        }

        @media (max-width: 767px) {
          .chart-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .metric-toggles {
            width: 100%;
          }

          .metric-toggle {
            flex: 1;
            text-align: center;
          }

          .chart-container {
            height: 160px;
          }
        }
      `}</style>
    </div>
  );
}
