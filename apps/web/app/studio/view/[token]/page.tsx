'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePublicDashboard, StudioWidget } from '@/lib/hooks/useApi';
import MetricWidget from '@/components/studio/widgets/MetricWidget';
import ChartWidget from '@/components/studio/widgets/ChartWidget';
import TableWidget from '@/components/studio/widgets/TableWidget';
import TextWidget from '@/components/studio/widgets/TextWidget';

export default function PublicDashboardPage() {
  const params = useParams();
  const shareToken = params.token as string;

  const { data, loading, error } = usePublicDashboard(shareToken);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <div style={{ color: '#6b7280' }}>Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data?.dashboard) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        background: '#f8fafc'
      }}>
        <div style={{ fontSize: '48px' }}>:(</div>
        <h2 style={{ color: '#1f2937' }}>Dashboard not found</h2>
        <p style={{ color: '#6b7280' }}>
          This dashboard may have been deleted or is not publicly accessible.
        </p>
      </div>
    );
  }

  const dashboard = data.dashboard;

  // Sort widgets by position
  const sortedWidgets = [...(dashboard.widgets || [])].sort((a, b) => {
    if (a.grid_y !== b.grid_y) return a.grid_y - b.grid_y;
    return a.grid_x - b.grid_x;
  });

  // Render widget
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
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        {/* Widget Header */}
        {widget.title && (
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
              {widget.title}
            </h3>
            {widget.subtitle && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
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
      background: dashboard.settings?.backgroundColor || '#f8fafc'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '20px 24px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
            {dashboard.name}
          </h1>
          {dashboard.description && (
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
              {dashboard.description}
            </p>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {sortedWidgets.length === 0 ? (
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>:bar_chart:</div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px', color: '#1f2937' }}>
              No widgets in this dashboard
            </h2>
            <p style={{ color: '#6b7280' }}>
              The dashboard owner hasn&apos;t added any widgets yet.
            </p>
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
        padding: '24px',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '12px'
      }}>
        <p>Built with AdsMaster Studio</p>
        <Link
          href="/"
          style={{ color: '#3b82f6', textDecoration: 'none' }}
        >
          Create your own dashboard
        </Link>
      </div>
    </div>
  );
}
