# AdsMaster MVP Implementation Plan

**Current Status:** ~30-35% complete
**Target:** Production-ready MVP
**Estimated Time:** 8-12 weeks

---

## Overview

This plan is organized into **6 Sprints**, each with clear deliverables and testing checkpoints.

```
Sprint 1: Connect Mock APIs to Database (Week 1-2)
Sprint 2: User Auth & Organization (Week 3)
Sprint 3: Meta Ads Real Integration (Week 4-5)
Sprint 4: Recommendation Engine & Rules (Week 5-6)
Sprint 5: Critical Fixes & Safety (Week 7)
Sprint 6: Testing, CI/CD & Polish (Week 8)
```

---

## Sprint 1: Connect Mock APIs to Database

**Goal:** Replace all mock/in-memory endpoints with real database connections

### Phase 1.1: Recommendations API ✅ DONE
- [x] Create migration for missing columns
- [x] Refactor `recommendations.py` to use Supabase
- [x] Add generate endpoint
- [ ] **TEST:** Manual API testing

### Phase 1.2: Settings API - Profile & Preferences
- [ ] Create migration for user_preferences enhancements
- [ ] Connect `settings.py` profile endpoints to `users` table
- [ ] Connect preferences endpoints to `user_preferences` table
- [ ] **TEST:** Update profile, verify persistence

### Phase 1.3: Settings API - Team Management
- [ ] Connect team endpoints to `organization_members` table
- [ ] Implement invite flow with `organization_invitations` table
- [ ] Add role-based access (owner, admin, member, viewer)
- [ ] **TEST:** Invite user, change role, remove member

### Phase 1.4: Settings API - Notifications
- [ ] Connect to `notification_settings` table
- [ ] Implement per-channel toggles (email, push, slack)
- [ ] **TEST:** Toggle settings, verify saved

### Phase 1.5: Settings API - API Keys
- [ ] Connect to `api_keys` table
- [ ] Implement key generation with hashing
- [ ] Add revoke functionality
- [ ] **TEST:** Create key, use key, revoke key

### Phase 1.6: Settings API - Billing (Stripe Mock)
- [ ] Connect to `subscriptions` table
- [ ] Connect to `subscription_plans` table
- [ ] Return real plan data (Stripe integration later)
- [ ] **TEST:** View current plan, list available plans

### Phase 1.7: Admin Settings
- [ ] Connect `admin_settings.py` to database
- [ ] Store AI provider config in organization settings
- [ ] Store feature flags in database
- [ ] **TEST:** Change AI provider, toggle features

### Phase 1.8: Demo Mode Switch
- [ ] Add `demo_mode` flag to organizations
- [ ] Modify demo.py to check if account connected
- [ ] If real account exists → return real data
- [ ] If no account → return demo data
- [ ] **TEST:** Connect account, verify demo data disappears

---

## Sprint 2: User Auth & Organization Management

**Goal:** Real user authentication and multi-tenant support

### Phase 2.1: User Registration
- [ ] Create `/auth/register` endpoint
- [ ] Hash passwords with bcrypt
- [ ] Create user + organization on signup
- [ ] Send verification email (mock for now)
- [ ] **TEST:** Register new user, verify in DB

### Phase 2.2: User Login
- [ ] Create `/auth/login` endpoint
- [ ] Validate credentials against `users` table
- [ ] Generate JWT access + refresh tokens
- [ ] Store session in `user_sessions` table
- [ ] **TEST:** Login, receive tokens, verify session

### Phase 2.3: Token Management
- [ ] Create `/auth/refresh` endpoint
- [ ] Create `/auth/logout` endpoint
- [ ] Implement token revocation
- [ ] Add middleware to verify JWT on protected routes
- [ ] **TEST:** Refresh token, logout, verify old token fails

### Phase 2.4: Organization Context
- [ ] Add `get_current_user()` dependency
- [ ] Add `get_current_organization()` dependency
- [ ] Update all endpoints to use org context
- [ ] **TEST:** Access data, verify org isolation

