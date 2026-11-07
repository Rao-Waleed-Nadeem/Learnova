"""Health and readiness endpoints for API v1."""

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.session import check_db_connection

router = APIRouter()


@router.get("/liveness", status_code=status.HTTP_200_OK)
def liveness_check():
    """Application process liveness check."""
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


@router.get("/readiness")
def readiness_check():
    """Dependency readiness check (database connectivity)."""
    db_ok, error = check_db_connection()
    if db_ok:
        return {
            "status": "ready",
            "database": "connected",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
        }
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "not_ready",
            "database": "disconnected",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "error": "Database unavailable",
        },
    )
