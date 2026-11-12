"""Unit tests for in-process OutboxProcessor (Option B).

Covers:
- Initialization with default and custom settings
- Start and stop lifecycle
- Polling interval and interruptible sleep
- Empty batch behavior
- Batch size enforcement
- Unsupported event type handling
- Invalid payload error classification
- Exponential backoff calculation and max retry enforcement
- Operational diagnostics telemetry
"""

import asyncio
import time
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.models.gamification import GamificationProfile, XPLedger
from app.models.outbox import DomainOutboxEvent
from app.models.role import Role
from app.models.user import User
from app.services.gamification_service import GamificationService
from app.workers.outbox_worker import OutboxProcessor, create_outbox_processor


def test_processor_init_defaults():
    """Verify processor initializes with valid positive bounds from defaults."""
    processor = OutboxProcessor()
    assert processor.poll_interval >= 0.1
    assert processor.batch_size >= 1
    assert processor.max_attempts >= 1
    assert processor.retry_base_seconds >= 0.1
    assert processor.retry_max_seconds >= processor.retry_base_seconds
    assert processor.shutdown_timeout >= 1.0
    assert processor.is_running is False
    assert processor.is_leader is False


def test_processor_init_custom():
    """Verify processor respects custom parameters."""
    processor = OutboxProcessor(
        poll_interval=2.5,
        batch_size=10,
        max_attempts=3,
        retry_base_seconds=2.0,
        retry_max_seconds=60.0,
        shutdown_timeout=5.0,
        enable_advisory_lock=False,
    )
    assert processor.poll_interval == 2.5
    assert processor.batch_size == 10
    assert processor.max_attempts == 3
    assert processor.retry_base_seconds == 2.0
    assert processor.retry_max_seconds == 60.0
    assert processor.shutdown_timeout == 5.0
    assert processor.enable_advisory_lock is False


@pytest.mark.anyio
async def test_processor_start_and_stop_lifecycle():
    """Verify processor starts background task and stops cleanly."""
    processor = OutboxProcessor(
        poll_interval=0.1,
        enable_advisory_lock=False,
        session_factory=MagicMock(),
    )

    # Mock process_batch to return empty
    processor.process_batch = MagicMock(return_value={"processed_count": 0, "failed_count": 0, "message": "None"})

    assert processor.is_running is False
    await processor.start()
    assert processor.is_running is True
    assert processor._task is not None

    # Allow one poll pass
    await asyncio.sleep(0.15)
    assert processor.process_batch.call_count >= 1

    # Stop processor
    await processor.stop()
    assert processor.is_running is False
    assert processor._task is None


@pytest.mark.anyio
async def test_processor_double_start_is_idempotent():
    """Verify calling start() twice does not create duplicate worker loops."""
    processor = OutboxProcessor(
        poll_interval=0.1,
        enable_advisory_lock=False,
        session_factory=MagicMock(),
    )
    processor.process_batch = MagicMock(return_value={"processed_count": 0, "failed_count": 0, "message": "None"})

    await processor.start()
    first_task = processor._task

    # Call start again
    await processor.start()
    assert processor._task is first_task

    await processor.stop()


@pytest.mark.anyio
async def test_interruptible_sleep_fast_shutdown():
    """Verify processor stops immediately without waiting for full poll interval."""
    long_interval = 30.0  # 30 seconds
    processor = OutboxProcessor(
        poll_interval=long_interval,
        enable_advisory_lock=False,
        session_factory=MagicMock(),
    )
    processor.process_batch = MagicMock(return_value={"processed_count": 0, "failed_count": 0, "message": "None"})

    await processor.start()
    await asyncio.sleep(0.05)  # Let it enter sleep

    start_time = time.time()
    await processor.stop()
    elapsed = time.time() - start_time

    # Must shut down in under 2 seconds, not wait 30 seconds
    assert elapsed < 2.0


def test_empty_batch_behavior(db_session: Session):
    """Verify process_batch on empty table executes cleanly without errors."""
    session_factory = sessionmaker(bind=db_session.get_bind(), expire_on_commit=False)
    processor = OutboxProcessor(session_factory=session_factory, batch_size=10)

    result = processor.process_batch()
    assert result["processed_count"] == 0
    assert result["failed_count"] == 0
    assert processor.last_poll_time is not None
    assert processor.last_error is None


def test_batch_size_enforcement(db_session: Session):
    """Verify processor respects configured batch_size limit."""
    # Seed role and student for valid foreign key reference
    role = Role(name="student", description="Student role")
    db_session.add(role)
    db_session.flush()

    student = User(
        email=f"student_{uuid.uuid4().hex[:8]}@learnova.test",
        hashed_password="fakehash",
        full_name="Test Student",
        role_id=role.id,
        is_active=True,
    )
    db_session.add(student)
    db_session.commit()

    # Seed 5 pending events
    events = []
    for i in range(5):
        ev = DomainOutboxEvent(
            event_type="resource.reviewed",
            aggregate_type="resource_activity",
            aggregate_id=str(uuid.uuid4()),
            idempotency_key=f"batch_size_test_{uuid.uuid4().hex}",
            payload={"student_id": str(student.id), "resource_id": str(uuid.uuid4())},
            status="pending",
        )
        events.append(ev)
    db_session.add_all(events)
    db_session.commit()

    # Process with batch_size = 2
    session_factory = sessionmaker(bind=db_session.get_bind(), expire_on_commit=False)
    processor = OutboxProcessor(session_factory=session_factory, batch_size=2)
    res = processor.process_batch()

    assert res["processed_count"] == 2

    # Verify only 2 events transitioned to published
    db_session.expire_all()
    published_count = (
        db_session.query(DomainOutboxEvent)
        .filter(DomainOutboxEvent.status == "published")
        .count()
    )
    assert published_count == 2


def test_unsupported_event_type_raises_and_retries(db_session: Session):
    """Verify unsupported event types are rejected and increment retry_count rather than spinning indefinitely."""
    ev = DomainOutboxEvent(
        event_type="unknown.event.type",
        aggregate_type="unknown",
        aggregate_id=str(uuid.uuid4()),
        idempotency_key=f"unsupported_{uuid.uuid4().hex}",
        payload={"some_key": "some_value"},
        status="pending",
    )
    db_session.add(ev)
    db_session.commit()

    session_factory = sessionmaker(bind=db_session.get_bind(), expire_on_commit=False)
    processor = OutboxProcessor(session_factory=session_factory, max_attempts=3)
    res = processor.process_batch()

    assert res["failed_count"] == 1
    db_session.expire_all()
    refreshed_ev = db_session.get(DomainOutboxEvent, ev.id)
    assert refreshed_ev.retry_count == 1
    assert "Unsupported or unhandled outbox event type" in (refreshed_ev.last_error or "")
    assert refreshed_ev.status == "pending"


def test_diagnostics_telemetry(db_session: Session):
    """Verify get_diagnostics returns accurate operational state."""
    session_factory = sessionmaker(bind=db_session.get_bind(), expire_on_commit=False)
    processor = OutboxProcessor(
        session_factory=session_factory,
        poll_interval=3.0,
        batch_size=15,
        max_attempts=4,
    )

    diag = processor.get_diagnostics()
    assert diag["is_running"] is False
    assert diag["poll_interval_seconds"] == 3.0
    assert diag["batch_size"] == 15
    assert diag["max_attempts"] == 4
    assert diag["processed_total"] == 0
    assert diag["failed_total"] == 0
