# AdsMaster - Planning Documents

## Planning Phases

| Phase | Document | Status | Description |
|-------|----------|--------|-------------|
| **1** | [Database Schema](./phase-1-database-schema.md) | **READY FOR REVIEW** | 51 tables, relationships, indexes, partitioning |
| **2** | [System Architecture (REVISED)](./phase-2-system-architecture-REVISED.md) | **READY FOR REVIEW** | GCP, Next.js, FastAPI, BigQuery, Vertex AI, ML Pipeline |
| **3** | [API Design](./phase-3-api-design.md) | **READY FOR REVIEW** | ~90 REST endpoints, JWT auth, WebSocket, rate limiting |
| **4** | [Backend Architecture](./phase-4-backend-architecture.md) | **READY FOR REVIEW** | FastAPI, services, workers, Google Ads/Stripe integrations |
| **5** | [Frontend/UI Architecture](./phase-5-frontend-architecture.md) | **READY FOR REVIEW** | Next.js 15, shadcn/ui, Zustand, React Query, charts |
| **6** | [Customer Handling](./phase-6-customer-handling.md) | **READY FOR REVIEW** | Onboarding, Stripe billing, emails, WhatsApp, retention |
| **7** | [AI/ML Pipeline](./phase-7-ai-ml-pipeline.md) | **READY FOR REVIEW** | Gemini LLM, Vertex AI, BigQuery ML, recommendations |
| **8** | [Security & Compliance](./phase-8-security-compliance.md) | **READY FOR REVIEW** | JWT auth, encryption, GDPR, audit logging, incident response |
| **9** | [DevOps & Infrastructure](./phase-9-devops-infrastructure.md) | **READY FOR REVIEW** | Terraform, CI/CD, monitoring, disaster recovery |
| **10** | [Testing Strategy](./phase-10-testing-strategy.md) | **READY FOR REVIEW** | Unit, integration, E2E, performance, security, ML testing |
| **11** | [Meta Ads Integration](./phase-11-meta-ads-integration.md) | **READY FOR REVIEW** | Facebook/Instagram Ads API, targeting, audiences, creatives |
| **12** | [UI Design System](./phase-12-ui-design-system.md) | **READY FOR REVIEW** | Colors, typography, components, wireframes for all views |

## How to Use

1. **Review** each phase document thoroughly
2. **Comment** on any changes needed
3. **Approve** before moving to implementation
4. Each phase builds on previous phases

## Current Status

```
Phase 1:  Database Schema      ████████████████████ 100% - Ready for Review
Phase 2:  System Architecture  ████████████████████ 100% - Ready for Review
Phase 3:  API Design           ████████████████████ 100% - Ready for Review
Phase 4:  Backend Architecture ████████████████████ 100% - Ready for Review
Phase 5:  Frontend/UI          ████████████████████ 100% - Ready for Review
Phase 6:  Customer Handling    ████████████████████ 100% - Ready for Review
Phase 7:  AI/ML Pipeline       ████████████████████ 100% - Ready for Review
Phase 8:  Security & Compliance████████████████████ 100% - Ready for Review
Phase 9:  DevOps & Infra       ████████████████████ 100% - Ready for Review
Phase 10: Testing Strategy     ████████████████████ 100% - Ready for Review
Phase 11: Meta Ads Integration ████████████████████ 100% - Ready for Review
Phase 12: UI Design System     ████████████████████ 100% - Ready for Review
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
- **Navigation**: Keyboard-first with ⌘K command palette
- **Layout**: Fixed sidebar (240px) + fluid content

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

## Next Steps

All 10 planning phases are complete and ready for review. After approval:

1. **Implementation Phase 1**: Database schema creation & migrations
2. **Implementation Phase 2**: Core backend services
3. **Implementation Phase 3**: Frontend foundation
4. **Implementation Phase 4**: Feature development sprints
