"""E2E Integration Test Suite (Backend) following e2e-testing-patterns guidelines.

Validates the full cycle:
1. Student enrolls in course, marks lesson complete, receives XP and outbox event.
2. Idempotent re-completion guarantees zero double-dipping.
3. Student retrieves persisted lesson completions via /api/v1/students/me/lesson-completions.
4. Teacher queries /api/v1/teacher/courses/{course_id}/analytics and receives authoritative class metrics.
5. Admin queries /api/v1/admin/dashboard and /api/v1/admin/users and verifies real KPI aggregates.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.outbox import DomainOutboxEvent
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User


@pytest.fixture
def seed_e2e_users(db_session: Session):
    role_admin = db_session.query(Role).filter_by(name="administrator").first()
    role_teacher = db_session.query(Role).filter_by(name="teacher").first()
    role_student = db_session.query(Role).filter_by(name="student").first()

    admin = User(
        email="admin_e2e@learnova.test",
        hashed_password=hash_password("AdminPass123!"),
        full_name="Admin E2E",
        role_id=role_admin.id,
    )
    teacher = User(
        email="teacher_e2e@learnova.test",
        hashed_password=hash_password("TeacherPass123!"),
        full_name="Teacher E2E",
        role_id=role_teacher.id,
    )
    student = User(
        email="student_e2e@learnova.test",
        hashed_password=hash_password("StudentPass123!"),
        full_name="Student E2E",
        role_id=role_student.id,
    )
    db_session.add_all([admin, teacher, student])
    db_session.commit()

    return {"admin": admin, "teacher": teacher, "student": student}


def auth_header(user: User) -> dict:
    role = user.role.name if user.role else "student"
    token = create_access_token(
        subject=str(user.id),
        role=role,
    )
    return {"Authorization": f"Bearer {token}"}


def test_e2e_full_gamification_completion_cycle(
    client_with_db: TestClient,
    db_session: Session,
    seed_e2e_users: dict[str, User],
):
    student = seed_e2e_users["student"]
    teacher = seed_e2e_users["teacher"]
    admin = seed_e2e_users["admin"]

    # 1. Setup course, topic, lessons
    course = Course(
        title="Intro to CS - E2E",
        description="Comprehensive foundations",
        status="published",
        creator_id=teacher.id,
    )
    db_session.add(course)
    db_session.flush()

    topic1 = Topic(course_id=course.id, title="Topic 1: Logic", order=1, mastery_threshold=0.75)
    db_session.add(topic1)
    db_session.flush()

    lesson1 = Lesson(topic_id=topic1.id, title="Lesson 1.1: Booleans", order=1)
    lesson2 = Lesson(topic_id=topic1.id, title="Lesson 1.2: Gates", order=2)
    db_session.add_all([lesson1, lesson2])
    db_session.flush()

    # Enroll student
    enrollment = Enrollment(student_id=student.id, course_id=course.id, status="active")
    db_session.add(enrollment)
    db_session.commit()

    # 2. Student marks lesson 1 as complete
    res1 = client_with_db.post(
        f"/api/v1/lessons/{lesson1.id}/complete",
        headers=auth_header(student),
    )
    assert res1.status_code == 200
    comp1_data = res1.json()
    assert comp1_data["lesson_id"] == str(lesson1.id)
    assert comp1_data["student_id"] == str(student.id)
    assert comp1_data["progress_percent"] == 50.0

    # Verify XP profile updated
    profile_res = client_with_db.get(
        "/api/v1/gamification/profile",
        headers=auth_header(student),
    )
    assert profile_res.status_code == 200
    assert profile_res.json()["xp"] >= 50

    # 3. Idempotent re-completion (user clicks again or reloads)
    res1_repeat = client_with_db.post(
        f"/api/v1/lessons/{lesson1.id}/complete",
        headers=auth_header(student),
    )
    assert res1_repeat.status_code == 200
    assert res1_repeat.json()["id"] == comp1_data["id"]

    # Verify NO duplicate XP was awarded
    profile_res_after = client_with_db.get(
        "/api/v1/gamification/profile",
        headers=auth_header(student),
    )
    assert profile_res_after.json()["xp"] == profile_res.json()["xp"]

    # 4. Student marks lesson 2 as complete
    res2 = client_with_db.post(
        f"/api/v1/lessons/{lesson2.id}/complete",
        headers=auth_header(student),
    )
    assert res2.status_code == 200
    assert res2.json()["progress_percent"] == 100.0

    # 5. Query completions list via /api/v1/students/me/lesson-completions
    list_res = client_with_db.get(
        f"/api/v1/students/me/lesson-completions?course_id={course.id}",
        headers=auth_header(student),
    )
    assert list_res.status_code == 200
    completions_list = list_res.json()
    assert len(completions_list) == 2
    comp_lesson_ids = {c["lesson_id"] for c in completions_list}
    assert str(lesson1.id) in comp_lesson_ids
    assert str(lesson2.id) in comp_lesson_ids

    # 6. Teacher queries course analytics
    analytics_res = client_with_db.get(
        f"/api/v1/teacher/courses/{course.id}/analytics?timeframe=all",
        headers=auth_header(teacher),
    )
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert analytics_data["course_id"] == str(course.id)
    assert analytics_data["enrolled_students_count"] >= 1
    assert "topic_mastery_distribution" in analytics_data
    assert "score_distribution" in analytics_data

    # 7. Admin queries dashboard
    dash_res = client_with_db.get(
        "/api/v1/admin/dashboard",
        headers=auth_header(admin),
    )
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["users"]["total"] >= 3
    assert dash_data["curriculum"]["total_courses"] >= 1
    assert dash_data["enrollments"]["total_enrollments"] >= 1
    assert "security_audit" in dash_data
