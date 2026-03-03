# Phase 10: Testing Strategy

## Overview

Comprehensive testing strategy ensuring reliability, performance, and quality across the entire AdsMaster platform.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TESTING PYRAMID                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                           ▲ E2E Tests                                        │
│                          ╱ ╲  (Critical Flows)                               │
│                         ╱   ╲  10% of tests                                  │
│                        ╱─────╲                                               │
│                       ╱       ╲                                              │
│                      ╱Integration╲                                           │
│                     ╱   Tests    ╲  (API, DB, Services)                      │
│                    ╱    20% of   ╲  tests                                    │
│                   ╱───────────────╲                                          │
│                  ╱                 ╲                                         │
│                 ╱    Unit Tests     ╲  (Functions, Classes, Components)      │
│                ╱     70% of tests    ╲                                       │
│               ╱───────────────────────╲                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Testing Stack

### Backend (Python/FastAPI)
| Tool | Purpose |
|------|---------|
| **pytest** | Test framework |
| **pytest-asyncio** | Async test support |
| **pytest-cov** | Coverage reporting |
| **httpx** | Async HTTP client for API tests |
| **factory_boy** | Test data factories |
| **faker** | Fake data generation |
| **freezegun** | Time manipulation |
| **responses** | Mock HTTP requests |
| **pytest-mock** | Mocking utilities |

### Frontend (Next.js/React)
| Tool | Purpose |
|------|---------|
| **Vitest** | Unit/component testing |
| **React Testing Library** | Component testing |
| **MSW** | API mocking |
| **Playwright** | E2E testing |
| **Storybook** | Component documentation/visual testing |
| **Chromatic** | Visual regression testing |

### Infrastructure
| Tool | Purpose |
|------|---------|
| **k6** | Load testing |
| **OWASP ZAP** | Security scanning |
| **Trivy** | Container vulnerability scanning |
| **pytest-benchmark** | Performance benchmarks |

---

## 1. Unit Testing

### 1.1 Backend Unit Tests

**Directory Structure:**
```
backend/
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── test_recommendation_service.py
│   │   │   ├── test_metrics_service.py
│   │   │   ├── test_automation_service.py
│   │   │   └── test_billing_service.py
│   │   ├── repositories/
│   │   │   ├── test_campaign_repository.py
│   │   │   └── test_user_repository.py
│   │   ├── utils/
│   │   │   ├── test_money_utils.py
│   │   │   └── test_date_utils.py
│   │   └── domain/
│   │       ├── test_recommendation_rules.py
│   │       └── test_health_score_calculator.py
│   ├── conftest.py
│   └── factories/
│       ├── user_factory.py
│       ├── campaign_factory.py
│       └── metrics_factory.py
```

**Example: Recommendation Service Test**
```python
# tests/unit/services/test_recommendation_service.py
import pytest
from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock

from app.services.recommendation_service import RecommendationService
from app.domain.recommendation_rules import WasteDetectionRule
from tests.factories import CampaignFactory, KeywordMetricsFactory


class TestRecommendationService:
    """Unit tests for RecommendationService."""

    @pytest.fixture
    def mock_repository(self):
        return AsyncMock()

    @pytest.fixture
    def mock_metrics_service(self):
        return AsyncMock()

    @pytest.fixture
    def service(self, mock_repository, mock_metrics_service):
        return RecommendationService(
            repository=mock_repository,
            metrics_service=mock_metrics_service
        )

    @pytest.mark.asyncio
    async def test_detect_wasting_keywords_above_threshold(self, service, mock_metrics_service):
        """Should flag keywords spending over threshold with zero conversions."""
        # Arrange
        keyword_metrics = [
            KeywordMetricsFactory.build(
                keyword_id="kw_1",
                cost_micros=75_000_000,  # $75
                conversions=0,
                clicks=150,
                impressions=10000
            ),
            KeywordMetricsFactory.build(
                keyword_id="kw_2",
                cost_micros=30_000_000,  # $30
                conversions=0,
                clicks=60,
                impressions=5000
            ),
            KeywordMetricsFactory.build(
                keyword_id="kw_3",
                cost_micros=100_000_000,  # $100
                conversions=5,  # Has conversions
                clicks=200,
                impressions=15000
            )
        ]
        mock_metrics_service.get_keyword_metrics.return_value = keyword_metrics

        # Act
        recommendations = await service.detect_wasting_keywords(
            ad_account_id="acc_123",
            spend_threshold_cents=5000,  # $50
            lookback_days=30
        )

        # Assert
        assert len(recommendations) == 1
        assert recommendations[0].keyword_id == "kw_1"
        assert recommendations[0].recommendation_type == "pause_keyword"
        assert recommendations[0].severity == "warning"

    @pytest.mark.asyncio
    async def test_no_recommendations_when_all_converting(self, service, mock_metrics_service):
        """Should return empty list when all keywords are converting."""
        # Arrange
        keyword_metrics = [
            KeywordMetricsFactory.build(
                keyword_id="kw_1",
                cost_micros=75_000_000,
                conversions=3,
                clicks=150,
                impressions=10000
            )
        ]
        mock_metrics_service.get_keyword_metrics.return_value = keyword_metrics

        # Act
        recommendations = await service.detect_wasting_keywords(
            ad_account_id="acc_123",
            spend_threshold_cents=5000,
            lookback_days=30
        )

        # Assert
        assert len(recommendations) == 0


class TestWasteDetectionRule:
    """Unit tests for waste detection business rules."""

    def test_rule_triggers_above_threshold(self):
        """Rule should trigger when spend > threshold and conversions = 0."""
        rule = WasteDetectionRule(spend_threshold_cents=5000)

        result = rule.evaluate(
            spend_cents=7500,
            conversions=0,
            days=30
        )

        assert result.triggered is True
        assert result.severity == "warning"

    def test_rule_escalates_to_critical_above_double_threshold(self):
        """Rule should be critical when spend > 2x threshold."""
        rule = WasteDetectionRule(spend_threshold_cents=5000)

        result = rule.evaluate(
            spend_cents=15000,  # 3x threshold
            conversions=0,
            days=30
        )

        assert result.triggered is True
        assert result.severity == "critical"

    @pytest.mark.parametrize("spend_cents,conversions,expected", [
        (3000, 0, False),   # Below threshold
        (7500, 1, False),   # Has conversions
        (7500, 0, True),    # Above threshold, no conversions
        (0, 0, False),      # No spend
    ])
    def test_rule_various_scenarios(self, spend_cents, conversions, expected):
        """Parametrized test for various waste scenarios."""
        rule = WasteDetectionRule(spend_threshold_cents=5000)

        result = rule.evaluate(
            spend_cents=spend_cents,
            conversions=conversions,
            days=30
        )

        assert result.triggered is expected
```

