from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.api.dependencies.auth import get_current_user
from src.core.database import get_db
from src.models.entities import User
from src.repositories.companies import CompanyRepository
from src.schemas.companies import CompanyRead
from src.services.access import require_membership

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=list[CompanyRead])
def list_companies(
    organization_id: Annotated[str, Query()],
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
):
    require_membership(session, organization_id, user.id)
    return CompanyRepository(session).list(organization_id)
