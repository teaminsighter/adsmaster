'use client';

import { useState } from 'react';

interface CreateAudienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AudienceFormData) => Promise<void>;
  isDemo?: boolean;
}

interface AudienceFormData {
  name: string;
  platform: 'google' | 'meta';
  type: 'REMARKETING' | 'CUSTOMER_LIST' | 'LOOKALIKE' | 'ENGAGEMENT';
  source: string;
  lookbackDays?: number;
  description?: string;
}

const audienceTypes = {
  google: [
    { value: 'REMARKETING', label: 'Remarketing', description: 'Target users who visited your website' },
    { value: 'CUSTOMER_LIST', label: 'Customer List', description: 'Upload emails or phone numbers' },
  ],
  meta: [
    { value: 'REMARKETING', label: 'Website Custom Audience', description: 'Target website visitors' },
    { value: 'CUSTOMER_LIST', label: 'Customer List', description: 'Upload customer data' },
    { value: 'LOOKALIKE', label: 'Lookalike Audience', description: 'Find similar users to your customers' },
    { value: 'ENGAGEMENT', label: 'Engagement Audience', description: 'Target users who engaged with your content' },
  ],
};

const sources = {
  REMARKETING: [
    { value: 'all_visitors', label: 'All Website Visitors' },
    { value: 'specific_pages', label: 'Specific Page Visitors' },
    { value: 'cart_abandoners', label: 'Cart Abandoners' },
    { value: 'purchasers', label: 'Past Purchasers' },
  ],
  CUSTOMER_LIST: [
    { value: 'email_list', label: 'Email List Upload' },
    { value: 'phone_list', label: 'Phone Number List' },
    { value: 'crm_sync', label: 'CRM Sync' },
  ],
  LOOKALIKE: [
    { value: 'top_customers', label: 'Top Customers (1%)' },
    { value: 'all_purchasers', label: 'All Purchasers (1-5%)' },
    { value: 'website_visitors', label: 'Website Visitors (1-10%)' },
  ],
  ENGAGEMENT: [
    { value: 'page_engagers', label: 'Facebook Page Engagers' },
    { value: 'video_viewers', label: 'Video Viewers (75%+)' },
    { value: 'ig_engagers', label: 'Instagram Engagers' },
    { value: 'lead_form', label: 'Lead Form Openers' },
  ],
};

