# Phase 7: AI/ML Pipeline Plan

## Executive Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| **LLM (Brain 1)** | Gemini 2.5 Flash/Pro | Chat, explanations, ad copy |
| **ML Platform (Brain 2)** | Vertex AI + BigQuery ML | Forecasting, predictions |
| **Recommendation Engine** | Custom Python + Rules | Generate actionable recommendations |
| **Automation** | Cloud Functions + Rules | Auto-apply approved actions |
| **Data Pipeline** | Dataflow + Pub/Sub | ETL for ML training |

---

## The Two AI Brains Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TWO AI BRAINS                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  BRAIN 1: GEMINI LLM                       BRAIN 2: VERTEX AI + BQML        │
│  ════════════════════                       ════════════════════════════     │
│                                                                              │
│  Purpose: Human Interaction                 Purpose: Mathematical Analysis   │
│                                                                              │
│  ┌─────────────────────────┐               ┌─────────────────────────┐      │
│  │ • AI Advisor Chat       │               │ • Spend Forecasting     │      │
│  │ • Explain metrics       │               │ • Conversion Prediction │      │
│  │ • Generate ad copy      │               │ • Anomaly Detection     │      │
│  │ • Weekly summaries      │               │ • ROAS Forecasting      │      │
│  │ • Answer "why" questions│               │ • Budget Optimization   │      │
│  │ • NLP audience building │               │ • LTV Prediction        │      │
│  └─────────────────────────┘               └─────────────────────────┘      │
│                                                                              │
│  Input: Natural language                    Input: Structured data           │
│  Output: Natural language                   Output: Numbers/predictions      │
│                                                                              │
│  Cost: ~$0.25-1.00/user/month              Cost: ~$50-200/month total        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                     │
                    └──────────────┬──────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────────┐
                    │      RECOMMENDATION ENGINE          │
                    │                                     │
                    │  Combines insights from both brains │
                    │  to generate actionable suggestions │
                    └─────────────────────────────────────┘
```

---

## Brain 1: Gemini LLM Integration

### Use Cases

```yaml
gemini_use_cases:
  # AI Advisor Chat
  chat:
    model: "gemini-2.5-flash"  # Fast for chat
    fallback: "gemini-2.5-pro"  # Complex queries
    context_window: 128000
    max_output: 8192
    temperature: 0.7
    features:
      - "Answer questions about account performance"
      - "Explain why metrics changed"
      - "Suggest optimizations in plain English"
      - "Compare campaigns/keywords"
      - "Historical analysis"

  # Metric Explanations
  explain:
    model: "gemini-2.5-flash"
    use_cases:
      - "What does CPA mean?"
      - "Why did my ROAS drop?"
      - "Is this CTR good?"
    output_format: "Plain English, max 150 words"

  # Ad Copy Generation
  ad_copy:
    model: "gemini-2.5-flash"
    features:
      - "Generate headlines (max 30 chars)"
      - "Generate descriptions (max 90 chars)"
      - "Multiple variations"
      - "Different tones (professional, casual, urgent)"
    constraints:
      - "Must fit character limits"
      - "No trademark issues"
      - "No superlatives (best, #1, etc.)"

  # Weekly Summaries
  summaries:
    model: "gemini-2.5-flash"
    trigger: "weekly cron"
    output: "5-7 bullet points summarizing week"

  # Recommendation Explanations
  recommendation_text:
    model: "gemini-2.5-flash"
    purpose: "Generate human-readable recommendation descriptions"
```

### Gemini Prompts Library

```python
# app/integrations/gemini/prompts.py

SYSTEM_PROMPTS = {
    "advisor": """
You are an AI advertising advisor for AdsMaster, a platform that helps
businesses optimize their Google Ads campaigns.

Your role:
- Analyze advertising performance data
- Explain metrics in simple, non-technical language
- Provide actionable recommendations
- Be helpful and encouraging, but honest about problems

Guidelines:
- Use plain English, avoid jargon
- Reference specific numbers from the data
- When suggesting changes, explain WHY
- If asked about something you don't know, say so
- Keep responses concise (under 300 words for chat)
- Format with bullet points for readability

You have access to the user's:
- Campaign performance metrics
- Keyword data
- Search terms
- Budget information
- Historical trends

Always prioritize:
1. Stopping wasted spend
2. Improving ROAS/CPA
3. Finding growth opportunities
""",

    "explain_metric": """
Explain the following advertising metric to a small business owner
who may not be familiar with digital advertising terms.

Include:
1. What the metric means (1-2 sentences)
2. Whether the current value is good, bad, or neutral
3. One specific action to improve it

Keep it under 100 words. Use simple analogies if helpful.
""",

    "ad_copy_generator": """
You are an expert Google Ads copywriter. Generate compelling ad copy
that follows these rules:

HEADLINES (max 30 characters each):
- Include the main keyword naturally
- Use numbers when relevant
- Create urgency without being spammy
- Highlight unique selling points

DESCRIPTIONS (max 90 characters each):
- Expand on the value proposition
- Include a call to action
- Mention benefits, not just features

AVOID:
- Superlatives like "best", "#1", "guaranteed"
- ALL CAPS
- Excessive punctuation
- Trademarked terms
- Vague claims without specifics

Output valid JSON:
{
  "headlines": ["headline1", "headline2", ...],
  "descriptions": ["desc1", "desc2", ...]
}
""",

    "weekly_summary": """
Generate a weekly performance summary for an advertising account.

Structure:
1. Overall performance (1-2 sentences)
2. Key wins (2-3 bullets)
3. Areas of concern (1-2 bullets)
4. Top recommendation for next week (1 bullet)

Keep it actionable and encouraging. Total: 150-200 words.
""",

    "recommendation_description": """
Generate a clear, actionable recommendation description.

Include:
- What the issue is (1 sentence)
- Why it matters (impact in dollars or %)
- What action should be taken

Keep it under 50 words. Be specific and data-driven.
"""
}

