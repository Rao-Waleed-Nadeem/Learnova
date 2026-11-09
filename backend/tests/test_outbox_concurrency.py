"""Tests for outbox concurrency, idempotent replay, and exponential backoff retry scheduling."""

import datetime
import uuid
import pytest
from sqlalchemy.orm import Session

from app.models.gamification import GamificationProfile, XPLedger
from app.models.outbox import DomainOutboxEvent
from app.models.role import Role
from app.models.user import User
from app.services.gamification_service import GamificationService


@pytest.fixture
def outbox_test_student(client_with_db, db_session: Session) -> User:
    role = db_session.query(Role).filter_by(name="student").first()
    student = User(
        email=f"concurrency_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Concurrency Student",
        role_id=role.id,
    )
    db_session.add(student)
    db_session.commit()
    return student


def test_idempotent_event_replay_does_not_duplicate_xp(
    outbox_test_student: User, db_session: Session
):
    """P8-C06: Processing the same event multiple times yields exactly one XP ledger record and single XP increment."""
    student = outbox_test_student
    lesson_id = uuid.uuid4()
    idem_key = f"lesson_comp_{student.id}_{lesson_id}"

    event = DomainOutboxEvent(
        event_type="lesson.completed",
        aggregate_type="lesson_progress",
        aggregate_id=str(uuid.uuid4()),
        idempotency_key=idem_key,
        payload={
            "student_id": str(student.id),
            "lesson_id": str(lesson_id),
            "course_id": str(uuid.uuid4()),
        },
        status="pending",
    )
    db_session.add(event)
    db_session.commit()

    # 1. Process first time via dispatcher
    res1 = GamificationService.process_pending_outbox_events(db_session, limit=10)
    assert res1["processed_count"] == 1

    db_session.refresh(event)
    assert event.status == "published"

    profile1 = db_session.query(GamificationProfile).filter_by(student_id=student.id).first()
    assert profile1 is not None
    assert profile1.xp == 50

    ledger_count1 = (
        db_session.query(XPLedger)
        .filter(XPLedger.student_id == student.id, XPLedger.related_id == str(lesson_id))
        .count()
    )
    assert ledger_count1 == 1

    # 2. Simulate replay / duplicate processing (e.g. event reset to pending)
    event.status = "pending"
    event.published_at = None
    db_session.commit()

    res2 = GamificationService.process_pending_outbox_events(db_session, limit=10)
    assert res2["processed_count"] == 1

    # Profile XP and ledger count must NOT have doubled
    db_session.refresh(profile1)
    assert profile1.xp == 50

    ledger_count2 = (
        db_session.query(XPLedger)
        .filter(XPLedger.student_id == student.id, XPLedger.related_id == str(lesson_id))
        .count()
    )
    assert ledger_count2 == 1


def test_exponential_backoff_delays_retry(
    outbox_test_student: User, db_session: Session
):
    """P8-C04: Failed event receives next_attempt_at in the future and is skipped on immediate next poll."""
    student = outbox_test_student

    # Event with bad payload causing handler failure
    event = DomainOutboxEvent(
        event_type="assessment.completed",
        aggregate_type="assessment_attempt",
        aggregate_id=str(uuid.uuid4()),
        idempotency_key=f"fail_backoff_{uuid.uuid4().hex}",
        payload={"student_id": "not-a-valid-uuid"},
        status="pending",
    )
    db_session.add(event)
    db_session.commit()

    now_before = datetime.datetime.now(datetime.timezone.utc)

    # 1. First poll: fails, sets retry_count=1, sets next_attempt_at ~= now + 10s
    res1 = GamificationService.process_pending_outbox_events(db_session, limit=10)
    assert res1["failed_count"] == 1

    db_session.refresh(event)
    assert event.retry_count == 1
    assert event.status == "pending"
    assert event.next_attempt_at is not None

    next_att = event.next_attempt_at
    if next_att.tzinfo is None:
        next_att = next_att.replace(tzinfo=datetime.timezone.utc)
    assert next_att > now_before

    # 2. Immediate second poll: should SKIP this event because next_attempt_at > now
    res2 = GamificationService.process_pending_outbox_events(db_session, limit=10)
    assert res2["processed_count"] == 0
    assert res2["failed_count"] == 0
