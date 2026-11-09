"""D3: Questions, assessments, and assessment_questions migration.

Revision ID: 20261109_0007
Revises: 20261109_0006
Create Date: 2026-11-09 00:00:07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20261109_0007"
down_revision: Union[str, None] = "20261109_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create questions table
    op.create_table(
        "questions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("topic_id", sa.Uuid(), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=True),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("difficulty", sa.String(length=16), nullable=False),
        sa.Column("points", sa.Integer(), server_default="1", nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="approved", nullable=False),
        sa.Column("source", sa.String(length=32), server_default="teacher", nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "payload",
            sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column(
            "answer_key",
            sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "type IN ('multiple_choice', 'true_false', 'fill_blank', 'matching', 'short_answer')",
            name="ck_questions_type",
        ),
        sa.CheckConstraint(
            "difficulty IN ('easy', 'medium', 'hard')",
            name="ck_questions_difficulty",
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'pending_review', 'approved', 'rejected', 'archived')",
            name="ck_questions_status",
        ),
        sa.CheckConstraint(
            "source IN ('teacher', 'ai_generated')",
            name="ck_questions_source",
        ),
        sa.CheckConstraint("points > 0", name="ck_questions_points_positive"),
        sa.CheckConstraint("version >= 1", name="ck_questions_version_positive"),
    )
    op.create_index("ix_questions_course_id", "questions", ["course_id"], unique=False)
    op.create_index("ix_questions_topic_id", "questions", ["topic_id"], unique=False)
    op.create_index("ix_questions_author_id", "questions", ["author_id"], unique=False)
    op.create_index("ix_questions_type", "questions", ["type"], unique=False)
    op.create_index("ix_questions_difficulty", "questions", ["difficulty"], unique=False)
    op.create_index("ix_questions_status", "questions", ["status"], unique=False)

    # 2. Create assessments table
    op.create_table(
        "assessments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("topic_id", sa.Uuid(), nullable=True),
        sa.Column("creator_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("time_limit_minutes", sa.Integer(), nullable=True),
        sa.Column("max_attempts", sa.Integer(), nullable=True),
        sa.Column("passing_score_percent", sa.Integer(), nullable=True),
        sa.Column("schedule_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="draft", nullable=False),
        sa.Column("total_points", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["creator_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "type IN ('diagnostic', 'formative', 'summative', 'adaptive', 'final')",
            name="ck_assessments_type",
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'published', 'scheduled', 'completed', 'archived')",
            name="ck_assessments_status",
        ),
        sa.CheckConstraint(
            "time_limit_minutes IS NULL OR time_limit_minutes > 0",
            name="ck_assessments_time_limit_positive",
        ),
        sa.CheckConstraint(
            "max_attempts IS NULL OR max_attempts > 0",
            name="ck_assessments_max_attempts_positive",
        ),
        sa.CheckConstraint(
            "passing_score_percent IS NULL OR (passing_score_percent >= 0 AND passing_score_percent <= 100)",
            name="ck_assessments_passing_score_range",
        ),
        sa.CheckConstraint("total_points >= 0", name="ck_assessments_total_points_nonnegative"),
    )
    op.create_index("ix_assessments_course_id", "assessments", ["course_id"], unique=False)
    op.create_index("ix_assessments_topic_id", "assessments", ["topic_id"], unique=False)
    op.create_index("ix_assessments_creator_id", "assessments", ["creator_id"], unique=False)
    op.create_index("ix_assessments_type", "assessments", ["type"], unique=False)
    op.create_index("ix_assessments_status", "assessments", ["status"], unique=False)

    # 3. Create assessment_questions junction table
    op.create_table(
        "assessment_questions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("assessment_id", sa.Uuid(), nullable=False),
        sa.Column("question_id", sa.Uuid(), nullable=False),
        sa.Column("order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("points", sa.Integer(), server_default="1", nullable=False),
        sa.Column("question_version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assessment_id", "question_id", name="uq_assessment_questions_assessment_question"),
        sa.CheckConstraint('"order" >= 0', name="ck_assessment_questions_order_nonnegative"),
        sa.CheckConstraint("points > 0", name="ck_assessment_questions_points_positive"),
        sa.CheckConstraint("question_version >= 1", name="ck_assessment_questions_version_positive"),
    )
    op.create_index("ix_assessment_questions_assessment_id", "assessment_questions", ["assessment_id"], unique=False)
    op.create_index("ix_assessment_questions_question_id", "assessment_questions", ["question_id"], unique=False)


def downgrade() -> None:
    op.drop_table("assessment_questions")
    op.drop_table("assessments")
    op.drop_table("questions")
