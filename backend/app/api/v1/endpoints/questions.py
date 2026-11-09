"""Questions API router providing Question Bank authoring, filtering, updates, and archival."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.question import (
    QuestionCreateRequest,
    QuestionDetailResponse,
    QuestionUpdateRequest,
)
from app.services.question_service import QuestionService

router = APIRouter()


@router.post("", response_model=QuestionDetailResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    data: QuestionCreateRequest,
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
):
    """Create a new question in the Question Bank."""
    return QuestionService.create_question(db=db, req=data, actor=current_user)


@router.get("", response_model=List[QuestionDetailResponse])
def list_questions(
    course_id: UUID = Query(..., description="ID of the course owning the question bank"),
    topic_id: Optional[UUID] = Query(default=None, description="Optional topic filter"),
    type: Optional[str] = Query(default=None, description="Question type filter"),
    difficulty: Optional[str] = Query(default=None, description="Difficulty filter"),
    status: Optional[str] = Query(default=None, description="Status filter (draft, approved, etc.)"),
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
):
    """List questions in the course Question Bank matching query filters."""
    return QuestionService.list_questions(
        db=db,
        course_id=course_id,
        actor=current_user,
        topic_id=topic_id,
        type=type,
        difficulty=difficulty,
        status_filter=status,
    )


@router.get("/{question_id}", response_model=QuestionDetailResponse)
def get_question(
    question_id: UUID,
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
):
    """Retrieve full question details including grading rubric and answer keys."""
    return QuestionService.get_question(db=db, question_id=question_id, actor=current_user)


@router.patch("/{question_id}", response_model=QuestionDetailResponse)
def update_question(
    question_id: UUID,
    data: QuestionUpdateRequest,
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
):
    """Update question contents or status and increment its version."""
    return QuestionService.update_question(db=db, question_id=question_id, req=data, actor=current_user)


@router.post("/{question_id}/archive", response_model=QuestionDetailResponse)
def archive_question(
    question_id: UUID,
    current_user: User = Depends(require_role("teacher", "administrator")),
    db: Session = Depends(get_db),
):
    """Safely archive a question from the active bank without breaking assessment references."""
    return QuestionService.archive_question(db=db, question_id=question_id, actor=current_user)
