"""Automated tests for personalized learning path generation, remediation, and acceleration (AC-P7-05, AC-P7-06, SSD-03)."""

import time
import uuid
from decimal import Decimal
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.assessment import Assessment
from app.models.attempt import AssessmentAttempt
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion
from app.models.mastery import StudentTopicMastery
from app.models.role import Role
from app.models.topic import Topic
from app.models.topic_prerequisite import TopicPrerequisite
from app.models.user import User


@pytest.fixture
def seed_path_context(client_with_db: TestClient, db_session: Session) -> Dict:
    """Seed multi-topic curriculum with lessons and final exam."""
    teacher_role = db_session.query(Role).filter(Role.name == "teacher").first()
    student_role = db_session.query(Role).filter(Role.name == "student").first()

    teacher = User(
        email=f"teacher_path_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw_dummy",
        full_name="Teacher Path",
        is_active=True,
        role_id=teacher_role.id,
    )
    student = User(
        email=f"student_path_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw_dummy",
        full_name="Student Path",
        is_active=True,
        role_id=student_role.id,
    )
    db_session.add_all([teacher, student])
    db_session.commit()

    course = Course(
        title=f"Path Planning Biology {uuid.uuid4().hex[:6]}",
        status="published",
        creator_id=teacher.id,
    )
    db_session.add(course)
    db_session.commit()

    topic1 = Topic(
        course_id=course.id,
        title="Cell Structure",
        order=1,
        mastery_threshold=Decimal("0.7000"),
    )
    topic2 = Topic(
        course_id=course.id,
        title="Cell Metabolism",
        order=2,
        mastery_threshold=Decimal("0.7000"),
    )
    db_session.add_all([topic1, topic2])
    db_session.commit()

    # Topic 2 depends on Topic 1
    edge = TopicPrerequisite(topic_id=topic2.id, prerequisite_topic_id=topic1.id)
    db_session.add(edge)
    db_session.commit()

    # Lessons for Topic 1
    l1 = Lesson(topic_id=topic1.id, title="Organelles", order=1)
    l2 = Lesson(topic_id=topic1.id, title="Cell Membrane", order=2)

    # Lessons for Topic 2
    l3 = Lesson(topic_id=topic2.id, title="Glycolysis", order=1)
    db_session.add_all([l1, l2, l3])
    db_session.commit()

    # Final exam
    exam = Assessment(
        course_id=course.id,
        creator_id=teacher.id,
        title="Biology Final Exam",
        type="final",
        total_points=20,
        passing_score_percent=70,
        status="published",
    )
    db_session.add(exam)
    db_session.commit()

    enrollment = Enrollment(student_id=student.id, course_id=course.id, status="active")
    db_session.add(enrollment)
    db_session.commit()

    return {
        "teacher": teacher,
        "student": student,
        "course": course,
        "topic1": topic1,
        "topic2": topic2,
        "l1": l1,
        "l2": l2,
        "l3": l3,
        "exam": exam,
        "enrollment": enrollment,
    }


def auth_header(user: User) -> dict:
    token = create_access_token(subject=str(user.id), role=user.role.name)
    return {"Authorization": f"Bearer {token}"}


def test_learning_path_sequential_lesson_progression(client_with_db: TestClient, seed_path_context):
    """AC-P7-05: Path planner recommends first uncompleted lesson in accessible syllabus topic."""
    ctx = seed_path_context
    student = ctx["student"]
    course = ctx["course"]
    l1 = ctx["l1"]
    hdr = auth_header(student)

    res = client_with_db.get(f"/api/v1/courses/{course.id}/learning-path", headers=hdr)
    assert res.status_code == 200
    data = res.json()

    rec = data["recommended_next_step"]
    assert rec["type"] == "lesson"
    assert rec["lesson_id"] == str(l1.id)
    assert rec["title"] == l1.title
    assert data["progress_percent"] == 0.0


def test_learning_path_remediation_loop(client_with_db: TestClient, db_session: Session, seed_path_context):
    """AC-P7-05: When all topic lessons are completed but mastery is developing (< 70%), recommend adaptive practice."""
    ctx = seed_path_context
    student = ctx["student"]
    course = ctx["course"]
    topic1 = ctx["topic1"]
    enrollment = ctx["enrollment"]
    l1 = ctx["l1"]
    l2 = ctx["l2"]
    hdr = auth_header(student)

    # Complete both lessons of Topic 1
    c1 = LessonCompletion(enrollment_id=enrollment.id, student_id=student.id, lesson_id=l1.id, topic_id=l1.topic_id, course_id=course.id)
    c2 = LessonCompletion(enrollment_id=enrollment.id, student_id=student.id, lesson_id=l2.id, topic_id=l2.topic_id, course_id=course.id)
    db_session.add_all([c1, c2])

    # Record developing mastery in Topic 1 (50% < 70%)
    m1 = StudentTopicMastery(
        student_id=student.id,
        course_id=course.id,
        topic_id=topic1.id,
        mastery_score=Decimal("0.5000"),
        score_percent=50,
        status="developing",
        attempts_count=1,
    )
    db_session.add(m1)
    db_session.commit()

    res = client_with_db.get(f"/api/v1/courses/{course.id}/learning-path", headers=hdr)
    assert res.status_code == 200
    data = res.json()

    # Must trigger REMEDIATION LOOP!
    rec = data["recommended_next_step"]
    assert rec["type"] == "adaptive_practice"
    assert rec["topic_id"] == str(topic1.id)
    assert "Recalibrate your mastery" in rec["reason"]


