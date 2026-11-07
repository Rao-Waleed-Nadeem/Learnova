"""SecurityAuditEvent entity model for Learnova Phase 3 (Authentication & RBAC)."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, Optional

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class SecurityAuditEvent(Base):
    """Structured security audit log entity."""

    __tablename__ = "security_audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    actor_email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    actor_role: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    target_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    target_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    outcome: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    correlation_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )
    reason: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB(), "postgresql"),
        nullable=True,
        default=dict,
    )
    ip_address_safe: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Relationships
    actor: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="audit_events",
    )

    def __repr__(self) -> str:
        return f"<SecurityAuditEvent id={self.id} action={self.action} outcome={self.outcome}>"
