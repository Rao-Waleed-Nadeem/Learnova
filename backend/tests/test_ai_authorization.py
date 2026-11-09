"""Tests for AI RBAC, teacher course scoping, student access controls, and answer key leakage prevention (P9-08, P9-09, P9-13, P9-14)."""

import uuid
from typing import Dict
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User


@pytest.fixture
def auth_fixture(client_with_db: TestClient, db_session: Session) -> Dict:
    teacher_role = db_session.query(Role).filter_by(name="teacher").first()
    student_role = db_session.query(Role).filter_by(name="student").first()

    # Teacher 1 (assigned to course)
    t1 = User(
        email=f"t1_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Teacher One",
        role_id=teacher_role.id,
    )
    # Teacher 2 (unassigned)
    t2 = User(
        email=f"t2_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Teacher Two",
        role_id=teacher_role.id,
    )
    # Student 1 (enrolled)
    s1 = User(
        email=f"s1_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Student Enrolled",
        role_id=student_role.id,
    )
    # Student 2 (not enrolled)
    s2 = User(
        email=f"s2_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Student Unenrolled",
        role_id=student_role.id,
    )
    db_session.add_all([t1, t2, s1, s2])
    db_session.commit()

    course = Course(title="Operating Systems", status="published", creator_id=t1.id)
    db_session.add(course)
    db_session.commit()

    ct = CourseTeacher(course_id=course.id, teacher_id=t1.id)
    topic = Topic(course_id=course.id, title="Virtual Memory", order=1)
    db_session.add_all([ct, topic])
    db_session.commit()

    lesson = Lesson(topic_id=topic.id, title="Paging", order=1, description="Paging is a memory management scheme.")
    db_session.add(lesson)
    db_session.commit()

    # Enroll s1 only
    enr = Enrollment(student_id=s1.id, course_id=course.id, status="active")
    db_session.add(enr)
    db_session.commit()

    return {
        "t1": t1,
        "t2": t2,
        "s1": s1,
        "s2": s2,
        "course": course,
        "topic": topic,
        "lesson": lesson,
        "client": client_with_db,
        "token_t1": create_access_token(str(t1.id), role="teacher"),
        "token_t2": create_access_token(str(t2.id), role="teacher"),
        "token_s1": create_access_token(str(s1.id), role="student"),
        "token_s2": create_access_token(str(s2.id), role="student"),
    }


def test_student_forbidden_from_candidate_endpoints(auth_fixture: Dict):
    """P9-08: Student accounts are strictly forbidden (403) from generating, listing, or approving candidate questions."""
    client: TestClient = auth_fixture["client"]
    token_s1 = auth_fixture["token_s1"]
    course = auth_fixture["course"]
    topic = auth_fixture["topic"]

    # 1. Generation endpoint
    resp1 = client.post(
        "/api/v1/ai/generate-questions",
        json={"course_id": str(course.id), "topic_id": str(topic.id), "count": 1},
        headers={"Authorization": f"Bearer {token_s1}"},
    )
    assert resp1.status_code == 403

    # 2. List endpoint
    resp2 = client.get(
        f"/api/v1/ai/candidates?course_id={course.id}",
        headers={"Authorization": f"Bearer {token_s1}"},
    )
    assert resp2.status_code == 403

    # 3. Approve endpoint
    dummy_id = uuid.uuid4()
    resp3 = client.post(
        f"/api/v1/ai/candidates/{dummy_id}/approve",
        headers={"Authorization": f"Bearer {token_s1}"},
    )
    assert resp3.status_code == 403


def test_teacher_forbidden_from_unassigned_course_candidate_generation(auth_fixture: Dict):
    """P9-09: Teacher not assigned to the course cannot generate or review candidate questions."""
    client: TestClient = auth_fixture["client"]
    token_t2 = auth_fixture["token_t2"]
    course = auth_fixture["course"]
    topic = auth_fixture["topic"]

    resp = client.post(
        "/api/v1/ai/generate-questions",
        json={"course_id": str(course.id), "topic_id": str(topic.id), "count": 1},
        headers={"Authorization": f"Bearer {token_t2}"},
    )
    assert resp.status_code == 403
    assert "Not authorized" in resp.json()["detail"] or "manage question bank" in resp.json()["detail"].lower()


def test_student_can_request_tutoring_for_enrolled_course(auth_fixture: Dict):
    """Enrolled student can successfully request AI tutoring for course lesson."""
    client: TestClient = auth_fixture["client"]
    token_s1 = auth_fixture["token_s1"]
    lesson = auth_fixture["lesson"]

    resp = client.post(
        "/api/v1/ai/simplify-lesson",
        json={"lesson_id": str(lesson.id), "mode": "simplify"},
        headers={"Authorization": f"Bearer {token_s1}"},
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert "Paging" in resp.json()["explanation"]


def test_unenrolled_student_forbidden_from_lesson_tutoring(auth_fixture: Dict):
    """Student not enrolled in the course is denied tutoring access for that lesson."""
    client: TestClient = auth_fixture["client"]
    token_s2 = auth_fixture["token_s2"]
    lesson = auth_fixture["lesson"]

    resp = client.post(
        "/api/v1/ai/simplify-lesson",
        json={"lesson_id": str(lesson.id), "mode": "simplify"},
        headers={"Authorization": f"Bearer {token_s2}"},
    )
    assert resp.status_code == 403
    assert "enrolled" in resp.json()["detail"].lower()


def test_student_tutoring_does_not_leak_answer_keys(auth_fixture: Dict):
    """P9-13: Student tutoring response contains only explanation metadata and no answer keys, rubrics, or internal secrets."""
    client: TestClient = auth_fixture["client"]
    token_s1 = auth_fixture["token_s1"]
    lesson = auth_fixture["lesson"]

    resp = client.post(
        "/api/v1/ai/simplify-lesson",
        json={"lesson_id": str(lesson.id), "mode": "analogy"},
        headers={"Authorization": f"Bearer {token_s1}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "explanation" in data
    assert "source" in data
    assert "is_cached" in data

    # Security check: ensure answer_key, expected_rubric, correct_bool are NOT returned
    assert "answer_key" not in data
    assert "expected_rubric" not in data
    assert "correct_bool" not in data
    assert "correct_option_ids" not in data
