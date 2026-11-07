"""Learnova FastAPI Backend Application entrypoint."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.session import check_db_connection
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    setup_logging()
    logger.info("Learnova API starting up (%s, env=%s)...", settings.VERSION, settings.ENVIRONMENT)
    yield
    logger.info("Learnova API shutting down...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for the Learnova adaptive and gamified learning platform",
    version=settings.VERSION,
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler preventing secret exposure."""
    logger.error("Unhandled exception processing %s %s: %s", request.method, request.url.path, str(exc))
    detail = "An internal server error occurred."
    if settings.DEBUG:
        detail = str(exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": detail},
    )


# Root backward-compatible health check (strictly preserved)
@app.get("/health", tags=["system"])
def health_check():
    """Preserved root health endpoint for backward compatibility."""
    return {"status": "ok", "service": "learnova-api"}


# Root readiness check
@app.get("/ready", tags=["system"])
def readiness_check():
    """Root readiness endpoint verifying database connectivity."""
    db_ok, _ = check_db_connection()
    if db_ok:
        return {
            "status": "ready",
            "database": "connected",
            "service": "learnova-api",
        }
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "not_ready",
            "database": "disconnected",
            "service": "learnova-api",
        },
    )


# Mount versioned API router
app.include_router(api_router, prefix=settings.API_V1_STR)
