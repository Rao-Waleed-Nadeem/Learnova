"""Automated tests for Student Enrollment, Lesson Completions, Activity, and Learning Map (SSD-01, SSD-02, SSD-03)."""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion, ResourceActivity
from app.models.resource import LearningResource
from app.models.role import Role
from app.models.topic import Topic
from app.models.topic_prerequisite import TopicPrerequisite
from app.models.user import User


@pytest.fixture
def curriculum_fixture(db_session: Session):
    """Seed published course with 2 topics and 4 lessons, plus student account."""
    role_student = db_session.query(Role).filter_by(name="student").first()
    role_teacher = db_session.query(Role).filter_by(name="teacher").first()

    student = User(
        email="learner@learnova.test",
        hashed_password=hash_password("LearnerPass123!"),
        full_name="Active Learner",
        role_id=role_student.id,
    )
    teacher = User(
        email="instructor@learnova.test",
        hashed_password=hash_password("TeacherPass123!"),
        full_name="Course Instructor",
        role_id=role_teacher.id,
    )
    db_session.add_all([student, teacher])
    db_session.flush()

    # Published course
    course = Course(title="Data Structures", status="published", creator_id=teacher.id)
    # Draft course
    draft_course = Course(title="Unreleased AI", status="draft", creator_id=teacher.id)
    db_session.add_all([course, draft_course])
    db_session.flush()

    # Topic 1: Arrays (2 lessons)
    t1 = Topic(course_id=course.id, title="Arrays", order=1)
    # Topic 2: Linked Lists (2 lessons, depends on Topic 1)
    t2 = Topic(course_id=course.id, title="Linked Lists", order=2)
    db_session.add_all([t1, t2])
    db_session.flush()

    # Prerequisite: Linked Lists depends on Arrays
    edge = TopicPrerequisite(topic_id=t2.id, prerequisite_topic_id=t1.id)
    db_session.add(edge)

    # Lessons for Topic 1
    l1 = Lesson(topic_id=t1.id, title="Array Basics", order=1)
    l2 = Lesson(topic_id=t1.id, title="Dynamic Arrays", order=2)
    # Lessons for Topic 2
    l3 = Lesson(topic_id=t2.id, title="Singly Linked List", order=1)
    l4 = Lesson(topic_id=t2.id, title="Doubly Linked List", order=2)
    db_session.add_all([l1, l2, l3, l4])
    db_session.flush()

    # Resource for Lesson 1
    r1 = LearningResource(
        lesson_id=l1.id,
        title="Arrays Video Tutorial",
        type="video",
        content_or_url="https://learnova.test/videos/arrays.mp4",
        file_size_bytes=10485760,
    )
    db_session.add(r1)
    db_session.commit()

    return {
        "student": student,
        "teacher": teacher,
        "course": course,
        "draft_course": draft_course,
        "topics": [t1, t2],
        "lessons": [l1, l2, l3, l4],
        "resource": r1,
    }


def auth_header(user: User) -> dict:
    token = create_access_token(subject=str(user.id), role=user.role.name)
    return {"Authorization": f"Bearer {token}"}


def test_student_enrollment_success(client_with_db: TestClient, curriculum_fixture):
    """AC-P4-11: Student enrolls in published course; returns 201 Created and persists enrollment."""
    ctx = curriculum_fixture
    student = ctx["student"]
    course = ctx["course"]

    res = client_with_db.post(
        f"/api/v1/courses/{course.id}/enrollments",
        headers=auth_header(student),
    )
    assert res.status_code == 201
    data = res.json()
    assert data["student_id"] == str(student.id)
    assert data["course_id"] == str(course.id)
    assert data["status"] == "active"
    assert data["progress_percent"] == 0.0
    assert data["completed_lessons_count"] == 0
    assert data["total_lessons_count"] == 4


def test_duplicate_enrollment_idempotent(client_with_db: TestClient, curriculum_fixture):
    """AC-P4-12: Duplicate enrollment call returns 200 OK with existing enrollment."""
    ctx = curriculum_fixture
    student = ctx["student"]
    course = ctx["course"]

    # First enrollment
    res1 = client_with_db.post(
        f"/api/v1/courses/{course.id}/enrollments",
        headers=auth_header(student),
    )
    assert res1.status_code == 201

    # Second enrollment (idempotent)
    res2 = client_with_db.post(
        f"/api/v1/courses/{course.id}/enrollments",
        headers=auth_header(student),
    )
    assert res2.status_code == 200
    assert res2.json()["id"] == res1.json()["id"]


def test_student_cannot_enroll_in_draft_course(client_with_db: TestClient, curriculum_fixture):
    """Students cannot enroll in draft courses (403 Forbidden)."""
    ctx = curriculum_fixture
    student = ctx["student"]
    draft = ctx["draft_course"]

    res = client_with_db.post(
        f"/api/v1/courses/{draft.id}/enrollments",
        headers=auth_header(student),
    )
    assert res.status_code == 403
    assert "published" in res.json()["detail"].lower()