**Example: Money Utilities Test**
```python
# tests/unit/utils/test_money_utils.py
import pytest
from decimal import Decimal

from app.utils.money import (
    micros_to_dollars,
    dollars_to_micros,
    calculate_cpa,
    calculate_roas,
    safe_division
)


class TestMicrosConversion:
    """Tests for micros <-> dollars conversion."""

    def test_micros_to_dollars_basic(self):
        assert micros_to_dollars(1_000_000) == Decimal("1.00")
        assert micros_to_dollars(1_500_000) == Decimal("1.50")
        assert micros_to_dollars(0) == Decimal("0.00")

    def test_dollars_to_micros_basic(self):
        assert dollars_to_micros(Decimal("1.00")) == 1_000_000
        assert dollars_to_micros(Decimal("99.99")) == 99_990_000

    def test_roundtrip_conversion_preserves_value(self):
        """Converting to micros and back should preserve value."""
        original = Decimal("123.45")
        micros = dollars_to_micros(original)
        result = micros_to_dollars(micros)
        assert result == original

    def test_micros_handles_large_values(self):
        """Should handle large ad spend values correctly."""
        # $1 million in micros
        large_micros = 1_000_000_000_000
        result = micros_to_dollars(large_micros)
        assert result == Decimal("1000000.00")


class TestMetricsCalculations:
    """Tests for CPA, ROAS, and other metric calculations."""

    def test_calculate_cpa_basic(self):
        result = calculate_cpa(
            cost_micros=50_000_000,  # $50
            conversions=5
        )
        assert result == Decimal("10.00")

    def test_calculate_cpa_zero_conversions_returns_none(self):
        """CPA should be None when no conversions (avoid division by zero)."""
        result = calculate_cpa(
            cost_micros=50_000_000,
            conversions=0
        )
        assert result is None

    def test_calculate_roas_basic(self):
        result = calculate_roas(
            cost_micros=100_000_000,  # $100
            conversion_value_micros=300_000_000  # $300
        )
        assert result == Decimal("3.00")

    def test_calculate_roas_zero_cost_returns_none(self):
        result = calculate_roas(
            cost_micros=0,
            conversion_value_micros=300_000_000
        )
        assert result is None

    @pytest.mark.parametrize("numerator,denominator,expected", [
        (100, 10, Decimal("10")),
        (100, 0, None),
        (0, 10, Decimal("0")),
        (0, 0, None),
    ])
    def test_safe_division(self, numerator, denominator, expected):
        result = safe_division(numerator, denominator)
        assert result == expected
```

### 1.2 Frontend Unit Tests

**Directory Structure:**
```
frontend/
├── __tests__/
│   ├── components/
│   │   ├── RecommendationCard.test.tsx
│   │   ├── MetricsChart.test.tsx
│   │   └── CampaignTable.test.tsx
│   ├── hooks/
│   │   ├── useRecommendations.test.ts
│   │   └── useMetrics.test.ts
│   ├── utils/
│   │   ├── formatters.test.ts
│   │   └── calculations.test.ts
│   └── stores/
│       └── uiStore.test.ts
├── vitest.config.ts
└── vitest.setup.ts
```

**Example: Component Test**
```typescript
// __tests__/components/RecommendationCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendationCard } from '@/components/recommendations/RecommendationCard';

const mockRecommendation = {
  id: 'rec_123',
  title: 'Pause Wasting Keyword',
  description: 'Keyword "cheap shoes" spent $75 with 0 conversions',
  severity: 'warning' as const,
  recommendation_type: 'pause_keyword',
  impact_estimate: {
    save_amount: 75.00,
    days_analyzed: 30
  },
  options: [
    { label: 'Pause keyword', action: 'pause' },
    { label: 'Reduce bid 50%', action: 'reduce_bid' },
    { label: 'Monitor 7 more days', action: 'monitor' }
  ],
  status: 'pending' as const
};

describe('RecommendationCard', () => {
  it('renders recommendation title and description', () => {
    render(<RecommendationCard recommendation={mockRecommendation} />);

    expect(screen.getByText('Pause Wasting Keyword')).toBeInTheDocument();
    expect(screen.getByText(/\$75 with 0 conversions/)).toBeInTheDocument();
  });

  it('displays severity badge correctly', () => {
    render(<RecommendationCard recommendation={mockRecommendation} />);

    const badge = screen.getByTestId('severity-badge');
    expect(badge).toHaveClass('bg-yellow-100'); // warning color
    expect(badge).toHaveTextContent('Warning');
  });

  it('renders all action options', () => {
    render(<RecommendationCard recommendation={mockRecommendation} />);

    expect(screen.getByRole('button', { name: /pause keyword/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reduce bid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /monitor/i })).toBeInTheDocument();
  });

  it('calls onApprove with selected option when clicked', async () => {
    const onApprove = vi.fn();
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        onApprove={onApprove}
      />
    );

    const pauseButton = screen.getByRole('button', { name: /pause keyword/i });
    fireEvent.click(pauseButton);

    expect(onApprove).toHaveBeenCalledWith('rec_123', 'pause');
  });

  it('shows loading state when action is pending', () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause keyword/i })).toBeDisabled();
  });

  it('displays impact estimate', () => {
    render(<RecommendationCard recommendation={mockRecommendation} />);

    expect(screen.getByText(/save.*\$75/i)).toBeInTheDocument();
  });
});
```

