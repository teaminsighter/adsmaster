'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Visitor {
  id: string;
  visitor_id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  utm_source?: string;
  utm_campaign?: string;
  gclid?: string;
  fbclid?: string;
  country_code?: string;
  city?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  page_views: number;
  events_count: number;
  first_seen_at: string;
  last_seen_at: string;
  identified_at?: string;
}

interface VisitorListResponse {
  visitors: Visitor[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷',
  JP: '🇯🇵', CN: '🇨🇳', IN: '🇮🇳', BR: '🇧🇷', MX: '🇲🇽', ES: '🇪🇸',
  IT: '🇮🇹', NL: '🇳🇱', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮',
  PL: '🇵🇱', RU: '🇷🇺', KR: '🇰🇷', SG: '🇸🇬', HK: '🇭🇰', NZ: '🇳🇿',
  IE: '🇮🇪', CH: '🇨🇭', AT: '🇦🇹', BE: '🇧🇪', PT: '🇵🇹', IL: '🇮🇱',
  AE: '🇦🇪', ZA: '🇿🇦', AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴',
};

function getFlag(countryCode?: string): string {
  if (!countryCode) return '🌍';
  return COUNTRY_FLAGS[countryCode] || '🌍';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function getDeviceIcon(deviceType?: string): string {
  switch (deviceType) {
    case 'mobile': return '📱';
    case 'tablet': return '📲';
    case 'desktop': return '💻';
    default: return '🖥️';
  }
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [hasGclidFilter, setHasGclidFilter] = useState<boolean | null>(null);
  const [hasFbclidFilter, setHasFbclidFilter] = useState<boolean | null>(null);
  const [identifiedOnly, setIdentifiedOnly] = useState(false);

  const pageSize = 50;

  useEffect(() => {
    fetchVisitors();
  }, [page, search, sourceFilter, hasGclidFilter, hasFbclidFilter, identifiedOnly]);

  async function fetchVisitors() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (search) params.set('search', search);
      if (sourceFilter) params.set('source', sourceFilter);
      if (hasGclidFilter !== null) params.set('has_gclid', hasGclidFilter.toString());
      if (hasFbclidFilter !== null) params.set('has_fbclid', hasFbclidFilter.toString());
      if (identifiedOnly) params.set('identified_only', 'true');

      const res = await fetch(`/api/v1/visitors?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (res.ok) {
        const data: VisitorListResponse = await res.json();
        setVisitors(data.visitors);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch visitors:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Visitors</h1>
          <p className="text-secondary">{total.toLocaleString()} visitors tracked</p>
        </div>
        <div className="flex gap-2">
          <Link href="/tracking/setup" className="btn btn-secondary">
            Get Tracking Script
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Search by email, name, or visitor ID..."
              className="input"
              style={{ width: '300px' }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />

            <select
              className="select"
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Sources</option>
              <option value="google">Google</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter</option>
              <option value="email">Email</option>
              <option value="direct">Direct</option>
            </select>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasGclidFilter === true}
                onChange={(e) => setHasGclidFilter(e.target.checked ? true : null)}
              />
              <span className="text-sm">Has GCLID</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasFbclidFilter === true}
                onChange={(e) => setHasFbclidFilter(e.target.checked ? true : null)}
              />
              <span className="text-sm">Has FBCLID</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={identifiedOnly}
                onChange={(e) => {
                  setIdentifiedOnly(e.target.checked);
                  setPage(1);
                }}
              />
              <span className="text-sm">Identified Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Visitors Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Source / Campaign</th>
                <th>Location</th>
                <th>Device</th>
                <th>Attribution</th>
                <th>Activity</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">Loading...</td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="text-secondary">No visitors found</div>
                    <Link href="/tracking/setup" className="text-primary text-sm">
                      Set up tracking to start capturing visitors
                    </Link>
                  </td>
                </tr>
              ) : (
                visitors.map((visitor) => (
                  <tr key={visitor.id}>
                    <td>
                      <div>
                        {visitor.email || visitor.first_name ? (
                          <>
                            <div className="font-medium">
                              {visitor.first_name} {visitor.last_name}
                            </div>
                            <div className="text-sm text-secondary">{visitor.email}</div>
                            {visitor.phone && (
                              <div className="text-sm text-secondary">{visitor.phone}</div>
                            )}
                          </>
                        ) : (
                          <div className="text-secondary">
                            <span className="font-mono text-xs">{visitor.visitor_id.slice(0, 12)}...</span>
                            <div className="text-xs">Anonymous</div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {visitor.utm_source || visitor.utm_campaign ? (
                        <div>
                          {visitor.utm_source && (
                            <span className="badge badge-outline">{visitor.utm_source}</span>
                          )}
                          {visitor.utm_campaign && (
                            <div className="text-sm text-secondary mt-1">
                              {visitor.utm_campaign}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-secondary">Direct</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{getFlag(visitor.country_code)}</span>
                        <span>{visitor.city || visitor.country_code || 'Unknown'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{getDeviceIcon(visitor.device_type)}</span>
                        <div>
                          <div className="text-sm">{visitor.browser}</div>
                          <div className="text-xs text-secondary">{visitor.os}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {visitor.gclid && (
                          <span className="badge badge-blue" title={`GCLID: ${visitor.gclid}`}>
                            G
                          </span>
                        )}
                        {visitor.fbclid && (
                          <span className="badge badge-purple" title={`FBCLID: ${visitor.fbclid}`}>
                            f
                          </span>
                        )}
                        {!visitor.gclid && !visitor.fbclid && (
                          <span className="text-secondary text-sm">-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        <div>{visitor.page_views} views</div>
                        <div className="text-secondary">{visitor.events_count} events</div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        {formatDate(visitor.last_seen_at)}
                      </div>
                      {visitor.identified_at && (
                        <div className="text-xs text-success">Identified</div>
                      )}
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
