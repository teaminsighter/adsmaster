'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useRecording,
  useRecordingEvents,
  useRecordingMarkers,
  toggleRecordingStar,
  deleteRecording,
} from '@/lib/hooks/useApi';
import { useFeatureGate } from '@/lib/contexts/SubscriptionContext';
import SessionPlayer from '@/components/tracking/SessionPlayer';

export default function RecordingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recordingId = params.id as string;

  const { hasAccess, requiredTier } = useFeatureGate('sessionRecordings');
  const { data: recording, loading: recordingLoading, error: recordingError, refetch } = useRecording(recordingId);
  const { data: eventsData, loading: eventsLoading } = useRecordingEvents(recordingId);
  const { data: markers } = useRecordingMarkers(recordingId);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!hasAccess) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Session Recording</h1>
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
            Session recordings are available on Growth plans and above.
          </p>
          <Link href="/settings/billing" className="btn btn-primary">
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  if (recordingLoading || eventsLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          color: 'var(--text-secondary)',
        }}>
          Loading recording...
        </div>
      </div>
    );
  }

  if (recordingError || !recording) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>:(</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Recording not found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            This recording may have been deleted or you don&apos;t have access to it.
          </p>
          <Link href="/tracking/recordings" className="btn btn-primary">
            Back to Recordings
          </Link>
        </div>
      </div>
    );
  }

  const handleStar = async () => {
    try {
      await toggleRecordingStar(recordingId);
      refetch();
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteRecording(recordingId);
      router.push('/tracking/recordings');
    } catch (err) {
      console.error('Failed to delete:', err);
      setIsDeleting(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const events = eventsData?.events || [];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/tracking/recordings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            marginBottom: '12px',
          }}
        >
          &larr; Back to Recordings
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '600' }}>
              Session Recording
              {recording.is_starred && (
                <span style={{ color: '#F59E0B', marginLeft: '8px' }}>*</span>
              )}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              {new Date(recording.started_at).toLocaleString()} - {formatDuration(recording.duration_seconds)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleStar}
              className="btn btn-secondary"
              title={recording.is_starred ? 'Unstar' : 'Star'}
            >
              {recording.is_starred ? '* Starred' : '* Star'}
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-secondary"
              style={{ color: '#EF4444' }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        {/* Player */}
        <div>
          <SessionPlayer
            events={events}
            markers={markers || []}
            width={1024}
            height={576}
            autoPlay={false}
            showController={true}
          />
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Visitor Info */}
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Visitor</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              {recording.visitor_email && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Email</span>
                  <span>{recording.visitor_email}</span>
                </div>
              )}
              {recording.visitor_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Name</span>
                  <span>{recording.visitor_name}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Visitor ID</span>
                <code style={{
                  fontSize: '11px',
                  padding: '2px 4px',
                  background: 'var(--surface-subtle)',
                  borderRadius: '4px',
                }}>
                  {recording.visitor_id.substring(0, 12)}...
                </code>
              </div>
              {recording.country_code && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Location</span>
                  <span>{recording.city ? `${recording.city}, ` : ''}{recording.country_code}</span>
                </div>
              )}
            </div>
          </div>

          {/* Device Info */}
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Device</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Type</span>
                <span style={{ textTransform: 'capitalize' }}>{recording.device_type || 'Unknown'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Browser</span>
                <span>{recording.browser || 'Unknown'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>OS</span>
                <span>{recording.os || 'Unknown'}</span>
              </div>
              {recording.screen_width && recording.screen_height && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Screen</span>
                  <span>{recording.screen_width}x{recording.screen_height}</span>
                </div>
              )}
            </div>
          </div>

          {/* Session Stats */}
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Session Stats</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Duration</span>
                <span>{formatDuration(recording.duration_seconds)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pages</span>
                <span>{recording.page_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Events</span>
                <span>{recording.event_count}</span>
              </div>
              {recording.rage_clicks > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#EF4444' }}>Rage Clicks</span>
                  <span style={{ color: '#EF4444' }}>{recording.rage_clicks}</span>
                </div>
              )}
              {recording.dead_clicks > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#F59E0B' }}>Dead Clicks</span>
                  <span style={{ color: '#F59E0B' }}>{recording.dead_clicks}</span>
                </div>
              )}
              {recording.error_count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#EF4444' }}>Errors</span>
                  <span style={{ color: '#EF4444' }}>{recording.error_count}</span>
                </div>
              )}
            </div>
          </div>

          {/* Attribution */}
          {(recording.utm_source || recording.gclid || recording.fbclid) && (
            <div style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '16px',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Attribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                {recording.utm_source && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Source</span>
                    <span>{recording.utm_source}</span>
                  </div>
                )}
                {recording.utm_campaign && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Campaign</span>
                    <span>{recording.utm_campaign}</span>
                  </div>
                )}
                {recording.gclid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>GCLID</span>
                    <span style={{ color: '#3B82F6' }}>Google Ads</span>
                  </div>
                )}
                {recording.fbclid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>FBCLID</span>
                    <span style={{ color: '#3B82F6' }}>Meta Ads</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Entry Page */}
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Entry Page</h3>
            <div style={{
              fontSize: '13px',
              wordBreak: 'break-all',
              color: 'var(--text-secondary)',
            }}>
              {recording.entry_url || recording.entry_path || 'Unknown'}
            </div>
            {recording.referrer && (
              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Referrer: </span>
                <span style={{ fontSize: '12px' }}>{recording.referrer}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }} onClick={() => setShowDeleteModal(false)}>
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Delete Recording?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              This action cannot be undone. The recording and all associated data will be permanently deleted.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ background: '#EF4444', color: 'white' }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Recording'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
