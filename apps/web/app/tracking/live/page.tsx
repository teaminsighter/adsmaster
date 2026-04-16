'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useFeatureGate } from '@/lib/contexts/SubscriptionContext';
import Link from 'next/link';
import { Wifi, WifiOff, Play, Pause, Trash2, Filter, Zap, Eye, MousePointer, FileText, Target, ScrollText, Send, RefreshCw, Users, TrendingUp, ExternalLink } from 'lucide-react';
import {
  useRecentEvents,
  useLiveEventStats,
  getLiveStreamUrl,
  sendTestEvent,
  type LiveEvent,
} from '@/lib/hooks/useApi';

const EVENT_ICONS: Record<string, React.ReactNode> = {
  page_view: <Eye size={16} />,
  click: <MousePointer size={16} />,
  form_submit: <FileText size={16} />,
  conversion: <Target size={16} />,
  scroll: <ScrollText size={16} />,
  custom: <Zap size={16} />,
};

const EVENT_COLORS: Record<string, string> = {
  page_view: '#3B82F6',
  click: '#10B981',
  form_submit: '#8B5CF6',
  conversion: '#F59E0B',
  scroll: '#6B7280',
  custom: '#EC4899',
};

function getEventIcon(type: string) {
  return EVENT_ICONS[type] || <Zap size={16} />;
}

function getEventColor(type: string) {
  return EVENT_COLORS[type] || '#6B7280';
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60000) {
    return `${Math.floor(diffMs / 1000)}s ago`;
  }
  if (diffMs < 3600000) {
    return `${Math.floor(diffMs / 60000)}m ago`;
  }

  return date.toLocaleTimeString();
}

