"""
ML Services - Forecasting, Anomaly Detection, Classification.

Supports multiple backends:
- BigQuery ML (ARIMA_PLUS for time series)
- Vertex AI (AutoML, custom models)
- Prophet (Meta's forecasting library)
- Local fallback (statistical methods)
"""

from .forecasting import ForecastingService, ForecastResult, get_demo_forecasts
from .anomaly import AnomalyDetectionService, Anomaly, AnomalySeverity, AnomalyType, get_demo_anomalies
from .classification import ClassificationService
from .vertex_ai import VertexAIService, PredictionResult, get_vertex_ai_service
from .bigquery_ml import BigQueryMLService, get_bigquery_ml_service

__all__ = [
    # Forecasting
    "ForecastingService",
    "ForecastResult",
    "get_demo_forecasts",

    # Anomaly Detection
    "AnomalyDetectionService",
    "Anomaly",
    "AnomalySeverity",
    "AnomalyType",
    "get_demo_anomalies",

    # Classification
    "ClassificationService",

    # Vertex AI
    "VertexAIService",
    "PredictionResult",
    "get_vertex_ai_service",

    # BigQuery ML
    "BigQueryMLService",
    "get_bigquery_ml_service",
]
