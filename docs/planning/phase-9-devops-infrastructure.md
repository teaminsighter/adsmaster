# Phase 9: DevOps & Infrastructure Plan

## Executive Summary

| Area | Technology | Purpose |
|------|------------|---------|
| **IaC** | Terraform | Infrastructure as Code |
| **CI/CD** | GitHub Actions + Cloud Build | Automated deployments |
| **Containers** | Docker + Cloud Run | Serverless containers |
| **Monitoring** | Cloud Monitoring + Prometheus | Metrics & dashboards |
| **Logging** | Cloud Logging | Centralized logs |
| **Alerting** | Cloud Monitoring + PagerDuty | Incident management |
| **Secrets** | Secret Manager | Secure configuration |

---

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GCP INFRASTRUCTURE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRODUCTION PROJECT                                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        GLOBAL RESOURCES                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  Cloud CDN   │  │  Cloud DNS   │  │  Cloud Armor │               │   │
│  │  │              │  │              │  │  (WAF)       │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      REGIONAL (us-central1)                          │   │
│  │                                                                       │   │
│  │  COMPUTE                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  Cloud Run   │  │  Cloud Run   │  │  Cloud Run   │               │   │
│  │  │  (Frontend)  │  │  (API)       │  │  (Workers)   │               │   │
│  │  │  Next.js     │  │  FastAPI     │  │  Background  │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                       │   │
│  │  DATA                                                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  Cloud SQL   │  │  Memorystore │  │  Cloud       │               │   │
│  │  │  PostgreSQL  │  │  Redis       │  │  Storage     │               │   │
│  │  │  (HA)        │  │              │  │              │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                       │   │
│  │  MESSAGING                                                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  Pub/Sub     │  │  Cloud Tasks │  │  Cloud       │               │   │
│  │  │              │  │              │  │  Scheduler   │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                       │   │
│  │  AI/ML                                                                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  Vertex AI   │  │  BigQuery    │  │  Dataflow    │               │   │
│  │  │  Endpoints   │  │              │  │              │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        SECURITY                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  Cloud KMS   │  │  Secret      │  │  IAM         │               │   │
│  │  │              │  │  Manager     │  │              │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Strategy

### Environment Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ENVIRONMENTS                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│   DEVELOPMENT  │───►│    STAGING     │───►│   PRODUCTION   │
│                │    │                │    │                │
│  • Feature dev │    │  • Integration │    │  • Live users  │
│  • Unit tests  │    │  • E2E tests   │    │  • Monitoring  │
│  • Local DB    │    │  • Real APIs   │    │  • HA config   │
│                │    │  • Test data   │    │  • Backups     │
└────────────────┘    └────────────────┘    └────────────────┘

GCP Projects:
├── adsmaster-dev      (development)
├── adsmaster-staging  (staging)
└── adsmaster-prod     (production)
```

### Environment Configuration

```yaml
# config/environments.yaml

development:
  gcp_project: "adsmaster-dev"
  region: "us-central1"
  cloud_run:
    min_instances: 0
    max_instances: 2
    memory: "512Mi"
    cpu: 1
  cloud_sql:
    tier: "db-f1-micro"
    high_availability: false
    backup_enabled: false
  redis:
    tier: "BASIC"
    memory_size_gb: 1
  domains:
    frontend: "dev.adsmaster.local"
    api: "api.dev.adsmaster.local"

staging:
  gcp_project: "adsmaster-staging"
  region: "us-central1"
  cloud_run:
    min_instances: 1
    max_instances: 5
    memory: "1Gi"
    cpu: 1
  cloud_sql:
    tier: "db-custom-2-4096"
    high_availability: false
    backup_enabled: true
  redis:
    tier: "STANDARD_HA"
    memory_size_gb: 2
  domains:
    frontend: "staging.adsmaster.com"
    api: "api.staging.adsmaster.com"

