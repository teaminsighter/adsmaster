🔴 CRITICAL 1 — The Sync/DB Split Will Show Wrong Money Numbers
The most dangerous bug in the entire platform.
Your architecture syncs Google Ads → Cloud SQL every 1–4 hours, then moves data to BigQuery every 4 hours. That means the dashboard can be showing metrics that are up to 8 hours stale while the user's real money is being spent right now.
Worse: your update_campaign_budget() writes to your DB first, then calls Google Ads API. If the API call fails after the DB write, your DB shows $300 budget but Google is still running at $500. The rollback logic exists in the code but there's no reconciliation job that verifies your DB matches Google Ads reality on a regular basis. These will drift silently.
Fix: Add a daily reconciliation worker that compares your DB budget/status values against live Google Ads values and flags mismatches. Show a ⚠️ Last verified: 6h ago indicator on any financial data that hasn't been confirmed against the platform recently.

🔴 CRITICAL 2 — Automation Can Double-Fire on Real Money
Your automation rules run every 15 minutes via Cloud Scheduler. If an account has a slow sync (API timeout, rate limit) and two rule-check jobs overlap, the same rule can fire twice. Example: INCREASE_BUDGET +20% fires twice → campaign budget jumps 44% instead of 20%. On a $10,000/day campaign that's a real problem.
Your automation_executions table exists but there's no idempotency key — nothing prevents the same rule from being applied twice in the same execution window.
Fix: Before applying any automation action, write an idempotency record: rule_id + campaign_id + date_window with a unique constraint. If the insert fails (already exists), skip. This is a 10-line database guard that protects real money.

🔴 CRITICAL 3 — Meta Token Expiry Will Silently Kill Campaigns
Meta's long-lived tokens expire in 60 days. Your plan refreshes them when within 7 days of expiry. But if the background refresh job fails silently (and it will — network timeouts, Meta API rate limits) and nobody notices, Meta tracking stops completely. Zero conversions recorded. AI recommendations go wrong. Users think their campaigns are failing when they're actually just untracked.
There's no token health dashboard visible to the user, and no escalating alert if a token refresh fails more than once.
Fix: Add a token status indicator on the Ad Accounts page (green/amber/red with days remaining). If token refresh fails 3 times → send WhatsApp + email immediately. Do not wait for the user to discover it themselves.

🟠 CRITICAL 4 — No Rollback After AI Auto-Applies a Bad Recommendation
Your plan supports "Apply All Safe" as a one-click action. If 3 recommendations are auto-applied and one of them was wrong (AI misread the data window, Google Ads API returned stale metrics during a sync gap), there's no one-click undo.
The before_state / after_state fields exist in automation_executions but there's no endpoint or UI to restore them. A user whose campaign was wrongly paused during peak sales season has no self-service recovery.
Fix: Every AI action needs a "Undo" button visible for 24 hours after it fires. This is the single feature that will prevent support rage-cancellations.

🟠 CRITICAL 5 — Currency Handling Is Not Enforced Across All Layers
Your financial accuracy rules correctly say "use micros integers, never float." But this rule only appears in one section of Phase 2. Looking at the Phase 1 schema, the campaigns table has budget_amount DECIMAL — not micros. The metrics tables use cost_micros BIGINT correctly. But budget_amount in a different format means every time you compare budget to spend you're doing a unit conversion that can introduce rounding errors.
For multi-currency agency accounts (a client in USD, another in GBP, another in EUR), you have no currency normalization layer. The analytics "Total Spend: $45,678" across platforms is meaningless unless all values are converted to one base currency at the right exchange rate at the time of the transaction, not today's rate.
Fix: Add a currency and amount_micros column to budgets. Store a fx_rates table with daily rates. Normalize all display values at query time.

🟠 CRITICAL 6 — The AI Recommendation Engine Has No Data Freshness Guard
Your recommendation rules run against cached keyword/campaign data. If the last sync was 6 hours ago and the rule sees conversions_7d == 0, it might recommend pausing a keyword that actually got 5 conversions in the last 2 hours. The user applies it. Real money opportunity lost.
There's no check in the recommendation engine that asks: "Is the data I'm making this decision on fresh enough to act on?"
Fix: Add data_freshness_hours to every recommendation object. If data is older than 4 hours, change the recommendation status from pending → pending_refresh and show: "Based on data from 6h ago — refresh before applying." Block one-click apply if data is stale.

🟡 IMPORTANT 7 — No Rate Limit Handling at the Google Ads API Layer
Google Ads API has per-developer token rate limits (15,000 operations/day at basic tier). If you have 100 users, each with 10 campaigns running hourly syncs, you'll hit this limit. The current code wraps calls in try/except GoogleAdsException but there's no exponential backoff, queue management, or per-account rate budgeting.
When you hit the limit, all syncs fail simultaneously for all users. The platform appears broken to everyone at once — your worst possible outage pattern.
Fix: Add a rate limit tracker in Redis. Assign each account a daily operation budget. Use exponential backoff with jitter on 429 errors. Alert when you've used 80% of daily quota.

Summary Table
#ProblemWho Gets HurtUrgency1Stale data / DB-API drift shows wrong moneyEvery userBefore launch2Automation double-fire on budgetsUsers with auto-rulesBefore launch3Meta token expiry silent failureAll Meta usersBefore launch4No undo for AI auto-applyAny user who trusts the AISprint 15Currency + budget unit inconsistencyAgency/multi-currency usersSprint 16Recommendations from stale dataUsers who act fast on AISprint 27No Google Ads API rate limit managementAll users simultaneouslySprint 2
Problems 1, 2, and 3 need to be solved before you let a single paying user connect real ad accounts. The rest can be Sprint 1–2 after your foundation is built.