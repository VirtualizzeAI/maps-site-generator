from fastapi import APIRouter

from src.api.routes import auth, companies, dashboard, health, integrations, messages, operations, users

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/api/v1")
api_router.include_router(operations.router, prefix="/api/v1")
api_router.include_router(companies.router, prefix="/api/v1")
api_router.include_router(messages.router, prefix="/api/v1")
api_router.include_router(integrations.router, prefix="/api/v1")
api_router.include_router(dashboard.router, prefix="/api/v1")
api_router.include_router(users.router, prefix="/api/v1")
