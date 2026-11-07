"""CourseTeacher junction entity model for Learnova D2."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.user import User


class CourseTeacher(Base):
    """Junction table for assigning teachers to courses (DEC-P2-002)."""

    __tablename__ = "course_teachers"

    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        primary_key=True,
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    course: Mapped["Course"] = relationship(
        "Course",
        back_populates="teacher_assignments",
    )
    teacher: Mapped["User"] = relationship(
        "User",
        back_populates="teacher_assignments",
    )

    def __repr__(self) -> str:
        return f"<CourseTeacher course_id={self.course_id} teacher_id={self.teacher_id}>"
