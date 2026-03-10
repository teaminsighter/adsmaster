# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AdsMaster is an AI-powered advertising management SaaS platform that manages Google Ads and Meta Ads campaigns. It's a monorepo with a Next.js frontend and FastAPI backend.

## Commands

### Development
```bash
# Start both frontend and API (from root)
npm run dev

# Frontend only (Next.js on port 3000)
npm run dev:web

# Backend only (FastAPI on port 8000)
npm run dev:api

# Or directly (use port 8081 for frontend compatibility):
cd apps/api && poetry run uvicorn app.main:app --reload --port 8081
```

### Build & Lint
```bash
npm run build          # Build all apps via Turbo
npm run lint           # Lint all apps via Turbo
```

### Database
```bash
npm run db:migrate     # Push schema to Supabase
npm run db:reset       # Reset Supabase database
```

### Backend Testing
```bash
cd apps/api
poetry run pytest                           # Run all tests
poetry run pytest tests/test_file.py        # Single test file
poetry run pytest -k "test_name"            # Run specific test
poetry run black .                          # Format code
poetry run ruff check .                     # Lint
```

## Architecture

### Monorepo Structure
- `apps/web/` - Next.js 16 frontend (React 19, TailwindCSS 4)
- `apps/api/` - FastAPI backend (Python 3.9-3.12, Poetry)
- `packages/shared/` - Shared types/utilities
- `supabase/migrations/` - Database migrations
- `database/schema/` - Reference SQL schemas
- `docs/planning/` - 14 planning phase documents

### Frontend Architecture (apps/web/)
- **App Router**: `app/` directory with page.tsx files
- **Components**: `components/` with subdirectories by feature (dashboard/, ui/, layout/, etc.)
- **API Client**: `lib/api.ts` - typed fetch wrapper for backend calls
- **Hooks**: `lib/hooks/useApi.ts` - React hooks for API data

### Backend Architecture (apps/api/)
- **Entry Point**: `app/main.py` - FastAPI app with CORS, routers
- **API Routes**: `app/api/` - Route handlers (auth, accounts, campaigns, etc.)
- **Services**: `app/services/` - Business logic
- **Integrations**: `app/integrations/` - External API adapters
- **Workers**: `app/workers/` - Background job processors
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
- `app/services/ml/` - ML models (forecasting, anomaly detection, classification)
- `app/services/recommendations/` - Rule-based engine + AI-powered recommendation engine

### Data Flow
1. Frontend calls `lib/api.ts` functions
2. Backend routes in `app/api/` handle requests
3. Services in `app/services/` contain business logic
4. Adapters in `app/integrations/` talk to Google/Meta APIs
5. Data stored in Supabase (PostgreSQL)

## Environment Variables

Required in `.env` at project root:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`
- `META_APP_ID`, `META_APP_SECRET`
- `REDIS_URL` (optional, defaults to localhost:6379)

Frontend uses `NEXT_PUBLIC_API_URL` (defaults to http://localhost:8081). Run the API on port 8081 for frontend compatibility.

## Key Conventions

### Money Values
All monetary values use **micros** (1 USD = 1,000,000 micros). Use `formatMicros()` from `lib/api.ts` for display.

### API Response Pattern
Backend returns `{ data: T, error: string | null }` pattern. Check error before using data.

### Routes
- Google Ads: `/accounts/`, `/accounts/{id}/campaigns/`
- Meta Ads: `/api/v1/meta/accounts/{id}/campaigns/`
- Recommendations: `/api/v1/recommendations/`
- AI Chat: `/api/v1/ai-chat/`

### Database
- Uses Row-Level Security (RLS) for multi-tenant isolation
- `organization_id` is the tenant key on most tables
- Metrics tables use date-based partitioning
