"""
Anomaly Detection Service - Detect unusual patterns in metrics.

Supports:
- BigQuery ML (production)
- Local statistical methods (development)
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
import os


class AnomalySeverity(str, Enum):
    """Anomaly severity levels."""
    CRITICAL = "critical"  # >3 std deviations
    WARNING = "warning"    # >2 std deviations
    INFO = "info"          # >1.5 std deviations


class AnomalyType(str, Enum):
    """Types of anomalies."""
    SPIKE = "spike"                # Sudden increase
    DROP = "drop"                  # Sudden decrease
    TREND_CHANGE = "trend_change"  # Change in trend direction
    VOLATILITY = "volatility"      # Unusual variance


@dataclass
class Anomaly:
    """Detected anomaly."""
    id: str
    metric: str
    type: AnomalyType
    severity: AnomalySeverity
    timestamp: datetime
    actual_value: float
    expected_value: float
    deviation_pct: float
    description: str
    affected_entity: Optional[Dict[str, Any]] = None


class AnomalyDetectionService:
    """
    Detect anomalies in ad performance metrics.

    Monitors:
    - Spend spikes/drops
    - Conversion rate changes
    - CPC anomalies
    - CTR variations
    - Budget exhaustion patterns
    """

    def __init__(
        self,
        gcp_project: Optional[str] = None,
        sensitivity: float = 2.0  # std deviations for warning threshold
    ):
        self.gcp_project = gcp_project or os.getenv("GCP_PROJECT_ID")
        self.sensitivity = sensitivity
        self.use_bigquery = bool(self.gcp_project) and self._check_bigquery()

    def _check_bigquery(self) -> bool:
        """Check if BigQuery ML is available."""
        try:
            from google.cloud import bigquery
            return True
        except ImportError:
            return False

    async def detect_anomalies(
        self,
        ad_account_id: str,
        metrics_data: List[Dict[str, Any]],
        metrics_to_check: List[str] = None
    ) -> List[Anomaly]:
        """
        Detect anomalies in metrics data.

        Args:
            ad_account_id: Account to analyze
            metrics_data: List of {date, spend, conversions, clicks, impressions, cpc, ctr}
            metrics_to_check: Specific metrics to analyze (default: all)

        Returns:
            List of detected anomalies
        """
        if not metrics_data:
            return []

        metrics_to_check = metrics_to_check or ["spend", "conversions", "cpc", "ctr"]

        anomalies = []
        for metric in metrics_to_check:
            values = [d.get(metric, 0) for d in metrics_data if metric in d]
            if len(values) < 7:  # Need at least a week of data
                continue

            metric_anomalies = self._detect_statistical_anomalies(
                metric, values, metrics_data
            )
            anomalies.extend(metric_anomalies)

        # Sort by severity and recency
        severity_order = {AnomalySeverity.CRITICAL: 0, AnomalySeverity.WARNING: 1, AnomalySeverity.INFO: 2}
        anomalies.sort(key=lambda a: (severity_order[a.severity], -a.timestamp.timestamp()))

        return anomalies

    def _detect_statistical_anomalies(
        self,
        metric: str,
        values: List[float],
        data: List[Dict[str, Any]]
    ) -> List[Anomaly]:
        """Detect anomalies using statistical methods."""
        anomalies = []

        # Calculate statistics (excluding last point for detection)
        baseline_values = values[:-1] if len(values) > 7 else values[:-1]
        if not baseline_values:
            return []

        mean = sum(baseline_values) / len(baseline_values)
        variance = sum((x - mean) ** 2 for x in baseline_values) / len(baseline_values)
        std_dev = variance ** 0.5 if variance > 0 else 1

        # Check most recent value
        current_value = values[-1]
        z_score = (current_value - mean) / std_dev if std_dev > 0 else 0

        if abs(z_score) > self.sensitivity:
            # Determine severity
            if abs(z_score) > 3:
                severity = AnomalySeverity.CRITICAL
            elif abs(z_score) > 2:
                severity = AnomalySeverity.WARNING
            else:
                severity = AnomalySeverity.INFO

            # Determine type
            if z_score > 0:
                anomaly_type = AnomalyType.SPIKE
                direction = "increase"
            else:
                anomaly_type = AnomalyType.DROP
                direction = "decrease"

            deviation_pct = ((current_value - mean) / mean * 100) if mean != 0 else 0

            # Get date from data
            try:
                last_date = datetime.strptime(data[-1].get("date", ""), "%Y-%m-%d")
            except:
                last_date = datetime.now()

            anomalies.append(Anomaly(
                id=f"anomaly_{metric}_{int(last_date.timestamp())}",
                metric=metric,
                type=anomaly_type,
                severity=severity,
                timestamp=last_date,
                actual_value=current_value,
                expected_value=mean,
                deviation_pct=round(deviation_pct, 1),
                description=self._generate_description(
                    metric, anomaly_type, severity, deviation_pct, direction
                ),
            ))

        # Check for trend change (compare last 3 days vs previous 7)
        if len(values) >= 10:
            recent_avg = sum(values[-3:]) / 3
            previous_avg = sum(values[-10:-3]) / 7

            if previous_avg > 0:
                trend_change = (recent_avg - previous_avg) / previous_avg * 100

                if abs(trend_change) > 30:  # 30% change in trend
                    try:
                        last_date = datetime.strptime(data[-1].get("date", ""), "%Y-%m-%d")
                    except:
                        last_date = datetime.now()

                    anomalies.append(Anomaly(
                        id=f"trend_{metric}_{int(last_date.timestamp())}",
                        metric=metric,
                        type=AnomalyType.TREND_CHANGE,
                        severity=AnomalySeverity.WARNING if abs(trend_change) > 50 else AnomalySeverity.INFO,
                        timestamp=last_date,
                        actual_value=recent_avg,
                        expected_value=previous_avg,
                        deviation_pct=round(trend_change, 1),
                        description=f"{metric.upper()} trend changed by {trend_change:+.1f}% over the last 3 days",
                    ))

        return anomalies

    def _generate_description(
        self,
        metric: str,
        anomaly_type: AnomalyType,
        severity: AnomalySeverity,
        deviation_pct: float,
        direction: str
    ) -> str:
        """Generate human-readable anomaly description."""
        metric_names = {
            "spend": "Ad spend",
            "conversions": "Conversions",
            "cpc": "Cost per click",
            "ctr": "Click-through rate",
            "impressions": "Impressions",
            "clicks": "Clicks",
        }
        metric_name = metric_names.get(metric, metric.capitalize())

        severity_words = {
            AnomalySeverity.CRITICAL: "critical",
            AnomalySeverity.WARNING: "significant",
            AnomalySeverity.INFO: "notable",
        }
        severity_word = severity_words[severity]

        return f"{severity_word.capitalize()} {direction} in {metric_name}: {deviation_pct:+.1f}% from expected"

    async def detect_budget_exhaustion(
        self,
        ad_account_id: str,
        hourly_spend: List[Dict[str, Any]],  # {hour, spend}
        daily_budget: float
    ) -> Optional[Anomaly]:
        """
        Detect if budget is exhausting too early in the day.

        Returns anomaly if budget likely to exhaust before end of day.
        """
        if not hourly_spend or daily_budget <= 0:
            return None

        # Calculate current spend and time
        current_spend = sum(h.get("spend", 0) for h in hourly_spend)
        current_hour = len(hourly_spend)  # Assuming hourly_spend is for today

        if current_hour < 6:  # Too early to tell
            return None

        # Project spend to end of day
        hourly_rate = current_spend / current_hour
        projected_spend = hourly_rate * 24

        # Check if pacing is too fast
        expected_at_this_hour = (current_hour / 24) * daily_budget
        pace_ratio = current_spend / expected_at_this_hour if expected_at_this_hour > 0 else 1

        if pace_ratio > 1.3:  # Spending 30% faster than expected
            exhaustion_hour = int(daily_budget / hourly_rate) if hourly_rate > 0 else 24
            overspend_pct = (projected_spend / daily_budget - 1) * 100 if daily_budget > 0 else 0

            return Anomaly(
                id=f"budget_exhaustion_{datetime.now().strftime('%Y%m%d')}",
                metric="budget_pacing",
                type=AnomalyType.SPIKE,
                severity=AnomalySeverity.CRITICAL if exhaustion_hour < 18 else AnomalySeverity.WARNING,
                timestamp=datetime.now(),
                actual_value=current_spend,
                expected_value=expected_at_this_hour,
                deviation_pct=round((pace_ratio - 1) * 100, 1),
                description=f"Budget on track to exhaust by {exhaustion_hour}:00 (overspending by {overspend_pct:.0f}%)",
            )

        return None


# Demo anomalies for testing
def get_demo_anomalies() -> List[Anomaly]:
    """Get demo anomalies for UI development."""
    now = datetime.now()

    return [
        Anomaly(
            id="anomaly_spend_1",
            metric="spend",
            type=AnomalyType.SPIKE,
            severity=AnomalySeverity.CRITICAL,
            timestamp=now - timedelta(hours=2),
            actual_value=485.50,
            expected_value=320.00,
            deviation_pct=51.7,
            description="Critical increase in Ad spend: +51.7% from expected",
            affected_entity={"campaign_id": "camp_1", "campaign_name": "Search - Non-Brand"},
        ),
        Anomaly(
            id="anomaly_ctr_1",
            metric="ctr",
            type=AnomalyType.DROP,
            severity=AnomalySeverity.WARNING,
            timestamp=now - timedelta(hours=6),
            actual_value=1.2,
            expected_value=2.1,
            deviation_pct=-42.9,
            description="Significant decrease in Click-through rate: -42.9% from expected",
            affected_entity={"campaign_id": "camp_3", "campaign_name": "PMax - Products"},
        ),
        Anomaly(
            id="budget_exhaustion_1",
            metric="budget_pacing",
            type=AnomalyType.SPIKE,
            severity=AnomalySeverity.WARNING,
            timestamp=now,
            actual_value=245.00,
            expected_value=175.00,
            deviation_pct=40.0,
            description="Budget on track to exhaust by 17:00 (overspending by 40%)",
        ),
    ]
