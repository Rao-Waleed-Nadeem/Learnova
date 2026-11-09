"""Automated test suite verifying Assessment authoring, composition, version pinning, and publication quality gates (SSD-08)."""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.question import Question
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User


@pytest.fixture
def seed_assessment_context(client_with_db: TestClient, db_session: Session):
    """Seed users, courses, topic, and sample questions for assessment tests."""
    role_admin = db_session.query(Role).filter_by(name="administrator").first()
    role_teacher = db_session.query(Role).filter_by(name="teacher").first()
    role_student = db_session.query(Role).filter_by(name="student").first()

    teacher = User(
        email="teacher_asm@learnova.test",
        hashed_password=hash_password("TeacherPass123!"),
        full_name="Teacher Asm",
        role_id=role_teacher.id,
    )
    student = User(
        email="student_asm@learnova.test",
        hashed_password=hash_password("StudentPass123!"),
        full_name="Student Asm",
        role_id=role_student.id,
    )
    db_session.add_all([teacher, student])
    db_session.commit()

    course_a = Course(title="Physics 101", status="published", creator_id=teacher.id)
    course_b = Course(title="Chemistry 101", status="published", creator_id=teacher.id)
    db_session.add_all([course_a, course_b])
    db_session.commit()

    ct_a = CourseTeacher(course_id=course_a.id, teacher_id=teacher.id)
    ct_b = CourseTeacher(course_id=course_b.id, teacher_id=teacher.id)
    topic_a = Topic(course_id=course_a.id, title="Kinematics", order=1)
    topic_b = Topic(course_id=course_b.id, title="Thermodynamics", order=1)
    db_session.add_all([ct_a, ct_b, topic_a, topic_b])
    db_session.commit()

    # Create questions in Course A
    q1 = Question(
        course_id=course_a.id,
        topic_id=topic_a.id,
        author_id=teacher.id,
        type="multiple_choice",
        difficulty="medium",
        points=2,
        prompt="What is standard gravitational acceleration on Earth?",
        payload={"options": [{"id": "opt_1", "text": "9.8 m/s^2"}, {"id": "opt_2", "text": "10.8 m/s^2"}]},
        answer_key={"correct_option_ids": ["opt_1"]},
    )
    q2 = Question(
        course_id=course_a.id,
        topic_id=topic_a.id,
        author_id=teacher.id,
        type="true_false",
        difficulty="easy",
        points=3,
        prompt="Displacement is a vector quantity.",
        payload={},
        answer_key={"correct_bool": True},
    )

    # Create question in Course B
    q_b = Question(
        course_id=course_b.id,
        topic_id=topic_b.id,
        author_id=teacher.id,
        type="true_false",
        difficulty="easy",
        points=1,
        prompt="Water is polar.",
        payload={},
        answer_key={"correct_bool": True},
    )

    db_session.add_all([q1, q2, q_b])
    db_session.commit()
    db_session.refresh(q1)
    db_session.refresh(q2)
    db_session.refresh(q_b)

    return {
        "teacher": teacher,
        "student": student,
        "course_a": course_a,
        "course_b": course_b,
        "topic_a": topic_a,
        "q1": q1,
        "q2": q2,
        "q_b": q_b,
    }


def auth_header(user: User) -> dict:
    token = create_access_token(subject=str(user.id), role=user.role.name)
    return {"Authorization": f"Bearer {token}"}


def test_assessment_composition_and_points(client_with_db: TestClient, seed_assessment_context):
    """AC-P5-09: Assessment composition attaches ordered questions and dynamically computes total points."""
    ctx = seed_assessment_context
    teacher = ctx["teacher"]
    course_a = ctx["course_a"]
    topic_a = ctx["topic_a"]
    q1 = ctx["q1"]
    q2 = ctx["q2"]
    hdr = auth_header(teacher)

    payload = {
        "course_id": str(course_a.id),
        "topic_id": str(topic_a.id),
        "title": "Kinematics Midterm Exam",
        "type": "summative",
        "instructions": "Answer all questions carefully.",
        "time_limit_minutes": 60,
        "max_attempts": 2,
        "passing_score_percent": 70,
        "questions": [
            {"question_id": str(q1.id), "order": 0, "points": 2},
            {"question_id": str(q2.id), "order": 1, "points": 5},
        ],
    }
    res = client_with_db.post("/api/v1/assessments", json=payload, headers=hdr)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "draft"
    assert data["total_points"] == 7
    assert data["questions_count"] == 2
    assert data["questions"][0]["points"] == 2
    assert data["questions"][1]["points"] == 5
    assert data["questions"][0]["question_version"] == 1


def test_cross_course_questions_rejected(client_with_db: TestClient, seed_assessment_context):
    """AC-P5-10: Cannot attach questions from unrelated course to an assessment."""
    ctx = seed_assessment_context
    teacher = ctx["teacher"]
    course_a = ctx["course_a"]
    q_b = ctx["q_b"]  # Belongs to Course B!
    hdr = auth_header(teacher)

    payload = {
        "course_id": str(course_a.id),
        "title": "Cross Course Assessment Test",
        "type": "formative",
        "questions": [
            {"question_id": str(q_b.id), "order": 0, "points": 2},
        ],
    }
    res = client_with_db.post("/api/v1/assessments", json=payload, headers=hdr)
    assert res.status_code == 400
    assert "does not belong to course" in res.json()["detail"]


