from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserRead(BaseModel):
    id: str
    name: str
    email: str
    role: str
    active: bool
    created_at: datetime


class UserCreate(BaseModel):
    organization_id: str
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    role: Literal["admin", "operator", "viewer"] = "operator"


class UserStatusUpdate(BaseModel):
    active: bool
