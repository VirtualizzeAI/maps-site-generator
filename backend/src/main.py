from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.api.router import api_router
from src.core.config import get_settings
from src.core.database import init_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    settings.generated_sites_dir.mkdir(parents=True, exist_ok=True)
    init_database()
    yield


settings = get_settings()
app = FastAPI(
    title="Virtualizze Prospector API",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)
settings.generated_sites_dir.mkdir(parents=True, exist_ok=True)
app.mount("/generated", StaticFiles(directory=settings.generated_sites_dir, html=True), name="generated-sites")
