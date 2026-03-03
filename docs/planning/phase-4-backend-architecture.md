# Phase 4: Backend Architecture Plan

## Executive Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture** | Modular Monolith | Simpler ops, can split later |
| **Framework** | FastAPI (Python 3.12) | Async, type hints, auto-docs |
| **ORM** | SQLAlchemy 2.0 + asyncpg | Async support, mature ecosystem |
| **Background Jobs** | Cloud Tasks + Cloud Run Jobs | GCP native, scalable |
| **Caching** | Redis (Memorystore) | Fast, pub/sub support |
| **Logging** | Cloud Logging (structured) | GCP native, searchable |
| **Testing** | pytest + pytest-asyncio | Standard Python testing |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND ARCHITECTURE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOUD RUN                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          API SERVICE                                  │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │  Routers    │  │ Middleware  │  │   Auth      │  │   CORS     │  │   │
│  │  │  /api/v1/*  │  │  Logging    │  │   JWT       │  │   Config   │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │   │
│  │         │                │                │               │         │   │
│  │         └────────────────┴────────────────┴───────────────┘         │   │
│  │                                  │                                   │   │
│  │                                  ▼                                   │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                      SERVICE LAYER                             │  │   │
│  │  │                                                                │  │   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │  │   │
│  │  │  │ AuthService │ │ UserService │ │CampaignSvc  │ │ AISvc    │ │  │   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ │  │   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │  │   │
│  │  │  │ BillingService│ MetricsService│ │ReportService│SyncService│ │  │   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                                  │                                   │   │
│  │                                  ▼                                   │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                    REPOSITORY LAYER                            │  │   │
│  │  │                                                                │  │   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │  │   │
│  │  │  │ UserRepo    │ │ CampaignRepo│ │ MetricsRepo │ │ AuditRepo│ │  │   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                                  │                                   │   │
│  └──────────────────────────────────┼───────────────────────────────────┘   │
│                                     │                                       │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                   ┌──────────────────┼──────────────────┐
                   │                  │                  │
                   ▼                  ▼                  ▼
           ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
           │  Cloud SQL  │    │    Redis    │    │  BigQuery   │
           │  PostgreSQL │    │ (Memorystore)│   │             │
           └─────────────┘    └─────────────┘    └─────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKGROUND WORKERS                                  │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  SYNC WORKER    │  │  METRICS WORKER │  │  REPORT WORKER  │             │
│  │  (Cloud Run Job)│  │  (Cloud Run Job)│  │  (Cloud Run Job)│             │
│  │                 │  │                 │  │                 │             │
│  │  • Google Ads   │  │  • ETL to BQ    │  │  • PDF generate │             │
│  │  • Meta sync    │  │  • Aggregations │  │  • Email send   │             │
│  │  • TikTok sync  │  │  • ML pipeline  │  │  • Snapshot     │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
│                    Triggered by Cloud Scheduler + Cloud Tasks                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Structure

### Directory Layout

```
/backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Settings & environment
│   ├── dependencies.py            # Dependency injection
│   │
│   ├── api/                       # API Layer (Routers)
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py          # Main v1 router
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── organizations.py
│   │   │   ├── billing.py
│   │   │   ├── accounts.py
│   │   │   ├── campaigns.py
│   │   │   ├── metrics.py
│   │   │   ├── ai.py
│   │   │   ├── reports.py
│   │   │   ├── alerts.py
│   │   │   ├── agency.py
│   │   │   ├── competitors.py
│   │   │   └── webhooks.py
│   │   │
│   │   └── websocket/
│   │       ├── __init__.py
│   │       ├── manager.py         # WebSocket connection manager
│   │       └── handlers.py        # Message handlers
│   │
│   ├── core/                      # Core utilities
│   │   ├── __init__.py
│   │   ├── security.py            # JWT, password hashing
│   │   ├── permissions.py         # RBAC/permission checks
│   │   ├── rate_limit.py          # Rate limiting
│   │   ├── exceptions.py          # Custom exceptions
│   │   ├── logging.py             # Structured logging
│   │   └── money.py               # Money/micros handling
│   │
│   ├── models/                    # Pydantic models (request/response)
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── organization.py
│   │   ├── billing.py
│   │   ├── account.py
│   │   ├── campaign.py
│   │   ├── metrics.py
│   │   ├── ai.py
│   │   └── common.py              # Shared models (pagination, etc.)
│   │
│   ├── schemas/                   # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── base.py                # Base model class
│   │   ├── user.py
│   │   ├── organization.py
│   │   ├── billing.py
│   │   ├── account.py
│   │   ├── campaign.py
│   │   ├── metrics.py
│   │   ├── ai.py
│   │   └── audit.py
│   │
│   ├── repositories/              # Data access layer
│   │   ├── __init__.py
│   │   ├── base.py                # Base repository
│   │   ├── user_repo.py
│   │   ├── organization_repo.py
│   │   ├── campaign_repo.py
│   │   ├── metrics_repo.py
│   │   └── ai_repo.py
│   │
│   ├── services/                  # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── organization_service.py
│   │   ├── billing_service.py
│   │   ├── account_service.py
│   │   ├── campaign_service.py
│   │   ├── metrics_service.py
│   │   ├── ai_service.py
│   │   ├── report_service.py
│   │   ├── sync_service.py
│   │   └── notification_service.py
│   │
│   ├── integrations/              # External API clients
│   │   ├── __init__.py
│   │   ├── google_ads/
│   │   │   ├── __init__.py
│   │   │   ├── client.py          # Google Ads API client
│   │   │   ├── auth.py            # OAuth handling
│   │   │   ├── campaigns.py       # Campaign operations
│   │   │   ├── keywords.py        # Keyword operations
│   │   │   ├── metrics.py         # Metrics fetching
│   │   │   └── models.py          # Google Ads models
│   │   │
│   │   ├── meta/
│   │   │   ├── __init__.py
│   │   │   ├── client.py
│   │   │   ├── auth.py
│   │   │   └── campaigns.py
│   │   │
│   │   ├── stripe/
│   │   │   ├── __init__.py
│   │   │   ├── client.py
│   │   │   ├── subscriptions.py
│   │   │   └── webhooks.py
│   │   │
│   │   ├── gemini/
│   │   │   ├── __init__.py
│   │   │   ├── client.py
│   │   │   ├── prompts.py
│   │   │   └── chat.py
│   │   │
│   │   ├── bigquery/
│   │   │   ├── __init__.py
│   │   │   ├── client.py
│   │   │   └── queries.py
│   │   │
│   │   └── vertex_ai/
│   │       ├── __init__.py
│   │       ├── client.py
│   │       └── predictions.py
│   │
│   ├── workers/                   # Background job handlers
│   │   ├── __init__.py
│   │   ├── sync_worker.py         # Ad platform sync
│   │   ├── metrics_worker.py      # Metrics ETL
│   │   ├── report_worker.py       # Report generation
│   │   ├── ai_worker.py           # AI recommendations
│   │   ├── notification_worker.py # Send notifications
│   │   └── cleanup_worker.py      # Data cleanup
│   │
│   ├── tasks/                     # Cloud Tasks handlers
│   │   ├── __init__.py
│   │   ├── router.py              # Task endpoints
│   │   └── handlers.py            # Task processors
│   │
│   ├── middleware/                # FastAPI middleware
│   │   ├── __init__.py
│   │   ├── logging.py             # Request logging
│   │   ├── error_handler.py       # Global error handling
│   │   └── timing.py              # Request timing
│   │
│   └── db/                        # Database utilities
│       ├── __init__.py
│       ├── session.py             # DB session management
│       ├── migrations/            # Alembic migrations
│       └── seeds/                 # Seed data
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py                # pytest fixtures
│   ├── unit/
│   │   ├── test_services/
│   │   ├── test_repositories/
│   │   └── test_core/
│   ├── integration/
│   │   ├── test_api/
│   │   └── test_integrations/
│   └── e2e/
│       └── test_flows.py
│
├── alembic/                       # Database migrations
│   ├── versions/
│   └── env.py
│
├── scripts/
│   ├── seed_db.py                 # Seed database
│   ├── create_admin.py            # Create admin user
│   └── run_worker.py              # Run background worker
│
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml
└── alembic.ini
```

---

## Core Components

### 1. Configuration Management

```python
# app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    APP_NAME: str = "AdsMaster API"
    APP_ENV: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str

    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # Redis
    REDIS_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Google Ads
    GOOGLE_ADS_CLIENT_ID: str
    GOOGLE_ADS_CLIENT_SECRET: str
    GOOGLE_ADS_DEVELOPER_TOKEN: str
    GOOGLE_ADS_REDIRECT_URI: str

    # Meta
    META_APP_ID: str
    META_APP_SECRET: str
    META_REDIRECT_URI: str

    # Stripe
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str

    # Gemini
    GEMINI_API_KEY: str

    # GCP
    GCP_PROJECT_ID: str
    GCP_LOCATION: str = "us-central1"
    BIGQUERY_DATASET: str = "adsmaster_analytics"

    # Cloud Tasks
    CLOUD_TASKS_QUEUE: str = "adsmaster-tasks"
    CLOUD_TASKS_LOCATION: str = "us-central1"

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

### 2. Database Session Management

```python
# app/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from contextlib import asynccontextmanager

from app.config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,  # Check connection health
    echo=settings.DEBUG,
)

# Session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

@asynccontextmanager
async def get_db_session():
    """Get database session with automatic cleanup."""
    session = AsyncSessionLocal()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()

# FastAPI dependency
async def get_db() -> AsyncSession:
    async with get_db_session() as session:
        yield session
```

### 3. Base Repository Pattern

```python
# app/repositories/base.py
from typing import TypeVar, Generic, List, Optional, Type
from uuid import UUID
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.schemas.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get(self, id: UUID) -> Optional[ModelType]:
        result = await self.db.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_by_ids(self, ids: List[UUID]) -> List[ModelType]:
        result = await self.db.execute(
            select(self.model).where(self.model.id.in_(ids))
        )
        return result.scalars().all()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        **filters
    ) -> List[ModelType]:
        query = select(self.model)

        for key, value in filters.items():
            if hasattr(self.model, key) and value is not None:
                query = query.where(getattr(self.model, key) == value)

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, data: CreateSchemaType) -> ModelType:
        db_obj = self.model(**data.model_dump())
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def update(
        self,
        id: UUID,
        data: UpdateSchemaType
    ) -> Optional[ModelType]:
        update_data = data.model_dump(exclude_unset=True)
        await self.db.execute(
            update(self.model)
            .where(self.model.id == id)
            .values(**update_data)
        )
        return await self.get(id)

    async def delete(self, id: UUID) -> bool:
        result = await self.db.execute(
            delete(self.model).where(self.model.id == id)
        )
        return result.rowcount > 0

    async def exists(self, id: UUID) -> bool:
        result = await self.db.execute(
            select(self.model.id).where(self.model.id == id)
        )
        return result.scalar_one_or_none() is not None
```

### 4. Service Layer Pattern

```python
# app/services/campaign_service.py
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from app.repositories.campaign_repo import CampaignRepository
from app.repositories.metrics_repo import MetricsRepository
from app.integrations.google_ads.client import GoogleAdsClient
from app.models.campaign import (
    CampaignResponse,
    CampaignUpdate,
    CampaignWithMetrics
)
from app.core.exceptions import (
    NotFoundError,
    PermissionDeniedError,
    GoogleAdsError
)
from app.core.logging import logger
from app.services.audit_service import AuditService

class CampaignService:
    def __init__(
        self,
        campaign_repo: CampaignRepository,
        metrics_repo: MetricsRepository,
        google_ads: GoogleAdsClient,
        audit_service: AuditService
    ):
        self.campaign_repo = campaign_repo
        self.metrics_repo = metrics_repo
        self.google_ads = google_ads
        self.audit = audit_service

    async def get_campaign(
        self,
        campaign_id: UUID,
        user_id: UUID,
        include_metrics: bool = True
    ) -> CampaignWithMetrics:
        """Get campaign with optional metrics."""
        campaign = await self.campaign_repo.get(campaign_id)
        if not campaign:
            raise NotFoundError("Campaign not found")

        # Permission check done at API layer

        if include_metrics:
            metrics = await self.metrics_repo.get_campaign_metrics(
                campaign_id,
                date_from=datetime.utcnow() - timedelta(days=30),
                date_to=datetime.utcnow()
            )
            return CampaignWithMetrics(
                **campaign.__dict__,
                metrics_30d=metrics
            )

        return CampaignResponse.model_validate(campaign)

    async def list_campaigns(
        self,
        account_id: UUID,
        status: Optional[List[str]] = None,
        campaign_type: Optional[List[str]] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> tuple[List[CampaignWithMetrics], int]:
        """List campaigns with filters and metrics."""
        campaigns, total = await self.campaign_repo.list_with_filters(
            account_id=account_id,
            status=status,
            campaign_type=campaign_type,
            search=search,
            offset=(page - 1) * per_page,
            limit=per_page
        )

        # Fetch metrics for all campaigns
        campaign_ids = [c.id for c in campaigns]
        metrics_map = await self.metrics_repo.get_bulk_campaign_metrics(
            campaign_ids,
            date_from=datetime.utcnow() - timedelta(days=30)
        )

        # Combine campaigns with metrics
        results = []
        for campaign in campaigns:
            metrics = metrics_map.get(campaign.id, {})
            results.append(CampaignWithMetrics(
                **campaign.__dict__,
                metrics_30d=metrics
            ))

        return results, total

    async def update_campaign(
        self,
        campaign_id: UUID,
        data: CampaignUpdate,
        user_id: UUID
    ) -> CampaignResponse:
        """Update campaign in DB and sync to platform."""
        campaign = await self.campaign_repo.get(campaign_id)
        if not campaign:
            raise NotFoundError("Campaign not found")

        # Store old values for audit
        old_values = {
            "budget_amount": campaign.budget_amount,
            "status": campaign.status
        }

        # Update in database
        updated = await self.campaign_repo.update(campaign_id, data)

        # Sync to Google Ads
        try:
            await self.google_ads.update_campaign(
                customer_id=campaign.ad_account.platform_account_id,
                campaign_id=campaign.platform_campaign_id,
                budget=data.budget.amount if data.budget else None,
                status=data.status
            )
        except Exception as e:
            logger.error(f"Failed to sync campaign to Google Ads: {e}")
            # Rollback database change
            await self.campaign_repo.update(campaign_id, old_values)
            raise GoogleAdsError(f"Failed to update campaign: {e}")

        # Log audit trail
        for field, old_value in old_values.items():
            new_value = getattr(updated, field)
            if old_value != new_value:
                await self.audit.log_change(
                    entity_type="campaign",
                    entity_id=campaign_id,
                    field_changed=field,
                    old_value=str(old_value),
                    new_value=str(new_value),
                    user_id=user_id,
                    source="user_manual"
                )

        return CampaignResponse.model_validate(updated)

    async def pause_campaign(
        self,
        campaign_id: UUID,
        user_id: UUID
    ) -> CampaignResponse:
        """Pause a campaign."""
        return await self.update_campaign(
            campaign_id,
            CampaignUpdate(status="paused"),
            user_id
        )

    async def enable_campaign(
        self,
        campaign_id: UUID,
        user_id: UUID
    ) -> CampaignResponse:
        """Enable a paused campaign."""
        return await self.update_campaign(
            campaign_id,
            CampaignUpdate(status="enabled"),
            user_id
        )
```

---

## External Integrations

### 1. Google Ads API v23 Client

```python
# app/integrations/google_ads/client.py
from typing import List, Dict, Any, Optional
from google.ads.googleads.client import GoogleAdsClient as GAClient
from google.ads.googleads.errors import GoogleAdsException

from app.config import settings
from app.core.logging import logger
from app.core.exceptions import GoogleAdsError
from app.integrations.google_ads.auth import GoogleAdsAuth
from app.integrations.google_ads.models import (
    CampaignData,
    KeywordData,
    MetricsData
)

class GoogleAdsClient:
    """Google Ads API v23 client wrapper."""

    API_VERSION = "v23"

    def __init__(self, credentials: dict):
        self.credentials = credentials
        self._client: Optional[GAClient] = None

    @classmethod
    async def for_account(cls, ad_account_id: str) -> "GoogleAdsClient":
        """Create client for a specific ad account."""
        credentials = await GoogleAdsAuth.get_credentials(ad_account_id)
        return cls(credentials)

    @property
    def client(self) -> GAClient:
        if self._client is None:
            self._client = GAClient.load_from_dict({
                "developer_token": settings.GOOGLE_ADS_DEVELOPER_TOKEN,
                "client_id": settings.GOOGLE_ADS_CLIENT_ID,
                "client_secret": settings.GOOGLE_ADS_CLIENT_SECRET,
                "refresh_token": self.credentials["refresh_token"],
                "use_proto_plus": True,
            })
        return self._client

    async def get_campaigns(
        self,
        customer_id: str,
        include_metrics: bool = False
    ) -> List[CampaignData]:
        """Fetch all campaigns for a customer."""
        ga_service = self.client.get_service("GoogleAdsService")

        query = """
            SELECT
                campaign.id,
                campaign.name,
                campaign.status,
                campaign.advertising_channel_type,
                campaign.bidding_strategy_type,
                campaign.campaign_budget,
                campaign.target_cpa.target_cpa_micros,
                campaign.target_roas.target_roas
        """

        if include_metrics:
            query += """,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value
            """

        query += f"""
            FROM campaign
            WHERE campaign.status != 'REMOVED'
        """

        try:
            response = ga_service.search(
                customer_id=customer_id.replace("-", ""),
                query=query
            )

            campaigns = []
            for row in response:
                campaign_data = CampaignData(
                    platform_campaign_id=str(row.campaign.id),
                    name=row.campaign.name,
                    status=row.campaign.status.name.lower(),
                    campaign_type=row.campaign.advertising_channel_type.name.lower(),
                    bidding_strategy=row.campaign.bidding_strategy_type.name.lower(),
                    # ... more fields
                )

                if include_metrics:
                    campaign_data.metrics = MetricsData(
                        impressions=row.metrics.impressions,
                        clicks=row.metrics.clicks,
                        cost_micros=row.metrics.cost_micros,
                        conversions=row.metrics.conversions,
                        conversion_value=row.metrics.conversions_value
                    )

                campaigns.append(campaign_data)

            return campaigns

        except GoogleAdsException as e:
            logger.error(f"Google Ads API error: {e}")
            raise GoogleAdsError(str(e))

    async def get_pmax_channel_breakdown(
        self,
        customer_id: str,
        campaign_id: str,
        date_from: str,
        date_to: str
    ) -> List[Dict[str, Any]]:
        """
        Get Performance Max channel breakdown (v23 feature).

        Returns metrics by channel: Search, YouTube, Display, Gmail, Discover, Maps
        """
        ga_service = self.client.get_service("GoogleAdsService")

        # v23 query for PMax asset group performance by network
        query = f"""
            SELECT
                segments.date,
                asset_group.id,
                asset_group.name,
                asset_group_performance_max_network_breakdown.network,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value
            FROM asset_group_performance_max_network_breakdown
            WHERE campaign.id = {campaign_id}
                AND segments.date BETWEEN '{date_from}' AND '{date_to}'
        """

        try:
            response = ga_service.search(
                customer_id=customer_id.replace("-", ""),
                query=query
            )

            # Aggregate by network/channel
            channel_data = {}
            for row in response:
                network = row.asset_group_performance_max_network_breakdown.network.name
                channel = self._map_network_to_channel(network)

                if channel not in channel_data:
                    channel_data[channel] = {
                        "channel": channel,
                        "impressions": 0,
                        "clicks": 0,
                        "cost_micros": 0,
                        "conversions": 0,
                        "conversion_value": 0
                    }

                channel_data[channel]["impressions"] += row.metrics.impressions
                channel_data[channel]["clicks"] += row.metrics.clicks
                channel_data[channel]["cost_micros"] += row.metrics.cost_micros
                channel_data[channel]["conversions"] += row.metrics.conversions
                channel_data[channel]["conversion_value"] += row.metrics.conversions_value

            return list(channel_data.values())

        except GoogleAdsException as e:
            logger.error(f"Google Ads API error: {e}")
            raise GoogleAdsError(str(e))

    def _map_network_to_channel(self, network: str) -> str:
        """Map Google Ads network to user-friendly channel name."""
        mapping = {
            "SEARCH": "search",
            "YOUTUBE": "youtube",
            "DISPLAY": "display",
            "GMAIL": "gmail",
            "DISCOVER": "discover",
            "MAPS": "maps"
        }
        return mapping.get(network, "other")

    async def update_campaign_budget(
        self,
        customer_id: str,
        campaign_id: str,
        budget_micros: int
    ) -> bool:
        """Update campaign budget."""
        campaign_service = self.client.get_service("CampaignBudgetService")
        operation = self.client.get_type("CampaignBudgetOperation")

        # Create budget update
        budget_resource = f"customers/{customer_id}/campaignBudgets/{campaign_id}"
        operation.update.resource_name = budget_resource
        operation.update.amount_micros = budget_micros
        operation.update_mask.paths.append("amount_micros")

        try:
            response = campaign_service.mutate_campaign_budgets(
                customer_id=customer_id.replace("-", ""),
                operations=[operation]
            )
            return True
        except GoogleAdsException as e:
            logger.error(f"Failed to update budget: {e}")
            raise GoogleAdsError(str(e))

    async def pause_keyword(
        self,
        customer_id: str,
        keyword_id: str
    ) -> bool:
        """Pause a keyword."""
        criterion_service = self.client.get_service("AdGroupCriterionService")
        operation = self.client.get_type("AdGroupCriterionOperation")

        operation.update.status = self.client.enums.AdGroupCriterionStatusEnum.PAUSED
        operation.update_mask.paths.append("status")

        try:
            criterion_service.mutate_ad_group_criteria(
                customer_id=customer_id.replace("-", ""),
                operations=[operation]
            )
            return True
        except GoogleAdsException as e:
            logger.error(f"Failed to pause keyword: {e}")
            raise GoogleAdsError(str(e))

    async def add_negative_keyword(
        self,
        customer_id: str,
        campaign_id: str,
        keyword_text: str,
        match_type: str = "EXACT"
    ) -> bool:
        """Add negative keyword to campaign."""
        criterion_service = self.client.get_service("CampaignCriterionService")
        operation = self.client.get_type("CampaignCriterionOperation")

        criterion = operation.create
        criterion.campaign = f"customers/{customer_id}/campaigns/{campaign_id}"
        criterion.negative = True
        criterion.keyword.text = keyword_text
        criterion.keyword.match_type = getattr(
            self.client.enums.KeywordMatchTypeEnum, match_type
        )

        try:
            criterion_service.mutate_campaign_criteria(
                customer_id=customer_id.replace("-", ""),
                operations=[operation]
            )
            return True
        except GoogleAdsException as e:
            logger.error(f"Failed to add negative keyword: {e}")
            raise GoogleAdsError(str(e))
```

### 2. Gemini AI Client

```python
# app/integrations/gemini/client.py
import google.generativeai as genai
from typing import List, Dict, Any, AsyncIterator

from app.config import settings
from app.core.logging import logger
from app.integrations.gemini.prompts import SYSTEM_PROMPTS

class GeminiClient:
    """Gemini API client for AI features."""

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.flash_model = genai.GenerativeModel('gemini-2.5-flash')
        self.pro_model = genai.GenerativeModel('gemini-2.5-pro')

    async def chat(
        self,
        message: str,
        context: Dict[str, Any],
        conversation_history: List[Dict[str, str]],
        use_pro: bool = False
    ) -> str:
        """
        Send a chat message with context.

        Args:
            message: User's message
            context: Account/campaign data to include
            conversation_history: Previous messages
            use_pro: Use Pro model for complex queries

        Returns:
            AI response text
        """
        model = self.pro_model if use_pro else self.flash_model

        # Build prompt with context
        system_prompt = SYSTEM_PROMPTS["advisor"]
        context_str = self._format_context(context)

        # Build conversation
        chat = model.start_chat(history=[
            {"role": "user", "parts": [system_prompt]},
            {"role": "model", "parts": ["Understood. I'm ready to help analyze your advertising data."]},
            *[{"role": msg["role"], "parts": [msg["content"]]} for msg in conversation_history]
        ])

        # Send message with context
        full_message = f"""
        Current Data Context:
        {context_str}

        User Question: {message}
        """

        try:
            response = chat.send_message(full_message)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise

    async def stream_chat(
        self,
        message: str,
        context: Dict[str, Any],
        conversation_history: List[Dict[str, str]]
    ) -> AsyncIterator[str]:
        """Stream chat response token by token."""
        model = self.flash_model

        # ... similar setup ...

        response = model.generate_content(
            full_message,
            stream=True
        )

        for chunk in response:
            if chunk.text:
                yield chunk.text

    async def explain_metric(
        self,
        metric_name: str,
        metric_value: Any,
        context: Dict[str, Any]
    ) -> str:
        """Generate plain English explanation of a metric."""
        prompt = f"""
        Explain this advertising metric to a small business owner:

        Metric: {metric_name}
        Value: {metric_value}
        Context:
        - Account average: {context.get('account_avg')}
        - Previous period: {context.get('previous_value')}
        - Industry benchmark: {context.get('benchmark')}

        Explain:
        1. What this metric means
        2. Whether the current value is good or bad
        3. One specific action to improve it

        Keep it under 150 words. Use simple language.
        """

        response = await self.flash_model.generate_content(prompt)
        return response.text

    async def generate_ad_copy(
        self,
        product: str,
        keywords: List[str],
        existing_headlines: List[str],
        tone: str = "professional"
    ) -> Dict[str, List[str]]:
        """Generate ad headlines and descriptions."""
        prompt = f"""
        Generate Google Ads copy for:
        Product/Service: {product}
        Target Keywords: {', '.join(keywords)}
        Tone: {tone}
        Existing Headlines (for reference): {', '.join(existing_headlines)}

        Generate:
        - 5 new headlines (max 30 characters each)
        - 3 descriptions (max 90 characters each)

        Format as JSON:
        {{"headlines": [...], "descriptions": [...]}}
        """

        response = await self.flash_model.generate_content(prompt)
        # Parse JSON from response
        import json
        return json.loads(response.text)

    async def generate_recommendation(
        self,
        recommendation_type: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate AI recommendation with options."""
        prompt = SYSTEM_PROMPTS[f"recommendation_{recommendation_type}"].format(**data)

        response = await self.pro_model.generate_content(prompt)

        # Parse structured response
        return self._parse_recommendation(response.text)

    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format context data for prompt."""
        lines = []
        for key, value in context.items():
            if isinstance(value, dict):
                lines.append(f"{key}:")
                for k, v in value.items():
                    lines.append(f"  - {k}: {v}")
            else:
                lines.append(f"- {key}: {value}")
        return "\n".join(lines)
```

### 3. Stripe Billing Integration

```python
# app/integrations/stripe/client.py
import stripe
from typing import Optional, Dict, Any

from app.config import settings
from app.core.logging import logger

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeClient:
    """Stripe billing client."""

    async def create_customer(
        self,
        email: str,
        name: str,
        organization_id: str
    ) -> str:
        """Create Stripe customer."""
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={"organization_id": organization_id}
        )
        return customer.id

    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        payment_method_id: str
    ) -> Dict[str, Any]:
        """Create subscription."""
        # Attach payment method to customer
        stripe.PaymentMethod.attach(
            payment_method_id,
            customer=customer_id
        )

        # Set as default payment method
        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": payment_method_id}
        )

        # Create subscription
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            expand=["latest_invoice.payment_intent"]
        )

        return {
            "subscription_id": subscription.id,
            "status": subscription.status,
            "current_period_start": subscription.current_period_start,
            "current_period_end": subscription.current_period_end
        }

    async def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True
    ) -> bool:
        """Cancel subscription."""
        if at_period_end:
            stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
        else:
            stripe.Subscription.delete(subscription_id)
        return True

    async def create_portal_session(
        self,
        customer_id: str,
        return_url: str
    ) -> str:
        """Create customer portal session."""
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url
        )
        return session.url

    async def handle_webhook(
        self,
        payload: bytes,
        signature: str
    ) -> Dict[str, Any]:
        """Process Stripe webhook."""
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise ValueError("Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise ValueError("Invalid signature")

        return {
            "type": event.type,
            "data": event.data.object
        }
```

---

## Background Jobs

### 1. Cloud Tasks Integration

```python
# app/tasks/client.py
from google.cloud import tasks_v2
from google.protobuf import timestamp_pb2
import json
from datetime import datetime

from app.config import settings

class CloudTasksClient:
    """Google Cloud Tasks client."""

    def __init__(self):
        self.client = tasks_v2.CloudTasksClient()
        self.parent = self.client.queue_path(
            settings.GCP_PROJECT_ID,
            settings.CLOUD_TASKS_LOCATION,
            settings.CLOUD_TASKS_QUEUE
        )

    async def create_task(
        self,
        task_type: str,
        payload: dict,
        delay_seconds: int = 0,
        task_id: str = None
    ) -> str:
        """Create a Cloud Task."""
        task = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": f"{settings.API_URL}/api/v1/tasks/{task_type}",
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(payload).encode()
            }
        }

        if delay_seconds > 0:
            d = datetime.utcnow() + timedelta(seconds=delay_seconds)
            timestamp = timestamp_pb2.Timestamp()
            timestamp.FromDatetime(d)
            task["schedule_time"] = timestamp

        if task_id:
            task["name"] = f"{self.parent}/tasks/{task_id}"

        response = self.client.create_task(
            request={"parent": self.parent, "task": task}
        )
        return response.name

    async def enqueue_sync(
        self,
        ad_account_id: str,
        sync_type: str = "incremental"
    ):
        """Enqueue ad account sync task."""
        await self.create_task(
            task_type="sync",
            payload={
                "ad_account_id": ad_account_id,
                "sync_type": sync_type
            }
        )

    async def enqueue_report_generation(
        self,
        report_id: str,
        account_id: str,
        report_type: str
    ):
        """Enqueue report generation task."""
        await self.create_task(
            task_type="generate_report",
            payload={
                "report_id": report_id,
                "account_id": account_id,
                "report_type": report_type
            }
        )
```

### 2. Sync Worker

```python
# app/workers/sync_worker.py
from typing import Optional
from datetime import datetime, timedelta

from app.db.session import get_db_session
from app.repositories.account_repo import AccountRepository
from app.repositories.campaign_repo import CampaignRepository
from app.repositories.metrics_repo import MetricsRepository
from app.integrations.google_ads.client import GoogleAdsClient
from app.core.logging import logger

class SyncWorker:
    """Worker for syncing ad platform data."""

    async def sync_account(
        self,
        ad_account_id: str,
        sync_type: str = "incremental"
    ):
        """
        Sync ad account data from platform.

        sync_type: "full" or "incremental"
        """
        async with get_db_session() as db:
            account_repo = AccountRepository(db)
            campaign_repo = CampaignRepository(db)
            metrics_repo = MetricsRepository(db)

            # Get account
            account = await account_repo.get(ad_account_id)
            if not account:
                logger.error(f"Account not found: {ad_account_id}")
                return

            # Create sync log entry
            sync_log = await account_repo.create_sync_log(
                ad_account_id=ad_account_id,
                sync_type=sync_type,
                status="started"
            )

            try:
                # Get Google Ads client
                google_ads = await GoogleAdsClient.for_account(ad_account_id)

                # Sync campaigns
                campaigns = await google_ads.get_campaigns(
                    customer_id=account.platform_account_id,
                    include_metrics=True
                )

                records_synced = 0
                records_created = 0
                records_updated = 0

                for campaign_data in campaigns:
                    existing = await campaign_repo.get_by_platform_id(
                        account.id,
                        campaign_data.platform_campaign_id
                    )

                    if existing:
                        await campaign_repo.update_from_platform(
                            existing.id,
                            campaign_data
                        )
                        records_updated += 1
                    else:
                        await campaign_repo.create_from_platform(
                            account.id,
                            campaign_data
                        )
                        records_created += 1

                    records_synced += 1

                # Sync metrics if incremental
                if sync_type == "incremental":
                    await self._sync_metrics(
                        google_ads,
                        account,
                        metrics_repo,
                        days=2  # Last 2 days for incremental
                    )
                else:
                    await self._sync_metrics(
                        google_ads,
                        account,
                        metrics_repo,
                        days=30  # Last 30 days for full sync
                    )

                # Update sync log
                await account_repo.update_sync_log(
                    sync_log.id,
                    status="completed",
                    records_synced=records_synced,
                    records_created=records_created,
                    records_updated=records_updated
                )

                # Update account last_sync_at
                await account_repo.update(
                    ad_account_id,
                    {"last_sync_at": datetime.utcnow()}
                )

                logger.info(f"Sync completed for account {ad_account_id}")

            except Exception as e:
                logger.error(f"Sync failed for account {ad_account_id}: {e}")
                await account_repo.update_sync_log(
                    sync_log.id,
                    status="failed",
                    error_message=str(e)
                )
                raise

    async def _sync_metrics(
        self,
        google_ads: GoogleAdsClient,
        account,
        metrics_repo: MetricsRepository,
        days: int
    ):
        """Sync metrics for all campaigns."""
        date_from = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        date_to = datetime.utcnow().strftime("%Y-%m-%d")

        metrics = await google_ads.get_campaign_metrics(
            customer_id=account.platform_account_id,
            date_from=date_from,
            date_to=date_to
        )

        for metric_data in metrics:
            await metrics_repo.upsert_daily_metrics(metric_data)

    async def sync_search_terms(
        self,
        ad_account_id: str,
        days: int = 30
    ):
        """Sync search terms for all campaigns."""
        # ... similar pattern
        pass
```

### 3. Cloud Scheduler Jobs

```yaml
# Scheduled jobs configuration

jobs:
  # Hourly incremental sync for active accounts
  - name: hourly-sync
    schedule: "0 * * * *"  # Every hour
    target:
      uri: /api/v1/tasks/batch-sync
      method: POST
      body:
        sync_type: incremental
        account_filter: active

  # Daily full sync at 2am
  - name: daily-full-sync
    schedule: "0 2 * * *"  # 2am daily
    target:
      uri: /api/v1/tasks/batch-sync
      method: POST
      body:
        sync_type: full
        account_filter: all

  # Hourly search terms sync
  - name: hourly-search-terms
    schedule: "30 * * * *"  # Every hour at :30
    target:
      uri: /api/v1/tasks/sync-search-terms
      method: POST

  # 4-hourly ETL to BigQuery
  - name: etl-bigquery
    schedule: "0 */4 * * *"  # Every 4 hours
    target:
      uri: /api/v1/tasks/etl-bigquery
      method: POST

  # Daily AI recommendations generation
  - name: daily-recommendations
    schedule: "0 6 * * *"  # 6am daily
    target:
      uri: /api/v1/tasks/generate-recommendations
      method: POST

  # Weekly ML model retraining
  - name: weekly-ml-training
    schedule: "0 3 * * 0"  # Sunday 3am
    target:
      uri: /api/v1/tasks/train-models
      method: POST

  # Daily health score calculation
  - name: daily-health-scores
    schedule: "0 7 * * *"  # 7am daily
    target:
      uri: /api/v1/tasks/calculate-health-scores
      method: POST

  # Monthly snapshot
  - name: monthly-snapshot
    schedule: "0 0 1 * *"  # 1st of month
    target:
      uri: /api/v1/tasks/create-snapshots
      method: POST
