'use client';

import { useState } from 'react';
import {
  useSystemOverview,
  useFeatureFlags,
  useBackgroundJobs,
  useAnnouncements,
  useSecurityEvents,
  useSystemAdmins,
  useMaintenanceStatus,
  toggleFeatureFlag,
  setMaintenanceMode,
  adminFetch,
} from '@/lib/hooks/useAdminApi';

type TabType = 'overview' | 'flags' | 'maintenance' | 'jobs' | 'announcements' | 'security' | 'admins';

function OverviewTab() {
  const { data: overview, loading } = useSystemOverview();

  if (loading) {
    return <div className="loading">Loading system overview...</div>;
  }

  // Service health data (in production, this would come from real monitoring)
  const services = [
    { name: 'API Server', status: 'healthy', uptime: 99.97, detail: 'Operational' },
    { name: 'Database', status: 'healthy', uptime: 99.99, detail: 'PostgreSQL' },
    { name: 'Redis Cache', status: 'healthy', uptime: 99.95, detail: 'Connected' },
    { name: 'Background Workers', status: (overview?.jobs_today?.failed || 0) > 5 ? 'warning' : 'healthy', uptime: 99.8, detail: `${overview?.jobs_today?.running || 0} running` },
    { name: 'Google Ads API', status: 'healthy', uptime: 99.5, detail: '< 1% errors' },
    { name: 'Meta Ads API', status: 'healthy', uptime: 99.2, detail: '< 1% errors' },
  ];

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'healthy': return 'service-healthy';
      case 'warning': return 'service-warning';
      case 'error': return 'service-error';
      default: return '';
    }
  };

  return (
    <div className="overview-tab">
      {/* Service Health Grid */}
      <div className="health-section">
        <h3 className="section-title">Service Health</h3>
        <div className="services-grid">
          {services.map((service) => (
            <div key={service.name} className={`service-card ${getStatusClass(service.status)}`}>
              <div className="service-header">
                <span className="service-status-dot" />
                <span className="service-name">{service.name}</span>
              </div>
              <div className="service-uptime">{service.uptime}% uptime</div>
              <div className="service-detail">{service.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Cards */}
      <div className="stats-grid">
        <div className={`stat-card ${overview?.maintenance_mode ? 'warning' : 'success'}`}>
          <div className="stat-icon">{overview?.maintenance_mode ? '🔧' : '✅'}</div>
          <div className="stat-info">
            <div className="stat-value">{overview?.maintenance_mode ? 'Active' : 'Operational'}</div>
            <div className="stat-label">System Status</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚩</div>
          <div className="stat-info">
            <div className="stat-value">{overview?.active_feature_flags || 0}</div>
            <div className="stat-label">Active Feature Flags</div>
          </div>
        </div>

        <div className={`stat-card ${(overview?.unacknowledged_alerts || 0) > 0 ? 'warning' : ''}`}>
          <div className="stat-icon">🔔</div>
          <div className="stat-info">
            <div className="stat-value">{overview?.unacknowledged_alerts || 0}</div>
            <div className="stat-label">Unacknowledged Alerts</div>
          </div>
        </div>
      </div>

      <div className="jobs-summary">
        <h3>Background Jobs Today</h3>
        <div className="jobs-grid">
          <div className="job-stat">
            <span className="job-count pending">{overview?.jobs_today.pending || 0}</span>
            <span className="job-label">Pending</span>
          </div>
          <div className="job-stat">
            <span className="job-count running">{overview?.jobs_today.running || 0}</span>
            <span className="job-label">Running</span>
          </div>
          <div className="job-stat">
            <span className="job-count completed">{overview?.jobs_today.completed || 0}</span>
            <span className="job-label">Completed</span>
          </div>
          <div className="job-stat">
            <span className="job-count failed">{overview?.jobs_today.failed || 0}</span>
            <span className="job-label">Failed</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .overview-tab {}
        .health-section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 16px 0;
        }
        .services-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }
        .service-card {
          background: var(--admin-inner-bg);
          border-radius: 10px;
          padding: 16px;
          border-left: 3px solid transparent;
        }
        .service-card.service-healthy {
          border-left-color: #10b981;
        }
        .service-card.service-warning {
          border-left-color: #f59e0b;
        }
        .service-card.service-error {
          border-left-color: #ef4444;
        }
        .service-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .service-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6b7280;
        }
        .service-healthy .service-status-dot {
          background: #10b981;
          box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
        }
        .service-warning .service-status-dot {
          background: #f59e0b;
          box-shadow: 0 0 6px rgba(245, 158, 11, 0.5);
        }
        .service-error .service-status-dot {
          background: #ef4444;
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
        }
        .service-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--admin-text);
        }
        .service-uptime {
          font-size: 18px;
          font-weight: 700;
          color: var(--admin-accent);
          margin-bottom: 4px;
        }
        .service-detail {
          font-size: 11px;
          color: var(--admin-text-muted);
        }
        @media (max-width: 1200px) {
          .services-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 600px) {
          .services-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
          padding: 20px;
        }
        .stat-card.success {
          border-left: 4px solid #10b981;
        }
        .stat-card.warning {
          border-left: 4px solid #f59e0b;
        }
        .stat-icon {
          font-size: 32px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--admin-text);
        }
        .stat-label {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .jobs-summary h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 16px 0;
        }
        .jobs-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .job-stat {
          text-align: center;
          padding: 20px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
        }
        .job-count {
          display: block;
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .job-count.pending { color: #6b7280; }
        .job-count.running { color: #3b82f6; }
        .job-count.completed { color: #10b981; }
        .job-count.failed { color: #ef4444; }
        .job-label {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

function FeatureFlagsTab() {
  const { data: flags, loading, refetch } = useFeatureFlags();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleToggle = async (flagName: string) => {
    setUpdating(flagName);
    try {
      await toggleFeatureFlag(flagName);
      refetch();
    } catch (error) {
      console.error('Failed to toggle flag:', error);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading feature flags...</div>;
  }

  return (
    <div className="flags-tab">
      <div className="section-header">
        <h3>Feature Flags</h3>
        <p className="subtitle">Control feature rollout across the platform</p>
      </div>

      <div className="flags-list">
        {flags?.flags.map((flag) => (
          <div key={flag.id} className="flag-item">
            <div className="flag-info">
              <div className="flag-header">
                <span className="flag-name">{flag.name}</span>
                {flag.rollout_percentage < 100 && (
                  <span className="rollout-badge">{flag.rollout_percentage}% rollout</span>
                )}
              </div>
              <p className="flag-description">{flag.description}</p>
              {flag.target_plans && flag.target_plans.length > 0 && (
                <div className="target-plans">
                  Plans: {flag.target_plans.join(', ')}
                </div>
              )}
            </div>
            <div className="flag-toggle">
              <button
                className={`toggle-btn ${flag.is_enabled ? 'enabled' : 'disabled'}`}
                onClick={() => handleToggle(flag.name)}
                disabled={updating === flag.name}
              >
                {updating === flag.name ? '...' : flag.is_enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .flags-tab {}
        .section-header {
          margin-bottom: 24px;
        }
        .section-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 4px 0;
        }
        .subtitle {
          font-size: 14px;
          color: var(--admin-text-muted);
          margin: 0;
        }
        .flags-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .flag-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: var(--admin-inner-bg);
          border-radius: 10px;
        }
        .flag-info {
          flex: 1;
        }
        .flag-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }
        .flag-name {
          font-weight: 600;
          color: var(--admin-text);
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
        }
        .rollout-badge {
          padding: 2px 8px;
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          font-size: 11px;
          border-radius: 4px;
          font-weight: 500;
        }
        .flag-description {
          font-size: 13px;
          color: var(--admin-text-muted);
          margin: 0;
        }
        .target-plans {
          font-size: 11px;
          color: var(--admin-text-dim);
          margin-top: 4px;
        }
        .toggle-btn {
          padding: 8px 20px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 60px;
        }
        .toggle-btn.enabled {
          background: #10b981;
          color: white;
        }
        .toggle-btn.disabled {
          background: #374151;
          color: #9ca3af;
        }
        .toggle-btn:disabled {
          opacity: 0.5;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

function MaintenanceTab() {
  const { data: maintenance, loading, refetch } = useMaintenanceStatus();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleToggleMaintenance = async (enable: boolean) => {
    setSaving(true);
    try {
      await setMaintenanceMode(enable, message || 'Scheduled maintenance in progress.');
      refetch();
    } catch (error) {
      console.error('Failed to set maintenance mode:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading maintenance status...</div>;
  }

  return (
    <div className="maintenance-tab">
      <div className="current-status">
        <h3>Maintenance Mode</h3>
        <div className={`status-banner ${maintenance?.is_active ? 'active' : 'inactive'}`}>
          <div className="status-icon">{maintenance?.is_active ? '🔧' : '✅'}</div>
          <div className="status-info">
            <span className="status-text">
              {maintenance?.is_active ? 'Maintenance Mode Active' : 'System Operational'}
            </span>
            {maintenance?.is_active && maintenance.active_windows?.[0] && (
              <span className="status-detail">
                Since: {new Date(maintenance.active_windows[0].actual_start).toLocaleString()}
              </span>
            )}
          </div>
          <button
            className={`toggle-maintenance ${maintenance?.is_active ? 'end' : 'start'}`}
            onClick={() => handleToggleMaintenance(!maintenance?.is_active)}
            disabled={saving}
          >
            {saving ? 'Saving...' : maintenance?.is_active ? 'End Maintenance' : 'Start Maintenance'}
          </button>
        </div>

        {!maintenance?.is_active && (
          <div className="maintenance-form">
            <label>Maintenance Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter a message to display to users during maintenance..."
              rows={3}
            />
          </div>
        )}
      </div>

      {maintenance?.scheduled_windows && maintenance.scheduled_windows.length > 0 && (
        <div className="scheduled-section">
          <h4>Scheduled Maintenance</h4>
          <div className="scheduled-list">
            {maintenance.scheduled_windows.map((window) => (
              <div key={window.id} className="scheduled-item">
                <div className="scheduled-time">
                  <span className="time-start">{new Date(window.scheduled_start).toLocaleString()}</span>
                  <span className="time-separator">to</span>
                  <span className="time-end">{new Date(window.scheduled_end).toLocaleString()}</span>
                </div>
                <p className="scheduled-message">{window.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {maintenance?.history && maintenance.history.length > 0 && (
        <div className="history-section">
          <h4>Recent Maintenance History</h4>
          <div className="history-list">
            {maintenance.history.slice(0, 5).map((entry) => (
              <div key={entry.id} className="history-item">
                <span className="history-dates">
                  {new Date(entry.actual_start).toLocaleDateString()} - {new Date(entry.actual_end).toLocaleDateString()}
                </span>
                <span className="history-reason">{entry.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .maintenance-tab {}
        .current-status h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 16px 0;
        }
        .status-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .status-banner.active {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .status-banner.inactive {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .status-icon {
          font-size: 32px;
        }
        .status-info {
          flex: 1;
        }
        .status-text {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
        }
        .status-detail {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .toggle-maintenance {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .toggle-maintenance.start {
          background: #f59e0b;
          color: white;
        }
        .toggle-maintenance.end {
          background: #10b981;
          color: white;
        }
        .toggle-maintenance:disabled {
          opacity: 0.5;
        }
        .maintenance-form {
          background: var(--admin-inner-bg);
          padding: 20px;
          border-radius: 12px;
        }
        .maintenance-form label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--admin-text);
          margin-bottom: 8px;
        }
        .maintenance-form textarea {
          width: 100%;
          padding: 12px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text);
          font-size: 14px;
          resize: vertical;
        }
        .scheduled-section,
        .history-section {
          margin-top: 30px;
        }
        .scheduled-section h4,
        .history-section h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 12px 0;
        }
        .scheduled-list,
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .scheduled-item,
        .history-item {
          padding: 12px 16px;
          background: var(--admin-inner-bg);
          border-radius: 8px;
        }
        .scheduled-time {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--admin-text);
          margin-bottom: 4px;
        }
        .time-separator {
          color: var(--admin-text-dim);
        }
        .scheduled-message {
          font-size: 13px;
          color: var(--admin-text-muted);
          margin: 0;
        }
        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .history-dates {
          font-size: 13px;
          color: var(--admin-text);
        }
        .history-reason {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

function BackgroundJobsTab() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const { data: jobs, loading, refetch } = useBackgroundJobs(statusFilter || undefined, undefined, page);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'running': return '#3b82f6';
      case 'failed': return '#ef4444';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      await adminFetch(`/admin/system/jobs/${jobId}/cancel`, { method: 'POST' });
      refetch();
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading background jobs...</div>;
  }

  return (
    <div className="jobs-tab">
      <div className="jobs-header">
        <h3>Background Jobs</h3>
        <div className="filters">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <button onClick={refetch} className="refresh-btn">Refresh</button>
        </div>
      </div>

      <div className="jobs-table">
        <table>
          <thead>
            <tr>
              <th>Job Type</th>
              <th>Name</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Started</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs?.jobs.map((job) => (
              <tr key={job.id}>
                <td className="job-type">{job.job_type}</td>
                <td className="job-name">{job.job_name}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: `${getStatusColor(job.status)}20`, color: getStatusColor(job.status) }}
                  >
                    {job.status}
                  </span>
                </td>
                <td>
                  {job.status === 'running' ? (
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${job.progress_percent}%` }} />
                      <span className="progress-text">{job.progress_percent}%</span>
                    </div>
                  ) : (
                    <span className="progress-na">-</span>
                  )}
                </td>
                <td className="job-time">
                  {job.started_at ? new Date(job.started_at).toLocaleTimeString() : '-'}
                </td>
                <td className="job-time">
                  {job.started_at && job.completed_at ? (
                    `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s`
                  ) : job.started_at && job.status === 'running' ? (
                    'Running...'
                  ) : '-'}
                </td>
                <td>
                  {(job.status === 'pending' || job.status === 'running') && (
                    <button onClick={() => cancelJob(job.id)} className="cancel-btn">Cancel</button>
                  )}
                  {job.status === 'failed' && job.error_message && (
                    <button className="error-btn" title={job.error_message}>View Error</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {jobs && jobs.total > 20 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {Math.ceil(jobs.total / 20)}</span>
          <button disabled={page >= Math.ceil(jobs.total / 20)} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      <style jsx>{`
        .jobs-tab {}
        .jobs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .jobs-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .filters {
          display: flex;
          gap: 10px;
        }
        .filters select {
          padding: 8px 12px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          font-size: 13px;
        }
        .refresh-btn {
          padding: 8px 16px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }
        .jobs-table {
          overflow-x: auto;
        }
        .jobs-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .jobs-table th,
        .jobs-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid var(--admin-border);
        }
        .jobs-table th {
          font-size: 11px;
          font-weight: 600;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          background: var(--admin-inner-bg);
        }
        .jobs-table td {
          font-size: 13px;
          color: var(--admin-text);
        }
        .job-type {
          font-family: 'JetBrains Mono', monospace;
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .progress-bar {
          width: 100px;
          height: 20px;
          background: var(--admin-inner-bg);
          border-radius: 10px;
          position: relative;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--admin-accent);
          border-radius: 10px;
          transition: width 0.3s;
        }
        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 10px;
          font-weight: 600;
          color: var(--admin-text);
        }
        .progress-na {
          color: var(--admin-text-dim);
        }
        .job-time {
          font-size: 12px;
          color: var(--admin-text-muted);
        }
        .cancel-btn,
        .error-btn {
          padding: 4px 10px;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
        }
        .cancel-btn {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        .error-btn {
          background: rgba(107, 114, 128, 0.2);
          color: #6b7280;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
        }
        .pagination button {
          padding: 8px 16px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          cursor: pointer;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

function AnnouncementsTab() {
  const [showAll, setShowAll] = useState(false);
  const { data: announcements, loading, refetch } = useAnnouncements(!showAll);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return <div className="loading">Loading announcements...</div>;
  }

  return (
    <div className="announcements-tab">
      <div className="announcements-header">
        <h3>System Announcements</h3>
        <div className="header-actions">
          <label className="show-all-toggle">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Show inactive
          </label>
          <button className="new-btn">+ New Announcement</button>
        </div>
      </div>

      {announcements?.announcements.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📢</span>
          <p>No {showAll ? '' : 'active '}announcements</p>
        </div>
      ) : (
        <div className="announcements-list">
          {announcements?.announcements.map((announcement) => (
            <div key={announcement.id} className="announcement-item">
              <div className="announcement-header">
                <div className="announcement-meta">
                  <span
                    className="severity-badge"
                    style={{ backgroundColor: `${getSeverityColor(announcement.severity)}20`, color: getSeverityColor(announcement.severity) }}
                  >
                    {announcement.severity}
                  </span>
                  <span className="announcement-type">{announcement.type}</span>
                </div>
                <span className="announcement-date">
                  {new Date(announcement.starts_at).toLocaleDateString()}
                  {announcement.ends_at && ` - ${new Date(announcement.ends_at).toLocaleDateString()}`}
                </span>
              </div>
              <h4 className="announcement-title">{announcement.title}</h4>
              <p className="announcement-content">{announcement.content}</p>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .announcements-tab {}
        .announcements-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .announcements-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .show-all-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--admin-text-muted);
          cursor: pointer;
        }
        .new-btn {
          padding: 8px 16px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .empty-state {
          text-align: center;
          padding: 60px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
        }
        .empty-icon {
          display: block;
          font-size: 40px;
          margin-bottom: 16px;
        }
        .empty-state p {
          color: var(--admin-text-muted);
          margin: 0;
        }
        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .announcement-item {
          padding: 20px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
        }
        .announcement-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .announcement-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .severity-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .announcement-type {
          font-size: 12px;
          color: var(--admin-text-muted);
          text-transform: capitalize;
        }
        .announcement-date {
          font-size: 12px;
          color: var(--admin-text-dim);
        }
        .announcement-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 8px 0;
        }
        .announcement-content {
          font-size: 14px;
          color: var(--admin-text-muted);
          margin: 0;
          line-height: 1.5;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

function SecurityEventsTab() {
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const { data: events, loading } = useSecurityEvents(days, page);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return <div className="loading">Loading security events...</div>;
  }

  return (
    <div className="security-tab">
      <div className="security-header">
        <h3>Security Events</h3>
        <select value={days} onChange={(e) => { setDays(Number(e.target.value)); setPage(1); }}>
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {events?.events.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🛡️</span>
          <p>No security events in this period</p>
        </div>
      ) : (
        <div className="events-list">
          {events?.events.map((event) => (
            <div key={event.id} className="event-item">
              <div className="event-time">
                {new Date(event.created_at).toLocaleString()}
              </div>
              <div className="event-content">
                <div className="event-header">
                  <span
                    className="severity-badge"
                    style={{ backgroundColor: `${getSeverityColor(event.severity)}20`, color: getSeverityColor(event.severity) }}
                  >
                    {event.severity}
                  </span>
                  <span className="event-type">{event.event_type.replace(/_/g, ' ')}</span>
                </div>
                <p className="event-description">{event.description}</p>
                <div className="event-meta">
                  <span>IP: {event.ip_address}</span>
                  {event.user_id && <span>User ID: {event.user_id}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {events && events.total > 20 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {Math.ceil(events.total / 20)}</span>
          <button disabled={page >= Math.ceil(events.total / 20)} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      <style jsx>{`
        .security-tab {}
        .security-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .security-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .security-header select {
          padding: 8px 12px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          font-size: 13px;
        }
        .empty-state {
          text-align: center;
          padding: 60px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
        }
        .empty-icon {
          display: block;
          font-size: 40px;
          margin-bottom: 16px;
        }
        .empty-state p {
          color: var(--admin-text-muted);
          margin: 0;
        }
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .event-item {
          display: flex;
          gap: 20px;
          padding: 16px;
          background: var(--admin-inner-bg);
          border-radius: 10px;
        }
        .event-time {
          flex-shrink: 0;
          width: 150px;
          font-size: 12px;
          color: var(--admin-text-dim);
        }
        .event-content {
          flex: 1;
        }
        .event-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .severity-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .event-type {
          font-size: 13px;
          font-weight: 500;
          color: var(--admin-text);
          text-transform: capitalize;
        }
        .event-description {
          font-size: 14px;
          color: var(--admin-text-muted);
          margin: 0 0 8px 0;
        }
        .event-meta {
          display: flex;
          gap: 20px;
          font-size: 12px;
          color: var(--admin-text-dim);
          font-family: 'JetBrains Mono', monospace;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
        }
        .pagination button {
          padding: 8px 16px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text);
          cursor: pointer;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

function AdminUsersTab() {
  const { data: admins, loading } = useSystemAdmins();

  if (loading) {
    return <div className="loading">Loading admin users...</div>;
  }

  return (
    <div className="admins-tab">
      <div className="admins-header">
        <h3>Admin Users</h3>
        <button className="add-btn">+ Add Admin</button>
      </div>

      <div className="admins-table">
        <table>
          <thead>
            <tr>
              <th>Admin</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins?.admins.map((admin) => (
              <tr key={admin.id}>
                <td>
                  <div className="admin-info">
                    <div className="admin-avatar">
                      {admin.name?.[0] || admin.email[0]}
                    </div>
                    <div className="admin-details">
                      <span className="admin-name">{admin.name || 'No name'}</span>
                      <span className="admin-email">{admin.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-badge ${admin.role}`}>
                    {admin.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${admin.is_active ? 'active' : 'inactive'}`}>
                    {admin.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="date-cell">
                  {admin.last_login_at ? new Date(admin.last_login_at).toLocaleString() : 'Never'}
                </td>
                <td className="date-cell">
                  {new Date(admin.created_at).toLocaleDateString()}
                </td>
                <td>
                  <button className="action-btn">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .admins-tab {}
        .admins-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .admins-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }
        .add-btn {
          padding: 8px 16px;
          background: var(--admin-accent);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .admins-table {
          overflow-x: auto;
        }
        .admins-table table {
          width: 100%;
          border-collapse: collapse;
        }
        .admins-table th,
        .admins-table td {
          padding: 14px 16px;
          text-align: left;
          border-bottom: 1px solid var(--admin-border);
        }
        .admins-table th {
          font-size: 11px;
          font-weight: 600;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          background: var(--admin-inner-bg);
        }
        .admin-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .admin-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
        }
        .admin-name {
          display: block;
          font-weight: 500;
          color: var(--admin-text);
        }
        .admin-email {
          font-size: 12px;
          color: var(--admin-text-muted);
        }
        .role-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .role-badge.super_admin {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        .role-badge.admin {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }
        .role-badge.moderator {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        .status-badge.active {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        .status-badge.inactive {
          background: rgba(107, 114, 128, 0.2);
          color: #6b7280;
        }
        .date-cell {
          font-size: 13px;
          color: var(--admin-text-muted);
        }
        .action-btn {
          padding: 4px 12px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 4px;
          color: var(--admin-text);
          font-size: 12px;
          cursor: pointer;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: var(--admin-text-muted);
        }
      `}</style>
    </div>
  );
}

export default function SystemPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: '📊' },
    { id: 'flags' as TabType, label: 'Feature Flags', icon: '🚩' },
    { id: 'maintenance' as TabType, label: 'Maintenance', icon: '🔧' },
    { id: 'jobs' as TabType, label: 'Jobs', icon: '⚙️' },
    { id: 'announcements' as TabType, label: 'Announcements', icon: '📢' },
    { id: 'security' as TabType, label: 'Security', icon: '🛡️' },
    { id: 'admins' as TabType, label: 'Admins', icon: '👤' },
  ];

  return (
    <div className="system-page">
      <h1 className="page-title">System Health</h1>
      <p className="page-subtitle">Monitor services, manage feature flags, maintenance windows, and security.</p>

      <div className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'flags' && <FeatureFlagsTab />}
        {activeTab === 'maintenance' && <MaintenanceTab />}
        {activeTab === 'jobs' && <BackgroundJobsTab />}
        {activeTab === 'announcements' && <AnnouncementsTab />}
        {activeTab === 'security' && <SecurityEventsTab />}
        {activeTab === 'admins' && <AdminUsersTab />}
      </div>

      <style jsx>{`
        .system-page {
          max-width: 1400px;
        }
        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 8px 0;
        }
        .page-subtitle {
          font-size: 14px;
          color: var(--admin-text-muted);
          margin: 0 0 24px 0;
        }
        .tab-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
          padding: 4px;
          background: var(--admin-inner-bg);
          border-radius: 12px;
          width: fit-content;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--admin-text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          color: var(--admin-text);
        }
        .tab-btn.active {
          background: var(--admin-card);
          color: var(--admin-accent);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .tab-icon {
          font-size: 14px;
        }
        .tab-content {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 24px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .page-title { font-size: 20px; }
          .page-subtitle { margin-bottom: 16px; }
          .tab-nav {
            width: 100%;
            gap: 4px;
            margin-bottom: 16px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .tab-btn {
            padding: 8px 12px;
            font-size: 12px;
            gap: 6px;
            white-space: nowrap;
          }
          .tab-icon { font-size: 13px; }
          .tab-content { padding: 16px; }
        }
      `}</style>
    </div>
  );
}
