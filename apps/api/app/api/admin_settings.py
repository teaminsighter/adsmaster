"""
Admin Settings API - Manage platform configuration.

Includes AI provider switching, API key management, and feature flags.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import os

from ..services.ai import get_ai_provider, get_available_providers, test_provider, AIProviderType

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# In-memory settings for demo (production would use database)
_settings = {
    "ai_provider": "gemini",
    "ai_model": None,  # Use default
    "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
    "openai_api_key": os.getenv("OPENAI_API_KEY", ""),
    "anthropic_api_key": os.getenv("ANTHROPIC_API_KEY", ""),
    "ml_backend": "local",  # bigquery_ml, vertex_ai, prophet, local
    "features": {
        "ai_recommendations": True,
        "ai_chat": True,
        "forecasting": True,
        "anomaly_detection": True,
        "auto_apply_recommendations": False,
    },
}


class AISettingsUpdate(BaseModel):
    """Update AI provider settings."""
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None


class APIKeyUpdate(BaseModel):
    """Update API key for a provider."""
    provider: str  # gemini, openai, anthropic
    api_key: str


class FeatureToggle(BaseModel):
    """Toggle a feature flag."""
    feature: str
    enabled: bool


class MLBackendUpdate(BaseModel):
    """Update ML backend settings."""
    backend: str  # bigquery_ml, vertex_ai, prophet, local


# --- AI Provider Settings ---

@router.get("/ai/providers")
async def list_ai_providers():
    """
    List available AI providers and their models.

    Returns provider info for admin UI dropdown.
    """
    return {
        "providers": get_available_providers(),
        "current": {
            "provider": _settings["ai_provider"],
            "model": _settings["ai_model"],
        },
    }


@router.put("/ai/settings")
async def update_ai_settings(settings: AISettingsUpdate):
    """
    Update AI provider settings.

    Allows switching between Gemini, OpenAI, Claude.
    """
    if settings.ai_provider:
        if settings.ai_provider not in ["gemini", "openai", "anthropic"]:
            raise HTTPException(400, "Invalid provider. Must be: gemini, openai, anthropic")
        _settings["ai_provider"] = settings.ai_provider

    if settings.ai_model:
        _settings["ai_model"] = settings.ai_model

    return {
        "success": True,
        "message": f"AI provider updated to {_settings['ai_provider']}",
        "settings": {
            "provider": _settings["ai_provider"],
            "model": _settings["ai_model"],
        },
    }


@router.post("/ai/api-key")
async def update_api_key(data: APIKeyUpdate):
    """
    Update API key for an AI provider.

    Validates the key by making a test request.
    """
    provider_map = {
        "gemini": "gemini_api_key",
        "openai": "openai_api_key",
        "anthropic": "anthropic_api_key",
    }

    if data.provider not in provider_map:
        raise HTTPException(400, "Invalid provider")

    # Test the key
    try:
        provider_type = AIProviderType(data.provider)
        result = await test_provider(provider_type, data.api_key)

        if not result["success"]:
            raise HTTPException(400, f"API key validation failed: {result.get('error', 'Unknown error')}")

        # Save the key
        _settings[provider_map[data.provider]] = data.api_key

        return {
            "success": True,
            "message": f"{data.provider.title()} API key validated and saved",
            "test_response": result.get("response", ""),
        }
    except Exception as e:
        raise HTTPException(400, f"API key validation failed: {str(e)}")


@router.post("/ai/test")
async def test_ai_connection():
    """
    Test current AI provider connection.

    Makes a simple request to verify API key and model work.
    """
    try:
        provider = get_ai_provider(settings=_settings)
        response = await provider.generate_text(
            prompt="Say 'Connection successful' in exactly 2 words.",
            temperature=0,
            max_tokens=20
        )

        return {
            "success": True,
            "provider": provider.provider_name,
            "model": provider.model,
            "response": response,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


# --- ML Backend Settings ---

@router.get("/ml/settings")
async def get_ml_settings():
    """Get ML backend settings."""
    return {
        "current_backend": _settings["ml_backend"],
        "available_backends": [
            {
                "id": "bigquery_ml",
                "name": "BigQuery ML",
                "description": "Google BigQuery ML with ARIMA_PLUS",
                "requires": "GCP Project with BigQuery",
            },
            {
                "id": "vertex_ai",
                "name": "Vertex AI",
                "description": "Google Vertex AI AutoML and custom models",
                "requires": "GCP Project with Vertex AI enabled",
            },
            {
                "id": "prophet",
                "name": "Prophet",
                "description": "Meta's Prophet forecasting library",
                "requires": "prophet package installed",
            },
            {
                "id": "local",
                "name": "Local Statistical",
                "description": "Simple statistical methods (for demo/development)",
                "requires": "Nothing (built-in)",
            },
        ],
    }


@router.put("/ml/settings")
async def update_ml_settings(settings: MLBackendUpdate):
    """Update ML backend settings."""
    valid_backends = ["bigquery_ml", "vertex_ai", "prophet", "local"]
    if settings.backend not in valid_backends:
        raise HTTPException(400, f"Invalid backend. Must be one of: {valid_backends}")

    _settings["ml_backend"] = settings.backend

    return {
        "success": True,
        "message": f"ML backend updated to {settings.backend}",
        "backend": settings.backend,
    }


# --- Feature Flags ---

@router.get("/features")
async def get_feature_flags():
    """Get all feature flags."""
    return {
        "features": _settings["features"],
    }


@router.put("/features")
async def toggle_feature(toggle: FeatureToggle):
    """Toggle a feature flag."""
    if toggle.feature not in _settings["features"]:
        raise HTTPException(400, f"Unknown feature: {toggle.feature}")

    _settings["features"][toggle.feature] = toggle.enabled

    return {
        "success": True,
        "feature": toggle.feature,
        "enabled": toggle.enabled,
    }


# --- Full Settings ---

@router.get("/settings")
async def get_all_settings():
    """
    Get all admin settings.

    Returns sanitized settings (no API keys).
    """
    return {
        "ai": {
            "provider": _settings["ai_provider"],
            "model": _settings["ai_model"],
            "gemini_configured": bool(_settings["gemini_api_key"]),
            "openai_configured": bool(_settings["openai_api_key"]),
            "anthropic_configured": bool(_settings["anthropic_api_key"]),
        },
        "ml": {
            "backend": _settings["ml_backend"],
        },
        "features": _settings["features"],
    }


def get_current_settings() -> Dict[str, Any]:
    """
    Get current settings dict for use by other services.

    Called by AI/ML services to get configuration.
    """
    return _settings.copy()
