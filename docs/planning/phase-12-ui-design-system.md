# Phase 12: UI Design System & Wireframes

## Design Direction

Based on requirements:
- **Style**: Data-Dense (Bloomberg/Trading platform aesthetic)
- **Primary Color**: Green (Growth/Money/ROI focus)
- **Theme**: Both Light & Dark modes (equal support)
- **Target**: Agencies (multi-client, professional, white-label ready)

---

## 1. Design Principles

### 1.1 Core Principles

| Principle | Description |
|-----------|-------------|
| **Data Density** | Maximize information per screen, minimize scrolling |
| **Scanability** | Key metrics visible at a glance with clear hierarchy |
| **Efficiency** | Keyboard shortcuts, quick actions, minimal clicks |
| **Clarity** | Clear status indicators, no ambiguity |
| **Consistency** | Same patterns across all views |

### 1.2 Design Inspiration

```
┌─────────────────────────────────────────────────────────────────┐
│  INSPIRATION SOURCES                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Bloomberg Terminal    →  Data density, information hierarchy  │
│  Linear               →  Clean UI, keyboard navigation         │
│  Stripe Dashboard     →  Financial data presentation           │
│  Datadog              →  Monitoring dashboards, charts         │
│  Figma                →  Professional tool aesthetic           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Color System

### 2.1 Primary Palette (Green - Growth)

```
┌─────────────────────────────────────────────────────────────────┐
│  PRIMARY GREEN PALETTE                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ████  Green 50   #ECFDF5  (Lightest - backgrounds)            │
│  ████  Green 100  #D1FAE5                                       │
│  ████  Green 200  #A7F3D0                                       │
│  ████  Green 300  #6EE7B7                                       │
│  ████  Green 400  #34D399                                       │
│  ████  Green 500  #10B981  ← PRIMARY (buttons, links)          │
│  ████  Green 600  #059669  ← Hover state                       │
│  ████  Green 700  #047857                                       │
│  ████  Green 800  #065F46                                       │
│  ████  Green 900  #064E3B  (Darkest)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Semantic Colors

```
┌─────────────────────────────────────────────────────────────────┐
│  SEMANTIC COLORS                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SUCCESS (Profit/Up)                                            │
│  ████  Light: #10B981   Dark: #34D399                          │
│                                                                 │
│  WARNING (Alert/Caution)                                        │
│  ████  Light: #F59E0B   Dark: #FBBF24                          │
│                                                                 │
│  ERROR/LOSS (Down/Critical)                                     │
│  ████  Light: #EF4444   Dark: #F87171                          │
│                                                                 │
│  INFO (Neutral/Information)                                     │
│  ████  Light: #3B82F6   Dark: #60A5FA                          │
│                                                                 │
│  OPPORTUNITY (AI Suggestion)                                    │
│  ████  Light: #8B5CF6   Dark: #A78BFA                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Light Theme

```css
/* Light Theme Variables */
:root {
  /* Background */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F9FAFB;
  --bg-tertiary: #F3F4F6;
  --bg-elevated: #FFFFFF;

  /* Text */
  --text-primary: #111827;
  --text-secondary: #6B7280;
  --text-tertiary: #9CA3AF;
  --text-inverse: #FFFFFF;

  /* Border */
  --border-default: #E5E7EB;
  --border-strong: #D1D5DB;

  /* Primary Brand */
  --primary: #10B981;
  --primary-hover: #059669;
  --primary-light: #ECFDF5;

  /* Surfaces */
  --surface-card: #FFFFFF;
  --surface-overlay: rgba(0, 0, 0, 0.5);
}
```

### 2.4 Dark Theme

```css
/* Dark Theme Variables */
[data-theme="dark"] {
  /* Background */
  --bg-primary: #0F0F0F;
  --bg-secondary: #171717;
  --bg-tertiary: #1F1F1F;
  --bg-elevated: #262626;

  /* Text */
  --text-primary: #FAFAFA;
  --text-secondary: #A1A1AA;
  --text-tertiary: #71717A;
  --text-inverse: #0F0F0F;

  /* Border */
  --border-default: #27272A;
  --border-strong: #3F3F46;

  /* Primary Brand */
  --primary: #34D399;
  --primary-hover: #10B981;
  --primary-light: rgba(16, 185, 129, 0.1);

  /* Surfaces */
  --surface-card: #171717;
  --surface-overlay: rgba(0, 0, 0, 0.8);
}
```

### 2.5 Data Visualization Colors

```
┌─────────────────────────────────────────────────────────────────┐
│  CHART COLORS (Optimized for both themes)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ████  Chart 1:  #10B981 (Green - Primary metric)              │
│  ████  Chart 2:  #3B82F6 (Blue - Secondary metric)             │
│  ████  Chart 3:  #8B5CF6 (Purple - Tertiary)                   │
│  ████  Chart 4:  #F59E0B (Amber - Quaternary)                  │
│  ████  Chart 5:  #EC4899 (Pink - Fifth)                        │
│  ████  Chart 6:  #06B6D4 (Cyan - Sixth)                        │
│                                                                 │
│  UP/POSITIVE:   #10B981 (Green)                                │
│  DOWN/NEGATIVE: #EF4444 (Red)                                  │
│  NEUTRAL:       #6B7280 (Gray)                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Typography

### 3.1 Font Stack

```css
/* Primary Font - Data & UI */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace - Numbers & Code */
--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

**Why Inter?**
- Excellent for data-dense UIs
- Clear number distinction (0 vs O, 1 vs l)
- Tabular numbers feature for aligned data
- Good readability at small sizes

### 3.2 Type Scale (Data-Dense)

```
┌─────────────────────────────────────────────────────────────────┐
│  TYPE SCALE (Compact for data density)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  xs    11px / 1.45  →  Labels, captions, timestamps            │
│  sm    12px / 1.5   →  Table cells, secondary text             │
│  base  13px / 1.5   →  Body text, form inputs                  │
│  md    14px / 1.45  →  Emphasized body, nav items              │
│  lg    16px / 1.4   →  Card titles, section headers            │
│  xl    18px / 1.35  →  Page section titles                     │
│  2xl   22px / 1.3   →  Page titles                             │
│  3xl   28px / 1.2   →  Dashboard hero metrics                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Font Weights

```
┌─────────────────────────────────────────────────────────────────┐
│  FONT WEIGHTS                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  400 (Regular)   →  Body text, descriptions                    │
│  500 (Medium)    →  Labels, table headers, nav items           │
│  600 (Semibold)  →  Headings, buttons, emphasis                │
│  700 (Bold)      →  Key metrics, important numbers             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Number Formatting

```css
/* Use tabular numbers for aligned data */
.metric-value {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' on;
}

/* Currency formatting */
.currency {
  font-weight: 600;
  letter-spacing: -0.02em;
}

/* Percentage with color */
.percent-up { color: var(--success); }
.percent-down { color: var(--error); }
```

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

```
┌─────────────────────────────────────────────────────────────────┐
│  SPACING SCALE (4px base - compact)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  0.5   2px   →  Micro spacing (icon gaps)                      │
│  1     4px   →  Tight spacing (inline elements)                │
│  1.5   6px   →  Compact padding                                │
│  2     8px   →  Small padding, gaps                            │
│  3    12px   →  Standard padding                               │
│  4    16px   →  Card padding, section gaps                     │
│  5    20px   →  Large gaps                                     │
│  6    24px   →  Section spacing                                │
│  8    32px   →  Page section margins                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Grid System

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYOUT GRID                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Sidebar:     240px (collapsible to 64px)                      │
│  Content:     Fluid (min: 800px, max: 1600px)                  │
│  Right Panel: 320px (optional, AI chat)                        │
│                                                                 │
│  ┌──────┬────────────────────────────────────┬────────┐        │
│  │ 240  │              Fluid                 │  320   │        │
│  │  px  │         (main content)             │   px   │        │
│  │      │                                    │ (chat) │        │
│  └──────┴────────────────────────────────────┴────────┘        │
│                                                                 │
│  Content Grid: 12 columns, 16px gap                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Library

