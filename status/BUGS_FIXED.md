# Bugs Fixed & Lessons Learned

> Track every bug fixed with root cause and prevention strategy.
> This prevents the same mistakes from happening again.

---

## Template

```markdown
### BUG-XXX: Brief Description
- **Date Fixed:** YYYY-MM-DD
- **Severity:** Critical / High / Medium / Low
- **Root Cause:** Why did this happen?
- **Fix:** What was done to fix it?
- **Prevention:** How do we prevent this in the future?
- **Files Changed:** List of files
```

---

## Fixed Bugs

*No bugs fixed yet - project just scaffolded.*

---

## Known Issues (To Fix)

### ISSUE-001: Poetry not in PATH on macOS
- **Discovered:** 2026-03-08
- **Workaround:** Use `python3 -m poetry` instead of `poetry`
- **Permanent Fix:** Add poetry to PATH or use pipx

---

## Lessons Learned

### 2026-03-08: Project Setup

1. **Always use adapter pattern for external APIs**
   - Google Ads releases new API versions monthly
   - Without abstraction, every update is an emergency
   - Solution: `adapters/base.py` defines the contract

2. **Store all monetary values in micros (BIGINT)**
   - Mixing DECIMAL for budget and BIGINT for cost = conversion bugs
   - Always: 1 USD = 1,000,000 micros
   - Never use floats for money

3. **Add idempotency keys for automation**
   - Scheduled jobs can double-fire on slow API calls
   - Solution: `UNIQUE(rule_id, campaign_id, idempotency_key)`
