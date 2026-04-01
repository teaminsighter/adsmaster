# Phase 15: Mobile Design Plan

## Overview

This document outlines the mobile responsive design plan for AdsMaster dashboard. Based on Phase 12 design system, the mobile design is **secondary** (desktop-first for agency users), but essential for quick checks and approvals on-the-go.

---

## 1. Breakpoints (from Phase 12)

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Desktop Large | 1536px+ | Full layout, all panels |
| Desktop | 1280px+ | Standard layout |
| Laptop | 1024px+ | Collapsed sidebar by default |
| **Tablet** | 768px+ | Hamburger menu, stacked cards |
| **Mobile** | < 768px | Single column, bottom nav |

---

## 2. Current Dashboard - Implemented vs Missing

### 2.1 Currently WORKING on Dashboard

| Feature | Status | File Location |
|---------|--------|---------------|
| Header with title | ✅ Working | `components/layout/Header.tsx` |
| Date Range Picker | ✅ Working | `components/ui/DateRangePicker.tsx` |
| Theme Toggle (Light/Dark) | ✅ Working | `components/layout/Header.tsx` |
| User Profile Dropdown | ✅ Working | `components/layout/Header.tsx` |
| Sidebar Navigation | ✅ Working | `components/layout/Sidebar.tsx` |
| Account Selector (sidebar) | ✅ Working | `components/layout/Sidebar.tsx` |
| Demo Banner | ✅ Working | `components/ui/DemoBanner.tsx` |
| AI Savings Banner | ✅ Working | `app/dashboard/page.tsx` (inline) |
| Metrics Grid (6 cards) | ✅ Working | `app/dashboard/page.tsx` (inline) |
| Performance Chart (bar) | ✅ Working | `app/dashboard/page.tsx` (inline) |
| Health Score Grid | ✅ Working | `app/dashboard/page.tsx` (inline) |
| Platform Breakdown | ✅ Working | `app/dashboard/page.tsx` (inline) |
| AI Recommendations Count | ✅ Working | `app/dashboard/page.tsx` (inline) |
| Top Campaigns Table | ✅ Working | `app/dashboard/page.tsx` (inline) |
| Loading State | ✅ Working | `app/dashboard/page.tsx` (inline) |
| Error State | ✅ Working | `app/dashboard/page.tsx` (inline) |

### 2.2 Component Files EXIST but NOT integrated in Dashboard

| Component | Status | File Location |
|-----------|--------|---------------|
| BudgetPacing | 🔶 Exists, not used | `components/dashboard/BudgetPacing.tsx` |
| CampaignsTable | 🔶 Exists, not used | `components/dashboard/CampaignsTable.tsx` |
| MetricCard | 🔶 Exists, not used | `components/dashboard/MetricCard.tsx` |
| HealthScore | 🔶 Exists, not used | `components/dashboard/HealthScore.tsx` |

### 2.3 MISSING from Dashboard (from wireframe)

| Feature | Priority | Notes |
|---------|----------|-------|
| Budget Pacing Bar | HIGH | Component exists, need to integrate + API |
| Metric Benchmarks | MEDIUM | Industry comparisons under each metric |
| Chart Metric Toggles | MEDIUM | Functional Spend/Revenue/Conv/ROAS buttons |
| Recommendations with Confidence | MEDIUM | Show 94%, 100% confidence scores |
| PMax Network Breakdown | LOW | Search/YouTube/Display/Discovery split |
| Row Actions Menu (⋮) | MEDIUM | Edit/Pause/Duplicate/Delete dropdown |
| Table: Full columns | HIGH | Budget, Pacing, Impr, CTR, CPA |
| Bulk Actions Bar | MEDIUM | Floating bar when rows selected |
| Table Pagination | LOW | "Showing 5 of 23" + page numbers |
| "+ New Campaign" button | LOW | In table header |

---

## 3. Mobile Design Requirements

### 3.1 Layout Changes (< 768px)

