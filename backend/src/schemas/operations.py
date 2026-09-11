from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ApprovalMode = Literal["automatic", "human_review"]


class OperationCreate(BaseModel):
    organization_id: str
    niche: str = Field(min_length=2, max_length=120)
    city: str = Field(min_length=2, max_length=160)
    target_count: int = Field(ge=1, le=500)
    approval_mode: ApprovalMode = "automatic"
    message_template: str = Field(min_length=1, max_length=4000)
    scheduled_for: datetime | None = None


class OperationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    organization_id: str
    niche: str
    city: str
    target_count: int
    approval_mode: str
    message_template: str
    status: str
    scheduled_for: datetime | None
    started_at: datetime | None
    finished_at: datetime | None
    error_message: str | None
    found_count: int
    analyzed_count: int
    generated_count: int
    sent_count: int
    discarded_count: int
    blocked_count: int
    created_at: datetime
    updated_at: datetime


class OperationCompanyRead(BaseModel):
    id: str
    company_id: str
    name: str
    phone: str | None
    website: str | None
    status: str
    discard_reason: str | None
    score: float | None
    generated_site_url: str | None
    final_message: str | None
    updated_at: datetime


class OperationDetail(OperationRead):
    companies: list[OperationCompanyRead]
