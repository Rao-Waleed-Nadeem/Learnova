"""Integration test verifying Alembic migrations on an isolated disposable PostgreSQL database.

Guarantees 100% isolation from the persistent application database.
"""

import os
import uuid
import pytest
from alembic import command
from alembic.config import Config
import sqlalchemy as sa
from sqlalchemy import create_engine, text

from app.core.config import settings


@pytest.fixture
def disposable_pg_database():
    """Create a completely isolated disposable PostgreSQL database for migration testing."""
    disposable_db_name = f"test_disposable_{uuid.uuid4().hex[:10]}"

    # Safety assertion: never target persistent database
    assert disposable_db_name != settings.POSTGRES_DB, "Disposable DB must not match persistent DB!"

    # Maintenance connection to create/drop the disposable test DB
    maintenance_url = settings.sync_database_url
    engine = create_engine(maintenance_url)

    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(f'CREATE DATABASE "{disposable_db_name}"'))

    disposable_url = maintenance_url.rsplit("/", 1)[0] + f"/{disposable_db_name}"

    try:
        yield disposable_url, disposable_db_name
    finally:
        # Terminate any remaining connections to the disposable database
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            conn.execute(
                text(
                    f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                    f"WHERE datname = '{disposable_db_name}' AND pid <> pg_backend_pid()"
                )
            )
            conn.execute(text(f'DROP DATABASE IF EXISTS "{disposable_db_name}"'))
        engine.dispose()


def test_alembic_migrations_lifecycle_on_disposable_postgres(
    disposable_pg_database,
) -> None:
    """Verify upgrade -> inspect -> downgrade -> upgrade lifecycle on real PostgreSQL."""
    disposable_url, db_name = disposable_pg_database

    # Verify that the disposable DB starts completely empty
    disposable_engine = create_engine(disposable_url)
    with disposable_engine.connect() as conn:
        initial_tables = sa.inspect(conn).get_table_names()
        assert len(initial_tables) == 0, f"Expected empty database, found {initial_tables}"

    # Prepare Alembic config pointing to disposable DB
    alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    alembic_cfg.set_main_option(
        "script_location", os.path.join(os.path.dirname(__file__), "..", "alembic")
    )
    alembic_cfg.set_main_option("sqlalchemy.url", disposable_url)

    # 1. Upgrade from empty to head
    command.upgrade(alembic_cfg, "head")

    # 2. Inspect created tables
    with disposable_engine.connect() as conn:
        insp = sa.inspect(conn)
        tables = set(insp.get_table_names())
        expected_tables = {
            "alembic_version",
            "roles",
            "users",
            "user_profiles",
            "courses",
            "course_teachers",
            "topics",
            "topic_prerequisites",
            "lessons",
            "learning_resources",
            "sessions",
            "security_audit_events",
        }
        assert expected_tables.issubset(tables), f"Missing tables: {expected_tables - tables}"

        # Verify bulk-inserted canonical roles in disposable DB
        role_rows = conn.execute(text("SELECT name FROM roles ORDER BY name")).fetchall()
        role_names = [r[0] for r in role_rows]
        assert role_names == ["administrator", "student", "teacher"]

        # Verify self-edge check constraint on topic_prerequisites
        topic_id = uuid.uuid4()
        with pytest.raises(Exception):
            conn.execute(
                text(
                    f"INSERT INTO topic_prerequisites (topic_id, prerequisite_topic_id, created_at) "
                    f"VALUES ('{topic_id}', '{topic_id}', NOW())"
                )
            )

    # 3. Safe downgrade one revision (20261108_0005 -> 20261108_0004)
    command.downgrade(alembic_cfg, "-1")

    with disposable_engine.connect() as conn:
        insp = sa.inspect(conn)
        tables_after_downgrade = set(insp.get_table_names())
        # sessions and security_audit_events should be removed
        assert "sessions" not in tables_after_downgrade
        assert "security_audit_events" not in tables_after_downgrade
        # earlier tables should still remain
        assert "learning_resources" in tables_after_downgrade
        assert "lessons" in tables_after_downgrade
        assert "topics" in tables_after_downgrade
        assert "courses" in tables_after_downgrade
        assert "users" in tables_after_downgrade

    # 4. Upgrade back to head
    command.upgrade(alembic_cfg, "head")

    with disposable_engine.connect() as conn:
        insp = sa.inspect(conn)
        restored_tables = set(insp.get_table_names())
        assert expected_tables.issubset(restored_tables)

    # 5. Confirm repeated upgrade at head is a clean no-op
    command.upgrade(alembic_cfg, "head")

    disposable_engine.dispose()
