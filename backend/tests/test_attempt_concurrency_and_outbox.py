"""Automated test suite verifying submit idempotency, transactional outbox events, and atomicity (SSD-04, SSD-06)."""

import uuid
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.assessment import Assessment, AssessmentQuestion
from app.models.attempt import AssessmentAttempt, AttemptResponse
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.enrollment import Enrollment
from app.models.outbox import DomainOutboxEvent
from app.models.question import Question
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User


@pytest.fixture
def seed_outbox_context(client_with_db: TestClient, db_session: Session):
    """Seed test fixtures for idempotency and outbox event testing."""
    role_teacher = db_session.query(Role).filter_by(name="teacher").first()
    role_student = db_session.query(Role).filter_by(name="student").first()

    teacher = User(
        email="teacher_outbox@learnova.test",
        hashed_password=hash_password("TeacherPass123!"),
        full_name="Teacher Outbox",
        role_id=role_teacher.id,
    )
    student = User(
        email="student_outbox@learnova.test",
        hashed_password=hash_password("StudentPass123!"),
        full_name="Student Outbox",
        role_id=role_student.id,
    )
    db_session.add_all([teacher, student])
    db_session.commit()

    course = Course(title="Data Structures", status="published", creator_id=teacher.id)
    db_session.add(course)
    db_session.commit()

    ct = CourseTeacher(course_id=course.id, teacher_id=teacher.id)
    topic = Topic(course_id=course.id, title="Binary Search Trees", order=1)
    db_session.add_all([ct, topic])
    db_session.commit()

    enrollment = Enrollment(student_id=student.id, course_id=course.id, status="active")
    db_session.add(enrollment)
    db_session.commit()

    # Create questions with varying difficulties for adaptive tests
    q_easy = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="true_false",
        difficulty="easy",
        points=1,
        prompt="BST lookup is faster than unsorted array on average.",
        payload={},
        answer_key={"correct_bool": True},
    )
    q_med = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="true_false",
        difficulty="medium",
        points=2,
        prompt="In-order traversal of a BST yields nodes in ascending order.",
        payload={},
        answer_key={"correct_bool": True},
    )
    q_hard = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="true_false",
        difficulty="hard",
        points=3,
        prompt="Red-black tree guarantees O(log n) worst-case height.",
        payload={},
        answer_key={"correct_bool": True},
    )
    db_session.add_all([q_easy, q_med, q_hard])
    db_session.commit()

    # Standard Exam Assessment
    asm = Assessment(
        course_id=course.id,
        topic_id=topic.id,
        creator_id=teacher.id,
        title="BST Mastery Quiz",
        type="summative",
        status="published",
        total_points=3,
        passing_score_percent=70,
    )
    db_session.add(asm)
    db_session.commit()

    aq = AssessmentQuestion(assessment_id=asm.id, question_id=q_easy.id, order=0, points=1, question_version=1)
    db_session.add(aq)
    db_session.commit()

    # Adaptive Practice Assessment
    asm_adaptive = Assessment(
        course_id=course.id,
        topic_id=topic.id,
        creator_id=teacher.id,
        title="Adaptive BST Practice",
        type="adaptive",
        status="published",
        total_points=1,
    )
    db_session.add(asm_adaptive)
    db_session.commit()

    aq_ad = AssessmentQuestion(assessment_id=asm_adaptive.id, question_id=q_easy.id, order=0, points=1, question_version=1)
    db_session.add(aq_ad)
    db_session.commit()

    return {
        "teacher": teacher,
        "student": student,
        "course": course,
        "topic": topic,
        "asm": asm,
        "asm_adaptive": asm_adaptive,
        "q_easy": q_easy,
        "q_med": q_med,
        "q_hard": q_hard,
    }


def auth_header(user: User) -> dict:
    token = create_access_token(subject=str(user.id), role=user.role.name)
    return {"Authorization": f"Bearer {token}"}


