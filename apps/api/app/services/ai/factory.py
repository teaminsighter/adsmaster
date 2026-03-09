"""
AI Provider Factory - Create AI providers based on settings.

Allows switching between Gemini, OpenAI, and Anthropic from admin settings.
"""

from enum import Enum
from typing import Optional, Dict, Any
import os

from .base import AIProvider
from .gemini import GeminiProvider
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider


class AIProviderType(str, Enum):
    """Available AI provider types."""
    GEMINI = "gemini"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


# Provider registry
PROVIDERS = {
    AIProviderType.GEMINI: GeminiProvider,
    AIProviderType.OPENAI: OpenAIProvider,
    AIProviderType.ANTHROPIC: AnthropicProvider,
}

# Default models for each provider
DEFAULT_MODELS = {
    AIProviderType.GEMINI: "gemini-2.5-flash",
    AIProviderType.OPENAI: "gpt-4o-mini",
    AIProviderType.ANTHROPIC: "claude-sonnet-4-20250514",
}


def get_ai_provider(
    provider_type: Optional[AIProviderType] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    settings: Optional[Dict[str, Any]] = None
) -> AIProvider:
    """
    Get an AI provider instance.

    Args:
        provider_type: Which provider to use (gemini, openai, anthropic)
        api_key: API key for the provider (or uses env var)
        model: Specific model to use
        settings: Admin settings dict (from database)

    Returns:
        Configured AIProvider instance
    """

    # 1. Check settings from database/admin panel
    if settings:
        provider_type = provider_type or AIProviderType(settings.get("ai_provider", "gemini"))
        model = model or settings.get("ai_model")
        # API keys from settings
        if not api_key:
            if provider_type == AIProviderType.GEMINI:
                api_key = settings.get("gemini_api_key")
            elif provider_type == AIProviderType.OPENAI:
                api_key = settings.get("openai_api_key")
            elif provider_type == AIProviderType.ANTHROPIC:
                api_key = settings.get("anthropic_api_key")

    # 2. Check environment variables (default to OpenAI for better JSON handling)
    if not provider_type:
        env_provider = os.getenv("AI_PROVIDER", "openai").lower()
        provider_type = AIProviderType(env_provider)

    # 3. Get provider class
    provider_class = PROVIDERS.get(provider_type, GeminiProvider)

    # 4. Get API key from environment if not provided
    if not api_key:
        if provider_type == AIProviderType.GEMINI:
            api_key = os.getenv("GOOGLE_AI_API_KEY") or os.getenv("GEMINI_API_KEY")
        elif provider_type == AIProviderType.OPENAI:
            api_key = os.getenv("OPENAI_API_KEY")
        elif provider_type == AIProviderType.ANTHROPIC:
            api_key = os.getenv("ANTHROPIC_API_KEY")

    # 5. Create and return provider
    return provider_class(api_key=api_key, model=model)


def get_available_providers() -> Dict[str, Dict[str, Any]]:
    """
    Get list of available AI providers and their models.

    Used by admin panel to show options.
    """
    return {
        "gemini": {
            "name": "Google Gemini",
            "description": "Google's latest AI models (Gemini 2.5)",
            "models": GeminiProvider(api_key="").available_models,
            "default_model": DEFAULT_MODELS[AIProviderType.GEMINI],
            "env_key": "GOOGLE_AI_API_KEY or GEMINI_API_KEY",
            "pricing_url": "https://ai.google.dev/pricing",
            "features": ["Fast", "Multimodal", "Long context (1M tokens)"],
        },
        "openai": {
            "name": "OpenAI ChatGPT",
            "description": "OpenAI's GPT models (GPT-4o, o1)",
            "models": OpenAIProvider(api_key="").available_models,
            "default_model": DEFAULT_MODELS[AIProviderType.OPENAI],
            "env_key": "OPENAI_API_KEY",
            "pricing_url": "https://openai.com/pricing",
            "features": ["Widely used", "Strong reasoning", "Function calling"],
        },
        "anthropic": {
            "name": "Anthropic Claude",
            "description": "Anthropic's Claude models (Claude 4)",
            "models": AnthropicProvider(api_key="").available_models,
            "default_model": DEFAULT_MODELS[AIProviderType.ANTHROPIC],
            "env_key": "ANTHROPIC_API_KEY",
            "pricing_url": "https://anthropic.com/pricing",
            "features": ["Safety-focused", "Long context", "Strong analysis"],
        },
    }


async def test_provider(provider_type: AIProviderType, api_key: str) -> Dict[str, Any]:
    """
    Test if an AI provider works with the given API key.

    Used by admin panel to validate API keys.
    """
    try:
        provider = get_ai_provider(provider_type=provider_type, api_key=api_key)
        response = await provider.generate_text(
            prompt="Say 'API key is valid' in exactly 4 words.",
            temperature=0,
            max_tokens=20
        )

        return {
            "success": True,
            "provider": provider_type.value,
            "model": provider.model,
            "response": response,
        }
    except Exception as e:
        return {
            "success": False,
            "provider": provider_type.value,
            "error": str(e),
        }
