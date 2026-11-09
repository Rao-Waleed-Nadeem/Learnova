"""Tests for Gamification outbox event consumer, retry backoff, and event dispatcher."""

import uuid
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.gamification import GamificationProfile, XPLedger
from app.models.outbox import DomainOutboxEvent
from app.models.role import Role
from app.models.user import User
from app.services.gamification_service import GamificationService


@pytest.fixture
def seed_outbox_context(client_with_db: TestClient, db_session: Session) -> Dict:
    student_role = db_session.query(Role).filter(Role.name == "student").first()
    admin_role = db_session.query(Role).filter(Role.name == "administrator").first()

    student = User(
        email=f"outbox_student_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Outbox Student",
        is_active=True,
        role_id=student_role.id,
    )
    admin = User(
        email=f"outbox_admin_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Outbox Admin",
        is_active=True,
        role_id=admin_role.id,
    )
    db_session.add_all([student, admin])
    db_session.commit()
    db_session.refresh(student)
    db_session.refresh(admin)

    student_token = create_access_token(str(student.id), role="student")
    admin_token = create_access_token(str(admin.id), role="administrator")
    return {
        "student": student,
        "admin": admin,
        "token": student_token,
        "admin_token": admin_token,
        "client": client_with_db,
    }


def test_outbox_assessment_completed_processing(
    seed_outbox_context: Dict, db_session: Session
):
    """Verify processing an assessment.completed outbox event awards proper XP and updates streak."""
    student = seed_outbox_context["student"]
    attempt_id = uuid.uuid4()

    # Create pending outbox event for adaptive practice
    event = DomainOutboxEvent(
        event_type="assessment.completed",
        aggregate_type="assessment_attempt",
        aggregate_id=str(attempt_id),
        idempotency_key=f"outbox_asm_{attempt_id}",
        payload={
            "attempt_id": str(attempt_id),
            "student_id": str(student.id),
            "assessment_id": str(uuid.uuid4()),
            "assessment_type": "adaptive",
            "score_percent": 85.0,
            "is_passed": True,
        },
        status="pending",
    )
    db_session.add(event)
    db_session.commit()

    # Run single event processor
    success = GamificationService.process_outbox_event(db_session, event)
    db_session.commit()

    assert success is True

    # Verify XP ledger entry (+120 XP for adaptive practice)
    ledger = (
        db_session.query(XPLedger)
        .filter(XPLedger.student_id == student.id, XPLedger.related_id == str(attempt_id))
        .first()
    )
    assert ledger is not None
    assert ledger.xp_earned == 120

    # Verify student profile XP is 120 and streak is 1
    profile = GamificationService.get_or_create_profile(db_session, student.id)
    assert profile.xp >= 120
    assert profile.streak_days == 1


def test_outbox_lesson_completed_processing(
    seed_outbox_context: Dict, db_session: Session
):
    """Verify processing a lesson.completed outbox event awards 50 XP."""
    student = seed_outbox_context["student"]
    lesson_id = uuid.uuid4()

    event = DomainOutboxEvent(
        event_type="lesson.completed",
        aggregate_type="lesson_completion",
        aggregate_id=str(uuid.uuid4()),
        idempotency_key=f"outbox_lesson_{lesson_id}",
        payload={
            "student_id": str(student.id),
            "lesson_id": str(lesson_id),
            "lesson_title": "Unit 1: Functions",
        },
        status="pending",
    )
    db_session.add(event)
    db_session.commit()

    success = GamificationService.process_outbox_event(db_session, event)
    db_session.commit()

    assert success is True

    ledger = (
        db_session.query(XPLedger)
        .filter(XPLedger.student_id == student.id, XPLedger.related_id == str(lesson_id))
        .first()
    )
    assert ledger is not None
    assert ledger.xp_earned == 50


def test_outbox_dispatcher_batch_drain_and_retry(
    seed_outbox_context: Dict, db_session: Session
):
    """Verify process_pending_outbox_events processes pending events and updates status to published."""
    client: TestClient = seed_outbox_context["client"]
    admin_token = seed_outbox_context["admin_token"]
    student = seed_outbox_context["student"]

    # Create 2 pending events
    ev1 = DomainOutboxEvent(
        event_type="resource.reviewed",
        aggregate_type="resource_activity",
        aggregate_id=str(uuid.uuid4()),
        idempotency_key=f"outbox_res_{uuid.uuid4().hex}",
        payload={
            "student_id": str(student.id),
            "resource_id": str(uuid.uuid4()),
            "resource_title": "Physics Cheatsheet",
        },
        status="pending",
    )
    ev2 = DomainOutboxEvent(
        event_type="resource.reviewed",
        aggregate_type="resource_activity",
        aggregate_id=str(uuid.uuid4()),
        idempotency_key=f"outbox_res_{uuid.uuid4().hex}",
        payload={
            "student_id": str(student.id),
            "resource_id": str(uuid.uuid4()),
            "resource_title": "Code Snippet Reference",
        },
        status="pending",
    )
    db_session.add_all([ev1, ev2])
    db_session.commit()

    # Call POST /api/v1/gamification/process-events endpoint with admin token
    resp = client.post(
        "/api/v1/gamification/process-events?limit=50",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["processed_count"] >= 2
    assert data["failed_count"] == 0

    # Verify both events transitioned to 'published'
    db_session.expire_all()
    assert db_session.get(DomainOutboxEvent, ev1.id).status == "published"
    assert db_session.get(DomainOutboxEvent, ev2.id).status == "published"


def test_student_invoking_worker_endpoint_is_denied(seed_outbox_context: Dict):
    """P8-C09: Student invoking POST /gamification/process-events is rejected with 403 Forbidden."""
    client: TestClient = seed_outbox_context["client"]
    student_token = seed_outbox_context["token"]

    resp = client.post(
        "/api/v1/gamification/process-events?limit=50",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert resp.status_code == 403
    assert "Operation not permitted" in resp.json()["detail"] or "Forbidden" in resp.json()["detail"]


def test_worker_persists_retry_metadata_and_dead_letters(
    seed_outbox_context: Dict, db_session: Session
):
    """P8-C03, P8-C07: Handler exceptions persist retry_count, last_error, and dead-letter at retry limit."""
    student = seed_outbox_context["student"]

    # Create event with payload that causes processing error (invalid student UUID format)
    malformed_event = DomainOutboxEvent(
        event_type="assessment.completed",
        aggregate_type="assessment_attempt",
        aggregate_id=str(uuid.uuid4()),
        idempotency_key=f"outbox_err_{uuid.uuid4().hex}",
        payload={"student_id": "invalid-uuid-value", "assessment_type": "quiz"},
        status="pending",
    )
    db_session.add(malformed_event)
    db_session.commit()

    # 1. Process batch: should fail gracefully, record retry_count=1, last_error, and remain pending
    res1 = GamificationService.process_pending_outbox_events(db_session, limit=10)
    assert res1["failed_count"] >= 1

    db_session.refresh(malformed_event)
    assert malformed_event.status == "pending"
    assert malformed_event.retry_count == 1
    assert malformed_event.last_error is not None
    assert malformed_event.next_attempt_at is not None

    # 2. Advance retry_count to 4 and trigger next retry
    malformed_event.retry_count = 4
    malformed_event.next_attempt_at = None
    db_session.commit()

    res2 = GamificationService.process_pending_outbox_events(db_session, limit=10)
    assert res2["failed_count"] >= 1

    # 3. Verify event is dead-lettered to 'failed' at 5 retries
    db_session.refresh(malformed_event)
    assert malformed_event.status == "failed"
    assert malformed_event.retry_count == 5
