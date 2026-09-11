from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from src.models.entities import Company, Operation, OperationCompany
from src.schemas.operations import OperationCreate


class OperationRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, payload: OperationCreate, user_id: str) -> Operation:
        scheduled_for = payload.scheduled_for
        if scheduled_for and scheduled_for.tzinfo is None:
            scheduled_for = scheduled_for.replace(tzinfo=UTC)
        is_future = scheduled_for and scheduled_for > datetime.now(UTC)
        operation = Operation(
            **payload.model_dump(exclude={"scheduled_for"}),
            scheduled_for=scheduled_for,
            created_by=user_id,
            status="scheduled" if is_future else "queued",
        )
        self.session.add(operation)
        self.session.commit()
        self.session.refresh(operation)
        return operation

    def list(self, organization_id: str) -> list[Operation]:
        statement: Select[tuple[Operation]] = (
            select(Operation)
            .where(Operation.organization_id == organization_id)
            .order_by(Operation.created_at.desc())
        )
        return list(self.session.scalars(statement))

    def get(self, operation_id: str) -> Operation | None:
        return self.session.get(Operation, operation_id)

    def companies(self, operation_id: str) -> list[tuple[OperationCompany, Company]]:
        return list(
            self.session.execute(
                select(OperationCompany, Company)
                .join(Company, Company.id == OperationCompany.company_id)
                .where(OperationCompany.operation_id == operation_id)
                .order_by(OperationCompany.created_at.desc())
            ).all()
        )
