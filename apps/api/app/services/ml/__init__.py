"""
ML Services - Forecasting, Anomaly Detection, Classification.

Supports multiple backends:
- BigQuery ML (ARIMA_PLUS for time series)
- Vertex AI (AutoML, custom models)
- Prophet (Meta's forecasting library)
- Local fallback (statistical methods)
"""

from .forecasting import ForecastingService, ForecastResult
from .anomaly import AnomalyDetectionService, Anomaly
from .classification import ClassificationService

__all__ = [
    "ForecastingService",
    "ForecastResult",
    "AnomalyDetectionService",
    "Anomaly",
    "ClassificationService",
]
