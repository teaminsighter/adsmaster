'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DeviceBreakdownProps {
  mobile?: number;
  desktop?: number;
  tablet?: number;
}

export default function DeviceBreakdown({
  mobile = 58,
  desktop = 35,
  tablet = 7
}: DeviceBreakdownProps) {
  const data = [
    { name: 'Mobile', value: mobile, color: '#10B981', icon: '📱' },
    { name: 'Desktop', value: desktop, color: '#3B82F6', icon: '💻' },
    { name: 'Tablet', value: tablet, color: '#F59E0B', icon: '📲' },
  ].filter(d => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="device-card">
      <h3 className="device-title">Device Breakdown</h3>

      <div className="device-content">
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="center-label">
            <span className="total-value">{total}%</span>
            <span className="total-label">Traffic</span>
          </div>
        </div>

        <div className="device-legend">
          {data.map((device) => (
            <div key={device.name} className="device-item">
              <span className="device-icon">{device.icon}</span>
              <span className="device-name">{device.name}</span>
              <span className="device-value mono" style={{ color: device.color }}>
                {device.value}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .device-card {
          background: var(--surface-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 16px;
          height: 100%;
        }

        .device-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 12px 0;
        }

        .device-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .chart-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          flex-shrink: 0;
        }

        .center-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .total-value {
          display: block;
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .total-label {
          font-size: 10px;
          color: var(--text-tertiary);
          text-transform: uppercase;
        }

        .device-legend {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .device-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .device-icon {
          font-size: 16px;
        }

        .device-name {
          flex: 1;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .device-value {
          font-size: 14px;
          font-weight: 700;
        }

        @media (max-width: 767px) {
          .device-content {
            flex-direction: column;
          }

          .chart-wrapper {
            width: 100px;
            height: 100px;
          }

          .device-legend {
            flex-direction: row;
            justify-content: space-around;
            width: 100%;
          }

          .device-item {
            flex-direction: column;
            gap: 4px;
          }

          .device-name {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
