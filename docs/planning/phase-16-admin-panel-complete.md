# Phase 16: Complete Admin Panel Design

## Overview

The Admin Panel is the control center for managing the entire AdsMaster platform. It provides super-admins with tools to monitor, manage, and maintain all aspects of the SaaS platform.

---

## 1. Dashboard (Home)

The main dashboard provides a real-time overview of platform health and key metrics.

### 1.1 Key Metrics Cards (Top Row)
| Metric | Description | Visual |
|--------|-------------|--------|
| Total Users | All registered users | Number + 7-day trend |
| Active Users (30d) | Users with activity in last 30 days | Number + % of total |
| Total Organizations | Registered organizations | Number + 7-day new |
| Total Revenue (MTD) | Month-to-date revenue | Currency + vs last month |
| MRR | Monthly Recurring Revenue | Currency + growth % |
| Churn Rate | Monthly churn percentage | % + trend arrow |

### 1.2 Platform Health Status
- **API Server**: Response time, uptime %, error rate
- **Database**: Connection pool, query latency, storage used
- **Redis Cache**: Memory usage, hit rate
- **Background Workers**: Queue depth, failed jobs
- **External APIs**: Google Ads API status, Meta API status

### 1.3 Quick Stats Widgets
- **Today's Signups**: Count with hourly chart
- **Today's API Calls**: Total + by endpoint
- **Today's AI Cost**: Token usage + USD cost
- **Active Sessions**: Current logged-in users
- **Pending Support Tickets**: Count with priority breakdown

### 1.4 Recent Activity Feed
- New user registrations
- Subscription changes (upgrades/downgrades/cancellations)
- Failed payments
- Admin actions (from audit log)
- System alerts

### 1.5 Quick Actions
- [ ] Enable Maintenance Mode
- [ ] Send Platform Announcement
- [ ] Trigger Data Sync
- [ ] Clear Cache
- [ ] Export Daily Report

---

## 2. Users Tab

Complete user management with all necessary controls.

### 2.1 Users List View
**Columns:**
- Avatar + Name + Email
- Organization (link)
- Plan (badge: Free/Starter/Growth/Agency/Enterprise)
- Status (Active/Suspended/Pending Verification)
- Ad Accounts Connected
- Last Active
- Created Date
- Actions (dropdown)

**Filters:**
- Search (email, name)
- Status: All / Active / Suspended / Pending
- Plan: All / Free / Starter / Growth / Agency / Enterprise
- Date Range: Signed up between
- Has Ad Accounts: Yes / No
- Last Active: Today / 7d / 30d / 90d / Inactive

**Bulk Actions:**
- Send Email
- Suspend Selected
- Export to CSV

### 2.2 User Detail View
**Profile Section:**
- User info (editable): Name, Email, Phone
- Avatar
- Email verified badge
- Created date, Last login
- Login history (last 10 with IP, device, location)

**Organization Memberships:**
- List of orgs user belongs to
- Role in each org
- Ability to remove from org

**Connected Ad Accounts:**
- List of ad accounts user has access to
- Platform (Google/Meta)
- Account status
- Last sync date

**Activity Log:**
- User's recent actions
- Recommendations applied
- Campaigns modified
- API calls made

**Admin Actions:**
- Suspend / Activate Account
- Reset Password (send email)
- Force Logout (invalidate all sessions)
- Impersonate User (login as user for debugging)
- Delete Account (with confirmation)
- Add Admin Note

### 2.3 User Segments
Pre-built segments for quick filtering:
- Power Users (>100 API calls/day)
- At-Risk (no login in 14+ days)
- Trial Expiring Soon (next 3 days)
- High Value (Agency/Enterprise plans)
- New This Week

---

## 3. Organizations Tab

Manage all organizations/workspaces.

### 3.1 Organizations List
**Columns:**
- Name
- Owner (email)
- Plan + Billing Status
- Members Count
- Ad Accounts Count
- Total Spend Managed
- MRR Contribution
- Created Date
- Actions

**Filters:**
- Search (name, owner email)
- Plan type
- Billing status: Active / Past Due / Canceled
- Member count range
- Ad spend range

### 3.2 Organization Detail View
**Overview Section:**
- Organization name (editable)
- Plan details + Change Plan button
- Billing status
- Created date
- Total lifetime value

