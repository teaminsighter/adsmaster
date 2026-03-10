
# ═══════════════════════════════════════════════════════════════
#  DASHBOARD — COMPLETE COMMAND CENTER SPECIFICATION
#  Perspective: 15-Year Senior Ad Manager
#  Every widget, dropdown, filter, chart switch, table column
# ═══════════════════════════════════════════════════════════════
#
#  DESIGN PHILOSOPHY:
#  "I open this at 8:30 AM with coffee. In 60 seconds I know:
#   1. Am I making money or losing money?
#   2. What's getting worse?
#   3. What needs my attention RIGHT NOW?
#   4. Where's the opportunity I'm missing?
#  Everything else, I drill down."
#
#  EVERY widget has ⋮ (3-dot menu) to switch views.
#  EVERY table has filters and column toggles.
#  EVERY chart can switch metrics, timeframes, and chart types.
#  ONE screen. INFINITE angles.
#
# ═══════════════════════════════════════════════════════════════


# ┌─────────────────────────────────────────────────────────────┐
# │  DASHBOARD TOP BAR (sticky — always visible while scrolling) │
# └─────────────────────────────────────────────────────────────┘

LEFT:
├── "Good morning, [Name]" (or afternoon/evening)
├── Account health pulse: 🟢 82/100 "Your ads are healthy"
└── Last sync: "Data updated 2 min ago" [🔄 Refresh]

CENTER:
├── GLOBAL DATE RANGE PICKER ← controls ALL widgets
│   ├── Quick picks: [Today] [Yesterday] [Last 7 Days ✅] [Last 14 Days]
│   │                [Last 30 Days] [This Month] [Last Month] [Last 90 Days]
│   │                [This Quarter] [Last Quarter] [This Year] [Last Year]
│   │                [Custom Range...]
│   ├── Compare toggle: [Compare to: Previous Period ✅ | Same Period Last Year | Custom]
│   └── When compare ON → every widget shows vs comparison

RIGHT:
├── [👶 Simple ↔ 🧠 Expert] mode toggle ← switches ALL widgets
├── [🔔 3] notification bell with count
├── [📥 Export Dashboard] → PDF / screenshot / email
└── [⚙️ Customize Dashboard] → reorder, show/hide widgets



# ═══════════════════════════════════════════════════════════════
# WIDGET 1: KPI SCORECARDS (the "at a glance" row)
# What the 15-year manager checks FIRST
# ═══════════════════════════════════════════════════════════════

LAYOUT: 5 cards in a row (expandable to 8)
Each card: Big number + trend arrow + comparison

# ── DEFAULT 5 CARDS (Simple Mode) ──

┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ 💰 MONEY     │ 👥 CUSTOMERS │ 🏷️ COST PER  │ 💵 REVENUE   │ 📈 RETURN    │
│    SPENT     │    GAINED    │   CUSTOMER   │   EARNED     │   ON AD $    │
│              │              │              │              │              │
│  $2,340      │  87          │  $26.90      │  $8,700      │  $3.72       │
│  this week   │  this week   │  each        │  this week   │  per $1 spent│
│              │              │              │              │              │
│  ↑12% vs lw  │  ↑8% vs lw   │  ↓5% ✅       │  ↑15% vs lw  │  ↑9% vs lw   │
│  ($2,089 lw) │  (81 lw)     │  ($28.30 lw) │  ($7,565 lw) │  ($3.42 lw)  │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘

# ── EXPERT MODE (same cards + technical terms below) ──

Each card ADDS a second line:
│ 💰 SPENT: $2,340          │ 👥 CUSTOMERS: 87           │
│ Ad Spend ↑12%             │ Conversions ↑8%            │
│                           │ Conv. Rate: 4.1%           │
│ 🏷️ COST/CUSTOMER: $26.90  │ 💵 REVENUE: $8,700         │
│ CPA ↓5% ✅                 │ Conv. Value ↑15%           │
│                           │                            │
│ 📈 RETURN: $3.72 per $1   │                            │
│ ROAS: 3.72x ↑9%          │                            │

# ── ⋮ 3-DOT MENU ON KPI ROW ──

