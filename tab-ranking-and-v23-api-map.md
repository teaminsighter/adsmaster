
# ═══════════════════════════════════════════════════════════════
#  TAB IMPORTANCE RANKING + GOOGLE ADS API v23 COMPLETE MAP
#  Which tabs matter most + where every v23 feature lives
# ═══════════════════════════════════════════════════════════════


# ┌─────────────────────────────────────────────────────────────┐
# │  PART 1: TAB IMPORTANCE RANKING                             │
# │  Based on: User frequency, revenue impact, retention power  │
# └─────────────────────────────────────────────────────────────┘


# ═══════════════════════════════════════════════════════════════
# RANK 1: 🏠 DASHBOARD (HOME) — THE KING
# Importance: ██████████ 10/10
# ═══════════════════════════════════════════════════════════════

WHY IT'S #1:
├── Every user visits EVERY session (100% visit rate)
├── First impression = decides if they keep using product
├── 60-second health check replaces 30 minutes of manual checking
├── If dashboard is weak, user opens Google Ads UI instead → we lose them
├── Contains ALL key decisions (approve/reject AI actions)
├── Before/After widget PROVES our value → prevents churn
├── Health Score creates emotional attachment (gamification)
└── This single screen justifies the $99/month subscription

REVENUE IMPACT: Direct — if dashboard doesn't impress, user cancels
RETENTION POWER: #1 — this is what users PAY for
USER FREQUENCY: Daily (5-7x per week)

v23 API FEATURES USED: 5 of 8 (most of any tab)
├── PMax Network Breakdown (Dashboard Widget 5)
├── ShoppingPerformanceView competitive metrics (Widget 6, Expert Mode)
├── InvoiceService campaign-level costs (links to Reports)
├── PerStoreView (Widget 10 — Audience Insights by location)
└── Asset group engagement metrics (Widget 7 — ad performance)

FEATURES ON THIS TAB: 15 widgets, 52 metrics, 10,000+ view combinations
MOAT: No competitor has Simple↔Expert toggle with BOTH human + technical language


# ═══════════════════════════════════════════════════════════════
# RANK 2: 📢 CAMPAIGNS — THE MONEY MAKER
# Importance: █████████░ 9/10
# ═══════════════════════════════════════════════════════════════

WHY IT'S #2:
├── This is where money gets SPENT — every dollar flows through here
├── Campaign Creator is the "agency replacement" feature ($2,000/mo saved)
├── If creating campaigns is hard, user goes to agency → we lose them
├── AI writing ads + keywords + audiences = core product value
├── Campaign Detail page is where expert users spend most time
├── Clone, bulk actions, templates = efficiency for power users
├── Strategy Calendar = proactive management (not reactive)
└── This tab does what an agency does — but for $99/month

REVENUE IMPACT: Direct — campaigns spend money, better campaigns = happier users
RETENTION POWER: #2 — this is what REPLACES their agency
USER FREQUENCY: 2-3x per week (create, review, optimize)

v23 API FEATURES USED: 6 of 8 (highest)
├── AudienceInsightsService.GenerateAudienceDefinition (Audience sub-tab)
│   └── THE killer v23 feature — type English, get structured audience
├── LIFE_EVENT_USER_INTEREST dimension (Audience sub-tab)
│   └── Target: getting married, new baby, moving, graduating
├── Campaign.start_date_time / end_date_time (Schedule sub-tab)
│   └── Minute-precision scheduling for flash sales, events
├── PMax ad_network_type breakdown (Campaign Detail overview, Expert Mode)
│   └── See which PMax channel drives results per campaign
├── Asset group metrics: engagement, engagement_rate, avg CPE (Ads sub-tab)
│   └── New metrics for measuring creative performance
└── AssetGenerationService (v22, still core) for AI ad copy

FEATURES ON THIS TAB: 32 features mapped here (most of any tab)
MOAT: NLP audience builder + minute scheduling + campaign cloning — nobody has all 3


# ═══════════════════════════════════════════════════════════════
# RANK 3: 🔔 ALERTS — THE TRUST BUILDER
# Importance: ████████░░ 8/10
# ═══════════════════════════════════════════════════════════════

WHY IT'S #3:
├── THIS is what prevents the "I woke up and $500 was gone" nightmare
├── Waste alerts = immediate money saved = immediate value proof
├── Without alerts, users feel AI is a black box → they don't trust it
├── Every alert is an opportunity to PROVE AI is working for them
├── "AI saved you $47 today" notification = daily value reminder
├── Alerts drive user BACK to app (re-engagement)
├── Multi-channel delivery (WhatsApp, Slack) = always connected
├── Emergency alerts prevent disasters → trust → retention
└── The #1 reason users stay: "I feel safe because AI watches 24/7"

REVENUE IMPACT: Indirect but critical — alerts prevent churn
RETENTION POWER: #1 for RETENTION (even more than dashboard)
USER FREQUENCY: Triggered 3-10x per day (push notifications)

v23 API FEATURES USED: 3 of 8
├── ShoppingPerformanceView competitive metrics
│   └── Powers: Price Comparison Alerts ("Competitor is $5 cheaper")
│   └── Powers: Competitive position alerts ("Lost impression share")
├── PMax network breakdown
│   └── Powers: "Your PMax YouTube spend jumped 300% overnight" alert
└── PerStoreView
    └── Powers: "London store visits dropped 40% this week" alert

FEATURES ON THIS TAB: 12 alert types covering every scenario
MOAT: Real-time multi-channel alerts + AI auto-fix — nobody does both


