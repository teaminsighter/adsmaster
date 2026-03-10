"""
Rate Limiter for Ad Platform APIs

Implements quota tracking and rate limiting for Google Ads and Meta APIs.
Uses Redis for distributed quota tracking across workers.
"""

import asyncio
import logging
import random
from datetime import date, datetime, timedelta
from typing import Dict, Optional, Any, Callable, TypeVar
from functools import wraps

try:
    import redis.asyncio as redis
except ImportError:
    redis = None


logger = logging.getLogger(__name__)


# Type variable for generic function return
T = TypeVar("T")


class QuotaExhaustedError(Exception):
    """Raised when API quota is exhausted."""
    def __init__(self, platform: str, remaining: int = 0, reset_at: datetime = None):
        self.platform = platform
        self.remaining = remaining
        self.reset_at = reset_at
        super().__init__(f"{platform} API quota exhausted. Resets at {reset_at}")


class RateLimitExceededError(Exception):
    """Raised when rate limit is exceeded (temporary)."""
    def __init__(self, platform: str, retry_after: int = 60):
        self.platform = platform
        self.retry_after = retry_after
        super().__init__(f"{platform} rate limit exceeded. Retry after {retry_after}s")


class MaxRetriesExceededError(Exception):
    """Raised when max retries are exceeded."""
    pass


class GoogleAdsRateLimiter:
    """
    Rate limiter for Google Ads API.

    Google Ads API limits:
    - Basic tier: 15,000 operations/day
    - Standard tier: 1,000,000 operations/day

    Operations = number of queries + number of mutate operations.
    """

    # Default quotas (basic tier)
    DAILY_QUOTA = 15000
    WARNING_THRESHOLD = 0.8  # Alert at 80%
    CRITICAL_THRESHOLD = 0.95  # Block non-essential at 95%

    def __init__(self, redis_url: str = None, org_id: str = None):
        """
        Initialize rate limiter.

        Args:
            redis_url: Redis connection URL. If None, uses in-memory fallback.
            org_id: Organization ID for per-org quota tracking.
        """
        self.redis_url = redis_url
        self.org_id = org_id
        self._redis_client: Optional[redis.Redis] = None
        self._local_counter: Dict[str, int] = {}  # Fallback for no Redis
        self._alert_sent: Dict[str, bool] = {}

    async def _get_redis(self) -> Optional[redis.Redis]:
        """Get or create Redis client."""
        if redis is None:
            return None

        if self._redis_client is None and self.redis_url:
            try:
                self._redis_client = redis.from_url(self.redis_url)
                await self._redis_client.ping()
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}. Using local fallback.")
                self._redis_client = None

        return self._redis_client

    def _get_quota_key(self, suffix: str = "") -> str:
        """Generate Redis key for quota tracking."""
        date_str = date.today().isoformat()
        org_part = f":{self.org_id}" if self.org_id else ""
        return f"gads_quota{org_part}:{date_str}{suffix}"

    async def check_and_increment(
        self,
        operation_count: int = 1,
        is_essential: bool = True,
    ) -> Dict[str, Any]:
        """
        Check quota and increment counter.

        Args:
            operation_count: Number of operations to record.
            is_essential: If False, will be blocked at critical threshold.

        Returns:
            Dict with quota status info.

        Raises:
            QuotaExhaustedError: If quota is exhausted.
        """
        redis_client = await self._get_redis()
        key = self._get_quota_key()

        if redis_client:
            # Use Redis for distributed tracking
            try:
                current = await redis_client.incrby(key, operation_count)

                # Set TTL if this is the first increment today
                if current <= operation_count:
                    # 25 hours to ensure it covers the full day + buffer
                    await redis_client.expire(key, 90000)
            except Exception as e:
                logger.warning(f"Redis error: {e}. Using local fallback.")
                current = self._local_increment(key, operation_count)
        else:
            current = self._local_increment(key, operation_count)

        usage_pct = current / self.DAILY_QUOTA

        # Check if exhausted
        if usage_pct >= 1.0:
            reset_at = datetime.combine(
                date.today() + timedelta(days=1),
                datetime.min.time()
            )
            raise QuotaExhaustedError("Google Ads", 0, reset_at)

        # Block non-essential at critical threshold
        if usage_pct >= self.CRITICAL_THRESHOLD and not is_essential:
            raise QuotaExhaustedError(
                "Google Ads",
                self.DAILY_QUOTA - current,
                datetime.combine(date.today() + timedelta(days=1), datetime.min.time())
            )

        # Send warning alert at threshold
        if usage_pct >= self.WARNING_THRESHOLD:
            await self._send_quota_alert(usage_pct, current)

        return {
            "current_usage": current,
            "remaining": self.DAILY_QUOTA - current,
            "usage_percent": usage_pct * 100,
            "warning": usage_pct >= self.WARNING_THRESHOLD,
        }

    def _local_increment(self, key: str, count: int) -> int:
        """Local fallback counter when Redis is unavailable."""
        current = self._local_counter.get(key, 0) + count
        self._local_counter[key] = current
        return current

    async def get_remaining_quota(self) -> int:
        """Get remaining quota for today."""
        redis_client = await self._get_redis()
        key = self._get_quota_key()

        if redis_client:
            try:
                used = int(await redis_client.get(key) or 0)
            except:
                used = self._local_counter.get(key, 0)
        else:
            used = self._local_counter.get(key, 0)

        return max(0, self.DAILY_QUOTA - used)

    async def get_quota_status(self) -> Dict[str, Any]:
        """Get current quota status."""
        remaining = await self.get_remaining_quota()
        used = self.DAILY_QUOTA - remaining
        usage_pct = (used / self.DAILY_QUOTA) * 100

        return {
            "platform": "google_ads",
            "daily_quota": self.DAILY_QUOTA,
            "used": used,
            "remaining": remaining,
            "usage_percent": round(usage_pct, 2),
            "status": "critical" if usage_pct >= 95 else "warning" if usage_pct >= 80 else "healthy",
            "resets_at": datetime.combine(
                date.today() + timedelta(days=1),
                datetime.min.time()
            ).isoformat(),
        }

    async def _send_quota_alert(self, usage_pct: float, current: int) -> None:
        """Send quota warning alert."""
        alert_key = self._get_quota_key(":alert")

        # Only send one alert per day
        if self._alert_sent.get(alert_key):
            return

        self._alert_sent[alert_key] = True

        logger.warning(
            f"Google Ads API quota at {usage_pct*100:.1f}% "
            f"({current}/{self.DAILY_QUOTA})"
        )

        # In production, send to monitoring/alerting system
        # await send_slack_alert(...)
        # await send_pagerduty_alert(...)


