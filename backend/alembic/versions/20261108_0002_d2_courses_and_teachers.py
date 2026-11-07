"""D2: Courses and course_teachers assignment migration.

Revision ID: 20261108_0002
Revises: 20261108_0001
Create Date: 2026-11-08 00:00:02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20261108_0002"
down_revision: Union[str, None] = "20261108_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create courses table
    op.create_table(
        "courses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("creator_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('draft', 'published', 'archived')",
            name="ck_courses_status",
        ),
        sa.ForeignKeyConstraint(["creator_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_courses_status", "courses", ["status"], unique=False)
    op.create_index("ix_courses_creator_id", "courses", ["creator_id"], unique=False)

    # 2. Create course_teachers junction table (DEC-P2-002)
    op.create_table(
        "course_teachers",
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("teacher_id", sa.Uuid(), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["teacher_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("course_id", "teacher_id"),
    )
    op.create_index("ix_course_teachers_teacher_id", "course_teachers", ["teacher_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_course_teachers_teacher_id", table_name="course_teachers")
    op.drop_table("course_teachers")
    op.drop_index("ix_courses_creator_id", table_name="courses")
    op.drop_index("ix_courses_status", table_name="courses")
    op.drop_table("courses")
