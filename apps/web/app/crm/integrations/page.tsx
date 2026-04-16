// @ts-nocheck
'use client';

import { useState } from 'react';
import { useFeatureGate } from '@/lib/contexts/SubscriptionContext';
import Link from 'next/link';
import {
  useCRMIntegrations,
  useCRMSyncLogs,
  createCRMIntegration,
  deleteCRMIntegration,
  testCRMIntegration,
  syncCRMIntegration,
  updateCRMIntegration,
  CRMIntegration
} from '@/lib/hooks/useApi';
import { Link2, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Settings, Loader2, ExternalLink } from 'lucide-react';

// Provider configurations
const PROVIDERS = [
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    icon: '🟢',
    description: 'Sync leads and deals with Pipedrive CRM',
    status: 'available',
    fields: [
      { key: 'api_token', label: 'API Token', type: 'password', required: true, help: 'Find in Settings > Personal preferences > API' },
      { key: 'company_domain', label: 'Company Domain', type: 'text', required: true, help: 'Your Pipedrive subdomain (e.g., mycompany for mycompany.pipedrive.com)' }
    ]
  },
  {
    id: 'activecampaign',
    name: 'ActiveCampaign',
    icon: '🔵',
    description: 'Sync contacts and automations with ActiveCampaign',
    status: 'available',
    fields: [
      { key: 'api_url', label: 'API URL', type: 'text', required: true, help: 'Your ActiveCampaign API URL (e.g., https://youraccountname.api-us1.com)' },
      { key: 'api_key', label: 'API Key', type: 'password', required: true, help: 'Find in Settings > Developer' }
    ]
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    icon: '🟠',
    description: 'Two-way sync with HubSpot CRM',
    status: 'coming_soon',
    fields: []
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    icon: '☁️',
    description: 'Enterprise-grade Salesforce integration',
    status: 'coming_soon',
    fields: []
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    icon: '🟡',
    description: 'Connect with Zoho CRM suite',
    status: 'coming_soon',
    fields: []
  }
];

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    connected: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', icon: <CheckCircle size={12} />, label: 'Connected' },
    pending: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', icon: <Clock size={12} />, label: 'Pending' },
    error: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', icon: <XCircle size={12} />, label: 'Error' },
    expired: { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', icon: <AlertCircle size={12} />, label: 'Expired' },
  };

  const config = configs[status] || configs.pending;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: '500',
      color: config.color,
      background: config.bg
    }}>
      {config.icon}
      {config.label}
    </span>
  );
}

