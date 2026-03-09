'use client';

import { useState, useEffect } from 'react';

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

// Generate ad groups based on campaign name (for demo)
const getAdGroupsForCampaign = (campaignId: string, campaignName: string): Array<{ id: string; name: string }> => {
  if (campaignName.toLowerCase().includes('brand')) {
    return [
      { id: `${campaignId}_ag_1`, name: 'Brand Terms' },
      { id: `${campaignId}_ag_2`, name: 'Brand + Product' },
    ];
  } else if (campaignName.toLowerCase().includes('pmax') || campaignName.toLowerCase().includes('performance')) {
    return [
      { id: `${campaignId}_ag_1`, name: 'All Products' },
    ];
  } else if (campaignName.toLowerCase().includes('display') || campaignName.toLowerCase().includes('remarketing')) {
    return [
      { id: `${campaignId}_ag_1`, name: 'Remarketing List' },
      { id: `${campaignId}_ag_2`, name: 'Similar Audiences' },
    ];
  } else if (campaignName.toLowerCase().includes('non-brand') || campaignName.toLowerCase().includes('generic')) {
    return [
      { id: `${campaignId}_ag_1`, name: 'Generic Terms' },
      { id: `${campaignId}_ag_2`, name: 'Competitor Terms' },
      { id: `${campaignId}_ag_3`, name: 'Long Tail Keywords' },
    ];
  }
  return [
    { id: `${campaignId}_ag_1`, name: 'Ad Group 1' },
    { id: `${campaignId}_ag_2`, name: 'Ad Group 2' },
  ];
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
  const [adGroups, setAdGroups] = useState<Array<{ id: string; name: string }>>([]);

  // Update ad groups when campaign changes
  useEffect(() => {
    if (campaignId) {
      const selectedCampaign = campaigns.find(c => c.id === campaignId);
      if (selectedCampaign) {
        const groups = getAdGroupsForCampaign(campaignId, selectedCampaign.name);
        setAdGroups(groups);
        setAdGroupId(''); // Reset ad group selection
      }
    } else {
      setAdGroups([]);
      setAdGroupId('');
    }
  }, [campaignId, campaigns]);

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

  const handleClose = () => {
    setCampaignId('');
    setAdGroupId('');
    setKeywordsText('');
    setMatchType('PHRASE');
    setMaxCpc('');
    setError('');
    onClose();
  };

  const keywordCount = keywordsText.split('\n').filter(k => k.trim()).length;

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
          <h2>Add Keywords</h2>
          <button className="panel-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="panel-form">
          <div className="panel-body">
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
                onChange={e => setCampaignId(e.target.value)}
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
                placeholder={"Enter keywords, one per line...\nacme shoes\nbuy acme online\nacme store near me"}
                rows={8}
                required
              />
              <div className="form-hint">
                {keywordCount} keyword{keywordCount !== 1 ? 's' : ''} entered
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
                    <div className="match-type-content">
                      <span className="match-type-label">{type}</span>
                      <span className="match-type-example">
                        {type === 'BROAD' && 'shoes → running shoes, shoe store'}
                        {type === 'PHRASE' && '"shoes" → red shoes, shoes online'}
                        {type === 'EXACT' && '[shoes] → shoes only'}
                      </span>
                    </div>
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

          <div className="panel-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : `Add ${keywordCount > 0 ? keywordCount + ' ' : ''}Keyword${keywordCount !== 1 ? 's' : ''}`}
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
          width: 480px;
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
          margin-bottom: 6px;
          color: var(--text-primary);
        }

        .form-group .select,
        .form-group .input,
        .form-group .textarea {
          width: 100%;
        }

        .select {
          padding: 10px 12px;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          font-size: 13px;
          background: var(--bg-primary);
          color: var(--text-primary);
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
        }

        .select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }

        .select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background-color: var(--surface-secondary);
        }

        .input {
          padding: 10px 12px;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          font-size: 13px;
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
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
          line-height: 1.5;
        }

        .textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }

        .textarea::placeholder {
          color: var(--text-tertiary);
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
          background: var(--surface-secondary);
        }

        .match-type-option.selected {
          border-color: var(--primary);
          background: var(--primary-light);
        }

        .match-type-option input {
          margin-top: 2px;
          flex-shrink: 0;
        }

        .match-type-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .match-type-label {
          font-weight: 600;
          font-size: 13px;
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
          width: 140px;
        }
      `}</style>
    </>
  );
}
