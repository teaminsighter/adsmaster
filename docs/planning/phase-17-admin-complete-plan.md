# Phase 17: Complete Admin Panel - Full Specification

## Overview

The AdsMaster Admin Panel is the **mission control center** for managing the entire SaaS platform. This document provides complete specifications for all 10 navigation tabs, settings, and admin profile.

---

## Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔷 AdsMaster Admin    │  🔍 Global Search...  │  🔔 3  │  Admin ▼  │ ☀️ │
├─────────────────────────┼───────────────────────────────────────────────┤
│                         │                                               │
│  📊 Dashboard           │                                               │
│  👥 Users               │                                               │
│  🏢 Organizations       │                                               │
│  📈 Marketing           │              Main Content Area                │
│  💳 Billing             │                                               │
│  📱 Ad Accounts         │                                               │
│  🤖 AI & ML             │                                               │
│  🔌 API Monitor         │                                               │
│  📉 Analytics           │                                               │
│  ⚙️ System              │                                               │
│  ─────────────────────  │                                               │
│  ⚙️ Settings            │                                               │
│  👤 Profile             │                                               │
│                         │                                               │
├─────────────────────────┴───────────────────────────────────────────────┤
│  © AdsMaster Admin v1.0  •  Docs  •  API Status: 🟢  •  Support         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tab 1: Dashboard

**Route:** `/admin/dashboard`

### 1.1 Top Metrics Row (6 cards)

| Metric | Value | Subtext | Icon |
|--------|-------|---------|------|
| Total Users | 1,234 | +47 this week | 👥 |
| Active Users (30d) | 892 | 72% of total | 📊 |
| Total Organizations | 89 | +5 this week | 🏢 |
| MRR | $12,450 | +8.2% vs last month | 💰 |
| Ad Accounts | 156 | 12 need attention | 📱 |
| AI Cost Today | $12.45 | 125K tokens | 🤖 |

### 1.2 Platform Health Status (Real-time)

| Component | Status | Details |
|-----------|--------|---------|
| API Server | 🟢 Healthy | 45ms avg response |
| Database | 🟢 Connected | 15/100 connections |
| Redis Cache | 🟢 Active | 95% hit rate |
| Google Ads API | 🟢 Healthy | 120ms latency |
| Meta Ads API | 🟡 Degraded | 350ms latency |
| Background Workers | 🟢 Running | 3 jobs queued |
| Stripe | 🟢 Connected | Last webhook 2m ago |

### 1.3 Two-Column Layout

**Left Column: Recent Activity Feed**
- User signups (with auth method: Gmail, email, etc.)
- Subscription changes (upgrades, downgrades, cancellations)
- Failed payments
- Admin actions
- System alerts
- Token expirations

**Right Column: Quick Stats & Actions**
- Today's signups (hourly chart)
- Conversion rate (visit → signup → paid)
- Active sessions now
- Quick action buttons:
  - Enable Maintenance Mode
  - Send Announcement
  - Clear Cache
  - Export Daily Report

### 1.4 Alerts Banner
- Critical alerts displayed at top (e.g., "5 ad accounts have expired tokens")
- Dismissible with "View All" link

---

## Tab 2: Users

**Route:** `/admin/users`

### 2.1 Users List Page

**Toolbar:**
- Search box (email, name)
- Filters: Status (Active/Suspended/All), Plan, Date Range, Has Ad Accounts
- Sort: Newest, Oldest, Last Active, Name
- Bulk Actions: Send Email, Suspend, Export CSV

**Table Columns:**
| Column | Description |
|--------|-------------|
| User | Avatar + Name + Email |
| Auth Method | Badge: Google, Email, GitHub |
| Organization | Link to org |
| Plan | Badge: Free, Starter, Growth, Agency, Enterprise |
| Status | Active / Suspended / Pending |
| Ad Accounts | Count |
| Last Active | Relative time |
| Created | Date |
| Actions | Dropdown menu |

**Row Actions Menu:**
- View Details
- Impersonate
- Send Password Reset
- Suspend / Activate
- Delete Account

### 2.2 User Detail Page (`/admin/users/[id]`)

**Header:**
- Avatar (large)
- Name, Email
- Status badge
- Auth method badge
- Quick actions: Impersonate, Suspend, Reset Password

**Tabs:**
1. **Overview**
   - User info (editable): Name, Email, Phone
   - Created date, Last login
   - Email verified status
   - Total API calls, AI messages used

