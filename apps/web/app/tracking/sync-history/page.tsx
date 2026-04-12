'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SyncLog {
  id: string;
  conversion_id: string;
  platform: 'meta' | 'google';
  success: boolean;
  error_message?: string;
  response_data?: Record<string, unknown>;
  created_at: string;
}

interface SyncLogListResponse {
  logs: SyncLog[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPlatformBadge(platform: string) {
  if (platform === 'meta') {
    return (
      <span className="badge" style={{ background: '#1877f2', color: 'white' }}>
        Meta CAPI
      </span>
    );
  }
  return (
    <span className="badge" style={{ background: '#4285f4', color: 'white' }}>
      Google Ads
    </span>
  );
}

export default function SyncHistoryPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);

  const pageSize = 50;

  useEffect(() => {
    fetchLogs();
  }, [page, platformFilter, successFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (platformFilter) params.set('platform', platformFilter);
      if (successFilter) params.set('success', successFilter);

      const res = await fetch(`/api/v1/sync/logs?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (res.ok) {
        const data: SyncLogListResponse = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch sync logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  // Stats
  const successCount = logs.filter((l) => l.success).length;
  const failCount = logs.filter((l) => !l.success).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sync History</h1>
          <p className="text-secondary">Track conversion sync attempts to ad platforms</p>
        </div>
        <Link href="/tracking/conversions" className="btn btn-secondary">
          Back to Conversions
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <div className="text-sm text-secondary">Total Syncs</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-success">{successCount}</div>
            <div className="text-sm text-secondary">Successful</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-danger">{failCount}</div>
            <div className="text-sm text-secondary">Failed</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold">
              {total > 0 ? ((successCount / total) * 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-secondary">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body flex gap-4">
          <select
            className="select"
            value={platformFilter}
            onChange={(e) => {
              setPlatformFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Platforms</option>
            <option value="meta">Meta CAPI</option>
            <option value="google">Google Ads</option>
          </select>

          <select
            className="select"
            value={successFilter}
            onChange={(e) => {
              setSuccessFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Results</option>
            <option value="true">Successful</option>
            <option value="false">Failed</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Platform</th>
                <th>Conversion ID</th>
                <th>Status</th>
                <th>Response / Error</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <div className="text-secondary">No sync logs found</div>
                    <Link href="/tracking/conversions" className="text-primary text-sm">
                      Sync some conversions
                    </Link>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-sm">{formatDate(log.created_at)}</td>
                    <td>{getPlatformBadge(log.platform)}</td>
                    <td>
                      <code className="text-xs">{log.conversion_id?.slice(0, 8)}...</code>
                    </td>
                    <td>
                      {log.success ? (
                        <span className="badge badge-success">Success</span>
                      ) : (
                        <span className="badge badge-danger">Failed</span>
                      )}
                    </td>
                    <td className="max-w-xs">
                      {log.error_message ? (
                        <span className="text-danger text-sm truncate block">
                          {log.error_message}
                        </span>
                      ) : log.response_data ? (
                        <span className="text-secondary text-sm">
                          {log.platform === 'meta' && log.response_data.fbtrace_id
                            ? `fbtrace: ${String(log.response_data.fbtrace_id).slice(0, 12)}...`
                            : log.platform === 'google' && log.response_data.job_id
                              ? `job: ${String(log.response_data.job_id).slice(0, 12)}...`
                              : 'OK'}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setSelectedLog(log)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer flex justify-between items-center">
            <div className="text-sm text-secondary">
              Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span className="flex items-center px-3 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="card max-w-2xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header flex items-center justify-between">
              <h3 className="card-title">Sync Log Details</h3>
              <button
                className="btn btn-sm"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-secondary">Platform</div>
                  <div>{getPlatformBadge(selectedLog.platform)}</div>
                </div>
                <div>
                  <div className="text-sm text-secondary">Status</div>
                  <div>
                    {selectedLog.success ? (
                      <span className="badge badge-success">Success</span>
                    ) : (
                      <span className="badge badge-danger">Failed</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-secondary">Date</div>
                  <div>{formatDate(selectedLog.created_at)}</div>
                </div>
                <div>
                  <div className="text-sm text-secondary">Conversion ID</div>
                  <code className="text-sm">{selectedLog.conversion_id}</code>
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="mb-4">
                  <div className="text-sm text-secondary mb-1">Error Message</div>
                  <div
                    className="p-3 rounded text-danger text-sm"
                    style={{ background: 'var(--bg-danger-subtle)' }}
                  >
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              {selectedLog.response_data && (
                <div>
                  <div className="text-sm text-secondary mb-1">Response Data</div>
                  <pre
                    className="p-3 rounded text-sm overflow-auto"
                    style={{ background: 'var(--bg-secondary)', maxHeight: '200px' }}
                  >
                    {JSON.stringify(selectedLog.response_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
