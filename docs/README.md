# Documentation

## Folder Structure

```
docs/
├── planning/          # Phase 1-14 implementation planning docs
├── archive/           # Old/superseded architecture docs
├── reference/         # Original source files (docx, html)
├── wireframes/        # UI wireframes and prototypes
└── BUILD-ORDER.md     # Build sequence guide
```

## Planning Phases

| Phase | Document | Description |
|-------|----------|-------------|
| 1 | Database Schema | 51 tables, RLS, partitioning |
| 2 | System Architecture | GCP, Next.js, FastAPI, BigQuery |
| 3 | API Design | ~90 endpoints, JWT, WebSocket |
| 4 | Backend Architecture | Services, workers, integrations |
| 5 | Frontend Architecture | Next.js 15, shadcn/ui, charts |
| 6 | Customer Handling | Onboarding, billing, support |
| 7 | AI/ML Pipeline | Gemini + Vertex AI, 50+ rules |
| 8 | Security & Compliance | Encryption, GDPR, SOC 2 |
| 9 | DevOps & Infrastructure | Terraform, CI/CD, DR |
| 10 | Testing Strategy | Unit, E2E, load, security |
| 11 | Meta Ads Integration | Facebook/Instagram Ads API |
| 12 | UI Design System | Data-dense agency design |
| 13 | API Abstraction + Growth | Version isolation, growth engine |
| 14 | Critical Fixes | Pre-launch blockers |

## Status Tracking

See `/status/` folder for:
- `CURRENT_STATUS.md` - Current implementation progress
- `CHANGELOG.md` - Version history
- `BUGS_FIXED.md` - Resolved issues
- `IMPROVEMENTS.md` - Enhancement backlog
- `PRODUCTION.md` - Production deployment notes
