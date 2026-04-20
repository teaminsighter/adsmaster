# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AdsMaster is an AI-powered advertising management SaaS platform that manages Google Ads and Meta Ads campaigns. It's a monorepo with a Next.js frontend and FastAPI backend.

**Current Status:** See [STATUS.md](./STATUS.md) for implementation progress (~65% complete).

## Quick Start (First-Time Setup)

```bash
# 1. Install dependencies
npm install                          # Frontend + monorepo deps
cd apps/api && poetry install        # Backend deps

# 2. Copy environment file and configure
cp .env.example .env                 # Edit with your keys

# 3. Start Supabase (local database)
supabase start                       # Requires Docker running

# 4. Run migrations
npm run db:migrate

# 5. Start development servers (two terminal tabs)
# Tab 1: npm run dev:web
# Tab 2: cd apps/api && poetry run uvicorn app.main:app --reload --port 8081
```

## Commands

### Development
```bash
# Frontend only (Next.js on port 3000)
npm run dev:web

# Backend API (MUST use port 8081 for frontend compatibility)
cd apps/api && poetry run uvicorn app.main:app --reload --port 8081

# Both together (two terminal tabs)
# Tab 1: npm run dev:web
# Tab 2: cd apps/api && poetry run uvicorn app.main:app --reload --port 8081
```

**Important**: The frontend expects the API at `http://localhost:8081` (via `NEXT_PUBLIC_API_URL`). The `npm run dev:api` script in package.json uses port 8000, which breaks frontend API calls - always use the port 8081 command above.

### Build & Lint
```bash
npm run build          # Build all apps via Turbo
npm run lint           # Lint all apps via Turbo

# Frontend-specific
cd apps/web && npm run lint
cd apps/web && npx tsc --noEmit    # Type check

# Backend-specific
cd apps/api && poetry run black .      # Format code
cd apps/api && poetry run ruff check . # Lint
```

### Database
```bash
npm run db:migrate     # Push schema to Supabase
npm run db:reset       # Reset Supabase database
supabase status        # Check local Supabase status
```

### Backend Testing
```bash
cd apps/api
poetry run pytest                           # Run all tests
poetry run pytest tests/test_file.py        # Single test file
poetry run pytest -k "test_name"            # Run specific test
poetry run pytest -v                        # Verbose output
```

### Frontend Testing
```bash
cd apps/web
npm run test                                # Run all tests (if configured)
npx playwright test                         # E2E tests (if configured)
```

### API Testing (with auth)
```bash
# Get auth token (use demo test user for development)
# Requires backend running on port 8081
TOKEN=$(curl -s -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"testpass123"}' | jq -r '.access_token')

# Test authenticated endpoints
curl -s "http://localhost:8081/accounts" -H "Authorization: Bearer $TOKEN"

# Interactive API docs (Swagger UI)
# http://localhost:8081/docs
```

## Architecture

### Monorepo Structure
- `apps/web/` - Next.js 16 frontend (React 19, TailwindCSS 4, lucide-react icons, recharts)
- `apps/api/` - FastAPI backend (Python 3.10-3.12, Poetry)
- `packages/shared/` - Shared types/utilities
- `supabase/migrations/` - Database migrations (23 files: 00001-00023)
- `database/schema/` - Reference SQL schemas (documentation)
- `docs/planning/` - Planning phase documents (phases 1-18)

### Frontend Architecture (apps/web/)
- **App Router**: `app/` directory with page.tsx files
- **Components**: `components/` with subdirectories by feature (dashboard/, ui/, layout/, admin/, tracking/, campaigns/, etc.)
- **API Client**: `lib/api.ts` - typed fetch wrapper for backend calls
- **Hooks**: `lib/hooks/useApi.ts` - React hooks for API data fetching with loading/error states
- **Admin Hooks**: `lib/hooks/useAdminApi.ts` - Separate hooks for admin panel with its own JWT
- **Contexts**: `lib/contexts/` - Auth context, theme context for admin panel
- **Providers**: `lib/providers/` - React context providers

