
# ═══════════════════════════════════════════════════════════════
#  COMPLETE WEBAPP ARCHITECTURE — PLAIN TEXT BLUEPRINT
#  Every Tab, Nav Item, Screen, Flow, Dashboard Element
#  Priority-Based: What User Sees First → Last
# ═══════════════════════════════════════════════════════════════


# ┌─────────────────────────────────────────────────────────────┐
# │                    SYSTEM ARCHITECTURE                       │
# └─────────────────────────────────────────────────────────────┘

TOTAL TABS IN MAIN NAV: 7
TOTAL SCREENS (including sub-pages): 34
TOTAL SETTINGS PAGES: 8

TECH STACK (Recommended):
├── Frontend: Next.js (React) + Tailwind CSS
├── Backend: Node.js + Python (for AI/ML)
├── Database: PostgreSQL (main) + Redis (caching/real-time)
├── AI Layer: Google Gemini API (Interactions API) + custom models
├── Ad APIs: Google Ads API v23 + Meta Marketing API + TikTok Ads API
├── MCP Layer: Google Ads MCP Server + custom MCP servers
├── Auth: OAuth 2.0 (Google, Meta, TikTok)
├── Notifications: WhatsApp Business API + Slack API + Email (SendGrid)
├── Hosting: AWS or Google Cloud
├── Real-time: WebSockets for live dashboard updates
└── Queue: Bull/BullMQ for background AI jobs


# ┌─────────────────────────────────────────────────────────────┐
# │                      MAIN NAVIGATION                        │
# │            (Left sidebar — always visible)                   │
# └─────────────────────────────────────────────────────────────┘

PRIORITY ORDER (top to bottom):

[1] 🏠 Dashboard        ← User lands here FIRST (home)
[2] 📢 Campaigns        ← Create & manage campaigns
[3] 💡 AI Advisor       ← Chat with AI about their ads
[4] 📊 Reports          ← Detailed analytics & exports
[5] 🔔 Alerts           ← All notifications & waste alerts
[6] 🧪 A/B Tests        ← Running experiments
[7] ⚙️ Settings         ← Account, billing, connections, rules

BOTTOM OF SIDEBAR:
├── 👤 Profile / Account
├── 📖 Help & Tutorials
├── 🎧 Support Chat
└── 🔗 Connected Accounts (Google ✅ | Meta ✅ | TikTok ☐)


# ┌─────────────────────────────────────────────────────────────┐
# │              TOP HEADER BAR (always visible)                 │
# └─────────────────────────────────────────────────────────────┘

LEFT:   Logo + Product Name
CENTER: Global Search ("Search campaigns, keywords, reports...")
RIGHT:  [Date Range Picker] [🔔 Notification Bell (count)] [👤 Avatar dropdown]

DATE RANGE PICKER OPTIONS:
├── Today
├── Yesterday
├── Last 7 Days (DEFAULT)
├── Last 30 Days
├── This Month
├── Last Month
├── Last 90 Days
├── Custom Range
└── Compare: [This Period] vs [Previous Period] toggle



# ═══════════════════════════════════════════════════════════════
# ═══════════════════════════════════════════════════════════════
#
#  SCREEN-BY-SCREEN BREAKDOWN
#  (Priority order — what user sees first)
#
# ═══════════════════════════════════════════════════════════════
# ═══════════════════════════════════════════════════════════════


# ──────────────────────────────────────────────────────────────
# PRE-LOGIN SCREENS (before user signs up)
# ──────────────────────────────────────────────────────────────

SCREEN 0A: LANDING PAGE (public website)
├── Hero: "Stop Wasting Money on Ads" + CTA: "Free Ad Audit"
├── 7 Hook Features (from our earlier design)
├── Competitor comparison (our dashboard vs Google Ads dashboard)
├── Pricing section (Free / $49 / $99 / $299)
├── Testimonials / Case studies
├── FAQ
├── Footer: "Free Google Ads Audit — See Your Waste in 60 Seconds"
└── CTA buttons everywhere → lead to Sign Up

SCREEN 0B: SIGN UP / LOGIN
├── "Sign up with Google" (primary — one click)
├── "Sign up with Email" (secondary)
├── Login for existing users
└── After signup → ONBOARDING FLOW

SCREEN 0C: FREE AUDIT PAGE (lead magnet — no signup needed)
├── "Connect Your Google Ads — See Waste in 60 Seconds"
├── [Connect Google Ads] button (OAuth)
├── AI scans → shows waste summary
├── "Want to fix this? Start free trial"
└── This is the #1 user acquisition funnel


# ──────────────────────────────────────────────────────────────
# ONBOARDING FLOW (first-time user, after signup)
# 5 steps, takes 3-5 minutes
# ──────────────────────────────────────────────────────────────