### Phase 2.5: RLS Policies
- [ ] Add RLS policies for `users` table
- [ ] Add RLS policies for `ad_accounts` table
- [ ] Add RLS policies for `campaigns` table
- [ ] Add RLS policies for `recommendations` table
- [ ] **TEST:** User A cannot see User B's data

---

## Sprint 3: Meta Ads Real Integration

**Goal:** Connect Meta Ads OAuth and campaigns to database

### Phase 3.1: Meta OAuth Database Storage
- [ ] Refactor `meta_auth.py` to use `ad_accounts` table
- [ ] Store tokens in `oauth_tokens` table (encrypted)
- [ ] Implement token refresh with 60-day expiry
- [ ] **TEST:** Connect Meta account, verify in DB

### Phase 3.2: Meta Campaigns Real Data
- [ ] Refactor `meta_campaigns.py` to use database
- [ ] Create sync worker for Meta campaigns
- [ ] Store campaigns in `campaigns` table with platform='meta'
- [ ] **TEST:** Sync Meta campaigns, view in UI

### Phase 3.3: Meta Insights
- [ ] Fetch real insights from Meta API
- [ ] Store in `metrics_daily` table
- [ ] Display in analytics page
- [ ] **TEST:** View Meta campaign metrics

### Phase 3.4: Token Health Monitoring
- [ ] Add `token_status` field tracking
- [ ] Create health check endpoint
- [ ] Add escalating alerts on refresh failure
- [ ] **TEST:** Simulate token failure, verify alert

---

## Sprint 4: Recommendation Engine & Rules

**Goal:** Implement real AI recommendation rules

### Phase 4.1: Core Rule Engine
- [ ] Implement 5 critical rules:
  - Wasting keywords (spend > $50, conversions = 0)
  - Low quality score (QS < 4)
  - Budget pacing too fast (>120% daily)
  - Budget pacing too slow (<50% daily)
  - High CPA keywords (CPA > 2x target)
- [ ] **TEST:** Generate recommendations from real data

### Phase 4.2: Additional Rules (10 more)
- [ ] Impression share lost to budget
- [ ] Search term with high impressions, no clicks
- [ ] Declining conversion rate
- [ ] Device performance disparity
- [ ] Geographic underperformance
- [ ] Ad schedule optimization
- [ ] Negative keyword opportunities
- [ ] Bid adjustment recommendations
- [ ] Campaign structure issues
- [ ] Landing page performance
- [ ] **TEST:** Each rule generates correct recommendations

### Phase 4.3: Impact Estimation
- [ ] Calculate monthly_savings from historical data
- [ ] Calculate potential_gain from impression share
- [ ] Add confidence scoring based on data volume
- [ ] **TEST:** Impact estimates are reasonable

### Phase 4.4: Scheduled Generation
- [ ] Create background worker for daily generation
- [ ] Run at 6 AM for each account
- [ ] Deduplicate existing recommendations
- [ ] **TEST:** Recommendations auto-generate overnight

---

## Sprint 5: Critical Fixes & Safety

**Goal:** Implement safety features from Phase 14

### Phase 5.1: Data Reconciliation
- [ ] Create ReconciliationWorker
- [ ] Compare DB campaigns vs Google Ads live
- [ ] Log mismatches in `reconciliation_logs`
- [ ] Add UI indicator for data freshness
- [ ] **TEST:** Manually change campaign in Google Ads, verify detected

### Phase 5.2: Automation Idempotency
- [ ] Add `idempotency_key` to automation executions
- [ ] Unique constraint prevents double-fire
- [ ] Skip if key already exists
- [ ] **TEST:** Trigger same rule twice, verify only one execution

### Phase 5.3: Undo Functionality
- [ ] Store `before_state` / `after_state` on apply
- [ ] Implement 24-hour undo window
- [ ] Create undo endpoint (already done in recommendations)
- [ ] Revert actual Google Ads changes
- [ ] **TEST:** Apply recommendation, undo, verify reverted

