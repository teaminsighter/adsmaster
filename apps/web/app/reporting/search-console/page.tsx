'use client';

import { useState } from 'react';
import { useFeatureGate } from '@/lib/contexts/SubscriptionContext';
import Link from 'next/link';

export default function SearchConsolePage() {
  const { hasAccess, requiredTier } = useFeatureGate('searchConsole');
  const [isConnected] = useState(false);

  if (!hasAccess) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Search Console</h1>
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Connect Google Search Console to see organic search data alongside your paid campaigns.
          </p>
          <Link href="/settings/billing" className="btn btn-primary">
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Search Console</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            View organic search performance from Google Search Console
          </p>
        </div>

        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Connect Google Search Console</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            See your organic search queries, impressions, clicks, and positions alongside your paid campaign data.
          </p>
          <button className="btn btn-primary">
            Connect Search Console
          </button>
          <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            You&apos;ll be redirected to Google to authorize access to your Search Console data.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Search Console</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Organic search performance for your connected properties
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select className="select">
            <option>Last 7 days</option>
            <option>Last 28 days</option>
            <option>Last 3 months</option>
          </select>
          <button className="btn btn-secondary">
            Export
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total Clicks', value: '12,345', change: '+5.2%' },
          { label: 'Impressions', value: '456,789', change: '+12.3%' },
          { label: 'Avg CTR', value: '2.7%', change: '+0.3%' },
          { label: 'Avg Position', value: '14.2', change: '-1.8' }
        ].map(metric => (
          <div key={metric.label} style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {metric.label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600' }}>{metric.value}</div>
            <div style={{
              fontSize: '12px',
              color: metric.change.startsWith('+') ? 'var(--primary)' : '#EF4444',
              marginTop: '4px'
            }}>
              {metric.change}
            </div>
          </div>
        ))}
      </div>

      {/* Top Queries */}
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Top Queries</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-subtle)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Query</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>Clicks</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>Impressions</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>CTR</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>Position</th>
            </tr>
          </thead>
          <tbody>
            {[
              { query: 'google ads management', clicks: 234, impressions: 5670, ctr: 4.1, position: 3.2 },
              { query: 'ppc campaign optimization', clicks: 189, impressions: 4320, ctr: 4.4, position: 4.5 },
              { query: 'meta ads agency', clicks: 156, impressions: 3890, ctr: 4.0, position: 5.1 },
              { query: 'ad spend tracking', clicks: 98, impressions: 2450, ctr: 4.0, position: 6.8 },
              { query: 'roas calculator', clicks: 87, impressions: 2100, ctr: 4.1, position: 7.2 }
            ].map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border-default)' }}>
                <td style={{ padding: '12px 16px' }}>{row.query}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{row.clicks.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{row.impressions.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{row.ctr}%</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{row.position}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