**Members Section:**
- Table: Name, Email, Role, Last Active, Joined Date
- Actions: Change role, Remove member
- Invite new member (as admin)

**Ad Accounts Section:**
- All connected ad accounts
- Platform, Name, Status, Last Sync, Total Spend (30d)
- Disconnect account action

**Subscription & Billing:**
- Current plan details
- Billing history (all invoices)
- Payment method on file
- Upgrade/Downgrade plan
- Apply discount/coupon
- Extend trial
- Cancel subscription

**Usage Statistics:**
- API calls this month vs limit
- AI tokens used vs limit
- Recommendations generated
- Automations run

**Admin Actions:**
- Suspend Organization
- Transfer Ownership
- Merge with Another Org
- Delete Organization
- Add Credit/Refund

---

## 4. Subscriptions & Billing Tab

Financial oversight and revenue management.

### 4.1 Revenue Dashboard
**Metrics:**
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- MRR Growth Rate
- Average Revenue Per User (ARPU)
- Customer Lifetime Value (LTV)
- Churn Rate (%)
- Net Revenue Retention

**Charts:**
- MRR over time (12 months)
- New vs Churned MRR
- Revenue by plan
- Cohort retention

### 4.2 Subscriptions List
**Columns:**
- Organization
- Plan
- Status (Active/Trialing/Past Due/Canceled)
- MRR
- Billing Cycle (Monthly/Annual)
- Next Invoice Date
- Payment Method
- Actions

**Filters:**
- Status
- Plan
- Billing cycle
- Past due

### 4.3 Invoices
**All Invoices Table:**
- Invoice # + Date
- Organization
- Amount
- Status (Paid/Pending/Failed/Refunded)
- Payment Method
- Actions (View, Download PDF, Resend, Refund)

### 4.4 Failed Payments
- List of failed payments with retry attempts
- Reason for failure
- Manual retry button
- Contact customer action

### 4.5 Coupons & Discounts
**Coupon Management:**
- Create new coupon
- List all coupons: Code, Type (% or $), Max uses, Used count, Expiry
- Deactivate coupon
- View usage history

### 4.6 Plan Configuration
- Edit plan pricing
- Edit plan features/limits
- Create custom enterprise plans
- A/B test pricing (future)

---

## 5. Ad Accounts Tab

Manage all connected advertising accounts.

### 5.1 Ad Accounts List
**Columns:**
- Account Name + ID
- Platform (Google/Meta icon)
- Organization (link)
- Status (Active/Paused/Error/Disconnected)
- Token Status (Valid/Expiring/Expired)
- Last Sync
- 30-Day Spend
- Campaigns Count
- Actions

**Filters:**
- Platform: Google / Meta / All
- Status
- Token status
- Organization
- Spend range

### 5.2 Account Detail View
- Account info (ID, name, currency, timezone)
- Organization owner
- Token health + expiry date
- Sync history (last 10 syncs with status)
- Error logs
- Campaigns summary
- Force re-sync action
- Disconnect action

### 5.3 Token Health Dashboard
**Expiring Soon (next 7 days):**
- List of accounts with expiring tokens
- Owner email
- Days until expiry
- Send reminder action

**Expired Tokens:**
- List of accounts with expired tokens
- Last successful sync
- Bulk send reminder

### 5.4 Sync Status
- Real-time sync queue status
- Recent sync jobs (success/failed)
- Average sync duration
- Force full platform sync

---

## 6. AI & Recommendations Tab

Monitor AI usage and recommendation performance.

### 6.1 AI Usage Dashboard
**Metrics:**
- Total AI Requests (today/week/month)
- Total Tokens Used
- Total Cost (USD)
- Average Response Time
- Error Rate

**By Provider:**
| Provider | Requests | Tokens | Cost | Avg Latency |
|----------|----------|--------|------|-------------|
| Gemini   | X        | X      | $X   | Xms         |
| OpenAI   | X        | X      | $X   | Xms         |
| Anthropic| X        | X      | $X   | Xms         |

**Charts:**
- Daily AI cost (30 days)
- Requests by endpoint (chat, recommendations, forecasting)
- Token usage trend

