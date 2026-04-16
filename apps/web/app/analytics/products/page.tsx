// @ts-nocheck
'use client';

import { useState } from 'react';
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Layers,
  Tag,
  BarChart3,
  Search,
} from 'lucide-react';
import {
  useProductAnalyticsOverview,
  useProductList,
  useCategoryPerformance,
  useBrandPerformance,
  useProductTrends,
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
} from 'recharts';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#6B7280', '#EF4444', '#14B8A6'];

function formatMicros(micros: number): string {
  return `$${(micros / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
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

export default function ProductAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>();

  const { data: overview, loading: loadingOverview } = useProductAnalyticsOverview(days);
  const { data: products, loading: loadingProducts } = useProductList({
    days,
    category: selectedCategory,
    brand: selectedBrand,
    sort_by: 'revenue',
    limit: 20,
  });
  const { data: categories, loading: loadingCategories } = useCategoryPerformance(days, 10);
  const { data: brands, loading: loadingBrands } = useBrandPerformance(days, 10);
  const { data: trends, loading: loadingTrends } = useProductTrends(days);

  const loading = loadingOverview || loadingTrends;

  // Filter products by search
  const filteredProducts = products?.products?.filter(p =>
    !searchQuery || p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Trend chart data
  const trendData = trends?.trends?.map(t => ({
    date: t.date.slice(5), // MM-DD
    Revenue: t.revenue_micros / 1_000_000,
    Quantity: t.quantity_sold,
    Orders: t.order_count,
  })) || [];

  // Category pie data
  const categoryPieData = categories?.categories?.slice(0, 6).map(c => ({
    name: c.category,
    value: c.revenue_micros / 1_000_000,
  })) || [];

  // Brand bar data
  const brandBarData = brands?.brands?.slice(0, 8).map(b => ({
    brand: b.brand?.length > 12 ? b.brand.slice(0, 12) + '...' : b.brand,
    revenue: b.revenue_micros / 1_000_000,
    quantity: b.quantity_sold,
  })) || [];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>Product Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            E-commerce product performance tracking
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
              title="Total Revenue"
              value={formatMicros(overview?.total_revenue_micros || 0)}
              icon={DollarSign}
              color="#10B981"
            />
            <MetricCard
              title="Products Sold"
              value={overview?.total_products_sold || 0}
              subtitle={`${overview?.unique_products || 0} unique products`}
              icon={Package}
              color="#3B82F6"
            />
            <MetricCard
              title="Total Orders"
              value={overview?.total_orders || 0}
              icon={ShoppingCart}
              color="#F59E0B"
            />
            <MetricCard
              title="Avg Order Value"
              value={formatMicros(overview?.avg_order_value_micros || 0)}
              icon={TrendingUp}
              color="#EC4899"
            />
          </div>

          {/* Top Category & Brand Pills */}
          {(overview?.top_category || overview?.top_brand) && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              {overview?.top_category && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'var(--surface-card)',
                    borderRadius: '20px',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <Layers size={14} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '13px' }}>Top Category:</span>
                  <strong style={{ fontSize: '13px' }}>{overview.top_category}</strong>
                </div>
              )}
              {overview?.top_brand && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'var(--surface-card)',
                    borderRadius: '20px',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <Tag size={14} style={{ color: '#8B5CF6' }} />
                  <span style={{ fontSize: '13px' }}>Top Brand:</span>
                  <strong style={{ fontSize: '13px' }}>{overview.top_brand}</strong>
                </div>
              )}
            </div>
          )}

          {/* Revenue Trend Chart */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Revenue Trend</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                  <YAxis
                    yAxisId="revenue"
                    tick={{ fontSize: 12 }}
                    stroke="var(--text-secondary)"
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    yAxisId="quantity"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    stroke="var(--text-secondary)"
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}
                    formatter={(value: number, name: string) => [
                      name === 'Revenue' ? `$${value.toFixed(2)}` : value,
                      name,
                    ]}
                  />
                  <Line
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="Revenue"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="quantity"
                    type="monotone"
                    dataKey="Quantity"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category & Brand Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Category Distribution */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Revenue by Category</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Brand Performance */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Top Brands by Revenue</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brandBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" tickFormatter={(v) => `$${v}`} />
                    <YAxis dataKey="brand" type="category" tick={{ fontSize: 11 }} stroke="var(--text-secondary)" width={80} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Category Performance Table */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Category Performance</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Products</th>
                    <th style={{ textAlign: 'right' }}>Qty Sold</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Revenue %</th>
                    <th style={{ textAlign: 'right' }}>Avg Price</th>
                  </tr>
                </thead>
                <tbody>
                  {categories?.categories?.map((cat, index) => (
                    <tr
                      key={cat.category}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedCategory(selectedCategory === cat.category ? undefined : cat.category)}
                    >
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
                          <span style={{ fontWeight: selectedCategory === cat.category ? '600' : '400' }}>
                            {cat.category}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(cat.product_count)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(cat.quantity_sold)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatMicros(cat.revenue_micros)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: `${COLORS[index % COLORS.length]}20`,
                            color: COLORS[index % COLORS.length],
                            fontSize: '12px',
                          }}
                        >
                          {formatPercent(cat.revenue_pct)}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatMicros(cat.avg_price_micros)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Products Table */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Top Products</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
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
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '32px', minWidth: '200px' }}
                  />
                </div>
                {selectedCategory && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedCategory(undefined)}
                    style={{ fontSize: '12px' }}
                  >
                    Clear filter: {selectedCategory}
                  </button>
                )}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th style={{ textAlign: 'right' }}>Qty Sold</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Revenue %</th>
                    <th style={{ textAlign: 'right' }}>Avg Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <tr key={product.product_id}>
                      <td>
                        <div style={{ fontWeight: '500' }}>{product.product_name}</div>
                        {product.sku && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            SKU: {product.sku}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{ background: 'var(--surface-subtle)', cursor: 'pointer' }}
                          onClick={() => setSelectedCategory(product.category || undefined)}
                        >
                          {product.category || '-'}
                        </span>
                      </td>
                      <td>{product.brand || '-'}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(product.quantity_sold)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatMicros(product.revenue_micros)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            width: '60px',
                            height: '6px',
                            background: 'var(--surface-subtle)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            display: 'inline-block',
                            marginRight: '8px',
                          }}
                        >
                          <div
                            style={{
                              width: `${product.revenue_pct * 100}%`,
                              height: '100%',
                              background: '#10B981',
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                        {formatPercent(product.revenue_pct)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatMicros(product.avg_price_micros)}
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