**Example: Hook Test**
```typescript
// __tests__/hooks/useRecommendations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecommendations, useApproveRecommendation } from '@/hooks/useRecommendations';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useRecommendations', () => {
  it('fetches recommendations for account', async () => {
    const { result } = renderHook(
      () => useRecommendations('acc_123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data[0].recommendation_type).toBe('pause_keyword');
  });

  it('handles empty recommendations', async () => {
    server.use(
      http.get('/api/v1/recommendations', () => {
        return HttpResponse.json({ recommendations: [], total: 0 });
      })
    );

    const { result } = renderHook(
      () => useRecommendations('acc_456'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(0);
  });

  it('handles API error gracefully', async () => {
    server.use(
      http.get('/api/v1/recommendations', () => {
        return HttpResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(
      () => useRecommendations('acc_123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe('useApproveRecommendation', () => {
  it('approves recommendation and invalidates cache', async () => {
    const { result } = renderHook(
      () => useApproveRecommendation(),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync({
      recommendationId: 'rec_123',
      selectedOption: 'pause'
    });

    expect(result.current.isSuccess).toBe(true);
  });
});
```

**Example: Utility Function Test**
```typescript
// __tests__/utils/formatters.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatDate,
  formatRelativeTime
} from '@/utils/formatters';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
    expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00');
  });

  it('formats EUR correctly', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-500, 'USD')).toBe('-$500.00');
  });

  it('uses compact notation for large numbers when specified', () => {
    expect(formatCurrency(1500000, 'USD', { compact: true })).toBe('$1.5M');
    expect(formatCurrency(2500, 'USD', { compact: true })).toBe('$2.5K');
  });
});

describe('formatPercentage', () => {
  it('formats percentage correctly', () => {
    expect(formatPercentage(0.1234)).toBe('12.34%');
    expect(formatPercentage(0.5)).toBe('50.00%');
    expect(formatPercentage(1)).toBe('100.00%');
  });

  it('handles decimal precision', () => {
    expect(formatPercentage(0.123456, 1)).toBe('12.3%');
    expect(formatPercentage(0.123456, 0)).toBe('12%');
  });

  it('handles edge cases', () => {
    expect(formatPercentage(0)).toBe('0.00%');
    expect(formatPercentage(null)).toBe('—');
    expect(formatPercentage(undefined)).toBe('—');
  });
});

describe('formatRelativeTime', () => {
  it('formats recent times correctly', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
  });

  it('formats older dates as absolute', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    expect(formatRelativeTime(thirtyDaysAgo)).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });
});
```

---

## 2. Integration Testing

### 2.1 API Integration Tests

```python
# tests/integration/test_recommendations_api.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from tests.factories import UserFactory, AdAccountFactory, CampaignFactory, KeywordFactory


@pytest.mark.integration
class TestRecommendationsAPI:
    """Integration tests for recommendations endpoints."""

    @pytest.fixture
    async def authenticated_client(self, db_session: AsyncSession):
        """Create authenticated test client with user and account."""
        user = await UserFactory.create(db_session)
        account = await AdAccountFactory.create(db_session, organization_id=user.organization_id)

        async with AsyncClient(app=app, base_url="http://test") as client:
            # Get auth token
            response = await client.post("/api/v1/auth/test-login", json={
                "user_id": str(user.id)
            })
            token = response.json()["access_token"]
            client.headers["Authorization"] = f"Bearer {token}"
            client.account_id = account.id
            yield client

    async def test_get_recommendations_returns_pending(self, authenticated_client, db_session):
        """GET /recommendations should return pending recommendations."""
        # Arrange: Create recommendations
        from tests.factories import RecommendationFactory
        recs = await RecommendationFactory.create_batch(
            db_session,
            ad_account_id=authenticated_client.account_id,
            status="pending",
            count=3
        )

        # Act
        response = await authenticated_client.get(
            f"/api/v1/ad-accounts/{authenticated_client.account_id}/recommendations"
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["recommendations"]) == 3
        assert all(r["status"] == "pending" for r in data["recommendations"])

    async def test_approve_recommendation_updates_status(self, authenticated_client, db_session):
        """POST /recommendations/{id}/approve should update status."""
        from tests.factories import RecommendationFactory
        rec = await RecommendationFactory.create(
            db_session,
            ad_account_id=authenticated_client.account_id,
            status="pending"
        )

        response = await authenticated_client.post(
            f"/api/v1/recommendations/{rec.id}/approve",
            json={"selected_option": 1}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"
        assert data["approved_option"] == 1

    async def test_recommendations_filtered_by_account(self, authenticated_client, db_session):
        """Should only return recommendations for the requested account."""
        from tests.factories import RecommendationFactory, AdAccountFactory

        # Create another account's recommendations
        other_account = await AdAccountFactory.create(db_session)
        await RecommendationFactory.create_batch(
            db_session,
            ad_account_id=other_account.id,
            count=5
        )

        # Create this account's recommendations
        await RecommendationFactory.create_batch(
            db_session,
            ad_account_id=authenticated_client.account_id,
            count=2
        )

        response = await authenticated_client.get(
            f"/api/v1/ad-accounts/{authenticated_client.account_id}/recommendations"
        )

        assert response.status_code == 200
        assert response.json()["total"] == 2  # Only own recommendations


@pytest.mark.integration
class TestMetricsAPI:
    """Integration tests for metrics endpoints."""

    async def test_get_campaign_metrics_aggregates_correctly(
        self, authenticated_client, db_session
    ):
        """GET /campaigns/{id}/metrics should aggregate daily metrics."""
        from tests.factories import CampaignFactory, CampaignMetricsFactory
        from datetime import date, timedelta

        campaign = await CampaignFactory.create(
            db_session,
            ad_account_id=authenticated_client.account_id
        )

        # Create 7 days of metrics
        for i in range(7):
            await CampaignMetricsFactory.create(
                db_session,
                campaign_id=campaign.id,
                date=date.today() - timedelta(days=i),
                impressions=1000,
                clicks=100,
                cost_micros=10_000_000  # $10
            )

        response = await authenticated_client.get(
            f"/api/v1/campaigns/{campaign.id}/metrics",
            params={"days": 7}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["impressions"] == 7000
        assert data["summary"]["clicks"] == 700
        assert data["summary"]["cost"] == 70.00  # $70 total
```

