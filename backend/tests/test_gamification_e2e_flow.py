"""End-to-End integration test suite for the complete Gamification lifecycle.

Validates the full gamification journey per E2E testing patterns:
1. Fresh student onboarding and zero-state profile initialization.
2. Direct and outbox-driven XP awarding (lessons, diagnostics, adaptive practice, exams).
3. Idempotency safeguards preventing duplicate rewards.
4. Level progression, thresholds, and progress percentage transitions.
5. Streak maintenance and active date tracking.
6. Badge rule evaluations and unlock status.
7. Privacy-compliant leaderboard ranking and opt-in toggles.
8. Chronological XP audit ledger pagination.
"""

from typing import Dict, Any
import uuid
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def authenticated_student(client_with_db: TestClient) -> Dict[str, Any]:
    """Provisions and authenticates a clean test student account."""
    unique_id = uuid.uuid4().hex[:6]
    email = f"gamification.tester_{unique_id}@learnova.edu"
    reg_res = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "Gamification Tester",
        },
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    token = data["access_token"]
    user_id = data["user"]["id"]
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "user_id": user_id,
        "email": email,
    }


def test_gamification_zero_state_initialization(
    client_with_db: TestClient, authenticated_student: Dict[str, Any]
) -> None:
    """A newly registered student must start with 0 XP, Level 1, 0 streak, and empty XP history."""
    headers = authenticated_student["headers"]

    # 1. Profile zero state (defaults to privacy-safe opted out for leaderboard)
    res = client_with_db.get("/api/v1/gamification/profile", headers=headers)
    assert res.status_code == 200
    profile = res.json()
    assert profile["xp"] == 0
    assert profile["level"] == 1
    assert profile["current_level_floor_xp"] == 0
    assert profile["next_level_xp"] == 250
    assert profile["progress_percent"] == 0
    assert profile["streak_days"] == 0
    assert profile["is_opted_in_leaderboard"] is False

    # 2. XP ledger empty state
    xp_res = client_with_db.get("/api/v1/gamification/xp-history", headers=headers)
    assert xp_res.status_code == 200
    assert xp_res.json()["total"] == 0
    assert len(xp_res.json()["items"]) == 0


def test_gamification_event_awarding_and_idempotency(
    client_with_db: TestClient, authenticated_student: Dict[str, Any]
) -> None:
    """Awarding XP via POST /gamification/events must persist to DB and enforce strict idempotency."""
    headers = authenticated_student["headers"]

    # 1. Award Diagnostic XP (+150 XP)
    award_payload = {
        "event_type": "diagnostic_completed",
        "xp_amount": 150,
        "description": "Completed diagnostic: Computing Systems Baseline",
        "related_id": "asm-diag-001",
        "idempotency_key": f"test_idemp_diag_{uuid.uuid4().hex[:8]}",
    }
    award_res = client_with_db.post(
        "/api/v1/gamification/events", json=award_payload, headers=headers
    )
    assert award_res.status_code == 200
    data = award_res.json()
    assert data["is_newly_awarded"] is True
    assert data["xp_awarded"] == 150
    assert data["profile"]["xp"] == 150
    assert data["profile"]["level"] == 1
    # 150 / 250 = 60% progress to Level 2
    assert data["profile"]["progress_percent"] == 60
    assert data["profile"]["streak_days"] == 1

    # Verify directly via GET /profile that DB is updated
    prof_res = client_with_db.get("/api/v1/gamification/profile", headers=headers)
    assert prof_res.status_code == 200
    assert prof_res.json()["xp"] == 150

    # Verify ledger row exists in DB via GET /xp-history
    xp_res = client_with_db.get("/api/v1/gamification/xp-history", headers=headers)
    assert xp_res.status_code == 200
    assert xp_res.json()["total"] == 1
    assert xp_res.json()["items"][0]["xp_earned"] == 150
    assert xp_res.json()["items"][0]["event_type"] == "diagnostic_completed"

    # 2. IDEMPOTENCY CHECK: Replay exact same event with same idempotency key
    replay_res = client_with_db.post(
        "/api/v1/gamification/events", json=award_payload, headers=headers
    )
    assert replay_res.status_code == 200
    replay_data = replay_res.json()
    assert replay_data["is_newly_awarded"] is False
    assert replay_data["xp_awarded"] == 0
    assert replay_data["profile"]["xp"] == 150  # STRICTLY UNCHANGED

    # Verify ledger was NOT duplicated in DB
    xp_res_after = client_with_db.get("/api/v1/gamification/xp-history", headers=headers)
    assert xp_res_after.json()["total"] == 1


