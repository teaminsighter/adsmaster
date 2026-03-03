
# ═══════════════════════════════════════════════════════════════
#  COMPLETE WEBAPP ARCHITECTURE v2 — ALL 100 FEATURES MAPPED
#  Every feature has a home. Nothing missing.
# ═══════════════════════════════════════════════════════════════


# ┌─────────────────────────────────────────────────────────────┐
# │                    MAIN NAVIGATION (8 TABS)                  │
# └─────────────────────────────────────────────────────────────┘

[1] 🏠 Dashboard           ← Home (land here every time)
[2] 📢 Campaigns           ← Create, manage, clone, bulk actions
[3] 💡 AI Advisor          ← Chat, voice, strategy, research, competitor intel
[4] 📊 Reports             ← All analytics, benchmarks, invoices, competitor
[5] 🔔 Alerts              ← Every alert type, daily briefing
[6] 🧪 A/B Tests           ← Experiments
[7] 🛒 E-Commerce Hub      ← Products, shopping, retargeting (visible when store connected)
[8] ⚙️ Settings            ← Account, connections, rules, billing, team, API

SIDEBAR BOTTOM:
├── 📚 Learning Center (glossary, tutorials, guides)
├── 👤 Profile / Account
├── 🎧 Support Chat
└── 🔗 Connected Accounts status bar

TOP HEADER (always visible):
├── Logo
├── Global Search
├── [👶 Simple ↔ 🧠 Expert] toggle  ← switches ALL screens
├── Date Range Picker
├── 🔔 Notification Bell
└── 👤 Avatar dropdown



# ═══════════════════════════════════════════════════════════════
# PRE-LOGIN SCREENS (3 screens)
# ═══════════════════════════════════════════════════════════════