### 2.2 Database Integration Tests

```python
# tests/integration/test_repository.py
import pytest
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.campaign_repository import CampaignRepository
from app.repositories.metrics_repository import MetricsRepository
from tests.factories import CampaignFactory, CampaignMetricsFactory


@pytest.mark.integration
class TestCampaignRepository:
    """Integration tests for CampaignRepository."""

    @pytest.fixture
    def repository(self, db_session: AsyncSession):
        return CampaignRepository(db_session)

    async def test_find_by_account_returns_campaigns(self, repository, db_session):
        campaigns = await CampaignFactory.create_batch(
            db_session,
            ad_account_id="acc_123",
            count=5
        )

        result = await repository.find_by_account("acc_123")

        assert len(result) == 5

    async def test_find_active_excludes_removed(self, repository, db_session):
        await CampaignFactory.create(db_session, status="enabled")
        await CampaignFactory.create(db_session, status="paused")
        await CampaignFactory.create(db_session, status="removed")

        result = await repository.find_active("acc_123")

        assert len(result) == 2
        assert all(c.status != "removed" for c in result)


@pytest.mark.integration
class TestMetricsRepository:
    """Integration tests for MetricsRepository."""

    async def test_aggregate_by_date_range(self, repository, db_session):
        campaign = await CampaignFactory.create(db_session)

        for i in range(30):
            await CampaignMetricsFactory.create(
                db_session,
                campaign_id=campaign.id,
                date=date.today() - timedelta(days=i),
                cost_micros=1_000_000,  # $1/day
                conversions=1
            )

        result = await repository.aggregate(
            campaign_id=campaign.id,
            start_date=date.today() - timedelta(days=6),
            end_date=date.today()
        )

        assert result.total_cost_micros == 7_000_000  # $7
        assert result.total_conversions == 7
```

### 2.3 External Service Integration Tests

```python
# tests/integration/test_google_ads_client.py
import pytest
from unittest.mock import patch, MagicMock

from app.services.google_ads_client import GoogleAdsClient


@pytest.mark.integration
class TestGoogleAdsClient:
    """Integration tests for Google Ads API client."""

    @pytest.fixture
    def client(self):
        return GoogleAdsClient(
            developer_token="test_token",
            client_id="test_client_id",
            client_secret="test_client_secret"
        )

    @patch('app.services.google_ads_client.GoogleAdsService')
    async def test_fetch_campaigns_transforms_response(self, mock_service, client):
        """Should transform Google Ads API response to our model."""
        mock_service.return_value.search.return_value = [
            MagicMock(
                campaign=MagicMock(
                    id=123,
                    name="Test Campaign",
                    status=MagicMock(name="ENABLED"),
                    budget_amount_micros=50_000_000
                )
            )
        ]

        campaigns = await client.fetch_campaigns(
            customer_id="123-456-7890",
            refresh_token="test_refresh"
        )

        assert len(campaigns) == 1
        assert campaigns[0].platform_campaign_id == "123"
        assert campaigns[0].name == "Test Campaign"
        assert campaigns[0].status == "enabled"

    @patch('app.services.google_ads_client.GoogleAdsService')
    async def test_handles_api_rate_limit(self, mock_service, client):
        """Should handle rate limit errors gracefully."""
        from google.ads.googleads.errors import GoogleAdsException

        mock_service.return_value.search.side_effect = GoogleAdsException(
            error=MagicMock(message="RATE_LIMIT_EXCEEDED")
        )

        with pytest.raises(RateLimitError):
            await client.fetch_campaigns(
                customer_id="123-456-7890",
                refresh_token="test_refresh"
            )
```

---

## 3. End-to-End (E2E) Testing

### 3.1 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    process.env.CI ? ['github'] : ['list']
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },

    // Mobile
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3.2 Critical User Flows

```typescript
// e2e/flows/onboarding.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Onboarding Flow', () => {
  test('complete onboarding wizard', async ({ page }) => {
    // Step 1: Sign up
    await page.goto('/signup');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="signup-button"]');

    // Should redirect to onboarding
    await expect(page).toHaveURL('/onboarding');
    await expect(page.getByText('Welcome to AdsMaster')).toBeVisible();

    // Step 2: Organization info
    await page.fill('[data-testid="org-name"]', 'Test Company');
    await page.selectOption('[data-testid="org-type"]', 'business');
    await page.click('[data-testid="next-button"]');

    // Step 3: Connect Google Ads
    await expect(page.getByText('Connect Your Ad Account')).toBeVisible();

    // Mock OAuth flow (in test environment)
    await page.click('[data-testid="connect-google-ads"]');
    await page.waitForURL('/onboarding?step=3&connected=true');

    // Step 4: Select plan
    await page.click('[data-testid="plan-growth"]'); // $99/mo
    await page.click('[data-testid="next-button"]');

    // Step 5: Payment (test mode)
    await page.frameLocator('iframe[name="stripe-card"]')
      .locator('[placeholder="Card number"]')
      .fill('4242424242424242');
    await page.frameLocator('iframe[name="stripe-card"]')
      .locator('[placeholder="MM / YY"]')
      .fill('12/28');
    await page.frameLocator('iframe[name="stripe-card"]')
      .locator('[placeholder="CVC"]')
      .fill('123');
    await page.click('[data-testid="subscribe-button"]');

    // Step 6: Complete
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Your account is ready!')).toBeVisible();
  });
});
```

