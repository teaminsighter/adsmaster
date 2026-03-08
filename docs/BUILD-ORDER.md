# AdsMaster Build Order

## Overview

14 planning phases → 6 build sprints. Each sprint combines related phases.

```
Sprint 1: Foundation     → Phase 1 + 2 + 13 (partial)
Sprint 2: Google Ads     → Phase 13 + 4 (partial)
Sprint 3: Frontend MVP   → Phase 5 + 12
Sprint 4: AI Engine      → Phase 7 + 14 (critical fixes)
Sprint 5: Meta + Scale   → Phase 11 + 3 + 4
Sprint 6: Launch Prep    → Phase 6 + 8 + 9 + 10
```

---

## Sprint 1: Foundation (Week 1-2)

### What We Build
- Project scaffolding (monorepo)
- Database schema + migrations
- Basic auth (Supabase)
- API abstraction layer base

### Phases Used
| Phase | What to Use |
|-------|-------------|
| Phase 1 | Database schema (start with 15 core tables, not 51) |
| Phase 2 | Tech stack decisions (Next.js, FastAPI, Supabase) |
| Phase 13 | `adapters/base.py` abstract interface |

### Core Tables First
```
users
organizations
ad_accounts
ad_platforms
campaigns
ad_groups
keywords
metrics_daily
automation_rules
automation_executions
recommendations
sync_logs
```

### Deliverables
- [ ] Monorepo structure (`/apps/web`, `/apps/api`, `/packages/shared`)
- [ ] Supabase project + core tables with RLS
- [ ] FastAPI skeleton with health endpoint
- [ ] Next.js app with auth flow
- [ ] Google Ads adapter interface (no implementation yet)

---

## Sprint 2: Google Ads Integration (Week 3-4)

### What We Build
- Google Ads OAuth flow
- Google Ads adapter v23.1 implementation
- Campaign sync worker
- Basic metrics storage

### Phases Used
| Phase | What to Use |
|-------|-------------|
| Phase 13 | Full adapter implementation (`v23_1.py`) |
| Phase 4 | GoogleAdsService, SyncWorker |
| Phase 3 | OAuth endpoints only |

### Key Endpoints
```
POST /auth/google-ads/connect
GET  /auth/google-ads/callback
GET  /accounts
GET  /accounts/{id}/campaigns
POST /sync/trigger/{account_id}
```

### Deliverables
- [ ] Google Ads OAuth working
- [ ] Adapter fetches campaigns, keywords, metrics
- [ ] Sync worker stores data in Supabase
- [ ] User can connect account and see campaigns

### Milestone: "Connect account → see campaigns" working

---

## Sprint 3: Frontend MVP (Week 5-6)

### What We Build
- Dashboard with real data
- Campaign list + detail views
- Design system components
- Dark/light theme

### Phases Used
| Phase | What to Use |
|-------|-------------|
| Phase 5 | Next.js app router, components structure |
| Phase 12 | Design tokens, component specs, wireframes |

### Components to Build
```
/components
  /ui (shadcn)
  /dashboard
    MetricCard
    BudgetPacingBar
    SpendChart
    CampaignTable
    HealthScore
  /campaigns
    CampaignDetail
    KeywordsTable
    AdGroupsTable
```

### Deliverables
- [ ] Dashboard showing real metrics from connected account
- [ ] Campaign list with sorting/filtering
- [ ] Campaign detail with tabs
- [ ] Budget pacing visualization
- [ ] Theme toggle working

### Milestone: Dashboard matches wireframe with real data

---

## Sprint 4: AI Recommendations (Week 7-8)

### What We Build
- Recommendation engine
- First 5 AI rules
- Apply/dismiss/undo flow
- Critical fixes (idempotency, freshness)

### Phases Used
| Phase | What to Use |
|-------|-------------|
| Phase 7 | Recommendation rules engine, scoring |
| Phase 14 | Idempotency, undo button, data freshness guard |

### First 5 Rules
```python
RULES = [
    "wasting_keywords",      # Spend > $50, conversions = 0
    "low_quality_score",     # QS < 5, high spend
    "budget_pacing_fast",    # >60% spent before 50% of month
    "missing_conversions",   # No conversion tracking
    "high_cpa_keywords",     # CPA > 2x account average
]
```

### Deliverables
- [ ] Recommendation engine runs on sync
- [ ] AI Recommendations page with Critical/Warning/Opportunity
- [ ] Confidence scores on each recommendation
- [ ] Apply button with idempotency protection
- [ ] Undo button (24h window)
- [ ] Data freshness indicator

