from functools import lru_cache
from pathlib import Path

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "virtualizze-prospector-api"
    environment: str = "development"
    frontend_url: str = "http://localhost:3000"
    cors_origins: str = ""
    public_api_url: str = "http://localhost:8000"
    database_url: str = "sqlite:///./data/prospector.db"
    data_dir: str = "./data"
    worker_poll_seconds: float = 2.0
    integrations_mode: str = "mock"
    admin_name: str = "Administrador"
    admin_email: str = "admin@virtualizze.com"
    admin_password: str = "admin123"
    organization_name: str = "Virtualizze"
    serper_api_key: str = ""
    openai_api_key: str = ""
    openai_model: str = "gpt-5.6-luna"
    vercel_token: str = ""
    evolution_url: str = ""
    evolution_api_key: str = ""
    evolution_instance: str = ""

    @computed_field
    @property
    def frontend_origins(self) -> list[str]:
        configured = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return configured or [self.frontend_url]

    @computed_field
    @property
    def generated_sites_dir(self) -> Path:
        return Path(self.data_dir) / "sites"

    @computed_field
    @property
    def mock_mode(self) -> bool:
        return self.integrations_mode.lower() == "mock"


@lru_cache
def get_settings() -> Settings:
    return Settings()
