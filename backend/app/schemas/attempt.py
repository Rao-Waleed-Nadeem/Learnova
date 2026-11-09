"""Pydantic schemas for Assessment Attempt lifecycle, interim responses, and server grading (D4 Domain)."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.question import QuestionStudentResponse


# ---------------------------------------------------------------------------
# Attempt Response Schemas
# ---------------------------------------------------------------------------

class AttemptResponseSaveRequest(BaseModel):
    """Payload sent by student to save an interim or final answer."""
    student_response: Any = Field(..., description="Selected option ID, boolean, text, or matching map")
    response_time_seconds: Optional[int] = Field(default=None, ge=0)


class AttemptResponseItem(BaseModel):
    """Individual question response representation."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    attempt_id: UUID
    question_id: UUID
    question_version: int
    student_response: Any
    is_correct: Optional[bool] = None
    points_awarded: Optional[Decimal] = None
    points_possible: int
    response_time_seconds: Optional[int] = None
    feedback: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Attempt Lifecycle Schemas
# ---------------------------------------------------------------------------

class AttemptStartRequest(BaseModel):
    """Optional payload when initiating an assessment attempt."""
    initial_difficulty: Optional[str] = Field(default=None, description="Optional starting difficulty for adaptive practice")


class AssessmentAttemptResponse(BaseModel):
    """Student-safe view of an active or in-progress assessment attempt."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    assessment_id: UUID
    student_id: UUID
    enrollment_id: UUID
    attempt_number: int
    status: str
    started_at: datetime
    deadline_at: Optional[datetime] = None
    current_difficulty: Optional[str] = None
    max_score: int
    questions: List[Dict[str, Any]] = []
    responses: List[AttemptResponseItem] = []
    created_at: datetime


class AssessmentResultResponse(BaseModel):
    """Authoritative result response returned after grading."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    assessment_id: UUID
    student_id: UUID
    enrollment_id: UUID
    attempt_number: int
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    score: Optional[Decimal] = None
    max_score: int
    score_percent: Optional[Decimal] = None
    passed: Optional[bool] = None
    responses: List[AttemptResponseItem] = []
    created_at: datetime


class AttemptAdaptiveNextQuestionResponse(BaseModel):
    """Response containing the next adaptively selected question based on session performance."""
    attempt_id: UUID
    current_difficulty: str
    question: Optional[QuestionStudentResponse] = None