```

---

## Error Handling & Logging

### 1. Custom Exceptions

```python
# app/core/exceptions.py
from fastapi import HTTPException
from typing import Optional, Dict, Any

class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, "not_found", 404)

class PermissionDeniedError(AppException):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, "forbidden", 403)

class ValidationError(AppException):
    def __init__(self, message: str, details: Dict[str, Any]):
        super().__init__(message, "validation_error", 400, details)

class GoogleAdsError(AppException):
    def __init__(self, message: str):
        super().__init__(message, "google_ads_error", 502)

class MetaAdsError(AppException):
    def __init__(self, message: str):
        super().__init__(message, "meta_ads_error", 502)

class StripeError(AppException):
    def __init__(self, message: str):
        super().__init__(message, "stripe_error", 502)

class PlanLimitError(AppException):
    def __init__(self, feature: str, limit: int):
        super().__init__(
            f"Plan limit reached for {feature}",
            "plan_limit_exceeded",
            403,
            {"feature": feature, "limit": limit}
        )

class RateLimitError(AppException):
    def __init__(self, retry_after: int):
        super().__init__(
            "Rate limit exceeded",
            "rate_limit_exceeded",
            429,
            {"retry_after": retry_after}
        )
```

### 2. Global Error Handler

```python
# app/middleware/error_handler.py
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import traceback
from uuid import uuid4

