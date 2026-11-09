"""Student topic mastery and audit ledger models for Learnova D4 (Adaptive Engine & Mastery)."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.assessment import Assessment
    from app.models.attempt import AssessmentAttempt
    from app.models.course import Course
    from app.models.topic import Topic
    from app.models.user import User


class StudentTopicMastery(Base):
    """Student topic cognitive mastery state entity."""

    __tablename__ = "student_topic_mastery"

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "topic_id",
            name="uq_student_topic_mastery",
        ),
        CheckConstraint(
            "mastery_score >= 0.0000 AND mastery_score <= 1.0000",
            name="ck_student_topic_mastery_score",
        ),
        CheckConstraint(
            "score_percent >= 0 AND score_percent <= 100",
            name="ck_student_topic_mastery_percent",
        ),
        CheckConstraint(
            "status IN ('not_assessed', 'developing', 'competent', 'mastered')",
            name="ck_student_topic_mastery_status",
        ),
        CheckConstraint(
            "attempts_count >= 0",
            name="ck_student_topic_mastery_attempts_nonnegative",
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
    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mastery_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        default=Decimal("0.0000"),
        nullable=False,
    )
    score_percent: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        default="not_assessed",
        nullable=False,
    )
    bkt_probability: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4),
        nullable=True,
    )
    attempts_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    last_attempt_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("assessment_attempts.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_assessed_at: Mapped[Optional[datetime]] = mapped_column(
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
        back_populates="topic_masteries",
    )
    course: Mapped["Course"] = relationship(
        "Course",
    )
    topic: Mapped["Topic"] = relationship(
        "Topic",
    )
    last_attempt: Mapped[Optional["AssessmentAttempt"]] = relationship(
        "AssessmentAttempt",
    )

    def __repr__(self) -> str:
        return f"<StudentTopicMastery student={self.student_id} topic={self.topic_id} status={self.status} score={self.mastery_score}>"


class MasteryAuditLedger(Base):
    """Immutable audit ledger recording every mastery recalibration event."""

    __tablename__ = "mastery_audit_ledger"

    __table_args__ = (
        CheckConstraint(
            "new_score >= 0.0000 AND new_score <= 1.0000",
            name="ck_mastery_ledger_new_score",
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
    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("assessment_attempts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    previous_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4),
        nullable=True,
    )
    new_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False,
    )
    previous_status: Mapped[Optional[str]] = mapped_column(
        String(32),
        nullable=True,
    )
    new_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )
    assessment_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )
    algorithm_used: Mapped[str] = mapped_column(
        String(64),
        default="BKT_HYBRID_V1",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    student: Mapped["User"] = relationship(
        "User",
    )
    topic: Mapped["Topic"] = relationship(
        "Topic",
    )
    attempt: Mapped["AssessmentAttempt"] = relationship(
        "AssessmentAttempt",
    )

    def __repr__(self) -> str:
        return f"<MasteryAuditLedger student={self.student_id} topic={self.topic_id} old={self.previous_score} new={self.new_score}>"