2. **Organizations**
   - List of org memberships
   - Role in each org (Owner, Admin, Member)
   - Remove from org action

3. **Ad Accounts**
   - Accounts user has access to
   - Platform, Name, Status, Last Sync
   - Token health

4. **Activity Log**
   - Recent actions with timestamps
   - Logins (IP, device, location)
   - Recommendations applied
   - Campaigns modified

5. **Billing**
   - Subscription status
   - Invoices
   - Payment method

6. **Admin Notes**
   - Internal notes by admin team
   - Add note button

### 2.3 User Segments (Quick Filters)

| Segment | Filter |
|---------|--------|
| Power Users | >100 API calls/day |
| At Risk | No login 14+ days |
| Trial Expiring | Trial ends in 3 days |
| High Value | Agency/Enterprise plans |
| New This Week | Created last 7 days |
| Gmail Signups | Auth method = Google |
| No Ad Accounts | 0 connected accounts |

---

## Tab 3: Organizations

**Route:** `/admin/organizations`

### 3.1 Organizations List Page

**Table Columns:**
| Column | Description |
|--------|-------------|
| Organization | Name + Slug |
| Owner | Email of owner |
| Plan | Badge with color |
| Status | Active / Suspended / Past Due |
| Members | Count |
| Ad Accounts | Count |
| MRR | Dollar amount |
| Created | Date |
| Actions | Dropdown |

**Filters:**
- Search (name, owner email)
- Plan type
- Billing status
- Member count range
- MRR range

### 3.2 Organization Detail Page (`/admin/organizations/[id]`)

**Header:**
- Org name (editable)
- Plan badge + Change Plan button
- Status
- MRR contribution
- Quick actions

**Tabs:**
1. **Overview**
   - Organization info
   - Created date
   - Total lifetime value
   - Total ad spend managed

2. **Members**
   - Table: Name, Email, Role, Last Active, Joined
   - Change role action
   - Remove member action
   - Invite member (as admin)

3. **Ad Accounts**
   - All connected accounts
   - Platform, Name, Status, Token Health
   - Last sync, 30-day spend
   - Force sync action
   - Disconnect action

4. **Subscription**
   - Current plan details
   - Billing cycle (monthly/yearly)
   - Next invoice date
   - Payment method
   - Actions: Upgrade, Downgrade, Cancel, Extend Trial

5. **Invoices**
   - All invoices for this org
   - Status, Amount, Date
   - Download PDF, Resend, Refund

6. **Usage**
   - API calls (this month vs limit)
   - AI tokens (this month vs limit)
   - Recommendations generated
   - Automations run

7. **Admin Notes**
   - Internal notes

### 3.3 Org Actions
- Suspend Organization
- Transfer Ownership
- Merge with Another Org
- Delete Organization
- Add Credit/Refund
- Apply Coupon

---

## Tab 4: Marketing

**Route:** `/admin/marketing`

### 4.1 Marketing Overview (`/admin/marketing`)

**Top Metrics:**
| Metric | Value | Trend |
|--------|-------|-------|
| Landing Page Visits (30d) | 15,234 | +12% |
| Unique Visitors | 8,456 | +8% |
| Signups | 234 | +15% |
| Signup Rate | 2.8% | +0.3% |
| Paid Conversions | 47 | +20% |
| Paid Rate (of signups) | 20% | +2% |

**Charts:**
- Daily visitors (30-day trend)
- Signup conversion funnel (visual)
- Traffic sources pie chart
- Signup methods pie chart

### 4.2 Traffic Sources (`/admin/marketing/traffic`)

**Table:**
| Source | Visitors | Signups | Conv Rate | Paid | Cost/Signup |
|--------|----------|---------|-----------|------|-------------|
| Google Organic | 5,234 | 89 | 1.7% | 18 | - |
| Google Ads | 3,456 | 67 | 1.9% | 15 | $12.34 |
| Facebook Ads | 2,123 | 45 | 2.1% | 9 | $18.50 |
| Direct | 1,890 | 23 | 1.2% | 4 | - |
| Referral | 876 | 10 | 1.1% | 1 | - |

**Filters:** Date range, Source type

### 4.3 UTM Campaigns (`/admin/marketing/campaigns`)

**Table:**
| Campaign | Source | Medium | Visits | Signups | Conv | Cost | CPA |
|----------|--------|--------|--------|---------|------|------|-----|
| spring_launch | google | cpc | 2,345 | 45 | 1.9% | $500 | $11 |
| retargeting_q1 | facebook | paid | 1,234 | 23 | 1.9% | $300 | $13 |
| newsletter_mar | email | email | 890 | 34 | 3.8% | $0 | $0 |