class MetaAdsRateLimiter:
    """
    Rate limiter for Meta Marketing API.

    Meta API limits are usage-based and account-dependent.
    Uses the x-business-use-case-usage header from API responses.
    """

    # Meta returns 80% as "approaching limit", 100% as "at limit"
    WARNING_THRESHOLD = 70
    CRITICAL_THRESHOLD = 90

    def __init__(self, redis_url: str = None, ad_account_id: str = None):
        self.redis_url = redis_url
        self.ad_account_id = ad_account_id
        self._redis_client: Optional[redis.Redis] = None
        self._usage_cache: Dict[str, int] = {}

    async def _get_redis(self) -> Optional[redis.Redis]:
        if redis is None:
            return None

        if self._redis_client is None and self.redis_url:
            try:
                self._redis_client = redis.from_url(self.redis_url)
                await self._redis_client.ping()
            except:
                self._redis_client = None

        return self._redis_client

    def _get_usage_key(self) -> str:
        """Key for tracking usage from API responses."""
        return f"meta_usage:{self.ad_account_id}:{date.today().isoformat()}"

    async def record_usage_from_response(
        self,
        usage_header: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Record usage from Meta API response header.

        Meta returns usage info in x-business-use-case-usage header.

        Args:
            usage_header: Parsed usage header from API response.

        Returns:
            Current usage status.
        """
        # Extract call_count from usage header
        # Format varies by endpoint, but typically has call_count and total_cputime
        call_count = usage_header.get("call_count", 0)
        cpu_time = usage_header.get("total_cputime", 0)

        # Store in cache
        key = self._get_usage_key()
        self._usage_cache[key] = call_count

        # Also store in Redis if available
        redis_client = await self._get_redis()
        if redis_client:
            try:
                await redis_client.set(key, call_count, ex=86400)
            except:
                pass

        return {
            "call_count": call_count,
            "cpu_time": cpu_time,
            "warning": call_count >= self.WARNING_THRESHOLD,
            "critical": call_count >= self.CRITICAL_THRESHOLD,
        }

    async def check_before_request(self) -> Dict[str, Any]:
        """
        Check usage before making a request.

        Returns:
            Current usage status and whether request should proceed.
        """
        key = self._get_usage_key()

        # Check cache first
        call_count = self._usage_cache.get(key, 0)

        # Check Redis if not in cache
        if call_count == 0:
            redis_client = await self._get_redis()
            if redis_client:
                try:
                    stored = await redis_client.get(key)
                    if stored:
                        call_count = int(stored)
                except:
                    pass

        status = "healthy"
        if call_count >= self.CRITICAL_THRESHOLD:
            status = "critical"
        elif call_count >= self.WARNING_THRESHOLD:
            status = "warning"

        return {
            "call_count": call_count,
            "status": status,
            "can_proceed": call_count < 100,  # Meta hard limit
        }


async def call_with_backoff(
    func: Callable[..., T],
    *args,
    max_retries: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True,
    retryable_exceptions: tuple = None,
    **kwargs,
) -> T:
    """
    Call a function with exponential backoff and jitter.

    Args:
        func: Async function to call.
        *args: Positional arguments for func.
        max_retries: Maximum number of retry attempts.
        base_delay: Initial delay in seconds.
        max_delay: Maximum delay in seconds.
        jitter: Whether to add random jitter to delay.
        retryable_exceptions: Tuple of exceptions to retry on.
        **kwargs: Keyword arguments for func.

    Returns:
        Result of func.

    Raises:
        MaxRetriesExceededError: If all retries fail.
        Exception: If non-retryable exception is raised.
    """
    if retryable_exceptions is None:
        retryable_exceptions = (
            RateLimitExceededError,
            ConnectionError,
            TimeoutError,
        )

    last_exception = None

    for attempt in range(max_retries):
        try:
            return await func(*args, **kwargs)

        except retryable_exceptions as e:
            last_exception = e

            # Check if we have retries left
            if attempt + 1 >= max_retries:
                break

            # Calculate delay with exponential backoff
            delay = min(base_delay * (2 ** attempt), max_delay)

            # Add jitter (±25%)
            if jitter:
                delay = delay * (0.75 + random.random() * 0.5)

            logger.warning(
                f"Request failed (attempt {attempt + 1}/{max_retries}): {e}. "
                f"Retrying in {delay:.2f}s"
            )

            await asyncio.sleep(delay)

        except Exception as e:
            # Non-retryable exception
            raise

    raise MaxRetriesExceededError(
        f"Max retries ({max_retries}) exceeded. Last error: {last_exception}"
    )


def with_rate_limit(
    limiter: GoogleAdsRateLimiter,
    operation_count: int = 1,
    is_essential: bool = True,
):
    """
    Decorator for rate-limiting API calls.

    Usage:
        limiter = GoogleAdsRateLimiter(redis_url="redis://localhost:6379")

        @with_rate_limit(limiter, operation_count=1)
        async def get_campaigns():
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            # Check and increment quota
            await limiter.check_and_increment(operation_count, is_essential)

            # Call the actual function with backoff
            return await call_with_backoff(func, *args, **kwargs)

        return wrapper
    return decorator


class QuotaTracker:
    """
    Central quota tracking service for monitoring API usage.

    Provides dashboard-ready quota information.
    """

    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url
        self.google_limiter = GoogleAdsRateLimiter(redis_url)

    async def get_all_quota_status(self) -> Dict[str, Any]:
        """Get quota status for all platforms."""
        google_status = await self.google_limiter.get_quota_status()

        return {
            "google_ads": google_status,
            "meta_ads": {
                "platform": "meta_ads",
                "status": "usage-based",
                "note": "Meta quotas are per-account and returned in API response headers",
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def get_quota_history(
        self,
        platform: str,
        days: int = 7,
    ) -> list:
        """
        Get quota usage history.

        Note: Requires Redis with historical data retention.
        """
        # This would query historical quota data from Redis or a time-series DB
        # For now, return placeholder
        return []
