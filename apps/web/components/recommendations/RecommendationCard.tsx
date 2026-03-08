'use client';

import { useState } from 'react';
import { Recommendation, RecommendationOption } from '@/lib/api';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onApply: (recommendationId: string, optionId: number) => Promise<void>;
  onDismiss: (recommendationId: string) => Promise<void>;
  onUndo: (recommendationId: string) => Promise<void>;
  isSelected?: boolean;
  onSelect?: (recommendationId: string, selected: boolean) => void;
}

const severityConfig = {
  critical: {
    bg: 'rgba(239, 68, 68, 0.05)',
    border: 'var(--error)',
    badge: 'badge-error',
    icon: '🚨',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.05)',
    border: 'var(--warning)',
    badge: 'badge-warning',
    icon: '⚠️',
  },
  opportunity: {
    bg: 'rgba(16, 185, 129, 0.05)',
    border: 'var(--success)',
    badge: 'badge-success',
    icon: '💡',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.05)',
    border: 'var(--info)',
    badge: 'badge-info',
    icon: 'ℹ️',
  },
};

const typeLabels: Record<string, string> = {
  pause_keyword: 'Pause Keyword',
  add_negative: 'Add Negative',
  increase_budget: 'Increase Budget',
  fix_tracking: 'Fix Tracking',
  reduce_bid: 'Reduce Bid',
};

export default function RecommendationCard({
  recommendation,
  onApply,
  onDismiss,
  onUndo,
  isSelected,
  onSelect,
}: RecommendationCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const config = severityConfig[recommendation.severity];
  const impact = recommendation.impact_estimate;

  const handleApply = async (optionId: number) => {
    setIsLoading(true);
    try {
      await onApply(recommendation.id, optionId);
    } finally {
      setIsLoading(false);
      setShowOptions(false);
    }
  };

  const handleDismiss = async () => {
    setIsLoading(true);
    try {
      await onDismiss(recommendation.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = async () => {
    setIsLoading(true);
    try {
      await onUndo(recommendation.id);
    } finally {
      setIsLoading(false);
    }
  };

  const isApplied = recommendation.status === 'applied';
  const isDismissed = recommendation.status === 'dismissed';
  const isPending = recommendation.status === 'pending';

  return (
    <div
      className="card"
      style={{
        background: config.bg,
        borderLeft: `4px solid ${config.border}`,
        opacity: isDismissed ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {onSelect && isPending && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(recommendation.id, e.target.checked)}
              style={{ marginTop: '4px' }}
            />
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px' }}>{config.icon}</span>
              <span style={{ fontWeight: 600, fontSize: '15px' }}>{recommendation.title}</span>
              <span className={`badge ${config.badge}`} style={{ textTransform: 'capitalize' }}>
                {recommendation.severity}
              </span>
              {isApplied && (
                <span className="badge badge-success">Applied</span>
              )}
              {isDismissed && (
                <span className="badge badge-neutral">Dismissed</span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {typeLabels[recommendation.type] || recommendation.type} • {recommendation.affected_entity.campaign_name}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="mono"
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              background: 'var(--surface-secondary)',
              borderRadius: '4px',
            }}
          >
            {recommendation.confidence}% confidence
          </span>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.5 }}>
        {recommendation.description}
      </p>

      {/* Impact */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '12px',
          background: 'var(--surface-secondary)',
          borderRadius: '6px',
          marginBottom: '12px',
        }}
      >
        {impact.monthly_savings && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Monthly Savings</div>
            <div className="mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--success)' }}>
              ${impact.monthly_savings.toFixed(0)}
            </div>
          </div>
        )}
        {impact.potential_gain && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Potential Gain</div>
            <div className="mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)' }}>
              +{impact.potential_gain.toFixed(0)} conv/mo
            </div>
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Summary</div>
          <div style={{ fontSize: '13px' }}>{impact.summary}</div>
        </div>
      </div>

      {/* Affected Entity */}
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        <strong>Affected:</strong>{' '}
        <span className="mono" style={{ background: 'var(--surface-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
          {recommendation.affected_entity.name}
        </span>
      </div>

      {/* Options / Actions */}
      {isPending && (
        <>
          {showOptions ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>Select an action:</div>
              {recommendation.options.map((option) => (
                <button
                  key={option.id}
                  className={`btn btn-sm ${selectedOption === option.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleApply(option.id)}
                  disabled={isLoading}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  <span style={{ fontWeight: 500, marginRight: '8px' }}>{option.label}:</span>
                  <span style={{ opacity: 0.8 }}>{option.description}</span>
                  {option.risk === 'medium' && (
                    <span className="badge badge-warning" style={{ marginLeft: 'auto', fontSize: '10px' }}>
                      Medium risk
                    </span>
                  )}
                </button>
              ))}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowOptions(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowOptions(true)}
                disabled={isLoading}
              >
                Apply
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleDismiss}
                disabled={isLoading}
              >
                Dismiss
              </button>
            </div>
          )}
        </>
      )}

      {isApplied && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--success)' }}>
            Applied: {recommendation.options.find(o => o.id === recommendation.applied_option_id)?.description}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleUndo}
            disabled={isLoading}
          >
            Undo
          </button>
        </div>
      )}

      {isDismissed && (
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          Dismissed {recommendation.dismiss_reason ? `- ${recommendation.dismiss_reason}` : ''}
        </div>
      )}
    </div>
  );
}