export default function LiveDebugPage() {
  const { hasAccess, requiredTier } = useFeatureGate('liveDebug');
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pausedEventsRef = useRef<LiveEvent[]>([]);

  const { data: statsData, refetch: refetchStats } = useLiveEventStats(60);
  const { data: recentData, refetch: refetchRecent } = useRecentEvents({ limit: 50, minutes: 30 });

  // Connect to SSE stream
  const connectSSE = useCallback(() => {
    if (!hasAccess) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No auth token found');
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const streamUrl = getLiveStreamUrl();
    // Note: EventSource doesn't support custom headers, so we need a different approach
    // For now, we'll poll recent events and use initial data
    setIsConnected(true);

    // Load initial events from recent API
    if (recentData?.events) {
      setEvents(recentData.events);
    }
  }, [hasAccess, recentData]);

  // Initialize connection
  useEffect(() => {
    if (hasAccess) {
      connectSSE();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [hasAccess, connectSSE]);

  // Poll for new events (workaround since SSE doesn't support auth headers easily)
  useEffect(() => {
    if (!hasAccess || isPaused) return;

    const interval = setInterval(() => {
      refetchRecent();
      refetchStats();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [hasAccess, isPaused, refetchRecent, refetchStats]);

  // Update events when recent data changes
  useEffect(() => {
    if (recentData?.events && !isPaused) {
      setEvents(recentData.events);
    }
  }, [recentData, isPaused]);

  const handleSendTest = async () => {
    setSendingTest(true);
    setTestResult(null);

    try {
      const result = await sendTestEvent('page_view');
      setTestResult(`Test event sent! ID: ${result.event.id.slice(0, 8)}`);

      // Add test event to list
      setEvents((prev) => [result.event, ...prev].slice(0, 100));

      // Clear message after 3s
      setTimeout(() => setTestResult(null), 3000);
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : 'Failed to send'}`);
    } finally {
      setSendingTest(false);
    }
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const togglePause = () => {
    if (isPaused) {
      // Resume - add any queued events
      setEvents((prev) => [...pausedEventsRef.current, ...prev].slice(0, 100));
      pausedEventsRef.current = [];
    }
    setIsPaused(!isPaused);
  };

  // Feature gate check
  if (!hasAccess) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Live Debug</h1>
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            <WifiOff size={48} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>
            Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Live debug shows real-time tracking events as they happen on your website.
          </p>
          <Link href="/settings/billing" className="btn btn-primary">
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  const filteredEvents = filter === 'all' ? events : events.filter(e => e.event_type === filter);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Live Debug</h1>
          <p className="text-secondary">Real-time tracking events from your website</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Connection Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            color: isConnected ? 'var(--primary)' : '#EF4444',
            fontSize: '14px',
          }}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isPaused ? 'Paused' : isConnected ? 'Connected' : 'Disconnected'}
          </div>

          <button
            className={`btn ${isPaused ? 'btn-primary' : 'btn-secondary'}`}
            onClick={togglePause}
            title={isPaused ? 'Resume stream' : 'Pause stream'}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleSendTest}
            disabled={sendingTest}
            title="Send test event"
          >
            {sendingTest ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
            Test
          </button>
        </div>
      </div>

      {/* Test Result Toast */}
      {testResult && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          background: testResult.startsWith('Error') ? '#EF4444' : 'var(--primary)',
          color: 'white',
          borderRadius: '8px',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease',
        }}>
          {testResult}
        </div>
      )}

      {/* Stats Bar */}
      {statsData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--primary)' }}>
              {statsData.active_visitors}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Users size={14} /> Active Now
            </div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700' }}>
              {statsData.total_events_last_hour}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <TrendingUp size={14} /> Events (1h)
            </div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#10B981' }}>
              {statsData.events_by_type?.['page_view'] || 0}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Eye size={14} /> Page Views
            </div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#F59E0B' }}>
              {statsData.events_by_type?.['conversion'] || 0}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Target size={14} /> Conversions
            </div>
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
          {['all', 'page_view', 'click', 'form_submit', 'conversion'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`btn btn-sm ${filter === type ? 'btn-primary' : 'btn-ghost'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {type === 'all' ? 'All Events' : type.replace('_', ' ')}
            </button>
          ))}
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={clearEvents}
          title="Clear events"
        >
          <Trash2 size={14} /> Clear
        </button>
      </div>

      {/* Event Stream */}
      <div className="card">
        {filteredEvents.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <div style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              <Wifi size={48} />
            </div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Waiting for events...</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Events will appear here in real-time as visitors interact with your site.
            </p>
            <button
              className="btn btn-primary"
              onClick={handleSendTest}
              disabled={sendingTest}
            >
              {sendingTest ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              Send Test Event
            </button>
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {filteredEvents.map((event, index) => (
              <div
                key={event.id || index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-default)',
                  animation: index === 0 ? 'slideIn 0.3s ease' : undefined,
                }}
              >
                {/* Event Type Icon */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: `${getEventColor(event.event_type)}20`,
                  color: getEventColor(event.event_type),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {getEventIcon(event.event_type)}
                </div>

                {/* Event Type Badge */}
                <div style={{
                  padding: '4px 10px',
                  background: `${getEventColor(event.event_type)}20`,
                  color: getEventColor(event.event_type),
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  textTransform: 'capitalize',
                  minWidth: '90px',
                  textAlign: 'center',
                }}>
                  {event.event_type.replace('_', ' ')}
                </div>

                {/* Page URL */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '14px',
                  }}>
                    {event.page_title || event.page_url || '-'}
                  </div>
                  {event.page_url && event.page_title && (
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {new URL(event.page_url).pathname}
                    </div>
                  )}
                </div>

                {/* Device & Location */}
                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                  {event.device_type && (
                    <div style={{ fontSize: '12px', textTransform: 'capitalize' }}>
                      {event.device_type}
                    </div>
                  )}
                  {(event.country || event.city) && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {event.city ? `${event.city}, ${event.country}` : event.country}
                    </div>
                  )}
                </div>

                {/* Visitor ID */}
                <code style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  background: 'var(--surface-subtle)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}>
                  {event.visitor_id.slice(0, 12)}
                </code>

                {/* Timestamp */}
                <span style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  minWidth: '60px',
                  textAlign: 'right',
                }}>
                  {formatTimestamp(event.timestamp)}
                </span>

                {/* View Details */}
                <Link
                  href={`/tracking/visitors/${event.visitor_id}`}
                  style={{ color: 'var(--text-secondary)' }}
                  title="View visitor details"
                >
                  <ExternalLink size={14} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Pages & Referrers */}
      {statsData && (statsData.top_pages?.length > 0 || statsData.top_referrers?.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '24px' }}>
          {/* Top Pages */}
          {statsData.top_pages?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h4>Top Pages (1h)</h4>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {statsData.top_pages.slice(0, 5).map((page, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      borderBottom: i < 4 ? '1px solid var(--border-default)' : undefined,
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {page.url}
                    </span>
                    <span style={{ fontWeight: '600', marginLeft: '12px' }}>{page.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Referrers */}
          {statsData.top_referrers?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h4>Top Referrers (1h)</h4>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {statsData.top_referrers.slice(0, 5).map((ref, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      borderBottom: i < 4 ? '1px solid var(--border-default)' : undefined,
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ref.referrer}
                    </span>
                    <span style={{ fontWeight: '600', marginLeft: '12px' }}>{ref.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