def test_publish_empty_assessment_rejected(client_with_db: TestClient, seed_assessment_context):
    """AC-P5-11: Assessment with 0 questions is rejected from publication with 422."""
    ctx = seed_assessment_context
    teacher = ctx["teacher"]
    course_a = ctx["course_a"]
    hdr = auth_header(teacher)

    # Create empty draft assessment
    res_create = client_with_db.post(
        "/api/v1/assessments",
        json={"course_id": str(course_a.id), "title": "Empty Assessment", "type": "formative", "questions": []},
        headers=hdr,
    )
    asm_id = res_create.json()["id"]

    # Attempt to publish empty assessment
    res_pub = client_with_db.post(f"/api/v1/assessments/{asm_id}/publish", headers=hdr)
    assert res_pub.status_code == 422
    assert "at least 1 question" in res_pub.json()["detail"]


def test_publish_valid_assessment_success(client_with_db: TestClient, seed_assessment_context):
    """AC-P5-12: Valid assessment transitions to published status."""
    ctx = seed_assessment_context
    teacher = ctx["teacher"]
    course_a = ctx["course_a"]
    q1 = ctx["q1"]
    hdr = auth_header(teacher)

    # Create draft with 1 question
    res_create = client_with_db.post(
        "/api/v1/assessments",
        json={
            "course_id": str(course_a.id),
            "title": "Publishable Quiz",
            "type": "formative",
            "questions": [{"question_id": str(q1.id), "points": 4}],
        },
        headers=hdr,
    )
    asm_id = res_create.json()["id"]

    # Publish
    res_pub = client_with_db.post(f"/api/v1/assessments/{asm_id}/publish", headers=hdr)
    assert res_pub.status_code == 200
    data = res_pub.json()
    assert data["status"] == "published"
    assert data["total_points"] == 4


def test_question_version_pinning(client_with_db: TestClient, seed_assessment_context):
    """AC-P5-13: Question updates increment version while preserving snapshot version in composed assessment."""
    ctx = seed_assessment_context
    teacher = ctx["teacher"]
    course_a = ctx["course_a"]
    q1 = ctx["q1"]
    hdr = auth_header(teacher)

    # 1. Compose assessment with Q1 (version 1)
    res_create = client_with_db.post(
        "/api/v1/assessments",
        json={
            "course_id": str(course_a.id),
            "title": "Version Pinning Test",
            "type": "diagnostic",
            "questions": [{"question_id": str(q1.id), "points": 2}],
        },
        headers=hdr,
    )
    asm_id = res_create.json()["id"]
    assert res_create.json()["questions"][0]["question_version"] == 1

    # 2. Update Question in Question Bank (increments version)
    res_patch_q = client_with_db.patch(
        f"/api/v1/questions/{q1.id}",
        json={"prompt": "Updated gravitational acceleration prompt with new wording?"},
        headers=hdr,
    )
    assert res_patch_q.status_code == 200
    assert res_patch_q.json()["version"] == 2

    # 3. Fetch assessment again — its pinned version MUST remain 1
    res_asm = client_with_db.get(f"/api/v1/assessments/{asm_id}", headers=hdr)
    assert res_asm.status_code == 200
    assert res_asm.json()["questions"][0]["question_version"] == 1


def test_student_assessment_projection_secrecy(client_with_db: TestClient, seed_assessment_context):
    """AC-P5-06: Student viewing an assessment receives secure projection with zero grading keys or answers."""
    ctx = seed_assessment_context
    teacher = ctx["teacher"]
    student = ctx["student"]
    course_a = ctx["course_a"]
    q1 = ctx["q1"]
    q2 = ctx["q2"]

    # 1. Teacher publishes assessment
    t_hdr = auth_header(teacher)
    res_create = client_with_db.post(
        "/api/v1/assessments",
        json={
            "course_id": str(course_a.id),
            "title": "Student Projection Exam",
            "type": "formative",
            "questions": [
                {"question_id": str(q1.id), "points": 2},
                {"question_id": str(q2.id), "points": 3},
            ],
        },
        headers=t_hdr,
    )
    asm_id = res_create.json()["id"]
    client_with_db.post(f"/api/v1/assessments/{asm_id}/publish", headers=t_hdr)

    # 2. Student fetches assessment
    s_hdr = auth_header(student)
    res_student = client_with_db.get(f"/api/v1/assessments/{asm_id}", headers=s_hdr)
    assert res_student.status_code == 200
    student_data = res_student.json()

    assert student_data["status"] == "published"
    assert len(student_data["questions"]) == 2

    # Verify absence of secrets in student payload
    for q_item in student_data["questions"]:
        q = q_item["question"]
        assert "answer_key" not in q
        assert "correct_option_ids" not in q
        assert "correct_bool" not in q
        assert "accepted_answers" not in q
        assert "expected_rubric" not in q
        if "options" in q["payload"]:
            for opt in q["payload"]["options"]:
                assert "is_correct" not in opt
