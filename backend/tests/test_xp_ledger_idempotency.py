"""Tests for XP ledger append-only audit, idempotency, and history pagination."""

import uuid
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.gamification import GamificationProfile, XPLedger
from app.models.role import Role
from app.models.user import User
from app.services.gamification_service import GamificationService


@pytest.fixture
def seed_xp_student(client_with_db: TestClient, db_session: Session) -> Dict:
    student_role = db_session.query(Role).filter(Role.name == "student").first()
    student = User(
        email=f"xp_student_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw_dummy",
        full_name="XP Test Student",
        is_active=True,
        role_id=student_role.id,
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    token = create_access_token(str(student.id), role="student")
    return {"student": student, "token": token, "client": client_with_db}


def test_xp_award_idempotency_prevents_double_dipping(
    seed_xp_student: Dict, db_session: Session
):
    """Verify that calling award_xp_idempotent with duplicate idempotency_key does not add XP twice."""
    student = seed_xp_student["student"]
    idempotency_key = f"xp:{student.id}:lesson:unique_lesson_123"

    # First award: +50 XP
    entry1, is_new1 = GamificationService.award_xp_idempotent(
        db_session,
        student_id=student.id,
        event_type="lesson_completed",
        xp_amount=50,
        description="First lesson complete",
        idempotency_key=idempotency_key,
        related_id="lesson_123",
    )
    db_session.commit()

    assert is_new1 is True
    assert entry1.xp_earned == 50

    profile1 = GamificationService.get_or_create_profile(db_session, student.id)
    assert profile1.xp == 50

    # Second award with identical idempotency_key: must be a no-op!
    entry2, is_new2 = GamificationService.award_xp_idempotent(
        db_session,
        student_id=student.id,
        event_type="lesson_completed",
        xp_amount=50,
        description="First lesson complete retry",
        idempotency_key=idempotency_key,
        related_id="lesson_123",
    )
    db_session.commit()

    assert is_new2 is False
    assert entry2.id == entry1.id

    # Profile XP must remain strictly 50
    db_session.expire_all()
    profile2 = GamificationService.get_or_create_profile(db_session, student.id)
    assert profile2.xp == 50

    # Total rows in xp_ledger for this student must be exactly 1
    ledger_count = (
        db_session.query(XPLedger)
        .filter(XPLedger.student_id == student.id)
        .count()
    )
    assert ledger_count == 1


def test_xp_history_pagination_and_ordering(
    seed_xp_student: Dict, db_session: Session
):
    """Verify GET /api/v1/gamification/xp-history returns chronological paginated ledger."""
    client: TestClient = seed_xp_student["client"]
    token = seed_xp_student["token"]
    student = seed_xp_student["student"]

    # Seed 5 distinct XP events
    for i in range(5):
        GamificationService.award_xp_idempotent(
            db_session,
            student_id=student.id,
            event_type="lesson_completed",
            xp_amount=50,
            description=f"Completed lesson {i + 1}",
            idempotency_key=f"xp:{student.id}:lesson:batch_{i}_{uuid.uuid4().hex}",
            related_id=f"lesson_{i}",
        )
    db_session.commit()

    # Query page 1 with page_size=3
    resp = client.get(
        "/api/v1/gamification/xp-history?page=1&page_size=3",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5
    assert len(data["items"]) == 3
    assert data["page"] == 1
    assert data["page_size"] == 3

    # Query page 2 with page_size=3
    resp2 = client.get(
        "/api/v1/gamification/xp-history?page=2&page_size=3",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert len(data2["items"]) == 2
