from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api.dependencies.auth import get_current_user
from src.core.database import get_db
from src.models.entities import User
from src.schemas.auth import CurrentUser, LoginRequest, LoginResponse
from src.services.access import serialize_user
from src.services.auth import authenticate

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, session: Annotated[Session, Depends(get_db)]) -> LoginResponse:
    try:
        token, user = authenticate(session, payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return LoginResponse(access_token=token, user=serialize_user(session, user))


@router.get("/me", response_model=CurrentUser)
def me(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> CurrentUser:
    return serialize_user(session, user)
