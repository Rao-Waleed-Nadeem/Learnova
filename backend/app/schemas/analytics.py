"""Pydantic schemas for Student and Teacher Analytics (Phase 10)."""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ============================================================================
# Student Analytics Schemas
# ============================================================================

class StudentEnrolledCourseSummary(BaseModel):
    """Enrolled course progress and syllabus summary for a student."""

    model_config = ConfigDict(from_attributes=True)

    course_id: uuid.UUID
    course_title: str
    course_description: Optional[str] = None
    enrolled_at: datetime
    progress_percent: int = Field(ge=0, le=100)
    completed_lessons: int
    total_lessons: int
    average_mastery_percent: Optional[int] = Field(default=None, ge=0, le=100)


class StudentMasterySummary(BaseModel):
    """Overall mastery counts across all enrolled topics for a student."""

    total_topics: int
    mastered_count: int
    competent_count: int
    developing_count: int
    not_assessed_count: int
    overall_average_mastery: Optional[int] = Field(default=None, ge=0, le=100)


class StudentRecentAttempt(BaseModel):
    """Safe projection of a student's recent assessment attempt."""

    model_config = ConfigDict(from_attributes=True)

    attempt_id: uuid.UUID
    assessment_id: uuid.UUID
    assessment_title: str
    course_id: uuid.UUID
    course_title: str
    score_percent: Optional[int] = Field(default=None, ge=0, le=100)
    status: str
    is_passing: Optional[bool] = None
    submitted_at: Optional[datetime] = None


class StudentRecentActivity(BaseModel):
    """Recent learning activity item (lesson completion or resource view)."""

    id: uuid.UUID
    activity_type: str  # "lesson_completion" | "resource_study"
    title: str
    course_id: uuid.UUID
    course_title: str
    completed_at: datetime


class StudentGamificationSummary(BaseModel):
    """Gamification progress snapshot (separated from academic mastery)."""

    xp: int
    level: int
    streak_days: int
    badges_count: int
    is_opted_in_leaderboard: bool


class StudentDashboardResponse(BaseModel):
    """Aggregated dashboard payload for authenticated student."""

    student_id: uuid.UUID
    student_name: str
    enrolled_courses: List[StudentEnrolledCourseSummary]
    mastery_summary: StudentMasterySummary
    recent_attempts: List[StudentRecentAttempt]
    recent_activity: List[StudentRecentActivity]
    gamification: Optional[StudentGamificationSummary] = None


class StudentTopicMasteryItem(BaseModel):
    """Detailed topic mastery item for student analytics."""

    model_config = ConfigDict(from_attributes=True)

    topic_id: uuid.UUID
    topic_title: str
    course_id: uuid.UUID
    course_title: str
    mastery_score: Optional[float] = None
    mastery_percent: Optional[int] = None
    status: str  # "mastered" | "competent" | "developing" | "not_assessed"
    threshold: int
    is_weak: bool
    last_assessed_at: Optional[datetime] = None


class StudentAttemptTrendItem(BaseModel):
    """Chronological assessment score item for mastery trajectory charts."""

    attempt_id: uuid.UUID
    assessment_id: uuid.UUID
    assessment_title: str
    score_percent: int
    submitted_at: datetime


class StudentAnalyticsResponse(BaseModel):
    """Comprehensive analytics breakdown for a student."""

    student_id: uuid.UUID
    course_id: Optional[uuid.UUID] = None
    topic_masteries: List[StudentTopicMasteryItem]
    weak_topics: List[StudentTopicMasteryItem]
    attempt_trends: List[StudentAttemptTrendItem]
    lessons_completed_count: int
    resources_studied_count: int
    total_attempts_count: int


class StudentAttemptListItem(BaseModel):
    """Item in student assessment attempt history listing."""

    model_config = ConfigDict(from_attributes=True)

    attempt_id: uuid.UUID
    assessment_id: uuid.UUID
    assessment_title: str
    course_id: uuid.UUID
    course_title: str
    score_percent: Optional[int] = None
    status: str
    is_passing: Optional[bool] = None
    attempt_number: int
    started_at: datetime
    submitted_at: Optional[datetime] = None


class StudentAttemptsListResponse(BaseModel):
    """Paginated list of assessment attempts for authenticated student."""

    items: List[StudentAttemptListItem]
    total: int
    limit: int
    offset: int


# ============================================================================
# Teacher Analytics Schemas
# ============================================================================

class TeacherAssignedCourseSummary(BaseModel):
    """Summary of an assigned course for teacher overview dashboard."""

    course_id: uuid.UUID
    title: str
    status: str
    enrolled_students_count: int
    total_topics: int
    total_assessments: int
    average_mastery_percent: Optional[int] = None


class TeacherDashboardResponse(BaseModel):
    """Overview dashboard payload for authenticated teacher."""

    teacher_id: uuid.UUID
    assigned_courses: List[TeacherAssignedCourseSummary]
    total_students_reach: int
    total_active_assessments: int


class TopicMasteryDistributionItem(BaseModel):
    """Topic-level class mastery heatmap and status distribution."""

    topic_id: uuid.UUID
    topic_title: str
    threshold: int
    average_mastery_percent: Optional[int] = None
    assessed_students_count: int
    mastered_count: int
    competent_count: int
    developing_count: int
    not_assessed_count: int
    is_class_weak: bool


class ScoreDistributionBands(BaseModel):
    """Assessment score distribution bands across completed attempts."""

    model_config = ConfigDict(populate_by_name=True)

    band_0_49: int = Field(default=0, alias="0-49%")
    band_50_69: int = Field(default=0, alias="50-69%")
    band_70_84: int = Field(default=0, alias="70-84%")
    band_85_100: int = Field(default=0, alias="85-100%")


class AssessmentSummaryItem(BaseModel):
    """Aggregated statistics for a specific course assessment."""

    assessment_id: uuid.UUID
    title: str
    type: str
    total_attempts: int
    completed_attempts: int
    average_score_percent: Optional[int] = None
    highest_score_percent: Optional[int] = None
    lowest_score_percent: Optional[int] = None


class AtRiskStudentItem(BaseModel):
    """Enrolled student flagged with weak topics in the assigned course."""

    student_id: uuid.UUID
    student_name: str
    student_email: str
    weak_topics_count: int
    average_mastery_percent: Optional[int] = None


class TeacherCourseAnalyticsResponse(BaseModel):
    """Comprehensive course-scoped analytics for assigned teacher."""

    course_id: uuid.UUID
    course_title: str
    enrolled_students_count: int
    overall_average_mastery: Optional[int] = None
    topic_mastery_distribution: List[TopicMasteryDistributionItem]
    weak_concepts: List[TopicMasteryDistributionItem]
    score_distribution: ScoreDistributionBands
    assessment_summaries: List[AssessmentSummaryItem]
    at_risk_students: List[AtRiskStudentItem]


class TeacherStudentCourseAnalyticsResponse(BaseModel):
    """Teacher drilldown into a specific enrolled student's course performance."""

    course_id: uuid.UUID
    course_title: str
    student_id: uuid.UUID
    student_name: str
    student_email: str
    enrolled_at: datetime
    progress_percent: int
    completed_lessons: int
    total_lessons: int
    average_mastery_percent: Optional[int] = None
    topic_masteries: List[StudentTopicMasteryItem]
    weak_topics: List[StudentTopicMasteryItem]
