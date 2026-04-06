"""
ML API Endpoints - Forecasting, Anomaly Detection, Predictions.

Endpoints:
- GET /api/v1/ml/forecast/spend - Spend forecasting
- GET /api/v1/ml/forecast/conversions - Conversion forecasting
- GET /api/v1/ml/anomalies - Detect anomalies
- POST /api/v1/ml/predict/keywords - Keyword conversion prediction
- POST /api/v1/ml/classify/search-terms - Search term classification
- GET /api/v1/ml/status - ML services status
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import asdict
import os

from app.api.user_auth import get_current_user
from app.services.ml import (
    get_bigquery_ml_service,
    get_vertex_ai_service,
    get_demo_forecasts,
    get_demo_anomalies,
)

router = APIRouter(prefix="/api/v1/ml", tags=["ML"])


# =============================================================================
# STATUS
# =============================================================================

@router.get("/status")
async def get_ml_status():
    """
    Get status of ML services.

    Returns which backends are available and configured.
    """
    gcp_project = os.getenv("GCP_PROJECT_ID")
    bq_dataset = os.getenv("BIGQUERY_DATASET", "adsmaster_ml")

    # Check BigQuery ML
    bqml_status = "not_configured"
    if gcp_project:
        try:
            bqml = get_bigquery_ml_service()
            if bqml._ensure_initialized():
                bqml_status = "connected"
            else:
                bqml_status = "connection_failed"
        except Exception as e:
            bqml_status = f"error: {str(e)}"

    # Check Vertex AI
    vertex_status = "not_configured"
    if gcp_project:
        try:
            vertex = get_vertex_ai_service()
            if vertex._ensure_initialized():
                vertex_status = "connected"
            else:
                vertex_status = "connection_failed"
        except Exception as e:
            vertex_status = f"error: {str(e)}"

    return {
        "gcp_project": gcp_project or "not_set",
        "bigquery_dataset": bq_dataset,
        "services": {
            "bigquery_ml": bqml_status,
            "vertex_ai": vertex_status,
            "local_fallback": "available",
        },
        "features": {
            "spend_forecast": bqml_status == "connected" or "local_fallback",
            "conversion_forecast": bqml_status == "connected" or "local_fallback",
            "anomaly_detection": bqml_status == "connected" or "local_fallback",
            "keyword_prediction": vertex_status == "connected" or "local_heuristic",
            "search_term_classification": vertex_status == "connected" or "local_heuristic",
        }
    }


# =============================================================================
# FORECASTING
# =============================================================================

@router.get("/forecast/spend")
async def forecast_spend(
    campaign_id: Optional[str] = Query(None, description="Optional campaign ID"),
    horizon_days: int = Query(30, ge=1, le=90, description="Days to forecast"),
    confidence: float = Query(0.95, ge=0.5, le=0.99, description="Confidence interval"),
    current_user: dict = Depends(get_current_user)
):
    """
    Forecast future ad spend.

    Uses BigQuery ML ARIMA_PLUS when available, falls back to statistical methods.

    Returns daily predictions with confidence intervals.
    """
    try:
        bqml = get_bigquery_ml_service()

        # For now, use demo data for historical (in production, query from DB)
        # This would normally come from the metrics_daily table
        historical_data = _generate_demo_historical_data("spend", days=90)

        result = await bqml.forecast_spend(
            campaign_id=campaign_id,
            historical_data=historical_data,
            horizon_days=horizon_days,
            confidence=confidence
        )

        return {
            "data": {
                "metric": result.metric,
                "campaign_id": result.campaign_id,
                "predictions": [asdict(p) for p in result.predictions],
                "model_info": result.model_info,
                "generated_at": result.generated_at,
            },
            "error": None
        }

    except Exception as e:
        # Fallback to demo forecasts
        demo = get_demo_forecasts()
        return {
            "data": {
                "metric": "spend",
                "predictions": demo["spend"].predictions[:horizon_days],
                "model_info": {"type": "demo", "error": str(e)},
            },
            "error": None
        }


@router.get("/forecast/conversions")
async def forecast_conversions(
    campaign_id: Optional[str] = Query(None, description="Optional campaign ID"),
    horizon_days: int = Query(30, ge=1, le=90, description="Days to forecast"),
    confidence: float = Query(0.95, ge=0.5, le=0.99, description="Confidence interval"),
    current_user: dict = Depends(get_current_user)
):
    """
    Forecast future conversions.

    Uses BigQuery ML when available, falls back to statistical methods.
    """
    try:
        bqml = get_bigquery_ml_service()

        historical_data = _generate_demo_historical_data("conversions", days=90)

        result = await bqml.forecast_conversions(
            campaign_id=campaign_id,
            historical_data=historical_data,
            horizon_days=horizon_days,
            confidence=confidence
        )

        return {
            "data": {
                "metric": result.metric,
                "campaign_id": result.campaign_id,
                "predictions": [asdict(p) for p in result.predictions],
                "model_info": result.model_info,
                "generated_at": result.generated_at,
            },
            "error": None
        }

    except Exception as e:
        demo = get_demo_forecasts()
        return {
            "data": {
                "metric": "conversions",
                "predictions": demo["conversions"].predictions[:horizon_days],
                "model_info": {"type": "demo", "error": str(e)},
            },
            "error": None
        }


# =============================================================================
# ANOMALY DETECTION
# =============================================================================

@router.get("/anomalies")
async def detect_anomalies(
    metrics: str = Query("spend,conversions,ctr,cpc", description="Comma-separated metrics to check"),
    threshold: float = Query(0.95, ge=0.5, le=0.99, description="Anomaly probability threshold"),
    current_user: dict = Depends(get_current_user)
):
    """
    Detect anomalies in recent metrics.

    Analyzes metrics for unusual patterns and returns detected anomalies
    with severity levels and recommendations.
    """
    try:
        bqml = get_bigquery_ml_service()
        metrics_to_check = [m.strip() for m in metrics.split(",")]

        # Generate demo historical data (in production, query from DB)
        historical_data = _generate_demo_historical_data("all", days=30)

        anomalies = await bqml.detect_anomalies(
            metrics_data=historical_data,
            metrics_to_check=metrics_to_check,
            threshold=threshold
        )

        return {
            "data": {
                "anomalies": [asdict(a) for a in anomalies],
                "metrics_checked": metrics_to_check,
                "threshold": threshold,
                "generated_at": datetime.utcnow().isoformat(),
            },
            "error": None
        }

    except Exception as e:
        # Fallback to demo anomalies
        demo = get_demo_anomalies()
        return {
            "data": {
                "anomalies": [
                    {
                        "campaign_id": a.affected_entity.get("campaign_id", "") if a.affected_entity else "",
                        "metric": a.metric,
                        "timestamp": a.timestamp.isoformat(),
                        "actual_value": a.actual_value,
                        "expected_value": a.expected_value,
                        "is_anomaly": True,
                        "anomaly_probability": 0.95,
                    }
                    for a in demo
                ],
                "model_info": {"type": "demo", "error": str(e)},
            },
            "error": None
        }


# =============================================================================
# PREDICTIONS (Vertex AI)
# =============================================================================

@router.post("/predict/keywords")
async def predict_keyword_conversion(
    keywords: List[Dict[str, Any]],
    current_user: dict = Depends(get_current_user)
):
    """
    Predict conversion probability for keywords.

    Uses Vertex AI AutoML when available, falls back to heuristic scoring.

    Input:
    ```json
    [
        {
            "id": "kw_123",
            "text": "buy shoes online",
            "quality_score": 7,
            "ctr": 0.025,
            "cvr": 0.015,
            "avg_cpc": 1.50,
            "impressions": 5000,
            "clicks": 125
        }
    ]
    ```

    Returns conversion probability (0-1) and classification.
    """
    if not keywords:
        raise HTTPException(status_code=400, detail="No keywords provided")

    try:
        vertex = get_vertex_ai_service()
        results = await vertex.predict_conversion_probability(keywords)

        return {
            "data": {
                "predictions": [asdict(r) for r in results],
                "count": len(results),
                "generated_at": datetime.utcnow().isoformat(),
            },
            "error": None
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classify/search-terms")
async def classify_search_terms(
    search_terms: List[Dict[str, str]],
    current_user: dict = Depends(get_current_user)
):
    """
    Classify search term relevance.

    Uses Vertex AI when available, falls back to text similarity heuristics.

    Input:
    ```json
    [
        {
            "search_term": "cheap running shoes",
            "matched_keyword": "running shoes",
            "campaign_context": "Footwear sales"
        }
    ]
    ```

    Returns:
    - highly_relevant: Add as exact match keyword
    - relevant: Add as phrase match keyword
    - somewhat_relevant: Monitor
    - irrelevant: Add as negative keyword
    """
    if not search_terms:
        raise HTTPException(status_code=400, detail="No search terms provided")

    try:
        vertex = get_vertex_ai_service()
        results = await vertex.classify_search_terms(search_terms)

        return {
            "data": {
                "classifications": [asdict(r) for r in results],
                "count": len(results),
                "generated_at": datetime.utcnow().isoformat(),
            },
            "error": None
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# DEMO ENDPOINTS (No Auth)
# =============================================================================

@router.get("/demo/forecast")
async def demo_forecast():
    """
    Get demo forecasts for UI development.

    No authentication required.
    """
    forecasts = get_demo_forecasts()

    return {
        "data": {
            "spend": {
                "metric": "spend",
                "predictions": forecasts["spend"].predictions,
                "model_info": {"type": "demo"},
            },
            "conversions": {
                "metric": "conversions",
                "predictions": forecasts["conversions"].predictions,
                "model_info": {"type": "demo"},
            },
        },
        "demo_mode": True,
        "error": None
    }


@router.get("/demo/anomalies")
async def demo_anomalies():
    """
    Get demo anomalies for UI development.

    No authentication required.
    """
    anomalies = get_demo_anomalies()

    return {
        "data": {
            "anomalies": [
                {
                    "id": a.id,
                    "metric": a.metric,
                    "type": a.type.value,
                    "severity": a.severity.value,
                    "timestamp": a.timestamp.isoformat(),
                    "actual_value": a.actual_value,
                    "expected_value": a.expected_value,
                    "deviation_pct": a.deviation_pct,
                    "description": a.description,
                    "affected_entity": a.affected_entity,
                }
                for a in anomalies
            ],
        },
        "demo_mode": True,
        "error": None
    }


# =============================================================================
# HELPERS
# =============================================================================

def _generate_demo_historical_data(metric: str, days: int = 90) -> List[Dict[str, Any]]:
    """Generate demo historical data for testing."""
    import random

    data = []
    today = datetime.now()

    for i in range(days, 0, -1):
        date = today - timedelta(days=i)
        base_spend = 300 + random.uniform(-30, 30)
        base_conv = 20 + random.uniform(-5, 5)

        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "spend": round(base_spend + (days - i) * 0.5, 2),  # Slight upward trend
            "conversions": round(base_conv + (days - i) * 0.1, 1),
            "clicks": int(500 + random.uniform(-50, 50)),
            "impressions": int(10000 + random.uniform(-1000, 1000)),
            "ctr": round(0.05 + random.uniform(-0.01, 0.01), 4),
            "cpc": round(0.6 + random.uniform(-0.1, 0.1), 2),
        })

    return data
