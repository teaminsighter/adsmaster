'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { RecordingMarker } from '@/lib/hooks/useApi';

// Types for rrweb events
interface RRWebEvent {
  type: number;
  data: Record<string, unknown>;
  timestamp: number;
}

interface SessionPlayerProps {
  events: RRWebEvent[];
  markers?: RecordingMarker[];
  width?: number;
  height?: number;
  autoPlay?: boolean;
  showController?: boolean;
  onMarkerClick?: (marker: RecordingMarker) => void;
  onTimeUpdate?: (time: number) => void;
  onStateChange?: (state: 'playing' | 'paused' | 'ended') => void;
}

export default function SessionPlayer({
  events,
  markers = [],
  width = 1024,
  height = 576,
  autoPlay = false,
  showController = true,
  onMarkerClick,
  onTimeUpdate,
  onStateChange,
}: SessionPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<unknown>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate duration from events
  useEffect(() => {
    if (events.length > 0) {
      const startTime = events[0].timestamp;
      const endTime = events[events.length - 1].timestamp;
      setDuration((endTime - startTime) / 1000);
    }
  }, [events]);

  // Initialize rrweb player
  useEffect(() => {
    if (!containerRef.current || events.length === 0) return;

    const initPlayer = async () => {
      try {
        // Dynamic import for rrweb-player (client-side only)
        const rrwebPlayer = await import('rrweb-player');
        const Replayer = rrwebPlayer.default;

        // Clear previous player
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Create player instance
        const player = new Replayer({
          target: containerRef.current!,
          props: {
            events: events,
            width: width,
            height: height,
            autoPlay: autoPlay,
            showController: false, // We use our own controller
            speedOption: [0.5, 1, 2, 4, 8],
            skipInactive: true,
            showWarning: false,
            showDebug: false,
            mouseTail: {
              strokeStyle: 'var(--primary)',
              lineWidth: 3,
            },
          },
        });

        playerRef.current = player;
        setIsLoaded(true);
        setError(null);

        // Listen to player events
        const replayer = player.getReplayer();
        if (replayer) {
          replayer.on('start', () => {
            setIsPlaying(true);
            onStateChange?.('playing');
          });

          replayer.on('pause', () => {
            setIsPlaying(false);
            onStateChange?.('paused');
          });

          replayer.on('finish', () => {
            setIsPlaying(false);
            onStateChange?.('ended');
          });
        }
      } catch (err) {
        console.error('Failed to initialize rrweb player:', err);
        setError('Failed to load session player');
      }
    };

    initPlayer();

    return () => {
      // Cleanup
      if (playerRef.current) {
        try {
          // @ts-expect-error - rrweb-player types
          playerRef.current.$destroy?.();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [events, width, height, autoPlay, onStateChange]);

  // Update current time periodically
  useEffect(() => {
    if (!isPlaying || !playerRef.current) return;

    const interval = setInterval(() => {
      try {
        // @ts-expect-error - rrweb-player types
        const replayer = playerRef.current?.getReplayer?.();
        if (replayer) {
          const metadata = replayer.getMetaData();
          const current = replayer.getCurrentTime();
          const startTime = metadata.startTime || events[0]?.timestamp || 0;
          const time = (current - startTime) / 1000;
          setCurrentTime(Math.max(0, time));
          onTimeUpdate?.(time);
        }
      } catch {
        // Ignore errors
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, events, onTimeUpdate]);

  // Play/pause toggle
  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;

    try {
      // @ts-expect-error - rrweb-player types
      const replayer = playerRef.current.getReplayer();
      if (replayer) {
        if (isPlaying) {
          replayer.pause();
        } else {
          replayer.play();
        }
      }
    } catch (err) {
      console.error('Play/pause error:', err);
    }
  }, [isPlaying]);

  // Seek to time
  const seekTo = useCallback((timeSeconds: number) => {
    if (!playerRef.current || events.length === 0) return;

    try {
      // @ts-expect-error - rrweb-player types
      const replayer = playerRef.current.getReplayer();
      if (replayer) {
        const startTime = events[0].timestamp;
        const targetTime = startTime + timeSeconds * 1000;
        replayer.pause(targetTime);
        setCurrentTime(timeSeconds);
      }
    } catch (err) {
      console.error('Seek error:', err);
    }
  }, [events]);

  // Change playback speed
  const changeSpeed = useCallback((speed: number) => {
    if (!playerRef.current) return;

    try {
      // @ts-expect-error - rrweb-player types
      const replayer = playerRef.current.getReplayer();
      if (replayer) {
        replayer.setConfig({ speed });
        setPlaybackSpeed(speed);
      }
    } catch (err) {
      console.error('Speed change error:', err);
    }
  }, []);

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get marker position as percentage
  const getMarkerPosition = (marker: RecordingMarker): number => {
    if (duration === 0) return 0;
    return (marker.timestamp_ms / 1000 / duration) * 100;
  };

  // Get marker color based on type
  const getMarkerColor = (type: string): string => {
    const colors: Record<string, string> = {
      rage_click: '#EF4444',
      dead_click: '#F59E0B',
      error: '#EF4444',
      page_view: '#3B82F6',
      click: '#10B981',
      conversion: '#8B5CF6',
      custom: '#6B7280',
    };
    return colors[type] || colors.custom;
  };

  if (error) {
    return (
      <div style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-subtle)',
        borderRadius: '8px',
        color: 'var(--text-secondary)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>:(</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={{
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-subtle)',
        borderRadius: '8px',
        color: 'var(--text-secondary)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>No recording data</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Player Container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: width,
          aspectRatio: `${width}/${height}`,
          background: '#000',
          borderRadius: '8px 8px 0 0',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {!isLoaded && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-subtle)',
          }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading session...
            </div>
          </div>
        )}
      </div>

      {/* Custom Controller */}
      {showController && (
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '12px 16px',
        }}>
          {/* Progress Bar */}
          <div style={{ marginBottom: '12px', position: 'relative' }}>
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                cursor: 'pointer',
                accentColor: 'var(--primary)',
              }}
            />

            {/* Markers on timeline */}
            {markers.map((marker) => (
              <button
                key={marker.id}
                onClick={() => {
                  seekTo(marker.timestamp_ms / 1000);
                  onMarkerClick?.(marker);
                }}
                title={marker.label || marker.marker_type}
                style={{
                  position: 'absolute',
                  left: `${getMarkerPosition(marker)}%`,
                  top: '-2px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: getMarkerColor(marker.marker_type),
                  border: '2px solid white',
                  cursor: 'pointer',
                  transform: 'translateX(-50%)',
                  zIndex: 1,
                }}
              />
            ))}
          </div>

          {/* Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--primary)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
              }}
            >
              {isPlaying ? '||' : '\u25B6'}
            </button>

            {/* Time Display */}
            <div style={{
              fontSize: '14px',
              fontFamily: 'monospace',
              color: 'var(--text-secondary)',
              minWidth: '100px',
            }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Speed Control */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Speed:</span>
              {[0.5, 1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  onClick={() => changeSpeed(speed)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-default)',
                    background: playbackSpeed === speed ? 'var(--primary)' : 'transparent',
                    color: playbackSpeed === speed ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Markers Legend */}
          {markers.length > 0 && (
            <div style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-default)',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              fontSize: '12px',
            }}>
              {['rage_click', 'dead_click', 'error', 'page_view', 'conversion'].map((type) => {
                const count = markers.filter(m => m.marker_type === type).length;
                if (count === 0) return null;
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: getMarkerColor(type),
                    }} />
                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {type.replace('_', ' ')} ({count})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* rrweb-player styles */}
      <style jsx global>{`
        .rr-player {
          background: #000 !important;
        }
        .rr-player__frame {
          background: #fff !important;
        }
        .replayer-wrapper {
          position: relative !important;
        }
        .replayer-mouse {
          width: 20px !important;
          height: 20px !important;
        }
        .replayer-mouse::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          opacity: 0.3;
          animation: click-ring 0.5s ease-out;
        }
        @keyframes click-ring {
          from {
            transform: scale(0.5);
            opacity: 0.5;
          }
          to {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
