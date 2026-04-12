'use client';

import { useState } from 'react';
import {
  Mail, Plus, Search, Send, FileText, Clock, CheckCircle, XCircle,
  Eye, Trash2, Copy, BarChart2, RefreshCw, AlertCircle, Loader2
} from 'lucide-react';
import {
  useEmailTemplates,
  useEmailLogs,
  useEmailStats,
  useScheduledEmails,
  useEmailAutomationRules,
  sendTestEmail,
  deleteEmailTemplate,
  duplicateEmailTemplate,
  toggleEmailAutomationRule,
  cancelScheduledEmail,
  EmailTemplate,
  EmailLog,
  ScheduledEmail,
  EmailAutomationRule,
} from '@/lib/hooks/useAdminApi';

type TabType = 'templates' | 'logs' | 'scheduled' | 'automation';

export default function AdminEmailsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch data
  const { data: templatesData, loading: templatesLoading, refetch: refetchTemplates } = useEmailTemplates(page);
  const { data: logsData, loading: logsLoading, refetch: refetchLogs } = useEmailLogs(page);
  const { data: statsData } = useEmailStats(24);
  const { data: scheduledData, loading: scheduledLoading, refetch: refetchScheduled } = useScheduledEmails(page);
  const { data: automationData, loading: automationLoading, refetch: refetchAutomation } = useEmailAutomationRules();

  const templates = templatesData?.templates || [];
  const logs = logsData?.logs || [];
  const scheduled = scheduledData?.emails || [];
  const automationRules = automationData?.rules || [];
  const stats = statsData?.stats;

  // Filter templates by search
  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendTest = async () => {
    if (!selectedTemplate || !testEmail) return;
    setSendingTest(true);
    try {
      const result = await sendTestEmail({
        template_id: selectedTemplate.id,
        to_email: testEmail,
      });
      setActionMessage({ type: 'success', text: result.message || 'Test email sent!' });
      setShowTestModal(false);
      setTestEmail('');
      setSelectedTemplate(null);
    } catch (error) {
      setActionMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to send test email' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      await duplicateEmailTemplate(template.id);
      setActionMessage({ type: 'success', text: `Template "${template.name}" duplicated` });
      refetchTemplates();
    } catch (error) {
      setActionMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to duplicate' });
    }
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
    try {
      await deleteEmailTemplate(template.id);
      setActionMessage({ type: 'success', text: `Template "${template.name}" deleted` });
      refetchTemplates();
    } catch (error) {
      setActionMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to delete' });
    }
  };

  const handleToggleAutomation = async (rule: EmailAutomationRule) => {
    try {
      await toggleEmailAutomationRule(rule.id, !rule.is_enabled);
      setActionMessage({ type: 'success', text: `Automation "${rule.name}" ${!rule.is_enabled ? 'enabled' : 'disabled'}` });
      refetchAutomation();
    } catch (error) {
      setActionMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to toggle' });
    }
  };

  const handleCancelScheduled = async (email: ScheduledEmail) => {
    if (!confirm('Cancel this scheduled email?')) return;
    try {
      await cancelScheduledEmail(email.id);
      setActionMessage({ type: 'success', text: 'Scheduled email cancelled' });
      refetchScheduled();
    } catch (error) {
      setActionMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to cancel' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return '#3b82f6';
      case 'delivered': return '#10b981';
      case 'failed': return '#ef4444';
      case 'bounced': return '#f59e0b';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="emails-page">
      {/* Action Message Toast */}
      {actionMessage && (
        <div className={`toast ${actionMessage.type}`}>
          {actionMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {actionMessage.text}
          <button onClick={() => setActionMessage(null)} className="toast-close">&times;</button>
        </div>
      )}

      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Email Templates</h1>
          <span className="page-subtitle">Manage transactional and marketing emails with Resend</span>
        </div>
        <button className="create-btn">
          <Plus size={18} />
          Create Template
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Sent (24h)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#10b981' }}>{stats.delivered}</div>
            <div className="stat-label">Delivered</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#ef4444' }}>{stats.failed + stats.bounced}</div>
            <div className="stat-label">Failed/Bounced</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#3b82f6' }}>{stats.delivery_rate}%</div>
            <div className="stat-label">Delivery Rate</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <FileText size={16} />
          Templates ({templates.length})
        </button>
        <button
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Send size={16} />
          Sent Logs
        </button>
        <button
          className={`tab ${activeTab === 'scheduled' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >
          <Clock size={16} />
          Scheduled
        </button>
        <button
          className={`tab ${activeTab === 'automation' ? 'active' : ''}`}
          onClick={() => setActiveTab('automation')}
        >
          <RefreshCw size={16} />
          Automation
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <>
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {templatesLoading ? (
            <div className="loading-state">
              <Loader2 size={24} className="spin" />
              <span>Loading templates...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="empty-state">
              <Mail size={48} />
              <h3>No templates found</h3>
              <p>Create your first email template to get started.</p>
            </div>
          ) : (
            <div className="templates-grid">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="template-card">
                  <div className="template-header">
                    <Mail size={20} className="template-icon" />
                    <span className={`status-badge ${template.is_active ? 'active' : 'inactive'}`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="template-name">{template.name}</h3>
                  <p className="template-subject">{template.subject}</p>
                  <div className="template-meta">
                    <span className="category-badge">{template.category}</span>
                    {template.variables.length > 0 && (
                      <span className="vars-count">{template.variables.length} vars</span>
                    )}
                  </div>
                  <div className="template-footer">
                    <span className="last-updated">
                      Updated: {new Date(template.updated_at).toLocaleDateString()}
                    </span>
                    <div className="template-actions">
                      <button
                        className="action-btn"
                        title="Send Test"
                        onClick={() => { setSelectedTemplate(template); setShowTestModal(true); }}
                      >
                        <Send size={14} />
                      </button>
                      <button className="action-btn" title="Preview">
                        <Eye size={14} />
                      </button>
                      <button
                        className="action-btn"
                        title="Duplicate"
                        onClick={() => handleDuplicate(template)}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="action-btn danger"
                        title="Delete"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="table-container">
          {logsLoading ? (
            <div className="loading-state">
              <Loader2 size={24} className="spin" />
              <span>Loading logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <Send size={48} />
              <h3>No emails sent yet</h3>
              <p>Sent emails will appear here.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="email-cell">{log.recipient_email}</td>
                    <td>{log.subject}</td>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          background: `${getStatusColor(log.status)}20`,
                          color: getStatusColor(log.status)
                        }}
                      >
                        {log.status === 'delivered' && <CheckCircle size={12} />}
                        {log.status === 'failed' && <XCircle size={12} />}
                        {log.status}
                      </span>
                    </td>
                    <td className="date-cell">{new Date(log.sent_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Scheduled Tab */}
      {activeTab === 'scheduled' && (
        <div className="table-container">
          {scheduledLoading ? (
            <div className="loading-state">
              <Loader2 size={24} className="spin" />
              <span>Loading scheduled emails...</span>
            </div>
          ) : scheduled.length === 0 ? (
            <div className="empty-state">
              <Clock size={48} />
              <h3>No scheduled emails</h3>
              <p>Scheduled emails will appear here.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Template</th>
                  <th>Scheduled For</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduled.map((email) => (
                  <tr key={email.id}>
                    <td className="email-cell">{email.recipient_email}</td>
                    <td>{email.email_templates?.name || '-'}</td>
                    <td>{new Date(email.scheduled_for).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${email.status}`}>{email.status}</span>
                    </td>
                    <td>
                      {email.status === 'pending' && (
                        <button
                          className="action-btn danger"
                          onClick={() => handleCancelScheduled(email)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Automation Tab */}
      {activeTab === 'automation' && (
        <div className="automation-list">
          {automationLoading ? (
            <div className="loading-state">
              <Loader2 size={24} className="spin" />
              <span>Loading automation rules...</span>
            </div>
          ) : automationRules.length === 0 ? (
            <div className="empty-state">
              <RefreshCw size={48} />
              <h3>No automation rules</h3>
              <p>Email automation rules will appear here.</p>
            </div>
          ) : (
            automationRules.map((rule) => (
              <div key={rule.id} className="automation-card">
                <div className="automation-header">
                  <div className="automation-info">
                    <h3>{rule.name}</h3>
                    <span className="trigger-badge">Trigger: {rule.trigger_event}</span>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={rule.is_enabled}
                      onChange={() => handleToggleAutomation(rule)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="automation-details">
                  <span>Template: {rule.email_templates?.name || 'Unknown'}</span>
                  {rule.delay_minutes > 0 && (
                    <span>Delay: {rule.delay_minutes} min</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Test Email Modal */}
      {showTestModal && selectedTemplate && (
        <div className="modal-overlay" onClick={() => setShowTestModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Send Test Email</h2>
            <p className="modal-subtitle">Template: {selectedTemplate.name}</p>
            <div className="form-group">
              <label>Recipient Email</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowTestModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSendTest}
                disabled={!testEmail || sendingTest}
              >
                {sendingTest ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                Send Test
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .emails-page {
          max-width: 1400px;
        }

        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 1000;
          animation: slideIn 0.3s ease;
        }

        .toast.success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid #10b981;
          color: #10b981;
        }

        .toast.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid #ef4444;
          color: #ef4444;
        }

        .toast-close {
          background: none;
          border: none;
          color: inherit;
          font-size: 18px;
          cursor: pointer;
          margin-left: 8px;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0;
        }

        .page-subtitle {
          font-size: 14px;
          color: var(--admin-text-muted);
        }

        .create-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }

        .create-btn:hover {
          background: #059669;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--admin-text);
        }

        .stat-label {
          font-size: 13px;
          color: var(--admin-text-muted);
          margin-top: 4px;
        }

        .tabs {
          display: flex;
          gap: 4px;
          background: var(--admin-inner-bg);
          padding: 4px;
          border-radius: 10px;
          margin-bottom: 20px;
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
          color: var(--admin-text-muted);
          font-size: 14px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }

        .tab:hover {
          color: var(--admin-text);
        }

        .tab.active {
          background: var(--admin-card);
          color: #10b981;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 24px;
          color: var(--admin-text-muted);
        }

        .search-bar input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          font-size: 14px;
          color: var(--admin-text);
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--admin-text-muted);
          text-align: center;
        }

        .empty-state h3 {
          margin: 16px 0 8px;
          color: var(--admin-text);
        }

        :global(.spin) {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .template-card {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.15s;
        }

        .template-card:hover {
          border-color: #10b981;
        }

        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .template-icon {
          color: #10b981;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .status-badge.inactive, .status-badge.pending {
          background: rgba(100, 116, 139, 0.15);
          color: #94a3b8;
        }

        .status-badge.sent {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .status-badge.cancelled {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .template-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
          margin: 0 0 8px 0;
        }

        .template-subject {
          font-size: 13px;
          color: var(--admin-text-muted);
          margin: 0 0 12px 0;
        }

        .template-meta {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .category-badge {
          padding: 3px 8px;
          background: rgba(139, 92, 246, 0.15);
          color: #a78bfa;
          border-radius: 4px;
          font-size: 11px;
          text-transform: capitalize;
        }

        .vars-count {
          padding: 3px 8px;
          background: var(--admin-inner-bg);
          color: var(--admin-text-muted);
          border-radius: 4px;
          font-size: 11px;
        }

        .template-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid var(--admin-border);
        }

        .last-updated {
          font-size: 12px;
          color: var(--admin-text-dim);
        }

        .template-actions {
          display: flex;
          gap: 6px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          color: var(--admin-text-muted);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .action-btn:hover {
          border-color: #10b981;
          color: #10b981;
        }

        .action-btn.danger:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .table-container {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          overflow: hidden;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          text-align: left;
          padding: 14px 16px;
          font-size: 12px;
          font-weight: 600;
          color: var(--admin-text-muted);
          text-transform: uppercase;
          background: var(--admin-inner-bg);
          border-bottom: 1px solid var(--admin-border);
        }

        .data-table td {
          padding: 14px 16px;
          font-size: 14px;
          border-bottom: 1px solid var(--admin-border);
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .email-cell {
          color: var(--admin-text);
          font-weight: 500;
        }

        .date-cell {
          color: var(--admin-text-muted);
          font-size: 13px;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .automation-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .automation-card {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
        }

        .automation-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .automation-info h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
        }

        .trigger-badge {
          padding: 4px 10px;
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
          border-radius: 6px;
          font-size: 12px;
        }

        .automation-details {
          display: flex;
          gap: 16px;
          font-size: 13px;
          color: var(--admin-text-muted);
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #334155;
          transition: 0.2s;
          border-radius: 24px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background: white;
          transition: 0.2s;
          border-radius: 50%;
        }

        .toggle input:checked + .slider {
          background: #10b981;
        }

        .toggle input:checked + .slider:before {
          transform: translateX(20px);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 16px;
          padding: 24px;
          width: 100%;
          max-width: 400px;
        }

        .modal h2 {
          margin: 0 0 4px 0;
          font-size: 18px;
          color: var(--admin-text);
        }

        .modal-subtitle {
          margin: 0 0 20px 0;
          font-size: 14px;
          color: var(--admin-text-muted);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--admin-text);
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          font-size: 14px;
          color: var(--admin-text);
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-secondary {
          padding: 10px 20px;
          background: var(--admin-inner-bg);
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          color: var(--admin-text-muted);
          font-size: 14px;
          cursor: pointer;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #10b981;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .create-btn {
            width: 100%;
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .templates-grid {
            grid-template-columns: 1fr;
          }

          .table-container {
            overflow-x: auto;
          }

          .data-table {
            min-width: 600px;
          }
        }
      `}</style>
    </div>
  );
}