**Actions:** Add campaign tracking, Export

### 4.4 Conversion Funnel (`/admin/marketing/funnel`)

**Visual Funnel:**
```
Landing Page Visit    ████████████████████ 15,234 (100%)
       ↓
View Pricing          ████████████░░░░░░░░  8,456 (55%)
       ↓
Click Signup          ██████░░░░░░░░░░░░░░  3,234 (21%)
       ↓
Complete Signup       ███░░░░░░░░░░░░░░░░░    234 (1.5%)
       ↓
Connect Ad Account    ██░░░░░░░░░░░░░░░░░░    156 (1.0%)
       ↓
First Recommendation  █░░░░░░░░░░░░░░░░░░░     89 (0.6%)
       ↓
First Payment         █░░░░░░░░░░░░░░░░░░░     47 (0.3%)
```

**Drop-off Analysis:**
- Biggest drop: Signup → Connect Account (33% drop)
- Recommendation: Simplify OAuth flow

### 4.5 Signup Methods (`/admin/marketing/signups`)

**Breakdown:**
| Method | Count | % | Conv to Paid |
|--------|-------|---|--------------|
| Google (Gmail) | 145 | 62% | 22% |
| Email | 67 | 29% | 18% |
| GitHub | 15 | 6% | 25% |
| Microsoft | 7 | 3% | 14% |

**Chart:** Trend over time by method

### 4.6 Subscribers (`/admin/marketing/subscribers`)

**Newsletter/Waitlist Subscribers:**
| Email | Source | Status | Subscribed | Converted |
|-------|--------|--------|------------|-----------|
| john@... | landing_page | Active | Mar 15 | Yes (Mar 20) |
| jane@... | blog | Active | Mar 12 | No |
| bob@... | exit_popup | Unsubscribed | Mar 10 | No |

**Actions:** Export, Send Email, Delete

### 4.7 Geographic Analytics (`/admin/marketing/geo`)

**Map visualization + Table:**
| Country | Visitors | Signups | Conv Rate | Revenue |
|---------|----------|---------|-----------|---------|
| USA | 8,234 | 156 | 1.9% | $8,500 |
| UK | 2,345 | 34 | 1.4% | $1,200 |
| Canada | 1,234 | 23 | 1.9% | $900 |
| Germany | 987 | 12 | 1.2% | $450 |

---

## Tab 5: Billing

**Route:** `/admin/billing`

### 5.1 Revenue Dashboard (`/admin/billing`)

**Top Metrics:**
| Metric | Value | Trend |
|--------|-------|-------|
| MRR | $12,450 | +8.2% |
| ARR | $149,400 | +8.2% |
| Total Revenue (LTV) | $87,230 | - |
| Active Subscriptions | 89 | +3 |
| Trialing | 12 | - |
| Past Due | 3 | -2 |
| Churn Rate | 2.4% | -0.3% |
| ARPU | $139.89 | +$5 |

**Charts:**
- MRR over 12 months (line chart)
- New vs Churned MRR (bar chart)
- Revenue by plan (pie chart)
- Cohort retention (heatmap)

### 5.2 Subscriptions (`/admin/billing/subscriptions`)

**Table:**
| Organization | Plan | Status | MRR | Billing | Next Invoice | Payment Method |
|--------------|------|--------|-----|---------|--------------|----------------|
| Acme Corp | Growth | Active | $149 | Monthly | Apr 15 | Visa ****4242 |
| Tech Inc | Agency | Active | $239 | Yearly | Dec 1 | Mastercard ****5555 |

**Filters:** Status, Plan, Billing cycle, Past due

**Row Actions:**
- View Details
- Change Plan
- Cancel
- Pause
- Extend Trial

### 5.3 Invoices (`/admin/billing/invoices`)

**Table:**
| Invoice # | Organization | Amount | Status | Date | Paid At |
|-----------|--------------|--------|--------|------|---------|
| INV-2024-125 | Acme Corp | $149.00 | Paid | Mar 15 | Mar 15 |
| INV-2024-124 | Tech Inc | $287.00 | Paid | Mar 12 | Mar 13 |
| INV-2024-123 | Local Shop | $49.00 | Open | Mar 10 | - |

