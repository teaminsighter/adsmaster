'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import DemoBanner from '@/components/ui/DemoBanner';
import { useAnalytics } from '@/lib/hooks/useApi';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

// Helper to format micros to dollars
const formatMoney = (micros: number) => {
  return (micros / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export default function AnalyticsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState('30d');
  const [chartMetric, setChartMetric] = useState<'spend' | 'revenue'>('spend');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const { data, loading, error, isDemo } = useAnalytics(period);

  // Loading state
  if (loading) {
    return (
      <>
        <Header title="Analytics" />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="loading-spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Loading analytics...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <>
        <Header title="Analytics" />
        <div className="page-content">
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ marginBottom: '8px' }}>Unable to load analytics</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{error || 'Please try again later'}</p>
          </div>
        </div>
      </>
    );
  }

  const { overview, changes, platform_breakdown, top_campaigns, trend_data } = data;

  // Calculate chart data
  const getChartData = () => {
    if (!trend_data || trend_data.length === 0) return [];
    const values = trend_data.map(d => chartMetric === 'revenue' ? (d.revenue_micros || 0) : (d.spend_micros || 0));
    const maxVal = Math.max(...values);
    if (maxVal <= 0) return trend_data.map(() => ({ height: 0, value: 0, date: '' }));
    return trend_data.map((d, i) => ({
      height: Math.round((values[i] / maxVal) * 100),
      value: values[i],
      date: d.date,
    }));
  };
  const chartData = getChartData();

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const trendLength = trend_data?.length || 0;
  const labelIndices = trendLength > 0
    ? [0, Math.floor(trendLength / 4), Math.floor(trendLength / 2), Math.floor(trendLength * 3 / 4), trendLength - 1]
    : [];

  const getRoasColor = (roas: number) => {
    if (roas >= 4) return '#10B981';
    if (roas >= 2) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <>
      {isDemo && <DemoBanner onConnect={() => router.push('/connect')} />}
      <Header title="Analytics" />
      <div className="page-content">
        {/* Overview Metrics */}
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-label">Total Spend</div>
            <div className="metric-value mono">${formatMoney(overview.spend_micros)}</div>
            <div className={`metric-change ${changes.spend >= 0 ? 'up' : 'down'}`}>
              {changes.spend >= 0 ? '+' : ''}{changes.spend}% vs last period
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Revenue</div>
            <div className="metric-value mono">${formatMoney(overview.revenue_micros)}</div>
            <div className={`metric-change ${changes.revenue >= 0 ? 'up' : 'down'}`}>
              {changes.revenue >= 0 ? '+' : ''}{changes.revenue}% vs last period
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">ROAS</div>
            <div className="metric-value mono">{overview.roas}x</div>
            <div className={`metric-change ${changes.roas >= 0 ? 'up' : 'down'}`}>
              {changes.roas >= 0 ? '+' : ''}{changes.roas}x vs last period
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Conversions</div>
            <div className="metric-value mono">{overview.conversions.toLocaleString()}</div>
            <div className={`metric-change ${changes.conversions >= 0 ? 'up' : 'down'}`}>
              {changes.conversions >= 0 ? '+' : ''}{changes.conversions}% vs last period
            </div>
          </div>
        </div>

        {/* Performance Chart - Enhanced */}
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          {/* Chart Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Performance Trend</h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Last 30 days · Daily {chartMetric}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-secondary)', borderRadius: '8px', padding: '4px' }}>
              <button
                onClick={() => setChartMetric('spend')}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: chartMetric === 'spend' ? 'var(--surface-card)' : 'transparent',
                  color: chartMetric === 'spend' ? '#10B981' : 'var(--text-secondary)',
                  boxShadow: chartMetric === 'spend' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                Spend
              </button>
              <button
                onClick={() => setChartMetric('revenue')}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: chartMetric === 'revenue' ? 'var(--surface-card)' : 'transparent',
                  color: chartMetric === 'revenue' ? '#3B82F6' : 'var(--text-secondary)',
                  boxShadow: chartMetric === 'revenue' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                Revenue
              </button>
            </div>
          </div>

          {/* Chart Summary */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '20px',
              padding: '16px',
              background: chartMetric === 'spend' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
              borderRadius: '10px',
              borderLeft: `4px solid ${chartMetric === 'spend' ? '#10B981' : '#3B82F6'}`,
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Total {chartMetric}
              </div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 700, color: chartMetric === 'spend' ? '#10B981' : '#3B82F6' }}>
                ${formatMoney(chartMetric === 'spend' ? overview.spend_micros : overview.revenue_micros)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Daily Avg
              </div>
              <div className="mono" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                ${formatMoney((chartMetric === 'spend' ? overview.spend_micros : overview.revenue_micros) / 30)}
              </div>
            </div>
          </div>

          {/* Chart Bars */}
          <div style={{ position: 'relative', height: '200px', display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
            {chartData.map((d, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
                style={{
                  flex: 1,
                  height: `${Math.max(d.height, 3)}%`,
                  background: chartMetric === 'revenue'
                    ? `linear-gradient(180deg, #3B82F6 0%, rgba(59, 130, 246, 0.4) 100%)`
                    : `linear-gradient(180deg, #10B981 0%, rgba(16, 185, 129, 0.4) 100%)`,
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.2s ease',
                  transform: hoveredBar === i ? 'scaleY(1.05)' : 'scaleY(1)',
                  transformOrigin: 'bottom',
                  opacity: hoveredBar !== null && hoveredBar !== i ? 0.5 : 1,
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {/* Tooltip */}
                {hoveredBar === i && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginBottom: '8px',
                      padding: '8px 12px',
                      background: '#1a1a1a',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>{getDateLabel(d.date)}</div>
                    <div className="mono">${formatMoney(d.value)}</div>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-4px',
                        left: '50%',
                        transform: 'translateX(-50%) rotate(45deg)',
                        width: '8px',
                        height: '8px',
                        background: '#1a1a1a',
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* X-Axis Labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              paddingTop: '12px',
              marginTop: '8px',
              borderTop: '1px solid var(--border-default)',
            }}
          >
            {labelIndices.map((idx) => (
              <span key={idx}>{trend_data[idx] ? getDateLabel(trend_data[idx].date) : ''}</span>
            ))}
          </div>
        </div>

        {/* Platform Breakdown */}
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Platform Breakdown</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
            {platform_breakdown.map((platform) => (
              <div
                key={platform.platform}
                style={{
                  padding: '16px',
                  background: 'var(--surface-secondary)',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${platform.platform === 'google' ? '#4285F4' : '#0668E1'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: platform.platform === 'google' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(6, 104, 225, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                      }}
                    >
                      {platform.platform === 'google' ? '🔵' : '🔷'}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {platform.platform === 'google' ? 'Google Ads' : 'Meta Ads'}
                    </span>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: platform.platform === 'google' ? '#4285F4' : '#0668E1',
                    }}
                  >
                    ${formatMoney(platform.spend_micros)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <div style={{ flex: 1, padding: '8px', background: 'var(--surface-card)', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '10px', marginBottom: '2px' }}>CONV</div>
                    <div className="mono" style={{ fontWeight: 600 }}>{platform.conversions}</div>
                  </div>
                  <div style={{ flex: 1, padding: '8px', background: 'var(--surface-card)', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '10px', marginBottom: '2px' }}>ROAS</div>
                    <div className="mono" style={{ fontWeight: 600, color: getRoasColor(platform.roas) }}>{platform.roas}x</div>
                  </div>
                  <div style={{ flex: 1, padding: '8px', background: 'var(--surface-card)', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '10px', marginBottom: '2px' }}>SHARE</div>
                    <div className="mono" style={{ fontWeight: 600 }}>{Math.round((platform.spend_micros / overview.spend_micros) * 100)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Campaigns */}
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Top Campaigns</h3>
            <button
              onClick={() => router.push('/campaigns')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                color: 'var(--primary)',
                background: 'var(--primary-light)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              View All
            </button>
          </div>

          {/* Mobile: Card View */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {top_campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  onClick={() => router.push(`/campaigns/${campaign.id}`)}
                  style={{
                    padding: '16px',
                    background: 'var(--surface-secondary)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    borderLeft: `3px solid ${campaign.platform === 'google' ? '#4285F4' : '#0668E1'}`,
                  }}
                >
                  {/* Campaign Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{campaign.name}</div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: campaign.platform === 'google' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(6, 104, 225, 0.15)',
                          color: campaign.platform === 'google' ? '#4285F4' : '#0668E1',
                        }}
                      >
                        {campaign.platform === 'google' ? 'Google' : 'Meta'}
                      </span>
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      ${formatMoney(campaign.spend_micros)}
                    </div>
                  </div>

                  {/* Campaign Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div style={{ padding: '8px', background: 'var(--surface-card)', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>CONV</div>
                      <div className="mono" style={{ fontSize: '15px', fontWeight: 600 }}>{campaign.conversions}</div>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--surface-card)', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>ROAS</div>
                      <div className="mono" style={{ fontSize: '15px', fontWeight: 600, color: getRoasColor(campaign.roas) }}>
                        {campaign.roas}x
                      </div>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--surface-card)', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>CPA</div>
                      <div className="mono" style={{ fontSize: '15px', fontWeight: 600 }}>
                        ${campaign.conversions > 0 ? formatMoney(campaign.spend_micros / campaign.conversions) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop: Table View */
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Platform</th>
                    <th className="right">Spend</th>
                    <th className="right">Conversions</th>
                    <th className="right">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {top_campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/campaigns/${campaign.id}`)}
                    >
                      <td style={{ fontWeight: 500 }}>{campaign.name}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            background: campaign.platform === 'google' ? 'rgba(66, 133, 244, 0.1)' : 'rgba(6, 104, 225, 0.1)',
                            color: campaign.platform === 'google' ? '#4285F4' : '#0668E1',
                          }}
                        >
                          {campaign.platform === 'google' ? 'Google' : 'Meta'}
                        </span>
                      </td>
                      <td className="right mono">${formatMoney(campaign.spend_micros)}</td>
                      <td className="right mono">{campaign.conversions}</td>
                      <td className="right mono" style={{ color: getRoasColor(campaign.roas), fontWeight: 600 }}>
                        {campaign.roas}x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
