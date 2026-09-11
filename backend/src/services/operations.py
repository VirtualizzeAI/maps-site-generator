from uuid import UUID

from fastapi import HTTPException, status

from src.repositories.operations import OperationRepository
from src.schemas.operations import OperationCreate, OperationRead


class OperationService:
    def __init__(self, repository: OperationRepository):
        self.repository = repository

    def _require_membership(self, organization_id: UUID, user_id: UUID) -> None:
        if not self.repository.is_member(organization_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário sem acesso à organização",
            )

    def create(self, payload: OperationCreate, user_id: UUID) -> OperationRead:
        self._require_membership(payload.organization_id, user_id)
        return OperationRead.model_validate(self.repository.create(payload, user_id))

    def list(self, organization_id: UUID, user_id: UUID) -> list[OperationRead]:
        self._require_membership(organization_id, user_id)
        return [
            OperationRead.model_validate(item)
            for item in self.repository.list(organization_id)
        ]