### 5.1 Buttons

```
┌─────────────────────────────────────────────────────────────────┐
│  BUTTON VARIANTS                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PRIMARY (Green - main actions)                                 │
│  ┌─────────────┐  Height: 32px, Padding: 12px 16px             │
│  │  Apply All  │  Font: 13px/500                               │
│  └─────────────┘  Border-radius: 6px                           │
│                                                                 │
│  SECONDARY (Outline - secondary actions)                        │
│  ┌─────────────┐  Border: 1px solid var(--border-strong)       │
│  │   Cancel    │  Background: transparent                      │
│  └─────────────┘                                                │
│                                                                 │
│  GHOST (Minimal - tertiary actions)                             │
│  ┌─────────────┐  No border, hover shows background            │
│  │    More     │                                                │
│  └─────────────┘                                                │
│                                                                 │
│  DESTRUCTIVE (Red - dangerous actions)                          │
│  ┌─────────────┐  Background: var(--error)                     │
│  │   Delete    │                                                │
│  └─────────────┘                                                │
│                                                                 │
│  SIZES                                                          │
│  xs: 24px height  sm: 28px  md: 32px  lg: 36px                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Data Table

```
┌─────────────────────────────────────────────────────────────────┐
│  DATA TABLE (Core component for data-dense UI)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ☐  Campaign          Status   Spend    Conv   CPA   ROAS │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ ☐  Search - Brand    ●Active  $1,234   45    $27   3.2x │  │
│  │ ☐  PMax - Products   ●Active  $2,567   89    $29   4.1x │  │
│  │ ☐  Display - Retgt   ○Paused  $456     12    $38   2.1x │  │
│  │ ☑  Search - Generic  ●Active  $3,890   34    $114  1.2x │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  FEATURES:                                                      │
│  • Row height: 36px (compact)                                   │
│  • Sticky header                                                │
│  • Sortable columns (click header)                              │
│  • Resizable columns                                            │
│  • Row selection with bulk actions                              │
│  • Inline status indicators                                     │
│  • Right-aligned numbers (monospace)                            │
│  • Hover row highlight                                          │
│  • Keyboard navigation                                          │
│                                                                 │
│  STATUS DOTS:                                                   │
│  ● Green: Active/Enabled                                        │
│  ○ Gray: Paused                                                 │
│  ● Red: Error/Removed                                           │
│  ● Yellow: Learning/Warning                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Metric Cards

```
┌─────────────────────────────────────────────────────────────────┐
│  METRIC CARD VARIANTS                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  COMPACT (for dashboard row)                                    │
│  ┌─────────────────────┐                                        │
│  │ Total Spend         │  Width: 180px                         │
│  │ $12,456.78   ▲ 12%  │  Height: 72px                         │
│  │ vs last period      │                                        │
│  └─────────────────────┘                                        │
│                                                                 │
│  STANDARD (with sparkline)                                      │
│  ┌─────────────────────┐                                        │
│  │ Conversions         │                                        │
│  │ 1,234      ▲ 8.5%   │                                        │
│  │ ▁▂▃▂▄▅▆▅▇█         │  ← 7-day sparkline                    │
│  └─────────────────────┘                                        │
│                                                                 │
│  DETAILED (with breakdown)                                      │
│  ┌─────────────────────┐                                        │
│  │ Cost per Acquisition│                                        │
│  │ $28.45     ▼ 15%    │                                        │
│  │ ──────────────────  │                                        │
│  │ Google:  $25.30     │                                        │
│  │ Meta:    $32.10     │                                        │
│  └─────────────────────┘                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Status Badges

```
┌─────────────────────────────────────────────────────────────────┐
│  STATUS BADGES                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  Active     - Green bg, green text               │
│  │ ● Active │                                                   │
│  └──────────┘                                                   │
│                                                                 │
│  ┌──────────┐  Paused     - Gray bg, gray text                 │
│  │ ○ Paused │                                                   │
│  └──────────┘                                                   │
│                                                                 │
│  ┌───────────┐  Learning  - Yellow bg, dark text               │
│  │ ◐ Learning│                                                  │
│  └───────────┘                                                  │
│                                                                 │
│  ┌──────────┐  Error      - Red bg, red text                   │
│  │ ✕ Error  │                                                   │
│  └──────────┘                                                   │
│                                                                 │
│  ┌──────────┐  Pending    - Blue bg, blue text                 │
│  │ ◯ Pending│                                                   │
│  └──────────┘                                                   │
│                                                                 │
│  Size: Height 20px, Padding 4px 8px, Font 11px                 │
│  Border-radius: 4px                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 AI Recommendation Card