ONBOARDING STEP 1: CONNECT ACCOUNTS
├── "Connect Your Ad Accounts"
├── [Connect Google Ads] ← big primary button (OAuth popup)
├── [Connect Facebook/Instagram Ads] ← secondary
├── [Connect TikTok Ads] ← optional
├── [Skip for now — I'll set up later]
├── Status indicators: ✅ Connected | ⏳ Connecting | ☐ Not connected
└── After connect → AI starts scanning in background (loading animation)

ONBOARDING STEP 2: TELL US ABOUT YOUR BUSINESS
├── "What does your business do?" → text field
│   Example placeholder: "I sell handmade candles online"
├── "What's your industry?" → dropdown
│   Options: E-commerce, Restaurant, Real Estate, SaaS, Local Service,
│            Healthcare, Education, Travel, Agency, Other
├── "What's your website?" → URL field (optional)
└── "What country/region do you serve?" → location picker

ONBOARDING STEP 3: SET YOUR GOAL
├── "What do you want from your ads?"
├── Option cards (pick one):
│   ├── 🛒 "More Sales" — I want people to buy my product
│   ├── 📞 "More Leads" — I want phone calls, form submissions
│   ├── 👥 "More Customers" — I want foot traffic to my store
│   └── 📢 "Brand Awareness" — I want people to know about me
└── AI uses this to configure bidding strategy + campaign type

ONBOARDING STEP 4: SET YOUR BOUNDARIES (automation rules)
├── "Set your safety rules"
├── Monthly budget limit: $______ [slider $100 - $100,000]
├── Maximum cost per customer: $______ [or "Let AI decide"]
├── Auto-pause keywords if: [spend > $__] + [0 conversions] + [for __ days]
├── Alert me via: ☑️ Email  ☑️ WhatsApp  ☐ Slack  ☐ SMS
├── AI freedom level:
│   ├── 🟢 Full Auto — AI handles everything, alerts me weekly
│   ├── 🟡 Semi Auto — AI suggests, I approve big changes (RECOMMENDED)
│   └── 🔴 Manual — AI only suggests, I do everything
└── "You can change these anytime in Settings"

ONBOARDING STEP 5: YOUR ACCOUNT SCAN IS READY
├── If existing account: Show AI audit results
│   ├── "I found X campaigns, Y keywords"
│   ├── "You spent $X last month"
│   ├── "I found $Y being wasted — here's where"
│   ├── [Fix Everything Now] [Show Me Details] [I'll Do It Later]
│   └── → Go to Dashboard
├── If new account (no history):
│   ├── "Let's create your first campaign!"
│   ├── AI pre-builds campaign based on Step 2 & 3 answers
│   ├── "Here's what I've prepared — review and launch"
│   └── → Go to Campaign Creator
└── → DASHBOARD (main app)



# ═══════════════════════════════════════════════════════════════
# TAB 1: 🏠 DASHBOARD (Home — What User Sees Every Day)
# This is the MOST important screen. User lands here.
# ═══════════════════════════════════════════════════════════════

DASHBOARD LAYOUT:

┌─────────────────────────────────────────────────────────────┐
│  TOP ROW: 5 Key Number Cards (the "at a glance" row)        │
├─────────────┬─────────────┬─────────────┬────────┬──────────┤
│ 💰 SPENT    │ 👥 CUSTOMERS│ 🏷️ COST/    │ 📈 REV │ ✅ RETURN│
│ $2,340      │ 87          │ CUSTOMER    │ $8,700 │ $3.72    │
│ this week   │ new this wk │ $26.90      │ earned │ per $1   │
│             │             │             │        │ spent    │
│ ↑12% vs     │ ↑8% vs      │ ↓5% vs      │ ↑15%   │ ↑9%     │
│ last week   │ last week   │ last week ✅ │ vs lw  │ vs lw   │
├─────────────┴─────────────┴─────────────┴────────┴──────────┤
│                                                              │
│  METRIC TRANSLATION BAR (toggle: Simple ↔ Technical)         │
│  When "Technical" ON, each card also shows:                  │
│  Spent=$2,340 | Conv=87 | CPA=$26.90 | Rev=$8,700 |ROAS=3.72│
│  CTR: 4.2% (Click-Through Rate — how many people click)     │
│  CPC: $1.47 (Cost Per Click — what each click costs)        │
│  CPM: $12.30 (Cost Per 1000 Views — what visibility costs)  │
│  Imp Share: 67% (How often your ad shows vs competitors)     │
│                                                              │
│  [Toggle: 👶 Simple Mode | 🧠 Expert Mode]                   │
│  Simple = human language only                                │
│  Expert = human language + technical terms + extra metrics    │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  ROW 2: HEALTH SCORE + AI SUMMARY                            │
├────────────────────────┬─────────────────────────────────────┤
│                        │                                     │
│  HEALTH SCORE          │  AI WEEKLY SUMMARY                  │
│  ┌──────────┐          │  "This week was great. You got 87   │
│  │          │          │  new customers at $26.90 each.      │
│  │   82/100 │          │  That's 12% more than last week     │
│  │  🟢 GOOD │          │  and 5% cheaper per customer.       │
│  │          │          │                                     │
│  └──────────┘          │  ⚠️ 1 issue: 'cheap candles'        │
│                        │  keyword spent $89 with 0 sales.    │
│  Score breakdown:      │  I paused it yesterday.             │
│  • Waste: 9/10        │                                     │
│  • Targeting: 8/10    │  💡 1 opportunity: Adding 'soy       │
│  • Ad Quality: 7/10   │  candles gift' keyword could bring   │
│  • Budget Use: 9/10   │  ~12 more customers/week."          │
│  • ROI: 8/10          │                                     │
│                        │  [See Full Report] [Chat with AI]   │
└────────────────────────┴─────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  ROW 3: ACTIVE ALERTS (needs attention)                      │
│  Only shows if there are pending items                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚠️ AI paused 'cheap candles' — wasting $12/day, 0 sales    │
│     [✅ Good, keep paused] [↩️ Unpause] [🔍 Details]          │
│                                                              │
│  💡 AI found opportunity: new audience "gift shoppers"       │
│     Expected +15 customers/week for $200 more budget         │
│     [✅ Approve] [❌ Skip] [📊 Show me data]                   │
│                                                              │
│  📊 Monthly report ready — "January was your best month"     │
│     [📥 Download PDF] [👁️ View Online]                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  ROW 4: PERFORMANCE CHART                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Customers ▼] [Spend ▼] [Revenue ▼] [Cost/Customer ▼]      │
│                                                              │
│  Line chart showing selected metric over selected date range │
│  With comparison overlay (this period vs previous period)    │
│                                                              │
│  ───────────── Current Period (solid line, green)            │
│  - - - - - - - Previous Period (dotted line, gray)           │
│                                                              │
│  Hover tooltip: "Tuesday Feb 18: 14 customers, $23.40 each" │
│                                                              │
│  Expert Mode adds: CTR line, CPC line, Impression Share line │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  ROW 5: PLATFORM BREAKDOWN                                   │
├────────────────────────┬─────────────────────────────────────┤
│                        │                                     │
│  PIE/DONUT CHART       │  PLATFORM TABLE                     │
│                        │                                     │
│  Google Ads: 62%       │  Platform    Spent  Customers Cost  │
│  Facebook:   28%       │  ─────────── ────── ────────── ──── │
│  TikTok:     10%       │  Google Ads  $1,451  54       $26.87│
│                        │  Facebook     $655   24       $27.29│
│  (color-coded)         │  TikTok       $234    9       $26.00│
│                        │                                     │
│  Expert Mode adds:     │  Expert Mode adds:                  │
│  PMax breakdown:       │  CTR, CPC, Conv Rate per platform   │
│  Search: 40%           │  + PMax channel breakdown (v23 NEW) │
│  YouTube: 12%          │  Search | YouTube | Display | Gmail │
│  Display: 8%           │                                     │
│  Gmail: 2%             │                                     │
│                        │                                     │
└────────────────────────┴─────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  ROW 6: TOP PERFORMERS + WORST PERFORMERS                    │
├────────────────────────┬─────────────────────────────────────┤
│                        │                                     │
│  🏆 TOP 5 CAMPAIGNS    │  ⚠️ NEEDS ATTENTION                 │
│                        │                                     │
│  1. Soy Candles Search │  1. Cheap Candles Display           │
│     87 customers $22ea │     0 customers $89 wasted          │
│     ROI: 4.8x 🟢       │     ROI: 0x 🔴 [PAUSED BY AI]      │
│                        │                                     │
│  2. Gift Set Facebook  │  2. Brand Awareness TikTok          │
│     24 customers $27ea │     3 customers $78ea               │
│     ROI: 3.2x 🟢       │     ROI: 0.8x 🟡 [AI SUGGESTS FIX] │
│                        │                                     │
│  [View All Campaigns]  │  [View All Issues]                  │
│                        │                                     │
└────────────────────────┴─────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  ROW 7: BEFORE vs AFTER (shows after 30+ days)               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 YOUR PROGRESS SINCE JOINING                              │
│                                                              │
│  Before Our Platform → After 60 Days                         │
│  Cost/Customer: $45.20 → $26.90 (↓40%) ✅                    │
│  Monthly Waste: $847 → $120 (↓86%) ✅                         │
│  Conversions/Week: 52 → 87 (↑67%) ✅                          │
│  Total Saved: $4,362 in wasted ad spend                      │
│                                                              │
│  Expert Mode: CPA $45.20→$26.90 | Wasted Spend $847→$120    │
│  CTR 2.1%→4.2% | ROAS 1.8x→3.72x | QS avg 5→7.4            │
│                                                              │
│  [Download Before/After Report PDF]                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘

DASHBOARD TOTAL ELEMENTS: 7 rows, ~25 data points
USER TIME ON DASHBOARD: 30-60 seconds to understand everything



# ═══════════════════════════════════════════════════════════════
# TAB 2: 📢 CAMPAIGNS
# ═══════════════════════════════════════════════════════════════

CAMPAIGNS TAB SUB-NAVIGATION:
├── All Campaigns (list view — DEFAULT)
├── + Create New Campaign
└── Campaign Templates

# ─── SCREEN: ALL CAMPAIGNS ───

┌──────────────────────────────────────────────────────────────┐
│  CAMPAIGNS LIST                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [+ Create Campaign] [Bulk Actions ▼] [Filter ▼] [Search]   │
│                                                              │
│  FILTER OPTIONS:                                             │
│  Platform: [All] [Google] [Meta] [TikTok]                    │
│  Status: [All] [Active] [Paused] [AI Paused] [Draft]        │
│  Performance: [All] [Profitable] [Losing Money] [New]        │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Campaign        Platform  Status  Customers  Cost/ea ROI│ │
│  │ ─────────────── ──────── ─────── ────────── ────── ──── │ │
│  │ Soy Candles     Google   🟢 ON    54        $26.87 4.8x │ │
│  │ Gift Sets       Facebook 🟢 ON    24        $27.29 3.2x │ │
│  │ Brand Video     TikTok   🟡 LOW    3        $78.00 0.8x │ │
│  │ Cheap Candles   Google   🔴 PAUSED  0       $89.00 0.0x │ │
│  │                          (by AI)                         │ │
│  │ Winter Sale     Google   📝 DRAFT  —        —      —    │ │
│  │                                                          │ │
│  │ Expert Mode shows: CTR | CPC | CPA | ROAS | Conv Rate   │ │
│  │ + Impression Share | Quality Score | Budget Used %        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Click any campaign → CAMPAIGN DETAIL PAGE                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘


# ─── SCREEN: CAMPAIGN DETAIL PAGE ───

CAMPAIGN DETAIL TABS:
├── Overview (performance summary)
├── Keywords (all keywords + search terms)
├── Ads (all ad copies + performance)
├── Audience (who sees the ads)
├── Schedule (when ads run)
├── Budget & Bidding
├── AI Activity Log (what AI changed and why)
└── Settings (campaign-specific settings)

CAMPAIGN DETAIL — OVERVIEW:
├── Campaign health score (0-100)
├── Key metrics cards (same format as dashboard, campaign-specific)
├── Performance chart (line graph, date range)
├── AI recommendations for THIS campaign
├── Recent AI actions ("AI paused keyword X on Feb 20")
├── Simple mode: "This campaign brought 54 customers at $26.87 each"
└── Expert mode: adds CTR, CPC, CPA, ROAS, Impression Share, QS

CAMPAIGN DETAIL — KEYWORDS:
├── Keyword list with performance
│   ├── Keyword | Clicks | Cost | Customers | Cost/Customer | Status
│   ├── Simple: "running shoes" → 45 clicks → 8 customers → $12 each ✅
│   └── Expert: + CTR 5.2% | CPC $1.23 | Conv Rate 17.8% | QS 8/10
├── Search Terms tab (what people actually typed)
│   ├── Shows actual searches that triggered ads
│   ├── AI flags irrelevant terms with [Block] button
│   └── AI suggests new keywords with [Add] button
├── Negative Keywords tab
│   ├── AI-added negatives with reason
│   └── User can add manually
└── [+ Add Keywords] [AI Suggest Keywords]

CAMPAIGN DETAIL — ADS:
├── All ad copies with performance
│   ├── Ad headline + description preview
│   ├── Clicks | Customers | Cost/Customer
│   ├── Simple: "Your 'Free Shipping' ad got 32 customers at $18 each — BEST"
│   └── Expert: + CTR | CPC | Conv Rate
├── A/B test status if running
├── AI-generated ads waiting for approval
│   ├── [✅ Approve] [✏️ Edit] [❌ Reject]
│   └── AI explains: "I wrote this because your current ad CTR is below average"
└── [+ Create New Ad] [AI Write Ads For Me]

CAMPAIGN DETAIL — AUDIENCE:
├── Current targeting summary
│   ├── Simple: "Women, 25-45, in USA, interested in home decor & candles"
│   └── Expert: + Affinity segments, In-market segments, Custom audiences
├── Audience performance breakdown
│   ├── Which demographics convert best
│   └── Which interests/behaviors convert best
├── AI suggestions: "Add 'gift shoppers' audience — predicted +15 conversions"
├── [Edit Audience] [AI Build Audience] (uses v23 NLP endpoint)
└── [Type audience in English] → "eco-conscious moms in cities who buy handmade"

CAMPAIGN DETAIL — SCHEDULE:
├── Visual calendar/timeline showing when ads run
├── Heatmap: which hours/days perform best
│   ├── Simple: "Your best time is Tuesday-Thursday, 10am-2pm"
│   └── Expert: hourly performance grid with CTR/Conv Rate per slot
├── AI suggestion: "Stop running ads 11pm-6am — saves $34/week, 0 conversions"
├── [Edit Schedule] (v23 minute-precision datetime picker)
└── [AI Optimize Schedule]

CAMPAIGN DETAIL — BUDGET & BIDDING:
├── Current daily/monthly budget
├── Budget usage: progress bar "62% used this month"
├── Bidding strategy: plain English explanation
│   ├── Simple: "AI is trying to get you the most customers for your budget"
│   └── Expert: "Maximize Conversions with target CPA $25.00"
├── AI recommendation: "Increase budget by $200/mo — expected +12 customers"
│   ├── [🟢 Safe: Keep current] [🟡 Moderate: +$100] [🔴 Aggressive: +$300]
│   └── Each option shows predicted outcome
└── [Change Budget] [Change Bidding Strategy]

CAMPAIGN DETAIL — AI ACTIVITY LOG:
├── Timeline of every AI action on this campaign
│   ├── "Feb 20, 3:14pm — Paused keyword 'cheap candles' (spent $47, 0 conv)"
│   ├── "Feb 19, 9:00am — Added negative keyword 'free candles' (irrelevant)"
│   ├── "Feb 18, 2:30pm — Reduced bid on 'candle wholesale' (low conv rate)"
│   └── Each entry: [Undo] [Details] [Why did AI do this?]
├── Summary stats: "AI made 23 changes this month. Result: CPA down 15%"
└── Full transparency — user sees EVERYTHING AI did


# ─── SCREEN: CREATE NEW CAMPAIGN ───

FLOW (simplified — AI does heavy lifting):

Step 1: GOAL
├── "What do you want?" → [More Sales] [More Leads] [More Visitors] [Brand Awareness]
└── OR type freely: "I want more people to order candles from my website"

Step 2: PLATFORM
├── "Where should we advertise?"
├── [Google ✅] [Facebook/Instagram ✅] [TikTok ☐]
└── AI recommends: "For your business, Google + Facebook works best"

Step 3: AUDIENCE
├── "Who is your customer?"
├── Option A: Type in English → "Women 25-45 who love home decor in USA"
├── Option B: Let AI decide → AI uses v23 NLP endpoint + business info
├── Option C: Upload customer list → AI builds lookalike
└── AI shows: "I'll target 2.3 million potential customers"

Step 4: BUDGET
├── "How much do you want to spend?"
├── Slider: $10/day ←→ $1,000/day
├── AI says: "At $30/day, expect approximately 12-18 customers per week"
└── Split between platforms shown: "Google $20/day | Facebook $10/day"

Step 5: REVIEW & LAUNCH
├── AI shows complete campaign summary:
│   ├── Goal: More sales
│   ├── Platforms: Google Search + Facebook Feed
│   ├── Audience: Women 25-45, home decor interest, USA
│   ├── Budget: $30/day ($900/month)
│   ├── AI-written ads: [Preview 5 variations]
│   ├── Keywords (Google): [View 40 keywords AI selected]
│   ├── Predicted results: "~12-18 customers/week at ~$25-35 each"
│   └── Safety rules: "Auto-pause if keyword spends $50 with 0 conversions"
├── [🚀 Launch Campaign] [✏️ Edit Something] [💾 Save as Draft]
└── After launch → redirect to Campaign Detail page



# ═══════════════════════════════════════════════════════════════
# TAB 3: 💡 AI ADVISOR (Chat Interface)
# ═══════════════════════════════════════════════════════════════

LAYOUT: Chat interface (like ChatGPT/Claude)

LEFT PANEL: Chat history
├── "How are my ads doing?" — Feb 24
├── "Why is my shoe campaign failing?" — Feb 22
├── "Create a Valentine's Day campaign" — Feb 12
└── [+ New Chat]

MAIN AREA: Chat with AI

┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  AI: "Hi! I'm your AI ad manager. I can see all your        │
│  campaigns right now. What would you like to know?"          │
│                                                              │
│  QUICK ACTION BUTTONS (above chat input):                    │
│  [How are my ads?] [What's wasting money?]                   │
│  [Create a campaign] [Show me opportunities]                 │
│  [Compare this month vs last] [Pause everything]             │
│                                                              │
│  USER: "How are my ads doing this week?"                     │
│                                                              │
│  AI: "Great week! Here's your summary:                       │
│                                                              │
│  💰 Spent: $2,340                                            │
│  👥 New Customers: 87 (↑12% vs last week)                    │
│  🏷️ Cost Per Customer: $26.90 (↓5% — improving!)             │
│  📈 Revenue: $8,700                                          │
│  ✅ Return: $3.72 for every $1 spent                         │
│                                                              │
│  🏆 Best performer: 'Soy Candles Search' (54 customers)      │
│  ⚠️ I paused 'cheap candles' — it was wasting $12/day        │
│  💡 Tip: I found a new keyword 'soy candles gift' that       │
│  could bring 12 more customers/week. Want me to add it?"     │
│                                                              │
│  [Yes, add it] [Tell me more] [Not now]                      │
│                                                              │
│  ───────────────────────────────────────────────────────────  │
│  [Type your question...                              ] [Send]│
│                                                              │
│  Expert Mode: AI responses include technical metrics too     │
│  "CTR improved from 3.1% to 4.2%, CPC dropped from          │
│  $1.82 to $1.47, ROAS went from 2.8x to 3.72x"            │
│                                                              │
└──────────────────────────────────────────────────────────────┘

WHAT USER CAN ASK:
├── Performance questions: "How's campaign X doing?"
├── Action requests: "Pause my shoe campaign"
├── Strategy questions: "Should I increase my budget?"
├── Creation requests: "Create a campaign for Valentine's Day"
├── Comparison requests: "Compare January vs December"
├── Research requests: "What are my competitors doing?"
├── Learning requests: "What does Quality Score mean?"
└── Any natural language question about their ads



# ═══════════════════════════════════════════════════════════════
# TAB 4: 📊 REPORTS
# ═══════════════════════════════════════════════════════════════

REPORTS SUB-NAVIGATION:
├── Overview Report (DEFAULT — main summary)
├── Campaign Reports
├── Keyword Reports
├── Audience Reports
├── Platform Comparison
├── Before/After Report
├── Scheduled Reports (auto-generated)
└── Custom Report Builder

# ─── OVERVIEW REPORT ───

SECTIONS:
├── Executive Summary (AI-written paragraph)
│   "January 2026 was your best month. You gained 347 customers
│    at $25.40 each. Revenue was $34,700 on $8,814 ad spend.
│    That's a 3.94x return. AI saved you $2,100 in wasted spend."
├── Key Metrics Grid (same as dashboard but for selected period)
│   ├── Simple mode: Spent, Customers, Cost/Customer, Revenue, Return
│   └── Expert mode: + CTR, CPC, CPA, ROAS, Impressions, Clicks,
│       Conv Rate, Impression Share, Quality Score avg
├── Trend Charts (line/bar)
├── Top Campaigns table
├── Top Keywords table
├── Audience Performance breakdown
├── Platform Comparison (Google vs Meta vs TikTok)
├── AI Actions Summary ("AI made 89 optimizations this month")
├── Waste Prevented ("AI saved $2,100 by pausing bad keywords")
└── [📥 Download PDF] [📧 Email to me] [📋 Copy Link]

# ─── BEFORE/AFTER REPORT ───

LAYOUT:
├── Date joined: [date]
├── Before metrics (from historical data when they joined)
├── After metrics (current period)
├── Side-by-side comparison with % change
├── AI narrative: "Since joining, your cost per customer dropped 40%..."
├── Total money saved calculation
├── Chart: performance trajectory since joining
└── [📥 Download PDF] — great for user to show their boss

# ─── CUSTOM REPORT BUILDER ───

FEATURES:
├── Drag-and-drop metric selector
├── Date range picker
├── Filter by campaign, platform, audience
├── Chart type selector (line, bar, pie, table)
├── Save as template
├── Schedule auto-generation (weekly, monthly)
└── Export: PDF, CSV, Excel



# ═══════════════════════════════════════════════════════════════
# TAB 5: 🔔 ALERTS
# ═══════════════════════════════════════════════════════════════

ALERTS SUB-NAVIGATION:
├── All Alerts (DEFAULT)
├── Money Waste Alerts 🔴
├── Opportunity Alerts 💡
├── System Alerts ⚙️
└── Alert History

# ─── ALL ALERTS ───

LAYOUT:
├── Unread alerts at top (highlighted)
├── Filter: [All] [Waste 🔴] [Opportunities 💡] [System ⚙️] [Resolved ✅]
├── Each alert card:
│   ├── Icon + Type + Timestamp
│   ├── Plain English description
│   ├── Data supporting the alert
│   ├── Action buttons: [✅ Approve Fix] [❌ Dismiss] [🔍 Details]
│   └── AI explanation: "Why I flagged this"
└── Alert preferences link → Settings

EXAMPLE ALERTS:

🔴 MONEY WASTE — 2 hours ago
"Keyword 'free candles' spent $23 today with 0 customers.
It's been running for 5 days with 0 conversions.
AI auto-paused it per your rules."
[✅ Good, keep paused] [↩️ Unpause] [🔍 See data]

💡 OPPORTUNITY — 5 hours ago
"AI found that 'soy candles gift set' has high search volume
(2,400/month) and low competition. Adding it could bring
~12 more customers/week at estimated $22 each."
[✅ Add keyword] [❌ Skip] [💬 Ask AI more]

⚠️ BUDGET WARNING — 1 day ago
"At current pace, your monthly budget will run out by February 22
(6 days early). Options:"
[🟢 Keep pace, accept early stop]
[🟡 Reduce daily spend to last full month]
[🔴 Increase monthly budget by $200]

⚙️ SYSTEM — 2 days ago
"Your conversion tracking on www.mycandles.com stopped
working at 3:14 PM yesterday. We detected 0 conversions
in 24 hours (normally you get 8-12/day).
[🔧 Check tracking code] [📧 Email me instructions]



# ═══════════════════════════════════════════════════════════════
# TAB 6: 🧪 A/B TESTS
# ═══════════════════════════════════════════════════════════════

A/B TESTS SUB-NAVIGATION:
├── Running Tests (DEFAULT)
├── Completed Tests
├── Create New Test
└── AI Auto-Tests

# ─── RUNNING TESTS ───

LAYOUT:
├── Active test cards:
│   ├── Test name: "Headline Test — Soy Candles Campaign"
│   ├── Status: Running (Day 5 of 14)
│   ├── Variant A: "Handmade Soy Candles — Free Shipping"
│   │   ├── Simple: 34 customers, $24.50 each
│   │   └── Expert: CTR 4.8%, CPC $1.21, Conv Rate 5.2%
│   ├── Variant B: "Premium Soy Candles — 20% Off First Order"
│   │   ├── Simple: 41 customers, $21.30 each ← WINNING
│   │   └── Expert: CTR 5.6%, CPC $1.08, Conv Rate 6.1%
│   ├── Confidence level: 87% (need 95% to declare winner)
│   ├── Estimated time to conclusion: 4 more days
│   └── [Stop Test & Pick Winner] [Let It Run] [View Details]
├── AI Auto-Tests:
│   ├── AI continuously creates small tests
│   ├── "AI is testing 3 headline variations on your shoe campaign"
│   └── Results shown when test completes
└── [+ Create New A/B Test]

# ─── CREATE NEW TEST ───

FLOW:
├── Select campaign to test
├── What to test: [Headlines] [Descriptions] [Images] [Audiences] [Landing Pages]
├── AI generates variants automatically OR user writes custom
├── Test duration: [7 days] [14 days] [Until significant] (recommended)
├── Traffic split: [50/50] [70/30] [AI decides]
└── [Start Test]



# ═══════════════════════════════════════════════════════════════
# TAB 7: ⚙️ SETTINGS
# ═══════════════════════════════════════════════════════════════

SETTINGS SUB-NAVIGATION:
├── 1. Account Settings
├── 2. Connected Accounts
├── 3. Automation Rules
├── 4. Notification Preferences
├── 5. Display Preferences
├── 6. Billing & Subscription
├── 7. Team & Access (Agency plan)
├── 8. API & Integrations (Agency/Enterprise)

# ─── 1. ACCOUNT SETTINGS ───
├── Name, Email, Password
├── Business Name, Industry, Website
├── Timezone
├── Language preference
├── Two-factor authentication
└── Delete account

# ─── 2. CONNECTED ACCOUNTS ───
├── Google Ads: ✅ Connected (account: xxx-xxx-xxxx)
│   ├── [Disconnect] [Reconnect] [View permissions]
│   └── Last synced: 2 minutes ago
├── Meta/Facebook Ads: ✅ Connected
│   ├── [Disconnect] [Reconnect]
│   └── Last synced: 5 minutes ago
├── TikTok Ads: ☐ Not connected
│   └── [Connect TikTok Ads]
├── Google Analytics: ☐ Not connected
│   └── [Connect Google Analytics] (for better conversion tracking)
└── Shopify / WooCommerce: ☐ Not connected
    └── [Connect Store] (for revenue data)

# ─── 3. AUTOMATION RULES ───
├── Global Rules (apply to all campaigns):
│   ├── Daily budget cap: $______
│   ├── Monthly budget cap: $______
│   ├── Max cost per customer: $______
│   ├── Auto-pause keyword if: spend > $__ AND conversions = 0 AND days > __
│   ├── Auto-pause campaign if: ROI < __ for __ days
│   ├── Emergency stop if: daily spend > __x normal
│   └── AI freedom level: [Full Auto] [Semi Auto] [Manual Only]
├── Campaign-specific rules (override global for specific campaigns)
├── Custom rules builder:
│   ├── IF [metric] [operator] [value] THEN [action]
│   ├── Example: IF CPA > $50 for 3 days THEN pause AND alert me
│   └── Example: IF budget used > 80% by day 20 THEN reduce daily spend
└── Rule history: log of every time a rule was triggered

# ─── 4. NOTIFICATION PREFERENCES ───
├── Channels:
│   ├── Email: ✅ ON → [email address]
│   ├── WhatsApp: ✅ ON → [phone number] 
│   ├── Slack: ☐ OFF → [Connect Slack]
│   ├── SMS: ☐ OFF → [phone number]
│   ├── Telegram: ☐ OFF → [Connect Telegram]
│   └── In-app: ✅ Always ON
├── What to notify:
│   ├── 🔴 Money waste alerts: [Instant] [Daily digest] [Off]
│   ├── 💡 Opportunities: [Instant] [Daily digest] [Off]
│   ├── ⚠️ Budget warnings: [Instant] [Off]
│   ├── 📊 Weekly report: [Monday 9am] [Custom day/time] [Off]
│   ├── 📊 Monthly report: [1st of month] [Off]
│   ├── ⚙️ System alerts: [Instant] [Off]
│   └── 🧪 A/B test results: [When complete] [Off]
├── Quiet hours: Don't notify between [10pm] and [7am]
└── Frequency cap: Max [5] notifications per day (except emergencies)

# ─── 5. DISPLAY PREFERENCES ───
├── Dashboard Mode: [👶 Simple Mode] [🧠 Expert Mode] ← THIS IS KEY
│   ├── Simple Mode:
│   │   Shows: Spent, Customers, Cost/Customer, Revenue, Return
│   │   Hides: CTR, CPC, CPM, CPA, ROAS, QS, Impression Share
│   │   Language: "You got 23 customers at $26 each"
│   │
│   └── Expert Mode:
│       Shows: ALL metrics — both simple AND technical
│       Every metric shows BOTH versions:
│       "87 new customers ($26.90 each)" ← simple
│       "CPA: $26.90 | CTR: 4.2% | CPC: $1.47 | ROAS: 3.72x" ← technical
│       Hover any technical term → tooltip explains in plain English
│       "CTR 4.2% → 4 out of every 100 people who see your ad click on it"
│
├── Currency: [USD $] [EUR €] [GBP £] [BDT ৳] [Custom]
├── Number format: [1,234.56] [1.234,56]
├── Date format: [MM/DD/YYYY] [DD/MM/YYYY] [YYYY-MM-DD]
├── Theme: [Dark] [Light] [System]
├── Charts default: [Line] [Bar]
├── Default date range: [Last 7 Days] [Last 30 Days] [This Month]
└── Dashboard widgets: [Reorder] [Show/Hide specific sections]

# ─── 6. BILLING & SUBSCRIPTION ───
├── Current plan: Growth — $99/month
├── Billing cycle: Monthly / Annual (save 20%)
├── Payment method: Visa ending 4242
├── Invoices: downloadable list
├── Usage stats: X campaigns, Y API calls
├── [Upgrade Plan] [Downgrade] [Cancel Subscription]
└── Cancel flow: shows value report first ("We saved you $1,200 this month")

# ─── 7. TEAM & ACCESS (Agency plan) ───
├── Team members:
│   ├── Owner: you@email.com — Full access
│   ├── Manager: john@email.com — Manage campaigns, no billing
│   ├── Analyst: sara@email.com — View only, reports
│   └── Client: client@email.com — Client portal only
├── [Invite Team Member]
├── Roles & Permissions matrix
├── Client accounts list (for agencies)
│   ├── Client 1: Candle Shop — $500/mo spend — 🟢 Active
│   ├── Client 2: Pizza Palace — $1,200/mo spend — 🟢 Active
│   └── [+ Add Client Account]
└── White-label settings: Upload logo, custom colors

# ─── 8. API & INTEGRATIONS (Agency/Enterprise) ───
├── API key for our platform (if they want to build on us)
├── Webhook URLs for events
├── Zapier integration
├── Google Sheets integration (auto-export data)
├── CRM integrations: Salesforce, HubSpot
└── Custom webhook builder



# ═══════════════════════════════════════════════════════════════
# SPECIAL SCREENS
# ═══════════════════════════════════════════════════════════════

# ─── CLIENT PORTAL (what agency clients see) ───
SEPARATE LOGIN for agency clients
├── Simple dashboard (their campaigns only)
├── Reports (pre-generated by agency)
├── Approve/Reject AI suggestions
├── Chat with AI about their campaigns
├── No access to: other clients, billing, settings
└── Branded with agency's logo (white-label)

# ─── MOBILE RESPONSIVE ───
ALL screens responsive, but priority mobile screens:
├── Dashboard (condensed, swipeable cards)
├── Alerts (most used on mobile)
├── AI Chat (natural on mobile)
├── Quick actions: Pause/Resume campaigns
└── Push notifications for alerts

# ─── WHATSAPP BOT INTERFACE ───
Not a screen in webapp, but a parallel interface:
├── User sends message to WhatsApp bot
├── Bot responds with campaign data
├── User can: ask questions, pause campaigns, get reports
├── Commands: "status" "pause [campaign]" "report" "help"
└── Same AI brain, different interface



# ═══════════════════════════════════════════════════════════════
# COMPLETE SCREEN COUNT
# ═══════════════════════════════════════════════════════════════

PRE-LOGIN:
  1. Landing Page
  2. Sign Up / Login
  3. Free Audit Page

ONBOARDING:
  4. Connect Accounts
  5. Business Info
  6. Set Goal
  7. Set Boundaries
  8. Scan Results

MAIN APP — TAB 1 DASHBOARD:
  9. Main Dashboard (7 sections)

MAIN APP — TAB 2 CAMPAIGNS:
  10. All Campaigns List
  11. Campaign Detail — Overview
  12. Campaign Detail — Keywords
  13. Campaign Detail — Ads
  14. Campaign Detail — Audience
  15. Campaign Detail — Schedule
  16. Campaign Detail — Budget & Bidding
  17. Campaign Detail — AI Activity Log
  18. Campaign Detail — Settings
  19. Create New Campaign (5-step wizard)
  20. Campaign Templates

MAIN APP — TAB 3 AI ADVISOR:
  21. AI Chat Interface

MAIN APP — TAB 4 REPORTS:
  22. Overview Report
  23. Campaign Reports
  24. Keyword Reports
  25. Audience Reports
  26. Platform Comparison
  27. Before/After Report
  28. Custom Report Builder

MAIN APP — TAB 5 ALERTS:
  29. All Alerts

MAIN APP — TAB 6 A/B TESTS:
  30. Running Tests
  31. Completed Tests
  32. Create New Test

MAIN APP — TAB 7 SETTINGS:
  33. Account Settings
  34. Connected Accounts
  35. Automation Rules
  36. Notification Preferences
  37. Display Preferences
  38. Billing & Subscription
  39. Team & Access
  40. API & Integrations

SPECIAL:
  41. Client Portal (agency)
  42. WhatsApp Bot (external)

TOTAL: 42 screens

─────────────────────────────────────────────────────────────

MVP PRIORITY (build these FIRST — launch with 12 screens):

PHASE 1 — Launch (Month 1-3): 12 screens
  ✅ Landing Page
  ✅ Sign Up / Login
  ✅ Onboarding (condensed to 3 steps)
  ✅ Dashboard (simplified — 4 sections)
  ✅ Campaign List
  ✅ Campaign Detail (overview + keywords only)
  ✅ Create Campaign (AI-powered wizard)
  ✅ AI Chat
  ✅ Alerts
  ✅ Basic Settings (account + connected + notifications)
  ✅ Reports (overview only)
  ✅ Free Audit Page

PHASE 2 — Growth (Month 3-6): +12 screens
  ✅ Full Campaign Detail (all sub-tabs)
  ✅ Campaign Templates
  ✅ A/B Tests
  ✅ Custom Report Builder
  ✅ Before/After Report
  ✅ Advanced Automation Rules
  ✅ WhatsApp Bot
  ✅ Expert Mode toggle
  ✅ Billing & Subscription
  ✅ Platform Comparison report
  ✅ Audience Reports
  ✅ Keyword Reports

PHASE 3 — Scale (Month 6-12): +18 screens
  ✅ Agency features (multi-client dashboard)
  ✅ Client Portal
  ✅ White-label settings
  ✅ Team & Access management
  ✅ API & Integrations
  ✅ CRM integrations
  ✅ Slack bot
  ✅ TikTok integration
  ✅ Mobile optimization pass
  ✅ All remaining screens



# ═══════════════════════════════════════════════════════════════
# THE SIMPLE vs EXPERT MODE — KEY DESIGN DECISION
# ═══════════════════════════════════════════════════════════════

Every metric on every screen has TWO displays:

SIMPLE MODE (default for new users):
┌─────────────────────────────────┐
│  👥 23 New Customers This Week  │
│  🏷️ Each One Cost You $26.90    │
│  📈 You Made $2,300 Back        │
│  ✅ $4.60 Return Per $1 Spent   │
└─────────────────────────────────┘

EXPERT MODE (toggle in header or settings):
┌─────────────────────────────────────────────────────────┐
│  👥 23 New Customers This Week                          │
│     CPA: $26.90 (Cost Per Acquisition)                  │
│     Conversions: 23 | Conv. Rate: 4.1%                  │
│                                                          │
│  📈 You Made $2,300 Back                                │
│     ROAS: 3.72x (Return On Ad Spend)                    │
│     Revenue: $2,300 | Spend: $618                        │
│                                                          │
│  📊 Additional Metrics:                                  │
│     CTR: 4.2% (Click Rate — 4 of 100 viewers click)     │
│     CPC: $1.47 (Cost Per Click)                          │
│     CPM: $12.30 (Cost Per 1,000 Views)                   │
│     Impressions: 14,847 (Times Your Ad Was Shown)        │
│     Clicks: 624 (People Who Clicked)                     │
│     Quality Score: 7/10 (Google's Rating Of Your Ad)     │
│     Impression Share: 67% (You Show 67% Of The Time)     │
│                                                          │
│  HOVER ANY TERM → tooltip explains in plain English      │
│  "CTR 4.2% means 4 out of every 100 people who see      │
│   your ad actually click on it. Industry avg is 3.1%,    │
│   so you're doing better than most."                     │
└─────────────────────────────────────────────────────────┘

This way:
- Beginners see simple mode and aren't overwhelmed
- As they learn, they switch to expert mode
- Expert mode still uses simple language ALONGSIDE technical terms
- Every technical term has a hover tooltip explaining it
- Users gradually learn CTR, CPC, ROAS naturally
- They can talk to other marketers using correct terminology
- They feel like they're getting SMARTER using our product

THIS is the competitive advantage:
- Google Ads: Expert only, no explanation
- Competitors: Expert only, no explanation  
- Us: Simple by default, expert available, ALWAYS with explanations



# ═══════════════════════════════════════════════════════════════
# DATA FLOW — HOW INFORMATION MOVES
# ═══════════════════════════════════════════════════════════════

USER → connects Google Ads (OAuth)
  ↓
PLATFORM → receives OAuth token
  ↓
SYNC SERVICE → pulls all data from Google Ads API v23
  ├── Campaigns, Ad Groups, Keywords, Ads
  ├── Performance metrics (last 11 years available)
  ├── Search terms, Audience data
  ├── Change history (2 years)
  ├── Billing/Invoice data (v23)
  └── Stores to PostgreSQL database
  ↓
AI ENGINE → analyzes data
  ├── Identifies waste (rules-based)
  ├── Finds opportunities (ML-based)
  ├── Generates recommendations
  ├── Writes ad copy (Gemini API)
  ├── Builds audiences (v23 NLP endpoint)
  └── Creates reports (plain English)
  ↓
DASHBOARD → shows results to user
  ├── Simple mode (default)
  ├── Expert mode (toggle)
  └── Real-time updates (WebSocket)
  ↓
ALERT SYSTEM → sends notifications
  ├── In-app alerts
  ├── WhatsApp (Business API)
  ├── Email (SendGrid)
  ├── Slack (API)
  └── SMS (Twilio)
  ↓
USER → approves/rejects AI suggestions
  ↓
EXECUTION ENGINE → makes changes via API
  ├── Google Ads API → update campaigns
  ├── Meta Marketing API → update campaigns
  ├── TikTok Ads API → update campaigns
  └── All changes logged with user approval ID
  ↓
MONITORING → continuous 24/7 loop
  ├── Check every 15 minutes
  ├── Compare against rules
  ├── Auto-act within boundaries
  ├── Alert if outside boundaries
  └── Loop back to AI ENGINE

SYNC FREQUENCY:
├── Full sync: Every 4 hours
├── Performance data: Every 1 hour
├── Real-time alerts: Every 15 minutes
├── Conversion data: Every 30 minutes (Google delay is ~3 hours)
└── Historical data: On first connect + daily incremental

