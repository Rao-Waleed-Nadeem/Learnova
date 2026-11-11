"""Unit and integration tests for Teacher Reporting and Class Analytics (Phase 10)."""

import uuid
from decimal import Decimal
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.attempt import AssessmentAttempt
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.enrollment import Enrollment
from app.models.mastery import StudentTopicMastery
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User
from app.services.auth_service import create_access_token


@pytest.fixture
def teacher_auth_fixture(client_with_db: TestClient, db_session: Session) -> Dict:
    """Fixture setting up assigned teacher, unassigned teacher, admin, enrolled student, and courses."""
    teacher_role = db_session.query(Role).filter_by(name="teacher").first()
    admin_role = db_session.query(Role).filter_by(name="administrator").first()
    student_role = db_session.query(Role).filter_by(name="student").first()

    assigned_teacher = User(
        email=f"assigned_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw",
        full_name="Prof. Assigned",
        role_id=teacher_role.id,
        is_active=True,
    )
    unassigned_teacher = User(
        email=f"unassigned_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw",
        full_name="Prof. Unassigned",
        role_id=teacher_role.id,
        is_active=True,
    )
    admin = User(
        email=f"admin_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw",
        full_name="System Admin",
        role_id=admin_role.id,
        is_active=True,
    )
    student1 = User(
        email=f"student1_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw",
        full_name="Student One",
        role_id=student_role.id,
        is_active=True,
    )
    student2 = User(
        email=f"student2_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw",
        full_name="Student Two",
        role_id=student_role.id,
        is_active=True,
    )
    db_session.add_all([assigned_teacher, unassigned_teacher, admin, student1, student2])
    db_session.commit()

    token_assigned = create_access_token(str(assigned_teacher.id), role="teacher")
    token_unassigned = create_access_token(str(unassigned_teacher.id), role="teacher")
    token_admin = create_access_token(str(admin.id), role="administrator")
    token_student = create_access_token(str(student1.id), role="student")

    # Course
    course = Course(
        title="Distributed Systems",
        description="Consensus and fault tolerance",
        status="published",
    )
    db_session.add(course)
    db_session.commit()

    # Assign teacher to course
    ct = CourseTeacher(
        course_id=course.id,
        teacher_id=assigned_teacher.id,
    )
    db_session.add(ct)
    db_session.commit()

    # Topics: Topic A (threshold 80%), Topic B (threshold 70%)
    topic_a = Topic(
        course_id=course.id,
        title="Paxos & Raft",
        order=1,
        mastery_threshold=Decimal("0.80"),
    )
    topic_b = Topic(
        course_id=course.id,
        title="Vector Clocks",
        order=2,
        mastery_threshold=Decimal("0.70"),
    )
    db_session.add_all([topic_a, topic_b])
    db_session.commit()

    # Enroll student 1 in course (student 2 is not enrolled)
    enrollment1 = Enrollment(
        student_id=student1.id,
        course_id=course.id,
        status="active",
    )
    db_session.add(enrollment1)
    db_session.flush()

    # Student 1 topic masteries:
    # Topic A: 85% -> mastered (threshold 80 -> not weak)
    # Topic B: 55% -> developing (threshold 70 -> WEAK)
    stm_a = StudentTopicMastery(
        student_id=student1.id,
        course_id=course.id,
        topic_id=topic_a.id,
        mastery_score=Decimal("0.8500"),
        score_percent=85,
        status="mastered",
    )
    stm_b = StudentTopicMastery(
        student_id=student1.id,
        course_id=course.id,
        topic_id=topic_b.id,
        mastery_score=Decimal("0.5500"),
        score_percent=55,
        status="developing",
    )
    db_session.add_all([stm_a, stm_b])
    db_session.commit()

    # Assessment & attempt
    assessment = Assessment(
        course_id=course.id,
        topic_id=topic_a.id,
        title="Consensus Quiz",
        type="formative",
        status="published",
        passing_score_percent=70,
        total_points=100,
    )
    db_session.add(assessment)
    db_session.commit()

    attempt = AssessmentAttempt(
        assessment_id=assessment.id,
        student_id=student1.id,
        enrollment_id=enrollment1.id,
        attempt_number=1,
        status="graded",
        score_percent=Decimal("85.00"),
        score=Decimal("85.00"),
        max_score=100,
    )
    db_session.add(attempt)
    db_session.commit()

    return {
        "client": client_with_db,
        "db": db_session,
        "assigned_teacher": assigned_teacher,
        "unassigned_teacher": unassigned_teacher,
        "admin": admin,
        "student1": student1,
        "student2": student2,
        "course": course,
        "enrollment1": enrollment1,
        "topic_a": topic_a,
        "topic_b": topic_b,
        "assessment": assessment,
        "attempt": attempt,
        "token_assigned": token_assigned,
        "token_unassigned": token_unassigned,
        "token_admin": token_admin,
        "token_student": token_student,
    }


