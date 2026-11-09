"""Enrollments and Learning Map API router (SSD-01, SSD-02, FR-CRS-02, FR-CRS-05)."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_current_active_user,
    get_optional_current_user,
    require_role,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.enrollment import (
    EnrollmentResponse,
    LearningMapResponse,
)
from app.services.enrollment_service import EnrollmentService

router = APIRouter()


@router.post(
    "/courses/{course_id}/enrollments",
    response_model=EnrollmentResponse,
)
def enroll_in_course(
    course_id: UUID,
    response: Response,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    """Enroll the authenticated student into a published course idempotently.

    - Returns 201 Created on first enrollment.
    - Returns 200 OK if the student is already enrolled.
    """
    enrollment, is_new = EnrollmentService.enroll_student(
        db=db, student=current_user, course_id=course_id
    )
    if is_new:
        response.status_code = status.HTTP_201_CREATED
    else:
        response.status_code = status.HTTP_200_OK

    return enrollment


@router.get("/students/me/enrollments", response_model=List[EnrollmentResponse])
def get_my_enrollments(
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    """Retrieve all course enrollments with real-time derived progress for the current student."""
    return EnrollmentService.get_student_enrollments(db=db, student_id=current_user.id)


@router.get("/courses/{course_id}/learning-map", response_model=LearningMapResponse)
def get_learning_map(
    course_id: UUID,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve the curriculum DAG and prerequisite graph with student readiness states (SSD-02)."""
    student_id = current_user.id if current_user and current_user.role.name == "student" else None
    return EnrollmentService.get_learning_map(db=db, course_id=course_id, student_id=student_id)
