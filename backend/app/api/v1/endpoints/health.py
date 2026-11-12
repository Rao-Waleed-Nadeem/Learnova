"""Health and readiness endpoints for API v1."""

from fastapi import APIRouter, Request, status
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


@router.get("/outbox")
def outbox_health_check(request: Request):
    """Outbox background processor health and telemetry diagnostics."""
    processor = getattr(request.app.state, "outbox_processor", None)
    if processor is not None and processor.is_running:
        return {
            "status": "running",
            "diagnostics": processor.get_diagnostics(),
        }
    elif processor is not None:
        return {
            "status": "stopped",
            "diagnostics": processor.get_diagnostics(),
        }
    return {
        "status": "disabled",
        "diagnostics": None,
    }
