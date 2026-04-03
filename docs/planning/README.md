# AdsMaster - Planning Documents

## Planning Phases

| Phase | Document | Status | Description |
|-------|----------|--------|-------------|
| **1** | [Database Schema](./phase-1-database-schema.md) | **COMPLETE** | 51 tables, relationships, indexes, partitioning |
| **2** | [System Architecture (REVISED)](./phase-2-system-architecture-REVISED.md) | **COMPLETE** | GCP, Next.js, FastAPI, BigQuery, Vertex AI, ML Pipeline |
| **3** | [API Design](./phase-3-api-design.md) | **COMPLETE** | ~90 REST endpoints, JWT auth, WebSocket, rate limiting |
| **4** | [Backend Architecture](./phase-4-backend-architecture.md) | **COMPLETE** | FastAPI, services, workers, Google Ads/Stripe integrations |
| **5** | [Frontend/UI Architecture](./phase-5-frontend-architecture.md) | **COMPLETE** | Next.js 15, shadcn/ui, Zustand, React Query, charts |
| **6** | [Customer Handling](./phase-6-customer-handling.md) | **COMPLETE** | Onboarding, Stripe billing, emails, WhatsApp, retention |
| **7** | [AI/ML Pipeline](./phase-7-ai-ml-pipeline.md) | **COMPLETE** | Gemini LLM, Vertex AI, BigQuery ML, recommendations |
| **8** | [Security & Compliance](./phase-8-security-compliance.md) | **COMPLETE** | JWT auth, encryption, GDPR, audit logging, incident response |
| **9** | [DevOps & Infrastructure](./phase-9-devops-infrastructure.md) | **COMPLETE** | Terraform, CI/CD, monitoring, disaster recovery |
| **10** | [Testing Strategy](./phase-10-testing-strategy.md) | **COMPLETE** | Unit, integration, E2E, performance, security, ML testing |
| **11** | [Meta Ads Integration](./phase-11-meta-ads-integration.md) | **COMPLETE** | Facebook/Instagram Ads API, targeting, audiences, creatives |
| **12** | [UI Design System](./phase-12-ui-design-system.md) | **COMPLETE** | Colors, typography, components, wireframes for all views |
| **13** | [API Abstraction & Growth](./phase-13-api-abstraction-growth.md) | **COMPLETE** | Adapter pattern, API versioning, growth engine features |
| **14** | [Critical Fixes](./phase-14-critical-fixes.md) | **COMPLETE** | Data reconciliation, idempotency, token health, undo |
| **15** | [Mobile Design](./phase-15-mobile-design.md) | **COMPLETE** | Responsive layouts, bottom nav, touch-friendly UI |
| **16** | [Admin Panel](./phase-16-admin-panel-complete.md) | **COMPLETE** | Super-admin dashboard, user/org management, billing |
| **17** | [Admin Full Control](./phase-17-admin-full-control.md) | **NEW** | Marketing analytics, API monitoring, AI control, operations |

> **Note:** `phase-2-system-architecture.md` (original) is superseded by `phase-2-system-architecture-REVISED.md`

## Implementation Status

See [/STATUS.md](/STATUS.md) for current implementation progress.

```
Planning:     ████████████████████ 100% - All 17 phases documented
Database:     ████████████████████ 100% - 8 migrations applied
Backend API:  █████████████████░░░  85% - 18 routers, 60+ endpoints
Frontend:     █████████████████░░░  85% - 25+ pages, dashboard redesigned
Admin Panel:  ████████████████████ 100% - Full dashboard, users, orgs, billing
Integrations: ████████░░░░░░░░░░░░  40% - Adapters ready, needs real testing
DevOps:       ░░░░░░░░░░░░░░░░░░░░   0% - Not started
Testing:      ░░░░░░░░░░░░░░░░░░░░   0% - Not started
```

## Phase Summaries