from app.core.exceptions import AppException
from app.core.logging import logger

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid4())
        request.state.request_id = request_id

        try:
            response = await call_next(request)
            return response

        except AppException as e:
            logger.warning(
                f"Application error",
                extra={
                    "request_id": request_id,
                    "error_code": e.error_code,
                    "message": e.message,
                    "path": request.url.path
                }
            )
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "error": e.error_code,
                    "message": e.message,
                    "details": e.details,
                    "request_id": request_id
                }
            )

        except Exception as e:
            logger.error(
                f"Unhandled error: {str(e)}",
                extra={
                    "request_id": request_id,
                    "path": request.url.path,
                    "traceback": traceback.format_exc()
                }
            )
            return JSONResponse(
                status_code=500,
                content={
                    "error": "internal_error",
                    "message": "An unexpected error occurred",
                    "request_id": request_id
                }
            )
```

### 3. Structured Logging

```python
# app/core/logging.py
import logging
import json
import sys
from datetime import datetime

class StructuredFormatter(logging.Formatter):
    """JSON structured log formatter for Cloud Logging."""

    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "severity": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        # Add extra fields
        if hasattr(record, '__dict__'):
            for key, value in record.__dict__.items():
                if key not in ['name', 'msg', 'args', 'created', 'filename',
                              'funcName', 'levelname', 'levelno', 'lineno',
                              'module', 'msecs', 'pathname', 'process',
                              'processName', 'relativeCreated', 'stack_info',
                              'exc_info', 'exc_text', 'thread', 'threadName',
                              'message']:
                    log_entry[key] = value

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)