def test_assigned_teacher_can_access_dashboard(teacher_auth_fixture: Dict):
    """Assigned teacher accesses /teacher/dashboard and sees assigned courses."""
    client = teacher_auth_fixture["client"]
    course = teacher_auth_fixture["course"]
    headers = {"Authorization": f"Bearer {teacher_auth_fixture['token_assigned']}"}

    res = client.get("/api/v1/teacher/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["assigned_courses"]) >= 1
    assert data["total_students_reach"] >= 1
    assert any(c["course_id"] == str(course.id) for c in data["assigned_courses"])


def test_unassigned_teacher_forbidden_from_course_analytics(teacher_auth_fixture: Dict):
    """Teacher not assigned in course_teachers receives 403 Forbidden (DEC-P10-001)."""
    client = teacher_auth_fixture["client"]
    course = teacher_auth_fixture["course"]
    headers = {"Authorization": f"Bearer {teacher_auth_fixture['token_unassigned']}"}

    res = client.get(f"/api/v1/teacher/courses/{course.id}/analytics", headers=headers)
    assert res.status_code == 403
    assert "not authorized" in res.json()["detail"].lower()


def test_admin_can_access_any_course_analytics(teacher_auth_fixture: Dict):
    """System administrator can inspect any course analytics regardless of course_teachers assignment."""
    client = teacher_auth_fixture["client"]
    course = teacher_auth_fixture["course"]
    headers = {"Authorization": f"Bearer {teacher_auth_fixture['token_admin']}"}

    res = client.get(f"/api/v1/teacher/courses/{course.id}/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["course_id"] == str(course.id)


def test_class_mastery_heatmap_distribution(teacher_auth_fixture: Dict):
    """Class analytics returns per-topic mastery heatmap distribution with accurate bucket counts."""
    client = teacher_auth_fixture["client"]
    course = teacher_auth_fixture["course"]
    topic_a = teacher_auth_fixture["topic_a"]
    topic_b = teacher_auth_fixture["topic_b"]
    headers = {"Authorization": f"Bearer {teacher_auth_fixture['token_assigned']}"}

    res = client.get(f"/api/v1/teacher/courses/{course.id}/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()

    dist = {d["topic_id"]: d for d in data["topic_mastery_distribution"]}
    assert str(topic_a.id) in dist
    assert str(topic_b.id) in dist

    # Topic A: 1 mastered
    assert dist[str(topic_a.id)]["mastered_count"] == 1
    assert dist[str(topic_a.id)]["developing_count"] == 0
    assert dist[str(topic_a.id)]["threshold"] == 80
    assert dist[str(topic_a.id)]["is_class_weak"] is False

    # Topic B: 1 developing (55% < 70% threshold -> weak)
    assert dist[str(topic_b.id)]["mastered_count"] == 0
    assert dist[str(topic_b.id)]["developing_count"] == 1
    assert dist[str(topic_b.id)]["threshold"] == 70
    assert dist[str(topic_b.id)]["is_class_weak"] is True


def test_class_weak_concepts_detection(teacher_auth_fixture: Dict):
    """Weak concepts list only contains topics with average mastery < dynamic threshold."""
    client = teacher_auth_fixture["client"]
    course = teacher_auth_fixture["course"]
    topic_b = teacher_auth_fixture["topic_b"]
    headers = {"Authorization": f"Bearer {teacher_auth_fixture['token_assigned']}"}

    res = client.get(f"/api/v1/teacher/courses/{course.id}/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()

    weak = data["weak_concepts"]
    assert len(weak) == 1
    assert weak[0]["topic_id"] == str(topic_b.id)
    assert weak[0]["threshold"] == 70
    assert weak[0]["is_class_weak"] is True


def test_assessment_score_distribution_bands(teacher_auth_fixture: Dict):
    """Course score distribution bands strictly tally completed attempts into 0-49, 50-69, 70-84, 85-100."""
    client = teacher_auth_fixture["client"]
    course = teacher_auth_fixture["course"]
    headers = {"Authorization": f"Bearer {teacher_auth_fixture['token_assigned']}"}

    res = client.get(f"/api/v1/teacher/courses/{course.id}/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()

    bands = data["score_distribution"]
    # Attempt had score_percent 85 -> falls in 85-100%
    assert bands["85-100%"] == 1
    assert bands["70-84%"] == 0
    assert bands["50-69%"] == 0
    assert bands["0-49%"] == 0


def test_teacher_student_drilldown_enforces_enrollment(teacher_auth_fixture: Dict):
    """Drilldown on a student not enrolled in this course returns 404 (isolation)."""
    client = teacher_auth_fixture["client"]
    course = teacher_auth_fixture["course"]
    student2 = teacher_auth_fixture["student2"]  # unenrolled
    headers = {"Authorization": f"Bearer {teacher_auth_fixture['token_assigned']}"}

    res = client.get(
        f"/api/v1/teacher/courses/{course.id}/students/{student2.id}/analytics",
        headers=headers,
    )
    assert res.status_code == 404
    assert "enrolled" in res.json()["detail"].lower()


def test_teacher_student_drilldown_success(teacher_auth_fixture: Dict):
    """Assigned teacher can inspect enrolled student's course mastery drilldown."""
    client = teacher_auth_fixture["client"]
    course = teacher_auth_fixture["course"]
    student1 = teacher_auth_fixture["student1"]
    headers = {"Authorization": f"Bearer {teacher_auth_fixture['token_assigned']}"}

    res = client.get(
        f"/api/v1/teacher/courses/{course.id}/students/{student1.id}/analytics",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == str(student1.id)
    assert data["course_id"] == str(course.id)
    assert len(data["topic_masteries"]) == 2
    assert len(data["weak_topics"]) == 1


def test_teacher_student_attempts_list_and_pagination(teacher_auth_fixture: Dict):
    """Assigned teacher can list and paginate enrolled student's attempts in this course."""
    client = teacher_auth_fixture["client"]
    course = teacher_auth_fixture["course"]
    student1 = teacher_auth_fixture["student1"]
    headers = {"Authorization": f"Bearer {teacher_auth_fixture['token_assigned']}"}

    res = client.get(
        f"/api/v1/teacher/courses/{course.id}/students/{student1.id}/attempts?limit=10&offset=0",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["score_percent"] == 85.0


def test_student_role_forbidden_from_teacher_analytics(teacher_auth_fixture: Dict):
    """Student role is strictly forbidden (403) from accessing teacher endpoints."""
    client = teacher_auth_fixture["client"]
    course = teacher_auth_fixture["course"]
    headers = {"Authorization": f"Bearer {teacher_auth_fixture['token_student']}"}

    res1 = client.get("/api/v1/teacher/dashboard", headers=headers)
    assert res1.status_code == 403

    res2 = client.get(f"/api/v1/teacher/courses/{course.id}/analytics", headers=headers)
    assert res2.status_code == 403