# ═══════════════════════════════════════════════════════════════
# RANK 4: 💡 AI ADVISOR — THE DIFFERENTIATOR
# Importance: ████████░░ 8/10
# ═══════════════════════════════════════════════════════════════

WHY IT'S #4:
├── THIS is what no competitor has — talk to your ads in English
├── Replaces agency ACCOUNT MANAGER (the person you call when confused)
├── Non-technical users can manage ads WITHOUT learning any tools
├── "How are my ads?" → instant answer → user feels in control
├── Voice commands = manage ads while driving, cooking, walking
├── Deep Research mode = market intelligence without hiring analyst
├── Strategy sessions replace $5,000 consulting engagements
├── WhatsApp integration = manage from anywhere (huge in Asia/ME/Africa)
└── This is the MCP competitive advantage — built on conversational AI

REVENUE IMPACT: Key differentiator — this is WHY they choose us over alternatives
RETENTION POWER: High — creates dependency ("I just ask AI")
USER FREQUENCY: 1-3x per week (questions, commands, strategy)

v23 API FEATURES USED: 3 of 8
├── AudienceInsightsService.GenerateAudienceDefinition
│   └── User says "target eco moms in cities" → AI calls endpoint → creates audience
├── PMax network breakdown
│   └── AI can say "Your PMax is spending 60% on YouTube and 30% on Search"
└── ReachPlanService.GenerateConversionRates (Demand Gen surface insights)
    └── AI can predict: "Gmail will convert at 2.3%, Shorts at 1.8%"

FEATURES ON THIS TAB: 10 AI capabilities
MOAT: Conversational ad management via MCP — literally no consumer product exists


# ═══════════════════════════════════════════════════════════════
# RANK 5: 📊 REPORTS — THE VALUE PROOF
# Importance: ███████░░░ 7/10
# ═══════════════════════════════════════════════════════════════

WHY IT'S #5:
├── Before/After report is THE churn prevention tool
│   └── User considers canceling → sees "We saved you $4,362" → stays
├── Agencies NEED reports to justify their fees to clients
├── Custom Report Builder = power tool for data-driven users
├── Scheduled reports = passive value delivery (report shows up weekly)
├── Industry benchmarks make user feel smart ("I'm 37% better than average")
├── Competitor Intelligence gives strategic advantage
├── Profit Calculator shows TRUE ROI (not just ROAS)
└── Reports are what users SCREENSHOT and show to their boss/team

REVENUE IMPACT: Retention + agency upsell
RETENTION POWER: High for agencies, medium for small business
USER FREQUENCY: Weekly/Monthly (1-4x per month)

v23 API FEATURES USED: 7 of 8 (tied with Campaigns for most)
├── PMax ad_network_type breakdown
│   └── Platform Comparison report: Search vs YouTube vs Display vs Gmail vs Maps
│   └── THIS DATA WAS IMPOSSIBLE BEFORE v23 — we're first to show it
├── InvoiceService.ListInvoices (include_granular_level_invoice_details)
│   └── Billing & Invoices page: campaign-level costs + regulatory fees
│   └── Agency billing: exact per-client cost attribution
├── ShoppingPerformanceView (competitive metrics)
│   └── Shopping Performance report: competitive impression share
│   └── search_budget_lost_impression_share → "You lost 15% of views due to budget"
│   └── search_rank_lost_impression_share → "You lost 12% due to low bids"
│   └── Conversion metrics by conversion DATE (not click date) → accurate ROAS
├── PerStoreView
│   └── Store Location Analytics: per-store impressions, clicks, conversions
│   └── Map view with performance overlay per location
├── LIFE_EVENT_USER_INTEREST
│   └── Audience Reports: how life-event audiences perform
├── ReachPlanService.GenerateConversionRates (surface-level)
│   └── Demand Gen report: Gmail vs Shorts vs Discover conversion prediction
└── Asset group engagement metrics
    └── Creative performance report: engagement rate, avg CPE per asset

FEATURES ON THIS TAB: 14 sub-pages of reports
MOAT: PMax channel breakdown + Shopping competitive metrics + true profit = unique combo


# ═══════════════════════════════════════════════════════════════
# RANK 6: 🛒 E-COMMERCE HUB — THE REVENUE MULTIPLIER
# Importance: ██████░░░░ 6/10 (but 9/10 for e-commerce users)
# ═══════════════════════════════════════════════════════════════

WHY IT'S #6:
├── E-commerce users are highest ARPU (they spend the most on ads)
├── Product feed sync = automated Shopping campaigns
├── Inventory-based pausing prevents overselling → saves money + trust
├── Cart abandonment retargeting recovers 10-30% of abandoned carts
├── True profit optimization (by margin, not just ROAS) = nobody else does this
├── Price comparison alerts = competitive intelligence
├── Seasonal auto-pilot = campaigns plan themselves
├── BUT: only relevant for e-commerce users (not local businesses)
└── When relevant, it's EXTREMELY valuable

