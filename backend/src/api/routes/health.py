from fastapi import APIRouter

from src.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str | bool]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "supabase_configured": settings.supabase_configured,
        "redis_configured": bool(settings.redis_url),
    }
