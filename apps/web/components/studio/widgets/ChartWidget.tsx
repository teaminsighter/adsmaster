'use client';

import { useWidgetData, StudioWidget } from '@/lib/hooks/useApi';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ChartWidgetProps {
  widget: StudioWidget;
  chartType: 'line' | 'bar' | 'pie' | 'funnel';
  dateRange?: string;
}

// Demo data for preview
const DEMO_DATA = {
  line: [
    { name: 'Jan', value: 4000, value2: 2400 },
    { name: 'Feb', value: 3000, value2: 1398 },
    { name: 'Mar', value: 2000, value2: 9800 },
    { name: 'Apr', value: 2780, value2: 3908 },
    { name: 'May', value: 1890, value2: 4800 },
    { name: 'Jun', value: 2390, value2: 3800 },
  ],
  bar: [
    { name: 'Google Ads', value: 4000 },
    { name: 'Meta Ads', value: 3000 },
    { name: 'TikTok', value: 2000 },
    { name: 'LinkedIn', value: 1500 },
  ],
  pie: [
    { name: 'Search', value: 40 },
    { name: 'Display', value: 25 },
    { name: 'Video', value: 20 },
    { name: 'Social', value: 15 },
  ],
  funnel: [
    { name: 'Impressions', value: 100000 },
    { name: 'Clicks', value: 5000 },
    { name: 'Leads', value: 500 },
    { name: 'Sales', value: 50 },
  ]
};

export default function ChartWidget({ widget, chartType, dateRange }: ChartWidgetProps) {
  const { data, loading, error } = useWidgetData(widget.id, dateRange);

  const colors = widget.visual_config?.colors || ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  const showLegend = widget.visual_config?.showLegend !== false;
  const showGrid = widget.visual_config?.showGrid !== false;

  // Use demo data for manual source or no data
  const chartData = widget.data_source === 'manual' || !data?.data
    ? DEMO_DATA[chartType]
    : (data.data as unknown[]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-secondary)'
      }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-secondary)'
      }}>
        Failed to load data
      </div>
    );
  }

  // Line Chart
  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />}
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px'
            }}
          />
          {showLegend && <Legend />}
          <Line
            type={widget.visual_config?.smooth ? 'monotone' : 'linear'}
            dataKey="value"
            stroke={colors[0]}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          {chartData[0]?.value2 !== undefined && (
            <Line
              type={widget.visual_config?.smooth ? 'monotone' : 'linear'}
              dataKey="value2"
              stroke={colors[1]}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Bar Chart
  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />}
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={80}
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px'
            }}
          />
          {showLegend && <Legend />}
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {(chartData as Array<{name: string; value: number}>).map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Pie Chart
  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={widget.visual_config?.stacked ? '40%' : 0}
            outerRadius="80%"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {(chartData as Array<{name: string; value: number}>).map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px'
            }}
          />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // Funnel Chart (custom rendering)
  if (chartType === 'funnel') {
    const funnelData = chartData as Array<{name: string; value: number}>;
    const maxValue = Math.max(...funnelData.map(d => d.value));

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        height: '100%',
        justifyContent: 'center'
      }}>
        {funnelData.map((item, index) => {
          const widthPercent = (item.value / maxValue) * 100;
          const conversionRate = index > 0
            ? ((item.value / funnelData[index - 1].value) * 100).toFixed(1)
            : null;

          return (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '80px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                {item.name}
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <div
                  style={{
                    width: `${widthPercent}%`,
                    height: '32px',
                    background: colors[index % colors.length],
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '12px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'width 0.3s ease'
                  }}
                >
                  {item.value.toLocaleString()}
                </div>
              </div>
              {conversionRate && (
                <div style={{ width: '50px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {conversionRate}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
