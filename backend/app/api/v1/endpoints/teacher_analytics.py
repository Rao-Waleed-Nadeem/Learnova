"""Teacher Analytics & Course Reporting API endpoints (Phase 10)."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import (
    StudentAttemptsListResponse,
    TeacherCourseAnalyticsResponse,
    TeacherDashboardResponse,
    TeacherStudentCourseAnalyticsResponse,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=TeacherDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve authenticated teacher's overview dashboard",
)
def get_teacher_dashboard(
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
) -> TeacherDashboardResponse:
    """Overview of assigned courses, student reach, and active assessments."""
    return AnalyticsService.get_teacher_dashboard(db=db, teacher=current_user)


@router.get(
    "/courses/{course_id}/analytics",
    response_model=TeacherCourseAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve course-scoped analytics, topic heatmap, and score distribution",
)
def get_course_analytics(
    course_id: uuid.UUID,
    timeframe: Optional[str] = Query("all", pattern="^(all|30d|7d)$", description="Filter timeframe"),
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
) -> TeacherCourseAnalyticsResponse:
    """Course-level analytics strictly scoped to teacher assigned courses."""
    return AnalyticsService.get_course_analytics(
        db=db,
        course_id=course_id,
        teacher=current_user,
        timeframe=timeframe,
    )


@router.get(
    "/courses/{course_id}/students/{student_id}/analytics",
    response_model=TeacherStudentCourseAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve enrolled student's progress and topic mastery breakdown for assigned course",
)
def get_student_course_analytics(
    course_id: uuid.UUID,
    student_id: uuid.UUID,
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
) -> TeacherStudentCourseAnalyticsResponse:
    """Drilldown into an enrolled student's performance within the assigned course."""
    return AnalyticsService.get_teacher_student_analytics(
        db=db,
        course_id=course_id,
        student_id=student_id,
        teacher=current_user,
    )


@router.get(
    "/courses/{course_id}/students/{student_id}/attempts",
    response_model=StudentAttemptsListResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve assessment attempts of an enrolled student in assigned course",
)
def get_student_course_attempts(
    course_id: uuid.UUID,
    student_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
) -> StudentAttemptsListResponse:
    """Paginated list of attempts for an enrolled student in assigned course."""
    return AnalyticsService.get_teacher_student_attempts(
        db=db,
        course_id=course_id,
        student_id=student_id,
        teacher=current_user,
        limit=limit,
        offset=offset,
    )
