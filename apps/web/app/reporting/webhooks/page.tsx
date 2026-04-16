'use client';

import { useState } from 'react';
import { useFeatureGate } from '@/lib/contexts/SubscriptionContext';
import Link from 'next/link';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'paused' | 'failing';
  lastTriggered: string;
  successRate: number;
}

const DEMO_WEBHOOKS: Webhook[] = [
  {
    id: '1',
    name: 'Zapier - New Lead',
    url: 'https://hooks.zapier.com/hooks/catch/xxx',
    events: ['conversion.created'],
    status: 'active',
    lastTriggered: '5 min ago',
    successRate: 99.5
  },
  {
    id: '2',
    name: 'Slack Notifications',
    url: 'https://hooks.slack.com/services/xxx',
    events: ['conversion.created', 'visitor.identified'],
    status: 'active',
    lastTriggered: '12 min ago',
    successRate: 100
  }
];

export default function WebhooksPage() {
  const { hasAccess, requiredTier } = useFeatureGate('webhooks');
  const [webhooks] = useState<Webhook[]>(DEMO_WEBHOOKS);
  const [showAddModal, setShowAddModal] = useState(false);

  if (!hasAccess) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Webhooks</h1>
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Send conversion and visitor data to Zapier, Make, Slack, and other services.
          </p>
          <Link href="/settings/billing" className="btn btn-primary">
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      active: { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)' },
      paused: { bg: 'var(--surface-subtle)', color: 'var(--text-secondary)' },
      failing: { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }
    };
    const style = styles[status] || styles.paused;
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '500',
        background: style.bg,
        color: style.color,
        textTransform: 'uppercase'
      }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Webhooks</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Send data to external services when events occur
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          + Add Webhook
        </button>
      </div>

      {/* Templates */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Quick Setup</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px'
        }}>
          {[
            { name: 'Zapier', icon: '⚡' },
            { name: 'Make', icon: '🔧' },
            { name: 'Slack', icon: '💬' },
            { name: 'Discord', icon: '🎮' },
            { name: 'Google Sheets', icon: '📊' },
            { name: 'Custom', icon: '🔗' }
          ].map(template => (
            <button
              key={template.name}
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '20px' }}>{template.icon}</span>
              <span style={{ fontWeight: '500' }}>{template.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Webhooks List */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Your Webhooks</h2>
        {webhooks.length === 0 ? (
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>No webhooks configured</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Create a webhook to send data to external services.
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              Create Webhook
            </button>
          </div>
        ) : (
          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {webhooks.map((webhook, i) => (
              <div
                key={webhook.id}
                style={{
                  padding: '16px',
                  borderTop: i > 0 ? '1px solid var(--border-default)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '500' }}>{webhook.name}</span>
                    {getStatusBadge(webhook.status)}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <code style={{
                      padding: '2px 4px',
                      background: 'var(--surface-subtle)',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}>
                      {webhook.url.substring(0, 40)}...
                    </code>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Events: {webhook.events.join(', ')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--primary)' }}>{webhook.successRate}%</span> success
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Last: {webhook.lastTriggered}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-ghost" title="Test">🧪</button>
                  <button className="btn btn-ghost" title="Edit">⚙️</button>
                  <button className="btn btn-ghost" title="Delete">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Webhook Modal */}
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
            maxWidth: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Add Webhook</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Name
              </label>
              <input
                type="text"
                className="input"
                placeholder="My Webhook"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Webhook URL
              </label>
              <input
                type="url"
                className="input"
                placeholder="https://..."
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Trigger Events
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['conversion.created', 'conversion.updated', 'visitor.identified', 'visitor.created'].map(event => (
                  <label key={event} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ width: '16px', height: '16px' }} />
                    <code style={{
                      padding: '2px 6px',
                      background: 'var(--surface-subtle)',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {event}
                    </code>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary">
                Create Webhook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
