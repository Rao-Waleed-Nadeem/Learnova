"""Tests for AI candidate question approval concurrency, idempotency, and rollback (Correction 4 / Part 7).

Verifies the business invariant that an AI candidate can become an official question
ONLY ONCE, with single-transaction atomicity and rollback safety.
Authoritative concurrency is tested on PostgreSQL per Part 7.5.
"""

import concurrent.futures
import os
import uuid
from typing import Dict, List
from unittest.mock import patch
import pytest
from alembic import command
from alembic.config import Config
from fastapi import HTTPException
import sqlalchemy as sa
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.ai import AICandidateQuestion
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.question import Question
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User
from app.services.ai_candidate_service import AICandidateService


@pytest.fixture
def disposable_pg_database():
    """Create a completely isolated disposable PostgreSQL database for concurrency testing (Part 7.5)."""
    disposable_db_name = f"test_disposable_ai_{uuid.uuid4().hex[:10]}"

    assert disposable_db_name != settings.POSTGRES_DB, "Disposable DB must not match persistent DB!"

    maintenance_url = settings.sync_database_url
    engine = create_engine(maintenance_url)

    try:
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            conn.execute(text(f'CREATE DATABASE "{disposable_db_name}"'))
    except Exception as exc:
        pytest.skip(f"PostgreSQL maintenance connection unavailable: {exc}")

    disposable_url = maintenance_url.rsplit("/", 1)[0] + f"/{disposable_db_name}"

    # Apply Alembic migrations up to head
    alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    alembic_cfg.set_main_option(
        "script_location", os.path.join(os.path.dirname(__file__), "..", "alembic")
    )
    alembic_cfg.set_main_option("sqlalchemy.url", disposable_url)
    command.upgrade(alembic_cfg, "head")

    try:
        yield disposable_url, disposable_db_name
    finally:
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            conn.execute(
                text(
                    f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                    f"WHERE datname = '{disposable_db_name}' AND pid <> pg_backend_pid()"
                )
            )
            conn.execute(text(f'DROP DATABASE IF EXISTS "{disposable_db_name}"'))
        engine.dispose()


@pytest.fixture
def test_setup(db_session: Session) -> Dict:
    """Setup teacher, course, topic, and candidate for transactional testing."""
    teacher_role = db_session.query(Role).filter_by(name="teacher").first()
    if not teacher_role:
        teacher_role = Role(name="teacher", description="Teacher")
        db_session.add(teacher_role)
        db_session.commit()

    teacher1 = User(
        email=f"concur_t1_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Concurrency Teacher 1",
        role_id=teacher_role.id,
    )
    teacher2 = User(
        email=f"concur_t2_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Concurrency Teacher 2 (Unassigned)",
        role_id=teacher_role.id,
    )
    db_session.add_all([teacher1, teacher2])
    db_session.commit()

    course = Course(title="Concurrency Systems", status="published", creator_id=teacher1.id)
    db_session.add(course)
    db_session.commit()

    ct = CourseTeacher(course_id=course.id, teacher_id=teacher1.id)
    topic = Topic(course_id=course.id, title="Transactions", order=1)
    db_session.add_all([ct, topic])
    db_session.commit()

    cand = AICandidateQuestion(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher1.id,
        type="multiple_choice",
        difficulty="medium",
        points=2,
        prompt="What guarantees isolation in ACID transactions?",
        explanation="Serializability or two-phase locking.",
        source_context="Curriculum Transactions",
        payload={
            "options": [
                {"id": "opt-1", "text": "Two-phase locking", "is_correct": True},
                {"id": "opt-2", "text": "Eventual consistency", "is_correct": False},
            ],
            "is_multiple_correct_allowed": False,
        },
        answer_key={"correct_option_ids": ["opt-1"]},
        status="pending_review",
        provider="gemini",
        model="gemini-2.5-flash",
        prompt_version="v1",
    )
    db_session.add(cand)
    db_session.commit()
    db_session.refresh(cand)

    return {
        "teacher1": teacher1,
        "teacher2": teacher2,
        "course": course,
        "topic": topic,
        "candidate": cand,
    }


def test_sequential_repeated_approval(test_setup: Dict, db_session: Session):
    """Part 7.5 Item 1: Sequential repeated approval calls return the same question without duplication."""
    teacher1 = test_setup["teacher1"]
    cand = test_setup["candidate"]

    # 1. First approval
    q1 = AICandidateService.approve_candidate(db_session, cand.id, teacher1)
    assert q1 is not None
    assert q1.source == "ai_generated"

    q_count_after_first = db_session.query(Question).count()

    # 2. Replayed approval call
    q2 = AICandidateService.approve_candidate(db_session, cand.id, teacher1)
    assert q2.id == q1.id
    assert db_session.query(Question).count() == q_count_after_first


def test_approval_after_rejection_forbidden(test_setup: Dict, db_session: Session):
    """Part 7.5 Item 3: Approving a rejected candidate is forbidden (400 Bad Request)."""
    teacher1 = test_setup["teacher1"]
    cand = test_setup["candidate"]

    # Reject
    AICandidateService.reject_candidate(db_session, cand.id, "Not aligned", teacher1)
    assert cand.status == "rejected"

    # Try approve
    with pytest.raises(HTTPException) as exc_info:
        AICandidateService.approve_candidate(db_session, cand.id, teacher1)
    assert exc_info.value.status_code == 400


def test_approval_by_unauthorized_teacher_forbidden(test_setup: Dict, db_session: Session):
    """Part 7.5 Item 5: Unassigned teacher cannot approve a candidate (403 Forbidden)."""
    teacher2 = test_setup["teacher2"]
    cand = test_setup["candidate"]

    with pytest.raises(HTTPException) as exc_info:
        AICandidateService.approve_candidate(db_session, cand.id, teacher2)
    assert exc_info.value.status_code == 403


