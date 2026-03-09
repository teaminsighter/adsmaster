'use client';

interface DemoBannerProps {
  onConnect?: () => void;
}

export default function DemoBanner({ onConnect }: DemoBannerProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(90deg, var(--info) 0%, #3B82F6 100%)',
        color: 'white',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '13px',
        fontWeight: 500,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '16px' }}>Demo Mode</span>
        <span style={{ opacity: 0.9, fontWeight: 400 }}>
          - You&apos;re viewing sample data. Connect your ad accounts to see real metrics.
        </span>
      </span>
      {onConnect && (
        <button
          onClick={onConnect}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            padding: '6px 12px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
        >
          Connect Accounts
        </button>
      )}
    </div>
  );
}
