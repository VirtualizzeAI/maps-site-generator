from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.api.dependencies.auth import get_current_user
from src.core.database import get_db
from src.models.entities import Company, GeneratedSite, Message, Operation, OperationCompany, User
from src.schemas.dashboard import DashboardSummary
from src.services.access import require_membership

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(
    organization_id: Annotated[str, Query()],
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
):
    require_membership(session, organization_id, user.id)
    operation_ids = select(Operation.id).where(Operation.organization_id == organization_id)
    running = session.scalar(
        select(Operation.id)
        .where(
            Operation.organization_id == organization_id,
            Operation.status.in_(["queued", "scheduled", "searching", "analyzing", "generating", "deploying", "sending"]),
        )
        .order_by(Operation.created_at.desc())
        .limit(1)
    )
    return DashboardSummary(
        companies=session.scalar(select(func.count()).select_from(Company).where(Company.organization_id == organization_id)) or 0,
        operations=session.scalar(select(func.count()).select_from(Operation).where(Operation.organization_id == organization_id)) or 0,
        sites_generated=session.scalar(select(func.count()).select_from(GeneratedSite).join(OperationCompany).where(OperationCompany.operation_id.in_(operation_ids))) or 0,
        messages_sent=session.scalar(select(func.count()).select_from(Message).join(OperationCompany).where(OperationCompany.operation_id.in_(operation_ids), Message.status == "sent")) or 0,
        discarded=session.scalar(select(func.count()).select_from(OperationCompany).where(OperationCompany.operation_id.in_(operation_ids), OperationCompany.status.in_(["discarded_no_phone", "discarded_site_real"]))) or 0,
        blocked=session.scalar(select(func.count()).select_from(OperationCompany).where(OperationCompany.operation_id.in_(operation_ids), OperationCompany.status == "blocked_history")) or 0,
        pending_approval=session.scalar(select(func.count()).select_from(Message).join(OperationCompany).where(OperationCompany.operation_id.in_(operation_ids), Message.status == "pending_approval")) or 0,
        running_operation_id=running,
    )
