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
  const [expandedWhy, setExpandedWhy] = useState<Set<string>>(new Set());

  const toggleWhy = (id: string) => {
    setExpandedWhy((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Rule explanations for AI reasoning
  const getRuleExplanation = (ruleId: string) => {
    const explanations: Record<string, { trigger: string; dataPoints: string[]; logic: string }> = {
      wasting_keyword_high: {
        trigger: 'High spend with zero conversions',
        dataPoints: ['7-day spend > $50', 'Conversions = 0', 'Quality Score analyzed'],
        logic: 'Keywords spending money without converting waste ad budget. AI identified this keyword has spent significantly with no return.',
      },
      wasting_keyword_medium: {
        trigger: 'Moderate spend with zero conversions',
        dataPoints: ['7-day spend $25-50', 'Conversions = 0', 'Click volume checked'],
        logic: 'This keyword is spending moderately but generating no conversions, indicating poor targeting or landing page issues.',
      },
      low_quality_score: {
        trigger: 'Quality Score below threshold',
        dataPoints: ['Quality Score < 6/10', 'CPC vs average', 'Ad relevance'],
        logic: 'Low Quality Scores increase CPC and reduce ad visibility. Improving relevance between keyword, ad, and landing page will lower costs.',
      },
      budget_constrained: {
        trigger: 'Profitable campaign limited by budget',
        dataPoints: ['ROAS > 2.0x', 'Impression share lost > 20%', 'Conversion trend'],
        logic: 'This campaign is profitable but missing opportunities due to budget limits. Increasing budget should generate more conversions.',
      },
    };
    return explanations[ruleId] || {
      trigger: 'Performance threshold exceeded',
      dataPoints: ['Historical metrics', 'Trend patterns', 'Budget efficiency'],
      logic: 'AI analyzed performance data and identified an optimization opportunity.',
    };
  };

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

                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                      Affects: <strong style={{ color: 'var(--primary)' }}>{rec.affected_entity.name}</strong>
                      {rec.affected_entity.campaign_name && (
                        <> in <span style={{ color: 'var(--text-secondary)' }}>{rec.affected_entity.campaign_name}</span></>
                      )}
                    </div>

                    {/* Why Button */}
                    <button
                      onClick={() => toggleWhy(rec.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        color: expandedWhy.has(rec.id) ? 'var(--text-primary)' : 'var(--primary)',
                        background: expandedWhy.has(rec.id) ? 'var(--surface-secondary)' : 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid',
                        borderColor: expandedWhy.has(rec.id) ? 'var(--border)' : 'rgba(16, 185, 129, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginBottom: '12px',
                        fontWeight: 500,
                      }}
                    >
                      <span>🤖</span>
                      {expandedWhy.has(rec.id) ? 'Hide AI Reasoning' : 'Why this recommendation?'}
                      <span style={{ fontSize: '10px', transform: expandedWhy.has(rec.id) ? 'rotate(180deg)' : 'none' }}>▼</span>
                    </button>

                    {/* Expanded Why Section - Shows REAL DATA */}
                    {expandedWhy.has(rec.id) && (
                      <div
                        style={{
                          padding: '16px',
                          marginBottom: '16px',
                          background: 'rgba(59, 130, 246, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(59, 130, 246, 0.15)',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🤖</span> AI Reasoning
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                            (Based on your actual data)
                          </span>
                        </div>

                        {/* YOUR DATA - Actual metrics from the account */}
                        {(rec as any).ai_reasoning?.metrics_analyzed && (
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: 600 }}>
                              📊 YOUR DATA (Last 7 days)
                            </div>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                              gap: '8px',
                              padding: '12px',
                              background: 'var(--surface-secondary)',
                              borderRadius: '6px',
                            }}>
                              {Object.entries((rec as any).ai_reasoning.metrics_analyzed).map(([key, value]) => (
                                value !== null && value !== undefined && (
                                  <div key={key} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                                      {key.replace(/_/g, ' ')}
                                    </div>
                                    <div className="mono" style={{ fontSize: '14px', fontWeight: 600 }}>
                                      {typeof value === 'number' && key.includes('spend') ? `$${value.toFixed(2)}` :
                                       typeof value === 'number' && key.includes('cpc') ? `${value > 0 ? '+' : ''}${value}%` :
                                       typeof value === 'number' && key.includes('roas') ? `${value.toFixed(1)}x` :
                                       String(value)}
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}

                        {/* WHY THIS TRIGGERED - Actual conditions that failed */}
                        {(rec as any).ai_reasoning?.triggers?.length > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: 600 }}>
                              ⚠️ WHY THIS TRIGGERED
                            </div>
                            {(rec as any).ai_reasoning.triggers.map((trigger: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '8px',
                                  marginBottom: '8px',
                                  padding: '8px 12px',
                                  background: trigger.status === 'failed' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                  borderRadius: '6px',
                                  borderLeft: `3px solid ${trigger.status === 'failed' ? 'var(--error)' : 'var(--success)'}`,
                                }}
                              >
                                <span>{trigger.status === 'failed' ? '✗' : '✓'}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{trigger.condition}</div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    Your value: <strong>{trigger.your_value}</strong>
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                    Threshold: {trigger.threshold}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CALCULATION - Show the math */}
                        {(rec as any).ai_reasoning?.calculation && (
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: 600 }}>
                              🧮 HOW I CALCULATED THE IMPACT
                            </div>
                            <div style={{ padding: '12px', background: 'var(--surface-secondary)', borderRadius: '6px' }}>
                              <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                                <strong>Method:</strong> {(rec as any).ai_reasoning.calculation.method}
                              </div>
                              <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                                <strong>Formula:</strong> <code style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: '3px' }}>{(rec as any).ai_reasoning.calculation.formula}</code>
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)', marginTop: '8px' }}>
                                → {(rec as any).ai_reasoning.calculation.result}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', fontStyle: 'italic' }}>
                                {(rec as any).ai_reasoning.calculation.assumption}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* AI RECOMMENDATION - Plain English */}
                        {(rec as any).ai_reasoning?.recommendation && (
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: 600 }}>
                              💡 MY RECOMMENDATION
                            </div>
                            <div style={{
                              fontSize: '13px',
                              color: 'var(--text-secondary)',
                              lineHeight: 1.6,
                              padding: '12px',
                              background: 'rgba(16, 185, 129, 0.08)',
                              borderRadius: '6px',
                              borderLeft: '3px solid var(--success)',
                            }}>
                              {(rec as any).ai_reasoning.recommendation}
                            </div>
                          </div>
                        )}

                        {/* CONFIDENCE */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 600 }}>
                            📈 CONFIDENCE: {rec.confidence}%
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '8px', background: 'var(--surface-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${rec.confidence}%`,
                                  height: '100%',
                                  background: rec.confidence >= 80 ? 'var(--success)' : rec.confidence >= 60 ? 'var(--warning)' : 'var(--error)',
                                  borderRadius: '4px',
                                }}
                              />
                            </div>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            {rec.confidence >= 90 ? 'Very high confidence - Clear pattern with significant data' :
                             rec.confidence >= 80 ? 'High confidence - Strong data supports this recommendation' :
                             rec.confidence >= 70 ? 'Good confidence - Multiple indicators align' :
                             'Moderate confidence - Consider reviewing additional data'}
                          </div>
                        </div>

                        {/* Still confused? Ask AI */}
                        <div style={{
                          paddingTop: '12px',
                          borderTop: '1px solid rgba(59, 130, 246, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Still have questions?
                          </span>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => alert('AI Chat coming soon! You can ask questions like "Why is this keyword wasting money?" or "What happens if I choose Aggressive?"')}
                            style={{ fontSize: '11px' }}
                          >
                            💬 Ask AI Advisor
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions - User clicks ONE to apply that action */}
                    {rec.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {rec.options.map((option) => (
                          <div key={option.id} className="tooltip-wrapper" style={{ position: 'relative' }}>
                            <button
                              className={`btn btn-sm ${option.label === 'Recommended' ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => handleApply(rec.id, option.id)}
                              disabled={actionLoading === rec.id}
                              style={{ position: 'relative' }}
                            >
                              {actionLoading === rec.id ? '...' : option.label}
                              {option.risk === 'medium' && (
                                <span style={{
                                  position: 'absolute',
                                  top: '-3px',
                                  right: '-3px',
                                  width: '8px',
                                  height: '8px',
                                  background: 'var(--warning)',
                                  borderRadius: '50%',
                                }} />
                              )}
                            </button>
                            {/* Tooltip on hover - solid background */}
                            <div className="tooltip-content" style={{
                              position: 'absolute',
                              bottom: 'calc(100% + 8px)',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: '#1a1a1a',
                              color: '#ffffff',
                              border: '1px solid #333',
                              borderRadius: '6px',
                              padding: '10px 14px',
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                              zIndex: 1000,
                              opacity: 0,
                              visibility: 'hidden',
                              transition: 'opacity 0.2s, visibility 0.2s',
                              pointerEvents: 'none',
                            }}>
                              <div style={{ fontWeight: 600, marginBottom: '4px', color: '#fff' }}>{option.label}</div>
                              <div style={{ color: '#ccc' }}>{option.description}</div>
                              {option.risk === 'medium' && (
                                <div style={{ color: '#f59e0b', fontSize: '11px', marginTop: '4px' }}>
                                  ⚠️ Moderate risk
                                </div>
                              )}
                              {/* Arrow */}
                              <div style={{
                                position: 'absolute',
                                bottom: '-6px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 0,
                                height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: '6px solid #1a1a1a',
                              }} />
                            </div>
                          </div>
                        ))}
                        <div className="tooltip-wrapper" style={{ position: 'relative' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDismiss(rec.id)}
                            disabled={actionLoading === rec.id}
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            Dismiss
                          </button>
                          <div className="tooltip-content" style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 8px)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#1a1a1a',
                            color: '#ffffff',
                            border: '1px solid #333',
                            borderRadius: '6px',
                            padding: '10px 14px',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                            zIndex: 1000,
                            opacity: 0,
                            visibility: 'hidden',
                            transition: 'opacity 0.2s, visibility 0.2s',
                            pointerEvents: 'none',
                          }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#fff' }}>Dismiss</div>
                            <div style={{ color: '#ccc' }}>Ignore this recommendation</div>
                            <div style={{
                              position: 'absolute',
                              bottom: '-6px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: 0,
                              height: 0,
                              borderLeft: '6px solid transparent',
                              borderRight: '6px solid transparent',
                              borderTop: '6px solid #1a1a1a',
                            }} />
                          </div>
                        </div>
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

      {/* Tooltip CSS */}
      <style jsx>{`
        .tooltip-wrapper:hover .tooltip-content {
          opacity: 1 !important;
          visibility: visible !important;
        }
      `}</style>
    </>
  );
}
