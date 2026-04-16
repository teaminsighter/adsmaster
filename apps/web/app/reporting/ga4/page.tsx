'use client';

import { useState } from 'react';
import { useFeatureGate } from '@/lib/contexts/SubscriptionContext';
import Link from 'next/link';

export default function GA4AnalyticsPage() {
  const { hasAccess, requiredTier } = useFeatureGate('ga4Analytics');
  const [isConnected] = useState(false);

  if (!hasAccess) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>GA4 Analytics</h1>
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Connect GA4 for server-side event tracking and enhanced attribution.
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
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>GA4 Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Server-side event tracking and analytics integration
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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Connect Google Analytics 4</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            Enable server-side event tracking to improve conversion accuracy and bypass ad blockers.
          </p>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Measurement ID
            </label>
            <input
              type="text"
              className="input"
              placeholder="G-XXXXXXXXXX"
              style={{ width: '250px' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              API Secret
            </label>
            <input
              type="password"
              className="input"
              placeholder="Your Measurement Protocol API secret"
              style={{ width: '250px' }}
            />
          </div>

          <button className="btn btn-primary">
            Connect GA4
          </button>

          <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Find your API secret in GA4 Admin &gt; Data Streams &gt; Measurement Protocol API secrets
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>GA4 Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Server-side events and attribution data
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select className="select">
            <option>Last 7 days</option>
            <option>Last 28 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Connection Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <span style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: 'var(--primary)'
        }} />
        <span>Connected to GA4 Property: <strong>G-ABCD1234</strong></span>
        <button className="btn btn-ghost" style={{ marginLeft: 'auto' }}>
          Settings
        </button>
      </div>

      {/* Server-Side Events Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Events Sent', value: '45,678', status: 'success' },
          { label: 'Success Rate', value: '99.2%', status: 'success' },
          { label: 'Failed Events', value: '367', status: 'warning' },
          { label: 'Avg Latency', value: '45ms', status: 'success' }
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
          </div>
        ))}
      </div>

      {/* Event Types */}
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Server-Side Events</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-subtle)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Event Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>Count</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>Success</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>Failed</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>Last Sent</th>
            </tr>
          </thead>
          <tbody>
            {[
              { event: 'purchase', count: 1234, success: 1230, failed: 4, lastSent: '2 min ago' },
              { event: 'generate_lead', count: 5678, success: 5650, failed: 28, lastSent: '1 min ago' },
              { event: 'page_view', count: 34567, success: 34500, failed: 67, lastSent: 'Just now' },
              { event: 'sign_up', count: 890, success: 888, failed: 2, lastSent: '5 min ago' },
              { event: 'begin_checkout', count: 2345, success: 2340, failed: 5, lastSent: '3 min ago' }
            ].map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border-default)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <code style={{
                    padding: '2px 6px',
                    background: 'var(--surface-subtle)',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}>
                    {row.event}
                  </code>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{row.count.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--primary)' }}>{row.success.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: row.failed > 10 ? '#F59E0B' : 'var(--text-secondary)' }}>{row.failed}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{row.lastSent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