```
DESKTOP LAYOUT:                    MOBILE LAYOUT:
┌─────────┬──────────────┐         ┌──────────────────┐
│ Sidebar │   Content    │         │   Mobile Header  │
│  240px  │    Fluid     │   →     ├──────────────────┤
│         │              │         │     Content      │
│         │              │         │   (scrollable)   │
└─────────┴──────────────┘         ├──────────────────┤
                                   │   Bottom Nav     │
                                   └──────────────────┘
```

### 3.2 Mobile Header (NEW)

```
┌──────────────────────────────────────────────────┐
│ ☰  │  AdsMaster        │  📅  │  👤             │
│    │  Dashboard        │      │                  │
└──────────────────────────────────────────────────┘
     │                    │       │
     │                    │       └─ Profile (compact)
     │                    └─ Date picker trigger
     └─ Hamburger menu (opens sidebar overlay)
```

**Requirements:**
- Hamburger menu icon (☰) on left
- Page title centered or left-aligned
- Date picker as icon button (📅) - opens bottom sheet
- Profile avatar (compact)
- Height: 56px (same as desktop)
- Sticky at top

### 3.3 Mobile Bottom Navigation (NEW)

```
┌──────────────────────────────────────────────────┐
│  📊      │   📢      │   🤖      │   📈      │   ⚙️   │
│ Dashboard│ Campaigns │    AI     │ Analytics │ More  │
└──────────────────────────────────────────────────┘
```

**Requirements:**
- 5 main nav items (replaces sidebar)
- Icons with labels below
- Active state: green highlight
- Height: 64px
- Fixed at bottom
- Safe area padding for notch devices

### 3.4 Sidebar Overlay (Mobile)

```
┌─────────────────┬────────────────────────────────┐
│                 │                                │
│    Sidebar      │      Overlay (tap to close)   │
│    (240px)      │         (dimmed bg)           │
│                 │                                │
│  ─────────────  │                                │
│  Account Select │                                │
│  ─────────────  │                                │
│  Dashboard      │                                │
│  Campaigns      │                                │
│  AI Recs        │                                │
│  Analytics      │                                │
│  ...            │                                │
│                 │                                │
└─────────────────┴────────────────────────────────┘
```

**Requirements:**
- Slides in from left
- Backdrop overlay (tap to close)
- Same content as desktop sidebar
- Width: 280px (slightly wider for touch)
- Animation: slide + fade

---

## 4. Dashboard Mobile Components

### 4.1 Metrics Grid (Mobile)

```
DESKTOP (6 columns):              MOBILE (2 columns, stacked):
┌────┬────┬────┬────┬────┬────┐   ┌─────────┬─────────┐
│    │    │    │    │    │    │   │ Spend   │ Revenue │
└────┴────┴────┴────┴────┴────┘   │ $45,678 │ $156K   │
                                   ├─────────┼─────────┤
                                   │ ROAS    │ Conv    │
                                   │ 3.2x    │ 1,234   │
                                   ├─────────┼─────────┤
                                   │ CPA     │ CTR     │
                                   │ $37.02  │ 4.8%    │
                                   └─────────┴─────────┘
```

**CSS:**
```css
@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
```

### 4.2 Budget Pacing (Mobile)

```
Desktop:                          Mobile (compact):
┌───────────────────────────┐     ┌─────────────────────┐
│ Budget │ Spent │ Day │    │     │ Budget Pacing    ⚠️ │
│ $80K   │ $45K  │ 14  │    │     │                     │
│        │       │     │    │     │ $45,678 / $80,000   │
│ ████████████░░░░░░░░░    │     │ ████████░░░░   57%  │
└───────────────────────────┘     │ Overspend: +$12.4K  │
                                   └─────────────────────┘
```

**Requirements:**
- Collapse stats to 1 line
- Larger progress bar
- Warning message below bar

### 4.3 Performance Chart (Mobile)

```
┌─────────────────────────────────┐
│ Performance          [14 Days] │
│ ┌─────────────────────────────┐│
│ │ [Spend] [Conv] [ROAS]       ││
│ └─────────────────────────────┘│
│                                 │
│  █ █ █ █ █ █ █ █ █ █ █ █ █ █  │
│  ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄ ▄  │
│                                 │
└─────────────────────────────────┘
```

