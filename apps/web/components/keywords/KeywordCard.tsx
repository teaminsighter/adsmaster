'use client';

import { useState, useRef, useEffect } from 'react';
import { formatMicros, formatNumber } from '@/lib/api';

interface Keyword {
  id: string;
  text: string;
  match_type: string;
  campaign: string;
  status: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend_micros: number;
  cpa_micros: number;
  quality_score: number;
}

interface KeywordCardProps {
  keyword: Keyword;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onAction?: (id: string, action: 'pause' | 'enable') => void;
}

export default function KeywordCard({ keyword, selected, onSelect, onAction }: KeywordCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const isActive = keyword.status === 'ENABLED';
  const isWasting = keyword.conversions === 0 && keyword.spend_micros > 200_000000;

  const getQsStyle = (qs: number): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '10px',
      fontSize: '13px',
      fontWeight: 700,
    };
    if (qs >= 7) return { ...base, background: '#10B981', color: 'white' };
    if (qs >= 5) return { ...base, background: '#F59E0B', color: '#1a1a1a' };
    return { ...base, background: '#EF4444', color: 'white' };
  };

  const handleAction = (action: 'pause' | 'enable') => {
    setMenuOpen(false);
    if (onAction) {
      onAction(keyword.id, action);
    }
    // No alert fallback - parent should handle via onAction
  };

  return (
    <div
      style={{
        background: isWasting ? 'rgba(239, 68, 68, 0.03)' : 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderLeft: isWasting ? '3px solid #EF4444' : '1px solid var(--border-default)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '12px',
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '12px',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        {/* Checkbox */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '44px',
            minHeight: '44px',
            margin: '-8px -4px -8px -8px',
          }}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(keyword.id, e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="mono"
            style={{
              fontWeight: 600,
              fontSize: '14px',
              color: 'var(--text-primary)',
              wordBreak: 'break-word',
            }}
          >
            {keyword.text}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '4px',
            }}
          >
            <span
              style={{
                fontSize: '9px',
                padding: '2px 6px',
                background: 'var(--bg-tertiary)',
                borderRadius: '4px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
            >
              {keyword.match_type}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {keyword.campaign}
            </span>
          </div>
        </div>

        {/* Status */}
        <div
          style={{
            fontSize: '16px',
            minWidth: '24px',
            textAlign: 'center',
            color: isActive ? '#10B981' : 'var(--text-tertiary)',
          }}
        >
          {isActive ? '●' : '○'}
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--surface-secondary)',
        }}
      >
        {/* Spend */}
        <div
          style={{
            padding: '12px 8px',
            textAlign: 'center',
            borderRight: '1px solid var(--border-default)',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}
          >
            Spend
          </div>
          <div
            className="mono"
            style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {formatMicros(keyword.spend_micros)}
          </div>
        </div>

        {/* Clicks */}
        <div
          style={{
            padding: '12px 8px',
            textAlign: 'center',
            borderRight: '1px solid var(--border-default)',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}
          >
            Clicks
          </div>
          <div
            className="mono"
            style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {formatNumber(keyword.clicks)}
          </div>
        </div>

        {/* Conv */}
        <div
          style={{
            padding: '12px 8px',
            textAlign: 'center',
            borderRight: '1px solid var(--border-default)',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}
          >
            Conv
          </div>
          <div
            className="mono"
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: keyword.conversions === 0 ? '#EF4444' : 'var(--text-primary)',
            }}
          >
            {keyword.conversions || '—'}
          </div>
        </div>

        {/* QS */}
        <div style={{ padding: '12px 8px', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}
          >
            QS
          </div>
          <div>
            <span style={getQsStyle(keyword.quality_score)}>{keyword.quality_score}</span>
          </div>
        </div>
      </div>

      {/* Footer Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          background: 'var(--surface-card)',
          borderTop: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span>
            <span style={{ color: 'var(--text-tertiary)' }}>Impr:</span>{' '}
            <span className="mono">{formatNumber(keyword.impressions)}</span>
          </span>
          <span>
            <span style={{ color: 'var(--text-tertiary)' }}>CPA:</span>{' '}
            <span className="mono">{keyword.cpa_micros > 0 ? formatMicros(keyword.cpa_micros) : '—'}</span>
          </span>
        </div>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            style={{
              minWidth: '44px',
              minHeight: '36px',
              padding: '8px 12px',
              background: 'none',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ⋮
          </button>
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                right: 0,
                marginBottom: '4px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                overflow: 'hidden',
                zIndex: 50,
                minWidth: '120px',
              }}
            >
              <button
                onClick={() => handleAction(isActive ? 'pause' : 'enable')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {isActive ? '⏸ Pause' : '▶ Enable'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Wasting Warning */}
      {isWasting && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.08)',
            borderTop: '1px solid rgba(239, 68, 68, 0.2)',
            fontSize: '11px',
            color: '#EF4444',
            fontWeight: 500,
          }}
        >
          ⚠️ Wasting: {formatMicros(keyword.spend_micros)} spent, 0 conversions
        </div>
      )}
    </div>
  );
}
