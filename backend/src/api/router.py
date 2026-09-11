from fastapi import APIRouter

from src.api.routes import health, operations

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(operations.router, prefix="/api/v1")
