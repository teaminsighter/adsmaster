'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useStudioDashboard, StudioWidget } from '@/lib/hooks/useApi';
import MetricWidget from '@/components/studio/widgets/MetricWidget';
import ChartWidget from '@/components/studio/widgets/ChartWidget';
import TableWidget from '@/components/studio/widgets/TableWidget';
import TextWidget from '@/components/studio/widgets/TextWidget';

export default function DashboardViewPage() {
  const params = useParams();
  const dashboardId = params.id as string;

  const { data: dashboard, loading, error } = useStudioDashboard(dashboardId);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-subtle)'
      }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        background: 'var(--surface-subtle)'
      }}>
        <div style={{ fontSize: '48px' }}>:(</div>
        <h2>Dashboard not found</h2>
        <Link href="/studio" className="btn btn-primary">
          Back to Studio
        </Link>
      </div>
    );
  }

  // Sort widgets by position
  const sortedWidgets = [...dashboard.widgets].sort((a, b) => {
    if (a.grid_y !== b.grid_y) return a.grid_y - b.grid_y;
    return a.grid_x - b.grid_x;
  });

  // Group widgets into rows based on grid position
  const renderWidget = (widget: StudioWidget) => {
    const widthPercent = (widget.grid_w / 12) * 100;
    const minHeight = widget.grid_h * 60;

    return (
      <div
        key={widget.id}
        style={{
          width: `calc(${widthPercent}% - 16px)`,
          minWidth: '250px',
          minHeight: minHeight,
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Widget Header */}
        {widget.title && (
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-default)'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600' }}>{widget.title}</h3>
            {widget.subtitle && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {widget.subtitle}
              </p>
            )}
          </div>
        )}

        {/* Widget Content */}
        <div style={{ flex: 1, padding: '16px' }}>
          {widget.type === 'metric' && <MetricWidget widget={widget} />}
          {widget.type === 'line_chart' && <ChartWidget widget={widget} chartType="line" />}
          {widget.type === 'bar_chart' && <ChartWidget widget={widget} chartType="bar" />}
          {widget.type === 'pie_chart' && <ChartWidget widget={widget} chartType="pie" />}
          {widget.type === 'table' && <TableWidget widget={widget} />}
          {widget.type === 'funnel' && <ChartWidget widget={widget} chartType="funnel" />}
          {widget.type === 'text' && <TextWidget widget={widget} />}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: dashboard.settings?.backgroundColor || 'var(--surface-subtle)'
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-default)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>{dashboard.name}</h1>
          {dashboard.description && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {dashboard.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {dashboard.default_date_range.replace(/_/g, ' ')}
          </span>
          <Link href={`/studio/${dashboardId}`} className="btn btn-secondary">
            Edit
          </Link>
        </div>
      </div>

      {/* Dashboard Content */}
      <div style={{ padding: '24px' }}>
        {sortedWidgets.length === 0 ? (
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>:bar_chart:</div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>No widgets yet</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              This dashboard doesn&apos;t have any widgets. Edit the dashboard to add some.
            </p>
            <Link href={`/studio/${dashboardId}`} className="btn btn-primary">
              Edit Dashboard
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            {sortedWidgets.map(renderWidget)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 24px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '12px'
      }}>
        Built with AdsMaster Studio
      </div>
    </div>
  );
}