def setup_logging():
    """Configure structured logging."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())

    logging.basicConfig(
        level=logging.INFO,
        handlers=[handler]
    )

    # Reduce noise from libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

logger = logging.getLogger("adsmaster")
```

---

## Testing Strategy

### 1. Test Configuration

```python
# tests/conftest.py
import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import get_db
from app.schemas.base import Base
from app.config import settings

# Test database URL
TEST_DATABASE_URL = settings.DATABASE_URL.replace(
    "/adsmaster",
    "/adsmaster_test"
)

# Create test engine
test_engine = create_async_engine(TEST_DATABASE_URL, echo=True)
TestSessionLocal = sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def setup_database():
    """Create test database tables."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session(setup_database):
    """Get test database session."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(db_session):
    """Get test HTTP client."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()

@pytest.fixture
async def authenticated_client(client, db_session):
    """Get authenticated test client."""
    from app.services.auth_service import AuthService
    from app.models.auth import RegisterRequest

    auth_service = AuthService(db_session)

    # Create test user
    user = await auth_service.register(RegisterRequest(
        email="test@example.com",
        password="testpassword123",
        name="Test User"
    ))

    # Get token
    tokens = await auth_service.login("test@example.com", "testpassword123")

    client.headers["Authorization"] = f"Bearer {tokens.access_token}"
    return client, user
