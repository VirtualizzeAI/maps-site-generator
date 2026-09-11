from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.models.entities import Operation, User
from src.repositories.operations import OperationRepository
from src.schemas.operations import OperationCompanyRead, OperationCreate, OperationDetail, OperationRead
from src.services.access import require_membership


class OperationService:
    def __init__(self, session: Session):
        self.session = session
        self.repository = OperationRepository(session)

    def create(self, payload: OperationCreate, user: User) -> Operation:
        require_membership(self.session, payload.organization_id, user.id, {"admin", "operator"})
        return self.repository.create(payload, user.id)

    def list(self, organization_id: str, user: User) -> list[Operation]:
        require_membership(self.session, organization_id, user.id)
        return self.repository.list(organization_id)

    def detail(self, operation_id: str, user: User) -> OperationDetail:
        operation = self.repository.get(operation_id)
        if not operation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operação não encontrada")
        require_membership(self.session, operation.organization_id, user.id)
        companies = [
            OperationCompanyRead(
                id=item.id,
                company_id=company.id,
                name=company.name,
                phone=company.phone,
                website=company.website,
                status=item.status,
                discard_reason=item.discard_reason,
                score=item.score,
                generated_site_url=item.generated_site_url,
                final_message=item.final_message,
                updated_at=item.updated_at,
            )
            for item, company in self.repository.companies(operation_id)
        ]
        return OperationDetail.model_validate(
            {**OperationRead.model_validate(operation).model_dump(), "companies": companies}
        )
