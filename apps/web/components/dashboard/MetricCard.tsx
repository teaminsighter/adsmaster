interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  benchmark?: {
    label: string;
    value: string;
    comparison: 'above' | 'below' | 'at';
  };
}

export default function MetricCard({
  label,
  value,
  change,
  changeDirection = 'neutral',
  benchmark,
}: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {change && (
        <div className={`metric-change ${changeDirection}`}>
          {change}
        </div>
      )}
      {benchmark && (
        <div className="metric-benchmark">
          <strong>{benchmark.label}:</strong> {benchmark.value}
          {benchmark.comparison !== 'at' && (
            <span style={{
              color: benchmark.comparison === 'below' ? 'var(--success)' : 'var(--error)',
              marginLeft: '4px'
            }}>
              {benchmark.comparison === 'above' ? '▲' : '▼'} {benchmark.comparison}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
