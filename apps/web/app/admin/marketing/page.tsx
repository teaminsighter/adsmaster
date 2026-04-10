'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  useMarketingOverview,
  useTrafficSources,
  useConversionFunnel,
  useSignupMethods,
} from '@/lib/hooks/useAdminApi';

function StatCard({ label, value, subValue, trend }: {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {subValue && <div className="stat-sub">{subValue}</div>}
      {trend !== undefined && (
        <div className={`stat-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
        </div>
      )}

      <style jsx>{`
        .stat-card {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
        }
        .stat-label {
          font-size: 13px;
          color: var(--admin-text-muted);
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--admin-accent);
          line-height: 1.2;
        }
        .stat-sub {
          font-size: 12px;
          color: var(--admin-text-dim);
          margin-top: 4px;
        }
        .stat-trend {
          font-size: 12px;
          margin-top: 4px;
          font-weight: 600;
        }
        .stat-trend.positive { color: #10b981; }
        .stat-trend.negative { color: #f87171; }
      `}</style>
    </div>
  );
}

function DataFreshnessIndicator({ isReal }: { isReal: boolean }) {
  return (
    <div className={`data-indicator ${isReal ? 'real' : 'demo'}`}>
      <span className="indicator-dot" />
      <span className="indicator-text">{isReal ? 'Live Data' : 'Demo Data'}</span>
      <style jsx>{`
        .data-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
        }
        .data-indicator.real {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        .data-indicator.demo {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }
        .indicator-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }
        .data-indicator.real .indicator-dot { background: #10b981; }
        .data-indicator.demo .indicator-dot { background: #f59e0b; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function UTMBuilder() {
  const [baseUrl, setBaseUrl] = useState('https://adsmaster.io');
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [campaign, setCampaign] = useState('');
  const [content, setContent] = useState('');

  const generatedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (source) params.set('utm_source', source);
    if (medium) params.set('utm_medium', medium);
    if (campaign) params.set('utm_campaign', campaign);
    if (content) params.set('utm_content', content);
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [baseUrl, source, medium, campaign, content]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUrl);
    alert('URL copied to clipboard!');
  };

  return (
    <div className="utm-builder">
      <h3 className="utm-title">UTM Link Builder</h3>
      <div className="utm-fields">
        <div className="utm-field">
          <label>Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://adsmaster.io"
          />
        </div>
        <div className="utm-row">
          <div className="utm-field">
            <label>Source *</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="google, newsletter"
            />
          </div>
          <div className="utm-field">
            <label>Medium *</label>
            <input
              type="text"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              placeholder="cpc, email, social"
            />
          </div>
        </div>
        <div className="utm-row">
          <div className="utm-field">
            <label>Campaign *</label>
            <input
              type="text"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="spring_sale"
            />
          </div>
          <div className="utm-field">
            <label>Content</label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="header_cta"
            />
          </div>
        </div>
      </div>
      <div className="utm-output">
        <div className="utm-url">{generatedUrl}</div>
        <button className="copy-btn" onClick={copyToClipboard}>Copy</button>
      </div>

      <style jsx>{`
        .utm-builder {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
        }
        .utm-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 16px 0;
        }
        .utm-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }
        .utm-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .utm-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .utm-field label {
          font-size: 12px;
          color: var(--admin-text-muted);
        }
        .utm-field input {
          padding: 8px 12px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          font-size: 14px;
        }
        .utm-field input:focus {
          outline: none;
          border-color: var(--admin-accent);
        }
        .utm-output {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .utm-url {
          flex: 1;
          padding: 10px 14px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          font-size: 13px;
          color: var(--admin-accent);
          font-family: monospace;
          overflow-x: auto;
          white-space: nowrap;
        }
        .copy-btn {
          padding: 10px 20px;
          background: var(--admin-accent);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .copy-btn:hover {
          opacity: 0.9;
        }
        @media (max-width: 600px) {
          .utm-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function FunnelStep({ label, count, percentage, dropOff, isFirst }: {
  label: string;
  count: number;
  percentage: number;
  dropOff: number;
  isFirst: boolean;
}) {
  return (
    <div className="funnel-step">
      <div className="funnel-bar" style={{ width: `${Math.max(percentage, 5)}%` }}>
        <span className="funnel-label">{label}</span>
        <span className="funnel-count">{count.toLocaleString()}</span>
        <span className="funnel-percentage">{percentage.toFixed(1)}%</span>
      </div>
      {!isFirst && dropOff > 0 && (
        <div className="funnel-dropoff">-{dropOff.toFixed(1)}% drop</div>
      )}

      <style jsx>{`
        .funnel-step {
          margin-bottom: 8px;
        }
        .funnel-bar {
          background: rgba(16, 185, 129, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 200px;
          transition: width 0.3s ease;
        }
        .funnel-label {
          font-weight: 500;
          color: var(--admin-text);
          flex: 1;
          min-width: 150px;
        }
        .funnel-count {
          font-weight: 700;
          color: var(--admin-accent);
        }
        .funnel-percentage {
          font-size: 13px;
          color: var(--admin-text-muted);
          min-width: 50px;
          text-align: right;
        }
        .funnel-dropoff {
          font-size: 11px;
          color: #f87171;
          margin-left: 200px;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}

export default function MarketingPage() {
  const [period, setPeriod] = useState(30);
  const { data: overview, loading: overviewLoading } = useMarketingOverview(period);
  const { data: sources, loading: sourcesLoading } = useTrafficSources(period);
  const { data: funnel, loading: funnelLoading } = useConversionFunnel(period);
  const { data: signups, loading: signupsLoading } = useSignupMethods(period);

  const loading = overviewLoading || sourcesLoading || funnelLoading || signupsLoading;

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>Loading marketing data...</p>
        <style jsx>{`
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            color: var(--admin-text-muted);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--admin-border);
            border-top-color: var(--admin-accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="marketing-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Marketing Analytics</h1>
          <DataFreshnessIndicator isReal={Boolean(overview?.landing_page_visits && overview.landing_page_visits > 0)} />
        </div>
        <div className="header-right">
          <select
            className="period-select"
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Link href="/admin/emails" className="quick-action-link">
            📧 Email Templates
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="stats-grid">
        <StatCard
          label="Landing Page Visits"
          value={overview?.landing_page_visits.toLocaleString() || 0}
          trend={overview?.visits_trend}
        />
        <StatCard
          label="Unique Visitors"
          value={overview?.unique_visitors.toLocaleString() || 0}
        />
        <StatCard
          label="Signups"
          value={overview?.signups.toLocaleString() || 0}
          subValue={`${overview?.signup_rate || 0}% conversion`}
        />
        <StatCard
          label="Paid Conversions"
          value={overview?.paid_conversions || 0}
          subValue={`${overview?.paid_rate || 0}% of signups`}
        />
      </div>

      {/* Two Column Layout */}
      <div className="two-col">
        {/* Conversion Funnel */}
        <div className="panel">
          <h2 className="panel-title">Conversion Funnel</h2>
          <div className="funnel-container">
            {funnel?.funnel.map((step, index) => (
              <FunnelStep
                key={step.step}
                label={step.label}
                count={step.count}
                percentage={step.percentage}
                dropOff={step.drop_off_rate}
                isFirst={index === 0}
              />
            ))}
          </div>
        </div>

        {/* Signup Methods */}
        <div className="panel">
          <h2 className="panel-title">Signup Methods</h2>
          <div className="methods-list">
            {signups?.methods.map((method) => (
              <div key={method.method} className="method-item">
                <div className="method-icon">
                  {method.method === 'google' ? '🔷' :
                   method.method === 'email' ? '📧' :
                   method.method === 'github' ? '🐙' : '🔑'}
                </div>
                <div className="method-info">
                  <div className="method-name">{method.method}</div>
                  <div className="method-stats">
                    {method.count} signups ({method.percentage.toFixed(1)}%)
                  </div>
                </div>
                <div className="method-conversion">
                  {method.paid_conversion_rate.toFixed(0)}% paid
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Traffic Sources Table */}
      <div className="panel">
        <h2 className="panel-title">Traffic Sources</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Visitors</th>
                <th>Signups</th>
                <th>Conv. Rate</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {sources?.sources.map((source) => (
                <tr key={source.source}>
                  <td className="source-name">{source.source}</td>
                  <td>{source.visitors.toLocaleString()}</td>
                  <td>{source.signups}</td>
                  <td>{source.conversion_rate.toFixed(2)}%</td>
                  <td>{source.paid_conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* UTM Builder */}
      <UTMBuilder />

      <style jsx>{`
        .marketing-page {
          max-width: 1400px;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .period-select {
          padding: 8px 16px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
          cursor: pointer;
        }
        :global(.quick-action-link) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
          text-decoration: none;
          transition: all 0.15s;
        }
        :global(.quick-action-link:hover) {
          border-color: var(--admin-accent);
          background: rgba(16, 185, 129, 0.1);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        .panel {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
        }
        .panel-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 16px 0;
        }
        .funnel-container {
          padding: 8px 0;
        }
        .methods-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .method-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--admin-inner-bg);
          border-radius: 8px;
        }
        .method-icon {
          font-size: 24px;
          width: 40px;
          text-align: center;
        }
        .method-info {
          flex: 1;
        }
        .method-name {
          font-weight: 500;
          color: var(--admin-text);
          text-transform: capitalize;
        }
        .method-stats {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .method-conversion {
          font-size: 13px;
          color: var(--admin-accent);
          font-weight: 500;
        }
        .table-container {
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th,
        .data-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid var(--admin-border);
        }
        .data-table th {
          font-size: 12px;
          font-weight: 600;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .data-table td {
          color: var(--admin-text);
        }
        .source-name {
          font-weight: 500;
        }
        @media (max-width: 900px) {
          .two-col {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .page-title { font-size: 20px; margin-bottom: 16px; }
          .stats-grid { gap: 12px; }
          .panel { padding: 16px; margin-bottom: 16px; }
          .data-table th,
          .data-table td { padding: 8px 10px; font-size: 12px; }
          .funnel-item { padding: 12px 16px; }
        }
      `}</style>
    </div>
  );
}
