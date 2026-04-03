'use client';

import { useState } from 'react';
import {
  useRevenueMetrics,
  useSubscriptions,
  useInvoices,
  useFailedPayments,
  useCoupons,
  usePlans,
  refundInvoice,
  retryFailedPayment,
  createCoupon,
  deactivateCoupon,
  CreateCouponData,
} from '@/lib/hooks/useAdminApi';

type TabType = 'overview' | 'subscriptions' | 'invoices' | 'failed' | 'coupons';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCurrencyDecimal(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    trialing: 'bg-blue-500/20 text-blue-400',
    past_due: 'bg-amber-500/20 text-amber-400',
    cancelled: 'bg-red-500/20 text-red-400',
    paused: 'bg-gray-500/20 text-gray-400',
    paid: 'bg-green-500/20 text-green-400',
    open: 'bg-amber-500/20 text-amber-400',
    draft: 'bg-gray-500/20 text-gray-400',
    refunded: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ============================================================================
// Revenue Overview Tab
// ============================================================================

function RevenueOverview() {
  const { data, loading, error } = useRevenueMetrics(30);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="MRR"
          value={formatCurrencyDecimal(data.mrr)}
          icon="💰"
          subValue="Monthly Recurring Revenue"
        />
        <MetricCard
          label="ARR"
          value={formatCurrencyDecimal(data.arr)}
          icon="📈"
          subValue="Annual Recurring Revenue"
        />
        <MetricCard
          label="ARPU"
          value={formatCurrencyDecimal(data.arpu)}
          icon="👤"
          subValue="Avg Revenue Per User"
        />
        <MetricCard
          label="Churn Rate"
          value={`${data.churn_rate}%`}
          icon={data.churn_rate > 5 ? '⚠️' : '✅'}
          subValue="Monthly churn"
          alert={data.churn_rate > 5}
        />
      </div>

      {/* Subscription Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active" value={data.active_subscriptions} color="green" />
        <StatCard label="Trialing" value={data.trialing_subscriptions} color="blue" />
        <StatCard label="Past Due" value={data.past_due_subscriptions} color="amber" />
        <StatCard label="Cancelled" value={data.cancelled_subscriptions} color="red" />
      </div>

      {/* Revenue Chart */}
      <div className="panel">
        <h3 className="panel-title">Monthly Revenue</h3>
        <div className="revenue-chart">
          {data.monthly_revenue.map((item, i) => {
            const maxRevenue = Math.max(...data.monthly_revenue.map(m => m.revenue));
            const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
            return (
              <div key={item.month} className="chart-bar-container">
                <div className="chart-bar" style={{ height: `${height}%` }}>
                  <span className="chart-value">{formatCurrencyDecimal(item.revenue)}</span>
                </div>
                <span className="chart-label">{item.month.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue by Plan */}
      {Object.keys(data.by_plan).length > 0 && (
        <div className="panel">
          <h3 className="panel-title">Revenue by Plan</h3>
          <div className="plan-breakdown">
            {Object.entries(data.by_plan).map(([plan, stats]) => (
              <div key={plan} className="plan-row">
                <span className="plan-name">{plan}</span>
                <span className="plan-count">{stats.count} subs</span>
                <span className="plan-mrr">{formatCurrencyDecimal(stats.mrr)}/mo</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .panel {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 20px;
        }
        .panel-title {
          font-size: 16px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 16px;
        }
        .revenue-chart {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          height: 200px;
          padding-top: 20px;
        }
        .chart-bar-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }
        .chart-bar {
          width: 100%;
          max-width: 60px;
          background: linear-gradient(to top, #10b981, #34d399);
          border-radius: 4px 4px 0 0;
          position: relative;
          min-height: 4px;
          transition: height 0.3s ease;
        }
        .chart-value {
          position: absolute;
          top: -24px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: #94a3b8;
          white-space: nowrap;
        }
        .chart-label {
          font-size: 11px;
          color: #64748b;
          margin-top: 8px;
        }
        .plan-breakdown {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .plan-row {
          display: flex;
          align-items: center;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }
        .plan-name {
          flex: 1;
          font-weight: 500;
          text-transform: capitalize;
        }
        .plan-count {
          color: #94a3b8;
          margin-right: 16px;
        }
        .plan-mrr {
          color: #10b981;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Subscriptions Tab
// ============================================================================

function SubscriptionsList() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const { data, loading, error, refetch } = useSubscriptions(page, statusFilter, planFilter);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="filters">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="agency">Agency</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Plan</th>
              <th>Status</th>
              <th>MRR</th>
              <th>Billing</th>
              <th>Period End</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {data.subscriptions.map((sub) => (
              <tr key={sub.id}>
                <td className="org-name">{sub.organizations?.name || 'Unknown'}</td>
                <td>
                  <span className="plan-badge">{sub.plan_name}</span>
                </td>
                <td><StatusBadge status={sub.status} /></td>
                <td className="mrr">{formatCurrencyDecimal(sub.mrr)}</td>
                <td>{sub.billing_interval}</td>
                <td>{sub.current_period_end ? formatDate(sub.current_period_end) : '-'}</td>
                <td>{formatDate(sub.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        total={data.total}
        limit={20}
        onPageChange={setPage}
      />

      <style jsx>{`
        .filters {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        .filter-select {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 8px 12px;
          color: #e2e8f0;
          font-size: 14px;
        }
        .table-container {
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th {
          text-align: left;
          padding: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          border-bottom: 1px solid #334155;
        }
        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #1e293b;
          font-size: 14px;
        }
        .data-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .org-name {
          font-weight: 500;
        }
        .plan-badge {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          text-transform: capitalize;
        }
        .mrr {
          color: #10b981;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Invoices Tab
// ============================================================================

function InvoicesList() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, loading, error, refetch } = useInvoices(page, statusFilter);
  const [refunding, setRefunding] = useState<string | null>(null);

  const handleRefund = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to refund this invoice?')) return;
    setRefunding(invoiceId);
    try {
      await refundInvoice(invoiceId);
      refetch();
    } catch (e) {
      alert('Refund failed');
    } finally {
      setRefunding(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="filters">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="open">Open</option>
          <option value="draft">Draft</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Organization</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="invoice-number">{inv.invoice_number || inv.id.slice(0, 8)}</td>
                <td>{inv.organizations?.name || 'Unknown'}</td>
                <td><StatusBadge status={inv.status} /></td>
                <td className="amount">{formatCurrency(inv.total_cents)}</td>
                <td>{inv.paid_at ? formatDate(inv.paid_at) : '-'}</td>
                <td>{formatDate(inv.invoice_date)}</td>
                <td>
                  {inv.status === 'paid' && (
                    <button
                      className="action-btn refund"
                      onClick={() => handleRefund(inv.id)}
                      disabled={refunding === inv.id}
                    >
                      {refunding === inv.id ? '...' : 'Refund'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        total={data.total}
        limit={20}
        onPageChange={setPage}
      />

      <style jsx>{`
        .filters {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        .filter-select {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 8px 12px;
          color: #e2e8f0;
          font-size: 14px;
        }
        .table-container {
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th {
          text-align: left;
          padding: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          border-bottom: 1px solid #334155;
        }
        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #1e293b;
          font-size: 14px;
        }
        .data-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .invoice-number {
          font-family: monospace;
          font-weight: 500;
        }
        .amount {
          font-weight: 600;
        }
        .action-btn {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .action-btn.refund {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }
        .action-btn.refund:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Failed Payments Tab
// ============================================================================

function FailedPaymentsList() {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useFailedPayments(page);
  const [retrying, setRetrying] = useState<string | null>(null);

  const handleRetry = async (paymentId: string) => {
    setRetrying(paymentId);
    try {
      await retryFailedPayment(paymentId);
      refetch();
    } catch (e) {
      alert('Retry failed');
    } finally {
      setRetrying(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  if (data.failed_payments.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🎉</span>
        <p>No failed payments!</p>
        <style jsx>{`
          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #94a3b8;
          }
          .empty-icon {
            font-size: 48px;
            display: block;
            margin-bottom: 16px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Invoice</th>
              <th>Amount</th>
              <th>Failure Reason</th>
              <th>Retries</th>
              <th>Next Retry</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.failed_payments.map((fp) => (
              <tr key={fp.id}>
                <td className="org-name">{fp.organizations?.name || 'Unknown'}</td>
                <td>{fp.invoices?.invoice_number || '-'}</td>
                <td className="amount">{formatCurrency(fp.amount_cents)}</td>
                <td className="failure-reason">
                  <span className="failure-code">{fp.failure_code}</span>
                  <span className="failure-message">{fp.failure_message}</span>
                </td>
                <td>{fp.retry_count}</td>
                <td>{fp.next_retry_at ? formatDate(fp.next_retry_at) : '-'}</td>
                <td>
                  <button
                    className="action-btn retry"
                    onClick={() => handleRetry(fp.id)}
                    disabled={retrying === fp.id}
                  >
                    {retrying === fp.id ? '...' : 'Retry Now'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        total={data.total}
        limit={20}
        onPageChange={setPage}
      />

      <style jsx>{`
        .table-container {
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th {
          text-align: left;
          padding: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          border-bottom: 1px solid #334155;
        }
        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #1e293b;
          font-size: 14px;
        }
        .org-name {
          font-weight: 500;
        }
        .amount {
          font-weight: 600;
          color: #f87171;
        }
        .failure-reason {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .failure-code {
          font-family: monospace;
          font-size: 12px;
          color: #f87171;
        }
        .failure-message {
          font-size: 12px;
          color: #94a3b8;
        }
        .action-btn {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          border: none;
          cursor: pointer;
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .action-btn.retry {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }
        .action-btn.retry:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.3);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Coupons Tab
// ============================================================================

function CouponsList() {
  const [page, setPage] = useState(1);
  const [activeOnly, setActiveOnly] = useState(false);
  const { data, loading, error, refetch } = useCoupons(page, activeOnly);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const [newCoupon, setNewCoupon] = useState<CreateCouponData>({
    code: '',
    name: '',
    discount_type: 'percent',
    discount_value: 10,
    duration: 'once',
    max_redemptions: undefined,
    valid_until: undefined,
  });

  const handleCreate = async () => {
    if (!newCoupon.code) {
      alert('Code is required');
      return;
    }
    setCreating(true);
    try {
      await createCoupon(newCoupon);
      setShowCreate(false);
      setNewCoupon({ code: '', name: '', discount_type: 'percent', discount_value: 10, duration: 'once' });
      refetch();
    } catch (e) {
      alert('Failed to create coupon');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (couponId: string) => {
    if (!confirm('Deactivate this coupon?')) return;
    setDeactivating(couponId);
    try {
      await deactivateCoupon(couponId);
      refetch();
    } catch (e) {
      alert('Failed to deactivate');
    } finally {
      setDeactivating(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="header-row">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => { setActiveOnly(e.target.checked); setPage(1); }}
          />
          Active only
        </label>
        <button className="create-btn" onClick={() => setShowCreate(true)}>
          + Create Coupon
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create Coupon</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Code</label>
                <input
                  type="text"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="WELCOME20"
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newCoupon.name || ''}
                  onChange={(e) => setNewCoupon({ ...newCoupon, name: e.target.value })}
                  placeholder="Welcome Discount"
                />
              </div>
              <div className="form-group">
                <label>Discount Type</label>
                <select
                  value={newCoupon.discount_type}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value as 'percent' | 'fixed' })}
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Discount Value</label>
                <input
                  type="number"
                  value={newCoupon.discount_value}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label>Duration</label>
                <select
                  value={newCoupon.duration}
                  onChange={(e) => setNewCoupon({ ...newCoupon, duration: e.target.value as 'once' | 'repeating' | 'forever' })}
                >
                  <option value="once">Once</option>
                  <option value="repeating">Repeating</option>
                  <option value="forever">Forever</option>
                </select>
              </div>
              <div className="form-group">
                <label>Max Redemptions</label>
                <input
                  type="number"
                  value={newCoupon.max_redemptions || ''}
                  onChange={(e) => setNewCoupon({ ...newCoupon, max_redemptions: parseInt(e.target.value) || undefined })}
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-create" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Discount</th>
              <th>Duration</th>
              <th>Redemptions</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.coupons.map((coupon) => (
              <tr key={coupon.id}>
                <td className="coupon-code">{coupon.code}</td>
                <td>{coupon.name}</td>
                <td className="discount">
                  {coupon.discount_type === 'percent'
                    ? `${coupon.discount_value}%`
                    : formatCurrencyDecimal(coupon.discount_value)}
                </td>
                <td>{coupon.duration}</td>
                <td>
                  {coupon.redemption_count}
                  {coupon.max_redemptions && ` / ${coupon.max_redemptions}`}
                </td>
                <td>{coupon.valid_until ? formatDate(coupon.valid_until) : 'Never'}</td>
                <td>
                  <StatusBadge status={coupon.is_active ? 'active' : 'cancelled'} />
                </td>
                <td>
                  {coupon.is_active && (
                    <button
                      className="action-btn deactivate"
                      onClick={() => handleDeactivate(coupon.id)}
                      disabled={deactivating === coupon.id}
                    >
                      {deactivating === coupon.id ? '...' : 'Deactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        total={data.total}
        limit={20}
        onPageChange={setPage}
      />

      <style jsx>{`
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #94a3b8;
          cursor: pointer;
        }
        .checkbox-label input {
          width: 16px;
          height: 16px;
        }
        .create-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .create-btn:hover {
          background: #059669;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: #1e293b;
          border-radius: 12px;
          padding: 24px;
          width: 100%;
          max-width: 500px;
        }
        .modal h3 {
          margin: 0 0 20px;
          font-size: 18px;
          color: #f1f5f9;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }
        .form-group input,
        .form-group select {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 10px 12px;
          color: #e2e8f0;
          font-size: 14px;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .btn-cancel {
          background: transparent;
          border: 1px solid #334155;
          color: #94a3b8;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
        }
        .btn-create {
          background: #10b981;
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-create:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .table-container {
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th {
          text-align: left;
          padding: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          border-bottom: 1px solid #334155;
        }
        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #1e293b;
          font-size: 14px;
        }
        .coupon-code {
          font-family: monospace;
          font-weight: 600;
          color: #10b981;
        }
        .discount {
          font-weight: 600;
        }
        .action-btn {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          border: none;
          cursor: pointer;
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .action-btn.deactivate {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

function MetricCard({ label, value, icon, subValue, alert }: {
  label: string;
  value: string;
  icon: string;
  subValue?: string;
  alert?: boolean;
}) {
  return (
    <div className={`metric-card ${alert ? 'alert' : ''}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-content">
        <div className="metric-value">{value}</div>
        <div className="metric-label">{label}</div>
        {subValue && <div className="metric-sub">{subValue}</div>}
      </div>
      <style jsx>{`
        .metric-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .metric-card.alert {
          border-color: #f59e0b;
        }
        .metric-icon {
          font-size: 28px;
        }
        .metric-content {
          flex: 1;
        }
        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: #f1f5f9;
        }
        .metric-label {
          font-size: 14px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .metric-sub {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className={`stat-card ${colors[color]}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <style jsx>{`
        .stat-card {
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 700;
        }
        .stat-label {
          font-size: 13px;
          margin-top: 4px;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading">
      <div className="spinner" />
      <style jsx>{`
        .loading {
          display: flex;
          justify-content: center;
          padding: 60px;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #334155;
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="error">
      <p>Error: {message}</p>
      <style jsx>{`
        .error {
          padding: 40px;
          text-align: center;
          color: #f87171;
        }
      `}</style>
    </div>
  );
}

function Pagination({ page, total, limit, onPageChange }: {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span>Page {page} of {totalPages}</span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
      <style jsx>{`
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
        }
        .pagination button {
          background: #1e293b;
          border: 1px solid #334155;
          color: #e2e8f0;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .pagination button:hover:not(:disabled) {
          background: #334155;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pagination span {
          color: #94a3b8;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function AdminBillingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: 'Revenue', icon: '📊' },
    { id: 'subscriptions', label: 'Subscriptions', icon: '🔄' },
    { id: 'invoices', label: 'Invoices', icon: '📄' },
    { id: 'failed', label: 'Failed Payments', icon: '⚠️' },
    { id: 'coupons', label: 'Coupons', icon: '🎟️' },
  ];

  return (
    <div className="billing-page">
      <h1 className="page-title">Billing & Revenue</h1>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="tab-content">
        {activeTab === 'overview' && <RevenueOverview />}
        {activeTab === 'subscriptions' && <SubscriptionsList />}
        {activeTab === 'invoices' && <InvoicesList />}
        {activeTab === 'failed' && <FailedPaymentsList />}
        {activeTab === 'coupons' && <CouponsList />}
      </div>

      <style jsx>{`
        .billing-page {
          max-width: 1400px;
        }
        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 24px 0;
        }
        .tabs {
          display: flex;
          gap: 4px;
          background: #1e293b;
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
          overflow-x: auto;
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: #94a3b8;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .tab:hover {
          color: #e2e8f0;
          background: rgba(255, 255, 255, 0.05);
        }
        .tab.active {
          background: #10b981;
          color: white;
        }
        .tab-icon {
          font-size: 16px;
        }
        .tab-content {
          min-height: 400px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .page-title {
            font-size: 20px;
            margin-bottom: 16px;
          }
          .tabs {
            margin-bottom: 16px;
            padding: 3px;
            -webkit-overflow-scrolling: touch;
          }
          .tab {
            padding: 8px 12px;
            font-size: 13px;
            gap: 6px;
          }
          .tab-icon {
            font-size: 14px;
          }
          .tab-content {
            min-height: auto;
          }
        }
      `}</style>
    </div>
  );
}
