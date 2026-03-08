'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Header from "@/components/layout/Header";
import MetricCard from "@/components/dashboard/MetricCard";
import { formatMicros, formatNumber } from '@/lib/api';

const mockCampaign = {
  id: "1",
  name: "Search - Brand",
  status: "ENABLED",
  type: "SEARCH",
  budget: 15000_000000,
  spend: 12500_000000,
};

const mockMetrics = {
  impressions: 125000,
  clicks: 4500,
  ctr: 3.6,
  conversions: 156,
  cpa: 80_128205,
  roas: 4.2,
  spend: 12500_000000,
};

const mockKeywords = [
  { id: "1", text: "acme corp", matchType: "EXACT", status: "ENABLED", impressions: 45000, clicks: 1234, conversions: 45, cpa: 27_420000, qs: 10 },
  { id: "2", text: "acme products", matchType: "EXACT", status: "ENABLED", impressions: 32000, clicks: 987, conversions: 38, cpa: 29_180000, qs: 9 },
  { id: "3", text: "acme store", matchType: "PHRASE", status: "ENABLED", impressions: 28000, clicks: 654, conversions: 28, cpa: 31_250000, qs: 8 },
  { id: "4", text: "cheap acme alternative", matchType: "BROAD", status: "ENABLED", impressions: 8765, clicks: 234, conversions: 0, cpa: 0, qs: 4 },
];

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "adgroups", label: "Ad Groups (3)" },
  { id: "keywords", label: "Keywords (45)" },
  { id: "ads", label: "Ads (12)" },
  { id: "searchterms", label: "Search Terms" },
  { id: "settings", label: "Settings" },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
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
              <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>
                {mockCampaign.name}
              </h1>
              <span className="badge badge-success">● Active</span>
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              {mockCampaign.type} • Budget: {formatMicros(mockCampaign.budget)}/month
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-secondary">⏸ Pause</button>
            <button className="btn btn-secondary">📋 Duplicate</button>
            <button className="btn btn-primary">✏️ Edit</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: "0",
          borderBottom: "1px solid var(--border-default)",
          marginBottom: "24px",
        }}>
          {tabs.map((tab) => (
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
              <MetricCard label="Spend (30d)" value={formatMicros(mockMetrics.spend)} change="▲ 12.3%" changeDirection="up" />
              <MetricCard label="Impressions" value={formatNumber(mockMetrics.impressions)} change="▲ 8.5%" changeDirection="up" />
              <MetricCard label="Clicks" value={formatNumber(mockMetrics.clicks)} change="▲ 15.1%" changeDirection="up" />
              <MetricCard label="CTR" value={`${mockMetrics.ctr}%`} change="▲ 0.3%" changeDirection="up" />
              <MetricCard label="Conversions" value={mockMetrics.conversions.toString()} change="▲ 22.5%" changeDirection="up" />
              <MetricCard label="CPA" value={formatMicros(mockMetrics.cpa)} change="▼ 8.2%" changeDirection="down" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
              {/* Performance Chart */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Performance Trend</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn btn-ghost btn-sm" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>7D</button>
                    <button className="btn btn-ghost btn-sm">14D</button>
                    <button className="btn btn-ghost btn-sm">30D</button>
                  </div>
                </div>
                <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "8px", padding: "16px 0" }}>
                  {[60, 75, 50, 85, 70, 90, 100].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}%`, background: "var(--primary)", borderRadius: "4px 4px 0 0", opacity: i === 6 ? 1 : 0.7 }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-tertiary)", paddingTop: "8px", borderTop: "1px solid var(--border-default)" }}>
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
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
                    <div style={{ fontSize: "13px" }}>This campaign is performing 23% better than industry average. Consider increasing budget.</div>
                  </div>
                  <div style={{ padding: "12px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "6px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--warning)", marginBottom: "4px" }}>⚠️ Warning</div>
                    <div style={{ fontSize: "13px" }}>3 keywords have high spend with low conversions.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Keywords */}
            <div className="card" style={{ marginTop: "24px" }}>
              <div className="card-header">
                <span className="card-title">Top Performing Keywords</span>
                <button className="btn btn-ghost btn-sm">View All →</button>
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
                  {mockKeywords.slice(0, 3).map((kw) => (
                    <tr key={kw.id}>
                      <td className="mono" style={{ fontSize: "12px" }}>{kw.text}</td>
                      <td><span className="badge badge-info" style={{ fontSize: "10px" }}>[{kw.matchType}]</span></td>
                      <td className="right mono">{formatNumber(kw.clicks)}</td>
                      <td className="right mono">{kw.conversions}</td>
                      <td className="right mono">{kw.cpa > 0 ? formatMicros(kw.cpa) : "—"}</td>
                      <td className="right"><span style={{ color: kw.qs >= 7 ? "var(--success)" : "var(--warning)", fontWeight: 600 }}>{kw.qs}/10</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab Content: Keywords */}
        {activeTab === "keywords" && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <input type="text" className="input" placeholder="Search keywords..." style={{ width: "250px" }} />
              <button className="btn btn-primary btn-sm">+ Add Keywords</button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "30px" }}><input type="checkbox" /></th>
                  <th>Keyword</th>
                  <th>Match</th>
                  <th>Status</th>
                  <th className="right">Impr</th>
                  <th className="right">Clicks</th>
                  <th className="right">Conv</th>
                  <th className="right">CPA</th>
                  <th className="center">QS</th>
                </tr>
              </thead>
              <tbody>
                {mockKeywords.map((kw) => (
                  <tr key={kw.id} style={{ background: kw.conversions === 0 && kw.clicks > 100 ? "rgba(239, 68, 68, 0.05)" : undefined }}>
                    <td><input type="checkbox" /></td>
                    <td className="mono" style={{ fontSize: "12px" }}>{kw.text}</td>
                    <td><span className="badge badge-neutral" style={{ fontSize: "10px" }}>{kw.matchType}</span></td>
                    <td><span style={{ color: "var(--success)" }}>●</span></td>
                    <td className="right mono">{formatNumber(kw.impressions)}</td>
                    <td className="right mono">{formatNumber(kw.clicks)}</td>
                    <td className="right mono" style={{ color: kw.conversions === 0 ? "var(--error)" : undefined }}>{kw.conversions || "—"}</td>
                    <td className="right mono">{kw.cpa > 0 ? formatMicros(kw.cpa) : "—"}</td>
                    <td className="center"><span style={{ color: kw.qs >= 7 ? "var(--success)" : kw.qs >= 5 ? "var(--warning)" : "var(--error)" }}>{kw.qs}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Wasting Keywords Alert */}
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
                    1 keyword spent $234 with 0 conversions in the last 30 days.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-secondary btn-sm">Review</button>
                  <button className="btn btn-sm" style={{ background: "var(--error)", color: "white" }}>Pause</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for other tabs */}
        {!["overview", "keywords"].includes(activeTab) && (
          <div className="card" style={{ padding: "48px", textAlign: "center", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>🚧</div>
            <div style={{ fontSize: "16px", fontWeight: 500 }}>{tabs.find(t => t.id === activeTab)?.label} view</div>
            <div style={{ fontSize: "14px" }}>Coming soon...</div>
          </div>
        )}
      </div>
    </>
  );
}
