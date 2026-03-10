"""
Database Client

Re-exports from database.py for backwards compatibility.
All existing code importing from supabase_client will continue to work.
"""

from .database import get_supabase_client, get_db_client, DatabaseClient

__all__ = ["get_supabase_client", "get_db_client", "DatabaseClient"]