RECOMMENDATION_PROMPTS = {
    "pause_keyword": """
Generate a recommendation to pause a wasting keyword.

Data:
- Keyword: {keyword_text}
- Match type: {match_type}
- Spend (7 days): ${spend_7d}
- Conversions (7 days): {conversions_7d}
- Campaign: {campaign_name}

Create a compelling recommendation explaining why this keyword
should be paused and the expected monthly savings.
""",

    "add_negative": """
Generate a recommendation to add negative keywords.

Data:
- Search terms to negate: {search_terms}
- Total wasted spend: ${wasted_spend}
- Campaign: {campaign_name}

Explain why these search terms are irrelevant and should be blocked.
""",

    "increase_budget": """
Generate a recommendation to increase campaign budget.

Data:
- Campaign: {campaign_name}
- Current daily budget: ${current_budget}
- Impression share lost to budget: {is_lost_budget}%
- Current ROAS: {roas}x
- Suggested increase: {suggested_increase}%

Make a data-driven case for increasing budget.
""",

    "bidding_strategy": """
Generate a recommendation to change bidding strategy.

Data:
- Campaign: {campaign_name}
- Current strategy: {current_strategy}
- Suggested strategy: {suggested_strategy}
- Historical CPA: ${historical_cpa}
- Target CPA: ${target_cpa}

Explain why the new strategy would perform better.
"""
}
```

### Gemini Service Implementation

```python
# app/integrations/gemini/service.py
import google.generativeai as genai
from typing import List, Dict, Any, AsyncIterator, Optional
import json

from app.config import settings
from app.core.logging import logger
from app.integrations.gemini.prompts import SYSTEM_PROMPTS, RECOMMENDATION_PROMPTS

class GeminiService:
    """Gemini LLM integration for all AI features."""

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.flash_model = genai.GenerativeModel(
            'gemini-2.5-flash',
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 2048,
            }
        )
        self.pro_model = genai.GenerativeModel(
            'gemini-2.5-pro',
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 4096,
            }
        )

    async def chat(
        self,
        message: str,
        context: Dict[str, Any],
        history: List[Dict[str, str]],
        use_pro: bool = False
    ) -> Dict[str, Any]:
        """
        AI Advisor chat interaction.

        Returns:
            {
                "content": "response text",
                "tokens_used": 123,
                "model": "gemini-2.5-flash"
            }
        """
        model = self.pro_model if use_pro else self.flash_model
        model_name = "gemini-2.5-pro" if use_pro else "gemini-2.5-flash"

        # Build conversation with context
        chat = model.start_chat(history=[
            {"role": "user", "parts": [SYSTEM_PROMPTS["advisor"]]},
            {"role": "model", "parts": ["I understand. I'm ready to help analyze your advertising data and provide recommendations."]},
            *self._format_history(history)
        ])

        # Format context as structured data
        context_prompt = self._format_context(context, message)

        try:
            response = chat.send_message(context_prompt)

            return {
                "content": response.text,
                "tokens_used": response.usage_metadata.total_token_count,
                "model": model_name
            }
        except Exception as e:
            logger.error(f"Gemini chat error: {e}")
            raise

    async def stream_chat(
        self,
        message: str,
        context: Dict[str, Any],
        history: List[Dict[str, str]]
    ) -> AsyncIterator[str]:
        """Stream chat response token by token for real-time UI."""
        model = self.flash_model

        chat = model.start_chat(history=[
            {"role": "user", "parts": [SYSTEM_PROMPTS["advisor"]]},
            {"role": "model", "parts": ["Ready to help."]},
            *self._format_history(history)
        ])

        context_prompt = self._format_context(context, message)

        response = chat.send_message(context_prompt, stream=True)

        for chunk in response:
            if chunk.text:
                yield chunk.text

    async def explain_metric(
        self,
        metric_name: str,
        metric_value: Any,
        context: Dict[str, Any]
    ) -> str:
        """Generate plain English explanation of a metric."""
        prompt = f"""
        {SYSTEM_PROMPTS["explain_metric"]}

        Metric: {metric_name}
        Current Value: {metric_value}

        Context:
        - Account average: {context.get('account_avg', 'N/A')}
        - Previous period: {context.get('previous_value', 'N/A')}
        - Industry benchmark: {context.get('benchmark', 'varies by industry')}
        - Trend: {context.get('trend', 'stable')}
        """

        response = await self.flash_model.generate_content_async(prompt)
        return response.text

    async def generate_ad_copy(
        self,
        product: str,
        keywords: List[str],
        existing_headlines: List[str],
        tone: str = "professional",
        num_headlines: int = 5,
        num_descriptions: int = 3
    ) -> Dict[str, List[str]]:
        """Generate ad headlines and descriptions."""
        prompt = f"""
        {SYSTEM_PROMPTS["ad_copy_generator"]}

        Product/Service: {product}
        Target Keywords: {', '.join(keywords)}
        Tone: {tone}
        Existing Headlines (for reference, create new ones): {', '.join(existing_headlines)}

        Generate {num_headlines} headlines and {num_descriptions} descriptions.
        """

        response = await self.flash_model.generate_content_async(prompt)

        # Parse JSON response
        try:
            # Clean up response if it has markdown code blocks
            text = response.text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            result = json.loads(text.strip())
            return result
        except json.JSONDecodeError:
            logger.error(f"Failed to parse ad copy response: {response.text}")
            return {"headlines": [], "descriptions": []}

    async def generate_weekly_summary(
        self,
        account_name: str,
        metrics: Dict[str, Any],
        top_campaigns: List[Dict],
        issues: List[Dict],
        improvements: Dict[str, Any]
    ) -> str:
        """Generate weekly performance summary."""
        prompt = f"""
        {SYSTEM_PROMPTS["weekly_summary"]}

        Account: {account_name}

        This Week's Performance:
        - Spend: ${metrics['spend']} ({metrics['spend_change']:+.1f}% vs last week)
        - Conversions: {metrics['conversions']} ({metrics['conversions_change']:+.1f}%)
        - CPA: ${metrics['cpa']:.2f} ({metrics['cpa_change']:+.1f}%)
        - ROAS: {metrics['roas']:.2f}x ({metrics['roas_change']:+.1f}%)

        Top Performing Campaigns:
        {self._format_list(top_campaigns)}

        Issues Found:
        {self._format_list(issues)}

        Improvements Since Last Week:
        {self._format_dict(improvements)}
        """

        response = await self.flash_model.generate_content_async(prompt)
        return response.text

    async def generate_recommendation_text(
        self,
        recommendation_type: str,
        data: Dict[str, Any]
    ) -> Dict[str, str]:
        """Generate human-readable recommendation title and description."""
        prompt_template = RECOMMENDATION_PROMPTS.get(recommendation_type)
        if not prompt_template:
            raise ValueError(f"Unknown recommendation type: {recommendation_type}")

        prompt = prompt_template.format(**data)

        response = await self.flash_model.generate_content_async(f"""
        {prompt}

        Return as JSON:
        {{
            "title": "short title (max 10 words)",
            "description": "detailed description (max 50 words)",
            "impact_summary": "expected impact in one line"
        }}
        """)

        try:
            text = response.text
            if "```" in text:
                text = text.split("```")[1].split("```")[0]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())
        except:
            return {
                "title": f"Optimize {recommendation_type}",
                "description": "Review recommended changes",
                "impact_summary": "Potential improvement"
            }

    def _format_context(self, context: Dict[str, Any], message: str) -> str:
        """Format context data for inclusion in prompt."""
        parts = ["Current Account Data:", ""]

        for key, value in context.items():
            if isinstance(value, dict):
                parts.append(f"{key}:")
                for k, v in value.items():
                    parts.append(f"  {k}: {v}")
            elif isinstance(value, list):
                parts.append(f"{key}: {', '.join(str(v) for v in value[:5])}")
            else:
                parts.append(f"{key}: {value}")

        parts.extend(["", "User Question:", message])
        return "\n".join(parts)

    def _format_history(self, history: List[Dict[str, str]]) -> List[Dict]:
        """Format chat history for Gemini."""
        return [
            {
                "role": "user" if msg["role"] == "user" else "model",
                "parts": [msg["content"]]
            }
            for msg in history
        ]

    def _format_list(self, items: List[Dict]) -> str:
        return "\n".join(f"- {item}" for item in items)

    def _format_dict(self, data: Dict) -> str:
        return "\n".join(f"- {k}: {v}" for k, v in data.items())
