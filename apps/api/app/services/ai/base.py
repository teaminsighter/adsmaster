"""
Base AI Provider - Abstract interface for all LLM providers.

All providers (Gemini, OpenAI, Anthropic) implement this interface,
allowing seamless switching between providers.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncGenerator
from dataclasses import dataclass
from enum import Enum


class MessageRole(str, Enum):
    """Message roles in a conversation."""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


@dataclass
class AIMessage:
    """A message in a conversation."""
    role: MessageRole
    content: str


@dataclass
class AIResponse:
    """Response from an AI provider."""
    content: str
    model: str
    provider: str
    usage: Dict[str, int]  # tokens: prompt, completion, total
    finish_reason: str
    raw_response: Optional[Any] = None


class AIProvider(ABC):
    """
    Abstract base class for AI providers.

    All providers must implement these methods to be interchangeable.
    """

    def __init__(self, api_key: str, model: Optional[str] = None):
        self.api_key = api_key
        self.model = model or self.default_model

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g., 'gemini', 'openai', 'anthropic')."""
        pass

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Default model for this provider."""
        pass

    @property
    @abstractmethod
    def available_models(self) -> List[str]:
        """List of available models for this provider."""
        pass

    @abstractmethod
    async def chat(
        self,
        messages: List[AIMessage],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs
    ) -> AIResponse:
        """
        Send a chat completion request.

        Args:
            messages: List of conversation messages
            temperature: Creativity (0-1)
            max_tokens: Maximum response tokens

        Returns:
            AIResponse with generated text
        """
        pass

    @abstractmethod
    async def stream_chat(
        self,
        messages: List[AIMessage],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Stream a chat completion response.

        Yields chunks of text as they're generated.
        """
        pass

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs
    ) -> str:
        """
        Simple text generation from a prompt.

        Convenience method that wraps chat().
        """
        messages = []
        if system_prompt:
            messages.append(AIMessage(role=MessageRole.SYSTEM, content=system_prompt))
        messages.append(AIMessage(role=MessageRole.USER, content=prompt))

        response = await self.chat(messages, temperature, max_tokens, **kwargs)
        return response.content

    async def generate_recommendation_text(
        self,
        rule_type: str,
        entity_data: Dict[str, Any],
        metrics: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Generate human-readable recommendation text.

        Returns dict with 'title', 'description', 'impact_summary'.
        """
        system_prompt = """You are an expert Google Ads and Meta Ads optimizer.
Generate clear, actionable recommendation text for ad account managers.
Be concise but specific. Include numbers when relevant.
Output JSON with keys: title (max 10 words), description (max 50 words), impact_summary (max 15 words)."""

        prompt = f"""Generate recommendation text for this situation:

Rule Type: {rule_type}
Entity: {entity_data}
Metrics: {metrics}

Output valid JSON only."""

        response = await self.generate_text(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.3,
            max_tokens=256
        )

        # Parse JSON response
        import json
        try:
            # Clean response if needed
            clean = response.strip()
            if clean.startswith("```json"):
                clean = clean[7:]
            if clean.startswith("```"):
                clean = clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            return json.loads(clean.strip())
        except json.JSONDecodeError:
            # Fallback
            return {
                "title": f"Recommendation: {rule_type}",
                "description": f"Review {entity_data.get('name', 'entity')} based on recent performance.",
                "impact_summary": "Potential improvement opportunity"
            }

    async def explain_metric(
        self,
        metric_name: str,
        metric_value: Any,
        context: Dict[str, Any]
    ) -> str:
        """
        Generate natural language explanation of a metric.
        """
        system_prompt = """You are an expert at explaining advertising metrics to business users.
Explain metrics in simple terms with actionable insights.
Keep explanations under 100 words."""

        prompt = f"""Explain this advertising metric:

Metric: {metric_name}
Value: {metric_value}
Context: {context}

Provide a clear, business-friendly explanation."""

        return await self.generate_text(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.5,
            max_tokens=200
        )

    async def generate_ad_copy(
        self,
        product_info: Dict[str, Any],
        ad_type: str = "responsive_search",
        tone: str = "professional"
    ) -> Dict[str, List[str]]:
        """
        Generate ad copy suggestions.

        Returns dict with 'headlines' and 'descriptions'.
        """
        system_prompt = f"""You are an expert ad copywriter. Generate compelling {ad_type} ad copy.
Tone: {tone}
Output JSON with 'headlines' (list of 5, max 30 chars each) and 'descriptions' (list of 3, max 90 chars each)."""

        prompt = f"""Generate ad copy for:
{product_info}

Output valid JSON only."""

        response = await self.generate_text(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.8,
            max_tokens=512
        )

        import json
        try:
            clean = response.strip()
            if "```" in clean:
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            return json.loads(clean.strip())
        except json.JSONDecodeError:
            return {
                "headlines": ["Discover Our Products", "Shop Now", "Best Deals Today", "Quality Guaranteed", "Free Shipping"],
                "descriptions": [
                    "Find exactly what you need at great prices.",
                    "Quality products with fast shipping.",
                    "Shop our selection and save today."
                ]
            }

    async def chat_advisor(
        self,
        conversation_history: List[AIMessage],
        ad_account_context: Dict[str, Any]
    ) -> str:
        """
        AI Advisor chat - answer questions about ad performance.
        """
        system_prompt = f"""You are an AI Advertising Advisor for AdsMaster.
You help users optimize their Google Ads and Meta Ads campaigns.

Current Account Context:
{ad_account_context}

Provide helpful, specific advice based on the data available.
If you don't have enough data, ask clarifying questions.
Keep responses concise but actionable."""

        messages = [AIMessage(role=MessageRole.SYSTEM, content=system_prompt)]
        messages.extend(conversation_history)

        response = await self.chat(messages, temperature=0.7, max_tokens=1024)
        return response.content
