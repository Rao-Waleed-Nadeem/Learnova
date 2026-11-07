"""Learnova domain persistence models registry.

Exposes all models so that Alembic and SQLAlchemy metadata
automatically registers all tables.
"""

from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.lesson import Lesson
from app.models.profile import UserProfile
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
]
