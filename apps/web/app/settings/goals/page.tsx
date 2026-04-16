'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import {
  useGoals,
  useAlerts,
  useBudgetPacing,
  createGoal,
  updateGoal,
  deleteGoal,
  createAlert,
  updateAlert,
  deleteAlert,
  muteAlert,
  unmuteAlert,
  createBudgetPacing,
  AdGoal,
  AdAlert,
  BudgetPacing,
} from '@/lib/hooks/useApi';

type TabType = 'goals' | 'alerts' | 'budget';

const METRICS = [
  { value: 'spend', label: 'Ad Spend' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'roas', label: 'ROAS' },
  { value: 'ctr', label: 'CTR' },
  { value: 'cpa', label: 'Cost per Acquisition' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'clicks', label: 'Clicks' },
];

const PERIOD_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const CONDITIONS = [
  { value: 'above', label: 'Goes Above' },
  { value: 'below', label: 'Goes Below' },
  { value: 'increases_by', label: 'Increases By %' },
  { value: 'decreases_by', label: 'Decreases By %' },
];

const formatMicros = (micros: number) => {
  return '$' + (micros / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'achieved':
    case 'on_track':
      return 'var(--success)';
    case 'at_risk':
    case 'behind':
      return 'var(--warning)';
    case 'failed':
    case 'critical_over':
    case 'critical_under':
      return 'var(--error)';
    default:
      return 'var(--text-secondary)';
  }
};

const getStatusBadge = (status: string) => {
  const labels: Record<string, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    on_track: 'On Track',
    at_risk: 'At Risk',
    behind: 'Behind',
    achieved: 'Achieved',
    failed: 'Failed',
    over_pace: 'Over Pace',
    under_pace: 'Under Pace',
    critical_over: 'Critical Over',
    critical_under: 'Critical Under',
  };
  return labels[status] || status;
};

