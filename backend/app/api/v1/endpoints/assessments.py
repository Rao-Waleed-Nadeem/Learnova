"""Assessments API router providing assessment authoring, composition, retrieval, and publication."""

from typing import Any, List, Optional, Union
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.assessment import (
    AssessmentCreateRequest,
    AssessmentResponse,
    AssessmentStudentResponse,
    AssessmentUpdateRequest,
)
from app.schemas.attempt import AssessmentAttemptResponse, AttemptStartRequest
from app.services.assessment_service import AssessmentService
from app.services.attempt_service import AttemptService

router = APIRouter()


@router.post("", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
def create_assessment(
    data: AssessmentCreateRequest,
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
):
    """Create a new assessment in draft status."""
    return AssessmentService.create_assessment(db=db, req=data, actor=current_user)


@router.get("", response_model=List[AssessmentResponse])
def list_assessments(
    course_id: UUID = Query(..., description="ID of the course owning the assessments"),
    topic_id: Optional[UUID] = Query(default=None, description="Optional topic filter"),
    type: Optional[str] = Query(default=None, description="Assessment type filter"),
    status: Optional[str] = Query(default=None, description="Assessment status filter"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List assessments for a course. Students receive only published assessments."""
    return AssessmentService.list_assessments(
        db=db,
        course_id=course_id,
        actor=current_user,
        topic_id=topic_id,
        type=type,
        status_filter=status,
    )


@router.get(
    "/{assessment_id}",
    response_model=Union[AssessmentResponse, AssessmentStudentResponse],
)
def get_assessment(
    assessment_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve an assessment by ID.

    - Teachers and administrators receive the full assessment with grading keys.
    - Students receive a secure projection with answer keys and rubrics strictly removed.
    """
    if current_user.role.name == "student":
        return AssessmentService.get_student_assessment(db=db, assessment_id=assessment_id, student=current_user)
    return AssessmentService.get_assessment(db=db, assessment_id=assessment_id, actor=current_user)


@router.patch("/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(
    assessment_id: UUID,
    data: AssessmentUpdateRequest,
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
):
    """Update assessment configuration or question composition."""
    return AssessmentService.update_assessment(db=db, assessment_id=assessment_id, req=data, actor=current_user)


@router.post("/{assessment_id}/publish", response_model=AssessmentResponse)
def publish_assessment(
    assessment_id: UUID,
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
):
    """Execute the publication quality gate and transition the assessment to published status."""
    return AssessmentService.publish_assessment(db=db, assessment_id=assessment_id, actor=current_user)


@router.post(
    "/{assessment_id}/attempts",
    response_model=AssessmentAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_assessment_attempt(
    assessment_id: UUID,
    data: Optional[AttemptStartRequest] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Start a new assessment attempt for an actively enrolled student."""
    return AttemptService.start_attempt(db=db, assessment_id=assessment_id, student=current_user, req=data)
