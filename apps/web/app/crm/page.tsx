'use client';

import { useState, useCallback } from 'react';
import { useFeatureGate } from '@/lib/contexts/SubscriptionContext';
import Link from 'next/link';
import {
  useLeadsByStage,
  usePipelineStages,
  useCRMIntegrations,
  updateLead,
  syncLeadToCRM,
  PipelineStage,
  LeadsByStage
} from '@/lib/hooks/useApi';
import { Kanban, List, Link2, RefreshCw, ExternalLink, Loader2, GripVertical, DollarSign, Mail, Building, Calendar } from 'lucide-react';

export default function LeadsPipelinePage() {
  const { hasAccess, requiredTier } = useFeatureGate('crmIntegrations');
  const { data: leadsByStage, loading, error, refetch } = useLeadsByStage();
  const { data: integrations } = useCRMIntegrations();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [draggingLead, setDraggingLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [syncingLeads, setSyncingLeads] = useState<Set<string>>(new Set());

  if (!hasAccess) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Leads Pipeline</h1>
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <Kanban size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Manage your leads and conversions in a visual pipeline with CRM sync capabilities.
          </p>
          <Link href="/settings/billing" className="btn btn-primary">
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggingLead(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    setDraggingLead(null);
    setDragOverStage(null);

    if (leadId) {
      try {
        await updateLead(leadId, { stage_id: stageId });
        refetch();
      } catch (err) {
        console.error('Failed to move lead:', err);
      }
    }
  };

  const handleSyncToCRM = async (leadId: string) => {
    if (!integrations || integrations.length === 0) {
      alert('No CRM integrations connected. Please connect a CRM first.');
      return;
    }

    // Use first connected integration
    const connectedIntegration = integrations.find(i => i.connection_status === 'connected');
    if (!connectedIntegration) {
      alert('No CRM integration is currently connected.');
      return;
    }

    setSyncingLeads(prev => new Set(prev).add(leadId));
    try {
      const result = await syncLeadToCRM(leadId, connectedIntegration.id);
      if (result.crm_url) {
        window.open(result.crm_url, '_blank');
      }
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncingLeads(prev => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  };

  // Calculate totals
  const totalLeads = leadsByStage?.reduce((sum, s) => sum + s.count, 0) || 0;
  const totalValue = leadsByStage?.reduce((sum, s) =>
    sum + s.leads.reduce((lSum, l) => lSum + l.value, 0), 0) || 0;

  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Leads Pipeline</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {totalLeads} leads worth ${totalValue.toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            display: 'flex',
            background: 'var(--surface-subtle)',
            borderRadius: '8px',
            padding: '4px'
          }}>
            <button
              onClick={() => setViewMode('kanban')}
              className={`btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Kanban size={16} />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <List size={16} />
              List
            </button>
          </div>
          <button onClick={() => refetch()} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <Link href="/crm/integrations" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link2 size={16} />
            CRM Sync
          </Link>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#EF4444' }}>{error}</p>
          <button onClick={refetch} className="btn btn-secondary" style={{ marginTop: '16px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Pipeline Stats */}
      {leadsByStage && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {leadsByStage.slice(0, 5).map(({ stage, leads }) => (
            <div key={stage.id} style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              padding: '16px',
              borderTop: `3px solid ${stage.color}`
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {stage.name}
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>
                ${leads.reduce((sum, l) => sum + l.value, 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {leads.length} leads
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban Board */}
      {viewMode === 'kanban' && leadsByStage && (
        <div style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          flex: 1,
          paddingBottom: '16px'
        }}>
          {leadsByStage.map(({ stage, leads }) => (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              style={{
                minWidth: '300px',
                maxWidth: '300px',
                background: dragOverStage === stage.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--surface-subtle)',
                borderRadius: '8px',
                padding: '12px',
                border: dragOverStage === stage.id ? '2px dashed var(--primary)' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                padding: '0 4px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: stage.color
                }} />
                <span style={{ fontWeight: '600' }}>{stage.name}</span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '12px',
                  padding: '2px 8px',
                  background: 'var(--surface-card)',
                  borderRadius: '999px',
                  color: 'var(--text-secondary)'
                }}>
                  {leads.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    style={{
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: 'grab',
                      opacity: draggingLead === lead.id ? 0.5 : 1,
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <GripVertical size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lead.name || 'Unknown'}
                        </div>
                        {lead.company && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Building size={12} />
                            {lead.company}
                          </div>
                        )}
                      </div>
                    </div>

                    {lead.email && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        <Mail size={12} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        background: 'var(--surface-subtle)',
                        borderRadius: '4px'
                      }}>
                        {lead.source || 'Direct'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <DollarSign size={14} />
                          {lead.value.toLocaleString()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSyncToCRM(lead.id);
                          }}
                          disabled={syncingLeads.has(lead.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: 'var(--text-secondary)',
                            borderRadius: '4px'
                          }}
                          title="Sync to CRM"
                        >
                          {syncingLeads.has(lead.id) ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ExternalLink size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {leads.length === 0 && (
                  <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    background: 'var(--surface-card)',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-default)'
                  }}>
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && leadsByStage && (
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          overflow: 'hidden',
          flex: 1
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-subtle)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Company</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Stage</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Source</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>Value</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>Created</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '500' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leadsByStage.flatMap(({ stage, leads }) =>
                leads.map(lead => (
                  <tr key={lead.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '500' }}>{lead.name || 'Unknown'}</div>
                      {lead.email && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{lead.email}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{lead.company || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: `${stage.color}20`,
                        color: stage.color,
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: stage.color }} />
                        {stage.name}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{lead.source || 'Direct'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>
                      ${lead.value.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleSyncToCRM(lead.id)}
                        disabled={syncingLeads.has(lead.id)}
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px' }}
                        title="Sync to CRM"
                      >
                        {syncingLeads.has(lead.id) ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <ExternalLink size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {leadsByStage.every(s => s.leads.length === 0) && (
            <div style={{ padding: '60px 40px', textAlign: 'center' }}>
              <Kanban size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
              <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>No leads yet</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Leads will appear here when conversions are tracked.
              </p>
              <Link href="/tracking/conversions" className="btn btn-primary">
                View Conversions
              </Link>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