### 6.2 Recommendations Analytics
**Metrics:**
- Total Generated (today/week/month)
- Application Rate (% applied)
- Dismissal Rate (% dismissed)
- Estimated Savings Delivered
- Average Confidence Score

**By Type:**
| Type | Generated | Applied | Dismissed | Savings |
|------|-----------|---------|-----------|---------|
| Budget Optimization | X | X% | X% | $X |
| Keyword Management | X | X% | X% | $X |
| Bid Adjustments | X | X% | X% | $X |
| Audience Targeting | X | X% | X% | $X |

### 6.3 AI Configuration
- Select default AI provider
- Set rate limits per organization
- Configure model parameters
- Enable/disable AI features
- Set cost alerts (notify when daily cost exceeds $X)

### 6.4 Prompt Management (Future)
- View/edit system prompts
- A/B test prompts
- Prompt version history

---

## 7. Analytics Tab

Platform-wide analytics and insights.

### 7.1 User Analytics
**Charts:**
- Daily/Weekly/Monthly Active Users
- User signup trend
- User retention cohorts
- Feature adoption rates
- Session duration distribution

**Funnel:**
- Signup → Connect Account → First Recommendation → Paid Conversion

### 7.2 Page Analytics
- Top pages by views
- Average time on page
- Bounce rate by page
- User flow visualization

### 7.3 API Analytics
**Metrics:**
- Total requests (by period)
- Average response time
- Error rate
- Requests per user/org

**By Endpoint:**
- Top 20 most called endpoints
- Slowest endpoints
- Highest error rate endpoints

### 7.4 Business Analytics
- Revenue by plan
- Upgrade/downgrade trends
- Geographic distribution
- Device/browser breakdown

### 7.5 Export & Reports
- Schedule automated reports (daily/weekly/monthly)
- Export any chart as CSV/PDF
- Email reports to stakeholders

---

## 8. System Config Tab

Platform-wide configuration management.

### 8.1 Feature Flags
| Feature | Status | Description |
|---------|--------|-------------|
| AI Chat | ✅ Enabled | AI-powered chat assistant |
| Recommendations | ✅ Enabled | Automated recommendations engine |
| Forecasting | ✅ Enabled | ML-based spend forecasting |
| Automations | ⚠️ Beta | Rule-based automations |
| White Label | ❌ Disabled | White-label for agencies |

Actions: Enable/Disable/Beta per feature

### 8.2 Rate Limits
- API rate limits (per plan)
- AI token limits (per plan)
- Sync frequency limits
- Edit limits for each plan

### 8.3 Platform Settings
- Maintenance mode toggle
- Registration enabled/disabled
- Default trial days
- Support email
- Legal URLs (Terms, Privacy)

### 8.4 Pricing Configuration
- Edit plan prices
- Set annual discount %
- Configure overage pricing
- Add-on pricing

### 8.5 Email Templates
- View/edit transactional emails
- Welcome email
- Password reset
- Invoice emails
- Recommendation digest

### 8.6 Integrations
- Google OAuth credentials status
- Meta App credentials status
- Stripe webhook status
- SendGrid/email provider status
- Slack integration

---

## 9. Support Tab

Tools for customer support.

### 9.1 Support Tickets (if integrated)
- List of tickets with status
- Priority indicators
- Assigned agent
- Quick reply

### 9.2 User Lookup
- Quick search by email/name/org
- View user details
- Recent activity
- Impersonate for debugging

### 9.3 Announcements
- Create platform-wide announcements
- Target by plan/segment
- Schedule announcement
- In-app banner vs email

### 9.4 Knowledge Base Management (if applicable)
- Edit help articles
- View most searched topics
- Identify documentation gaps

### 9.5 Live Users
- Currently active users
- What page they're on
- Session duration
- Option to send in-app message

---

## 10. Security & Compliance Tab

Security monitoring and compliance tools.

### 10.1 Audit Logs
**Columns:**
- Timestamp
- Admin/User
- Action
- Resource Type + ID
- IP Address
- Old Value / New Value

**Filters:**
- Date range
- Action type
- Admin user
- Resource type

**Export:** Full audit log export for compliance

### 10.2 Admin Users Management
- List of admin users
- Roles: Super Admin / Admin / Read-Only
- Last login
- Add new admin
- Deactivate admin
- Reset admin password

