"""Tests for badge qualification rule evaluation and bonus XP awards."""

import uuid
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.assessment import Assessment
from app.models.attempt import AssessmentAttempt
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.gamification import Badge, GamificationProfile, UserBadge
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion
from app.models.mastery import StudentTopicMastery
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User
from app.services.gamification_service import GamificationService


@pytest.fixture
def seed_badge_context(client_with_db: TestClient, db_session: Session) -> Dict:
    # Ensure badges are seeded in test db
    existing_count = db_session.query(Badge).count()
    if existing_count == 0:
        badges = [
            Badge(id="badge-first-step", title="First Step", description="Completed first lesson", icon="Footprints", category="achievement", criteria_type="lesson_count", criteria_threshold=1.0),
            Badge(id="badge-diagnostic", title="Diagnostic Pioneer", description="Diagnostic test", icon="Compass", category="achievement", criteria_type="diagnostic_count", criteria_threshold=1.0),
            Badge(id="badge-syntax-master", title="Syntax Virtuoso", description="85%+ mastery", icon="Code", category="mastery", criteria_type="mastery_score", criteria_threshold=0.85),
            Badge(id="badge-streak", title="Streak Sentinel", description="3-day streak", icon="Flame", category="streak", criteria_type="streak_days", criteria_threshold=3.0),
            Badge(id="badge-adaptive-ace", title="Adaptive Ace", description="80%+ adaptive", icon="Zap", category="mastery", criteria_type="practice_score", criteria_threshold=80.0),
            Badge(id="badge-exam-scholar", title="Summative Scholar", description="Passed final exam", icon="GraduationCap", category="exam", criteria_type="final_exam_passed", criteria_threshold=1.0),
            Badge(id="badge-mastery-titan", title="Mastery Titan", description="All topics mastered", icon="Crown", category="mastery", criteria_type="all_topics_mastered", criteria_threshold=1.0),
        ]
        db_session.add_all(badges)
        db_session.commit()

    teacher_role = db_session.query(Role).filter(Role.name == "teacher").first()
    student_role = db_session.query(Role).filter(Role.name == "student").first()

    teacher = User(
        email=f"badge_t_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Badge Teacher",
        is_active=True,
        role_id=teacher_role.id,
    )
    student = User(
        email=f"badge_s_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Badge Student",
        is_active=True,
        role_id=student_role.id,
    )
    db_session.add_all([teacher, student])
    db_session.commit()

    course = Course(title="Badge Course", creator_id=teacher.id, status="published")
    db_session.add(course)
    db_session.commit()

    topic = Topic(course_id=course.id, title="Topic 1", order=1, mastery_threshold=0.70)
    db_session.add(topic)
    db_session.commit()

    lesson = Lesson(topic_id=topic.id, title="Lesson 1", order=1)
    db_session.add(lesson)
    db_session.commit()

    enrollment = Enrollment(student_id=student.id, course_id=course.id, status="active")
    db_session.add(enrollment)
    db_session.commit()

    token = create_access_token(str(student.id), role="student")
    return {
        "student": student,
        "teacher": teacher,
        "course": course,
        "topic": topic,
        "lesson": lesson,
        "enrollment": enrollment,
        "token": token,
        "client": client_with_db,
    }


def test_first_step_badge_unlock(seed_badge_context: Dict, db_session: Session):
    """Verify badge-first-step unlocks when a student completes a lesson, and +200 XP is awarded."""
    student = seed_badge_context["student"]
    lesson = seed_badge_context["lesson"]
    enrollment = seed_badge_context["enrollment"]

    # Initial check: 0 badges
    initial_unlocked = GamificationService.evaluate_badges(db_session, student.id)
    assert len(initial_unlocked) == 0

    # Record a lesson completion
    comp = LessonCompletion(
        enrollment_id=enrollment.id,
        student_id=student.id,
        course_id=seed_badge_context["course"].id,
        topic_id=seed_badge_context["topic"].id,
        lesson_id=lesson.id,
    )
    db_session.add(comp)
    db_session.commit()

    # Evaluate badges
    unlocked = GamificationService.evaluate_badges(db_session, student.id)
    db_session.commit()

    assert any(b.id == "badge-first-step" for b in unlocked)

    # Verify UserBadge entry exists
    ub = db_session.query(UserBadge).filter_by(student_id=student.id, badge_id="badge-first-step").first()
    assert ub is not None

    # Verify +200 bonus XP awarded
    profile = GamificationService.get_or_create_profile(db_session, student.id)
    assert profile.xp >= 200


def test_diagnostic_and_syntax_master_badge_unlock(seed_badge_context: Dict, db_session: Session):
    """Verify diagnostic and high-mastery badges unlock based on assessment and mastery state."""
    student = seed_badge_context["student"]
    course = seed_badge_context["course"]
    topic = seed_badge_context["topic"]
    enrollment = seed_badge_context["enrollment"]

    # Diagnostic assessment attempt
    diag_asm = Assessment(
        course_id=course.id,
        topic_id=topic.id,
        title="Diagnostic Pre-test",
        type="diagnostic",
        status="published",
        creator_id=seed_badge_context["teacher"].id,
    )
    db_session.add(diag_asm)
    db_session.commit()

    attempt = AssessmentAttempt(
        assessment_id=diag_asm.id,
        student_id=student.id,
        enrollment_id=enrollment.id,
        status="graded",
        score_percent=75,
    )
    db_session.add(attempt)

    # High topic mastery (>= 85%)
    mastery = StudentTopicMastery(
        student_id=student.id,
        course_id=course.id,
        topic_id=topic.id,
        mastery_score=0.9200,
        score_percent=92,
        status="mastered",
    )
    db_session.add(mastery)
    db_session.commit()

    # Evaluate
    unlocked = GamificationService.evaluate_badges(db_session, student.id)
    db_session.commit()

    unlocked_ids = {b.id for b in unlocked}
    assert "badge-diagnostic" in unlocked_ids
    assert "badge-syntax-master" in unlocked_ids


def test_badges_endpoint(seed_badge_context: Dict, db_session: Session):
    """Verify GET /api/v1/gamification/badges returns full catalog with unlock flags."""
    client: TestClient = seed_badge_context["client"]
    token = seed_badge_context["token"]
    student = seed_badge_context["student"]

    # Manually unlock streak badge
    user_badge = UserBadge(
        student_id=student.id,
        badge_id="badge-streak",
    )
    db_session.add(user_badge)
    db_session.commit()

    resp = client.get(
        "/api/v1/gamification/badges",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_available"] >= 7
    assert data["total_earned"] >= 1

    streak_badge = next(b for b in data["items"] if b["id"] == "badge-streak")
    assert streak_badge["is_unlocked"] is True
    assert streak_badge["earned_at"] is not None
