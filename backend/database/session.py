import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use DATABASE_URL environment variable if provided (supports Postgres, MySQL, etc.)
DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///./sql_app.db"

def _create_engine(url: str):
    # SQLite needs the check_same_thread connect arg
    if url.startswith("sqlite:"):
        return create_engine(url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
    # For other DBs (Postgres, MySQL) create a standard engine with pool pre-ping
    return create_engine(url, pool_pre_ping=True)

engine = _create_engine(DATABASE_URL)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that yields a SQLAlchemy session and ensures it's closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
