"""Tests verifying Alembic configuration and disposable database migrations."""

import os
import tempfile
from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, inspect


def test_alembic_disposable_database_lifecycle():
    """Verify Alembic configuration and stamp against a disposable database."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        test_db_path = os.path.join(tmp_dir, "disposable_stamp.db")
        db_url = f"sqlite:///{test_db_path}"

        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)

        engine = create_engine(db_url)

        # Stamp head on disposable database (verifies alembic_version creation)
        command.stamp(alembic_cfg, "head")

        with engine.connect() as conn:
            inspector = inspect(conn)
            assert "alembic_version" in inspector.get_table_names()

        engine.dispose()


def test_alembic_migration_apply_and_rollback():
    """Verify applying a test migration and rolling it back on a disposable database."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        test_db_path = os.path.join(tmp_dir, "test_migration.db")
        db_url = f"sqlite:///{test_db_path}"

        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)

        # Generate a test revision
        rev = command.revision(alembic_cfg, message="test_table_creation")
        rev_file = rev.path

        try:
            # Inject minimal test DDL into the revision file
            with open(rev_file, "r") as f:
                content = f.read()

            content = content.replace(
                "def upgrade() -> None:\n    pass",
                'def upgrade() -> None:\n    op.create_table("disposable_items", sa.Column("id", sa.Integer(), primary_key=True))',
            ).replace(
                "def downgrade() -> None:\n    pass",
                'def downgrade() -> None:\n    op.drop_table("disposable_items")',
            )

            with open(rev_file, "w") as f:
                f.write(content)

            # Upgrade head: applies migration
            command.upgrade(alembic_cfg, "head")

            engine = create_engine(db_url)
            with engine.connect() as conn:
                inspector = inspect(conn)
                assert "disposable_items" in inspector.get_table_names()
                assert "alembic_version" in inspector.get_table_names()

            # Downgrade base: rolls back migration
            command.downgrade(alembic_cfg, "base")

            with engine.connect() as conn:
                inspector = inspect(conn)
                assert "disposable_items" not in inspector.get_table_names()

            engine.dispose()
        finally:
            # Clean up the test revision file so versions/ remains clean
            if os.path.exists(rev_file):
                os.remove(rev_file)