[⋮] Menu options:
├── "Add More Cards" → opens card picker:
│   ├── 👆 Clicks (total clicks received)
│   ├── 👀 Impressions (times ads were shown)
│   ├── 👆 Click Rate / CTR (% who click after seeing)
│   ├── 💲 Cost Per Click / CPC (cost of each click)
│   ├── 💲 Cost Per 1000 Views / CPM (visibility cost)
│   ├── 🏆 Impression Share (% of times you show vs could show)
│   ├── ⭐ Quality Score Avg (Google's rating of your ads)
│   ├── 🛒 Cart Additions (e-commerce)
│   ├── 📞 Phone Calls (lead gen)
│   ├── 📝 Form Submissions (lead gen)
│   ├── 🏪 Store Visits (local business)
│   ├── 💰 True Profit (revenue - spend - product cost)
│   ├── 💸 Wasted Spend (money AI identified as waste)
│   ├── 🔄 Frequency (avg times same person sees your ad)
│   └── 📊 Impression Share Lost (Budget) / Lost (Rank)
├── "Remove Card" → removes selected card
├── "Reorder Cards" → drag and drop
├── "Change Comparison" → [vs Previous Period] [vs Same Time Last Year] [vs Custom]
├── "Show Sparkline" → tiny line chart inside each card showing 7-day trend
├── "Show Target" → adds goal line: "Target CPA: $25 | Actual: $26.90"
│   └── User sets targets in Settings → shows progress on cards
└── "Reset to Default" → back to 5 original cards

# ── EACH INDIVIDUAL CARD ⋮ MENU ──

Click any card → expands or [⋮]:
├── "Change Metric" → swap this card for any metric above
├── "View by Platform" → breaks this number into Google | Meta | TikTok | Microsoft
│   └── Example: Spent $2,340 → Google $1,451 | Meta $655 | TikTok $234
├── "View by Campaign" → breaks into per-campaign numbers
├── "View by Device" → Mobile | Desktop | Tablet
├── "View by Location" → Country | City breakdown
├── "View Trend" → opens mini chart of this metric over time
├── "Set Alert" → "Alert me if this metric [drops/rises] by [%] in [timeframe]"
├── "Set Target" → "My goal for this metric is [value]"
└── "What's this?" → tooltip explaining metric in plain English



# ═══════════════════════════════════════════════════════════════
# WIDGET 2: AI COMMAND CENTER
# "What happened, what's happening, what should I do"
# ═══════════════════════════════════════════════════════════════

LAYOUT: Split panel — Health Score left, AI Summary right

# ── LEFT: HEALTH SCORE ──

HEALTH SCORE DIAL: 82/100 🟢

Score Components (clickable — each opens detail):
├── 💸 Waste Control: 9/10
│   └── "Only $120 wasted this month (vs $847 before joining)"
├── 🎯 Targeting Quality: 8/10
│   └── "Your audiences are well-matched. 4.1% conversion rate."
├── ✍️ Ad Quality: 7/10
│   └── "3 ads below average CTR. AI has better versions ready."
├── 💰 Budget Efficiency: 9/10
│   └── "92% of budget going to profitable campaigns"
├── 📈 ROI Performance: 8/10
│   └── "ROAS 3.72x — above industry average 2.8x"
├── 🔍 Keyword Health: 8/10
│   └── "Quality Score avg 7.4 (industry 5.8). 2 keywords need fix."
├── 📊 Tracking Accuracy: 10/10
│   └── "All conversion tracking active and verified"
└── 🏆 Competitive Position: 7/10
    └── "Impression share 67%. Losing 20% to budget, 13% to rank."

[⋮] 3-DOT MENU:
├── "Show History" → health score trend over weeks/months
├── "Compare to Last Month" → was 74, now 82 (+8)
├── "Show Industry Average" → your 82 vs industry avg 61
├── "Detailed Breakdown" → opens full health report
└── "What Lowers My Score?" → AI explains each deduction

# ── RIGHT: AI SUMMARY ──

AI WEEKLY SUMMARY (auto-generated):
"Great week! You got 87 new customers at $26.90 each — that's 12%
more customers than last week AND 5% cheaper per customer.

🏆 Winner: 'Soy Candles Search' campaign brought 54 customers.
⚠️ Fixed: I paused 'cheap candles' keyword — saving you $12/day.
💡 Opportunity: 'soy candles gift' could add ~12 customers/week.
📊 Trend: Your cost per customer has dropped 4 weeks in a row."

Expert Mode adds:
"CTR improved 3.1%→4.2% (+35%), CPC dropped $1.82→$1.47 (-19%),
ROAS up 2.8x→3.72x. Quality Score avg improved 6.2→7.4.
Impression Share gained 4 points (63%→67%)."

[⋮] 3-DOT MENU:
├── "Change Summary Period" → [This Week] [Today] [Last 30 Days] [This Month]
├── "Generate Detailed Report" → full AI report opens
├── "Email This Summary" → sends to my email
├── "Send to WhatsApp" → sends via WhatsApp
├── "Compare Periods" → "This week vs last week" side by side
├── "Show Action Items Only" → filters to just recommendations
├── "Translate to [Language]" → summary in other language
└── "Chat About This" → opens AI Advisor with this context



# ═══════════════════════════════════════════════════════════════
# WIDGET 3: ACTION REQUIRED FEED
# "What needs my attention RIGHT NOW"
# ═══════════════════════════════════════════════════════════════

LAYOUT: Scrollable card feed, sorted by urgency

Each card has: Icon + Type + Time + Description + Action Buttons

PRIORITY ORDER:
1. 🔴 CRITICAL (red) — losing money right now
2. 🟡 IMPORTANT (yellow) — needs decision soon
3. 💡 OPPORTUNITY (blue) — could make more money
4. 📊 INFO (gray) — reports ready, milestones hit

EXAMPLE FEED:
├── 🔴 "Keyword 'cheap candles' wasting $12/day, 0 sales — AI paused it"
│   [✅ Keep Paused] [↩️ Undo] [🔍 Why]
│
├── 🟡 "AI wrote 3 new ad variations. Review & approve?"
│   [👁️ Preview] [✅ Approve All] [✏️ Edit]
│
├── 💡 "New audience: 'gift shoppers' — predicted +15 customers/week"
│   [✅ Add] [❌ Skip] [📊 Show Data] [💬 Ask AI]
│
├── 💡 "Increase budget by $200? Predicted +12 customers at similar cost"
│   [🟢 Safe: Keep] [🟡 +$100] [🔴 +$300]
│
├── 📊 "Monthly report ready — January was your best month ever"
│   [📥 Download] [👁️ View] [📧 Email to Team]
│
└── 📊 "Milestone: 500th customer acquired through ads!"
    [🎉 Share] [📊 See Journey]

[⋮] 3-DOT MENU:
├── "Filter by Type" → [All] [Critical] [Important] [Opportunities] [Info]
├── "Filter by Campaign" → show alerts for specific campaign only
├── "Filter by Platform" → Google only / Meta only / etc.
├── "Sort by" → [Urgency ✅] [Newest] [Biggest Impact ($)]
├── "Mark All as Read"
├── "Auto-approve Low Risk" → AI handles safe items automatically
├── "Show Resolved" → past items that were handled
├── "Notification Settings" → how/when to be alerted
└── "Batch Actions" → approve/dismiss multiple at once



# ═══════════════════════════════════════════════════════════════
# WIDGET 4: PERFORMANCE TREND CHART
# "Show me the story over time"
# This is the MOST flexible widget
# ═══════════════════════════════════════════════════════════════

LAYOUT: Large chart area with controls above

# ── CHART CONTROLS BAR ──

LEFT CONTROLS:
├── METRIC SELECTOR (multi-select, up to 3 on same chart):
│   ├── 💰 Money & Cost:
│   │   ├── Total Spend (how much you paid for ads)
│   │   ├── Revenue / Conversion Value (money earned back)
│   │   ├── True Profit (revenue - spend - product cost)
│   │   ├── Wasted Spend (money spent on non-converting)
│   │   ├── Cost Per Customer / CPA
│   │   ├── Cost Per Click / CPC
│   │   ├── Cost Per 1000 Views / CPM
│   │   └── Average Order Value / AOV (e-commerce)
│   │
│   ├── 👥 Volume & Conversions:
│   │   ├── Customers / Conversions (how many people took action)
│   │   ├── Clicks (how many people clicked your ad)
│   │   ├── Impressions (how many times your ad was shown)
│   │   ├── Phone Calls (for local/service businesses)
│   │   ├── Form Submissions (for lead gen)
│   │   ├── Store Visits (for local businesses)
│   │   ├── Add to Cart (e-commerce)
│   │   ├── Checkouts Started (e-commerce)
│   │   └── New vs Returning Customers
│   │
│   ├── 📊 Rates & Ratios:
│   │   ├── Click Rate / CTR (% who click after seeing)
│   │   ├── Conversion Rate / CR (% who buy after clicking)
│   │   ├── Return on Ad Spend / ROAS (revenue per $1 spent)
│   │   ├── True ROI (profit per $1 spent, after product cost)
│   │   ├── Bounce Rate (% who leave immediately — needs GA)
│   │   └── Cart Abandonment Rate (e-commerce)
│   │
│   ├── 🏆 Competitive & Quality:
│   │   ├── Impression Share (% of time your ad shows)
│   │   ├── Impression Share Lost (Budget)
│   │   ├── Impression Share Lost (Rank)
│   │   ├── Average Position (where your ad ranks)
│   │   ├── Quality Score Average
│   │   ├── Ad Strength Score
│   │   └── Search Top Rate (% at top of page)
│   │
│   └── 🔄 Engagement:
│       ├── Frequency (avg times same person sees ad)
│       ├── Reach (unique people who saw ad)
│       ├── Video View Rate (YouTube/TikTok)
│       ├── Video Watch Time (avg seconds)
│       ├── Engagement Rate (likes, shares, comments)
│       └── Landing Page Views (vs clicks)
│
├── GRANULARITY:
│   └── [Hourly] [Daily ✅] [Weekly] [Monthly]
│
└── CHART TYPE:
    └── [📈 Line ✅] [📊 Bar] [📊 Stacked Bar] [🏔️ Area] [🏔️ Stacked Area]

RIGHT CONTROLS:
├── SPLIT BY / GROUP BY:
│   ├── [None ✅ — show total]
│   ├── [Platform] → separate lines for Google, Meta, TikTok, Microsoft
│   ├── [Campaign] → separate line per campaign (top 5 + other)
│   ├── [Campaign Type] → Search vs Display vs Shopping vs PMax vs Video vs Social
│   ├── [Device] → Mobile vs Desktop vs Tablet
│   ├── [Location] → by country or by city
│   ├── [Audience] → by audience segment
│   ├── [Network] → Search vs Display vs YouTube vs Gmail vs Maps (PMax v23)
│   ├── [Day of Week] → Mon-Sun pattern
│   └── [Hour of Day] → 0-23 pattern (shows when your ads work best)
│
├── COMPARE:
│   ├── [Compare OFF]
│   ├── [vs Previous Period] → dotted line overlay
│   ├── [vs Same Period Last Year] → dotted line overlay
│   ├── [vs Custom Period] → pick any date range to compare
│   └── [vs Industry Benchmark] → dotted line showing industry average
│
└── ANNOTATIONS:
    ├── [Show AI Actions] → marks on chart when AI made changes
    │   "Feb 20: AI paused keyword" "Feb 18: AI reduced bid"
    ├── [Show Budget Changes] → marks when budget changed
    ├── [Show Campaign Launches] → marks when campaigns started
    └── [Show External Events] → marks holidays, sales events

# ── CHART INTERACTION ──

HOVER: Shows tooltip with all selected metrics for that point
       "Tuesday Feb 18: 14 customers, $23.40 each, $327 spent,
        $560 revenue, ROAS 1.71x, CTR 3.8%"

CLICK: Drills down to that day's detail
DRAG: Selects range → zooms in
PINCH (mobile): Zoom in/out

# ── ⋮ 3-DOT MENU ──

[⋮] Menu:
├── "Save This View" → saves current metric/filter/chart combo as preset
├── "Load Saved View" → switch between saved presets
├── "Export Chart" → PNG image / PDF / CSV data
├── "Email This Chart" → sends to email
├── "Add to Report" → includes in next scheduled report
├── "Set as Default" → this view loads every time
├── "Full Screen" → expands chart to full browser
├── "Show Data Table Below" → shows raw numbers under chart
├── "Show Trendline" → adds trend projection line
├── "Show Moving Average" → smooths noisy daily data (7-day/14-day/30-day)
├── "Show Seasonality" → overlays same period from previous year
├── "Highlight Anomalies" → AI marks unusual spikes/drops
└── "Explain This Chart" → AI narrates: "Your CPA has been steadily dropping..."



# ═══════════════════════════════════════════════════════════════
# WIDGET 5: PLATFORM & CHANNEL BREAKDOWN
# "Where is my money going and where is it working"
# ═══════════════════════════════════════════════════════════════

LAYOUT: Donut chart left + Data table right

# ── DONUT/PIE CHART ──

DEFAULT VIEW: Spend by Platform
├── Google Ads: $1,451 (62%) — blue
├── Meta/Facebook: $655 (28%) — purple
├── TikTok: $234 (10%) — teal
└── Microsoft: $0 (0%) — orange (not connected)

[⋮] 3-DOT MENU ON CHART:
├── "Show by" (switches what donut displays):
│   ├── [💰 Spend ✅] — how much spent on each platform
│   ├── [👥 Customers] — how many customers from each platform
│   ├── [💵 Revenue] — how much revenue from each platform
│   ├── [📈 ROI/ROAS] — return per platform
│   ├── [👆 Clicks] — click volume per platform
│   ├── [👀 Impressions] — visibility per platform
│   ├── [💸 Waste] — wasted spend per platform
│   └── [💰 Profit] — true profit per platform
│
├── "Drill Down" (deeper breakdown):
│   ├── [By Platform ✅] — Google vs Meta vs TikTok vs Microsoft
│   ├── [By Campaign Type] — Search vs Display vs Shopping vs PMax vs Video vs Social
│   ├── [By Network (v23 PMax)] — Search vs YouTube vs Display vs Gmail vs Maps vs Discover
│   │   └── THIS IS THE v23 KILLER FEATURE — nobody shows this yet
│   ├── [By Device] — Mobile vs Desktop vs Tablet
│   └── [By Location] — top countries/cities
│
├── "Chart Type":
│   ├── [🍩 Donut ✅]
│   ├── [🥧 Pie]
│   ├── [📊 Horizontal Bar]
│   ├── [📊 Stacked Bar]
│   └── [🌳 Treemap]
│
└── "Compare Periods" → side-by-side donuts: this period vs last

# ── DATA TABLE (right of chart) ──

DEFAULT COLUMNS (Simple Mode):
│ Platform    │ Spent  │ Customers │ Cost/ea │ Revenue │ Return │ Trend │
│ ─────────── │ ────── │ ───────── │ ─────── │ ─────── │ ────── │ ───── │
│ Google Ads  │ $1,451 │ 54        │ $26.87  │ $5,400  │ 3.72x  │ ↑12%  │
│ ├ Search    │ $870   │ 38        │ $22.89  │ $3,800  │ 4.37x  │ ↑15%  │
│ ├ Display   │ $290   │ 8         │ $36.25  │ $800    │ 2.76x  │ ↓3%   │
│ ├ YouTube   │ $174   │ 5         │ $34.80  │ $500    │ 2.87x  │ ↑8%   │
│ ├ Shopping  │ $117   │ 3         │ $39.00  │ $300    │ 2.56x  │ new   │
│ Facebook    │ $655   │ 24        │ $27.29  │ $2,400  │ 3.66x  │ ↑5%   │
│ ├ Feed      │ $459   │ 18        │ $25.50  │ $1,800  │ 3.92x  │ ↑8%   │
│ ├ Stories   │ $131   │ 4         │ $32.75  │ $400    │ 3.05x  │ ↓2%   │
│ ├ Reels     │ $65    │ 2         │ $32.50  │ $200    │ 3.08x  │ new   │
│ TikTok      │ $234   │ 9         │ $26.00  │ $900    │ 3.85x  │ ↑22%  │
│ TOTAL       │ $2,340 │ 87        │ $26.90  │ $8,700  │ 3.72x  │ ↑12%  │

EXPERT MODE ADDS COLUMNS:
│ + CTR │ CPC │ CPA │ ROAS │ Conv Rate │ Imp Share │ CPM │ Freq │

[⋮] 3-DOT MENU ON TABLE:
├── "Add/Remove Columns":
│   ├── 💰 Spend ✅
│   ├── 👥 Customers/Conversions ✅
│   ├── 🏷️ Cost Per Customer / CPA ✅
│   ├── 💵 Revenue ✅
│   ├── 📈 Return / ROAS ✅
│   ├── 📉 Trend ✅
│   ├── 👆 Clicks
│   ├── 👀 Impressions
│   ├── 👆 CTR (Click-Through Rate)
│   ├── 💲 CPC (Cost Per Click)
│   ├── 💲 CPM (Cost Per 1000 Views)
│   ├── 🔄 Conv. Rate (% click→buy)
│   ├── 🏆 Impression Share
│   ├── 🏆 Search Top Rate
│   ├── ⭐ Quality Score Avg
│   ├── 🔄 Frequency
│   ├── 👥 Reach (unique people)
│   ├── 💸 Wasted Spend
│   ├── 💰 True Profit
│   ├── 📊 Budget Used %
│   └── 📊 Impression Share Lost (Budget/Rank)
│
├── "Expand/Collapse Rows":
│   ├── [Show Platform Only] — Google, Meta, TikTok (3 rows)
│   ├── [Show Sub-Channels ✅] — Search, Display, YouTube under Google etc.
│   └── [Show Campaigns] — individual campaigns under each platform
│
├── "Sort By" → click any column header to sort
├── "Export Table" → CSV / Excel / PDF
├── "Conditional Formatting":
│   ├── [Color by ROI] — green if profitable, red if losing
│   ├── [Color by Trend] — green if improving, red if declining
│   └── [Color by vs Target] — green if beating target, red if below
└── "Compare Periods" → adds "Previous Period" columns side-by-side



# ═══════════════════════════════════════════════════════════════
# WIDGET 6: CAMPAIGN PERFORMANCE TABLE
# "The war room table — every campaign at a glance"
# This is the MOST data-dense widget
# ═══════════════════════════════════════════════════════════════

LAYOUT: Full-width table with filter bar above

# ── FILTER BAR ──

FILTERS (all combinable):
├── Platform: [All ✅] [Google] [Meta] [TikTok] [Microsoft]
├── Status: [All ✅] [🟢 Active] [🔴 Paused] [🤖 AI Paused] [📝 Draft] [🏁 Ended]
├── Performance: [All ✅] [💚 Profitable] [💛 Break Even] [❤️ Losing] [🆕 New (<7 days)]
├── Campaign Type: [All ✅] [Search] [Display] [Shopping] [PMax] [Video] [Social] [App]
├── Budget: [All] [Under-spending] [On Track] [Over-spending] [Exhausted]
├── AI Status: [All] [AI Recommends Changes] [AI Auto-Managed] [No AI Actions]
├── Goal: [All] [Sales] [Leads] [Traffic] [Awareness]
└── Search: [Search campaigns by name...]

# ── TABLE ──

DEFAULT COLUMNS (Simple Mode):
│ ☐ │ Status │ Campaign          │ Platform │ Customers │ Cost/ea │ Return │ Spent │ Budget │ Health │ AI │
│   │        │                   │          │           │         │        │       │ Left   │ Score  │    │
│ ─ │ ────── │ ───────────────── │ ──────── │ ───────── │ ─────── │ ────── │ ───── │ ────── │ ────── │ ── │
│ ☐ │ 🟢     │ Soy Candles       │ Google   │ 54        │ $26.87  │ 4.8x   │$1,451 │ 62%    │ 91     │ ✅ │
│ ☐ │ 🟢     │ Gift Sets         │ Meta     │ 24        │ $27.29  │ 3.2x   │ $655  │ 78%    │ 84     │ ✅ │
│ ☐ │ 🟡     │ Brand Video       │ TikTok   │ 3         │ $78.00  │ 0.8x   │ $234  │ 45%    │ 42     │ ⚠️ │
│ ☐ │ 🤖     │ Cheap Candles     │ Google   │ 0         │ $89.00  │ 0.0x   │ $89   │ PAUSED │ 12     │ 🔴 │
│ ☐ │ 📝     │ Spring Sale       │ Google   │ —         │ —       │ —      │ $0    │ DRAFT  │ —      │ 📝 │

EXPERT MODE ADDS COLUMNS (toggleable):
│ + CTR  │ CPC  │ CPA   │ ROAS │ Conv Rate │ Clicks │ Impressions │ Imp Share │ QS  │ CPM   │
│ 4.2%   │$1.47 │$26.87 │ 4.8x │ 5.2%     │ 624    │ 14,857      │ 67%       │ 7.4 │$12.30 │

ADDITIONAL TOGGLEABLE COLUMNS:
├── 👀 Impressions (times ad shown)
├── 👆 Clicks (people who clicked)
├── 👆 CTR / Click Rate (% who click)
├── 💲 CPC / Cost Per Click
├── 💲 CPM / Cost Per 1000 Views
├── 🔄 Conversion Rate (% click→buy)
├── 🏆 Impression Share (% of available impressions captured)
├── 🏆 Impression Share Lost - Budget (missed because budget ran out)
├── 🏆 Impression Share Lost - Rank (missed because competitors outranked)
├── 🏆 Search Top Impression Rate (% of time ad shows at top)
├── 🏆 Search Abs Top Rate (% at absolute #1 position)
├── ⭐ Quality Score Average
├── ⭐ Ad Strength
├── 💵 Revenue / Conversion Value
├── 💰 True Profit (revenue - spend - product cost)
├── 💸 Wasted Spend (non-converting spend identified by AI)
├── 📊 Budget Used % (how much of daily/monthly budget consumed)
├── 📅 Days Running
├── 📅 Last AI Action (what AI last did to this campaign)
├── 🔄 Frequency (avg times same person sees ad)
├── 👥 Reach (unique people who saw ad)
├── 🎯 Audience Size (total targetable audience)
├── 📊 Impression Share Lost to Budget (%)
├── 📊 Impression Share Lost to Rank (%)
├── 🔗 Landing Page Experience (Google's rating)
├── 📈 Week-over-Week Change (% change from last week)
├── 📈 Month-over-Month Change
└── 🏷️ Labels / Tags (user-defined categories)

# ── ROW ACTIONS ──

Click campaign name → goes to Campaign Detail page
Hover row → shows quick actions: [⏸️ Pause] [▶️ Resume] [📋 Clone] [📊 Detail]
Checkbox → enables bulk actions bar at top

# ── ⋮ 3-DOT MENU ──

[⋮] Menu:
├── "Choose Columns" → toggle any column on/off (list above)
├── "Save Column Preset" → save current column combo as named preset
│   └── Presets: "Quick Check" (5 cols) | "Deep Analysis" (15 cols) | "Client Report" (8 cols)
├── "Load Column Preset" → switch between saved presets
├── "Sort By" → any column, asc/desc (also click column header)
├── "Group By":
│   ├── [None ✅ — flat list]
│   ├── [Platform] — campaigns grouped under Google, Meta, etc.
│   ├── [Status] — grouped by Active, Paused, etc.
│   ├── [Campaign Type] — Search, Display, Shopping, etc.
│   ├── [Performance Tier] — Profitable, Break Even, Losing
│   └── [Goal] — Sales, Leads, Traffic, Awareness
├── "Conditional Formatting":
│   ├── [ROI Color] — green profitable, yellow break even, red losing
│   ├── [Trend Arrows] — show ↑↓ with color
│   ├── [Health Score Color] — green/yellow/red
│   ├── [Budget Bar] — progress bar for budget usage
│   └── [Sparklines] — tiny trend line in each row
├── "Compare to Previous Period" → adds comparison columns
├── "Show Totals Row" → sum/average row at bottom
├── "Show Averages" → industry average row for comparison
├── "Density":
│   ├── [Compact] — more rows visible
│   ├── [Normal ✅]
│   └── [Expanded] — more space per row, shows mini chart
├── "Export Table" → CSV / Excel / PDF
├── "Pin Columns" → keep certain columns visible when scrolling right
├── "Pagination" → [Show 10] [25 ✅] [50] [100] [All] rows per page
└── "Reset to Default"



# ═══════════════════════════════════════════════════════════════
# WIDGET 7: TOP PERFORMERS vs NEEDS ATTENTION
# "What's winning and what's broken"
# ═══════════════════════════════════════════════════════════════

LAYOUT: Two panels side by side

# ── LEFT: 🏆 TOP PERFORMERS ──

DEFAULT: Top 5 campaigns by ROI
├── 1. Soy Candles Search — 54 customers, $22/ea, ROI 4.8x 🟢
├── 2. Gift Sets Facebook — 24 customers, $27/ea, ROI 3.2x 🟢
├── 3. Retargeting Display — 12 customers, $18/ea, ROI 5.1x 🟢
├── 4. TikTok Brand — 9 customers, $26/ea, ROI 3.9x 🟢
└── 5. Shopping Feed — 8 customers, $29/ea, ROI 3.4x 🟢

[⋮] 3-DOT MENU:
├── "Show Top":
│   ├── [Top 5 ✅] [Top 10] [Top 20]
├── "Rank By":
│   ├── [ROI / ROAS ✅] — best return
│   ├── [Customers / Conversions] — most volume
│   ├── [Revenue] — most money earned
│   ├── [Profit] — most true profit after costs
│   ├── [CTR] — best click rate
│   ├── [CPA] — lowest cost per customer
│   ├── [Conversion Rate] — best click-to-buy rate
│   ├── [Improvement] — most improved vs last period
│   └── [Efficiency] — lowest CPC
├── "Show":
│   ├── [Campaigns ✅]
│   ├── [Keywords] — top performing keywords across all campaigns
│   ├── [Ads] — top performing ad copies
│   ├── [Audiences] — best converting audience segments
│   ├── [Products] — best selling products (e-commerce)
│   ├── [Locations] — best performing cities/regions
│   └── [Hours/Days] — best performing time slots
├── "Time Period" → override global: [This Week] [This Month] [All Time]
└── "View Details" → opens full report

# ── RIGHT: ⚠️ NEEDS ATTENTION ──

DEFAULT: Worst performers + AI-paused items
├── 1. Cheap Candles Display — 0 customers, $89 wasted, ROI 0x 🔴 [AI PAUSED]
├── 2. Brand Awareness TikTok — 3 customers, $78/ea, ROI 0.8x 🟡 [AI SUGGESTS FIX]
├── 3. Keyword "candle wholesale" — 45 clicks, 0 conversions, $67 waste 🔴
├── 4. Ad "50% Off Everything" — CTR 0.8% (avg 4.2%) 🟡 [AI HAS BETTER VERSION]
└── 5. Audience "Men 18-24" — 0 conversions, $34 spent 🔴 [RECOMMEND REMOVE]

Each item: [🔧 Fix] [🤖 AI Fix] [⏸️ Pause] [🔍 Details]

[⋮] 3-DOT MENU:
├── "Show":
│   ├── [Mixed — worst of everything ✅]
│   ├── [Campaigns Only]
│   ├── [Keywords Only]
│   ├── [Ads Only]
│   ├── [Audiences Only]
│   └── [Products Only] (e-commerce)
├── "Severity":
│   ├── [All ✅]
│   ├── [Critical Only — losing money]
│   └── [Declining — getting worse]
├── "Sort By":
│   ├── [Worst ROI ✅]
│   ├── [Most Wasted $]
│   ├── [Biggest Decline]
│   └── [Longest Underperforming]
├── "AI Auto-Fix All Safe Items" → AI fixes obvious issues
└── "View All Issues" → opens full list



# ═══════════════════════════════════════════════════════════════
# WIDGET 8: KEYWORD PERFORMANCE TABLE
# "Which words are making me money"
# ═══════════════════════════════════════════════════════════════

LAYOUT: Table with filter bar

# ── FILTER BAR ──
├── Campaign: [All ✅] [Specific campaign dropdown]
├── Status: [All ✅] [Active] [Paused] [AI Paused] [Negative]
├── Performance: [All] [Converting] [Wasting] [No Data Yet]
├── Match Type: [All] [Exact] [Phrase] [Broad]
├── Quality Score: [All] [High 8-10] [Medium 5-7] [Low 1-4]
├── Search: [Search keywords...]
└── Show: [Top 10 ✅] [Top 25] [Top 50] [All]

# ── TABLE ──

Simple Mode:
│ Keyword              │ Customers │ Cost/ea │ Clicks │ Spent │ Status │ AI │
│ ──────────────────── │ ───────── │ ─────── │ ────── │ ───── │ ────── │ ── │
│ soy candles          │ 18        │ $19.44  │ 120    │ $350  │ 🟢     │ ✅ │
│ handmade candles     │ 12        │ $22.50  │ 89     │ $270  │ 🟢     │ ✅ │
│ candle gift set      │ 8         │ $28.13  │ 56     │ $225  │ 🟢     │ ✅ │
│ cheap candles        │ 0         │ —       │ 67     │ $89   │ 🤖 PAUSED│ 🔴│
│ [+12 more keywords]  │           │         │        │       │        │    │

Expert Mode adds:
│ + CTR │ CPC │ CPA │ Conv Rate │ QS │ Imp Share │ Avg Pos │ Match Type │ Comp │

All available columns:
├── Keyword
├── Campaign (which campaign it belongs to)
├── Match Type (Exact, Phrase, Broad)
├── Status
├── 👥 Customers / Conversions
├── 🏷️ Cost Per Customer / CPA
├── 👆 Clicks
├── 👀 Impressions
├── 💰 Spend
├── 💵 Revenue
├── 📈 ROAS
├── 👆 CTR (Click Rate)
├── 💲 CPC (Cost Per Click)
├── 🔄 Conversion Rate
├── ⭐ Quality Score (1-10)
├── 🏆 Impression Share
├── 📊 Search Impression Share
├── 📊 Search Top Rate
├── 📊 Search Absolute Top Rate
├── 📈 Avg Position
├── 🔄 Bounce Rate (needs Google Analytics)
├── 💸 Wasted Spend (spent but 0 conversions)
├── 📈 Trend (vs previous period)
├── 🏷️ Max CPC Bid (what you're willing to pay)
├── 💲 Actual CPC (what you actually pay)
├── 📊 Expected CTR (Google's prediction)
├── 📊 Ad Relevance (Google's relevance rating)
├── 📊 Landing Page Experience (Google's LP rating)
├── 📅 Days Active
├── 🏷️ Competition Level (Low/Medium/High)
├── 📊 Search Volume (monthly searches for this term)
└── 📊 Top of Page Bid Estimate

[⋮] 3-DOT MENU:
├── "View":
│   ├── [Keywords ✅]
│   ├── [Search Terms] — actual searches people typed
│   ├── [Negative Keywords] — blocked search terms
│   └── [Keyword Ideas] — AI suggestions for new keywords
├── "Choose Columns" → toggle any column
├── "Group By":
│   ├── [None ✅]
│   ├── [Campaign]
│   ├── [Match Type]
│   ├── [Quality Score Range]
│   └── [Performance Tier]
├── "Sort By" → any column
├── "Conditional Formatting" → color code by QS, ROI, waste
├── "Export" → CSV / Excel
├── "AI Analysis" → "What keywords should I add/remove?"
└── "Bulk Actions" → [Pause Selected] [Change Bids] [Move to Campaign]



# ═══════════════════════════════════════════════════════════════
# WIDGET 9: TIME PERFORMANCE HEATMAP
# "WHEN do my ads work best"
# ═══════════════════════════════════════════════════════════════

LAYOUT: Heatmap grid (7 rows = days, 24 columns = hours)
Color intensity = performance (green = good, red = bad, white = no data)

DEFAULT METRIC: Conversions (customers gained)

         12am  1am  2am ... 8am  9am  10am 11am 12pm 1pm  2pm ... 11pm
Mon      ⬜    ⬜    ⬜      🟡   🟡   🟢   🟢   🟢  🟢   🟢      ⬜
Tue      ⬜    ⬜    ⬜      🟡   🟢   🟢   🟢🟢  🟢🟢 🟢   🟢      ⬜
Wed      ⬜    ⬜    ⬜      🟡   🟢   🟢🟢  🟢🟢  🟢🟢 🟢🟢  🟢      ⬜
Thu      ⬜    ⬜    ⬜      🟡   🟢   🟢   🟢🟢  🟢  🟢   🟡      ⬜
Fri      ⬜    ⬜    ⬜      🟡   🟡   🟢   🟢   🟢  🟡   🟡      ⬜
Sat      ⬜    ⬜    ⬜      ⬜   🟡   🟡   🟢   🟢  🟡   🟡      ⬜
Sun      ⬜    ⬜    ⬜      ⬜   ⬜   🟡   🟡   🟡  ⬜   ⬜      ⬜

AI INSIGHT: "Your best time is Tue-Thu, 10am-2pm. You're spending $34/week
on ads between 11pm-6am with 0 conversions. Stopping nighttime ads would
save $136/month."
[✅ Apply Suggestion] [🔍 Details]

[⋮] 3-DOT MENU:
├── "Show Metric":
│   ├── [👥 Conversions ✅]
│   ├── [👆 Clicks]
│   ├── [💰 Spend]
│   ├── [🏷️ CPA]
│   ├── [📈 ROAS]
│   ├── [👆 CTR]
│   ├── [💲 CPC]
│   └── [🔄 Conv Rate]
├── "Filter by":
│   ├── [All Campaigns ✅]
│   ├── [Specific Campaign]
│   ├── [Platform]
│   └── [Device]
├── "Overlay: Previous Period" → ghost cells showing comparison
├── "View as Table" → switch from heatmap to numbers
├── "AI Optimize Schedule" → AI creates optimal schedule recommendation
└── "Export" → image / CSV



# ═══════════════════════════════════════════════════════════════
# WIDGET 10: AUDIENCE INSIGHTS
# "WHO is responding to my ads"
# ═══════════════════════════════════════════════════════════════

LAYOUT: Multi-panel — charts + tables

# ── DEFAULT VIEW: Demographic Breakdown ──

PANEL A: Age Distribution (bar chart)
├── 18-24: 8% of customers, CPA $34.00
├── 25-34: 35% of customers, CPA $22.50 ← BEST
├── 35-44: 28% of customers, CPA $25.80
├── 45-54: 18% of customers, CPA $29.40
├── 55-64: 8% of customers, CPA $38.20
└── 65+: 3% of customers, CPA $42.10

PANEL B: Gender Split (donut)
├── Female: 68% of customers, CPA $24.30
└── Male: 32% of customers, CPA $31.50

PANEL C: Top Locations (map or table)
├── 1. London: 23 customers, $22.40 each
├── 2. Manchester: 12 customers, $26.80 each
├── 3. Birmingham: 8 customers, $28.90 each
└── [See all 15 cities]

PANEL D: Device Split
├── Mobile: 62% of traffic, 54% of customers
├── Desktop: 31% of traffic, 38% of customers
└── Tablet: 7% of traffic, 8% of customers

[⋮] 3-DOT MENU:
├── "View":
│   ├── [Demographics ✅] — age, gender
│   ├── [Locations] — countries, cities, regions
│   ├── [Devices] — mobile, desktop, tablet
│   ├── [Interests & Behaviors] — what audiences are interested in
│   ├── [Audience Segments] — your defined audience groups with performance
│   ├── [Life Events] — people getting married, moving, etc. (v23)
│   ├── [Time of Day] — when each demographic converts best
│   ├── [New vs Returning] — first-time vs repeat customers
│   └── [Platform by Audience] — which audiences work on which platforms
├── "Metric to Show":
│   ├── [Customers / Conversions ✅]
│   ├── [% of Total]
│   ├── [CPA / Cost Per Customer]
│   ├── [ROAS]
│   ├── [Revenue]
│   ├── [CTR]
│   ├── [Conversion Rate]
│   └── [Spend]
├── "Filter by Campaign"
├── "Filter by Platform"
├── "Compare Periods"
├── "Chart Type": [Bar ✅] [Pie] [Table] [Treemap]
├── "AI Insight" → "Your best audience is Women 25-34 on Mobile via Facebook Feed"
└── "Export"



# ═══════════════════════════════════════════════════════════════
# WIDGET 11: BEFORE vs AFTER TRACKER
# "Proof that we're worth it" (shows after 30+ days)
# ═══════════════════════════════════════════════════════════════

LAYOUT: Side-by-side comparison + trajectory chart

BEFORE (when joined)              → AFTER (current period)
Cost Per Customer: $45.20         → $26.90 (↓40%) ✅
Monthly Waste: $847               → $120 (↓86%) ✅
Customers Per Week: 52            → 87 (↑67%) ✅
Total Revenue: $5,200/wk          → $8,700/wk (↑67%) ✅
Health Score: 41                  → 82 (↑100%) ✅

Expert Mode:
CPA: $45.20→$26.90 | CTR: 2.1%→4.2% | CPC: $1.82→$1.47
ROAS: 1.8x→3.72x | QS: 5.0→7.4 | Imp Share: 48%→67%

TOTAL SAVED: $4,362 in wasted ad spend since joining
TOTAL EXTRA CUSTOMERS: 247 more than you would have gotten

[⋮] 3-DOT MENU:
├── "Compare Period":
│   ├── [Before vs Now ✅]
│   ├── [First Month vs Latest Month]
│   ├── [Any Two Custom Periods]
│   └── [Monthly Progression] — month 1, 2, 3, 4... trajectory
├── "Show":
│   ├── [Summary ✅]
│   ├── [By Campaign] — before/after per campaign
│   ├── [By Platform] — before/after per platform
│   ├── [By Keyword] — before/after per keyword
│   └── [AI Actions Impact] — how each AI action contributed
├── "Chart":
│   ├── [Side by Side ✅]
│   ├── [Progress Line] — trajectory over all months
│   └── [Cumulative Savings] — total saved growing over time
├── "Download Report" → branded PDF with all before/after data
├── "Email to [Boss/Client]" → sends formatted report
└── "Share" → public link to results (anonymized)



# ═══════════════════════════════════════════════════════════════
# WIDGET 12: BUDGET & SPEND TRACKER
# "Am I on pace? Where's my money going?"
# ═══════════════════════════════════════════════════════════════

LAYOUT: Progress bars + pace chart

MONTHLY BUDGET: $3,000
├── Spent so far: $2,340 (78%) ████████████████████░░░░░
├── Remaining: $660 (22%)
├── Days left: 6 of 28
├── Pace: $83.57/day (budget pace: $107.14/day)
├── Projection: "On track to spend $2,764 of $3,000 (92%)"
└── Status: 🟢 Under budget — you'll have $236 left

BY PLATFORM:
├── Google: $1,451 of $1,800 (81%) ████████████████░░░░
├── Meta:   $655 of $800 (82%)    ████████████████░░░░
├── TikTok: $234 of $400 (59%)    ████████████░░░░░░░░
└── AI note: "TikTok is underspending. Want me to redistribute?"

BY CAMPAIGN:
├── Soy Candles: $1,451 — ON PACE
├── Gift Sets: $655 — SLIGHTLY OVER
├── Brand Video: $234 — UNDER-SPENDING
└── [See all campaigns]

[⋮] 3-DOT MENU:
├── "View by":
│   ├── [Total ✅]
│   ├── [By Platform]
│   ├── [By Campaign]
│   ├── [By Campaign Type]
│   └── [By Day] — daily spend bar chart
├── "Show":
│   ├── [Budget Progress ✅]
│   ├── [Daily Spend Chart] — bar chart of daily spend
│   ├── [Cumulative Spend] — line chart growing over month
│   ├── [Budget vs Actual] — planned vs actual line chart
│   └── [Spend by Hour] — when money is spent during the day
├── "Projection Model":
│   ├── [Linear ✅] — assumes same daily rate
│   ├── [Weighted Recent] — weighted toward last 7 days
│   └── [AI Prediction] — AI considers day of week, trends
├── "Alert Settings":
│   ├── "Alert when budget hits [80%] [90%] [100%]"
│   ├── "Alert when daily pace exceeds [1.5x] [2x] normal"
│   └── "Alert if projected to run out [3] [5] [7] days early"
├── "Rebalance Budget" → AI suggests redistribution
└── "Export"



# ═══════════════════════════════════════════════════════════════
# WIDGET 13: AI ACTIVITY FEED
# "What has the AI been doing while I slept?"
# ═══════════════════════════════════════════════════════════════

LAYOUT: Scrollable timeline

DEFAULT: Last 7 days of AI actions

FEED:
├── Feb 24, 8:01am — 📊 Generated daily briefing (sent to WhatsApp)
├── Feb 24, 3:14am — ⏸️ Paused keyword "cheap candles" ($12/day, 0 conv, 5 days)
├── Feb 23, 11:30pm — 🔍 Discovered search term "soy candles gift" (22 searches, added as suggestion)
├── Feb 23, 6:00pm — 💰 Reduced bid on "candle wholesale" from $2.50 to $1.80 (low conv rate)
├── Feb 23, 2:15pm — 🚫 Added negative keyword "free candles" (7 irrelevant clicks today)
├── Feb 23, 9:00am — 📊 Generated weekly report
├── Feb 22, 4:45pm — 🧪 Started A/B test: new headline "Handmade with Love" vs current
├── Feb 22, 10:20am — 📈 Increased bid on "soy candles uk" (high conv rate, low impression share)
├── Feb 21, 8:00pm — ⚠️ Detected unusual click pattern from IP 45.33.xx.xx (blocked)
└── [Load more...]

SUMMARY BAR:
"Last 7 days: AI made 23 changes. Result: CPA down 8%, waste reduced by $340."
"Money saved by AI actions this month: $1,240"

Each entry: [↩️ Undo] [🔍 Why?] [📊 Impact]

[⋮] 3-DOT MENU:
├── "Filter by":
│   ├── [All Actions ✅]
│   ├── [Keyword Changes] — paused, added, bid changed
│   ├── [Budget Changes] — bid adjustments, reallocations
│   ├── [Ad Changes] — new ads, paused ads
│   ├── [Audience Changes] — added, removed, adjusted
│   ├── [Alerts Sent] — notifications generated
│   ├── [Reports Generated]
│   └── [Blocked/Fraud] — fraud detection actions
├── "Filter by Campaign"
├── "Time Range": [Last 24h] [Last 7 Days ✅] [Last 30 Days] [All Time]
├── "Show Impact" → adds estimated $ impact of each action
├── "View as":
│   ├── [Timeline ✅]
│   ├── [Summary Table] — grouped by action type with counts
│   └── [Impact Report] — sorted by $ value of impact
├── "Undo Multiple" → select and batch undo
└── "Export AI Activity Log" → CSV for accountability



# ═══════════════════════════════════════════════════════════════
# WIDGET 14: COMPETITIVE POSITION SNAPSHOT
# "How am I doing vs competitors"
# ═══════════════════════════════════════════════════════════════

LAYOUT: Compact table + position chart

YOUR POSITION:
├── Avg Impression Share: 67% (you show 67% of the time)
├── Competitors showing: 4 active competitors
├── Position above rate: 58% (you appear above competitors 58% of time)
├── Your avg CPC: $1.47 vs auction avg: $1.82 (you're paying 19% less)
└── Lost to budget: 20% | Lost to rank: 13%

TOP COMPETITORS (from Auction Insights):
│ Competitor      │ Overlap Rate │ Position Above │ Imp Share │
│ ─────────────── │ ──────────── │ ────────────── │ ───────── │
│ CandleWorld.com │ 72%          │ They: 55%      │ 45%       │
│ WaxAndWick.co   │ 58%          │ They: 38%      │ 32%       │
│ ScentedJoy.com  │ 41%          │ They: 22%      │ 28%       │
│ YOU             │ —            │ —              │ 67%       │

[⋮] 3-DOT MENU:
├── "View by":
│   ├── [All Keywords ✅]
│   ├── [Top 10 Keywords] — competitive position on best keywords
│   ├── [Brand Keywords] — who's bidding on your brand name
│   ├── [By Campaign]
│   └── [By Time Period] — how competitive position is trending
├── "Metrics":
│   ├── [Impression Share ✅]
│   ├── [Position Above Rate]
│   ├── [Overlap Rate]
│   ├── [Outranking Share]
│   └── [Top of Page Rate]
├── "Trend" → line chart showing impression share over time
├── "AI Analysis" → "Competitor X is increasing spend. You may need to..."
└── "Competitor Ad Library" → see what competitors' ads look like



# ═══════════════════════════════════════════════════════════════
# WIDGET 15: QUICK ACTIONS BAR
# "Do things without leaving the dashboard"
# ═══════════════════════════════════════════════════════════════

LAYOUT: Horizontal bar of action buttons (bottom of dashboard or floating)

ACTIONS:
├── [🚀 Create Campaign] → opens campaign creator
├── [⏸️ Pause Campaign ▼] → dropdown of active campaigns to pause
├── [💬 Ask AI] → opens AI Advisor in slide-out panel
├── [📊 Generate Report] → quick report for current date range
├── [📧 Email Dashboard] → screenshots and emails dashboard
├── [🔴 EMERGENCY STOP] → pauses ALL campaigns immediately
│   └── Confirms: "This will pause ALL ads on ALL platforms. Continue?"
└── [⚙️ Customize Dashboard] → enter edit mode for widgets



# ═══════════════════════════════════════════════════════════════
# DASHBOARD CUSTOMIZATION SYSTEM
# "Make the dashboard yours"
# ═══════════════════════════════════════════════════════════════

CUSTOMIZE MODE (click ⚙️ or "Edit Dashboard"):

ACTIONS:
├── REORDER: Drag and drop any widget to new position
├── RESIZE: Drag edges to make widget bigger/smaller
│   ├── Full width (1 column)
│   ├── Half width (2 column)
│   └── Third width (3 column)
├── SHOW/HIDE: Toggle widgets on/off:
│   ├── ☑️ KPI Scorecards (always on)
│   ├── ☑️ AI Command Center
│   ├── ☑️ Action Required Feed
│   ├── ☑️ Performance Trend Chart
│   ├── ☑️ Platform Breakdown
│   ├── ☑️ Campaign Table
│   ├── ☑️ Top/Worst Performers
│   ├── ☐ Keyword Table (off by default — available in Campaigns tab)
│   ├── ☑️ Time Heatmap
│   ├── ☐ Audience Insights (off by default — available in Reports)
│   ├── ☑️ Before/After (hidden until 30 days)
│   ├── ☑️ Budget Tracker
│   ├── ☑️ AI Activity Feed
│   ├── ☐ Competitive Position (off by default — available in Reports)
│   ├── ☑️ Quick Actions Bar
│   ├── ☐ E-Commerce: Product Performance (for stores only)
│   ├── ☐ E-Commerce: Inventory Status (for stores only)
│   └── ☐ Custom Widget (embed custom report chart)
├── ADD CUSTOM WIDGET: embed a saved chart from Custom Report Builder
├── SAVE LAYOUT: save current layout as named preset
│   └── Presets: "Morning Quick Check" | "Deep Analysis" | "Client Review"
├── LOAD LAYOUT: switch between saved layouts
├── SHARE LAYOUT: export layout for team members
└── RESET: restore default layout

ROLE-BASED DEFAULTS:
├── New user (Simple mode): 7 widgets — KPIs, AI Summary, Actions, Chart, Platform, Top/Worst, Budget
├── Expert user: + Keyword Table, Heatmap, Competitive, AI Activity
├── Agency manager: + Client overview widget, per-client health scores
└── E-commerce: + Product Performance, Inventory Status



# ═══════════════════════════════════════════════════════════════
#  COMPLETE DASHBOARD DATA POINT COUNT
# ═══════════════════════════════════════════════════════════════

TOTAL WIDGETS: 15 (7 shown by default, 15 available)

TOTAL METRICS AVAILABLE: 52 unique metrics
├── Money: Spend, Revenue, Profit, Wasted, CPA, CPC, CPM, AOV, ROAS, True ROI
├── Volume: Conversions, Clicks, Impressions, Reach, Phone Calls, Form Subs, Store Visits, Cart Adds, Checkouts
├── Rates: CTR, Conv Rate, Bounce Rate, Cart Abandon Rate, Video View Rate
├── Quality: Quality Score, Ad Strength, Landing Page Experience
├── Competitive: Imp Share, Lost (Budget), Lost (Rank), Position Above, Overlap, Top Rate, Abs Top Rate
├── Engagement: Frequency, Video Watch Time, Engagement Rate, LP Views
└── Calculated: Health Score, Week/Month Change, vs Industry, vs Target

TOTAL DROPDOWN/SWITCH OPTIONS PER WIDGET:
├── Widget 1 (KPIs): 23 metric options + 5 drill-downs per card
├── Widget 2 (AI Center): 8 summary options + 5 score details
├── Widget 3 (Actions): 4 filter types + 4 sort options
├── Widget 4 (Chart): 30 metrics × 9 split-bys × 5 chart types × 4 compare options = 5,400 combinations
├── Widget 5 (Platform): 8 show-by × 5 drill-down × 5 chart types = 200 combinations
├── Widget 6 (Campaign Table): 35 columns × 6 filters × 5 group-bys = hundreds of views
├── Widget 7 (Top/Worst): 9 rank-by × 7 show types = 63 combinations each side
├── Widget 8 (Keywords): 25 columns × 5 filters × 5 group-bys
├── Widget 9 (Heatmap): 8 metrics × 4 filters
├── Widget 10 (Audience): 9 views × 8 metrics × 4 chart types
├── Widget 11 (Before/After): 4 compare × 5 show × 3 chart
├── Widget 12 (Budget): 5 views × 5 show × 3 projections
├── Widget 13 (AI Feed): 8 filter types × 4 time ranges × 3 views
├── Widget 14 (Competitive): 5 views × 5 metrics
└── Widget 15 (Quick Actions): 7 action buttons

EVERY WIDGET HAS:
├── ⋮ 3-dot menu with view switching options
├── Metric/dimension dropdowns
├── Filter capability
├── Export option (CSV/PDF/Image)
├── Compare to previous period toggle
├── Simple ↔ Expert mode toggle (follows global setting)
├── Hover tooltips on every number
├── Click to drill down
└── "Ask AI about this" option

THEORETICAL TOTAL DASHBOARD VIEWS:
With all combinations of metrics, splits, filters, and chart types,
the dashboard can show approximately 10,000+ unique views from ONE screen.

But the DEFAULT view shows 7 widgets with 5 key numbers each.
30-second scan. Full picture. Then drill down as needed.


# ═══════════════════════════════════════════════════════════════
#  THE 15-YEAR AD MANAGER'S MORNING ROUTINE
#  (How this dashboard gets used in real life)
# ═══════════════════════════════════════════════════════════════

8:30 AM — Open dashboard with coffee

FIRST 10 SECONDS: Scan KPI cards
"Spent $2,340, got 87 customers at $26.90 each, ROAS 3.72x.
 All green arrows. Good."

NEXT 10 SECONDS: Check Health Score + AI Summary
"Score 82. AI says great week. One keyword paused. One opportunity."

NEXT 15 SECONDS: Action Required Feed
"2 items need attention. Approve new audience? Yes. Check AI's new ads? Quick look... approved."

NEXT 15 SECONDS: Glance at chart (7-day trend)
"CPA trending down — 4th week in a row. Revenue trending up. Perfect."

NEXT 10 SECONDS: Platform breakdown
"Google doing heavy lifting, TikTok showing promise, Meta steady."

TOTAL: 60 seconds. Full picture. Two decisions made.

DEEPER DIVE (if time permits, 5-10 minutes):
├── Switch chart to "Split by Campaign" — see which campaigns drive results
├── Check keyword table — any new wasters?
├── Look at heatmap — still peaking Tue-Thu 10am-2pm
├── Check competitor position — anyone gaining on us?
├── Review AI activity — what did AI do overnight?
└── Done. Close laptop. Go run the business.

THAT'S the dashboard. One screen. Infinite depth. 60-second command.

