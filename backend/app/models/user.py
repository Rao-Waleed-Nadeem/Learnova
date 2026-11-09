"""User entity model for Learnova D1 (User Accounts & Roles)."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.assessment import Assessment
    from app.models.attempt import AssessmentAttempt
    from app.models.course import Course
    from app.models.course_teacher import CourseTeacher
    from app.models.enrollment import Enrollment
    from app.models.lesson_completion import LessonCompletion
    from app.models.mastery import StudentTopicMastery
    from app.models.profile import UserProfile
    from app.models.question import Question
    from app.models.role import Role
    from app.models.security_audit_event import SecurityAuditEvent
    from app.models.session import UserSession


class User(Base):
    """User account entity model for authentication and identity."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="users",
    )
    profile: Mapped[Optional["UserProfile"]] = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    created_courses: Mapped[List["Course"]] = relationship(
        "Course",
        back_populates="creator",
    )
    teacher_assignments: Mapped[List["CourseTeacher"]] = relationship(
        "CourseTeacher",
        back_populates="teacher",
        cascade="all, delete-orphan",
    )
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    audit_events: Mapped[List["SecurityAuditEvent"]] = relationship(
        "SecurityAuditEvent",
        back_populates="actor",
    )
    enrollments: Mapped[List["Enrollment"]] = relationship(
        "Enrollment",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    lesson_completions: Mapped[List["LessonCompletion"]] = relationship(
        "LessonCompletion",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    authored_questions: Mapped[List["Question"]] = relationship(
        "Question",
        back_populates="author",
    )
    created_assessments: Mapped[List["Assessment"]] = relationship(
        "Assessment",
        back_populates="creator",
    )
    assessment_attempts: Mapped[List["AssessmentAttempt"]] = relationship(
        "AssessmentAttempt",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    topic_masteries: Mapped[List["StudentTopicMastery"]] = relationship(
        "StudentTopicMastery",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    gamification_profile: Mapped[Optional["GamificationProfile"]] = relationship(
        "GamificationProfile",
        back_populates="student",
        uselist=False,
        cascade="all, delete-orphan",
    )
    xp_ledger_entries: Mapped[List["XPLedger"]] = relationship(
        "XPLedger",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    user_badges: Mapped[List["UserBadge"]] = relationship(
        "UserBadge",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    user_challenges: Mapped[List["UserChallenge"]] = relationship(
        "UserChallenge",
        back_populates="student",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} is_active={self.is_active}>"
