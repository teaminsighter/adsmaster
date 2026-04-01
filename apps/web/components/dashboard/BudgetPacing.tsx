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
    <>
      <div className={`budget-pacing ${pacingStatus === 'fast' ? 'warning' : ''}`}>
        <div className="budget-pacing-header">
          <div className="budget-pacing-title">Monthly Budget</div>
          {pacingStatus === 'fast' && (
            <div className="budget-pacing-alert">
              ⚠️ PACING FAST
            </div>
          )}
          {pacingStatus === 'slow' && (
            <div style={{ color: 'var(--info)', fontSize: '12px', fontWeight: 500 }}>
              ℹ️ Pacing slow
            </div>
          )}
        </div>

        <div className="budget-pacing-stats">
          <div>
            <div className="budget-pacing-stat-label">Spent</div>
            <div className="mono budget-pacing-stat-value">
              {formatCurrency(spent)} <span className="budget-pacing-stat-percent">({spentPercent.toFixed(0)}%)</span>
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
            className="budget-pacing-marker"
            style={{ left: `${expectedPercent}%` }}
            title={`Expected pace: ${expectedPercent.toFixed(0)}%`}
          />
        </div>

        {pacingStatus === 'fast' && (
          <div className="budget-pacing-overspend">
            On track to overspend by {formatCurrency(projectedOverspend)}
          </div>
        )}
      </div>
      <style jsx>{`
        .budget-pacing-stats {
          margin-bottom: 12px;
        }
        .budget-pacing-stat-label {
          font-size: 12px;
          color: var(--text-primary);
          font-weight: 500;
          margin-bottom: 4px;
          opacity: 0.7;
        }
        .budget-pacing-stat-value {
          font-size: 18px;
          font-weight: 600;
        }
        .budget-pacing-stat-percent {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 400;
        }
        .budget-pacing-marker {
          position: absolute;
          top: -4px;
          bottom: -4px;
          width: 2px;
          background: var(--text-secondary);
          border-radius: 1px;
        }
        .budget-pacing-overspend {
          font-size: 12px;
          color: var(--warning);
          margin-top: 8px;
        }
        @media (max-width: 767px) {
          .budget-pacing-stat-value {
            font-size: 16px;
          }
        }
      `}</style>
    </>
  );
}
