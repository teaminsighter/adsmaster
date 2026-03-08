# UI Updates

> Track all UI/UX changes, design decisions, and frontend improvements.

---

## Design System

- **Primary Color:** Green (#10B981) - Growth/ROI focus
- **Font (UI):** Inter
- **Font (Numbers):** JetBrains Mono
- **Style:** Data-dense, Bloomberg/Trading platform inspired
- **Themes:** Light + Dark (equal support)

---

## Completed UI Updates

### 2026-03-08: Dashboard UX Overhaul

**14 Issues Fixed (from ui-claude.suggestion.md):**

| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | No Budget Pacing | Added pacing bar with warning state |
| 2 | Missing table columns | Added Budget, Pacing, Impr, CTR |
| 3 | Static chart | Added Spend/Revenue/Conv/ROAS toggles |
| 4 | No PMax breakdown | Added network breakdown section |
| 5 | Navigation dead ends | Wired onclick handlers |
| 6 | Health dots unreadable | Changed to percentages (82% 🟢) |
| 7 | No confidence scores | Added to all recommendations |
| 8 | Fixed date dropdown | Added Custom Range option |
| 9 | No bulk actions | Added floating action bar |
| 10 | Three-dot menu dead | Added working dropdown |
| 11 | No AI value shown | Added "Money Saved by AI" banner |
| 12 | Keywords page missing | Noted for Sprint 3 |
| 13 | No benchmarks | Added to metric cards |
| 14 | AI chat too hidden | Noted for Sprint 3 |

**File Updated:** `wireframes/critical-views/01-dashboard.html`
- Before: 780 lines
- After: 1506 lines

---

## Pending UI Work

### Sprint 3 (Frontend MVP)

- [ ] Build actual React components from wireframes
- [ ] Implement design tokens as CSS variables
- [ ] Create MetricCard component
- [ ] Create BudgetPacingBar component
- [ ] Create SpendChart with toggles
- [ ] Create CampaignTable with sorting
- [ ] Create HealthScore component
- [ ] Implement dark/light theme toggle
- [ ] Add Keywords page/view

---

## Wireframe Files

| File | Status | Last Updated |
|------|--------|--------------|
| index.html (main) | Needs update | 2026-03-07 |
| 01-dashboard.html | ✅ Updated | 2026-03-08 |
| 02-campaign-detail.html | Ready | 2026-03-07 |
| 03-ai-recommendations.html | Ready | 2026-03-07 |
| 04-analytics.html | Ready | 2026-03-07 |
| 05-onboarding.html | Ready | 2026-03-07 |

---

## UI Feedback Received

- `ui-claude.suggestion.md` - 14 points, all addressed in dashboard