REVENUE IMPACT: High ARPU users → more subscription revenue
RETENTION POWER: Very high for e-commerce (they can't live without it)
USER FREQUENCY: Daily for active stores

v23 API FEATURES USED: 3 of 8
├── ShoppingPerformanceView (ALL new competitive metrics)
│   └── Product-level competitive impression share
│   └── Budget lost vs rank lost per product
│   └── Conversions by conversion DATE → accurate product ROAS
│   └── THIS IS THE v23 KILLER FOR E-COMMERCE
├── PMax network breakdown
│   └── Where Shopping PMax spend goes: Search vs Display vs YouTube etc.
└── InvoiceService campaign-level costs
    └── Exact cost per Shopping campaign for profit calculation

FEATURES ON THIS TAB: 8 features (71-78)
MOAT: Margin-aware optimization + inventory sync + price alerts = unique combo


# ═══════════════════════════════════════════════════════════════
# RANK 7: 🧪 A/B TESTS — THE OPTIMIZATION ENGINE
# Importance: █████░░░░░ 5/10
# ═══════════════════════════════════════════════════════════════

WHY IT'S #7:
├── A/B testing improves EVERY metric over time (compounding effect)
├── AI auto-testing removes need for human testing expertise
├── Shows which ad copy wins → learns what messaging works
├── Auto-picks winner → continuous improvement without effort
├── BUT: most users never manually create tests
├── BUT: AI runs tests automatically in background anyway
├── Power feature for advanced users and agencies
└── Low visibility, high background impact

REVENUE IMPACT: Indirect — improves results over time
RETENTION POWER: Medium (users don't think about it, but results improve)
USER FREQUENCY: Low (1-2x per month manual, AI auto-runs daily)

v23 API FEATURES USED: 2 of 8
├── Asset group metrics (engagement_rate, avg_cpe, video metrics)
│   └── Measures creative performance of A/B variants
│   └── New v23 metrics make variant comparison more accurate
└── AssetGenerationService (v22 but enhanced in v23)
    └── AI generates ad variants for testing

FEATURES ON THIS TAB: 4 screens
MOAT: Full auto-testing with AI + auto-winner selection = unique


# ═══════════════════════════════════════════════════════════════
# RANK 8: ⚙️ SETTINGS — THE FOUNDATION
# Importance: ████░░░░░░ 4/10 (but critical for setup)
# ═══════════════════════════════════════════════════════════════

WHY IT'S #8:
├── Users visit ONCE during setup, rarely after
├── BUT: automation rules here POWER everything else
├── Connection status = must work perfectly or nothing works
├── Billing page = where they decide to upgrade or cancel
├── Agency features here = $299/mo revenue per agency
├── Team/Access = enterprise stickiness
├── IF settings are confusing → user can't set up → churn day 1
├── Low frequency, HIGH importance for first experience
└── "Set once, forget forever" — that's the goal

REVENUE IMPACT: Billing page = revenue. Agency settings = upsell.
RETENTION POWER: Low ongoing, but critical for day-1 retention
USER FREQUENCY: 1-2x total (setup + occasional changes)

v23 API FEATURES USED: 2 of 8
├── InvoiceService
│   └── Agency billing: generate per-client invoices from API data
└── PerStoreView
    └── Store address configuration → enables store analytics

FEATURES ON THIS TAB: 8 sub-pages
MOAT: Client billing automation + white-label = agency lock-in



# ═══════════════════════════════════════════════════════════════
# FINAL TAB RANKING SUMMARY
# ═══════════════════════════════════════════════════════════════

┌──────┬──────────────────┬───────────┬────────────┬───────────┬───────────────┐
│ Rank │ Tab              │ Score     │ v23 APIs   │ Frequency │ Revenue Impact│
├──────┼──────────────────┼───────────┼────────────┼───────────┼───────────────┤
│  1   │ 🏠 Dashboard      │ 10/10    │ 5 of 8     │ Daily     │ Direct        │
│  2   │ 📢 Campaigns      │ 9/10     │ 6 of 8     │ 2-3x/week│ Direct        │
│  3   │ 🔔 Alerts         │ 8/10     │ 3 of 8     │ 3-10x/day│ Retention     │
│  4   │ 💡 AI Advisor     │ 8/10     │ 3 of 8     │ 1-3x/week│ Differentiator│
│  5   │ 📊 Reports        │ 7/10     │ 7 of 8     │ Weekly    │ Retention     │
│  6   │ 🛒 E-Commerce     │ 6/10*    │ 3 of 8     │ Daily*    │ High ARPU     │
│  7   │ 🧪 A/B Tests      │ 5/10     │ 2 of 8     │ Monthly   │ Indirect      │
│  8   │ ⚙️ Settings       │ 4/10     │ 2 of 8     │ Once      │ Setup + Upsell│
└──────┴──────────────────┴───────────┴────────────┴───────────┴───────────────┘
* E-Commerce = 9/10 for store owners, 0/10 for service businesses



# ┌─────────────────────────────────────────────────────────────┐
# │  PART 2: GOOGLE ADS API v23 — COMPLETE FEATURE MAP          │
# │  Every new v23 endpoint → where it lives in our product     │
# └─────────────────────────────────────────────────────────────┘


# ═══════════════════════════════════════════════════════════════
# v23 FEATURE 1: NLP AUDIENCE BUILDING
# AudienceInsightsService.GenerateAudienceDefinition
# COMPETITIVE ADVANTAGE: ★★★★★ (nobody has built product on this)
# ═══════════════════════════════════════════════════════════════

WHAT IT DOES:
User types: "Eco-conscious parents in urban areas"
API returns: Structured audience definition with:
├── Affinity segments (Eco-friendly, Parenting)
├── In-market audiences (Baby products, Sustainable goods)
├── Demographics (Age 25-44, Parents)
├── Geographic targeting (Urban areas)
└── Related interest categories

ENDPOINT:
POST AudienceInsightsService.GenerateAudienceDefinition
{
  "customer_id": "1234567890",
  "audience_description": "eco-conscious parents in urban areas",
  "country_code": "US"
}

WHERE IT LIVES IN OUR PRODUCT:

Tab 2 — Campaigns:
├── Campaign Creator → Step 3 (Audience):
│   ├── User types audience description in text box
│   ├── [AI Build Audience] button calls this endpoint
│   ├── Returns structured audience → user reviews → approves
│   └── Simple display: "AI will target: Parents 25-44, eco-friendly interests, urban USA"
│
├── Campaign Detail → Audience sub-tab:
│   ├── [AI Build Audience] button
│   ├── [Type audience in English] text input
│   ├── AI shows: "Based on your description, I'll target 2.3M people"
│   └── User can refine: "Make it more specific" → re-calls endpoint

Tab 3 — AI Advisor:
├── User says: "Create an audience for eco-conscious moms in London"
├── AI calls GenerateAudienceDefinition behind the scenes
├── Shows result in chat: "I've created an audience of 340K people matching..."
└── [Apply to Campaign] [Modify] [Create New Campaign with This]

WHY THIS IS HUGE:
├── Old way: Click through 50+ interest categories, guess at demographics
├── New way: Type one sentence, AI does everything
├── Time saved: 30 minutes → 10 seconds
├── Accuracy: AI maps to Google's targeting taxonomy (better than human guessing)
├── Our advantage: NOBODY has built a consumer product on this endpoint yet
└── This single feature justifies our product for non-technical users


# ═══════════════════════════════════════════════════════════════
# v23 FEATURE 2: PERFORMANCE MAX NETWORK BREAKDOWN
# ad_network_type segment enabled for PMax campaigns
# COMPETITIVE ADVANTAGE: ★★★★★ (the #1 most requested PMax feature)
# ═══════════════════════════════════════════════════════════════

WHAT IT DOES:
Before v23: PMax reported as "MIXED" — you couldn't see where money went
After v23: See exact breakdown by:
├── Google Search (search results page)
├── Search Partners (partner websites)
├── YouTube (video ads)
├── Display Network (banner ads on websites)
├── Gmail (inbox ads)
├── Discover (feed ads)
└── Maps (local business ads)

Available at 3 levels:
├── Campaign level (total PMax breakdown)
├── Asset group level (which creative groups work where)
└── Asset level (which individual ads work on which channels)

Historical data available back to June 1, 2025.

METRICS AVAILABLE PER CHANNEL:
├── clicks
├── impressions
├── conversions
├── conversions_value (revenue)
├── engagement_rate (NEW in v23)
├── average_cpe (NEW in v23)
└── + all standard metrics

WHERE IT LIVES IN OUR PRODUCT:

Tab 1 — Dashboard:
├── Widget 5 (Platform Breakdown):
│   ├── Donut chart drill-down: [By Network (v23 PMax)] option
│   ├── Shows: Search 40% | YouTube 25% | Display 20% | Gmail 8% | Maps 4% | Discover 3%
│   ├── Table: channel-by-channel metrics
│   └── EXPERT MODE: full breakdown with CTR, CPC, Conv Rate per channel
│
├── Widget 4 (Performance Chart):
│   ├── Split By → [Network] option
│   ├── Shows separate lines for Search, YouTube, Display, Gmail, Discover, Maps
│   └── "YouTube conversions are growing 30% faster than Search"
│
├── Widget 6 (Campaign Table):
│   └── PMax campaigns show expandable rows with per-channel breakdown

Tab 2 — Campaigns:
├── Campaign Detail → Overview:
│   ├── For PMax campaigns: "Channel Distribution" section
│   ├── Pie chart: where this PMax campaign spends
│   └── AI insight: "YouTube drives 60% of your PMax conversions at lowest CPA"
│
├── Campaign Detail → Budget & Bidding:
│   └── Budget per channel: "Search getting $50/day, YouTube $30/day, Display $20/day"
│   └── (Note: you can't CONTROL allocation, but you can SEE it)

Tab 3 — AI Advisor:
├── "Where is my PMax money going?"
│   → AI: "Your PMax campaign 'Soy Candles' is spending across 5 channels:
│      Search (42%), YouTube (28%), Display (18%), Gmail (8%), Discover (4%)
│      Search has the best ROI at 5.2x, but YouTube is growing fastest."

Tab 4 — Reports:
├── Platform Comparison page:
│   ├── Full PMax channel breakdown report
│   ├── Channel-by-channel comparison over time
│   ├── Which channels drive conversions vs just impressions
│   └── Exportable PDF with channel attribution
│
├── Overview Report:
│   └── Includes PMax channel summary in Expert Mode

Tab 5 — Alerts:
├── "Your PMax YouTube spend jumped 200% today" (anomaly detection)
├── "PMax is allocating 80% to Display — historically Display converts poorly for you"
└── "PMax Search impression share dropped — competitor may be increasing bids"

WHY THIS IS HUGE:
├── PMax has been a "black box" since launch in 2021
├── Advertisers have been BEGGING Google for this data
├── v23 is the FIRST time this data is available programmatically
├── We can build beautiful visualizations BEFORE any competitor
├── PMax is now Google's default campaign type — almost every advertiser uses it
├── Agencies need this data to justify PMax spend to clients
└── First platform to show PMax channel breakdown in simple UI = massive competitive advantage


# ═══════════════════════════════════════════════════════════════
# v23 FEATURE 3: PRECISION SCHEDULING
# Campaign.start_date_time / Campaign.end_date_time
# COMPETITIVE ADVANTAGE: ★★★☆☆ (useful but not revolutionary)
# ═══════════════════════════════════════════════════════════════

WHAT IT DOES:
Before v23: start_date / end_date (calendar day only)
After v23: start_date_time / end_date_time (minute precision + timezone)

Example:
{
  "campaign": {
    "start_date_time": "2026-02-14T00:00:00-05:00",
    "end_date_time": "2026-02-14T23:59:59-05:00"
  }
}

WHERE IT LIVES IN OUR PRODUCT:

Tab 2 — Campaigns:
├── Campaign Creator → Step 4 (Budget & Schedule):
│   ├── Schedule picker with time precision
│   ├── "Start campaign at: [date] [time] [timezone]"
│   ├── "End campaign at: [date] [time] [timezone]"
│   └── Perfect for: flash sales, product launches, event promotions
│
├── Campaign Detail → Schedule sub-tab:
│   ├── Visual timeline showing exact start/end times
│   ├── Edit: change to minute-level precision
│   └── AI suggestion: "Start your Valentine's campaign at 12:01 AM Feb 1"
│
├── Strategy Calendar:
│   ├── Visual calendar shows campaigns with exact start/end times
│   ├── Seasonal campaigns auto-scheduled with precise timing
│   └── "Black Friday campaign: Nov 28, 12:00 AM → Nov 28, 11:59 PM"

Tab 6 — E-Commerce Hub:
├── Seasonal Planner:
│   └── Flash sale campaigns with exact start/stop times
│   └── "Flash sale: starts at noon, ends at 6 PM"

WHY THIS MATTERS:
├── E-commerce flash sales need exact timing
├── Multi-timezone businesses need coordinated launches
├── Event-based advertising (sports, concerts, launches) needs precision
├── Reduces wasted spend during non-converting hours
└── Small improvement but adds to "we support everything" positioning


# ═══════════════════════════════════════════════════════════════
# v23 FEATURE 4: CAMPAIGN-LEVEL INVOICE SERVICE
# InvoiceService.ListInvoices (include_granular_level_invoice_details)
# COMPETITIVE ADVANTAGE: ★★★★☆ (huge for agencies)
# ═══════════════════════════════════════════════════════════════

WHAT IT DOES:
Before v23: Invoice showed total amount only
After v23: Invoice includes:
├── Campaign-level cost breakdown (how much each campaign cost)
├── Itemized regulatory fees (government/compliance charges per market)
├── Adjustments (credits, refunds, corrections)
└── All accessible programmatically

ENDPOINT:
InvoiceService.ListInvoices with include_granular_level_invoice_details = true

WHERE IT LIVES IN OUR PRODUCT:

Tab 4 — Reports:
├── Billing & Invoices page:
│   ├── Timeline of invoices (monthly)
│   ├── Each invoice expandable: see per-campaign costs
│   ├── Regulatory fee breakdown per market/country
│   ├── Adjustments and credits
│   ├── [Download Invoice PDF] [Export to CSV]
│   └── [Send to Accounting Software] (Xero, QuickBooks integration)
│
├── Profit Calculator:
│   └── Uses exact campaign costs (not estimated) for true profit calculation

Tab 8 — Settings:
├── Team & Access → Client Billing (Agency plan):
│   ├── Auto-calculate management fee per client
│   ├── "Client A: Campaign costs $5,247.83 (from InvoiceService)
│   │    × 15% management fee = $787.17"
│   ├── Generate branded invoice with exact costs
│   ├── No more manual cost reconciliation
│   └── Auto-send monthly client invoices

Tab 1 — Dashboard:
├── Budget Tracker (Widget 12):
│   └── Uses exact invoiced amounts for spend tracking accuracy

WHY THIS IS HUGE FOR AGENCIES:
├── Agencies spend HOURS every month manually reconciling costs per client
├── v23 provides exact per-campaign costs programmatically
├── Our Agency plan ($299/mo + $29/client) can auto-generate invoices
├── Regulatory fee itemization required by law in EU, Australia, etc.
├── This feature alone justifies Agency plan pricing
└── Nobody else has built automated client billing on InvoiceService v23


# ═══════════════════════════════════════════════════════════════
# v23 FEATURE 5: STORE LOCATION ANALYTICS
# PerStoreView
# COMPETITIVE ADVANTAGE: ★★★★☆ (huge for local businesses)
# ═══════════════════════════════════════════════════════════════

WHAT IT DOES:
New resource: PerStoreView
├── Performance metrics per individual store location
├── Matches the "Stores report" in Google Ads UI
├── Available for campaigns using location extensions or local inventory ads
└── Metrics: impressions, clicks, conversions per store

WHERE IT LIVES IN OUR PRODUCT:

Tab 4 — Reports:
├── Store Location Analytics page:
│   ├── MAP VIEW: interactive map with store pins
│   │   ├── Each pin: color-coded by performance (green/yellow/red)
│   │   ├── Click pin: popup with store metrics
│   │   └── Zoom in/out, search by location
│   │
│   ├── TABLE VIEW:
│   │   ├── Store | City | Impressions | Clicks | Visits | Cost | Conv | CPA
│   │   ├── "London Oxford St: 2,300 impr, 89 clicks, 23 visits, $340 cost"
│   │   ├── "Manchester: 1,100 impr, 45 clicks, 12 visits, $180 cost"
│   │   └── Sort by any column, filter by region
│   │
│   ├── COMPARISON VIEW:
│   │   └── Side-by-side store comparison charts
│   │
│   └── AI INSIGHT:
│       └── "London Oxford St drives 3x more visits than any other store.
│            Consider increasing budget for London targeting."

Tab 1 — Dashboard:
├── Widget 10 (Audience Insights):
│   └── "View by Location" → shows store-level data
├── Widget 4 (Performance Chart):
│   └── Split By → "Store Location" option

Tab 5 — Alerts:
├── "London store visits dropped 40% this week — check local competition"
├── "Manchester store getting high impressions but low visits — ad copy issue?"
└── "New store in Birmingham reaching 50 visits/week after 2 weeks"

WHY THIS MATTERS:
├── Multi-location businesses (restaurants, retail chains) need per-store data
├── Budget allocation between stores based on ACTUAL performance
├── Identify underperforming stores for local marketing adjustments
├── Previously required UI access or manual report downloads
├── Our platform shows this automatically with map visualization
└── Perfect for franchise and multi-location users


# ═══════════════════════════════════════════════════════════════
# v23 FEATURE 6: LIFE EVENT TARGETING
# LIFE_EVENT_USER_INTEREST dimension
# COMPETITIVE ADVANTAGE: ★★★★☆ (powerful targeting nobody uses)
# ═══════════════════════════════════════════════════════════════

WHAT IT DOES:
New dimension for audience building: LIFE_EVENT_USER_INTEREST
Available in AudienceInsightsService and ContentCreatorInsightsService
Target people based on life events:
├── Getting married (wedding planning)
├── Having a baby (new parents)
├── Moving (new homeowners/renters)
├── Starting a business
├── Graduating (students)
├── Retiring
└── Other life transitions

WHERE IT LIVES IN OUR PRODUCT:

Tab 2 — Campaigns:
├── Campaign Creator → Step 3 (Audience):
│   ├── "Target by Life Events" toggle section
│   ├── Checkboxes: ☐ Getting Married ☐ New Baby ☐ Moving ☐ Graduating ☐ Retiring
│   ├── Combinable with other targeting: "Women 25-35 + Getting Married + Urban"
│   └── AI: "Adding 'Getting Married' to your candle campaign could reach 180K people
│          who are actively planning weddings and buying gifts"
│
├── Campaign Detail → Audience sub-tab:
│   ├── Life Event section with performance metrics per event
│   ├── "Getting Married audience: 12 customers, $22 CPA 🟢"
│   └── "New Baby audience: 5 customers, $35 CPA 🟡"

Tab 3 — AI Advisor:
├── User: "Who should I target for wedding gift candles?"
├── AI: "I recommend the 'Getting Married' life event audience combined with
│   women 25-40 in your shipping zone. Google estimates 180K targetable people.
│   Shall I create this audience?"
└── [Yes, Create] [Modify] [Tell Me More]

Tab 4 — Reports:
├── Audience Reports:
│   └── Life event segment performance comparison
│   └── "Getting Married converts 2.3x better than general audience for gift products"

WHY THIS MATTERS:
├── Life events = highest purchase intent moments
├── Someone getting married WILL buy gifts, decorations, services
├── Someone moving WILL buy furniture, services, local products
├── This targeting is INCREDIBLY valuable but hidden in Google's taxonomy
├── Our NLP audience builder + life events = powerful combo
├── Example: "Pizza shop near university" + "Graduating" = graduation party catering ads
└── Nobody is building consumer products around life event targeting yet


# ═══════════════════════════════════════════════════════════════
# v23 FEATURE 7: SHOPPING PERFORMANCE VIEW (Enhanced)
# ShoppingPerformanceView — new competitive + conversion metrics
# COMPETITIVE ADVANTAGE: ★★★★★ (e-commerce game changer)
# ═══════════════════════════════════════════════════════════════

WHAT IT DOES:
Two major additions to ShoppingPerformanceView:

A) NEW COMPETITIVE METRICS:
├── search_budget_lost_impression_share
│   └── "You lost 15% of Shopping impressions because budget ran out"
├── search_rank_lost_impression_share
│   └── "You lost 12% of Shopping impressions because bids were too low"
├── search_budget_lost_absolute_top_impression_share
│   └── "You lost 8% of TOP positions due to budget"
└── search_rank_lost_absolute_top_impression_share
    └── "You lost 10% of TOP positions due to low bids"

B) CONVERSION METRICS BY CONVERSION DATE (not click date):
├── conversions_by_conversion_date
├── all_conversions_by_conversion_date
├── conversions_value_by_conversion_date
├── all_conversions_value_by_conversion_date
├── value_per_conversions_by_conversion_date
└── value_per_all_conversions_by_conversion_date

WHY CONVERSION DATE MATTERS:
Click date: "Customer clicked Monday, bought Wednesday → Monday gets credit"
Conversion date: "Customer clicked Monday, bought Wednesday → Wednesday gets credit"
Conversion date = more accurate revenue reporting, matches actual sales data.

WHERE IT LIVES IN OUR PRODUCT:

Tab 6 — E-Commerce Hub:
├── Products page:
│   ├── Per-product competitive impression share
│   ├── "Lavender Candle: You're showing for 72% of relevant searches"
│   ├── "Lost 15% to budget, 13% to rank"
│   └── AI: "Increase bid on Lavender Candle by $0.20 to capture 85% impression share"
│
├── Pricing Intelligence page:
│   ├── Competitive position per product
│   └── Budget vs rank: "Are you losing because you're too cheap or because budget runs out?"
│
├── Shopping Campaigns page:
│   └── Campaign-level competitive metrics + conversion-date ROAS

Tab 4 — Reports:
├── Shopping Performance page:
│   ├── Full competitive breakdown per product group
│   ├── Budget lost vs rank lost analysis
│   ├── Conversion-date ROAS (more accurate than click-date)
│   ├── "Your true ROAS by conversion date is 4.1x (vs 3.8x by click date)"
│   └── Month-over-month using conversion-date attribution
│
├── Profit Calculator:
│   └── Uses conversion-date revenue for true profit (more accurate)

Tab 5 — Alerts:
├── "Lavender Candle losing 25% impression share to budget — increase $5/day?"
├── "Rose Candle lost absolute top position to competitor — bid increase needed"
└── "Shopping ROAS improved to 4.5x when measured by conversion date (was 3.8x by click date)"

Tab 1 — Dashboard:
├── Widget 6 (Campaign Table, Expert Mode):
│   └── Shopping campaigns show competitive metrics columns
├── Widget 7 (Top/Worst Performers):
│   └── "Show Products" option uses ShoppingPerformanceView data

WHY THIS IS HUGE:
├── E-commerce advertisers live and die by Shopping performance
├── Competitive impression share tells them EXACTLY why they're losing
├── Budget lost vs rank lost = completely different fixes
├── Conversion-date metrics = first time accurate ROAS for Shopping
├── No competitor platform has built UI for these v23 Shopping metrics yet
└── Our e-commerce users get data that was impossible to get before


# ═══════════════════════════════════════════════════════════════
# v23 FEATURE 8: DEMAND GEN SURFACE-LEVEL FORECASTING
# ReachPlanService.GenerateConversionRates (surface breakdown)
# COMPETITIVE ADVANTAGE: ★★★☆☆ (niche but valuable)
# ═══════════════════════════════════════════════════════════════

WHAT IT DOES:
Demand Gen campaigns now show conversion rate PREDICTIONS per surface:
├── YouTube Shorts (short video ads)
├── Gmail (inbox ads)
├── Discover feed (Google feed ads)
└── Each surface: predicted conversion rate

WHERE IT LIVES IN OUR PRODUCT:

Tab 2 — Campaigns:
├── Campaign Creator (Demand Gen type):
│   └── AI shows: "For your business, Gmail converts at 2.3%, Shorts at 1.8%,
│       Discover at 1.1%. I recommend allocating more budget to Gmail."
│
├── Campaign Detail → Overview (Demand Gen campaigns):
│   └── Surface-by-surface performance + predictions

Tab 3 — AI Advisor:
├── "Which Demand Gen surface works best for me?"
├── AI uses GenerateConversionRates to predict
└── Shows: "Gmail is your best bet at 2.3% predicted conversion rate"

Tab 4 — Reports:
├── Platform Comparison:
│   └── Demand Gen surface breakdown (actual vs predicted)

WHY THIS MATTERS:
├── Demand Gen is Google's growing ad format (competitor to Meta)
├── Surface-level predictions help allocate creative strategy
├── YouTube Shorts is growing rapidly — knowing its conversion rate is valuable
└── Nice to have, not must-have for MVP


# ═══════════════════════════════════════════════════════════════
# BONUS v23 FEATURES (smaller but still used)
# ═══════════════════════════════════════════════════════════════

ADDITIONAL v23 CHANGES WE USE:

A) Asset Group Engagement Metrics (NEW):
├── metrics.engagements (total engagements)
├── metrics.engagement_rate
├── metrics.average_cpe (cost per engagement)
├── metrics.average_cpm (more accurate for asset groups)
├── metrics.video_trueview_view_rate
├── metrics.video_trueview_views
└── metrics.interaction_event_types

