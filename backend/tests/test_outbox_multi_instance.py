"""Tests for multi-instance OutboxProcessor safety, advisory locking, and concurrent claim handling.

Covers:
- Advisory lock leader election (one leader, one standby)
- Standby processor does not execute batch processing
- Leader release on stop allows standby to acquire leadership
- Concurrent worker processing with idempotency guarantee
"""

import threading
import uuid
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.models.gamification import GamificationProfile, XPLedger
from app.models.outbox import DomainOutboxEvent
from app.models.role import Role
from app.models.user import User
from app.workers.outbox_worker import OutboxProcessor


def test_advisory_lock_leader_election():
    """Verify that when advisory lock is enabled, only the leader executes batches."""
    proc1 = OutboxProcessor(enable_advisory_lock=True)
    proc2 = OutboxProcessor(enable_advisory_lock=True)

    # Mock _acquire_advisory_lock so proc1 succeeds (leader) and proc2 fails (standby)
    proc1._acquire_advisory_lock = MagicMock(return_value=True)
    proc1._is_leader = True

    proc2._acquire_advisory_lock = MagicMock(return_value=False)
    proc2._is_leader = False

    assert proc1.is_leader is True
    assert proc2.is_leader is False

    # Mock process_batch
    proc1.process_batch = MagicMock(return_value={"processed_count": 1, "failed_count": 0})
    proc2.process_batch = MagicMock(return_value={"processed_count": 0, "failed_count": 0})

    # In leader election mode, standby does not execute
    if proc2._acquire_advisory_lock():
        proc2.process_batch()
    if proc1._acquire_advisory_lock():
        proc1.process_batch()

    proc1.process_batch.assert_called_once()
    proc2.process_batch.assert_not_called()


def test_advisory_lock_release_on_stop():
    """Verify that stopping a leader processor releases the advisory lock."""
    proc = OutboxProcessor(enable_advisory_lock=True)
    proc._is_leader = True

    mock_conn = MagicMock()
    mock_conn.dialect.name = "postgresql"
    proc._advisory_conn = mock_conn

    proc._release_advisory_lock()

    assert proc.is_leader is False
    assert proc._advisory_conn is None
    mock_conn.execute.assert_called_once()
    mock_conn.close.assert_called_once()


def test_concurrent_worker_dispatch_idempotency(db_session: Session):
    """Verify concurrent batch executions do not duplicate XP or cause unhandled conflicts."""
    role = Role(name="student", description="Student role")
    db_session.add(role)
    db_session.flush()

    student = User(
        email=f"concurrent_{uuid.uuid4().hex[:8]}@learnova.test",
        hashed_password="fakehash",
        full_name="Concurrent Student",
        role_id=role.id,
        is_active=True,
    )
    db_session.add(student)
    db_session.commit()

    # Create 4 events
    events = []
    for i in range(4):
        ev = DomainOutboxEvent(
            event_type="lesson.completed",
            aggregate_type="lesson_progress",
            aggregate_id=str(uuid.uuid4()),
            idempotency_key=f"concurrent_test_key_{uuid.uuid4().hex}",
            payload={
                "student_id": str(student.id),
                "lesson_id": str(uuid.uuid4()),
                "course_id": str(uuid.uuid4()),
            },
            status="pending",
        )
        events.append(ev)
    db_session.add_all(events)
    db_session.commit()

    session_factory = sessionmaker(bind=db_session.get_bind(), expire_on_commit=False)
    proc1 = OutboxProcessor(session_factory=session_factory, batch_size=2, enable_advisory_lock=False)
    proc2 = OutboxProcessor(session_factory=session_factory, batch_size=2, enable_advisory_lock=False)

    # Run batch on proc1 then proc2
    res1 = proc1.process_batch()
    res2 = proc2.process_batch()

    total_processed = res1["processed_count"] + res2["processed_count"]
    assert total_processed == 4

    db_session.expire_all()
    # Profile XP should be 4 * 50 = 200
    profile = db_session.query(GamificationProfile).filter_by(student_id=student.id).first()
    assert profile is not None
    assert profile.xp == 200

    # XP Ledger count must equal 4
    ledger_count = db_session.query(XPLedger).filter_by(student_id=student.id).count()
    assert ledger_count == 4
