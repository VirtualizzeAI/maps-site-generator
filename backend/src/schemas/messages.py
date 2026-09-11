from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    operation_company_id: str
    company_name: str
    recipient: str
    content: str
    status: str
    site_url: str | None
    created_at: datetime


class MessageUpdate(BaseModel):
    content: str | None = None
