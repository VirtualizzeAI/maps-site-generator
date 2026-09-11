from functools import lru_cache

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "virtualizze-prospector-api"
    environment: str = "development"
    frontend_url: str = "http://localhost:3000"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    redis_url: str = "redis://redis:6379/0"
    serper_api_key: str = ""
    openai_api_key: str = ""
    vercel_token: str = ""
    evolution_url: str = ""
    evolution_api_key: str = ""
    evolution_instance: str = ""
    cors_origins: str = Field(default="")

    @computed_field
    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @computed_field
    @property
    def frontend_origins(self) -> list[str]:
        configured = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return configured or [self.frontend_url]


@lru_cache
def get_settings() -> Settings:
    return Settings()