### Phase 1: Database Schema
- **51 tables** across 13 modules
- **8 partitioned tables** for metrics (scalability)
- **PostgreSQL 15+** with UUID, JSONB, generated columns
- **Row-level security** for multi-tenant isolation
- **Full audit trail** via change_history table

### Phase 2: System Architecture
- **Cloud**: Google Cloud Platform (GCP)
- **Frontend**: Next.js 15 on Cloud Run
- **Backend**: Python FastAPI on Cloud Run
- **Transactional DB**: Cloud SQL PostgreSQL (HA)
- **Analytics DB**: BigQuery (11 years historical data)
- **ML Platform**: Vertex AI + BigQuery ML
- **Cache**: Memorystore Redis
- **AI Brain 1**: Gemini API (Chat, explanations, ad copy)
- **AI Brain 2**: Vertex AI + BigQuery ML (Forecasting, predictions)
- **Estimated Cost**: $415/mo (100 users) → $8,000/mo (10K users)

### Phase 3: API Design
- ~90 REST endpoints across 13 modules
- JWT authentication (15-min access, 30-day refresh tokens)
- WebSocket for real-time updates
- Rate limiting by subscription tier
- Versioned API (v1)

### Phase 4: Backend Architecture
- FastAPI modular monolith structure
- Repository + Service layer patterns
- Google Ads API v23 integration
- Stripe billing integration
- Background workers with Cloud Tasks
- Scheduled jobs with Cloud Scheduler

### Phase 5: Frontend/UI Architecture
- Next.js 15 App Router with TypeScript
- shadcn/ui component library
- Zustand for client state, React Query for server state
- Recharts for data visualization
- Mobile-responsive design

### Phase 6: Customer Handling
- 6-step onboarding wizard
- Stripe subscription plans (Free, $49, $99, $249/mo)
- Email templates with React Email
- WhatsApp Business API (Twilio)
- Customer health scoring & churn prevention

### Phase 7: AI/ML Pipeline
- Two AI Brains: Gemini LLM + Vertex AI/BigQuery ML
- 50+ recommendation rules
- ARIMA_PLUS for spend forecasting
- AutoML for conversion predictions
- Weekly model retraining pipeline

### Phase 8: Security & Compliance
- 5-layer security architecture
- AES-256 + Cloud KMS envelope encryption
- Row-Level Security (RLS) policies
- GDPR compliance (consent, data export, deletion)
- Incident response playbook
- SOC 2 preparation

### Phase 9: DevOps & Infrastructure
- Terraform modules for all GCP resources
- GitHub Actions + Cloud Build CI/CD
- Canary deployments (10% → 50% → 100%)
- Multi-region disaster recovery
- RTO: 4 hours, RPO: 1 hour
- Comprehensive alerting (PagerDuty)

### Phase 10: Testing Strategy
- Testing pyramid: 70% unit, 20% integration, 10% E2E
- Backend: pytest, pytest-asyncio, factory_boy
- Frontend: Vitest, React Testing Library, Playwright
- Performance: k6 load testing
- Security: OWASP ZAP, Trivy, Bandit
- ML: Model validation, LLM response testing
- Coverage: 80% backend, 75% frontend

