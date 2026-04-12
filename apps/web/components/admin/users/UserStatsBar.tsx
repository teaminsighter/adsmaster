'use client';

import { useUserStats } from '@/lib/hooks/useAdminApi';

interface StatCardProps {
  label: string;
  value: number;
  trend?: string;
  color?: string;
}

function StatCard({ label, value, trend, color = 'default' }: StatCardProps) {
  const colorClass = {
    default: 'stat-default',
    green: 'stat-green',
    yellow: 'stat-yellow',
    red: 'stat-red',
    blue: 'stat-blue',
  }[color] || 'stat-default';

  return (
    <div className={`stat-card ${colorClass}`}>
      <span className="stat-value">{value.toLocaleString()}</span>
      <span className="stat-label">{label}</span>
      {trend && <span className="stat-trend">{trend}</span>}
    </div>
  );
}

export default function UserStatsBar() {
  const { data, loading, error } = useUserStats();

  if (loading) {
    return (
      <div className="stats-bar loading">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="stat-card skeleton">
            <div className="skeleton-value" />
            <div className="skeleton-label" />
          </div>
        ))}
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  return (
    <div className="stats-bar">
      <StatCard label="Total Users" value={data.total} color="default" />
      <StatCard label="Active (30d)" value={data.active} color="green" />
      <StatCard label="New This Week" value={data.new_this_week} color="blue" />
      <StatCard label="Suspended" value={data.suspended} color="red" />
      <StatCard label="Unverified" value={data.unverified} color="yellow" />
      <StatCard label="At Risk (60d+)" value={data.at_risk} color="yellow" />
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .stats-bar {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .stats-bar.loading {
    opacity: 0.7;
  }

  .stat-card {
    background: var(--admin-card);
    border: 1px solid var(--admin-border);
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.15s ease;
  }

  .stat-card:hover {
    background: var(--admin-card-hover);
    transform: translateY(-1px);
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
  }

  .stat-label {
    font-size: 12px;
    color: var(--admin-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-trend {
    font-size: 11px;
    color: var(--admin-accent);
    margin-top: 2px;
  }

  /* Color variants */
  .stat-default .stat-value {
    color: var(--admin-text);
  }

  .stat-green .stat-value {
    color: var(--admin-accent);
  }

  .stat-yellow .stat-value {
    color: var(--admin-warning);
  }

  .stat-red .stat-value {
    color: var(--admin-error);
  }

  .stat-blue .stat-value {
    color: var(--admin-info);
  }

  /* Skeleton loading */
  .stat-card.skeleton {
    background: var(--admin-card);
  }

  .skeleton-value {
    height: 28px;
    width: 60px;
    background: var(--admin-inner-bg);
    border-radius: 4px;
    animation: pulse 1.5s infinite;
  }

  .skeleton-label {
    height: 14px;
    width: 80px;
    background: var(--admin-inner-bg);
    border-radius: 4px;
    animation: pulse 1.5s infinite;
    animation-delay: 0.2s;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Mobile responsive */
  @media (max-width: 1024px) {
    .stats-bar {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 640px) {
    .stats-bar {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .stat-card {
      padding: 12px;
    }

    .stat-value {
      font-size: 20px;
    }

    .stat-label {
      font-size: 10px;
    }
  }
`;