WHERE: Campaign Detail → Ads sub-tab, A/B Tests, Reports
WHY: Better creative performance measurement, especially for video ads

B) Asset Orientation Detection (NEW):
├── Read-only field "orientation" on image and video assets
└── Returns: landscape, portrait, square

WHERE: Campaign Detail → Ads (auto-tag ad orientations for platform matching)
WHY: Ensures right creative goes to right placement

C) CampaignAsset HEADLINE and DESCRIPTION support (NEW):
├── Can now retrieve campaign-level headline and description assets
└── Previously only available at ad group level

WHERE: Campaign Detail → Ads, Campaign cloning, bulk operations
WHY: Better campaign-level creative management

D) Sitelink-Style Headlines (NEW):
├── HEADLINE_AS_SITELINK_POSITION_ONE/TWO
├── Shows how headlines are being used as sitelinks
└── Provides insight into ad extension behavior

WHERE: Campaign Detail → Ads (Expert Mode)
WHY: Understanding how Google serves your ad components

E) MatchedLocationInterestView (NEW — for AI Max campaigns):
├── Performance metrics by geographic locations users showed interest in
└── Different from physical location — shows where users WANT to go

WHERE: Reports → Audience Reports, Campaign Detail → Audience
WHY: Travel/hospitality advertisers can see where customers want to visit

