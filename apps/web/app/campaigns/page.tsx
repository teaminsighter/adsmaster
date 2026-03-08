import Header from "@/components/layout/Header";
import CampaignsTable from "@/components/dashboard/CampaignsTable";

const mockCampaigns = [
  { id: "1", name: "Search - Brand", type: "SEARCH", status: "ENABLED", spend: 12500_000000, budget: 15000_000000, impressions: 125000, clicks: 4500, conversions: 156, cpa: 80_128205, roas: 4.2 },
  { id: "2", name: "Search - Non-Brand", type: "SEARCH", status: "ENABLED", spend: 8900_000000, budget: 10000_000000, impressions: 89000, clicks: 2800, conversions: 89, cpa: 100_000000, roas: 3.1 },
  { id: "3", name: "PMax - Products", type: "PERFORMANCE_MAX", status: "ENABLED", spend: 15600_000000, budget: 20000_000000, impressions: 450000, clicks: 8900, conversions: 234, cpa: 66_666666, roas: 5.2 },
  { id: "4", name: "Display - Remarketing", type: "DISPLAY", status: "PAUSED", spend: 2300_000000, budget: 5000_000000, impressions: 230000, clicks: 1200, conversions: 45, cpa: 51_111111, roas: 2.8 },
  { id: "5", name: "YouTube - Brand Awareness", type: "VIDEO", status: "ENABLED", spend: 6378_000000, budget: 8000_000000, impressions: 320000, clicks: 2100, conversions: 67, cpa: 95_194029, roas: 1.9 },
  { id: "6", name: "Shopping - All Products", type: "SHOPPING", status: "ENABLED", spend: 9200_000000, budget: 12000_000000, impressions: 180000, clicks: 5600, conversions: 178, cpa: 51_685393, roas: 4.8 },
  { id: "7", name: "Search - Competitor", type: "SEARCH", status: "PAUSED", spend: 3100_000000, budget: 4000_000000, impressions: 45000, clicks: 890, conversions: 23, cpa: 134_782608, roas: 1.2 },
];

export default function CampaignsPage() {
  return (
    <>
      <Header title="Campaigns" />
      <div className="page-content">
        {/* Filters */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}>
          <div style={{ display: "flex", gap: "12px" }}>
            <input
              type="text"
              className="input"
              placeholder="Search campaigns..."
              style={{ width: "250px" }}
            />
            <select className="select">
              <option value="">All Status</option>
              <option value="ENABLED">Active</option>
              <option value="PAUSED">Paused</option>
            </select>
            <select className="select">
              <option value="">All Types</option>
              <option value="SEARCH">Search</option>
              <option value="PERFORMANCE_MAX">Performance Max</option>
              <option value="DISPLAY">Display</option>
              <option value="VIDEO">Video</option>
              <option value="SHOPPING">Shopping</option>
            </select>
          </div>
          <button className="btn btn-primary">+ New Campaign</button>
        </div>

        {/* Summary Stats */}
        <div className="metrics-grid" style={{ marginBottom: "24px" }}>
          <div className="metric-card">
            <div className="metric-label">Total Campaigns</div>
            <div className="metric-value">7</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              5 active, 2 paused
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Budget</div>
            <div className="metric-value">$74,000</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Monthly
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Spend (30d)</div>
            <div className="metric-value">$57,978</div>
            <div className="metric-change up">▲ 12.3% vs last period</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg ROAS</div>
            <div className="metric-value">3.4x</div>
            <div className="metric-change up">▲ 0.3x vs last period</div>
          </div>
        </div>

        {/* Campaigns Table */}
        <CampaignsTable campaigns={mockCampaigns} accountId="1" />
      </div>
    </>
  );
}