**Requirements:**
- Full width
- Metric toggles scrollable horizontally
- Chart height: 160px (vs 200px desktop)
- Touch-friendly toggle buttons (44px min)

### 4.4 Health Score + Platform (Mobile - Stacked)

```
Desktop (side by side):           Mobile (stacked):
┌─────────────┬─────────────┐     ┌─────────────────────┐
│ Health 78%  │ Platforms   │     │ Account Health  78% │
│ ┌───┬───┐   │ Google 62%  │     │ ├── Waste     82%  │
│ │82%│61%│   │ Meta   35%  │     │ ├── Targeting 61%  │
│ ├───┼───┤   │ TikTok  3%  │     │ ├── Tracking  90%  │
│ │90%│70%│   │             │     │ └── ROI       70%  │
│ └───┴───┘   │             │     └─────────────────────┘
└─────────────┴─────────────┘     ┌─────────────────────┐
                                   │ Spend by Platform   │
                                   │ Google ████░  62%   │
                                   │ Meta   ███░   35%   │
                                   │ TikTok █░      3%   │
                                   └─────────────────────┘
```

### 4.5 AI Recommendations (Mobile)

```
┌─────────────────────────────────┐
│ AI Recommendations         (12)│
├─────────────────────────────────┤
│ ┌─────────────────────────────┐│
│ │🔴 CRITICAL                  ││
│ │3 wasting keywords detected  ││
│ │💰 Save $245/mo    [94%]     ││
│ │                             ││
│ │ [Pause All]  [View Details] ││
│ └─────────────────────────────┘│
│                                 │
│ [View All 12 Recommendations →]│
└─────────────────────────────────┘
```

**Requirements:**
- Show 1-2 top recommendations
- Swipe to see more
- Confidence badge inline
- Action buttons full width

### 4.6 Campaigns Table (Mobile - Card View)

**Problem:** Tables don't work well on mobile (too many columns)

**Solution:** Switch to card view on mobile

```
Desktop (table):                  Mobile (cards):
┌────────────────────────────┐    ┌─────────────────────┐
│ Campaign │ Status │ Spend  │    │ Search - Brand   🟢 │
│ ─────────┼────────┼─────── │    │ Google · Active     │
│ Search   │ ●Active│ $1,234 │    │                     │
│ PMax     │ ●Active│ $2,567 │    │ Spend    Budget     │
│ Retarget │ ●Active│ $890   │    │ $1,234   $100/d     │
└────────────────────────────┘    │                     │
                                   │ Conv  45   ROAS 3.2x│
                                   │                     │
                                   │ [View] [⋯ Actions]  │
                                   └─────────────────────┘
                                   ┌─────────────────────┐
                                   │ PMax - Products  🟢 │
                                   │ Google · Active     │
                                   │ ...                 │
                                   └─────────────────────┘
```

**Requirements:**
- Card layout on mobile
- Checkbox for selection (left side)
- Key metrics: Spend, Budget, Conv, ROAS
- Action button expands menu
- Swipe left for quick actions (pause/enable)

---

## 5. CSS Implementation Plan

### 5.1 New CSS Variables for Mobile

```css
:root {
  /* Mobile-specific */
  --mobile-header-height: 56px;
  --mobile-bottom-nav-height: 64px;
  --mobile-safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --touch-target-min: 44px;
}
```

### 5.2 Mobile Utility Classes

```css
/* Hide on mobile */
@media (max-width: 767px) {
  .hide-mobile { display: none !important; }
}

/* Hide on desktop */
@media (min-width: 768px) {
  .hide-desktop { display: none !important; }
}

/* Mobile-only full width */
@media (max-width: 767px) {
  .mobile-full-width { width: 100% !important; }
}

/* Touch-friendly button */
.touch-target {
  min-height: var(--touch-target-min);
  min-width: var(--touch-target-min);
}
```

### 5.3 Grid Responsive Updates

