"""Assessment attempt and response models for Learnova D4 (Assessment Lifecycle & Grading)."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.assessment import Assessment
    from app.models.enrollment import Enrollment
    from app.models.question import Question
    from app.models.user import User


class AssessmentAttempt(Base):
    """Student assessment attempt entity managing lifecycle, snapshot, timing, and authoritative scores."""

    __tablename__ = "assessment_attempts"

    __table_args__ = (
        UniqueConstraint(
            "assessment_id",
            "student_id",
            "attempt_number",
            name="uq_assessment_attempts_student_attempt",
        ),
        CheckConstraint(
            "status IN ('in_progress', 'submitted', 'graded', 'pending_manual_review', 'expired', 'abandoned')",
            name="ck_assessment_attempts_status",
        ),
        CheckConstraint(
            "attempt_number > 0",
            name="ck_assessment_attempts_number_positive",
        ),
        CheckConstraint(
            "max_score >= 0",
            name="ck_assessment_attempts_max_score_nonnegative",
        ),
        CheckConstraint(
            "score_percent IS NULL OR (score_percent >= 0 AND score_percent <= 100)",
            name="ck_assessment_attempts_score_percent_range",
        ),
        CheckConstraint(
            "deadline_at IS NULL OR deadline_at >= started_at",
            name="ck_assessment_attempts_deadline_valid",
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
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attempt_number: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        default="in_progress",
        nullable=False,
        index=True,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    deadline_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(7, 2),
        nullable=True,
    )
    max_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    score_percent: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )
    passed: Mapped[Optional[bool]] = mapped_column(
        Boolean,
        nullable=True,
    )
    current_difficulty: Mapped[Optional[str]] = mapped_column(
        String(16),
        nullable=True,
    )

    # Immutable question snapshots and scoring weights at attempt creation
    snapshot_data: Mapped[Dict[str, Any]] = mapped_column(
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
    assessment: Mapped["Assessment"] = relationship(
        "Assessment",
        back_populates="attempts",
    )
    student: Mapped["User"] = relationship(
        "User",
        back_populates="assessment_attempts",
    )
    enrollment: Mapped["Enrollment"] = relationship(
        "Enrollment",
        back_populates="attempts",
    )
    responses: Mapped[List["AttemptResponse"]] = relationship(
        "AttemptResponse",
        back_populates="attempt",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<AssessmentAttempt id={self.id} assessment_id={self.assessment_id} student_id={self.student_id} status={self.status} score={self.score}>"


class AttemptResponse(Base):
    """Student interim or final response to an assessment question."""

    __tablename__ = "attempt_responses"

    __table_args__ = (
        UniqueConstraint(
            "attempt_id",
            "question_id",
            name="uq_attempt_responses_attempt_question",
        ),
        CheckConstraint(
            "points_possible > 0",
            name="ck_attempt_responses_points_possible_positive",
        ),
        CheckConstraint(
            "points_awarded IS NULL OR points_awarded >= 0",
            name="ck_attempt_responses_points_awarded_nonnegative",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("assessment_attempts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    student_response: Mapped[Any] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"),
        default=dict,
        nullable=False,
    )
    is_correct: Mapped[Optional[bool]] = mapped_column(
        Boolean,
        nullable=True,
    )
    points_awarded: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(7, 2),
        nullable=True,
    )
    points_possible: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    response_time_seconds: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    feedback: Mapped[Optional[str]] = mapped_column(
        Text,
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
    attempt: Mapped["AssessmentAttempt"] = relationship(
        "AssessmentAttempt",
        back_populates="responses",
    )
    question: Mapped["Question"] = relationship(
        "Question",
    )

    def __repr__(self) -> str:
        return f"<AttemptResponse attempt_id={self.attempt_id} question_id={self.question_id} is_correct={self.is_correct} points={self.points_awarded}>"
