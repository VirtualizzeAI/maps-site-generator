from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models.base import utcnow
from src.models.entities import AuthToken, User
from src.services.auth import token_hash


def get_current_user(
    session: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ausente")

    digest = token_hash(authorization.removeprefix("Bearer ").strip())
    token = session.scalar(
        select(AuthToken).where(
            AuthToken.token_hash == digest,
            AuthToken.expires_at > utcnow(),
        )
    )
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = session.get(User, token.user_id)
    if not user or not user.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inativo")
    return user