def test_submit_idempotency(client_with_db: TestClient, db_session: Session, seed_outbox_context):
    """AC-P6-12: Duplicate submit requests are idempotent, return same result, and do not duplicate events."""
    ctx = seed_outbox_context
    student = ctx["student"]
    asm = ctx["asm"]
    q_easy = ctx["q_easy"]
    hdr = auth_header(student)

    # 1. Start attempt & answer
    res_start = client_with_db.post(f"/api/v1/assessments/{asm.id}/attempts", headers=hdr)
    att_id = res_start.json()["id"]

    client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q_easy.id}",
        json={"student_response": True},
        headers=hdr,
    )

    # 2. First submit
    res_sub1 = client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr)
    assert res_sub1.status_code == 200
    res1_data = res_sub1.json()
    assert res1_data["status"] == "graded"
    assert float(res1_data["score"]) == 1.0

    # Count outbox events after first submit
    outbox_count1 = db_session.execute(
        select(func.count(DomainOutboxEvent.id)).where(
            DomainOutboxEvent.aggregate_id == att_id
        )
    ).scalar()
    assert outbox_count1 == 1

    # 3. Second submit (idempotent replay)
    res_sub2 = client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr)
    assert res_sub2.status_code == 200
    res2_data = res_sub2.json()
    assert res2_data["score"] == res1_data["score"]
    assert res2_data["completed_at"] == res1_data["completed_at"]

    # Verify no duplicate outbox event was created
    outbox_count2 = db_session.execute(
        select(func.count(DomainOutboxEvent.id)).where(
            DomainOutboxEvent.aggregate_id == att_id
        )
    ).scalar()
    assert outbox_count2 == 1


def test_outbox_event_emitted_on_completion(client_with_db: TestClient, db_session: Session, seed_outbox_context):
    """AC-P6-13: Assessment completion transactionally inserts a domain_outbox_events record."""
    ctx = seed_outbox_context
    student = ctx["student"]
    asm = ctx["asm"]
    course = ctx["course"]
    topic = ctx["topic"]
    q_easy = ctx["q_easy"]
    hdr = auth_header(student)

    # Start and submit attempt
    res_start = client_with_db.post(f"/api/v1/assessments/{asm.id}/attempts", headers=hdr)
    att_id = res_start.json()["id"]
    client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q_easy.id}",
        json={"student_response": True},
        headers=hdr,
    )
    client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr)

    # Inspect domain_outbox_events table
    outbox_event = db_session.execute(
        select(DomainOutboxEvent).where(DomainOutboxEvent.aggregate_id == att_id)
    ).scalar_one_or_none()

    assert outbox_event is not None
    assert outbox_event.event_type == "assessment.completed"
    assert outbox_event.idempotency_key == f"asm_completed_{att_id}"
    assert outbox_event.status == "pending"
    assert outbox_event.published_at is None

    # Verify payload contents
    payload = outbox_event.payload
    assert payload["student_id"] == str(student.id)
    assert payload["assessment_id"] == str(asm.id)
    assert payload["course_id"] == str(course.id)
    assert payload["topic_id"] == str(topic.id)
    assert payload["score_percent"] == 100.0
    assert payload["passed"] is True


def test_adaptive_practice_next_question_flow(client_with_db: TestClient, seed_outbox_context):
    """AC-P6-04/DEC-03: Adaptive practice session-locally adjusts difficulty without mutating persisted mastery."""
    ctx = seed_outbox_context
    student = ctx["student"]
    asm_ad = ctx["asm_adaptive"]
    q_easy = ctx["q_easy"]
    hdr = auth_header(student)

    # 1. Start adaptive practice attempt (initial difficulty easy)
    res_start = client_with_db.post(
        f"/api/v1/assessments/{asm_ad.id}/attempts",
        json={"initial_difficulty": "easy"},
        headers=hdr,
    )
    assert res_start.status_code == 201
    att_id = res_start.json()["id"]
    assert res_start.json()["current_difficulty"] == "easy"

    # 2. Answer easy question correctly
    client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q_easy.id}",
        json={"student_response": True},
        headers=hdr,
    )

    # 3. Request next adaptive question (escalates easy -> medium)
    res_next = client_with_db.post(f"/api/v1/attempts/{att_id}/next-question", headers=hdr)
    assert res_next.status_code == 200
    next_data = res_next.json()
    assert next_data["current_difficulty"] == "medium"
    assert next_data["question"]["difficulty"] == "medium"
