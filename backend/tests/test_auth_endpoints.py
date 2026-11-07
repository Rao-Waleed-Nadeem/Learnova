"""Unit and integration tests for authentication endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.role import Role
from app.models.session import UserSession
from app.models.user import User


def test_register_student_success(client_with_db: TestClient, db_session: Session) -> None:
    """Public registration must create a student account, issue access token, and set refresh cookie."""
    payload = {
        "email": "newstudent@example.com",
        "password": "Password123!",
        "full_name": "New Student",
    }
    response = client_with_db.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newstudent@example.com"
    assert data["user"]["full_name"] == "New Student"
    assert data["user"]["role"] == "student"
    assert data["user"]["is_active"] is True
    assert data["user"]["profile"] is not None

    # Check refresh token cookie was set
    assert "learnova_refresh_token" in response.cookies
    cookie = response.cookies["learnova_refresh_token"]
    assert len(cookie) > 20

    # Verify session row was created in database
    session_row = db_session.query(UserSession).first()
    assert session_row is not None
    assert session_row.is_revoked is False


def test_register_role_escalation_blocked(client_with_db: TestClient) -> None:
    """Passing a role like administrator in registration payload must not escalate privileges."""
    payload = {
        "email": "hacker@example.com",
        "password": "Password123!",
        "full_name": "Hacker",
        "role": "administrator",
    }
    response = client_with_db.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    # Role must strictly remain student
    assert data["user"]["role"] == "student"


def test_register_duplicate_email_fails(client_with_db: TestClient) -> None:
    """Registering with an already existing email must return 409 Conflict."""
    payload = {
        "email": "duplicate@example.com",
        "password": "Password123!",
        "full_name": "First User",
    }
    res1 = client_with_db.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client_with_db.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_login_success(client_with_db: TestClient, db_session: Session) -> None:
    """Login with valid credentials returns 200, access token, user info, and cookie."""
    # Seed user
    role = db_session.query(Role).filter(Role.name == "teacher").first()
    user = User(
        email="teacher@example.com",
        hashed_password=hash_password("TeacherPass123!"),
        full_name="Teacher One",
        role_id=role.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    response = client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "teacher@example.com", "password": "TeacherPass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "teacher@example.com"
    assert data["user"]["role"] == "teacher"
    assert "learnova_refresh_token" in response.cookies


def test_login_invalid_password(client_with_db: TestClient, db_session: Session) -> None:
    """Login with invalid password must return 401."""
    role = db_session.query(Role).filter(Role.name == "student").first()
    user = User(
        email="student@example.com",
        hashed_password=hash_password("ValidPassword123!"),
        full_name="Student",
        role_id=role.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    response = client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_login_deactivated_account_forbidden(client_with_db: TestClient, db_session: Session) -> None:
    """Deactivated accounts must receive 403 Forbidden on login."""
    role = db_session.query(Role).filter(Role.name == "student").first()
    user = User(
        email="inactive@example.com",
        hashed_password=hash_password("ValidPassword123!"),
        full_name="Inactive User",
        role_id=role.id,
        is_active=False,
    )
    db_session.add(user)
    db_session.commit()

    response = client_with_db.post(
        "/api/v1/auth/login",
        json={"email": "inactive@example.com", "password": "ValidPassword123!"},
    )
    assert response.status_code == 403
    assert "deactivated" in response.json()["detail"]


def test_refresh_token_rotation(client_with_db: TestClient) -> None:
    """Token refresh rotates the refresh token and returns a fresh access token."""
    # 1. Register to obtain initial cookie
    reg_res = client_with_db.post(
        "/api/v1/auth/register",
        json={"email": "rotator@example.com", "password": "Password123!", "full_name": "Rotator"},
    )
    assert reg_res.status_code == 201
    initial_cookie = reg_res.cookies["learnova_refresh_token"]

    # 2. Call refresh
    client_with_db.cookies.set("learnova_refresh_token", initial_cookie)
    refresh_res = client_with_db.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 200

    new_data = refresh_res.json()
    assert "access_token" in new_data
    assert "learnova_refresh_token" in refresh_res.cookies
    rotated_cookie = refresh_res.cookies["learnova_refresh_token"]
    # Rotated cookie must be distinct from initial cookie
    assert rotated_cookie != initial_cookie

    # 3. Old cookie must now be revoked and rejected
    client_with_db.cookies.set("learnova_refresh_token", initial_cookie)
    retry_old = client_with_db.post("/api/v1/auth/refresh")
    assert retry_old.status_code == 401


def test_logout_revokes_session(client_with_db: TestClient) -> None:
    """Logout invalidates the session and deletes the refresh cookie."""
    # Register
    reg_res = client_with_db.post(
        "/api/v1/auth/register",
        json={"email": "logoutuser@example.com", "password": "Password123!", "full_name": "Logout User"},
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    cookie = reg_res.cookies["learnova_refresh_token"]

    # Logout
    client_with_db.cookies.set("learnova_refresh_token", cookie)
    logout_res = client_with_db.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_res.status_code == 200

    # Refresh with logged-out cookie must fail
    refresh_res = client_with_db.post("/api/v1/auth/refresh")
    assert refresh_res.status_code == 401


def test_get_me_profile(client_with_db: TestClient) -> None:
    """GET /me returns user and profile data for authenticated caller."""
    reg_res = client_with_db.post(
        "/api/v1/auth/register",
        json={"email": "meprofile@example.com", "password": "Password123!", "full_name": "Profile Owner"},
    )
    token = reg_res.json()["access_token"]

    me_res = client_with_db.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "meprofile@example.com"
    assert me_data["full_name"] == "Profile Owner"
    assert me_data["role"] == "student"


def test_get_me_unauthenticated(client_with_db: TestClient) -> None:
    """GET /me without authorization header must return 401."""
    res = client_with_db.get("/api/v1/auth/me")
    assert res.status_code == 401
