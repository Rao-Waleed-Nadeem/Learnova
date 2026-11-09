"""Durable transactional domain outbox event model for Learnova asynchronous event integration."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import CheckConstraint, DateTime, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base


class DomainOutboxEvent(Base):
    """Durable domain outbox event enabling transactional integration with asynchronous subsystems."""

    __tablename__ = "domain_outbox_events"

    __table_args__ = (
        UniqueConstraint(
            "idempotency_key",
            name="uq_domain_outbox_events_idempotency_key",
        ),
        CheckConstraint(
            "status IN ('pending', 'published', 'failed')",
            name="ck_domain_outbox_events_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    event_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    aggregate_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    aggregate_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    idempotency_key: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )
    payload: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"),
        default=dict,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        default="pending",
        nullable=False,
        index=True,
    )
    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )
    last_error: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    next_attempt_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<DomainOutboxEvent id={self.id} event_type={self.event_type} aggregate_id={self.aggregate_id} status={self.status}>"
