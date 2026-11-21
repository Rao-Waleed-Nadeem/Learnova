"""D5: Add AI persistent sessions and session messages for AGY multi-turn interaction.

Revision ID: 20261113_0013
Revises: 20261109_0012
Create Date: 2026-11-13 11:25:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON

# revision identifiers, used by Alembic.
revision: str = "20261113_0013"
down_revision: Union[str, None] = "20261109_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    json_type = JSON().with_variant(JSONB(), "postgresql")

    # 1. Create ai_sessions table
    op.create_table(
        "ai_sessions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("session_type", sa.String(32), nullable=False),
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "course_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "topic_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("topics.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "lesson_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("lessons.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("agy_conversation_id", sa.String(128), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("context_snapshot", json_type, nullable=False, server_default="{}"),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "session_type IN ('question_generation', 'lesson_tutoring')",
            name="ck_ai_sessions_type",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'archived')",
            name="ck_ai_sessions_status",
        ),
    )
    op.create_index("ix_ai_sessions_user_id", "ai_sessions", ["user_id"])
    op.create_index("ix_ai_sessions_course_id", "ai_sessions", ["course_id"])
    op.create_index("ix_ai_sessions_topic_id", "ai_sessions", ["topic_id"])
    op.create_index("ix_ai_sessions_lesson_id", "ai_sessions", ["lesson_id"])
    op.create_index("ix_ai_sessions_agy_conv_id", "ai_sessions", ["agy_conversation_id"])

    # 2. Create ai_session_messages table
    op.create_table(
        "ai_session_messages",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("ai_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sender", sa.String(32), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("attachments", json_type, nullable=False, server_default="[]"),
        sa.Column("raw_metadata", json_type, nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "sender IN ('user', 'agent', 'system')",
            name="ck_ai_session_messages_sender",
        ),
    )
    op.create_index("ix_ai_session_messages_session_id", "ai_session_messages", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_session_messages_session_id", table_name="ai_session_messages")
    op.drop_table("ai_session_messages")

    op.drop_index("ix_ai_sessions_agy_conv_id", table_name="ai_sessions")
    op.drop_index("ix_ai_sessions_lesson_id", table_name="ai_sessions")
    op.drop_index("ix_ai_sessions_topic_id", table_name="ai_sessions")
    op.drop_index("ix_ai_sessions_course_id", table_name="ai_sessions")
    op.drop_index("ix_ai_sessions_user_id", table_name="ai_sessions")
    op.drop_table("ai_sessions")
