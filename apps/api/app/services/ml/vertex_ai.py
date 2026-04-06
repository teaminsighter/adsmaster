"""
Vertex AI Service - Advanced ML predictions using Google Cloud.

Provides:
- Conversion prediction (AutoML Tabular)
- Search term classification
- Custom model inference
- Model training jobs
"""

import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import warnings

warnings.filterwarnings("ignore")


@dataclass
class PredictionResult:
    """Result from a Vertex AI prediction."""
    entity_id: str
    prediction: float
    confidence: float
    label: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class TrainingJobResult:
    """Result from a model training job."""
    job_id: str
    model_name: str
    status: str
    metrics: Optional[Dict[str, float]] = None
    created_at: datetime = None


class VertexAIService:
    """
    Vertex AI integration for advanced ML predictions.

    Handles:
    - Model deployment and inference
    - AutoML tabular predictions
    - Custom model training
    - Batch predictions
    """

    def __init__(
        self,
        project_id: Optional[str] = None,
        location: Optional[str] = None
    ):
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID")
        self.location = location or os.getenv("GCP_LOCATION", "us-central1")
        self._initialized = False
        self._aiplatform = None

    def _ensure_initialized(self):
        """Lazy initialization of Vertex AI."""
        if self._initialized:
            return True

        if not self.project_id:
            print("Vertex AI: No GCP_PROJECT_ID configured, using local fallback")
            return False

        try:
            from google.cloud import aiplatform
            aiplatform.init(
                project=self.project_id,
                location=self.location
            )
            self._aiplatform = aiplatform
            self._initialized = True
            return True
        except ImportError:
            print("Vertex AI: google-cloud-aiplatform not installed")
            return False
        except Exception as e:
            print(f"Vertex AI initialization error: {e}")
            return False

    # =========================================================================
    # CONVERSION PREDICTION
    # =========================================================================

    async def predict_conversion_probability(
        self,
        keywords: List[Dict[str, Any]],
        endpoint_name: Optional[str] = None
    ) -> List[PredictionResult]:
        """
        Predict conversion probability for keywords.

        Uses AutoML Tabular model trained on historical keyword performance.
        Falls back to heuristic scoring if Vertex AI not available.

        Args:
            keywords: List of keyword data with features:
                - quality_score, ctr, cvr, avg_cpc, impressions, clicks
            endpoint_name: Optional specific endpoint to use

        Returns:
            List of PredictionResult with conversion probabilities
        """
        if not self._ensure_initialized():
            # Fallback: Use heuristic scoring
            return self._heuristic_conversion_score(keywords)

        try:
            # Get or create endpoint
            endpoint = self._get_endpoint(endpoint_name or "keyword_conversion")
            if not endpoint:
                return self._heuristic_conversion_score(keywords)

            # Prepare instances for prediction
            instances = [
                {
                    "quality_score": kw.get("quality_score", 5),
                    "ctr": kw.get("ctr", 0.02),
                    "historical_cvr": kw.get("cvr", 0.01),
                    "avg_cpc": kw.get("avg_cpc", 1.0),
                    "impressions": kw.get("impressions", 0),
                    "clicks": kw.get("clicks", 0),
                    "keyword_length": len(kw.get("text", "")),
                    "word_count": len(kw.get("text", "").split()),
                }
                for kw in keywords
            ]

            # Get predictions
            predictions = endpoint.predict(instances=instances)

            results = []
            for kw, pred in zip(keywords, predictions.predictions):
                results.append(PredictionResult(
                    entity_id=kw.get("id", ""),
                    prediction=pred.get("scores", [0, 0])[1],  # Probability of conversion
                    confidence=max(pred.get("scores", [0.5])),
                    label="high_potential" if pred.get("scores", [0, 0])[1] > 0.5 else "low_potential",
                ))

            return results

        except Exception as e:
            print(f"Vertex AI prediction error: {e}")
            return self._heuristic_conversion_score(keywords)

    def _heuristic_conversion_score(
        self,
        keywords: List[Dict[str, Any]]
    ) -> List[PredictionResult]:
        """
        Fallback heuristic scoring when Vertex AI not available.

        Scoring factors:
        - Quality score (0-10) → 30% weight
        - Historical CVR → 25% weight
        - CTR → 20% weight
        - Impression volume → 15% weight
        - CPC efficiency → 10% weight
        """
        results = []

        for kw in keywords:
            # Normalize factors to 0-1 range
            qs_score = kw.get("quality_score", 5) / 10
            cvr = min(kw.get("cvr", 0.01), 0.1) / 0.1  # Cap at 10% CVR
            ctr = min(kw.get("ctr", 0.02), 0.1) / 0.1  # Cap at 10% CTR
            impressions = min(kw.get("impressions", 0), 10000) / 10000
            cpc = 1 - min(kw.get("avg_cpc", 1.0), 5.0) / 5.0  # Lower is better

            # Weighted score
            score = (
                qs_score * 0.30 +
                cvr * 0.25 +
                ctr * 0.20 +
                impressions * 0.15 +
                cpc * 0.10
            )

            results.append(PredictionResult(
                entity_id=kw.get("id", ""),
                prediction=score,
                confidence=0.7,  # Lower confidence for heuristic
                label="high_potential" if score > 0.5 else "low_potential",
                metadata={"method": "heuristic"}
            ))

        return results

    # =========================================================================
    # SEARCH TERM CLASSIFICATION
    # =========================================================================

    async def classify_search_terms(
        self,
        search_terms: List[Dict[str, str]],
        endpoint_name: Optional[str] = None
    ) -> List[PredictionResult]:
        """
        Classify search term relevance.

        Categories:
        - highly_relevant: Add as exact match keyword
        - relevant: Add as phrase match keyword
        - somewhat_relevant: Monitor
        - irrelevant: Add as negative keyword

        Args:
            search_terms: List of {search_term, matched_keyword, campaign_context}

        Returns:
            List of PredictionResult with relevance classification
        """
        if not self._ensure_initialized():
            return self._heuristic_search_term_classification(search_terms)

        try:
            endpoint = self._get_endpoint(endpoint_name or "search_term_classifier")
            if not endpoint:
                return self._heuristic_search_term_classification(search_terms)

            predictions = endpoint.predict(instances=search_terms)

            results = []
            for st, pred in zip(search_terms, predictions.predictions):
                label = pred.get("class", "somewhat_relevant")
                score = pred.get("score", 0.5)

                results.append(PredictionResult(
                    entity_id=st.get("search_term", ""),
                    prediction=score,
                    confidence=pred.get("confidence", 0.7),
                    label=label,
                    metadata={"suggestion": self._get_suggestion(label)}
                ))

            return results

        except Exception as e:
            print(f"Search term classification error: {e}")
            return self._heuristic_search_term_classification(search_terms)

    def _heuristic_search_term_classification(
        self,
        search_terms: List[Dict[str, str]]
    ) -> List[PredictionResult]:
        """
        Fallback heuristic classification based on text similarity.
        """
        results = []

        for st in search_terms:
            search_term = st.get("search_term", "").lower()
            matched_keyword = st.get("matched_keyword", "").lower()

            # Simple word overlap scoring
            st_words = set(search_term.split())
            kw_words = set(matched_keyword.split())

            if not st_words or not kw_words:
                score = 0.5
            else:
                overlap = len(st_words & kw_words)
                score = overlap / max(len(st_words), len(kw_words))

            # Classify based on score
            if score >= 0.8:
                label = "highly_relevant"
            elif score >= 0.5:
                label = "relevant"
            elif score >= 0.3:
                label = "somewhat_relevant"
            else:
                label = "irrelevant"

            results.append(PredictionResult(
                entity_id=search_term,
                prediction=score,
                confidence=0.6,
                label=label,
                metadata={
                    "suggestion": self._get_suggestion(label),
                    "method": "heuristic"
                }
            ))

        return results

    def _get_suggestion(self, label: str) -> str:
        """Get action suggestion based on classification."""
        suggestions = {
            "highly_relevant": "add_as_exact_keyword",
            "relevant": "add_as_phrase_keyword",
            "somewhat_relevant": "monitor",
            "irrelevant": "add_as_negative"
        }
        return suggestions.get(label, "monitor")

    # =========================================================================
    # MODEL MANAGEMENT
    # =========================================================================

    def _get_endpoint(self, display_name: str):
        """Get Vertex AI endpoint by display name."""
        if not self._aiplatform:
            return None

        try:
            endpoints = self._aiplatform.Endpoint.list(
                filter=f'display_name="{display_name}"'
            )
            return endpoints[0] if endpoints else None
        except Exception as e:
            print(f"Error getting endpoint {display_name}: {e}")
            return None

    async def create_training_job(
        self,
        model_type: str,
        training_data_uri: str,
        target_column: str,
        display_name: Optional[str] = None
    ) -> TrainingJobResult:
        """
        Create an AutoML training job.

        Args:
            model_type: 'classification' or 'regression'
            training_data_uri: BigQuery table or GCS path
            target_column: Column to predict
            display_name: Optional name for the model

        Returns:
            TrainingJobResult with job status
        """
        if not self._ensure_initialized():
            return TrainingJobResult(
                job_id="local_fallback",
                model_name=display_name or "local_model",
                status="not_available",
                created_at=datetime.utcnow()
            )

        try:
            # Create dataset
            if training_data_uri.startswith("bq://"):
                dataset = self._aiplatform.TabularDataset.create(
                    display_name=f"{display_name}_dataset",
                    bq_source=training_data_uri
                )
            else:
                dataset = self._aiplatform.TabularDataset.create(
                    display_name=f"{display_name}_dataset",
                    gcs_source=training_data_uri
                )

            # Create training job
            if model_type == "classification":
                job = self._aiplatform.AutoMLTabularTrainingJob(
                    display_name=display_name or f"training_{datetime.utcnow().strftime('%Y%m%d')}",
                    optimization_prediction_type="classification",
                    optimization_objective="maximize-au-prc"
                )
            else:
                job = self._aiplatform.AutoMLTabularTrainingJob(
                    display_name=display_name or f"training_{datetime.utcnow().strftime('%Y%m%d')}",
                    optimization_prediction_type="regression",
                    optimization_objective="minimize-rmse"
                )

            # Run training (async)
            model = job.run(
                dataset=dataset,
                target_column=target_column,
                training_fraction_split=0.8,
                validation_fraction_split=0.1,
                test_fraction_split=0.1,
                model_display_name=display_name,
                sync=False  # Don't block
            )

            return TrainingJobResult(
                job_id=job.resource_name,
                model_name=display_name,
                status="running",
                created_at=datetime.utcnow()
            )

        except Exception as e:
            print(f"Training job creation error: {e}")
            return TrainingJobResult(
                job_id="error",
                model_name=display_name,
                status=f"error: {str(e)}",
                created_at=datetime.utcnow()
            )

    async def get_model_metrics(
        self,
        model_name: str
    ) -> Dict[str, Any]:
        """Get evaluation metrics for a deployed model."""
        if not self._ensure_initialized():
            return {"status": "vertex_ai_not_available"}

        try:
            models = self._aiplatform.Model.list(
                filter=f'display_name="{model_name}"'
            )

            if not models:
                return {"status": "model_not_found"}

            model = models[0]
            evaluations = model.list_model_evaluations()

            if not evaluations:
                return {"status": "no_evaluations"}

            eval_data = evaluations[0]
            return {
                "status": "ok",
                "model_name": model_name,
                "metrics": eval_data.metrics,
                "create_time": model.create_time.isoformat(),
            }

        except Exception as e:
            return {"status": f"error: {str(e)}"}


# Singleton instance
_vertex_ai_service: Optional[VertexAIService] = None

def get_vertex_ai_service() -> VertexAIService:
    """Get or create Vertex AI service singleton."""
    global _vertex_ai_service
    if _vertex_ai_service is None:
        _vertex_ai_service = VertexAIService()
    return _vertex_ai_service