F) Facebook Messenger & Zalo Business Messaging (NEW):
├── BusinessMessageAsset now supports Facebook Messenger and Zalo
└── New providers: FACEBOOK_MESSENGER, ZALO

WHERE: Campaign Detail → Ads (when message extensions enabled)
WHY: Expands cross-platform messaging for Asian markets (Zalo = Vietnam)

G) Asset Group Signals Validation (NEW):
├── Validates asset-audience signal matching during setup
└── Catches mismatches before campaign goes live

WHERE: Campaign Creator → Step 5 (Review)
WHY: Prevents poor campaigns from launching



# ═══════════════════════════════════════════════════════════════
# v23 API USAGE SUMMARY — TOTAL MAP
# ═══════════════════════════════════════════════════════════════

┌─────────────────────────────┬────────────┬────────────┬────────────┬───────────┬────────┬─────────┬────────┬────────┐
│ v23 Feature                 │ 🏠 Dash    │ 📢 Campaigns│ 💡 AI     │ 📊 Reports│ 🔔 Alert│ 🛒 E-Com │ 🧪 A/B │ ⚙️ Set │
├─────────────────────────────┼────────────┼────────────┼────────────┼───────────┼────────┼─────────┼────────┼────────┤
│ 1. NLP Audiences            │            │ ✅ CORE     │ ✅ CORE    │           │        │         │        │        │
│ 2. PMax Network Breakdown   │ ✅ CORE     │ ✅          │ ✅         │ ✅ CORE   │ ✅      │ ✅       │        │        │
│ 3. Precision Scheduling     │            │ ✅ CORE     │            │           │        │ ✅       │        │        │
│ 4. InvoiceService Granular  │ ✅          │            │            │ ✅ CORE   │        │ ✅       │        │ ✅ CORE │
│ 5. PerStoreView             │ ✅          │            │            │ ✅ CORE   │ ✅      │         │        │ ✅      │
│ 6. Life Event Targeting     │            │ ✅ CORE     │ ✅         │ ✅        │        │         │        │        │
│ 7. Shopping Competitive     │ ✅          │            │            │ ✅ CORE   │ ✅      │ ✅ CORE  │        │        │
│ 8. Demand Gen Surfaces      │            │ ✅          │ ✅         │ ✅        │        │         │        │        │
│ 9. Asset Engagement Metrics │ ✅          │ ✅          │            │ ✅        │        │         │ ✅      │        │
│ 10. MatchedLocationInterest │            │ ✅          │            │ ✅        │        │         │        │        │
├─────────────────────────────┼────────────┼────────────┼────────────┼───────────┼────────┼─────────┼────────┼────────┤
│ TOTAL v23 features used     │ 5          │ 7          │ 4          │ 8         │ 3      │ 4       │ 1      │ 2      │
└─────────────────────────────┴────────────┴────────────┴────────────┴───────────┴────────┴─────────┴────────┴────────┘