### Backend Architecture (apps/api/)
- **Entry Point**: `app/main.py` - FastAPI app with CORS, routers
- **API Routes**: `app/api/` - 39 route modules including admin, tracking, analytics, studio, CRM
- **Services**: `app/services/` - Business logic (database, supabase_client, automation_service, meta_ads_service, email_service, stripe_service, ga4_service, alert_service, sync/, tracking/, crm/)
- **Integrations**: `app/integrations/` - External API adapters + rate limiter
- **Workers**: `app/workers/` - Background job processors:
  - `sync_worker.py` - Syncs campaigns/metrics from ad platforms
  - `token_refresh_worker.py` - Refreshes OAuth tokens before expiry
  - `reconciliation_worker.py` - Daily reconciliation of data drift
  - `alert_worker.py` - Processes goal alerts and notifications
- **Config**: `app/core/config.py` - Pydantic settings from .env

### Ad Platform Adapters (Critical Pattern)
The adapter pattern isolates API version changes:
```
app/integrations/google_ads/adapters/base.py   # Abstract interface
app/integrations/google_ads/adapters/v23_1.py  # Google Ads API v23.1
app/integrations/meta_ads/adapters/base.py     # Meta abstract interface
app/integrations/meta_ads/adapters/v21.py      # Meta Marketing API v21
```
Services call adapters, never SDKs directly. When a new API version releases, add a new adapter file implementing the base interface.

### AI/ML Services
- `app/services/ai/` - LLM providers (Gemini, OpenAI, Anthropic) with factory pattern
- `app/services/ml/` - ML models (forecasting, anomaly detection, classification) via BigQuery ML and Vertex AI
- `app/services/recommendations/` - Rule-based engine + AI-powered recommendation engine + action executor + verification service

### Data Flow
1. Frontend calls `lib/api.ts` functions or uses hooks from `lib/hooks/useApi.ts`
2. Backend routes in `app/api/` handle requests (use `get_current_user` dependency for auth)
3. Services in `app/services/` contain business logic
4. Adapters in `app/integrations/` talk to Google/Meta APIs (never call SDKs directly)
5. Data stored in Supabase (PostgreSQL) via `services/supabase_client.py`

### Adding New API Endpoints
1. Create route handler in `apps/api/app/api/your_feature.py`
2. Import and include router in `apps/api/app/main.py` (add to imports and `app.include_router()`)
3. Add corresponding functions in `apps/web/lib/api.ts` (for direct API calls) or hooks in `lib/hooks/useApi.ts` (for React components)

## Environment Variables

