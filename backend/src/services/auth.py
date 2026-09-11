import hashlib
import hmac
import secrets
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.config import get_settings
from src.models.base import utcnow
from src.models.entities import AuthToken, IntegrationSettings, Organization, OrganizationMember, User


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    derived = hashlib.scrypt(
        password.encode(),
        salt=bytes.fromhex(salt),
        n=2**14,
        r=8,
        p=1,
    ).hex()
    return salt + "$" + derived


def verify_password(password: str, stored: str) -> bool:
    salt, expected = stored.split("$", 1)
    actual = hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(actual, expected)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def ensure_default_admin(session: Session) -> None:
    settings = get_settings()
    existing = session.scalar(select(User).where(User.email == settings.admin_email.lower()))
    if existing:
        return

    organization = Organization(name=settings.organization_name)
    user = User(
        name=settings.admin_name,
        email=settings.admin_email.lower(),
        password_hash=hash_password(settings.admin_password),
    )
    session.add_all([organization, user])
    session.flush()
    session.add(OrganizationMember(organization_id=organization.id, user_id=user.id, role="admin"))
    session.add(
        IntegrationSettings(
            organization_id=organization.id,
            serper_api_key=settings.serper_api_key or None,
            openai_api_key=settings.openai_api_key or None,
            openai_model=settings.openai_model,
            vercel_token=settings.vercel_token or None,
            evolution_url=settings.evolution_url or None,
            evolution_api_key=settings.evolution_api_key or None,
            evolution_instance=settings.evolution_instance or None,
        )
    )
    session.commit()


def authenticate(session: Session, email: str, password: str) -> tuple[str, User]:
    user = session.scalar(select(User).where(User.email == email.lower(), User.active.is_(True)))
    if not user or not verify_password(password, user.password_hash):
        raise ValueError("E-mail ou senha inválidos")

    raw_token = secrets.token_urlsafe(48)
    session.add(
        AuthToken(
            token_hash=token_hash(raw_token),
            user_id=user.id,
            expires_at=utcnow() + timedelta(days=7),
        )
    )
    session.commit()
    return raw_token, user
