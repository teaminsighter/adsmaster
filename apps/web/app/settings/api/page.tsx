'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created: string;
  lastUsed: string;
  permissions: string[];
}

const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    name: 'Production Key',
    prefix: 'sk_live_xxxx...x4f2',
    created: '2026-01-15',
    lastUsed: '2 hours ago',
    permissions: ['read', 'write'],
  },
  {
    id: '2',
    name: 'Development Key',
    prefix: 'sk_test_xxxx...x8a1',
    created: '2026-02-20',
    lastUsed: '5 days ago',
    permissions: ['read'],
  },
];

export default function ApiSettingsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  const handleCreate = () => {
    // Mock key generation
    setNewKey('sk_live_' + Math.random().toString(36).substring(2, 15));
    setShowCreate(false);
    setNewKeyName('');
  };

  return (
    <>
      <Header title="API Keys" />
      <div className="page-content">
        <div style={{ maxWidth: '900px' }}>
          {/* New Key Display */}
          {newKey && (
            <div style={{
              padding: '16px',
              marginBottom: '24px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--success)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--success)' }}>
                API Key Created Successfully
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Copy this key now. You won't be able to see it again.
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'var(--surface-primary)',
                borderRadius: '6px',
                fontFamily: 'monospace',
              }}>
                <code style={{ flex: 1 }}>{newKey}</code>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(newKey);
                  }}
                >
                  Copy
                </button>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: '12px' }}
                onClick={() => setNewKey(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Create Key */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Create API Key</span>
            </div>
            {showCreate ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    Key Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Production, Staging, CI/CD"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <button className="btn btn-primary" onClick={handleCreate}>Create Key</button>
                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  API keys allow external applications to access your AdsMaster data
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                  + Create API Key
                </button>
              </div>
            )}
          </div>

          {/* API Keys List */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Active API Keys</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {mockApiKeys.length} keys
              </span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Permissions</th>
                  <th>Created</th>
                  <th>Last Used</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockApiKeys.map((key) => (
                  <tr key={key.id}>
                    <td style={{ fontWeight: 500 }}>{key.name}</td>
                    <td className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {key.prefix}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {key.permissions.map(p => (
                          <span key={p} className="badge badge-neutral" style={{ fontSize: '10px' }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{key.created}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{key.lastUsed}</td>
                    <td className="right">
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }}>
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* API Documentation */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">API Documentation</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <a
                href="/docs/api"
                style={{
                  padding: '16px',
                  background: 'var(--surface-secondary)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>REST API Reference</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Complete API documentation with examples
                </div>
              </a>
              <a
                href="/docs/webhooks"
                style={{
                  padding: '16px',
                  background: 'var(--surface-secondary)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Webhooks</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Set up real-time event notifications
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