### 10.3 Security Events
- Failed login attempts (by user/IP)
- Suspicious activity alerts
- Rate limit violations
- API key abuse detection

### 10.4 Data Management
- GDPR data export (for user)
- GDPR data deletion requests
- Data retention settings
- Database backup status

### 10.5 API Keys (Platform Level)
- Platform API keys for integrations
- Webhook signing secrets
- Rotate keys

---

## 11. Logs & Monitoring Tab

System logs and monitoring.

### 11.1 Application Logs
- Real-time log stream
- Filter by level (Error/Warn/Info/Debug)
- Search logs
- Download logs

### 11.2 Error Tracking
- Recent errors grouped by type
- Error frequency
- Stack traces
- Affected users

### 11.3 Background Jobs
- Job queue status
- Recent job runs
- Failed jobs with retry option
- Schedule status (cron jobs)

### 11.4 Database Health
- Connection pool status
- Slow query log
- Table sizes
- Index usage

### 11.5 External Service Health
- Google Ads API status
- Meta API status
- Stripe status
- Email provider status

---

## 12. Tools Tab

Utility tools for admins.

### 12.1 Data Tools
- Bulk user import (CSV)
- Bulk data export
- Database query tool (read-only)

### 12.2 Cache Management
- Clear all cache
- Clear specific cache keys
- Cache hit/miss stats

### 12.3 Email Tools
- Send test email
- Preview email templates
- Email delivery logs

### 12.4 Debug Tools
- Test Google Ads connection
- Test Meta connection
- Test AI provider
- Simulate webhook

### 12.5 Migration Tools
- Run pending migrations
- Migration history
- Rollback migration

---

## UI/UX Specifications

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Logo   │  Search...  │  🔔 Alerts  │  Admin ▼  │  ☀️/🌙   │
├─────────┼───────────────────────────────────────────────────┤
│         │                                                   │
│ Dashboard│                                                  │
│ Users    │              Main Content Area                   │
│ Orgs     │                                                  │
│ Billing  │              (Cards, Tables, Charts)             │
│ Accounts │                                                  │
│ AI/ML    │                                                  │
│ Analytics│                                                  │
│ Config   │                                                  │
│ Support  │                                                  │
│ Security │                                                  │
│ Logs     │                                                  │
│ Tools    │                                                  │
│         │                                                   │
├─────────┴───────────────────────────────────────────────────┤
│  © AdsMaster Admin • v1.0.0 • Docs • Support               │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles
1. **Data-Dense**: Show more information, less whitespace
2. **Dark Mode First**: Easier on eyes for long admin sessions
3. **Quick Actions**: Common tasks accessible in 1-2 clicks
4. **Real-Time**: Live updates for critical metrics
5. **Searchable**: Global search for users, orgs, accounts
6. **Responsive**: Works on tablet (not mobile priority)

### Color Scheme
- Background: `#0f172a` (dark) / `#f8fafc` (light)
- Cards: `#1e293b` (dark) / `#ffffff` (light)
- Primary: `#10b981` (green - success/money)
- Warning: `#f59e0b` (amber)
- Error: `#ef4444` (red)
- Info: `#3b82f6` (blue)

---

## Implementation Priority

### Phase 1 (MVP) ✅ Partially Done
- [x] Admin Authentication
- [x] Dashboard Overview
- [x] Users List + Detail
- [x] Organizations List
- [x] Basic Analytics
- [x] Audit Logs
- [x] System Config

### Phase 2 (Core Features)
- [ ] Subscriptions & Billing Tab
- [ ] Ad Accounts Management
- [ ] AI Usage Dashboard
- [ ] Enhanced User Detail (impersonation)
- [ ] Failed Payments Handling
- [ ] Token Health Monitoring

### Phase 3 (Advanced)
- [ ] Support Tools
- [ ] Security Events
- [ ] Advanced Analytics
- [ ] Email Template Editor
- [ ] Background Job Monitoring

### Phase 4 (Polish)
- [ ] Real-time Updates (WebSocket)
- [ ] Advanced Search
- [ ] Custom Reports Builder
- [ ] Role-Based Admin Access
- [ ] Mobile-Responsive Admin

---

## Database Tables Needed

