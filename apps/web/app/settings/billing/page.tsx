'use client';

import Header from '@/components/layout/Header';

const mockBilling = {
  plan: 'Pro',
  price: 99,
  interval: 'month',
  nextBilling: '2026-04-08',
  paymentMethod: {
    type: 'card',
    brand: 'Visa',
    last4: '4242',
    expiry: '12/27',
  },
  invoices: [
    { id: 'INV-001', date: '2026-03-01', amount: 99, status: 'paid' },
    { id: 'INV-002', date: '2026-02-01', amount: 99, status: 'paid' },
    { id: 'INV-003', date: '2026-01-01', amount: 99, status: 'paid' },
  ],
  usage: {
    accounts: { used: 5, limit: 10 },
    users: { used: 3, limit: 5 },
    apiCalls: { used: 45000, limit: 100000 },
  },
};

const plans = [
  { name: 'Starter', price: 29, accounts: 2, users: 1, features: ['Basic reporting', 'Email support'] },
  { name: 'Pro', price: 99, accounts: 10, users: 5, features: ['AI recommendations', 'Priority support', 'API access'] },
  { name: 'Agency', price: 249, accounts: 50, users: 20, features: ['White-label', 'Dedicated support', 'Custom integrations'] },
];

export default function BillingSettingsPage() {
  return (
    <>
      <Header title="Billing & Subscription" />
      <div className="page-content">
        <div style={{ maxWidth: '900px' }}>
          {/* Current Plan */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Current Plan</span>
              <span className="badge badge-success">Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{mockBilling.plan} Plan</div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  ${mockBilling.price}/{mockBilling.interval} - Next billing on {mockBilling.nextBilling}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary">Change Plan</button>
                <button className="btn btn-ghost" style={{ color: 'var(--error)' }}>Cancel</button>
              </div>
            </div>
          </div>

          {/* Usage */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Usage This Period</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              {Object.entries(mockBilling.usage).map(([key, value]) => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="mono">{value.used} / {value.limit}</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--border-default)', borderRadius: '4px' }}>
                    <div style={{
                      height: '100%',
                      width: `${(value.used / value.limit) * 100}%`,
                      background: (value.used / value.limit) > 0.9 ? 'var(--error)' : 'var(--primary)',
                      borderRadius: '4px',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title">Payment Method</span>
              <button className="btn btn-ghost btn-sm">Update</button>
            </div>
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
              }}>
                {mockBilling.paymentMethod.brand}
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>
                  {mockBilling.paymentMethod.brand} ending in {mockBilling.paymentMethod.last4}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Expires {mockBilling.paymentMethod.expiry}
                </div>
              </div>
            </div>
          </div>

          {/* Invoices */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Invoice History</span>
            </div>
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
                {mockBilling.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="mono">{invoice.id}</td>
                    <td>{invoice.date}</td>
                    <td className="right mono">${invoice.amount}</td>
                    <td>
                      <span className="badge badge-success">Paid</span>
                    </td>
                    <td className="right">
                      <button className="btn btn-ghost btn-sm">Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
