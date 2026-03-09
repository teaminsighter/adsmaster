'use client';

import Header from '@/components/layout/Header';
import { useBilling, usePlans } from '@/lib/hooks/useApi';

// Format currency
const formatCurrency = (cents: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

// Format number with commas
const formatNumber = (num: number) => {
  return num.toLocaleString();
};

export default function BillingSettingsPage() {
  // TODO: Get real organization ID from auth context
  const organizationId = 'demo_org';
  const { data: billing, loading: billingLoading, error: billingError } = useBilling(organizationId);
  const { data: plansData, loading: plansLoading } = usePlans();

  if (billingLoading) {
    return (
      <>
        <Header title="Billing & Subscription" />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading billing information...</div>
          </div>
        </div>
      </>
    );
  }

  if (billingError || !billing) {
    return (
      <>
        <Header title="Billing & Subscription" />
        <div className="page-content">
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ marginBottom: '8px' }}>Unable to load billing information</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{billingError || 'Please try again later'}</p>
          </div>
        </div>
      </>
    );
  }

  const { subscription, payment_method, usage, invoices } = billing;

  // Calculate usage percentages
  const usageData = [
    {
      key: 'accounts',
      label: 'Ad Accounts',
      used: usage.ad_accounts_used,
      limit: subscription.max_ad_accounts,
    },
    {
      key: 'users',
      label: 'Team Members',
      used: usage.team_members_used,
      limit: subscription.max_team_members,
    },
    {
      key: 'apiCalls',
      label: 'API Calls',
      used: usage.api_calls_this_month,
      limit: subscription.max_api_calls_per_month,
    },
  ];

  return (
    <>
      <Header title="Billing & Subscription" />
      <div className="page-content">
        <div style={{ maxWidth: '900px' }}>
          {/* Current Plan */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Current Plan</span>
              <span className={`badge ${subscription.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                {subscription.status === 'active' ? 'Active' : subscription.status}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, textTransform: 'capitalize' }}>
                  {subscription.plan_name} Plan
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {subscription.plan_price_cents > 0 ? (
                    <>
                      {formatCurrency(subscription.plan_price_cents)}/{subscription.billing_interval}
                      {subscription.current_period_end && (
                        <> - Next billing on {new Date(subscription.current_period_end).toLocaleDateString()}</>
                      )}
                    </>
                  ) : (
                    'Free tier'
                  )}
                </div>
                {subscription.cancel_at_period_end && (
                  <div style={{ marginTop: '8px', color: 'var(--warning)', fontSize: '13px' }}>
                    Your subscription will be canceled at the end of the current billing period.
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary">Change Plan</button>
                {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                  <button className="btn btn-ghost" style={{ color: 'var(--error)' }}>Cancel</button>
                )}
              </div>
            </div>
          </div>

          {/* Usage */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Usage This Period</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {usageData.map((item) => {
                const percentage = item.limit > 0 ? (item.used / item.limit) * 100 : 0;
                const isNearLimit = percentage > 80;
                const isAtLimit = percentage >= 100;

                return (
                  <div key={item.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 500 }}>{item.label}</span>
                      <span className="mono">
                        {formatNumber(item.used)} / {item.limit === -1 ? '∞' : formatNumber(item.limit)}
                      </span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--border-default)', borderRadius: '4px' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(percentage, 100)}%`,
                        background: isAtLimit ? 'var(--error)' : isNearLimit ? 'var(--warning)' : 'var(--primary)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    {isNearLimit && !isAtLimit && (
                      <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px' }}>
                        Approaching limit
                      </div>
                    )}
                    {isAtLimit && (
                      <div style={{ fontSize: '11px', color: 'var(--error)', marginTop: '4px' }}>
                        Limit reached
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Payment Method</span>
              <button className="btn btn-ghost btn-sm">Update</button>
            </div>
            {payment_method ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '32px',
                  background: 'var(--surface-secondary)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                }}>
                  {payment_method.card_brand}
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {payment_method.card_brand} ending in {payment_method.card_last4}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Expires {payment_method.card_exp_month}/{payment_method.card_exp_year}
                  </div>
                </div>
                {payment_method.is_default && (
                  <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>Default</span>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-secondary)' }}>
                  No payment method on file
                </div>
                <button className="btn btn-primary btn-sm">Add Payment Method</button>
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Invoice History</span>
            </div>
            {invoices.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No invoices yet
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th className="right">Amount</th>
                    <th>Status</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="mono">{invoice.invoice_number}</td>
                      <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                      <td className="right mono">
                        {formatCurrency(invoice.amount_cents, invoice.currency)}
                      </td>
                      <td>
                        <span className={`badge ${
                          invoice.status === 'paid' ? 'badge-success' :
                          invoice.status === 'open' ? 'badge-warning' :
                          'badge-neutral'
                        }`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="right">
                        <button className="btn btn-ghost btn-sm">Download</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Available Plans */}
          {plansData && (
            <div className="card" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <span className="card-title">Available Plans</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {plansData.plans.map((plan) => {
                  const isCurrentPlan = plan.name === subscription.plan_name;
                  return (
                    <div
                      key={plan.name}
                      style={{
                        padding: '20px',
                        borderRadius: '8px',
                        border: isCurrentPlan ? '2px solid var(--primary)' : '1px solid var(--border-default)',
                        background: isCurrentPlan ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '8px' }}>{plan.display_name}</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
                        {plan.price_cents_monthly !== null ? (
                          <>
                            {formatCurrency(plan.price_cents_monthly)}
                            <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)' }}>/mo</span>
                          </>
                        ) : (
                          <span style={{ fontSize: '16px' }}>Contact Sales</span>
                        )}
                      </div>
                      <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', listStyle: 'none', padding: 0, margin: 0 }}>
                        <li style={{ marginBottom: '4px' }}>
                          {plan.features.max_ad_accounts === -1 ? 'Unlimited' : plan.features.max_ad_accounts} ad accounts
                        </li>
                        <li style={{ marginBottom: '4px' }}>
                          {plan.features.max_team_members === -1 ? 'Unlimited' : plan.features.max_team_members} team members
                        </li>
                        {plan.features.custom_reports && <li style={{ marginBottom: '4px' }}>Custom reports</li>}
                        {plan.features.priority_support && <li style={{ marginBottom: '4px' }}>Priority support</li>}
                        {plan.features.white_label && <li style={{ marginBottom: '4px' }}>White-label</li>}
                      </ul>
                      {isCurrentPlan ? (
                        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>
                          Current Plan
                        </div>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: '12px', width: '100%' }}
                        >
                          {plan.price_cents_monthly === null ? 'Contact Sales' : 'Upgrade'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