Required in `.env` at project root:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`
- `META_APP_ID`, `META_APP_SECRET`
- `JWT_SECRET` - Required for user authentication (change from default in production)
- `REDIS_URL` (optional, defaults to localhost:6379)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (for billing)
- `RESEND_API_KEY` (for transactional emails)

AI providers (at least one required for AI features):
- `GEMINI_API_KEY` - Google Gemini
- `OPENAI_API_KEY` - OpenAI GPT models
- `ANTHROPIC_API_KEY` - Anthropic Claude models

Frontend uses `NEXT_PUBLIC_API_URL` (defaults to http://localhost:8081).

Requires Node.js >=20, Python 3.10-3.12.

## Key Conventions

### Money Values
All monetary values use **micros** (1 USD = 1,000,000 micros). Use `formatMicros()` from `lib/api.ts` for display.

### API Response Pattern
Backend returns `{ data: T, error: string | null }` pattern. Check error before using data.

### Routes
- Health: `/health` - API health check (no auth required)
- Auth: `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`
- Google Ads: `/accounts/`, `/accounts/{id}/campaigns/`
- Meta Ads: `/api/v1/meta/accounts/{id}/campaigns/`
- Recommendations: `/api/v1/recommendations/` (apply, dismiss, undo, bulk operations)
- Automations: `/api/v1/automations/rules/`
- AI Chat: `/api/v1/ai-chat/`
- ML: `/api/v1/ml/` (forecast/spend, forecast/conversions, anomalies, predict/keywords, status)
- Settings: `/api/v1/settings/` (preferences, notifications, team, api-keys, billing)
- Admin: `/api/v1/admin/` (super admin only - users, orgs, analytics, config, emails, webhooks)
- Sync: `/sync/trigger/{account_id}`, `/sync/status/{account_id}`, `/sync/logs`
- Tracking: `/tracking/`, `/api/v1/visitors/`, `/api/v1/conversions/offline`, `/api/v1/session-recordings/`
- Goals: `/api/v1/goals/` (ad goals, alerts, budget pacing)
- Studio: `/api/v1/studio/` (custom dashboards)
- Domains: `/api/v1/domains/` (CNAME tracking domains)
- CRM: `/api/v1/crm/` (HubSpot, Salesforce integrations)
- Analytics: `/api/v1/ad-insights/`, `/api/v1/clicks/`, `/api/v1/products/`, `/api/v1/search-console/`, `/api/v1/ga4/`
- Webhooks: `/webhooks/` (Stripe), `/webhooks/ingest/` (external data ingestion)
- Demo (no auth): `/api/v1/demo/*` - Returns mock data for UI development

### Demo Mode
The `/api/v1/demo/*` endpoints return mock data without requiring ad account connections or authentication. The frontend hooks in `lib/hooks/useApi.ts` (e.g., `useDashboard()`, `useCampaigns()`) call demo endpoints by default. The `useApi` hook detects `demo_mode: true` in responses and sets an `isDemo` flag. Use demo endpoints during development before real ad accounts are connected.

### Authentication
Backend uses JWT tokens (PyJWT). Protected routes use `get_current_user` dependency from `app/api/user_auth.py`. Access tokens expire in 15 minutes; refresh tokens in 30 days. User passwords use SHA256 with per-user salt; admin passwords use bcrypt.

### Database
- Uses Row-Level Security (RLS) for multi-tenant isolation
- `organization_id` is the tenant key on most tables
- Migrations live in `supabase/migrations/` (numbered 00001-00023)
- Reference schemas in `database/schema/` for documentation

### Frontend Hooks Pattern
The `useApi` hook in `lib/hooks/useApi.ts` provides data fetching with:
- Automatic loading/error states
- Demo mode detection (`isDemo` flag when `demo_mode: true` in response)
- `refetch()` function for manual refresh
- Feature-specific hooks: `useDashboard()`, `useCampaigns()`, `useRecommendations()`, `useAnalytics()`, `useKeywords()`, `useAudiences()`, `useConnectedAccounts()`, `usePreferences()`, `useNotificationSettings()`, `useTeamMembers()`, `useApiKeys()`, `useBilling()`, `useGoals()`, `useSessionRecordings()`

### Admin Panel
The admin panel (`/admin/*` routes) has separate authentication from regular users:
- Uses `lib/hooks/useAdminApi.ts` with its own JWT tokens stored in `localStorage` as `admin_token`
- Admin users are stored in `admin_users` table with `is_super_admin` flag
- Admin endpoints at `/api/v1/admin/*` require admin JWT, not regular user JWT
- Admin login: POST `/api/v1/admin/auth/login`
- Default admin credentials (dev only): `admin@adsmaster.io` / `admin123`

### Subscription Tiers (defined in 00007_billing.sql)
- **Free**: 1 ad account, 50 AI messages/month, Google Ads only
- **Starter** ($49/mo): 2 accounts, 200 messages, Google + Meta
- **Growth** ($149/mo): 5 accounts, 1000 messages, forecasting
- **Agency** ($299/mo): 25 accounts, 5000 messages, white-label, API access
- **Enterprise**: Custom pricing, unlimited everything

## Production Deployment (Coolify on Hostinger VPS)

### Current Deployment Status (April 2026) ✅ LIVE
**Domain**: digitalytics.io
- **Frontend**: https://app.digitalytics.io ✅ Working
- **API**: https://api.digitalytics.io ✅ Working
- **PostgreSQL**: Internal Coolify database ✅ Working
- **Redis**: Internal Coolify Redis ✅ Available

**GitHub Repo**: https://github.com/teaminsighter/adsmaster (private)
**Auto-deploy**: Enabled - pushes to `main` trigger automatic deployment

### What's Working in Production
- ✅ User registration and login (email/password)
- ✅ Google OAuth login ("Sign in with Google")
- ✅ Admin panel login (demo or env-based)
- ✅ Dashboard with demo data
- ✅ All MVP pages (Campaigns, Keywords, Audiences, AI Advisor, etc.)
- ✅ Mobile responsive UI with bottom navigation
- ✅ Light/Dark theme support

### MVP Scope (What's Deployed)
This deployment is **MVP - Ads features only**. The sidebar was simplified to core features:
- ✅ Dashboard
- ✅ Campaigns
- ✅ Keywords
- ✅ Audiences
- ✅ AI Advisor
- ✅ Recommendations
- ✅ Analytics (basic)
- ✅ Settings

**NOT included in this deployment** (hidden from sidebar, pages have `@ts-nocheck`):
- ❌ Tracking (Session recordings, Live debug, Domains, Conversion import)
- ❌ CRM Integrations (HubSpot, Salesforce, etc.)
- ❌ Reporting (Custom reports)
- ❌ Studio (Custom dashboards)
- ❌ Advanced Analytics (Click analytics, Product analytics, Search console)

These features exist in the codebase but are not exposed in the sidebar for MVP. To enable them later, update `apps/web/components/layout/Sidebar.tsx` and `SidebarMobile.tsx`.

### Admin Panel Access
Two ways to access admin panel at `/admin/login`:

1. **Demo Admin** (always works, bypasses database):
   - Email: `admin@adsmaster.io`
   - Password: `admin123`

2. **Custom Admin** (via environment variables):
   - Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Coolify API env vars
   - Restart API - startup event creates/updates the admin user
   - Check logs for: `Updated admin user: your@email.com`

### Deployment Files
- `deploy/coolify/api.Dockerfile` - Backend API Docker build
- `deploy/coolify/web.Dockerfile` - Frontend Docker build (monorepo standalone)
- `deploy/coolify/DEPLOY-COOLIFY.md` - Full deployment guide

### Dockerfile Fixes Applied During Deployment
1. **Poetry `--no-dev` deprecated** → Changed to `--only main`
2. **Python version** → Changed to `>=3.10,<3.13` for cryptography compatibility
3. **Poetry missing README** → Added `--no-root` flag
4. **SQLAlchemy postgres:// dialect** → Auto-convert to `postgresql://` in `database.py`
5. **Monorepo standalone path** → Server.js at `/app/apps/web/server.js`
6. **IPv6 healthcheck** → Use `127.0.0.1` instead of `localhost`

### Production Code Fixes (April 2026)
These fixes were applied to make production work:

1. **Google OAuth redirect** (`apps/api/app/core/config.py`):
   - Changed `google_auth_redirect_uri` to `google_redirect_uri` to match env var name

2. **User registration** (`apps/api/app/api/user_auth.py`):
   - Fixed "list index out of range" when Google returns empty name
   - Handle `full_name.split()` safely

3. **Admin login UUID serialization** (`apps/api/app/api/admin.py`):
   - Convert `admin["id"]` UUID to string before creating JWT tokens
   - Handle schema variations (`is_super_admin` vs `role`, `full_name` vs `name`)

4. **Admin creation from env vars** (`apps/api/app/main.py`):
   - Added startup event to create/update admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD`
   - Demo admin check moved to beginning of login flow (bypasses database)

5. **Database schema additions** (run manually in production):
   ```sql
   -- Users table additions
   ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

   -- User sessions additions
   ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_info VARCHAR(255);
   ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
   ```

### Database Connection
The backend uses SQLAlchemy directly (not Supabase SDK) for production:
- `apps/api/app/services/database.py` - Supabase-compatible query builder
- Automatically converts `postgres://` URLs to `postgresql://` for SQLAlchemy

### Environment Variables (Production)
Set these in Coolify for both API and Web apps:
```
# API App
DATABASE_URL=postgresql://postgres:PASSWORD@database-host:5432/postgres
REDIS_URL=redis://default:PASSWORD@redis-host:6379/0
JWT_SECRET=<64-char-random-string>
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_REDIRECT_URI=https://api.digitalytics.io/auth/google-ads/callback
META_APP_ID=...
META_APP_SECRET=...
GEMINI_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
RESEND_API_KEY=...
CORS_ORIGINS=https://app.digitalytics.io

# Web App (Build Argument)
NEXT_PUBLIC_API_URL=https://api.digitalytics.io
```

### OAuth Redirect URIs (Google Cloud Console)
```
https://app.digitalytics.io/auth/callback
https://api.digitalytics.io/auth/google-ads/callback
https://api.digitalytics.io/auth/google/callback
```

## Troubleshooting

### Common Issues
- **API 404/Connection refused**: Ensure backend is running on port 8081, not 8000
- **CORS errors**: Check `main.py` allows your frontend port (3000, 3001, 3002 allowed)
- **Auth failures**: Verify JWT_SECRET is set in `.env` and matches between sessions
- **Demo user login fails**: Run `npm run db:migrate` to seed demo data

### Production Issues
- **Frontend showing wrong app**: Check Coolify for domain conflicts - another app may have the same domain
- **Container unhealthy**: Check logs in Coolify → Logs tab
- **Build fails with TypeScript errors**: Some pages have `// @ts-nocheck` for non-MVP features
- **Suspense boundary errors**: All pages using `useSearchParams()` must be wrapped in `<Suspense>`
