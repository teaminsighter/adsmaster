'use client';

import { useState } from 'react';

interface AddKeywordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: KeywordFormData) => Promise<void>;
  campaigns: Array<{ id: string; name: string }>;
  isDemo?: boolean;
}

interface KeywordFormData {
  campaignId: string;
  adGroupId: string;
  keywords: string[];
  matchType: 'BROAD' | 'PHRASE' | 'EXACT';
  maxCpc?: number;
}

// Mock ad groups for demo
const DEMO_AD_GROUPS: Record<string, Array<{ id: string; name: string }>> = {
  'demo_camp_1': [
    { id: 'ag_1', name: 'Brand Terms' },
    { id: 'ag_2', name: 'Product Terms' },
  ],
  'demo_camp_2': [
    { id: 'ag_3', name: 'All Products' },
  ],
  'demo_camp_3': [
    { id: 'ag_4', name: 'Remarketing List' },
  ],
  'demo_camp_6': [
    { id: 'ag_5', name: 'Generic Terms' },
    { id: 'ag_6', name: 'Competitor Terms' },
  ],
};

export default function AddKeywordsModal({
  isOpen,
  onClose,
  onSubmit,
  campaigns,
  isDemo = false,
}: AddKeywordsModalProps) {
  const [campaignId, setCampaignId] = useState('');
  const [adGroupId, setAdGroupId] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [matchType, setMatchType] = useState<'BROAD' | 'PHRASE' | 'EXACT'>('PHRASE');
  const [maxCpc, setMaxCpc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const adGroups = campaignId ? (DEMO_AD_GROUPS[campaignId] || []) : [];

  const handleCampaignChange = (newCampaignId: string) => {
    setCampaignId(newCampaignId);
    setAdGroupId(''); // Reset ad group when campaign changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!campaignId) {
      setError('Please select a campaign');
      return;
    }
    if (!adGroupId) {
      setError('Please select an ad group');
      return;
    }

    const keywords = keywordsText
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywords.length === 0) {
      setError('Please enter at least one keyword');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        campaignId,
        adGroupId,
        keywords,
        matchType,
        maxCpc: maxCpc ? parseFloat(maxCpc) : undefined,
      });

      // Reset form
      setCampaignId('');
      setAdGroupId('');
      setKeywordsText('');
      setMatchType('PHRASE');
      setMaxCpc('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add keywords');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Keywords</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Campaign Select */}
            <div className="form-group">
              <label>Campaign</label>
              <select
                className="select"
                value={campaignId}
                onChange={e => handleCampaignChange(e.target.value)}
                required
              >
                <option value="">Select a campaign...</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Ad Group Select */}
            <div className="form-group">
              <label>Ad Group</label>
              <select
                className="select"
                value={adGroupId}
                onChange={e => setAdGroupId(e.target.value)}
                disabled={!campaignId}
                required
              >
                <option value="">Select an ad group...</option>
                {adGroups.map(ag => (
                  <option key={ag.id} value={ag.id}>{ag.name}</option>
                ))}
              </select>
              {campaignId && adGroups.length === 0 && (
                <div className="form-hint" style={{ color: 'var(--warning)' }}>
                  No ad groups found for this campaign
                </div>
              )}
            </div>

            {/* Keywords Textarea */}
            <div className="form-group">
              <label>Keywords (one per line)</label>
              <textarea
                className="textarea"
                value={keywordsText}
                onChange={e => setKeywordsText(e.target.value)}
                placeholder="Enter keywords, one per line...&#10;acme shoes&#10;buy acme online&#10;acme store near me"
                rows={6}
                required
              />
              <div className="form-hint">
                {keywordsText.split('\n').filter(k => k.trim()).length} keywords entered
              </div>
            </div>

            {/* Match Type */}
            <div className="form-group">
              <label>Match Type</label>
              <div className="match-type-options">
                {(['BROAD', 'PHRASE', 'EXACT'] as const).map(type => (
                  <label key={type} className={`match-type-option ${matchType === type ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="matchType"
                      value={type}
                      checked={matchType === type}
                      onChange={() => setMatchType(type)}
                    />
                    <span className="match-type-label">{type}</span>
                    <span className="match-type-example">
                      {type === 'BROAD' && 'shoes → running shoes, shoe store'}
                      {type === 'PHRASE' && '"shoes" → red shoes, shoes online'}
                      {type === 'EXACT' && '[shoes] → shoes only'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Max CPC */}
            <div className="form-group">
              <label>Max CPC (optional)</label>
              <div className="input-with-prefix">
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  className="input"
                  value={maxCpc}
                  onChange={e => setMaxCpc(e.target.value)}
                  placeholder="1.50"
                  step="0.01"
                  min="0.01"
                />
              </div>
              <div className="form-hint">
                Leave empty to use ad group default bid
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : `Add ${keywordsText.split('\n').filter(k => k.trim()).length || ''} Keywords`}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
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

        .modal-content {
          background: var(--bg-primary);
          border-radius: 12px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-default);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .modal-close:hover {
          color: var(--text-primary);
        }

        .modal-body {
          padding: 24px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid var(--border-default);
          background: var(--surface-secondary);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 6px;
          color: var(--text-primary);
        }

        .form-group .select,
        .form-group .input,
        .form-group .textarea {
          width: 100%;
        }

        .textarea {
          padding: 12px;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
          resize: vertical;
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }

        .form-hint {
          font-size: 12px;
          color: var(--text-tertiary);
          margin-top: 6px;
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

        .match-type-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .match-type-option {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .match-type-option:hover {
          border-color: var(--primary);
        }

        .match-type-option.selected {
          border-color: var(--primary);
          background: var(--primary-light);
        }

        .match-type-option input {
          margin-top: 2px;
        }

        .match-type-label {
          font-weight: 600;
          font-size: 12px;
          min-width: 60px;
        }

        .match-type-example {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .input-with-prefix {
          display: flex;
          align-items: center;
        }

        .input-prefix {
          padding: 8px 12px;
          background: var(--surface-secondary);
          border: 1px solid var(--border-default);
          border-right: none;
          border-radius: 8px 0 0 8px;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .input-with-prefix .input {
          border-radius: 0 8px 8px 0;
          width: 120px;
        }
      `}</style>
    </div>
  );
}
