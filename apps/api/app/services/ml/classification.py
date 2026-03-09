"""
Classification Service - ML-powered classification tasks.

Supports:
- Search term relevance classification
- Keyword intent classification
- Ad performance prediction
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import os


class RelevanceScore(str, Enum):
    """Search term relevance levels."""
    HIGHLY_RELEVANT = "highly_relevant"
    RELEVANT = "relevant"
    SOMEWHAT_RELEVANT = "somewhat_relevant"
    NOT_RELEVANT = "not_relevant"
    NEGATIVE = "negative"  # Should be added as negative keyword


class IntentCategory(str, Enum):
    """Search intent categories."""
    TRANSACTIONAL = "transactional"   # Ready to buy
    COMMERCIAL = "commercial"          # Researching to buy
    INFORMATIONAL = "informational"    # Seeking information
    NAVIGATIONAL = "navigational"      # Looking for specific site


@dataclass
class ClassificationResult:
    """Result of a classification prediction."""
    input_text: str
    label: str
    confidence: float
    all_scores: Dict[str, float]


class ClassificationService:
    """
    ML-powered classification for ad optimization.
    """

    def __init__(
        self,
        gcp_project: Optional[str] = None,
        use_vertex_ai: bool = False
    ):
        self.gcp_project = gcp_project or os.getenv("GCP_PROJECT_ID")
        self.use_vertex_ai = use_vertex_ai and bool(self.gcp_project)

    async def classify_search_terms(
        self,
        search_terms: List[str],
        target_keywords: List[str],
        product_context: Optional[str] = None
    ) -> List[ClassificationResult]:
        """
        Classify search terms for relevance to target keywords.

        Args:
            search_terms: List of search terms to classify
            target_keywords: Target keywords for comparison
            product_context: Optional product/business description

        Returns:
            List of classification results
        """
        results = []

        for term in search_terms:
            # Simple rule-based classification for demo
            # In production, use Vertex AI Text Classification
            relevance, confidence, scores = self._classify_relevance(
                term, target_keywords, product_context
            )

            results.append(ClassificationResult(
                input_text=term,
                label=relevance.value,
                confidence=confidence,
                all_scores=scores,
            ))

        return results

    def _classify_relevance(
        self,
        search_term: str,
        target_keywords: List[str],
        product_context: Optional[str]
    ) -> Tuple[RelevanceScore, float, Dict[str, float]]:
        """Rule-based relevance classification."""
        term_lower = search_term.lower()
        keywords_lower = [k.lower() for k in target_keywords]

        # Check for negative indicators
        negative_words = ["free", "cheap", "diy", "how to", "tutorial", "download", "torrent"]
        if any(neg in term_lower for neg in negative_words):
            return RelevanceScore.NEGATIVE, 0.85, {
                "highly_relevant": 0.02,
                "relevant": 0.03,
                "somewhat_relevant": 0.10,
                "not_relevant": 0.0,
                "negative": 0.85,
            }

        # Check for exact match
        if any(term_lower == kw for kw in keywords_lower):
            return RelevanceScore.HIGHLY_RELEVANT, 0.95, {
                "highly_relevant": 0.95,
                "relevant": 0.04,
                "somewhat_relevant": 0.01,
                "not_relevant": 0.0,
                "negative": 0.0,
            }

        # Check for keyword containment
        term_words = set(term_lower.split())
        for kw in keywords_lower:
            kw_words = set(kw.split())
            overlap = len(term_words & kw_words)
            if overlap >= len(kw_words) * 0.5:
                return RelevanceScore.RELEVANT, 0.80, {
                    "highly_relevant": 0.15,
                    "relevant": 0.80,
                    "somewhat_relevant": 0.05,
                    "not_relevant": 0.0,
                    "negative": 0.0,
                }

        # Check for partial relevance
        any_overlap = any(
            len(term_words & set(kw.split())) > 0
            for kw in keywords_lower
        )
        if any_overlap:
            return RelevanceScore.SOMEWHAT_RELEVANT, 0.65, {
                "highly_relevant": 0.05,
                "relevant": 0.25,
                "somewhat_relevant": 0.65,
                "not_relevant": 0.05,
                "negative": 0.0,
            }

        # No relevance
        return RelevanceScore.NOT_RELEVANT, 0.70, {
            "highly_relevant": 0.0,
            "relevant": 0.05,
            "somewhat_relevant": 0.25,
            "not_relevant": 0.70,
            "negative": 0.0,
        }

    async def classify_keyword_intent(
        self,
        keywords: List[str]
    ) -> List[ClassificationResult]:
        """
        Classify keywords by search intent.

        Args:
            keywords: List of keywords to classify

        Returns:
            List of classification results with intent labels
        """
        results = []

        for keyword in keywords:
            intent, confidence, scores = self._classify_intent(keyword)

            results.append(ClassificationResult(
                input_text=keyword,
                label=intent.value,
                confidence=confidence,
                all_scores=scores,
            ))

        return results

    def _classify_intent(
        self,
        keyword: str
    ) -> Tuple[IntentCategory, float, Dict[str, float]]:
        """Rule-based intent classification."""
        kw_lower = keyword.lower()

        # Transactional indicators
        transactional_words = [
            "buy", "purchase", "order", "shop", "deal", "discount",
            "coupon", "price", "cost", "cheap", "affordable", "sale"
        ]
        if any(word in kw_lower for word in transactional_words):
            return IntentCategory.TRANSACTIONAL, 0.85, {
                "transactional": 0.85,
                "commercial": 0.10,
                "informational": 0.04,
                "navigational": 0.01,
            }

        # Commercial indicators
        commercial_words = [
            "best", "top", "review", "compare", "vs", "versus",
            "alternative", "recommendation", "which"
        ]
        if any(word in kw_lower for word in commercial_words):
            return IntentCategory.COMMERCIAL, 0.80, {
                "transactional": 0.15,
                "commercial": 0.80,
                "informational": 0.04,
                "navigational": 0.01,
            }

        # Informational indicators
        informational_words = [
            "how", "what", "why", "when", "who", "guide", "tutorial",
            "learn", "example", "definition", "meaning"
        ]
        if any(word in kw_lower for word in informational_words):
            return IntentCategory.INFORMATIONAL, 0.80, {
                "transactional": 0.05,
                "commercial": 0.10,
                "informational": 0.80,
                "navigational": 0.05,
            }

        # Default to commercial for product-like keywords
        return IntentCategory.COMMERCIAL, 0.60, {
            "transactional": 0.25,
            "commercial": 0.60,
            "informational": 0.10,
            "navigational": 0.05,
        }

    async def predict_keyword_performance(
        self,
        keyword: str,
        campaign_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Predict performance metrics for a keyword.

        Args:
            keyword: Keyword to predict
            campaign_context: Campaign data (industry, budget, etc.)

        Returns:
            Predicted metrics (conversions, CPC, CTR, etc.)
        """
        # Demo predictions - in production, use Vertex AI AutoML
        industry = campaign_context.get("industry", "general")
        avg_cpc = campaign_context.get("avg_cpc", 1.50)

        # Simple heuristics
        word_count = len(keyword.split())

        # Longer keywords tend to be more specific, better conversion
        conversion_multiplier = 1 + (word_count - 2) * 0.1

        return {
            "keyword": keyword,
            "predicted_ctr": round(2.5 + (word_count * 0.3), 2),
            "predicted_cpc": round(avg_cpc * (1 - word_count * 0.05), 2),
            "predicted_conversion_rate": round(3.0 * conversion_multiplier, 2),
            "confidence": 0.65,
            "model": "demo_heuristic",
        }


# Demo classifications for testing
def get_demo_search_term_classifications() -> List[ClassificationResult]:
    """Get demo search term classifications."""
    return [
        ClassificationResult(
            input_text="buy running shoes online",
            label="highly_relevant",
            confidence=0.92,
            all_scores={
                "highly_relevant": 0.92,
                "relevant": 0.06,
                "somewhat_relevant": 0.02,
                "not_relevant": 0.0,
                "negative": 0.0,
            }
        ),
        ClassificationResult(
            input_text="free shoe repair near me",
            label="negative",
            confidence=0.88,
            all_scores={
                "highly_relevant": 0.02,
                "relevant": 0.03,
                "somewhat_relevant": 0.07,
                "not_relevant": 0.0,
                "negative": 0.88,
            }
        ),
        ClassificationResult(
            input_text="athletic footwear comparison",
            label="relevant",
            confidence=0.78,
            all_scores={
                "highly_relevant": 0.15,
                "relevant": 0.78,
                "somewhat_relevant": 0.07,
                "not_relevant": 0.0,
                "negative": 0.0,
            }
        ),
    ]
