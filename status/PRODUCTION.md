# Production Deployments

> Track every production deployment with details for rollback if needed.

---

## Current Production Status

**Status:** Not yet deployed
**Environment:** N/A
**Version:** N/A

---

## Deployment Checklist

Before every production deployment:

- [ ] All tests passing
- [ ] No critical/high severity bugs open
- [ ] Database migrations tested on staging
- [ ] Environment variables configured
- [ ] Rate limits configured
- [ ] Monitoring/alerting active
- [ ] Rollback plan documented
- [ ] Team notified

---

## Deployment History

| Version | Date | Deployer | Notes | Rollback? |
|---------|------|----------|-------|-----------|
| *None yet* | | | | |

---

## Template for Deployments

```markdown
### v0.X.X - YYYY-MM-DD

**Deployer:** Name
**Duration:** X minutes
**Downtime:** None / X minutes

**Changes:**
- Feature A
- Bug fix B
- Improvement C

**Database Migrations:**
- migration_name.sql

**Environment Changes:**
- Added ENV_VAR_NAME

**Issues Encountered:**
- None / Description

**Rollback Needed:** No / Yes (reason)
```

---

## Rollback Procedures

### Frontend (Vercel)
```bash
# Instant rollback via Vercel dashboard
# Or: vercel rollback
```

### Backend (GCP Cloud Run)
```bash
# Rollback to previous revision
gcloud run services update-traffic adsmaster-api \
  --to-revisions=REVISION_NAME=100
```

### Database
```bash
# Supabase migrations are forward-only
# For critical rollback, restore from backup
```

---

## Infrastructure

| Component | Provider | Status |
|-----------|----------|--------|
| Frontend | Vercel | Not deployed |
| Backend | GCP Cloud Run | Not deployed |
| Database | Supabase | Not created |
| Redis | Upstash | Not created |
| CDN | Cloudflare | Not configured |
