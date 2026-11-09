"""Automated tests for assessment-to-mastery outbox integration and boundary invariants (DEC-03, DEC-P6-003, DEC-P7-004)."""

import uuid
from decimal import Decimal
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.assessment import Assessment, AssessmentQuestion
from app.models.attempt import AssessmentAttempt, AttemptResponse
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.mastery import StudentTopicMastery
from app.models.outbox import DomainOutboxEvent
from app.models.question import Question
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User


@pytest.fixture
def seed_outbox_mastery_context(client_with_db: TestClient, db_session: Session) -> Dict:
    """Seed context for testing submission, outbox, and mastery recalculation."""
    teacher_role = db_session.query(Role).filter(Role.name == "teacher").first()
    student_role = db_session.query(Role).filter(Role.name == "student").first()

    teacher = User(
        email=f"teacher_obm_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw_dummy",
        full_name="Teacher Outbox",
        is_active=True,
        role_id=teacher_role.id,
    )
    student = User(
        email=f"student_obm_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw_dummy",
        full_name="Student Outbox",
        is_active=True,
        role_id=student_role.id,
    )
    db_session.add_all([teacher, student])
    db_session.commit()

    course = Course(
        title=f"Outbox Mastery Course {uuid.uuid4().hex[:6]}",
        status="published",
        creator_id=teacher.id,
    )
    db_session.add(course)
    db_session.commit()

    topic = Topic(
        course_id=course.id,
        title="Electromagnetism",
        order=1,
        mastery_threshold=Decimal("0.7000"),
    )
    db_session.add(topic)
    db_session.commit()

    enrollment = Enrollment(student_id=student.id, course_id=course.id, status="active")
    db_session.add(enrollment)
    db_session.commit()

    q1 = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="true_false",
        difficulty="easy",
        points=2,
        version=1,
        status="approved",
        prompt="Magnetic poles always occur in pairs.",
        payload={},
        answer_key={"correct_bool": True},
    )
    db_session.add(q1)
    db_session.commit()

    assessment = Assessment(
        course_id=course.id,
        topic_id=topic.id,
        creator_id=teacher.id,
        title="Magnetism Quiz",
        type="formative",
        total_points=2,
        passing_score_percent=70,
        status="published",
    )
    db_session.add(assessment)
    db_session.commit()

    aq1 = AssessmentQuestion(assessment_id=assessment.id, question_id=q1.id, question_version=1, order=1, points=2)
    db_session.add(aq1)
    db_session.commit()

    return {
        "teacher": teacher,
        "student": student,
        "course": course,
        "topic": topic,
        "q1": q1,
        "assessment": assessment,
        "enrollment": enrollment,
    }


def auth_header(user: User) -> dict:
    token = create_access_token(subject=str(user.id), role=user.role.name)
    return {"Authorization": f"Bearer {token}"}


def test_interim_answers_do_not_mutate_mastery(client_with_db: TestClient, db_session: Session, seed_outbox_mastery_context):
    """DEC-03 Boundary Invariant: Saving interim responses during an in-progress attempt NEVER updates mastery."""
    ctx = seed_outbox_mastery_context
    student = ctx["student"]
    topic = ctx["topic"]
    q1 = ctx["q1"]
    assessment = ctx["assessment"]
    hdr = auth_header(student)

    # Start attempt
    res_start = client_with_db.post(f"/api/v1/assessments/{assessment.id}/attempts", headers=hdr)
    assert res_start.status_code == 201
    att_id = res_start.json()["id"]

    # Save interim answer
    res_put = client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q1.id}",
        json={"student_response": True},
        headers=hdr,
    )
    assert res_put.status_code == 200

    # Verify no mastery record exists in DB!
    mastery = (
        db_session.query(StudentTopicMastery)
        .filter(
            StudentTopicMastery.student_id == student.id,
            StudentTopicMastery.topic_id == topic.id,
        )
        .first()
    )
    assert mastery is None


