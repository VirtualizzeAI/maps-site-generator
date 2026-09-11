from pydantic import BaseModel, Field


class IntegrationRead(BaseModel):
    mode: str
    serper_configured: bool
    openai_configured: bool
    openai_model: str
    vercel_configured: bool
    evolution_configured: bool
    evolution_url: str | None
    evolution_instance: str | None


class IntegrationUpdate(BaseModel):
    serper_api_key: str | None = Field(None, max_length=500)
    openai_api_key: str | None = Field(None, max_length=500)
    openai_model: str | None = Field(None, max_length=120)
    vercel_token: str | None = Field(None, max_length=1000)
    evolution_url: str | None = Field(None, max_length=1000)
    evolution_api_key: str | None = Field(None, max_length=1000)
    evolution_instance: str | None = Field(None, max_length=160)
