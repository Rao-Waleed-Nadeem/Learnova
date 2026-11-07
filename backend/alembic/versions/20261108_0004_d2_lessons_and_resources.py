"""D2: Lessons and learning_resources metadata migration.

Revision ID: 20261108_0004
Revises: 20261108_0003
Create Date: 2026-11-08 00:00:04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20261108_0004"
down_revision: Union[str, None] = "20261108_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create lessons table
    op.create_table(
        "lessons",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("topic_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            '"order" >= 0',
            name="ck_lessons_order",
        ),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lessons_topic_id", "lessons", ["topic_id"], unique=False)
    op.create_index("ix_lessons_topic_order", "lessons", ["topic_id", "order"], unique=False)

    # 2. Create learning_resources table (DEC-P2-004)
    op.create_table(
        "learning_resources",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("lesson_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("content_or_url", sa.Text(), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "type IN ('document', 'video', 'markdown', 'code', 'link')",
            name="ck_learning_resources_type",
        ),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_learning_resources_lesson_id", "learning_resources", ["lesson_id"], unique=False)
    op.create_index("ix_learning_resources_type", "learning_resources", ["type"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_learning_resources_type", table_name="learning_resources")
    op.drop_index("ix_learning_resources_lesson_id", table_name="learning_resources")
    op.drop_table("learning_resources")
    op.drop_index("ix_lessons_topic_order", table_name="lessons")
    op.drop_index("ix_lessons_topic_id", table_name="lessons")
    op.drop_table("lessons")
