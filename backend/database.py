from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from config import settings

# Create database engine
# SQLite-specific configuration
connect_args = {}
if settings.database_url.startswith('sqlite'):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    echo=settings.database_echo,
    connect_args=connect_args,
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

# Base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    Used with FastAPI's Depends() for each request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
