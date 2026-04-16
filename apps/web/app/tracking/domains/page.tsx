// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useFeatureGate } from '@/lib/contexts/SubscriptionContext';
import Link from 'next/link';
import {
  useDomains,
  useDNSTemplates,
  createDomain,
  deleteDomain,
  verifyDomain,
  updateDomain,
  refreshDomainVerificationCode,
  Domain,
  DNSTemplate,
  VerificationResult
} from '@/lib/hooks/useApi';
import { Globe, Plus, Trash2, CheckCircle, XCircle, Clock, RefreshCw, ExternalLink, Copy, AlertCircle, Shield, ToggleLeft, ToggleRight, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    verified: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', icon: <CheckCircle size={14} /> },
    pending: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', icon: <Clock size={14} /> },
    verifying: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', icon: <RefreshCw size={14} className="animate-spin" /> },
    failed: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', icon: <XCircle size={14} /> },
    expired: { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', icon: <AlertCircle size={14} /> },
  };

  const config = configs[status] || configs.pending;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '500',
      color: config.color,
      background: config.bg
    }}>
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Domain card component
function DomainCard({
  domain,
  onVerify,
  onDelete,
  onToggle,
  onShowInstructions,
  verifying
}: {
  domain: Domain;
  onVerify: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onShowInstructions: () => void;
  verifying: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <Globe size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{domain.domain}</h3>
            <StatusBadge status={domain.status} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Added {new Date(domain.created_at).toLocaleDateString()}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {domain.status === 'verified' && (
            <button
              onClick={onToggle}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                color: domain.is_active ? '#10B981' : 'var(--text-secondary)'
              }}
              title={domain.is_active ? 'Domain active' : 'Domain inactive'}
            >
              {domain.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
          )}
          <button
            onClick={onDelete}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              color: 'var(--text-secondary)'
            }}
            title="Delete domain"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* CNAME Target */}
      <div style={{
        background: 'var(--surface-subtle)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            CNAME Target
          </span>
          <button
            onClick={() => copyToClipboard(domain.cname_target)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px'
            }}
          >
            <Copy size={14} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <code style={{ fontSize: '13px', fontFamily: 'var(--font-mono, monospace)' }}>
          {domain.subdomain}.{domain.root_domain} → {domain.cname_target}
        </code>
      </div>

      {/* SSL Status */}
      {domain.status === 'verified' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Shield size={16} style={{ color: domain.ssl_status === 'active' ? '#10B981' : '#F59E0B' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            SSL: {domain.ssl_status === 'active' ? 'Active' : domain.ssl_status === 'provisioning' ? 'Provisioning...' : 'Pending'}
          </span>
        </div>
      )}

      {/* Error message */}
      {domain.last_verification_error && domain.status !== 'verified' && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#EF4444'
        }}>
          <strong>Last error:</strong> {domain.last_verification_error}
        </div>
      )}

      {/* Stats (for verified domains) */}
      {domain.status === 'verified' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{
            background: 'var(--surface-subtle)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>
              {domain.request_count.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Total Requests
            </div>
          </div>
          <div style={{
            background: 'var(--surface-subtle)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
              {domain.last_request_at
                ? new Date(domain.last_request_at).toLocaleString()
                : 'No requests yet'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Last Request
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {domain.status !== 'verified' && (
          <button
            onClick={onVerify}
            disabled={verifying}
            className="btn btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {verifying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Verify DNS
              </>
            )}
          </button>
        )}
        <button
          onClick={onShowInstructions}
          className="btn btn-secondary"
          style={{ flex: domain.status === 'verified' ? 1 : 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <ExternalLink size={16} />
          Setup Instructions
        </button>
      </div>
    </div>
  );
}

export default function DomainsPage() {
  const { hasAccess, requiredTier } = useFeatureGate('firstPartyDomains');
  const { data: domainsData, loading, error, refetch } = useDomains();
  const { data: templates } = useDNSTemplates();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState<Domain | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('other');

  // Form state
  const [subdomain, setSubdomain] = useState('track');
  const [rootDomain, setRootDomain] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'cname' | 'txt'>('cname');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Verification state
  const [verifyingDomains, setVerifyingDomains] = useState<Set<string>>(new Set());
  const [verificationResults, setVerificationResults] = useState<Record<string, VerificationResult>>({});

  if (!hasAccess) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>First-Party Domains</h1>
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <Globe size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            First-party domains improve tracking accuracy by bypassing ad blockers and cookie restrictions.
          </p>
          <Link href="/settings/billing" className="btn btn-primary">
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  const handleCreateDomain = async () => {
    if (!subdomain || !rootDomain) {
      setCreateError('Please enter both subdomain and root domain');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const fullDomain = `${subdomain}.${rootDomain}`;
      await createDomain({ domain: fullDomain, verification_method: verificationMethod });
      setShowAddModal(false);
      setSubdomain('track');
      setRootDomain('');
      refetch();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create domain');
    } finally {
      setCreating(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifyingDomains(prev => new Set(prev).add(domainId));

    try {
      const result = await verifyDomain(domainId);
      setVerificationResults(prev => ({ ...prev, [domainId]: result }));
      refetch();
    } catch (err) {
      // Error is shown in the domain card
    } finally {
      setVerifyingDomains(prev => {
        const next = new Set(prev);
        next.delete(domainId);
        return next;
      });
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return;

    try {
      await deleteDomain(domainId);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete domain');
    }
  };

  const handleToggleDomain = async (domain: Domain) => {
    try {
      await updateDomain(domain.id, { is_active: !domain.is_active });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update domain');
    }
  };

  const selectedTemplate = templates?.find(t => t.provider === selectedProvider);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>First-Party Domains</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Setup CNAME domains for better tracking accuracy
            {domainsData && (
              <span style={{ marginLeft: '8px' }}>
                ({domainsData.total} / {domainsData.limit} domains)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          disabled={domainsData && !domainsData.can_add_more}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} />
          Add Domain
        </button>
      </div>

      {/* Info Banner */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        gap: '12px'
      }}>
        <span style={{ fontSize: '20px' }}>💡</span>
        <div>
          <strong>Why use first-party domains?</strong>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            First-party tracking domains (e.g., track.yourdomain.com) help bypass ad blockers
            and comply with browser cookie restrictions, improving tracking accuracy by up to 30%.
          </p>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center'
        }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading domains...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <AlertCircle size={32} style={{ color: '#EF4444', marginBottom: '12px' }} />
          <p style={{ color: '#EF4444' }}>{error}</p>
          <button onClick={refetch} className="btn btn-secondary" style={{ marginTop: '16px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Domain list */}
      {!loading && !error && domainsData && (
        <>
          {domainsData.domains.length === 0 ? (
            <div style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '60px 40px',
              textAlign: 'center'
            }}>
              <Globe size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
              <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>No domains configured</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                Add a CNAME domain to enable first-party tracking on your website.
              </p>
              <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                <Plus size={18} style={{ marginRight: '8px' }} />
                Add Your First Domain
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {domainsData.domains.map(domain => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  onVerify={() => handleVerifyDomain(domain.id)}
                  onDelete={() => handleDeleteDomain(domain.id)}
                  onToggle={() => handleToggleDomain(domain)}
                  onShowInstructions={() => setShowInstructionsModal(domain)}
                  verifying={verifyingDomains.has(domain.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Domain Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Globe size={24} style={{ color: 'var(--primary)' }} />
              Add First-Party Domain
            </h2>

            {createError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: '#EF4444',
                fontSize: '14px'
              }}>
                {createError}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Domain
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="track"
                  value={subdomain}
                  onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  style={{ width: '120px' }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>.</span>
                <input
                  type="text"
                  className="input"
                  placeholder="yourdomain.com"
                  value={rootDomain}
                  onChange={e => setRootDomain(e.target.value.toLowerCase())}
                  style={{ flex: 1 }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                e.g., track.yourdomain.com, analytics.yourdomain.com
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Verification Method
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  border: `2px solid ${verificationMethod === 'cname' ? 'var(--primary)' : 'var(--border-default)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="method"
                    checked={verificationMethod === 'cname'}
                    onChange={() => setVerificationMethod('cname')}
                  />
                  <div>
                    <div style={{ fontWeight: '500' }}>CNAME Record</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Recommended</div>
                  </div>
                </label>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  border: `2px solid ${verificationMethod === 'txt' ? 'var(--primary)' : 'var(--border-default)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="method"
                    checked={verificationMethod === 'txt'}
                    onChange={() => setVerificationMethod('txt')}
                  />
                  <div>
                    <div style={{ fontWeight: '500' }}>TXT Record</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Alternative</div>
                  </div>
                </label>
              </div>
            </div>

            <div style={{
              background: 'var(--surface-subtle)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <strong style={{ fontSize: '14px' }}>Next Steps</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
                After adding the domain, you&apos;ll need to configure your DNS settings. We&apos;ll provide
                detailed instructions for your DNS provider.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateDomain}
                disabled={creating || !subdomain || !rootDomain}
              >
                {creating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ marginRight: '8px' }} />
                    Adding...
                  </>
                ) : (
                  'Add Domain'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Instructions Modal */}
      {showInstructionsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }} onClick={() => setShowInstructionsModal(null)}>
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: '12px',
            padding: '24px',
            width: '600px',
            maxWidth: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>
              DNS Setup Instructions
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Configure DNS for <strong>{showInstructionsModal.domain}</strong>
            </p>

            {/* Provider selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Select your DNS provider
              </label>
              <select
                className="input"
                value={selectedProvider}
                onChange={e => setSelectedProvider(e.target.value)}
                style={{ width: '100%' }}
              >
                {templates?.map(t => (
                  <option key={t.provider} value={t.provider}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* DNS Record to add */}
            <div style={{
              background: 'var(--surface-subtle)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                {showInstructionsModal.verification_method === 'cname' ? 'CNAME Record' : 'TXT Record'} to Add:
              </h4>
              {showInstructionsModal.verification_method === 'cname' ? (
                <table style={{ width: '100%', fontSize: '13px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 0', color: 'var(--text-secondary)' }}>Type:</td>
                      <td style={{ padding: '4px 0', fontFamily: 'var(--font-mono)' }}>CNAME</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', color: 'var(--text-secondary)' }}>Name/Host:</td>
                      <td style={{ padding: '4px 0', fontFamily: 'var(--font-mono)' }}>{showInstructionsModal.subdomain}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', color: 'var(--text-secondary)' }}>Target/Value:</td>
                      <td style={{ padding: '4px 0', fontFamily: 'var(--font-mono)' }}>{showInstructionsModal.cname_target}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', color: 'var(--text-secondary)' }}>TTL:</td>
                      <td style={{ padding: '4px 0', fontFamily: 'var(--font-mono)' }}>Auto or 3600</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table style={{ width: '100%', fontSize: '13px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 0', color: 'var(--text-secondary)' }}>Type:</td>
                      <td style={{ padding: '4px 0', fontFamily: 'var(--font-mono)' }}>TXT</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', color: 'var(--text-secondary)' }}>Name/Host:</td>
                      <td style={{ padding: '4px 0', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                        _adsmaster-verification.{showInstructionsModal.domain}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0', color: 'var(--text-secondary)' }}>Value:</td>
                      <td style={{ padding: '4px 0', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                        adsmaster-verification={showInstructionsModal.verification_code}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Provider instructions */}
            {selectedTemplate && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  Setup Steps for {selectedTemplate.name}:
                </h4>
                <ol style={{ paddingLeft: '20px', fontSize: '14px' }}>
                  {selectedTemplate.instructions.map((step, i) => (
                    <li key={i} style={{ marginBottom: '12px' }}>
                      <strong>{step.title}</strong>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {step.description}
                      </p>
                    </li>
                  ))}
                </ol>
                {selectedTemplate.provider_docs_url && (
                  <a
                    href={selectedTemplate.provider_docs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: 'var(--primary)',
                      fontSize: '14px'
                    }}
                  >
                    <ExternalLink size={14} />
                    View {selectedTemplate.name} documentation
                  </a>
                )}
              </div>
            )}

            {/* Propagation notice */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '24px',
              fontSize: '13px'
            }}>
              <strong style={{ color: '#F59E0B' }}>Note:</strong> DNS changes can take up to{' '}
              {selectedTemplate?.estimated_propagation_minutes || 60} minutes to propagate.
              After making changes, wait a few minutes before verifying.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowInstructionsModal(null)}>
                Close
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
