interface HealthItem {
  label: string;
  score: number;
}

interface HealthScoreProps {
  overallScore: number;
  items: HealthItem[];
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  return 'bad';
}

function getScoreEmoji(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  return '🔴';
}

export default function HealthScore({ overallScore, items }: HealthScoreProps) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Account Health</span>
      </div>

      <div className="health-score">
        <div className={`health-score-value ${getScoreClass(overallScore)}`}>
          {overallScore}
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Overall Score</div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>out of 100</div>
        </div>
      </div>

      <div className="health-breakdown" style={{ marginTop: '16px' }}>
        {items.map((item) => (
          <div className="health-item" key={item.label}>
            <span className="health-item-label">{item.label}</span>
            <span className={`health-item-value ${getScoreClass(item.score)}`}>
              {item.score}% {getScoreEmoji(item.score)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
