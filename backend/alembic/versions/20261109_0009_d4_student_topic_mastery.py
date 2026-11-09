"""D4: Student topic mastery and mastery audit ledger migration.

Revision ID: 20261109_0009
Revises: 20261109_0008
Create Date: 2026-11-09 00:00:09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20261109_0009"
down_revision: Union[str, None] = "20261109_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create student_topic_mastery table
    op.create_table(
        "student_topic_mastery",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("topic_id", sa.Uuid(), nullable=False),
        sa.Column("mastery_score", sa.Numeric(precision=5, scale=4), server_default="0.0000", nullable=False),
        sa.Column("score_percent", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(length=32), server_default="not_assessed", nullable=False),
        sa.Column("bkt_probability", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("attempts_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_attempt_id", sa.Uuid(), nullable=True),
        sa.Column("last_assessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["last_attempt_id"], ["assessment_attempts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "topic_id", name="uq_student_topic_mastery"),
        sa.CheckConstraint(
            "mastery_score >= 0.0000 AND mastery_score <= 1.0000",
            name="ck_student_topic_mastery_score",
        ),
        sa.CheckConstraint(
            "score_percent >= 0 AND score_percent <= 100",
            name="ck_student_topic_mastery_percent",
        ),
        sa.CheckConstraint(
            "status IN ('not_assessed', 'developing', 'competent', 'mastered')",
            name="ck_student_topic_mastery_status",
        ),
        sa.CheckConstraint(
            "attempts_count >= 0",
            name="ck_student_topic_mastery_attempts_nonnegative",
        ),
    )
    op.create_index(
        "ix_student_topic_mastery_student_course",
        "student_topic_mastery",
        ["student_id", "course_id"],
    )
    op.create_index(
        "ix_student_topic_mastery_topic",
        "student_topic_mastery",
        ["topic_id"],
    )

    # 2. Create mastery_audit_ledger table
    op.create_table(
        "mastery_audit_ledger",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("topic_id", sa.Uuid(), nullable=False),
        sa.Column("attempt_id", sa.Uuid(), nullable=False),
        sa.Column("previous_score", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("new_score", sa.Numeric(precision=5, scale=4), nullable=False),
        sa.Column("previous_status", sa.String(length=32), nullable=True),
        sa.Column("new_status", sa.String(length=32), nullable=False),
        sa.Column("assessment_type", sa.String(length=32), nullable=False),
        sa.Column("algorithm_used", sa.String(length=64), server_default="BKT_HYBRID_V1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["attempt_id"], ["assessment_attempts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "new_score >= 0.0000 AND new_score <= 1.0000",
            name="ck_mastery_ledger_new_score",
        ),
    )
    op.create_index(
        "ix_mastery_audit_ledger_student_topic",
        "mastery_audit_ledger",
        ["student_id", "topic_id"],
    )
    op.create_index(
        "ix_mastery_audit_ledger_attempt",
        "mastery_audit_ledger",
        ["attempt_id"],
    )


def downgrade() -> None:
    op.drop_table("mastery_audit_ledger")
    op.drop_table("student_topic_mastery")
