# Phase 18: Lead Generation Analysis Framework

## Executive Summary

| Item | Details |
|------|---------|
| **Purpose** | Comprehensive framework for analyzing and optimizing lead generation campaigns |
| **Platforms** | Google Ads (Search, PMax) + Meta Ads (Lead Forms, Instant Forms) |
| **Key Metrics** | CPL, Cost-per-MQL, Cost-per-SQL, Lead Quality Score, Lead-to-Close Rate |
| **Industries** | All verticals (B2B SaaS, Professional Services, Insurance, Legal, Education) |
| **CRM Integration** | HubSpot API with lifecycle stage mapping |
| **Status** | Planning Complete |
| **Version** | 1.0 |

---

## Table of Contents

1. [API Reference for Lead Gen](#module-1-api-reference-for-lead-gen)
2. [Lead Gen Use Cases](#module-2-lead-gen-use-cases)
3. [Decision Making Frameworks](#module-3-decision-making-frameworks)
4. [Analysis Questions & Verification](#module-4-analysis-questions--verification)
5. [Cross-Platform Attribution](#module-5-cross-platform-attribution)
6. [Website Tracking Integration](#module-6-website-tracking-integration)
7. [Lead Gen Metrics Calculations](#module-7-lead-gen-metrics-calculations)
8. [HubSpot CRM Integration](#module-8-hubspot-crm-integration)
9. [Implementation Checklist](#module-9-implementation-checklist)

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           LEAD GENERATION DATA FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Google Ads  │     │   Meta Ads   │     │   Website    │     │   HubSpot    │
│   API v23    │     │  API v21.0   │     │   GA4 API    │     │  CRM API     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ Clicks, Conv       │ Lead Forms         │ Form Events        │ Contacts
       │ Search Terms       │ Instant Forms      │ Sessions           │ Deals
       │ Auction Insights   │ CAPI Events        │ UTM Params         │ Lifecycle
       │                    │                    │                    │
       └────────────────────┴────────────────────┴────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │        AdsMaster Engine       │
                    │  ┌─────────────────────────┐  │
                    │  │   Lead Attribution      │  │
                    │  │   Quality Scoring       │  │
                    │  │   CPL Calculation       │  │
                    │  │   Funnel Analysis       │  │
                    │  └─────────────────────────┘  │
                    └───────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │  AI Recommendations│           │  Reports & Alerts │
        │  - Pause keywords  │           │  - CPL by source  │
        │  - Budget shifts   │           │  - Quality trends │
        │  - Audience expand │           │  - Funnel drops   │
        └───────────────────┘           └───────────────────┘
```

---

## Module 1: API Reference for Lead Gen

### 1.1 Google Ads API Endpoints (Lead Gen Focus)

| Endpoint/Service | Method | Lead Gen Purpose | Data Returned |
|------------------|--------|------------------|---------------|
| `GoogleAdsService` | `search()` GAQL | Pull lead conversions | conversions, conversion_action, value |
| `CustomerService` | `mutate()` | Update conversion actions | conversion_action_id |
| `KeywordView` | `search()` | Keyword-level CPL analysis | keyword_id, metrics by keyword |
| `SearchTermView` | `search()` | Actual queries triggering leads | search_term, conversions, cost |
| `GeoTargetConstant` | `search()` | Location-based lead performance | geo_target, metrics by location |
| `AuctionInsightService` | `get_auction_insights()` | Competitor lead capture analysis | impression_share, position_above_rate |
| `ConversionActionService` | `mutate()` | Create lead form tracking | conversion_action for forms |
| `CallReportingService` | `search()` | Phone lead tracking | call_duration, caller_area_code |

### 1.2 Google Ads GAQL Queries for Lead Gen

```sql
-- Lead conversions by campaign (last 30 days)
SELECT
  campaign.id,
  campaign.name,
  metrics.conversions,
  metrics.cost_micros,
  metrics.conversions_value,
  segments.conversion_action_category,
  segments.conversion_action
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
  AND segments.conversion_action_category = 'LEAD'

-- Search terms driving leads
SELECT
  search_term_view.search_term,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.cost_micros,
  campaign.name
FROM search_term_view
WHERE metrics.conversions > 0
  AND segments.date DURING LAST_30_DAYS
ORDER BY metrics.conversions DESC

-- Keywords with high spend, low lead conversion
SELECT
  ad_group_criterion.keyword.text,
  ad_group_criterion.keyword.match_type,
  ad_group_criterion.quality_info.quality_score,
  metrics.cost_micros,
  metrics.conversions,
  metrics.clicks
FROM keyword_view
WHERE metrics.cost_micros > 50000000  -- $50+
  AND metrics.conversions < 1
  AND segments.date DURING LAST_7_DAYS

-- Geographic lead distribution
SELECT
  geographic_view.country_criterion_id,
  geographic_view.location_type,
  metrics.conversions,
  metrics.cost_micros,
  metrics.impressions
FROM geographic_view
WHERE segments.date DURING LAST_30_DAYS
  AND metrics.conversions > 0
```

### 1.3 Meta Ads API Endpoints (Lead Gen Focus)

| Endpoint | Method | Lead Gen Purpose | Data Returned |
|----------|--------|------------------|---------------|
| `/{ad_account_id}/campaigns` | GET | List lead gen campaigns | campaigns with LEAD_GENERATION objective |
| `/{campaign_id}/insights` | GET | Lead form performance | leads, cost_per_lead, lead_quality |
| `/{ad_account_id}/leadgen_forms` | GET | Lead form configurations | form_id, questions, thank_you_page |
| `/{leadgen_form_id}/leads` | GET | Actual lead data | contact info, custom questions |
| `/{ad_account_id}/customconversions` | GET | Custom lead events | CAPI-tracked conversions |
| `POST /{ad_account_id}/events` | POST | Server-side lead tracking | Conversions API events |

### 1.4 Meta Ads API Queries for Lead Gen

```python
# Get lead form campaigns with insights
async def get_lead_campaigns(account_id: str, access_token: str):
    params = {
        "access_token": access_token,
        "fields": "id,name,objective,status",
        "filtering": '[{"field":"objective","operator":"EQUAL","value":"LEAD_GENERATION"}]'
    }
    response = await client.get(f"act_{account_id}/campaigns", params=params)
    return response.json()

# Get lead form submissions
async def get_lead_form_leads(form_id: str, access_token: str):
    params = {
        "access_token": access_token,
        "fields": "created_time,field_data,ad_id,campaign_id"
    }
    response = await client.get(f"{form_id}/leads", params=params)
    return response.json()

# Get lead insights with actions breakdown
async def get_lead_insights(campaign_id: str, access_token: str):
    params = {
        "access_token": access_token,
        "fields": "spend,impressions,actions,cost_per_action_type",
        "action_breakdowns": "action_type",
        "date_preset": "last_30d"
    }
    response = await client.get(f"{campaign_id}/insights", params=params)
    return response.json()
```

### 1.5 AdsMaster Internal Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /accounts/{id}/campaigns/{id}/auction-insights` | GET | Competitor analysis for lead keywords |
| `GET /api/v1/recommendations?type=pause_keyword` | GET | Wasting keyword recommendations |
| `GET /api/v1/ml/forecast/conversions` | GET | Lead volume forecasting |
| `POST /api/v1/recommendations/{id}/apply` | POST | Apply CPL optimization |

---

## Module 2: Lead Gen Use Cases

### Use Case 1: Cross-Platform Lead Quality Optimization

**Scenario:** B2B SaaS company runs Google Search and Meta Lead Ads. CPL is lower on Meta but sales team reports lower quality.

**Objective:** Identify true Cost-per-MQL across platforms and optimize budget allocation.

#### Data Flow Diagram

```
┌─────────────────┐          ┌─────────────────┐
│   Google Ads    │          │    Meta Ads     │
│  "CRM Demo"     │          │  Lead Form Ad   │
│  $42 CPL        │          │  $28 CPL        │
│  145 leads/mo   │          │  210 leads/mo   │
└────────┬────────┘          └────────┬────────┘
         │                            │
         └─────────────┬──────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │    HubSpot CRM Sync     │
         │  - GCLID matching       │
         │  - FBCLID matching      │
         │  - Lifecycle tracking   │
         └─────────────┬───────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌─────────────────┐       ┌─────────────────┐
│  Google Leads   │       │   Meta Leads    │
│  MQL Rate: 18%  │       │  MQL Rate: 7%   │
│  26 MQLs        │       │  15 MQLs        │
│  Cost/MQL: $233 │       │  Cost/MQL: $392 │
└─────────────────┘       └─────────────────┘
```

#### Analysis SQL

```sql
-- Cross-platform lead quality comparison
WITH google_leads AS (
  SELECT
    'google' as platform,
    COUNT(*) as total_leads,
    SUM(CASE WHEN lifecycle_stage = 'marketingqualifiedlead' THEN 1 ELSE 0 END) as mqls,
    SUM(cost_micros) / 1000000.0 as total_spend
  FROM leads l
  JOIN ad_clicks c ON l.gclid = c.gclid
  WHERE l.created_at >= NOW() - INTERVAL '30 days'
),
meta_leads AS (
  SELECT
    'meta' as platform,
    COUNT(*) as total_leads,
    SUM(CASE WHEN lifecycle_stage = 'marketingqualifiedlead' THEN 1 ELSE 0 END) as mqls,
    SUM(cost_micros) / 1000000.0 as total_spend
  FROM leads l
  JOIN ad_clicks c ON l.fbclid = c.fbclid
  WHERE l.created_at >= NOW() - INTERVAL '30 days'
)
SELECT
  platform,
  total_leads,
  mqls,
  ROUND(mqls::decimal / total_leads * 100, 1) as mql_rate,
  ROUND(total_spend / total_leads, 2) as cpl,
  ROUND(total_spend / NULLIF(mqls, 0), 2) as cost_per_mql
FROM (SELECT * FROM google_leads UNION ALL SELECT * FROM meta_leads) combined
ORDER BY cost_per_mql ASC;
```

#### Decision Matrix

| Metric | Google Ads | Meta Ads | Winner |
|--------|------------|----------|--------|
| CPL | $42 | $28 | Meta |
| MQL Rate | 18% | 7% | Google |
| Cost-per-MQL | $233 | $400 | Google |
| SQL Rate (from MQL) | 45% | 35% | Google |
| Cost-per-SQL | $518 | $1,143 | Google |

**Recommendation:** Shift 30% of Meta budget to Google despite higher surface CPL.

---

### Use Case 2: AI-Powered CPL Reduction via Wasting Keyword Elimination

**Scenario:** Legal services firm spending $15K/month. CPL increased from $85 to $127 over 3 months.

**Objective:** Identify and eliminate wasting keywords to reduce CPL by 25%.

#### Analysis Process

```
Step 1: Pull all keywords with metrics (last 7 days)
        │
        ▼
Step 2: Apply WastingKeywordHighRule
        - Spend >= $50
        - Conversions = 0
        - Status = ENABLED
        │
        ▼
Step 3: Analyze search terms for wasting keywords
        - Check if queries contain "free", "DIY", "pro bono"
        │
        ▼
Step 4: Generate recommendations with options
        - Conservative: Reduce bid 50%
        - Recommended: Pause keyword
        - Aggressive: Pause + add negative
        │
        ▼
Step 5: Bulk apply recommendations
        │
        ▼
Step 6: Verify changes via adapter
        │
        ▼
Step 7: Monitor CPL for 2 weeks
```

#### Wasting Keywords Identified

| Keyword | Spend (7d) | Conversions | CTR | Quality Score | Action |
|---------|------------|-------------|-----|---------------|--------|
| cheap lawyer near me | $312 | 0 | 1.2% | 4 | PAUSE |
| free legal consultation | $287 | 0 | 2.1% | 3 | PAUSE + NEGATIVE |
| lawyer cost calculator | $198 | 0 | 0.8% | 5 | PAUSE |
| pro bono attorney | $156 | 0 | 1.5% | 4 | NEGATIVE ONLY |
| ... (19 more) | ... | ... | ... | ... | ... |

#### Impact Projection

```
Current State:
  Monthly Spend: $15,000
  Leads: 118
  CPL: $127

Wasting Keywords Identified:
  Count: 23 keywords
  Monthly Waste: $8,560

Projected State (after cleanup):
  Monthly Spend: $15,000
  Effective Spend: $15,000 - $8,560 = $6,440 reallocated
  Projected Leads: 118 + 42 (from reallocated budget) = 160
  Projected CPL: $94

CPL Reduction: 26%
```

---

## Module 3: Decision Making Frameworks

### Decision 1: Pause vs. Bid Adjustment for Lead Gen Keywords

#### Decision Tree

```
                    Keyword Performance Check
                              │
              ┌───────────────┴───────────────┐
              │                               │
        Spend >= $50?                    Spend < $50?
              │                               │
              ▼                               ▼
     ┌────────────────┐              Monitor 7 more days
     │ Conversions?   │
     └────────┬───────┘
              │
    ┌─────────┴─────────┐
    │                   │
 Conv = 0           Conv >= 1
    │                   │
    ▼                   ▼
┌──────────┐      ┌──────────────┐
│Quality   │      │CPL vs Target?│
│Score?    │      └──────┬───────┘
└────┬─────┘             │
     │            ┌──────┴──────┐
  ┌──┴──┐         │             │
  │     │    CPL > 2x       CPL <= 2x
 <=4   >4    Target          Target
  │     │         │             │
  ▼     ▼         ▼             ▼
PAUSE  Check    Reduce       Optimize
       CTR      Bid 30%      Landing Page
       │
   ┌───┴───┐
   │       │
CTR<1%  CTR>=1%
   │       │
   ▼       ▼
PAUSE   Improve
        Ad Copy
```

#### Threshold Table

| Condition | Spend (7d) | Conversions | Quality Score | CTR | Action |
|-----------|------------|-------------|---------------|-----|--------|
| High waste, poor quality | >= $50 | 0 | <= 4 | Any | PAUSE immediately |
| High waste, ok quality | >= $50 | 0 | > 4 | < 1% | PAUSE after 3 more days |
| High waste, good engagement | >= $50 | 0 | > 4 | >= 1% | Reduce bid 50% |
| Medium waste | $25-50 | 0 | Any | Any | Monitor + reduce bid 30% |
| Low waste | < $25 | 0 | Any | Any | Monitor only |
| Converting but expensive | Any | >= 1 | Any | Any | Check LP, then reduce bid |
| Converting well | Any | >= 2 | >= 6 | >= 1.5% | Consider scaling |

#### Lead-Specific Considerations

```
Lead Gen Keyword Evaluation Factors:
─────────────────────────────────────
1. Form Fill Rate (if tracked)
   - Low fill rate + high CTR = Landing page issue, not keyword

2. Call Tracking Data
   - Keyword drives calls but not form fills? Keep it.

3. Assisted Conversions
   - Keyword appears in conversion path? May have value.

4. Search Intent Signals
   - "Get quote" / "Request demo" = High intent, be patient
   - "What is" / "How to" = Info intent, cut quickly

5. Time to Convert
   - B2B leads may take 30+ days, extend lookback window
```

---

### Decision 2: Audience Expansion Based on Lead Quality Signals

#### Expansion Decision Framework

```
Current Audience Performance
            │
            ▼
    ┌───────────────────┐
    │ Check MQL Rate    │
    │ (from CRM data)   │
    └─────────┬─────────┘
              │
    ┌─────────┴─────────┐
    │                   │
MQL Rate >= 15%    MQL Rate < 15%
    │                   │
    ▼                   ▼
Check Frequency    DO NOT expand
    │              (fix quality first)
    │
┌───┴───┐
│       │
<3.0   >=3.0
 │       │
 ▼       ▼
Can    Audience
Expand  Saturated
 │       │
 ▼       ▼
┌─────────────────┐
│Expansion Options│
└─────────────────┘
    │
    ├─► 1% Lookalike (safest)
    ├─► Expand age range ±5 years
    ├─► Add related interests
    └─► Broaden geo (if local)
```

#### Lookalike Creation Criteria

| Source Audience | Minimum Size | Lookalike % | Use When |
|-----------------|--------------|-------------|----------|
| Customers (Closed Won) | 100 | 1% | Best quality, slower scale |
| SQLs (Sales Qualified) | 200 | 1-2% | Good quality + volume |
| MQLs (Marketing Qualified) | 500 | 2-3% | More volume, test quality |
| All Leads | 1000 | 3-5% | Maximum reach, lower quality |
| Website Converters | 500 | 2-3% | Intent-based, good for retargeting |

#### Quality Monitoring Post-Expansion

```python
# Expansion quality check query
async def check_expansion_quality(
    original_adset_id: str,
    expansion_adset_id: str,
    days: int = 14
) -> dict:
    """
    Compare MQL rates between original and expansion audiences.
    Alert if expansion quality drops >20% vs original.
    """
    query = """
    SELECT
      adset_id,
      COUNT(*) as leads,
      SUM(CASE WHEN lifecycle_stage = 'marketingqualifiedlead' THEN 1 ELSE 0 END) as mqls,
      ROUND(
        SUM(CASE WHEN lifecycle_stage = 'marketingqualifiedlead' THEN 1 ELSE 0 END)::decimal
        / COUNT(*) * 100, 1
      ) as mql_rate
    FROM leads
    WHERE adset_id IN ($1, $2)
      AND created_at >= NOW() - INTERVAL '$3 days'
    GROUP BY adset_id
    """

    results = await db.fetch(query, original_adset_id, expansion_adset_id, days)

    original = next((r for r in results if r['adset_id'] == original_adset_id), None)
    expansion = next((r for r in results if r['adset_id'] == expansion_adset_id), None)

    if original and expansion:
        quality_drop = (original['mql_rate'] - expansion['mql_rate']) / original['mql_rate'] * 100

        return {
            "original_mql_rate": original['mql_rate'],
            "expansion_mql_rate": expansion['mql_rate'],
            "quality_drop_pct": quality_drop,
            "recommendation": "PAUSE expansion" if quality_drop > 20 else "CONTINUE"
        }
```

---

## Module 4: Analysis Questions & Verification

### Question 1: Attribution Gap Analysis

**Question:** Are ad platform lead conversions matching actual form submissions on our website?

#### Why This Matters

Ad platforms often over-report due to:
- View-through attribution (saw ad, converted later)
- Cross-device duplicates
- Bot/spam submissions counted
- Extended attribution windows

#### Verification Data Sources

| Source | Data Point | Access Method |
|--------|------------|---------------|
| AdsMaster | Reported conversions | `/api/v1/recommendations/verification/stats` |
| Google Analytics 4 | Form submission events | GA4 API: `events/generate_lead` |
| HubSpot | Actual contact records | HubSpot API: `/contacts/v1/lists` |
| Call Tracking | Phone leads | CallRail API: `/calls` |
| Form Tool | Submissions | Typeform/Jotform API |

#### Reconciliation Query

```sql
-- Compare platform-reported vs actual leads
WITH platform_leads AS (
  SELECT
    DATE(created_at) as lead_date,
    platform,
    SUM(conversions) as reported_leads
  FROM metrics_daily
  WHERE metric_date >= NOW() - INTERVAL '7 days'
    AND conversion_action_category = 'LEAD'
  GROUP BY DATE(created_at), platform
),
actual_leads AS (
  SELECT
    DATE(created_at) as lead_date,
    CASE
      WHEN gclid IS NOT NULL THEN 'google'
      WHEN fbclid IS NOT NULL THEN 'meta'
      ELSE 'direct'
    END as platform,
    COUNT(*) as actual_leads
  FROM hubspot_contacts
  WHERE created_at >= NOW() - INTERVAL '7 days'
  GROUP BY DATE(created_at), platform
)
SELECT
  p.lead_date,
  p.platform,
  p.reported_leads,
  COALESCE(a.actual_leads, 0) as actual_leads,
  p.reported_leads - COALESCE(a.actual_leads, 0) as discrepancy,
  ROUND((p.reported_leads - COALESCE(a.actual_leads, 0))::decimal
        / p.reported_leads * 100, 1) as discrepancy_pct
FROM platform_leads p
LEFT JOIN actual_leads a ON p.lead_date = a.lead_date AND p.platform = a.platform
ORDER BY p.lead_date DESC, p.platform;
```

#### Expected Output

```
lead_date  | platform | reported | actual | discrepancy | discrepancy_pct
-----------+----------+----------+--------+-------------+-----------------
2024-01-15 | google   | 23       | 21     | 2           | 8.7%
2024-01-15 | meta     | 31       | 26     | 5           | 16.1%
2024-01-14 | google   | 19       | 18     | 1           | 5.3%
2024-01-14 | meta     | 28       | 22     | 6           | 21.4%
```

#### Root Cause Investigation

```python
# Identify discrepancy sources
async def analyze_attribution_gap(
    platform: str,
    date_from: str,
    date_to: str
) -> dict:
    """
    Break down why platform-reported leads don't match actual leads.
    """
    # Get platform-reported conversions
    platform_convs = await get_platform_conversions(platform, date_from, date_to)

    # Get CRM leads with click IDs
    crm_leads = await get_crm_leads_with_click_ids(platform, date_from, date_to)

    # Categorize discrepancies
    matched = len([l for l in crm_leads if l['click_id'] in platform_convs])
    view_through = len([c for c in platform_convs if c['attribution_type'] == 'view_through'])
    cross_device = len([c for c in platform_convs if c['is_cross_device']])
    spam_filtered = len([l for l in crm_leads if l['lead_status'] == 'spam'])

    return {
        "platform_reported": len(platform_convs),
        "crm_actual": len(crm_leads),
        "matched_with_click_id": matched,
        "view_through_attribution": view_through,
        "cross_device_duplicates": cross_device,
        "spam_filtered_in_crm": spam_filtered,
        "unaccounted": len(platform_convs) - matched - view_through - cross_device
    }
```

---

### Question 2: Form Abandonment Investigation

**Question:** Why do 67% of users who click 'Get Quote' abandon the form before submission?

#### Multi-Source Analysis Approach

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Ad Platform   │     │   Google        │     │   Behavior      │
│   Data          │     │   Analytics 4   │     │   Analytics     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ Keyword         │     │ Landing page    │     │ Form field      │
│ Click source    │     │ bounce rate     │     │ abandonment     │
│ Device type     │     │ Time on page    │     │ Session replay  │
│ Ad copy clicked │     │ Scroll depth    │     │ Heatmaps        │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                                 ▼
                    ┌───────────────────────────┐
                    │   Combined Analysis       │
                    │   - Keyword → Abandon %   │
                    │   - Field → Drop-off %    │
                    │   - Device → Complete %   │
                    └───────────────────────────┘
```

#### Analysis Queries by Data Source

**1. AdsMaster: Keyword-Level Abandonment**

```sql
-- Keywords with high clicks but low form completions
SELECT
  k.text as keyword,
  k.match_type,
  SUM(m.clicks) as clicks,
  SUM(m.conversions) as form_completions,
  ROUND(SUM(m.conversions)::decimal / SUM(m.clicks) * 100, 1) as conversion_rate,
  ROUND(100 - (SUM(m.conversions)::decimal / SUM(m.clicks) * 100), 1) as abandonment_rate
FROM keywords k
JOIN metrics_daily m ON k.id = m.keyword_id
WHERE m.metric_date >= NOW() - INTERVAL '30 days'
  AND m.clicks > 50  -- Minimum significance
GROUP BY k.text, k.match_type
ORDER BY abandonment_rate DESC
LIMIT 20;
```

**2. GA4: Page Performance**

```javascript
// GA4 Data API query for form page metrics
const request = {
  property: 'properties/123456',
  dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
  dimensions: [
    { name: 'pagePath' },
    { name: 'sessionSource' },
    { name: 'sessionMedium' }
  ],
  metrics: [
    { name: 'sessions' },
    { name: 'bounceRate' },
    { name: 'averageSessionDuration' },
    { name: 'conversions' }
  ],
  dimensionFilter: {
    filter: {
      fieldName: 'pagePath',
      stringFilter: { value: '/get-quote', matchType: 'CONTAINS' }
    }
  }
};
```

**3. Hotjar: Form Field Analysis**

```
Form: Get Quote Form
Total Starts: 4,521
Completions: 1,492
Overall Abandonment: 67%

Field-by-Field Drop-off:
─────────────────────────────────────
Field              │ Interactions │ Drop-off
───────────────────┼──────────────┼──────────
1. Full Name       │ 4,521        │ 3%
2. Email           │ 4,385        │ 5%
3. Phone Number    │ 4,167        │ 45% ← CRITICAL
4. Company Size    │ 2,292        │ 12%
5. Budget Range    │ 2,017        │ 8%
6. Submit Button   │ 1,856        │ 20%
───────────────────┴──────────────┴──────────
```

#### Root Cause Matrix

| Issue | Data Source | Impact | Fix | Priority |
|-------|-------------|--------|-----|----------|
| Phone field required | Hotjar | 45% drop | Make optional | P0 |
| Slow page load (4.2s LCP) | GA4 | 35% bounce | Optimize images | P0 |
| "Cheap" keywords | AdsMaster | 82% abandon | Add negatives | P1 |
| No pricing visible | Hotjar heatmap | 23% seek pricing | Add price range | P1 |
| Mobile form too long | GA4 + Hotjar | 58% mobile abandon | Shorten form | P1 |

#### Combined Verification Workflow

```python
# Combine ad data with behavior analytics
async def analyze_form_abandonment(
    form_page_url: str,
    date_from: str,
    date_to: str
) -> dict:
    """
    Multi-source form abandonment analysis.
    """

    # 1. Get keyword-level metrics from AdsMaster
    keyword_metrics = await get_keyword_metrics(
        landing_page=form_page_url,
        date_from=date_from,
        date_to=date_to
    )

    # 2. Get GA4 page metrics
    ga4_metrics = await get_ga4_page_metrics(
        page_path=form_page_url,
        date_from=date_from,
        date_to=date_to
    )

    # 3. Get Hotjar form analytics (if integrated)
    form_analytics = await get_hotjar_form_stats(
        form_url=form_page_url,
        date_from=date_from,
        date_to=date_to
    )

    # 4. Cross-reference: Which keywords have worst form completion?
    keyword_form_correlation = []
    for kw in keyword_metrics:
        kw_sessions = await get_ga4_sessions_by_keyword(kw['text'], date_from, date_to)
        form_starts = kw_sessions.get('form_starts', 0)
        form_completions = kw_sessions.get('form_completions', 0)

        keyword_form_correlation.append({
            "keyword": kw['text'],
            "clicks": kw['clicks'],
            "form_starts": form_starts,
            "form_completions": form_completions,
            "start_rate": form_starts / kw['clicks'] if kw['clicks'] > 0 else 0,
            "complete_rate": form_completions / form_starts if form_starts > 0 else 0
        })

    return {
        "overall_abandonment": form_analytics.get('abandonment_rate'),
        "field_dropoffs": form_analytics.get('field_dropoffs'),
        "worst_keywords": sorted(
            keyword_form_correlation,
            key=lambda x: x['complete_rate']
        )[:10],
        "page_metrics": ga4_metrics,
        "recommendations": generate_form_recommendations(
            form_analytics,
            keyword_form_correlation,
            ga4_metrics
        )
    }
```

---

## Module 5: Cross-Platform Attribution

### 5.1 Attribution Models for Lead Gen

| Model | Best For | How It Works |
|-------|----------|--------------|
| **Last Click** | Short sales cycles | 100% credit to last touchpoint |
| **First Click** | Brand awareness focus | 100% credit to first touchpoint |
| **Linear** | Multi-touch journeys | Equal credit to all touchpoints |
| **Position-Based** | Balanced view | 40% first, 40% last, 20% middle |
| **Data-Driven** | High volume | ML-based credit distribution |

### 5.2 Lead Gen Attribution Table Design

```sql
-- Attribution touchpoints table
CREATE TABLE lead_attribution_touchpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  touchpoint_order INTEGER NOT NULL,
  channel VARCHAR(50) NOT NULL,  -- google, meta, organic, direct, email
  source VARCHAR(100),           -- campaign name / source
  medium VARCHAR(50),            -- cpc, social, organic, email
  campaign_id UUID,              -- FK to campaigns
  keyword_id UUID,               -- FK to keywords (if search)
  cost_micros BIGINT,            -- Cost attributed to this touchpoint
  timestamp TIMESTAMPTZ NOT NULL,

  -- Click identifiers
  gclid VARCHAR(255),
  fbclid VARCHAR(255),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_lead_touchpoints_lead ON lead_attribution_touchpoints(lead_id);
CREATE INDEX idx_lead_touchpoints_channel ON lead_attribution_touchpoints(channel);
CREATE INDEX idx_lead_touchpoints_date ON lead_attribution_touchpoints(timestamp);
```

### 5.3 Multi-Touch Attribution Query

```sql
-- Calculate true cost-per-lead with multi-touch attribution
WITH touchpoints AS (
  SELECT
    l.id as lead_id,
    l.lifecycle_stage,
    lat.channel,
    lat.campaign_id,
    lat.cost_micros,
    lat.touchpoint_order,
    COUNT(*) OVER (PARTITION BY l.id) as total_touchpoints
  FROM leads l
  JOIN lead_attribution_touchpoints lat ON l.id = lat.lead_id
  WHERE l.created_at >= NOW() - INTERVAL '30 days'
),
linear_attribution AS (
  SELECT
    channel,
    campaign_id,
    lifecycle_stage,
    -- Linear model: divide cost equally among touchpoints
    SUM(cost_micros::decimal / total_touchpoints) as attributed_cost,
    COUNT(DISTINCT lead_id) as leads_touched
  FROM touchpoints
  GROUP BY channel, campaign_id, lifecycle_stage
),
position_based AS (
  SELECT
    channel,
    campaign_id,
    lifecycle_stage,
    -- Position-based: 40% first, 40% last, 20% distributed
    SUM(
      CASE
        WHEN touchpoint_order = 1 THEN cost_micros * 0.4
        WHEN touchpoint_order = total_touchpoints THEN cost_micros * 0.4
        ELSE cost_micros * 0.2 / NULLIF(total_touchpoints - 2, 0)
      END
    ) as attributed_cost,
    COUNT(DISTINCT lead_id) as leads_touched
  FROM touchpoints
  GROUP BY channel, campaign_id, lifecycle_stage
)
SELECT
  l.channel,
  c.name as campaign_name,
  l.lifecycle_stage,
  -- Last-click attribution
  SUM(CASE WHEN t.touchpoint_order = t.total_touchpoints THEN t.cost_micros ELSE 0 END) / 1000000.0 as last_click_cost,
  -- Linear attribution
  SUM(t.cost_micros::decimal / t.total_touchpoints) / 1000000.0 as linear_cost,
  COUNT(DISTINCT l.lead_id) as leads
FROM touchpoints t
JOIN campaigns c ON t.campaign_id = c.id
GROUP BY t.channel, c.name, t.lifecycle_stage
ORDER BY linear_cost DESC;
```

---

## Module 6: Website Tracking Integration

### 6.1 GA4 Integration Points

```javascript
// GA4 Enhanced Measurement for Lead Tracking
gtag('config', 'G-XXXXXXX', {
  // Custom dimensions for lead tracking
  custom_map: {
    'dimension1': 'lead_source',
    'dimension2': 'lead_campaign',
    'dimension3': 'lead_quality_tier'
  }
});

// Track form submissions with lead data
function trackLeadSubmission(formData) {
  gtag('event', 'generate_lead', {
    'currency': 'USD',
    'value': formData.estimated_value || 0,
    'lead_source': getUTMParameter('utm_source') || 'direct',
    'lead_campaign': getUTMParameter('utm_campaign') || 'none',
    'lead_quality_tier': calculateQualityTier(formData),
    'form_name': formData.form_name,
    'transaction_id': formData.lead_id  // For deduplication
  });
}

// Track form field interactions
function trackFormFieldInteraction(fieldName, action) {
  gtag('event', 'form_interaction', {
    'event_category': 'Form',
    'event_action': action,  // 'focus', 'blur', 'error'
    'event_label': fieldName,
    'form_name': 'lead_form'
  });
}
```

### 6.2 Session Recording Integration (Hotjar/FullStory)

```javascript
// Identify user in session recordings with UTM data
function identifyUserForRecording() {
  const utmData = {
    source: getUTMParameter('utm_source'),
    medium: getUTMParameter('utm_medium'),
    campaign: getUTMParameter('utm_campaign'),
    keyword: getUTMParameter('utm_term'),
    gclid: getUTMParameter('gclid'),
    fbclid: getUTMParameter('fbclid')
  };

  // Hotjar identify
  if (window.hj) {
    hj('identify', null, utmData);
  }

  // FullStory identify
  if (window.FS) {
    FS.identify(null, utmData);
  }
}

// Tag recording with ad campaign context
function tagRecordingWithCampaign(campaignName, adGroup, keyword) {
  if (window.hj) {
    hj('tagRecording', ['campaign:' + campaignName, 'keyword:' + keyword]);
  }
}
```

### 6.3 Call Tracking Integration (CallRail)

```python
# CallRail webhook handler for call leads
@router.post("/webhooks/callrail")
async def handle_callrail_webhook(request: Request):
    """
    Process incoming call leads from CallRail.
    Match to ad clicks via tracking number pool.
    """
    data = await request.json()

    call_data = {
        "call_id": data.get("id"),
        "caller_number": data.get("caller_phone_number"),
        "tracking_number": data.get("tracking_phone_number"),
        "duration_seconds": data.get("duration"),
        "call_type": data.get("call_type"),  # lead, not_lead, voicemail
        "recording_url": data.get("recording"),

        # Attribution data
        "gclid": data.get("gclid"),
        "utm_source": data.get("utm_source"),
        "utm_campaign": data.get("utm_campaign"),
        "utm_term": data.get("utm_term"),  # Keyword

        # Caller info
        "caller_city": data.get("caller_city"),
        "caller_state": data.get("caller_state"),
    }

    # Create lead in database
    lead = await create_call_lead(call_data)

    # Match to ad click
    if call_data.get("gclid"):
        await match_lead_to_google_click(lead["id"], call_data["gclid"])

    # Sync to HubSpot
    await sync_call_lead_to_hubspot(lead)

    return {"success": True, "lead_id": lead["id"]}
```

---

## Module 7: Lead Gen Metrics Calculations

### 7.1 Core Metrics Formulas

```python
def calculate_lead_metrics(
    ad_spend: float,
    leads: int,
    mqls: int,
    sqls: int,
    customers: int,
    revenue: float
) -> dict:
    """
    Calculate all lead gen metrics from raw data.
    All monetary values in dollars (not micros).
    """

    # Cost Per Lead (CPL)
    cpl = ad_spend / leads if leads > 0 else None

    # Cost Per MQL
    cost_per_mql = ad_spend / mqls if mqls > 0 else None

    # Cost Per SQL
    cost_per_sql = ad_spend / sqls if sqls > 0 else None

    # Customer Acquisition Cost (CAC)
    cac = ad_spend / customers if customers > 0 else None

    # Conversion Rates
    lead_to_mql_rate = (mqls / leads * 100) if leads > 0 else None
    mql_to_sql_rate = (sqls / mqls * 100) if mqls > 0 else None
    sql_to_customer_rate = (customers / sqls * 100) if sqls > 0 else None
    lead_to_customer_rate = (customers / leads * 100) if leads > 0 else None

    # Revenue Metrics
    avg_deal_value = revenue / customers if customers > 0 else None
    roas = revenue / ad_spend if ad_spend > 0 else None

    # LTV:CAC Ratio (assuming 3x multiplier for LTV estimation)
    estimated_ltv = avg_deal_value * 3 if avg_deal_value else None
    ltv_cac_ratio = estimated_ltv / cac if cac and estimated_ltv else None

    return {
        "cpl": round(cpl, 2) if cpl else None,
        "cost_per_mql": round(cost_per_mql, 2) if cost_per_mql else None,
        "cost_per_sql": round(cost_per_sql, 2) if cost_per_sql else None,
        "cac": round(cac, 2) if cac else None,
        "lead_to_mql_rate": round(lead_to_mql_rate, 1) if lead_to_mql_rate else None,
        "mql_to_sql_rate": round(mql_to_sql_rate, 1) if mql_to_sql_rate else None,
        "sql_to_customer_rate": round(sql_to_customer_rate, 1) if sql_to_customer_rate else None,
        "lead_to_customer_rate": round(lead_to_customer_rate, 2) if lead_to_customer_rate else None,
        "avg_deal_value": round(avg_deal_value, 2) if avg_deal_value else None,
        "roas": round(roas, 2) if roas else None,
        "ltv_cac_ratio": round(ltv_cac_ratio, 1) if ltv_cac_ratio else None
    }
```

### 7.2 Industry Benchmarks

| Industry | Avg CPL | Avg Cost/MQL | Avg Cost/SQL | MQL Rate | SQL Rate |
|----------|---------|--------------|--------------|----------|----------|
| B2B SaaS | $50-150 | $200-500 | $500-1,500 | 15-25% | 30-50% |
| Legal Services | $100-300 | $500-1,500 | $1,000-3,000 | 10-20% | 40-60% |
| Insurance | $25-75 | $150-400 | $400-1,000 | 15-30% | 35-55% |
| Real Estate | $20-50 | $100-300 | $300-800 | 20-35% | 30-50% |
| Education | $30-80 | $150-350 | $350-900 | 15-25% | 35-50% |
| Financial Services | $50-150 | $250-600 | $600-1,500 | 12-22% | 40-60% |
| Healthcare | $40-100 | $200-500 | $500-1,200 | 15-25% | 35-55% |

### 7.3 Lead Quality Scoring

```python
def calculate_lead_quality_score(lead_data: dict) -> dict:
    """
    Score leads 0-100 based on multiple factors.
    Used for prioritization and optimization.
    """
    score = 0
    factors = {}

    # Email domain (25 points max)
    email = lead_data.get("email", "")
    if is_business_email(email):
        score += 25
        factors["email_type"] = "business"
    elif is_edu_email(email):
        score += 15
        factors["email_type"] = "education"
    else:
        score += 5
        factors["email_type"] = "personal"

    # Company size (20 points max)
    company_size = lead_data.get("company_size", "")
    size_scores = {
        "1-10": 5,
        "11-50": 10,
        "51-200": 15,
        "201-500": 18,
        "501-1000": 20,
        "1000+": 20
    }
    score += size_scores.get(company_size, 0)
    factors["company_size_score"] = size_scores.get(company_size, 0)

    # Job title (20 points max)
    title = lead_data.get("job_title", "").lower()
    if any(t in title for t in ["ceo", "cfo", "cto", "owner", "president"]):
        score += 20
        factors["title_level"] = "c-suite"
    elif any(t in title for t in ["vp", "director", "head of"]):
        score += 15
        factors["title_level"] = "director"
    elif any(t in title for t in ["manager", "lead", "senior"]):
        score += 10
        factors["title_level"] = "manager"
    else:
        score += 5
        factors["title_level"] = "individual"

    # Budget indication (20 points max)
    budget = lead_data.get("budget", "")
    if budget and budget != "not_sure":
        score += 15
        factors["budget_indicated"] = True
        if budget in ["50k+", "100k+", "250k+"]:
            score += 5

    # Engagement signals (15 points max)
    if lead_data.get("demo_requested"):
        score += 10
        factors["demo_requested"] = True
    if lead_data.get("pricing_viewed"):
        score += 5
        factors["pricing_viewed"] = True

    # Determine tier
    if score >= 70:
        tier = "hot"
    elif score >= 50:
        tier = "warm"
    else:
        tier = "cold"

    return {
        "score": score,
        "tier": tier,
        "factors": factors
    }
```

---

## Module 8: HubSpot CRM Integration

### 8.1 UTM Parameter → HubSpot Property Mapping

| UTM Parameter | HubSpot Property | Property Type |
|---------------|------------------|---------------|
| `utm_source` | `hs_analytics_source` | Single-line text |
| `utm_medium` | `hs_analytics_medium` | Single-line text |
| `utm_campaign` | `hs_analytics_campaign` | Single-line text |
| `utm_term` | `ad_keyword` (custom) | Single-line text |
| `utm_content` | `ad_content` (custom) | Single-line text |
| `gclid` | `google_click_id` (custom) | Single-line text |
| `fbclid` | `facebook_click_id` (custom) | Single-line text |

### 8.2 Lifecycle Stage Mapping

```
Ad Platform Event          →    HubSpot Lifecycle Stage
───────────────────────────────────────────────────────
Form Submission            →    Lead
Content Download           →    Lead
Demo Request               →    Marketing Qualified Lead (MQL)
Pricing Page + Form        →    Marketing Qualified Lead (MQL)
Sales Accepted             →    Sales Qualified Lead (SQL)
Proposal Sent              →    Opportunity
Closed Won                 →    Customer
Closed Lost                →    Other
```

### 8.3 HubSpot API Integration Code

```python
from hubspot import HubSpot
from hubspot.crm.contacts import SimplePublicObjectInput

class HubSpotLeadSync:
    """
    Sync ad platform leads to HubSpot CRM.
    """

    def __init__(self, access_token: str):
        self.client = HubSpot(access_token=access_token)

    async def create_lead_from_ad_conversion(
        self,
        lead_data: dict,
        attribution_data: dict
    ) -> dict:
        """
        Create a HubSpot contact from an ad platform conversion.
        """
        # Map lead data to HubSpot properties
        properties = {
            "email": lead_data.get("email"),
            "firstname": lead_data.get("first_name"),
            "lastname": lead_data.get("last_name"),
            "phone": lead_data.get("phone"),
            "company": lead_data.get("company"),
            "jobtitle": lead_data.get("job_title"),

            # Custom properties (must be created in HubSpot first)
            "lead_source_detail": attribution_data.get("utm_source"),
            "ad_campaign": attribution_data.get("utm_campaign"),
            "ad_keyword": attribution_data.get("utm_term"),
            "google_click_id": attribution_data.get("gclid"),
            "facebook_click_id": attribution_data.get("fbclid"),
            "ad_cost": attribution_data.get("cost_micros", 0) / 1_000_000,

            # Lead scoring inputs
            "company_size": lead_data.get("company_size"),
            "budget_range": lead_data.get("budget"),
            "lead_quality_score": lead_data.get("quality_score"),

            # Lifecycle
            "lifecyclestage": "lead",
            "hs_lead_status": "NEW"
        }

        # Remove None values
        properties = {k: v for k, v in properties.items() if v is not None}

        try:
            contact = self.client.crm.contacts.basic_api.create(
                SimplePublicObjectInput(properties=properties)
            )
            return {"success": True, "contact_id": contact.id}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def update_lead_lifecycle(
        self,
        contact_id: str,
        new_stage: str,
        reason: str = None
    ) -> dict:
        """
        Update contact lifecycle stage (e.g., Lead → MQL → SQL).
        """
        properties = {
            "lifecyclestage": new_stage.lower().replace(" ", ""),
        }

        if new_stage.lower() == "marketingqualifiedlead":
            properties["hs_lead_status"] = "QUALIFIED"
        elif new_stage.lower() == "salesqualifiedlead":
            properties["hs_lead_status"] = "SALES_QUALIFIED"

        if reason:
            properties["lead_stage_change_reason"] = reason

        try:
            self.client.crm.contacts.basic_api.update(
                contact_id,
                SimplePublicObjectInput(properties=properties)
            )
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def create_deal_from_sql(
        self,
        contact_id: str,
        deal_data: dict
    ) -> dict:
        """
        Create a deal when lead becomes SQL.
        """
        deal_properties = {
            "dealname": f"{deal_data.get('company', 'New')} - {deal_data.get('product', 'Opportunity')}",
            "dealstage": "qualifiedtobuy",
            "amount": deal_data.get("estimated_value", 0),
            "pipeline": "default",

            # Attribution carried from contact
            "ad_campaign_source": deal_data.get("ad_campaign"),
            "original_ad_cost": deal_data.get("ad_cost"),
        }

        try:
            deal = self.client.crm.deals.basic_api.create(
                SimplePublicObjectInput(properties=deal_properties)
            )

            # Associate deal with contact
            self.client.crm.deals.associations_api.create(
                deal.id,
                "contacts",
                contact_id,
                [{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 3}]
            )

            return {"success": True, "deal_id": deal.id}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_lead_metrics_by_source(
        self,
        date_from: str,
        date_to: str
    ) -> dict:
        """
        Pull lead metrics grouped by ad source for CPL analysis.
        """
        # Use HubSpot search API to aggregate
        search_request = {
            "filterGroups": [{
                "filters": [
                    {
                        "propertyName": "createdate",
                        "operator": "BETWEEN",
                        "value": date_from,
                        "highValue": date_to
                    }
                ]
            }],
            "properties": [
                "email", "lifecyclestage", "lead_source_detail",
                "ad_campaign", "ad_cost", "lead_quality_score"
            ],
            "limit": 100
        }

        contacts = self.client.crm.contacts.search_api.do_search(search_request)

        # Aggregate by source
        metrics_by_source = {}
        for contact in contacts.results:
            source = contact.properties.get("lead_source_detail", "direct")
            if source not in metrics_by_source:
                metrics_by_source[source] = {
                    "leads": 0,
                    "mqls": 0,
                    "sqls": 0,
                    "customers": 0,
                    "total_ad_cost": 0
                }

            metrics_by_source[source]["leads"] += 1
            metrics_by_source[source]["total_ad_cost"] += float(
                contact.properties.get("ad_cost", 0) or 0
            )

            stage = contact.properties.get("lifecyclestage", "")
            if stage == "marketingqualifiedlead":
                metrics_by_source[source]["mqls"] += 1
            elif stage == "salesqualifiedlead":
                metrics_by_source[source]["sqls"] += 1
            elif stage == "customer":
                metrics_by_source[source]["customers"] += 1

        # Calculate CPL for each source
        for source, metrics in metrics_by_source.items():
            if metrics["leads"] > 0:
                metrics["cpl"] = round(metrics["total_ad_cost"] / metrics["leads"], 2)
            if metrics["mqls"] > 0:
                metrics["cost_per_mql"] = round(metrics["total_ad_cost"] / metrics["mqls"], 2)

        return metrics_by_source
```

### 8.4 Cost-per-Stage Calculation

```sql
-- HubSpot + AdsMaster combined query for true cost per stage
WITH hubspot_leads AS (
  SELECT
    h.contact_id,
    h.email,
    h.lifecycle_stage,
    h.lead_source,
    h.ad_campaign,
    h.google_click_id,
    h.facebook_click_id,
    h.created_at
  FROM hubspot_contacts_sync h
  WHERE h.created_at >= NOW() - INTERVAL '30 days'
),
ad_costs AS (
  SELECT
    COALESCE(gclid, fbclid) as click_id,
    SUM(cost_micros) / 1000000.0 as cost
  FROM ad_clicks
  WHERE clicked_at >= NOW() - INTERVAL '30 days'
  GROUP BY COALESCE(gclid, fbclid)
)
SELECT
  hl.lead_source,
  hl.ad_campaign,
  COUNT(*) as total_leads,
  SUM(CASE WHEN hl.lifecycle_stage = 'lead' THEN 1 ELSE 0 END) as leads,
  SUM(CASE WHEN hl.lifecycle_stage = 'marketingqualifiedlead' THEN 1 ELSE 0 END) as mqls,
  SUM(CASE WHEN hl.lifecycle_stage = 'salesqualifiedlead' THEN 1 ELSE 0 END) as sqls,
  SUM(CASE WHEN hl.lifecycle_stage = 'customer' THEN 1 ELSE 0 END) as customers,
  SUM(COALESCE(ac.cost, 0)) as total_spend,
  ROUND(SUM(COALESCE(ac.cost, 0)) / NULLIF(COUNT(*), 0), 2) as cpl,
  ROUND(SUM(COALESCE(ac.cost, 0)) / NULLIF(
    SUM(CASE WHEN hl.lifecycle_stage = 'marketingqualifiedlead' THEN 1 ELSE 0 END), 0
  ), 2) as cost_per_mql,
  ROUND(SUM(COALESCE(ac.cost, 0)) / NULLIF(
    SUM(CASE WHEN hl.lifecycle_stage = 'customer' THEN 1 ELSE 0 END), 0
  ), 2) as cac
FROM hubspot_leads hl
LEFT JOIN ad_costs ac ON ac.click_id IN (hl.google_click_id, hl.facebook_click_id)
GROUP BY hl.lead_source, hl.ad_campaign
ORDER BY total_spend DESC;
```

---

## Module 9: Implementation Checklist

### Phase 1: Core Lead Tracking (Week 1-2)

- [ ] Configure Google Ads conversion actions for each lead type
  - [ ] Form submissions (primary)
  - [ ] Phone calls (if applicable)
  - [ ] Chat leads (if applicable)
- [ ] Configure Meta conversion events
  - [ ] Lead form submissions
  - [ ] Instant form completions
  - [ ] Conversions API setup
- [ ] Implement UTM parameter tracking on all landing pages
- [ ] Set up GCLID/FBCLID capture and storage
- [ ] Create `lead_attribution_touchpoints` table

### Phase 2: CRM Integration (Week 2-3)

- [ ] Create HubSpot custom properties
  - [ ] `google_click_id`
  - [ ] `facebook_click_id`
  - [ ] `ad_campaign`
  - [ ] `ad_keyword`
  - [ ] `ad_cost`
  - [ ] `lead_quality_score`
- [ ] Build HubSpot webhook receiver for lifecycle changes
- [ ] Implement two-way sync:
  - [ ] Ad conversion → HubSpot contact
  - [ ] HubSpot lifecycle change → AdsMaster
- [ ] Create cost-per-stage dashboard

### Phase 3: Analytics Integration (Week 3-4)

- [ ] Configure GA4 custom dimensions
- [ ] Set up GA4 → BigQuery export (for advanced analysis)
- [ ] Integrate Hotjar/FullStory form analytics (if used)
- [ ] Configure CallRail webhook (if using call tracking)
- [ ] Build combined attribution dashboard

### Phase 4: AI Recommendations (Week 4-5)

- [ ] Train lead-gen-specific rules
  - [ ] Wasting keyword detection (CPL focus)
  - [ ] Form abandonment correlation
  - [ ] Budget reallocation suggestions
- [ ] Implement lead quality scoring model
- [ ] Build automated alerts for:
  - [ ] CPL spike (>25% increase)
  - [ ] MQL rate drop (>20% decrease)
  - [ ] Form abandonment spike

### Phase 5: Reporting (Week 5-6)

- [ ] Create lead gen dashboard widgets
  - [ ] CPL by source/campaign
  - [ ] Funnel visualization (Lead → MQL → SQL → Customer)
  - [ ] Lead quality distribution
  - [ ] Auction insights (competitor view)
- [ ] Build automated weekly report
- [ ] Set up Slack/email alerts for key metrics

---

## Quick Reference: Lead Gen Keywords Intent Mapping

```
HIGH INTENT (prioritize, bid aggressively):
─────────────────────────────────────────
"get quote"
"request demo"
"pricing"
"buy [product]"
"[product] cost"
"hire [service]"
"[service] near me"
"schedule consultation"
"contact [company type]"
"[product] trial"

MEDIUM INTENT (test, monitor closely):
─────────────────────────────────────────
"best [product]"
"[product] vs [competitor]"
"[product] reviews"
"compare [products]"
"top [service providers]"
"[product] alternatives"
"[industry] software"

LOW INTENT (limit spend, use for remarketing):
─────────────────────────────────────────
"what is [product]"
"how to [task]"
"[product] definition"
"[topic] guide"
"[topic] tutorial"
"free [product]"
"[product] DIY"
"[product] template"
```

---

## Summary

This framework provides:

1. **API Reference** - All endpoints for lead gen data across Google, Meta, and internal systems
2. **Use Cases** - Practical scenarios for cross-platform optimization and CPL reduction
3. **Decision Frameworks** - When to pause vs. optimize keywords/audiences
4. **Verification Methods** - How to validate attribution and investigate funnel drops
5. **Attribution** - Multi-touch models and touchpoint tracking
6. **Website Integration** - GA4, session recording, call tracking setup
7. **Metrics** - Formulas and benchmarks for CPL, Cost-per-MQL, etc.
8. **HubSpot Integration** - Complete CRM sync with lifecycle tracking
9. **Implementation Checklist** - 6-week rollout plan

---

**Version:** 1.0
**Last Updated:** 2024-01-15
**Status:** Planning Complete
**Next Step:** Implementation Phase 1 (Core Lead Tracking)
