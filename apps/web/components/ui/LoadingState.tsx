'use client';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingState({ message = 'Loading...', size = 'md' }: LoadingStateProps) {
  const sizes = {
    sm: { spinner: 16, text: '12px', padding: '8px' },
    md: { spinner: 24, text: '14px', padding: '24px' },
    lg: { spinner: 32, text: '16px', padding: '48px' },
  };

  const s = sizes[size];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: s.padding,
        gap: '12px',
      }}
    >
      <div
        style={{
          width: s.spinner,
          height: s.spinner,
          border: '3px solid var(--border-default)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <span style={{ fontSize: s.text, color: 'var(--text-secondary)' }}>{message}</span>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          height: '20px',
          width: '40%',
          background: 'var(--surface-secondary)',
          borderRadius: '4px',
          marginBottom: '16px',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: '32px',
          width: '60%',
          background: 'var(--surface-secondary)',
          borderRadius: '4px',
          marginBottom: '8px',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: '14px',
          width: '30%',
          background: 'var(--surface-secondary)',
          borderRadius: '4px',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            padding: '12px 0',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          {[20, 30, 15, 15, 10, 10].map((width, i) => (
            <div
              key={i}
              style={{
                height: '14px',
                width: `${width}%`,
                background: 'var(--surface-secondary)',
                borderRadius: '4px',
              }}
            />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            style={{
              display: 'flex',
              gap: '16px',
              padding: '12px 0',
              borderBottom: '1px solid var(--border-default)',
              animation: 'pulse 2s ease-in-out infinite',
              animationDelay: `${rowIndex * 0.1}s`,
            }}
          >
            {[20, 30, 15, 15, 10, 10].map((width, i) => (
              <div
                key={i}
                style={{
                  height: '14px',
                  width: `${width}%`,
                  background: 'var(--surface-secondary)',
                  borderRadius: '4px',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '48px',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
      <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>{description}</div>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '48px',
        borderLeft: '4px solid var(--error)',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--error)' }}>
        Something went wrong
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>{message}</div>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
