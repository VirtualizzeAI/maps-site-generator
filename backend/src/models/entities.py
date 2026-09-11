from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, TimestampMixin, new_id, utcnow


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160))


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(30), default="operator")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuthToken(Base):
    __tablename__ = "auth_tokens"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class IntegrationSettings(Base, TimestampMixin):
    __tablename__ = "integration_settings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, index=True)
    serper_api_key: Mapped[str | None] = mapped_column(Text)
    openai_api_key: Mapped[str | None] = mapped_column(Text)
    openai_model: Mapped[str] = mapped_column(String(120), default="gpt-5.6-luna")
    vercel_token: Mapped[str | None] = mapped_column(Text)
    evolution_url: Mapped[str | None] = mapped_column(Text)
    evolution_api_key: Mapped[str | None] = mapped_column(Text)
    evolution_instance: Mapped[str | None] = mapped_column(String(160))


class Operation(Base, TimestampMixin):
    __tablename__ = "operations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    niche: Mapped[str] = mapped_column(String(120))
    city: Mapped[str] = mapped_column(String(160))
    target_count: Mapped[int] = mapped_column(Integer)
    approval_mode: Mapped[str] = mapped_column(String(30), default="automatic")
    message_template: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="queued", index=True)
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)
    found_count: Mapped[int] = mapped_column(Integer, default=0)
    analyzed_count: Mapped[int] = mapped_column(Integer, default=0)
    generated_count: Mapped[int] = mapped_column(Integer, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    discarded_count: Mapped[int] = mapped_column(Integer, default=0)
    blocked_count: Mapped[int] = mapped_column(Integer, default=0)


class Company(Base, TimestampMixin):
    __tablename__ = "companies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(240))
    normalized_name: Mapped[str] = mapped_column(String(240), index=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    address: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(160))
    category: Mapped[str | None] = mapped_column(String(160))
    website: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(60), default="google_maps")
    source_id: Mapped[str | None] = mapped_column(String(240))
    raw_data: Mapped[str] = mapped_column(Text, default="{}")
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    prospected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    prospected_operation_id: Mapped[str | None] = mapped_column(String(36))


class CompanyIdentity(Base):
    __tablename__ = "company_identities"
    __table_args__ = (UniqueConstraint("organization_id", "identity_type", "identity_value", name="uq_company_identity"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    identity_type: Mapped[str] = mapped_column(String(40))
    identity_value: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class OperationCompany(Base, TimestampMixin):
    __tablename__ = "operation_companies"
    __table_args__ = (UniqueConstraint("operation_id", "company_id", name="uq_operation_company"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    operation_id: Mapped[str] = mapped_column(ForeignKey("operations.id", ondelete="CASCADE"), index=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(50), default="found")
    discard_reason: Mapped[str | None] = mapped_column(Text)
    score: Mapped[float | None] = mapped_column(Float)
    generated_site_url: Mapped[str | None] = mapped_column(Text)
    final_message: Mapped[str | None] = mapped_column(Text)


class ProspectingClaim(Base):
    __tablename__ = "prospecting_claims"
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True)
    operation_id: Mapped[str] = mapped_column(ForeignKey("operations.id", ondelete="CASCADE"), index=True)
    claimed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DigitalAnalysis(Base):
    __tablename__ = "digital_analyses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    operation_company_id: Mapped[str] = mapped_column(ForeignKey("operation_companies.id", ondelete="CASCADE"), index=True)
    result: Mapped[str] = mapped_column(Text, default="{}")
    score: Mapped[float] = mapped_column(Float, default=0)
    decision: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class GeneratedSite(Base, TimestampMixin):
    __tablename__ = "generated_sites"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    operation_company_id: Mapped[str] = mapped_column(ForeignKey("operation_companies.id", ondelete="CASCADE"), index=True)
    slug: Mapped[str] = mapped_column(String(180))
    html_path: Mapped[str] = mapped_column(Text)
    public_url: Mapped[str | None] = mapped_column(Text)
    deployment_id: Mapped[str | None] = mapped_column(String(240))
    status: Mapped[str] = mapped_column(String(40), default="generated")


class Message(Base, TimestampMixin):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    operation_company_id: Mapped[str] = mapped_column(ForeignKey("operation_companies.id", ondelete="CASCADE"), index=True)
    recipient: Mapped[str] = mapped_column(String(32))
    content: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="pending")
    approved_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    provider_message_id: Mapped[str | None] = mapped_column(String(240))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)


class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    operation_id: Mapped[str | None] = mapped_column(ForeignKey("operations.id", ondelete="CASCADE"), index=True)
    operation_company_id: Mapped[str | None] = mapped_column(ForeignKey("operation_companies.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(80))
    payload: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