```css
/* 2-column grids */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

---

## 6. Component Implementation Plan

### 6.1 New Components to Create

| Component | File | Purpose |
|-----------|------|---------|
| MobileHeader | `components/layout/MobileHeader.tsx` | Compact header with hamburger |
| BottomNav | `components/layout/BottomNav.tsx` | Mobile bottom navigation |
| SidebarOverlay | `components/layout/SidebarOverlay.tsx` | Mobile sidebar drawer |
| CampaignCard | `components/dashboard/CampaignCard.tsx` | Mobile card view for campaigns |
| MobileDatePicker | `components/ui/MobileDatePicker.tsx` | Bottom sheet date picker |

### 6.2 Components to Update

| Component | Changes |
|-----------|---------|
| `Sidebar.tsx` | Add mobile overlay mode, close on route change |
| `Header.tsx` | Hide on mobile, show MobileHeader instead |
| `globals.css` | Add all mobile breakpoint styles |
| `layout.tsx` | Conditional header/nav rendering |
| `dashboard/page.tsx` | Add responsive grid classes |
| `BudgetPacing.tsx` | Add mobile compact variant |
| `CampaignsTable.tsx` | Switch to card view on mobile |

---

## 7. Implementation Order

### Phase 15.1: Core Mobile Layout (Priority: HIGH)
1. Update `globals.css` with mobile breakpoints
2. Create `MobileHeader.tsx`
3. Create `BottomNav.tsx`
4. Create `SidebarOverlay.tsx`
5. Update `layout.tsx` to use mobile components
6. Test sidebar open/close on mobile

### Phase 15.2: Dashboard Mobile (Priority: HIGH)
1. Update metrics grid responsive styles
2. Make chart responsive (height, toggles)
3. Stack grid-2 sections
4. Update Health Score for mobile
5. Update Platform Breakdown for mobile
6. Test all sections on mobile viewport

### Phase 15.3: Table → Card View (Priority: MEDIUM)
1. Create `CampaignCard.tsx`
2. Update `CampaignsTable.tsx` with media query
3. Add mobile-specific touch interactions
4. Test row selection on mobile

### Phase 15.4: Mobile Enhancements (Priority: LOW)
1. Create `MobileDatePicker.tsx` (bottom sheet)
2. Add swipe gestures for cards
3. Add pull-to-refresh
4. Optimize touch targets
5. Test on real devices

---

## 8. Testing Checklist

### 8.1 Viewport Testing
- [ ] iPhone SE (375px)
- [ ] iPhone 14 (390px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] iPad Mini (768px)
- [ ] iPad Pro (1024px)

### 8.2 Functionality Testing
- [ ] Hamburger menu opens/closes sidebar
- [ ] Bottom nav navigates correctly
- [ ] Date picker works in mobile mode
- [ ] Metrics grid stacks properly
- [ ] Charts render correctly
- [ ] Campaign cards display all data
- [ ] Touch targets are 44px minimum
- [ ] Safe area respected on notch devices

### 8.3 Performance Testing
- [ ] Page load under 3s on 3G
- [ ] Smooth scroll (60fps)
- [ ] No layout shift on load
- [ ] Images lazy loaded

---

## 9. Files to Create/Modify Summary

### New Files:
```
apps/web/
├── components/
│   ├── layout/
│   │   ├── MobileHeader.tsx       # NEW
│   │   ├── BottomNav.tsx          # NEW
│   │   └── SidebarOverlay.tsx     # NEW
│   ├── dashboard/
│   │   └── CampaignCard.tsx       # NEW
│   └── ui/
│       └── MobileDatePicker.tsx   # NEW
```

### Modified Files:
```
apps/web/
├── app/
│   ├── layout.tsx                 # Add mobile detection
│   └── dashboard/page.tsx         # Add responsive classes
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx            # Mobile overlay mode
│   │   └── Header.tsx             # Hide on mobile
│   └── dashboard/
│       ├── BudgetPacing.tsx       # Mobile variant
│       └── CampaignsTable.tsx     # Card view mode
└── app/
    └── globals.css                # Mobile styles
```

---

## 10. Notes

- **Primary focus**: Quick dashboard review on mobile
- **Not required on mobile**: Bulk campaign editing, complex filters
- **Touch-first**: All interactive elements 44px minimum
- **Performance**: Lazy load non-critical components
- **Testing**: Use Chrome DevTools + real device testing
