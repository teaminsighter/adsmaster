'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';

type Platform = 'google' | 'meta' | null;
type CampaignType = string | null;

interface CampaignData {
  platform: Platform;
  type: CampaignType;
  name: string;
  dailyBudget: string;
  targetUrl: string;
  objective: string;
}

const GOOGLE_CAMPAIGN_TYPES = [
  { id: 'SEARCH', name: 'Search', description: 'Text ads on Google Search results', icon: '🔍' },
  { id: 'PERFORMANCE_MAX', name: 'Performance Max', description: 'AI-powered across all Google channels', icon: '⚡' },
  { id: 'DISPLAY', name: 'Display', description: 'Visual ads across Google Display Network', icon: '🖼️' },
  { id: 'SHOPPING', name: 'Shopping', description: 'Product listings on Google Shopping', icon: '🛒' },
  { id: 'VIDEO', name: 'Video', description: 'Video ads on YouTube', icon: '📹' },
];

const META_CAMPAIGN_TYPES = [
  { id: 'CONVERSIONS', name: 'Conversions', description: 'Drive sales or leads on your website', icon: '🎯' },
  { id: 'TRAFFIC', name: 'Traffic', description: 'Send people to your website', icon: '👆' },
  { id: 'ENGAGEMENT', name: 'Engagement', description: 'Get more likes, comments, and shares', icon: '💬' },
  { id: 'AWARENESS', name: 'Awareness', description: 'Reach people likely to remember your brand', icon: '👁️' },
  { id: 'LEADS', name: 'Lead Generation', description: 'Collect leads with instant forms', icon: '📝' },
];

