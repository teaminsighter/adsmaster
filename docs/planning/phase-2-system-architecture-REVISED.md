# Phase 2: System Architecture Plan (REVISED)

## Revision Notes

**Why Revised**: Original architecture missed critical components for:
- Predictive analysis (ML forecasting, not just LLM)
- Large-scale analytics (BigQuery needed)
- ML pipeline for training models
- Financial accuracy guarantees

**Sources for Revision**:
- [Predictive Analytics for Google Ads 2026](https://junaix.com/predictive-analytics-google-ads-must-have.html)
- [Vertex AI Forecasting](https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-forecasting)
- [BigQuery ML Introduction](https://docs.cloud.google.com/bigquery/docs/bqml-introduction)
- [Real-Time Ads Platform Architecture](https://e-mindset.space/blog/ads-platform-part-1-foundation-architecture/)
- [Time Series Forecasting with Vertex AI](https://codelabs.developers.google.com/codelabs/time-series-forecasting-with-cloud-ai-platform)

---

## Executive Summary (REVISED)

| Decision | Choice | Change from V1 |
|----------|--------|----------------|
| **Cloud Provider** | Google Cloud Platform (GCP) | Same |
| **Architecture** | Modular Monolith + ML Platform | Added ML layer |
| **Frontend** | Next.js 15 | Same |
| **Backend** | Python FastAPI | Same |
| **Transactional DB** | Cloud SQL PostgreSQL | Same |
| **Analytics DB** | **BigQuery** | 🆕 NEW |
| **ML Platform** | **Vertex AI** | 🆕 NEW |
| **Data Pipeline** | **Dataflow + Pub/Sub** | 🆕 NEW |
| **Cache** | Memorystore Redis | Same |
| **LLM** | Gemini API | Same (clarified role) |
| **Deployment** | Cloud Run + Vertex AI Endpoints | Added ML endpoints |

---

## Revised Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    USERS                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER (Cloud Run)                                   │
│    ┌──────────────┐         ┌──────────────┐         ┌──────────────┐                   │
│    │   FRONTEND   │         │   BACKEND    │         │   WEBHOOK    │                   │
│    │   Next.js    │         │   FastAPI    │         │   Handler    │                   │
│    └──────────────┘         └──────────────┘         └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                ┌───────────────────────┼───────────────────────┐
                │                       │                       │
                ▼                       ▼                       ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│   TRANSACTIONAL       │  │   ANALYTICS           │  │   ML / AI             │
│   LAYER               │  │   LAYER               │  │   LAYER               │
│                       │  │                       │  │                       │
│  ┌─────────────────┐  │  │  ┌─────────────────┐  │  │  ┌─────────────────┐  │
│  │   CLOUD SQL     │  │  │  │   BIGQUERY      │  │  │  │   VERTEX AI     │  │
│  │   PostgreSQL    │  │  │  │                 │  │  │  │                 │  │
│  │                 │  │  │  │ • Historical    │  │  │  │ • Forecasting   │  │
│  │ • Users/Auth   │  │  │  │   metrics (11yr)│  │  │  │ • Prediction    │  │
│  │ • Campaigns    │  │  │  │ • Aggregations  │  │  │  │ • Anomaly       │  │
│  │ • Real-time    │  │  │  │ • ML Training   │  │  │  │   Detection     │  │
│  │   metrics      │  │  │  │   Data          │  │  │  │ • Model Serving │  │
│  │ • Transactions │  │  │  │ • Reports       │  │  │  │                 │  │
│  │                 │  │  │  │                 │  │  │  └─────────────────┘  │
│  │ STRONG         │  │  │  │                 │  │  │                       │
│  │ CONSISTENCY    │  │  │  │                 │  │  │  ┌─────────────────┐  │
│  │ (budgets,      │  │  │  │                 │  │  │  │   BIGQUERY ML   │  │
│  │  billing)      │  │  │  │                 │  │  │  │                 │  │
│  └─────────────────┘  │  │  └─────────────────┘  │  │  │ • ARIMA_PLUS   │  │
│                       │  │                       │  │  │ • Time Series  │  │
│  ┌─────────────────┐  │  │                       │  │  │ • In-DB ML     │  │
│  │   MEMORYSTORE   │  │  │                       │  │  └─────────────────┘  │
│  │   Redis         │  │  │                       │  │                       │
│  │                 │  │  │                       │  │  ┌─────────────────┐  │
│  │ • Sessions     │  │  │                       │  │  │   GEMINI API    │  │
│  │ • Cache        │  │  │                       │  │  │                 │  │
│  │ • Rate Limits  │  │  │                       │  │  │ • AI Chat       │  │
│  └─────────────────┘  │  │                       │  │  │ • Explanations  │  │
│                       │  │                       │  │  │ • Ad Copy       │  │
└───────────────────────┘  └───────────────────────┘  │  └─────────────────┘  │
                                        │             └───────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA PIPELINE LAYER                                         │
│                                                                                          │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│   │   PUB/SUB    │────►│   DATAFLOW   │────►│   BIGQUERY   │────►│  VERTEX AI   │       │
│   │              │     │   (ETL)      │     │   (Store)    │     │  (Train)     │       │
│   │ • Events     │     │              │     │              │     │              │       │
│   │ • Sync data  │     │ • Transform  │     │ • Tables     │     │ • Models     │       │
│   │ • Changes    │     │ • Aggregate  │     │ • Views      │     │ • Endpoints  │       │
│   └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘       │
│                                                                                          │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                            │
│   │   CLOUD      │     │   CLOUD      │     │   CLOUD      │                            │
│   │   SCHEDULER  │────►│   TASKS      │────►│   RUN        │                            │
│   │              │     │              │     │   WORKERS    │                            │
│   │ • Cron jobs  │     │ • Queue      │     │              │                            │
│   │ • Triggers   │     │ • Retry      │     │ • Sync       │                            │
│   └──────────────┘     └──────────────┘     │ • Process    │                            │
│                                             └──────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL INTEGRATIONS                                       │
│                                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │ GOOGLE ADS   │    │    META      │    │   STRIPE     │    │  WHATSAPP    │         │
│   │   API v23    │    │    API       │    │   BILLING    │    │  BUSINESS    │         │
│   └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## The Two AI Brains - Detailed

### Brain 1: Gemini (LLM) - For Human Interaction

| Use Case | Model | Why LLM |
|----------|-------|---------|
| AI Advisor chat | Gemini 2.5 Flash/Pro | Natural conversation |
| Explain metrics in plain English | Gemini 2.5 Flash | Language generation |
| Generate ad copy variations | Gemini 2.5 Flash | Creative writing |
| Weekly summary narrative | Gemini 2.5 Flash | Report generation |
| Answer "why" questions | Gemini 2.5 Pro | Reasoning |

**Cost**: ~$0.25-1.00 per user per month

### Brain 2: Vertex AI + BigQuery ML - For Predictions

| Use Case | Model/Method | Why ML (not LLM) |
|----------|--------------|------------------|
| **Spend Forecasting** | ARIMA_PLUS in BigQuery ML | Time series math, not language |
| **Conversion Prediction** | Vertex AI AutoML Tabular | Classification on structured data |
| **Budget Allocation** | Custom optimization model | Mathematical optimization |
| **Anomaly Detection** | Vertex AI Anomaly Detection | Statistical patterns |
| **ROAS Forecasting** | TFT (Temporal Fusion Transformer) | Multi-horizon forecasting |
| **LTV Prediction** | BigQuery ML Regression | Structured data prediction |
| **Waste Detection** | Rules Engine + Anomaly Detection | Pattern matching |

**Cost**: ~$50-200/month (depends on training frequency)

---

## ML Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ML PIPELINE FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

STEP 1: DATA COLLECTION (Continuous)
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Google Ads   │────►│   Cloud SQL  │────►│   Pub/Sub    │
│ API Sync     │     │   (staging)  │     │   (events)   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
STEP 2: ETL (Every 4 hours)
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Pub/Sub    │────►│   Dataflow   │────►│   BigQuery   │
│   (trigger)  │     │   (process)  │     │   (store)    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Transforms:  │
                     │ • Aggregate  │
                     │ • Clean      │
                     │ • Feature    │
                     │   engineer   │
                     └──────────────┘
                                                 │
                                                 ▼
STEP 3: MODEL TRAINING (Weekly)
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  BigQuery    │────►│  Vertex AI   │────►│   Model      │
│  (data)      │     │  Training    │     │   Registry   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Models:      │
                     │ • Forecast   │
                     │ • Anomaly    │
                     │ • LTV        │
                     │ • Conversion │
                     └──────────────┘
                                                 │
                                                 ▼
STEP 4: MODEL SERVING (Real-time)
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  API Request │────►│ Vertex AI    │────►│  Prediction  │
│  (forecast)  │     │ Endpoint     │     │  Result      │
└──────────────┘     └──────────────┘     └──────────────┘

ALTERNATIVE: BigQuery ML (simpler, for SQL-based predictions)
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  API Request │────►│ BigQuery     │────►│  Prediction  │
│  (forecast)  │     │ ML.PREDICT() │     │  Result      │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## Predictive Analysis Features

### 1. Spend Forecasting

**What it does**: Predicts future ad spend for the next 7/30/90 days

**Implementation**:
```sql
-- BigQuery ML: ARIMA_PLUS for spend forecasting
CREATE OR REPLACE MODEL `project.ml_models.spend_forecast`
OPTIONS(
  model_type = 'ARIMA_PLUS',
  time_series_timestamp_col = 'date',
  time_series_data_col = 'daily_spend',
  time_series_id_col = 'campaign_id',
  horizon = 30,  -- 30 days forecast
  auto_arima = TRUE
) AS
SELECT
  date,
  campaign_id,
  SUM(cost_micros) / 1000000 AS daily_spend
FROM `project.analytics.campaign_metrics_daily`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)
GROUP BY date, campaign_id;

-- Get predictions
SELECT * FROM ML.FORECAST(MODEL `project.ml_models.spend_forecast`,
  STRUCT(30 AS horizon, 0.95 AS confidence_level));
```

**User sees**: "Based on current trends, your campaign will spend ~$2,340 next month (90% confidence: $2,100 - $2,580)"

### 2. Conversion Prediction

**What it does**: Predicts conversion probability for each keyword/audience

**Implementation**: Vertex AI AutoML Tabular
- Input: keyword text, match type, quality score, historical CTR, CPC, position
- Output: conversion probability (0-1)

**User sees**: "Keyword 'handmade candles' has 78% conversion probability - recommend increasing bid"

### 3. Budget Allocation Optimization

**What it does**: Recommends optimal budget distribution across campaigns

**Implementation**: Custom optimization using SciPy or OR-Tools
```python
# Simplified example
from scipy.optimize import minimize

def optimize_budget(campaigns, total_budget, historical_roas):
    """Find optimal budget allocation to maximize total conversions"""
    # Objective: maximize predicted conversions
    # Constraints: sum of budgets = total_budget
    # Uses predicted conversion rates from ML model
    ...
```

**User sees**: "Recommended budget split: Campaign A: $400 (↑20%), Campaign B: $300 (↓10%), Campaign C: $300 (same)"

### 4. Anomaly Detection

**What it does**: Detects unusual spend patterns, click fraud, performance drops

**Implementation**: Vertex AI Anomaly Detection or BigQuery ML
```sql
-- BigQuery ML: Detect anomalies in daily spend
SELECT *
FROM ML.DETECT_ANOMALIES(
  MODEL `project.ml_models.spend_anomaly`,
  STRUCT(0.95 AS anomaly_prob_threshold),
  TABLE `project.analytics.campaign_metrics_daily`
);
```

**User sees**: "⚠️ Unusual activity detected: Campaign X spent 3x normal rate in last 2 hours"

### 5. ROAS Forecasting

**What it does**: Predicts future ROAS based on current trajectory

**Implementation**: Temporal Fusion Transformer (TFT) in Vertex AI
- Handles multiple time series (spend, conversions, value)
- Captures seasonality, trends, and covariates

**User sees**: "If you maintain current strategy, expected ROAS next month: 3.8x (currently 4.2x) - declining trend"

---

## Financial Accuracy Requirements

### Money Handling Rules

```python
# RULE 1: Use integers for money (micros)
# Google Ads API returns cost in "micros" (millionths)
# $1.50 = 1,500,000 micros
# NEVER use float for money calculations

class MoneyMicros:
    def __init__(self, micros: int):
        self.micros = micros  # Always integer

    @property
    def dollars(self) -> Decimal:
        return Decimal(self.micros) / Decimal(1_000_000)

    def __add__(self, other):
        return MoneyMicros(self.micros + other.micros)

# RULE 2: Use Decimal for any division/display
from decimal import Decimal, ROUND_HALF_UP

def calculate_cpa(cost_micros: int, conversions: Decimal) -> Decimal:
    if conversions == 0:
        return Decimal('0')
    cost = Decimal(cost_micros) / Decimal(1_000_000)
    return (cost / conversions).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

# RULE 3: Database stores as BIGINT or DECIMAL, never FLOAT
# cost_micros BIGINT  -- for raw values
# conversions DECIMAL(15,2)  -- for counts that can be fractional
# roas DECIMAL(10,4)  -- for ratios
```

### Transaction Safety for Budgets

```python
# Budget changes MUST use database transactions with row-level locking

async def update_campaign_budget(campaign_id: str, new_budget: int):
    async with db.transaction():
        # Lock the row to prevent concurrent updates
        campaign = await db.fetch_one(
            "SELECT * FROM campaigns WHERE id = $1 FOR UPDATE",
            campaign_id
        )

        # Validate budget doesn't exceed organization limit
        org_budget = await get_org_remaining_budget(campaign.org_id)
        if new_budget > org_budget:
            raise BudgetExceededError()

        # Update in our database
        await db.execute(
            "UPDATE campaigns SET budget_amount = $1 WHERE id = $2",
            new_budget, campaign_id
        )

        # Update in Google Ads (within same logical transaction)
        await google_ads_client.update_campaign_budget(
            campaign.platform_campaign_id,
            new_budget
        )

        # Log change for audit
        await log_budget_change(campaign_id, campaign.budget_amount, new_budget)
```

---

## Data Architecture (Revised)

### Where Data Lives

| Data Type | Storage | Consistency | Retention |
|-----------|---------|-------------|-----------|
| User accounts, auth | Cloud SQL | Strong | Forever |
| Campaign config | Cloud SQL | Strong | Forever |
| Budget/billing | Cloud SQL | **Strong** (critical) | Forever |
| Real-time metrics (7 days) | Cloud SQL | Eventual | 7 days |
| Historical metrics | BigQuery | Eventual | 11 years |
| ML training data | BigQuery | Eventual | 3 years |
| ML models | Vertex AI Model Registry | N/A | 1 year |
| Sessions/cache | Redis | N/A | 7 days |
| Reports/exports | Cloud Storage | N/A | 2 years |

### Data Flow

```
Google Ads API (source of truth)
         │
         ▼ (every 1-4 hours)
┌─────────────────┐
│    Cloud SQL    │ ← Real-time queries, transactions
│  (hot data)     │
└────────┬────────┘
         │
         ▼ (every 4 hours via Dataflow)
┌─────────────────┐
│    BigQuery     │ ← Historical analytics, ML training
│  (cold data)    │
└────────┬────────┘
         │
         ▼ (weekly)
┌─────────────────┐
│   Vertex AI     │ ← Model training
│  (ML models)    │
└─────────────────┘
```

---

## Revised Cost Estimates

### Startup Phase (0-100 users)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Cloud Run (all services) | Same as before | ~$80 |
| Cloud SQL | Same as before | ~$100 |
| Memorystore | Same as before | ~$35 |
| **BigQuery** | 10GB storage, 1TB queries | ~$25 |
| **Dataflow** | 2-3 jobs/day, light | ~$30 |
| **Vertex AI** | AutoML training weekly, 1 endpoint | ~$50 |
| Networking & other | | ~$30 |
| **Subtotal GCP** | | **~$350/mo** |
| Gemini API | | ~$50 |
| Other services | | ~$15 |
| **TOTAL** | | **~$415/mo** |

### Growth Phase (100-1,000 users)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| Cloud Run | | ~$300 |
| Cloud SQL | | ~$350 |
| Memorystore | | ~$200 |
| **BigQuery** | 100GB storage, 10TB queries | ~$100 |
| **Dataflow** | 10+ jobs/day | ~$150 |
| **Vertex AI** | Multiple models, 3 endpoints | ~$300 |
| Networking & other | | ~$150 |
| **Subtotal GCP** | | **~$1,550/mo** |
| Gemini API | | ~$300 |
| Other services | | ~$150 |
| **TOTAL** | | **~$2,000/mo** |

### Scale Phase (1,000-10,000 users)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| All GCP services | Scaled up | ~$5,000 |
| Gemini + Vertex AI | Heavy usage | ~$2,500 |
| Other services | | ~$500 |
| **TOTAL** | | **~$8,000/mo** |

### Revenue vs Cost (Revised)

| Users | MRR | Infrastructure | Margin |
|-------|-----|----------------|--------|
| 100 | $8,000 | $415 | 95% |
| 500 | $40,000 | $1,200 | 97% |
| 1,000 | $80,000 | $2,000 | 97.5% |
| 10,000 | $800,000 | $8,000 | 99% |

**Still very profitable** - ML infrastructure adds ~$100-500/month but enables premium features.

---

## Technology Stack (Final)

### Core Services

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15, TypeScript, TailwindCSS | Web app |
| Backend API | FastAPI, Python 3.12 | REST API |
| Transactional DB | Cloud SQL PostgreSQL 15 | Users, campaigns, real-time |
| Analytics DB | BigQuery | Historical data, ML training |
| Cache | Memorystore Redis | Sessions, rate limiting |
| Queue | Cloud Tasks + Pub/Sub | Background jobs |
| File Storage | Cloud Storage | Reports, exports |

### ML/AI Services

| Service | Use Case | Model |
|---------|----------|-------|
| Gemini API | Chat, explanations, ad copy | Flash 2.5 / Pro |
| BigQuery ML | Spend forecasting, simple predictions | ARIMA_PLUS, regression |
| Vertex AI AutoML | Conversion prediction, LTV | AutoML Tabular |
| Vertex AI Training | Complex models (if needed) | Custom TensorFlow/PyTorch |
| Vertex AI Endpoints | Model serving | Managed endpoints |

### Data Pipeline

| Service | Purpose |
|---------|---------|
| Pub/Sub | Event streaming, triggers |
| Dataflow | ETL from Cloud SQL to BigQuery |
| Cloud Scheduler | Cron jobs (sync, training) |
| Cloud Tasks | Async job queue |

---

## Implementation Phases (Revised)

### Phase 1: Foundation (Weeks 1-4)
- [x] GCP project setup
- [x] Cloud SQL + Redis setup
- [x] Basic Next.js + FastAPI scaffold
- [x] Authentication
- [ ] **NEW**: BigQuery dataset setup
- [ ] **NEW**: Basic Dataflow pipeline (SQL → BigQuery)

### Phase 2: Core Features (Weeks 5-8)
- [ ] Google Ads API sync
- [ ] Dashboard with metrics
- [ ] Campaign management
- [ ] **NEW**: Historical data in BigQuery

### Phase 3: Basic ML (Weeks 9-12)
- [ ] **NEW**: BigQuery ML spend forecasting
- [ ] **NEW**: Anomaly detection rules
- [ ] Gemini AI advisor chat
- [ ] Recommendations engine

### Phase 4: Advanced ML (Weeks 13-16)
- [ ] **NEW**: Vertex AI conversion prediction
- [ ] **NEW**: Budget optimization model
- [ ] **NEW**: LTV prediction
- [ ] Full automation rules

### Phase 5: Polish (Weeks 17-20)
- [ ] Performance optimization
- [ ] Model monitoring
- [ ] A/B testing framework
- [ ] Production hardening

---

## Summary: What Changed

| Component | V1 (Original) | V2 (Revised) |
|-----------|---------------|--------------|
| Analytics | Cloud SQL only | Cloud SQL + **BigQuery** |
| ML | None | **Vertex AI + BigQuery ML** |
| Data Pipeline | None | **Dataflow + Pub/Sub** |
| AI | Gemini only | Gemini + **ML models** |
| Forecasting | None | **ARIMA, TFT, AutoML** |
| Cost estimate | $315/mo | **$415/mo** (100 users) |
| Timeline | 16 weeks | **20 weeks** |

---

## Questions Before Proceeding

1. **ML Complexity**: Start with BigQuery ML (simpler) or Vertex AI (more powerful)?
2. **Forecasting Priority**: Which predictions are most valuable to users first?
3. **Training Frequency**: How often should models retrain (daily/weekly)?
4. **Data History**: How much historical data to migrate to BigQuery initially?

---

*Document Version: 2.0 (Revised)*
*Created: March 2026*
*Status: PENDING APPROVAL*