```

---

## Brain 2: ML Models (Vertex AI + BigQuery ML)

### ML Model Catalog

```yaml
ml_models:
  # Spend Forecasting
  spend_forecast:
    name: "spend_forecast_arima"
    type: "ARIMA_PLUS"
    platform: "BigQuery ML"
    training_data: "campaign_metrics_daily"
    features:
      - date
      - campaign_id
      - daily_spend
    horizon: 30  # days
    training_frequency: "weekly"
    use_cases:
      - "Predict next 30 days spend"
      - "Budget planning"
      - "Anomaly detection baseline"

  # Conversion Forecasting
  conversion_forecast:
    name: "conversion_forecast_tft"
    type: "Temporal Fusion Transformer"
    platform: "Vertex AI"
    training_data: "campaign_metrics_daily + features"
    features:
      - date
      - campaign_id
      - spend
      - clicks
      - impressions
      - day_of_week
      - is_weekend
      - month
    horizon: 30
    training_frequency: "weekly"
    use_cases:
      - "Predict future conversions"
      - "Goal achievement forecasting"

  # Anomaly Detection
  anomaly_detection:
    name: "spend_anomaly_detector"
    type: "Anomaly Detection"
    platform: "BigQuery ML"
    features:
      - hourly_spend
      - hourly_clicks
      - hourly_impressions
    threshold: 0.95  # confidence
    use_cases:
      - "Detect unusual spend spikes"
      - "Click fraud detection"
      - "Performance drops"

  # Conversion Probability
  conversion_probability:
    name: "keyword_conversion_model"
    type: "AutoML Tabular (Classification)"
    platform: "Vertex AI AutoML"
    features:
      - keyword_text_embedding
      - match_type
      - quality_score
      - historical_ctr
      - historical_cvr
      - avg_cpc
      - avg_position
      - competition_level
    output: "conversion_probability (0-1)"
    training_frequency: "weekly"
    use_cases:
      - "Identify high-potential keywords"
      - "Bid recommendations"

  # Customer LTV
  customer_ltv:
    name: "ltv_prediction"
    type: "Regression"
    platform: "BigQuery ML"
    features:
      - days_since_signup
      - plan_type
      - monthly_spend
      - ad_accounts_count
      - recommendations_applied
      - ai_messages_count
      - login_frequency
    output: "predicted_ltv_12_months"
    training_frequency: "monthly"
    use_cases:
      - "Customer segmentation"
      - "Churn risk scoring"

  # Search Term Relevance
  search_term_relevance:
    name: "search_term_classifier"
    type: "Text Classification"
    platform: "Vertex AI"
    features:
      - search_term_text
      - matched_keyword
      - campaign_context
    output: "relevance_score (0-100)"
    labels:
      - "highly_relevant"
      - "relevant"
      - "somewhat_relevant"
      - "irrelevant"
    use_cases:
      - "Auto-detect negative keyword candidates"
      - "New keyword suggestions"
```

### BigQuery ML Models

```sql
-- 1. SPEND FORECASTING MODEL (ARIMA_PLUS)
-- ========================================

-- Create model
CREATE OR REPLACE MODEL `adsmaster.ml_models.spend_forecast`
OPTIONS(
  model_type = 'ARIMA_PLUS',
  time_series_timestamp_col = 'date',
  time_series_data_col = 'daily_spend',
  time_series_id_col = 'campaign_id',
  horizon = 30,
  auto_arima = TRUE,
  auto_arima_max_order = 5,
  data_frequency = 'DAILY',
  decompose_time_series = TRUE
) AS
SELECT
  date,
  campaign_id,
  SUM(cost_micros) / 1000000 AS daily_spend
FROM `adsmaster.analytics.campaign_metrics_daily`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)
GROUP BY date, campaign_id
HAVING daily_spend > 0;

-- Get forecast
SELECT
  campaign_id,
  forecast_timestamp AS date,
  forecast_value AS predicted_spend,
  prediction_interval_lower_bound AS lower_bound,
  prediction_interval_upper_bound AS upper_bound,
  confidence_level
FROM ML.FORECAST(
  MODEL `adsmaster.ml_models.spend_forecast`,
  STRUCT(
    30 AS horizon,
    0.95 AS confidence_level
  )
);


-- 2. ANOMALY DETECTION MODEL
-- ==========================

-- Create model for detecting spend anomalies
CREATE OR REPLACE MODEL `adsmaster.ml_models.spend_anomaly`
OPTIONS(
  model_type = 'ARIMA_PLUS',
  time_series_timestamp_col = 'hour',
  time_series_data_col = 'hourly_spend',
  time_series_id_col = 'campaign_id',
  horizon = 24,
  auto_arima = TRUE
) AS
SELECT
  TIMESTAMP_TRUNC(datetime, HOUR) AS hour,
  campaign_id,
  SUM(cost_micros) / 1000000 AS hourly_spend
FROM `adsmaster.analytics.campaign_metrics_hourly`
WHERE datetime >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY hour, campaign_id;

