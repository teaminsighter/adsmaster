'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useFeatureGate } from '@/lib/contexts/SubscriptionContext';
import {
  useStudioDashboard,
  updateStudioDashboard,
  updateDashboardLayout,
  createStudioWidget,
  deleteStudioWidget,
  StudioWidget
} from '@/lib/hooks/useApi';

// Dynamic import for react-grid-layout (client-side only)
const GridLayout = dynamic(
  () => import('react-grid-layout').then((mod) => mod.default),
  { ssr: false }
);

// Import grid layout styles
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Widget type options
const WIDGET_TYPES = [
  { type: 'metric', label: 'Metric Card', icon: '#', description: 'Single KPI with comparison', defaultSize: { w: 3, h: 2 } },
  { type: 'line_chart', label: 'Line Chart', icon: '~', description: 'Trend over time', defaultSize: { w: 6, h: 4 } },
  { type: 'bar_chart', label: 'Bar Chart', icon: '|', description: 'Compare values', defaultSize: { w: 6, h: 4 } },
  { type: 'pie_chart', label: 'Pie Chart', icon: 'O', description: 'Distribution', defaultSize: { w: 4, h: 4 } },
  { type: 'table', label: 'Table', icon: '=', description: 'Data table', defaultSize: { w: 6, h: 5 } },
  { type: 'funnel', label: 'Funnel', icon: 'V', description: 'Conversion funnel', defaultSize: { w: 4, h: 5 } },
  { type: 'text', label: 'Text', icon: 'T', description: 'Static text/heading', defaultSize: { w: 4, h: 2 } },
];

// Data source options
const DATA_SOURCES = [
  { id: 'manual', label: 'Manual Data', description: 'Enter data manually' },
  { id: 'google_ads', label: 'Google Ads', description: 'Campaign metrics' },
  { id: 'meta_ads', label: 'Meta Ads', description: 'Facebook & Instagram' },
  { id: 'conversions', label: 'Conversions', description: 'Your conversion data' },
  { id: 'visitors', label: 'Visitors', description: 'Visitor analytics' },
  { id: 'csv', label: 'CSV Upload', description: 'Custom data source' },
];

