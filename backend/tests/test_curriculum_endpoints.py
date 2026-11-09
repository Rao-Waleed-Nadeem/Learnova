"""Automated tests for Course Catalog, Hierarchy, Teacher Scoping, and Publication Gates (SSD-01, SSD-07)."""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.lesson import Lesson
from app.models.resource import LearningResource
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User


@pytest.fixture
def seed_test_users(db_session: Session):
    """Seed test accounts for admin, teacher1, teacher2, and student."""
    role_admin = db_session.query(Role).filter_by(name="administrator").first()
    role_teacher = db_session.query(Role).filter_by(name="teacher").first()
    role_student = db_session.query(Role).filter_by(name="student").first()

    admin = User(
        email="admin@learnova.test",
        hashed_password=hash_password("AdminPass123!"),
        full_name="Admin User",
        role_id=role_admin.id,
    )
    teacher1 = User(
        email="teacher1@learnova.test",
        hashed_password=hash_password("Teacher1Pass123!"),
        full_name="Teacher One",
        role_id=role_teacher.id,
    )
    teacher2 = User(
        email="teacher2@learnova.test",
        hashed_password=hash_password("Teacher2Pass123!"),
        full_name="Teacher Two",
        role_id=role_teacher.id,
    )
    student = User(
        email="student@learnova.test",
        hashed_password=hash_password("StudentPass123!"),
        full_name="Student Learner",
        role_id=role_student.id,
    )
    db_session.add_all([admin, teacher1, teacher2, student])
    db_session.commit()

    return {
        "admin": admin,
        "teacher1": teacher1,
        "teacher2": teacher2,
        "student": student,
    }


def auth_header(user: User) -> dict:
    """Generate authorization header with valid JWT."""
    token = create_access_token(subject=str(user.id), role=user.role.name)
    return {"Authorization": f"Bearer {token}"}


def test_catalog_filters_draft_courses(client_with_db: TestClient, db_session: Session, seed_test_users):
    """AC-P4-01: Public and student catalog lists only published courses."""
    users = seed_test_users
    teacher = users["teacher1"]
    student = users["student"]

    # Create one draft course and one published course
    c_draft = Course(title="Draft Course", status="draft", creator_id=teacher.id)
    c_pub = Course(title="Published Course", status="published", creator_id=teacher.id)
    db_session.add_all([c_draft, c_pub])
    db_session.commit()

    # Unauthenticated visitor
    res_pub = client_with_db.get("/api/v1/courses")
    assert res_pub.status_code == 200
    titles = [c["title"] for c in res_pub.json()]
    assert "Published Course" in titles
    assert "Draft Course" not in titles

    # Student visitor
    res_student = client_with_db.get("/api/v1/courses", headers=auth_header(student))
    assert res_student.status_code == 200
    student_titles = [c["title"] for c in res_student.json()]
    assert "Published Course" in student_titles
    assert "Draft Course" not in student_titles


def test_teacher_views_own_draft_courses(client_with_db: TestClient, db_session: Session, seed_test_users):
    """AC-P4-02: Teachers view their assigned/created draft courses and published courses."""
    users = seed_test_users
    teacher1 = users["teacher1"]
    teacher2 = users["teacher2"]

    c1 = Course(title="Teacher1 Draft", status="draft", creator_id=teacher1.id)
    c2 = Course(title="Teacher2 Draft", status="draft", creator_id=teacher2.id)
    c_pub = Course(title="Shared Published", status="published", creator_id=teacher2.id)
    db_session.add_all([c1, c2, c_pub])
    db_session.commit()

    # Teacher1 view
    res = client_with_db.get("/api/v1/courses", headers=auth_header(teacher1))
    assert res.status_code == 200
    titles = [c["title"] for c in res.json()]
    assert "Teacher1 Draft" in titles
    assert "Shared Published" in titles
    assert "Teacher2 Draft" not in titles


def test_admin_views_all_courses(client_with_db: TestClient, db_session: Session, seed_test_users):
    """Admins view all courses regardless of status or assignment."""
    users = seed_test_users
    admin = users["admin"]
    teacher1 = users["teacher1"]

    c1 = Course(title="Admin Course Draft", status="draft", creator_id=teacher1.id)
    c2 = Course(title="Admin Course Published", status="published", creator_id=teacher1.id)
    db_session.add_all([c1, c2])
    db_session.commit()

    res = client_with_db.get("/api/v1/courses", headers=auth_header(admin))
    assert res.status_code == 200
    titles = [c["title"] for c in res.json()]
    assert "Admin Course Draft" in titles
    assert "Admin Course Published" in titles


