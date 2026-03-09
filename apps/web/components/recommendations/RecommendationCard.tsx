'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Recommendation, RecommendationOption } from '@/lib/api';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onApply: (recommendationId: string, optionId: number) => Promise<void>;
  onDismiss: (recommendationId: string) => Promise<void>;
  onUndo: (recommendationId: string) => Promise<void>;
  isSelected?: boolean;
  onSelect?: (recommendationId: string, selected: boolean) => void;
}

// Rule explanations for "Why?" section
const ruleExplanations: Record<string, {
  trigger: string;
  dataPoints: string[];
  logic: string;
}> = {
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
    dataPoints: ['ROAS > 2.0x', 'Impression share lost to budget > 20%', 'Conversion trend'],
    logic: 'This campaign is profitable but missing opportunities due to budget limits. Increasing budget should generate more conversions at similar efficiency.',
  },
  fix_tracking: {
    trigger: 'Conversion tracking issues detected',
    dataPoints: ['Clicks without conversions', 'Conversion rate anomaly', 'Tracking status'],
    logic: 'High clicks but no conversions may indicate broken tracking rather than poor performance. Fix tracking before making optimization decisions.',
  },
};

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
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const config = severityConfig[recommendation.severity];
  const ruleExplanation = ruleExplanations[recommendation.rule_id] || {
    trigger: 'Performance threshold exceeded',
    dataPoints: ['Historical metrics analyzed', 'Trend patterns detected', 'Budget efficiency checked'],
    logic: 'AI analyzed performance data and identified an optimization opportunity based on your account\'s patterns.',
  };
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

  const handleAskAdsMaster = () => {
    // Build recommendation data to pass to advisor
    const recData = {
      id: recommendation.id,
      title: recommendation.title,
      description: recommendation.description,
      severity: recommendation.severity,
      type: recommendation.type,
      confidence: recommendation.confidence,
      entity: recommendation.affected_entity.name,
      campaign: recommendation.affected_entity.campaign_name,
      impact: recommendation.impact_estimate,
      rule_id: recommendation.rule_id,
    };

    // Encode and navigate to advisor with recommendation context
    const params = new URLSearchParams({
      context: 'recommendations',
      rec: encodeURIComponent(JSON.stringify(recData)),
    });

    router.push(`/advisor?${params.toString()}`);
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
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
        {recommendation.description}
      </p>

      {/* Why Button - Clickable link to show AI reasoning */}
      <button
        onClick={() => setShowWhy(!showWhy)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          fontSize: '13px',
          color: showWhy ? 'var(--text-primary)' : 'var(--primary)',
          background: showWhy ? 'var(--surface-secondary)' : 'rgba(16, 185, 129, 0.1)',
          border: '1px solid',
          borderColor: showWhy ? 'var(--border)' : 'var(--primary)',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '12px',
          fontWeight: 500,
          transition: 'all 0.2s',
        }}
      >
        <span>🤖</span>
        {showWhy ? 'Hide AI Reasoning' : 'Why this recommendation?'}
        <span style={{
          transform: showWhy ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          fontSize: '10px',
        }}>
          ▼
        </span>
      </button>

      {/* Why Section - Expandable */}
      {showWhy && (
        <div
          style={{
            padding: '12px',
            marginBottom: '12px',
            background: 'rgba(59, 130, 246, 0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)' }}>
            🤖 AI Reasoning
          </div>

          {/* Trigger */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>TRIGGER</div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{ruleExplanation.trigger}</div>
          </div>

          {/* Data Points Analyzed */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>DATA POINTS ANALYZED</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {ruleExplanation.dataPoints.map((point, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    background: 'var(--surface-secondary)',
                    borderRadius: '4px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  ✓ {point}
                </span>
              ))}
            </div>
          </div>

          {/* Logic Explanation */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>WHY IT MATTERS</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {ruleExplanation.logic}
            </div>
          </div>

          {/* Confidence Breakdown */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>CONFIDENCE BREAKDOWN</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  flex: 1,
                  height: '6px',
                  background: 'var(--surface-secondary)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${recommendation.confidence}%`,
                    height: '100%',
                    background: recommendation.confidence >= 80 ? 'var(--success)' : recommendation.confidence >= 60 ? 'var(--warning)' : 'var(--error)',
                    borderRadius: '3px',
                  }}
                />
              </div>
              <span className="mono" style={{ fontSize: '12px', fontWeight: 600 }}>
                {recommendation.confidence}%
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              {recommendation.confidence >= 90 ? 'Very high confidence - Clear pattern detected with significant data' :
               recommendation.confidence >= 80 ? 'High confidence - Strong data supports this recommendation' :
               recommendation.confidence >= 70 ? 'Good confidence - Multiple indicators align' :
               'Moderate confidence - Consider reviewing additional data'}
            </div>
          </div>

          {/* Options Explanation */}
          {recommendation.options.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>ACTION OPTIONS EXPLAINED</div>
              {recommendation.options.map((option) => (
                <div key={option.id} style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', gap: '8px' }}>
                  <span style={{
                    fontWeight: 500,
                    color: option.label === 'Recommended' ? 'var(--success)' : 'var(--text-primary)',
                    minWidth: '90px',
                  }}>
                    {option.label}:
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {option.description}
                    {option.risk === 'medium' && ' (moderate risk)'}
                    {option.risk === 'high' && ' (higher risk)'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
        <strong>Affects:</strong>{' '}
        <span className="mono" style={{ color: 'var(--primary)' }}>
          {recommendation.affected_entity.name}
        </span>
        {recommendation.affected_entity.campaign_name && (
          <span style={{ color: 'var(--text-tertiary)' }}>
            {' '}in {recommendation.affected_entity.campaign_name}
          </span>
        )}
      </div>

      {/* Options / Actions - Inline buttons */}
      {isPending && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {recommendation.options.map((option, idx) => (
            <button
              key={option.id}
              className={`btn btn-sm ${option.label === 'Recommended' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleApply(option.id)}
              disabled={isLoading}
              title={option.description}
              style={{
                position: 'relative',
              }}
            >
              {option.label}
              {option.risk === 'medium' && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '8px',
                  height: '8px',
                  background: 'var(--warning)',
                  borderRadius: '50%'
                }} />
              )}
            </button>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDismiss}
            disabled={isLoading}
            style={{ color: 'var(--text-tertiary)' }}
          >
            Dismiss
          </button>
          <button
            onClick={handleAskAdsMaster}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'white',
              background: 'linear-gradient(135deg, hsl(217 90% 50%), hsl(252 90% 65%))',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px hsla(252, 90%, 65%, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '14px' }}>🤖</span>
            Ask AdsMaster
          </button>
        </div>
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
