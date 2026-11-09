"""SQLAlchemy domain models for Gamification, XP ledger, badges, and challenges."""

import uuid
from datetime import date, datetime, timezone
from typing import Optional, List

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class GamificationProfile(Base):
    """Aggregate gamification profile for a student (XP, Level, Streak)."""

    __tablename__ = "gamification_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    xp: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    level: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    streak_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    last_active_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True
    )
    is_opted_in_leaderboard: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("xp >= 0", name="ck_gamification_xp"),
        CheckConstraint("level >= 1", name="ck_gamification_level"),
        CheckConstraint("streak_days >= 0", name="ck_gamification_streak"),
    )

    student: Mapped["User"] = relationship("User", back_populates="gamification_profile")  # type: ignore # noqa: F821


class XPLedger(Base):
    """Append-only chronological audit log of all earned XP events."""

    __tablename__ = "xp_ledger"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    xp_earned: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    related_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        CheckConstraint("xp_earned > 0", name="ck_xp_ledger_earned"),
        UniqueConstraint("idempotency_key", name="uq_xp_ledger_idempotency"),
    )

    student: Mapped["User"] = relationship("User", back_populates="xp_ledger_entries")  # type: ignore # noqa: F821


class Badge(Base):
    """Catalog of unlockable achievement badges."""

    __tablename__ = "badges"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    criteria_type: Mapped[str] = mapped_column(String(64), nullable=False)
    criteria_threshold: Mapped[float] = mapped_column(
        Numeric(8, 2), nullable=False, default=1.00, server_default="1.00"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "category IN ('achievement', 'streak', 'mastery', 'exam')",
            name="ck_badges_category",
        ),
    )

    user_badges: Mapped[List["UserBadge"]] = relationship(
        "UserBadge", back_populates="badge", cascade="all, delete-orphan"
    )


class UserBadge(Base):
    """Junction table of badges unlocked by students."""

    __tablename__ = "user_badges"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    badge_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("badges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    earned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("student_id", "badge_id", name="uq_user_badges"),
    )

    student: Mapped["User"] = relationship("User", back_populates="user_badges")  # type: ignore # noqa: F821
    badge: Mapped["Badge"] = relationship("Badge", back_populates="user_badges")


class Challenge(Base):
    """Time-bound learning challenge."""

    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    xp_reward: Mapped[int] = mapped_column(
        Integer, nullable=False, default=100, server_default="100"
    )
    challenge_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target_value: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    starts_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("xp_reward > 0", name="ck_challenges_reward"),
    )

    user_challenges: Mapped[List["UserChallenge"]] = relationship(
        "UserChallenge", back_populates="challenge", cascade="all, delete-orphan"
    )


class UserChallenge(Base):
    """Progress tracking for a student on a challenge."""

    __tablename__ = "user_challenges"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    challenge_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("challenges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    current_progress: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    is_completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("student_id", "challenge_id", name="uq_user_challenges"),
    )

    student: Mapped["User"] = relationship("User", back_populates="user_challenges")  # type: ignore # noqa: F821
    challenge: Mapped["Challenge"] = relationship("Challenge", back_populates="user_challenges")
