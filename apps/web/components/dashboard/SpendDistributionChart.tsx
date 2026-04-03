'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SpendDistributionProps {
  googleSpend: number;
  metaSpend: number;
}

const COLORS = ['#4285F4', '#0668E1'];

export default function SpendDistributionChart({ googleSpend, metaSpend }: SpendDistributionProps) {
  const total = googleSpend + metaSpend;

  const data = [
    { name: 'Google Ads', value: googleSpend, color: '#4285F4' },
    { name: 'Meta Ads', value: metaSpend, color: '#0668E1' },
  ].filter(d => d.value > 0);

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="chart-card">
      <h3 className="chart-title">Spend Distribution</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatValue(Number(value) || 0)}
              contentStyle={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend">
        {data.map((entry) => (
          <div key={entry.name} className="legend-item">
            <span className="legend-dot" style={{ background: entry.color }} />
            <span className="legend-label">{entry.name}</span>
            <span className="legend-value mono">{total > 0 ? Math.round((entry.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .chart-card {
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 16px;
          height: 100%;
        }

        .chart-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }

        .chart-container {
          height: 160px;
        }

        .legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .legend-label {
          flex: 1;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .legend-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
