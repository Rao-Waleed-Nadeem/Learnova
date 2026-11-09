"""Application configuration module using pydantic-settings."""

from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings validated from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = Field(default="Learnova API", description="Application name")
    VERSION: str = Field(default="0.1.0", description="API version")
    API_V1_STR: str = Field(default="/api/v1", description="V1 API route prefix")
    ENVIRONMENT: str = Field(default="development", description="Runtime environment")
    DEBUG: bool = Field(default=False, description="Debug flag")

    HOST: str = Field(default="0.0.0.0", description="Backend binding host")
    PORT: int = Field(default=8000, description="Backend binding port")

    # PostgreSQL configuration
    POSTGRES_USER: str = Field(default="learnova", description="PostgreSQL user")
    POSTGRES_PASSWORD: str = Field(default="learnova", description="PostgreSQL password")
    POSTGRES_DB: str = Field(default="learnova", description="PostgreSQL database name")
    POSTGRES_HOST: str = Field(default="database", description="PostgreSQL host")
    POSTGRES_PORT: int = Field(default=5432, description="PostgreSQL port")

    DATABASE_URL: Optional[str] = Field(default=None, description="Direct database connection URL")

    # Pool settings
    DB_POOL_SIZE: int = Field(default=5, description="SQLAlchemy connection pool size")
    DB_MAX_OVERFLOW: int = Field(default=10, description="SQLAlchemy connection pool max overflow")
    DB_POOL_TIMEOUT: int = Field(default=30, description="Connection pool timeout in seconds")

    # Security & JWT settings (Phase 3)
    SECRET_KEY: str = Field(
        default="learnova-insecure-dev-secret-key-change-in-production-2026",
        description="Cryptographic secret key for signing JWT tokens",
    )
    ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=15,
        description="Access token lifespan in minutes",
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        description="Refresh token lifespan in days",
    )

    # Cross-Origin Resource Sharing (CORS)
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed origins for CORS requests with credentials",
    )

    # AI & LLM Service Configuration (Phase 9)
    GEMINI_API_KEY: Optional[str] = Field(
        default=None,
        description="Google Gemini API key for AI generation (server-side only)",
    )
    GEMINI_MODEL: str = Field(
        default="gemini-2.5-flash",
        description="Gemini model identifier",
    )
    AI_TIMEOUT_SECONDS: int = Field(
        default=15,
        description="Timeout for external LLM API calls in seconds",
    )
    AI_CACHE_TTL_DAYS: int = Field(
        default=30,
        description="Durable content cache retention in days",
    )

    @property
    def sync_database_url(self) -> str:
        """Return a valid synchronous SQLAlchemy PostgreSQL URL."""
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            # Normalize postgresql:// to postgresql+psycopg2:// if needed
            if url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg2://", 1)
            return url
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def safe_database_url(self) -> str:
        """Return database URL with password redacted for safe logging."""
        url = self.sync_database_url
        if "@" in url and "://" in url:
            scheme, rest = url.split("://", 1)
            user_pass, host_db = rest.split("@", 1)
            if ":" in user_pass:
                user = user_pass.split(":", 1)[0]
                return f"{scheme}://{user}:***@{host_db}"
        return url

    def __repr__(self) -> str:
        return (
            f"Settings(PROJECT_NAME={self.PROJECT_NAME!r}, VERSION={self.VERSION!r}, "
            f"ENVIRONMENT={self.ENVIRONMENT!r}, DATABASE_URL={self.safe_database_url!r})"
        )


settings = Settings()
