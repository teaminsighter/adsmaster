# Abandoned / Deferred Items

> Track features, code, or approaches that were abandoned or deferred.
> Important for understanding why decisions were made.

---

## Template

```markdown
### ITEM-XXX: Feature/Code Name
- **Date:** YYYY-MM-DD
- **Status:** Abandoned / Deferred to Sprint X
- **Reason:** Why was this not implemented?
- **Alternative:** What was done instead?
- **Revisit:** Should this be reconsidered later?
```

---

## Abandoned

*Nothing abandoned yet - project just started.*

---

## Deferred

### DEF-001: Full 51-Table Schema
- **Date:** 2026-03-08
- **Status:** Deferred to later sprints
- **Reason:** Too complex for Sprint 1. Start with core tables.
- **Alternative:** Implemented 15 core tables first
- **Revisit:** Add remaining tables as features require them

### DEF-002: ARIMA_PLUS Forecasting
- **Date:** 2026-03-08
- **Status:** Under consideration
- **Reason:** Prophet (Meta's library) may handle seasonality better
- **Alternative:** Will evaluate both during Sprint 4
- **Revisit:** Yes - Phase 7 implementation

### DEF-003: Keywords Page
- **Date:** 2026-03-08
- **Status:** Deferred to Sprint 3
- **Reason:** Not in critical path for MVP
- **Alternative:** Keywords accessible via campaign detail
- **Revisit:** Sprint 3 frontend build

---

## Design Decisions (Not Abandoned, Just Documented)

### Why Adapter Pattern over Direct SDK?
- Google releases new API monthly
- Without abstraction = emergency migrations
- One adapter file change vs entire codebase

### Why Supabase over Raw PostgreSQL?
- Built-in auth
- Real-time subscriptions
- Row Level Security
- Faster to ship MVP

### Why Monorepo over Separate Repos?
- Shared types between frontend/backend
- Single PR for full-stack changes
- Easier local development
