from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)


class OrganizationAccess(BaseModel):
    id: str
    name: str
    role: str


class CurrentUser(BaseModel):
    id: str
    name: str
    email: str
    organizations: list[OrganizationAccess]


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CurrentUser
