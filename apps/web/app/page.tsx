import Header from "@/components/layout/Header";
import MetricCard from "@/components/dashboard/MetricCard";
import BudgetPacing from "@/components/dashboard/BudgetPacing";
import HealthScore from "@/components/dashboard/HealthScore";
import CampaignsTable from "@/components/dashboard/CampaignsTable";

// Mock data - will be replaced with API calls
const mockMetrics = {
  spend: { value: "$45,678", change: "▲ 12.3%", direction: "up" as const },
  conversions: { value: "1,234", change: "▲ 18.5%", direction: "up" as const },
  cpa: { value: "$37.02", change: "▼ 8.2%", direction: "down" as const, benchmark: { label: "Industry avg", value: "$28.10", comparison: "above" as const } },
  roas: { value: "4.2x", change: "▲ 5.1%", direction: "up" as const },
  clicks: { value: "28,456", change: "▲ 9.8%", direction: "up" as const },
  impressions: { value: "1.2M", change: "▲ 15.2%", direction: "up" as const },
};

const mockCampaigns = [
  { id: "1", name: "Search - Brand", type: "SEARCH", status: "ENABLED", spend: 12500_000000, budget: 15000_000000, impressions: 125000, clicks: 4500, conversions: 156, cpa: 80_128205, roas: 4.2 },
  { id: "2", name: "Search - Non-Brand", type: "SEARCH", status: "ENABLED", spend: 8900_000000, budget: 10000_000000, impressions: 89000, clicks: 2800, conversions: 89, cpa: 100_000000, roas: 3.1 },
  { id: "3", name: "PMax - Products", type: "PERFORMANCE_MAX", status: "ENABLED", spend: 15600_000000, budget: 20000_000000, impressions: 450000, clicks: 8900, conversions: 234, cpa: 66_666666, roas: 5.2 },
  { id: "4", name: "Display - Remarketing", type: "DISPLAY", status: "PAUSED", spend: 2300_000000, budget: 5000_000000, impressions: 230000, clicks: 1200, conversions: 45, cpa: 51_111111, roas: 2.8 },
  { id: "5", name: "YouTube - Brand Awareness", type: "VIDEO", status: "ENABLED", spend: 6378_000000, budget: 8000_000000, impressions: 320000, clicks: 2100, conversions: 67, cpa: 95_194029, roas: 1.9 },
];

const mockHealthItems = [
  { label: "Waste Control", score: 82 },
  { label: "Targeting", score: 61 },
  { label: "Tracking", score: 90 },
  { label: "ROI", score: 78 },
];

export default function Dashboard() {
  return (
    <>
      <Header title="Dashboard" />
      <div className="page-content">
        {/* AI Savings Banner */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "var(--primary-light)",
          borderRadius: "var(--radius-lg)",
          marginBottom: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>🤖</span>
            <div>
              <div className="mono" style={{ fontSize: "20px", fontWeight: 700, color: "var(--primary)" }}>
                $1,247
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                saved by AI this month
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm">View details →</button>
        </div>

        {/* Budget Pacing */}
        <BudgetPacing
          spent={45678}
          budget={80000}
          daysElapsed={14}
          daysInMonth={31}
        />

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <MetricCard
            label="Total Spend"
            value={mockMetrics.spend.value}
            change={mockMetrics.spend.change}
            changeDirection={mockMetrics.spend.direction}
          />
          <MetricCard
            label="Conversions"
            value={mockMetrics.conversions.value}
            change={mockMetrics.conversions.change}
            changeDirection={mockMetrics.conversions.direction}
          />
          <MetricCard
            label="Avg CPA"
            value={mockMetrics.cpa.value}
            change={mockMetrics.cpa.change}
            changeDirection="up"
            benchmark={mockMetrics.cpa.benchmark}
          />
          <MetricCard
            label="ROAS"
            value={mockMetrics.roas.value}
            change={mockMetrics.roas.change}
            changeDirection={mockMetrics.roas.direction}
          />
          <MetricCard
            label="Clicks"
            value={mockMetrics.clicks.value}
            change={mockMetrics.clicks.change}
            changeDirection={mockMetrics.clicks.direction}
          />
          <MetricCard
            label="Impressions"
            value={mockMetrics.impressions.value}
            change={mockMetrics.impressions.change}
            changeDirection={mockMetrics.impressions.direction}
          />
        </div>

        {/* Main Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px" }}>
          {/* Left Column */}
          <div>
            {/* Campaigns Table */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>Campaigns</h2>
                <button className="btn btn-primary btn-sm">+ New Campaign</button>
              </div>
              <CampaignsTable campaigns={mockCampaigns} accountId="1" />
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Health Score */}
            <div style={{ marginBottom: "24px" }}>
              <HealthScore overallScore={78} items={mockHealthItems} />
            </div>

            {/* AI Recommendations Preview */}
            <div className="card" style={{ borderLeft: "3px solid var(--error)" }}>
              <div className="card-header">
                <span className="card-title">🤖 AI Recommendations</span>
                <span className="badge badge-error">3 Critical</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{
                  padding: "12px",
                  background: "rgba(239, 68, 68, 0.05)",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}>
                  <div style={{ fontWeight: 500, marginBottom: "4px" }}>
                    3 wasting keywords detected
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                    $245 spent with 0 conversions
                  </div>
                </div>
                <div style={{
                  padding: "12px",
                  background: "rgba(245, 158, 11, 0.05)",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}>
                  <div style={{ fontWeight: 500, marginBottom: "4px" }}>
                    Budget limited campaign
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                    Missing ~12 conversions/week
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: "12px", width: "100%" }}>
                View all recommendations →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
