"""D4: Enrollments, lesson_completions, and resource_activities migration.

Revision ID: 20261109_0006
Revises: 20261108_0005
Create Date: 2026-11-09 00:00:06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20261109_0006"
down_revision: Union[str, None] = "20261108_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create enrollments table
    op.create_table(
        "enrollments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="active", nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "course_id", name="uq_enrollments_student_course"),
        sa.CheckConstraint(
            "status IN ('active', 'completed', 'dropped')",
            name="ck_enrollments_status",
        ),
    )
    op.create_index("ix_enrollments_student_id", "enrollments", ["student_id"], unique=False)
    op.create_index("ix_enrollments_course_id", "enrollments", ["course_id"], unique=False)
    op.create_index("ix_enrollments_status", "enrollments", ["status"], unique=False)

    # 2. Create lesson_completions table
    op.create_table(
        "lesson_completions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("enrollment_id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("topic_id", sa.Uuid(), nullable=False),
        sa.Column("lesson_id", sa.Uuid(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["enrollment_id"], ["enrollments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "lesson_id", name="uq_lesson_completions_student_lesson"),
        sa.UniqueConstraint("enrollment_id", "lesson_id", name="uq_lesson_completions_enrollment_lesson"),
    )
    op.create_index("ix_lesson_completions_enrollment_id", "lesson_completions", ["enrollment_id"], unique=False)
    op.create_index("ix_lesson_completions_student_id", "lesson_completions", ["student_id"], unique=False)
    op.create_index("ix_lesson_completions_course_id", "lesson_completions", ["course_id"], unique=False)
    op.create_index("ix_lesson_completions_topic_id", "lesson_completions", ["topic_id"], unique=False)
    op.create_index("ix_lesson_completions_lesson_id", "lesson_completions", ["lesson_id"], unique=False)

    # 3. Create resource_activities table
    op.create_table(
        "resource_activities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("enrollment_id", sa.Uuid(), nullable=True),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("resource_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(length=32), server_default="view", nullable=False),
        sa.Column("duration_seconds", sa.Integer(), server_default="0", nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["enrollment_id"], ["enrollments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resource_id"], ["learning_resources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "event_type IN ('view', 'read', 'watch', 'complete')",
            name="ck_resource_activities_event_type",
        ),
        sa.CheckConstraint(
            "duration_seconds >= 0",
            name="ck_resource_activities_duration",
        ),
    )
    op.create_index("ix_resource_activities_enrollment_id", "resource_activities", ["enrollment_id"], unique=False)
    op.create_index("ix_resource_activities_student_id", "resource_activities", ["student_id"], unique=False)
    op.create_index("ix_resource_activities_resource_id", "resource_activities", ["resource_id"], unique=False)


def downgrade() -> None:
    op.drop_table("resource_activities")
    op.drop_table("lesson_completions")
    op.drop_table("enrollments")