```typescript
// e2e/flows/recommendation-approval.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Recommendation Approval Flow', () => {
  test.use({ storageState: 'e2e/.auth/user.json' }); // Use authenticated state

  test('approve wasting keyword recommendation', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to recommendations
    await page.click('[data-testid="nav-recommendations"]');
    await expect(page).toHaveURL('/recommendations');

    // Find critical recommendation
    const recommendation = page.locator('[data-testid="recommendation-card"]')
      .filter({ hasText: 'Wasting Keyword Detected' })
      .first();

    await expect(recommendation).toBeVisible();

    // Check impact estimate
    await expect(recommendation.getByText(/Save \$\d+/)).toBeVisible();

    // Select "Pause keyword" option
    await recommendation.getByRole('button', { name: 'Pause keyword' }).click();

    // Confirm action
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('This will pause')).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirm' }).click();

    // Verify success
    await expect(page.getByText('Recommendation applied')).toBeVisible();
    await expect(recommendation).not.toBeVisible(); // Removed from list
  });

  test('reject recommendation with feedback', async ({ page }) => {
    await page.goto('/recommendations');

    const recommendation = page.locator('[data-testid="recommendation-card"]').first();
    await recommendation.getByRole('button', { name: 'Dismiss' }).click();

    // Provide feedback
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Reason').fill('This keyword is important for branding');
    await dialog.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('Feedback recorded')).toBeVisible();
  });
});
```

```typescript
// e2e/flows/ai-chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AI Chat Flow', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('ask AI about campaign performance', async ({ page }) => {
    await page.goto('/dashboard');

    // Open AI chat
    await page.click('[data-testid="ai-chat-button"]');

    const chatPanel = page.locator('[data-testid="ai-chat-panel"]');
    await expect(chatPanel).toBeVisible();

    // Send message
    await chatPanel.getByPlaceholder('Ask me anything...').fill(
      'Why is my Search campaign spending more this week?'
    );
    await chatPanel.getByRole('button', { name: 'Send' }).click();

    // Wait for AI response
    const response = chatPanel.locator('[data-testid="ai-message"]').last();
    await expect(response).toBeVisible({ timeout: 30000 });

    // Response should mention metrics
    await expect(response).toContainText(/spend|budget|impression|click/i);

    // Should show referenced data
    await expect(chatPanel.getByText('Data Referenced')).toBeVisible();
  });

  test('AI generates ad copy suggestions', async ({ page }) => {
    await page.goto('/campaigns/camp_123/ads');

    await page.click('[data-testid="generate-ad-copy"]');

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Product/Service').fill('Running shoes');
    await dialog.getByLabel('Key benefits').fill('Lightweight, cushioned, durable');
    await dialog.getByRole('button', { name: 'Generate' }).click();

    // Wait for suggestions
    await expect(dialog.locator('[data-testid="ad-suggestion"]')).toHaveCount(3, {
      timeout: 30000
    });

    // Select and apply
    await dialog.locator('[data-testid="ad-suggestion"]').first().click();
    await dialog.getByRole('button', { name: 'Apply' }).click();

    await expect(page.getByText('Ad copy applied')).toBeVisible();
  });
});
```

---

## 4. Performance Testing

### 4.1 k6 Load Tests

```javascript
// load-tests/scenarios/dashboard-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const dashboardDuration = new Trend('dashboard_duration');
const recommendationsDuration = new Trend('recommendations_duration');

export const options = {
  scenarios: {
    // Simulate normal load
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up
        { duration: '5m', target: 50 },   // Steady state
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
    },

    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '30s', target: 200 }, // Spike!
        { duration: '1m', target: 200 },
        { duration: '30s', target: 10 },
      ],
      startTime: '10m', // Run after normal load
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms
    errors: ['rate<0.01'], // Error rate < 1%
    dashboard_duration: ['p(95)<800'],
    recommendations_duration: ['p(95)<600'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export function setup() {
  // Get auth token
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'loadtest@example.com',
    password: 'LoadTest123!'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  return { token: loginRes.json('access_token') };
}

export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json'
  };

  // Simulate user flow

  // 1. Load dashboard
  let res = http.get(`${BASE_URL}/api/v1/dashboard/summary`, { headers });
  check(res, {
    'dashboard status 200': (r) => r.status === 200,
    'dashboard has data': (r) => r.json('campaigns') !== undefined,
  });
  dashboardDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  sleep(1);

  // 2. Load recommendations
  res = http.get(`${BASE_URL}/api/v1/ad-accounts/acc_123/recommendations`, { headers });
  check(res, {
    'recommendations status 200': (r) => r.status === 200,
  });
  recommendationsDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  sleep(2);

  // 3. Load campaign metrics
  res = http.get(`${BASE_URL}/api/v1/campaigns/camp_123/metrics?days=30`, { headers });
  check(res, {
    'metrics status 200': (r) => r.status === 200,
    'metrics has summary': (r) => r.json('summary') !== undefined,
  });
  errorRate.add(res.status !== 200);

  sleep(3);
}
```

### 4.2 API Benchmarks

```python
# tests/benchmarks/test_metrics_performance.py
import pytest
from datetime import date, timedelta

from app.repositories.metrics_repository import MetricsRepository


@pytest.mark.benchmark
class TestMetricsPerformance:
    """Performance benchmarks for metrics queries."""

    @pytest.fixture
    def large_dataset(self, db_session):
        """Create 1 year of daily metrics for 100 campaigns."""
        from tests.factories import CampaignFactory, CampaignMetricsFactory

        campaigns = CampaignFactory.create_batch(db_session, count=100)

        for campaign in campaigns:
            for i in range(365):
                CampaignMetricsFactory.create(
                    db_session,
                    campaign_id=campaign.id,
                    date=date.today() - timedelta(days=i)
                )

        return campaigns

    def test_aggregate_30_days_under_100ms(self, benchmark, repository, large_dataset):
        """30-day aggregation should complete under 100ms."""
        campaign = large_dataset[0]

        result = benchmark(
            repository.aggregate,
            campaign_id=campaign.id,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )

        assert benchmark.stats['mean'] < 0.1  # 100ms

    def test_health_score_calculation_under_500ms(self, benchmark, health_service, large_dataset):
        """Health score calculation should complete under 500ms."""
        account_id = large_dataset[0].ad_account_id

        result = benchmark(
            health_service.calculate_health_score,
            ad_account_id=account_id
        )

        assert benchmark.stats['mean'] < 0.5  # 500ms
```

---

## 5. Security Testing

### 5.1 OWASP ZAP Integration

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday
  workflow_dispatch:

jobs:
  zap-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Start application
        run: |
          docker-compose -f docker-compose.test.yml up -d
          sleep 30

      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.10.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          fail_action: 'warn'

      - name: ZAP Full Scan
        uses: zaproxy/action-full-scan@v0.8.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: zap-report
          path: report_html.html
