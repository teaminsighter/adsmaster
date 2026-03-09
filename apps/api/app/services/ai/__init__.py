"""
AI Provider Service - Multi-provider LLM abstraction.

Supports:
- Google Gemini (gemini-2.5-flash, gemini-2.5-pro)
- OpenAI (gpt-4o, gpt-4o-mini)
- Anthropic Claude (claude-3-opus, claude-3-sonnet, claude-3-haiku)

Provider can be switched from admin settings without code changes.
"""

from .base import AIProvider, AIResponse, AIMessage
from .factory import get_ai_provider, AIProviderType
from .gemini import GeminiProvider
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider

__all__ = [
    "AIProvider",
    "AIResponse",
    "AIMessage",
    "get_ai_provider",
    "AIProviderType",
    "GeminiProvider",
    "OpenAIProvider",
    "AnthropicProvider",
]