def test_learning_path_acceleration(client_with_db: TestClient, db_session: Session, seed_path_context):
    """When topic mastery reaches competent or mastered (>= 70%), student accelerates to next topic."""
    ctx = seed_path_context
    student = ctx["student"]
    course = ctx["course"]
    topic1 = ctx["topic1"]
    topic2 = ctx["topic2"]
    l1 = ctx["l1"]
    l2 = ctx["l2"]
    l3 = ctx["l3"]
    enrollment = ctx["enrollment"]
    hdr = auth_header(student)

    # Complete Topic 1 lessons
    c1 = LessonCompletion(enrollment_id=enrollment.id, student_id=student.id, lesson_id=l1.id, topic_id=l1.topic_id, course_id=course.id)
    c2 = LessonCompletion(enrollment_id=enrollment.id, student_id=student.id, lesson_id=l2.id, topic_id=l2.topic_id, course_id=course.id)
    db_session.add_all([c1, c2])

    # Student masters Topic 1 (90% >= 85%)
    m1 = StudentTopicMastery(
        student_id=student.id,
        course_id=course.id,
        topic_id=topic1.id,
        mastery_score=Decimal("0.9000"),
        score_percent=90,
        status="mastered",
        attempts_count=1,
    )
    db_session.add(m1)
    db_session.commit()

    # Now learning path should accelerate student to Topic 2 lesson 3!
    res = client_with_db.get(f"/api/v1/courses/{course.id}/learning-path", headers=hdr)
    assert res.status_code == 200
    data = res.json()

    rec = data["recommended_next_step"]
    assert rec["type"] == "lesson"
    assert rec["lesson_id"] == str(l3.id)
    assert rec["topic_id"] == str(topic2.id)


def test_learning_path_final_exam_and_completion(client_with_db: TestClient, db_session: Session, seed_path_context):
    """When all topics are completed and competent/mastered, recommend final exam, then course completion."""
    ctx = seed_path_context
    student = ctx["student"]
    course = ctx["course"]
    topic1 = ctx["topic1"]
    topic2 = ctx["topic2"]
    l1 = ctx["l1"]
    l2 = ctx["l2"]
    l3 = ctx["l3"]
    exam = ctx["exam"]
    enrollment = ctx["enrollment"]
    hdr = auth_header(student)

    # Complete all lessons
    db_session.add_all([
        LessonCompletion(enrollment_id=enrollment.id, student_id=student.id, lesson_id=l1.id, topic_id=l1.topic_id, course_id=course.id),
        LessonCompletion(enrollment_id=enrollment.id, student_id=student.id, lesson_id=l2.id, topic_id=l2.topic_id, course_id=course.id),
        LessonCompletion(enrollment_id=enrollment.id, student_id=student.id, lesson_id=l3.id, topic_id=l3.topic_id, course_id=course.id),
    ])

    # Master both topics
    db_session.add_all([
        StudentTopicMastery(student_id=student.id, course_id=course.id, topic_id=topic1.id, mastery_score=Decimal("0.8500"), score_percent=85, status="mastered"),
        StudentTopicMastery(student_id=student.id, course_id=course.id, topic_id=topic2.id, mastery_score=Decimal("0.8000"), score_percent=80, status="competent"),
    ])
    db_session.commit()

    # 1. Recommend final exam
    res1 = client_with_db.get(f"/api/v1/courses/{course.id}/learning-path", headers=hdr)
    assert res1.status_code == 200
    assert res1.json()["recommended_next_step"]["type"] == "final_exam"

    # 2. Record passed final exam attempt
    attempt = AssessmentAttempt(
        assessment_id=exam.id,
        student_id=student.id,
        enrollment_id=enrollment.id,
        attempt_number=1,
        status="graded",
        score=Decimal("18.00"),
        max_score=20,
        score_percent=Decimal("90.00"),
        passed=True,
    )
    db_session.add(attempt)
    db_session.commit()

    # 3. Recommend course completed!
    res2 = client_with_db.get(f"/api/v1/courses/{course.id}/learning-path", headers=hdr)
    assert res2.status_code == 200
    assert res2.json()["recommended_next_step"]["type"] == "course_completed"


def test_learning_path_latency_under_1000ms(client_with_db: TestClient, seed_path_context):
    """AC-P7-06: Full personalized learning path generation completes well under 1,000 ms SLA."""
    ctx = seed_path_context
    student = ctx["student"]
    course = ctx["course"]
    hdr = auth_header(student)

    t0 = time.perf_counter()
    res = client_with_db.get(f"/api/v1/courses/{course.id}/learning-path", headers=hdr)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    assert res.status_code == 200
    assert elapsed_ms < 1000.0, f"Learning path generation took {elapsed_ms:.2f} ms (exceeded 1,000 ms SLA)"
