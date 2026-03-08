'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import RecommendationCard from '@/components/recommendations/RecommendationCard';
import { Recommendation } from '@/lib/api';

// Mock data for frontend development
const mockRecommendations: Recommendation[] = [
  {
    id: 'rec_1',
    ad_account_id: 'acc_1',
    organization_id: 'org_1',
    rule_id: 'wasting_keyword_high',
    type: 'pause_keyword',
    severity: 'warning',
    title: 'High-spend wasting keyword',
    description: "Keyword 'cheap widgets online' spent $85.50 with 0 conversions in the last 7 days",
    impact_estimate: {
      monthly_savings: 342,
      potential_gain: null,
      summary: 'Save ~$342/month by pausing',
    },
    affected_entity: {
      type: 'keyword',
      id: 'kw_1',
      name: 'cheap widgets online',
      campaign_id: 'camp_1',
      campaign_name: 'Search - Non-Brand',
    },
    options: [
      { id: 1, label: 'Conservative', action: 'reduce_bid_50', description: 'Reduce bid by 50%', risk: 'low' },
      { id: 2, label: 'Recommended', action: 'pause', description: 'Pause keyword', risk: 'low' },
      { id: 3, label: 'Aggressive', action: 'pause_and_negative', description: 'Pause and add as negative', risk: 'medium' },
    ],
    status: 'pending',
    confidence: 94,
    expires_at: '2026-03-15T00:00:00Z',
    created_at: '2026-03-08T10:00:00Z',
  },
  {
    id: 'rec_2',
    ad_account_id: 'acc_1',
    organization_id: 'org_1',
    rule_id: 'wasting_keyword_high',
    type: 'pause_keyword',
    severity: 'warning',
    title: 'High-spend wasting keyword',
    description: "Keyword 'discount product deals' spent $62.30 with 0 conversions in the last 7 days",
    impact_estimate: {
      monthly_savings: 249,
      potential_gain: null,
      summary: 'Save ~$249/month by pausing',
    },
    affected_entity: {
      type: 'keyword',
      id: 'kw_2',
      name: 'discount product deals',
      campaign_id: 'camp_1',
      campaign_name: 'Search - Non-Brand',
    },
    options: [
      { id: 1, label: 'Conservative', action: 'reduce_bid_50', description: 'Reduce bid by 50%', risk: 'low' },
      { id: 2, label: 'Recommended', action: 'pause', description: 'Pause keyword', risk: 'low' },
      { id: 3, label: 'Aggressive', action: 'pause_and_negative', description: 'Pause and add as negative', risk: 'medium' },
    ],
    status: 'pending',
    confidence: 91,
    expires_at: '2026-03-15T00:00:00Z',
    created_at: '2026-03-08T10:00:00Z',
  },
  {
    id: 'rec_3',
    ad_account_id: 'acc_1',
    organization_id: 'org_1',
    rule_id: 'budget_constrained',
    type: 'increase_budget',
    severity: 'opportunity',
    title: 'Campaign limited by budget',
    description: "Campaign 'PMax - Products' is profitable (ROAS 3.5x) but losing 42% impression share to budget",
    impact_estimate: {
      monthly_savings: null,
      potential_gain: 33,
      summary: 'Potential additional conversions: +33/month',
    },
    affected_entity: {
      type: 'campaign',
      id: 'camp_3',
      name: 'PMax - Products',
      campaign_id: 'camp_3',
      campaign_name: 'PMax - Products',
    },
    options: [
      { id: 1, label: 'Conservative', action: 'increase_budget_20', description: 'Increase budget by 20%', risk: 'low' },
      { id: 2, label: 'Moderate', action: 'increase_budget_50', description: 'Increase budget by 50%', risk: 'medium' },
      { id: 3, label: 'Aggressive', action: 'increase_budget_100', description: 'Double budget', risk: 'medium' },
    ],
    status: 'pending',
    confidence: 87,
    expires_at: '2026-03-15T00:00:00Z',
    created_at: '2026-03-08T10:00:00Z',
  },
  {
    id: 'rec_4',
    ad_account_id: 'acc_1',
    organization_id: 'org_1',
    rule_id: 'budget_constrained',
    type: 'increase_budget',
    severity: 'opportunity',
    title: 'Campaign limited by budget',
    description: "Campaign 'Search - Non-Brand' is profitable (ROAS 2.8x) but losing 35% impression share to budget",
    impact_estimate: {
      monthly_savings: null,
      potential_gain: 16,
      summary: 'Potential additional conversions: +16/month',
    },
    affected_entity: {
      type: 'campaign',
      id: 'camp_1',
      name: 'Search - Non-Brand',
      campaign_id: 'camp_1',
      campaign_name: 'Search - Non-Brand',
    },
    options: [
      { id: 1, label: 'Conservative', action: 'increase_budget_20', description: 'Increase budget by 20%', risk: 'low' },
      { id: 2, label: 'Moderate', action: 'increase_budget_50', description: 'Increase budget by 50%', risk: 'medium' },
      { id: 3, label: 'Aggressive', action: 'increase_budget_100', description: 'Double budget', risk: 'medium' },
    ],
    status: 'pending',
    confidence: 82,
    expires_at: '2026-03-15T00:00:00Z',
    created_at: '2026-03-08T10:00:00Z',
  },
  {
    id: 'rec_5',
    ad_account_id: 'acc_1',
    organization_id: 'org_1',
    rule_id: 'low_quality_score',
    type: 'reduce_bid',
    severity: 'warning',
    title: 'Low quality score keyword',
    description: "Keyword 'free shipping products' has quality score 3/10 and CPC is 60% above average",
    impact_estimate: {
      monthly_savings: 28,
      potential_gain: null,
      summary: 'Improve QS to reduce CPC by ~$28/month',
    },
    affected_entity: {
      type: 'keyword',
      id: 'kw_3',
      name: 'free shipping products',
      campaign_id: 'camp_1',
      campaign_name: 'Search - Non-Brand',
    },
    options: [
      { id: 1, label: 'Improve landing page', action: 'improve_lp', description: 'Review landing page relevance', risk: 'low' },
      { id: 2, label: 'Improve ad copy', action: 'improve_ad', description: 'Make ad more relevant to keyword', risk: 'low' },
      { id: 3, label: 'Reduce bid', action: 'reduce_bid_20', description: 'Lower bid while improving QS', risk: 'low' },
    ],
    status: 'pending',
    confidence: 78,
    expires_at: '2026-03-15T00:00:00Z',
    created_at: '2026-03-08T10:00:00Z',
  },
];

