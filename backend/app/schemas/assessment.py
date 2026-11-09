"""Pydantic schemas for Assessment authoring and composition operations (D3 Domain)."""

from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.question import QuestionDetailResponse, QuestionStudentResponse


# ---------------------------------------------------------------------------
# Assessment Item Schemas
# ---------------------------------------------------------------------------

class AssessmentQuestionItem(BaseModel):
    """Specification for attaching a question to an assessment."""
    question_id: UUID
    order: Optional[int] = Field(default=0, ge=0)
    points: Optional[int] = Field(default=None, gt=0)


class AssessmentQuestionResponse(BaseModel):
    """Junction response detailing question ordering, points, and pinned version."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    assessment_id: UUID
    question_id: UUID
    order: int
    points: int
    question_version: int
    question: Optional[QuestionDetailResponse] = None


class AssessmentQuestionStudentResponse(BaseModel):
    """Safe projection of assessment question for student delivery."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    assessment_id: UUID
    question_id: UUID
    order: int
    points: int
    question_version: int
    question: Optional[QuestionStudentResponse] = None


# ---------------------------------------------------------------------------
# Assessment Request Schemas
# ---------------------------------------------------------------------------

class AssessmentCreateRequest(BaseModel):
    """Payload for creating a new assessment."""
    course_id: UUID
    topic_id: Optional[UUID] = None
    title: str = Field(..., min_length=1, max_length=255)
    type: Literal["diagnostic", "formative", "summative", "adaptive", "final"]
    instructions: Optional[str] = None
    time_limit_minutes: Optional[int] = Field(default=None, gt=0)
    max_attempts: Optional[int] = Field(default=None, gt=0)
    passing_score_percent: Optional[int] = Field(default=None, ge=0, le=100)
    schedule_date: Optional[datetime] = None
    questions: Optional[List[AssessmentQuestionItem]] = []


class AssessmentUpdateRequest(BaseModel):
    """Payload for updating an assessment metadata or question composition."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    topic_id: Optional[UUID] = None
    type: Optional[Literal["diagnostic", "formative", "summative", "adaptive", "final"]] = None
    instructions: Optional[str] = None
    time_limit_minutes: Optional[int] = Field(default=None, gt=0)
    max_attempts: Optional[int] = Field(default=None, gt=0)
    passing_score_percent: Optional[int] = Field(default=None, ge=0, le=100)
    schedule_date: Optional[datetime] = None
    questions: Optional[List[AssessmentQuestionItem]] = None


# ---------------------------------------------------------------------------
# Assessment Response Schemas
# ---------------------------------------------------------------------------

class AssessmentResponse(BaseModel):
    """Authoritative assessment response for teacher and administration authoring."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_id: UUID
    topic_id: Optional[UUID] = None
    creator_id: Optional[UUID] = None
    title: str
    type: str
    instructions: Optional[str] = None
    time_limit_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    passing_score_percent: Optional[int] = None
    schedule_date: Optional[datetime] = None
    status: str
    total_points: int
    questions_count: int = 0
    questions: List[AssessmentQuestionResponse] = []
    created_at: datetime
    updated_at: datetime


class AssessmentStudentResponse(BaseModel):
    """Safe projection of an assessment for student examination (no grading secrets)."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_id: UUID
    topic_id: Optional[UUID] = None
    title: str
    type: str
    instructions: Optional[str] = None
    time_limit_minutes: Optional[int] = None
    max_attempts: Optional[int] = None
    passing_score_percent: Optional[int] = None
    schedule_date: Optional[datetime] = None
    status: str
    total_points: int
    questions_count: int = 0
    questions: List[AssessmentQuestionStudentResponse] = []
    created_at: datetime
