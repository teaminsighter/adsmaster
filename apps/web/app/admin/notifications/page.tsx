'use client';

import { Bell, Plus, Search, Megaphone, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminNotificationsPage() {
  // Placeholder announcements
  const announcements = [
    { id: 1, title: 'System Maintenance', message: 'Scheduled maintenance on Sunday 2am-4am UTC', type: 'warning', status: 'active', createdAt: '2 hours ago' },
    { id: 2, title: 'New Feature: AI Forecasting', message: 'Try our new ML-powered spend forecasting!', type: 'info', status: 'active', createdAt: '1 day ago' },
    { id: 3, title: 'Holiday Hours', message: 'Support will be limited Dec 24-26', type: 'info', status: 'scheduled', createdAt: '3 days ago' },
  ];

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Notifications</h1>
          <span className="page-subtitle">Manage platform announcements and alerts</span>
        </div>
        <button className="create-btn">
          <Plus size={18} />
          Create Announcement
        </button>
      </div>

      {/* Coming Soon Banner */}
      <div className="coming-soon-banner">
        <div className="banner-content">
          <Bell size={24} />
          <div>
            <h3>Notification System Coming Soon</h3>
            <p>In-app notifications and announcement management will be available in the next update.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className="tab active">
          <Megaphone size={16} />
          Announcements
        </button>
        <button className="tab">
          <Clock size={16} />
          Scheduled
        </button>
        <button className="tab">
          <CheckCircle size={16} />
          History
        </button>
      </div>

      {/* Announcements List */}
      <div className="announcements-list">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="announcement-card">
            <div className="announcement-icon">
              {announcement.type === 'warning' ? (
                <AlertTriangle size={20} className="icon-warning" />
              ) : (
                <Megaphone size={20} className="icon-info" />
              )}
            </div>
            <div className="announcement-content">
              <div className="announcement-header">
                <h3>{announcement.title}</h3>
                <span className={`status-badge ${announcement.status}`}>
                  {announcement.status}
                </span>
              </div>
              <p>{announcement.message}</p>
              <span className="announcement-time">{announcement.createdAt}</span>
            </div>
            <div className="announcement-actions">
              <button className="action-btn">Edit</button>
              <button className="action-btn danger">Delete</button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .notifications-page {
          max-width: 1400px;
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

        .coming-soon-banner {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1));
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 16px;
          color: #f59e0b;
        }

        .banner-content h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
        }

        .banner-content p {
          margin: 0;
          font-size: 14px;
          color: var(--admin-text-muted);
        }

        .tabs {
          display: flex;
          gap: 4px;
          background: var(--admin-inner-bg);
          padding: 4px;
          border-radius: 10px;
          margin-bottom: 24px;
          width: fit-content;
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
          transition: all 0.15s;
        }

        .tab:hover {
          color: var(--admin-text);
        }

        .tab.active {
          background: var(--admin-card);
          color: #10b981;
        }

        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .announcement-card {
          display: flex;
          gap: 16px;
          background: var(--admin-card);
          border: 1px solid var(--admin-border);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.15s;
        }

        .announcement-card:hover {
          border-color: var(--admin-border-hover);
        }

        .announcement-icon {
          flex-shrink: 0;
        }

        .icon-warning {
          color: #f59e0b;
        }

        .icon-info {
          color: #3b82f6;
        }

        .announcement-content {
          flex: 1;
        }

        .announcement-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .announcement-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--admin-text);
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

        .status-badge.scheduled {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .announcement-content p {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: var(--admin-text-muted);
        }

        .announcement-time {
          font-size: 12px;
          color: var(--admin-text-dim);
        }

        .announcement-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .action-btn {
          padding: 8px 16px;
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

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .create-btn {
            width: 100%;
            justify-content: center;
          }

          .announcement-card {
            flex-direction: column;
          }

          .announcement-actions {
            flex-direction: row;
          }
        }
      `}</style>
    </div>
  );
}