def test_submit_attempt_triggers_mastery_and_leaves_outbox_pending(
    client_with_db: TestClient, db_session: Session, seed_outbox_mastery_context
):
    """P7-FIX-01, P7-C05: Submitting attempt updates mastery but leaves DomainOutboxEvent pending for worker."""
    ctx = seed_outbox_mastery_context
    student = ctx["student"]
    topic = ctx["topic"]
    q1 = ctx["q1"]
    assessment = ctx["assessment"]
    hdr = auth_header(student)

    # Start attempt
    res_start = client_with_db.post(f"/api/v1/assessments/{assessment.id}/attempts", headers=hdr)
    att_id = res_start.json()["id"]

    # Answer correctly
    client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q1.id}",
        json={"student_response": True},
        headers=hdr,
    )

    # Submit attempt
    res_sub = client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr)
    assert res_sub.status_code == 200

    # 1. Topic mastery record exists and is competent/mastered
    mastery = (
        db_session.query(StudentTopicMastery)
        .filter(
            StudentTopicMastery.student_id == student.id,
            StudentTopicMastery.topic_id == topic.id,
        )
        .first()
    )
    assert mastery is not None
    assert mastery.score_percent >= 70

    # 2. Outbox event was created in transaction but remains strictly pending (P7-FIX-01)
    outbox = (
        db_session.query(DomainOutboxEvent)
        .filter(
            DomainOutboxEvent.event_type == "assessment.completed",
            DomainOutboxEvent.aggregate_id == att_id,
        )
        .first()
    )
    assert outbox is not None
    assert outbox.status == "pending"
    assert outbox.published_at is None


def test_direct_mastery_recalculation_leaves_outbox_pending(
    db_session: Session, seed_outbox_mastery_context
):
    """P7-C05: Direct MasteryService.recalculate_from_attempt does not mutate DomainOutboxEvent status."""
    ctx = seed_outbox_mastery_context
    student = ctx["student"]
    assessment = ctx["assessment"]
    q1 = ctx["q1"]

    # Create graded attempt directly
    attempt = AssessmentAttempt(
        assessment_id=assessment.id,
        student_id=student.id,
        enrollment_id=ctx["enrollment"].id,
        attempt_number=1,
        status="graded",
        score=2,
        max_score=2,
        passed=True,
    )
    db_session.add(attempt)
    db_session.commit()

    resp = AttemptResponse(
        attempt_id=attempt.id,
        question_id=q1.id,
        question_version=1,
        student_response={"text": "True"},
        is_correct=True,
        points_awarded=Decimal("2.00"),
        points_possible=2,
    )
    db_session.add(resp)

    # Pending outbox event
    outbox = DomainOutboxEvent(
        event_type="assessment.completed",
        aggregate_type="AssessmentAttempt",
        aggregate_id=str(attempt.id),
        idempotency_key=f"assessment_completed_{attempt.id}",
        payload={"attempt_id": str(attempt.id)},
        status="pending",
    )
    db_session.add(outbox)
    db_session.commit()

    # Recalculate mastery
    from app.services.mastery_service import MasteryService

    MasteryService.recalculate_from_attempt(db_session, attempt.id, actor=student)

    # Verify event remains strictly pending
    db_session.refresh(outbox)
    assert outbox.status == "pending"
    assert outbox.published_at is None


def test_recalculate_idempotency(client_with_db: TestClient, db_session: Session, seed_outbox_mastery_context):
    """Calling recalculation repeatedly produces identical mastery without duplicate rows or mathematical drift."""
    ctx = seed_outbox_mastery_context
    student = ctx["student"]
    topic = ctx["topic"]
    q1 = ctx["q1"]
    assessment = ctx["assessment"]
    hdr = auth_header(student)

    res_start = client_with_db.post(f"/api/v1/assessments/{assessment.id}/attempts", headers=hdr)
    att_id = res_start.json()["id"]

    client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q1.id}",
        json={"student_response": True},
        headers=hdr,
    )
    client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr)

    # First manual recalculation
    res_rc1 = client_with_db.post(f"/api/v1/mastery/recalculate/{att_id}", headers=hdr)
    assert res_rc1.status_code == 200
    score1 = res_rc1.json()["new_score"]

    # Second manual recalculation
    res_rc2 = client_with_db.post(f"/api/v1/mastery/recalculate/{att_id}", headers=hdr)
    assert res_rc2.status_code == 200
    score2 = res_rc2.json()["new_score"]

    assert score1 == pytest.approx(score2, abs=1e-4)

    # Verify exactly 1 unique row exists in StudentTopicMastery
    mastery_rows = (
        db_session.query(StudentTopicMastery)
        .filter(
            StudentTopicMastery.student_id == student.id,
            StudentTopicMastery.topic_id == topic.id,
        )
        .all()
    )
    assert len(mastery_rows) == 1
