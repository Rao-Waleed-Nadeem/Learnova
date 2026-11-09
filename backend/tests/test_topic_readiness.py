"""Automated tests for topic readiness and prerequisite DAG traversal (AC-P7-04, SSD-02)."""

import uuid
from decimal import Decimal
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.assessment import Assessment
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.mastery import StudentTopicMastery
from app.models.role import Role
from app.models.topic import Topic
from app.models.topic_prerequisite import TopicPrerequisite
from app.models.user import User


@pytest.fixture
def seed_readiness_context(client_with_db: TestClient, db_session: Session) -> Dict:
    """Seed course with prerequisite chain: Topic A (Intro) -> Topic B (Advanced)."""
    teacher_role = db_session.query(Role).filter(Role.name == "teacher").first()
    student_role = db_session.query(Role).filter(Role.name == "student").first()

    teacher = User(
        email=f"teacher_ready_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw_dummy",
        full_name="Teacher Readiness",
        is_active=True,
        role_id=teacher_role.id,
    )
    student1 = User(
        email=f"student_ready1_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw_dummy",
        full_name="Student Readiness One",
        is_active=True,
        role_id=student_role.id,
    )
    student2 = User(
        email=f"student_ready2_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw_dummy",
        full_name="Student Readiness Two",
        is_active=True,
        role_id=student_role.id,
    )
    db_session.add_all([teacher, student1, student2])
    db_session.commit()

    course = Course(
        title=f"DAG Readiness Chemistry {uuid.uuid4().hex[:6]}",
        status="published",
        creator_id=teacher.id,
    )
    db_session.add(course)
    db_session.commit()

    topic_a = Topic(
        course_id=course.id,
        title="Atomic Structure",
        order=1,
        mastery_threshold=Decimal("0.7000"),
    )
    topic_b = Topic(
        course_id=course.id,
        title="Chemical Bonding",
        order=2,
        mastery_threshold=Decimal("0.7000"),
    )
    db_session.add_all([topic_a, topic_b])
    db_session.commit()

    # Topic B depends on Topic A
    edge = TopicPrerequisite(
        topic_id=topic_b.id,
        prerequisite_topic_id=topic_a.id,
    )
    db_session.add(edge)
    db_session.commit()

    # Diagnostic assessment for the course
    diag = Assessment(
        course_id=course.id,
        topic_id=topic_a.id,
        creator_id=teacher.id,
        title="Chemistry Diagnostic",
        type="diagnostic",
        total_points=10,
        passing_score_percent=70,
        status="published",
    )
    db_session.add(diag)
    db_session.commit()

    # Enroll student1 only
    enr1 = Enrollment(
        student_id=student1.id,
        course_id=course.id,
        status="active",
    )
    db_session.add(enr1)
    db_session.commit()

    return {
        "teacher": teacher,
        "student1": student1,
        "student2": student2,
        "course": course,
        "topic_a": topic_a,
        "topic_b": topic_b,
        "diagnostic": diag,
    }


def auth_header(user: User) -> dict:
    token = create_access_token(subject=str(user.id), role=user.role.name)
    return {"Authorization": f"Bearer {token}"}


def test_topic_readiness_no_prerequisites(client_with_db: TestClient, seed_readiness_context):
    """AC-P7-04: Topic without prerequisites is immediately ready."""
    ctx = seed_readiness_context
    student1 = ctx["student1"]
    topic_a = ctx["topic_a"]
    hdr1 = auth_header(student1)

    res = client_with_db.get(f"/api/v1/topics/{topic_a.id}/readiness", headers=hdr1)
    assert res.status_code == 200
    data = res.json()
    assert data["is_ready"] is True
    assert len(data["unmet_prerequisites"]) == 0
    assert data["diagnostic_assessment_id"] is None


def test_topic_readiness_unmet_prerequisites_blocks(client_with_db: TestClient, seed_readiness_context):
    """AC-P7-04: Dependent topic is blocked when prerequisite topic is unassessed or developing."""
    ctx = seed_readiness_context
    student1 = ctx["student1"]
    topic_a = ctx["topic_a"]
    topic_b = ctx["topic_b"]
    diag = ctx["diagnostic"]
    hdr1 = auth_header(student1)

    res = client_with_db.get(f"/api/v1/topics/{topic_b.id}/readiness", headers=hdr1)
    assert res.status_code == 200
    data = res.json()
    assert data["is_ready"] is False
    assert len(data["unmet_prerequisites"]) == 1
    unmet = data["unmet_prerequisites"][0]
    assert unmet["prerequisite_topic_id"] == str(topic_a.id)
    assert unmet["is_satisfied"] is False
    # Diagnostic test is surfaced to student to unlock prerequisite!
    assert data["diagnostic_assessment_id"] == str(diag.id)


def test_topic_readiness_satisfied_prerequisites_unlocks(
    client_with_db: TestClient, db_session: Session, seed_readiness_context
):
    """AC-P7-04: Elevating prerequisite mastery to competent (>= 70%) unlocks dependent topic."""
    ctx = seed_readiness_context
    student1 = ctx["student1"]
    course = ctx["course"]
    topic_a = ctx["topic_a"]
    topic_b = ctx["topic_b"]
    hdr1 = auth_header(student1)

    # Student achieves competent mastery in Topic A
    mastery_a = StudentTopicMastery(
        student_id=student1.id,
        course_id=course.id,
        topic_id=topic_a.id,
        mastery_score=Decimal("0.7500"),
        score_percent=75,
        status="competent",
        attempts_count=1,
    )
    db_session.add(mastery_a)
    db_session.commit()

    # Now inspect Topic B readiness
    res = client_with_db.get(f"/api/v1/topics/{topic_b.id}/readiness", headers=hdr1)
    assert res.status_code == 200
    data = res.json()
    assert data["is_ready"] is True
    assert len(data["unmet_prerequisites"]) == 0


def test_unenrolled_student_cannot_access_readiness(client_with_db: TestClient, seed_readiness_context):
    """Unenrolled student is rejected from viewing topic readiness (403 Forbidden)."""
    ctx = seed_readiness_context
    student2 = ctx["student2"]  # NOT enrolled
    topic_a = ctx["topic_a"]
    hdr2 = auth_header(student2)

    res = client_with_db.get(f"/api/v1/topics/{topic_a.id}/readiness", headers=hdr2)
    assert res.status_code == 403
    assert "not actively enrolled" in res.json()["detail"]
