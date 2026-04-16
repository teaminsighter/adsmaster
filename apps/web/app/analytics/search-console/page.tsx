// @ts-nocheck
'use client';

import { useState } from 'react';
import {
  Search,
  MousePointer,
  Eye,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  useSearchConsoleDashboard,
  useSearchConsoleQueries,
  useSearchConsolePages,
  useSearchConsoleProperties,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'];

const DEVICE_ICONS: Record<string, React.ElementType> = {
  DESKTOP: Monitor,
  MOBILE: Smartphone,
  TABLET: Tablet,
};

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatPosition(value: number): string {
  return value.toFixed(1);
}

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color = 'var(--primary)',
  inverse = false,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color?: string;
  inverse?: boolean; // For position where lower is better
}) {
  const isPositive = change !== undefined && (inverse ? change < 0 : change > 0);
  const isNegative = change !== undefined && (inverse ? change > 0 : change < 0);

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
              {inverse ? (change > 0 ? '+' : '') : ''}{change.toFixed(1)}{changeLabel || '%'}
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

export default function SearchConsolePage() {
  const [days, setDays] = useState(28);
  const [activeTab, setActiveTab] = useState<'queries' | 'pages'>('queries');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: properties } = useSearchConsoleProperties();
  const { data: dashboard, loading: loadingDashboard } = useSearchConsoleDashboard(undefined, days);
  const { data: queries, loading: loadingQueries } = useSearchConsoleQueries({ days, limit: 50, search: searchQuery });
  const { data: pages, loading: loadingPages } = useSearchConsolePages({ days, limit: 50, search: searchQuery });

  const loading = loadingDashboard;

  // Trend chart data
  const trendData = dashboard?.trends?.map(t => ({
    date: t.date.slice(5), // MM-DD
    Clicks: t.clicks,
    Impressions: t.impressions / 100, // Scale down for chart
    CTR: t.ctr * 100,
    Position: t.position,
  })) || [];

  // Device pie data
  const devicePieData = dashboard?.by_device?.map(d => ({
    name: d.device,
    value: d.clicks,
  })) || [];

  // Country bar data
  const countryBarData = dashboard?.by_country?.slice(0, 8).map(c => ({
    country: c.country_name.length > 10 ? c.country_name.slice(0, 10) + '...' : c.country_name,
    clicks: c.clicks,
  })) || [];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>Search Console</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Google Search performance analysis
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {properties && properties.length > 0 && (
            <select className="select" style={{ minWidth: '200px' }}>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.site_url}</option>
              ))}
            </select>
          )}
          <select
            className="select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ minWidth: '140px' }}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={28}>Last 28 days</option>
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
          {/* Overview Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <MetricCard
              title="Total Clicks"
              value={dashboard?.overview.total_clicks || 0}
              change={dashboard?.overview.clicks_change_pct}
              icon={MousePointer}
              color="#3B82F6"
            />
            <MetricCard
              title="Total Impressions"
              value={dashboard?.overview.total_impressions || 0}
              change={dashboard?.overview.impressions_change_pct}
              icon={Eye}
              color="#10B981"
            />
            <MetricCard
              title="Avg CTR"
              value={formatPercent(dashboard?.overview.average_ctr || 0)}
              change={dashboard?.overview.ctr_change_pct}
              icon={TrendingUp}
              color="#F59E0B"
            />
            <MetricCard
              title="Avg Position"
              value={formatPosition(dashboard?.overview.average_position || 0)}
              change={dashboard?.overview.position_change}
              changeLabel=" pos"
              icon={Search}
              color="#EC4899"
              inverse={true}
            />
          </div>

          {/* Trend Chart */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Performance Trend</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                  <YAxis yAxisId="clicks" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                  <YAxis yAxisId="position" orientation="right" reversed domain={[1, 'auto']} tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Impressions') return [formatNumber(value * 100), name];
                      if (name === 'CTR') return [`${value.toFixed(2)}%`, name];
                      if (name === 'Position') return [value.toFixed(1), name];
                      return [formatNumber(value), name];
                    }}
                  />
                  <Legend />
                  <Line yAxisId="clicks" type="monotone" dataKey="Clicks" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line yAxisId="position" type="monotone" dataKey="Position" stroke="#EC4899" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device & Country Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Device Distribution */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Clicks by Device</h3>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={devicePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {devicePieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatNumber(value), 'Clicks']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ minWidth: '140px' }}>
                  {dashboard?.by_device?.map((device, index) => {
                    const Icon = DEVICE_ICONS[device.device] || Monitor;
                    return (
                      <div key={device.device} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS[index % COLORS.length] }} />
                        <Icon size={14} />
                        <span style={{ fontSize: '13px' }}>{device.device}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                          {formatNumber(device.clicks)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Country Performance */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Top Countries</h3>
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                    <YAxis dataKey="country" type="category" tick={{ fontSize: 11 }} stroke="var(--text-secondary)" width={80} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}
                      formatter={(value: number) => [formatNumber(value), 'Clicks']}
                    />
                    <Bar dataKey="clicks" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Queries / Pages Tabs */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className={`btn ${activeTab === 'queries' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab('queries')}
                >
                  <Search size={14} style={{ marginRight: '6px' }} />
                  Queries
                </button>
                <button
                  className={`btn ${activeTab === 'pages' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab('pages')}
                >
                  <FileText size={14} style={{ marginRight: '6px' }} />
                  Pages
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                  }}
                />
                <input
                  className="input"
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '32px', minWidth: '250px' }}
                />
              </div>
            </div>

            {activeTab === 'queries' ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Query</th>
                      <th style={{ textAlign: 'right' }}>Clicks</th>
                      <th style={{ textAlign: 'right' }}>Impressions</th>
                      <th style={{ textAlign: 'right' }}>CTR</th>
                      <th style={{ textAlign: 'right' }}>Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loadingQueries ? [] : queries?.queries || dashboard?.top_queries || []).map((query, index) => (
                      <tr key={index}>
                        <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {query.query}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {formatNumber(query.clicks)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {formatNumber(query.impressions)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ color: query.ctr > 0.05 ? '#10B981' : 'var(--text-primary)' }}>
                            {formatPercent(query.ctr)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: query.position <= 3 ? '#10B98120' : query.position <= 10 ? '#F59E0B20' : 'var(--surface-subtle)',
                              color: query.position <= 3 ? '#10B981' : query.position <= 10 ? '#F59E0B' : 'var(--text-secondary)',
                              fontSize: '13px',
                            }}
                          >
                            {formatPosition(query.position)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th style={{ textAlign: 'right' }}>Clicks</th>
                      <th style={{ textAlign: 'right' }}>Impressions</th>
                      <th style={{ textAlign: 'right' }}>CTR</th>
                      <th style={{ textAlign: 'right' }}>Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loadingPages ? [] : pages?.pages || dashboard?.top_pages || []).map((page, index) => (
                      <tr key={index}>
                        <td style={{ maxWidth: '400px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {page.page.replace(/^https?:\/\/[^/]+/, '')}
                            </span>
                            <a
                              href={page.page}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {formatNumber(page.clicks)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {formatNumber(page.impressions)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ color: page.ctr > 0.05 ? '#10B981' : 'var(--text-primary)' }}>
                            {formatPercent(page.ctr)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: page.position <= 3 ? '#10B98120' : page.position <= 10 ? '#F59E0B20' : 'var(--surface-subtle)',
                              color: page.position <= 3 ? '#10B981' : page.position <= 10 ? '#F59E0B' : 'var(--text-secondary)',
                              fontSize: '13px',
                            }}
                          >
                            {formatPosition(page.position)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
