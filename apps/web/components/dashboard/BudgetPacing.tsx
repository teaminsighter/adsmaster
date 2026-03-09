interface BudgetPacingProps {
  spent: number;
  budget: number;
  daysElapsed: number;
  daysInMonth: number;
  currency?: string;
}

export default function BudgetPacing({
  spent,
  budget,
  daysElapsed,
  daysInMonth,
  currency = 'USD',
}: BudgetPacingProps) {
  const spentPercent = (spent / budget) * 100;
  const expectedPercent = (daysElapsed / daysInMonth) * 100;
  const pacingStatus = spentPercent > expectedPercent + 10 ? 'fast' : spentPercent < expectedPercent - 10 ? 'slow' : 'on-track';

  const projectedOverspend = pacingStatus === 'fast'
    ? Math.round((spent / daysElapsed) * daysInMonth - budget)
    : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={`budget-pacing ${pacingStatus === 'fast' ? 'warning' : ''}`}>
      <div className="budget-pacing-header">
        <div className="budget-pacing-title">Monthly Budget Pacing</div>
        {pacingStatus === 'fast' && (
          <div className="budget-pacing-alert">
            ⚠️ PACING FAST — on track to overspend by {formatCurrency(projectedOverspend)}
          </div>
        )}
        {pacingStatus === 'slow' && (
          <div style={{ color: 'var(--info)', fontSize: '12px', fontWeight: 500 }}>
            ℹ️ Pacing slow — budget underutilized
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '48px', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px', opacity: 0.7 }}>Spent</div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 600 }}>
            {formatCurrency(spent)} <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>({spentPercent.toFixed(0)}%)</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px', opacity: 0.7 }}>Budget</div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 600 }}>
            {formatCurrency(budget)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px', opacity: 0.7 }}>Time Elapsed</div>
          <div className="mono" style={{ fontSize: '18px', fontWeight: 600 }}>
            Day {daysElapsed} of {daysInMonth} <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>({expectedPercent.toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      <div className="budget-pacing-bar">
        <div
          className={`budget-pacing-fill ${pacingStatus === 'fast' ? 'fast' : ''}`}
          style={{ width: `${Math.min(spentPercent, 100)}%` }}
        />
        {/* Expected pace marker */}
        <div
          style={{
            position: 'absolute',
            left: `${expectedPercent}%`,
            top: '-4px',
            bottom: '-4px',
            width: '2px',
            background: 'var(--text-secondary)',
            borderRadius: '1px',
          }}
          title={`Expected pace: ${expectedPercent.toFixed(0)}%`}
        />
      </div>
    </div>
  );
}