export default function CRMIntegrationsPage() {
  const { hasAccess, requiredTier } = useFeatureGate('crmIntegrations');
  const { data: integrations, loading, error, refetch } = useCRMIntegrations();
  const { data: syncLogs } = useCRMSyncLogs(undefined, 10);

  // Modal states
  const [showConnectModal, setShowConnectModal] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState<CRMIntegration | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [integrationName, setIntegrationName] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Sync states
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());

  if (!hasAccess) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>CRM Integrations</h1>
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <Link2 size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Connect your CRM to automatically sync leads and conversions.
          </p>
          <Link href="/settings/billing" className="btn btn-primary">
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  const handleConnect = async (providerId: string) => {
    const provider = PROVIDERS.find(p => p.id === providerId);
    if (!provider) return;

    // Validate required fields
    for (const field of provider.fields) {
      if (field.required && !credentials[field.key]) {
        setConnectError(`${field.label} is required`);
        return;
      }
    }

    setConnecting(true);
    setConnectError(null);

    try {
      await createCRMIntegration({
        provider: providerId,
        name: integrationName || provider.name,
        credentials,
        sync_direction: 'both',
        sync_frequency: 'realtime'
      });

      setShowConnectModal(null);
      setCredentials({});
      setIntegrationName('');
      refetch();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async (integrationId: string) => {
    setTestingIds(prev => new Set(prev).add(integrationId));
    try {
      const result = await testCRMIntegration(integrationId);
      if (result.success) {
        alert('Connection successful: ' + result.message);
      } else {
        alert('Connection failed: ' + result.message);
      }
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTestingIds(prev => {
        const next = new Set(prev);
        next.delete(integrationId);
        return next;
      });
    }
  };

  const handleSync = async (integrationId: string) => {
    setSyncingIds(prev => new Set(prev).add(integrationId));
    try {
      const result = await syncCRMIntegration(integrationId, 'both');
      alert(result.message);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(integrationId);
        return next;
      });
    }
  };

  const handleDelete = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) return;

    try {
      await deleteCRMIntegration(integrationId);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // Get connected provider IDs
  const connectedProviders = new Set((integrations || []).map(i => i.provider));

  const currentProvider = PROVIDERS.find(p => p.id === showConnectModal);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600' }}>CRM Integrations</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Connect your CRM to sync leads, contacts, and conversions
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      )}

      {/* Connected integrations */}
      {integrations && integrations.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Connected Integrations</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {integrations.map(integration => {
              const provider = PROVIDERS.find(p => p.id === integration.provider);
              return (
                <div key={integration.id} style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '32px' }}>{provider?.icon || '🔗'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{integration.name}</h3>
                        <StatusBadge status={integration.connection_status} />
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {provider?.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(integration.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Stats */}
                  <div style={{
                    background: 'var(--surface-subtle)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '12px',
                    fontSize: '13px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Last sync:</span>
                      <span>{integration.last_sync_at ? new Date(integration.last_sync_at).toLocaleString() : 'Never'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Last status:</span>
                      <span style={{ color: integration.last_sync_status === 'success' ? '#10B981' : integration.last_sync_status === 'failed' ? '#EF4444' : 'inherit' }}>
                        {integration.last_sync_status || 'N/A'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Total synced:</span>
                      <span>{integration.total_synced.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleTest(integration.id)}
                      disabled={testingIds.has(integration.id)}
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                    >
                      {testingIds.has(integration.id) ? (
                        <><Loader2 size={14} className="animate-spin" /> Testing...</>
                      ) : (
                        <>Test</>
                      )}
                    </button>
                    <button
                      onClick={() => handleSync(integration.id)}
                      disabled={syncingIds.has(integration.id) || integration.connection_status !== 'connected'}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      {syncingIds.has(integration.id) ? (
                        <><Loader2 size={14} className="animate-spin" /> Syncing...</>
                      ) : (
                        <><RefreshCw size={14} /> Sync Now</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available integrations */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          {integrations && integrations.length > 0 ? 'Add More Integrations' : 'Available Integrations'}
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px'
        }}>
          {PROVIDERS.filter(p => !connectedProviders.has(p.id)).map(provider => (
            <div key={provider.id} style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '20px',
              opacity: provider.status === 'coming_soon' ? 0.6 : 1
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '32px' }}>{provider.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{provider.name}</h3>
                    {provider.status === 'coming_soon' && (
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: 'var(--surface-subtle)',
                        color: 'var(--text-secondary)',
                        borderRadius: '4px',
                        fontWeight: '500'
                      }}>
                        COMING SOON
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {provider.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => provider.status === 'available' && setShowConnectModal(provider.id)}
                className={provider.status === 'available' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ width: '100%' }}
                disabled={provider.status === 'coming_soon'}
              >
                {provider.status === 'available' ? `Connect ${provider.name}` : 'Coming Soon'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent sync logs */}
      {syncLogs && syncLogs.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Recent Sync Activity</h2>
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Direction</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Records</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map(log => (
                  <tr key={log.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '12px 16px' }}>{new Date(log.started_at).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{log.sync_type}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{log.direction.replace('_', ' ')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        color: log.status === 'completed' ? '#10B981' : log.status === 'failed' ? '#EF4444' : '#F59E0B'
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {log.success_count} / {log.total_records}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Connect Modal */}
      {showConnectModal && currentProvider && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }} onClick={() => setShowConnectModal(null)}>
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '32px' }}>{currentProvider.icon}</span>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Connect {currentProvider.name}</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {currentProvider.description}
                </p>
              </div>
            </div>

            {connectError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: '#EF4444',
                fontSize: '14px'
              }}>
                {connectError}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Integration Name
              </label>
              <input
                type="text"
                className="input"
                placeholder={currentProvider.name}
                value={integrationName}
                onChange={e => setIntegrationName(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {currentProvider.fields.map(field => (
              <div key={field.key} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {field.label} {field.required && <span style={{ color: '#EF4444' }}>*</span>}
                </label>
                <input
                  type={field.type}
                  className="input"
                  placeholder={field.label}
                  value={credentials[field.key] || ''}
                  onChange={e => setCredentials({ ...credentials, [field.key]: e.target.value })}
                  style={{ width: '100%' }}
                />
                {field.help && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {field.help}
                  </p>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => {
                setShowConnectModal(null);
                setCredentials({});
                setConnectError(null);
              }}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleConnect(showConnectModal)}
                disabled={connecting}
              >
                {connecting ? (
                  <><Loader2 size={16} className="animate-spin" /> Connecting...</>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
