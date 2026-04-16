'use client';

import { useWidgetData, StudioWidget } from '@/lib/hooks/useApi';

interface MetricWidgetProps {
  widget: StudioWidget;
  dateRange?: string;
}

export default function MetricWidget({ widget, dateRange }: MetricWidgetProps) {
  const { data, loading, error } = useWidgetData(widget.id, dateRange);

  // For manual data source, use the widget's manual_data directly
  if (widget.data_source === 'manual') {
    const value = widget.manual_data?.value || '—';
    const change = widget.manual_data?.change;
    const changeIsPositive = change && parseFloat(change) > 0;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '36px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono, monospace)'
        }}>
          {value}
        </div>
        {change && (
          <div style={{
            fontSize: '14px',
            marginTop: '8px',
            color: changeIsPositive ? '#10B981' : '#EF4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>{changeIsPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(parseFloat(change))}%</span>
            <span style={{ color: 'var(--text-secondary)' }}>vs prev</span>
          </div>
        )}
      </div>
    );
  }

  // Loading state
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

  // Error state
  if (error || !data) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-secondary)',
        textAlign: 'center'
      }}>
        <div>
          <div style={{ marginBottom: '8px' }}>No data</div>
          <div style={{ fontSize: '11px' }}>Connect a data source</div>
        </div>
      </div>
    );
  }

  // Render with API data
  const metrics = data.data as { metrics?: Record<string, number>; comparison?: Record<string, number> };
  const metricField = widget.metrics[0]?.field || 'value';
  const value = metrics?.metrics?.[metricField] || 0;
  const change = metrics?.comparison?.[`${metricField}_change`];

  // Format value based on field type
  const formatValue = (val: number, field: string): string => {
    if (field.includes('micros')) {
      return '$' + (val / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    if (field === 'ctr' || field === 'roas') {
      return val.toFixed(2) + (field === 'ctr' ? '%' : 'x');
    }
    return val.toLocaleString();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '36px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono, monospace)'
      }}>
        {formatValue(value, metricField)}
      </div>
      {change !== undefined && (
        <div style={{
          fontSize: '14px',
          marginTop: '8px',
          color: change > 0 ? '#10B981' : change < 0 ? '#EF4444' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>{change > 0 ? '↑' : change < 0 ? '↓' : '→'}</span>
          <span>{Math.abs(change).toFixed(1)}%</span>
          <span style={{ color: 'var(--text-secondary)' }}>vs prev</span>
        </div>
      )}
    </div>
  );
}
