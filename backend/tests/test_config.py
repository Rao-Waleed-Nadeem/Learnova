"""Unit tests for application configuration and settings validation."""

from app.core.config import Settings


def test_default_settings():
    """Verify default settings values."""
    settings = Settings()
    assert settings.PROJECT_NAME == "Learnova API"
    assert settings.VERSION == "0.1.0"
    assert settings.API_V1_STR == "/api/v1"
    assert settings.POSTGRES_PORT == 5432


def test_sync_database_url_generation():
    """Verify database URL generation from components when DATABASE_URL is not set."""
    settings = Settings(
        DATABASE_URL=None,
        POSTGRES_USER="learner",
        POSTGRES_PASSWORD="mysecretpassword",
        POSTGRES_HOST="dbserver",
        POSTGRES_PORT=5433,
        POSTGRES_DB="learnovadb",
    )
    url = settings.sync_database_url
    assert url == "postgresql+psycopg2://learner:mysecretpassword@dbserver:5433/learnovadb"


def test_database_url_normalization():
    """Verify postgresql:// prefix is normalized to postgresql+psycopg2://."""
    settings = Settings(DATABASE_URL="postgresql://usr:pwd@myhost:5432/mydb")
    assert settings.sync_database_url == "postgresql+psycopg2://usr:pwd@myhost:5432/mydb"


def test_secret_masking():
    """Verify password is redacted in safe_database_url and repr."""
    raw_password = "super_secret_credentials_123"
    settings = Settings(
        DATABASE_URL=None,
        POSTGRES_USER="admin_user",
        POSTGRES_PASSWORD=raw_password,
        POSTGRES_HOST="secure_host",
        POSTGRES_DB="production_db",
    )
    safe_url = settings.safe_database_url
    assert raw_password not in safe_url
    assert "admin_user:***@secure_host" in safe_url

    settings_repr = repr(settings)
    assert raw_password not in settings_repr
    assert "***" in settings_repr
