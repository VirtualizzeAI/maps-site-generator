from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.api.dependencies.auth import get_current_user
from src.core.config import get_settings
from src.core.database import get_db
from src.integrations.whatsapp import send_whatsapp
from src.models.entities import Company, IntegrationSettings, Message, Operation, OperationCompany, User
from src.schemas.messages import MessageRead, MessageUpdate
from src.services.access import require_membership

router = APIRouter(prefix="/messages", tags=["messages"])


def _read(message: Message, link: OperationCompany, company: Company) -> MessageRead:
    return MessageRead(id=message.id, operation_company_id=link.id, company_name=company.name, recipient=message.recipient, content=message.content, status=message.status, site_url=link.generated_site_url, created_at=message.created_at)


@router.get("", response_model=list[MessageRead])
def list_messages(organization_id: str = Query(...), status: str | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_membership(db, organization_id, user.id)
    statement = select(Message, OperationCompany, Company).join(OperationCompany, OperationCompany.id == Message.operation_company_id).join(Company, Company.id == OperationCompany.company_id).where(OperationCompany.organization_id == organization_id)
    if status:
        statement = statement.where(Message.status == status)
    return [_read(*row) for row in db.execute(statement.order_by(Message.created_at.desc())).all()]


@router.post("/{message_id}/approve", response_model=MessageRead)
def approve_message(message_id: str, payload: MessageUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.execute(select(Message, OperationCompany, Company, Operation).join(OperationCompany, OperationCompany.id == Message.operation_company_id).join(Company, Company.id == OperationCompany.company_id).join(Operation, Operation.id == OperationCompany.operation_id).where(Message.id == message_id)).first()
    if not row:
        raise HTTPException(404, "Mensagem não encontrada")
    message, link, company, operation = row
    require_membership(db, operation.organization_id, user.id)
    if message.status != "pending_approval":
        raise HTTPException(409, "A mensagem não está aguardando aprovação")
    if payload.content:
        message.content = payload.content
        link.final_message = payload.content
    config = db.scalar(select(IntegrationSettings).where(IntegrationSettings.organization_id == operation.organization_id))
    settings = get_settings()
    provider_id = send_whatsapp(
        message.recipient,
        message.content,
        (config.evolution_url if config else None) or settings.evolution_url,
        (config.evolution_api_key if config else None) or settings.evolution_api_key,
        (config.evolution_instance if config else None) or settings.evolution_instance,
        settings.mock_mode,
    )
    now = datetime.now(UTC)
    message.status, message.approved_by, message.approved_at = "sent", user.id, now
    message.provider_message_id, message.sent_at = provider_id, now
    link.status, company.prospected_at, company.prospected_operation_id = "sent", now, operation.id
    operation.sent_count += 1
    remaining = db.scalar(select(func.count(Message.id)).join(OperationCompany).where(OperationCompany.operation_id == operation.id, Message.status == "pending_approval", Message.id != message.id)) or 0
    if remaining == 0:
        operation.status, operation.finished_at = "completed", now
    db.commit()
    db.refresh(message)
    return _read(message, link, company)
