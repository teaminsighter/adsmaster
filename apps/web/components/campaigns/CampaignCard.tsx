'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatMicros, formatNumber } from '@/lib/api';

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  type: string;
  budget_micros: number;
  spend_micros: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpa_micros: number;
  roas: number;
  quality_score: number | null;
}

interface CampaignCardProps {
  campaign: Campaign;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onAction?: (id: string, action: 'pause' | 'enable' | 'edit') => void;
}

export default function CampaignCard({ campaign, selected, onSelect, onAction }: CampaignCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
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

  const isActive = campaign.status === 'ENABLED';
  const platformColor = campaign.platform === 'google' ? '#4285F4' : '#0668E1';
  const platformName = campaign.platform === 'google' ? 'Google' : 'Meta';

  const getRoasPillClass = (roas: number) => {
    if (roas >= 4) return 'roas-pill roas-pill-good';
    if (roas >= 3) return 'roas-pill roas-pill-ok';
    return 'roas-pill roas-pill-bad';
  };

  const handleCardClick = () => {
    router.push(`/campaigns/${campaign.id}`);
  };

  const handleAction = (action: 'pause' | 'enable' | 'edit') => {
    setMenuOpen(false);
    if (onAction) {
      onAction(campaign.id, action);
    }
    // No alert fallback - parent handles via onAction
  };

  return (
    <div className="campaign-card">
      {/* Header Row */}
      <div className="campaign-card-header">
        <div className="campaign-card-checkbox" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(campaign.id, e.target.checked)}
          />
        </div>
        <div className="campaign-card-title" onClick={handleCardClick}>
          <div className="campaign-card-name">{campaign.name}</div>
          <div className="campaign-card-meta">
            <span
              className="campaign-card-platform-dot"
              style={{ background: platformColor }}
            />
            {platformName} · {campaign.type}
          </div>
        </div>
        <div
          className="campaign-card-status"
          style={{ color: isActive ? 'var(--success)' : 'var(--text-tertiary)' }}
        >
          {isActive ? '●' : '○'}
        </div>
      </div>

      {/* Primary Metrics Row */}
      <div className="campaign-card-metrics" onClick={handleCardClick}>
        <div className="campaign-card-metric">
          <div className="campaign-card-metric-label">Spend</div>
          <div className="campaign-card-metric-value mono">
            {formatMicros(campaign.spend_micros)}
          </div>
        </div>
        <div className="campaign-card-metric">
          <div className="campaign-card-metric-label">Budget</div>
          <div className="campaign-card-metric-value mono">
            {formatMicros(campaign.budget_micros)}/d
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="campaign-card-metrics campaign-card-metrics-secondary" onClick={handleCardClick}>
        <div className="campaign-card-metric">
          <div className="campaign-card-metric-label">Conv</div>
          <div className="campaign-card-metric-value mono">
            {campaign.conversions || '—'}
          </div>
        </div>
        <div className="campaign-card-metric">
          <div className="campaign-card-metric-label">ROAS</div>
          <div className="campaign-card-metric-value">
            <span className={`${getRoasPillClass(campaign.roas)} mono`}>
              {campaign.roas}x
            </span>
          </div>
        </div>
        <div className="campaign-card-metric">
          <div className="campaign-card-metric-label">CTR</div>
          <div className="campaign-card-metric-value mono">
            {campaign.ctr.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="campaign-card-actions">
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleCardClick}
          style={{ flex: 1 }}
        >
          View Details
        </button>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            style={{ minWidth: '44px' }}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="campaign-card-menu">
              <button
                className="campaign-card-menu-item"
                onClick={() => handleAction(isActive ? 'pause' : 'enable')}
              >
                {isActive ? '⏸ Pause' : '▶ Enable'}
              </button>
              <button
                className="campaign-card-menu-item"
                onClick={() => handleAction('edit')}
              >
                ✏️ Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
