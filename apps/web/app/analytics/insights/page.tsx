// @ts-nocheck
'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Target,
  MousePointer,
  Eye,
  Layers,
  Filter,
} from 'lucide-react';
import {
  useAdInsightsOverview,
  usePlatformComparison,
  useCampaignInsights,
  useFunnelAnalytics,
} from '@/lib/hooks/useApi';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'];

function formatMicros(micros: number): string {
  return `$${(micros / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  prefix = '',
  suffix = '',
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  prefix?: string;
  suffix?: string;
}) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            {title}
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600' }}>
            {prefix}{typeof value === 'number' ? formatNumber(value) : value}{suffix}
          </div>
          {change !== undefined && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '8px',
                fontSize: '13px',
                color: isPositive ? '#10B981' : isNegative ? '#EF4444' : 'var(--text-secondary)',
              }}
            >
              {isPositive ? <ArrowUpRight size={14} /> : isNegative ? <ArrowDownRight size={14} /> : null}
              {change.toFixed(1)}%
            </div>
          )}
        </div>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--surface-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function AdInsightsPage() {
  const [days, setDays] = useState(30);
  const { data: overview, loading: loadingOverview } = useAdInsightsOverview(days);
  const { data: comparison, loading: loadingComparison } = usePlatformComparison(days);
  const { data: campaigns, loading: loadingCampaigns } = useCampaignInsights({ days, limit: 10 });
  const { data: funnel, loading: loadingFunnel } = useFunnelAnalytics(days);

  const loading = loadingOverview || loadingComparison || loadingCampaigns || loadingFunnel;

  // Prepare chart data
  const trendData = overview?.trends?.map(t => ({
    date: t.date.slice(5), // MM-DD
    Google: t.google_spend_micros / 1_000_000,
    Meta: t.meta_spend_micros / 1_000_000,
    Total: t.total_spend_micros / 1_000_000,
  })) || [];

  const platformPieData = overview?.by_platform?.map(p => ({
    name: p.platform,
    value: p.spend_micros / 1_000_000,
  })) || [];

  const funnelData = funnel ? [
    { name: 'Impressions', value: funnel.impressions, rate: '100%' },
    { name: 'Clicks', value: funnel.clicks, rate: formatPercent(funnel.impression_to_click_rate) },
    { name: 'Visits', value: funnel.visits, rate: formatPercent(funnel.click_to_visit_rate) },
    { name: 'Leads', value: funnel.leads, rate: formatPercent(funnel.visit_to_lead_rate) },
    { name: 'Conversions', value: funnel.conversions, rate: formatPercent(funnel.lead_to_conversion_rate) },
  ] : [];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>Ad Insights</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Cross-platform advertising performance analysis
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            className="select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ minWidth: '140px' }}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ height: '120px', background: 'var(--surface-subtle)' }} />
          ))}
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <MetricCard
              title="Total Spend"
              value={formatMicros(overview?.combined?.total_spend_micros || 0)}
              icon={DollarSign}
            />
            <MetricCard
              title="Revenue"
              value={formatMicros(overview?.combined?.total_revenue_micros || 0)}
              icon={TrendingUp}
            />
            <MetricCard
              title="Blended ROAS"
              value={(overview?.combined?.blended_roas || 0).toFixed(2)}
              suffix="x"
              icon={Target}
            />
            <MetricCard
              title="Conversions"
              value={overview?.combined?.total_conversions || 0}
              icon={BarChart3}
            />
          </div>

          {/* Platform Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Spend Trend */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Spend Trend by Platform</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary)" tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Google" stroke="#4285F4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Meta" stroke="#1877F2" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platform Distribution */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Spend Distribution</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={platformPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {platformPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spend']} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Platform Comparison Cards */}
          {comparison && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {/* Google Card */}
              <div className="card" style={{ padding: '20px', borderLeft: '4px solid #4285F4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <img src="/google-ads-icon.svg" alt="Google" width={24} height={24} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Google Ads</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Spend</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>{formatMicros(comparison.google.spend_micros)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ROAS</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>{comparison.google.roas.toFixed(2)}x</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Conversions</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>{formatNumber(comparison.google.conversions)}</div>
                  </div>
                </div>
              </div>

              {/* Meta Card */}
              <div className="card" style={{ padding: '20px', borderLeft: '4px solid #1877F2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <img src="/meta-icon.svg" alt="Meta" width={24} height={24} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Meta Ads</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Spend</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>{formatMicros(comparison.meta.spend_micros)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ROAS</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>{comparison.meta.roas.toFixed(2)}x</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Conversions</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>{formatNumber(comparison.meta.conversions)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Funnel Analysis */}
          {funnel && (
            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Conversion Funnel</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {funnelData.map((stage, index) => (
                  <div key={stage.name} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                    <div
                      style={{
                        background: `linear-gradient(135deg, ${COLORS[index]} 0%, ${COLORS[(index + 1) % COLORS.length]} 100%)`,
                        borderRadius: '8px',
                        padding: '16px',
                        margin: '0 4px',
                      }}
                    >
                      <div style={{ fontSize: '20px', fontWeight: '700', color: 'white' }}>
                        {formatNumber(stage.value)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{stage.name}</div>
                    </div>
                    {index < funnelData.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          right: '-12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          background: 'var(--surface-card)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          zIndex: 1,
                        }}
                      >
                        {stage.rate}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
                Overall Conversion Rate: <strong style={{ color: 'var(--primary)' }}>{formatPercent(funnel.overall_conversion_rate)}</strong>
              </div>
            </div>
          )}

          {/* Top Campaigns Table */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Top Campaigns by Spend</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Platform</th>
                    <th style={{ textAlign: 'right' }}>Spend</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>ROAS</th>
                    <th style={{ textAlign: 'right' }}>Conversions</th>
                    <th style={{ textAlign: 'right' }}>CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns?.campaigns?.map((campaign) => (
                    <tr key={campaign.id}>
                      <td>
                        <div style={{ fontWeight: '500' }}>{campaign.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{campaign.type}</div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: campaign.platform === 'google' ? '#4285F420' : '#1877F220',
                            color: campaign.platform === 'google' ? '#4285F4' : '#1877F2',
                          }}
                        >
                          {campaign.platform}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatMicros(campaign.spend_micros)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatMicros(campaign.revenue_micros)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ color: campaign.roas >= 3 ? '#10B981' : campaign.roas >= 1 ? '#F59E0B' : '#EF4444' }}>
                          {campaign.roas.toFixed(2)}x
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(campaign.conversions)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatMicros(campaign.cpa_micros)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
