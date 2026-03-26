'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { useApiKeys, createApiKey, revokeApiKey } from '@/lib/hooks/useApi';

// Format relative time
const formatRelativeTime = (dateStr: string | null) => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

export default function ApiSettingsPage() {
  // TODO: Get real organization ID from auth context
  const organizationId = 'demo_org';
  const { data, loading, error, refetch } = useApiKeys(organizationId);

  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read']);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;

    setCreating(true);
    setErrorMessage('');
    try {
      const result = await createApiKey(organizationId, {
        name: newKeyName,
        permissions: newKeyPermissions,
      });
      setNewKey(result.secret_key);
      setShowCreate(false);
      setNewKeyName('');
      setNewKeyPermissions(['read']);
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to revoke "${keyName}"? This action cannot be undone.`)) return;

    try {
      await revokeApiKey(organizationId, keyId);
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  };

  const togglePermission = (permission: string) => {
    setNewKeyPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  if (loading) {
    return (
      <>
        <Header title="API Keys" />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading API keys...</div>
          </div>
        </div>
      </>
    );
  }

  const apiKeys = data?.api_keys || [];

  return (
    <>
      <Header title="API Keys" />
      <div className="page-content">
        <div style={{ maxWidth: '900px' }}>
          {/* Error Message */}
          {errorMessage && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '24px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
            }}>
              {errorMessage}
            </div>
          )}

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
                <code style={{ flex: 1, wordBreak: 'break-all' }}>{newKey}</code>
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
              {data && (
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {data.total} / {data.max_keys} keys
                </span>
              )}
            </div>
            {showCreate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
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
                    disabled={creating}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    Permissions
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['read', 'write', 'admin'].map((perm) => (
                      <label
                        key={perm}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: creating ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={newKeyPermissions.includes(perm)}
                          onChange={() => togglePermission(perm)}
                          disabled={creating}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span style={{ textTransform: 'capitalize' }}>{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreate}
                    disabled={creating || !newKeyName.trim() || newKeyPermissions.length === 0}
                  >
                    {creating ? 'Creating...' : 'Create Key'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setShowCreate(false)}
                    disabled={creating}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  API keys allow external applications to access your AdsMaster data
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCreate(true)}
                  disabled={!!(data && data.total >= data.max_keys)}
                >
                  + Create API Key
                </button>
              </div>
            )}
            {data && data.total >= data.max_keys && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--warning)' }}>
                You've reached the maximum number of API keys for your plan.
              </div>
            )}
          </div>

          {/* API Keys List */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Active API Keys</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {apiKeys.filter((k) => k.is_active).length} active keys
              </span>
            </div>
            {apiKeys.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No API keys created yet
              </div>
            ) : (
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
                  {apiKeys.map((key) => (
                    <tr key={key.id} style={{ opacity: key.is_active ? 1 : 0.5 }}>
                      <td style={{ fontWeight: 500 }}>{key.name}</td>
                      <td className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {key.key_prefix}...
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
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(key.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatRelativeTime(key.last_used_at)}
                        {key.usage_count > 0 && (
                          <span style={{ marginLeft: '4px' }}>({key.usage_count.toLocaleString()} calls)</span>
                        )}
                      </td>
                      <td className="right">
                        {key.is_active ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--error)' }}
                            onClick={() => handleRevoke(key.id, key.name)}
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="badge badge-neutral">Revoked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
