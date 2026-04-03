'use client';

import { useState } from 'react';
import { useSystemConfig, updateConfig } from '@/lib/hooks/useAdminApi';

export default function AdminConfigPage() {
  const { data, loading, error, refetch } = useSystemConfig();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEdit = (key: string, value: unknown) => {
    setEditingKey(key);
    setEditValue(JSON.stringify(value, null, 2));
  };

  const handleSave = async () => {
    if (!editingKey) return;
    setSaving(true);
    try {
      const parsedValue = JSON.parse(editValue);
      await updateConfig(editingKey, parsedValue);
      setEditingKey(null);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const formatValue = (value: unknown): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="config-page">
      <div className="page-header">
        <h1 className="page-title">System Configuration</h1>
        <button onClick={() => refetch()} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading configuration...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : (
        <div className="config-list">
          {data?.configs.map((config) => (
            <div key={config.key} className="config-item">
              <div className="config-header">
                <div className="config-key">{config.key}</div>
                <div className="config-meta">
                  {config.updated_at && (
                    <span className="config-updated">
                      Updated: {new Date(config.updated_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {config.description && (
                <div className="config-description">{config.description}</div>
              )}

              {editingKey === config.key ? (
                <div className="config-editor">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="config-textarea"
                    rows={Math.min(10, editValue.split('\n').length + 1)}
                  />
                  <div className="editor-actions">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="save-btn"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={handleCancel} className="cancel-btn">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="config-value-wrapper">
                  <pre className="config-value">{formatValue(config.value)}</pre>
                  <button
                    onClick={() => handleEdit(config.key, config.value)}
                    className="edit-btn"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}

          {!data?.configs.length && (
            <div className="empty">No configuration items found</div>
          )}
        </div>
      )}

      <style jsx>{`
        .config-page {
          max-width: 900px;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0;
        }

        .refresh-btn {
          padding: 10px 16px;
          background: #334155;
          border: none;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 14px;
          cursor: pointer;
        }

        .refresh-btn:hover {
          background: #475569;
        }

        .loading, .error, .empty {
          padding: 40px;
          text-align: center;
          color: #94a3b8;
        }

        .error {
          color: #f87171;
        }

        .config-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .config-item {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 20px;
        }

        .config-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .config-key {
          font-size: 16px;
          font-weight: 600;
          color: #10b981;
          font-family: monospace;
        }

        .config-meta {
          display: flex;
          gap: 16px;
        }

        .config-updated {
          font-size: 12px;
          color: #64748b;
        }

        .config-description {
          font-size: 13px;
          color: #94a3b8;
          margin-bottom: 12px;
        }

        .config-value-wrapper {
          position: relative;
        }

        .config-value {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 12px;
          font-size: 13px;
          color: #e2e8f0;
          font-family: monospace;
          overflow-x: auto;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .edit-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 4px 12px;
          background: #334155;
          border: none;
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 12px;
          cursor: pointer;
        }

        .edit-btn:hover {
          background: #475569;
        }

        .config-editor {
          margin-top: 8px;
        }

        .config-textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid #475569;
          border-radius: 8px;
          padding: 12px;
          font-size: 13px;
          color: #e2e8f0;
          font-family: monospace;
          resize: vertical;
          outline: none;
        }

        .config-textarea:focus {
          border-color: #10b981;
        }

        .editor-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .save-btn {
          padding: 8px 16px;
          background: #10b981;
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }

        .save-btn:hover:not(:disabled) {
          background: #059669;
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cancel-btn {
          padding: 8px 16px;
          background: #334155;
          border: none;
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 14px;
          cursor: pointer;
        }

        .cancel-btn:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
