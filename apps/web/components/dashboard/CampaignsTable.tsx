'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatMicros, formatNumber, formatPercent } from '@/lib/api';

interface Campaign {
  id: string;
  name: string;
  status: string;
  type: string;
  spend: number;
  budget: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number;
  roas: number;
}

interface CampaignsTableProps {
  campaigns: Campaign[];
  accountId: string;
}

export default function CampaignsTable({ campaigns, accountId }: CampaignsTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAll = () => {
    if (selectedRows.size === campaigns.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(campaigns.map(c => c.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { class: string; label: string }> = {
      ENABLED: { class: 'badge-success', label: '● Active' },
      PAUSED: { class: 'badge-neutral', label: '○ Paused' },
      REMOVED: { class: 'badge-error', label: '✕ Removed' },
    };
    const { class: badgeClass, label } = statusMap[status] || { class: 'badge-neutral', label: status };
    return <span className={`badge ${badgeClass}`}>{label}</span>;
  };

  const getPacingStatus = (spend: number, budget: number) => {
    const pacing = (spend / budget) * 100;
    if (pacing > 110) return { class: 'badge-error', label: `${pacing.toFixed(0)}% ⚠️` };
    if (pacing > 90) return { class: 'badge-warning', label: `${pacing.toFixed(0)}%` };
    return { class: 'badge-success', label: `${pacing.toFixed(0)}%` };
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Bulk Actions Bar */}
      {selectedRows.size > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: 'var(--primary-light)',
          borderBottom: '1px solid var(--border-default)',
        }}>
          <span style={{ fontWeight: 500 }}>{selectedRows.size} selected</span>
          <button className="btn btn-sm btn-secondary">⏸ Pause</button>
          <button className="btn btn-sm btn-secondary">▶️ Enable</button>
          <button className="btn btn-sm btn-secondary">💰 Change Budget</button>
          <button className="btn btn-sm btn-secondary">📥 Export</button>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <input
                type="checkbox"
                checked={selectedRows.size === campaigns.length && campaigns.length > 0}
                onChange={toggleAll}
              />
            </th>
            <th>Campaign</th>
            <th>Status</th>
            <th className="right">Budget</th>
            <th className="right">Pacing</th>
            <th className="right">Spend</th>
            <th className="right">Impr</th>
            <th className="right">Clicks</th>
            <th className="right">Conv</th>
            <th className="right">CPA</th>
            <th className="right">ROAS</th>
            <th style={{ width: '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const pacing = getPacingStatus(campaign.spend, campaign.budget);
            return (
              <tr key={campaign.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedRows.has(campaign.id)}
                    onChange={() => toggleRow(campaign.id)}
                  />
                </td>
                <td>
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    style={{
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    {campaign.name}
                  </Link>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {campaign.type}
                  </div>
                </td>
                <td>{getStatusBadge(campaign.status)}</td>
                <td className="right mono">{formatMicros(campaign.budget)}</td>
                <td className="right">
                  <span className={`badge ${pacing.class}`}>{pacing.label}</span>
                </td>
                <td className="right mono">{formatMicros(campaign.spend)}</td>
                <td className="right mono">{formatNumber(campaign.impressions)}</td>
                <td className="right mono">{formatNumber(campaign.clicks)}</td>
                <td className="right mono">{campaign.conversions}</td>
                <td className="right mono">{formatMicros(campaign.cpa)}</td>
                <td className="right mono" style={{ color: campaign.roas >= 3 ? 'var(--success)' : 'var(--text-primary)' }}>
                  {campaign.roas.toFixed(1)}x
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm">⋮</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: '1px solid var(--border-default)',
        fontSize: '13px',
        color: 'var(--text-secondary)',
      }}>
        <span>Showing {campaigns.length} campaigns</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost btn-sm" disabled>← Prev</button>
          <button className="btn btn-ghost btn-sm" disabled>Next →</button>
        </div>
      </div>
    </div>
  );
}