def test_approval_of_invalid_candidate(test_setup: Dict, db_session: Session):
    """Part 7.5 Item 4: Approving a nonexistent candidate ID returns 404."""
    teacher1 = test_setup["teacher1"]
    fake_id = uuid.uuid4()

    with pytest.raises(HTTPException) as exc_info:
        AICandidateService.approve_candidate(db_session, fake_id, teacher1)
    assert exc_info.value.status_code == 404


def test_approval_rollback_on_candidate_update_failure(test_setup: Dict, db_session: Session):
    """Part 7.5 Item 8 & 9: If status update fails during approval, entire transaction rolls back."""
    teacher1 = test_setup["teacher1"]
    cand = test_setup["candidate"]
    initial_q_count = db_session.query(Question).count()

    with patch("app.services.ai_candidate_service.log_audit_event", side_effect=RuntimeError("Audit event write failure")):
        with pytest.raises(RuntimeError):
            AICandidateService.approve_candidate(db_session, cand.id, teacher1)

    # Rollback assertion: NO question was created
    assert db_session.query(Question).count() == initial_q_count

    # Candidate row remains in pending_review
    reloaded_cand = db_session.get(AICandidateQuestion, cand.id)
    assert reloaded_cand.status == "pending_review"
    assert reloaded_cand.approved_question_id is None


def test_retry_after_failed_transaction(test_setup: Dict, db_session: Session):
    """Part 7.5 Item 10: Retrying approval after a rolled back transaction succeeds cleanly."""
    teacher1 = test_setup["teacher1"]
    cand = test_setup["candidate"]

    # 1. First attempt fails due to simulated transient error
    with patch("app.services.ai_candidate_service.log_audit_event", side_effect=RuntimeError("Transient failure")):
        with pytest.raises(RuntimeError):
            AICandidateService.approve_candidate(db_session, cand.id, teacher1)

    # 2. Retry attempt succeeds
    promoted_q = AICandidateService.approve_candidate(db_session, cand.id, teacher1)
    assert promoted_q is not None
    assert promoted_q.source == "ai_generated"

    reloaded_cand = db_session.get(AICandidateQuestion, cand.id)
    assert reloaded_cand.status == "approved"
    assert reloaded_cand.approved_question_id == promoted_q.id


def test_concurrent_approval_on_postgresql(disposable_pg_database):
    """Part 7.5: Authoritative PostgreSQL concurrency test using FOR UPDATE row locking.

    Proves that concurrent transactions against the same candidate serialize cleanly,
    create exactly one official question, and all callers receive the identical question.
    """
    disposable_url, db_name = disposable_pg_database
    pg_engine = create_engine(disposable_url)
    PgSession = sessionmaker(bind=pg_engine, expire_on_commit=False)

    seed_session = PgSession()
    # Seed teacher and candidate in real PostgreSQL
    teacher_role = seed_session.query(Role).filter_by(name="teacher").first()
    teacher = User(
        email=f"pg_teacher_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Postgres Concurrency Teacher",
        role_id=teacher_role.id,
    )
    seed_session.add(teacher)
    seed_session.commit()

    course = Course(title="Postgres Concurrency", status="published", creator_id=teacher.id)
    seed_session.add(course)
    seed_session.commit()

    ct = CourseTeacher(course_id=course.id, teacher_id=teacher.id)
    topic = Topic(course_id=course.id, title="Locking", order=1)
    seed_session.add_all([ct, topic])
    seed_session.commit()

    cand = AICandidateQuestion(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="multiple_choice",
        difficulty="medium",
        points=2,
        prompt="Explain FOR UPDATE row locking in PostgreSQL.",
        explanation="Locks rows against concurrent modifications.",
        source_context="Curriculum Locking",
        payload={
            "options": [
                {"id": "opt-1", "text": "Locks selected rows", "is_correct": True},
                {"id": "opt-2", "text": "Locks the whole table", "is_correct": False},
            ],
            "is_multiple_correct_allowed": False,
        },
        answer_key={"correct_option_ids": ["opt-1"]},
        status="pending_review",
        provider="gemini",
        model="gemini-2.5-flash",
        prompt_version="v1",
    )
    seed_session.add(cand)
    seed_session.commit()
    seed_session.refresh(cand)

    cand_id = cand.id
    teacher_id = teacher.id
    seed_session.close()

    # Run 3 concurrent worker threads against real PostgreSQL
    results = []

    def _worker():
        worker_session = PgSession()
        try:
            actor = worker_session.get(User, teacher_id)
            promoted = AICandidateService.approve_candidate(
                db=worker_session,
                candidate_id=cand_id,
                actor=actor,
            )
            return promoted.id
        finally:
            worker_session.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(_worker) for _ in range(3)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    # Verification on PostgreSQL
    verify_session = PgSession()
    try:
        # 1. Exactly 1 question exists for this candidate
        pg_cand = verify_session.get(AICandidateQuestion, cand_id)
        assert pg_cand.status == "approved"
        assert pg_cand.approved_question_id is not None

        # 2. Total official questions created is exactly 1
        q_count = (
            verify_session.query(Question)
            .filter(Question.course_id == course.id)
            .count()
        )
        assert q_count == 1

        # 3. All threads returned the identical question ID
        assert len(results) == 3
        for q_id in results:
            assert q_id == pg_cand.approved_question_id
    finally:
        verify_session.close()
        pg_engine.dispose()
