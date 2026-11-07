"""Tests for user profile updates, preferences, and password modification."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.session import UserSession
from app.models.user import User


def test_update_profile_details(client_with_db: TestClient) -> None:
    """Updating profile details alters full name, bio, department, and avatar."""
    reg = client_with_db.post(
        "/api/v1/auth/register",
        json={"email": "prof_update@example.com", "password": "Password123!", "full_name": "Old Name"},
    )
    token = reg.json()["access_token"]

    update_payload = {
        "full_name": "Updated Name",
        "bio": "Software engineering student and AI enthusiast.",
        "department": "Computer Science",
        "avatar_url": "https://example.com/avatar.jpg",
    }
    res = client_with_db.put(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json=update_payload,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Updated Name"
    assert data["profile"]["bio"] == "Software engineering student and AI enthusiast."
    assert data["profile"]["department"] == "Computer Science"
    assert data["profile"]["avatar_url"] == "https://example.com/avatar.jpg"


def test_update_preferences(client_with_db: TestClient) -> None:
    """Updating preferences merges JSON keys without losing prior preferences."""
    reg = client_with_db.post(
        "/api/v1/auth/register",
        json={"email": "prefs@example.com", "password": "Password123!", "full_name": "Pref User"},
    )
    token = reg.json()["access_token"]

    res = client_with_db.put(
        "/api/v1/users/me/preferences",
        headers={"Authorization": f"Bearer {token}"},
        json={"preferences": {"font_size": "large", "sound_effects": False}},
    )
    assert res.status_code == 200
    prefs = res.json()["profile"]["preferences"]
    assert prefs["font_size"] == "large"
    assert prefs["sound_effects"] is False
    assert "theme" in prefs  # Preserved from registration


def test_change_password_flow(client_with_db: TestClient, db_session: Session) -> None:
    """Changing password verifies old password, sets new bcrypt hash, and revokes sessions."""
    reg = client_with_db.post(
        "/api/v1/auth/register",
        json={"email": "pwd_flow@example.com", "password": "OriginalPassword123!", "full_name": "Pwd User"},
    )
    token = reg.json()["access_token"]

    # 1. Invalid current password fails
    bad_res = client_with_db.put(
        "/api/v1/users/me/password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "WrongPassword!", "new_password": "BrandNewPassword123!"},
    )
    assert bad_res.status_code == 400
    assert "Current password is incorrect" in bad_res.json()["detail"]

    # 2. Valid current password succeeds
    good_res = client_with_db.put(
        "/api/v1/users/me/password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "OriginalPassword123!", "new_password": "BrandNewPassword123!"},
    )
    assert good_res.status_code == 200

    # 3. Verify in database that sessions were revoked
    user = db_session.query(User).filter(User.email == "pwd_flow@example.com").first()
    assert verify_password("BrandNewPassword123!", user.hashed_password)
    active_sessions = db_session.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_revoked == False,
    ).count()
    assert active_sessions == 0
