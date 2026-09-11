from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.dependencies.auth import get_current_user
from src.core.config import get_settings
from src.core.database import get_db
from src.models.entities import IntegrationSettings, User
from src.schemas.integrations import IntegrationRead, IntegrationUpdate
from src.services.access import require_membership

router = APIRouter(prefix="/integrations", tags=["integrations"])


def serialize(record: IntegrationSettings) -> IntegrationRead:
    return IntegrationRead(
        mode=get_settings().integrations_mode,
        serper_configured=bool(record.serper_api_key), openai_configured=bool(record.openai_api_key),
        openai_model=record.openai_model, vercel_configured=bool(record.vercel_token),
        evolution_configured=bool(record.evolution_url and record.evolution_api_key and record.evolution_instance),
        evolution_url=record.evolution_url, evolution_instance=record.evolution_instance,
    )


def get_record(db: Session, organization_id: str) -> IntegrationSettings:
    record = db.scalar(select(IntegrationSettings).where(IntegrationSettings.organization_id == organization_id))
    if not record:
        record = IntegrationSettings(organization_id=organization_id)
        db.add(record)
        db.flush()
    return record


@router.get("", response_model=IntegrationRead)
def get_integrations(organization_id: str = Query(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_membership(db, organization_id, user.id)
    return serialize(get_record(db, organization_id))


@router.put("", response_model=IntegrationRead)
def update_integrations(payload: IntegrationUpdate, organization_id: str = Query(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_membership(db, organization_id, user.id, {"admin"})
    record = get_record(db, organization_id)
    secret_fields = {"serper_api_key", "openai_api_key", "vercel_token", "evolution_api_key"}
    for key, value in payload.model_dump(exclude_none=True).items():
        if key in secret_fields and not value.strip():
            continue
        setattr(record, key, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(record)
    return serialize(record)
