from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.api.dependencies.auth import get_current_user
from src.core.database import get_db
from src.models.entities import User
from src.schemas.operations import OperationCreate, OperationDetail, OperationRead
from src.services.operations import OperationService

router = APIRouter(prefix="/operations", tags=["operations"])


@router.post("", response_model=OperationRead, status_code=status.HTTP_201_CREATED)
def create_operation(
    payload: OperationCreate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
):
    return OperationService(session).create(payload, user)


@router.get("", response_model=list[OperationRead])
def list_operations(
    organization_id: Annotated[str, Query()],
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
):
    return OperationService(session).list(organization_id, user)


@router.get("/{operation_id}", response_model=OperationDetail)
def get_operation(
    operation_id: str,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
):
    return OperationService(session).detail(operation_id, user)
