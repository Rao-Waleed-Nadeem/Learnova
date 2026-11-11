"""Student Personal Analytics API endpoints (Phase 10)."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import (
    StudentAnalyticsResponse,
    StudentAttemptsListResponse,
    StudentDashboardResponse,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get(
    "/me/dashboard",
    response_model=StudentDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve authenticated student's personalized dashboard",
)
def get_my_dashboard(
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
) -> StudentDashboardResponse:
    """Retrieve enrolled courses, topic mastery summary, recent attempts, and gamification."""
    return AnalyticsService.get_student_dashboard(db=db, student=current_user)


@router.get(
    "/me/analytics",
    response_model=StudentAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve authenticated student's topic mastery and learning analytics",
)
def get_my_analytics(
    course_id: Optional[uuid.UUID] = Query(None, description="Optional course filter"),
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
) -> StudentAnalyticsResponse:
    """Retrieve detailed topic masteries, weak topics, and score trajectory trends."""
    return AnalyticsService.get_student_analytics(
        db=db,
        student=current_user,
        course_id=course_id,
    )


@router.get(
    "/me/attempts",
    response_model=StudentAttemptsListResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve paginated assessment attempt history for authenticated student",
)
def get_my_attempts(
    course_id: Optional[uuid.UUID] = Query(None, description="Filter by course ID"),
    assessment_id: Optional[uuid.UUID] = Query(None, description="Filter by assessment ID"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
) -> StudentAttemptsListResponse:
    """Paginated list of assessment attempts (safe projection, no answer keys)."""
    return AnalyticsService.get_student_attempts(
        db=db,
        student=current_user,
        course_id=course_id,
        assessment_id=assessment_id,
        limit=limit,
        offset=offset,
    )
