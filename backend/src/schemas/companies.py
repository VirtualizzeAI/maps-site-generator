from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CompanyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    phone: str | None
    address: str | None
    city: str | None
    category: str | None
    website: str | None
    prospected_at: datetime | None
    prospected_operation_id: str | None
    created_at: datetime
    updated_at: datetime
