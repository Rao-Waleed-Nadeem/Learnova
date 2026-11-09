"""Tests for academic leaderboard ranking, privacy opt-out masking, and challenges."""

import uuid
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.gamification import Challenge, GamificationProfile, UserChallenge
from app.models.role import Role
from app.models.user import User
from app.services.gamification_service import GamificationService


@pytest.fixture
def seed_leaderboard_students(client_with_db: TestClient, db_session: Session) -> Dict:
    student_role = db_session.query(Role).filter(Role.name == "student").first()

    # Student 1: Alice, 1200 XP, opted in
    s1 = User(
        email=f"alice_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Alice Walker",
        is_active=True,
        role_id=student_role.id,
    )
    # Student 2: Bob, 900 XP, opted OUT
    s2 = User(
        email=f"bob_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Bob Privacy",
        is_active=True,
        role_id=student_role.id,
    )
    # Student 3: Charlie, 500 XP, opted in
    s3 = User(
        email=f"charlie_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Charlie Day",
        is_active=True,
        role_id=student_role.id,
    )
    db_session.add_all([s1, s2, s3])
    db_session.commit()

    # Profiles
    p1 = GamificationProfile(student_id=s1.id, xp=1200, level=4, is_opted_in_leaderboard=True)
    p2 = GamificationProfile(student_id=s2.id, xp=900, level=3, is_opted_in_leaderboard=False)
    p3 = GamificationProfile(student_id=s3.id, xp=500, level=2, is_opted_in_leaderboard=True)
    db_session.add_all([p1, p2, p3])
    db_session.commit()

    token_charlie = create_access_token(str(s3.id), role="student")
    token_bob = create_access_token(str(s2.id), role="student")

    return {
        "s1": s1,
        "s2": s2,
        "s3": s3,
        "token_charlie": token_charlie,
        "token_bob": token_bob,
        "client": client_with_db,
    }


