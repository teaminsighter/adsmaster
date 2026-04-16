from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # App
    app_name: str = "AdsMaster API"
    debug: bool = False

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Google Ads
    google_ads_developer_token: str = ""
    google_ads_client_id: str = ""
    google_ads_client_secret: str = ""
    google_ads_redirect_uri: str = "http://localhost:8000/auth/google-ads/callback"

    # Google User Auth (Sign in with Google)
    google_auth_redirect_uri: str = "http://localhost:8081/auth/google/callback"

    # Meta Ads
    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_redirect_uri: str = "http://localhost:8000/auth/meta/callback"

    # GCP / Vertex AI / BigQuery ML
    gcp_project_id: Optional[str] = None
    gcp_location: str = "us-central1"
    google_application_credentials: Optional[str] = None
    bigquery_dataset: str = "adsmaster_ml"

    # AI Providers
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None

    # Email (Resend)
    resend_api_key: Optional[str] = None
    email_from_address: str = "AdsMaster <noreply@adsmaster.io>"
    email_from_name: str = "AdsMaster"

    # Stripe
    stripe_secret_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None

    # Redis
    redis_url: str = "redis://localhost:6379"

    # URLs
    api_url: str = "http://localhost:8000"
    web_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Singleton instance for convenience imports
settings = get_settings()
