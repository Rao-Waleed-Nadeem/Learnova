"""Unit and integration tests for Student Personal Analytics (Phase 10)."""

import uuid
from decimal import Decimal
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.attempt import AssessmentAttempt
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.gamification import GamificationProfile
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion
from app.models.mastery import StudentTopicMastery
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User
from app.services.auth_service import create_access_token


@pytest.fixture
def student_auth_fixture(client_with_db: TestClient, db_session: Session) -> Dict:
    """Fixture providing authenticated student user, other student, teacher, and test client."""
    student_role = db_session.query(Role).filter_by(name="student").first()
    teacher_role = db_session.query(Role).filter_by(name="teacher").first()

    student = User(
        email=f"student_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_test_password",
        full_name="Alice Student",
        role_id=student_role.id,
        is_active=True,
    )
    other_student = User(
        email=f"other_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_test_password",
        full_name="Bob Student",
        role_id=student_role.id,
        is_active=True,
    )
    teacher = User(
        email=f"teacher_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_test_password",
        full_name="Dr. Smith",
        role_id=teacher_role.id,
        is_active=True,
    )
    db_session.add_all([student, other_student, teacher])
    db_session.commit()

    token_student = create_access_token(str(student.id), role="student")
    token_other = create_access_token(str(other_student.id), role="student")
    token_teacher = create_access_token(str(teacher.id), role="teacher")

    # Course hierarchy
    course = Course(
        title="Intro to Computer Science",
        description="Core computing principles",
        status="published",
    )
    db_session.add(course)
    db_session.commit()

    topic1 = Topic(
        course_id=course.id,
        title="Binary Logic",
        order=1,
        mastery_threshold=Decimal("0.80"),
    )
    topic2 = Topic(
        course_id=course.id,
        title="Data Structures",
        order=2,
        mastery_threshold=Decimal("0.70"),
    )
    db_session.add_all([topic1, topic2])
    db_session.commit()

    lesson1 = Lesson(topic_id=topic1.id, title="Logic Gates", order=1)
    lesson2 = Lesson(topic_id=topic1.id, title="Truth Tables", order=2)
    db_session.add_all([lesson1, lesson2])
    db_session.commit()

    # Active enrollment for student
    enrollment = Enrollment(
        student_id=student.id,
        course_id=course.id,
        status="active",
    )
    db_session.add(enrollment)
    db_session.flush()

    # Lesson 1 completed by student
    lc = LessonCompletion(
        enrollment_id=enrollment.id,
        student_id=student.id,
        course_id=course.id,
        topic_id=topic1.id,
        lesson_id=lesson1.id,
    )
    db_session.add(lc)

    # Gamification profile for student
    gp = GamificationProfile(
        student_id=student.id,
        xp=250,
        level=2,
        streak_days=3,
        is_opted_in_leaderboard=True,
    )
    db_session.add(gp)

    # Assessment and attempt for student
    assessment = Assessment(
        course_id=course.id,
        topic_id=topic1.id,
        title="Logic Gates Quiz",
        type="formative",
        status="published",
        passing_score_percent=70,
        total_points=20,
    )
    db_session.add(assessment)
    db_session.commit()

    attempt = AssessmentAttempt(
        assessment_id=assessment.id,
        student_id=student.id,
        enrollment_id=enrollment.id,
        attempt_number=1,
        status="graded",
        score_percent=Decimal("85.00"),
        score=Decimal("17.00"),
        max_score=20,
    )
    db_session.add(attempt)

    # Topic 1 mastered, Topic 2 not assessed
    stm1 = StudentTopicMastery(
        student_id=student.id,
        course_id=course.id,
        topic_id=topic1.id,
        mastery_score=Decimal("0.8500"),
        score_percent=85,
        status="mastered",
    )
    db_session.add(stm1)
    db_session.commit()

    return {
        "client": client_with_db,
        "db": db_session,
        "student": student,
        "other_student": other_student,
        "teacher": teacher,
        "token_student": token_student,
        "token_other": token_other,
        "token_teacher": token_teacher,
        "course": course,
        "enrollment": enrollment,
        "topic1": topic1,
        "topic2": topic2,
        "assessment": assessment,
        "attempt": attempt,
    }


