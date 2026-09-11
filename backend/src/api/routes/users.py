from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.dependencies.auth import get_current_user
from src.core.database import get_db
from src.models.entities import OrganizationMember, User
from src.schemas.users import UserCreate, UserRead, UserStatusUpdate
from src.services.access import require_membership
from src.services.auth import hash_password

router = APIRouter(prefix="/users", tags=["users"])


def read(user: User, member: OrganizationMember) -> UserRead:
    return UserRead(id=user.id, name=user.name, email=user.email, role=member.role, active=user.active, created_at=user.created_at)


@router.get("", response_model=list[UserRead])
def list_users(organization_id: str = Query(...), current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_membership(db, organization_id, current.id)
    rows = db.execute(select(User, OrganizationMember).join(OrganizationMember, OrganizationMember.user_id == User.id).where(OrganizationMember.organization_id == organization_id).order_by(User.name)).all()
    return [read(*row) for row in rows]


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_membership(db, payload.organization_id, current.id, {"admin"})
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(409, "Já existe um usuário com este e-mail")
    user = User(name=payload.name, email=payload.email.lower(), password_hash=hash_password(payload.password))
    db.add(user); db.flush()
    member = OrganizationMember(organization_id=payload.organization_id, user_id=user.id, role=payload.role)
    db.add(member); db.commit(); db.refresh(user)
    return read(user, member)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: str, payload: UserStatusUpdate, organization_id: str = Query(...), current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_membership(db, organization_id, current.id, {"admin"})
    if user_id == current.id and not payload.active:
        raise HTTPException(409, "Você não pode desativar seu próprio usuário")
    user = db.get(User, user_id)
    member = db.scalar(select(OrganizationMember).where(OrganizationMember.organization_id == organization_id, OrganizationMember.user_id == user_id))
    if not user or not member:
        raise HTTPException(404, "Usuário não encontrado")
    user.active = payload.active; db.commit(); db.refresh(user)
    return read(user, member)