```

### 5.2 Security Unit Tests

```python
# tests/security/test_auth_security.py
import pytest
from datetime import datetime, timedelta

from app.services.auth_service import AuthService
from app.utils.security import hash_password, verify_password, generate_token


class TestPasswordSecurity:
    """Security tests for password handling."""

    def test_password_is_hashed_with_bcrypt(self):
        """Password should be hashed with bcrypt, not stored plaintext."""
        password = "SecurePass123!"
        hashed = hash_password(password)

        assert hashed != password
        assert hashed.startswith("$2b$")  # bcrypt prefix
        assert len(hashed) == 60  # bcrypt hash length

    def test_different_passwords_produce_different_hashes(self):
        """Same password should produce different hashes (salted)."""
        password = "SecurePass123!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        assert hash1 != hash2  # Different salts

    def test_verify_correct_password(self):
        password = "SecurePass123!"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_verify_wrong_password(self):
        password = "SecurePass123!"
        hashed = hash_password(password)

        assert verify_password("WrongPassword", hashed) is False


class TestTokenSecurity:
    """Security tests for JWT tokens."""

    def test_token_expires(self):
        """Tokens should have expiration."""
        token = generate_token(user_id="user_123", expires_in=timedelta(minutes=15))
        payload = decode_token(token)

        assert "exp" in payload
        assert payload["exp"] > datetime.utcnow().timestamp()

    def test_expired_token_rejected(self):
        """Expired tokens should be rejected."""
        token = generate_token(user_id="user_123", expires_in=timedelta(seconds=-1))

        with pytest.raises(TokenExpiredError):
            decode_token(token)

    def test_tampered_token_rejected(self):
        """Tampered tokens should be rejected."""
        token = generate_token(user_id="user_123")
        tampered = token[:-10] + "XXXXXXXXXX"

        with pytest.raises(InvalidTokenError):
            decode_token(tampered)

    def test_token_contains_no_sensitive_data(self):
        """Token payload should not contain sensitive data."""
        token = generate_token(
            user_id="user_123",
            email="test@example.com"  # Should NOT be in token
        )
        payload = decode_token(token)

        assert "password" not in payload
        assert "email" not in str(payload).lower()


class TestInputValidation:
    """Security tests for input validation."""

    @pytest.mark.parametrize("malicious_input", [
        "'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        "{{constructor.constructor('return this')()}}",
        "../../../etc/passwd",
    ])
    def test_malicious_input_sanitized(self, malicious_input):
        """Malicious inputs should be sanitized."""
        from app.utils.validation import sanitize_input

        result = sanitize_input(malicious_input)

        assert "DROP TABLE" not in result
        assert "<script>" not in result
        assert "../" not in result
```

---

## 6. AI/ML Testing

### 6.1 Model Validation Tests

```python
# tests/ml/test_recommendation_model.py
import pytest
import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score

from app.ml.recommendation_model import RecommendationModel


@pytest.mark.ml
class TestRecommendationModel:
    """Tests for AI recommendation model quality."""

    @pytest.fixture
    def trained_model(self):
        return RecommendationModel.load("models/recommendation_v1")

    @pytest.fixture
    def test_dataset(self):
        """Load labeled test dataset."""
        return load_test_dataset("data/test/recommendations.csv")

    def test_model_precision_above_threshold(self, trained_model, test_dataset):
        """Model precision should be above 0.85."""
        X_test, y_test = test_dataset
        predictions = trained_model.predict(X_test)

        precision = precision_score(y_test, predictions, average='weighted')

        assert precision >= 0.85, f"Precision {precision} below threshold 0.85"

    def test_model_recall_above_threshold(self, trained_model, test_dataset):
        """Model recall should be above 0.80."""
        X_test, y_test = test_dataset
        predictions = trained_model.predict(X_test)

        recall = recall_score(y_test, predictions, average='weighted')

        assert recall >= 0.80, f"Recall {recall} below threshold 0.80"

    def test_no_false_positives_for_critical(self, trained_model, test_dataset):
        """Critical recommendations should have zero false positives."""
        X_test, y_test = test_dataset
        predictions = trained_model.predict(X_test)

        # Filter to critical predictions
        critical_mask = predictions == 'critical'
        critical_actual = y_test[critical_mask]

        false_positive_rate = (critical_actual != 'critical').mean()

        assert false_positive_rate == 0, "Critical recommendations have false positives"


@pytest.mark.ml
class TestForecastingModel:
    """Tests for spend/conversion forecasting model."""

    def test_forecast_mape_below_threshold(self, forecast_model, historical_data):
        """Mean Absolute Percentage Error should be below 15%."""
        actuals, forecasts = forecast_model.evaluate(historical_data, horizon=7)

        mape = np.mean(np.abs((actuals - forecasts) / actuals)) * 100

        assert mape < 15, f"MAPE {mape}% exceeds 15% threshold"

    def test_forecast_handles_seasonality(self, forecast_model):
        """Model should handle weekly seasonality."""
        # Generate data with known weekly pattern
        data = generate_seasonal_data(pattern='weekly', periods=90)

        forecast = forecast_model.predict(data, horizon=14)

        # Check that forecast captures weekly pattern
        weekly_correlation = calculate_weekly_correlation(forecast)
        assert weekly_correlation > 0.7
```

### 6.2 LLM Response Testing

```python
# tests/ml/test_gemini_responses.py
import pytest
from app.services.gemini_client import GeminiClient


