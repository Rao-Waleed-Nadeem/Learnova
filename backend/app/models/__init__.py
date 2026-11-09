"""Learnova domain persistence models registry.

Exposes all models so that Alembic and SQLAlchemy metadata
automatically registers all tables.
"""

from app.models.ai import AICandidateQuestion, AIContentCache
from app.models.assessment import Assessment, AssessmentQuestion
from app.models.attempt import AssessmentAttempt, AttemptResponse
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.enrollment import Enrollment
from app.models.gamification import (
    Badge,
    Challenge,
    GamificationProfile,
    UserBadge,
    UserChallenge,
    XPLedger,
)
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion, ResourceActivity
from app.models.mastery import MasteryAuditLedger, StudentTopicMastery
from app.models.outbox import DomainOutboxEvent
from app.models.profile import UserProfile
from app.models.question import Question
from app.models.resource import LearningResource
from app.models.role import Role
from app.models.security_audit_event import SecurityAuditEvent
from app.models.session import UserSession
from app.models.topic import Topic
from app.models.topic_prerequisite import TopicPrerequisite
from app.models.user import User

__all__ = [
    "Role",
    "User",
    "UserProfile",
    "Course",
    "CourseTeacher",
    "Topic",
    "TopicPrerequisite",
    "Lesson",
    "LearningResource",
    "UserSession",
    "SecurityAuditEvent",
    "Enrollment",
    "LessonCompletion",
    "ResourceActivity",
    "Question",
    "Assessment",
    "AssessmentQuestion",
    "AssessmentAttempt",
    "AttemptResponse",
    "DomainOutboxEvent",
    "StudentTopicMastery",
    "MasteryAuditLedger",
    "GamificationProfile",
    "XPLedger",
    "Badge",
    "UserBadge",
    "Challenge",
    "UserChallenge",
    "AICandidateQuestion",
    "AIContentCache",
]