### Phase 5.4: Currency Standardization
- [ ] Audit all endpoints for micros consistency
- [ ] Add `currency_code` to all money fields
- [ ] Create CurrencyService for normalization
- [ ] Add FX rate fetching for multi-currency
- [ ] **TEST:** Multi-currency account displays correctly

### Phase 5.5: Rate Limiting
- [ ] Add Redis-based rate limiter
- [ ] Track Google Ads API quota per account
- [ ] Alert at 80% usage
- [ ] Exponential backoff on rate limit errors
- [ ] **TEST:** Hit rate limit, verify graceful handling

---

## Sprint 6: Testing, CI/CD & Polish

**Goal:** Production readiness

### Phase 6.1: Backend Unit Tests
- [ ] Test auth endpoints
- [ ] Test recommendations CRUD
- [ ] Test settings endpoints
- [ ] Test sync operations
- [ ] **TARGET:** 50% coverage

### Phase 6.2: API Integration Tests
- [ ] Test authenticated flows
- [ ] Test organization isolation
- [ ] Test error handling
- [ ] **TARGET:** All endpoints have at least 1 test

### Phase 6.3: Frontend Tests
- [ ] Test critical user flows
- [ ] Test form submissions
- [ ] Test error states
- [ ] **TARGET:** 30% coverage

### Phase 6.4: CI/CD Pipeline
- [ ] GitHub Actions workflow
- [ ] Lint + test on PR
- [ ] Build Docker images
- [ ] Deploy to staging on merge
- [ ] **TEST:** Push PR, verify pipeline runs

### Phase 6.5: Error Monitoring
- [ ] Add Sentry integration
- [ ] Configure error alerts
- [ ] Add structured logging
- [ ] **TEST:** Trigger error, verify in Sentry

### Phase 6.6: Final Polish
- [ ] Fix any remaining UI issues
- [ ] Performance optimization
- [ ] Security review
- [ ] Documentation update
- [ ] **TEST:** Full user journey end-to-end

---

## Quick Reference: Files to Modify

### Backend (apps/api/app/api/)
| File | Current State | Target State |
|------|---------------|--------------|
| recommendations.py | ✅ DB Connected | Done |
| settings.py | ❌ Mock | → Database |
| meta_auth.py | ⚠️ In-memory | → Database |
| meta_campaigns.py | ❌ Mock | → Database |
| admin_settings.py | ❌ Mock | → Database |
| demo.py | ❌ Mock | → Conditional |
| auth.py | ⚠️ Partial | → Full auth |

### Database Migrations Needed
| Migration | Purpose |
|-----------|---------|
| 00004_recommendations_full.sql | ✅ Created |
| 00005_user_auth.sql | User sessions, password fields |
| 00006_settings_full.sql | API keys hash, notification settings |
| 00007_meta_tokens.sql | Meta-specific token fields |

### Frontend (apps/web/)
| Page | Change Needed |
|------|---------------|
| /recommendations | → Use `/api/v1/recommendations` (not demo) |
| /settings/* | → Already connected, backend needs work |
| /clients | → Connect to real clients/organizations |
| /campaigns/new | → Connect to campaign creation API |

---

## Testing Checkpoints

After each phase, verify:

1. **API Test:** `curl` the endpoint, check response
2. **DB Test:** Query Supabase, verify data persisted
3. **UI Test:** Use the frontend, verify it works
4. **Regression Test:** Existing features still work

---

## Current Progress

- [x] Phase 1.1: Recommendations API (DONE)
- [ ] Phase 1.2: Settings Profile & Preferences
- [ ] Phase 1.3: Settings Team
- [ ] ... (rest pending)

**Next Step:** Test Phase 1.1, then proceed to Phase 1.2

---

## Commands Reference

```bash
# Apply migrations
npm run db:migrate

# Start backend
cd apps/api && poetry run uvicorn app.main:app --reload --port 8081

# Start frontend
npm run dev:web

# Run tests (when implemented)
cd apps/api && poetry run pytest

# Check types
cd apps/web && npx tsc --noEmit
```
