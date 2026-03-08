# Phase 14: Critical Pre-Launch Fixes

## Executive Summary

| Priority | Issue | Impact | Fix Effort |
|----------|-------|--------|------------|
| **BLOCKER** | Stale data / DB-API drift | Wrong money numbers displayed | 1-2 days |
| **BLOCKER** | Automation double-fire | Budget increases can stack 44% vs 20% | 2 hours |
| **BLOCKER** | Meta token expiry silent failure | Zero conversions, broken tracking | 1 day |
| **Sprint 1** | No AI rollback | Support rage-cancellations | 1 day |
| **Sprint 1** | Currency unit inconsistency | Rounding errors on budgets | 1 day |
| **Sprint 2** | Stale recommendation data | AI pauses converting keywords | 4 hours |
| **Sprint 2** | No rate limit handling | Platform-wide outage | 1-2 days |

---

## 🔴 BLOCKER 1: Stale Data / DB-API Drift

### The Problem

The architecture syncs Google Ads → Cloud SQL every 1–4 hours, then moves data to BigQuery every 4 hours. Dashboard can show metrics **up to 8 hours stale** while real money is being spent.

Worse: `update_campaign_budget()` writes to DB first, then calls Google Ads API. If API call fails after DB write:
- DB shows $300 budget
- Google Ads still running at $500
- No reconciliation job to catch the drift

### The Fix

```python
# app/workers/reconciliation_worker.py

class ReconciliationWorker:
    """
    Daily job that compares DB values against live Google Ads values.
    Runs at 3 AM when API quota is fresh.
    """

    async def run(self):
        for account in await get_all_active_accounts():
            mismatches = await self.compare_budgets(account)
            if mismatches:
                await self.flag_mismatches(account, mismatches)
                await self.alert_user(account, mismatches)

    async def compare_budgets(self, account):
        db_campaigns = await get_db_campaigns(account.id)
        live_campaigns = await adapter.get_campaigns(account.customer_id)

        mismatches = []
        for db_camp in db_campaigns:
            live = find_by_id(live_campaigns, db_camp.external_id)
            if live and db_camp.budget_micros != live.budget_micros:
                mismatches.append({
                    'campaign_id': db_camp.id,
                    'db_budget': db_camp.budget_micros,
                    'live_budget': live.budget_micros,
                    'drift_amount': abs(db_camp.budget_micros - live.budget_micros)
                })
        return mismatches
```

### UI Indicator

Add to dashboard metrics:

```html
<div class="data-freshness-indicator">
  <span class="freshness-dot green"></span>
  Last verified: 2h ago
</div>

<!-- If stale (>6h): -->
<div class="data-freshness-indicator warning">
  <span class="freshness-dot amber"></span>
  ⚠️ Last verified: 8h ago — data may be stale
</div>
```

### Database Addition

```sql
-- Add to campaigns table
ALTER TABLE campaigns ADD COLUMN last_verified_at TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN verification_status VARCHAR(20) DEFAULT 'pending';
-- 'verified', 'mismatch', 'pending'

-- Reconciliation log
CREATE TABLE reconciliation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES ad_accounts(id),
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    campaigns_checked INT NOT NULL,
    mismatches_found INT NOT NULL,
    mismatches_resolved INT NOT NULL DEFAULT 0,
    details JSONB
);
```

---

## 🔴 BLOCKER 2: Automation Double-Fire

### The Problem

Automation rules run every 15 minutes via Cloud Scheduler. If sync is slow (API timeout, rate limit) and two jobs overlap, the same rule fires twice:

- INCREASE_BUDGET +20% fires twice
- Campaign budget jumps 44% instead of 20%
- On $10,000/day campaign = real money problem

### The Fix

10 lines of SQL that protect real money:

```sql
-- Add idempotency constraint to automation_executions
ALTER TABLE automation_executions
ADD COLUMN idempotency_key VARCHAR(255);

-- Unique constraint prevents double-fire
ALTER TABLE automation_executions
ADD CONSTRAINT unique_execution_window
UNIQUE (rule_id, campaign_id, idempotency_key);

-- Index for fast lookups
CREATE INDEX idx_automation_idempotency
ON automation_executions(rule_id, campaign_id, idempotency_key);
```

```python
# app/services/automation_service.py

async def execute_rule(rule: AutomationRule, campaign: Campaign):
    # Create idempotency key: rule + campaign + date window
    idempotency_key = f"{rule.id}:{campaign.id}:{date.today().isoformat()}"

    try:
        # Try to insert execution record first
        await db.execute("""
            INSERT INTO automation_executions
            (rule_id, campaign_id, idempotency_key, status)
            VALUES ($1, $2, $3, 'pending')
        """, rule.id, campaign.id, idempotency_key)
    except UniqueViolationError:
        # Already executed in this window — skip
        logger.info(f"Rule {rule.id} already executed for campaign {campaign.id} today")
        return None

    # Safe to proceed with actual execution
    result = await apply_rule_action(rule, campaign)
    return result
```