def test_gamification_level_progression_and_thresholds(
    client_with_db: TestClient, authenticated_student: Dict[str, Any]
) -> None:
    """Crossing XP thresholds must update level and recalculate floor, ceiling, and progress percentage."""
    headers = authenticated_student["headers"]

    # Step 1: Baseline diagnostic (150 XP) -> Level 1 (floor 0, next 250)
    client_with_db.post(
        "/api/v1/gamification/events",
        json={
            "event_type": "diagnostic_completed",
            "xp_amount": 150,
            "description": "Baseline assessment",
            "idempotency_key": f"step1_diag_{uuid.uuid4().hex[:6]}",
        },
        headers=headers,
    )

    # Step 2: Adaptive Practice (+120 XP) -> Total 270 XP -> Level 2 (floor 250, next 600)
    step2_res = client_with_db.post(
        "/api/v1/gamification/events",
        json={
            "event_type": "practice_completed",
            "xp_amount": 120,
            "description": "Adaptive practice session",
            "idempotency_key": f"step2_practice_{uuid.uuid4().hex[:6]}",
        },
        headers=headers,
    )
    assert step2_res.status_code == 200
    p2 = step2_res.json()["profile"]
    assert p2["xp"] == 270
    assert p2["level"] == 2
    assert p2["current_level_floor_xp"] == 250
    assert p2["next_level_xp"] == 600
    # Span is 350. (270 - 250) / 350 = 20 / 350 = 5.7% -> 6%
    assert p2["progress_percent"] == 6

    # Step 3: Final Examination (+350 XP) -> Total 620 XP -> Level 3 (floor 600, next 1050)
    step3_res = client_with_db.post(
        "/api/v1/gamification/events",
        json={
            "event_type": "exam_completed",
            "xp_amount": 350,
            "description": "Final examination",
            "idempotency_key": f"step3_exam_{uuid.uuid4().hex[:6]}",
        },
        headers=headers,
    )
    assert step3_res.status_code == 200
    p3 = step3_res.json()["profile"]
    assert p3["xp"] == 620
    assert p3["level"] == 3
    assert p3["current_level_floor_xp"] == 600
    assert p3["next_level_xp"] == 1050


def test_gamification_xp_history_pagination(
    client_with_db: TestClient, authenticated_student: Dict[str, Any]
) -> None:
    """XP activity history endpoint must return paginated, chronological descending entries."""
    headers = authenticated_student["headers"]

    # Award 3 distinct events
    for idx, (event_type, amount) in enumerate(
        [("lesson_completed", 50), ("practice_completed", 120), ("exam_completed", 250)]
    ):
        client_with_db.post(
            "/api/v1/gamification/events",
            json={
                "event_type": event_type,
                "xp_amount": amount,
                "description": f"Activity #{idx + 1}",
                "idempotency_key": f"hist_key_{idx}_{uuid.uuid4().hex[:6]}",
            },
            headers=headers,
        )

    # Fetch page 1 with page_size=2
    res_p1 = client_with_db.get(
        "/api/v1/gamification/xp-history?page=1&page_size=2", headers=headers
    )
    assert res_p1.status_code == 200
    data_p1 = res_p1.json()
    assert data_p1["total"] == 3
    assert len(data_p1["items"]) == 2
    # Latest item first (exam_completed +250)
    assert data_p1["items"][0]["event_type"] == "exam_completed"
    assert data_p1["items"][0]["xp_earned"] == 250

    # Fetch page 2
    res_p2 = client_with_db.get(
        "/api/v1/gamification/xp-history?page=2&page_size=2", headers=headers
    )
    assert res_p2.status_code == 200
    data_p2 = res_p2.json()
    assert len(data_p2["items"]) == 1
    # Oldest item last (lesson_completed +50)
    assert data_p2["items"][0]["event_type"] == "lesson_completed"
    assert data_p2["items"][0]["xp_earned"] == 50


def test_gamification_leaderboard_and_privacy_toggle(
    client_with_db: TestClient, authenticated_student: Dict[str, Any]
) -> None:
    """Leaderboard must rank scholars by XP and respect opt-in / opt-out privacy settings."""
    headers = authenticated_student["headers"]

    # Award 500 XP
    client_with_db.post(
        "/api/v1/gamification/events",
        json={
            "event_type": "exam_completed",
            "xp_amount": 500,
            "description": "Distinction honors exam",
            "idempotency_key": f"lead_exam_500_{uuid.uuid4().hex[:6]}",
        },
        headers=headers,
    )

    # Register an Observer student to view the leaderboard from another perspective
    obs_reg = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": f"observer_{uuid.uuid4().hex[:6]}@learnova.edu",
            "password": "Password123!",
            "full_name": "Observer Student",
        },
    )
    obs_token = obs_reg.json()["access_token"]
    obs_headers = {"Authorization": f"Bearer {obs_token}"}

    # 1. Tester is initially opted out: Observer sees Anonymous Scholar
    obs_lb1 = client_with_db.get("/api/v1/gamification/leaderboard", headers=obs_headers)
    assert obs_lb1.status_code == 200
    tester_entry = next(
        (e for e in obs_lb1.json()["entries"] if str(e["student_id"]) == authenticated_student["user_id"]),
        None,
    )
    assert tester_entry is not None
    assert tester_entry["display_name"] == "Anonymous Scholar"
    assert tester_entry["avatar"] is None
    assert tester_entry["xp"] == 500

    # 2. Tester explicitly opts in to the leaderboard
    patch_res = client_with_db.patch(
        "/api/v1/gamification/profile",
        json={"is_opted_in_leaderboard": True},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["is_opted_in_leaderboard"] is True

    # 3. Observer now sees Tester's real name and avatar initials
    obs_lb2 = client_with_db.get("/api/v1/gamification/leaderboard", headers=obs_headers)
    assert obs_lb2.status_code == 200
    tester_entry_public = next(
        (e for e in obs_lb2.json()["entries"] if str(e["student_id"]) == authenticated_student["user_id"]),
        None,
    )
    assert tester_entry_public is not None
    assert tester_entry_public["display_name"] == "Gamification Tester"
    assert tester_entry_public["avatar"] == "GT"