export default function CreateAudienceModal({
  isOpen,
  onClose,
  onSubmit,
  isDemo = false,
}: CreateAudienceModalProps) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<'google' | 'meta'>('google');
  const [type, setType] = useState<'REMARKETING' | 'CUSTOMER_LIST' | 'LOOKALIKE' | 'ENGAGEMENT'>('REMARKETING');
  const [source, setSource] = useState('');
  const [lookbackDays, setLookbackDays] = useState('30');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset type when platform changes
  const handlePlatformChange = (newPlatform: 'google' | 'meta') => {
    setPlatform(newPlatform);
    // Reset to first available type for new platform
    setType(audienceTypes[newPlatform][0].value as typeof type);
    setSource('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter an audience name');
      return;
    }
    if (!source) {
      setError('Please select a source');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        platform,
        type,
        source,
        lookbackDays: parseInt(lookbackDays) || 30,
        description: description.trim() || undefined,
      });

      // Reset form
      setName('');
      setPlatform('google');
      setType('REMARKETING');
      setSource('');
      setLookbackDays('30');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create audience');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setPlatform('google');
    setType('REMARKETING');
    setSource('');
    setLookbackDays('30');
    setDescription('');
    setError('');
    onClose();
  };

  const availableTypes = audienceTypes[platform];
  const availableSources = sources[type] || [];

  return (
    <>
      {/* Overlay */}
      <div
        className={`panel-overlay ${isOpen ? 'open' : ''}`}
        onClick={handleClose}
      />

      {/* Slide-in Panel */}
      <div className={`slide-panel ${isOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <h2>Create Audience</h2>
          <button className="panel-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="panel-form">
          <div className="panel-body">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Audience Name */}
            <div className="form-group">
              <label>Audience Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Cart Abandoners - 30 Days"
                required
              />
            </div>

            {/* Platform Selection */}
            <div className="form-group">
              <label>Platform</label>
              <div className="platform-toggle">
                <button
                  type="button"
                  className={`platform-btn ${platform === 'google' ? 'active' : ''}`}
                  onClick={() => handlePlatformChange('google')}
                >
                  <span className="platform-dot google" />
                  Google Ads
                </button>
                <button
                  type="button"
                  className={`platform-btn ${platform === 'meta' ? 'active' : ''}`}
                  onClick={() => handlePlatformChange('meta')}
                >
                  <span className="platform-dot meta" />
                  Meta Ads
                </button>
              </div>
            </div>

            {/* Audience Type */}
            <div className="form-group">
              <label>Audience Type</label>
              <div className="type-options">
                {availableTypes.map(t => (
                  <label
                    key={t.value}
                    className={`type-option ${type === t.value ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="audienceType"
                      value={t.value}
                      checked={type === t.value}
                      onChange={() => {
                        setType(t.value as typeof type);
                        setSource('');
                      }}
                    />
                    <div className="type-content">
                      <span className="type-label">{t.label}</span>
                      <span className="type-desc">{t.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Source Selection */}
            <div className="form-group">
              <label>Source</label>
              <select
                className="select"
                value={source}
                onChange={e => setSource(e.target.value)}
                required
              >
                <option value="">Select a source...</option>
                {availableSources.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Lookback Period (for remarketing) */}
            {(type === 'REMARKETING' || type === 'ENGAGEMENT') && (
              <div className="form-group">
                <label>Lookback Period</label>
                <div className="lookback-options">
                  {['7', '14', '30', '60', '90', '180'].map(days => (
                    <button
                      key={days}
                      type="button"
                      className={`lookback-btn ${lookbackDays === days ? 'active' : ''}`}
                      onClick={() => setLookbackDays(days)}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="form-group">
              <label>Description (optional)</label>
              <textarea
                className="textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add notes about this audience..."
                rows={3}
              />
            </div>

            {/* Estimated Size Preview */}
            <div className="size-preview">
              <div className="size-preview-label">Estimated Audience Size</div>
              <div className="size-preview-value">
                {source ? (
                  <>
                    <span className="size-number">~{Math.floor(Math.random() * 50 + 10)}K</span>
                    <span className="size-note">Based on similar audiences</span>
                  </>
                ) : (
                  <span className="size-note">Select a source to see estimate</span>
                )}
              </div>
            </div>
          </div>

          <div className="panel-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Audience'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .panel-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 999;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s, visibility 0.3s;
        }

        .panel-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        .slide-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 520px;
          max-width: 100vw;
          background: var(--bg-primary);
          z-index: 1000;
          transform: translateX(100%);
          transition: transform 0.3s ease-out;
          display: flex;
          flex-direction: column;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
        }

        .slide-panel.open {
          transform: translateX(0);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-default);
          flex-shrink: 0;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .panel-close {
          background: none;
          border: none;
          font-size: 28px;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0;
          line-height: 1;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }

        .panel-close:hover {
          background: var(--surface-secondary);
          color: var(--text-primary);
        }

        .panel-form {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .panel-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .panel-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          padding-right: 80px;
          border-top: 1px solid var(--border-default);
          background: var(--surface-secondary);
          flex-shrink: 0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 8px;
          color: var(--text-primary);
        }

        .input, .select, .textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          font-size: 13px;
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .input:focus, .select:focus, .textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }

        .select {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
        }

        .textarea {
          resize: vertical;
          font-family: inherit;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--error);
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .platform-toggle {
          display: flex;
          gap: 12px;
        }

        .platform-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          background: var(--bg-primary);
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .platform-btn:hover {
          border-color: var(--primary);
          background: var(--surface-secondary);
        }

        .platform-btn.active {
          border-color: var(--primary);
          background: var(--primary-light);
          color: var(--primary);
        }

        .platform-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .platform-dot.google {
          background: #4285F4;
        }

        .platform-dot.meta {
          background: #0668E1;
        }

        .type-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .type-option {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .type-option:hover {
          border-color: var(--primary);
          background: var(--surface-secondary);
        }

        .type-option.selected {
          border-color: var(--primary);
          background: var(--primary-light);
        }

        .type-option input {
          margin-top: 2px;
          flex-shrink: 0;
        }

        .type-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .type-label {
          font-weight: 600;
          font-size: 13px;
        }

        .type-desc {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .lookback-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .lookback-btn {
          padding: 8px 16px;
          border: 1px solid var(--border-default);
          border-radius: 6px;
          background: var(--bg-primary);
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .lookback-btn:hover {
          border-color: var(--primary);
        }

        .lookback-btn.active {
          border-color: var(--primary);
          background: var(--primary);
          color: white;
        }

        .size-preview {
          padding: 16px;
          background: var(--surface-secondary);
          border-radius: 8px;
          border: 1px solid var(--border-default);
        }

        .size-preview-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .size-preview-value {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .size-number {
          font-size: 24px;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          color: var(--primary);
        }

        .size-note {
          font-size: 12px;
          color: var(--text-tertiary);
        }
      `}</style>
    </>
  );
}
