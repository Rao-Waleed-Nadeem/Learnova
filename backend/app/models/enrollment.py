"""Enrollment entity model for Learnova D4 (Curriculum, Enrollment & Progress)."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.attempt import AssessmentAttempt
    from app.models.course import Course
    from app.models.lesson_completion import LessonCompletion, ResourceActivity
    from app.models.user import User


class Enrollment(Base):
    """Student course enrollment entity model representing active study participation."""

    __tablename__ = "enrollments"

    __table_args__ = (
        UniqueConstraint("student_id", "course_id", name="uq_enrollments_student_course"),
        CheckConstraint(
            "status IN ('active', 'completed', 'dropped')",
            name="ck_enrollments_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
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
    status: Mapped[str] = mapped_column(
        String(32),
        default="active",
        nullable=False,
        index=True,
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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
    student: Mapped["User"] = relationship(
        "User",
        back_populates="enrollments",
    )
    course: Mapped["Course"] = relationship(
        "Course",
        back_populates="enrollments",
    )
    lesson_completions: Mapped[List["LessonCompletion"]] = relationship(
        "LessonCompletion",
        back_populates="enrollment",
        cascade="all, delete-orphan",
    )
    resource_activities: Mapped[List["ResourceActivity"]] = relationship(
        "ResourceActivity",
        back_populates="enrollment",
        cascade="all, delete-orphan",
    )
    attempts: Mapped[List["AssessmentAttempt"]] = relationship(
        "AssessmentAttempt",
        back_populates="enrollment",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Enrollment id={self.id} student_id={self.student_id} course_id={self.course_id} status={self.status}>"