export default function GoalsSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('goals');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<AdGoal | null>(null);
  const [editingAlert, setEditingAlert] = useState<AdAlert | null>(null);

  const { data: goalsData, loading: goalsLoading, refetch: refetchGoals } = useGoals({ is_active: true });
  const { data: alertsData, loading: alertsLoading, refetch: refetchAlerts } = useAlerts({ is_active: true });
  const { data: pacingData, loading: pacingLoading, refetch: refetchPacing } = useBudgetPacing({});

  // Goal form state
  const [goalForm, setGoalForm] = useState({
    name: '',
    description: '',
    metric: 'conversions',
    target_value: 0,
    period_type: 'monthly',
    period_start: new Date().toISOString().split('T')[0],
    period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Alert form state
  const [alertForm, setAlertForm] = useState({
    name: '',
    description: '',
    metric: 'spend',
    condition: 'above',
    threshold: 0,
    time_window: 'day',
    check_frequency: 'hourly',
    notification_channels: ['email', 'in_app'],
    cooldown_minutes: 60,
  });

  // Budget form state
  const [budgetForm, setBudgetForm] = useState({
    name: '',
    monthly_budget_micros: 0,
    alert_threshold_pct: 80,
  });

  const handleCreateGoal = async () => {
    try {
      await createGoal(goalForm);
      setShowGoalModal(false);
      setGoalForm({
        name: '',
        description: '',
        metric: 'conversions',
        target_value: 0,
        period_type: 'monthly',
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      refetchGoals();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create goal');
    }
  };

  const handleUpdateGoal = async () => {
    if (!editingGoal) return;
    try {
      await updateGoal(editingGoal.id, {
        name: goalForm.name,
        description: goalForm.description || null,
        metric: goalForm.metric,
        target_value: goalForm.target_value,
        period_type: goalForm.period_type as AdGoal['period_type'],
        period_start: goalForm.period_start,
        period_end: goalForm.period_end,
      });
      setEditingGoal(null);
      setShowGoalModal(false);
      refetchGoals();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update goal');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await deleteGoal(goalId);
      refetchGoals();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete goal');
    }
  };

  const handleCreateAlert = async () => {
    try {
      await createAlert(alertForm);
      setShowAlertModal(false);
      setAlertForm({
        name: '',
        description: '',
        metric: 'spend',
        condition: 'above',
        threshold: 0,
        time_window: 'day',
        check_frequency: 'hourly',
        notification_channels: ['email', 'in_app'],
        cooldown_minutes: 60,
      });
      refetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create alert');
    }
  };

  const handleUpdateAlert = async () => {
    if (!editingAlert) return;
    try {
      await updateAlert(editingAlert.id, {
        name: alertForm.name,
        description: alertForm.description || null,
        metric: alertForm.metric,
        condition: alertForm.condition as AdAlert['condition'],
        threshold: alertForm.threshold,
        time_window: alertForm.time_window as AdAlert['time_window'],
        check_frequency: alertForm.check_frequency as AdAlert['check_frequency'],
        notification_channels: alertForm.notification_channels,
        cooldown_minutes: alertForm.cooldown_minutes,
      });
      setEditingAlert(null);
      setShowAlertModal(false);
      refetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update alert');
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    try {
      await deleteAlert(alertId);
      refetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete alert');
    }
  };

  const handleMuteAlert = async (alertId: string, isMuted: boolean) => {
    try {
      if (isMuted) {
        await unmuteAlert(alertId);
      } else {
        await muteAlert(alertId, 24);
      }
      refetchAlerts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update alert');
    }
  };

  const handleCreateBudget = async () => {
    try {
      await createBudgetPacing({
        ...budgetForm,
        monthly_budget_micros: budgetForm.monthly_budget_micros * 1_000_000,
      });
      setShowBudgetModal(false);
      setBudgetForm({ name: '', monthly_budget_micros: 0, alert_threshold_pct: 80 });
      refetchPacing();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create budget pacing');
    }
  };

  const openEditGoal = (goal: AdGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      name: goal.name,
      description: goal.description || '',
      metric: goal.metric,
      target_value: goal.target_value,
      period_type: goal.period_type,
      period_start: goal.period_start,
      period_end: goal.period_end,
    });
    setShowGoalModal(true);
  };

  const openEditAlert = (alert: AdAlert) => {
    setEditingAlert(alert);
    setAlertForm({
      name: alert.name,
      description: alert.description || '',
      metric: alert.metric,
      condition: alert.condition,
      threshold: alert.threshold,
      time_window: alert.time_window,
      check_frequency: alert.check_frequency,
      notification_channels: alert.notification_channels,
      cooldown_minutes: alert.cooldown_minutes,
    });
    setShowAlertModal(true);
  };

  return (
    <>
      <Header title="Goals & Alerts" showDateFilter={false} />
      <div className="page-content">
        <div style={{ maxWidth: '1000px' }}>
          {/* Back Link */}
          <Link
            href="/settings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '14px',
              marginBottom: '16px',
            }}
          >
            <span>←</span> Back to Settings
          </Link>

          {/* Page Header */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Goals & Alerts</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Set performance goals, configure alerts for anomalies, and track budget pacing
            </p>
          </div>

          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: '24px' }}>
            <button
              className={`tab ${activeTab === 'goals' ? 'active' : ''}`}
              onClick={() => setActiveTab('goals')}
            >
              Goals ({goalsData?.goals?.length || 0})
            </button>
            <button
              className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              Alerts ({alertsData?.alerts?.length || 0})
            </button>
            <button
              className={`tab ${activeTab === 'budget' ? 'active' : ''}`}
              onClick={() => setActiveTab('budget')}
            >
              Budget Pacing ({pacingData?.pacing?.length || 0})
            </button>
          </div>

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Performance Goals</span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingGoal(null);
                    setShowGoalModal(true);
                  }}
                >
                  + New Goal
                </button>
              </div>
              {goalsLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading goals...
                </div>
              ) : !goalsData?.goals?.length ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                  <p>No goals set up yet</p>
                  <p style={{ fontSize: '13px', marginTop: '8px' }}>
                    Create goals to track your advertising performance targets
                  </p>
                </div>
              ) : (
                <div className="goals-list">
                  {goalsData.goals.map((goal) => (
                    <div key={goal.id} className="goal-item">
                      <div className="goal-info">
                        <div className="goal-name">{goal.name}</div>
                        <div className="goal-meta">
                          {METRICS.find((m) => m.value === goal.metric)?.label || goal.metric} ·{' '}
                          {PERIOD_TYPES.find((p) => p.value === goal.period_type)?.label || goal.period_type}
                        </div>
                      </div>
                      <div className="goal-progress">
                        <div className="progress-bar-bg">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.min(goal.progress_pct, 100)}%`,
                              background: getStatusColor(goal.status),
                            }}
                          />
                        </div>
                        <div className="progress-text">
                          {goal.current_value.toLocaleString()} / {goal.target_value.toLocaleString()}
                          <span style={{ marginLeft: '8px', color: getStatusColor(goal.status) }}>
                            ({goal.progress_pct.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: `${getStatusColor(goal.status)}20`,
                          color: getStatusColor(goal.status),
                        }}
                      >
                        {getStatusBadge(goal.status)}
                      </span>
                      <div className="goal-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditGoal(goal)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--error)' }}
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Alert Rules</span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditingAlert(null);
                    setShowAlertModal(true);
                  }}
                >
                  + New Alert
                </button>
              </div>
              {alertsLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading alerts...
                </div>
              ) : !alertsData?.alerts?.length ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
                  <p>No alerts configured</p>
                  <p style={{ fontSize: '13px', marginTop: '8px' }}>
                    Set up alerts to get notified when metrics exceed thresholds
                  </p>
                </div>
              ) : (
                <div className="alerts-list">
                  {alertsData.alerts.map((alert) => (
                    <div key={alert.id} className="alert-item">
                      <div className="alert-info">
                        <div className="alert-name">
                          {alert.name}
                          {alert.is_muted && (
                            <span className="badge badge-warning" style={{ marginLeft: '8px' }}>
                              Muted
                            </span>
                          )}
                        </div>
                        <div className="alert-meta">
                          When {METRICS.find((m) => m.value === alert.metric)?.label || alert.metric}{' '}
                          {CONDITIONS.find((c) => c.value === alert.condition)?.label?.toLowerCase() || alert.condition}{' '}
                          {alert.threshold.toLocaleString()}
                        </div>
                      </div>
                      <div className="alert-channels">
                        {alert.notification_channels.map((ch) => (
                          <span key={ch} className="channel-badge">
                            {ch === 'email' ? '📧' : ch === 'slack' ? '💬' : ch === 'sms' ? '📱' : '🔔'}
                          </span>
                        ))}
                      </div>
                      <div className="alert-stats">
                        <span>Triggered {alert.alerts_today}x today</span>
                      </div>
                      <div className="alert-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleMuteAlert(alert.id, alert.is_muted)}
                        >
                          {alert.is_muted ? 'Unmute' : 'Mute'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditAlert(alert)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--error)' }}
                          onClick={() => handleDeleteAlert(alert.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Budget Pacing Tab */}
          {activeTab === 'budget' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Budget Pacing</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowBudgetModal(true)}>
                  + Add Budget
                </button>
              </div>
              {pacingLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading pacing data...
                </div>
              ) : !pacingData?.pacing?.length ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
                  <p>No budget pacing configured</p>
                  <p style={{ fontSize: '13px', marginTop: '8px' }}>
                    Track monthly budgets and get alerts when spending is off pace
                  </p>
                </div>
              ) : (
                <div className="pacing-list">
                  {pacingData.pacing.map((pacing) => (
                    <div key={pacing.id} className="pacing-item">
                      <div className="pacing-info">
                        <div className="pacing-name">{pacing.name || 'Overall Budget'}</div>
                        <div className="pacing-meta">
                          {pacing.period} · {pacing.days_remaining} days remaining
                        </div>
                      </div>
                      <div className="pacing-progress">
                        <div className="progress-bar-bg">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.min(pacing.current_pacing_pct, 100)}%`,
                              background: getStatusColor(pacing.status),
                            }}
                          />
                          <div
                            className="ideal-marker"
                            style={{ left: `${pacing.ideal_pacing_pct}%` }}
                          />
                        </div>
                        <div className="progress-text">
                          {formatMicros(pacing.total_spent_micros)} / {formatMicros(pacing.monthly_budget_micros)}
                          <span style={{ marginLeft: '8px', color: getStatusColor(pacing.status) }}>
                            ({pacing.current_pacing_pct.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: `${getStatusColor(pacing.status)}20`,
                          color: getStatusColor(pacing.status),
                        }}
                      >
                        {getStatusBadge(pacing.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</h3>
              <button className="close-btn" onClick={() => setShowGoalModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Goal Name</label>
                <input
                  type="text"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                  placeholder="e.g., Q1 Revenue Target"
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  placeholder="Describe this goal..."
                  rows={2}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Metric</label>
                  <select
                    value={goalForm.metric}
                    onChange={(e) => setGoalForm({ ...goalForm, metric: e.target.value })}
                  >
                    {METRICS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Target Value</label>
                  <input
                    type="number"
                    value={goalForm.target_value}
                    onChange={(e) => setGoalForm({ ...goalForm, target_value: Number(e.target.value) })}
                    min={0}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Period Type</label>
                <select
                  value={goalForm.period_type}
                  onChange={(e) => setGoalForm({ ...goalForm, period_type: e.target.value })}
                >
                  {PERIOD_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={goalForm.period_start}
                    onChange={(e) => setGoalForm({ ...goalForm, period_start: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={goalForm.period_end}
                    onChange={(e) => setGoalForm({ ...goalForm, period_end: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowGoalModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={editingGoal ? handleUpdateGoal : handleCreateGoal}
              >
                {editingGoal ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAlert ? 'Edit Alert' : 'Create New Alert'}</h3>
              <button className="close-btn" onClick={() => setShowAlertModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Alert Name</label>
                <input
                  type="text"
                  value={alertForm.name}
                  onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })}
                  placeholder="e.g., High Spend Alert"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Metric</label>
                  <select
                    value={alertForm.metric}
                    onChange={(e) => setAlertForm({ ...alertForm, metric: e.target.value })}
                  >
                    {METRICS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  <select
                    value={alertForm.condition}
                    onChange={(e) => setAlertForm({ ...alertForm, condition: e.target.value })}
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Threshold</label>
                  <input
                    type="number"
                    value={alertForm.threshold}
                    onChange={(e) => setAlertForm({ ...alertForm, threshold: Number(e.target.value) })}
                    min={0}
                  />
                </div>
                <div className="form-group">
                  <label>Check Frequency</label>
                  <select
                    value={alertForm.check_frequency}
                    onChange={(e) => setAlertForm({ ...alertForm, check_frequency: e.target.value })}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Cooldown (minutes)</label>
                <input
                  type="number"
                  value={alertForm.cooldown_minutes}
                  onChange={(e) => setAlertForm({ ...alertForm, cooldown_minutes: Number(e.target.value) })}
                  min={0}
                />
                <small style={{ color: 'var(--text-secondary)' }}>
                  Minimum time between repeated alerts
                </small>
              </div>
              <div className="form-group">
                <label>Notification Channels</label>
                <div className="checkbox-group">
                  {['email', 'slack', 'sms', 'in_app'].map((channel) => (
                    <label key={channel} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={alertForm.notification_channels.includes(channel)}
                        onChange={(e) => {
                          const channels = e.target.checked
                            ? [...alertForm.notification_channels, channel]
                            : alertForm.notification_channels.filter((c) => c !== channel);
                          setAlertForm({ ...alertForm, notification_channels: channels });
                        }}
                      />
                      <span>{channel === 'in_app' ? 'In-App' : channel.charAt(0).toUpperCase() + channel.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAlertModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={editingAlert ? handleUpdateAlert : handleCreateAlert}
              >
                {editingAlert ? 'Save Changes' : 'Create Alert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="modal-overlay" onClick={() => setShowBudgetModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Budget Pacing</h3>
              <button className="close-btn" onClick={() => setShowBudgetModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name (optional)</label>
                <input
                  type="text"
                  value={budgetForm.name}
                  onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })}
                  placeholder="e.g., Q1 Marketing Budget"
                />
              </div>
              <div className="form-group">
                <label>Monthly Budget ($)</label>
                <input
                  type="number"
                  value={budgetForm.monthly_budget_micros}
                  onChange={(e) =>
                    setBudgetForm({ ...budgetForm, monthly_budget_micros: Number(e.target.value) })
                  }
                  min={0}
                  step={100}
                />
              </div>
              <div className="form-group">
                <label>Alert Threshold (%)</label>
                <input
                  type="number"
                  value={budgetForm.alert_threshold_pct}
                  onChange={(e) =>
                    setBudgetForm({ ...budgetForm, alert_threshold_pct: Number(e.target.value) })
                  }
                  min={0}
                  max={100}
                />
                <small style={{ color: 'var(--text-secondary)' }}>
                  Get alerted when spending exceeds this percentage of budget
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBudgetModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateBudget}>
                Add Budget
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid var(--border-default);
        }

        .tab {
          padding: 12px 20px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          color: var(--text-secondary);
          font-weight: 500;
          transition: all 0.2s;
        }

        .tab:hover {
          color: var(--text-primary);
        }

        .tab.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .goals-list,
        .alerts-list,
        .pacing-list {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: var(--border-default);
        }

        .goal-item,
        .alert-item,
        .pacing-item {
          display: grid;
          grid-template-columns: 1fr 200px auto auto;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--surface-primary);
        }

        .goal-name,
        .alert-name,
        .pacing-name {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .goal-meta,
        .alert-meta,
        .pacing-meta {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .goal-progress,
        .pacing-progress {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .progress-bar-bg {
          height: 8px;
          background: var(--surface-tertiary);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .ideal-marker {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--text-primary);
          opacity: 0.5;
        }

        .progress-text {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .goal-actions,
        .alert-actions {
          display: flex;
          gap: 4px;
        }

        .alert-channels {
          display: flex;
          gap: 4px;
        }

        .channel-badge {
          font-size: 16px;
        }

        .alert-stats {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: var(--surface-primary);
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-default);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-secondary);
        }

        .modal-body {
          padding: 24px;
        }

        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border-default);
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          background: var(--surface-secondary);
          color: var(--text-primary);
          font-size: 14px;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--primary);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .checkbox-group {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .goal-item,
          .alert-item,
          .pacing-item {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