@pytest.mark.llm
class TestGeminiResponses:
    """Tests for Gemini LLM response quality."""

    @pytest.fixture
    def gemini_client(self):
        return GeminiClient()

    async def test_advisor_response_contains_metrics(self, gemini_client):
        """AI advisor should reference actual metrics in responses."""
        context = {
            "campaigns": [{"name": "Search Campaign", "spend": 1500, "conversions": 45}],
            "period": "last 7 days"
        }

        response = await gemini_client.generate_advisor_response(
            question="How is my Search campaign performing?",
            context=context
        )

        assert "$1,500" in response or "1500" in response
        assert "45" in response or "conversions" in response.lower()

    async def test_advisor_response_not_hallucinating(self, gemini_client):
        """AI should not make up metrics not in context."""
        context = {
            "campaigns": [{"name": "Search Campaign", "spend": 1500}],
            "period": "last 7 days"
        }

        response = await gemini_client.generate_advisor_response(
            question="What was my ROAS?",
            context=context
        )

        # Should acknowledge missing data
        assert "don't have" in response.lower() or "not available" in response.lower()

    async def test_ad_copy_follows_guidelines(self, gemini_client):
        """Generated ad copy should follow Google Ads guidelines."""
        result = await gemini_client.generate_ad_copy(
            product="Running Shoes",
            benefits=["Lightweight", "Cushioned"],
            brand="FastFeet"
        )

        # Check headline length (30 chars max)
        for headline in result.headlines:
            assert len(headline) <= 30, f"Headline too long: {headline}"

        # Check description length (90 chars max)
        for description in result.descriptions:
            assert len(description) <= 90, f"Description too long: {description}"

        # No exclamation marks in headlines (Google policy)
        for headline in result.headlines:
            assert "!" not in headline, f"Headline has exclamation: {headline}"

    async def test_response_time_under_threshold(self, gemini_client, benchmark):
        """LLM responses should complete within 5 seconds."""
        context = {"campaigns": [{"name": "Test", "spend": 100}]}

        result = await benchmark(
            gemini_client.generate_advisor_response,
            question="How is my campaign?",
            context=context
        )

        assert benchmark.stats['mean'] < 5.0  # 5 seconds
```

---

## 7. Test Data Management

### 7.1 Factory Definitions

```python
# tests/factories/user_factory.py
import factory
from factory.alchemy import SQLAlchemyModelFactory
from faker import Faker

from app.models import User, Organization, AdAccount

fake = Faker()


class OrganizationFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Organization
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    name = factory.Faker('company')
    type = factory.Iterator(['individual', 'business', 'agency'])
    created_at = factory.LazyFunction(datetime.utcnow)


class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    email = factory.LazyAttribute(lambda _: fake.unique.email())
    name = factory.Faker('name')
    organization = factory.SubFactory(OrganizationFactory)
    timezone = 'UTC'
    currency = 'USD'
    onboarding_completed = True


class AdAccountFactory(SQLAlchemyModelFactory):
    class Meta:
        model = AdAccount
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    organization = factory.SubFactory(OrganizationFactory)
    platform = factory.Iterator(['google_ads', 'meta', 'tiktok'])
    platform_account_id = factory.LazyFunction(lambda: f"{fake.random_number(digits=10)}")
    account_name = factory.Faker('company')
    currency = 'USD'
    timezone = 'America/New_York'
    status = 'active'


class CampaignFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Campaign
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    ad_account = factory.SubFactory(AdAccountFactory)
    platform_campaign_id = factory.Sequence(lambda n: str(1000000 + n))
    name = factory.LazyAttribute(lambda _: f"{fake.word().title()} Campaign")
    campaign_type = factory.Iterator(['search', 'pmax', 'display', 'shopping'])
    status = 'enabled'
    budget_amount = factory.LazyFunction(lambda: fake.random_int(min=10, max=500) * 1_000_000)
    budget_type = 'daily'


class CampaignMetricsFactory(SQLAlchemyModelFactory):
    class Meta:
        model = CampaignMetricsDaily
        sqlalchemy_session_persistence = "commit"

    campaign = factory.SubFactory(CampaignFactory)
    date = factory.LazyFunction(date.today)
    impressions = factory.LazyFunction(lambda: fake.random_int(min=100, max=10000))
    clicks = factory.LazyFunction(lambda: fake.random_int(min=10, max=500))
    cost_micros = factory.LazyFunction(lambda: fake.random_int(min=1, max=100) * 1_000_000)
    conversions = factory.LazyFunction(lambda: fake.random_int(min=0, max=50))
    conversion_value = factory.LazyAttribute(
        lambda o: o.conversions * fake.random_int(min=20, max=200) * 1_000_000
    )


class RecommendationFactory(SQLAlchemyModelFactory):
    class Meta:
        model = AIRecommendation
        sqlalchemy_session_persistence = "commit"

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    ad_account = factory.SubFactory(AdAccountFactory)
    campaign = factory.SubFactory(CampaignFactory)
    recommendation_type = factory.Iterator([
        'pause_keyword', 'increase_budget', 'new_negative', 'change_bidding'
    ])
    severity = factory.Iterator(['info', 'warning', 'critical', 'opportunity'])
    title = factory.LazyAttribute(
        lambda o: f"{'Pause' if o.recommendation_type == 'pause_keyword' else 'Optimize'} {fake.word()}"
    )
    description = factory.Faker('sentence')
    status = 'pending'
```

### 7.2 Test Database Seeding

```python
# tests/seed_test_data.py
"""Seed test database with realistic data for E2E tests."""
import asyncio
from datetime import date, timedelta

from tests.factories import (
    UserFactory, OrganizationFactory, AdAccountFactory,
    CampaignFactory, CampaignMetricsFactory, RecommendationFactory
)


async def seed_test_database(session):
    """Create a complete test dataset."""

    # Create organization with users
    org = await OrganizationFactory.create(
        session,
        name="Test Company",
        type="business"
    )

    owner = await UserFactory.create(
        session,
        email="owner@test.com",
        organization=org
    )

    member = await UserFactory.create(
        session,
        email="member@test.com",
        organization=org
    )

    # Create ad accounts
    google_account = await AdAccountFactory.create(
        session,
        organization=org,
        platform="google_ads",
        account_name="Main Google Ads"
    )

    # Create campaigns
    search_campaign = await CampaignFactory.create(
        session,
        ad_account=google_account,
        name="Search - Brand",
        campaign_type="search"
    )

    pmax_campaign = await CampaignFactory.create(
        session,
        ad_account=google_account,
        name="PMax - Products",
        campaign_type="pmax"
    )

    # Create 90 days of metrics
    for campaign in [search_campaign, pmax_campaign]:
        for i in range(90):
            await CampaignMetricsFactory.create(
                session,
                campaign=campaign,
                date=date.today() - timedelta(days=i)
            )

    # Create pending recommendations
    await RecommendationFactory.create_batch(
        session,
        ad_account=google_account,
        status="pending",
        count=5
    )

    print("Test database seeded successfully!")
    return {
        "owner_email": "owner@test.com",
        "member_email": "member@test.com",
        "account_id": google_account.id
    }


