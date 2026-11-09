"""D4: Assessment attempts, attempt_responses, and domain_outbox_events migration.

Revision ID: 20261109_0008
Revises: 20261109_0007
Create Date: 2026-11-09 00:00:08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20261109_0008"
down_revision: Union[str, None] = "20261109_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create assessment_attempts table
    op.create_table(
        "assessment_attempts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("assessment_id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("enrollment_id", sa.Uuid(), nullable=False),
        sa.Column("attempt_number", sa.Integer(), server_default="1", nullable=False),
        sa.Column("status", sa.String(length=32), server_default="in_progress", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("score", sa.Numeric(precision=7, scale=2), nullable=True),
        sa.Column("max_score", sa.Integer(), server_default="0", nullable=False),
        sa.Column("score_percent", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.Column("current_difficulty", sa.String(length=16), nullable=True),
        sa.Column(
            "snapshot_data",
            sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["enrollment_id"], ["enrollments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assessment_id", "student_id", "attempt_number", name="uq_assessment_attempts_student_attempt"),
        sa.CheckConstraint(
            "status IN ('in_progress', 'submitted', 'graded', 'pending_manual_review', 'expired', 'abandoned')",
            name="ck_assessment_attempts_status",
        ),
        sa.CheckConstraint("attempt_number > 0", name="ck_assessment_attempts_number_positive"),
        sa.CheckConstraint("max_score >= 0", name="ck_assessment_attempts_max_score_nonnegative"),
        sa.CheckConstraint(
            "score_percent IS NULL OR (score_percent >= 0 AND score_percent <= 100)",
            name="ck_assessment_attempts_score_percent_range",
        ),
        sa.CheckConstraint(
            "deadline_at IS NULL OR deadline_at >= started_at",
            name="ck_assessment_attempts_deadline_valid",
        ),
    )
    op.create_index("ix_assessment_attempts_assessment_id", "assessment_attempts", ["assessment_id"], unique=False)
    op.create_index("ix_assessment_attempts_student_id", "assessment_attempts", ["student_id"], unique=False)
    op.create_index("ix_assessment_attempts_enrollment_id", "assessment_attempts", ["enrollment_id"], unique=False)
    op.create_index("ix_assessment_attempts_status", "assessment_attempts", ["status"], unique=False)
    op.create_index("ix_assessment_attempts_deadline_at", "assessment_attempts", ["deadline_at"], unique=False)

    # 2. Create attempt_responses table
    op.create_table(
        "attempt_responses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("attempt_id", sa.Uuid(), nullable=False),
        sa.Column("question_id", sa.Uuid(), nullable=False),
        sa.Column("question_version", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "student_response",
            sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("points_awarded", sa.Numeric(precision=7, scale=2), nullable=True),
        sa.Column("points_possible", sa.Integer(), server_default="1", nullable=False),
        sa.Column("response_time_seconds", sa.Integer(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["assessment_attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("attempt_id", "question_id", name="uq_attempt_responses_attempt_question"),
        sa.CheckConstraint("points_possible > 0", name="ck_attempt_responses_points_possible_positive"),
        sa.CheckConstraint(
            "points_awarded IS NULL OR points_awarded >= 0",
            name="ck_attempt_responses_points_awarded_nonnegative",
        ),
    )
    op.create_index("ix_attempt_responses_attempt_id", "attempt_responses", ["attempt_id"], unique=False)
    op.create_index("ix_attempt_responses_question_id", "attempt_responses", ["question_id"], unique=False)

    # 3. Create domain_outbox_events table
    op.create_table(
        "domain_outbox_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("aggregate_type", sa.String(length=64), nullable=False),
        sa.Column("aggregate_id", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column(
            "payload",
            sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=32), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key", name="uq_domain_outbox_events_idempotency_key"),
        sa.CheckConstraint("status IN ('pending', 'published', 'failed')", name="ck_domain_outbox_events_status"),
    )
    op.create_index("ix_domain_outbox_events_event_type", "domain_outbox_events", ["event_type"], unique=False)
    op.create_index("ix_domain_outbox_events_aggregate_id", "domain_outbox_events", ["aggregate_id"], unique=False)
    op.create_index("ix_domain_outbox_events_idempotency_key", "domain_outbox_events", ["idempotency_key"], unique=True)
    op.create_index("ix_domain_outbox_events_status", "domain_outbox_events", ["status"], unique=False)


def downgrade() -> None:
    op.drop_table("domain_outbox_events")
    op.drop_table("attempt_responses")
    op.drop_table("assessment_attempts")
