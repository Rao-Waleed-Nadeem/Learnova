"""FastAPI endpoints for AI lesson tutoring and teacher question candidate governance."""

import uuid
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.ai import (
    AICandidateApproveResponse,
    AICandidateDetailResponse,
    AICandidateListResponse,
    AICandidateRejectRequest,
    AICandidateRejectResponse,
    AICandidateUpdateRequest,
    AIGenerateQuestionsRequest,
    AISendSessionMessageRequest,
    AISessionCreateRequest,
    AISessionDetailResponse,
    AISessionMessageItem,
    AISessionResponse,
    AISimplifyLessonRequest,
    AISimplifyLessonResponse,
)
from app.services.ai_candidate_service import AICandidateService
from app.services.ai_service import AIService
from app.services.ai_session_service import AISessionService

router = APIRouter()


@router.post(
    "/sessions",
    response_model=AISessionResponse,
    status_code=status.HTTP_200_OK,
)
def get_or_create_session(
    payload: AISessionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve an existing persistent session or initialize a new AGY conversation."""
    return AISessionService.get_or_create_session(db=db, req=payload, actor=current_user)


@router.get(
    "/sessions/{session_id}/messages",
    response_model=List[AISessionMessageItem],
    status_code=status.HTTP_200_OK,
)
def get_session_messages(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full conversation message history for an active session."""
    messages = AISessionService.get_session_messages(db=db, session_id=session_id, actor=current_user)
    return [AISessionMessageItem.model_validate(m) for m in messages]


@router.post(
    "/sessions/{session_id}/messages",
    response_model=AISessionMessageItem,
    status_code=status.HTTP_200_OK,
)
def send_session_message(
    session_id: UUID,
    payload: AISendSessionMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send student/teacher message, attach resources, execute AGY terminal agent, and return reply."""
    _, agent_msg = AISessionService.send_message(
        db=db,
        session_id=session_id,
        req=payload,
        actor=current_user,
    )
    return AISessionMessageItem.model_validate(agent_msg)



@router.post(
    "/simplify-lesson",
    response_model=AISimplifyLessonResponse,
    status_code=status.HTTP_200_OK,
)
def simplify_lesson(
    payload: AISimplifyLessonRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Provide AI tutoring, analogy, worked example, or clarification for a lesson."""
    return AIService.simplify_lesson(db=db, req=payload, actor=current_user)


@router.post(
    "/generate-questions",
    response_model=List[AICandidateDetailResponse],
    status_code=status.HTTP_201_CREATED,
)
def generate_questions(
    payload: AIGenerateQuestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "administrator")),
):
    """Generate quarantined candidate assessment questions awaiting teacher review."""
    candidates = AICandidateService.generate_candidate_questions(
        db=db, req=payload, actor=current_user
    )
    return [AICandidateDetailResponse.model_validate(c) for c in candidates]


@router.get(
    "/candidates",
    response_model=AICandidateListResponse,
    status_code=status.HTTP_200_OK,
)
def list_candidates(
    course_id: UUID = Query(..., description="Target course ID"),
    topic_id: Optional[UUID] = Query(None, description="Optional topic ID filter"),
    status: Optional[str] = Query(None, description="Optional candidate status filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "administrator")),
):
    """List quarantined candidate questions for an authorized course."""
    items = AICandidateService.list_candidates(
        db=db,
        course_id=course_id,
        topic_id=topic_id,
        status_filter=status,
        actor=current_user,
    )
    validated_items = [AICandidateDetailResponse.model_validate(i) for i in items]
    return AICandidateListResponse(items=validated_items, total=len(validated_items))


@router.get(
    "/candidates/{candidate_id}",
    response_model=AICandidateDetailResponse,
    status_code=status.HTTP_200_OK,
)
def get_candidate(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "administrator")),
):
    """Retrieve detailed candidate question for review."""
    cand = AICandidateService.get_candidate(
        db=db, candidate_id=candidate_id, actor=current_user
    )
    return AICandidateDetailResponse.model_validate(cand)


@router.patch(
    "/candidates/{candidate_id}",
    response_model=AICandidateDetailResponse,
    status_code=status.HTTP_200_OK,
)
def update_candidate(
    candidate_id: UUID,
    payload: AICandidateUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "administrator")),
):
    """Update candidate question properties prior to approval."""
    updated = AICandidateService.update_candidate(
        db=db, candidate_id=candidate_id, updates=payload, actor=current_user
    )
    return AICandidateDetailResponse.model_validate(updated)


@router.post(
    "/candidates/{candidate_id}/approve",
    response_model=AICandidateApproveResponse,
    status_code=status.HTTP_200_OK,
)
def approve_candidate(
    candidate_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "administrator")),
):
    """Promote quarantined candidate question to official Question Bank through QuestionService."""
    promoted_q = AICandidateService.approve_candidate(
        db=db, candidate_id=candidate_id, actor=current_user
    )
    return AICandidateApproveResponse(
        success=True,
        candidate_id=candidate_id,
        approved_question_id=promoted_q.id,
        message="Question approved and added to Question Bank.",
    )


@router.post(
    "/candidates/{candidate_id}/reject",
    response_model=AICandidateRejectResponse,
    status_code=status.HTTP_200_OK,
)
def reject_candidate(
    candidate_id: UUID,
    payload: Optional[AICandidateRejectRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "administrator")),
):
    """Reject candidate question."""
    reason = payload.reason if payload else None
    AICandidateService.reject_candidate(
        db=db, candidate_id=candidate_id, reason=reason, actor=current_user
    )
    return AICandidateRejectResponse(
        success=True,
        candidate_id=candidate_id,
        status="rejected",
        message="Candidate question rejected.",
    )
