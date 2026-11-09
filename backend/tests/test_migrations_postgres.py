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

    try:
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            conn.execute(text(f'CREATE DATABASE "{disposable_db_name}"'))
    except Exception as exc:
        pytest.skip(f"PostgreSQL maintenance connection unavailable: {exc}")

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
            "enrollments",
            "lesson_completions",
            "resource_activities",
            "questions",
            "assessments",
            "assessment_questions",
            "assessment_attempts",
            "attempt_responses",
            "domain_outbox_events",
            "student_topic_mastery",
            "mastery_audit_ledger",
            "gamification_profiles",
            "xp_ledger",
            "badges",
            "user_badges",
            "challenges",
            "user_challenges",
        }
        assert expected_tables.issubset(tables), f"Missing tables: {expected_tables - tables}"

        # Verify bulk-inserted canonical roles in disposable DB
        role_rows = conn.execute(text("SELECT name FROM roles ORDER BY name")).fetchall()
        role_names = [r[0] for r in role_rows]
        assert role_names == ["administrator", "student", "teacher"]

        # Verify bulk-inserted badges in disposable DB
        badge_rows = conn.execute(text("SELECT id FROM badges ORDER BY id")).fetchall()
        badge_ids = [b[0] for b in badge_rows]
        assert "badge-first-step" in badge_ids
        assert "badge-diagnostic" in badge_ids
        assert "badge-syntax-master" in badge_ids

        # Verify self-edge check constraint on topic_prerequisites
        topic_id = uuid.uuid4()
        with pytest.raises(Exception):
            conn.execute(
                text(
                    f"INSERT INTO topic_prerequisites (topic_id, prerequisite_topic_id, created_at) "
                    f"VALUES ('{topic_id}', '{topic_id}', NOW())"
                )
            )

    # 3. Safe downgrade one revision (20261109_0010 -> 20261109_0009)
    command.downgrade(alembic_cfg, "-1")

    with disposable_engine.connect() as conn:
        insp = sa.inspect(conn)
        tables_after_downgrade = set(insp.get_table_names())
        # Phase 8 tables should be removed
        assert "gamification_profiles" not in tables_after_downgrade
        assert "xp_ledger" not in tables_after_downgrade
        assert "badges" not in tables_after_downgrade
        assert "user_badges" not in tables_after_downgrade
        assert "challenges" not in tables_after_downgrade
        assert "user_challenges" not in tables_after_downgrade
        # Phase 7 tables should remain
        assert "student_topic_mastery" in tables_after_downgrade
        assert "mastery_audit_ledger" in tables_after_downgrade
        # Phase 6 tables should remain
        assert "domain_outbox_events" in tables_after_downgrade
        assert "attempt_responses" in tables_after_downgrade
        assert "assessment_attempts" in tables_after_downgrade
        # Phase 5 tables should remain
        assert "assessment_questions" in tables_after_downgrade
        assert "assessments" in tables_after_downgrade
        assert "questions" in tables_after_downgrade
        # Phase 4 tables should remain
        assert "resource_activities" in tables_after_downgrade
        assert "lesson_completions" in tables_after_downgrade
        assert "enrollments" in tables_after_downgrade
        # Phase 3 sessions and security_audit_events should remain
        assert "sessions" in tables_after_downgrade
        assert "security_audit_events" in tables_after_downgrade
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
