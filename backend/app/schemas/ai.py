"""Pydantic schemas for AI lesson simplification and candidate question governance."""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AISimplifyLessonRequest(BaseModel):
    """Request schema for student/teacher lesson tutoring and explanation."""

    lesson_id: uuid.UUID = Field(..., description="Required persisted lesson ID")
    mode: str = Field(default="simplify", pattern="^(simplify|analogy|example|custom)$")
    custom_prompt: Optional[str] = Field(default=None, max_length=500)
    course_title: Optional[str] = None
    topic_title: Optional[str] = None
    lesson_title: Optional[str] = None
    lesson_content: Optional[str] = Field(default=None, max_length=4000)

    model_config = ConfigDict(populate_by_name=True)


class AISimplifyLessonResponse(BaseModel):
    """Response schema for lesson simplification."""

    success: bool = True
    explanation: str
    source: str
    is_cached: bool = False
    prompt_used: Optional[str] = None


class AIGenerateQuestionsRequest(BaseModel):
    """Request schema for teacher candidate question generation."""

    course_id: uuid.UUID
    topic_id: uuid.UUID
    source_content: Optional[str] = Field(default="", max_length=4000)
    question_types: Optional[List[str]] = Field(default=["multiple_choice"])
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    count: int = Field(default=3, ge=1, le=5)


class AICandidateDetailResponse(BaseModel):
    """Detailed response schema for a quarantined candidate question."""

    id: uuid.UUID
    course_id: uuid.UUID
    topic_id: uuid.UUID
    author_id: Optional[uuid.UUID] = None
    prompt: str
    type: str
    difficulty: str
    points: int
    explanation: Optional[str] = None
    source_context: Optional[str] = None
    payload: Dict[str, Any]
    answer_key: Dict[str, Any]
    status: str
    rejection_reason: Optional[str] = None
    approved_question_id: Optional[uuid.UUID] = None
    provider: str
    model: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AICandidateListResponse(BaseModel):
    """Paginated list of quarantined candidate questions."""

    items: List[AICandidateDetailResponse]
    total: int


class AICandidateUpdateRequest(BaseModel):
    """Optional updates made by teacher prior to approving a candidate."""

    prompt: Optional[str] = None
    difficulty: Optional[str] = Field(default=None, pattern="^(easy|medium|hard)$")
    points: Optional[int] = Field(default=None, ge=1)
    explanation: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    answer_key: Optional[Dict[str, Any]] = None


class AICandidateApproveResponse(BaseModel):
    """Response returned upon promoting a candidate into the Question Bank."""

    success: bool = True
    candidate_id: uuid.UUID
    approved_question_id: uuid.UUID
    message: str = "Question approved and added to Question Bank."


class AICandidateRejectRequest(BaseModel):
    """Request payload when rejecting a candidate question."""

    reason: Optional[str] = Field(default=None, max_length=500)


class AICandidateRejectResponse(BaseModel):
    """Response returned upon rejecting a candidate question."""

    success: bool = True
    candidate_id: uuid.UUID
    status: str = "rejected"
    message: str = "Candidate question rejected."
