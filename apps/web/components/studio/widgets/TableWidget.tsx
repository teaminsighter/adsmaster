'use client';

import { useWidgetData, StudioWidget } from '@/lib/hooks/useApi';

interface TableWidgetProps {
  widget: StudioWidget;
  dateRange?: string;
}

// Demo data
const DEMO_DATA = [
  { campaign: 'Summer Sale', spend: 2500, clicks: 1200, conversions: 45, ctr: 3.2, roas: 2.8 },
  { campaign: 'Brand Awareness', spend: 1800, clicks: 890, conversions: 23, ctr: 2.8, roas: 1.9 },
  { campaign: 'Retargeting', spend: 1200, clicks: 450, conversions: 67, ctr: 4.1, roas: 5.2 },
  { campaign: 'New Products', spend: 950, clicks: 320, conversions: 18, ctr: 2.1, roas: 2.1 },
  { campaign: 'Holiday Special', spend: 750, clicks: 280, conversions: 12, ctr: 1.9, roas: 1.5 },
];

export default function TableWidget({ widget, dateRange }: TableWidgetProps) {
  const { data, loading, error } = useWidgetData(widget.id, dateRange);

  // Use demo data for manual source or no data
  const tableData = widget.data_source === 'manual' || !data?.data
    ? DEMO_DATA
    : (data.data as Array<Record<string, unknown>>);

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

  if (!tableData || tableData.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-secondary)'
      }}>
        No data available
      </div>
    );
  }

  // Get columns from first row
  const columns = Object.keys(tableData[0]);

  // Format cell value
  const formatCell = (value: unknown, column: string): string => {
    if (value === null || value === undefined) return '—';

    if (typeof value === 'number') {
      if (column.toLowerCase().includes('spend') || column.toLowerCase().includes('revenue')) {
        return '$' + value.toLocaleString();
      }
      if (column.toLowerCase().includes('ctr') || column.toLowerCase().includes('rate')) {
        return value.toFixed(2) + '%';
      }
      if (column.toLowerCase().includes('roas')) {
        return value.toFixed(2) + 'x';
      }
      return value.toLocaleString();
    }

    return String(value);
  };

  // Format column header
  const formatHeader = (column: string): string => {
    return column
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px'
      }}>
        <thead>
          <tr>
            {columns.map(column => (
              <th
                key={column}
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  borderBottom: '2px solid var(--border-default)',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  position: 'sticky',
                  top: 0,
                  background: 'var(--surface-card)'
                }}
              >
                {formatHeader(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.slice(0, widget.limit_rows || 10).map((row, rowIndex) => (
            <tr
              key={rowIndex}
              style={{
                borderBottom: '1px solid var(--border-default)'
              }}
            >
              {columns.map(column => (
                <td
                  key={column}
                  style={{
                    padding: '10px 12px',
                    fontFamily: typeof row[column] === 'number' ? 'var(--font-mono, monospace)' : 'inherit'
                  }}
                >
                  {formatCell(row[column], column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
