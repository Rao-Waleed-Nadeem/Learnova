"""Tests for Gamification profile, level progression arithmetic, and streak engine."""

import uuid
from datetime import date, timedelta
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.gamification import GamificationProfile
from app.models.role import Role
from app.models.user import User
from app.services.gamification_service import GamificationService


@pytest.fixture
def seed_gamification_student(client_with_db: TestClient, db_session: Session) -> Dict:
    student_role = db_session.query(Role).filter(Role.name == "student").first()
    student = User(
        email=f"gamify_student_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw_dummy",
        full_name="Gamify Student",
        is_active=True,
        role_id=student_role.id,
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    token = create_access_token(str(student.id), role="student")
    return {"student": student, "token": token, "client": client_with_db}


def test_level_progression_arithmetic():
    """Verify level progression arithmetic matches frontend/src/utils/studentLogic.ts exactly."""
    # Level 1: 0 - 250 XP
    lvl0 = GamificationService.calculate_level(0)
    assert lvl0["level"] == 1
    assert lvl0["current_level_floor_xp"] == 0
    assert lvl0["next_level_xp"] == 250
    assert lvl0["progress_percent"] == 0

    lvl125 = GamificationService.calculate_level(125)
    assert lvl125["level"] == 1
    assert lvl125["current_level_floor_xp"] == 0
    assert lvl125["next_level_xp"] == 250
    assert lvl125["progress_percent"] == 50

    # Level 2 starts at 250 (span 350 -> next 600)
    lvl250 = GamificationService.calculate_level(250)
    assert lvl250["level"] == 2
    assert lvl250["current_level_floor_xp"] == 250
    assert lvl250["next_level_xp"] == 600
    assert lvl250["progress_percent"] == 0

    lvl425 = GamificationService.calculate_level(425)
    assert lvl425["level"] == 2
    assert lvl425["progress_percent"] == 50

    # Level 3 starts at 600 (span 450 -> next 1050)
    lvl600 = GamificationService.calculate_level(600)
    assert lvl600["level"] == 3
    assert lvl600["current_level_floor_xp"] == 600
    assert lvl600["next_level_xp"] == 1050
    assert lvl600["progress_percent"] == 0

    # Level 4 starts at 1050 (span 550 -> next 1600)
    lvl1200 = GamificationService.calculate_level(1200)
    assert lvl1200["level"] == 4
    assert lvl1200["current_level_floor_xp"] == 1050
    assert lvl1200["next_level_xp"] == 1600


def test_streak_engine_progression_and_reset(
    seed_gamification_student: Dict, db_session: Session
):
    """Verify streak increments on consecutive days, stays same on same day, and resets on gap."""
    student = seed_gamification_student["student"]
    profile = GamificationService.get_or_create_profile(db_session, student.id)
    assert profile.streak_days == 0
    assert profile.last_active_date is None

    # Day 1: First activity
    d1 = date(2026, 11, 1)
    res1 = GamificationService.update_streak(db_session, profile, activity_date=d1)
    assert res1 is True
    assert profile.streak_days == 1
    assert profile.last_active_date == d1

    # Same day activity -> streak unchanged
    res_same = GamificationService.update_streak(db_session, profile, activity_date=d1)
    assert res_same is False
    assert profile.streak_days == 1

    # Day 2: Consecutive day -> streak increments to 2
    d2 = date(2026, 11, 2)
    res2 = GamificationService.update_streak(db_session, profile, activity_date=d2)
    assert res2 is True
    assert profile.streak_days == 2
    assert profile.last_active_date == d2

    # Day 3: Consecutive day -> streak increments to 3
    d3 = date(2026, 11, 3)
    res3 = GamificationService.update_streak(db_session, profile, activity_date=d3)
    assert res3 is True
    assert profile.streak_days == 3

    # Day 6: Inactivity gap (skipped Nov 4 and Nov 5) -> resets to 1
    d6 = date(2026, 11, 6)
    res6 = GamificationService.update_streak(db_session, profile, activity_date=d6)
    assert res6 is True
    assert profile.streak_days == 1
    assert profile.last_active_date == d6


def test_gamification_profile_endpoints(
    seed_gamification_student: Dict, db_session: Session
):
    """Verify GET and PATCH /api/v1/gamification/profile."""
    client: TestClient = seed_gamification_student["client"]
    token = seed_gamification_student["token"]
    student = seed_gamification_student["student"]

    # Award some initial XP
    GamificationService.award_xp_idempotent(
        db_session,
        student_id=student.id,
        event_type="lesson_completed",
        xp_amount=125,
        description="Lesson XP",
        idempotency_key=f"xp_test_{uuid.uuid4().hex}",
    )
    db_session.commit()

    # GET profile
    resp = client.get(
        "/api/v1/gamification/profile",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["student_id"] == str(student.id)
    assert data["xp"] == 125
    assert data["level"] == 1
    assert data["progress_percent"] == 50
    assert data["next_level_xp"] == 250
    assert data["is_opted_in_leaderboard"] is False

    # PATCH profile (toggle leaderboard opt-in to True)
    patch_resp = client.patch(
        "/api/v1/gamification/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_opted_in_leaderboard": True},
    )
    assert patch_resp.status_code == 200
    patch_data = patch_resp.json()
    assert patch_data["is_opted_in_leaderboard"] is True

    # Confirm persisted
    db_session.expire_all()
    prof = db_session.query(GamificationProfile).filter_by(student_id=student.id).one()
    assert prof.is_opted_in_leaderboard is True
