'use client';

interface BulkActionBarProps {
  selectedCount: number;
  onSuspend: () => void;
  onActivate: () => void;
  onEmail: () => void;
  onExport: () => void;
  onClear: () => void;
  loading?: boolean;
}

export default function BulkActionBar({
  selectedCount,
  onSuspend,
  onActivate,
  onEmail,
  onExport,
  onClear,
  loading = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bulk-action-bar">
      <div className="selected-info">
        <span className="count">{selectedCount}</span>
        <span className="label">user{selectedCount !== 1 ? 's' : ''} selected</span>
        <button onClick={onClear} className="clear-btn">Clear</button>
      </div>

      <div className="actions">
        <button onClick={onSuspend} disabled={loading} className="action-btn suspend">
          Suspend
        </button>
        <button onClick={onActivate} disabled={loading} className="action-btn activate">
          Activate
        </button>
        <button onClick={onEmail} disabled={loading} className="action-btn email">
          Send Email
        </button>
        <button onClick={onExport} disabled={loading} className="action-btn export">
          Export
        </button>
      </div>

      <style jsx>{`
        .bulk-action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--admin-card);
          border: 1px solid var(--admin-accent);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 12px;
          animation: slideIn 0.2s ease;
        }

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

        .selected-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .count {
          background: var(--admin-accent);
          color: white;
          font-weight: 700;
          font-size: 14px;
          padding: 4px 10px;
          border-radius: 6px;
          font-family: 'JetBrains Mono', monospace;
        }

        .label {
          color: var(--admin-text);
          font-size: 14px;
        }

        .clear-btn {
          background: transparent;
          border: none;
          color: var(--admin-text-muted);
          font-size: 13px;
          cursor: pointer;
          padding: 4px 8px;
          margin-left: 8px;
          transition: color 0.15s ease;
        }

        .clear-btn:hover {
          color: var(--admin-text);
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-btn.suspend {
          background: rgba(239, 68, 68, 0.15);
          color: var(--admin-error);
        }

        .action-btn.suspend:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.25);
        }

        .action-btn.activate {
          background: rgba(16, 185, 129, 0.15);
          color: var(--admin-accent);
        }

        .action-btn.activate:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.25);
        }

        .action-btn.email {
          background: rgba(59, 130, 246, 0.15);
          color: var(--admin-info);
        }

        .action-btn.email:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.25);
        }

        .action-btn.export {
          background: var(--admin-inner-bg);
          color: var(--admin-text);
        }

        .action-btn.export:hover:not(:disabled) {
          background: var(--admin-card-hover);
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .bulk-action-bar {
            flex-direction: column;
            gap: 12px;
            padding: 12px;
          }

          .selected-info {
            width: 100%;
            justify-content: center;
          }

          .actions {
            width: 100%;
            flex-wrap: wrap;
            justify-content: center;
          }

          .action-btn {
            flex: 1;
            min-width: calc(50% - 4px);
            padding: 10px 12px;
          }
        }
      `}</style>
    </div>
  );
}
