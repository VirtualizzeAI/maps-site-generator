from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class ApprovalMode(StrEnum):
    AUTOMATIC = "automatic"
    HUMAN_REVIEW = "human_review"


class OperationCreate(BaseModel):
    organization_id: UUID
    niche: str = Field(min_length=2, max_length=120)
    city: str = Field(min_length=2, max_length=160)
    target_count: int = Field(ge=1, le=500)
    approval_mode: ApprovalMode = ApprovalMode.AUTOMATIC
    message_template: str = Field(min_length=1, max_length=4000)
    whatsapp_integration_id: UUID | None = None
    scheduled_for: datetime | None = None


class OperationRead(BaseModel):
    id: UUID
    organization_id: UUID
    niche: str
    city: str
    target_count: int
    approval_mode: ApprovalMode
    status: str
    scheduled_for: datetime | None
    created_at: datetime
    updated_at: datetime