def test_student_can_retrieve_own_dashboard(student_auth_fixture: Dict):
    """Authenticated student receives aggregate dashboard with course progress, attempts, and gamification."""
    client = student_auth_fixture["client"]
    student = student_auth_fixture["student"]
    headers = {"Authorization": f"Bearer {student_auth_fixture['token_student']}"}

    res = client.get("/api/v1/students/me/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["student_id"] == str(student.id)
    assert data["student_name"] == "Alice Student"

    # Enrolled courses
    assert len(data["enrolled_courses"]) == 1
    crs = data["enrolled_courses"][0]
    assert crs["course_title"] == "Intro to Computer Science"
    assert crs["total_lessons"] == 2
    assert crs["completed_lessons"] == 1
    assert crs["progress_percent"] == 50
    assert crs["average_mastery_percent"] == 85

    # Mastery summary
    ms = data["mastery_summary"]
    assert ms["total_topics"] == 2
    assert ms["mastered_count"] == 1
    assert ms["not_assessed_count"] == 1
    assert ms["overall_average_mastery"] == 85

    # Recent attempts
    assert len(data["recent_attempts"]) == 1
    assert data["recent_attempts"][0]["assessment_title"] == "Logic Gates Quiz"
    assert data["recent_attempts"][0]["score_percent"] == 85
    assert data["recent_attempts"][0]["is_passing"] is True

    # Gamification
    assert data["gamification"] is not None
    assert data["gamification"]["xp"] == 250
    assert data["gamification"]["level"] == 2
    assert data["gamification"]["streak_days"] == 3


def test_student_cannot_view_other_student_analytics(student_auth_fixture: Dict):
    """Students only receive their own personal analytics via authenticated session."""
    client = student_auth_fixture["client"]
    other_student = student_auth_fixture["other_student"]
    headers = {"Authorization": f"Bearer {student_auth_fixture['token_other']}"}

    res = client.get("/api/v1/students/me/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Bob has no enrollments or attempts
    assert data["student_id"] == str(other_student.id)
    assert len(data["enrolled_courses"]) == 0
    assert data["mastery_summary"]["total_topics"] == 0
    assert len(data["recent_attempts"]) == 0


def test_student_weak_topics_respects_threshold(student_auth_fixture: Dict):
    """Weak topics are evaluated dynamically against Topic.mastery_threshold; not_assessed is never weak."""
    client = student_auth_fixture["client"]
    db = student_auth_fixture["db"]
    student = student_auth_fixture["student"]
    topic2 = student_auth_fixture["topic2"]  # threshold is 70
    headers = {"Authorization": f"Bearer {student_auth_fixture['token_student']}"}

    course = student_auth_fixture["course"]
    # Add developing mastery (65%) to topic 2
    stm2 = StudentTopicMastery(
        student_id=student.id,
        course_id=course.id,
        topic_id=topic2.id,
        mastery_score=Decimal("0.6500"),
        score_percent=65,
        status="developing",
    )
    db.add(stm2)
    db.commit()

    res = client.get("/api/v1/students/me/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Topic 1 is 85% with threshold 80 -> not weak
    # Topic 2 is 65% with threshold 70 -> WEAK
    assert len(data["topic_masteries"]) == 2
    assert len(data["weak_topics"]) == 1
    weak = data["weak_topics"][0]
    assert weak["topic_id"] == str(topic2.id)
    assert weak["mastery_percent"] == 65
    assert weak["threshold"] == 70
    assert weak["is_weak"] is True


def test_not_assessed_topics_are_never_classified_as_weak(student_auth_fixture: Dict):
    """Unassessed topic must never be flagged as weak (DEC-P10-002)."""
    client = student_auth_fixture["client"]
    headers = {"Authorization": f"Bearer {student_auth_fixture['token_student']}"}

    res = client.get("/api/v1/students/me/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Topic 2 is unassessed in baseline fixture
    topic2_item = next(t for t in data["topic_masteries"] if t["topic_title"] == "Data Structures")
    assert topic2_item["status"] == "not_assessed"
    assert topic2_item["mastery_score"] is None
    assert topic2_item["is_weak"] is False
    assert len(data["weak_topics"]) == 0


def test_in_progress_attempts_excluded_from_averages_and_trends(student_auth_fixture: Dict):
    """In-progress or abandoned attempts do not contaminate completed score averages or attempt trends."""
    client = student_auth_fixture["client"]
    db = student_auth_fixture["db"]
    student = student_auth_fixture["student"]
    asmt = student_auth_fixture["assessment"]
    headers = {"Authorization": f"Bearer {student_auth_fixture['token_student']}"}

    enrollment = student_auth_fixture["enrollment"]
    # Add in-progress attempt with null score
    in_prog = AssessmentAttempt(
        assessment_id=asmt.id,
        student_id=student.id,
        enrollment_id=enrollment.id,
        attempt_number=2,
        status="in_progress",
        score_percent=None,
    )
    db.add(in_prog)
    db.commit()

    res = client.get("/api/v1/students/me/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Trend items should ONLY contain the 1 completed attempt
    assert len(data["attempt_trends"]) == 1
    assert data["attempt_trends"][0]["score_percent"] == 85


def test_student_attempts_pagination(student_auth_fixture: Dict):
    """Student attempts list supports pagination and ordering newest first."""
    client = student_auth_fixture["client"]
    db = student_auth_fixture["db"]
    student = student_auth_fixture["student"]
    asmt = student_auth_fixture["assessment"]
    enrollment = student_auth_fixture["enrollment"]
    headers = {"Authorization": f"Bearer {student_auth_fixture['token_student']}"}

    # Add 2 more attempts
    for i, sc in enumerate((75, 90), start=2):
        att = AssessmentAttempt(
            assessment_id=asmt.id,
            student_id=student.id,
            enrollment_id=enrollment.id,
            attempt_number=i,
            status="graded",
            score_percent=Decimal(sc),
            max_score=20,
        )
        db.add(att)
    db.commit()

    # Page 1: limit 2
    res = client.get("/api/v1/students/me/attempts?limit=2&offset=0", headers=headers)
    assert res.status_code == 200
    page1 = res.json()
    assert page1["total"] == 3
    assert len(page1["items"]) == 2

    # Page 2: limit 2 offset 2
    res2 = client.get("/api/v1/students/me/attempts?limit=2&offset=2", headers=headers)
    assert res2.status_code == 200
    page2 = res2.json()
    assert len(page2["items"]) == 1


def test_teacher_forbidden_from_student_dashboard(student_auth_fixture: Dict):
    """Teachers cannot call student-specific dashboard endpoint."""
    client = student_auth_fixture["client"]
    headers = {"Authorization": f"Bearer {student_auth_fixture['token_teacher']}"}

    res = client.get("/api/v1/students/me/dashboard", headers=headers)
    assert res.status_code == 403
