"""D2: Topics and topic_prerequisites DAG edge migration.

Revision ID: 20261108_0003
Revises: 20261108_0002
Create Date: 2026-11-08 00:00:03
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20261108_0003"
down_revision: Union[str, None] = "20261108_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create topics table
    op.create_table(
        "topics",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mastery_threshold", sa.Numeric(precision=5, scale=4), nullable=False, server_default="0.7500"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            '"order" >= 0',
            name="ck_topics_order",
        ),
        sa.CheckConstraint(
            "mastery_threshold >= 0.0000 AND mastery_threshold <= 1.0000",
            name="ck_topics_mastery_threshold",
        ),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_topics_course_id", "topics", ["course_id"], unique=False)
    op.create_index("ix_topics_course_order", "topics", ["course_id", "order"], unique=False)

    # 2. Create topic_prerequisites junction table with self-edge check constraint
    op.create_table(
        "topic_prerequisites",
        sa.Column("topic_id", sa.Uuid(), nullable=False),
        sa.Column("prerequisite_topic_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "topic_id <> prerequisite_topic_id",
            name="ck_topic_prerequisites_no_self_edge",
        ),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["prerequisite_topic_id"], ["topics.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("topic_id", "prerequisite_topic_id"),
    )
    op.create_index("ix_topic_prerequisites_prereq_id", "topic_prerequisites", ["prerequisite_topic_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_topic_prerequisites_prereq_id", table_name="topic_prerequisites")
    op.drop_table("topic_prerequisites")
    op.drop_index("ix_topics_course_order", table_name="topics")
    op.drop_index("ix_topics_course_id", table_name="topics")
    op.drop_table("topics")