### Phase 11: Meta Ads Integration
- Meta Marketing API v21.0 (Facebook, Instagram, Messenger, Audience Network)
- OAuth 2.0 with long-lived tokens (60 days)
- Campaign → Ad Set → Ad structure (vs Google's Ad Group)
- Visual creatives: Image, Video, Carousel ads
- Audience-based targeting (no keywords)
- Custom & Lookalike audiences
- Meta Pixel + Conversions API (CAPI) tracking
- AI recommendations: audience fatigue, overlap, learning phase
- Targeting builder UI with estimated reach

### Phase 12: UI Design System & Wireframes
- **Style**: Data-dense, Bloomberg/Trading platform inspired
- **Primary Color**: Green (#10B981) - Growth/ROI focus
- **Font**: Inter (UI) + JetBrains Mono (numbers)
- **Themes**: Light + Dark (equal support)
- **Target**: Agencies with multi-client management
- **Components**: Buttons, tables, metric cards, badges, recommendation cards
- **Wireframes**: Dashboard, Campaigns, AI Recommendations, Analytics, Clients, Settings
- **Navigation**: Keyboard-first with Command Palette
- **Layout**: Fixed sidebar (240px) + fluid content

### Phase 13: API Abstraction Layer & Growth Engine
- **Adapter Pattern**: Isolates Google/Meta SDK changes from business logic
- **Version Monitor**: Automatic alerts on API version releases
- **Feature Flags**: Per-org rollout of new API features
- **v23.1 Features**: PMax Network Breakdown, NLP Audience Builder, AI Asset Generation
- **Growth Engine**: Free audit, referral program, white-label, weekly emails

### Phase 14: Critical Pre-Launch Fixes
- **Data Reconciliation**: Daily verification of DB vs live ad platform data
- **Automation Idempotency**: Prevent double-firing of automation rules
- **Token Health**: Dashboard + escalating alerts for OAuth failures
- **24-Hour Undo**: Rollback applied recommendations
- **Currency Standardization**: All amounts in micros
- **Rate Limit Tracking**: Redis-based quota management

### Phase 15: Mobile Design
- **Bottom Navigation**: 5-icon nav fixed at bottom
- **Mobile Header**: Hamburger menu, compact title, profile avatar
- **Responsive Breakpoints**: Desktop (1280px+), Laptop (1024px+), Tablet (768px+), Mobile (<768px)
- **Campaign Cards**: Card view replaces table on mobile
- **Touch Targets**: Minimum 44px for accessibility

### Phase 16: Admin Panel
- **Dashboard**: 6-row layout with KPIs, alerts, health, usage, charts, activity feed
- **User Management**: List, detail view, suspend/activate with full theme support
- **Organization Management**: Details, members, ad accounts, plan changes
- **Billing Dashboard**: MRR/ARR, invoices, failed payments, revenue by plan charts
- **AI Usage**: Cost tracking by provider, token usage, model breakdown
- **API Monitoring**: Platform health, error rates, rate limit status
- **System Config**: Feature flags, rate limits, key-value editor
- **Audit Logs**: Full trail of admin actions
- **Marketing Tools**: Signup tracking, conversion funnel, campaign analytics
- **Separate Auth**: Admin users table with dedicated JWT
- **Light/Dark Theme**: All admin pages support both themes via CSS variables

### Phase 17: Admin Full Control (NEW)
- **Landing Page Analytics**: Visitor tracking, UTM campaigns, conversion funnel
- **Signup Tracking**: Gmail/social login breakdown, subscriber management
- **API Version Monitor**: Google/Meta API changelog, sunset alerts, migration status
- **API Expense Details**: Per-provider costs, forecasting, budget alerts
- **AI Full Control**: Model config, prompt management, recommendation rules
- **Feature Flags UI**: Toggle features, percentage rollout, plan targeting
- **Maintenance Mode**: Scheduled downtime, user notifications
- **User Impersonation**: Debug user issues with audit trail
- **Announcements System**: Banner/modal notifications, targeted messages
- **Security Events**: Failed login tracking, suspicious activity alerts
- **Admin User Management**: Create/manage admin accounts
- **Background Jobs Monitor**: Job status, manual triggers, retry failed
- **Real-time Health Dashboard**: API status, database, Redis, workers

## Database Modules
1. Core Users (users, organizations, members)
2. Billing (plans, subscriptions, invoices)
3. Ad Accounts (OAuth, platform connections)
4. Campaigns (campaigns, ad groups, ads, keywords)
5. Metrics (daily/hourly, partitioned)
6. AI & Automation (recommendations, rules)
7. Alerts & Notifications
8. AI Chat (conversations, messages)
9. Reports & Analytics (snapshots, health scores)
10. Sync & Audit (jobs, change history)
11. Agency Management (clients, accounts)
12. Permissions (account/campaign level)
13. Competitors (tracking, auction insights)