```

### 2. Unit Test Example

```python
# tests/unit/test_services/test_campaign_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.services.campaign_service import CampaignService
from app.models.campaign import CampaignUpdate
from app.core.exceptions import NotFoundError, GoogleAdsError

@pytest.fixture
def mock_repos():
    return {
        "campaign_repo": AsyncMock(),
        "metrics_repo": AsyncMock(),
        "google_ads": AsyncMock(),
        "audit_service": AsyncMock()
    }

@pytest.fixture
def campaign_service(mock_repos):
    return CampaignService(**mock_repos)

class TestCampaignService:
    async def test_get_campaign_success(self, campaign_service, mock_repos):
        # Arrange
        campaign_id = uuid4()
        user_id = uuid4()
        mock_campaign = MagicMock(id=campaign_id, name="Test Campaign")
        mock_repos["campaign_repo"].get.return_value = mock_campaign
        mock_repos["metrics_repo"].get_campaign_metrics.return_value = {}

        # Act
        result = await campaign_service.get_campaign(campaign_id, user_id)

        # Assert
        assert result.id == campaign_id
        mock_repos["campaign_repo"].get.assert_called_once_with(campaign_id)

    async def test_get_campaign_not_found(self, campaign_service, mock_repos):
        # Arrange
        mock_repos["campaign_repo"].get.return_value = None

        # Act & Assert
        with pytest.raises(NotFoundError):
            await campaign_service.get_campaign(uuid4(), uuid4())

    async def test_update_campaign_syncs_to_google(
        self, campaign_service, mock_repos
    ):
        # Arrange
        campaign_id = uuid4()
        user_id = uuid4()
        mock_campaign = MagicMock(
            id=campaign_id,
            budget_amount=50_000_000,
            status="enabled",
            ad_account=MagicMock(platform_account_id="123-456-7890"),
            platform_campaign_id="12345"
        )
        mock_repos["campaign_repo"].get.return_value = mock_campaign
        mock_repos["campaign_repo"].update.return_value = mock_campaign

        update_data = CampaignUpdate(budget={"amount": 75.00, "type": "daily"})

        # Act
        result = await campaign_service.update_campaign(
            campaign_id, update_data, user_id
        )

        # Assert
        mock_repos["google_ads"].update_campaign.assert_called_once()
        mock_repos["audit_service"].log_change.assert_called()

    async def test_update_campaign_rollback_on_google_error(
        self, campaign_service, mock_repos
    ):
        # Arrange
        campaign_id = uuid4()
        mock_campaign = MagicMock(
            budget_amount=50_000_000,
            status="enabled"
        )
        mock_repos["campaign_repo"].get.return_value = mock_campaign
        mock_repos["google_ads"].update_campaign.side_effect = Exception("API Error")

        update_data = CampaignUpdate(status="paused")

        # Act & Assert
        with pytest.raises(GoogleAdsError):
            await campaign_service.update_campaign(
                campaign_id, update_data, uuid4()
            )

        # Verify rollback was attempted
        assert mock_repos["campaign_repo"].update.call_count == 2  # Update + Rollback
