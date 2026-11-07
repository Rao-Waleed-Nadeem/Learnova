"""Pytest test fixtures and configuration."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import Settings


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Create a FastAPI TestClient instance."""
    with TestClient(app) as test_client:
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