CORE = primary implementation (this is WHERE the feature is most visible)
✅ = also used here (secondary usage)

TABS RANKED BY v23 API DENSITY:
1. 📊 Reports — uses 8 of 10 v23 features (MOST API-DENSE)
2. 📢 Campaigns — uses 7 of 10 v23 features
3. 🏠 Dashboard — uses 5 of 10 v23 features
4. 💡 AI Advisor — uses 4 of 10 v23 features
5. 🛒 E-Commerce — uses 4 of 10 v23 features
6. 🔔 Alerts — uses 3 of 10 v23 features
7. ⚙️ Settings — uses 2 of 10 v23 features
8. 🧪 A/B Tests — uses 1 of 10 v23 features



# ═══════════════════════════════════════════════════════════════
# THE STRATEGIC PICTURE — WHY v23 IS OUR MOAT
# ═══════════════════════════════════════════════════════════════

TIMELINE:
├── v23 released: January 28, 2026 (27 days ago)
├── v19 sunset: February 11, 2026 (13 days ago)
│   └── Most platforms are STILL migrating from v19 → v20/v21
│   └── They're just trying to NOT BREAK, not building new features
├── Competitors building on v23: 0 consumer products (as of today)
├── Our window: 6-12 months before competitors adapt
└── Monthly releases mean v24, v25, v26 coming throughout 2026