### Already Created (Migration 00006)
- `admin_users`
- `admin_sessions`
- `audit_logs`
- `api_usage_logs`
- `ai_usage_logs`
- `system_config`
- `page_views`

### Additional Tables Needed
```sql
-- Support tickets (if building in-house)
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    organization_id UUID,
    subject VARCHAR(255),
    status VARCHAR(50), -- open, in_progress, resolved, closed
    priority VARCHAR(20), -- low, medium, high, urgent
    assigned_to UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    type VARCHAR(50), -- banner, modal, email
    target_plans TEXT[], -- which plans see this
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ
);

-- Admin notes on users/orgs
CREATE TABLE admin_notes (
    id UUID PRIMARY KEY,
    resource_type VARCHAR(50), -- user, organization
    resource_id UUID,
    note TEXT,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ
);

-- Security events
CREATE TABLE security_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(100), -- failed_login, rate_limit, suspicious_activity
    user_id UUID,
    ip_address VARCHAR(45),
    details JSONB,
    severity VARCHAR(20), -- info, warning, critical
    created_at TIMESTAMPTZ
);

-- Coupons
CREATE TABLE coupons (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    discount_type VARCHAR(20), -- percent, fixed
    discount_value DECIMAL(10,2),
    max_uses INT,
    used_count INT DEFAULT 0,
    valid_plans TEXT[],
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ
);
```

---

## API Endpoints Needed

### Existing (in admin.py)
- `POST /admin/auth/login`
- `POST /admin/auth/logout`
- `GET /admin/auth/me`
- `GET /admin/dashboard`
- `GET /admin/users`
- `GET /admin/users/{id}`
- `POST /admin/users/{id}/suspend`
- `POST /admin/users/{id}/activate`
- `GET /admin/organizations`
- `GET /admin/organizations/{id}`
- `PATCH /admin/organizations/{id}/subscription`
- `GET /admin/analytics/overview`
- `GET /admin/api-usage`
- `GET /admin/ai-usage`
- `GET /admin/config`
- `PUT /admin/config/{key}`
- `GET /admin/audit-logs`

### New Endpoints Needed
```
# User Management
POST   /admin/users/{id}/impersonate
POST   /admin/users/{id}/reset-password
DELETE /admin/users/{id}
POST   /admin/users/{id}/notes

# Organization Management
POST   /admin/organizations/{id}/transfer-ownership
POST   /admin/organizations/{id}/add-credit
DELETE /admin/organizations/{id}

# Billing
GET    /admin/billing/revenue
GET    /admin/billing/subscriptions
GET    /admin/billing/invoices
POST   /admin/billing/invoices/{id}/refund
GET    /admin/billing/failed-payments
POST   /admin/billing/failed-payments/{id}/retry
GET    /admin/coupons
POST   /admin/coupons
DELETE /admin/coupons/{id}

# Ad Accounts
GET    /admin/ad-accounts
GET    /admin/ad-accounts/{id}
POST   /admin/ad-accounts/{id}/force-sync
GET    /admin/ad-accounts/token-health

# AI/ML
GET    /admin/ai/usage
GET    /admin/ai/recommendations/stats
PUT    /admin/ai/config

# Support
GET    /admin/support/tickets
POST   /admin/announcements
GET    /admin/users/online

# Security
GET    /admin/security/events
GET    /admin/security/admins
POST   /admin/security/admins
DELETE /admin/security/admins/{id}

# System
GET    /admin/system/health
GET    /admin/system/logs
GET    /admin/system/jobs
POST   /admin/system/cache/clear
```

---

## Summary

This admin panel provides complete control over:

1. **Users & Organizations** - Full CRUD, suspension, impersonation
2. **Revenue & Billing** - MRR tracking, invoices, coupons, refunds
3. **Ad Accounts** - Token health, sync status, troubleshooting
4. **AI/ML** - Usage monitoring, cost tracking, configuration
5. **Analytics** - User behavior, API usage, business metrics
6. **Configuration** - Feature flags, pricing, rate limits
7. **Support** - Tickets, announcements, user lookup
8. **Security** - Audit logs, admin management, threat monitoring
9. **Operations** - Logs, jobs, health monitoring, tools

The admin panel is designed to give super-admins everything they need to run and scale the AdsMaster platform effectively.
