"""Pytest test fixtures and configuration."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app as fastapi_app
import app.models  # noqa: F401 - Register models for Base.metadata
from app.models.role import Role


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Create a FastAPI TestClient instance."""
    with TestClient(fastapi_app) as test_client:
        yield test_client


@pytest.fixture
def custom_settings() -> Settings:
    """Provide a fresh Settings instance for testing."""
    return Settings(
        PROJECT_NAME="Learnova Test",
        ENVIRONMENT="test",
        DEBUG=True,
        POSTGRES_USER="test_user",
        POSTGRES_PASSWORD="test_secret_password",
        POSTGRES_DB="test_db",
        POSTGRES_HOST="localhost",
        POSTGRES_PORT=5432,
    )


@pytest.fixture
def test_engine():
    """Create a thread-safe in-memory SQLite engine with foreign keys enabled."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture
def db_session(test_engine) -> Session:
    """Provide a test database session."""
    session_factory = sessionmaker(bind=test_engine, expire_on_commit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client_with_db(test_engine, db_session: Session) -> TestClient:
    """Create TestClient with get_db overridden to use test_engine with seeded roles."""
    session_factory = sessionmaker(bind=test_engine, expire_on_commit=False)

    for r_name, r_desc in [
        ("administrator", "Full system access"),
        ("teacher", "Course management and assessment grading"),
        ("student", "Learner access to assigned courses and materials"),
    ]:
        role = Role(name=r_name, description=r_desc)
        db_session.add(role)
    db_session.commit()

    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as tc:
        yield tc
    fastapi_app.dependency_overrides.clear()