```
┌─────────────────────────────────────────────────────────────────┐
│  AI RECOMMENDATION CARD                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚠️ WARNING                              ⋮  │  Dismiss   │   │
│  │─────────────────────────────────────────────────────────│   │
│  │ Wasting Keyword Detected                                │   │
│  │                                                         │   │
│  │ Keyword "cheap running shoes" spent $75 in 14 days     │   │
│  │ with 0 conversions. Recommend pausing to save budget.   │   │
│  │                                                         │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ 💰 Potential Savings: $75/month                     │ │   │
│  │ │ 📊 Based on 14-day analysis                         │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │ Pause       │  │ Reduce 50%  │  │ Monitor 7d  │     │   │
│  │  │ (Recommend) │  │             │  │             │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  SEVERITY COLORS:                                               │
│  🔴 Critical: Red left border (4px)                            │
│  🟡 Warning: Yellow left border                                 │
│  🔵 Info: Blue left border                                      │
│  🟢 Opportunity: Green left border                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Application Layout

### 6.1 Main Shell

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MAIN APPLICATION SHELL                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 🟢 AdsMaster    Search... (⌘K)    [Client ▼]   🔔 3   👤   ⚙️    🌙 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│  │                                                                        │ │
│  │ ┌──────────┐ ┌──────────────────────────────────────────────────────┐ │ │
│  │ │          │ │                                                      │ │ │
│  │ │ Dashboard│ │                                                      │ │ │
│  │ │          │ │                                                      │ │ │
│  │ │ Campaigns│ │                   MAIN CONTENT                       │ │ │
│  │ │          │ │                                                      │ │ │
│  │ │ AI Recs  │ │                                                      │ │ │
│  │ │ ● 12     │ │                                                      │ │ │
│  │ │          │ │                                                      │ │ │
│  │ │ Analytics│ │                                                      │ │ │
│  │ │          │ │                                                      │ │ │
│  │ │ Audiences│ │                                                      │ │ │
│  │ │          │ │                                                      │ │ │
│  │ │ Reports  │ │                                                      │ │ │
│  │ │          │ │                                                      │ │ │
│  │ │──────────│ │                                                      │ │ │
│  │ │ AGENCY   │ │                                                      │ │ │
│  │ │ Clients  │ │                                                      │ │ │
│  │ │ Billing  │ │                                                      │ │ │
│  │ │          │ │                                                      │ │ │
│  │ │──────────│ │                                                      │ │ │
│  │ │ Settings │ │                                                      │ │ │
│  │ │ Help     │ │                                                      │ │ │
│  │ └──────────┘ └──────────────────────────────────────────────────────┘ │ │
│  │             │                                                          │ │
│  └─────────────┴──────────────────────────────────────────────────────────┘ │
│                                                                              │
│  HEADER: 48px height, sticky                                                │
│  SIDEBAR: 240px width (64px collapsed), sticky                              │
│  CONTENT: Fluid, scrollable                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Header Bar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER BAR (48px)                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 🟢 AdsMaster │ 🔍 Search campaigns, keywords, clients... (⌘K)  │     │ │
│  │              │                                                  │     │ │
│  │              │     [Acme Corp ▼]    🔔 3    👤 John    ⚙️   🌙  │     │ │
│  └──────────────┴──────────────────────────────────────────────────┴─────┘ │
│                                                                              │
│  LEFT:   Logo + Brand (collapsible)                                         │
│  CENTER: Global search (Command palette style)                              │
│  RIGHT:  Client switcher, Notifications, Profile, Settings, Theme toggle   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Sidebar Navigation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px expanded / 64px collapsed)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐    ┌──────┐                                        │
│  │                     │    │      │  COLLAPSED (64px)                      │
│  │  MAIN               │    │ 📊   │  - Icon only                           │
│  │  ──────             │    │ 📢   │  - Tooltip on hover                    │
│  │  📊 Dashboard       │    │ 🤖 3 │  - Badge visible                       │
│  │  📢 Campaigns       │    │ 📈   │                                        │
│  │  🤖 AI Recs    (12) │    │ 👥   │                                        │
│  │  📈 Analytics       │    │ 📄   │                                        │
│  │  👥 Audiences       │    │      │                                        │
│  │  📄 Reports         │    │──────│                                        │
│  │                     │    │ 🏢   │                                        │
│  │  AGENCY             │    │ 💳   │                                        │
│  │  ──────             │    │      │                                        │
│  │  🏢 Clients         │    │──────│                                        │
│  │  💳 Billing         │    │ ⚙️   │                                        │
│  │                     │    │ ❓   │                                        │
│  │  ──────             │    └──────┘                                        │
│  │  ⚙️ Settings        │                                                    │
│  │  ❓ Help            │                                                    │
│  │                     │                                                    │
│  │  ──────             │                                                    │
│  │  [Collapse ‹]       │                                                    │
│  │                     │                                                    │
│  └─────────────────────┘                                                    │
│                                                                              │
│  NAV ITEM: 36px height, 12px padding                                        │
│  ACTIVE: Green left border (3px), green background tint                     │
│  HOVER: Light background                                                    │
│  BADGE: Red circle with count                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Page Wireframes

### 7.1 Dashboard (Overview)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD - OVERVIEW                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Dashboard    [Today ▼]  [All Accounts ▼]                      [↻ Refresh] │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Total Spend │ │ Conversions │ │ Avg CPA     │ │ ROAS        │            │
│  │ $45,678     │ │ 1,234       │ │ $37.02      │ │ 3.2x        │            │
│  │ ▲ 12.3%     │ │ ▲ 8.5%      │ │ ▼ 15.2%     │ │ ▲ 5.1%      │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                                              │
│  ┌───────────────────────────────────┐ ┌───────────────────────────────────┐│
│  │ SPEND OVER TIME                   │ │ TOP RECOMMENDATIONS          (12) ││
│  │                                   │ │                                   ││
│  │         ╭────╮                    │ │ ⚠️ 3 wasting keywords detected   ││
│  │    ╭────╯    ╰────╮               │ │    Potential savings: $245/mo     ││
│  │ ───╯              ╰───────        │ │    [View Details]                 ││
│  │                                   │ │                                   ││
│  │ ─── Spend   ─── Conversions       │ │ 💡 Budget opportunity found       ││
│  │                                   │ │    Campaign X underspending       ││
│  │         Jan    Feb    Mar         │ │    [Increase Budget]              ││
│  └───────────────────────────────────┘ │                                   ││
│                                        │ 🔴 Critical: Tracking broken      ││
│  ┌───────────────────────────────────┐ │    Meta Pixel not firing          ││
│  │ ACCOUNT HEALTH                    │ │    [Fix Now]                      ││
│  │                                   │ │                                   ││
│  │ Overall Score: 78/100             │ │ [View All 12 Recommendations →]   ││
│  │ ████████████████░░░░              │ └───────────────────────────────────┘│
│  │                                   │                                      │
│  │ Waste:     ●●●●●●●●○○  8/10       │                                      │
│  │ Targeting: ●●●●●●○○○○  6/10       │                                      │
│  │ Tracking:  ●●●●●●●●●○  9/10       │                                      │
│  │ ROI:       ●●●●●●●○○○  7/10       │                                      │
│  │                                   │                                      │
│  └───────────────────────────────────┘                                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ CAMPAIGNS PERFORMANCE                                    [Filter ▼] [+] ││
│  │──────────────────────────────────────────────────────────────────────────││
│  │ ☐  Campaign            Platform  Status   Spend     Conv   CPA    ROAS  ││
│  │────────────────────────────────────────────────────────────────────────── │
│  │ ☐  Search - Brand      Google    ●Active  $1,234    45    $27    3.2x  ││
│  │ ☐  PMax - Products     Google    ●Active  $2,567    89    $29    4.1x  ││
│  │ ☐  Retargeting         Meta      ●Active  $890      34    $26    3.8x  ││
│  │ ☐  Prospecting         Meta      ◐Learn   $1,234    23    $54    2.1x  ││
│  │ ☐  Search - Generic    Google    ○Paused  $0        0     —      —     ││
│  │──────────────────────────────────────────────────────────────────────────││
│  │                                              Showing 5 of 23  [1][2][3]► ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Campaigns List

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CAMPAIGNS - LIST VIEW                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Campaigns                                                    [+ New Camp.] │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ [All Platforms ▼] [All Status ▼] [Date: Last 30d ▼]   🔍 Search...     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 📊 3 Active │ ○ 2 Paused │ ◐ 1 Learning │ Total: 6 campaigns           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐
│  │ ☐│ CAMPAIGN          │PLATFORM│STATUS │ SPEND   │ CONV│ CPA   │ ROAS   │
│  ├──┼───────────────────┼────────┼───────┼─────────┼─────┼───────┼────────┤
│  │☐ │ 🔍 Search-Brand   │ Google │●Active│ $1,234  │  45 │ $27.42│ 3.21x  │
│  │  │    ▸ 3 ad groups  │        │       │ ▲12.3%  │▲8.5%│ ▼3.2% │ ▲5.1%  │
│  ├──┼───────────────────┼────────┼───────┼─────────┼─────┼───────┼────────┤
│  │☐ │ ⚡ PMax-Products  │ Google │●Active│ $2,567  │  89 │ $28.84│ 4.12x  │
│  │  │    ▸ Auto-managed │        │       │ ▲18.2%  │▲22% │ ▼12%  │ ▲8.3%  │
│  ├──┼───────────────────┼────────┼───────┼─────────┼─────┼───────┼────────┤
│  │☐ │ 📘 Retargeting    │ Meta   │●Active│ $890    │  34 │ $26.18│ 3.82x  │
│  │  │    ▸ 2 ad sets    │        │       │ ▼5.2%   │▼12% │ ▲8.1% │ ▼2.3%  │
│  ├──┼───────────────────┼────────┼───────┼─────────┼─────┼───────┼────────┤
│  │☐ │ 📘 Prospecting    │ Meta   │◐Learn │ $1,234  │  23 │ $53.65│ 2.14x  │
│  │  │    ▸ 4 ad sets    │        │ 3/7d  │ —       │ —   │ —     │ —      │
│  ├──┼───────────────────┼────────┼───────┼─────────┼─────┼───────┼────────┤
│  │☐ │ 🔍 Search-Generic │ Google │○Pause │ $0      │  0  │ —     │ —      │
│  │  │    ▸ 5 ad groups  │        │Paused │         │     │       │        │
│  ├──┼───────────────────┼────────┼───────┼─────────┼─────┼───────┼────────┤
│  │☐ │ 🔍 DSA-Products   │ Google │●Active│ $567    │  12 │ $47.25│ 1.89x  │
│  │  │    ▸ 1 ad group   │        │ ⚠️Low │ ▼23%    │▼31% │▲15.2% │ ▼18%   │
│  └──┴───────────────────┴────────┴───────┴─────────┴─────┴───────┴────────┘
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐
│  │ Selected: 0    [⏸ Pause] [▶ Enable] [📋 Duplicate] [🗑 Delete]           │
│  └──────────────────────────────────────────────────────────────────────────┘
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Campaign Detail View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CAMPAIGN DETAIL                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ← Campaigns / Search - Brand                           [⏸ Pause] [⚙ Edit] │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ [Overview] [Ad Groups] [Keywords] [Ads] [Search Terms] [Settings]       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Spend   │ │ Impr.   │ │ Clicks  │ │ CTR     │ │ Conv    │ │ CPA     │   │
│  │ $1,234  │ │ 45.2K   │ │ 2,341   │ │ 5.18%   │ │ 45      │ │ $27.42  │   │
│  │ ▲12.3%  │ │ ▲8.2%   │ │ ▲15.1%  │ │ ▲0.3%   │ │ ▲8.5%   │ │ ▼3.2%   │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│                                                                              │
│  ┌────────────────────────────────────────┐ ┌────────────────────────────┐  │
│  │ PERFORMANCE TREND                      │ │ AI INSIGHTS                │  │
│  │                                        │ │                            │  │
│  │          ╭────────╮                    │ │ 💡 "Your brand campaign   │  │
│  │     ╭────╯        ╰─────╮              │ │    is performing 23%      │  │
│  │ ────╯                   ╰────          │ │    better than industry   │  │
│  │                                        │ │    average. Consider      │  │
│  │ ─ Spend  ─ Conv  ─ CPA                 │ │    increasing budget."    │  │
│  │                                        │ │                            │  │
│  │     Mon  Tue  Wed  Thu  Fri  Sat  Sun  │ │ [Apply Suggestion]        │  │
│  └────────────────────────────────────────┘ └────────────────────────────┘  │
│                                                                              │
│  AD GROUPS                                                      [+ New AG]  │
│  ┌──────────────────────────────────────────────────────────────────────────┐
│  │ ☐│ AD GROUP        │STATUS │SPEND  │CLICKS│ CONV│ CPA   │ QS  │ ACTION │
│  ├──┼─────────────────┼───────┼───────┼──────┼─────┼───────┼─────┼────────┤
│  │☐ │ Brand - Exact   │●Active│ $456  │  890 │  18 │ $25.33│ 9/10│   ⋮    │
│  │☐ │ Brand - Phrase  │●Active│ $389  │  654 │  15 │ $25.93│ 8/10│   ⋮    │
│  │☐ │ Brand - Broad   │●Active│ $389  │  797 │  12 │ $32.42│ 6/10│   ⋮    │
│  └──┴─────────────────┴───────┴───────┴──────┴─────┴───────┴─────┴────────┘
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.4 AI Recommendations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI RECOMMENDATIONS                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  AI Recommendations                              [Apply All Safe (3)] 🤖    │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ [All (12)] [Critical (2)] [Warnings (5)] [Opportunities (5)]            ││
│  │                                                                         ││
│  │ 💰 Potential Monthly Savings: $1,234    📈 Potential Gain: +45 conv     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐
│  │ 🔴 CRITICAL                                                              │
│  ├──────────────────────────────────────────────────────────────────────────┤
│  │                                                                          │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  │🔴│ Tracking Broken - Meta Pixel Not Firing              [Dismiss] │ │
│  │  │  │                                                                 │ │
│  │  │  │ Your Meta Pixel hasn't recorded any events in 48 hours.        │ │
│  │  │  │ This means conversions aren't being tracked.                   │ │
│  │  │  │                                                                 │ │
│  │  │  │ 📊 Impact: ~$2,400 spend without tracking                      │ │
│  │  │  │ 🏷️ Account: Acme Corp - Meta                                   │ │
│  │  │  │                                                                 │ │
│  │  │  │ ┌────────────────┐  ┌────────────────┐                         │ │
│  │  │  │ │ Check Pixel    │  │ Contact Support│                         │ │
│  │  │  │ └────────────────┘  └────────────────┘                         │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │
│  │                                                                          │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  │🔴│ Emergency: Daily Budget Exceeded                     [Dismiss] │ │
│  │  │  │                                                                 │ │
│  │  │  │ Campaign "PMax - Summer Sale" spent 150% of daily budget.      │ │
│  │  │  │ Spend: $450 / Budget: $300                                      │ │
│  │  │  │                                                                 │ │
│  │  │  │ ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │ │
│  │  │  │ │ Pause Campaign │  │ Increase Budget│  │ Set Spend Cap  │     │ │
│  │  │  │ └────────────────┘  └────────────────┘  └────────────────┘     │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │
│  └──────────────────────────────────────────────────────────────────────────┘
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐
│  │ ⚠️ WARNINGS                                                              │
│  ├──────────────────────────────────────────────────────────────────────────┤
│  │                                                                          │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  │⚠️│ Wasting Keywords Detected (3 keywords)                [Dismiss] │ │
│  │  │  │                                                                 │ │
│  │  │  │ 3 keywords spent $245 in 30 days with 0 conversions.           │ │
│  │  │  │                                                                 │ │
│  │  │  │ Keywords:                                                       │ │
│  │  │  │ • "cheap running shoes"     $89   0 conv                       │ │
│  │  │  │ • "buy sneakers online"     $76   0 conv                       │ │
│  │  │  │ • "athletic footwear sale"  $80   0 conv                       │ │
│  │  │  │                                                                 │ │
│  │  │  │ 💰 Potential Savings: $245/month                                │ │
│  │  │  │                                                                 │ │
│  │  │  │ ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │ │
│  │  │  │ │ Pause All (3)  │  │ Add Negatives  │  │ Review Each    │     │ │
│  │  │  │ │ ✓ Recommended  │  │                │  │                │     │ │
│  │  │  │ └────────────────┘  └────────────────┘  └────────────────┘     │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │
│  │                                                                          │
│  │  [Show 4 more warnings...]                                               │
│  └──────────────────────────────────────────────────────────────────────────┘
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐
│  │ 💡 OPPORTUNITIES                                                         │
│  ├──────────────────────────────────────────────────────────────────────────┤
│  │                                                                          │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  │💡│ Budget Opportunity - Campaign Underspending           [Dismiss] │ │
│  │  │  │                                                                 │ │
│  │  │  │ "Search - Brand" is limited by budget and could get 35% more   │ │
│  │  │  │ conversions with a $50/day budget increase.                    │ │
│  │  │  │                                                                 │ │
│  │  │  │ 📈 Estimated additional conversions: +12/month                  │ │
│  │  │  │ 💰 Estimated additional cost: $1,500/month                      │ │
│  │  │  │ 📊 Projected CPA: $28.50 (current: $27.42)                      │ │
│  │  │  │                                                                 │ │
│  │  │  │ ┌────────────────┐  ┌────────────────┐                         │ │
│  │  │  │ │ Increase +$50  │  │ Increase +$25  │                         │ │
│  │  │  │ └────────────────┘  └────────────────┘                         │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │
│  │                                                                          │
│  └──────────────────────────────────────────────────────────────────────────┘
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.5 Analytics View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ANALYTICS                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Analytics                    [Last 30 Days ▼]  [All Accounts ▼]  [Export] │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ [Overview] [By Platform] [By Campaign] [By Time] [Funnel] [Compare]     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐     │
│  │ Spend     │ │ Revenue   │ │ ROAS      │ │ Conv.     │ │ CPA       │     │
│  │ $45,678   │ │ $156,234  │ │ 3.42x     │ │ 1,234     │ │ $37.02    │     │
│  │ ▲12.3%    │ │ ▲18.5%    │ │ ▲5.5%     │ │ ▲15.2%    │ │ ▼2.5%     │     │
│  │ ▁▂▃▄▅▆▇█  │ │ ▁▂▃▄▅▆▇█  │ │ ▁▂▃▅▄▆▇█  │ │ ▁▂▃▄▅▆▇█  │ │ █▇▆▅▄▃▂▁  │     │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘     │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐
│  │ PERFORMANCE OVER TIME                                                    │
│  │                                                                          │
│  │  $5k │                              ╭────╮                               │
│  │      │                         ╭────╯    ╰───╮                           │
│  │  $4k │                    ╭────╯             ╰───╮                       │
│  │      │               ╭────╯                      ╰───                    │
│  │  $3k │          ╭────╯                                                   │
│  │      │     ╭────╯                                                        │
│  │  $2k │╭────╯                                                             │
│  │      │                                                                   │
│  │  $1k │───────────────────────────────────────────── (Conversions)        │
│  │      │                                                                   │
│  │    0 └───────────────────────────────────────────────────────────        │
│  │        Mar 1    Mar 8    Mar 15    Mar 22    Mar 29                      │
│  │                                                                          │
│  │  Legend: ── Spend   ── Revenue   ── Conversions                         │
│  └──────────────────────────────────────────────────────────────────────────┘
│                                                                              │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────┐│
│  │ BY PLATFORM                         │ │ BY CAMPAIGN TYPE                ││
│  │                                     │ │                                 ││
│  │  Google     ████████████   62%      │ │  Search     ████████   45%      ││
│  │  Meta       ████████       35%      │ │  PMax       ██████     32%      ││
│  │  TikTok     ██              3%      │ │  Display    ███        15%      ││
│  │                                     │ │  Social     ██          8%      ││
│  │  $28,320    $16,987    $1,371       │ │                                 ││
│  └─────────────────────────────────────┘ └─────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐
│  │ TOP PERFORMING CAMPAIGNS                                                 │
│  │──────────────────────────────────────────────────────────────────────────│
│  │ #  │ Campaign          │ Platform │ Spend   │ Conv │ ROAS  │ Trend     │
│  │────┼───────────────────┼──────────┼─────────┼──────┼───────┼───────────│
│  │ 1  │ PMax - Products   │ Google   │ $12,456 │  423 │ 4.2x  │ ▲ +18%    │
│  │ 2  │ Search - Brand    │ Google   │ $8,234  │  312 │ 3.8x  │ ▲ +12%    │
│  │ 3  │ Retargeting       │ Meta     │ $5,678  │  189 │ 3.5x  │ ▼ -5%     │
│  │ 4  │ Prospecting - LAL │ Meta     │ $4,321  │  134 │ 2.9x  │ ▲ +8%     │
│  │ 5  │ DSA - Products    │ Google   │ $3,456  │   98 │ 2.4x  │ ▼ -12%    │
│  └────┴───────────────────┴──────────┴─────────┴──────┴───────┴───────────┘
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.6 Agency - Clients View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AGENCY - CLIENTS                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Clients                                                      [+ New Client]│
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 🔍 Search clients...                [All Status ▼]  [Sort: Spend ▼]    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 12 Active Clients  │  $156,234 Total Spend  │  $12,890 MRR  │  87 Avg  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐
│  │                                                                          │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  │ 🏢 Acme Corporation                                    [→ View] │    │
│  │  │────────────────────────────────────────────────────────────────│    │
│  │  │                                                                 │    │
│  │  │  Health: ████████░░ 82/100     Spend: $28,456 (▲12%)           │    │
│  │  │                                                                 │    │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │    │
│  │  │  │ 🔍 Goog │ │ 📘 Meta │ │ Conv    │ │ ROAS    │               │    │
│  │  │  │ $18,234 │ │ $10,222 │ │ 423     │ │ 3.8x    │               │    │
│  │  │  │ 3 camps │ │ 2 camps │ │ ▲18%    │ │ ▲5%     │               │    │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │    │
│  │  │                                                                 │    │
│  │  │  ⚠️ 3 recommendations pending    MRR: $2,500                   │    │
│  │  └─────────────────────────────────────────────────────────────────┘    │
│  │                                                                          │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  │ 🏢 TechStart Inc                                       [→ View] │    │
│  │  │────────────────────────────────────────────────────────────────│    │
│  │  │                                                                 │    │
│  │  │  Health: ██████████ 95/100     Spend: $15,678 (▲22%)           │    │
│  │  │                                                                 │    │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │    │
│  │  │  │ 🔍 Goog │ │ 📘 Meta │ │ Conv    │ │ ROAS    │               │    │
│  │  │  │ $12,456 │ │ $3,222  │ │ 234     │ │ 4.2x    │               │    │
│  │  │  │ 2 camps │ │ 1 camp  │ │ ▲25%    │ │ ▲12%    │               │    │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │    │
│  │  │                                                                 │    │
│  │  │  ✓ All optimized                  MRR: $1,500                  │    │
│  │  └─────────────────────────────────────────────────────────────────┘    │
│  │                                                                          │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  │ 🏢 Fashion Forward                                 🔴 [→ View] │    │
│  │  │────────────────────────────────────────────────────────────────│    │
│  │  │                                                                 │    │
│  │  │  Health: ████░░░░░░ 45/100     Spend: $8,234 (▼15%)            │    │
│  │  │                                                                 │    │
│  │  │  🔴 CRITICAL: Tracking broken   🔴 7 urgent recommendations    │    │
│  │  │                                                                 │    │
│  │  │  MRR: $1,000                                                   │    │
│  │  └─────────────────────────────────────────────────────────────────┘    │
│  │                                                                          │
│  │  [Show 9 more clients...]                                                │
│  └──────────────────────────────────────────────────────────────────────────┘
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.7 Settings View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SETTINGS                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Settings                                                                    │
│  ═══════════════════════════════════════════════════════════════════════════│
│                                                                              │
│  ┌───────────────┐ ┌────────────────────────────────────────────────────────┐
│  │               │ │                                                        │
│  │ Profile       │ │  PROFILE SETTINGS                                     │
│  │               │ │                                                        │
│  │ Organization  │ │  ┌────────────────────────────────────────────────┐   │
│  │               │ │  │ 👤  John Smith                                 │   │
│  │ Ad Accounts   │ │  │     john@agency.com                            │   │
│  │               │ │  │     [Change Photo]                             │   │
│  │ Team Members  │ │  └────────────────────────────────────────────────┘   │
│  │               │ │                                                        │
│  │ Billing       │ │  Name                                                  │
│  │               │ │  ┌────────────────────────────────────────────────┐   │
│  │ Notifications │ │  │ John Smith                                     │   │
│  │               │ │  └────────────────────────────────────────────────┘   │
│  │ Integrations  │ │                                                        │
│  │               │ │  Email                                                 │
│  │ API Keys      │ │  ┌────────────────────────────────────────────────┐   │
│  │               │ │  │ john@agency.com                                │   │
│  │ White Label   │ │  └────────────────────────────────────────────────┘   │
│  │               │ │                                                        │
│  │ Appearance    │ │  Timezone                                              │
│  │   ● Light     │ │  ┌────────────────────────────────────────────────┐   │
│  │   ○ Dark      │ │  │ America/New_York (EST)                      ▼ │   │
│  │   ○ System    │ │  └────────────────────────────────────────────────┘   │
│  │               │ │                                                        │
│  │───────────────│ │  Currency                                              │
│  │               │ │  ┌────────────────────────────────────────────────┐   │
│  │ Danger Zone   │ │  │ USD ($)                                     ▼ │   │
│  │               │ │  └────────────────────────────────────────────────┘   │
│  │               │ │                                                        │
│  └───────────────┘ │  ┌─────────────────┐                                  │
│                    │  │   Save Changes  │                                  │
│                    │  └─────────────────┘                                  │
│                    │                                                        │
│                    └────────────────────────────────────────────────────────┘
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.8 AI Chat Panel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI CHAT PANEL (Slide-in from right, 400px width)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                    ┌─────────────────────────────────────────┐              │
│                    │ 🤖 AI Assistant               [─] [✕]  │              │
│                    │─────────────────────────────────────────│              │
│                    │                                         │              │
│                    │  ┌─────────────────────────────────┐   │              │
│                    │  │ 🤖 Hi! I'm your AI assistant.   │   │              │
│                    │  │    Ask me anything about your   │   │              │
│                    │  │    campaigns or get help with   │   │              │
│                    │  │    optimizations.               │   │              │
│                    │  └─────────────────────────────────┘   │              │
│                    │                                         │              │
│                    │  ┌─────────────────────────────────┐   │              │
│                    │  │ 👤 Why is my CPA increasing     │   │              │
│                    │  │    this week?                   │   │              │
│                    │  └─────────────────────────────────┘   │              │
│                    │                                         │              │
│                    │  ┌─────────────────────────────────┐   │              │
│                    │  │ 🤖 Based on your data, I see    │   │              │
│                    │  │    3 factors affecting CPA:     │   │              │
│                    │  │                                 │   │              │
│                    │  │    1. **Increased competition** │   │              │
│                    │  │       CPCs up 15% in your       │   │              │
│                    │  │       category this week        │   │              │
│                    │  │                                 │   │              │
│                    │  │    2. **Audience fatigue**      │   │              │
│                    │  │       Your Meta campaigns show  │   │              │
│                    │  │       frequency of 4.2x         │   │              │
│                    │  │                                 │   │              │
│                    │  │    3. **Landing page issue**    │   │              │
│                    │  │       Bounce rate increased     │   │              │
│                    │  │       from 45% to 62%           │   │              │
│                    │  │                                 │   │              │
│                    │  │    📊 Data referenced:          │   │              │
│                    │  │    • Campaign metrics (7d)      │   │              │
│                    │  │    • Industry benchmarks        │   │              │
│                    │  │                                 │   │              │
│                    │  │    Would you like me to create  │   │              │
│                    │  │    recommendations for these?   │   │              │
│                    │  │                                 │   │              │
│                    │  │    [Yes, analyze] [Show data]   │   │              │
│                    │  └─────────────────────────────────┘   │              │
│                    │                                         │              │
│                    │─────────────────────────────────────────│              │
│                    │ ┌───────────────────────────────┐ [➤] │              │
│                    │ │ Ask me anything...            │      │              │
│                    │ └───────────────────────────────┘      │              │
│                    │                                         │              │
│                    │ Quick: [📊 Analyze] [💡 Ideas] [📈 Compare] │         │
│                    └─────────────────────────────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.9 Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ONBOARDING - CONNECT ACCOUNTS                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                      🟢 AdsMaster                                           │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════════ │
│   ● Account  ────  ○ Connect  ────  ○ Plan  ────  ○ Review  ────  ○ Done   │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                              │
│                    ┌─────────────────────────────────────┐                  │
│                    │                                     │                  │
│                    │     Connect Your Ad Accounts        │                  │
│                    │                                     │                  │
│                    │     Connect at least one ad         │                  │
│                    │     account to get started          │                  │
│                    │                                     │                  │
│                    └─────────────────────────────────────┘                  │
│                                                                              │
│           ┌─────────────────┐      ┌─────────────────┐                      │
│           │                 │      │                 │                      │
│           │   🔍 Google     │      │   📘 Meta       │                      │
│           │      Ads        │      │   (FB/IG)       │                      │
│           │                 │      │                 │                      │
│           │   [Connect]     │      │   [Connect]     │                      │
│           │                 │      │                 │                      │
│           └─────────────────┘      └─────────────────┘                      │
│                                                                              │
│           ┌─────────────────┐      ┌─────────────────┐                      │
│           │                 │      │                 │                      │
│           │   🎵 TikTok     │      │   📌 Pinterest  │                      │
│           │      Ads        │      │      Ads        │                      │
│           │                 │      │                 │                      │
│           │   [Coming Soon] │      │   [Coming Soon] │                      │
│           │                 │      │                 │                      │
│           └─────────────────┘      └─────────────────┘                      │
│                                                                              │
│                                                                              │
│                    Connected Accounts (1):                                   │
│                    ┌─────────────────────────────────────┐                  │
│                    │ ✓ Google - Acme Corp (xxx-xxx-1234) │                  │
│                    └─────────────────────────────────────┘                  │
│                                                                              │
│                                                                              │
│                              [Continue →]                                   │
│                                                                              │
│                           Skip for now                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Responsive Breakpoints

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RESPONSIVE BREAKPOINTS                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Desktop Large:  1536px+   (Full layout, all panels)                        │
│  Desktop:        1280px+   (Standard layout)                                │
│  Laptop:         1024px+   (Collapsed sidebar by default)                   │
│  Tablet:         768px+    (Hamburger menu, stacked cards)                  │
│  Mobile:         < 768px   (Single column, bottom nav)                      │
│                                                                              │
│  NOTE: Primary target is Desktop (1280px+) for agency users                 │
│        Mobile is secondary for quick checks/approvals                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Keyboard Shortcuts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  KEYBOARD SHORTCUTS (Power User Focus)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GLOBAL                                                                      │
│  ⌘ + K          Command palette / Global search                             │
│  ⌘ + /          Open AI chat                                                │
│  ⌘ + B          Toggle sidebar                                              │
│  ⌘ + .          Toggle theme (light/dark)                                   │
│                                                                              │
│  NAVIGATION                                                                  │
│  G then D       Go to Dashboard                                             │
│  G then C       Go to Campaigns                                             │
│  G then R       Go to Recommendations                                       │
│  G then A       Go to Analytics                                             │
│  G then S       Go to Settings                                              │
│                                                                              │
│  TABLES                                                                      │
│  ↑ / ↓          Navigate rows                                               │
│  Space          Select/deselect row                                         │
│  ⌘ + A          Select all                                                  │
│  Enter          Open selected item                                          │
│  Delete         Delete selected                                             │
│                                                                              │
│  RECOMMENDATIONS                                                             │
│  1 / 2 / 3      Select option 1, 2, or 3                                   │
│  A              Apply selected recommendation                               │
│  D              Dismiss recommendation                                       │
│  N              Next recommendation                                          │
│  P              Previous recommendation                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Implementation Files

### Files to Create

```
frontend/
├── src/
│   ├── styles/
│   │   ├── globals.css         # CSS variables, theme
│   │   ├── typography.css      # Font styles
│   │   └── components.css      # Component base styles
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── table.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── Shell.tsx           # Main app shell
│   │   │   ├── Header.tsx          # Top header bar
│   │   │   ├── Sidebar.tsx         # Left navigation
│   │   │   ├── CommandPalette.tsx  # ⌘K search
│   │   │   └── AIChatPanel.tsx     # Right chat panel
│   │   │
│   │   ├── dashboard/
│   │   │   ├── MetricCard.tsx
│   │   │   ├── SpendChart.tsx
│   │   │   ├── HealthScore.tsx
│   │   │   └── CampaignSummary.tsx
│   │   │
│   │   ├── campaigns/
│   │   │   ├── CampaignTable.tsx
│   │   │   ├── CampaignRow.tsx
│   │   │   ├── CampaignFilters.tsx
│   │   │   └── CampaignDetail.tsx
│   │   │
│   │   ├── recommendations/
│   │   │   ├── RecommendationCard.tsx
│   │   │   ├── RecommendationList.tsx
│   │   │   └── RecommendationFilters.tsx
│   │   │
│   │   ├── analytics/
│   │   │   ├── PerformanceChart.tsx
│   │   │   ├── PlatformBreakdown.tsx
│   │   │   └── TopCampaigns.tsx
│   │   │
│   │   └── agency/
│   │       ├── ClientCard.tsx
│   │       ├── ClientList.tsx
│   │       └── ClientSwitcher.tsx
│   │
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Dashboard
│   │   ├── campaigns/
│   │   │   ├── page.tsx           # List
│   │   │   └── [id]/page.tsx      # Detail
│   │   ├── recommendations/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── clients/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   └── lib/
│       ├── theme.ts               # Theme configuration
│       └── shortcuts.ts           # Keyboard shortcuts
│
├── tailwind.config.ts             # Tailwind + colors
└── next.config.js
```

---

## 11. Authentication Wireframes

### 11.1 Login Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LOGIN PAGE                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                         🟢 AdsMaster                                        │
│                                                                              │
│                    AI-Powered Ad Management                                  │
│                                                                              │
│                                                                              │
│              ┌─────────────────────────────────────────────┐                │
│              │                                             │                │
│              │           Welcome back                      │                │
│              │                                             │                │
│              │   Sign in to your account                   │                │
│              │                                             │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │ 🔍 Google   Sign in with Google     │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │ 📘 Meta     Sign in with Meta       │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              │   ─────────────── OR ───────────────────   │                │
│              │                                             │                │
│              │   Email                                     │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │ john@agency.com                     │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              │   Password                                  │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │ ••••••••••••                    👁  │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              │   ┌──────────────────┐                     │                │
│              │   │ ☐ Remember me   │    Forgot password? │                │
│              │   └──────────────────┘                     │                │
│              │                                             │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │            Sign In                  │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              │   ─────────────────────────────────────────│                │
│              │                                             │                │
│              │   Don't have an account?  Create account   │                │
│              │                                             │                │
│              └─────────────────────────────────────────────┘                │
│                                                                              │
│                                                                              │
│              ┌─────────────────────────────────────────────┐                │
│              │  🔒 Enterprise SSO?  Configure SAML/OIDC   │                │
│              └─────────────────────────────────────────────┘                │
│                                                                              │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│   © 2026 AdsMaster  │  Privacy  │  Terms  │  Help                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

SPECIFICATIONS:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Layout:                                                                     │
│  • Centered card on gradient/pattern background                             │
│  • Card width: 400px max                                                    │
│  • Responsive: Full-width on mobile with padding                            │
│                                                                              │
│  Components:                                                                 │
│  • Logo: 32px height, green icon + text                                     │
│  • Social buttons: 44px height, full-width, outlined                        │
│  • Input fields: 40px height, 14px font                                     │
│  • Primary button: 44px height, green bg (#10B981)                          │
│  • Links: Green text, underline on hover                                    │
│                                                                              │
│  States:                                                                     │
│  • Input focus: Green border (2px), light green shadow                      │
│  • Button hover: Darker green (#059669)                                     │
│  • Error: Red border on input, error message below                          │
│  • Loading: Spinner in button, inputs disabled                              │
│                                                                              │
│  Validation:                                                                 │
│  • Email: Required, valid email format                                      │
│  • Password: Required, min 8 characters                                     │
│  • Show inline errors on blur                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Login - Error States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LOGIN ERROR STATES                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INVALID CREDENTIALS:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ ⚠️ Invalid email or password. Please try again.                     │    │
│  │    Forgot your password?                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ACCOUNT LOCKED:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🔒 Account temporarily locked due to multiple failed attempts.      │    │
│  │    Try again in 15 minutes or reset your password.                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  FIELD VALIDATION:                                                           │
│                                                                              │
│  Email                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ invalid-email                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ⚠️ Please enter a valid email address                                      │
│                                                                              │
│  Password                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ⚠️ Password is required                                                    │
│                                                                              │
│                                                                              │
│  ERROR STYLING:                                                              │
│  • Alert banner: Red background (#FEE2E2), red text (#991B1B)               │
│  • Field border: Red (#EF4444)                                              │
│  • Error text: 12px, red (#EF4444), below input                             │
│  • Icon: Warning triangle or X circle                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Signup Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIGNUP PAGE                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────┬────────────────────────────────────────┐│
│  │                                │                                        ││
│  │                                │           🟢 AdsMaster                 ││
│  │                                │                                        ││
│  │    ████████████████████████    │     Create your account                ││
│  │    █                      █    │                                        ││
│  │    █   "AdsMaster helped  █    │     Start your 14-day free trial       ││
│  │    █   us reduce wasted   █    │                                        ││
│  │    █   ad spend by 34%    █    │     ┌─────────────────────────────────┐││
│  │    █   in the first       █    │     │ 🔍 Google  Sign up with Google  │││
│  │    █   month."            █    │     └─────────────────────────────────┘││
│  │    █                      █    │                                        ││
│  │    █   — Sarah Chen       █    │     ─────────────── OR ─────────────── ││
│  │    █     CEO, TechGrowth  █    │                                        ││
│  │    █                      █    │     Full name                          ││
│  │    ████████████████████████    │     ┌─────────────────────────────────┐││
│  │                                │     │ John Smith                      │││
│  │                                │     └─────────────────────────────────┘││
│  │    ✓ No credit card required   │                                        ││
│  │    ✓ 14-day free trial         │     Work email                         ││
│  │    ✓ Cancel anytime            │     ┌─────────────────────────────────┐││
│  │                                │     │ john@agency.com                 │││
│  │                                │     └─────────────────────────────────┘││
│  │    ┌────────────────────────┐  │                                        ││
│  │    │ ★★★★★  4.9/5 rating   │  │     Password                            ││
│  │    │ "Best PPC tool 2026"  │  │     ┌─────────────────────────────────┐││
│  │    │   — G2 Crowd          │  │     │ ••••••••••••                 👁 │││
│  │    └────────────────────────┘  │     └─────────────────────────────────┘││
│  │                                │     Password strength: ████████░░ Strong││
│  │                                │                                        ││
│  │    Trusted by 500+ agencies:   │     Company name (optional)            ││
│  │                                │     ┌─────────────────────────────────┐││
│  │    [Logo] [Logo] [Logo] [Logo] │     │ Acme Agency                     │││
│  │                                │     └─────────────────────────────────┘││
│  │                                │                                        ││
│  │                                │     ┌─────────────────────────────────┐││
│  │                                │     │ ☐ I agree to the Terms of       │││
│  │                                │     │   Service and Privacy Policy    │││
│  │                                │     └─────────────────────────────────┘││
│  │                                │                                        ││
│  │                                │     ┌─────────────────────────────────┐││
│  │                                │     │       Create Account            │││
│  │                                │     └─────────────────────────────────┘││
│  │                                │                                        ││
│  │                                │     Already have an account? Sign in   ││
│  │                                │                                        ││
│  └────────────────────────────────┴────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

SPECIFICATIONS:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Layout:                                                                     │
│  • Split screen: Left (marketing) + Right (form)                            │
│  • Left panel: 45% width, dark/gradient background                          │
│  • Right panel: 55% width, white/light background                           │
│  • Mobile: Stack vertically, form first                                     │
│                                                                              │
│  Left Panel:                                                                 │
│  • Testimonial card with quote, name, title                                 │
│  • Feature checklist with green checkmarks                                  │
│  • Trust badges / ratings                                                   │
│  • Client logos (grayscale)                                                 │
│                                                                              │
│  Password Strength Indicator:                                               │
│  • Weak: 1-2 bars, red                                                      │
│  • Fair: 3-4 bars, yellow                                                   │
│  • Good: 5-6 bars, light green                                              │
│  • Strong: 7-8 bars, green                                                  │
│                                                                              │
│  Requirements:                                                               │
│  • Name: Required, 2-50 characters                                          │
│  • Email: Required, valid format, work email preferred                      │
│  • Password: Min 8 chars, 1 uppercase, 1 number, 1 special                  │
│  • Terms: Required checkbox                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.4 Signup - Step 2 (Account Type)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIGNUP - ACCOUNT TYPE SELECTION                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         🟢 AdsMaster                                        │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════════ │
│   ● Account  ────  ● Type  ────  ○ Connect  ────  ○ Plan  ────  ○ Done     │
│  ══════════════════════════════════════════════════════════════════════════ │
│                                                                              │
│                                                                              │
│                    How will you use AdsMaster?                               │
│                                                                              │
│              Select the option that best describes you                       │
│                                                                              │
│                                                                              │
│     ┌─────────────────────────────────┐  ┌─────────────────────────────────┐│
│     │                                 │  │                                 ││
│     │        🏢                       │  │        👤                       ││
│     │                                 │  │                                 ││
│     │        Agency                   │  │        Brand / Advertiser       ││
│     │                                 │  │                                 ││
│     │   I manage ads for multiple     │  │   I manage ads for my own       ││
│     │   clients or businesses         │  │   business or company           ││
│     │                                 │  │                                 ││
│     │   • Multi-client dashboard      │  │   • Single account focus        ││
│     │   • White-label reports         │  │   • Simple reporting            ││
│     │   • Team collaboration          │  │   • Self-service tools          ││
│     │   • Client billing              │  │   • Direct recommendations      ││
│     │                                 │  │                                 ││
│     │   [ Select Agency ]             │  │   [ Select Brand ]              ││
│     │                                 │  │                                 ││
│     └─────────────────────────────────┘  └─────────────────────────────────┘│
│                                                                              │
│                                                                              │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │                                                                     │ │
│     │        🎓                                                           │ │
│     │                                                                     │ │
│     │        Freelancer / Consultant                                      │ │
│     │                                                                     │ │
│     │   I'm an independent PPC specialist managing client accounts        │ │
│     │                                                                     │ │
│     │   • Flexible client management    • Simple invoicing                │ │
│     │   • Portfolio view                • Performance reports             │ │
│     │                                                                     │ │
│     │   [ Select Freelancer ]                                             │ │
│     │                                                                     │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                                                              │
│                              ← Back                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

SPECIFICATIONS:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Progress Bar:                                                               │
│  • Steps: Account → Type → Connect → Plan → Done                            │
│  • Active: Green filled circle                                              │
│  • Completed: Green filled circle with check                                │
│  • Upcoming: Gray outline circle                                            │
│  • Connector: Green line (completed), gray line (upcoming)                  │
│                                                                              │
│  Selection Cards:                                                            │
│  • Default: White bg, gray border                                           │
│  • Hover: Light green border, subtle shadow                                 │
│  • Selected: Green border (2px), light green bg, check icon                 │
│  • Icon: 48px, centered                                                     │
│  • Title: 18px, semibold                                                    │
│  • Description: 14px, gray text                                             │
│  • Features: Bullet list, 13px                                              │
│                                                                              │
│  Layout:                                                                     │
│  • 2-column for Agency/Brand                                                │
│  • Full-width for Freelancer                                                │
│  • Mobile: Stack vertically                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.5 Forgot Password

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FORGOT PASSWORD                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                         🟢 AdsMaster                                        │
│                                                                              │
│                                                                              │
│              ┌─────────────────────────────────────────────┐                │
│              │                                             │                │
│              │           🔑                                │                │
│              │                                             │                │
│              │      Forgot your password?                  │                │
│              │                                             │                │
│              │   No worries! Enter your email address      │                │
│              │   and we'll send you a reset link.          │                │
│              │                                             │                │
│              │   Email address                             │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │ john@agency.com                     │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │       Send Reset Link               │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              │                                             │                │
│              │         ← Back to sign in                   │                │
│              │                                             │                │
│              └─────────────────────────────────────────────┘                │
│                                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│  FORGOT PASSWORD - SUCCESS STATE                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                         🟢 AdsMaster                                        │
│                                                                              │
│                                                                              │
│              ┌─────────────────────────────────────────────┐                │
│              │                                             │                │
│              │           ✉️                                │                │
│              │                                             │                │
│              │        Check your email                     │                │
│              │                                             │                │
│              │   We've sent a password reset link to:      │                │
│              │                                             │                │
│              │        john@agency.com                      │                │
│              │                                             │                │
│              │   The link will expire in 1 hour.           │                │
│              │                                             │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │       Open Email App                │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              │   Didn't receive the email?                 │                │
│              │   Check spam folder or resend              │                │
│              │                                             │                │
│              │         ← Back to sign in                   │                │
│              │                                             │                │
│              └─────────────────────────────────────────────┘                │
│                                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.6 Reset Password

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RESET PASSWORD                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                         🟢 AdsMaster                                        │
│                                                                              │
│                                                                              │
│              ┌─────────────────────────────────────────────┐                │
│              │                                             │                │
│              │           🔒                                │                │
│              │                                             │                │
│              │       Set a new password                    │                │
│              │                                             │                │
│              │   Create a strong password for your         │                │
│              │   account.                                  │                │
│              │                                             │                │
│              │   New password                              │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │ ••••••••••••                    👁  │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │   Password strength: ████████░░ Strong     │                │
│              │                                             │                │
│              │   Confirm password                          │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │ ••••••••••••                    👁  │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │   ✓ Passwords match                        │                │
│              │                                             │                │
│              │   Password requirements:                    │                │
│              │   ✓ At least 8 characters                  │                │
│              │   ✓ One uppercase letter                   │                │
│              │   ✓ One number                             │                │
│              │   ✓ One special character                  │                │
│              │                                             │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │       Reset Password                │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              └─────────────────────────────────────────────┘                │
│                                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│  RESET PASSWORD - SUCCESS                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                         🟢 AdsMaster                                        │
│                                                                              │
│                                                                              │
│              ┌─────────────────────────────────────────────┐                │
│              │                                             │                │
│              │           ✅                                │                │
│              │                                             │                │
│              │     Password reset successful!              │                │
│              │                                             │                │
│              │   Your password has been changed.           │                │
│              │   You can now sign in with your new         │                │
│              │   password.                                 │                │
│              │                                             │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │       Go to Sign In                 │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              └─────────────────────────────────────────────┘                │
│                                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.7 Email Verification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EMAIL VERIFICATION PENDING                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                         🟢 AdsMaster                                        │
│                                                                              │
│                                                                              │
│              ┌─────────────────────────────────────────────┐                │
│              │                                             │                │
│              │           📧                                │                │
│              │                                             │                │
│              │        Verify your email                    │                │
│              │                                             │                │
│              │   We've sent a verification email to:       │                │
│              │                                             │                │
│              │        john@agency.com                      │                │
│              │                                             │                │
│              │   Click the link in the email to verify     │                │
│              │   your account and get started.             │                │
│              │                                             │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │       Open Email App                │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │       Resend Email                  │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              │   Wrong email? Update it here              │                │
│              │                                             │                │
│              └─────────────────────────────────────────────┘                │
│                                                                              │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│   Having trouble? Contact support@adsmaster.io                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.8 Two-Factor Authentication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TWO-FACTOR AUTHENTICATION                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                         🟢 AdsMaster                                        │
│                                                                              │
│                                                                              │
│              ┌─────────────────────────────────────────────┐                │
│              │                                             │                │
│              │           🔐                                │                │
│              │                                             │                │
│              │     Two-factor authentication               │                │
│              │                                             │                │
│              │   Enter the 6-digit code from your          │                │
│              │   authenticator app.                        │                │
│              │                                             │                │
│              │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │        │
│              │   │  4  │ │  7  │ │  2  │ │  9  │ │  _  │ │  _  │  │        │
│              │   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │        │
│              │                                             │                │
│              │   ┌─────────────────────────────────────┐  │                │
│              │   │           Verify                    │  │                │
│              │   └─────────────────────────────────────┘  │                │
│              │                                             │                │
│              │   ─────────────────────────────────────────│                │
│              │                                             │                │
│              │   Lost access to your authenticator?        │                │
│              │   Use a backup code instead                │                │
│              │                                             │                │
│              │         ← Back to sign in                   │                │
│              │                                             │                │
│              └─────────────────────────────────────────────┘                │
│                                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

SPECIFICATIONS:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Code Input:                                                                 │
│  • 6 individual boxes, 48px × 56px each                                     │
│  • Font: JetBrains Mono, 24px, bold                                         │
│  • Auto-focus next box on input                                             │
│  • Auto-submit when all 6 digits entered                                    │
│  • Paste support (distribute across boxes)                                  │
│                                                                              │
│  States:                                                                     │
│  • Empty: Gray border                                                       │
│  • Focused: Green border, slight shadow                                     │
│  • Filled: Black text, gray border                                          │
│  • Error: Red border, shake animation                                       │
│                                                                              │
│  Error Message:                                                              │
│  "Invalid code. Please try again. X attempts remaining."                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Element | Specification |
|---------|---------------|
| **Style** | Data-dense, professional, Bloomberg-inspired |
| **Primary Color** | Green (#10B981) - Growth/ROI |
| **Font** | Inter (UI) + JetBrains Mono (numbers) |
| **Base Font Size** | 13px (compact for data density) |
| **Themes** | Light + Dark (equal support) |
| **Target** | Agencies with multi-client management |
| **Layout** | Fixed sidebar (240px) + fluid content |
| **Tables** | Compact (36px rows), sortable, selectable |
| **Navigation** | Keyboard-first with ⌘K command palette |
