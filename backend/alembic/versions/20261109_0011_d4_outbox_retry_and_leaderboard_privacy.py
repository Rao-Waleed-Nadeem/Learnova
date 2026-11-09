"""D4: Add retry metadata to domain_outbox_events and enforce explicit leaderboard opt-in.

Revision ID: 20261109_0011
Revises: 20261109_0010
Create Date: 2026-11-09 00:00:11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20261109_0011"
down_revision: Union[str, None] = "20261109_0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add retry metadata columns and scanning index to domain_outbox_events (P8-FIX-03)
    with op.batch_alter_table("domain_outbox_events") as batch_op:
        batch_op.add_column(
            sa.Column("retry_count", sa.Integer(), server_default="0", nullable=False)
        )
        batch_op.add_column(
            sa.Column("last_error", sa.Text(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.create_index(
            "ix_domain_outbox_events_status_created",
            ["status", "created_at"],
            unique=False,
        )

    # 2. Update gamification_profiles leaderboard privacy default to false (P8-FIX-05)
    with op.batch_alter_table("gamification_profiles") as batch_op:
        batch_op.alter_column(
            "is_opted_in_leaderboard",
            server_default=sa.false(),
        )

    # Safe data migration: update existing profiles to un-opted until explicit affirmative consent
    op.execute(
        "UPDATE gamification_profiles SET is_opted_in_leaderboard = false WHERE is_opted_in_leaderboard IS NULL OR is_opted_in_leaderboard = true"
    )


def downgrade() -> None:
    # 1. Revert leaderboard privacy server default on gamification_profiles
    with op.batch_alter_table("gamification_profiles") as batch_op:
        batch_op.alter_column(
            "is_opted_in_leaderboard",
            server_default=sa.true(),
        )

    # 2. Remove retry metadata columns and scanning index from domain_outbox_events
    with op.batch_alter_table("domain_outbox_events") as batch_op:
        batch_op.drop_index("ix_domain_outbox_events_status_created")
        batch_op.drop_column("next_attempt_at")
        batch_op.drop_column("last_error")
        batch_op.drop_column("retry_count")