### Milestone: User sees actionable AI recommendations

---

## Sprint 5: Meta + Full API (Week 9-10)

### What We Build
- Meta Ads adapter
- Full REST API
- WebSocket for real-time
- Multi-account support

### Phases Used
| Phase | What to Use |
|-------|-------------|
| Phase 11 | Meta adapter, OAuth, Pixel integration |
| Phase 3 | All remaining endpoints |
| Phase 4 | All services, workers |

### Meta Integration
```
POST /auth/meta/connect
GET  /auth/meta/callback
GET  /accounts/{id}/campaigns  (works for both platforms)
GET  /accounts/{id}/audiences
POST /accounts/{id}/audiences/lookalike
```

### Deliverables
- [ ] Meta OAuth + token refresh
- [ ] Meta campaigns sync
- [ ] Unified campaign view (Google + Meta)
- [ ] Platform filter on dashboard
- [ ] WebSocket for live metrics updates

### Milestone: Both Google Ads + Meta working in one dashboard

---

## Sprint 6: Launch Prep (Week 11-12)

### What We Build
- Onboarding flow
- Billing (Stripe)
- Security hardening
- Testing
- CI/CD
- Monitoring

### Phases Used
| Phase | What to Use |
|-------|-------------|
| Phase 6 | Onboarding wizard, Stripe integration, support |
| Phase 8 | Security audit, GDPR, encryption |
| Phase 9 | Terraform, GitHub Actions, alerting |
| Phase 10 | Unit tests, E2E tests, load tests |
| Phase 14 | Remaining critical fixes (rate limiting, reconciliation) |

### Deliverables
- [ ] 6-step onboarding wizard
- [ ] Stripe subscription working
- [ ] Rate limit handling with Redis
- [ ] Reconciliation worker (daily)
- [ ] Token health dashboard
- [ ] 80% test coverage on critical paths
- [ ] CI/CD pipeline deploying to GCP
- [ ] Error monitoring (Sentry)
- [ ] Uptime monitoring

### Milestone: Ready for first paying user

---

## Quick Reference: Phase → Sprint Mapping

| Phase | Sprint | Priority |
|-------|--------|----------|
| Phase 1: Database | Sprint 1 | Core tables first |
| Phase 2: Architecture | Sprint 1 | Tech decisions |
| Phase 3: API Design | Sprint 2 + 5 | Build as needed |
| Phase 4: Backend | Sprint 2 + 5 | Build as needed |
| Phase 5: Frontend | Sprint 3 | After data flows |
| Phase 6: Customer | Sprint 6 | Before launch |
| Phase 7: AI/ML | Sprint 4 | Core differentiator |
| Phase 8: Security | Sprint 6 | Before launch |
| Phase 9: DevOps | Sprint 6 | Before launch |
| Phase 10: Testing | Sprint 6 | Before launch |
| Phase 11: Meta | Sprint 5 | After Google works |
| Phase 12: UI Design | Sprint 3 | Reference for frontend |
| Phase 13: API Abstraction | Sprint 1 + 2 | Build FIRST |
| Phase 14: Critical Fixes | Sprint 4 + 6 | Integrated throughout |

---

## Project Structure

```
adsmaster/
├── apps/
│   ├── web/                 # Next.js 15 frontend
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── api/                 # FastAPI backend
│       ├── app/
│       │   ├── api/
│       │   ├── core/
│       │   ├── integrations/
│       │   │   ├── google_ads/
│       │   │   │   ├── adapters/
│       │   │   │   │   ├── base.py
│       │   │   │   │   └── v23_1.py
│       │   │   │   └── adapter_factory.py
│       │   │   └── meta_ads/
│       │   ├── services/
│       │   └── workers/
│       └── tests/
├── packages/
│   └── shared/              # Shared types/utils
├── supabase/
│   └── migrations/
├── docs/
│   └── planning/
└── wireframes/
```

---

## Start Command

```bash
# After this plan is approved, run:
cd /Volumes/Extra\ -\ HardDisk/COOKING/adsmaster

# Initialize monorepo
npm init -y
npm install -D turbo

# Create app directories
mkdir -p apps/web apps/api packages/shared supabase/migrations

# Initialize Next.js
cd apps/web && npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false

# Initialize FastAPI (in separate terminal)
cd apps/api && poetry init && poetry add fastapi uvicorn supabase google-ads

# Initialize Supabase
npx supabase init
```

---

*Ready to run `npm init`?*
