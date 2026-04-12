'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/lib/hooks/useApi';
import SyncStatusWidget from '@/components/tracking/SyncStatusWidget';

interface VisitorStats {
  total_visitors: number;
  identified_visitors: number;
  visitors_today: number;
  visitors_this_week: number;
  visitors_with_gclid: number;
  visitors_with_fbclid: number;
  top_sources: { source: string; count: number }[];
  top_campaigns: { campaign: string; count: number }[];
  device_breakdown: { desktop: number; mobile: number; tablet: number };
  country_breakdown: { code: string; name: string; count: number }[];
}

interface ConversionStats {
  total_conversions: number;
  total_value_micros: number;
  conversions_today: number;
  conversions_this_week: number;
  meta_synced: number;
  meta_pending: number;
  google_synced: number;
  google_pending: number;
  with_gclid: number;
  with_fbclid: number;
}

function formatMicros(micros: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(micros / 1_000_000);
}

export default function TrackingOverviewPage() {
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
  const [conversionStats, setConversionStats] = useState<ConversionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [vRes, cRes] = await Promise.all([
          fetch('/api/v1/visitors/stats', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          fetch('/api/v1/conversions/offline/stats', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
        ]);

        if (vRes.ok) {
          setVisitorStats(await vRes.json());
        }
        if (cRes.ok) {
          setConversionStats(await cRes.json());
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tracking Overview</h1>
          <p className="text-secondary">Monitor visitors and conversions from your tracking script</p>
        </div>
        <Link href="/tracking/setup" className="btn btn-primary">
          Setup Tracking
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <div className="metric-label">Total Visitors</div>
          <div className="metric-value">
            {loading ? '...' : visitorStats?.total_visitors?.toLocaleString() || '0'}
          </div>
          <div className="metric-change positive">
            +{visitorStats?.visitors_today || 0} today
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Identified Visitors</div>
          <div className="metric-value">
            {loading ? '...' : visitorStats?.identified_visitors?.toLocaleString() || '0'}
          </div>
          <div className="metric-change">
            {visitorStats && visitorStats.total_visitors > 0
              ? Math.round((visitorStats.identified_visitors / visitorStats.total_visitors) * 100)
              : 0}% rate
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Conversions</div>
          <div className="metric-value">
            {loading ? '...' : conversionStats?.total_conversions?.toLocaleString() || '0'}
          </div>
          <div className="metric-change positive">
            +{conversionStats?.conversions_today || 0} today
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Conversion Value</div>
          <div className="metric-value">
            {loading ? '...' : formatMicros(conversionStats?.total_value_micros || 0)}
          </div>
          <div className="metric-change">
            Total value tracked
          </div>
        </div>
      </div>

      {/* Attribution Stats */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ad Platform Attribution</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: '20px' }}>G</span>
                  <span className="font-medium">Google Ads</span>
                </div>
                <div className="text-2xl font-bold">
                  {visitorStats?.visitors_with_gclid || 0}
                </div>
                <div className="text-sm text-secondary">visitors with GCLID</div>
                <div className="mt-2 text-sm">
                  <span className="text-success">{conversionStats?.google_synced || 0} synced</span>
                  {' | '}
                  <span className="text-warning">{conversionStats?.google_pending || 0} pending</span>
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: '20px' }}>f</span>
                  <span className="font-medium">Meta Ads</span>
                </div>
                <div className="text-2xl font-bold">
                  {visitorStats?.visitors_with_fbclid || 0}
                </div>
                <div className="text-sm text-secondary">visitors with FBCLID</div>
                <div className="mt-2 text-sm">
                  <span className="text-success">{conversionStats?.meta_synced || 0} synced</span>
                  {' | '}
                  <span className="text-warning">{conversionStats?.meta_pending || 0} pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Device Breakdown</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {visitorStats?.device_breakdown && (
                <>
                  <div className="flex justify-between items-center">
                    <span>Desktop</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${(visitorStats.device_breakdown.desktop / (visitorStats.device_breakdown.desktop + visitorStats.device_breakdown.mobile + visitorStats.device_breakdown.tablet || 1)) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {visitorStats.device_breakdown.desktop}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Mobile</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${(visitorStats.device_breakdown.mobile / (visitorStats.device_breakdown.desktop + visitorStats.device_breakdown.mobile + visitorStats.device_breakdown.tablet || 1)) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {visitorStats.device_breakdown.mobile}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tablet</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${(visitorStats.device_breakdown.tablet / (visitorStats.device_breakdown.desktop + visitorStats.device_breakdown.mobile + visitorStats.device_breakdown.tablet || 1)) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {visitorStats.device_breakdown.tablet}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sync Status Widget */}
      <div className="mb-6">
        <SyncStatusWidget />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-4 gap-4">
        <Link href="/tracking/visitors" className="card hover:border-primary transition-colors">
          <div className="card-body text-center">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="font-semibold mb-1">Visitors</h3>
            <p className="text-sm text-secondary">View all tracked visitors</p>
          </div>
        </Link>

        <Link href="/tracking/conversions" className="card hover:border-primary transition-colors">
          <div className="card-body text-center">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-semibold mb-1">Conversions</h3>
            <p className="text-sm text-secondary">Manage offline conversions</p>
          </div>
        </Link>

        <Link href="/tracking/sync-history" className="card hover:border-primary transition-colors">
          <div className="card-body text-center">
            <div className="text-3xl mb-2">📋</div>
            <h3 className="font-semibold mb-1">Sync History</h3>
            <p className="text-sm text-secondary">View sync logs & status</p>
          </div>
        </Link>

        <Link href="/tracking/setup" className="card hover:border-primary transition-colors">
          <div className="card-body text-center">
            <div className="text-3xl mb-2">⚙️</div>
            <h3 className="font-semibold mb-1">Setup</h3>
            <p className="text-sm text-secondary">Get tracking script & webhooks</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
