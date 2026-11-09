"""Assessment and AssessmentQuestion entity models for Learnova D3 (Assessment & Question Bank)."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.attempt import AssessmentAttempt
    from app.models.course import Course
    from app.models.question import Question
    from app.models.topic import Topic
    from app.models.user import User


class Assessment(Base):
    """Assessment definition model for courses and topics."""

    __tablename__ = "assessments"

    __table_args__ = (
        CheckConstraint(
            "type IN ('diagnostic', 'formative', 'summative', 'adaptive', 'final')",
            name="ck_assessments_type",
        ),
        CheckConstraint(
            "status IN ('draft', 'published', 'scheduled', 'completed', 'archived')",
            name="ck_assessments_status",
        ),
        CheckConstraint(
            "time_limit_minutes IS NULL OR time_limit_minutes > 0",
            name="ck_assessments_time_limit_positive",
        ),
        CheckConstraint(
            "max_attempts IS NULL OR max_attempts > 0",
            name="ck_assessments_max_attempts_positive",
        ),
        CheckConstraint(
            "passing_score_percent IS NULL OR (passing_score_percent >= 0 AND passing_score_percent <= 100)",
            name="ck_assessments_passing_score_range",
        ),
        CheckConstraint(
            "total_points >= 0",
            name="ck_assessments_total_points_nonnegative",
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
    topic_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    creator_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
    )
    instructions: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    time_limit_minutes: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    max_attempts: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    passing_score_percent: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    schedule_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        default="draft",
        nullable=False,
        index=True,
    )
    total_points: Mapped[int] = mapped_column(
        Integer,
        default=0,
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
        back_populates="assessments",
    )
    topic: Mapped[Optional["Topic"]] = relationship(
        "Topic",
        back_populates="assessments",
    )
    creator: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="created_assessments",
    )
    assessment_questions: Mapped[List["AssessmentQuestion"]] = relationship(
        "AssessmentQuestion",
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="AssessmentQuestion.order",
    )
    attempts: Mapped[List["AssessmentAttempt"]] = relationship(
        "AssessmentAttempt",
        back_populates="assessment",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Assessment id={self.id} title={self.title!r} type={self.type} status={self.status} total_points={self.total_points}>"


class AssessmentQuestion(Base):
    """Junction entity pinning question composition, order, points, and version to an assessment."""

    __tablename__ = "assessment_questions"

    __table_args__ = (
        UniqueConstraint(
            "assessment_id",
            "question_id",
            name="uq_assessment_questions_assessment_question",
        ),
        CheckConstraint(
            '"order" >= 0',
            name="ck_assessment_questions_order_nonnegative",
        ),
        CheckConstraint(
            "points > 0",
            name="ck_assessment_questions_points_positive",
        ),
        CheckConstraint(
            "question_version >= 1",
            name="ck_assessment_questions_version_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    points: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    question_version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    assessment: Mapped["Assessment"] = relationship(
        "Assessment",
        back_populates="assessment_questions",
    )
    question: Mapped["Question"] = relationship(
        "Question",
        back_populates="assessment_associations",
    )

    def __repr__(self) -> str:
        return f"<AssessmentQuestion assessment_id={self.assessment_id} question_id={self.question_id} order={self.order} points={self.points}>"