production:
  gcp_project: "adsmaster-prod"
  region: "us-central1"
  cloud_run:
    min_instances: 2
    max_instances: 100
    memory: "2Gi"
    cpu: 2
    concurrency: 80
  cloud_sql:
    tier: "db-custom-4-16384"
    high_availability: true
    backup_enabled: true
    point_in_time_recovery: true
  redis:
    tier: "STANDARD_HA"
    memory_size_gb: 5
  domains:
    frontend: "app.adsmaster.com"
    api: "api.adsmaster.com"
```

---

## Infrastructure as Code (Terraform)

### Project Structure

```
/infrastructure/
├── terraform/
│   ├── modules/
│   │   ├── cloud-run/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── cloud-sql/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── redis/
│   │   │   └── ...
│   │   ├── networking/
│   │   │   └── ...
│   │   ├── security/
│   │   │   └── ...
│   │   └── monitoring/
│   │       └── ...
│   │
│   ├── environments/
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── terraform.tfvars
│   │   ├── staging/
│   │   │   └── ...
│   │   └── prod/
│   │       └── ...
│   │
│   └── shared/
│       ├── providers.tf
│       └── backend.tf
│
└── scripts/
    ├── setup-project.sh
    ├── deploy.sh
    └── destroy.sh
```

### Terraform Modules

```hcl
# terraform/modules/cloud-run/main.tf

variable "name" {
  description = "Service name"
  type        = string
}

variable "image" {
  description = "Container image"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "min_instances" {
  description = "Minimum instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum instances"
  type        = number
  default     = 10
}

variable "memory" {
  description = "Memory allocation"
  type        = string
  default     = "1Gi"
}

variable "cpu" {
  description = "CPU allocation"
  type        = number
  default     = 1
}

variable "env_vars" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secret Manager secrets"
  type = list(object({
    name        = string
    secret_name = string
    version     = string
  }))
  default = []
}

