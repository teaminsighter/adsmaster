"""
Supabase Client

Singleton client for database operations.
"""

from functools import lru_cache
from supabase import create_client, Client

from ..core.config import get_settings


@lru_cache()
def get_supabase_client() -> Client:
    """
    Get Supabase client instance.

    Uses service role key for backend operations (bypasses RLS).
    """
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )

    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )


def get_supabase_anon_client() -> Client:
    """
    Get Supabase client with anon key (respects RLS).

    Use this for user-context operations.
    """
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_anon_key:
        raise RuntimeError(
            "Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY."
        )

    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
    )
