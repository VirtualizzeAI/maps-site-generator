from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from src.core.config import get_settings
from src.models.base import Base

settings = get_settings()
if settings.database_url.startswith("sqlite"):
    Path(settings.data_dir).mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def init_database() -> None:
    from src.models import entities  # noqa: F401

    Base.metadata.create_all(bind=engine)
    from src.services.auth import ensure_default_admin

    with SessionLocal() as session:
        ensure_default_admin(session)