def test_student_forbidden_from_curriculum_crud(client_with_db: TestClient, seed_test_users):
    """AC-P4-05: Students are strictly forbidden from creating courses."""
    student = seed_test_users["student"]
    res = client_with_db.post(
        "/api/v1/courses",
        json={"title": "Hacker Course", "description": "Student created"},
        headers=auth_header(student),
    )
    assert res.status_code == 403


def test_get_course_hierarchy(client_with_db: TestClient, db_session: Session, seed_test_users):
    """AC-P4-03: Full syllabus hierarchy with synthesized course_id on lesson and resource."""
    teacher = seed_test_users["teacher1"]

    course = Course(title="Full Stack Python", status="published", creator_id=teacher.id)
    db_session.add(course)
    db_session.flush()

    topic = Topic(course_id=course.id, title="Basics", order=1)
    db_session.add(topic)
    db_session.flush()

    lesson = Lesson(topic_id=topic.id, title="Intro Lesson", order=1)
    db_session.add(lesson)
    db_session.flush()

    resource = LearningResource(
        lesson_id=lesson.id,
        title="Python Cheat Sheet",
        type="document",
        content_or_url="https://learnova.test/docs/python.pdf",
    )
    db_session.add(resource)
    db_session.commit()

    res = client_with_db.get(f"/api/v1/courses/{course.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Full Stack Python"
    assert len(data["topics"]) == 1
    t = data["topics"][0]
    assert t["title"] == "Basics"
    assert len(t["lessons"]) == 1
    l = t["lessons"][0]
    assert l["title"] == "Intro Lesson"
    assert l["course_id"] == str(course.id)  # synthesized
    assert len(l["resources"]) == 1
    r = l["resources"][0]
    assert r["title"] == "Python Cheat Sheet"
    assert r["course_id"] == str(course.id)  # synthesized


def test_teacher_cannot_edit_unassigned_course(client_with_db: TestClient, db_session: Session, seed_test_users):
    """AC-P4-04: Teacher cannot mutate an unassigned course."""
    teacher1 = seed_test_users["teacher1"]
    teacher2 = seed_test_users["teacher2"]

    course = Course(title="Teacher1 Only Course", status="draft", creator_id=teacher1.id)
    db_session.add(course)
    db_session.commit()

    # Teacher2 attempts to update Teacher1's course
    res = client_with_db.patch(
        f"/api/v1/courses/{course.id}",
        json={"title": "Hacked Title"},
        headers=auth_header(teacher2),
    )
    assert res.status_code == 403


def test_publish_empty_course_rejected(client_with_db: TestClient, db_session: Session, seed_test_users):
    """AC-P4-06: Publishing an empty course (0 topics) is rejected with 422."""
    teacher = seed_test_users["teacher1"]
    course = Course(title="Empty Course", status="draft", creator_id=teacher.id)
    db_session.add(course)
    db_session.commit()

    res = client_with_db.post(f"/api/v1/courses/{course.id}/publish", headers=auth_header(teacher))
    assert res.status_code == 422
    assert "at least one topic" in res.json()["detail"].lower()


def test_publish_course_with_empty_topic_rejected(client_with_db: TestClient, db_session: Session, seed_test_users):
    """AC-P4-07: Publishing a course where topic has 0 lessons is rejected with 422."""
    teacher = seed_test_users["teacher1"]
    course = Course(title="Incomplete Course", status="draft", creator_id=teacher.id)
    db_session.add(course)
    db_session.flush()

    topic = Topic(course_id=course.id, title="Empty Topic", order=1)
    db_session.add(topic)
    db_session.commit()

    res = client_with_db.post(f"/api/v1/courses/{course.id}/publish", headers=auth_header(teacher))
    assert res.status_code == 422
    assert "has no lessons" in res.json()["detail"].lower()


def test_publish_valid_course_success(client_with_db: TestClient, db_session: Session, seed_test_users):
    """Valid course with topics and lessons transitions to published successfully."""
    teacher = seed_test_users["teacher1"]
    course = Course(title="Ready Course", status="draft", creator_id=teacher.id)
    db_session.add(course)
    db_session.flush()

    topic = Topic(course_id=course.id, title="Module 1", order=1)
    db_session.add(topic)
    db_session.flush()

    lesson = Lesson(topic_id=topic.id, title="Lesson 1", order=1)
    db_session.add(lesson)
    db_session.commit()

    res = client_with_db.post(f"/api/v1/courses/{course.id}/publish", headers=auth_header(teacher))
    assert res.status_code == 200
    assert res.json()["status"] == "published"
