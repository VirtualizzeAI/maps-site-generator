from functools import lru_cache

from fastapi import HTTPException, status
from supabase import Client, create_client

from src.core.config import get_settings


@lru_cache
def _create_supabase_client() -> Client:
    settings = get_settings()
    if not settings.supabase_configured:
        raise RuntimeError("Supabase não configurado")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase() -> Client:
    try:
        return _create_supabase_client()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
