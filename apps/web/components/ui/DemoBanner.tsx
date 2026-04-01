'use client';

interface DemoBannerProps {
  onConnect?: () => void;
}

export default function DemoBanner({ onConnect }: DemoBannerProps) {
  return (
    <>
      <div className="demo-banner">
        <span className="demo-banner-text">
          <span className="demo-banner-label">Demo Mode</span>
          <span className="demo-banner-desc hide-mobile">
            - You&apos;re viewing sample data. Connect your ad accounts to see real metrics.
          </span>
        </span>
        {onConnect && (
          <button className="demo-banner-btn hide-mobile" onClick={onConnect}>
            Connect Accounts
          </button>
        )}
      </div>
      <style jsx>{`
        .demo-banner {
          background: linear-gradient(90deg, var(--info) 0%, #3B82F6 100%);
          color: white;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 13px;
          font-weight: 500;
        }
        .demo-banner-text {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .demo-banner-label {
          font-size: 14px;
          font-weight: 600;
        }
        .demo-banner-desc {
          opacity: 0.9;
          font-weight: 400;
        }
        .demo-banner-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          padding: 6px 12px;
          color: white;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: background 0.2s;
        }
        .demo-banner-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        @media (max-width: 767px) {
          .demo-banner {
            padding: 8px 12px;
            font-size: 12px;
          }
          .demo-banner-label {
            font-size: 12px;
          }
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