**Filters:** Status (Paid, Open, Failed, Refunded)

**Row Actions:**
- View PDF
- Download
- Resend
- Refund (full/partial)
- Mark as Paid

### 5.4 Failed Payments (`/admin/billing/failed-payments`)

**Table:**
| Organization | Amount | Failure Reason | Retries | Last Retry | Next Retry |
|--------------|--------|----------------|---------|------------|------------|
| Local Shop | $49.00 | Card declined | 2 | Mar 12 | Mar 15 |

**Row Actions:**
- Retry Now
- Contact Customer
- Cancel Subscription
- Write Off

### 5.5 Coupons (`/admin/billing/coupons`)

**Table:**
| Code | Name | Type | Value | Used | Max | Expires | Status |
|------|------|------|-------|------|-----|---------|--------|
| WELCOME20 | Welcome | % | 20% | 234 | 1000 | Dec 31 | Active |
| ANNUAL50 | Annual | % | 50% | 89 | 500 | Jun 30 | Active |
| AGENCY100 | Agency Credit | $ | $100 | 45 | 100 | Apr 30 | Active |

**Actions:**
- Create Coupon
- Deactivate
- View Redemptions

### 5.6 Plans (`/admin/billing/plans`)

**Editable Plan Cards:**
| Plan | Monthly | Yearly | Ad Accounts | AI Messages | Status |
|------|---------|--------|-------------|-------------|--------|
| Free | $0 | $0 | 1 | 50 | Active |
| Starter | $49 | $470 | 2 | 200 | Active |
| Growth | $149 | $1,430 | 5 | 1,000 | Active |
| Agency | $299 | $2,870 | 25 | 5,000 | Active |
| Enterprise | Custom | Custom | Unlimited | Unlimited | Active |

**Actions:**
- Edit pricing
- Edit limits
- Enable/Disable
- Create custom plan

---

## Tab 6: Ad Accounts

**Route:** `/admin/ad-accounts`

### 6.1 Ad Accounts List (`/admin/ad-accounts`)

**Top Metrics:**
| Metric | Value |
|--------|-------|
| Total Accounts | 156 |
| Healthy (valid tokens) | 136 (87%) |
| Expiring Soon | 12 |
| Expired | 5 |
| Needs Attention | 17 |

**Table:**
| Account | Platform | Organization | Status | Token | Last Sync | 30d Spend |
|---------|----------|--------------|--------|-------|-----------|-----------|
| Acme Google | Google | Acme Corp | Active | 🟢 Valid | 1h ago | $12,345 |
| Acme Meta | Meta | Acme Corp | Active | 🟡 Expiring | 2h ago | $5,678 |
| Tech Google | Google | Tech Inc | Active | 🔴 Expired | 3d ago | $0 |

**Filters:** Platform, Status, Token Status, Organization, Spend Range

**Row Actions:**
- View Details
- Force Sync
- Send Token Reminder
- Disconnect

### 6.2 Token Health (`/admin/ad-accounts/token-health`)

**Dashboard:**
- Pie chart: Valid vs Expiring vs Expired
- By platform breakdown
- Days until next expiration

**Expiring Soon Table (next 7 days):**
| Account | Organization | Platform | Expires In | Owner Email |
|---------|--------------|----------|------------|-------------|
| Acme Meta | Acme Corp | Meta | 5 days | john@acme.com |

**Actions:** Bulk send reminders

### 6.3 Sync Status (`/admin/ad-accounts/sync`)

**Real-time Status:**
- Jobs in queue: 3
- Currently syncing: 2
- Avg sync duration: 45s
- Failed today: 1

**Recent Syncs Table:**
| Account | Started | Duration | Status | Records |
|---------|---------|----------|--------|---------|
| Acme Google | 10:45 | 32s | Success | 1,250 |
| Tech Meta | 10:30 | 48s | Success | 890 |
| Local Shop | 10:15 | 12s | Failed | 0 |

**Actions:** Force full sync, Retry failed

### 6.4 Account Detail (`/admin/ad-accounts/[id]`)

**Header:**
- Account name, External ID
- Platform badge
- Organization link
- Token status

**Info:**
- Currency, Timezone
- Created date
- Last sync
- Total campaigns

**Sync History Table**

**Error Log** (if any)

**Actions:**
- Force Sync
- Disconnect
- View in Platform (external link)

---

## Tab 7: AI & ML

**Route:** `/admin/ai`

### 7.1 AI Overview (`/admin/ai`)

