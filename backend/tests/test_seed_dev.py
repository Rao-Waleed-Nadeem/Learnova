"""Unit tests for the development database seed CLI."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cli.seed import seed_database
from app.core.config import Settings, settings
from app.models.role import Role


def test_seed_blocked_in_production(db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify that seed_database strictly blocks execution in production."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    with pytest.raises(RuntimeError) as exc_info:
        seed_database(db=db_session)

    assert "forbidden in environment 'production'" in str(exc_info.value)


def test_seed_canonical_roles_in_development(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify that seed_database populates the 3 approved canonical roles."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    seed_database(db=db_session)

    roles = db_session.scalars(select(Role)).all()
    role_names = {r.name for r in roles}

    assert "student" in role_names
    assert "teacher" in role_names
    assert "administrator" in role_names
    assert len(roles) == 3


def test_seed_idempotent_on_rerun(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Verify that rerunning seed_database does not throw duplicate errors or duplicate rows."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    # Run twice
    seed_database(db=db_session)
    seed_database(db=db_session)

    roles = db_session.scalars(select(Role)).all()
    assert len(roles) == 3
