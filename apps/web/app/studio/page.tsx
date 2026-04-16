'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureGate } from '@/lib/contexts/SubscriptionContext';
import {
  useStudioDashboards,
  useStudioTemplates,
  createStudioDashboard,
  deleteStudioDashboard,
  duplicateStudioDashboard,
  StudioDashboardSummary
} from '@/lib/hooks/useApi';
import Link from 'next/link';

export default function StudioPage() {
  const router = useRouter();
  const { hasAccess, requiredTier } = useFeatureGate('studioBuilder');

  const [page, setPage] = useState(1);
  const { data: dashboardsData, loading, error, refetch } = useStudioDashboards(page, 20);
  const { data: templatesData } = useStudioTemplates();

  const [showNewModal, setShowNewModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDesc, setNewDashboardDesc] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dashboardToDelete, setDashboardToDelete] = useState<StudioDashboardSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [dashboardToDuplicate, setDashboardToDuplicate] = useState<StudioDashboardSummary | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);

  const templates = [
    { id: null, name: 'Blank Canvas', icon: '📝', description: 'Start from scratch' },
    ...(templatesData?.templates || []).map(t => ({
      id: t.id,
      name: t.name,
      icon: t.category === 'marketing' ? '📊' : t.category === 'ecommerce' ? '🛒' : t.category === 'leads' ? '📈' : '📋',
      description: t.description || ''
    }))
  ];

  const handleCreate = async () => {
    if (!newDashboardName.trim()) return;

    setIsCreating(true);
    try {
      const result = await createStudioDashboard({
        name: newDashboardName,
        description: newDashboardDesc || undefined,
        template_id: selectedTemplateId || undefined
      });

      setShowNewModal(false);
      setNewDashboardName('');
      setNewDashboardDesc('');
      setSelectedTemplateId(null);

      // Navigate to editor
      router.push(`/studio/${result.dashboard.id}`);
    } catch (err) {
      console.error('Failed to create dashboard:', err);
      alert('Failed to create dashboard. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!dashboardToDelete) return;

    setIsDeleting(true);
    try {
      await deleteStudioDashboard(dashboardToDelete.id);
      setShowDeleteModal(false);
      setDashboardToDelete(null);
      refetch();
    } catch (err) {
      console.error('Failed to delete dashboard:', err);
      alert('Failed to delete dashboard. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!dashboardToDuplicate || !duplicateName.trim()) return;

    setIsDuplicating(true);
    try {
      const result = await duplicateStudioDashboard(dashboardToDuplicate.id, duplicateName);
      setShowDuplicateModal(false);
      setDashboardToDuplicate(null);
      setDuplicateName('');

      // Navigate to the new dashboard
      router.push(`/studio/${result.dashboard.id}`);
    } catch (err) {
      console.error('Failed to duplicate dashboard:', err);
      alert('Failed to duplicate dashboard. Please try again.');
    } finally {
      setIsDuplicating(false);
    }
  };

  const openDuplicateModal = (dashboard: StudioDashboardSummary) => {
    setDashboardToDuplicate(dashboard);
    setDuplicateName(`${dashboard.name} (Copy)`);
    setShowDuplicateModal(true);
  };

  if (!hasAccess) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Studio - Dashboard Builder</h1>
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>:lock:</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Create custom dashboards with drag-and-drop widgets for your team and clients.
          </p>
          <Link href="/settings/billing" className="btn btn-primary">
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Studio</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Build custom dashboards with drag-and-drop widgets
          </p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
          + New Dashboard
        </button>
      </div>

      {/* Templates Section */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Start from Template</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {templates.slice(0, 4).map(template => (
            <button
              key={template.id || 'blank'}
              onClick={() => {
                setSelectedTemplateId(template.id);
                setShowNewModal(true);
              }}
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{template.icon}</div>
              <div style={{ fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>{template.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{template.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Your Dashboards */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Your Dashboards</h2>

        {loading && (
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center'
          }}>
            <div style={{ color: 'var(--text-secondary)' }}>Loading dashboards...</div>
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid #EF4444',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            color: '#EF4444'
          }}>
            Failed to load dashboards. Please try again.
          </div>
        )}

        {!loading && !error && (!dashboardsData?.dashboards || dashboardsData.dashboards.length === 0) && (
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>:art:</div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>No dashboards yet</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Create your first custom dashboard to get started.
            </p>
            <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
              Create Dashboard
            </button>
          </div>
        )}

        {!loading && !error && dashboardsData?.dashboards && dashboardsData.dashboards.length > 0 && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              {dashboardsData.dashboards.map(dashboard => (
                <div key={dashboard.id} style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  {/* Thumbnail Preview */}
                  <Link href={`/studio/${dashboard.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      height: '140px',
                      background: 'linear-gradient(135deg, var(--primary) 0%, #059669 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: 'pointer'
                    }}>
                      <span style={{ fontSize: '48px', opacity: 0.5 }}>:bar_chart:</span>

                      {/* View count badge */}
                      {dashboard.view_count > 0 && (
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          {dashboard.view_count} views
                        </div>
                      )}
                    </div>
                  </Link>

                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', flex: 1 }}>{dashboard.name}</h3>
                      {dashboard.is_public && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#3B82F6',
                          borderRadius: '4px'
                        }}>
                          PUBLIC
                        </span>
                      )}
                      {dashboard.is_published && !dashboard.is_public && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10B981',
                          borderRadius: '4px'
                        }}>
                          PUBLISHED
                        </span>
                      )}
                    </div>

                    {dashboard.description && (
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        {dashboard.description}
                      </p>
                    )}

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      marginBottom: '12px'
                    }}>
                      <span>{dashboard.widget_count} widgets</span>
                      <span>Updated {new Date(dashboard.updated_at).toLocaleDateString()}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link href={`/studio/${dashboard.id}`} className="btn btn-primary" style={{ flex: 1 }}>
                        Edit
                      </Link>
                      <Link href={`/studio/${dashboard.id}/view`} className="btn btn-secondary" style={{ flex: 1 }}>
                        View
                      </Link>
                      <div style={{ position: 'relative' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '8px 12px' }}
                          onClick={(e) => {
                            const menu = e.currentTarget.nextElementSibling as HTMLElement;
                            if (menu) {
                              menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                            }
                          }}
                        >
                          ...
                        </button>
                        <div style={{
                          display: 'none',
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          marginTop: '4px',
                          background: 'var(--surface-card)',
                          border: '1px solid var(--border-default)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          zIndex: 10,
                          minWidth: '120px'
                        }}>
                          <button
                            onClick={() => openDuplicateModal(dashboard)}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '8px 12px',
                              border: 'none',
                              background: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            Duplicate
                          </button>
                          {dashboard.share_url && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(window.location.origin + dashboard.share_url);
                                alert('Share link copied!');
                              }}
                              style={{
                                display: 'block',
                                width: '100%',
                                padding: '8px 12px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '13px'
                              }}
                            >
                              Copy Link
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setDashboardToDelete(dashboard);
                              setShowDeleteModal(true);
                            }}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '8px 12px',
                              border: 'none',
                              background: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: '#EF4444'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {dashboardsData.total > 20 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '24px'
              }}>
                <button
                  className="btn btn-secondary"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>
                <span style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>
                  Page {page} of {Math.ceil(dashboardsData.total / 20)}
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={page >= Math.ceil(dashboardsData.total / 20)}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* New Dashboard Modal */}
      {showNewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }} onClick={() => setShowNewModal(false)}>
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: '12px',
            padding: '24px',
            width: '450px',
            maxWidth: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Create New Dashboard</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Dashboard Name *
              </label>
              <input
                type="text"
                className="input"
                placeholder="My Dashboard"
                style={{ width: '100%' }}
                value={newDashboardName}
                onChange={e => setNewDashboardName(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Description (optional)
              </label>
              <textarea
                className="input"
                placeholder="Brief description..."
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
                value={newDashboardDesc}
                onChange={e => setNewDashboardDesc(e.target.value)}
              />
            </div>

            {selectedTemplateId && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: 'var(--surface-subtle)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>Using template:</span>
                <strong>{templates.find(t => t.id === selectedTemplateId)?.name}</strong>
                <button
                  onClick={() => setSelectedTemplateId(null)}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  x
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => {
                setShowNewModal(false);
                setNewDashboardName('');
                setNewDashboardDesc('');
                setSelectedTemplateId(null);
              }}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!newDashboardName.trim() || isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Dashboard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && dashboardToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }} onClick={() => setShowDeleteModal(false)}>
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Delete Dashboard?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Are you sure you want to delete &quot;{dashboardToDelete.name}&quot;? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDashboardToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ background: '#EF4444', color: 'white' }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && dashboardToDuplicate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }} onClick={() => setShowDuplicateModal(false)}>
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Duplicate Dashboard</h2>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                New Dashboard Name
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={duplicateName}
                onChange={e => setDuplicateName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDashboardToDuplicate(null);
                  setDuplicateName('');
                }}
                disabled={isDuplicating}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDuplicate}
                disabled={!duplicateName.trim() || isDuplicating}
              >
                {isDuplicating ? 'Duplicating...' : 'Duplicate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
