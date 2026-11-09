"""Pydantic schemas for Learnova Knowledge Tracing & Dynamic Mastery Engine."""

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class TopicMasteryItem(BaseModel):
    """Student mastery status for a single topic."""

    topic_id: uuid.UUID
    topic_title: str
    course_id: uuid.UUID
    mastery_score: float = Field(..., ge=0.0, le=1.0)
    score_percent: int = Field(..., ge=0, le=100)
    status: str = Field(..., description="'not_assessed', 'developing', 'competent', or 'mastered'")
    bkt_probability: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    attempts_count: int = Field(default=0, ge=0)
    last_assessed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CourseMasteryResponse(BaseModel):
    """Aggregate course mastery report across all syllabus topics."""

    course_id: uuid.UUID
    student_id: uuid.UUID
    topics: List[TopicMasteryItem]
    overall_mastery_percent: int = Field(..., ge=0, le=100)
    mastered_count: int = Field(default=0, ge=0)
    competent_count: int = Field(default=0, ge=0)
    developing_count: int = Field(default=0, ge=0)
    not_assessed_count: int = Field(default=0, ge=0)

    model_config = ConfigDict(from_attributes=True)


class TopicPrerequisiteStatus(BaseModel):
    """Prerequisite dependency compliance detail."""

    prerequisite_topic_id: uuid.UUID
    prerequisite_title: str
    required_mastery: float = Field(..., ge=0.0, le=1.0)
    current_mastery: float = Field(..., ge=0.0, le=1.0)
    status: str
    is_satisfied: bool

    model_config = ConfigDict(from_attributes=True)


class TopicReadinessResponse(BaseModel):
    """Topic access readiness evaluation result (SSD-02)."""

    topic_id: uuid.UUID
    topic_title: str
    is_ready: bool
    unmet_prerequisites: List[TopicPrerequisiteStatus]
    diagnostic_assessment_id: Optional[uuid.UUID] = None
    reason: str

    model_config = ConfigDict(from_attributes=True)


class LearningPathItemResponse(BaseModel):
    """Individual item in dynamic personalized learning path (SSD-03)."""

    id: str
    course_id: uuid.UUID
    topic_id: uuid.UUID
    topic_title: str
    lesson_id: Optional[uuid.UUID] = None
    lesson_title: Optional[str] = None
    type: str = Field(..., description="'lesson', 'diagnostic', 'adaptive_practice', 'final_exam', or 'course_completed'")
    title: str
    reason: str
    is_completed: bool

    model_config = ConfigDict(from_attributes=True)


class CourseLearningPathResponse(BaseModel):
    """Complete personalized learning path with immediate next recommended step."""

    course_id: uuid.UUID
    student_id: uuid.UUID
    recommended_next_step: LearningPathItemResponse
    items: List[LearningPathItemResponse]
    total_topics: int = Field(default=0, ge=0)
    mastered_topics: int = Field(default=0, ge=0)
    progress_percent: float = Field(default=0.0, ge=0.0, le=100.0)

    model_config = ConfigDict(from_attributes=True)


class TopicMasteryRecalculateItem(BaseModel):
    """Result of mastery recalculation for a single topic."""

    topic_id: uuid.UUID
    topic_title: str
    previous_score: Optional[float] = None
    new_score: float = Field(..., ge=0.0, le=1.0)
    previous_status: Optional[str] = None
    new_status: str
    score_percent: int = Field(..., ge=0, le=100)
    bkt_probability: Optional[float] = None
    attempts_count: int

    model_config = ConfigDict(from_attributes=True)


class MasteryRecalculateResponse(BaseModel):
    """Result of an assessment-triggered mastery recalculation."""

    topic_id: uuid.UUID
    topic_title: str
    previous_score: Optional[float] = None
    new_score: float = Field(..., ge=0.0, le=1.0)
    previous_status: Optional[str] = None
    new_status: str
    score_percent: int = Field(..., ge=0, le=100)
    bkt_probability: Optional[float] = None
    attempts_count: int
    message: str
    updated_topics: Optional[List[TopicMasteryRecalculateItem]] = None

    model_config = ConfigDict(from_attributes=True)