**Top Metrics:**
| Metric | Today | Week | Month |
|--------|-------|------|-------|
| AI Requests | 1,234 | 8,567 | 34,567 |
| Tokens Used | 125K | 890K | 3.2M |
| Cost | $12.45 | $89.50 | $345.00 |
| Avg Latency | 450ms | 480ms | 465ms |
| Error Rate | 0.5% | 0.8% | 0.6% |

**By Provider:**
| Provider | Requests | Tokens | Cost | Latency |
|----------|----------|--------|------|---------|
| Gemini | 890 | 89K | $8.90 | 420ms |
| OpenAI | 234 | 28K | $2.80 | 380ms |
| Anthropic | 110 | 8K | $0.75 | 520ms |

**Charts:**
- Daily cost trend
- Requests by feature (chat, recommendations, forecasting)
- Provider distribution

### 7.2 Model Configuration (`/admin/ai/models`)

**Model Cards (per feature):**

| Feature | Provider | Model | Temperature | Max Tokens | Status |
|---------|----------|-------|-------------|------------|--------|
| AI Chat | Gemini | gemini-1.5-pro | 0.7 | 2048 | Active |
| Recommendations | Gemini | gemini-1.5-flash | 0.3 | 1024 | Active |
| Forecasting | OpenAI | gpt-4o | 0.2 | 512 | Active |
| Audience Builder | Anthropic | claude-3-sonnet | 0.5 | 1024 | Beta |

**Edit Model Config:**
- Select provider
- Select model
- Set temperature (slider 0-1)
- Set max tokens
- Set fallback provider/model
- Enable/disable

### 7.3 Prompts (`/admin/ai/prompts`)

**Prompt List:**
| Name | Feature | Version | Status | Usage | Last Updated |
|------|---------|---------|--------|-------|--------------|
| chat_system | AI Chat | v3 | Production | 12,345 | Mar 15 |
| recommendation_budget | Recommendations | v2 | Production | 5,678 | Mar 10 |
| forecast_intro | Forecasting | v1 | Production | 1,234 | Feb 28 |

**Prompt Editor:**
- Name, Feature
- System prompt (large textarea)
- User prompt template (with {{variables}})
- Version history
- Rollback button
- Test button (with sample input)
- Save as Draft / Publish

### 7.4 Recommendation Rules (`/admin/ai/rules`)

**Rules Table:**
| Rule | Type | Status | Priority | Confidence | Requires Approval |
|------|------|--------|----------|------------|-------------------|
| Pause Low QS Keywords | keyword_pause | Enabled | 80 | 0.85 | Yes |
| Budget Reallocation | budget_optimization | Enabled | 70 | 0.75 | Yes |
| Bid Adjustment | bid_adjustment | Enabled | 60 | 0.70 | No |
| Negative Keywords | keyword_negative | Disabled | 50 | 0.80 | Yes |

**Rule Editor:**
- Name, Description
- Rule type
- Thresholds (JSON editor or form):
  - min_spend: $100
  - min_days: 7
  - max_cpa_ratio: 2.0
  - min_impressions: 1000
- Min confidence score
- Requires approval toggle
- Applies to plans (checkboxes)
- Enable/disable

### 7.5 Cost Budgets (`/admin/ai/budgets`)

**Budget Cards:**
| Scope | Daily Budget | Daily Spent | Monthly Budget | Monthly Spent | Alert At |
|-------|--------------|-------------|----------------|---------------|----------|
| Platform Total | $50 | $12.45 | $1,500 | $345 | 80% |
| Chat Feature | $20 | $8.90 | $600 | $180 | 80% |
| Recommendations | $15 | $2.80 | $450 | $95 | 80% |

**Actions:**
- Edit budgets
- Set alert thresholds
- Configure action at limit (alert/throttle/block)

### 7.6 Testing Playground (`/admin/ai/testing`)

**Test Interface:**
- Select prompt
- Enter test input
- Select model
- Run test
- View response
- Save test case

---

## Tab 8: API Monitor

**Route:** `/admin/api-monitor`

### 8.1 API Overview (`/admin/api-monitor`)

**Status Cards:**
| Platform | Current Version | Our Adapter | Status | Next Sunset |
|----------|-----------------|-------------|--------|-------------|
| Google Ads | v24 | v23.1 | 🟡 Update Available | v22 on Jun 1 |
| Meta | v21.0 | v21 | 🟢 Current | v19 on Jul 1 |

