"""Engine + session dependency.

Read-only serving layer over SQL Server. We use a synchronous engine with
pyodbc and let FastAPI run the (sync) path operations in its threadpool —
this is the most robust setup for SQL Server, where async ODBC is still rough.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

_engine_kwargs: dict = {"echo": settings.DB_ECHO, "future": True}
# QueuePool sizing applies to real servers; sqlite (dev/tests) doesn't take it.
if not settings.DATABASE_URL.startswith("sqlite"):
    _engine_kwargs.update(
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_pre_ping=True,
    )

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
