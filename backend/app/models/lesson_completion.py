"""LessonCompletion and ResourceActivity entity models for Learnova D4."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.enrollment import Enrollment
    from app.models.lesson import Lesson
    from app.models.resource import LearningResource
    from app.models.topic import Topic
    from app.models.user import User


class LessonCompletion(Base):
    """Authoritative persistent record of student lesson completion."""

    __tablename__ = "lesson_completions"

    __table_args__ = (
        UniqueConstraint("student_id", "lesson_id", name="uq_lesson_completions_student_lesson"),
        UniqueConstraint("enrollment_id", "lesson_id", name="uq_lesson_completions_enrollment_lesson"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    enrollment: Mapped["Enrollment"] = relationship(
        "Enrollment",
        back_populates="lesson_completions",
    )
    student: Mapped["User"] = relationship(
        "User",
        back_populates="lesson_completions",
    )
    course: Mapped["Course"] = relationship(
        "Course",
        back_populates="lesson_completions",
    )
    topic: Mapped["Topic"] = relationship(
        "Topic",
    )
    lesson: Mapped["Lesson"] = relationship(
        "Lesson",
    )

    def __repr__(self) -> str:
        return f"<LessonCompletion id={self.id} student_id={self.student_id} lesson_id={self.lesson_id}>"


class ResourceActivity(Base):
    """Activity tracking record for student interaction with learning resources."""

    __tablename__ = "resource_activities"

    __table_args__ = (
        CheckConstraint(
            "event_type IN ('view', 'read', 'watch', 'complete')",
            name="ck_resource_activities_event_type",
        ),
        CheckConstraint(
            "duration_seconds >= 0",
            name="ck_resource_activities_duration",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    enrollment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resource_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("learning_resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(32),
        default="view",
        nullable=False,
    )
    duration_seconds: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    enrollment: Mapped[Optional["Enrollment"]] = relationship(
        "Enrollment",
        back_populates="resource_activities",
    )
    student: Mapped["User"] = relationship(
        "User",
    )
    resource: Mapped["LearningResource"] = relationship(
        "LearningResource",
    )

    def __repr__(self) -> str:
        return f"<ResourceActivity id={self.id} student_id={self.student_id} resource_id={self.resource_id} event_type={self.event_type}>"
