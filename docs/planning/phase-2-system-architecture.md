# Phase 2: System Architecture Plan

## Research Sources

This plan is based on current (2026) research from:
- [Google Cloud Well-Architected Framework](https://docs.cloud.google.com/architecture/framework)
- [Google Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Cloud SQL Pricing](https://cloud.google.com/sql/pricing)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Google Ads API v23 Documentation](https://developers.google.com/google-ads/api/reference/rpc/v23/overview)
- [Next.js FastAPI Template](https://github.com/vintasoftware/nextjs-fastapi-template)
- [GCP Cloud-Native SaaS Guide](https://dev.to/ciphernutz/how-to-build-a-cloud-native-saas-backend-on-gcp-a-practical-guide-for-developers-3g67)

---

## Executive Summary

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| **Cloud Provider** | Google Cloud Platform (GCP) | Native Google Ads API integration, Gemini AI access |
| **Architecture Style** | Modular Monolith → Microservices | Start simple, split later as team grows |
| **Frontend** | Next.js 15 (App Router) | SSR, RSC, best React framework |
| **Backend** | Python FastAPI | Google Ads Python SDK, AI/ML ecosystem |
| **Database** | Cloud SQL PostgreSQL 15 | Managed, HA, familiar |
| **Cache** | Memorystore (Redis) | Session, API response caching |
| **Queue** | Cloud Tasks + Pub/Sub | Background jobs, event-driven |
| **AI/LLM** | Gemini API (2.5 Flash + Pro) | Cost-effective, native GCP |
| **Deployment** | Cloud Run (containers) | Serverless, auto-scaling, cost-efficient |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    USERS                                                 │
│                    (Web Browser, Mobile, WhatsApp)                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              CLOUD LOAD BALANCER                                         │
│                         (Global HTTP(S) Load Balancer)                                   │
│                    + Cloud Armor (DDoS protection, WAF)                                  │
│                    + Cloud CDN (static assets caching)                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
           ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
           │   FRONTEND   │    │   BACKEND    │    │   WEBHOOK    │
           │   (Next.js)  │    │   (FastAPI)  │    │   HANDLER    │
           │   Cloud Run  │    │   Cloud Run  │    │   Cloud Run  │
           │              │    │              │    │              │
           │ • SSR/RSC    │    │ • REST API   │    │ • Stripe     │
           │ • Dashboard  │    │ • Auth       │    │ • OAuth      │
           │ • Static     │    │ • Business   │    │ • Platform   │
           └──────────────┘    └──────────────┘    └──────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
           ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
           │  CLOUD SQL   │    │ MEMORYSTORE  │    │  CLOUD       │
           │ (PostgreSQL) │    │   (Redis)    │    │  STORAGE     │
           │              │    │              │    │              │
           │ • Primary DB │    │ • Sessions   │    │ • Reports    │
           │ • HA Replica │    │ • Cache      │    │ • Media      │
           │ • Encrypted  │    │ • Rate Limit │    │ • Exports    │
           └──────────────┘    └──────────────┘    └──────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              BACKGROUND PROCESSING                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │ CLOUD TASKS  │    │   PUB/SUB    │    │  SCHEDULER   │    │   WORKERS    │         │
│   │              │    │              │    │  (Cron Jobs) │    │  (Cloud Run) │         │
│   │ • Async Jobs │    │ • Events     │    │              │    │              │         │
│   │ • Retries    │    │ • Fan-out    │    │ • Sync data  │    │ • Sync       │         │
│   │ • Delays     │    │ • Webhooks   │    │ • Reports    │    │ • AI Tasks   │         │
│   └──────────────┘    └──────────────┘    │ • Health     │    │ • Alerts     │         │
│                                           └──────────────┘    └──────────────┘         │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL INTEGRATIONS                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │ GOOGLE ADS   │    │    META      │    │   GEMINI     │    │   STRIPE     │         │
│   │   API v23    │    │ MARKETING    │    │    API       │    │              │         │
│   │              │    │     API      │    │              │    │ • Billing    │         │
│   │ • Campaigns  │    │              │    │ • Flash 2.5  │    │ • Subscr.    │         │
│   │ • Metrics    │    │ • FB/IG Ads  │    │ • Pro        │    │ • Invoices   │         │
│   │ • Changes    │    │ • Insights   │    │ • Chat       │    │              │         │
│   └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                              │
│   │  WHATSAPP    │    │    SLACK     │    │   SENDGRID   │                              │
│   │  BUSINESS    │    │              │    │              │                              │
│   │              │    │ • Alerts     │    │ • Emails     │                              │
│   │ • Alerts     │    │ • Commands   │    │ • Reports    │                              │
│   │ • AI Chat    │    │              │    │              │                              │
│   └──────────────┘    └──────────────┘    └──────────────┘                              │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              OBSERVABILITY & SECURITY                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │ CLOUD        │    │   CLOUD      │    │  SECRET      │    │  IDENTITY    │         │
│   │ MONITORING   │    │   LOGGING    │    │  MANAGER     │    │  PLATFORM    │         │
│   │              │    │              │    │              │    │              │         │
│   │ • Metrics    │    │ • Logs       │    │ • API Keys   │    │ • OAuth      │         │
│   │ • Alerts     │    │ • Audit      │    │ • Tokens     │    │ • IAM        │         │
│   │ • Dashboards │    │ • Trace      │    │ • Secrets    │    │ • SSO        │         │
│   └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Framework** | Next.js | 15.x | App Router, RSC, SSR |
| **Language** | TypeScript | 5.x | Type safety |
| **UI Library** | Radix UI + Tailwind | Latest | Accessible, customizable |
| **Charts** | Recharts or Tremor | Latest | Dashboard visualizations |
| **State** | Zustand + TanStack Query | Latest | Client state + server cache |
| **Forms** | React Hook Form + Zod | Latest | Validation |
| **Auth** | NextAuth.js | 5.x | OAuth, JWT sessions |

### Backend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Framework** | FastAPI | 0.110+ | Async, OpenAPI auto-docs |
| **Language** | Python | 3.12 | Google Ads SDK, AI ecosystem |
| **ORM** | SQLAlchemy | 2.x | Async support |
| **Migrations** | Alembic | Latest | Schema migrations |
| **Validation** | Pydantic | 2.x | Data validation |
| **Google Ads** | google-ads | 25.0.0+ | v23 API support |
| **Background Jobs** | Celery or ARQ | Latest | Async task processing |
| **Testing** | pytest + httpx | Latest | API testing |

### Infrastructure (GCP)

| Service | Purpose | Tier/Config |
|---------|---------|-------------|
| **Cloud Run** | Container hosting | 2 vCPU, 2GB RAM per instance |
| **Cloud SQL** | PostgreSQL database | Enterprise, 2 vCPU, 8GB RAM, HA |
| **Memorystore** | Redis cache | Standard, 1-5 GB |
| **Cloud Storage** | File storage | Standard class |
| **Cloud Tasks** | Job queue | Standard |
| **Pub/Sub** | Event messaging | Standard |
| **Cloud Scheduler** | Cron jobs | Standard |
| **Secret Manager** | Secrets storage | Standard |
| **Cloud Armor** | WAF/DDoS protection | Standard |
| **Cloud CDN** | Asset caching | Standard |
| **Cloud Monitoring** | Observability | Standard |

### External Services

| Service | Purpose | Pricing Model |
|---------|---------|---------------|
| **Gemini API** | AI/LLM features | Pay per token |
| **Google Ads API** | Ad management | Free (with approval) |
| **Meta Marketing API** | FB/IG ads | Free (with approval) |
| **Stripe** | Payments | 2.9% + $0.30/transaction |
| **SendGrid** | Transactional email | Free tier → $19.95/mo |
| **WhatsApp Business** | Messaging | $0.005-0.09/message |
| **Sentry** | Error tracking | Free tier → $26/mo |

---

## Cost Estimates

### Monthly Costs by User Scale

#### Startup Phase (0-100 users)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Cloud Run (Frontend) | 0.5 vCPU, 512MB, ~10K requests/day | ~$15 |
| Cloud Run (Backend) | 1 vCPU, 1GB, ~50K requests/day | ~$40 |
| Cloud Run (Workers) | 1 vCPU, 1GB, ~20K tasks/day | ~$25 |
| Cloud SQL | 1 vCPU, 3.75GB RAM, 50GB SSD, HA | ~$100 |
| Memorystore | Basic, 1GB | ~$35 |
| Cloud Storage | 10GB + operations | ~$5 |
| Cloud Tasks/Pub/Sub | Light usage | ~$5 |
| Networking | Egress, Load Balancer | ~$25 |
| Secret Manager | 10 secrets | ~$1 |
| **Subtotal GCP** | | **~$250/mo** |
| Gemini API | ~100 users × 500 msgs/mo | ~$50 |
| SendGrid | 10K emails/mo | Free |
| Sentry | Free tier | Free |
| Domain + SSL | | ~$15 |
| **TOTAL** | | **~$315/mo** |

#### Growth Phase (100-1,000 users)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Cloud Run (all services) | Auto-scaling, ~500K req/day | ~$300 |
| Cloud SQL | 2 vCPU, 8GB RAM, 200GB SSD, HA | ~$350 |
| Memorystore | Standard, 5GB | ~$200 |
| Cloud Storage | 100GB | ~$25 |
| Cloud Tasks/Pub/Sub | Moderate usage | ~$30 |
| Networking | | ~$100 |
| **Subtotal GCP** | | **~$1,000/mo** |
| Gemini API | ~1K users | ~$300 |
| SendGrid | 100K emails/mo | ~$50 |
| WhatsApp Business | ~10K messages | ~$100 |
| Sentry | Team plan | ~$30 |
| **TOTAL** | | **~$1,500/mo** |

#### Scale Phase (1,000-10,000 users)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Cloud Run (all) | Multi-region, auto-scaling | ~$1,500 |
| Cloud SQL | 4 vCPU, 16GB, 500GB, HA + read replica | ~$1,000 |
| Memorystore | Standard, 25GB cluster | ~$500 |
| Cloud Storage | 500GB | ~$100 |
| All other GCP | | ~$400 |
| **Subtotal GCP** | | **~$3,500/mo** |
| Gemini API | ~10K users | ~$2,000 |
| All other services | | ~$500 |
| **TOTAL** | | **~$6,000/mo** |

### Revenue vs Cost Analysis

| Users | MRR (avg $80/user) | Infrastructure Cost | Margin |
|-------|-------------------|---------------------|--------|
| 100 | $8,000 | $315 | 96% |
| 500 | $40,000 | $1,000 | 97.5% |
| 1,000 | $80,000 | $1,500 | 98% |
| 5,000 | $400,000 | $4,000 | 99% |
| 10,000 | $800,000 | $6,000 | 99.3% |

**Conclusion**: Infrastructure costs are negligible compared to revenue. Even at 100 users, you're highly profitable.

---

## Service Architecture Details

### 1. Frontend Service (Next.js on Cloud Run)

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APPLICATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    APP ROUTER                            │    │
│  │  /                     → Landing Page (Static)           │    │
│  │  /login                → Auth Pages (Static)             │    │
│  │  /signup               → Auth Pages (Static)             │    │
│  │  /dashboard            → Dashboard (SSR + Client)        │    │
│  │  /campaigns            → Campaign List (SSR)             │    │
│  │  /campaigns/[id]       → Campaign Detail (SSR)           │    │
│  │  /ai-advisor           → AI Chat (Client)                │    │
│  │  /reports              → Reports (SSR)                   │    │
│  │  /settings             → Settings (Client)               │    │
│  │  /api/*                → API Routes (BFF pattern)        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  SERVER         │  │  CLIENT         │  │  API ROUTES     │  │
│  │  COMPONENTS     │  │  COMPONENTS     │  │  (BFF)          │  │
│  │                 │  │                 │  │                 │  │
│  │  • Data fetch   │  │  • Interactivity│  │  • Proxy to     │  │
│  │  • SEO          │  │  • Real-time    │  │    backend      │  │
│  │  • Auth check   │  │  • Charts       │  │  • Auth cookies │  │
│  │                 │  │  • Forms        │  │  • Caching      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Deployment Config:
- Container: Node.js 20 Alpine
- Memory: 512MB - 2GB (auto-scale)
- CPU: 0.5 - 2 vCPU (auto-scale)
- Min instances: 1 (avoid cold starts)
- Max instances: 10
- Concurrency: 80 requests/instance
```

### 2. Backend Service (FastAPI on Cloud Run)

```
┌─────────────────────────────────────────────────────────────────┐
│                     FASTAPI APPLICATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    API ROUTER                            │    │
│  │                                                          │    │
│  │  /api/v1/auth/*           → Authentication               │    │
│  │  /api/v1/users/*          → User management              │    │
│  │  /api/v1/organizations/*  → Org management               │    │
│  │  /api/v1/ad-accounts/*    → Ad account CRUD              │    │
│  │  /api/v1/campaigns/*      → Campaign operations          │    │
│  │  /api/v1/metrics/*        → Performance data             │    │
│  │  /api/v1/recommendations/*→ AI recommendations           │    │
│  │  /api/v1/ai-chat/*        → AI advisor                   │    │
│  │  /api/v1/reports/*        → Report generation            │    │
│  │  /api/v1/alerts/*         → Alert management             │    │
│  │  /api/v1/billing/*        → Subscription/billing         │    │
│  │  /api/v1/webhooks/*       → External webhooks            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  SERVICES       │  │  INTEGRATIONS   │  │  MIDDLEWARE     │  │
│  │                 │  │                 │  │                 │  │
│  │  • AuthService  │  │  • GoogleAds    │  │  • Auth (JWT)   │  │
│  │  • UserService  │  │  • MetaAds      │  │  • Rate Limit   │  │
│  │  • CampaignSvc  │  │  • GeminiAI     │  │  • CORS         │  │
│  │  • MetricsService│ │  • Stripe       │  │  • Logging      │  │
│  │  • AIService    │  │  • SendGrid     │  │  • Error Handler│  │
│  │  • ReportService│  │  • WhatsApp     │  │  • Request ID   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Deployment Config:
- Container: Python 3.12 slim
- Memory: 1GB - 4GB (auto-scale)
- CPU: 1 - 4 vCPU (auto-scale)
- Min instances: 1
- Max instances: 20
- Concurrency: 100 requests/instance
- Startup: Gunicorn + Uvicorn workers
```

### 3. Worker Service (Background Processing)

```
┌─────────────────────────────────────────────────────────────────┐
│                     WORKER APPLICATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    TASK HANDLERS                         │    │
│  │                                                          │    │
│  │  SyncTasks:                                              │    │
│  │  • sync_google_ads_account     (every 1-4 hours)         │    │
│  │  • sync_meta_account           (every 1-4 hours)         │    │
│  │  • sync_metrics_hourly         (every hour)              │    │
│  │  • sync_search_terms           (daily)                   │    │
│  │                                                          │    │
│  │  AITasks:                                                │    │
│  │  • analyze_waste               (every 15 min)            │    │
│  │  • generate_recommendations    (on trigger)              │    │
│  │  • classify_search_terms       (batch, daily)            │    │
│  │  • generate_weekly_summary     (weekly)                  │    │
│  │                                                          │    │
│  │  ReportTasks:                                            │    │
│  │  • generate_daily_report       (daily 6am)               │    │
│  │  • generate_weekly_report      (Monday 8am)              │    │
│  │  • calculate_health_scores     (daily)                   │    │
│  │                                                          │    │
│  │  AlertTasks:                                             │    │
│  │  • check_automation_rules      (every 15 min)            │    │
│  │  • send_alert_notifications    (on trigger)              │    │
│  │  • send_daily_briefing         (daily, user timezone)    │    │
│  │                                                          │    │
│  │  MaintenanceTasks:                                       │    │
│  │  • cleanup_old_metrics         (daily)                   │    │
│  │  • refresh_oauth_tokens        (every 30 min)            │    │
│  │  • aggregate_hourly_to_daily   (daily)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Triggered by:
- Cloud Scheduler (cron jobs)
- Pub/Sub (event-driven)
- Cloud Tasks (queued jobs)
```

---

## Data Flow Diagrams

### 1. User Authentication Flow

```
┌──────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ User │────►│ Frontend │────►│  Google  │────►│ Frontend │────►│ Backend  │
│      │     │ /login   │     │  OAuth   │     │ callback │     │ /auth    │
└──────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                                      │
                                                                      ▼
┌──────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ User │◄────│ Dashboard│◄────│ Frontend │◄────│  JWT +   │◄────│ Create   │
│      │     │          │     │ redirect │     │ Cookie   │     │ Session  │
└──────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘

Steps:
1. User clicks "Sign in with Google"
2. Frontend redirects to Google OAuth
3. User authorizes, Google redirects back with code
4. Frontend sends code to Backend
5. Backend exchanges code for tokens, creates user/session
6. Backend returns JWT, Frontend stores in HttpOnly cookie
7. User redirected to dashboard
```

### 2. Google Ads Sync Flow

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│ Scheduler │────►│  Pub/Sub  │────►│  Worker   │────►│ Google    │
│ (Cron)    │     │  Topic    │     │  Service  │     │ Ads API   │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
                                          │                  │
                                          │                  │
                                          ▼                  ▼
                                    ┌───────────┐     ┌───────────┐
                                    │ Cloud SQL │◄────│ Campaign  │
                                    │ (Update)  │     │ Data      │
                                    └───────────┘     └───────────┘
                                          │
                                          ▼
                                    ┌───────────┐     ┌───────────┐
                                    │ AI Analyze│────►│ Recommend │
                                    │  Waste    │     │ Actions   │
                                    └───────────┘     └───────────┘
                                          │
                                          ▼
                                    ┌───────────┐
                                    │  Alert    │
                                    │  User     │
                                    └───────────┘

Sync Schedule:
- Full sync: Daily at 2am (user timezone)
- Metrics sync: Every 1-4 hours (based on plan)
- Search terms: Daily at 3am
- Real-time changes: Via change_history API
```

### 3. AI Recommendation Flow

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│ Trigger:  │────►│  Worker   │────►│ Fetch     │────►│ Cloud SQL │
│ Scheduler │     │  Service  │     │ Account   │     │ (Read)    │
│ or Event  │     │           │     │ Data      │     │           │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
                                          │
                                          ▼
                                    ┌───────────┐
                                    │ Build     │
                                    │ AI Prompt │
                                    │ + Context │
                                    └───────────┘
                                          │
                                          ▼
                                    ┌───────────┐
                                    │ Gemini    │
                                    │ API       │
                                    │ (Flash)   │
                                    └───────────┘
                                          │
                                          ▼
                                    ┌───────────┐     ┌───────────┐
                                    │ Parse     │────►│ Store     │
                                    │ Response  │     │ Recommend │
                                    └───────────┘     └───────────┘
                                                            │
                                    ┌───────────┐           │
                                    │ Notify    │◄──────────┘
                                    │ User      │
                                    │(if urgent)│
                                    └───────────┘

AI Decision Flow:
1. Rules Engine first (fast, cheap, deterministic)
2. AI only for complex decisions (expensive, slower)
3. Cache common AI responses (context caching)
```

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION LAYERS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Identity Provider                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • Google OAuth 2.0 (primary)                            │    │
│  │  • Email/Password (fallback)                             │    │
│  │  • MFA via Authenticator App (optional, required Agency) │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Layer 2: Session Management                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • JWT access tokens (15 min expiry)                     │    │
│  │  • Refresh tokens in Redis (7 day expiry)                │    │
│  │  • HttpOnly, Secure, SameSite=Strict cookies             │    │
│  │  • Token rotation on refresh                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Layer 3: Authorization                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • RBAC (owner > admin > member > viewer)                │    │
│  │  • Resource-based (org membership check)                 │    │
│  │  • Row-Level Security in PostgreSQL                      │    │
│  │  • Permission checks in API middleware                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Security

| Data Type | At Rest | In Transit | Access Control |
|-----------|---------|------------|----------------|
| OAuth Tokens | AES-256 (app-level) + CMEK | TLS 1.3 | Service Account only |
| User PII | Cloud SQL encryption | TLS 1.3 | RBAC + RLS |
| Metrics | Cloud SQL encryption | TLS 1.3 | Org membership |
| Reports | Cloud Storage encryption | Signed URLs | Owner + explicit share |
| Secrets | Secret Manager | IAM | Least privilege |

### Network Security

```
Internet
    │
    ▼
┌─────────────────────┐
│   Cloud Armor       │ ← WAF rules, DDoS protection, geo-blocking
│   (Edge Security)   │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│   Load Balancer     │ ← SSL termination, health checks
│   (HTTPS only)      │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│   Cloud Run         │ ← Private networking, IAM auth
│   (VPC Connector)   │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│   Private Services  │ ← Cloud SQL, Redis (no public IP)
│   (VPC only)        │
└─────────────────────┘
```

---

## Scalability Strategy

### Horizontal Scaling

| Component | Scaling Trigger | Min | Max |
|-----------|-----------------|-----|-----|
| Frontend (Cloud Run) | CPU > 60% or Requests > 80/instance | 1 | 10 |
| Backend (Cloud Run) | CPU > 70% or Requests > 100/instance | 1 | 20 |
| Workers (Cloud Run) | Queue depth > 100 | 1 | 10 |
| Cloud SQL | Manual (upgrade tier) | 1 primary + 1 replica | N/A |
| Redis | Manual (upgrade size) | 1 | Cluster |

### Database Scaling Path

```
Phase 1 (0-1K users):
└── Single Cloud SQL instance (2 vCPU, 8GB)
    └── Read-heavy? Add read replica

Phase 2 (1K-10K users):
└── Cloud SQL Enterprise Plus (4 vCPU, 16GB)
    └── 1 read replica
    └── Connection pooling (PgBouncer)

Phase 3 (10K+ users):
└── Cloud SQL Enterprise Plus (8+ vCPU, 32GB+)
    └── Multiple read replicas
    └── Consider Spanner for global distribution
    └── Archive old metrics to BigQuery
```

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                        CACHING LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: CDN (Cloud CDN)                                        │
│  ├── Static assets (JS, CSS, images): 1 year                     │
│  ├── API responses: varies by endpoint                           │
│  └── TTL: stale-while-revalidate pattern                         │
│                                                                  │
│  Layer 2: Application Cache (Redis)                              │
│  ├── User sessions: 7 days                                       │
│  ├── API rate limits: 1 minute sliding window                    │
│  ├── Metrics aggregations: 5 minutes                             │
│  ├── AI prompt context: 1 hour (Gemini context caching)          │
│  └── Feature flags: 5 minutes                                    │
│                                                                  │
│  Layer 3: Database Query Cache                                   │
│  ├── Prepared statements: persistent                             │
│  └── Connection pooling: PgBouncer                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Pipeline

### CI/CD with GitHub Actions + Cloud Build

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   GitHub    │────►│   Cloud     │────►│  Artifact   │────►│  Cloud Run  │
│   Push      │     │   Build     │     │  Registry   │     │  Deploy     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                                       │
      │                   ▼                                       │
      │             ┌─────────────┐                               │
      │             │   Tests     │                               │
      │             │   Lint      │                               │
      │             │   Security  │                               │
      │             └─────────────┘                               │
      │                                                           │
      ▼                                                           ▼
┌─────────────┐                                           ┌─────────────┐
│  Feature    │                                           │  Production │
│  Branch     │──────────────────────────────────────────►│  (main)     │
└─────────────┘     PR Review + Staging Deploy            └─────────────┘
```

### Environments

| Environment | Purpose | Database | URL |
|-------------|---------|----------|-----|
| Local | Development | Local PostgreSQL | localhost:3000 |
| Preview | PR previews | Shared staging DB | pr-123.preview.adsmaster.app |
| Staging | Pre-production testing | Staging DB | staging.adsmaster.app |
| Production | Live users | Production DB | app.adsmaster.app |

### Deployment Strategy

- **Blue-Green Deployment**: Cloud Run supports traffic splitting
- **Canary Releases**: 5% → 25% → 50% → 100%
- **Rollback**: Instant via Cloud Run revision
- **Database Migrations**: Run before deployment, backward compatible

---

## Monitoring & Observability

### Metrics to Track

| Category | Metric | Alert Threshold |
|----------|--------|-----------------|
| **Availability** | Uptime | < 99.9% |
| **Latency** | p95 response time | > 500ms |
| **Errors** | 5xx error rate | > 1% |
| **Saturation** | CPU utilization | > 80% |
| | Memory utilization | > 85% |
| | Database connections | > 80% pool |
| **Business** | Active users (DAU) | Trending down |
| | Sync failures | > 5% |
| | AI API errors | > 2% |

### Alerting

```
┌─────────────────────────────────────────────────────────────────┐
│                     ALERTING SETUP                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Severity: Critical (Page immediately)                           │
│  ├── Service down (5xx > 10% for 2 min)                          │
│  ├── Database unreachable                                        │
│  └── Security incident                                           │
│                                                                  │
│  Severity: High (Page during business hours)                     │
│  ├── p95 latency > 2s for 5 min                                  │
│  ├── Error rate > 5% for 5 min                                   │
│  └── Sync failures > 10%                                         │
│                                                                  │
│  Severity: Medium (Slack notification)                           │
│  ├── CPU > 80% for 10 min                                        │
│  ├── Memory > 85% for 10 min                                     │
│  └── Unusual traffic pattern                                     │
│                                                                  │
│  Severity: Low (Daily digest)                                    │
│  ├── Deprecation warnings                                        │
│  ├── Certificate expiry (< 30 days)                              │
│  └── Quota approaching limit                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Logging Strategy

| Log Type | Destination | Retention | Purpose |
|----------|-------------|-----------|---------|
| Application logs | Cloud Logging | 30 days | Debugging |
| Access logs | Cloud Logging | 90 days | Traffic analysis |
| Audit logs | Cloud Logging | 2 years | Compliance |
| Error logs | Sentry | 90 days | Error tracking |
| Metrics | Cloud Monitoring | 1 year | Performance |

---

## Disaster Recovery

### Backup Strategy

| Data | Backup Frequency | Retention | RTO | RPO |
|------|------------------|-----------|-----|-----|
| Cloud SQL | Continuous (point-in-time) | 30 days | 4 hours | 1 hour |
| Redis | Daily snapshot | 7 days | 1 hour | 24 hours |
| Cloud Storage | Cross-region replication | Forever | Minutes | Near-zero |
| Secrets | Version history | 90 days | Minutes | Near-zero |

### Failover Regions

```
Primary: us-central1 (Iowa)
    │
    ├── Cloud SQL: HA with automatic failover (same region)
    │
    └── Disaster Recovery: us-east1 (South Carolina)
        ├── Cloud SQL: Cross-region replica (async)
        ├── Cloud Storage: Dual-region bucket
        └── Cloud Run: Can deploy to any region
```

### Recovery Procedures

1. **Service Outage**: Cloud Run auto-restarts, load balancer routes to healthy instances
2. **Database Failure**: Automatic HA failover (< 60 seconds)
3. **Region Failure**: Manual DNS failover to DR region (RTO: 4 hours)
4. **Data Corruption**: Point-in-time recovery from backup

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
- [ ] GCP project setup, IAM, networking
- [ ] Cloud SQL, Redis, Cloud Storage setup
- [ ] CI/CD pipeline with Cloud Build
- [ ] Basic Next.js frontend scaffold
- [ ] Basic FastAPI backend scaffold
- [ ] Database migrations with Alembic
- [ ] Authentication (Google OAuth)

### Phase 2: Core Features (Weeks 5-8)
- [ ] Google Ads API integration
- [ ] Data sync workers
- [ ] Dashboard with real metrics
- [ ] Campaign management
- [ ] Basic alerting

### Phase 3: AI & Automation (Weeks 9-12)
- [ ] Gemini API integration
- [ ] AI recommendations engine
- [ ] Automation rules
- [ ] AI Advisor chat
- [ ] WhatsApp integration

### Phase 4: Polish & Scale (Weeks 13-16)
- [ ] Performance optimization
- [ ] Comprehensive monitoring
- [ ] Security hardening
- [ ] Load testing
- [ ] Documentation

---

## Key Decisions & Trade-offs

| Decision | Choice | Alternative Considered | Why This Choice |
|----------|--------|------------------------|-----------------|
| Monolith vs Microservices | Modular Monolith | Microservices | Simpler for small team, can split later |
| Cloud Run vs GKE | Cloud Run | GKE (Kubernetes) | Simpler, auto-scaling, pay-per-use |
| FastAPI vs Node.js | FastAPI (Python) | Express/NestJS | Google Ads Python SDK, AI/ML ecosystem |
| PostgreSQL vs MongoDB | PostgreSQL | MongoDB | Relational data, ACID, mature ecosystem |
| Redis vs Memcached | Redis | Memcached | More features (pub/sub, data structures) |
| Celery vs Cloud Tasks | Cloud Tasks + Pub/Sub | Celery | Managed, integrated with GCP, simpler |
| Gemini vs OpenAI | Gemini | GPT-4 | Native GCP, cheaper, context caching |

---

## Questions Before Implementation

1. **Domain**: What domain will you use? (affects SSL, DNS setup)
2. **Regions**: Primary region preference? (affects latency for users)
3. **Team Access**: Who needs GCP console access? (affects IAM setup)
4. **Budget Alerts**: What monthly budget cap for alerts?
5. **Compliance**: Any specific compliance requirements (HIPAA, SOC2)?

---

*Document Version: 1.0*
*Created: March 2026*
*Status: PENDING APPROVAL*

## Sources

- [Google Cloud Architecture Center](https://docs.cloud.google.com/architecture)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Cloud SQL Pricing](https://cloud.google.com/sql/pricing)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Google Ads API v23](https://developers.google.com/google-ads/api/reference/rpc/v23/overview)
- [Next.js FastAPI Template](https://github.com/vintasoftware/nextjs-fastapi-template)
- [GCP Security Best Practices 2026](https://fidelissecurity.com/cybersecurity-101/best-practices/google-cloud-platform-gcp-security/)
