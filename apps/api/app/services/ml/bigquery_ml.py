"""
BigQuery ML Service - Time series forecasting and anomaly detection.

Uses ARIMA_PLUS models for:
- Spend forecasting
- Conversion forecasting
- Anomaly detection
"""

import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, date, timedelta
import warnings

warnings.filterwarnings("ignore")


@dataclass
class ForecastPoint:
    """Single forecast prediction point."""
    date: str
    value: float
    lower_bound: float
    upper_bound: float


@dataclass
class ForecastResult:
    """Complete forecast result."""
    metric: str
    campaign_id: Optional[str]
    predictions: List[ForecastPoint]
    model_info: Dict[str, Any]
    generated_at: str


@dataclass
class AnomalyResult:
    """Detected anomaly."""
    campaign_id: str
    metric: str
    timestamp: str
    actual_value: float
    expected_value: float
    lower_bound: float
    upper_bound: float
    is_anomaly: bool
    anomaly_probability: float


class BigQueryMLService:
    """
    BigQuery ML integration for forecasting and anomaly detection.

    Models:
    - ARIMA_PLUS for time series forecasting
    - Anomaly detection using ARIMA confidence bounds
    """

    def __init__(
        self,
        project_id: Optional[str] = None,
        dataset: Optional[str] = None
    ):
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID")
        self.dataset = dataset or os.getenv("BIGQUERY_DATASET", "adsmaster_ml")
        self._client = None
        self._initialized = False

    def _ensure_initialized(self) -> bool:
        """Lazy initialization of BigQuery client."""
        if self._initialized:
            return True

        if not self.project_id:
            print("BigQuery ML: No GCP_PROJECT_ID configured")
            return False

        try:
            from google.cloud import bigquery
            self._client = bigquery.Client(project=self.project_id)
            self._initialized = True
            return True
        except ImportError:
            print("BigQuery ML: google-cloud-bigquery not installed")
            return False
        except Exception as e:
            print(f"BigQuery ML initialization error: {e}")
            return False

    # =========================================================================
    # FORECASTING
    # =========================================================================

    async def forecast_spend(
        self,
        campaign_id: Optional[str] = None,
        historical_data: Optional[List[Dict[str, Any]]] = None,
        horizon_days: int = 30,
        confidence: float = 0.95
    ) -> ForecastResult:
        """
        Forecast future spend using ARIMA_PLUS.

        Args:
            campaign_id: Optional campaign to forecast (None = all)
            historical_data: If provided, use this data instead of querying
            horizon_days: Days to forecast ahead
            confidence: Confidence interval (0-1)

        Returns:
            ForecastResult with predictions
        """
        if not self._ensure_initialized():
            return self._local_forecast(historical_data or [], "spend", horizon_days, confidence)

        try:
            # If we have historical data, create temp table and train inline
            if historical_data:
                return await self._forecast_from_data(
                    historical_data, "spend", horizon_days, confidence, campaign_id
                )

            # Otherwise, query existing model
            model_id = f"`{self.project_id}.{self.dataset}.spend_forecast_model`"

            forecast_sql = f"""
            SELECT
                forecast_timestamp AS date,
                forecast_value AS value,
                prediction_interval_lower_bound AS lower_bound,
                prediction_interval_upper_bound AS upper_bound
            FROM ML.FORECAST(
                MODEL {model_id},
                STRUCT({horizon_days} AS horizon, {confidence} AS confidence_level)
            )
            ORDER BY forecast_timestamp
            """

            result = self._client.query(forecast_sql).result()

            predictions = [
                ForecastPoint(
                    date=row.date.isoformat() if hasattr(row.date, 'isoformat') else str(row.date),
                    value=float(row.value),
                    lower_bound=float(row.lower_bound),
                    upper_bound=float(row.upper_bound),
                )
                for row in result
            ]

            return ForecastResult(
                metric="spend",
                campaign_id=campaign_id,
                predictions=predictions,
                model_info={"type": "ARIMA_PLUS", "source": "bigquery_ml"},
                generated_at=datetime.utcnow().isoformat()
            )

        except Exception as e:
            print(f"BigQuery forecast error: {e}")
            return self._local_forecast(historical_data or [], "spend", horizon_days, confidence)

    async def forecast_conversions(
        self,
        campaign_id: Optional[str] = None,
        historical_data: Optional[List[Dict[str, Any]]] = None,
        horizon_days: int = 30,
        confidence: float = 0.95
    ) -> ForecastResult:
        """Forecast future conversions."""
        if not self._ensure_initialized():
            return self._local_forecast(historical_data or [], "conversions", horizon_days, confidence)

        if historical_data:
            return await self._forecast_from_data(
                historical_data, "conversions", horizon_days, confidence, campaign_id
            )

        return self._local_forecast(historical_data or [], "conversions", horizon_days, confidence)

    async def _forecast_from_data(
        self,
        data: List[Dict[str, Any]],
        metric: str,
        horizon: int,
        confidence: float,
        campaign_id: Optional[str] = None
    ) -> ForecastResult:
        """Train inline model from provided data and forecast."""
        if not data or len(data) < 14:  # Need at least 2 weeks
            return self._local_forecast(data, metric, horizon, confidence)

        try:
            # Create temporary table
            temp_table = f"{self.project_id}.{self.dataset}.temp_forecast_{metric}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

            # Prepare rows
            rows = [
                {"date": d["date"], "value": float(d.get(metric, 0))}
                for d in data
                if d.get(metric) is not None
            ]

            # Create table and insert data
            schema = [
                {"name": "date", "type": "DATE"},
                {"name": "value", "type": "FLOAT64"},
            ]

            table_ref = self._client.dataset(self.dataset).table(f"temp_forecast_{metric}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}")

            job_config = self._client.LoadJobConfig(
                schema=schema,
                write_disposition="WRITE_TRUNCATE"
            )

            # Use inline training with CREATE TEMP MODEL
            inline_sql = f"""
            CREATE TEMP MODEL forecast_model
            OPTIONS(
                model_type='ARIMA_PLUS',
                time_series_timestamp_col='date',
                time_series_data_col='value',
                auto_arima=TRUE,
                data_frequency='DAILY'
            ) AS
            SELECT
                PARSE_DATE('%Y-%m-%d', date) as date,
                value
            FROM UNNEST([
                {', '.join([f"STRUCT('{r['date']}' AS date, {r['value']} AS value)" for r in rows])}
            ]);

            SELECT
                forecast_timestamp AS date,
                forecast_value AS value,
                prediction_interval_lower_bound AS lower_bound,
                prediction_interval_upper_bound AS upper_bound
            FROM ML.FORECAST(
                MODEL forecast_model,
                STRUCT({horizon} AS horizon, {confidence} AS confidence_level)
            )
            ORDER BY forecast_timestamp;
            """

            # Execute multi-statement query
            result = self._client.query(inline_sql).result()

            predictions = [
                ForecastPoint(
                    date=row.date.isoformat() if hasattr(row.date, 'isoformat') else str(row.date),
                    value=max(0, float(row.value)),  # No negative values
                    lower_bound=max(0, float(row.lower_bound)),
                    upper_bound=float(row.upper_bound),
                )
                for row in result
            ]

            return ForecastResult(
                metric=metric,
                campaign_id=campaign_id,
                predictions=predictions,
                model_info={
                    "type": "ARIMA_PLUS",
                    "source": "bigquery_ml_inline",
                    "training_points": len(rows)
                },
                generated_at=datetime.utcnow().isoformat()
            )

        except Exception as e:
            print(f"Inline forecast error: {e}")
            return self._local_forecast(data, metric, horizon, confidence)

    def _local_forecast(
        self,
        data: List[Dict[str, Any]],
        metric: str,
        horizon: int,
        confidence: float
    ) -> ForecastResult:
        """Local statistical fallback when BigQuery not available."""
        if not data:
            # Generate demo data
            today = datetime.now()
            predictions = []
            base_value = 300 if metric == "spend" else 20

            for i in range(horizon):
                pred_date = today + timedelta(days=i + 1)
                value = base_value * (1 + i * 0.01)  # Slight upward trend
                margin = value * 0.15

                predictions.append(ForecastPoint(
                    date=pred_date.strftime("%Y-%m-%d"),
                    value=round(value, 2),
                    lower_bound=round(value - margin, 2),
                    upper_bound=round(value + margin, 2),
                ))

            return ForecastResult(
                metric=metric,
                campaign_id=None,
                predictions=predictions,
                model_info={"type": "demo", "source": "local"},
                generated_at=datetime.utcnow().isoformat()
            )

        # Calculate from historical data
        values = [d.get(metric, 0) for d in data if d.get(metric) is not None]
        if not values:
            return self._local_forecast([], metric, horizon, confidence)

        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values) if len(values) > 1 else 0
        std_dev = variance ** 0.5

        # Simple trend
        if len(values) >= 7:
            recent = sum(values[-7:]) / 7
            older = sum(values[:7]) / 7 if len(values) >= 14 else mean
            daily_trend = (recent - older) / 7
        else:
            daily_trend = 0

        # Generate predictions
        last_date = datetime.strptime(data[-1]["date"], "%Y-%m-%d")
        last_value = values[-1]

        z_score = 1.96 if confidence >= 0.95 else 1.645

        predictions = []
        for i in range(horizon):
            pred_date = last_date + timedelta(days=i + 1)
            pred_value = max(0, last_value + daily_trend * (i + 1))
            margin = z_score * std_dev * (1 + i * 0.02)

            predictions.append(ForecastPoint(
                date=pred_date.strftime("%Y-%m-%d"),
                value=round(pred_value, 2),
                lower_bound=round(max(0, pred_value - margin), 2),
                upper_bound=round(pred_value + margin, 2),
            ))

        return ForecastResult(
            metric=metric,
            campaign_id=None,
            predictions=predictions,
            model_info={"type": "statistical", "source": "local", "training_points": len(values)},
            generated_at=datetime.utcnow().isoformat()
        )

    # =========================================================================
    # ANOMALY DETECTION
    # =========================================================================

    async def detect_anomalies(
        self,
        metrics_data: List[Dict[str, Any]],
        metrics_to_check: List[str] = None,
        threshold: float = 0.95
    ) -> List[AnomalyResult]:
        """
        Detect anomalies in metrics using statistical methods.

        Args:
            metrics_data: List of {date, spend, conversions, clicks, ...}
            metrics_to_check: Which metrics to analyze
            threshold: Anomaly probability threshold

        Returns:
            List of detected anomalies
        """
        if not metrics_data:
            return []

        metrics_to_check = metrics_to_check or ["spend", "conversions", "ctr", "cpc"]
        anomalies = []

        for metric in metrics_to_check:
            values = [d.get(metric, 0) for d in metrics_data if metric in d]
            if len(values) < 7:
                continue

            # Calculate statistics
            baseline = values[:-1]
            mean = sum(baseline) / len(baseline)
            variance = sum((x - mean) ** 2 for x in baseline) / len(baseline)
            std_dev = variance ** 0.5 if variance > 0 else 1

            # Check latest value
            current = values[-1]
            z_score = abs(current - mean) / std_dev if std_dev > 0 else 0

            if z_score > 2:  # More than 2 std deviations
                # Calculate anomaly probability based on z-score
                anomaly_prob = min(0.99, 0.5 + z_score * 0.15)

                if anomaly_prob >= threshold:
                    last_date = metrics_data[-1].get("date", datetime.now().strftime("%Y-%m-%d"))

                    anomalies.append(AnomalyResult(
                        campaign_id=metrics_data[-1].get("campaign_id", ""),
                        metric=metric,
                        timestamp=last_date,
                        actual_value=current,
                        expected_value=mean,
                        lower_bound=mean - 2 * std_dev,
                        upper_bound=mean + 2 * std_dev,
                        is_anomaly=True,
                        anomaly_probability=round(anomaly_prob, 3),
                    ))

        return anomalies

    # =========================================================================
    # MODEL TRAINING
    # =========================================================================

    async def train_forecast_model(
        self,
        table_name: str,
        model_name: str,
        time_col: str = "date",
        value_col: str = "value",
        id_col: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Train a new ARIMA_PLUS forecast model.

        Args:
            table_name: Source table with historical data
            model_name: Name for the new model
            time_col: Timestamp column
            value_col: Value column to forecast
            id_col: Optional time series ID column (for multiple series)

        Returns:
            Training job info
        """
        if not self._ensure_initialized():
            return {"status": "error", "message": "BigQuery not initialized"}

        try:
            model_id = f"`{self.project_id}.{self.dataset}.{model_name}`"
            source_table = f"`{self.project_id}.{self.dataset}.{table_name}`"

            id_col_option = f", time_series_id_col='{id_col}'" if id_col else ""

            sql = f"""
            CREATE OR REPLACE MODEL {model_id}
            OPTIONS(
                model_type='ARIMA_PLUS',
                time_series_timestamp_col='{time_col}',
                time_series_data_col='{value_col}'{id_col_option},
                auto_arima=TRUE,
                data_frequency='DAILY',
                decompose_time_series=TRUE
            ) AS
            SELECT *
            FROM {source_table}
            WHERE {value_col} IS NOT NULL
            """

            job = self._client.query(sql)
            job.result()  # Wait for completion

            return {
                "status": "success",
                "model_name": model_name,
                "model_id": model_id,
                "created_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            return {"status": "error", "message": str(e)}


# Singleton instance
_bqml_service: Optional[BigQueryMLService] = None

def get_bigquery_ml_service() -> BigQueryMLService:
    """Get or create BigQuery ML service singleton."""
    global _bqml_service
    if _bqml_service is None:
        _bqml_service = BigQueryMLService()
    return _bqml_service