---

## 🔴 BLOCKER 3: Meta Token Expiry Silent Failure

### The Problem

Meta long-lived tokens expire in 60 days. Current plan refreshes when within 7 days of expiry. But if refresh job fails silently:

- Meta tracking stops completely
- Zero conversions recorded
- AI recommendations go wrong
- Users think campaigns are failing (actually just untracked)

No token health dashboard. No escalating alerts.

### The Fix

#### 1. Token Health Dashboard

```sql
-- Add token health fields
ALTER TABLE ad_accounts ADD COLUMN token_expires_at TIMESTAMPTZ;
ALTER TABLE ad_accounts ADD COLUMN token_refresh_attempts INT DEFAULT 0;
ALTER TABLE ad_accounts ADD COLUMN token_last_refresh_error TEXT;
ALTER TABLE ad_accounts ADD COLUMN token_status VARCHAR(20) DEFAULT 'healthy';
-- 'healthy', 'expiring_soon', 'refresh_failed', 'expired'
```

#### 2. Token Status UI (Ad Accounts Page)

```html
<div class="token-status">
  <!-- Healthy -->
  <span class="token-badge green">🟢 Token OK (47 days)</span>

  <!-- Expiring Soon -->
  <span class="token-badge amber">🟡 Expires in 5 days — Refresh Now</span>

  <!-- Failed Refresh -->
  <span class="token-badge red">🔴 Refresh Failed (3 attempts) — Action Required</span>
</div>
```

#### 3. Escalating Alert System

```python
# app/workers/token_refresh_worker.py

async def refresh_meta_token(account: AdAccount):
    for attempt in range(3):
        try:
            new_token = await meta_api.refresh_long_lived_token(account.access_token)
            account.access_token = new_token
            account.token_expires_at = datetime.now() + timedelta(days=60)
            account.token_refresh_attempts = 0
            account.token_status = 'healthy'
            await account.save()
            return True
        except MetaAPIError as e:
            account.token_refresh_attempts += 1
            account.token_last_refresh_error = str(e)
            await account.save()
            await asyncio.sleep(60 * (attempt + 1))  # Backoff: 1m, 2m, 3m

    # All attempts failed — escalate immediately
    account.token_status = 'refresh_failed'
    await account.save()

    # Send alerts via all channels
    await send_email_alert(account.user, "Meta Token Refresh Failed", ...)
    await send_whatsapp_alert(account.user.phone, "⚠️ Your Meta connection needs attention...")
    await create_in_app_notification(account.user, "critical", "Meta token refresh failed")

    return False
```

---

## 🟠 SPRINT 1: No Rollback for AI Auto-Apply

### The Problem

"Apply All Safe" is a one-click action. If 3 recommendations are applied and one was wrong (AI misread data, stale metrics), there's no undo.

`before_state` / `after_state` fields exist in `automation_executions` but no endpoint or UI to restore them.

### The Fix

```python
# app/api/recommendations.py

@router.post("/recommendations/{execution_id}/undo")
async def undo_recommendation(execution_id: UUID):
    execution = await get_execution(execution_id)

    # Check if within 24-hour undo window
    if datetime.now() - execution.executed_at > timedelta(hours=24):
        raise HTTPException(400, "Undo window expired (24 hours)")

    # Restore previous state
    before_state = execution.before_state
    await adapter.restore_campaign_state(
        execution.campaign_id,
        before_state
    )

    execution.status = 'undone'
    execution.undone_at = datetime.now()
    await execution.save()

    return {"status": "restored", "campaign_id": execution.campaign_id}
```

```html
<!-- AI Recommendation Card (after apply) -->
<div class="recommendation-applied">
  <span class="badge badge-success">✓ Applied 2h ago</span>
  <button class="btn btn-secondary btn-sm" onclick="undoRecommendation('${id}')">
    ↩️ Undo (22h left)
  </button>
</div>
```

---

## 🟠 SPRINT 1: Currency Unit Inconsistency

### The Problem

- `campaigns.budget_amount` = DECIMAL (dollars)
- `metrics.cost_micros` = BIGINT (micros)
- Every comparison needs unit conversion = rounding errors

Multi-currency agencies (USD, GBP, EUR) have no normalization layer.

### The Fix

```sql
-- Standardize to micros everywhere
ALTER TABLE campaigns ADD COLUMN budget_micros BIGINT;
UPDATE campaigns SET budget_micros = (budget_amount * 1000000)::BIGINT;
ALTER TABLE campaigns DROP COLUMN budget_amount;

-- Add currency tracking
ALTER TABLE campaigns ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD';

-- FX rates table for multi-currency normalization
CREATE TABLE fx_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(12, 6) NOT NULL,
    rate_date DATE NOT NULL,
    source VARCHAR(50) DEFAULT 'openexchangerates',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, rate_date)
);

-- Index for fast lookups
CREATE INDEX idx_fx_rates_lookup ON fx_rates(from_currency, to_currency, rate_date DESC);
```

