"""Tests for administrator guardrails (anti-lockout, self-demotion, self-deactivation)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.role import Role
from app.models.user import User


def test_admin_self_demotion_blocked(client_with_db: TestClient, db_session: Session) -> None:
    """Administrators must be forbidden from demoting themselves."""
    admin_role = db_session.query(Role).filter(Role.name == "administrator").first()
    admin = User(
        email="root_admin@example.com",
        hashed_password=hash_password("RootAdmin123!"),
        full_name="Root Admin",
        role_id=admin_role.id,
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()

    token = create_access_token(subject=str(admin.id), role="administrator")

    response = client_with_db.put(
        f"/api/v1/admin/users/{admin.id}/role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "student"},
    )
    assert response.status_code == 400
    assert "cannot change their own role" in response.json()["detail"]


def test_admin_self_deactivation_blocked(client_with_db: TestClient, db_session: Session) -> None:
    """Administrators must be forbidden from deactivating themselves."""
    admin_role = db_session.query(Role).filter(Role.name == "administrator").first()
    admin = User(
        email="root_admin2@example.com",
        hashed_password=hash_password("RootAdmin123!"),
        full_name="Root Admin",
        role_id=admin_role.id,
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()

    token = create_access_token(subject=str(admin.id), role="administrator")

    response = client_with_db.put(
        f"/api/v1/admin/users/{admin.id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": False},
    )
    assert response.status_code == 400
    assert "cannot deactivate their own account" in response.json()["detail"]


def test_demote_last_admin_blocked(client_with_db: TestClient, db_session: Session) -> None:
    """If there is only one active administrator, demoting them is strictly blocked."""
    admin_role = db_session.query(Role).filter(Role.name == "administrator").first()
    solo_admin = User(
        email="solo_admin@example.com",
        hashed_password=hash_password("AdminPass123!"),
        full_name="Solo Admin",
        role_id=admin_role.id,
        is_active=True,
    )
    db_session.add(solo_admin)
    db_session.commit()

    token = create_access_token(subject=str(solo_admin.id), role="administrator")

    # Attempting to demote solo_admin fails
    res = client_with_db.put(
        f"/api/v1/admin/users/{solo_admin.id}/role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "teacher"},
    )
    assert res.status_code == 400


def test_deactivate_last_admin_blocked(client_with_db: TestClient, db_session: Session) -> None:
    """If there is only one active administrator, deactivation is strictly blocked."""
    admin_role = db_session.query(Role).filter(Role.name == "administrator").first()
    solo_admin = User(
        email="solo_admin_deact@example.com",
        hashed_password=hash_password("AdminPass123!"),
        full_name="Solo Admin",
        role_id=admin_role.id,
        is_active=True,
    )
    db_session.add(solo_admin)
    db_session.commit()

    token = create_access_token(subject=str(solo_admin.id), role="administrator")

    res = client_with_db.put(
        f"/api/v1/admin/users/{solo_admin.id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": False},
    )
    assert res.status_code == 400


def test_admin_mutation_succeeds_when_multiple_admins_exist(
    client_with_db: TestClient, db_session: Session
) -> None:
    """When more than one active administrator exists, modifying another administrator succeeds."""
    admin_role = db_session.query(Role).filter(Role.name == "administrator").first()
    admin1 = User(
        email="admin_one@example.com",
        hashed_password=hash_password("Pass1!"),
        full_name="Admin One",
        role_id=admin_role.id,
        is_active=True,
    )
    admin2 = User(
        email="admin_two@example.com",
        hashed_password=hash_password("Pass2!"),
        full_name="Admin Two",
        role_id=admin_role.id,
        is_active=True,
    )
    db_session.add_all([admin1, admin2])
    db_session.commit()

    token1 = create_access_token(subject=str(admin1.id), role="administrator")

    # Admin 1 demotes Admin 2 to teacher
    res = client_with_db.put(
        f"/api/v1/admin/users/{admin2.id}/role",
        headers={"Authorization": f"Bearer {token1}"},
        json={"role": "teacher"},
    )
    assert res.status_code == 200
    assert res.json()["role"] == "teacher"
