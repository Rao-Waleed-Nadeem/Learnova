"""Question entity model for Learnova D3 (Assessment & Question Bank)."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.assessment import AssessmentQuestion
    from app.models.course import Course
    from app.models.topic import Topic
    from app.models.user import User


class Question(Base):
    """Question Bank item entity model supporting five assessment question formats."""

    __tablename__ = "questions"

    __table_args__ = (
        CheckConstraint(
            "type IN ('multiple_choice', 'true_false', 'fill_blank', 'matching', 'short_answer')",
            name="ck_questions_type",
        ),
        CheckConstraint(
            "difficulty IN ('easy', 'medium', 'hard')",
            name="ck_questions_difficulty",
        ),
        CheckConstraint(
            "status IN ('draft', 'pending_review', 'approved', 'rejected', 'archived')",
            name="ck_questions_status",
        ),
        CheckConstraint(
            "source IN ('teacher', 'ai_generated')",
            name="ck_questions_source",
        ),
        CheckConstraint(
            "points > 0",
            name="ck_questions_points_positive",
        ),
        CheckConstraint(
            "version >= 1",
            name="ck_questions_version_positive",
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
    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
    )
    difficulty: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        index=True,
    )
    points: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    prompt: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    explanation: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        default="approved",
        nullable=False,
        index=True,
    )
    source: Mapped[str] = mapped_column(
        String(32),
        default="teacher",
        nullable=False,
    )
    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )

    # Deliverable content projected to students (options without answers, template)
    payload: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"),
        default=dict,
        nullable=False,
    )

    # Server-only grading criteria (correct options, booleans, accepted answers, rubrics)
    answer_key: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"),
        default=dict,
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
        back_populates="questions",
    )
    topic: Mapped["Topic"] = relationship(
        "Topic",
        back_populates="questions",
    )
    author: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="authored_questions",
    )
    assessment_associations: Mapped[List["AssessmentQuestion"]] = relationship(
        "AssessmentQuestion",
        back_populates="question",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Question id={self.id} type={self.type} difficulty={self.difficulty} points={self.points} version={self.version}>"