```python
# app/services/currency_service.py

async def normalize_to_base_currency(
    amount_micros: int,
    from_currency: str,
    base_currency: str = 'USD',
    as_of_date: date = None
) -> int:
    if from_currency == base_currency:
        return amount_micros

    rate = await get_fx_rate(from_currency, base_currency, as_of_date or date.today())
    return int(amount_micros * rate)
```

---

## 🟡 SPRINT 2: Stale Recommendation Data

### The Problem

Recommendation engine runs against cached data. If last sync was 6 hours ago and rule sees `conversions_7d == 0`, it might pause a keyword that got 5 conversions in the last 2 hours.

### The Fix

```python
# app/services/recommendation_service.py

class Recommendation:
    data_freshness_hours: float
    status: str  # 'pending', 'pending_refresh', 'applied', 'dismissed'

    def should_block_apply(self) -> bool:
        return self.data_freshness_hours > 4.0

async def generate_recommendations(account_id: UUID):
    last_sync = await get_last_sync_time(account_id)
    freshness_hours = (datetime.now() - last_sync).total_seconds() / 3600

    recommendations = await run_recommendation_rules(account_id)

    for rec in recommendations:
        rec.data_freshness_hours = freshness_hours
        if freshness_hours > 4.0:
            rec.status = 'pending_refresh'

    return recommendations
```

```html
<!-- Recommendation with stale data -->
<div class="recommendation-card warning">
  <div class="stale-warning">
    ⚠️ Based on data from 6h ago —
    <button onclick="refreshAndRecheck()">Refresh before applying</button>
  </div>
  <button class="btn btn-primary" disabled>Apply</button>
</div>
```

---

## 🟡 SPRINT 2: No Rate Limit Handling

### The Problem

Google Ads API: 15,000 operations/day at basic tier. 100 users × 10 campaigns × hourly sync = blown quota. When limit hit, all syncs fail for all users simultaneously.

### The Fix

```python
# app/integrations/google_ads/rate_limiter.py

import redis

class GoogleAdsRateLimiter:
    DAILY_QUOTA = 15000
    WARNING_THRESHOLD = 0.8  # Alert at 80%

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def check_and_increment(self, operation_count: int = 1) -> bool:
        key = f"gads_quota:{date.today().isoformat()}"
        current = await self.redis.incr(key, operation_count)

        if current == 1:
            await self.redis.expire(key, 86400)  # 24h TTL

        usage_pct = current / self.DAILY_QUOTA

        if usage_pct >= 1.0:
            raise QuotaExhaustedError("Daily Google Ads quota exhausted")

        if usage_pct >= self.WARNING_THRESHOLD:
            await self.send_quota_alert(usage_pct)

        return True

    async def get_remaining_quota(self) -> int:
        key = f"gads_quota:{date.today().isoformat()}"
        used = int(await self.redis.get(key) or 0)
        return self.DAILY_QUOTA - used
```

```python
# Exponential backoff with jitter
async def call_with_backoff(func, *args, max_retries=5):
    for attempt in range(max_retries):
        try:
            return await func(*args)
        except GoogleAdsException as e:
            if e.error_code == 'RATE_LIMIT_EXCEEDED':
                wait = (2 ** attempt) + random.uniform(0, 1)
                await asyncio.sleep(wait)
            else:
                raise
    raise MaxRetriesExceeded()
```

---

## Implementation Checklist

### Before Launch (BLOCKERS)

- [ ] **Reconciliation Worker** — Daily job comparing DB vs live Google Ads values
- [ ] **Data Freshness Indicator** — Show "Last verified: Xh ago" on all financial data
- [ ] **Automation Idempotency** — Add unique constraint on `rule_id + campaign_id + date_window`
- [ ] **Meta Token Health Dashboard** — Green/amber/red status on Ad Accounts page
- [ ] **Token Refresh Escalation** — 3 failures → immediate WhatsApp + email alert

### Sprint 1

- [ ] **Undo Button** — 24-hour rollback for any AI-applied recommendation
- [ ] **Currency Normalization** — Convert all budget fields to micros, add FX rates table

### Sprint 2

- [ ] **Data Freshness Guard** — Block one-click apply if data >4 hours stale
- [ ] **Rate Limit Tracker** — Redis counter, per-account budgeting, exponential backoff

---

*Document Version: 1.0*
*Created: March 2026*
*Status: APPROVED — BLOCKERS MUST BE COMPLETE BEFORE LAUNCH*
