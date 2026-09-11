from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from supabase import Client

from src.api.dependencies.auth import AuthenticatedUser, get_current_user
from src.core.database import get_supabase
from src.repositories.operations import OperationRepository
from src.schemas.operations import OperationCreate, OperationRead
from src.services.operations import OperationService

router = APIRouter(prefix="/operations", tags=["operations"])


def get_service(client: Annotated[Client, Depends(get_supabase)]) -> OperationService:
    return OperationService(OperationRepository(client))


@router.post("", response_model=OperationRead, status_code=status.HTTP_201_CREATED)
def create_operation(
    payload: OperationCreate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[OperationService, Depends(get_service)],
) -> OperationRead:
    return service.create(payload, user.id)


@router.get("", response_model=list[OperationRead])
def list_operations(
    organization_id: Annotated[UUID, Query()],
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[OperationService, Depends(get_service)],
) -> list[OperationRead]:
    return service.list(organization_id, user.id)
