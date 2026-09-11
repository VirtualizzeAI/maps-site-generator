from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from supabase import Client

from src.core.database import get_supabase


@dataclass(frozen=True)
class AuthenticatedUser:
    id: UUID
    email: str | None


def get_current_user(
    client: Annotated[Client, Depends(get_supabase)],
    authorization: Annotated[str | None, Header()] = None,
) -> AuthenticatedUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acesso ausente",
        )

    token = authorization.removeprefix("Bearer ").strip()
    try:
        response = client.auth.get_user(token)
        user = response.user
        if not user:
            raise ValueError("Usuário não encontrado")
        return AuthenticatedUser(id=UUID(str(user.id)), email=user.email)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acesso inválido",
        ) from exc