**Alerts Banner:**
- "Google Ads API v24 released. Migration recommended within 60 days."
- "Meta API v19 sunset in 90 days."

**API Health:**
| Platform | Status | Latency | Error Rate (24h) | Quota Used |
|----------|--------|---------|------------------|------------|
| Google Ads | 🟢 Healthy | 120ms | 0.3% | 45% |
| Meta | 🟢 Healthy | 95ms | 0.1% | 32% |
| Stripe | 🟢 Healthy | 80ms | 0.0% | N/A |

### 8.2 Changelog (`/admin/api-monitor/changelog`)

**Table:**
| Date | Platform | Version | Change Type | Title | Migration Status |
|------|----------|---------|-------------|-------|------------------|
| Mar 15 | Google | v24 | New Feature | PMax Asset Generation | Not Started |
| Mar 10 | Google | v23.1 | Enhancement | Benchmark Metrics | Completed |
| Mar 1 | Meta | v21 | Deprecation | Legacy Audience API | In Progress |

**Filters:** Platform, Change Type, Status

**Detail View:**
- Full description
- Affected endpoints
- Migration notes
- Status updates

### 8.3 Expenses (`/admin/api-monitor/expenses`)

**Cost Breakdown:**
| Platform | Requests | Success | Errors | Quota Units | Est. Cost |
|----------|----------|---------|--------|-------------|-----------|
| Google Ads | 45,234 | 45,100 | 134 | 890,000 | $0 (free tier) |
| Meta | 23,456 | 23,400 | 56 | N/A | $0 |

**Charts:**
- Daily API calls trend
- Error rate trend
- Quota usage trend

**By Endpoint (top 20):**
| Endpoint | Calls | Avg Latency | Errors |
|----------|-------|-------------|--------|
| /campaigns | 12,345 | 85ms | 12 |
| /metrics | 8,901 | 120ms | 5 |
| /keywords | 5,678 | 95ms | 8 |

### 8.4 Alerts (`/admin/api-monitor/alerts`)

**Alert List:**
| Severity | Type | Title | Created | Status |
|----------|------|-------|---------|--------|
| 🔴 Critical | Version Sunset | Google Ads v22 EOL in 30 days | Mar 1 | Open |
| 🟡 Warning | Error Spike | Meta API error rate > 5% | Mar 15 | Acknowledged |
| 🟢 Info | New Version | Google Ads v24 released | Mar 15 | Resolved |

**Actions:** Acknowledge, Resolve, Snooze

### 8.5 Adapters (`/admin/api-monitor/adapters`)

**Adapter Status:**
| Platform | Adapters Available | Production | Feature Flags |
|----------|-------------------|------------|---------------|
| Google Ads | v23, v23.1, v24 | v23.1 | v24 on 5% of orgs |
| Meta | v20, v21 | v21 | None |

**Actions:**
- Set production adapter
- Configure feature flag rollout (percentage)
- Enable for specific orgs

---

## Tab 9: Analytics

**Route:** `/admin/analytics`

### 9.1 Analytics Overview (`/admin/analytics`)

**User Analytics:**
- DAU / WAU / MAU
- User growth trend
- Retention rate
- Session duration distribution

**Charts:**
- Active users (30-day trend)
- Signup trend
- Feature adoption rates

### 9.2 User Analytics (`/admin/analytics/users`)

**Cohort Retention Heatmap:**
```
        Week 1  Week 2  Week 3  Week 4
Jan     100%    65%     45%     38%
Feb     100%    68%     48%     42%
Mar     100%    72%     52%     -
```

**Funnel:**
- Signup → Connect Account → First Recommendation → Paid

**User Segments:**
- New vs Returning
- By plan
- By auth method

### 9.3 Page Analytics (`/admin/analytics/pages`)

**Top Pages:**
| Page | Views | Unique | Avg Time | Bounce |
|------|-------|--------|----------|--------|
| /dashboard | 12,345 | 4,567 | 5:23 | 12% |
| /campaigns | 8,901 | 3,456 | 3:45 | 18% |
| /recommendations | 5,678 | 2,345 | 4:12 | 15% |

**User Flow:** (Sankey diagram)

### 9.4 API Analytics (`/admin/analytics/api`)

**Metrics:**
- Total requests (by period)
- Avg response time
- Error rate
- P95/P99 latency

**By Endpoint:**
- Top 20 endpoints by volume
- Slowest endpoints
- Highest error rate