def test_leaderboard_ordering_and_privacy_masking(
    seed_leaderboard_students: Dict, db_session: Session
):
    """Verify leaderboard sorts by XP descending and masks Bob's name when viewed by Charlie."""
    client: TestClient = seed_leaderboard_students["client"]
    token_charlie = seed_leaderboard_students["token_charlie"]
    s1 = seed_leaderboard_students["s1"]
    s2 = seed_leaderboard_students["s2"]
    s3 = seed_leaderboard_students["s3"]

    # Charlie views leaderboard
    resp = client.get(
        "/api/v1/gamification/leaderboard",
        headers={"Authorization": f"Bearer {token_charlie}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    entries = data["entries"]
    # Check that rank 1 is Alice (1200 XP), rank 2 is Bob (900 XP), rank 3 is Charlie (500 XP)
    alice_entry = next(e for e in entries if e["student_id"] == str(s1.id))
    bob_entry = next(e for e in entries if e["student_id"] == str(s2.id))
    charlie_entry = next(e for e in entries if e["student_id"] == str(s3.id))

    assert alice_entry["rank"] < bob_entry["rank"] < charlie_entry["rank"]

    # Alice is opted in -> display name visible
    assert alice_entry["display_name"] == "Alice Walker"

    # Bob is opted OUT -> display name masked as "Anonymous Scholar" to Charlie!
    assert bob_entry["display_name"] == "Anonymous Scholar"
    assert bob_entry["avatar"] is None
    assert bob_entry["is_current_user"] is False

    # Charlie sees his own entry marked is_current_user = True
    assert charlie_entry["is_current_user"] is True
    assert charlie_entry["display_name"] == "Charlie Day"


def test_leaderboard_self_view_for_opted_out_user(
    seed_leaderboard_students: Dict, db_session: Session
):
    """Verify that when Bob (opted out) views the leaderboard, he sees his own actual name."""
    client: TestClient = seed_leaderboard_students["client"]
    token_bob = seed_leaderboard_students["token_bob"]
    s2 = seed_leaderboard_students["s2"]

    resp = client.get(
        "/api/v1/gamification/leaderboard",
        headers={"Authorization": f"Bearer {token_bob}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    bob_entry = next(e for e in data["entries"] if e["student_id"] == str(s2.id))
    # For Bob viewing himself: is_current_user is True, so his name is NOT masked to himself
    assert bob_entry["is_current_user"] is True
    assert bob_entry["display_name"] == "Bob Privacy"


def test_challenges_progress_and_completion(
    seed_leaderboard_students: Dict, db_session: Session
):
    """Verify challenge tracking and completion awards bonus XP."""
    client: TestClient = seed_leaderboard_students["client"]
    token_charlie = seed_leaderboard_students["token_charlie"]
    s3 = seed_leaderboard_students["s3"]

    # Ensure challenge exists
    ch = db_session.query(Challenge).filter_by(id="challenge-curriculum-explorer").first()
    if not ch:
        ch = Challenge(
            id="challenge-curriculum-explorer",
            title="Curriculum Explorer",
            description="Complete 3 lessons",
            xp_reward=150,
            challenge_type="lesson_count",
            target_value=3,
            is_active=True,
        )
        db_session.add(ch)
        db_session.commit()

    # Initial challenge query
    resp = client.get(
        "/api/v1/gamification/challenges",
        headers={"Authorization": f"Bearer {token_charlie}"},
    )
    assert resp.status_code == 200
    challenges = resp.json()["items"]
    explorer_ch = next(c for c in challenges if c["id"] == "challenge-curriculum-explorer")
    assert explorer_ch["current_progress"] == 0
    assert explorer_ch["is_completed"] is False

    # Simulate progress: increment lesson_count by 3
    GamificationService.evaluate_challenges(db_session, student_id=s3.id, challenge_type="lesson_count", increment=3)
    db_session.commit()

    # Re-query
    resp2 = client.get(
        "/api/v1/gamification/challenges",
        headers={"Authorization": f"Bearer {token_charlie}"},
    )
    assert resp2.status_code == 200
    updated_explorer = next(c for c in resp2.json()["items"] if c["id"] == "challenge-curriculum-explorer")
    assert updated_explorer["current_progress"] >= 3
    assert updated_explorer["is_completed"] is True
    assert updated_explorer["completed_at"] is not None


def test_new_profile_defaults_to_opted_out_affirmative_consent(
    client_with_db: TestClient, db_session: Session
):
    """P8-C11 / DEC-P8-007: Newly created student profile defaults to is_opted_in_leaderboard=False."""
    student_role = db_session.query(Role).filter(Role.name == "student").first()
    new_student = User(
        email=f"privacy_default_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Dave Privacy",
        is_active=True,
        role_id=student_role.id,
    )
    db_session.add(new_student)
    db_session.commit()

    # 1. Via GamificationService.get_or_create_profile
    profile = GamificationService.get_or_create_profile(db_session, new_student.id)
    assert profile.is_opted_in_leaderboard is False

    # 2. Via GET /api/v1/gamification/profile API
    token = create_access_token(str(new_student.id), role="student")
    resp = client_with_db.get(
        "/api/v1/gamification/profile",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["is_opted_in_leaderboard"] is False


def test_student_can_toggle_leaderboard_opt_in(
    seed_leaderboard_students: Dict, db_session: Session
):
    """P8-C10 / DEC-P8-007: Student can explicitly grant affirmative consent and revoke it via PATCH /profile."""
    client: TestClient = seed_leaderboard_students["client"]
    token_bob = seed_leaderboard_students["token_bob"]
    token_charlie = seed_leaderboard_students["token_charlie"]
    s2 = seed_leaderboard_students["s2"]

    # Bob initially opted out: Charlie sees Anonymous Scholar
    resp1 = client.get(
        "/api/v1/gamification/leaderboard",
        headers={"Authorization": f"Bearer {token_charlie}"},
    )
    bob_entry1 = next(e for e in resp1.json()["entries"] if e["student_id"] == str(s2.id))
    assert bob_entry1["display_name"] == "Anonymous Scholar"

    # Bob grants affirmative consent to be on leaderboard
    patch_res1 = client.patch(
        "/api/v1/gamification/profile",
        json={"is_opted_in_leaderboard": True},
        headers={"Authorization": f"Bearer {token_bob}"},
    )
    assert patch_res1.status_code == 200
    assert patch_res1.json()["is_opted_in_leaderboard"] is True

    # Charlie now sees Bob's real name
    resp2 = client.get(
        "/api/v1/gamification/leaderboard",
        headers={"Authorization": f"Bearer {token_charlie}"},
    )
    bob_entry2 = next(e for e in resp2.json()["entries"] if e["student_id"] == str(s2.id))
    assert bob_entry2["display_name"] == "Bob Privacy"

    # Bob revokes consent (opts out again)
    patch_res2 = client.patch(
        "/api/v1/gamification/profile",
        json={"is_opted_in_leaderboard": False},
        headers={"Authorization": f"Bearer {token_bob}"},
    )
    assert patch_res2.status_code == 200
    assert patch_res2.json()["is_opted_in_leaderboard"] is False

    # Charlie sees Anonymous Scholar again
    resp3 = client.get(
        "/api/v1/gamification/leaderboard",
        headers={"Authorization": f"Bearer {token_charlie}"},
    )
    bob_entry3 = next(e for e in resp3.json()["entries"] if e["student_id"] == str(s2.id))
    assert bob_entry3["display_name"] == "Anonymous Scholar"

