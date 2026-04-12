'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SyncStats {
  meta_synced: number;
  meta_pending: number;
  meta_failed: number;
  google_synced: number;
  google_pending: number;
  google_failed: number;
  total_conversions: number;
}

export default function SyncStatusWidget() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/v1/conversions/offline/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch sync stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function syncPending(platform: 'meta' | 'google') {
    setSyncing(platform);
    try {
      const res = await fetch(`/api/v1/conversions/offline/sync-pending?platform=${platform}&limit=100`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Synced ${result.synced} conversions, ${result.failed} failed`);
        fetchStats();
      }
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed');
    } finally {
      setSyncing(null);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Sync Status</h3>
        </div>
        <div className="card-body text-center py-8">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const metaSyncRate = stats.total_conversions > 0
    ? ((stats.meta_synced / stats.total_conversions) * 100).toFixed(0)
    : 0;

  const googleSyncRate = stats.total_conversions > 0
    ? ((stats.google_synced / stats.total_conversions) * 100).toFixed(0)
    : 0;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="card-title">Sync Status</h3>
        <Link href="/tracking/sync-history" className="text-sm text-primary">
          View History
        </Link>
      </div>
      <div className="card-body">
        {/* Meta Sync */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">f</span>
              <span className="font-medium">Meta CAPI</span>
            </div>
            <span className="text-lg font-semibold">{metaSyncRate}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${metaSyncRate}%`,
                background: 'linear-gradient(90deg, #1877f2, #4267b2)',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <div className="flex gap-3">
              <span className="text-success">{stats.meta_synced} synced</span>
              <span className="text-warning">{stats.meta_pending} pending</span>
              {stats.meta_failed > 0 && (
                <span className="text-danger">{stats.meta_failed} failed</span>
              )}
            </div>
            {stats.meta_pending > 0 && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => syncPending('meta')}
                disabled={syncing !== null}
              >
                {syncing === 'meta' ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        </div>

        {/* Google Sync */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">G</span>
              <span className="font-medium">Google Ads</span>
            </div>
            <span className="text-lg font-semibold">{googleSyncRate}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${googleSyncRate}%`,
                background: 'linear-gradient(90deg, #4285f4, #ea4335)',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <div className="flex gap-3">
              <span className="text-success">{stats.google_synced} synced</span>
              <span className="text-warning">{stats.google_pending} pending</span>
              {stats.google_failed > 0 && (
                <span className="text-danger">{stats.google_failed} failed</span>
              )}
            </div>
            {stats.google_pending > 0 && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => syncPending('google')}
                disabled={syncing !== null}
              >
                {syncing === 'google' ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
