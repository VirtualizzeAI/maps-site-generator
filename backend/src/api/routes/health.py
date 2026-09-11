from fastapi import APIRouter

from src.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str | bool]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "database": "sqlite" if settings.database_url.startswith("sqlite") else "postgresql",
        "integrations_mode": settings.integrations_mode,
    }