def test_lesson_completion_progress_update(client_with_db: TestClient, curriculum_fixture):
    """AC-P4-13: Completing lessons updates progress percent dynamically (25%, 50%, etc.)."""
    ctx = curriculum_fixture
    student = ctx["student"]
    course = ctx["course"]
    lessons = ctx["lessons"]

    # Enroll student
    client_with_db.post(f"/api/v1/courses/{course.id}/enrollments", headers=auth_header(student))

    # Complete lesson 1 (1 / 4 = 25.0%)
    res1 = client_with_db.post(
        f"/api/v1/lessons/{lessons[0].id}/complete",
        headers=auth_header(student),
    )
    assert res1.status_code == 200
    assert res1.json()["progress_percent"] == 25.0

    # Repeat lesson 1 (idempotency check)
    res1_repeat = client_with_db.post(
        f"/api/v1/lessons/{lessons[0].id}/complete",
        headers=auth_header(student),
    )
    assert res1_repeat.status_code == 200
    assert res1_repeat.json()["progress_percent"] == 25.0

    # Complete lesson 2 (2 / 4 = 50.0%)
    res2 = client_with_db.post(
        f"/api/v1/lessons/{lessons[1].id}/complete",
        headers=auth_header(student),
    )
    assert res2.status_code == 200
    assert res2.json()["progress_percent"] == 50.0


def test_unenrolled_student_cannot_complete_lesson(client_with_db: TestClient, curriculum_fixture):
    """Completing a lesson without enrollment fails with 403 Forbidden."""
    ctx = curriculum_fixture
    student = ctx["student"]
    lessons = ctx["lessons"]

    res = client_with_db.post(
        f"/api/v1/lessons/{lessons[0].id}/complete",
        headers=auth_header(student),
    )
    assert res.status_code == 403
    assert "not enrolled" in res.json()["detail"].lower()


def test_resource_activity_logging(client_with_db: TestClient, curriculum_fixture):
    """Resource activity logs duration and event type."""
    ctx = curriculum_fixture
    student = ctx["student"]
    course = ctx["course"]
    resource = ctx["resource"]

    # Enroll
    client_with_db.post(f"/api/v1/courses/{course.id}/enrollments", headers=auth_header(student))

    res = client_with_db.post(
        f"/api/v1/resources/{resource.id}/activity",
        json={"event_type": "watch", "duration_seconds": 120},
        headers=auth_header(student),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["event_type"] == "watch"
    assert data["duration_seconds"] == 120
    assert data["student_id"] == str(student.id)


def test_learning_map_readiness(client_with_db: TestClient, curriculum_fixture):
    """AC-P4-14: Learning map evaluates readiness: Topic 1 is ready, Topic 2 is locked until Topic 1 lessons finish."""
    ctx = curriculum_fixture
    student = ctx["student"]
    course = ctx["course"]
    topics = ctx["topics"]
    lessons = ctx["lessons"]

    # Enroll
    client_with_db.post(f"/api/v1/courses/{course.id}/enrollments", headers=auth_header(student))

    # Initial state: Topic 1 (no prereqs) is "ready"; Topic 2 (prereq Topic 1) is "locked"
    res_map1 = client_with_db.get(
        f"/api/v1/courses/{course.id}/learning-map",
        headers=auth_header(student),
    )
    assert res_map1.status_code == 200
    nodes1 = {n["title"]: n for n in res_map1.json()["nodes"]}
    assert nodes1["Arrays"]["readiness"] == "ready"
    assert nodes1["Linked Lists"]["readiness"] == "locked"
    assert str(topics[0].id) in nodes1["Linked Lists"]["unmet_prerequisites"]

    # Complete 1 lesson of Arrays: Arrays becomes "in_progress"
    client_with_db.post(f"/api/v1/lessons/{lessons[0].id}/complete", headers=auth_header(student))
    res_map2 = client_with_db.get(
        f"/api/v1/courses/{course.id}/learning-map",
        headers=auth_header(student),
    )
    nodes2 = {n["title"]: n for n in res_map2.json()["nodes"]}
    assert nodes2["Arrays"]["readiness"] == "in_progress"
    assert nodes2["Linked Lists"]["readiness"] == "locked"

    # Complete 2nd lesson of Arrays: Arrays is finished, Linked Lists unlocks to "ready"
    client_with_db.post(f"/api/v1/lessons/{lessons[1].id}/complete", headers=auth_header(student))
    res_map3 = client_with_db.get(
        f"/api/v1/courses/{course.id}/learning-map",
        headers=auth_header(student),
    )
    nodes3 = {n["title"]: n for n in res_map3.json()["nodes"]}
    assert nodes3["Arrays"]["readiness"] == "ready"
    assert nodes3["Arrays"]["completed_lessons_count"] == 2
    assert nodes3["Linked Lists"]["readiness"] == "ready"
    assert nodes3["Linked Lists"]["unmet_prerequisites"] == []


def test_my_enrollments_endpoint(client_with_db: TestClient, curriculum_fixture):
    """GET /api/v1/students/me/enrollments returns student's active enrollments with progress."""
    ctx = curriculum_fixture
    student = ctx["student"]
    course = ctx["course"]
    lessons = ctx["lessons"]

    # Enroll and complete 1 lesson
    client_with_db.post(f"/api/v1/courses/{course.id}/enrollments", headers=auth_header(student))
    client_with_db.post(f"/api/v1/lessons/{lessons[0].id}/complete", headers=auth_header(student))

    res = client_with_db.get("/api/v1/students/me/enrollments", headers=auth_header(student))
    assert res.status_code == 200
    enrs = res.json()
    assert len(enrs) == 1
    assert enrs[0]["course_title"] == "Data Structures"
    assert enrs[0]["progress_percent"] == 25.0
    assert enrs[0]["completed_lessons_count"] == 1
    assert enrs[0]["total_lessons_count"] == 4