const OBJECTIVES = [
  'Increase website sales',
  'Generate leads',
  'Drive traffic to website',
  'Promote app installs',
  'Increase brand awareness',
  'Promote local store visits',
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaign, setCampaign] = useState<CampaignData>({
    platform: null,
    type: null,
    name: '',
    dailyBudget: '',
    targetUrl: '',
    objective: '',
  });

  const totalSteps = 4;

  const handlePlatformSelect = (platform: Platform) => {
    setCampaign({ ...campaign, platform, type: null });
    setStep(2);
  };

  const handleTypeSelect = (type: string) => {
    setCampaign({ ...campaign, type });
    setStep(3);
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(4);
  };

  const handleCreateCampaign = async () => {
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    alert(`Demo: Campaign "${campaign.name}" would be created!\n\nPlatform: ${campaign.platform}\nType: ${campaign.type}\nBudget: $${campaign.dailyBudget}/day`);

    setIsSubmitting(false);
    router.push('/campaigns');
  };

  const campaignTypes = campaign.platform === 'google' ? GOOGLE_CAMPAIGN_TYPES : META_CAMPAIGN_TYPES;

  return (
    <>
      <Header title="Create Campaign" />
      <div className="page-content">
        {/* Progress Steps */}
        <div className="new-campaign-stepper" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '32px',
        }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                className="step-circle"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: step >= s ? 'var(--primary)' : 'var(--bg-tertiary)',
                  color: step >= s ? 'white' : 'var(--text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: step > s ? 'pointer' : 'default',
                }}
                onClick={() => step > s && setStep(s)}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 4 && (
                <div
                  className="step-line"
                  style={{
                    width: '60px',
                    height: '2px',
                    background: step > s ? 'var(--primary)' : 'var(--border-default)',
                    marginLeft: '8px',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Step 1: Select Platform */}
          {step === 1 && (
            <div className="card new-campaign-card" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
                Select Platform
              </h2>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '32px' }}>
                Choose where to run your ads
              </p>

              <div className="platform-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Google Ads */}
                <button
                  className="platform-btn"
                  onClick={() => handlePlatformSelect('google')}
                  style={{
                    padding: '32px',
                    border: '2px solid var(--border-default)',
                    borderRadius: '12px',
                    background: 'var(--bg-primary)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#4285F4';
                    e.currentTarget.style.background = 'rgba(66, 133, 244, 0.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.background = 'var(--bg-primary)';
                  }}
                >
                  <div className="platform-icon" style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: '#4285F4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '28px',
                    color: 'white',
                    fontWeight: 700,
                  }}>
                    G
                  </div>
                  <div className="platform-name" style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Google Ads</div>
                  <div className="platform-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Search, Display, Shopping, YouTube, PMax
                  </div>
                </button>

                {/* Meta Ads */}
                <button
                  className="platform-btn"
                  onClick={() => handlePlatformSelect('meta')}
                  style={{
                    padding: '32px',
                    border: '2px solid var(--border-default)',
                    borderRadius: '12px',
                    background: 'var(--bg-primary)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#0668E1';
                    e.currentTarget.style.background = 'rgba(6, 104, 225, 0.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.background = 'var(--bg-primary)';
                  }}
                >
                  <div className="platform-icon" style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: '#0668E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '28px',
                    color: 'white',
                    fontWeight: 700,
                  }}>
                    M
                  </div>
                  <div className="platform-name" style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Meta Ads</div>
                  <div className="platform-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Facebook, Instagram, Messenger
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Campaign Type */}
          {step === 2 && (
            <div className="card new-campaign-card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setStep(1)}
                  style={{ padding: '4px 8px' }}
                >
                  ← Back
                </button>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
                Campaign Type
              </h2>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '32px' }}>
                Choose the type that fits your goals
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {campaignTypes.map((type) => (
                  <button
                    key={type.id}
                    className="type-btn"
                    onClick={() => handleTypeSelect(type.id)}
                    style={{
                      padding: '20px 24px',
                      border: '2px solid var(--border-default)',
                      borderRadius: '12px',
                      background: 'var(--bg-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.background = 'var(--primary-light)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-default)';
                      e.currentTarget.style.background = 'var(--bg-primary)';
                    }}
                  >
                    <div className="type-icon" style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      flexShrink: 0,
                    }}>
                      {type.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="type-name" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{type.name}</div>
                      <div className="type-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{type.description}</div>
                    </div>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '20px' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Campaign Details */}
          {step === 3 && (
            <div className="card new-campaign-card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setStep(2)}
                  style={{ padding: '4px 8px' }}
                >
                  ← Back
                </button>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
                Campaign Details
              </h2>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '32px' }}>
                Set up your campaign
              </p>

              <form onSubmit={handleDetailsSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Campaign Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Summer Sale 2024"
                      value={campaign.name}
                      onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Objective */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                      Campaign Objective *
                    </label>
                    <select
                      className="select"
                      value={campaign.objective}
                      onChange={(e) => setCampaign({ ...campaign, objective: e.target.value })}
                      required
                      style={{ width: '100%' }}
                    >
                      <option value="">Select an objective</option>
                      {OBJECTIVES.map((obj) => (
                        <option key={obj} value={obj}>{obj}</option>
                      ))}
                    </select>
                  </div>

                  {/* Daily Budget */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                      Daily Budget (USD) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-secondary)',
                      }}>$</span>
                      <input
                        type="number"
                        className="input"
                        placeholder="50.00"
                        min="1"
                        step="0.01"
                        value={campaign.dailyBudget}
                        onChange={(e) => setCampaign({ ...campaign, dailyBudget: e.target.value })}
                        required
                        style={{ width: '100%', paddingLeft: '28px' }}
                      />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Estimated monthly spend: ${(parseFloat(campaign.dailyBudget || '0') * 30.4).toFixed(2)}
                    </div>
                  </div>

                  {/* Target URL */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                      Landing Page URL
                    </label>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://yourwebsite.com/landing-page"
                      value={campaign.targetUrl}
                      onChange={(e) => setCampaign({ ...campaign, targetUrl: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
                    Continue to Review
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {step === 4 && (
            <div className="card new-campaign-card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setStep(3)}
                  style={{ padding: '4px 8px' }}
                >
                  ← Back
                </button>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
                Review
              </h2>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '32px' }}>
                Review before creating
              </p>

              <div className="review-section" style={{
                background: 'var(--surface-secondary)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <div className="review-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Platform</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                      <span style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: campaign.platform === 'google' ? '#4285F4' : '#0668E1',
                      }} />
                      {campaign.platform === 'google' ? 'Google Ads' : 'Meta Ads'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Campaign Type</div>
                    <div style={{ fontWeight: 500 }}>
                      {campaignTypes.find(t => t.id === campaign.type)?.name || campaign.type}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Campaign Name</div>
                    <div style={{ fontWeight: 500 }}>{campaign.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Objective</div>
                    <div style={{ fontWeight: 500 }}>{campaign.objective}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Daily Budget</div>
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>${campaign.dailyBudget}/day</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Est. Monthly Spend</div>
                    <div style={{ fontWeight: 500 }}>${(parseFloat(campaign.dailyBudget || '0') * 30.4).toFixed(2)}/mo</div>
                  </div>
                </div>
                {campaign.targetUrl && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Landing Page</div>
                    <div style={{ fontWeight: 500, wordBreak: 'break-all' }}>{campaign.targetUrl}</div>
                  </div>
                )}
              </div>

              {/* Demo Notice */}
              <div className="demo-notice" style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid var(--info)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}>
                <span style={{ fontSize: '20px' }}>ℹ️</span>
                <div style={{ fontSize: '13px' }}>
                  <strong>Demo Mode:</strong> Campaign won&apos;t be created. Connect ad accounts first.
                </div>
              </div>

              <div className="action-buttons" style={{ display: 'flex', gap: '12px' }}>
                {/* Primary action first on mobile (CSS reverses order) */}
                <button
                  className="btn btn-primary action-primary"
                  onClick={handleCreateCampaign}
                  disabled={isSubmitting}
                  style={{ flex: 2 }}
                >
                  {isSubmitting ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span className="loading-spinner-sm" />
                      Creating...
                    </span>
                  ) : (
                    'Create Campaign'
                  )}
                </button>
                <button
                  className="btn btn-secondary action-secondary"
                  onClick={() => router.push('/campaigns')}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .loading-spinner-sm {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <style jsx global>{`
        @media (max-width: 767px) {
          /* Progress stepper - compact */
          .new-campaign-stepper {
            gap: 4px !important;
            margin-bottom: 20px !important;
          }
          .new-campaign-stepper .step-circle {
            width: 28px !important;
            height: 28px !important;
            font-size: 12px !important;
          }
          .new-campaign-stepper .step-line {
            width: 32px !important;
          }

          /* Card - compact padding */
          .new-campaign-card {
            padding: 20px !important;
          }
          .new-campaign-card h2 {
            font-size: 20px !important;
          }
          .new-campaign-card p {
            font-size: 14px !important;
            margin-bottom: 20px !important;
          }

          /* Platform grid - single column */
          .platform-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .platform-btn {
            padding: 20px !important;
          }
          .platform-icon {
            width: 52px !important;
            height: 52px !important;
            font-size: 24px !important;
            margin-bottom: 12px !important;
          }
          .platform-name {
            font-size: 16px !important;
          }
          .platform-desc {
            font-size: 12px !important;
          }

          /* Campaign type buttons - compact */
          .type-btn {
            padding: 14px 16px !important;
            gap: 12px !important;
          }
          .type-icon {
            width: 40px !important;
            height: 40px !important;
            font-size: 20px !important;
          }
          .type-name {
            font-size: 14px !important;
          }
          .type-desc {
            font-size: 12px !important;
          }

          /* Review grid - single column */
          .review-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .review-section {
            padding: 16px !important;
          }

          /* Demo notice - compact */
          .demo-notice {
            padding: 12px !important;
            font-size: 12px !important;
          }

          /* Action buttons - stack with primary on top */
          .action-buttons {
            flex-direction: column !important;
            gap: 10px !important;
          }
          .action-buttons button {
            flex: none !important;
            width: 100% !important;
            min-height: 48px !important;
            font-size: 15px !important;
          }
        }
      `}</style>
    </>
  );
}