type FilterSeverity = 'all' | 'critical' | 'warning' | 'opportunity' | 'info';
type FilterStatus = 'all' | 'pending' | 'applied' | 'dismissed';

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>(mockRecommendations);
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Calculate stats
  const stats = {
    total: recommendations.length,
    pending: recommendations.filter((r) => r.status === 'pending').length,
    applied: recommendations.filter((r) => r.status === 'applied').length,
    dismissed: recommendations.filter((r) => r.status === 'dismissed').length,
    totalSavings: recommendations
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + (r.impact_estimate.monthly_savings || 0), 0),
    totalGain: recommendations
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + (r.impact_estimate.potential_gain || 0), 0),
    bySeverity: {
      critical: recommendations.filter((r) => r.status === 'pending' && r.severity === 'critical').length,
      warning: recommendations.filter((r) => r.status === 'pending' && r.severity === 'warning').length,
      opportunity: recommendations.filter((r) => r.status === 'pending' && r.severity === 'opportunity').length,
      info: recommendations.filter((r) => r.status === 'pending' && r.severity === 'info').length,
    },
  };

  // Filter recommendations
  const filteredRecommendations = recommendations.filter((r) => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const handleApply = async (recommendationId: string, optionId: number) => {
    // In production, would call API
    setRecommendations((prev) =>
      prev.map((r) =>
        r.id === recommendationId
          ? { ...r, status: 'applied' as const, applied_at: new Date().toISOString(), applied_option_id: optionId }
          : r
      )
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(recommendationId);
      return next;
    });
  };

  const handleDismiss = async (recommendationId: string) => {
    setRecommendations((prev) =>
      prev.map((r) =>
        r.id === recommendationId
          ? { ...r, status: 'dismissed' as const, dismissed_at: new Date().toISOString() }
          : r
      )
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(recommendationId);
      return next;
    });
  };

  const handleUndo = async (recommendationId: string) => {
    setRecommendations((prev) =>
      prev.map((r) =>
        r.id === recommendationId
          ? { ...r, status: 'pending' as const, applied_at: undefined, applied_option_id: undefined }
          : r
      )
    );
  };

  const handleSelect = (recommendationId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(recommendationId);
      } else {
        next.delete(recommendationId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const pendingIds = filteredRecommendations
      .filter((r) => r.status === 'pending')
      .map((r) => r.id);
    if (selectedIds.size === pendingIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  const handleBulkApply = async (optionId: number) => {
    for (const id of selectedIds) {
      await handleApply(id, optionId);
    }
  };

  const handleBulkDismiss = async () => {
    for (const id of selectedIds) {
      await handleDismiss(id);
    }
  };

  return (
    <>
      <Header title="AI Recommendations" />
      <div className="page-content">
        {/* Summary Cards */}
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card" style={{ borderLeft: '3px solid var(--primary)' }}>
            <div className="metric-label">Pending Recommendations</div>
            <div className="metric-value">{stats.pending}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {stats.applied} applied, {stats.dismissed} dismissed
            </div>
          </div>
          <div className="metric-card" style={{ borderLeft: '3px solid var(--success)' }}>
            <div className="metric-label">Potential Monthly Savings</div>
            <div className="metric-value mono" style={{ color: 'var(--success)' }}>
              ${stats.totalSavings.toFixed(0)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              If all waste recommendations applied
            </div>
          </div>
          <div className="metric-card" style={{ borderLeft: '3px solid var(--primary)' }}>
            <div className="metric-label">Potential Additional Conv</div>
            <div className="metric-value mono" style={{ color: 'var(--primary)' }}>
              +{stats.totalGain.toFixed(0)}/mo
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              If all opportunity recommendations applied
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">By Severity</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              {stats.bySeverity.critical > 0 && (
                <span className="badge badge-error">{stats.bySeverity.critical} Critical</span>
              )}
              {stats.bySeverity.warning > 0 && (
                <span className="badge badge-warning">{stats.bySeverity.warning} Warning</span>
              )}
              {stats.bySeverity.opportunity > 0 && (
                <span className="badge badge-success">{stats.bySeverity.opportunity} Opportunity</span>
              )}
              {stats.bySeverity.info > 0 && (
                <span className="badge badge-info">{stats.bySeverity.info} Info</span>
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
              <option value="pending">Pending ({stats.pending})</option>
              <option value="applied">Applied ({stats.applied})</option>
              <option value="dismissed">Dismissed ({stats.dismissed})</option>
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
              <option value="info">Info</option>
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
              <button className="btn btn-primary btn-sm" onClick={() => handleBulkApply(2)}>
                Apply All (Recommended)
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleBulkDismiss}>
                Dismiss All
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </button>
            </div>
          )}

          {statusFilter === 'pending' && filteredRecommendations.filter((r) => r.status === 'pending').length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleSelectAll}>
              {selectedIds.size === filteredRecommendations.filter((r) => r.status === 'pending').length
                ? 'Deselect All'
                : 'Select All'}
            </button>
          )}
        </div>

        {/* Recommendations List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredRecommendations.length === 0 ? (
            <div
              className="card"
              style={{
                padding: '48px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>✨</div>
              <div style={{ fontSize: '16px', fontWeight: 500 }}>No recommendations found</div>
              <div style={{ fontSize: '14px' }}>
                {statusFilter === 'pending'
                  ? 'All recommendations have been addressed!'
                  : 'Try adjusting your filters'}
              </div>
            </div>
          ) : (
            filteredRecommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onApply={handleApply}
                onDismiss={handleDismiss}
                onUndo={handleUndo}
                isSelected={selectedIds.has(rec.id)}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>

        {/* Footer Stats */}
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
          <span>
            Showing {filteredRecommendations.length} of {stats.total} recommendations
          </span>
          <span>
            Last generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </>
  );
}