SCREEN 0A: LANDING PAGE
├── Hero: "Stop Wasting Money on Ads"
├── 7 Hook Features
├── Competitor comparison (our dashboard vs Google Ads)
├── Pricing (Free / $49 / $99 / $299)
├── ROI Calculator Widget (Feature #100)                          ← F100
│   ├── Input: monthly ad spend, industry, current cost per customer
│   ├── Output: "Estimated savings: $340-$890/month"
│   └── [Start Free Trial]
├── Testimonials, FAQ
└── CTA everywhere → Sign Up

SCREEN 0B: SIGN UP / LOGIN
├── Sign up with Google (primary)
├── Sign up with Email
└── → Onboarding

SCREEN 0C: FREE AUDIT PAGE (Feature #99)                         ← F99
├── "Connect Google Ads — See Waste in 60 Seconds"
├── OAuth connect → AI scans → waste report
├── Shows: waste amount, top issues, fix preview
└── "Want to fix this? Start free trial"



# ═══════════════════════════════════════════════════════════════
# ONBOARDING FLOW (5 steps) — Features #94, #98
# ═══════════════════════════════════════════════════════════════

STEP 1: CONNECT ACCOUNTS                                         ← F94
├── [Connect Google Ads] (OAuth)
├── [Connect Facebook/Instagram Ads] (OAuth)
├── [Connect TikTok Ads] (OAuth)
├── [Connect Microsoft/Bing Ads] (OAuth)                          ← F57
├── [Connect Shopify / WooCommerce] (OAuth)                       ← F71
├── Status: ✅ Connected | ⏳ Connecting | ☐ Not connected
└── [Skip for now]

STEP 2: TELL US ABOUT YOUR BUSINESS
├── "What does your business do?" → text
├── Industry dropdown
├── Website URL (optional)
├── Country/region
├── Do you have physical stores? [Yes/No]
│   └── If yes → enables Store Location Analytics later (F43)
└── Do you sell products online? [Yes/No]
    └── If yes → enables E-Commerce Hub later (F71-78)

STEP 3: SET YOUR GOAL (Feature #98)                              ← F98
├── 🛒 "More Sales"
├── 📞 "More Leads"
├── 👥 "More Store Visitors"
└── 📢 "Brand Awareness"

STEP 4: SET YOUR BOUNDARIES
├── Monthly budget limit: $______ slider
├── Max cost per customer: $______ or "Let AI decide"
├── Auto-pause rules: spend > $__ + 0 conversions + __ days
├── Alert channels: ☑️ Email ☑️ WhatsApp ☐ Slack ☐ SMS ☐ Telegram
├── AI freedom level:
│   ├── 🟢 Full Auto — AI handles everything
│   ├── 🟡 Semi Auto — AI suggests, I approve big changes (DEFAULT)
│   └── 🔴 Manual — AI only suggests
└── Enter profit margin % (for true ROI tracking)                 ← F74

STEP 5: SCAN RESULTS
├── If existing account: AI audit results
│   ├── Campaigns found, spend history, waste identified
│   ├── [Fix Everything] [Show Details] [Later]
│   └── → Dashboard
├── If new account:
│   ├── AI pre-builds campaign using Step 2+3 answers
│   ├── Uses industry templates (F95)                             ← F95
│   └── → Campaign Creator
└── → DASHBOARD



# ═══════════════════════════════════════════════════════════════
# TAB 1: 🏠 DASHBOARD — Features #35, #36, #37, #39, #40, #41, #8
# ═══════════════════════════════════════════════════════════════

ROW 1: KEY METRICS CARDS (5 cards)                               ← F35
┌─────────────┬─────────────┬──────────────┬──────────┬──────────┐
│ 💰 SPENT    │ 👥 CUSTOMERS│ 🏷️ COST/     │ 📈 REVENUE│ ✅ RETURN│
│ $2,340      │ 87          │ CUSTOMER     │ $8,700   │ $3.72   │
│             │             │ $26.90       │          │ per $1  │
│ ↑12% vs lw  │ ↑8%         │ ↓5% ✅        │ ↑15%     │ ↑9%    │
└─────────────┴─────────────┴──────────────┴──────────┴──────────┘
EXPERT MODE adds under each card:
│ CPA: $26.90 │ Conv: 87  │ CTR: 4.2%   │ ROAS: 3.72x │
│ CPC: $1.47  │ CR: 4.1%  │ CPM: $12.30 │ Imp Share: 67% │
│ QS avg: 7.4 │ Clicks: 624│ Impr: 14,847│              │
Every term has hover tooltip: "CTR 4.2% = 4 of 100 viewers click"

ROW 2: HEALTH SCORE + AI SUMMARY                                ← F8, F40
├── Health Score: 82/100 🟢
│   ├── Waste: 9/10
│   ├── Targeting: 8/10
│   ├── Ad Quality: 7/10
│   ├── Budget Use: 9/10
│   └── ROI: 8/10
├── AI Weekly Summary (plain English paragraph)
│   "This week was great. 87 new customers at $26.90 each..."
│   Expert: adds CTR/CPC/ROAS trends
└── [See Full Report] [Chat with AI]

ROW 3: ACTIVE ALERTS (pending actions)
├── Waste alerts with [Approve Fix] [Dismiss] [Details]
├── Opportunity alerts with [Approve] [Skip] [Ask AI]
├── Budget warnings with 3 options (Safe/Moderate/Aggressive)    ← F88
└── Scrollable, shows count badge

ROW 4: PERFORMANCE CHART
├── Metric selector: [Customers] [Spend] [Revenue] [Cost/Customer]
├── Line chart with comparison overlay (this vs previous period)
├── Expert adds: [CTR] [CPC] [ROAS] [Impression Share] lines
└── Hover tooltip with daily breakdown

ROW 5: PLATFORM BREAKDOWN                                       ← F36, F37, F59
├── Pie/donut chart: Google 62% | Facebook 28% | TikTok 10%
├── Table: Platform | Spent | Customers | Cost/ea | ROI
├── Expert adds: CTR, CPC, Conv Rate per platform
├── PMax channel breakdown (v23 NEW): Search | YouTube | Display | Gmail | Maps  ← F36
└── Microsoft/Bing included when connected                       ← F57

ROW 6: TOP PERFORMERS + WORST PERFORMERS
├── 🏆 Top 5 campaigns with ROI
├── ⚠️ Needs Attention (underperformers, AI-paused)
└── [View All Campaigns] [View All Issues]

ROW 7: BEFORE vs AFTER (shows after 30+ days)
├── Before metrics (when joined) → After metrics (now)
├── % change for each metric
├── Total money saved
├── Expert: CPA, CTR, ROAS, QS comparisons
└── [Download Before/After Report PDF]

ROW 8: TRUE PROFIT CALCULATOR (Feature #39)                     ← F39
├── Revenue ($8,700) - Ad Spend ($2,340) - Product Cost ($4,350) = TRUE PROFIT ($2,010)
├── "Your real profit margin on ads is 23%"
├── Expert: ROAS 3.72x vs True ROI 0.86x (after product costs)
├── Only visible if user entered product costs in onboarding/settings
└── [Edit Product Costs] [Learn More]

ROW 9: INDUSTRY BENCHMARK SNAPSHOT (Feature #41, #89)            ← F41, F89
├── "Your CPA: $26.90 vs Industry Avg: $42.30 — You're 37% better! 🟢"
├── "Your CTR: 4.2% vs Industry Avg: 3.1% — Above average 🟢"
├── "Your ROAS: 3.72x vs Industry Avg: 2.8x — Strong 🟢"
└── [See Full Benchmark Report]



# ═══════════════════════════════════════════════════════════════
# TAB 2: 📢 CAMPAIGNS
# Sub-nav: All Campaigns | + Create | Templates | Strategy Calendar
# Features: #1-7, #9-15, #16-24, #25-34, #58, #67, #77, #92
# ═══════════════════════════════════════════════════════════════


# ─── ALL CAMPAIGNS LIST ───

TOP BAR:
├── [+ Create Campaign]                                          ← F1
├── [Clone Selected]                                             ← F6
├── [Bulk Actions ▼] (Feature #67)                               ← F67
│   ├── Pause Selected
│   ├── Resume Selected
│   ├── Change Budget (+10% / -10% / custom)
│   ├── Change Bidding Strategy
│   ├── Apply Label
│   └── Export Selected
├── [Filter ▼]
│   ├── Platform: All | Google | Meta | TikTok | Microsoft
│   ├── Status: All | Active | Paused | AI Paused | Draft
│   ├── Performance: All | Profitable | Losing Money | New
│   └── Type: Search | Display | Shopping | PMax | Video | Social
└── [Search campaigns...]

TABLE COLUMNS:
Simple Mode:
│ ☐ │ Campaign │ Platform │ Status │ Customers │ Cost/ea │ ROI │ AI Actions │

Expert Mode adds:
│ CTR │ CPC │ CPA │ ROAS │ Conv Rate │ Imp Share │ QS │ Budget Used % │

EACH ROW:
├── Checkbox for bulk select
├── Click → Campaign Detail page
├── Quick actions: [⏸️ Pause] [▶️ Resume] [📋 Clone] [🗑️ Archive]
└── Status icons: 🟢 Active | 🔴 Paused | 🤖 AI Paused | 📝 Draft


# ─── CAMPAIGN DETAIL PAGE ───

SUB-TABS (8 tabs):

┌────────────────────────────────────────────────────────────────┐
│ Overview │ Keywords │ Ads │ Audience │ Schedule │ Budget │ AI Log │ Settings │
└────────────────────────────────────────────────────────────────┘

CAMPAIGN DETAIL → OVERVIEW
├── Campaign health score (0-100)                                ← F8
├── Key metrics cards (campaign-specific)
├── Performance chart (date range)
├── AI recommendations for THIS campaign
├── Recent AI actions
├── Pause/Resume with AI resume suggestion (Feature #7)          ← F7
│   └── When paused: "AI recommends resuming when: [weekday traffic returns]"
├── Simple: "54 customers at $26.87 each"
├── Expert: + CTR, CPC, CPA, ROAS, Imp Share, QS
├── Performance Prediction (Feature #93)                         ← F93
│   └── "If current trend continues: ~62 customers next week (±5)"
└── Cross-Platform Sync status if multi-platform (F58)           ← F58

CAMPAIGN DETAIL → KEYWORDS
├── Keyword List:
│   ├── Simple: keyword → clicks → customers → cost/customer → status
│   ├── Expert: + CTR, CPC, Conv Rate, QS, Impression Share, Avg Position
│   ├── Quality Score column with color (Feature #32)            ← F32
│   │   └── Low QS flagged: "QS 4/10 — [See Improvement Plan] [AI Fix]"
│   │   └── AI suggests: landing page speed, keyword-ad relevance, CTR improvement
│   └── Keyword Auto-Pruner status (Feature #28)                 ← F28
│       └── Auto-paused keywords marked: "🤖 Paused: $47 spent, 0 conv, 7 days"
├── Search Terms tab:
│   ├── Actual searches that triggered ads
│   ├── AI flags irrelevant: [Block] button
│   ├── AI suggests new keywords: [Add] button
│   └── Negative Keyword Builder auto-adds (Feature #29)         ← F29
├── Negative Keywords tab:
│   ├── AI-added negatives with reason
│   └── [+ Add Manual]
├── [+ Add Keywords]
├── [AI Suggest Keywords]
└── [Import Keywords CSV]

CAMPAIGN DETAIL → ADS
├── All ad copies with performance
│   ├── Ad preview (how it looks on Google/Meta/TikTok)
│   ├── Simple: clicks, customers, cost/customer
│   ├── Expert: + CTR, CPC, Conv Rate
│   └── Ad Performance Predictor score (Feature #19)             ← F19
│       └── Before launch: "Predicted CTR: 4.8% ⭐⭐⭐⭐"
├── A/B test status if running (links to A/B Tests tab)
├── AI-generated ads awaiting approval:
│   ├── [✅ Approve] [✏️ Edit] [❌ Reject]
│   └── AI reason: "Wrote this because current CTR is below average"
├── [+ Create New Ad] (Manual)
├── [AI Write Ads] (Feature #16)                                 ← F16
│   └── Generates 10+ headline/description variations
├── [AI Write in Other Language] (Feature #17)                   ← F17
│   ├── Select languages: [Spanish ✅] [French ☐] [Arabic ☐] [Hindi ☐]
│   └── AI translates + culturally adapts (not just translate)
├── [Create Display Image] (Feature #21)                         ← F21
│   ├── Describe: "candles on wooden table, warm lighting"
│   ├── AI generates 4 image variations
│   └── [Pick Favorite] [Regenerate] [Edit Prompt]
├── [Create Video Script] (Feature #22)                          ← F22
│   ├── Length: [15 sec] [30 sec] [60 sec]
│   ├── Format: YouTube | Shorts/Reels | TikTok
│   ├── AI writes: Hook → Problem → Solution → CTA
│   └── Storyboard preview with scene descriptions
├── Ad Compliance Checker (Feature #23) — RUNS AUTOMATICALLY     ← F23
│   ├── Before ANY ad submits to Google/Meta:
│   ├── "✅ No policy violations" or
│   ├── "⚠️ 'Best' may violate superlative policy — suggest 'Top-rated'"
│   └── Checklist: char limits ✅, policy words ✅, landing page ✅
├── Responsive Ad Builder (Feature #20)                          ← F20
│   └── Auto-generates responsive search ads with optimal combinations
└── Cross-Platform Sync (Feature #58)                            ← F58
    └── "Sync this ad to: [Google ✅] [Meta ✅] [TikTok ☐] [Microsoft ☐]"
    └── AI adapts format per platform

CAMPAIGN DETAIL → AUDIENCE
├── Current targeting summary:
│   ├── Simple: "Women 25-45, USA, interested in home decor & candles"
│   ├── Expert: Affinity, In-market, Custom segments, Demographics
│   └── Cross-Platform Audience status (Feature #13)             ← F13
│       └── "Applied to: Google ✅ Meta ✅ TikTok ☐"
├── Life Event Targeting (Feature #10)                           ← F10
│   ├── "Target by Life Events:"
│   ├── ☐ Getting Married  ☐ New Baby  ☐ Moving
│   ├── ☐ Starting Business  ☐ Graduating  ☐ Retiring
│   └── Uses v23 LIFE_EVENT_USER_INTEREST dimension
├── Audience Performance Tracker (Feature #12)                   ← F12
│   ├── Table: Segment | Customers | Cost/ea | Conv Rate | Budget %
│   ├── "Women 25-34: 45 customers, $22 each 🟢 — getting 60% budget"
│   ├── "Men 35-44: 12 customers, $38 each 🟡 — reduced to 20%"
│   └── AI auto-shifts budget to best segments
├── Negative Audience Manager (Feature #14)                      ← F14
│   ├── "Excluded Audiences:"
│   ├── AI: "Excluding 'bargain hunters' — 200 clicks, 0 purchases"
│   └── [AI Suggestions] [Add Manual] [View History]
├── Audience Suggestions (Feature #15)                           ← F15
│   ├── AI card: "Haven't tried 'gift shoppers' — est. 2,400 potential customers"
│   └── [Add This Audience] [Tell Me More] [Skip]
├── [Edit Audience]
├── [AI Build Audience] (Feature #9)                             ← F9
│   └── Type: "eco-conscious moms who buy handmade" → v23 NLP endpoint
├── [Upload Customer List] (Feature #11)                         ← F11
│   ├── Upload CSV/Excel of emails/phones
│   ├── Matching progress bar
│   ├── Lookalike audience size estimator
│   └── "Matched 1,200 of 1,500 customers → Lookalike: 2.3M similar people"
└── Platform-specific notes: "Meta allows interest stacking, Google uses affinity"

CAMPAIGN DETAIL → SCHEDULE
├── Visual calendar showing when ads run
├── Heatmap: best hours/days (Feature #34)                       ← F34
│   ├── Simple: "Best time: Tue-Thu, 10am-2pm"
│   ├── Expert: hourly CTR/Conv Rate grid
│   └── AI: "Stop 11pm-6am — saves $34/week, 0 conversions"
├── Minute-Level Scheduling (Feature #5)                         ← F5
│   └── v23 datetime with timezone precision picker
├── [Edit Schedule]
└── [AI Optimize Schedule]

CAMPAIGN DETAIL → BUDGET & BIDDING
├── Current daily/monthly budget with usage bar
├── Smart Budget Allocator (Feature #4)                          ← F4
│   ├── Visualization: how budget splits across platforms
│   ├── "Google $20/day (67%) | Meta $8/day (27%) | TikTok $2/day (6%)"
│   └── AI adjusts automatically based on ROI
├── Bidding strategy:
│   ├── Simple: "AI is getting you the most customers for your budget"
│   ├── Expert: "Maximize Conversions, target CPA $25.00"
│   └── Smart Bidding Advisor (Feature #30)                      ← F30
│       └── "You're using MaxClicks. Switch to MaxConversions → +20% customers"
│       └── [Switch Strategy] [Explain More] [Keep Current]
├── Budget Optimizer (Feature #26)                               ← F26
│   └── Real-time: shifts from underperforming to winning campaigns
├── 3-Option Advisor for changes (Feature #88)                   ← F88
│   ├── 🟢 Safe: Keep $30/day (predictable results)
│   ├── 🟡 Moderate: Increase to $40/day (+8 customers expected)
│   └── 🔴 Aggressive: Increase to $60/day (+20 customers, higher risk)
├── Growth Recommendations (Feature #90)                         ← F90
│   └── "Increasing budget 20% should add ~15 customers. Confidence: 78%"
└── [Change Budget] [Change Strategy]

CAMPAIGN DETAIL → AI ACTIVITY LOG
├── Timeline of every AI action (Feature #25, #28, #29)
│   ├── "Feb 20, 3:14pm — Paused keyword 'cheap candles' ($47 spent, 0 conv)"
│   ├── "Feb 19, 9am — Added negative keyword 'free candles'"
│   ├── "Feb 18, 2:30pm — Reduced bid on 'candle wholesale'"
│   └── Each: [Undo] [Details] [Why?]
├── Summary: "AI made 23 changes this month. CPA down 15%"
└── Full transparency — user sees EVERYTHING

CAMPAIGN DETAIL → SETTINGS
├── Campaign name
├── Campaign type (cannot change after launch)
├── Conversion tracking status (Feature #31)                     ← F31
│   ├── "✅ Tracking active — 8 conversions detected today"
│   ├── Or: "❌ Tracking broken — [Fix Now]"
│   └── Setup wizard: What counts? → Install code → Verify
├── Campaign-specific automation rules (override global)
└── Archive / Delete campaign


# ─── CREATE NEW CAMPAIGN (5-step wizard) ───
# Features: #1, #2, #3, #4, #5, #9, #60, #95

STEP 1: GOAL (Feature #1, #3)                                   ← F1, F3
├── Pick goal: [More Sales] [More Leads] [More Visitors] [Brand Awareness]
├── OR type freely: "I want delivery orders for my pizza shop"
├── AI picks campaign type: Search/Display/PMax/Shopping/Video   ← F3
└── Industry Templates available: (Feature #95)                  ← F95
    ├── 🍕 Restaurant | 🛒 E-commerce | 🏠 Real Estate | 💻 SaaS
    ├── 🏥 Healthcare | 🎓 Education | ✈️ Travel | 🔧 Local Service
    └── Each: pre-built keywords + ad copy + audience + bidding

STEP 2: PLATFORM (Feature #2, #60)                              ← F2, F60
├── [Google ✅] [Facebook ✅] [TikTok ☐] [Microsoft ☐]
├── AI Platform Recommender (Feature #60):                       ← F60
│   "For pizza shop, $300/month budget:
│   🥇 Google Search (70%) — people searching 'pizza delivery near me'
│   🥈 Facebook (30%) — reach people in your area browsing
│   🥉 TikTok (skip) — your budget is too small for TikTok"
└── [Accept AI Recommendation] [Customize]

STEP 3: AUDIENCE (Feature #9, #10, #11)
├── Option A: Type in English (Feature #9)                       ← F9
│   └── "Women 25-45 who love home decor in London"
├── Option B: Let AI decide (uses business info + v23 NLP)
├── Option C: Upload customer list (Feature #11)                 ← F11
├── Life Events toggle (Feature #10)                             ← F10
│   └── ☐ Getting Married ☐ New Baby ☐ Moving
├── AI shows: "I'll target 2.3 million potential customers"
└── Cross-platform applied automatically (Feature #13)           ← F13

STEP 4: BUDGET (Feature #4, #5)
├── Slider: $10/day ←→ $1,000/day
├── AI prediction: "At $30/day, expect ~12-18 customers/week"
├── Smart Budget Allocator splits across platforms (F4)          ← F4
├── Schedule: "Always" or custom (minute-precision, F5)          ← F5
└── [AI Optimize Budget]

STEP 5: REVIEW & LAUNCH
├── Complete summary:
│   ├── Goal, Platforms, Audience, Budget, Schedule
│   ├── AI-written ads [Preview 5 variations]
│   ├── Ad Performance Predictor scores (Feature #19)            ← F19
│   ├── Ad Compliance Check: "✅ All ads pass" (Feature #23)     ← F23
│   ├── Keywords (Google): [View 40 keywords]
│   ├── Predicted results: "~12-18 customers/week at ~$25-35"
│   ├── Performance Prediction (Feature #93)                     ← F93
│   │   └── "Expected results in 2-3 weeks: 14 customers/week (±4)"
│   └── Safety rules applied
├── [🚀 Launch] [✏️ Edit] [💾 Save Draft]
└── After launch → Campaign Detail


# ─── CAMPAIGN TEMPLATES (Feature #95) ───                      ← F95

LAYOUT:
├── Grid of industry template cards:
│   ├── 🍕 Restaurant: keywords + ads + "delivery near me" targeting
│   ├── 🛒 E-commerce: shopping campaigns + retargeting
│   ├── 🏠 Real Estate: lead gen + location targeting
│   ├── 💻 SaaS: search + demo booking conversion
│   ├── 🏥 Healthcare: local search + appointment booking
│   ├── 🎓 Education: enrollment campaigns
│   ├── ✈️ Travel: seasonal + destination targeting
│   └── 🔧 Local Service: map ads + call campaigns
├── Each template shows: expected results, recommended budget, sample ads
└── [Use This Template] → pre-fills Campaign Creator


# ─── STRATEGY CALENDAR (Feature #77, #92) ───                  ← F77, F92

LAYOUT:
├── Visual monthly calendar view
├── AI pre-populated events:                                     ← F92
│   ├── 🎄 Christmas (Dec 1-25): "Increase budget 50%, gift-focused ads"
│   ├── 💕 Valentine's Day (Feb 1-14): "Candle gift campaigns"
│   ├── 🛍️ Black Friday (Nov 15-30): "Sale campaigns ready"
│   └── Industry-specific events based on user's business
├── Seasonal Auto-Pilot (Feature #77)                            ← F77
│   ├── AI creates campaigns in advance
│   ├── User approves: [Launch on Schedule] [Edit] [Skip]
│   └── Auto-adjusts budget per seasonal demand
├── Active/planned campaigns shown on calendar
├── Budget timeline: when spending ramps up/down
├── Custom events: [+ Add Event] "Store anniversary - March 15"
└── [AI Plan Next 90 Days]



# ═══════════════════════════════════════════════════════════════
# TAB 3: 💡 AI ADVISOR
# Features: #46, #47, #48, #49, #50, #53, #87, #91, #93
# ═══════════════════════════════════════════════════════════════

LEFT PANEL: Chat history (past conversations)

MAIN AREA: Chat interface

TOP QUICK ACTIONS:
├── [How are my ads?]
├── [What's wasting money?]
├── [Create a campaign]
├── [What are competitors doing?]                                ← F49
├── [Research my market]                                         ← F91
├── [Create full strategy]                                       ← F87
├── [Compare this month vs last]
├── [Predict if I change budget]                                 ← F93
├── [Pause everything]
└── [Show opportunities]

CHAT INPUT:
├── [Type your question...                              ]
├── [🎤] Voice Input button (Feature #47)                        ← F47
│   ├── Uses Web Speech API (browser-native)
│   ├── User speaks: "Pause my shoe campaign"
│   ├── AI confirms: "Pausing Shoe Campaign. Confirm?" [Yes] [No]
│   └── Works for: commands, questions, strategy discussions
└── [Send]

AI CAPABILITIES IN CHAT:

1. Performance Questions (Feature #46)                           ← F46
   "How are my ads?" → full summary with metrics
   Expert mode: includes CTR, CPC, ROAS in response

2. Action Commands (via MCP)
   "Pause shoe campaign" → confirms → executes
   "Increase budget by $100" → shows impact → confirms → executes

3. Strategy Sessions (Feature #48)                               ← F48
   "I'm launching a new product, how should I advertise?"
   AI asks questions → builds strategy → presents plan

4. Full Marketing Strategy (Feature #87)                         ← F87
   Quick action: [Create Full Strategy]
   AI outputs structured 90-day plan:
   ├── Platform mix + budget allocation
   ├── Audience strategy
   ├── Creative plan
   ├── Timeline with milestones
   └── [Download Strategy PDF] [Start Implementing]

5. Competitive Intelligence (Feature #49)                        ← F49
   Quick action: [What Are Competitors Doing?]
   AI uses: auction insights + Google Ads Transparency Center + web
   Returns: competitor count, messaging themes, estimated spend
   "3 competitors target 'soy candles'. None mention eco-friendly. Opportunity!"
   [See Their Ads] [AI Write Better Version]

6. Market Research Agent (Feature #50, #91)                      ← F50, F91
   Quick action: [Research My Market]
   AI says: "Deep research mode. Analyzing market, competitors, trends..."
   Progress: Researching... → Analyzing... → Building plan...
   Output: market size, trends, competitor landscape, gaps
   "USA candle market: $4.2B, growing 8%. Underserved: eco-friendly soy."
   [Download Research PDF] [Create Campaign Based on This]

7. Performance Prediction (Feature #93)                          ← F93
   "What happens if I increase budget to $1,000?"
   AI: "Based on 60 days of data:
   Current: 87 customers/week at $26.90
   Predicted at $1,000/week: 99-108 customers at $28-32
   Confidence: 72%. Diminishing returns start around $1,200/week."

8. Daily Briefing Setup (Feature #53)                            ← F53
   "Set up daily briefing"
   AI: "I'll send you a morning summary. When? [8am] Via? [WhatsApp]"
   Content each morning:
   "Good morning! Yesterday: $340 spent, 12 customers, $28 each.
   Overnight: paused 1 keyword, found 2 opportunities.
   Today's priority: Approve new audience. [Open Dashboard]"



# ═══════════════════════════════════════════════════════════════
# TAB 4: 📊 REPORTS
# Sub-nav: Overview | Campaigns | Keywords | Audiences | Platform |
#          Before/After | Shopping | Store Locations | Competitors |
#          Industry Benchmark | Invoices | Profit Calculator |
#          Scheduled | Custom Builder
# Features: #36-45, #89, #24, #42, #43, #61
# ═══════════════════════════════════════════════════════════════

# ─── OVERVIEW REPORT (Feature #40) ───                         ← F40
├── AI executive summary paragraph
├── Key metrics grid (Simple + Expert modes)
├── Trend charts
├── Top campaigns + top keywords tables
├── Audience breakdown
├── Platform comparison
├── AI actions summary + waste prevented
└── [📥 PDF] [📧 Email] [📋 Link]

# ─── CAMPAIGN REPORTS ───
├── Per-campaign deep dive
├── Compare campaigns side-by-side
└── Export per campaign

# ─── KEYWORD REPORTS ───
├── All keywords across all campaigns
├── Top converters, worst performers
├── Search term analysis
├── Negative keyword effectiveness
└── Quality Score trends (Feature #32)                           ← F32

# ─── AUDIENCE REPORTS (Feature #12) ───                        ← F12
├── Audience segment performance comparison
├── Demographics breakdown (age, gender, location)
├── Interest/behavior segment performance
├── Life event targeting results (Feature #10)                   ← F10
└── Audience overlap between platforms

# ─── PLATFORM COMPARISON (Feature #37, #61) ───                ← F37, F61
├── Google vs Meta vs TikTok vs Microsoft side-by-side
├── PMax channel breakdown (Feature #36)                         ← F36
├── Cross-Platform Attribution (Feature #61)                     ← F61
│   ├── Customer journey: "Saw FB ad → Searched Google → Bought"
│   ├── "Facebook assisted 34% of Google conversions"
│   └── Multi-touch attribution model visualization
└── AI recommendation: "Shift 10% from Meta to Google — better ROI"

# ─── BEFORE/AFTER REPORT ───
├── Date joined baseline vs current performance
├── Side-by-side with % change
├── Total money saved
├── Performance trajectory chart
└── [📥 Download PDF] — great for showing boss/clients

# ─── SHOPPING PERFORMANCE (Feature #42) — v23 NEW ───          ← F42
├── Product-level performance metrics
├── Competitive pricing data (v23 ShoppingPerformanceView)
├── Conversion data by conversion date (not click date)
├── Top selling products, worst performers
├── Only visible when Shopping/PMax campaigns active
└── Expert: Benchmark price index, market coverage

# ─── STORE LOCATION ANALYTICS (Feature #43) — v23 NEW ───      ← F43
├── Map view: each store with performance overlay
├── Table: Store | Ad-driven Visits | Cost/Visit | Revenue
├── "London store: 45 visits from ads | Manchester: 23 visits"
├── Uses v23 PerStoreView
├── Only visible when user has physical stores
└── Expert: store conversion rate, visit attribution window

# ─── COMPETITOR INTELLIGENCE (Feature #24, #41, #49) ───       ← F24, F41, F49
├── Competitor Ad Library:
│   ├── Shows competitor ads via Google Ads Transparency Center
│   ├── AI analysis: "Competitor X runs 12 ads, 3 use free shipping"
│   └── [AI Write Better Version]
├── Auction Insights:
│   ├── Who competes with you on same keywords
│   ├── Impression share comparison
│   └── Position above rate
├── Competitor Keyword Overlap:
│   ├── Keywords you share with competitors
│   └── Keywords they target that you don't
├── Click Fraud Report (Feature #33)                             ← F33
│   ├── Suspicious click patterns, geographic anomalies
│   ├── "12 suspicious clicks from same IP range"
│   └── [Block IPs] [Investigate] [Ignore]
└── Industry Benchmarking (Feature #89)                          ← F89
    ├── All your metrics vs industry averages
    ├── Ranking: "You're in top 25% for CPA in your industry"
    └── Expert: detailed metric-by-metric comparison

# ─── BILLING & INVOICES (Feature #38) — v23 NEW ───            ← F38
├── Campaign-level costs with regulatory fees
├── Uses v23 InvoiceService for exact costs
├── Invoice timeline: monthly breakdown
├── Per-campaign cost attribution
├── Regulatory fee breakdown
├── [Download Invoice PDF] [Export to Accounting]
└── Agency: per-client cost breakdowns

# ─── PROFIT CALCULATOR (Feature #39) ───                       ← F39
├── Revenue - Ad Spend - Product Cost = TRUE PROFIT
├── Per-campaign profit view
├── Per-product profit view (if e-commerce connected)
├── Margin trends over time
└── "True ROI" vs "ROAS" comparison

# ─── SCHEDULED REPORTS (Feature #45) ───                       ← F45
├── Active schedules: "Weekly report → every Monday 9am → john@email.com"
├── Create new schedule:
│   ├── Frequency: [Weekly] [Monthly] [Custom]
│   ├── Recipients: email addresses
│   ├── Metrics to include: checkboxes
│   ├── Branding: use agency logo (Feature #64)                  ← F64
│   └── Format: [PDF] [Email body] [Both]
└── Template designer for scheduled reports

# ─── CUSTOM REPORT BUILDER (Feature #44) ───                   ← F44
├── Drag-and-drop metric selector
├── Date range, filters (campaign, platform, audience)
├── Chart type: line, bar, pie, table
├── Save as template
├── Schedule auto-generation
└── Export: PDF, CSV, Excel



# ═══════════════════════════════════════════════════════════════
# TAB 5: 🔔 ALERTS
# Features: #27, #79-86, #53
# ═══════════════════════════════════════════════════════════════

FILTER BAR:
[All] [🔴 Waste] [💡 Opportunity] [📉 Performance] [💰 Budget] [🏴 Competitor] [⚠️ Policy] [⚙️ System] [✅ Resolved]

ALERT TYPES:

🔴 MONEY WASTE (Feature #27, #79)                               ← F27, F79
"Keyword 'free candles' spent $23 today, 0 customers.
Running 5 days with 0 conversions. AI auto-paused it."
[✅ Keep Paused] [↩️ Unpause] [🔍 Data]

💡 OPPORTUNITY (Feature #83)                                     ← F83
"'soy candles gift set' has 2,400 monthly searches, low competition.
Adding could bring ~12 customers/week at $22 each."
[✅ Add] [❌ Skip] [💬 Ask AI]

📉 PERFORMANCE DROP (Feature #80)                                ← F80
"Campaign 'Soy Candles' CTR dropped 35% vs 7-day average.
Possible causes: new competitor, ad fatigue, seasonal dip."
[🔍 Investigate] [AI Fix] [Ignore]

💰 BUDGET WARNING (Feature #81)                                  ← F81
"Monthly budget will run out Feb 22 (6 days early).
Current pace: $45/day vs planned $33/day."
[🟢 Accept early stop] [🟡 Reduce pace] [🔴 Increase budget]

🏴 COMPETITOR ACTIVITY (Feature #82)                             ← F82
"New competitor started bidding on your brand name 'MyCandles'.
They're now showing above you 30% of the time."
[Increase brand bids] [AI Respond] [Monitor]

⚠️ POLICY VIOLATION (Feature #84)                                ← F84
"Google disapproved your ad 'Best Candles Ever'.
Reason: Superlative claim without evidence."
[See Policy] [Edit Ad] [AI Rewrite] [Appeal]

🔧 CONVERSION TRACKING BREAK (Feature #85)                      ← F85
"Conversion tracking stopped at 3:14 PM yesterday.
0 conversions in 24 hours (normally 8-12/day)."
[Check Tracking Code] [Email Instructions] [AI Diagnose]

📊 DAILY AI BRIEFING (Feature #53)                               ← F53
"Good morning! Yesterday: $340 spent, 12 customers, $28 each.
Overnight: paused 1 keyword, found 2 opportunities.
Today: Approve new audience suggestion."
[Open Dashboard] [See Details]

🔴 CLICK FRAUD DETECTED (Feature #33)                           ← F33
"12 suspicious clicks from IP range 45.33.xx.xx.
Pattern: same device, 3-second visits, no conversions."
[Block IPs] [Investigate] [Ignore]

💲 PRICE COMPARISON (Feature #76 — e-commerce)                  ← F76
"Competitor selling 'Lavender Candle' for $18.99 (yours: $24.99).
They appeared 40% more in Shopping results."
[Match Price] [Improve Ad] [Ignore]

🛒 INVENTORY ALERT (Feature #73 — e-commerce)                   ← F73
"'Rose Candle Gift Set' has only 3 left in stock.
Ad has been paused to prevent overselling."
[Restock & Resume] [Keep Paused] [Set Backorder Ad]

MULTI-CHANNEL DELIVERY (Feature #86):                            ← F86
All alerts sent via: In-app + WhatsApp + Slack + Email + SMS + Telegram
(based on user preferences in Settings)



# ═══════════════════════════════════════════════════════════════
# TAB 6: 🧪 A/B TESTS — Feature #18
# Sub-nav: Running | Completed | Create | AI Auto-Tests
# ═══════════════════════════════════════════════════════════════

# ─── RUNNING TESTS (Feature #18) ───                           ← F18
├── Test cards showing variants A vs B:
│   ├── Simple: customers, cost/customer per variant
│   ├── Expert: CTR, CPC, Conv Rate per variant
│   ├── Confidence level: "87% (need 95%)"
│   ├── Time remaining: "4 more days estimated"
│   └── [Stop & Pick Winner] [Let Run] [Details]
├── AI Auto-Tests:
│   ├── AI continuously creates small tests
│   ├── "Testing 3 headline variations on shoe campaign"
│   └── Auto-picks winner when confident
└── [+ Create New Test]

# ─── CREATE TEST ───
├── Select campaign
├── What to test: [Headlines] [Descriptions] [Images] [Audiences] [Landing Pages] [Bidding]
├── AI generates variants OR user writes custom
├── Duration: [7 days] [14 days] [Until significant]
├── Traffic split: [50/50] [70/30] [AI decides]
├── Ad Performance Predictor on each variant (F19)               ← F19
└── [Start Test]

# ─── COMPLETED TESTS ───
├── History of all past tests
├── Results: winner, % improvement, confidence
├── AI: "Switching to winning variant B saved $240/month"
└── [Re-run Similar Test] [Apply Winner to Other Campaigns]



# ═══════════════════════════════════════════════════════════════
# TAB 7: 🛒 E-COMMERCE HUB (NEW TAB)
# Only visible when Shopify/WooCommerce connected
# Features: #71-78
# Sub-nav: Products | Shopping Campaigns | Retargeting |
#          Dynamic Ads | Inventory | Pricing | Seasonal
# ═══════════════════════════════════════════════════════════════

# ─── PRODUCTS (Feature #71) ───                                ← F71
├── Product Feed Sync status:
│   ├── Source: [Shopify ✅] [WooCommerce ☐] [Manual CSV ☐]
│   ├── "234 products synced | Last sync: 2 hours ago"
│   ├── Sync errors: "3 products missing images"
│   └── [Sync Now] [View Errors] [Upload CSV]
├── Product list with ad performance:
│   ├── Product | Price | Stock | Clicks | Sales | CPA | Profit
│   ├── Simple: "Lavender Candle: 23 sales, $12 each to acquire, $8 profit each"
│   └── Expert: + CTR, Conv Rate, Impression Share, Benchmark Price
├── ROAS Optimizer (Feature #74)                                 ← F74
│   ├── Shows TRUE profit per product (not just revenue)
│   ├── Revenue - Ad Cost - Product Cost = Real Profit
│   ├── AI optimizes bids based on MARGIN, not just ROAS
│   └── "Product A: ROAS 4x but only 10% margin. Product B: ROAS 2x but 45% margin.
│        AI is pushing more budget to Product B."
└── [Edit Margins] [Auto-sync from Shopify]

# ─── SHOPPING CAMPAIGNS (Feature #75) ───                      ← F75
├── Auto-created Shopping campaigns from product feed
├── Product group structure (auto-organized by category)
├── Bids per product category (AI-managed by margin)
├── Performance by product group
├── [Create Shopping Campaign] — wizard pre-fills from feed
└── Expert: product partition strategy, custom labels

# ─── RETARGETING (Feature #78) ───                             ← F78
├── Cart Abandonment Retargeting:
│   ├── Setup: Connect store → set retargeting window (1/3/7/14/30 days)
│   ├── AI writes ads: "Still thinking about it? Your candles are waiting!"
│   ├── Works across: Google Display + Meta + TikTok
│   ├── Performance: "Recovered 34 carts this month ($2,100 revenue)"
│   └── [Edit Retargeting Ads] [Change Window] [Pause]
├── Product View Retargeting:
│   ├── Show viewed products to visitors who didn't buy
│   └── Auto-creates dynamic ads from product feed
└── Audience size: "4,200 people in your retargeting pool"

# ─── DYNAMIC PRODUCT ADS (Feature #72) ───                     ← F72
├── Auto-shows viewed products to website visitors
├── Template designer: how product ads look
├── Performance per product
├── Auto-updates when products change
└── [Enable Dynamic Ads] [Customize Template]

# ─── INVENTORY MANAGEMENT (Feature #73) ───                    ← F73
├── Automation Rules:
│   ├── "IF stock < 5 THEN pause ads for this product"
│   ├── "IF stock = 0 THEN pause immediately + alert"
│   ├── "IF new product added THEN create ad automatically"
│   └── "IF price changes THEN update ad automatically"
├── Current inventory status linked to ad status
├── Out-of-stock products: auto-paused with badge
└── [Edit Rules] [Sync Inventory Now]

# ─── PRICING INTELLIGENCE (Feature #76) ───                    ← F76
├── Your prices vs competitor prices (Google Shopping data, v23)
├── "Lavender Candle: You $24.99 | Competitor A $18.99 | Competitor B $22.99"
├── Alert: "You're 25% more expensive than cheapest competitor"
├── Recommendations:
│   ├── [Match Price] [Improve Ad Copy] [Highlight Quality Instead]
│   └── AI: "Instead of matching, emphasize 'handmade' and 'eco-friendly' — your CTR is 2x higher when you do"
└── Expert: Price index, market share by price point

# ─── SEASONAL PLANNER (Feature #77) ───                        ← F77
├── Seasonal Calendar (same as Strategy Calendar but e-commerce focused)
├── AI pre-plans:
│   ├── Black Friday: campaign ready Nov 15, budget +100%
│   ├── Christmas: gift bundles campaign, starts Dec 1
│   ├── Valentine's: "Candle Gift Sets for Her", starts Feb 1
│   └── Custom: "Summer Sale — July"
├── Each event: pre-built campaign, ad copy, audience, budget plan
├── User approves: [Launch on Schedule] [Edit] [Skip]
└── Auto-pilot: AI executes approved plans on schedule



# ═══════════════════════════════════════════════════════════════
# TAB 8: ⚙️ SETTINGS (8 sub-pages)
# Features: #31, #57, #86, #96
# ═══════════════════════════════════════════════════════════════

# ─── 1. ACCOUNT SETTINGS ───
├── Name, Email, Password
├── Business Name, Industry, Website
├── Timezone, Language
├── Product/Service profit margins (for true ROI)                ← F74
├── Physical store addresses (for store analytics)               ← F43
├── Two-factor authentication
└── Delete account + data export

# ─── 2. CONNECTED ACCOUNTS ───
├── Google Ads: ✅ Connected | [Disconnect] [Reconnect]
├── Meta/Facebook Ads: ✅ Connected
├── TikTok Ads: ☐ [Connect]
├── Microsoft/Bing Ads: ☐ [Connect] (Feature #57)               ← F57
├── Google Analytics: ☐ [Connect]
├── Shopify: ☐ [Connect] (Feature #71)                           ← F71
├── WooCommerce: ☐ [Connect]
├── Conversion Tracking Status (Feature #31)                     ← F31
│   ├── "Google: ✅ Active | Meta Pixel: ✅ Active | TikTok: ☐ Not set"
│   └── [Setup Wizard] → What counts as conversion? → Install → Verify
└── Sync status: "Last sync: 2 min ago"

# ─── 3. AUTOMATION RULES ───
├── Global Rules:
│   ├── Daily/monthly budget caps
│   ├── Max CPA
│   ├── Auto-pause: spend > $__ AND conversions = 0 AND days > __
│   ├── Auto-pause campaign: ROI < __ for __ days
│   ├── Emergency stop: daily spend > __x normal
│   ├── AI freedom: [Full Auto] [Semi Auto] [Manual]
│   └── Inventory rules (if e-commerce): stock < __ → pause              ← F73
├── Campaign-specific overrides
├── Custom rule builder:
│   └── IF [metric] [operator] [value] THEN [action]
├── Click Fraud rules (Feature #33):                             ← F33
│   └── Auto-block IPs with > __ clicks and 0 conversions
└── Rule trigger history log

# ─── 4. NOTIFICATION PREFERENCES ───
├── Channels (Feature #86):                                      ← F86
│   ├── Email ✅ | WhatsApp ✅ | Slack ☐ | SMS ☐ | Telegram ☐ | In-app ✅
│   └── WhatsApp bot setup: [Connect WhatsApp] (Feature #51)    ← F51
├── Alert types: toggle Instant / Daily Digest / Off per type
├── Daily AI Briefing (Feature #53):                             ← F53
│   ├── [ON/OFF] Send at: [8:00 AM]
│   └── Via: [WhatsApp ✅] [Email ✅]
├── Weekly report: [Monday 9am]
├── Monthly report: [1st of month]
├── Quiet hours: [10pm - 7am]
└── Frequency cap: max __ per day

# ─── 5. DISPLAY PREFERENCES ───
├── Dashboard Mode: [👶 Simple] [🧠 Expert]
│   ├── Simple: human language only
│   ├── Expert: human language + CTR, CPC, CPA, ROAS, QS, etc.
│   └── Every technical term: hover → plain English tooltip        ← F96
├── AI Glossary Tooltips (Feature #96):                          ← F96
│   ├── Enabled by default in Expert Mode
│   ├── "CTR 4.2% → 4 of 100 viewers click. Industry avg 3.1%. You're above."
│   └── Link to full glossary: [See All Terms]
├── Currency, Number format, Date format
├── Theme: [Dark] [Light] [System]
├── Chart defaults, Date range defaults
└── Dashboard widget reorder / show-hide

# ─── 6. BILLING & SUBSCRIPTION ───
├── Current plan + usage
├── Payment method
├── Invoices history
├── [Upgrade] [Downgrade] [Cancel]
└── Cancel shows value report: "We saved you $1,200 this month"

# ─── 7. TEAM & ACCESS (Agency plan) ───
├── Team members with roles (Feature #69):                       ← F69
│   ├── Owner: full access
│   ├── Manager: campaigns + reports, no billing
│   ├── Analyst: view only
│   └── Client: client portal only
├── [Invite Member]
├── Multi-Account Dashboard (Feature #62):                       ← F62
│   ├── See all client accounts in one view
│   ├── Health score per client
│   └── Alerts aggregated across clients
├── Client Onboarding Wizard (Feature #63):                      ← F63
│   ├── [+ Add New Client] → 5-min setup
│   └── Connect their Google Ads → AI scan → audit → rules → done
├── Client Portal settings (Feature #68):                        ← F68
│   └── What clients see: reports, AI chat, approve/reject
├── White-Label settings (Feature #64):                          ← F64
│   ├── Upload agency logo
│   ├── Custom colors/theme
│   ├── Custom domain (enterprise)
│   └── Report template designer
├── Client Billing (Feature #65, #70):                           ← F65, F70
│   ├── Fee type per client: [% of spend] or [flat fee]
│   ├── Auto-calculate: "$5,000 spend × 15% = $750 fee"
│   ├── v23 InvoiceService for exact campaign costs
│   ├── Generate branded invoices
│   ├── Stripe/PayPal integration for payment
│   ├── Payment tracking dashboard
│   └── Overdue alerts
├── Bulk Operations (Feature #67):                               ← F67
│   └── Settings for bulk action permissions per role
└── Performance Alerts per Client (Feature #66):                 ← F66
    └── Set alert thresholds per client, aggregate dashboard

# ─── 8. API & INTEGRATIONS ───
├── Platform API key (for developers building on us)
├── Webhook URLs for events
├── Zapier integration
├── Google Sheets auto-export
├── CRM: Salesforce, HubSpot integration
├── Slack Bot (Feature #52):                                     ← F52
│   ├── [Connect Slack Workspace]
│   ├── Select channel for alerts: #ad-alerts
│   ├── Bot can: receive alerts, respond to commands,
│   │   show status, approve/reject from Slack
│   └── Commands: /status /pause /report /help
└── Custom webhook builder



# ═══════════════════════════════════════════════════════════════
# SIDEBAR: 📚 LEARNING CENTER — Features #96, #97
# ═══════════════════════════════════════════════════════════════

# ─── AD TERMS GLOSSARY (Feature #96) ───                       ← F96
├── Searchable A-Z glossary of all advertising terms
├── Each term: definition + plain English + example + how it affects you
│   ├── "CPA (Cost Per Acquisition)"
│   ├── "What it means: How much you pay for each new customer"
│   ├── "Example: If you spent $100 and got 4 customers, CPA = $25"
│   ├── "Your CPA: $26.90 (Industry avg: $42.30 — you're doing great)"
│   └── Linked from every tooltip in Expert Mode
├── Categories: Money metrics | Performance metrics | Google terms | Meta terms
└── [Search terms...] [Browse A-Z]

# ─── VIDEO TUTORIALS (Feature #97) ───                         ← F97
├── Short tutorials per feature (30-60 seconds each):
│   ├── "How to read your Dashboard"
│   ├── "How to create a campaign"
│   ├── "Understanding your AI recommendations"
│   ├── "Setting up automation rules"
│   ├── "Reading your A/B test results"
│   └── etc. (one per major feature)
├── Getting Started guide (step-by-step walkthrough)
├── Best Practices library
├── Every screen has [?] button linking to relevant tutorial
└── First-time user: overlay tutorial on each screen



# ═══════════════════════════════════════════════════════════════
# SPECIAL INTERFACES (not tabs — parallel systems)
# ═══════════════════════════════════════════════════════════════

# ─── WHATSAPP BOT (Feature #51) ───                            ← F51
├── Parallel interface (not in webapp)
├── User messages WhatsApp bot
├── Commands: "status" "pause [campaign]" "report" "help" "budget"
├── AI responds with campaign data, charts as images
├── Can approve/reject AI suggestions via WhatsApp
├── Daily briefing delivered here (Feature #53)
└── Same AI brain, different interface

# ─── SLACK BOT (Feature #52) ───                               ← F52
├── Parallel interface (in Slack workspace)
├── /adbot status — current performance
├── /adbot pause [campaign] — pause campaign
├── /adbot report — weekly summary
├── Alert notifications in designated channel
├── Approve/reject with Slack buttons
└── Full integration setup in Settings → API & Integrations

# ─── CLIENT PORTAL (Feature #68) ───                           ← F68
├── Separate login for agency clients
├── Simple dashboard (their campaigns only)
├── Reports (pre-generated by agency)
├── Approve/Reject AI suggestions
├── Chat with AI about their campaigns
├── No access to: other clients, billing, settings
└── Branded with agency logo (Feature #64)                       ← F64

# ─── MOBILE (responsive) ───
All screens responsive. Priority mobile screens:
├── Dashboard (swipeable cards)
├── Alerts (most used on mobile)
├── AI Chat (natural on mobile)
├── Quick actions: Pause/Resume
└── Push notifications



# ═══════════════════════════════════════════════════════════════
# COMPLETE FEATURE → SCREEN MAPPING (ALL 100)
# ═══════════════════════════════════════════════════════════════

F1   One-Click Campaign Creator      → Campaigns > Create (Step 1)
F2   Multi-Platform Launch            → Campaigns > Create (Step 2)
F3   AI Campaign Type Selector        → Campaigns > Create (Step 1, auto)
F4   Smart Budget Allocator           → Campaign Detail > Budget + Create Step 4
F5   Minute-Level Scheduling          → Campaign Detail > Schedule
F6   Campaign Cloning                 → Campaign List [Clone] button
F7   Pause/Resume with Reason         → Campaign Detail > Overview
F8   Campaign Health Score            → Dashboard Row 2 + Campaign Detail
F9   Natural Language Audiences       → Campaign Detail > Audience + Create Step 3
F10  Life Event Targeting             → Campaign Detail > Audience section
F11  Lookalike Audience Builder       → Campaign Detail > Audience [Upload]
F12  Audience Performance Tracker     → Campaign Detail > Audience + Reports > Audience
F13  Cross-Platform Audiences         → Campaign Detail > Audience + Create Step 3
F14  Negative Audience Manager        → Campaign Detail > Audience section
F15  Audience Suggestions             → Campaign Detail > Audience + AI Advisor
F16  AI Ad Copy Writer                → Campaign Detail > Ads [AI Write]
F17  Multi-Language Ad Creator        → Campaign Detail > Ads [Multi-Language]
F18  A/B Test Auto-Runner            → A/B Tests tab (full)
F19  Ad Performance Predictor         → Campaign Detail > Ads + A/B Tests + Create Step 5
F20  Responsive Ad Builder            → Campaign Detail > Ads
F21  Image Ad Generator              → Campaign Detail > Ads [Create Display Image]
F22  Video Ad Script Writer           → Campaign Detail > Ads [Create Video Script]
F23  Ad Compliance Checker            → Auto-runs before any ad submit + Create Step 5
F24  Competitor Ad Analyzer           → Reports > Competitors + AI Advisor
F25  AI Bid Manager                   → Campaign Detail > Budget (runs 24/7)
F26  Budget Optimizer                 → Campaign Detail > Budget (auto-shifts)
F27  Money Waste Detector             → Alerts (waste type) + Dashboard Row 3
F28  Keyword Auto-Pruner             → Campaign Detail > Keywords (auto) + AI Log
F29  Negative Keyword Builder         → Campaign Detail > Keywords > Negatives
F30  Smart Bidding Advisor            → Campaign Detail > Budget section
F31  Conversion Tracking Setup        → Campaign Detail > Settings + Settings > Connected
F32  Quality Score Improver           → Campaign Detail > Keywords + Reports > Keywords
F33  Click Fraud Detection            → Reports > Competitors + Alerts + Settings > Rules
F34  Dayparting Optimizer            → Campaign Detail > Schedule (heatmap)
F35  "Explain Like I'm 5" Dashboard  → Dashboard (entire design philosophy)
F36  PMax Channel Breakdown           → Dashboard Row 5 + Reports > Platform
F37  Cross-Platform Report            → Reports > Platform Comparison
F38  Campaign-Level Invoicing         → Reports > Invoices (v23)
F39  ROI Calculator (profit)          → Dashboard Row 8 + Reports > Profit Calculator
F40  Weekly AI Summary                → Dashboard Row 2 + Notifications
F41  Competitor Benchmarking          → Dashboard Row 9 + Reports > Competitors
F42  Shopping Performance             → Reports > Shopping Performance (v23)
F43  Store Location Analytics         → Reports > Store Locations (v23)
F44  Custom Report Builder            → Reports > Custom Builder
F45  Automated PDF Reports            → Reports > Scheduled Reports
F46  Chat With Your Ads               → AI Advisor (chat interface)
F47  Voice Commands                   → AI Advisor [🎤] button
F48  AI Strategy Sessions             → AI Advisor (strategy conversations)
F49  Competitive Intelligence Bot     → AI Advisor [Competitors] + Reports > Competitors
F50  Multi-Step Research Agent        → AI Advisor [Research] (deep mode)
F51  WhatsApp/Telegram Bot            → Settings > Notifications + WhatsApp interface
F52  Slack Integration                → Settings > API + Slack bot interface
F53  Daily AI Briefing                → Alerts + Settings > Notifications + WhatsApp/Slack
F54  Google Ads (Full)                → Core platform throughout
F55  Meta/Facebook Ads                → Connected Accounts + all features
F56  TikTok Ads                       → Connected Accounts + all features
F57  Microsoft/Bing Ads               → Settings > Connected Accounts
F58  Cross-Platform Sync             → Campaign Detail > Ads + Overview
F59  Unified Budget View              → Dashboard Row 1 + Row 5
F60  Platform Recommender             → Campaigns > Create Step 2 + AI Advisor
F61  Cross-Platform Attribution       → Reports > Platform Comparison
F62  Multi-Account Dashboard          → Settings > Team (agency)
F63  Client Onboarding Wizard         → Settings > Team [Add Client]
F64  White-Label Reports              → Settings > Team > White Label
F65  Client Billing Integration       → Settings > Team > Billing (v23)
F66  Performance Alerts per Client    → Settings > Team + Alerts (filtered)
F67  Bulk Campaign Operations         → Campaign List [Bulk Actions]
F68  Client Portal                    → Special interface (separate login)
F69  Role-Based Access                → Settings > Team (roles/permissions)
F70  Automated Client Billing         → Settings > Team > Billing
F71  Product Feed Sync                → E-Commerce Hub > Products + Settings > Connected
F72  Dynamic Product Ads              → E-Commerce Hub > Dynamic Ads
F73  Inventory-Based Ads              → E-Commerce Hub > Inventory + Settings > Rules
F74  ROAS Optimizer (margin)          → E-Commerce Hub > Products + Dashboard Row 8
F75  Shopping Campaign Builder        → E-Commerce Hub > Shopping Campaigns
F76  Price Comparison Alerts          → E-Commerce Hub > Pricing + Alerts
F77  Seasonal Campaign Auto-Pilot    → E-Commerce Hub > Seasonal + Campaigns > Calendar
F78  Cart Abandonment Retargeting    → E-Commerce Hub > Retargeting
F79  Money Waste Alert                → Alerts (waste type)
F80  Performance Drop Alert           → Alerts (performance type)
F81  Budget Exhaustion Warning        → Alerts (budget type)
F82  Competitor Activity Alert        → Alerts (competitor type)
F83  Opportunity Alert                → Alerts (opportunity type)
F84  Policy Violation Alert           → Alerts (policy type)
F85  Conversion Tracking Break        → Alerts (system type)
F86  Multi-Channel Alerts             → Settings > Notifications (all channels)
F87  AI Marketing Strategist          → AI Advisor [Full Strategy]
F88  3-Option Advisor                 → Campaign Detail > Budget + throughout
F89  Industry Benchmarking            → Dashboard Row 9 + Reports > Competitors
F90  Growth Recommendations           → Campaign Detail > Budget + AI Advisor
F91  Market Research Agent            → AI Advisor [Research My Market]
F92  Ad Strategy Calendar             → Campaigns > Strategy Calendar
F93  Performance Prediction           → AI Advisor + Campaign Detail + Create Step 5
F94  5-Minute Setup Wizard            → Onboarding (5 steps)
F95  Industry Templates               → Campaigns > Templates
F96  AI Glossary Tooltips             → Expert Mode tooltips + Learning Center
F97  Video Tutorials per Feature      → Learning Center + [?] buttons on every screen
F98  Goal-Based Onboarding            → Onboarding Step 3
F99  Free Ad Audit                    → Pre-login Screen 0C
F100 ROI Calculator Tool              → Landing Page widget


# ═══════════════════════════════════════════════════════════════
# FINAL COUNTS
# ═══════════════════════════════════════════════════════════════

FEATURES MAPPED: 100/100 ✅ (ALL COVERED)

MAIN TABS: 8
├── Dashboard
├── Campaigns (+ Templates + Strategy Calendar)
├── AI Advisor
├── Reports (14 sub-pages)
├── Alerts
├── A/B Tests
├── E-Commerce Hub (7 sub-pages)
└── Settings (8 sub-pages)

SIDEBAR: Learning Center + Profile + Support + Connections

TOTAL SCREENS: 58
├── Pre-login: 3
├── Onboarding: 5
├── Dashboard: 1 (9 sections)
├── Campaigns: 13 (list + detail 8 tabs + create wizard + templates + calendar)
├── AI Advisor: 1 (with 10 capabilities)
├── Reports: 14 sub-pages
├── Alerts: 1 (12 alert types)
├── A/B Tests: 4
├── E-Commerce Hub: 7 sub-pages
├── Settings: 8 sub-pages
├── Learning Center: 2 (glossary + tutorials)
└── Special: 3 (WhatsApp + Slack + Client Portal)

PARALLEL INTERFACES: 3
├── WhatsApp Bot
├── Slack Bot
└── Client Portal (agency)

MVP PHASE 1 (Month 1-3): 15 core screens → LAUNCH
PHASE 2 (Month 3-6): +20 screens → Full product
PHASE 3 (Month 6-12): +23 screens → Agency + E-commerce + Advanced