export default function DashboardEditorPage() {
  const params = useParams();
  const router = useRouter();
  const dashboardId = params.id as string;

  const { hasAccess } = useFeatureGate('studioBuilder');
  const { data: dashboard, loading, error, refetch } = useStudioDashboard(dashboardId);

  const [isSaving, setIsSaving] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [selectedWidgetType, setSelectedWidgetType] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingWidget, setEditingWidget] = useState<StudioWidget | null>(null);

  // Dashboard settings state
  const [dashboardName, setDashboardName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // Update local state when dashboard loads
  useEffect(() => {
    if (dashboard) {
      setDashboardName(dashboard.name);
      setIsPublic(dashboard.is_public);
      setIsPublished(dashboard.is_published);
    }
  }, [dashboard]);

  const handleLayoutChange = useCallback(async (newLayout: Array<{i: string; x: number; y: number; w: number; h: number}>) => {
    if (!dashboard) return;

    // Debounce layout saves
    try {
      await updateDashboardLayout(dashboardId, newLayout);
    } catch (err) {
      console.error('Failed to save layout:', err);
    }
  }, [dashboardId, dashboard]);

  const handleAddWidget = async () => {
    if (!selectedWidgetType) return;

    const widgetType = WIDGET_TYPES.find(w => w.type === selectedWidgetType);
    if (!widgetType) return;

    setIsSaving(true);
    try {
      // Find next available position
      const maxY = dashboard?.widgets?.reduce((max, w) => Math.max(max, w.grid_y + w.grid_h), 0) || 0;

      await createStudioWidget(dashboardId, {
        type: selectedWidgetType,
        title: widgetType.label,
        grid_x: 0,
        grid_y: maxY,
        grid_w: widgetType.defaultSize.w,
        grid_h: widgetType.defaultSize.h,
        data_source: 'manual',
        metrics: [],
        dimensions: [],
        filters: [],
        visual_config: {
          colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
          showLegend: true,
          showGrid: true,
          showLabels: true,
          stacked: false,
          smooth: false
        }
      });

      setShowAddWidget(false);
      setSelectedWidgetType(null);
      refetch();
    } catch (err) {
      console.error('Failed to add widget:', err);
      alert('Failed to add widget');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!confirm('Delete this widget?')) return;

    try {
      await deleteStudioWidget(widgetId);
      refetch();
    } catch (err) {
      console.error('Failed to delete widget:', err);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateStudioDashboard(dashboardId, {
        name: dashboardName,
        is_public: isPublic,
        is_published: isPublished
      });
      setShowSettings(false);
      refetch();
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasAccess) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>You don&apos;t have access to the Dashboard Builder.</p>
        <Link href="/settings/billing" className="btn btn-primary">
          Upgrade Plan
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>:(</div>
        <h2 style={{ marginBottom: '8px' }}>Dashboard not found</h2>
        <Link href="/studio" className="btn btn-primary">
          Back to Studio
        </Link>
      </div>
    );
  }

  // Convert widgets to grid layout format
  const layout = dashboard.widgets.map(widget => ({
    i: widget.id,
    x: widget.grid_x,
    y: widget.grid_y,
    w: widget.grid_w,
    h: widget.grid_h,
    minW: widget.min_w || 2,
    minH: widget.min_h || 2
  }));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-subtle)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-default)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <Link href="/studio" style={{ color: 'var(--text-secondary)' }}>
          &larr; Studio
        </Link>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '18px', fontWeight: '600' }}>{dashboard.name}</h1>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {dashboard.widgets.length} widgets
          </span>
        </div>

        <button
          onClick={() => setShowAddWidget(true)}
          className="btn btn-primary"
        >
          + Add Widget
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="btn btn-secondary"
        >
          Settings
        </button>

        <Link
          href={`/studio/${dashboardId}/view`}
          className="btn btn-secondary"
        >
          Preview
        </Link>
      </div>

      {/* Canvas */}
      <div style={{ padding: '24px' }}>
        {dashboard.widgets.length === 0 ? (
          <div style={{
            background: 'var(--surface-card)',
            border: '2px dashed var(--border-default)',
            borderRadius: '12px',
            padding: '80px 40px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>+</div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Add your first widget</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Click the button above to add widgets to your dashboard
            </p>
            <button onClick={() => setShowAddWidget(true)} className="btn btn-primary">
              Add Widget
            </button>
          </div>
        ) : (
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={60}
            width={1200}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".widget-drag-handle"
            isResizable={true}
            isDraggable={true}
            margin={[16, 16]}
          >
            {dashboard.widgets.map(widget => (
              <div
                key={widget.id}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Widget Header */}
                <div
                  className="widget-drag-handle"
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'grab',
                    background: 'var(--surface-subtle)'
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {WIDGET_TYPES.find(w => w.type === widget.type)?.icon || '?'}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '500', flex: 1 }}>
                    {widget.title || widget.type}
                  </span>
                  <button
                    onClick={() => setEditingWidget(widget)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: 'var(--text-secondary)'
                    }}
                    title="Edit widget"
                  >
                    ...
                  </button>
                  <button
                    onClick={() => handleDeleteWidget(widget.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: '#EF4444'
                    }}
                    title="Delete widget"
                  >
                    x
                  </button>
                </div>

                {/* Widget Content */}
                <div style={{
                  flex: 1,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}>
                  {widget.type === 'metric' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {widget.manual_data?.value || '0'}
                      </div>
                      <div style={{ fontSize: '12px' }}>{widget.subtitle || 'No data'}</div>
                    </div>
                  )}
                  {widget.type === 'line_chart' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>~</div>
                      <div>Line Chart</div>
                      <div style={{ fontSize: '11px' }}>Connect data source</div>
                    </div>
                  )}
                  {widget.type === 'bar_chart' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>|||</div>
                      <div>Bar Chart</div>
                      <div style={{ fontSize: '11px' }}>Connect data source</div>
                    </div>
                  )}
                  {widget.type === 'pie_chart' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>O</div>
                      <div>Pie Chart</div>
                      <div style={{ fontSize: '11px' }}>Connect data source</div>
                    </div>
                  )}
                  {widget.type === 'table' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>=</div>
                      <div>Data Table</div>
                      <div style={{ fontSize: '11px' }}>Connect data source</div>
                    </div>
                  )}
                  {widget.type === 'funnel' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>V</div>
                      <div>Funnel</div>
                      <div style={{ fontSize: '11px' }}>Connect data source</div>
                    </div>
                  )}
                  {widget.type === 'text' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '16px' }}>
                        {widget.manual_data?.text || 'Enter your text...'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </GridLayout>
        )}
      </div>

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }} onClick={() => setShowAddWidget(false)}>
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Add Widget</h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '24px'
            }}>
              {WIDGET_TYPES.map(widget => (
                <button
                  key={widget.type}
                  onClick={() => setSelectedWidgetType(widget.type)}
                  style={{
                    padding: '16px',
                    border: selectedWidgetType === widget.type
                      ? '2px solid var(--primary)'
                      : '1px solid var(--border-default)',
                    borderRadius: '8px',
                    background: selectedWidgetType === widget.type
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'var(--surface-subtle)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{widget.icon}</div>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{widget.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {widget.description}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddWidget(false);
                  setSelectedWidgetType(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddWidget}
                disabled={!selectedWidgetType || isSaving}
              >
                {isSaving ? 'Adding...' : 'Add Widget'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }} onClick={() => setShowSettings(false)}>
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: '12px',
            padding: '24px',
            width: '450px',
            maxWidth: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Dashboard Settings</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Dashboard Name
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={dashboardName}
                onChange={e => setDashboardName(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={e => setIsPublished(e.target.checked)}
                />
                <span>Published</span>
              </label>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginLeft: '24px' }}>
                Published dashboards can be shared via link
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                />
                <span>Public (no login required)</span>
              </label>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginLeft: '24px' }}>
                Anyone with the link can view this dashboard
              </p>
            </div>

            {dashboard.share_token && (
              <div style={{
                marginBottom: '24px',
                padding: '12px',
                background: 'var(--surface-subtle)',
                borderRadius: '8px'
              }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '13px' }}>
                  Share Link
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input"
                    style={{ flex: 1, fontSize: '12px' }}
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/studio/view/${dashboard.share_token}`}
                    readOnly
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/studio/view/${dashboard.share_token}`);
                      alert('Link copied!');
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveSettings}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Widget Editor Modal */}
      {editingWidget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }} onClick={() => setEditingWidget(null)}>
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Edit Widget</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Title
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={editingWidget.title || ''}
                onChange={e => setEditingWidget({ ...editingWidget, title: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Data Source
              </label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={editingWidget.data_source}
                onChange={e => setEditingWidget({ ...editingWidget, data_source: e.target.value })}
              >
                {DATA_SOURCES.map(source => (
                  <option key={source.id} value={source.id}>{source.label}</option>
                ))}
              </select>
            </div>

            {editingWidget.type === 'metric' && editingWidget.data_source === 'manual' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Value
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g., $12,500"
                  value={editingWidget.manual_data?.value || ''}
                  onChange={e => setEditingWidget({
                    ...editingWidget,
                    manual_data: { ...editingWidget.manual_data, value: e.target.value }
                  })}
                />
              </div>
            )}

            {editingWidget.type === 'text' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Text Content
                </label>
                <textarea
                  className="input"
                  style={{ width: '100%', minHeight: '100px' }}
                  value={editingWidget.manual_data?.text || ''}
                  onChange={e => setEditingWidget({
                    ...editingWidget,
                    manual_data: { ...editingWidget.manual_data, text: e.target.value }
                  })}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setEditingWidget(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    const { updateStudioWidget } = await import('@/lib/hooks/useApi');
                    await updateStudioWidget(editingWidget.id, {
                      title: editingWidget.title,
                      data_source: editingWidget.data_source,
                      manual_data: editingWidget.manual_data
                    });
                    setEditingWidget(null);
                    refetch();
                  } catch (err) {
                    console.error('Failed to update widget:', err);
                    alert('Failed to update widget');
                  }
                }}
              >
                Save Widget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