-- Detect anomalies
SELECT
  campaign_id,
  hour,
  hourly_spend,
  is_anomaly,
  lower_bound,
  upper_bound,
  anomaly_probability
FROM ML.DETECT_ANOMALIES(
  MODEL `adsmaster.ml_models.spend_anomaly`,
  STRUCT(0.95 AS anomaly_prob_threshold),
  (
    SELECT
      TIMESTAMP_TRUNC(datetime, HOUR) AS hour,
      campaign_id,
      SUM(cost_micros) / 1000000 AS hourly_spend
    FROM `adsmaster.analytics.campaign_metrics_hourly`
    WHERE datetime >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
    GROUP BY hour, campaign_id
  )
)
WHERE is_anomaly = TRUE;


-- 3. KEYWORD QUALITY MODEL (Logistic Regression)
-- ===============================================

-- Create model to predict keyword conversion probability
CREATE OR REPLACE MODEL `adsmaster.ml_models.keyword_conversion`
OPTIONS(
  model_type = 'LOGISTIC_REG',
  input_label_cols = ['has_converted'],
  auto_class_weights = TRUE,
  l2_reg = 0.1
) AS
SELECT
  -- Features
  quality_score,
  match_type,
  SAFE_DIVIDE(clicks, NULLIF(impressions, 0)) AS ctr,
  SAFE_DIVIDE(cost_micros, NULLIF(clicks * 1000000, 0)) AS avg_cpc,
  SAFE_DIVIDE(conversions, NULLIF(clicks, 0)) AS historical_cvr,
  LENGTH(keyword_text) AS keyword_length,
  ARRAY_LENGTH(SPLIT(keyword_text, ' ')) AS word_count,

  -- Label
  IF(conversions > 0, 1, 0) AS has_converted

FROM `adsmaster.analytics.keyword_metrics_30d`
WHERE impressions >= 100;  -- Minimum data requirement

-- Predict conversion probability for keywords
SELECT
  keyword_id,
  keyword_text,
  predicted_has_converted AS conversion_probability,
  predicted_has_converted_probs[OFFSET(1)].prob AS probability_score
FROM ML.PREDICT(
  MODEL `adsmaster.ml_models.keyword_conversion`,
  (
    SELECT
      keyword_id,
      keyword_text,
      quality_score,
      match_type,
      SAFE_DIVIDE(clicks, NULLIF(impressions, 0)) AS ctr,
      SAFE_DIVIDE(cost_micros, NULLIF(clicks * 1000000, 0)) AS avg_cpc,
      SAFE_DIVIDE(conversions, NULLIF(clicks, 0)) AS historical_cvr,
      LENGTH(keyword_text) AS keyword_length,
      ARRAY_LENGTH(SPLIT(keyword_text, ' ')) AS word_count
    FROM `adsmaster.analytics.keywords_current`
    WHERE status = 'enabled'
  )
);
```

### Vertex AI Models

```python
# app/integrations/vertex_ai/service.py
from google.cloud import aiplatform
from google.cloud.aiplatform import Model, Endpoint
from typing import List, Dict, Any

from app.config import settings

