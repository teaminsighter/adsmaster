'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import DemoBanner from '@/components/ui/DemoBanner';
import { useRecommendations, applyRecommendation, dismissRecommendation } from '@/lib/hooks/useApi';
import { formatMicros } from '@/lib/api';

type FilterSeverity = 'all' | 'critical' | 'warning' | 'opportunity';
type FilterStatus = 'all' | 'pending' | 'applied' | 'dismissed';

export default function RecommendationsPage() {
  const router = useRouter();
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, loading, error, isDemo, refetch } = useRecommendations({
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const handleApply = async (recommendationId: string, optionId: number) => {
    setActionLoading(recommendationId);
    try {
      const result = await applyRecommendation(recommendationId, optionId);
      if (result.success) {
        alert(`${isDemo ? 'Demo: ' : ''}${result.message}`);
        refetch();
      }
    } catch (err) {
      alert('Failed to apply recommendation');
    } finally {
      setActionLoading(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(recommendationId);
        return next;
      });
    }
  };

  const handleDismiss = async (recommendationId: string) => {
    setActionLoading(recommendationId);
    try {
      const result = await dismissRecommendation(recommendationId);
      if (result.success) {
        alert(`${isDemo ? 'Demo: ' : ''}Recommendation dismissed`);
        refetch();
      }
    } catch (err) {
      alert('Failed to dismiss recommendation');
    } finally {
      setActionLoading(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(recommendationId);
        return next;
      });
    }
  };

  const handleSelect = (recommendationId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(recommendationId);
      else next.delete(recommendationId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!data?.recommendations) return;
    const pendingIds = data.recommendations.filter((r) => r.status === 'pending').map((r) => r.id);
    if (selectedIds.size === pendingIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  const handleBulkApply = async () => {
    for (const id of selectedIds) {
      await handleApply(id, 1); // Apply first option
    }
  };

  const handleBulkDismiss = async () => {
    for (const id of selectedIds) {
      await handleDismiss(id);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="AI Recommendations" />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="loading-spinner" style={{ marginBottom: '16px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Loading recommendations...</div>
            </div>
          </div>
        </div>
        <style jsx>{`
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-default);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header title="AI Recommendations" />
        <div className="page-content">
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>!</div>
            <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>Unable to load recommendations</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</div>
            <button className="btn btn-primary" onClick={() => refetch()}>Retry</button>
          </div>
        </div>
      </>
    );
  }

  const { recommendations, summary } = data;

  return (
    <>
      {isDemo && <DemoBanner onConnect={() => router.push('/connect')} />}
      <Header title="AI Recommendations" />
      <div className="page-content">
        {/* Summary Cards */}
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card" style={{ borderLeft: '3px solid var(--primary)' }}>
            <div className="metric-label">Pending Recommendations</div>
            <div className="metric-value">{summary.pending}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Ready to review
            </div>
          </div>
          <div className="metric-card" style={{ borderLeft: '3px solid var(--success)' }}>
            <div className="metric-label">Potential Monthly Savings</div>
            <div className="metric-value mono" style={{ color: 'var(--success)' }}>
              {formatMicros(summary.total_savings_micros)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              If all waste recommendations applied
            </div>
          </div>
          <div className="metric-card" style={{ borderLeft: '3px solid var(--primary)' }}>
            <div className="metric-label">Potential Revenue Gain</div>
            <div className="metric-value mono" style={{ color: 'var(--primary)' }}>
              {formatMicros(summary.total_potential_micros)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              If all opportunity recommendations applied
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">By Severity</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              {summary.by_severity.critical > 0 && (
                <span className="badge badge-error">{summary.by_severity.critical} Critical</span>
              )}
              {summary.by_severity.warning > 0 && (
                <span className="badge badge-warning">{summary.by_severity.warning} Warning</span>
              )}
              {summary.by_severity.opportunity > 0 && (
                <span className="badge badge-success">{summary.by_severity.opportunity} Opportunity</span>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="applied">Applied</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <select
              className="select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as FilterSeverity)}
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="opportunity">Opportunity</option>
            </select>
          </div>

          {selectedIds.size > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '8px 12px',
                background: 'var(--primary-light)',
                borderRadius: '8px',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{selectedIds.size} selected</span>
              <button className="btn btn-primary btn-sm" onClick={handleBulkApply}>
                Apply All
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleBulkDismiss}>
                Dismiss All
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </button>
            </div>
          )}

          {recommendations.filter((r) => r.status === 'pending').length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleSelectAll}>
              {selectedIds.size === recommendations.filter((r) => r.status === 'pending').length
                ? 'Deselect All'
                : 'Select All'}
            </button>
          )}
        </div>

        {/* Recommendations List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {recommendations.length === 0 ? (
            <div
              className="card"
              style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}
            >
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>No recommendations found</div>
              <div style={{ fontSize: '14px' }}>
                {statusFilter === 'pending'
                  ? 'All recommendations have been addressed!'
                  : 'Try adjusting your filters'}
              </div>
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    rec.severity === 'critical' ? 'var(--error)' :
                    rec.severity === 'warning' ? 'var(--warning)' : 'var(--success)'
                  }`,
                  opacity: rec.status !== 'pending' ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', gap: '16px' }}>
                  {/* Checkbox */}
                  {rec.status === 'pending' && (
                    <div style={{ paddingTop: '4px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(rec.id)}
                        onChange={(e) => handleSelect(rec.id, e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            className={`badge ${
                              rec.severity === 'critical' ? 'badge-error' :
                              rec.severity === 'warning' ? 'badge-warning' : 'badge-success'
                            }`}
                          >
                            {rec.severity.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {rec.confidence}% confidence
                          </span>
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{rec.title}</h3>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                          {rec.impact_estimate.summary}
                        </div>
                      </div>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>
                      {rec.description}
                    </p>

                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
                      Affects: <strong>{rec.affected_entity.name}</strong>
                      {rec.affected_entity.campaign_name && (
                        <> in <strong>{rec.affected_entity.campaign_name}</strong></>
                      )}
                    </div>

                    {/* Actions */}
                    {rec.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {rec.options.map((option) => (
                          <button
                            key={option.id}
                            className={`btn btn-sm ${option.id === 1 ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => handleApply(rec.id, option.id)}
                            disabled={actionLoading === rec.id}
                            title={option.description}
                          >
                            {actionLoading === rec.id ? '...' : option.label}
                          </button>
                        ))}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDismiss(rec.id)}
                          disabled={actionLoading === rec.id}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {rec.status === 'applied' && (
                      <div style={{ color: 'var(--success)', fontSize: '13px' }}>
                        Applied - Can undo within 24 hours
                      </div>
                    )}

                    {rec.status === 'dismissed' && (
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                        Dismissed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: 'var(--surface-secondary)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          <span>Showing {recommendations.length} recommendations</span>
          <span>Last updated: {new Date().toLocaleString()}</span>
        </div>
      </div>
    </>
  );
}