OUR COMPETITIVE ADVANTAGE:
├── We build NATIVE on v23 from day 1
├── Competitors are patching v19→v20 just to keep running
├── While they migrate, we ship features they can't match
├── By the time they catch up to v23, we'll be on v25+
├── FIRST consumer product with:
│   ├── NLP audience building in simple UI ← NOBODY
│   ├── PMax channel breakdown visualization ← NOBODY
│   ├── Store location map analytics ← NOBODY
│   ├── Shopping competitive intelligence ← NOBODY
│   ├── Automated agency billing from InvoiceService ← NOBODY
│   ├── Life event targeting in consumer product ← NOBODY
│   └── All of the above + conversational AI management ← NOBODY
└── Being first = brand recognition + user data + feature feedback loop

WHAT TO BUILD FIRST (MVP v23 features):
├── Priority 1: NLP Audience Building → Campaign Create + AI Advisor
│   └── Most visible, most impressive, easiest to demo
├── Priority 2: PMax Network Breakdown → Dashboard + Reports
│   └── Most requested by market, highest immediate value
├── Priority 3: Shopping Competitive Metrics → E-Commerce Hub
│   └── Highest-value users (big ad spenders)
├── Priority 4: Precision Scheduling → Campaign Create
│   └── Easy to implement, adds to "we support everything" story
├── Priority 5: InvoiceService → Agency Billing
│   └── Unlocks Agency plan revenue ($299/mo + $29/client)
├── Priority 6: PerStoreView → Reports
│   └── Unlocks local business segment
├── Priority 7: Life Event Targeting → Audience Builder
│   └── Adds to audience building story
└── Priority 8: Demand Gen Surfaces → Reports
    └── Nice to have, not critical for launch

