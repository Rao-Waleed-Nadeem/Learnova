"""Attempts API router providing assessment lifecycle, response recording, adaptive selection, and grading."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.attempt import (
    AssessmentAttemptResponse,
    AssessmentResultResponse,
    AttemptAdaptiveNextQuestionResponse,
    AttemptResponseItem,
    AttemptResponseSaveRequest,
)
from app.services.attempt_service import AttemptService
from app.services.grading_service import GradingService

router = APIRouter()


@router.get("/{attempt_id}", response_model=AssessmentAttemptResponse)
def get_attempt(
    attempt_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve an assessment attempt. Students receive safe projections without grading secrets."""
    return AttemptService.get_attempt(db=db, attempt_id=attempt_id, user=current_user)


@router.put("/{attempt_id}/responses/{question_id}", response_model=AttemptResponseItem)
def record_response(
    attempt_id: UUID,
    question_id: UUID,
    data: AttemptResponseSaveRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Idempotently save or update an interim question response during an active attempt."""
    return AttemptService.record_response(
        db=db,
        attempt_id=attempt_id,
        question_id=question_id,
        req=data,
        student=current_user,
    )


@router.post("/{attempt_id}/next-question", response_model=AttemptAdaptiveNextQuestionResponse)
def get_next_adaptive_question(
    attempt_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Select the next practice question adaptively using server session correctness (DEC-03)."""
    return AttemptService.get_next_adaptive_question(
        db=db,
        attempt_id=attempt_id,
        student=current_user,
    )


@router.post("/{attempt_id}/submit", response_model=AssessmentResultResponse)
def submit_attempt(
    attempt_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Finalize attempt, execute server-authoritative grading, and transactionally emit outbox event."""
    return GradingService.submit_attempt(
        db=db,
        attempt_id=attempt_id,
        student=current_user,
    )


@router.get("/{attempt_id}/result", response_model=AssessmentResultResponse)
def get_attempt_result(
    attempt_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve authoritative graded result and feedback for an attempt."""
    return GradingService.get_attempt_result(
        db=db,
        attempt_id=attempt_id,
        user=current_user,
    )
