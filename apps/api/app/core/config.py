from pydantic_settings import BaseSettings
from functools import lru_cache


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

    # Meta Ads
    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_redirect_uri: str = "http://localhost:8000/auth/meta/callback"

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
