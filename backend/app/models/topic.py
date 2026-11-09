"""Topic entity model for Learnova D2 (Courses, Curriculum & Resources)."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.assessment import Assessment
    from app.models.course import Course
    from app.models.lesson import Lesson
    from app.models.question import Question
    from app.models.topic_prerequisite import TopicPrerequisite


class Topic(Base):
    """Topic entity model representing a syllabus node in the curriculum DAG."""

    __tablename__ = "topics"

    __table_args__ = (
        CheckConstraint(
            '"order" >= 0',
            name="ck_topics_order",
        ),
        CheckConstraint(
            "mastery_threshold >= 0.0000 AND mastery_threshold <= 1.0000",
            name="ck_topics_mastery_threshold",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    mastery_threshold: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        default=Decimal("0.7500"),
        nullable=False,
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
    course: Mapped["Course"] = relationship(
        "Course",
        back_populates="topics",
    )
    lessons: Mapped[List["Lesson"]] = relationship(
        "Lesson",
        back_populates="topic",
        cascade="all, delete-orphan",
        order_by="Lesson.order",
    )
    prerequisite_edges: Mapped[List["TopicPrerequisite"]] = relationship(
        "TopicPrerequisite",
        foreign_keys="[TopicPrerequisite.topic_id]",
        back_populates="topic",
        cascade="all, delete-orphan",
    )
    dependent_edges: Mapped[List["TopicPrerequisite"]] = relationship(
        "TopicPrerequisite",
        foreign_keys="[TopicPrerequisite.prerequisite_topic_id]",
        back_populates="prerequisite_topic",
        cascade="all, delete-orphan",
    )
    questions: Mapped[List["Question"]] = relationship(
        "Question",
        back_populates="topic",
        cascade="all, delete-orphan",
    )
    assessments: Mapped[List["Assessment"]] = relationship(
        "Assessment",
        back_populates="topic",
    )

    def __repr__(self) -> str:
        return f"<Topic id={self.id} title={self.title!r} order={self.order}>"
