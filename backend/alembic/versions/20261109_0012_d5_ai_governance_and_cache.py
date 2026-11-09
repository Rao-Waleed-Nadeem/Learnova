"""D5: Add AI question candidates and durable content cache (Phase 9 - AI Integration & Governance).

Revision ID: 20261109_0012
Revises: 20261109_0011
Create Date: 2026-11-09 00:00:12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON

# revision identifiers, used by Alembic.
revision: str = "20261109_0012"
down_revision: Union[str, None] = "20261109_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    json_type = JSON().with_variant(JSONB(), "postgresql")

    # 1. Create ai_question_candidates table
    op.create_table(
        "ai_question_candidates",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
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
            nullable=False,
        ),
        sa.Column(
            "author_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("type", sa.String(32), nullable=False),
        sa.Column("difficulty", sa.String(16), nullable=False),
        sa.Column("points", sa.Integer(), server_default="1", nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("source_context", sa.Text(), nullable=True),
        sa.Column("payload", json_type, nullable=False),
        sa.Column("answer_key", json_type, nullable=False),
        sa.Column("status", sa.String(32), server_default="pending_review", nullable=False),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column(
            "approved_question_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("questions.id", ondelete="SET NULL"),
            nullable=True,
            unique=True,
        ),
        sa.Column("provider", sa.String(64), server_default="gemini", nullable=False),
        sa.Column("model", sa.String(64), server_default="gemini-2.5-flash", nullable=False),
        sa.Column("prompt_version", sa.String(32), server_default="v1", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "type IN ('multiple_choice', 'true_false', 'fill_blank', 'matching', 'short_answer')",
            name="ck_ai_candidates_type",
        ),
        sa.CheckConstraint(
            "difficulty IN ('easy', 'medium', 'hard')",
            name="ck_ai_candidates_difficulty",
        ),
        sa.CheckConstraint(
            "status IN ('pending_review', 'approved', 'rejected')",
            name="ck_ai_candidates_status",
        ),
        sa.CheckConstraint(
            "points > 0",
            name="ck_ai_candidates_points_positive",
        ),
    )

    op.create_index("ix_ai_candidates_course_id", "ai_question_candidates", ["course_id"])
    op.create_index("ix_ai_candidates_topic_id", "ai_question_candidates", ["topic_id"])
    op.create_index("ix_ai_candidates_author_id", "ai_question_candidates", ["author_id"])
    op.create_index("ix_ai_candidates_status", "ai_question_candidates", ["status"])

    # 2. Create ai_content_cache table
    op.create_table(
        "ai_content_cache",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("cache_key", sa.String(255), unique=True, nullable=False),
        sa.Column("content_type", sa.String(64), server_default="lesson_simplification", nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source", sa.String(64), server_default="gemini", nullable=False),
        sa.Column("provider", sa.String(64), server_default="gemini", nullable=False),
        sa.Column("model", sa.String(64), server_default="gemini-2.5-flash", nullable=False),
        sa.Column("prompt_version", sa.String(32), server_default="v1", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index("ix_ai_content_cache_key", "ai_content_cache", ["cache_key"])
    op.create_index("ix_ai_content_cache_expires_at", "ai_content_cache", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_content_cache_expires_at", table_name="ai_content_cache")
    op.drop_index("ix_ai_content_cache_key", table_name="ai_content_cache")
    op.drop_table("ai_content_cache")

    op.drop_index("ix_ai_candidates_status", table_name="ai_question_candidates")
    op.drop_index("ix_ai_candidates_author_id", table_name="ai_question_candidates")
    op.drop_index("ix_ai_candidates_topic_id", table_name="ai_question_candidates")
    op.drop_index("ix_ai_candidates_course_id", table_name="ai_question_candidates")
    op.drop_table("ai_question_candidates")