if __name__ == "__main__":
    asyncio.run(seed_test_database())
```

---

## 8. CI/CD Test Integration

### 8.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  PYTHON_VERSION: '3.12'
  NODE_VERSION: '20'
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
  REDIS_URL: redis://localhost:6379

jobs:
  # ============================================
  # Backend Tests
  # ============================================
  backend-unit:
    name: Backend Unit Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run unit tests
        run: |
          cd backend
          pytest tests/unit -v --cov=app --cov-report=xml --cov-report=term-missing

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml
          flags: backend-unit

  backend-integration:
    name: Backend Integration Tests
    runs-on: ubuntu-latest
    needs: backend-unit

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run migrations
        run: |
          cd backend
          alembic upgrade head

      - name: Run integration tests
        run: |
          cd backend
          pytest tests/integration -v --cov=app --cov-append

  # ============================================
  # Frontend Tests
  # ============================================
  frontend-unit:
    name: Frontend Unit Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run unit tests
        run: |
          cd frontend
          npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/lcov.info
          flags: frontend-unit

  frontend-e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [backend-integration, frontend-unit]

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install Playwright
        run: |
          cd frontend
          npm ci
          npx playwright install --with-deps

      - name: Start backend
        run: |
          cd backend
          pip install -r requirements.txt
          alembic upgrade head
          python -m app.seed_test_data
          uvicorn app.main:app --port 8000 &
        env:
          DATABASE_URL: ${{ env.DATABASE_URL }}

      - name: Start frontend
        run: |
          cd frontend
          npm run build
          npm run start &
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000

      - name: Wait for services
        run: |
          npx wait-on http://localhost:3000 http://localhost:8000/health

      - name: Run E2E tests
        run: |
          cd frontend
          npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/

  # ============================================
  # Security & Performance
  # ============================================
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

      - name: Python security check
        run: |
          pip install safety bandit
          cd backend
          safety check -r requirements.txt
          bandit -r app/ -ll

  load-test:
    name: Load Test
    runs-on: ubuntu-latest
    needs: backend-integration
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Run k6 load tests
        uses: grafana/k6-action@v0.3.1
        with:
          filename: load-tests/scenarios/dashboard-load.js
          flags: --out json=results.json
        env:
          BASE_URL: http://localhost:8000

      - name: Check thresholds
        run: |
          # Fail if thresholds exceeded
          if grep -q '"thresholds":.*"failed":true' results.json; then
            echo "Load test thresholds exceeded!"
            exit 1
          fi
```

### 8.2 Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files

  # Python
  - repo: https://github.com/astral-sh/ruff
    rev: v0.1.9
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]

  # Frontend
  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.56.0
    hooks:
      - id: eslint
        files: \.[jt]sx?$
        types: [file]
        args: [--fix]

  # Security
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

---

## 9. Coverage Requirements

### 9.1 Coverage Thresholds

| Component | Minimum Coverage |
|-----------|-----------------|
| Backend Unit Tests | 80% |
| Backend Integration | 70% |
| Frontend Unit Tests | 75% |
| E2E Critical Flows | 100% |
| Overall | 75% |

### 9.2 Coverage Configuration

```toml
# backend/pyproject.toml
[tool.coverage.run]
source = ["app"]
omit = [
    "app/migrations/*",
    "app/tests/*",
    "app/__pycache__/*"
]

[tool.coverage.report]
fail_under = 80
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
]
```

```javascript
// frontend/vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/mocks/**',
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 70,
        statements: 75,
      }
    }
  }
});
```

---

## 10. Testing Environments

### 10.1 Environment Matrix

| Environment | Purpose | Data | External Services |
|-------------|---------|------|-------------------|
| **Local** | Developer testing | Fake/seeded | Mocked |
| **CI** | Automated tests | Seeded | Mocked |
| **Staging** | Pre-production E2E | Copy of prod (anonymized) | Sandbox APIs |
| **Production** | Smoke tests only | Real | Real |

### 10.2 Environment Configuration

```python
# backend/app/config.py
from pydantic_settings import BaseSettings


class TestSettings(BaseSettings):
    """Settings for test environment."""

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/test_db"

    # External services (mocked)
    GOOGLE_ADS_API_MOCK: bool = True
    STRIPE_API_KEY: str = "sk_test_..."
    GEMINI_API_MOCK: bool = True

    # Feature flags for testing
    ENABLE_SLOW_TESTS: bool = False
    ENABLE_EXTERNAL_API_TESTS: bool = False

    class Config:
        env_file = ".env.test"
```

---

## 11. Test Reporting

### 11.1 Test Report Dashboard

```yaml
# Allure report configuration
# pytest.ini
[pytest]
addopts = --alluredir=allure-results

# Generate report
# allure serve allure-results
```

### 11.2 Slack Notifications

```yaml
# .github/workflows/test.yml (addition)
  notify:
    name: Notify Results
    runs-on: ubuntu-latest
    needs: [backend-unit, backend-integration, frontend-unit, frontend-e2e]
    if: always()

    steps:
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

---

## Summary

| Test Type | Tool | Coverage Target | Run Frequency |
|-----------|------|-----------------|---------------|
| Unit (Backend) | pytest | 80% | Every commit |
| Unit (Frontend) | Vitest | 75% | Every commit |
| Integration | pytest + httpx | 70% | Every PR |
| E2E | Playwright | Critical flows 100% | Every PR |
| Load | k6 | p95 < 500ms | Weekly + releases |
| Security | ZAP, Trivy, Bandit | No critical issues | Weekly |
| ML Model | Custom benchmarks | Precision > 0.85 | Model updates |

**Total Test Files to Create:** ~50-60 files across unit, integration, and E2E tests.
