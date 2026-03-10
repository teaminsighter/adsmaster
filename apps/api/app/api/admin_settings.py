"""
Admin Settings API - Manage platform configuration.

Includes AI provider switching, API key management, and feature flags.

Connected to Supabase database (stored in organization.settings JSONB).
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import os

from ..services.supabase_client import get_supabase_client
from ..services.ai import get_ai_provider, get_available_providers, test_provider, AIProviderType

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# Default settings template
DEFAULT_ADMIN_SETTINGS = {
    "ai_provider": "gemini",
    "ai_model": None,
    "ml_backend": "local",
    "features": {
        "ai_recommendations": True,
        "ai_chat": True,
        "forecasting": True,
        "anomaly_detection": True,
        "auto_apply_recommendations": False,
    },
    "api_keys_configured": {
        "gemini": False,
        "openai": False,
        "anthropic": False,
    }
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


# ============================================================================
# Helper Functions
# ============================================================================

def get_org_settings(organization_id: str) -> Dict[str, Any]:
    """Get admin settings for an organization from database."""
    supabase = get_supabase_client()

    result = supabase.table("organizations").select("settings").eq(
        "id", organization_id
    ).execute()

    if not result.data:
        return DEFAULT_ADMIN_SETTINGS.copy()

    settings = result.data[0].get("settings") or {}

    # Merge with defaults
    merged = DEFAULT_ADMIN_SETTINGS.copy()
    merged.update(settings)

    # Ensure nested dicts are merged too
    if "features" in settings:
        merged["features"] = {**DEFAULT_ADMIN_SETTINGS["features"], **settings["features"]}
    if "api_keys_configured" in settings:
        merged["api_keys_configured"] = {**DEFAULT_ADMIN_SETTINGS["api_keys_configured"], **settings["api_keys_configured"]}

    return merged


def save_org_settings(organization_id: str, settings: Dict[str, Any]) -> bool:
    """Save admin settings for an organization to database."""
    supabase = get_supabase_client()

    result = supabase.table("organizations").update({
        "settings": settings
    }).eq("id", organization_id).execute()

    return bool(result.data)


# ============================================================================
# AI Provider Settings
# ============================================================================

@router.get("/ai/providers")
async def list_ai_providers(
    organization_id: str = Query(..., description="Organization ID")
):
    """
    List available AI providers and their models.

    Returns provider info for admin UI dropdown.
    """
    settings = get_org_settings(organization_id)

    return {
        "providers": get_available_providers(),
        "current": {
            "provider": settings.get("ai_provider", "gemini"),
            "model": settings.get("ai_model"),
        },
    }


@router.put("/ai/settings")
async def update_ai_settings(
    data: AISettingsUpdate,
    organization_id: str = Query(..., description="Organization ID")
):
    """
    Update AI provider settings.

    Allows switching between Gemini, OpenAI, Claude.
    """
    settings = get_org_settings(organization_id)

    if data.ai_provider:
        if data.ai_provider not in ["gemini", "openai", "anthropic"]:
            raise HTTPException(400, "Invalid provider. Must be: gemini, openai, anthropic")
        settings["ai_provider"] = data.ai_provider

    if data.ai_model:
        settings["ai_model"] = data.ai_model

    save_org_settings(organization_id, settings)

    return {
        "success": True,
        "message": f"AI provider updated to {settings['ai_provider']}",
        "settings": {
            "provider": settings["ai_provider"],
            "model": settings.get("ai_model"),
        },
    }


@router.post("/ai/api-key")
async def update_api_key(
    data: APIKeyUpdate,
    organization_id: str = Query(..., description="Organization ID")
):
    """
    Update API key for an AI provider.

    Validates the key by making a test request.
    Note: API keys are stored in environment variables, not database.
    This endpoint validates and marks the provider as configured.
    """
    valid_providers = ["gemini", "openai", "anthropic"]

    if data.provider not in valid_providers:
        raise HTTPException(400, "Invalid provider")

    # Test the key
    try:
        provider_type = AIProviderType(data.provider)
        result = await test_provider(provider_type, data.api_key)

        if not result["success"]:
            raise HTTPException(400, f"API key validation failed: {result.get('error', 'Unknown error')}")

        # Mark as configured in settings
        settings = get_org_settings(organization_id)
        if "api_keys_configured" not in settings:
            settings["api_keys_configured"] = {}
        settings["api_keys_configured"][data.provider] = True
        save_org_settings(organization_id, settings)

        return {
            "success": True,
            "message": f"{data.provider.title()} API key validated and saved",
            "test_response": result.get("response", ""),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"API key validation failed: {str(e)}")


@router.post("/ai/test")
async def test_ai_connection(
    organization_id: str = Query(..., description="Organization ID")
):
    """
    Test current AI provider connection.

    Makes a simple request to verify API key and model work.
    """
    settings = get_org_settings(organization_id)

    try:
        # Build settings dict for AI provider
        ai_settings = {
            "ai_provider": settings.get("ai_provider", "gemini"),
            "ai_model": settings.get("ai_model"),
            "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
            "openai_api_key": os.getenv("OPENAI_API_KEY", ""),
            "anthropic_api_key": os.getenv("ANTHROPIC_API_KEY", ""),
        }

        provider = get_ai_provider(settings=ai_settings)
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


# ============================================================================
# ML Backend Settings
# ============================================================================

@router.get("/ml/settings")
async def get_ml_settings(
    organization_id: str = Query(..., description="Organization ID")
):
    """Get ML backend settings."""
    settings = get_org_settings(organization_id)

    return {
        "current_backend": settings.get("ml_backend", "local"),
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
async def update_ml_settings(
    data: MLBackendUpdate,
    organization_id: str = Query(..., description="Organization ID")
):
    """Update ML backend settings."""
    valid_backends = ["bigquery_ml", "vertex_ai", "prophet", "local"]
    if data.backend not in valid_backends:
        raise HTTPException(400, f"Invalid backend. Must be one of: {valid_backends}")

    settings = get_org_settings(organization_id)
    settings["ml_backend"] = data.backend
    save_org_settings(organization_id, settings)

    return {
        "success": True,
        "message": f"ML backend updated to {data.backend}",
        "backend": data.backend,
    }


# ============================================================================
# Feature Flags
# ============================================================================

@router.get("/features")
async def get_feature_flags(
    organization_id: str = Query(..., description="Organization ID")
):
    """Get all feature flags."""
    settings = get_org_settings(organization_id)

    return {
        "features": settings.get("features", DEFAULT_ADMIN_SETTINGS["features"]),
    }


@router.put("/features")
async def toggle_feature(
    toggle: FeatureToggle,
    organization_id: str = Query(..., description="Organization ID")
):
    """Toggle a feature flag."""
    settings = get_org_settings(organization_id)

    if "features" not in settings:
        settings["features"] = DEFAULT_ADMIN_SETTINGS["features"].copy()

    if toggle.feature not in settings["features"]:
        raise HTTPException(400, f"Unknown feature: {toggle.feature}")

    settings["features"][toggle.feature] = toggle.enabled
    save_org_settings(organization_id, settings)

    return {
        "success": True,
        "feature": toggle.feature,
        "enabled": toggle.enabled,
    }


# ============================================================================
# Full Settings
# ============================================================================

@router.get("/settings")
async def get_all_settings(
    organization_id: str = Query(..., description="Organization ID")
):
    """
    Get all admin settings.

    Returns sanitized settings (no API keys).
    """
    settings = get_org_settings(organization_id)
    api_keys_configured = settings.get("api_keys_configured", {})

    return {
        "ai": {
            "provider": settings.get("ai_provider", "gemini"),
            "model": settings.get("ai_model"),
            "gemini_configured": api_keys_configured.get("gemini", bool(os.getenv("GEMINI_API_KEY"))),
            "openai_configured": api_keys_configured.get("openai", bool(os.getenv("OPENAI_API_KEY"))),
            "anthropic_configured": api_keys_configured.get("anthropic", bool(os.getenv("ANTHROPIC_API_KEY"))),
        },
        "ml": {
            "backend": settings.get("ml_backend", "local"),
        },
        "features": settings.get("features", DEFAULT_ADMIN_SETTINGS["features"]),
    }


def get_current_settings(organization_id: str = None) -> Dict[str, Any]:
    """
    Get current settings dict for use by other services.

    Called by AI/ML services to get configuration.
    """
    if organization_id:
        settings = get_org_settings(organization_id)
    else:
        settings = DEFAULT_ADMIN_SETTINGS.copy()

    # Add env var API keys
    settings["gemini_api_key"] = os.getenv("GEMINI_API_KEY", "")
    settings["openai_api_key"] = os.getenv("OPENAI_API_KEY", "")
    settings["anthropic_api_key"] = os.getenv("ANTHROPIC_API_KEY", "")

    return settings
