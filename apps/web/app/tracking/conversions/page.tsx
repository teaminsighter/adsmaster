'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Conversion {
  id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  conversion_type: string;
  conversion_name?: string;
  value_micros: number;
  currency: string;
  lead_status: string;
  gclid?: string;
  fbclid?: string;
  utm_source?: string;
  utm_campaign?: string;
  source: string;
  source_name?: string;
  meta_sync_status: string;
  google_sync_status: string;
  occurred_at: string;
  created_at: string;
}

interface ConversionListResponse {
  conversions: Conversion[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

function formatMicros(micros: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(micros / 1_000_000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSyncStatusBadge(status: string) {
  switch (status) {
    case 'synced':
      return <span className="badge badge-success">Synced</span>;
    case 'pending':
      return <span className="badge badge-warning">Pending</span>;
    case 'failed':
      return <span className="badge badge-danger">Failed</span>;
    case 'skipped':
      return <span className="badge badge-secondary">Skipped</span>;
    default:
      return <span className="badge badge-secondary">{status}</span>;
  }
}

function getLeadStatusBadge(status: string) {
  switch (status) {
    case 'new':
      return <span className="badge badge-info">New</span>;
    case 'contacted':
      return <span className="badge badge-primary">Contacted</span>;
    case 'qualified':
      return <span className="badge badge-warning">Qualified</span>;
    case 'converted':
      return <span className="badge badge-success">Converted</span>;
    case 'lost':
      return <span className="badge badge-danger">Lost</span>;
    default:
      return <span className="badge badge-secondary">{status}</span>;
  }
}

export default function ConversionsPage() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [syncFilter, setSyncFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);

  const pageSize = 50;

  useEffect(() => {
    fetchConversions();
  }, [page, search, typeFilter, statusFilter, sourceFilter, syncFilter]);

  async function fetchConversions() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (search) params.set('search', search);
      if (typeFilter) params.set('conversion_type', typeFilter);
      if (statusFilter) params.set('lead_status', statusFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (syncFilter) {
        if (syncFilter.startsWith('meta_')) {
          params.set('meta_sync_status', syncFilter.replace('meta_', ''));
        } else if (syncFilter.startsWith('google_')) {
          params.set('google_sync_status', syncFilter.replace('google_', ''));
        }
      }

      const res = await fetch(`/api/v1/conversions/offline?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (res.ok) {
        const data: ConversionListResponse = await res.json();
        setConversions(data.conversions);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch conversions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function syncSelected(platform: 'meta' | 'google') {
    if (selectedIds.length === 0) return;

    setSyncing(true);
    try {
      const res = await fetch('/api/v1/conversions/offline/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          conversion_ids: selectedIds,
          platform,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Synced ${result.synced} conversions, ${result.failed} failed`);
        setSelectedIds([]);
        fetchConversions();
      }
    } catch (error) {
      console.error('Failed to sync:', error);
      alert('Failed to sync conversions');
    } finally {
      setSyncing(false);
    }
  }

  function toggleSelectAll() {
    if (selectedIds.length === conversions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(conversions.map((c) => c.id));
    }
  }

  function toggleSelect(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Offline Conversions</h1>
          <p className="text-secondary">{total.toLocaleString()} conversions</p>
        </div>
        <div className="flex gap-2">
          <Link href="/tracking/conversions/new" className="btn btn-primary">
            Add Conversion
          </Link>
          <Link href="/tracking/conversions/import" className="btn btn-secondary">
            Import CSV
          </Link>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="card mb-4" style={{ background: 'var(--primary)', color: 'white' }}>
          <div className="card-body flex items-center justify-between">
            <span>{selectedIds.length} conversion(s) selected</span>
            <div className="flex gap-2">
              <button
                className="btn btn-sm"
                style={{ background: 'white', color: 'var(--primary)' }}
                onClick={() => syncSelected('meta')}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Sync to Meta'}
              </button>
              <button
                className="btn btn-sm"
                style={{ background: 'white', color: 'var(--primary)' }}
                onClick={() => syncSelected('google')}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Sync to Google'}
              </button>
              <button
                className="btn btn-sm"
                style={{ background: 'rgba(255,255,255,0.2)' }}
                onClick={() => setSelectedIds([])}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Search by email or name..."
              className="input"
              style={{ width: '250px' }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />

            <select
              className="select"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              <option value="lead">Lead</option>
              <option value="purchase">Purchase</option>
              <option value="signup">Signup</option>
              <option value="add_to_cart">Add to Cart</option>
              <option value="initiate_checkout">Checkout</option>
            </select>

            <select
              className="select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>

            <select
              className="select"
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Sources</option>
              <option value="website">Website</option>
              <option value="webhook">Webhook</option>
              <option value="crm">CRM</option>
              <option value="csv">CSV Import</option>
              <option value="manual">Manual</option>
              <option value="api">API</option>
            </select>

            <select
              className="select"
              value={syncFilter}
              onChange={(e) => {
                setSyncFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Sync Status</option>
              <option value="meta_pending">Meta Pending</option>
              <option value="meta_synced">Meta Synced</option>
              <option value="meta_failed">Meta Failed</option>
              <option value="google_pending">Google Pending</option>
              <option value="google_synced">Google Synced</option>
              <option value="google_failed">Google Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conversions Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === conversions.length && conversions.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Contact</th>
                <th>Type / Value</th>
                <th>Attribution</th>
                <th>Source</th>
                <th>Lead Status</th>
                <th>Meta Sync</th>
                <th>Google Sync</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">Loading...</td>
                </tr>
              ) : conversions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <div className="text-secondary">No conversions found</div>
                    <Link href="/tracking/conversions/new" className="text-primary text-sm">
                      Add your first conversion
                    </Link>
                  </td>
                </tr>
              ) : (
                conversions.map((conv) => (
                  <tr key={conv.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(conv.id)}
                        onChange={() => toggleSelect(conv.id)}
                      />
                    </td>
                    <td>
                      <div>
                        <div className="font-medium">
                          {conv.first_name || conv.last_name
                            ? `${conv.first_name || ''} ${conv.last_name || ''}`
                            : conv.email || conv.phone || 'Unknown'}
                        </div>
                        {conv.email && (
                          <div className="text-sm text-secondary">{conv.email}</div>
                        )}
                        {conv.phone && (
                          <div className="text-sm text-secondary">{conv.phone}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="badge badge-outline capitalize">
                          {conv.conversion_type.replace('_', ' ')}
                        </span>
                        {conv.value_micros > 0 && (
                          <div className="font-medium mt-1">
                            {formatMicros(conv.value_micros, conv.currency)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {conv.gclid && (
                          <span className="badge badge-blue" title={conv.gclid}>G</span>
                        )}
                        {conv.fbclid && (
                          <span className="badge badge-purple" title={conv.fbclid}>f</span>
                        )}
                        {conv.utm_source && (
                          <span className="text-sm text-secondary">{conv.utm_source}</span>
                        )}
                        {!conv.gclid && !conv.fbclid && !conv.utm_source && (
                          <span className="text-secondary">-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        <div className="capitalize">{conv.source}</div>
                        {conv.source_name && (
                          <div className="text-secondary">{conv.source_name}</div>
                        )}
                      </div>
                    </td>
                    <td>{getLeadStatusBadge(conv.lead_status)}</td>
                    <td>{getSyncStatusBadge(conv.meta_sync_status)}</td>
                    <td>{getSyncStatusBadge(conv.google_sync_status)}</td>
                    <td>
                      <div className="text-sm">{formatDate(conv.occurred_at)}</div>
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
              Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total}
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
    </div>
  );
}
