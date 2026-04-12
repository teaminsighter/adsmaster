'use client';

import { useAuctionInsights, AuctionInsightEntry, LeadGenInsights } from '@/lib/hooks/useApi';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

interface AuctionInsightsCardProps {
  accountId: string;
  campaignId: string;
  dateFrom?: string;
  dateTo?: string;
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)}%`;
}

function getShareColor(share: number | null): string {
  if (share === null) return 'var(--text-tertiary)';
  if (share >= 70) return 'var(--success)';
  if (share >= 40) return 'var(--warning)';
  return 'var(--error)';
}

function CompetitorRow({ entry, rank, isMobile }: { entry: AuctionInsightEntry; rank: number; isMobile: boolean }) {
  if (isMobile) {
    return (
      <div
        style={{
          background: 'var(--surface-secondary)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: rank <= 3 ? 'var(--primary)' : 'var(--bg-tertiary)',
                color: rank <= 3 ? 'white' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {rank}
            </span>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{entry.domain}</span>
          </div>
          <span
            className="mono"
            style={{
              fontWeight: 700,
              fontSize: '14px',
              color: getShareColor(entry.impression_share),
            }}
          >
            {formatPercent(entry.impression_share)}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '10px', textTransform: 'uppercase' }}>Overlap</div>
            <div className="mono">{formatPercent(entry.overlap_rate)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '10px', textTransform: 'uppercase' }}>Above You</div>
            <div className="mono" style={{ color: (entry.position_above_rate ?? 0) > 50 ? 'var(--error)' : undefined }}>
              {formatPercent(entry.position_above_rate)}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '10px', textTransform: 'uppercase' }}>Outranking</div>
            <div className="mono">{formatPercent(entry.outranking_share)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr>
      <td style={{ fontWeight: 500 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: rank <= 3 ? 'var(--primary)' : 'var(--bg-tertiary)',
              color: rank <= 3 ? 'white' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {rank}
          </span>
          {entry.domain}
        </div>
      </td>
      <td className="right mono" style={{ color: getShareColor(entry.impression_share), fontWeight: 600 }}>
        {formatPercent(entry.impression_share)}
      </td>
      <td className="right mono">{formatPercent(entry.overlap_rate)}</td>
      <td className="right mono" style={{ color: (entry.position_above_rate ?? 0) > 50 ? 'var(--error)' : undefined }}>
        {formatPercent(entry.position_above_rate)}
      </td>
      <td className="right mono">{formatPercent(entry.top_impression_pct)}</td>
      <td className="right mono">{formatPercent(entry.outranking_share)}</td>
    </tr>
  );
}

function LeadGenInsightsPanel({ insights }: { insights: LeadGenInsights }) {
  const isCritical = insights.impression_share_lost > 40;
  const isWarning = insights.impression_share_lost > 20;

  return (
    <div
      style={{
        padding: '16px',
        background: isCritical
          ? 'rgba(239, 68, 68, 0.08)'
          : isWarning
          ? 'rgba(245, 158, 11, 0.08)'
          : 'var(--primary-light)',
        borderLeft: `4px solid ${isCritical ? 'var(--error)' : isWarning ? 'var(--warning)' : 'var(--primary)'}`,
        borderRadius: '0 8px 8px 0',
        marginTop: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <span style={{ fontSize: '18px' }}>{isCritical ? '🚨' : isWarning ? '⚠️' : '💡'}</span>
        <span
          style={{
            fontWeight: 600,
            color: isCritical ? 'var(--error)' : isWarning ? 'var(--warning)' : 'var(--primary)',
          }}
        >
          Lead Gen Impact Analysis
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Impression Share Lost
          </div>
          <div
            className="mono"
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: isCritical ? 'var(--error)' : isWarning ? 'var(--warning)' : 'var(--text-primary)',
            }}
          >
            {insights.impression_share_lost.toFixed(1)}%
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Potential Leads Missed
          </div>
          <div
            className="mono"
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: insights.potential_leads_missed_pct > 30 ? 'var(--error)' : 'var(--text-primary)',
            }}
          >
            ~{insights.potential_leads_missed_pct}%
          </div>
        </div>

        {insights.top_competitor && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Top Competitor
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {insights.top_competitor}
              {insights.top_competitor_share && (
                <span className="mono" style={{ marginLeft: '6px', color: 'var(--text-secondary)' }}>
                  ({insights.top_competitor_share.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          padding: '12px',
          background: 'var(--surface-card)',
          borderRadius: '6px',
          fontSize: '13px',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--primary)' }}>Recommendation:</strong>{' '}
        {insights.recommendation}
      </div>
    </div>
  );
}

export default function AuctionInsightsCard({ accountId, campaignId, dateFrom, dateTo }: AuctionInsightsCardProps) {
  const isMobile = useIsMobile();
  const { data, loading, error } = useAuctionInsights(accountId, campaignId, dateFrom, dateTo);

  if (loading) {
    return (
      <div className="card" style={{ marginTop: isMobile ? '16px' : '24px' }}>
        <div className="card-header">
          <span className="card-title">Auction Insights</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              border: '2px solid var(--border-default)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style jsx>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ marginTop: isMobile ? '16px' : '24px' }}>
        <div className="card-header">
          <span className="card-title">Auction Insights</span>
        </div>
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
          <div>Unable to load auction insights</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>{error || 'No data available'}</div>
        </div>
      </div>
    );
  }

  const { insights, your_impression_share, total_competitors, lead_gen_insights, date_from, date_to } = data;

  return (
    <div className="card" style={{ marginTop: isMobile ? '16px' : '24px' }}>
      <div className="card-header">
        <div>
          <span className="card-title">Auction Insights</span>
          {data.demo_mode && (
            <span
              style={{
                marginLeft: '8px',
                padding: '2px 6px',
                background: 'var(--warning-light)',
                color: 'var(--warning)',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
              }}
            >
              DEMO
            </span>
          )}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {date_from} - {date_to}
        </span>
      </div>

      {/* Your Stats Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: '16px',
          padding: '16px',
          background: 'var(--surface-secondary)',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Your Impression Share
          </div>
          <div
            className="mono"
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: getShareColor(your_impression_share),
            }}
          >
            {formatPercent(your_impression_share)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Total Competitors
          </div>
          <div className="mono" style={{ fontSize: '24px', fontWeight: 700 }}>
            {total_competitors}
          </div>
        </div>
        {!isMobile && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Market Position
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>
              {(your_impression_share ?? 0) >= 50 ? (
                <span style={{ color: 'var(--success)' }}>Market Leader</span>
              ) : (your_impression_share ?? 0) >= 25 ? (
                <span style={{ color: 'var(--warning)' }}>Strong Competitor</span>
              ) : (
                <span style={{ color: 'var(--error)' }}>Underperforming</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lead Gen Insights Panel */}
      {lead_gen_insights && <LeadGenInsightsPanel insights={lead_gen_insights} />}

      {/* Competitors Table/Cards */}
      {insights && insights.length > 0 ? (
        <>
          <div style={{ marginTop: '20px', marginBottom: '12px', fontWeight: 600, fontSize: '14px' }}>
            Top Competitors
          </div>
          {isMobile ? (
            <div>
              {insights.map((entry, idx) => (
                <CompetitorRow key={entry.domain} entry={entry} rank={idx + 1} isMobile={true} />
              ))}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Competitor</th>
                  <th className="right">Impr. Share</th>
                  <th className="right">Overlap Rate</th>
                  <th className="right">Position Above</th>
                  <th className="right">Top Impr %</th>
                  <th className="right">Outranking</th>
                </tr>
              </thead>
              <tbody>
                {insights.map((entry, idx) => (
                  <CompetitorRow key={entry.domain} entry={entry} rank={idx + 1} isMobile={false} />
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No competitor data available for this period
        </div>
      )}

      {/* Help Text */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--surface-secondary)',
          borderRadius: '6px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        <strong>What is this?</strong> Auction insights show how your ads compete against other advertisers.
        <em> Impression Share</em> is how often your ads showed. <em>Position Above Rate</em> shows how often competitors appeared above you.
        For lead gen campaigns, higher impression share = more potential leads captured.
      </div>
    </div>
  );
}
