// @ts-nocheck
'use client';

import { useState, useMemo } from 'react';
import { useFeatureGate } from '@/lib/contexts/SubscriptionContext';
import { useRecordings, useRecordingStats, toggleRecordingStar } from '@/lib/hooks/useApi';
import Link from 'next/link';

export default function SessionRecordingsPage() {
  const { hasAccess, requiredTier } = useFeatureGate('sessionRecordings');

  // Filters
  const [deviceType, setDeviceType] = useState<string>('');
  const [hasErrors, setHasErrors] = useState<boolean | undefined>(undefined);
  const [hasRageClicks, setHasRageClicks] = useState<boolean | undefined>(undefined);
  const [minDuration, setMinDuration] = useState<number | undefined>(undefined);
  const [maxDuration, setMaxDuration] = useState<number | undefined>(undefined);
  const [starred, setStarred] = useState<boolean | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // API hooks
  const { data: recordingsData, loading, error, refetch } = useRecordings({
    device_type: deviceType || undefined,
    has_errors: hasErrors,
    has_rage_clicks: hasRageClicks,
    min_duration: minDuration,
    max_duration: maxDuration,
    starred: starred,
    page,
    limit,
  });

  const { data: statsData } = useRecordingStats(30);

  // Filter recordings by search query (client-side for visitor ID search)
  const filteredRecordings = useMemo(() => {
    if (!recordingsData?.recordings) return [];
    if (!searchQuery) return recordingsData.recordings;
    const query = searchQuery.toLowerCase();
    return recordingsData.recordings.filter(r =>
      r.visitor_id.toLowerCase().includes(query) ||
      r.visitor_email?.toLowerCase().includes(query) ||
      r.visitor_name?.toLowerCase().includes(query)
    );
  }, [recordingsData?.recordings, searchQuery]);

  const handleDurationFilter = (value: string) => {
    switch (value) {
      case 'short':
        setMinDuration(undefined);
        setMaxDuration(30);
        break;
      case 'medium':
        setMinDuration(30);
        setMaxDuration(300);
        break;
      case 'long':
        setMinDuration(300);
        setMaxDuration(undefined);
        break;
      default:
        setMinDuration(undefined);
        setMaxDuration(undefined);
    }
    setPage(1);
  };

  const handleStar = async (recordingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleRecordingStar(recordingId);
      refetch();
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!hasAccess) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Session Recordings</h1>
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>:lock:</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Session recordings help you understand user behavior with visual playback of visitor sessions.
          </p>
          <Link href="/settings/billing" className="btn btn-primary">
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Session Recordings</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Watch visual playbacks of visitor sessions to understand user behavior
        </p>
      </div>

      {/* Stats Cards */}
      {statsData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Total Recordings
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600' }}>
              {statsData.total_recordings.toLocaleString()}
            </div>
          </div>
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Avg Duration
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600' }}>
              {formatDuration(Math.round(statsData.avg_duration_seconds))}
            </div>
          </div>
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              With Rage Clicks
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#EF4444' }}>
              {statsData.recordings_with_rage_clicks}
            </div>
          </div>
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              With Errors
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#EF4444' }}>
              {statsData.recordings_with_errors}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <select
          className="select"
          style={{ minWidth: '140px' }}
          value={deviceType}
          onChange={(e) => { setDeviceType(e.target.value); setPage(1); }}
        >
          <option value="">All Devices</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </select>

        <select
          className="select"
          style={{ minWidth: '140px' }}
          onChange={(e) => handleDurationFilter(e.target.value)}
        >
          <option value="">All Durations</option>
          <option value="short">&lt; 30 seconds</option>
          <option value="medium">30s - 5 min</option>
          <option value="long">&gt; 5 minutes</option>
        </select>

        <button
          className={`btn ${hasRageClicks ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setHasRageClicks(hasRageClicks ? undefined : true); setPage(1); }}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <span style={{ color: hasRageClicks ? 'white' : '#EF4444' }}>!</span>
          Rage Clicks
        </button>

        <button
          className={`btn ${hasErrors ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setHasErrors(hasErrors ? undefined : true); setPage(1); }}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <span style={{ color: hasErrors ? 'white' : '#EF4444' }}>x</span>
          With Errors
        </button>

        <button
          className={`btn ${starred ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setStarred(starred ? undefined : true); setPage(1); }}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <span style={{ color: starred ? 'white' : '#F59E0B' }}>*</span>
          Starred
        </button>

        <input
          type="text"
          className="input"
          placeholder="Search visitor ID, email..."
          style={{ minWidth: '200px', marginLeft: 'auto' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center'
        }}>
          <div style={{ color: 'var(--text-secondary)' }}>Loading recordings...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid #EF4444',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          color: '#EF4444'
        }}>
          Failed to load recordings. Please try again.
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredRecordings.length === 0 && (
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>:movie_camera:</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>
            {searchQuery || deviceType || hasErrors || hasRageClicks || starred
              ? 'No recordings match your filters'
              : 'No recordings yet'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            {searchQuery || deviceType || hasErrors || hasRageClicks || starred
              ? 'Try adjusting your filters to see more recordings.'
              : 'Session recordings will appear here once visitors interact with your tracked pages. Make sure the Infinity Tracker is installed on your website.'}
          </p>
          {!(searchQuery || deviceType || hasErrors || hasRageClicks || starred) && (
            <Link href="/tracking/setup" className="btn btn-primary">
              Setup Tracking
            </Link>
          )}
        </div>
      )}

      {/* Recordings Grid */}
      {!loading && !error && filteredRecordings.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {filteredRecordings.map((recording) => (
              <Link
                key={recording.id}
                href={`/tracking/recordings/${recording.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  {/* Preview Thumbnail */}
                  <div style={{
                    height: '140px',
                    background: 'var(--surface-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '24px',
                    }}>
                      &#9658;
                    </div>

                    {/* Duration Badge */}
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}>
                      {formatDuration(recording.duration_seconds)}
                    </div>

                    {/* Starred Badge */}
                    {recording.is_starred && (
                      <button
                        onClick={(e) => handleStar(recording.id, e)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(245, 158, 11, 0.9)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          color: 'white',
                          fontSize: '14px',
                        }}
                      >
                        *
                      </button>
                    )}

                    {/* Device Icon */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      textTransform: 'capitalize',
                    }}>
                      {recording.device_type || 'Unknown'}
                    </div>
                  </div>

                  {/* Info Section */}
                  <div style={{ padding: '16px' }}>
                    {/* Visitor Info */}
                    <div style={{ marginBottom: '8px' }}>
                      {recording.visitor_email ? (
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>
                          {recording.visitor_email}
                        </div>
                      ) : recording.visitor_name ? (
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>
                          {recording.visitor_name}
                        </div>
                      ) : (
                        <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text-secondary)' }}>
                          Anonymous Visitor
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatTimeAgo(recording.started_at)}
                        {recording.country_code && ` · ${recording.city ? `${recording.city}, ` : ''}${recording.country_code}`}
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                    }}>
                      <span>{recording.page_count} pages</span>
                      <span>{recording.event_count} events</span>
                      {recording.rage_clicks > 0 && (
                        <span style={{ color: '#EF4444' }}>
                          {recording.rage_clicks} rage clicks
                        </span>
                      )}
                      {recording.dead_clicks > 0 && (
                        <span style={{ color: '#F59E0B' }}>
                          {recording.dead_clicks} dead clicks
                        </span>
                      )}
                      {recording.error_count > 0 && (
                        <span style={{ color: '#EF4444' }}>
                          {recording.error_count} errors
                        </span>
                      )}
                    </div>

                    {/* Entry Page */}
                    <div style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {recording.entry_path || '/'}
                    </div>

                    {/* Attribution Badge */}
                    {(recording.utm_source || recording.gclid || recording.fbclid) && (
                      <div style={{
                        marginTop: '8px',
                        display: 'flex',
                        gap: '4px',
                      }}>
                        {recording.gclid && (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#3B82F620',
                            color: '#3B82F6',
                          }}>
                            Google Ads
                          </span>
                        )}
                        {recording.fbclid && (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#3B82F620',
                            color: '#3B82F6',
                          }}>
                            Meta Ads
                          </span>
                        )}
                        {recording.utm_source && !recording.gclid && !recording.fbclid && (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--surface-subtle)',
                            color: 'var(--text-secondary)',
                          }}>
                            {recording.utm_source}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {recordingsData && recordingsData.total > limit && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              alignItems: 'center',
            }}>
              <button
                className="btn btn-secondary"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Page {page} of {Math.ceil(recordingsData.total / limit)}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page >= Math.ceil(recordingsData.total / limit)}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
