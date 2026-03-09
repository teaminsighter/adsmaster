'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from "@/components/layout/Header";
import DemoBanner from '@/components/ui/DemoBanner';
import MetricCard from "@/components/dashboard/MetricCard";
import { useCampaignDetail } from '@/lib/hooks/useApi';
import { formatMicros, formatNumber } from '@/lib/api';

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "adgroups", label: "Ad Groups" },
  { id: "keywords", label: "Keywords" },
  { id: "ads", label: "Ads" },
  { id: "searchterms", label: "Search Terms" },
  { id: "settings", label: "Settings" },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const [activeTab, setActiveTab] = useState("overview");

  const { data, loading, error, isDemo } = useCampaignDetail(campaignId);

  // Loading state
  if (loading) {
    return (
      <>
        <Header title="Campaign Detail" />
        <div className="page-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="loading-spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Loading campaign...</div>
            </div>
          </div>
        </div>
        <style jsx>{`
          .loading-spinner {
            border: 3px solid var(--border-default);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </>
    );
  }

  // Error state
  if (error || !data || !data.campaign) {
    return (
      <>
        <Header title="Campaign Detail" />
        <div className="page-content">
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ marginBottom: '8px' }}>Campaign not found</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error || 'The campaign you are looking for does not exist.'}</p>
            <button className="btn btn-primary" onClick={() => router.push('/campaigns')}>
              Back to Campaigns
            </button>
          </div>
        </div>
      </>
    );
  }

  const { campaign, daily_metrics, keywords, ad_groups } = data;

  // Calculate metrics from daily data
  const totalSpend = daily_metrics.reduce((sum, d) => sum + d.spend_micros, 0);
  const totalImpressions = daily_metrics.reduce((sum, d) => sum + d.impressions, 0);
  const totalClicks = daily_metrics.reduce((sum, d) => sum + d.clicks, 0);
  const totalConversions = daily_metrics.reduce((sum, d) => sum + d.conversions, 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';
  const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

  // Calculate chart heights
  const maxSpend = Math.max(...daily_metrics.map(d => d.spend_micros));
  const chartHeights = daily_metrics.slice(-14).map(d => Math.round((d.spend_micros / maxSpend) * 100));

  // Update tabs with counts
  const tabsWithCounts = tabs.map(tab => {
    if (tab.id === 'adgroups') return { ...tab, label: `Ad Groups (${ad_groups?.length || 0})` };
    if (tab.id === 'keywords') return { ...tab, label: `Keywords (${keywords?.length || 0})` };
    return tab;
  });

  return (
    <>
      {isDemo && <DemoBanner onConnect={() => router.push('/connect')} />}
      <Header title="Campaign Detail" />
      <div className="page-content">
        {/* Campaign Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => router.push('/campaigns')}
                style={{ padding: '4px 8px' }}
              >
                ← Back
              </button>
              <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>
                {campaign.name}
              </h1>
              <span className={`badge ${campaign.status === 'ENABLED' ? 'badge-success' : 'badge-neutral'}`}>
                {campaign.status === 'ENABLED' ? '● Active' : '○ Paused'}
              </span>
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                background: campaign.platform === 'google' ? 'rgba(66, 133, 244, 0.1)' : 'rgba(6, 104, 225, 0.1)',
                color: campaign.platform === 'google' ? '#4285F4' : '#0668E1',
              }}>
                {campaign.platform === 'google' ? 'Google Ads' : 'Meta Ads'}
              </span>
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "14px", marginLeft: '52px' }}>
              {campaign.type} • Budget: {formatMicros(campaign.budget_micros)}/day
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-secondary" onClick={() => alert('Demo: Would pause campaign')}>
              ⏸ Pause
            </button>
            <button className="btn btn-secondary" onClick={() => alert('Demo: Would duplicate campaign')}>
              📋 Duplicate
            </button>
            <button className="btn btn-primary" onClick={() => alert('Demo: Would open edit modal')}>
              ✏️ Edit
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: "0",
          borderBottom: "1px solid var(--border-default)",
          marginBottom: "24px",
        }}>
          {tabsWithCounts.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 20px",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === tab.id ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content: Overview */}
        {activeTab === "overview" && (
          <>
            {/* Metrics */}
            <div className="metrics-grid" style={{ marginBottom: "24px" }}>
              <MetricCard label="Spend (30d)" value={formatMicros(totalSpend)} change="▲ 12.3%" changeDirection="up" />
              <MetricCard label="Impressions" value={formatNumber(totalImpressions)} change="▲ 8.5%" changeDirection="up" />
              <MetricCard label="Clicks" value={formatNumber(totalClicks)} change="▲ 15.1%" changeDirection="up" />
              <MetricCard label="CTR" value={`${ctr}%`} change="▲ 0.3%" changeDirection="up" />
              <MetricCard label="Conversions" value={totalConversions.toString()} change="▲ 22.5%" changeDirection="up" />
              <MetricCard label="CPA" value={formatMicros(cpa)} change="▼ 8.2%" changeDirection="down" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
              {/* Performance Chart */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Performance Trend (Last 14 Days)</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn btn-ghost btn-sm" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>Spend</button>
                    <button className="btn btn-ghost btn-sm">Clicks</button>
                    <button className="btn btn-ghost btn-sm">Conv</button>
                  </div>
                </div>
                <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "4px", padding: "16px 0" }}>
                  {chartHeights.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${Math.max(h, 4)}%`,
                        background: `linear-gradient(180deg, var(--primary) 0%, rgba(16, 185, 129, 0.3) 100%)`,
                        borderRadius: "4px 4px 0 0",
                      }}
                      title={`$${formatMicros(daily_metrics.slice(-14)[i]?.spend_micros || 0)}`}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-tertiary)", paddingTop: "8px", borderTop: "1px solid var(--border-default)" }}>
                  {daily_metrics.slice(-14).filter((_, i) => i % 3 === 0 || i === 13).map((d, i) => (
                    <span key={i}>{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  ))}
                </div>
              </div>

              {/* AI Insights */}
              <div className="card" style={{ borderLeft: "3px solid var(--primary)" }}>
                <div className="card-header">
                  <span className="card-title">🤖 AI Insights</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ padding: "12px", background: "var(--primary-light)", borderRadius: "6px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--primary)", marginBottom: "4px" }}>💡 Opportunity</div>
                    <div style={{ fontSize: "13px" }}>
                      {campaign.roas >= 4
                        ? "This campaign is performing well. Consider increasing budget to scale."
                        : "ROAS is below target. Review keywords and ad copy for optimization."}
                    </div>
                  </div>
                  {keywords && keywords.some(k => k.conversions === 0 && k.clicks > 50) && (
                    <div style={{ padding: "12px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "6px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--warning)", marginBottom: "4px" }}>⚠️ Warning</div>
                      <div style={{ fontSize: "13px" }}>
                        {keywords.filter(k => k.conversions === 0 && k.clicks > 50).length} keywords have high spend with low conversions.
                      </div>
                    </div>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: '8px' }}
                    onClick={() => router.push('/advisor')}
                  >
                    🤖 Ask AdsMaster AI →
                  </button>
                </div>
              </div>
            </div>

            {/* Top Keywords */}
            {keywords && keywords.length > 0 && (
              <div className="card" style={{ marginTop: "24px" }}>
                <div className="card-header">
                  <span className="card-title">Top Performing Keywords</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('keywords')}>View All →</button>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Keyword</th>
                      <th>Match Type</th>
                      <th className="right">Clicks</th>
                      <th className="right">Conv</th>
                      <th className="right">CPA</th>
                      <th className="right">QS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.slice(0, 5).map((kw) => (
                      <tr key={kw.id}>
                        <td className="mono" style={{ fontSize: "12px" }}>{kw.text}</td>
                        <td><span className="badge badge-info" style={{ fontSize: "10px" }}>[{kw.match_type}]</span></td>
                        <td className="right mono">{formatNumber(kw.clicks)}</td>
                        <td className="right mono" style={{ color: kw.conversions === 0 ? 'var(--error)' : undefined }}>
                          {kw.conversions || '—'}
                        </td>
                        <td className="right mono">{kw.conversions > 0 ? formatMicros(kw.spend_micros / kw.conversions) : "—"}</td>
                        <td className="right">
                          <span style={{ color: kw.quality_score >= 7 ? "var(--success)" : kw.quality_score >= 5 ? "var(--warning)" : "var(--error)", fontWeight: 600 }}>
                            {kw.quality_score}/10
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Tab Content: Keywords */}
        {activeTab === "keywords" && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <input type="text" className="input" placeholder="Search keywords..." style={{ width: "250px" }} />
              <button className="btn btn-primary btn-sm" onClick={() => alert('Demo: Would open add keywords modal')}>
                + Add Keywords
              </button>
            </div>
            {keywords && keywords.length > 0 ? (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "30px" }}><input type="checkbox" /></th>
                      <th>Keyword</th>
                      <th>Match</th>
                      <th>Status</th>
                      <th className="right">Impr</th>
                      <th className="right">Clicks</th>
                      <th className="right">Spend</th>
                      <th className="right">Conv</th>
                      <th className="right">CPA</th>
                      <th className="center">QS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw) => (
                      <tr key={kw.id} style={{ background: kw.conversions === 0 && kw.clicks > 100 ? "rgba(239, 68, 68, 0.05)" : undefined }}>
                        <td><input type="checkbox" /></td>
                        <td className="mono" style={{ fontSize: "12px" }}>{kw.text}</td>
                        <td><span className="badge badge-neutral" style={{ fontSize: "10px" }}>{kw.match_type}</span></td>
                        <td><span style={{ color: kw.status === 'ENABLED' ? "var(--success)" : "var(--text-tertiary)" }}>
                          {kw.status === 'ENABLED' ? '●' : '○'}
                        </span></td>
                        <td className="right mono">{formatNumber(kw.impressions)}</td>
                        <td className="right mono">{formatNumber(kw.clicks)}</td>
                        <td className="right mono">{formatMicros(kw.spend_micros)}</td>
                        <td className="right mono" style={{ color: kw.conversions === 0 ? "var(--error)" : undefined }}>{kw.conversions || "—"}</td>
                        <td className="right mono">{kw.conversions > 0 ? formatMicros(kw.spend_micros / kw.conversions) : "—"}</td>
                        <td className="center">
                          <span style={{ color: kw.quality_score >= 7 ? "var(--success)" : kw.quality_score >= 5 ? "var(--warning)" : "var(--error)" }}>
                            {kw.quality_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Wasting Keywords Alert */}
                {keywords.some(kw => kw.conversions === 0 && kw.spend_micros > 200_000000) && (
                  <div style={{
                    marginTop: "16px",
                    padding: "16px",
                    background: "rgba(239, 68, 68, 0.05)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderLeft: "4px solid var(--error)",
                    borderRadius: "8px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--error)", marginBottom: "4px" }}>⚠️ Wasting Keywords Detected</div>
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                          {keywords.filter(kw => kw.conversions === 0 && kw.spend_micros > 200_000000).length} keyword(s) spent money with 0 conversions in the last 30 days.
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => alert('Demo: Would show wasting keywords')}>Review</button>
                        <button className="btn btn-sm" style={{ background: "var(--error)", color: "white" }} onClick={() => alert('Demo: Would pause wasting keywords')}>Pause</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No keywords found for this campaign
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Ad Groups */}
        {activeTab === "adgroups" && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                {ad_groups?.length || 0} ad groups
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => alert('Demo: Would create ad group')}>
                + Create Ad Group
              </button>
            </div>
            {ad_groups && ad_groups.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ad Group</th>
                    <th>Status</th>
                    <th className="right">Keywords</th>
                    <th style={{ width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {ad_groups.map((ag: { id: string; name: string; status: string; keywords: number }) => (
                    <tr key={ag.id}>
                      <td style={{ fontWeight: 500 }}>{ag.name}</td>
                      <td>
                        <span style={{ color: ag.status === 'ENABLED' ? 'var(--success)' : 'var(--text-tertiary)' }}>
                          {ag.status === 'ENABLED' ? '● Active' : '○ Paused'}
                        </span>
                      </td>
                      <td className="right mono">{ag.keywords}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => alert(`Demo: Would edit ${ag.name}`)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No ad groups found
              </div>
            )}
          </div>
        )}

        {/* Placeholder for other tabs */}
        {!["overview", "keywords", "adgroups"].includes(activeTab) && (
          <div className="card" style={{ padding: "48px", textAlign: "center", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>🚧</div>
            <div style={{ fontSize: "16px", fontWeight: 500 }}>{tabsWithCounts.find(t => t.id === activeTab)?.label} view</div>
            <div style={{ fontSize: "14px" }}>Coming soon...</div>
          </div>
        )}
      </div>
    </>
  );
}
