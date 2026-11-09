"""Pydantic schemas for Student Enrollment, Lesson Completion, and Learning Map."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============================================================================
# Enrollment Schemas
# ============================================================================

class EnrollmentResponse(BaseModel):
    """API response model for course enrollments with dynamically derived progress."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: UUID
    course_id: UUID
    course_title: Optional[str] = None
    status: str
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    progress_percent: float = 0.0
    completed_lessons_count: int = 0
    total_lessons_count: int = 0
    created_at: datetime
    updated_at: datetime


class LessonCompletionResponse(BaseModel):
    """API response model for recorded lesson completions."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    enrollment_id: UUID
    student_id: UUID
    course_id: UUID
    topic_id: UUID
    lesson_id: UUID
    completed_at: datetime
    progress_percent: Optional[float] = None


class ResourceActivityRequest(BaseModel):
    """Payload for logging study activity on a learning resource."""
    event_type: str = Field(default="view", description="view, read, watch, complete")
    duration_seconds: int = Field(default=0, ge=0)

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        allowed = {"view", "read", "watch", "complete"}
        if v not in allowed:
            raise ValueError(f"event_type must be one of {allowed}")
        return v


class ResourceActivityResponse(BaseModel):
    """API response model for logged resource activity."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    enrollment_id: Optional[UUID] = None
    student_id: UUID
    resource_id: UUID
    event_type: str
    duration_seconds: int
    occurred_at: datetime
    created_at: datetime


# ============================================================================
# Learning Map Schemas
# ============================================================================

class LearningMapNode(BaseModel):
    """Node in the course learning map representing a syllabus topic with readiness."""
    id: UUID
    title: str
    description: Optional[str] = None
    order: int
    mastery_threshold: float
    prerequisite_ids: List[UUID] = []
    lessons_count: int = 0
    completed_lessons_count: int = 0
    readiness: str = Field(
        default="ready",
        description="Readiness state: ready, locked, in_progress, not_evaluated"
    )
    unmet_prerequisites: List[UUID] = []


class LearningMapEdge(BaseModel):
    """Directed prerequisite edge from source prerequisite topic to dependent topic."""
    source: UUID
    target: UUID


class LearningMapResponse(BaseModel):
    """Full curriculum graph and prerequisite structure for a course."""
    course_id: UUID
    course_title: str
    nodes: List[LearningMapNode] = []
    edges: List[LearningMapEdge] = []
