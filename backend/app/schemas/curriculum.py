"""Pydantic schemas for Course, Topic, Lesson, and Resource domain operations."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============================================================================
# Resource Schemas
# ============================================================================

class ResourceBase(BaseModel):
    """Base schema for learning resources."""
    title: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., description="document, video, markdown, code, link")
    content_or_url: str = Field(..., min_length=1)
    file_size_bytes: Optional[int] = Field(default=None, ge=0)

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"document", "video", "markdown", "code", "link"}
        if v not in allowed:
            raise ValueError(f"type must be one of {allowed}")
        return v


class ResourceCreateRequest(ResourceBase):
    """Payload for creating a learning resource within a lesson."""
    pass


class ResourceUpdateRequest(BaseModel):
    """Payload for updating a learning resource."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    type: Optional[str] = None
    content_or_url: Optional[str] = Field(default=None, min_length=1)
    file_size_bytes: Optional[int] = Field(default=None, ge=0)

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"document", "video", "markdown", "code", "link"}
            if v not in allowed:
                raise ValueError(f"type must be one of {allowed}")
        return v


class ResourceResponse(BaseModel):
    """API response model for learning resources with synthesized course_id."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lesson_id: UUID
    course_id: Optional[UUID] = None
    title: str
    type: str
    content_or_url: str
    file_size_bytes: Optional[int] = None
    created_at: datetime


# ============================================================================
# Lesson Schemas
# ============================================================================

class LessonBase(BaseModel):
    """Base schema for lessons."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    order: int = Field(default=0, ge=0)


class LessonCreateRequest(LessonBase):
    """Payload for creating a lesson in a topic."""
    pass


class LessonUpdateRequest(BaseModel):
    """Payload for modifying an existing lesson."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    order: Optional[int] = Field(default=None, ge=0)


class LessonResponse(BaseModel):
    """API response model for lessons with synthesized course_id and optional resources."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    topic_id: UUID
    course_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    order: int
    resources: List[ResourceResponse] = []
    created_at: datetime
    updated_at: datetime


# ============================================================================
# Topic Schemas
# ============================================================================

class TopicBase(BaseModel):
    """Base schema for topics."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    order: int = Field(default=0, ge=0)
    mastery_threshold: Decimal = Field(default=Decimal("0.7500"), ge=0, le=1)


class TopicCreateRequest(TopicBase):
    """Payload for creating a topic in a course."""
    pass


class TopicUpdateRequest(BaseModel):
    """Payload for modifying an existing topic."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    order: Optional[int] = Field(default=None, ge=0)
    mastery_threshold: Optional[Decimal] = Field(default=None, ge=0, le=1)


class TopicPrerequisiteUpdateRequest(BaseModel):
    """Payload for replacing prerequisite edges for a topic."""
    prerequisite_topic_ids: List[UUID] = Field(default=[], description="List of prerequisite topic UUIDs")


class TopicPrerequisiteResponse(BaseModel):
    """Response returned upon updating topic prerequisites."""
    topic_id: UUID
    prerequisite_topic_ids: List[UUID]


class TopicResponse(BaseModel):
    """API response model for topics with prerequisites and optional lessons."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_id: UUID
    title: str
    description: Optional[str] = None
    order: int
    mastery_threshold: Decimal
    prerequisite_topic_ids: List[UUID] = []
    lessons: List[LessonResponse] = []
    created_at: datetime
    updated_at: datetime


# ============================================================================
# Course Schemas
# ============================================================================

class CourseCreateRequest(BaseModel):
    """Payload for creating a new course."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class CourseUpdateRequest(BaseModel):
    """Payload for modifying an existing course."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None


class CourseResponse(BaseModel):
    """API response model for course list summary."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: Optional[str] = None
    status: str
    creator_id: Optional[UUID] = None
    creator_name: Optional[str] = None
    topics_count: int = 0
    lessons_count: int = 0
    created_at: datetime
    updated_at: datetime


class CourseDetailResponse(BaseModel):
    """API response model for full course detail with syllabus hierarchy."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: Optional[str] = None
    status: str
    creator_id: Optional[UUID] = None
    creator_name: Optional[str] = None
    topics_count: int = 0
    lessons_count: int = 0
    topics: List[TopicResponse] = []
    created_at: datetime
    updated_at: datetime