class VertexAIService:
    """Vertex AI integration for ML predictions."""

    def __init__(self):
        aiplatform.init(
            project=settings.GCP_PROJECT_ID,
            location=settings.GCP_LOCATION
        )

    async def predict_conversions(
        self,
        campaign_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Predict future conversions using TFT model.
        """
        endpoint = Endpoint(
            endpoint_name=f"projects/{settings.GCP_PROJECT_ID}/locations/{settings.GCP_LOCATION}/endpoints/conversion_forecast"
        )

        # Prepare input features
        features = await self._get_forecast_features(campaign_id)

        # Get prediction
        prediction = endpoint.predict(instances=[features])

        return {
            "campaign_id": campaign_id,
            "forecast": [
                {
                    "date": (datetime.utcnow() + timedelta(days=i+1)).isoformat(),
                    "predicted_conversions": pred["value"],
                    "lower_bound": pred["lower"],
                    "upper_bound": pred["upper"]
                }
                for i, pred in enumerate(prediction.predictions[0])
            ],
            "model_version": endpoint.display_name
        }

    async def classify_search_term(
        self,
        search_term: str,
        matched_keyword: str,
        campaign_context: str
    ) -> Dict[str, Any]:
        """
        Classify search term relevance.
        """
        endpoint = Endpoint(
            endpoint_name=f"projects/{settings.GCP_PROJECT_ID}/locations/{settings.GCP_LOCATION}/endpoints/search_term_classifier"
        )

        instance = {
            "search_term": search_term,
            "matched_keyword": matched_keyword,
            "campaign_context": campaign_context
        }

        prediction = endpoint.predict(instances=[instance])

        result = prediction.predictions[0]
        return {
            "search_term": search_term,
            "relevance_score": int(result["score"] * 100),
            "classification": result["class"],
            "confidence": result["confidence"],
            "suggestion": self._get_suggestion(result["class"])
        }

    def _get_suggestion(self, classification: str) -> str:
        suggestions = {
            "highly_relevant": "add_as_exact_keyword",
            "relevant": "add_as_phrase_keyword",
            "somewhat_relevant": "monitor",
            "irrelevant": "add_as_negative"
        }
        return suggestions.get(classification, "monitor")

    async def batch_classify_search_terms(
        self,
        search_terms: List[Dict[str, str]]
    ) -> List[Dict[str, Any]]:
        """Batch classify multiple search terms."""
        endpoint = Endpoint(
            endpoint_name=f"projects/{settings.GCP_PROJECT_ID}/locations/{settings.GCP_LOCATION}/endpoints/search_term_classifier"
        )

        predictions = endpoint.predict(instances=search_terms)

        return [
            {
                "search_term": st["search_term"],
                "relevance_score": int(pred["score"] * 100),
                "classification": pred["class"],
                "suggestion": self._get_suggestion(pred["class"])
            }
            for st, pred in zip(search_terms, predictions.predictions)
        ]
```

---

## Recommendation Engine

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RECOMMENDATION ENGINE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

INPUT SOURCES
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Metrics    │  │  ML Models   │  │    Rules     │  │  Anomalies   │
│   (current)  │  │ (predictions)│  │  (business)  │  │  (detected)  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │                 │
       └─────────────────┴─────────────────┴─────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RULE EVALUATOR                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Rule: WASTING_KEYWORD                                               │   │
│  │  IF spend_7d > $50 AND conversions_7d = 0                           │   │
│  │  THEN recommend: PAUSE_KEYWORD                                       │   │
│  │  Severity: WARNING                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Rule: HIGH_POTENTIAL_KEYWORD                                        │   │
│  │  IF ml_conversion_prob > 0.7 AND impression_share_lost > 20%        │   │
│  │  THEN recommend: INCREASE_BID                                        │   │
│  │  Severity: OPPORTUNITY                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Rule: BUDGET_CONSTRAINED                                            │   │
│  │  IF impression_share_lost_to_budget > 30% AND roas > 3              │   │
│  │  THEN recommend: INCREASE_BUDGET                                     │   │
│  │  Severity: OPPORTUNITY                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DEDUPLICATION & PRIORITIZATION                           │
│                                                                              │
│  1. Remove duplicates                                                        │
│  2. Score by impact ($$$ savings or gain)                                   │
│  3. Limit per type (max 5 of same type)                                     │
│  4. Sort by severity (critical > warning > opportunity > info)              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GEMINI ENRICHMENT                                       │
│                                                                              │
│  For each recommendation:                                                    │
│  - Generate human-readable title                                            │
│  - Generate detailed description                                            │
│  - Create 3 action options (conservative/moderate/aggressive)               │
│  - Calculate confidence score                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OUTPUT                                                │
│                                                                              │
│  {                                                                           │
│    "id": "uuid",                                                            │
│    "type": "pause_keyword",                                                 │
│    "severity": "warning",                                                   │
│    "title": "Pause wasting keyword",                                        │
│    "description": "Keyword 'cheap widgets' spent $85 with 0 conversions",  │
│    "impact_estimate": { "monthly_savings": 340 },                           │
│    "affected_entities": { "keywords": [...] },                              │
│    "options": [                                                             │
│      { "id": 1, "label": "Conservative", "action": "Reduce bid 50%" },     │
│      { "id": 2, "label": "Moderate", "action": "Pause keyword" },          │
│      { "id": 3, "label": "Aggressive", "action": "Pause + add negative" }  │
│    ]                                                                        │
│  }                                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Recommendation Rules

```python
# app/services/recommendation/rules.py
from typing import List, Dict, Any
from dataclasses import dataclass
from enum import Enum

class RuleType(Enum):
    PAUSE_KEYWORD = "pause_keyword"
    ADD_NEGATIVE = "add_negative"
    INCREASE_BID = "increase_bid"
    DECREASE_BID = "decrease_bid"
    INCREASE_BUDGET = "increase_budget"
    DECREASE_BUDGET = "decrease_budget"
    CHANGE_BIDDING = "change_bidding_strategy"
    FIX_TRACKING = "fix_tracking"
    EMERGENCY_PAUSE = "emergency_pause"

class Severity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    OPPORTUNITY = "opportunity"

@dataclass
class Rule:
    id: str
    name: str
    type: RuleType
    severity: Severity
    condition: callable
    impact_calculator: callable
    description_template: str

# Define recommendation rules
RULES: List[Rule] = [
    # WASTE DETECTION
    Rule(
        id="waste_keyword_high",
        name="High-spend wasting keyword",
        type=RuleType.PAUSE_KEYWORD,
        severity=Severity.WARNING,
        condition=lambda kw: (
            kw.spend_7d >= 50 and
            kw.conversions_7d == 0 and
            kw.status == "enabled"
        ),
        impact_calculator=lambda kw: kw.spend_7d * 4,  # Monthly savings
        description_template="Keyword '{keyword}' spent ${spend} with 0 conversions"
    ),

    Rule(
        id="waste_keyword_medium",
        name="Medium-spend wasting keyword",
        type=RuleType.PAUSE_KEYWORD,
        severity=Severity.INFO,
        condition=lambda kw: (
            kw.spend_7d >= 25 and kw.spend_7d < 50 and
            kw.conversions_7d == 0 and
            kw.status == "enabled"
        ),
        impact_calculator=lambda kw: kw.spend_7d * 4,
        description_template="Keyword '{keyword}' is underperforming"
    ),

    Rule(
        id="irrelevant_search_term",
        name="Irrelevant search term",
        type=RuleType.ADD_NEGATIVE,
        severity=Severity.WARNING,
        condition=lambda st: (
            st.ai_relevance_score < 30 and
            st.spend >= 10 and
            st.conversions == 0 and
            not st.is_added_as_negative
        ),
        impact_calculator=lambda st: st.spend * 4,
        description_template="Search term '{term}' is irrelevant to your business"
    ),

    # OPPORTUNITY DETECTION
    Rule(
        id="high_potential_keyword",
        name="High-potential keyword needs more visibility",
        type=RuleType.INCREASE_BID,
        severity=Severity.OPPORTUNITY,
        condition=lambda kw: (
            kw.ml_conversion_prob > 0.7 and
            kw.impression_share_lost > 20 and
            kw.roas > 2
        ),
        impact_calculator=lambda kw: kw.conversions_7d * kw.avg_conversion_value * 0.2,
        description_template="Keyword '{keyword}' could drive more conversions"
    ),

    Rule(
        id="budget_constrained",
        name="Campaign limited by budget",
        type=RuleType.INCREASE_BUDGET,
        severity=Severity.OPPORTUNITY,
        condition=lambda c: (
            c.impression_share_lost_to_budget > 30 and
            c.roas > 3 and
            c.status == "enabled"
        ),
        impact_calculator=lambda c: c.conversions_30d * 0.3 * c.avg_conversion_value,
        description_template="Campaign '{campaign}' is profitable but budget-limited"
    ),

    # ANOMALY / EMERGENCY
    Rule(
        id="spend_anomaly",
        name="Unusual spend detected",
        type=RuleType.EMERGENCY_PAUSE,
        severity=Severity.CRITICAL,
        condition=lambda a: (
            a.is_anomaly and
            a.spend_ratio > 3  # 3x normal spend
        ),
        impact_calculator=lambda a: a.anomaly_spend,
        description_template="Campaign '{campaign}' is spending 3x faster than normal"
    ),

    Rule(
        id="conversion_tracking_broken",
        name="Conversion tracking may be broken",
        type=RuleType.FIX_TRACKING,
        severity=Severity.CRITICAL,
        condition=lambda c: (
            c.conversions_7d == 0 and
            c.conversions_prev_7d > 0 and
            c.clicks_7d > 100
        ),
        impact_calculator=lambda c: 0,  # No direct savings, but critical
        description_template="Campaign '{campaign}' stopped tracking conversions"
    ),

    # BIDDING STRATEGY
    Rule(
        id="switch_to_target_cpa",
        name="Consider Target CPA bidding",
        type=RuleType.CHANGE_BIDDING,
        severity=Severity.OPPORTUNITY,
        condition=lambda c: (
            c.bidding_strategy == "manual_cpc" and
            c.conversions_30d >= 30 and  # Enough data
            c.cpa_variance < 0.3  # Consistent CPA
        ),
        impact_calculator=lambda c: c.spend_30d * 0.1,  # Estimated 10% improvement
        description_template="Campaign '{campaign}' could benefit from automated bidding"
    ),
]
```

### Recommendation Service

```python
# app/services/recommendation/service.py
from typing import List, Dict, Any
from uuid import uuid4
from datetime import datetime, timedelta

from app.services.recommendation.rules import RULES, RuleType, Severity
from app.integrations.gemini.service import GeminiService
from app.integrations.vertex_ai.service import VertexAIService
from app.repositories.recommendation_repo import RecommendationRepository
from app.repositories.keyword_repo import KeywordRepository
from app.core.logging import logger

class RecommendationService:
    """Generate, store, and manage AI recommendations."""

    def __init__(
        self,
        recommendation_repo: RecommendationRepository,
        keyword_repo: KeywordRepository,
        gemini: GeminiService,
        vertex_ai: VertexAIService
    ):
        self.repo = recommendation_repo
        self.keyword_repo = keyword_repo
        self.gemini = gemini
        self.vertex_ai = vertex_ai

    async def generate_recommendations(
        self,
        ad_account_id: str
    ) -> List[Dict[str, Any]]:
        """
        Generate all recommendations for an ad account.
        Called by daily cron job.
        """
        logger.info(f"Generating recommendations for account {ad_account_id}")

        recommendations = []

        # 1. Get all keywords with metrics
        keywords = await self.keyword_repo.get_with_metrics(ad_account_id)

        # 2. Enrich with ML predictions
        for keyword in keywords:
            keyword.ml_conversion_prob = await self.vertex_ai.predict_conversion_prob(
                keyword
            )

        # 3. Evaluate rules
        for keyword in keywords:
            for rule in RULES:
                if rule.type in [RuleType.PAUSE_KEYWORD, RuleType.INCREASE_BID, RuleType.DECREASE_BID]:
                    if rule.condition(keyword):
                        rec = await self._create_recommendation(
                            rule=rule,
                            entity=keyword,
                            ad_account_id=ad_account_id
                        )
                        recommendations.append(rec)

        # 4. Get search terms and evaluate
        search_terms = await self._get_search_terms_with_relevance(ad_account_id)
        for st in search_terms:
            for rule in RULES:
                if rule.type == RuleType.ADD_NEGATIVE:
                    if rule.condition(st):
                        rec = await self._create_recommendation(
                            rule=rule,
                            entity=st,
                            ad_account_id=ad_account_id
                        )
                        recommendations.append(rec)

        # 5. Get campaigns and evaluate
        campaigns = await self._get_campaigns_with_metrics(ad_account_id)
        for campaign in campaigns:
            for rule in RULES:
                if rule.type in [RuleType.INCREASE_BUDGET, RuleType.CHANGE_BIDDING, RuleType.FIX_TRACKING]:
                    if rule.condition(campaign):
                        rec = await self._create_recommendation(
                            rule=rule,
                            entity=campaign,
                            ad_account_id=ad_account_id
                        )
                        recommendations.append(rec)

        # 6. Check for anomalies
        anomalies = await self._detect_anomalies(ad_account_id)
        for anomaly in anomalies:
            for rule in RULES:
                if rule.type == RuleType.EMERGENCY_PAUSE:
                    if rule.condition(anomaly):
                        rec = await self._create_recommendation(
                            rule=rule,
                            entity=anomaly,
                            ad_account_id=ad_account_id
                        )
                        recommendations.append(rec)

        # 7. Deduplicate and prioritize
        recommendations = self._prioritize(recommendations)

        # 8. Store in database
        for rec in recommendations:
            await self.repo.create(rec)

        logger.info(f"Generated {len(recommendations)} recommendations")

        return recommendations

    async def _create_recommendation(
        self,
        rule,
        entity,
        ad_account_id: str
    ) -> Dict[str, Any]:
        """Create a recommendation with Gemini-generated text."""

        # Calculate impact
        impact = rule.impact_calculator(entity)

        # Generate text with Gemini
        text = await self.gemini.generate_recommendation_text(
            recommendation_type=rule.type.value,
            data=entity.__dict__
        )

        # Create options based on rule type
        options = self._generate_options(rule.type, entity)

        return {
            "id": str(uuid4()),
            "ad_account_id": ad_account_id,
            "campaign_id": getattr(entity, "campaign_id", None),
            "type": rule.type.value,
            "severity": rule.severity.value,
            "title": text["title"],
            "description": text["description"],
            "impact_estimate": {
                "monthly_savings": impact if "pause" in rule.type.value else None,
                "potential_gain": impact if "increase" in rule.type.value else None,
                "risk": "low"
            },
            "affected_entities": self._get_affected_entities(entity),
            "options": options,
            "status": "pending",
            "expires_at": datetime.utcnow() + timedelta(days=7),
            "created_at": datetime.utcnow()
        }

    def _generate_options(
        self,
        rule_type: RuleType,
        entity
    ) -> List[Dict[str, Any]]:
        """Generate action options for a recommendation."""
        options_map = {
            RuleType.PAUSE_KEYWORD: [
                {"id": 1, "label": "Conservative", "action": "Reduce bid by 50%", "risk": "low"},
                {"id": 2, "label": "Moderate", "action": "Pause keyword", "risk": "low"},
                {"id": 3, "label": "Aggressive", "action": "Pause and add as negative", "risk": "medium"},
            ],
            RuleType.ADD_NEGATIVE: [
                {"id": 1, "label": "Exact match", "action": f"Add as exact match negative", "risk": "low"},
                {"id": 2, "label": "Phrase match", "action": f"Add as phrase match negative", "risk": "low"},
                {"id": 3, "label": "Broad match", "action": f"Add as broad match negative", "risk": "medium"},
            ],
            RuleType.INCREASE_BUDGET: [
                {"id": 1, "label": "Conservative", "action": "Increase budget by 20%", "risk": "low"},
                {"id": 2, "label": "Moderate", "action": "Increase budget by 50%", "risk": "low"},
                {"id": 3, "label": "Aggressive", "action": "Double budget", "risk": "medium"},
            ],
            RuleType.INCREASE_BID: [
                {"id": 1, "label": "Conservative", "action": "Increase bid by 10%", "risk": "low"},
                {"id": 2, "label": "Moderate", "action": "Increase bid by 25%", "risk": "low"},
                {"id": 3, "label": "Aggressive", "action": "Increase bid by 50%", "risk": "medium"},
            ],
        }
        return options_map.get(rule_type, [
            {"id": 1, "label": "Apply", "action": "Apply recommended change", "risk": "low"}
        ])

    def _prioritize(
        self,
        recommendations: List[Dict]
    ) -> List[Dict]:
        """Deduplicate and prioritize recommendations."""
        # Remove duplicates (same entity + same type)
        seen = set()
        unique = []
        for rec in recommendations:
            key = (rec["type"], str(rec.get("affected_entities", {})))
            if key not in seen:
                seen.add(key)
                unique.append(rec)

        # Sort by severity and impact
        severity_order = {"critical": 0, "warning": 1, "opportunity": 2, "info": 3}

        unique.sort(key=lambda r: (
            severity_order.get(r["severity"], 99),
            -(r["impact_estimate"].get("monthly_savings", 0) or
              r["impact_estimate"].get("potential_gain", 0))
        ))

        # Limit per type
        type_counts = {}
        limited = []
        for rec in unique:
            count = type_counts.get(rec["type"], 0)
            if count < 5:  # Max 5 per type
                limited.append(rec)
                type_counts[rec["type"]] = count + 1

        return limited[:50]  # Max 50 total recommendations
```

---

## Automation Rules

### User-Defined Automation

```python
# app/services/automation/service.py
from typing import List, Dict, Any
from datetime import datetime

from app.integrations.google_ads.client import GoogleAdsClient
from app.services.notification_service import NotificationService
from app.repositories.automation_repo import AutomationRepository
from app.core.logging import logger

class AutomationService:
    """Execute user-defined automation rules."""

    def __init__(
        self,
        automation_repo: AutomationRepository,
        google_ads: GoogleAdsClient,
        notifications: NotificationService
    ):
        self.repo = automation_repo
        self.google_ads = google_ads
        self.notifications = notifications

    async def evaluate_rules(
        self,
        ad_account_id: str
    ) -> List[Dict[str, Any]]:
        """
        Evaluate all active automation rules for an account.
        Called by hourly cron job.
        """
        # Get active rules
        rules = await self.repo.get_active_rules(ad_account_id)

        executions = []

        for rule in rules:
            try:
                # Find entities matching rule conditions
                matches = await self._find_matches(rule)

                for entity in matches:
                    # Execute action
                    execution = await self._execute_rule(rule, entity)
                    executions.append(execution)

                    # Send notification if configured
                    if rule.notification_channels:
                        await self._notify(rule, entity, execution)

            except Exception as e:
                logger.error(f"Error executing rule {rule.id}: {e}")

        return executions

    async def _find_matches(
        self,
        rule
    ) -> List[Any]:
        """Find entities matching rule conditions."""
        if rule.trigger_type == "keyword_waste":
            return await self._find_wasting_keywords(
                rule.ad_account_id,
                rule.conditions
            )
        elif rule.trigger_type == "budget_overspend":
            return await self._find_overspending_campaigns(
                rule.ad_account_id,
                rule.conditions
            )
        elif rule.trigger_type == "anomaly_detected":
            return await self._find_anomalies(
                rule.ad_account_id,
                rule.conditions
            )
        # ... more trigger types

    async def _find_wasting_keywords(
        self,
        ad_account_id: str,
        conditions: Dict
    ) -> List:
        """Find keywords matching waste conditions."""
        spend_threshold = conditions.get("spend_threshold", 50)
        days = conditions.get("days", 7)
        conversions = conditions.get("conversions", 0)

        return await self.keyword_repo.find_wasting(
            ad_account_id=ad_account_id,
            min_spend=spend_threshold,
            days=days,
            max_conversions=conversions
        )

    async def _execute_rule(
        self,
        rule,
        entity
    ) -> Dict[str, Any]:
        """Execute the rule action on an entity."""
        before_state = {
            "status": entity.status,
            "bid": getattr(entity, "cpc_bid", None)
        }

        if rule.action == "pause":
            await self.google_ads.pause_keyword(
                customer_id=rule.ad_account.platform_account_id,
                keyword_id=entity.platform_keyword_id
            )
            after_state = {"status": "paused"}

        elif rule.action == "reduce_bid":
            new_bid = int(entity.cpc_bid * 0.5)  # Reduce by 50%
            await self.google_ads.update_keyword_bid(
                customer_id=rule.ad_account.platform_account_id,
                keyword_id=entity.platform_keyword_id,
                new_bid=new_bid
            )
            after_state = {"bid": new_bid}

        elif rule.action == "alert_only":
            after_state = before_state  # No change

        # Log execution
        execution = await self.repo.create_execution({
            "rule_id": rule.id,
            "affected_entities": {"keyword_id": entity.id},
            "action_taken": rule.action,
            "before_state": before_state,
            "after_state": after_state,
            "executed_at": datetime.utcnow()
        })

        # Update rule stats
        await self.repo.update_rule_stats(rule.id)

        return execution

    async def _notify(
        self,
        rule,
        entity,
        execution
    ) -> None:
        """Send notification about rule execution."""
        for channel in rule.notification_channels:
            await self.notifications.send(
                user_id=rule.ad_account.organization.owner_id,
                type="automation_executed",
                channel=channel,
                data={
                    "rule_name": rule.name,
                    "action": rule.action,
                    "entity": entity.to_dict(),
                    "execution_id": execution.id
                }
            )
```

---

## ML Training Pipeline

### Training Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ML TRAINING PIPELINE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

TRIGGER (Cloud Scheduler)
     │
     │ Weekly: Sunday 3am
     │
     ▼
┌──────────────┐
│   Pub/Sub    │
│   Trigger    │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Cloud      │────►│   Dataflow   │────►│   BigQuery   │
│   Function   │     │   (ETL)      │     │   (Training  │
│   (trigger)  │     │              │     │    Data)     │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                     ┌─────────────────────────────────────┐
                     │         TRAINING JOBS               │
                     │                                     │
                     │  ┌─────────────────────────────┐   │
                     │  │ BigQuery ML (ARIMA_PLUS)    │   │
                     │  │ - Spend forecast            │   │
                     │  │ - Anomaly detection         │   │
                     │  └─────────────────────────────┘   │
                     │                                     │
                     │  ┌─────────────────────────────┐   │
                     │  │ Vertex AI AutoML            │   │
                     │  │ - Conversion prediction     │   │
                     │  │ - Search term classification│   │
                     │  └─────────────────────────────┘   │
                     │                                     │
                     │  ┌─────────────────────────────┐   │
                     │  │ Vertex AI Training          │   │
                     │  │ - TFT forecasting           │   │
                     │  │ - Custom models             │   │
                     │  └─────────────────────────────┘   │
                     └─────────────────────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────────────┐
                     │       MODEL EVALUATION              │
                     │                                     │
                     │  - Compare with previous version    │
                     │  - Check accuracy metrics           │
                     │  - Validate on holdout set          │
                     │                                     │
                     └─────────────────────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────────────┐
                     │       DEPLOYMENT (if improved)      │
                     │                                     │
                     │  - Update Model Registry            │
                     │  - Deploy to Vertex AI Endpoint     │
                     │  - Update BigQuery ML model         │
                     │                                     │
                     └─────────────────────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────────────┐
                     │       MONITORING                    │
                     │                                     │
                     │  - Log training metrics             │
                     │  - Alert on failures                │
                     │  - Track model drift                │
                     │                                     │
                     └─────────────────────────────────────┘
```

### Training Job Implementation

```python
# app/workers/ml_training_worker.py
from google.cloud import bigquery
from google.cloud import aiplatform
from datetime import datetime

from app.config import settings
from app.core.logging import logger

class MLTrainingWorker:
    """Weekly ML model training job."""

    def __init__(self):
        self.bq_client = bigquery.Client()
        aiplatform.init(
            project=settings.GCP_PROJECT_ID,
            location=settings.GCP_LOCATION
        )

    async def run_training_pipeline(self):
        """Execute full training pipeline."""
        logger.info("Starting ML training pipeline")

        results = {
            "started_at": datetime.utcnow(),
            "models": []
        }

        # 1. Train BigQuery ML models
        bqml_results = await self._train_bqml_models()
        results["models"].extend(bqml_results)

        # 2. Train Vertex AI models
        vertex_results = await self._train_vertex_models()
        results["models"].extend(vertex_results)

        # 3. Evaluate and deploy
        for model in results["models"]:
            if model["improved"]:
                await self._deploy_model(model)

        results["completed_at"] = datetime.utcnow()
        logger.info(f"Training pipeline completed: {results}")

        return results

    async def _train_bqml_models(self) -> List[Dict]:
        """Train BigQuery ML models."""
        results = []

        # Train spend forecast model
        query = """
        CREATE OR REPLACE MODEL `adsmaster.ml_models.spend_forecast_v{version}`
        OPTIONS(
            model_type = 'ARIMA_PLUS',
            time_series_timestamp_col = 'date',
            time_series_data_col = 'daily_spend',
            time_series_id_col = 'campaign_id',
            horizon = 30,
            auto_arima = TRUE
        ) AS
        SELECT date, campaign_id, SUM(cost_micros)/1000000 AS daily_spend
        FROM `adsmaster.analytics.campaign_metrics_daily`
        WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)
        GROUP BY date, campaign_id
        HAVING daily_spend > 0
        """.format(version=datetime.utcnow().strftime("%Y%m%d"))

        job = self.bq_client.query(query)
        job.result()  # Wait for completion

        # Evaluate model
        eval_result = await self._evaluate_bqml_model(
            "spend_forecast",
            new_version=datetime.utcnow().strftime("%Y%m%d")
        )

        results.append({
            "name": "spend_forecast",
            "type": "BQML",
            **eval_result
        })

        return results

    async def _train_vertex_models(self) -> List[Dict]:
        """Train Vertex AI models."""
        results = []

        # Train conversion prediction model
        dataset = aiplatform.TabularDataset.create(
            display_name=f"conversion_training_{datetime.utcnow().strftime('%Y%m%d')}",
            bq_source=f"bq://{settings.GCP_PROJECT_ID}.adsmaster.ml_training.keyword_features"
        )

        job = aiplatform.AutoMLTabularTrainingJob(
            display_name="conversion_prediction",
            optimization_prediction_type="classification",
            optimization_objective="maximize-au-prc"
        )

        model = job.run(
            dataset=dataset,
            target_column="has_converted",
            training_fraction_split=0.8,
            validation_fraction_split=0.1,
            test_fraction_split=0.1,
            model_display_name=f"conversion_prediction_v{datetime.utcnow().strftime('%Y%m%d')}"
        )

        # Evaluate
        eval_result = model.evaluate()

        results.append({
            "name": "conversion_prediction",
            "type": "VertexAI",
            "metrics": eval_result.metrics,
            "improved": eval_result.metrics["auPrc"] > 0.7  # Threshold
        })

        return results

    async def _deploy_model(self, model: Dict):
        """Deploy model to endpoint."""
        if model["type"] == "VertexAI":
            endpoint = aiplatform.Endpoint.list(
                filter=f'display_name="{model["name"]}_endpoint"'
            )[0]

            endpoint.deploy(
                model=model["model"],
                deployed_model_display_name=model["name"],
                traffic_percentage=100
            )
            logger.info(f"Deployed {model['name']} to Vertex AI endpoint")

        elif model["type"] == "BQML":
            # BQML models are automatically available
            logger.info(f"BQML model {model['name']} is ready")
```

---

## Summary

### AI/ML Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| LLM Chat | Gemini 2.5 Flash/Pro | Natural language interaction |
| Forecasting | BigQuery ML ARIMA_PLUS | Spend/conversion predictions |
| Classification | Vertex AI AutoML | Search term relevance |
| Anomaly Detection | BigQuery ML | Unusual patterns |
| Recommendation Engine | Custom Python + Rules | Actionable insights |
| Automation | Cloud Functions | Auto-apply rules |

### Key Features

1. **Two AI Brains** - LLM for language, ML for predictions
2. **50+ Recommendation Rules** - Comprehensive optimization coverage
3. **Weekly Model Training** - Fresh predictions
4. **Real-time Anomaly Detection** - Instant alerts
5. **User-defined Automation** - Custom rules

### Cost Estimates

| Component | Monthly Cost |
|-----------|--------------|
| Gemini API | $50-200 (usage-based) |
| BigQuery ML | $25-100 (query-based) |
| Vertex AI | $100-500 (training + endpoints) |
| **Total AI/ML** | **$175-800/month** |

---

*Document Version: 1.0*
*Created: March 2026*
*Status: READY FOR REVIEW*