### 9.5 Business Analytics (`/admin/analytics/business`)

**Revenue Metrics:**
- Revenue by plan
- Upgrade/downgrade trends
- LTV by cohort
- CAC (if tracked)

**Geographic:**
- Users by country
- Revenue by country
- Conversion by country

**Device/Browser:**
- Desktop vs Mobile vs Tablet
- Browser breakdown
- OS breakdown

### 9.6 Reports (`/admin/analytics/reports`)

**Scheduled Reports:**
| Report | Frequency | Recipients | Last Sent |
|--------|-----------|------------|-----------|
| Daily Summary | Daily | admin@adsmaster.io | Today 6am |
| Weekly Metrics | Weekly | team@adsmaster.io | Sunday |
| Monthly Revenue | Monthly | finance@adsmaster.io | Mar 1 |

**Actions:**
- Create report
- Edit schedule
- Add recipients
- Run now

---

## Tab 10: System

**Route:** `/admin/system`

### 10.1 System Overview (`/admin/system`)

**Quick Actions:**
- Maintenance Mode: Toggle switch
- Clear All Cache: Button
- Force Full Sync: Button
- Send Test Email: Button

**System Status:**
- API uptime (30 days)
- Database size
- Redis memory
- Worker status

### 10.2 Feature Flags (`/admin/system/features`)

**Feature Flag Cards:**
| Feature | Status | Rollout | Plans | Updated |
|---------|--------|---------|-------|---------|
| AI Chat | 🟢 Enabled | 100% | All | Mar 1 |
| Recommendations | 🟢 Enabled | 100% | All | Mar 1 |
| Forecasting | 🟢 Enabled | 100% | Growth+ | Mar 5 |
| Automations | 🟡 Beta | 50% | All | Mar 10 |
| White Label | 🔴 Disabled | 0% | Agency+ | - |

**Edit Flag:**
- Enable/Disable toggle
- Rollout percentage (slider)
- Target plans (checkboxes)
- Target orgs (specific list)

### 10.3 Maintenance (`/admin/system/maintenance`)

**Maintenance Mode:**
- Status: Off / Scheduled / Active
- Message: "We're upgrading our systems..."
- Expected duration
- Allowed IPs (for admin access)
- Start/End time (for scheduled)

**History:**
| Date | Duration | Reason |
|------|----------|--------|
| Mar 10 | 30 min | Database migration |
| Feb 28 | 2 hours | Infrastructure upgrade |

### 10.4 Background Jobs (`/admin/system/jobs`)

**Job Status:**
| Job Type | Status | Last Run | Next Run | Queue |
|----------|--------|----------|----------|-------|
| sync_worker | Running | 10:45 | Continuous | 3 |
| token_refresh | Running | 10:30 | Continuous | 0 |
| reconciliation | Idle | 00:00 | Tomorrow 00:00 | 0 |
| email_digest | Idle | 06:00 | Tomorrow 06:00 | 0 |

**Recent Jobs Table:**
| Job | Type | Status | Started | Duration | Error |
|-----|------|--------|---------|----------|-------|
| sync-123 | sync | Completed | 10:45 | 32s | - |
| sync-122 | sync | Failed | 10:30 | 12s | Timeout |

**Actions:**
- Trigger job manually
- Retry failed
- Cancel running
- View logs

### 10.5 Logs (`/admin/system/logs`)

**Log Viewer:**
- Real-time log stream
- Filter by level (Error, Warn, Info, Debug)
- Filter by service
- Search
- Download

**Error Summary:**
| Error Type | Count (24h) | Last Occurrence | Affected Users |
|------------|-------------|-----------------|----------------|
| TokenExpired | 23 | 10:45 | 5 |
| RateLimit | 12 | 10:30 | 3 |
| APIError | 5 | 09:15 | 2 |

### 10.6 Config (`/admin/system/config`)

**System Configuration:**
| Key | Value | Type | Description |
|-----|-------|------|-------------|
| maintenance_mode | false | boolean | Enable maintenance mode |
| registration_enabled | true | boolean | Allow new signups |
| default_plan | "free" | string | Default plan for new orgs |
| ai_provider | "gemini" | string | Default AI provider |
| trial_days | 14 | number | Trial length |
| support_email | "support@..." | string | Support email |

**Edit Config:**
- Key-value editor
- Type validation
- History/audit trail

### 10.7 Tools (`/admin/system/tools`)

