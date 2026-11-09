"""D7: Gamification profiles, XP ledger, badges, and challenges migration.

Revision ID: 20261109_0010
Revises: 20261109_0009
Create Date: 2026-11-09 00:00:10
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20261109_0010"
down_revision: Union[str, None] = "20261109_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create gamification_profiles table
    op.create_table(
        "gamification_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("xp", sa.Integer(), server_default="0", nullable=False),
        sa.Column("level", sa.Integer(), server_default="1", nullable=False),
        sa.Column("streak_days", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_active_date", sa.Date(), nullable=True),
        sa.Column("is_opted_in_leaderboard", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", name="uq_gamification_student"),
        sa.CheckConstraint("xp >= 0", name="ck_gamification_xp"),
        sa.CheckConstraint("level >= 1", name="ck_gamification_level"),
        sa.CheckConstraint("streak_days >= 0", name="ck_gamification_streak"),
    )
    op.create_index(
        "ix_gamification_profiles_student",
        "gamification_profiles",
        ["student_id"],
    )
    op.create_index(
        "ix_gamification_profiles_xp",
        "gamification_profiles",
        [sa.text("xp DESC")],
    )

    # 2. Create xp_ledger table
    op.create_table(
        "xp_ledger",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("xp_earned", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("related_id", sa.String(length=255), nullable=True),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key", name="uq_xp_ledger_idempotency"),
        sa.CheckConstraint("xp_earned > 0", name="ck_xp_ledger_earned"),
    )
    op.create_index(
        "ix_xp_ledger_student",
        "xp_ledger",
        ["student_id"],
    )
    op.create_index(
        "ix_xp_ledger_created_at",
        "xp_ledger",
        ["created_at"],
    )

    # 3. Create badges table
    badges_table = op.create_table(
        "badges",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("icon", sa.String(length=64), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("criteria_type", sa.String(length=64), nullable=False),
        sa.Column("criteria_threshold", sa.Numeric(precision=8, scale=2), server_default="1.00", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "category IN ('achievement', 'streak', 'mastery', 'exam')",
            name="ck_badges_category",
        ),
    )

    # 4. Create user_badges table
    op.create_table(
        "user_badges",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("badge_id", sa.String(length=64), nullable=False),
        sa.Column("earned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["badge_id"], ["badges.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "badge_id", name="uq_user_badges"),
    )
    op.create_index(
        "ix_user_badges_student",
        "user_badges",
        ["student_id"],
    )

    # 5. Create challenges table
    challenges_table = op.create_table(
        "challenges",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("xp_reward", sa.Integer(), server_default="100", nullable=False),
        sa.Column("challenge_type", sa.String(length=64), nullable=False),
        sa.Column("target_value", sa.Integer(), server_default="1", nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("xp_reward > 0", name="ck_challenges_reward"),
    )

    # 6. Create user_challenges table
    op.create_table(
        "user_challenges",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("challenge_id", sa.String(length=64), nullable=False),
        sa.Column("current_progress", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_completed", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["challenge_id"], ["challenges.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "challenge_id", name="uq_user_challenges"),
    )
    op.create_index(
        "ix_user_challenges_student",
        "user_challenges",
        ["student_id"],
    )

    # 7. Seed official badges catalog
    op.bulk_insert(
        badges_table,
        [
            {
                "id": "badge-first-step",
                "title": "First Step",
                "description": "Enrolled in a course and completed the first curriculum unit.",
                "icon": "Footprints",
                "category": "achievement",
                "criteria_type": "lesson_count",
                "criteria_threshold": 1.00,
            },
            {
                "id": "badge-diagnostic",
                "title": "Diagnostic Pioneer",
                "description": "Completed initial diagnostic baseline assessment to calibrate mastery.",
                "icon": "Compass",
                "category": "achievement",
                "criteria_type": "diagnostic_count",
                "criteria_threshold": 1.00,
            },
            {
                "id": "badge-syntax-master",
                "title": "Syntax Virtuoso",
                "description": "Achieved 85%+ mastery in Syntax, Variables & Primitive Data Types.",
                "icon": "Code",
                "category": "mastery",
                "criteria_type": "mastery_score",
                "criteria_threshold": 0.85,
            },
            {
                "id": "badge-streak",
                "title": "Streak Sentinel",
                "description": "Maintained a 3-day or greater continuous learning streak.",
                "icon": "Flame",
                "category": "streak",
                "criteria_type": "streak_days",
                "criteria_threshold": 3.00,
            },
            {
                "id": "badge-adaptive-ace",
                "title": "Adaptive Ace",
                "description": "Complete an adaptive practice session with score above 80%.",
                "icon": "Zap",
                "category": "mastery",
                "criteria_type": "practice_score",
                "criteria_threshold": 80.00,
            },
            {
                "id": "badge-exam-scholar",
                "title": "Summative Scholar",
                "description": "Successfully pass a formal final examination and satisfy course completion criteria.",
                "icon": "GraduationCap",
                "category": "exam",
                "criteria_type": "final_exam_passed",
                "criteria_threshold": 1.00,
            },
            {
                "id": "badge-mastery-titan",
                "title": "Mastery Titan",
                "description": "Attain 100% topic mastery across all course syllabus units.",
                "icon": "Crown",
                "category": "mastery",
                "criteria_type": "all_topics_mastered",
                "criteria_threshold": 1.00,
            },
        ],
    )

    # 8. Seed default active challenges
    op.bulk_insert(
        challenges_table,
        [
            {
                "id": "challenge-weekly-streak",
                "title": "Streak Master",
                "description": "Maintain a 3-day continuous learning streak this week.",
                "xp_reward": 150,
                "challenge_type": "streak_target",
                "target_value": 3,
                "is_active": True,
            },
            {
                "id": "challenge-practice-ace",
                "title": "Practice Virtuoso",
                "description": "Complete 2 adaptive practice sessions.",
                "xp_reward": 200,
                "challenge_type": "practice_count",
                "target_value": 2,
                "is_active": True,
            },
            {
                "id": "challenge-curriculum-explorer",
                "title": "Curriculum Explorer",
                "description": "Complete 3 course lessons.",
                "xp_reward": 150,
                "challenge_type": "lesson_count",
                "target_value": 3,
                "is_active": True,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_user_challenges_student", table_name="user_challenges")
    op.drop_table("user_challenges")
    op.drop_table("challenges")
    op.drop_index("ix_user_badges_student", table_name="user_badges")
    op.drop_table("user_badges")
    op.drop_table("badges")
    op.drop_index("ix_xp_ledger_created_at", table_name="xp_ledger")
    op.drop_index("ix_xp_ledger_student", table_name="xp_ledger")
    op.drop_table("xp_ledger")
    op.drop_index("ix_gamification_profiles_xp", table_name="gamification_profiles")
    op.drop_index("ix_gamification_profiles_student", table_name="gamification_profiles")
    op.drop_table("gamification_profiles")
