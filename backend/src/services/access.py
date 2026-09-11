from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.entities import Organization, OrganizationMember, User
from src.schemas.auth import CurrentUser, OrganizationAccess


def require_membership(
    session: Session,
    organization_id: str,
    user_id: str,
    roles: set[str] | None = None,
) -> OrganizationMember:
    membership = session.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id,
        )
    )
    if not membership or (roles and membership.role not in roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário sem acesso à organização",
        )
    return membership


def serialize_user(session: Session, user: User) -> CurrentUser:
    rows = session.execute(
        select(OrganizationMember, Organization)
        .join(Organization, Organization.id == OrganizationMember.organization_id)
        .where(OrganizationMember.user_id == user.id)
    ).all()
    return CurrentUser(
        id=user.id,
        name=user.name,
        email=user.email,
        organizations=[
            OrganizationAccess(id=organization.id, name=organization.name, role=member.role)
            for member, organization in rows
        ],
    )