**Data Tools:**
- Export Users (CSV)
- Export Organizations (CSV)
- Export Invoices (CSV)
- Database Query (read-only SQL)

**Test Tools:**
- Test Google Ads Connection
- Test Meta Connection
- Test Email (send to self)
- Test Webhook

**Cache Tools:**
- Clear all cache
- Clear specific keys
- View cache stats

---

## Admin Settings

**Route:** `/admin/settings`

### Settings Sections:

1. **Preferences**
   - Theme (Light/Dark/System)
   - Timezone
   - Date format
   - Dashboard default view

2. **Notifications**
   - Email alerts for: Critical errors, Failed payments, New signups
   - Slack integration
   - Alert thresholds

3. **Security**
   - Change password
   - Two-factor authentication
   - Active sessions (logout all)
   - API keys (for admin API access)

4. **Team** (Super Admin only)
   - Admin users list
   - Invite new admin
   - Change roles
   - Deactivate admin

5. **Integrations**
   - Slack webhook URL
   - PagerDuty integration
   - Email provider settings

---

## Admin Profile

**Route:** `/admin/profile`

### Profile Sections:

1. **My Profile**
   - Avatar
   - Name
   - Email
   - Role (Admin / Super Admin)
   - Created date
   - Last login

2. **Security**
   - Change password
   - Enable/disable 2FA
   - View login history (last 20)
   - Active sessions (with logout option)

3. **Activity**
   - My recent actions (from audit log)
   - Actions I've performed

---

## Database Schema Summary

### New Tables Needed:

| Table | Purpose |
|-------|---------|
| landing_page_visits | Landing page tracking |
| signup_sources | Signup attribution |
| email_subscribers | Newsletter subscribers |
| funnel_events | Conversion tracking |
| api_version_tracking | API version status |
| api_changelog_entries | API changes log |
| api_expense_logs | API cost tracking |
| api_alerts | API alerts |
| ai_model_configs | AI model settings |
| ai_prompts | Prompt management |
| ai_prompts_history | Prompt versions |
| recommendation_rules_config | Rule configuration |
| ai_cost_budgets | Cost limits |
| feature_flags | Feature toggles |
| maintenance_windows | Maintenance schedule |
| admin_impersonation_sessions | Impersonation audit |
| announcements | User announcements |
| announcement_dismissals | Dismissed announcements |
| security_events | Security tracking |
| background_jobs | Job status |

**Total: 20 new tables**

---

## API Endpoints Summary

### New Endpoints by Tab:

| Tab | Endpoints |
|-----|-----------|
| Dashboard | 5 |
| Users | 12 |
| Organizations | 10 |
| Marketing | 10 |
| Billing | 15 |
| Ad Accounts | 8 |
| AI & ML | 18 |
| API Monitor | 10 |
| Analytics | 12 |
| System | 15 |
| Settings | 8 |
| Profile | 5 |

**Total: ~130 new endpoints**

---

## Implementation Priority

### Sprint 1: Foundation (Week 1-2)
- Database migration with all new tables
- Core admin layout with 10 tabs
- Dashboard with real metrics
- Enhanced user management

### Sprint 2: Marketing & Analytics (Week 3-4)
- Marketing tab (all subsections)
- Analytics tab
- Conversion funnel tracking

### Sprint 3: Billing & Ad Accounts (Week 5-6)
- Complete billing tab
- Ad accounts management
- Token health monitoring

### Sprint 4: AI & API Monitor (Week 7-8)
- AI & ML control center
- API version monitoring
- Prompt management

### Sprint 5: System & Operations (Week 9-10)
- System tab (all subsections)
- Feature flags UI
- Maintenance mode
- Background jobs

### Sprint 6: Settings & Profile (Week 11)
- Admin settings
- Admin profile
- Team management
- Polish & testing

---

## Summary

This complete admin panel includes:

- **10 Navigation Tabs**: Dashboard, Users, Organizations, Marketing, Billing, Ad Accounts, AI & ML, API Monitor, Analytics, System
- **Settings Page**: Preferences, notifications, security, team, integrations
- **Profile Page**: Profile info, security, activity
- **20 New Database Tables**
- **~130 New API Endpoints**
- **40+ Frontend Pages/Views**

After implementation, the admin will have **complete visibility and control** over:
- Every user, organization, and their activity
- All marketing efforts and conversion funnels
- Complete billing and revenue management
- All ad accounts and their health
- Full AI/ML configuration and costs
- API version tracking and migrations
- System operations and maintenance
