"""TopicPrerequisite junction entity model for Learnova D2 Prerequisite DAG."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.topic import Topic


class TopicPrerequisite(Base):
    """Explicit directed edge representing a prerequisite dependency between topics."""

    __tablename__ = "topic_prerequisites"

    __table_args__ = (
        CheckConstraint(
            "topic_id <> prerequisite_topic_id",
            name="ck_topic_prerequisites_no_self_edge",
        ),
    )

    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        primary_key=True,
    )
    prerequisite_topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    topic: Mapped["Topic"] = relationship(
        "Topic",
        foreign_keys=[topic_id],
        back_populates="prerequisite_edges",
    )
    prerequisite_topic: Mapped["Topic"] = relationship(
        "Topic",
        foreign_keys=[prerequisite_topic_id],
        back_populates="dependent_edges",
    )

    def __repr__(self) -> str:
        return f"<TopicPrerequisite topic_id={self.topic_id} -> prerequisite_topic_id={self.prerequisite_topic_id}>"