```

### 3. Integration Test Example

```python
# tests/integration/test_api/test_campaigns.py
import pytest
from httpx import AsyncClient

class TestCampaignsAPI:
    async def test_list_campaigns(self, authenticated_client):
        client, user = authenticated_client

        # Create test ad account and campaigns first
        # ...

        response = await client.get("/api/v1/campaigns", params={
            "account_id": "test-account-id"
        })

        assert response.status_code == 200
        data = response.json()
        assert "campaigns" in data
        assert "pagination" in data

    async def test_update_campaign_budget(self, authenticated_client):
        client, user = authenticated_client

        response = await client.patch(
            "/api/v1/campaigns/test-campaign-id",
            json={
                "budget": {
                    "amount": 100.00,
                    "type": "daily"
                }
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["budget"]["amount"] == 100.00

    async def test_pause_campaign(self, authenticated_client):
        client, user = authenticated_client

        response = await client.post(
            "/api/v1/campaigns/test-campaign-id/pause"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "paused"

    async def test_unauthorized_access(self, client):
        response = await client.get("/api/v1/campaigns")
        assert response.status_code == 401
```

---

## Deployment Configuration

### 1. Dockerfile

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### 2. Cloud Run Configuration

```yaml
# cloudbuild.yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/adsmaster-api:$COMMIT_SHA'
      - '.'

  # Push the container image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/adsmaster-api:$COMMIT_SHA'

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'adsmaster-api'
      - '--image'
      - 'gcr.io/$PROJECT_ID/adsmaster-api:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'APP_ENV=production'
      - '--set-secrets'
      - 'DATABASE_URL=database-url:latest,SECRET_KEY=secret-key:latest'
      - '--min-instances'
      - '1'
      - '--max-instances'
      - '10'
      - '--memory'
      - '1Gi'
      - '--cpu'
      - '1'
      - '--concurrency'
      - '80'

images:
  - 'gcr.io/$PROJECT_ID/adsmaster-api:$COMMIT_SHA'
```

### 3. Requirements

```txt
# requirements.txt
# Core
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
pydantic-settings==2.1.0

# Database
sqlalchemy==2.0.25
asyncpg==0.29.0
alembic==1.13.1

# Redis
redis==5.0.1

# Google Cloud
google-cloud-tasks==2.15.0
google-cloud-bigquery==3.14.1
google-cloud-storage==2.14.0
google-ads==23.0.0
google-generativeai==0.3.2

# Stripe
stripe==7.10.0

# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# HTTP
httpx==0.26.0

# Utils
python-multipart==0.0.6
python-dateutil==2.8.2
orjson==3.9.10

# Testing (dev)
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
httpx==0.26.0
```

---

## Summary

### Backend Components

| Component | Count | Technology |
|-----------|-------|------------|
| API Routers | 13 | FastAPI |
| Services | 11 | Python classes |
| Repositories | 8 | SQLAlchemy |
| Integrations | 6 | Google Ads, Meta, Stripe, Gemini, BigQuery, Vertex |
| Workers | 6 | Cloud Run Jobs |
| Scheduled Jobs | 8 | Cloud Scheduler |

### Key Patterns

1. **Modular Monolith** - Easy to develop, can split later
2. **Repository Pattern** - Abstracted data access
3. **Service Layer** - Business logic separation
4. **Dependency Injection** - Testable, flexible
5. **Async Throughout** - Non-blocking I/O
6. **Structured Logging** - Cloud Logging compatible

---

*Document Version: 1.0*
*Created: March 2026*
*Status: READY FOR REVIEW*
