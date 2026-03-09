"""
Forecasting Service - Time series predictions.

Supports:
- BigQuery ML ARIMA_PLUS (production)
- Vertex AI Temporal Fusion Transformer (advanced)
- Prophet (Meta's forecasting library)
- Local statistical fallback (development)
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
import os


class ForecastBackend(str, Enum):
    """Available forecasting backends."""
    BIGQUERY_ML = "bigquery_ml"
    VERTEX_AI = "vertex_ai"
    PROPHET = "prophet"
    LOCAL = "local"  # Simple statistical methods


@dataclass
class ForecastResult:
    """Result of a forecast prediction."""
    metric: str
    predictions: List[Dict[str, Any]]  # {date, value, lower_bound, upper_bound}
    confidence_interval: float  # e.g., 0.95 for 95%
    model_used: str
    training_data_points: int
    mape: Optional[float] = None  # Mean Absolute Percentage Error
    r_squared: Optional[float] = None


class ForecastingService:
    """
    Multi-backend forecasting service.

    Automatically selects best available backend or uses specified one.
    """

    def __init__(
        self,
        backend: Optional[ForecastBackend] = None,
        gcp_project: Optional[str] = None,
        bigquery_dataset: Optional[str] = None
    ):
        self.gcp_project = gcp_project or os.getenv("GCP_PROJECT_ID")
        self.bigquery_dataset = bigquery_dataset or os.getenv("BIGQUERY_DATASET", "adsmaster_ml")

        # Auto-select backend
        if backend:
            self.backend = backend
        elif self.gcp_project and self._check_bigquery():
            self.backend = ForecastBackend.BIGQUERY_ML
        elif self._check_prophet():
            self.backend = ForecastBackend.PROPHET
        else:
            self.backend = ForecastBackend.LOCAL

    def _check_bigquery(self) -> bool:
        """Check if BigQuery ML is available."""
        try:
            from google.cloud import bigquery
            return True
        except ImportError:
            return False

    def _check_prophet(self) -> bool:
        """Check if Prophet is available."""
        try:
            from prophet import Prophet
            return True
        except ImportError:
            return False

    async def forecast_spend(
        self,
        ad_account_id: str,
        historical_data: List[Dict[str, Any]],
        horizon_days: int = 30,
        confidence_interval: float = 0.95
    ) -> ForecastResult:
        """
        Forecast future spend.

        Args:
            ad_account_id: Account to forecast
            historical_data: List of {date, spend} dicts
            horizon_days: Days to forecast
            confidence_interval: Confidence level (0-1)

        Returns:
            ForecastResult with predictions
        """
        if self.backend == ForecastBackend.BIGQUERY_ML:
            return await self._forecast_bigquery(
                historical_data, "spend", horizon_days, confidence_interval
            )
        elif self.backend == ForecastBackend.PROPHET:
            return await self._forecast_prophet(
                historical_data, "spend", horizon_days, confidence_interval
            )
        else:
            return await self._forecast_local(
                historical_data, "spend", horizon_days, confidence_interval
            )

    async def forecast_conversions(
        self,
        ad_account_id: str,
        historical_data: List[Dict[str, Any]],
        horizon_days: int = 30,
        confidence_interval: float = 0.95
    ) -> ForecastResult:
        """Forecast future conversions."""
        if self.backend == ForecastBackend.BIGQUERY_ML:
            return await self._forecast_bigquery(
                historical_data, "conversions", horizon_days, confidence_interval
            )
        elif self.backend == ForecastBackend.PROPHET:
            return await self._forecast_prophet(
                historical_data, "conversions", horizon_days, confidence_interval
            )
        else:
            return await self._forecast_local(
                historical_data, "conversions", horizon_days, confidence_interval
            )

    async def forecast_roas(
        self,
        ad_account_id: str,
        historical_data: List[Dict[str, Any]],
        horizon_days: int = 30,
        confidence_interval: float = 0.95
    ) -> ForecastResult:
        """Forecast future ROAS."""
        return await self._forecast_local(
            historical_data, "roas", horizon_days, confidence_interval
        )

    async def _forecast_bigquery(
        self,
        data: List[Dict[str, Any]],
        metric: str,
        horizon: int,
        confidence: float
    ) -> ForecastResult:
        """
        Use BigQuery ML ARIMA_PLUS for forecasting.

        Creates/updates model and generates predictions.
        """
        try:
            from google.cloud import bigquery

            client = bigquery.Client(project=self.gcp_project)

            # Create temporary table with historical data
            table_id = f"{self.gcp_project}.{self.bigquery_dataset}.temp_forecast_{metric}"

            # Define schema
            schema = [
                bigquery.SchemaField("date", "DATE"),
                bigquery.SchemaField("value", "FLOAT64"),
            ]

            # Create/replace table
            table = bigquery.Table(table_id, schema=schema)
            table = client.create_table(table, exists_ok=True)

            # Insert data
            rows = [{"date": d["date"], "value": d[metric]} for d in data]
            client.insert_rows_json(table_id, rows)

            # Create ARIMA_PLUS model
            model_id = f"{self.gcp_project}.{self.bigquery_dataset}.arima_{metric}"
            create_model_sql = f"""
            CREATE OR REPLACE MODEL `{model_id}`
            OPTIONS(
                MODEL_TYPE='ARIMA_PLUS',
                TIME_SERIES_TIMESTAMP_COL='date',
                TIME_SERIES_DATA_COL='value',
                AUTO_ARIMA=TRUE,
                DATA_FREQUENCY='DAILY'
            ) AS
            SELECT date, value FROM `{table_id}`
            """
            client.query(create_model_sql).result()

            # Generate forecast
            forecast_sql = f"""
            SELECT
                forecast_timestamp AS date,
                forecast_value AS value,
                prediction_interval_lower_bound AS lower_bound,
                prediction_interval_upper_bound AS upper_bound
            FROM ML.FORECAST(
                MODEL `{model_id}`,
                STRUCT({horizon} AS horizon, {confidence} AS confidence_level)
            )
            ORDER BY forecast_timestamp
            """
            result = client.query(forecast_sql).result()

            predictions = [
                {
                    "date": row.date.isoformat(),
                    "value": row.value,
                    "lower_bound": row.lower_bound,
                    "upper_bound": row.upper_bound,
                }
                for row in result
            ]

            return ForecastResult(
                metric=metric,
                predictions=predictions,
                confidence_interval=confidence,
                model_used="BigQuery ML ARIMA_PLUS",
                training_data_points=len(data),
            )

        except Exception as e:
            # Fallback to local
            print(f"BigQuery ML error: {e}, falling back to local")
            return await self._forecast_local(data, metric, horizon, confidence)

    async def _forecast_prophet(
        self,
        data: List[Dict[str, Any]],
        metric: str,
        horizon: int,
        confidence: float
    ) -> ForecastResult:
        """
        Use Meta Prophet for forecasting.
        """
        try:
            from prophet import Prophet
            import pandas as pd

            # Prepare data for Prophet
            df = pd.DataFrame(data)
            df = df.rename(columns={"date": "ds", metric: "y"})
            df["ds"] = pd.to_datetime(df["ds"])

            # Create and fit model
            model = Prophet(
                interval_width=confidence,
                daily_seasonality=True,
                weekly_seasonality=True,
                yearly_seasonality=True
            )
            model.fit(df)

            # Generate forecast
            future = model.make_future_dataframe(periods=horizon)
            forecast = model.predict(future)

            # Get only future predictions
            future_forecast = forecast.tail(horizon)

            predictions = [
                {
                    "date": row["ds"].strftime("%Y-%m-%d"),
                    "value": row["yhat"],
                    "lower_bound": row["yhat_lower"],
                    "upper_bound": row["yhat_upper"],
                }
                for _, row in future_forecast.iterrows()
            ]

            return ForecastResult(
                metric=metric,
                predictions=predictions,
                confidence_interval=confidence,
                model_used="Prophet",
                training_data_points=len(data),
            )

        except Exception as e:
            print(f"Prophet error: {e}, falling back to local")
            return await self._forecast_local(data, metric, horizon, confidence)

    async def _forecast_local(
        self,
        data: List[Dict[str, Any]],
        metric: str,
        horizon: int,
        confidence: float
    ) -> ForecastResult:
        """
        Simple local forecasting using statistical methods.

        Uses exponential smoothing and moving averages.
        Good for development/demo, not production accuracy.
        """
        if not data:
            return ForecastResult(
                metric=metric,
                predictions=[],
                confidence_interval=confidence,
                model_used="Local (no data)",
                training_data_points=0,
            )

        # Extract values
        values = [d.get(metric, 0) for d in data]

        # Calculate statistics
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        std_dev = variance ** 0.5

        # Simple trend calculation
        if len(values) >= 7:
            recent_avg = sum(values[-7:]) / 7
            older_avg = sum(values[:7]) / 7 if len(values) >= 14 else mean
            daily_trend = (recent_avg - older_avg) / 7
        else:
            daily_trend = 0

        # Generate predictions with trend
        last_date = datetime.strptime(data[-1]["date"], "%Y-%m-%d")
        last_value = values[-1]

        predictions = []
        for i in range(1, horizon + 1):
            pred_date = last_date + timedelta(days=i)
            pred_value = max(0, last_value + (daily_trend * i))  # Apply trend

            # Confidence bounds based on std dev
            z_score = 1.96 if confidence >= 0.95 else 1.645  # 95% or 90%
            margin = z_score * std_dev * (1 + i * 0.05)  # Widen over time

            predictions.append({
                "date": pred_date.strftime("%Y-%m-%d"),
                "value": round(pred_value, 2),
                "lower_bound": round(max(0, pred_value - margin), 2),
                "upper_bound": round(pred_value + margin, 2),
            })

        return ForecastResult(
            metric=metric,
            predictions=predictions,
            confidence_interval=confidence,
            model_used="Local Statistical",
            training_data_points=len(data),
        )


# Demo forecasts for testing
def get_demo_forecasts() -> Dict[str, ForecastResult]:
    """Get demo forecasts for UI development."""
    today = datetime.now()

    spend_predictions = []
    conv_predictions = []

    for i in range(30):
        date = (today + timedelta(days=i+1)).strftime("%Y-%m-%d")
        base_spend = 320 + (i * 2)  # Slight upward trend
        base_conv = 22 + (i * 0.3)

        spend_predictions.append({
            "date": date,
            "value": base_spend,
            "lower_bound": base_spend * 0.85,
            "upper_bound": base_spend * 1.15,
        })
        conv_predictions.append({
            "date": date,
            "value": base_conv,
            "lower_bound": base_conv * 0.8,
            "upper_bound": base_conv * 1.2,
        })

    return {
        "spend": ForecastResult(
            metric="spend",
            predictions=spend_predictions,
            confidence_interval=0.95,
            model_used="Demo",
            training_data_points=90,
            mape=8.5,
        ),
        "conversions": ForecastResult(
            metric="conversions",
            predictions=conv_predictions,
            confidence_interval=0.95,
            model_used="Demo",
            training_data_points=90,
            mape=12.3,
        ),
    }