resource "google_cloud_run_v2_service" "service" {
  name     = var.name
  location = var.region

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        cpu_idle = true
      }

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secrets
        content {
          name = env.value.name
          value_source {
            secret_key_ref {
              secret  = env.value.secret_name
              version = env.value.version
            }
          }
        }
      }

      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
        period_seconds    = 30
        failure_threshold = 3
      }
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# IAM: Allow public access (for frontend/API)
resource "google_cloud_run_service_iam_member" "public" {
  count    = var.allow_public ? 1 : 0
  service  = google_cloud_run_v2_service.service.name
  location = google_cloud_run_v2_service.service.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "url" {
  value = google_cloud_run_v2_service.service.uri
}
```

### Production Environment

```hcl
# terraform/environments/prod/main.tf

terraform {
  backend "gcs" {
    bucket = "adsmaster-terraform-state"
    prefix = "prod"
  }
}

provider "google" {
  project = "adsmaster-prod"
  region  = "us-central1"
}

# Networking
module "networking" {
  source = "../../modules/networking"

  project_id   = "adsmaster-prod"
  network_name = "adsmaster-vpc"
  region       = "us-central1"

  enable_nat = true
  enable_private_google_access = true
}

# Cloud SQL
module "database" {
  source = "../../modules/cloud-sql"

  name              = "adsmaster-db"
  region            = "us-central1"
  tier              = "db-custom-4-16384"
  high_availability = true
  backup_enabled    = true
  point_in_time_recovery = true

  private_network = module.networking.vpc_id

  database_flags = {
    "log_connections"    = "on"
    "log_disconnections" = "on"
    "log_lock_waits"     = "on"
  }
}

# Redis
module "redis" {
  source = "../../modules/redis"

  name            = "adsmaster-redis"
  region          = "us-central1"
  tier            = "STANDARD_HA"
  memory_size_gb  = 5
  redis_version   = "REDIS_7_0"

  authorized_network = module.networking.vpc_id
}

# API Service
module "api" {
  source = "../../modules/cloud-run"

  name        = "adsmaster-api"
  environment = "production"
  image       = "gcr.io/adsmaster-prod/api:${var.api_version}"

  min_instances = 2
  max_instances = 100
  memory        = "2Gi"
  cpu           = 2
  concurrency   = 80

  vpc_connector_id = module.networking.vpc_connector_id

  env_vars = {
    APP_ENV     = "production"
    LOG_LEVEL   = "INFO"
    DB_HOST     = module.database.private_ip
    REDIS_HOST  = module.redis.host
  }

  secrets = [
    { name = "DATABASE_URL", secret_name = "database-url", version = "latest" },
    { name = "JWT_SECRET_KEY", secret_name = "jwt-secret", version = "latest" },
    { name = "GOOGLE_ADS_CLIENT_ID", secret_name = "google-ads-client-id", version = "latest" },
  ]

  allow_public = true
}

# Frontend Service
module "frontend" {
  source = "../../modules/cloud-run"

  name        = "adsmaster-frontend"
  environment = "production"
  image       = "gcr.io/adsmaster-prod/frontend:${var.frontend_version}"

  min_instances = 2
  max_instances = 50
  memory        = "1Gi"
  cpu           = 1

  env_vars = {
    NEXT_PUBLIC_API_URL = module.api.url
  }

  allow_public = true
}

# Load Balancer with Cloud Armor
module "load_balancer" {
  source = "../../modules/load-balancer"

  name = "adsmaster-lb"

  backends = {
    frontend = module.frontend.neg_id
    api      = module.api.neg_id
  }

  security_policy = module.security.armor_policy_id

  ssl_certificate = module.ssl.certificate_id

  domains = {
    frontend = "app.adsmaster.com"
    api      = "api.adsmaster.com"
  }
}

# Monitoring
module "monitoring" {
  source = "../../modules/monitoring"

  project_id = "adsmaster-prod"

  services = {
    api      = module.api.service_id
    frontend = module.frontend.service_id
  }

  notification_channels = [
    var.pagerduty_channel_id,
    var.slack_channel_id
  ]
}
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches:
      - main
      - staging
  pull_request:
    branches:
      - main

env:
  GCP_PROJECT_PROD: adsmaster-prod
  GCP_PROJECT_STAGING: adsmaster-staging
  GCP_REGION: us-central1
  REGISTRY: gcr.io

jobs:
  # ====================
  # LINT & TEST
  # ====================
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt -r requirements-dev.txt

      - name: Lint
        run: |
          cd backend
          ruff check .
          mypy app/

      - name: Test
        run: |
          cd backend
          pytest --cov=app --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: backend/coverage.xml

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Lint
        run: |
          cd frontend
          npm run lint

      - name: Type check
        run: |
          cd frontend
          npm run type-check

      - name: Test
        run: |
          cd frontend
          npm run test:ci

      - name: Build
        run: |
          cd frontend
          npm run build

  # ====================
  # BUILD IMAGES
  # ====================
  build:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.event_name == 'push'

    outputs:
      api_image: ${{ steps.meta-api.outputs.tags }}
      frontend_image: ${{ steps.meta-frontend.outputs.tags }}

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Configure Docker
        run: gcloud auth configure-docker gcr.io

      - name: Determine environment
        id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "project=${{ env.GCP_PROJECT_PROD }}" >> $GITHUB_OUTPUT
          else
            echo "environment=staging" >> $GITHUB_OUTPUT
            echo "project=${{ env.GCP_PROJECT_STAGING }}" >> $GITHUB_OUTPUT
          fi

      - name: Extract metadata (API)
        id: meta-api
        uses: docker/metadata-action@v5
        with:
          images: gcr.io/${{ steps.env.outputs.project }}/api
          tags: |
            type=sha,prefix=
            type=ref,event=branch

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta-api.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Extract metadata (Frontend)
        id: meta-frontend
        uses: docker/metadata-action@v5
        with:
          images: gcr.io/${{ steps.env.outputs.project }}/frontend
          tags: |
            type=sha,prefix=
            type=ref,event=branch

      - name: Build and push Frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ steps.meta-frontend.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NEXT_PUBLIC_API_URL=${{ steps.env.outputs.environment == 'production' && 'https://api.adsmaster.com' || 'https://api.staging.adsmaster.com' }}

  # ====================
  # DEPLOY STAGING
  # ====================
  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/staging'
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY_STAGING }}

      - name: Deploy API to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: adsmaster-api
          image: ${{ needs.build.outputs.api_image }}
          region: ${{ env.GCP_REGION }}

      - name: Deploy Frontend to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: adsmaster-frontend
          image: ${{ needs.build.outputs.frontend_image }}
          region: ${{ env.GCP_REGION }}

      - name: Run database migrations
        run: |
          gcloud run jobs execute db-migrate --region=${{ env.GCP_REGION }} --wait

      - name: Run E2E tests
        run: |
          cd frontend
          npm run test:e2e -- --baseUrl=https://staging.adsmaster.com

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "✅ Deployed to staging: ${{ github.sha }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

  # ====================
  # DEPLOY PRODUCTION
  # ====================
  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY_PROD }}

      - name: Deploy API with traffic splitting
        id: deploy-api
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: adsmaster-api
          image: ${{ needs.build.outputs.api_image }}
          region: ${{ env.GCP_REGION }}
          tag: canary
          no_traffic: true

      - name: Canary test (10% traffic)
        run: |
          gcloud run services update-traffic adsmaster-api \
            --region=${{ env.GCP_REGION }} \
            --to-tags=canary=10

      - name: Health check canary
        run: |
          sleep 60
          # Check error rate
          ERROR_RATE=$(gcloud monitoring read \
            "fetch cloud_run_revision | \
             metric 'run.googleapis.com/request_count' | \
             filter resource.revision_name =~ 'canary' | \
             filter metric.response_code_class != '2xx' | \
             within 5m | \
             reduce ratio")

          if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
            echo "Canary error rate too high: $ERROR_RATE"
            exit 1
          fi

      - name: Promote to 100%
        run: |
          gcloud run services update-traffic adsmaster-api \
            --region=${{ env.GCP_REGION }} \
            --to-latest

      - name: Deploy Frontend
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: adsmaster-frontend
          image: ${{ needs.build.outputs.frontend_image }}
          region: ${{ env.GCP_REGION }}

      - name: Run database migrations
        run: |
          gcloud run jobs execute db-migrate --region=${{ env.GCP_REGION }} --wait

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚀 Deployed to production: ${{ github.sha }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

      - name: Create release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release v${{ github.run_number }}
          body: |
            Changes in this release:
            ${{ github.event.head_commit.message }}
```

### Database Migrations

```yaml
# .github/workflows/db-migrate.yml

name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment'
        required: true
        type: choice
        options:
          - staging
          - production
      action:
        description: 'Action'
        required: true
        type: choice
        options:
          - migrate
          - rollback

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}

    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Run migration
        run: |
          if [ "${{ github.event.inputs.action }}" == "migrate" ]; then
            gcloud run jobs execute db-migrate --region=us-central1 --wait
          else
            gcloud run jobs execute db-rollback --region=us-central1 --wait
          fi

      - name: Notify
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Database ${{ github.event.inputs.action }} completed on ${{ github.event.inputs.environment }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Monitoring & Observability

### Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OBSERVABILITY STACK                                  │
└─────────────────────────────────────────────────────────────────────────────┘

METRICS
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Cloud Run   │────►│   Cloud      │────►│  Dashboards  │
│  Metrics     │     │  Monitoring  │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
┌──────────────┐            │
│  Custom      │────────────┘
│  Metrics     │
│  (Prometheus)│
└──────────────┘

LOGS
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Application │────►│   Cloud      │────►│  Log         │
│  Logs        │     │  Logging     │     │  Explorer    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Log-based   │
                     │  Metrics     │
                     └──────────────┘

TRACES
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  OpenTelemetry    ►│   Cloud      │────►│  Trace       │
│  SDK         │     │  Trace       │     │  Explorer    │
└──────────────┘     └──────────────┘     └──────────────┘

ALERTS
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Alerting    │────►│  PagerDuty   │────►│  On-Call     │
│  Policies    │     │  /Slack      │     │  Engineer    │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Key Metrics & Dashboards

```yaml
# monitoring/dashboards/api-dashboard.yaml

dashboards:
  api_overview:
    title: "API Overview"
    widgets:
      - type: scorecard
        title: "Request Rate"
        metric: "run.googleapis.com/request_count"
        aggregation: rate

      - type: scorecard
        title: "Error Rate"
        metric: "run.googleapis.com/request_count"
        filter: "response_code_class != 2xx"
        threshold:
          warning: 0.01  # 1%
          critical: 0.05 # 5%

      - type: scorecard
        title: "P99 Latency"
        metric: "run.googleapis.com/request_latencies"
        percentile: 99
        threshold:
          warning: 500   # 500ms
          critical: 1000 # 1s

      - type: line_chart
        title: "Request Rate by Endpoint"
        metric: "custom.googleapis.com/api/request_count"
        group_by: ["endpoint", "method"]

      - type: line_chart
        title: "Latency Percentiles"
        metrics:
          - "run.googleapis.com/request_latencies|p50"
          - "run.googleapis.com/request_latencies|p95"
          - "run.googleapis.com/request_latencies|p99"

      - type: line_chart
        title: "Error Rate by Type"
        metric: "run.googleapis.com/request_count"
        filter: "response_code_class != 2xx"
        group_by: ["response_code"]

  database:
    title: "Database Health"
    widgets:
      - type: scorecard
        title: "Active Connections"
        metric: "cloudsql.googleapis.com/database/postgresql/num_backends"
        threshold:
          warning: 80  # 80% of max
          critical: 95

      - type: line_chart
        title: "Query Latency"
        metric: "cloudsql.googleapis.com/database/postgresql/query_duration"

      - type: line_chart
        title: "CPU & Memory"
        metrics:
          - "cloudsql.googleapis.com/database/cpu/utilization"
          - "cloudsql.googleapis.com/database/memory/utilization"

      - type: line_chart
        title: "Disk Usage"
        metric: "cloudsql.googleapis.com/database/disk/utilization"
        threshold:
          warning: 0.7
          critical: 0.85

  business:
    title: "Business Metrics"
    widgets:
      - type: scorecard
        title: "Active Users (24h)"
        metric: "custom.googleapis.com/business/active_users"

      - type: scorecard
        title: "Recommendations Applied"
        metric: "custom.googleapis.com/business/recommendations_applied"

      - type: line_chart
        title: "Signup Rate"
        metric: "custom.googleapis.com/business/signups"

      - type: line_chart
        title: "AI Chat Messages"
        metric: "custom.googleapis.com/business/ai_messages"
```

### Alerting Policies

```yaml
# monitoring/alerts.yaml

alerting_policies:
  # Availability
  - name: "API High Error Rate"
    condition:
      metric: "run.googleapis.com/request_count"
      filter: "response_code_class = '5xx'"
      threshold: 0.01  # 1% error rate
      duration: "5m"
    severity: "CRITICAL"
    notification_channels:
      - pagerduty
      - slack

  - name: "API High Latency"
    condition:
      metric: "run.googleapis.com/request_latencies"
      percentile: 99
      threshold: 2000  # 2 seconds
      duration: "5m"
    severity: "WARNING"
    notification_channels:
      - slack

  - name: "Service Unavailable"
    condition:
      metric: "monitoring.googleapis.com/uptime_check/check_passed"
      threshold: false
      duration: "2m"
    severity: "CRITICAL"
    notification_channels:
      - pagerduty
      - slack
      - email

  # Database
  - name: "Database Connection Pool Exhausted"
    condition:
      metric: "cloudsql.googleapis.com/database/postgresql/num_backends"
      threshold: 95  # 95% of max_connections
      duration: "5m"
    severity: "CRITICAL"
    notification_channels:
      - pagerduty

  - name: "Database High CPU"
    condition:
      metric: "cloudsql.googleapis.com/database/cpu/utilization"
      threshold: 0.9
      duration: "10m"
    severity: "WARNING"
    notification_channels:
      - slack

  - name: "Database Disk Space Low"
    condition:
      metric: "cloudsql.googleapis.com/database/disk/utilization"
      threshold: 0.85
      duration: "5m"
    severity: "WARNING"
    notification_channels:
      - slack
      - email

  # Business
  - name: "Google Ads Sync Failures"
    condition:
      metric: "custom.googleapis.com/sync/failures"
      threshold: 10
      duration: "15m"
    severity: "WARNING"
    notification_channels:
      - slack

  - name: "Payment Processing Failures"
    condition:
      metric: "custom.googleapis.com/billing/payment_failures"
      threshold: 5
      duration: "10m"
    severity: "CRITICAL"
    notification_channels:
      - pagerduty
      - slack

  # Security
  - name: "High Rate Limit Violations"
    condition:
      metric: "custom.googleapis.com/security/rate_limit_violations"
      threshold: 100
      duration: "5m"
    severity: "WARNING"
    notification_channels:
      - slack

  - name: "Suspicious Login Activity"
    condition:
      metric: "custom.googleapis.com/security/failed_logins"
      threshold: 50
      duration: "5m"
    severity: "CRITICAL"
    notification_channels:
      - pagerduty
      - slack
```

### Application Instrumentation

```python
# app/core/observability/metrics.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.cloud_monitoring import CloudMonitoringMetricsExporter

# Initialize meter
meter_provider = MeterProvider()
metrics.set_meter_provider(meter_provider)
meter = metrics.get_meter("adsmaster")

# Define custom metrics
request_counter = meter.create_counter(
    name="api.request_count",
    description="Number of API requests",
    unit="1"
)

request_latency = meter.create_histogram(
    name="api.request_latency",
    description="Request latency",
    unit="ms"
)

active_users_gauge = meter.create_observable_gauge(
    name="business.active_users",
    description="Number of active users",
    callbacks=[lambda: get_active_user_count()]
)

# Middleware to record metrics
class MetricsMiddleware:
    async def __call__(self, request, call_next):
        start_time = time.time()

        response = await call_next(request)

        duration = (time.time() - start_time) * 1000

        # Record metrics
        request_counter.add(1, {
            "endpoint": request.url.path,
            "method": request.method,
            "status": response.status_code
        })

        request_latency.record(duration, {
            "endpoint": request.url.path,
            "method": request.method
        })

        return response
```

---

## Disaster Recovery

### Backup Strategy

```yaml
# Backup configuration

database:
  provider: "Cloud SQL"
  backup_type: "automated"
  schedule: "daily at 02:00 UTC"
  retention: 30  # days
  point_in_time_recovery: true
  pitr_retention: 7  # days

  # Cross-region replica for DR
  read_replica:
    enabled: true
    region: "us-east1"

  # Export to GCS for long-term
  export:
    enabled: true
    schedule: "weekly"
    destination: "gs://adsmaster-backups/database/"
    retention: 365  # days

storage:
  provider: "Cloud Storage"
  bucket: "adsmaster-backups"
  versioning: true
  lifecycle:
    - action: "delete"
      age: 365

redis:
  persistence: "RDB"
  backup_schedule: "daily at 03:00 UTC"
  retention: 7  # days

secrets:
  provider: "Secret Manager"
  backup: "automatic versioning"
  retention: "all versions"
```

### Disaster Recovery Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DISASTER RECOVERY PLAN                                  │
└─────────────────────────────────────────────────────────────────────────────┘

RECOVERY OBJECTIVES
├── RTO (Recovery Time Objective): 4 hours
├── RPO (Recovery Point Objective): 1 hour
└── MTD (Maximum Tolerable Downtime): 8 hours

DISASTER SCENARIOS

1. SINGLE SERVICE FAILURE
   ├── Impact: One Cloud Run service down
   ├── Detection: Health check alerts
   ├── Recovery: Automatic (Cloud Run self-heals)
   └── RTO: < 5 minutes

2. DATABASE FAILURE
   ├── Impact: Database unavailable
   ├── Detection: Connection failure alerts
   ├── Recovery:
   │   a. Automatic failover to standby (HA)
   │   b. Manual: Point-in-time recovery
   └── RTO: < 30 minutes (HA), < 2 hours (restore)

3. REGIONAL OUTAGE
   ├── Impact: Entire region unavailable
   ├── Detection: Uptime check failures
   ├── Recovery:
   │   a. DNS failover to DR region
   │   b. Promote read replica
   │   c. Deploy services in DR region
   └── RTO: < 4 hours

4. DATA CORRUPTION
   ├── Impact: Data integrity compromised
   ├── Detection: Monitoring, user reports
   ├── Recovery:
   │   a. Identify corruption time
   │   b. Point-in-time restore
   │   c. Replay transactions if needed
   └── RTO: < 4 hours

5. SECURITY BREACH
   ├── Impact: Unauthorized access
   ├── Detection: Security alerts, audit logs
   ├── Recovery:
   │   a. Isolate affected systems
   │   b. Rotate all credentials
   │   c. Restore from clean backup
   │   d. Forensic analysis
   └── RTO: Variable (depends on scope)
```

### DR Runbook

```yaml
# runbooks/disaster-recovery.yaml

scenarios:
  database_failure:
    severity: critical
    steps:
      - name: "Assess situation"
        action: |
          1. Check Cloud SQL status in console
          2. Check for ongoing GCP incidents
          3. Review recent changes

      - name: "Automatic failover (HA)"
        condition: "HA enabled"
        action: |
          # Failover happens automatically
          # Verify new primary is healthy
          gcloud sql instances describe adsmaster-db

      - name: "Manual recovery"
        condition: "HA failover failed or not enabled"
        action: |
          # Option 1: Point-in-time recovery
          gcloud sql instances clone adsmaster-db adsmaster-db-recovery \
            --point-in-time="2026-03-02T10:00:00Z"

          # Option 2: Restore from backup
          gcloud sql backups list --instance=adsmaster-db
          gcloud sql backups restore BACKUP_ID \
            --restore-instance=adsmaster-db

      - name: "Update connection strings"
        action: |
          # If new instance created, update secrets
          gcloud secrets versions add database-url \
            --data-file=new-connection-string.txt

      - name: "Verify recovery"
        action: |
          # Run health checks
          curl https://api.adsmaster.com/health
          # Run smoke tests
          npm run test:smoke

      - name: "Communicate"
        action: |
          # Update status page
          # Notify users via email/in-app

  regional_outage:
    severity: critical
    steps:
      - name: "Confirm regional outage"
        action: |
          # Check GCP status page
          # Verify other regions are healthy
          gcloud compute regions describe us-east1

      - name: "Deploy to DR region"
        action: |
          # Deploy services to us-east1
          cd infrastructure/terraform/environments/dr
          terraform apply -auto-approve

      - name: "Promote database replica"
        action: |
          gcloud sql instances promote-replica adsmaster-db-replica

      - name: "Update DNS"
        action: |
          # Update Cloud DNS to point to DR region
          gcloud dns record-sets update api.adsmaster.com \
            --zone=adsmaster-zone \
            --type=A \
            --rrdatas=DR_IP_ADDRESS

      - name: "Verify and monitor"
        action: |
          # Run health checks
          # Monitor error rates
          # Update status page
```

---

## Summary

### Infrastructure Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| IaC | Terraform | Reproducible infrastructure |
| CI/CD | GitHub Actions | Automated deployments |
| Container Registry | GCR | Image storage |
| Compute | Cloud Run | Serverless containers |
| Database | Cloud SQL (HA) | PostgreSQL |
| Cache | Memorystore | Redis |
| CDN | Cloud CDN | Static asset delivery |
| WAF | Cloud Armor | Security |
| Monitoring | Cloud Monitoring | Metrics & dashboards |
| Logging | Cloud Logging | Centralized logs |
| Alerting | PagerDuty + Slack | Incident management |

### Key Metrics

| Metric | Target |
|--------|--------|
| API Availability | 99.9% |
| API Latency (p99) | < 500ms |
| Error Rate | < 0.1% |
| Deployment Frequency | Daily |
| RTO | 4 hours |
| RPO | 1 hour |

---

*Document Version: 1.0*
*Created: March 2026*
*Status: READY FOR REVIEW*
