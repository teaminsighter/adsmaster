'use client';

import { useState } from 'react';
import {
  MousePointer,
  Users,
  Target,
  DollarSign,
  Link2,
  Share2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
} from 'lucide-react';
import {
  useClickAnalyticsOverview,
  useChannelPerformance,
  useUTMAnalytics,
  useClickIDAnalytics,
  useSourceMediumReport,
} from '@/lib/hooks/useApi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#6B7280'];

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
  subtitle,
  icon: Icon,
  color = 'var(--primary)',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            {title}
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600' }}>
            {typeof value === 'number' ? formatNumber(value) : value}
          </div>
          {subtitle && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {subtitle}
            </div>
          )}
        </div>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: `${color}20`,
            color: color,
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

export default function ClickAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [utmGroupBy, setUtmGroupBy] = useState<'source' | 'medium' | 'campaign' | 'all'>('source');

  const { data: overview, loading: loadingOverview } = useClickAnalyticsOverview(days);
  const { data: channels, loading: loadingChannels } = useChannelPerformance(days);
  const { data: utmData, loading: loadingUTM } = useUTMAnalytics({ days, group_by: utmGroupBy, limit: 15 });
  const { data: clickIds, loading: loadingClickIds } = useClickIDAnalytics(days);
  const { data: sourceMedium, loading: loadingSM } = useSourceMediumReport({ days, limit: 20 });

  const loading = loadingOverview || loadingChannels;

  // Channel pie chart data
  const channelPieData = channels?.channels?.map(c => ({
    name: c.channel,
    value: c.clicks,
  })) || [];

  // Channel bar chart data
  const channelBarData = channels?.channels?.map(c => ({
    channel: c.channel,
    conversions: c.conversions,
    rate: c.conversion_rate * 100,
  })) || [];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>Click Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Attribution analysis and traffic source insights
          </p>
        </div>
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

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ height: '120px', background: 'var(--surface-subtle)' }} />
          ))}
        </div>
      ) : (
        <>
          {/* Overview Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <MetricCard
              title="Total Clicks"
              value={overview?.total_clicks || 0}
              icon={MousePointer}
              color="#3B82F6"
            />
            <MetricCard
              title="Unique Visitors"
              value={overview?.unique_visitors || 0}
              subtitle={`Avg ${(overview?.avg_clicks_per_visitor || 0).toFixed(1)} clicks/visitor`}
              icon={Users}
              color="#10B981"
            />
            <MetricCard
              title="Conversions"
              value={overview?.total_conversions || 0}
              subtitle={`${formatPercent(overview?.conversion_rate || 0)} conversion rate`}
              icon={Target}
              color="#F59E0B"
            />
            <MetricCard
              title="Revenue"
              value={formatMicros(overview?.total_revenue_micros || 0)}
              subtitle={`${formatPercent(overview?.attribution_rate || 0)} attributed`}
              icon={DollarSign}
              color="#EC4899"
            />
          </div>

          {/* Channel Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Channel Distribution */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Traffic by Channel</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {channelPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatNumber(value), 'Clicks']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Channel Conversion Rates */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Conversions by Channel</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                    <YAxis dataKey="channel" type="category" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" width={100} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}
                    />
                    <Bar dataKey="conversions" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Channel Performance Table */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Channel Performance</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th style={{ textAlign: 'right' }}>Clicks</th>
                    <th style={{ textAlign: 'right' }}>Click Share</th>
                    <th style={{ textAlign: 'right' }}>Conversions</th>
                    <th style={{ textAlign: 'right' }}>Conv. Rate</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Avg Value</th>
                  </tr>
                </thead>
                <tbody>
                  {channels?.channels?.map((channel, index) => (
                    <tr key={channel.channel}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '3px',
                              background: COLORS[index % COLORS.length],
                            }}
                          />
                          {channel.channel}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(channel.clicks)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPercent(channel.click_share)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(channel.conversions)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ color: channel.conversion_rate > 0.03 ? '#10B981' : 'var(--text-primary)' }}>
                          {formatPercent(channel.conversion_rate)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatMicros(channel.revenue_micros)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatMicros(channel.avg_value_micros)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* UTM Analytics */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>UTM Analytics</h3>
              <select
                className="select"
                value={utmGroupBy}
                onChange={(e) => setUtmGroupBy(e.target.value as typeof utmGroupBy)}
                style={{ minWidth: '120px' }}
              >
                <option value="source">By Source</option>
                <option value="medium">By Medium</option>
                <option value="campaign">By Campaign</option>
                <option value="all">All UTMs</option>
              </select>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    {utmGroupBy === 'all' ? (
                      <>
                        <th>Source</th>
                        <th>Medium</th>
                        <th>Campaign</th>
                      </>
                    ) : (
                      <th style={{ textTransform: 'capitalize' }}>{utmGroupBy}</th>
                    )}
                    <th style={{ textAlign: 'right' }}>Clicks</th>
                    <th style={{ textAlign: 'right' }}>Conversions</th>
                    <th style={{ textAlign: 'right' }}>Conv. Rate</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {utmData?.utm_data?.map((row, index) => (
                    <tr key={index}>
                      {utmGroupBy === 'all' ? (
                        <>
                          <td>{row.utm_source || '(not set)'}</td>
                          <td>{row.utm_medium || '(not set)'}</td>
                          <td>{row.utm_campaign || '(not set)'}</td>
                        </>
                      ) : (
                        <td>
                          {(utmGroupBy === 'source' ? row.utm_source : utmGroupBy === 'medium' ? row.utm_medium : row.utm_campaign) || '(not set)'}
                        </td>
                      )}
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.clicks)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.conversions)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPercent(row.conversion_rate)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatMicros(row.revenue_micros)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Click ID Performance */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Click ID Performance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {clickIds?.click_ids?.map((clickId) => (
                <div
                  key={clickId.click_id_type}
                  style={{
                    padding: '16px',
                    background: 'var(--surface-subtle)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                    {clickId.click_id_type}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Clicks</div>
                      <div style={{ fontSize: '16px', fontWeight: '500' }}>{formatNumber(clickId.total_clicks)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Conversions</div>
                      <div style={{ fontSize: '16px', fontWeight: '500' }}>{formatNumber(clickId.total_conversions)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Conv. Rate</div>
                      <div style={{ fontSize: '16px', fontWeight: '500', color: '#10B981' }}>
                        {formatPercent(clickId.conversion_rate)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Revenue</div>
                      <div style={{ fontSize: '16px', fontWeight: '500' }}>{formatMicros(clickId.total_revenue_micros)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Source/Medium Report (GA4 Style) */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Source / Medium Report
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400', marginLeft: '8px' }}>
                (GA4 Style)
              </span>
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Source / Medium</th>
                    <th>Channel</th>
                    <th style={{ textAlign: 'right' }}>Sessions</th>
                    <th style={{ textAlign: 'right' }}>Users</th>
                    <th style={{ textAlign: 'right' }}>Conversions</th>
                    <th style={{ textAlign: 'right' }}>Conv. Rate</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceMedium?.data?.map((row, index) => (
                    <tr key={index}>
                      <td>
                        <span style={{ fontWeight: '500' }}>{row.source}</span>
                        <span style={{ color: 'var(--text-secondary)' }}> / {row.medium}</span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--surface-subtle)' }}>
                          {row.channel}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.sessions)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.users)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.conversions)}</td>
                      <td style={{ textAlign: 'right' }}>{formatPercent(row.conversion_rate)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatMicros(row.revenue_micros)}
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
