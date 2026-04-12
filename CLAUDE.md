# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AdsMaster is an AI-powered advertising management SaaS platform that manages Google Ads and Meta Ads campaigns. It's a monorepo with a Next.js frontend and FastAPI backend.

**Current Status:** See [STATUS.md](./STATUS.md) for implementation progress (~65% complete).

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
- `apps/api/` - FastAPI backend (Python 3.9-3.12, Poetry)
- `packages/shared/` - Shared types/utilities
- `supabase/migrations/` - Database migrations (13 files: 00001-00013)
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
- **API Routes**: `app/api/` - 28 route modules
- **Services**: `app/services/` - Business logic (database, supabase_client, automation_service, meta_ads_service, email_service, stripe_service, sync/, tracking/)
- **Integrations**: `app/integrations/` - External API adapters + rate limiter
- **Workers**: `app/workers/` - Background job processors:
  - `sync_worker.py` - Syncs campaigns/metrics from ad platforms
  - `token_refresh_worker.py` - Refreshes OAuth tokens before expiry
  - `reconciliation_worker.py` - Daily reconciliation of data drift
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

Frontend uses `NEXT_PUBLIC_API_URL` (defaults to http://localhost:8081).

Requires Node.js >=20, Python 3.9-3.12.

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
- Admin: `/api/v1/admin/` (super admin only - users, orgs, analytics, config)
- Sync: `/sync/trigger/{account_id}`, `/sync/status/{account_id}`, `/sync/logs`
- Tracking: `/tracking/` (visitor tracking), `/api/v1/visitors/`, `/api/v1/conversions/offline`
- Webhooks: `/webhooks/` (Stripe), `/webhooks/ingest/` (external data ingestion)
- Demo (no auth): `/api/v1/demo/*` - Returns mock data for UI development

### Demo Mode
The `/api/v1/demo/*` endpoints return mock data without requiring ad account connections or authentication. The frontend hooks in `lib/hooks/useApi.ts` (e.g., `useDashboard()`, `useCampaigns()`) call demo endpoints by default. The `useApi` hook detects `demo_mode: true` in responses and sets an `isDemo` flag. Use demo endpoints during development before real ad accounts are connected.

### Authentication
Backend uses JWT tokens (PyJWT). Protected routes use `get_current_user` dependency from `app/api/user_auth.py`. Access tokens expire in 15 minutes; refresh tokens in 30 days. User passwords use SHA256 with per-user salt; admin passwords use bcrypt.

### Database
- Uses Row-Level Security (RLS) for multi-tenant isolation
- `organization_id` is the tenant key on most tables
- Migrations live in `supabase/migrations/` (numbered 00001-00013)
- Reference schemas in `database/schema/` for documentation

### Frontend Hooks Pattern
The `useApi` hook in `lib/hooks/useApi.ts` provides data fetching with:
- Automatic loading/error states
- Demo mode detection (`isDemo` flag when `demo_mode: true` in response)
- `refetch()` function for manual refresh
- Feature-specific hooks: `useDashboard()`, `useCampaigns()`, `useRecommendations()`, `useAnalytics()`, `useKeywords()`, `useAudiences()`, `useConnectedAccounts()`, `usePreferences()`, `useNotificationSettings()`, `useTeamMembers()`, `useApiKeys()`, `useBilling()`

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

## Troubleshooting

### Common Issues
- **API 404/Connection refused**: Ensure backend is running on port 8081, not 8000
- **CORS errors**: Check `main.py` allows your frontend port (3000, 3001, 3002 allowed)
- **Auth failures**: Verify JWT_SECRET is set in `.env` and matches between sessions
- **Demo user login fails**: Run `npm run db:migrate` to seed demo data
