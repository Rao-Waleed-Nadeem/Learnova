"""Tests for AI candidate generation quarantine, teacher editing, approval promotion, idempotency, and rejection (P9-07, P9-10, P9-11, P9-12)."""

import uuid
from typing import Dict
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.ai import AICandidateQuestion
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.question import Question
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User


@pytest.fixture
def teacher_course_context(client_with_db: TestClient, db_session: Session) -> Dict:
    teacher_role = db_session.query(Role).filter_by(name="teacher").first()
    teacher = User(
        email=f"ai_teacher_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="AI Teacher",
        role_id=teacher_role.id,
    )
    db_session.add(teacher)
    db_session.commit()

    course = Course(
        title="Software Engineering",
        status="published",
        creator_id=teacher.id,
    )
    db_session.add(course)
    db_session.commit()

    ct = CourseTeacher(course_id=course.id, teacher_id=teacher.id)
    topic = Topic(course_id=course.id, title="Design Patterns", order=1)
    db_session.add_all([ct, topic])
    db_session.commit()

    token = create_access_token(str(teacher.id), role="teacher")

    return {
        "teacher": teacher,
        "course": course,
        "topic": topic,
        "token": token,
        "client": client_with_db,
    }


def test_candidate_generation_is_strictly_quarantined(teacher_course_context: Dict, db_session: Session):
    """P9-07: Generating questions persists them ONLY in ai_question_candidates as pending_review; questions table remains untouched."""
    client: TestClient = teacher_course_context["client"]
    token = teacher_course_context["token"]
    course = teacher_course_context["course"]
    topic = teacher_course_context["topic"]

    # Initial questions count in Question Bank
    initial_q_count = db_session.query(Question).count()

    resp = client.post(
        "/api/v1/ai/generate-questions",
        json={
            "course_id": str(course.id),
            "topic_id": str(topic.id),
            "source_content": "Singleton pattern ensures a class has only one instance.",
            "question_types": ["multiple_choice", "true_false"],
            "difficulty": "medium",
            "count": 2,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    candidates = resp.json()
    assert len(candidates) == 2

    for c in candidates:
        assert c["status"] == "pending_review"
        assert c["approved_question_id"] is None
        assert c["course_id"] == str(course.id)
        assert c["topic_id"] == str(topic.id)

    # Verify candidates are persisted in ai_question_candidates table
    persisted_cands = (
        db_session.query(AICandidateQuestion)
        .filter(AICandidateQuestion.course_id == course.id)
        .all()
    )
    assert len(persisted_cands) == 2

    # CRITICAL: Verify NO questions were added to official Question Bank!
    after_q_count = db_session.query(Question).count()
    assert after_q_count == initial_q_count


def test_teacher_can_edit_and_approve_candidate(teacher_course_context: Dict, db_session: Session):
    """P9-10: Teacher can update candidate prompt/points, approve it, and promote it to official Question Bank."""
    client: TestClient = teacher_course_context["client"]
    token = teacher_course_context["token"]
    course = teacher_course_context["course"]
    topic = teacher_course_context["topic"]
    teacher = teacher_course_context["teacher"]

    # 1. Generate 1 candidate
    resp_gen = client.post(
        "/api/v1/ai/generate-questions",
        json={
            "course_id": str(course.id),
            "topic_id": str(topic.id),
            "count": 1,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    cand_id = resp_gen.json()[0]["id"]

    # 2. Teacher edits candidate before approval
    resp_patch = client.patch(
        f"/api/v1/ai/candidates/{cand_id}",
        json={
            "prompt": "Custom edited prompt: Explain the Singleton design pattern.",
            "points": 5,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_patch.status_code == 200
    assert resp_patch.json()["prompt"] == "Custom edited prompt: Explain the Singleton design pattern."
    assert resp_patch.json()["points"] == 5

    # 3. Teacher approves candidate
    resp_app = client.post(
        f"/api/v1/ai/candidates/{cand_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_app.status_code == 200
    app_data = resp_app.json()
    assert app_data["success"] is True
    approved_q_id = app_data["approved_question_id"]
    assert approved_q_id is not None

    # Verify official question is now in Question Bank with source="ai_generated"
    official_q = db_session.get(Question, uuid.UUID(approved_q_id))
    assert official_q is not None
    assert official_q.source == "ai_generated"
    assert official_q.status == "approved"
    assert official_q.author_id == teacher.id
    assert official_q.prompt == "Custom edited prompt: Explain the Singleton design pattern."
    assert official_q.points == 5

    # Verify candidate row has status="approved" and linked approved_question_id
    cand = db_session.get(AICandidateQuestion, uuid.UUID(cand_id))
    assert cand.status == "approved"
    assert str(cand.approved_question_id) == approved_q_id


def test_duplicate_approval_is_idempotent(teacher_course_context: Dict, db_session: Session):
    """P9-11: Calling approve repeatedly on the same candidate is idempotent and does not create duplicate questions."""
    client: TestClient = teacher_course_context["client"]
    token = teacher_course_context["token"]
    course = teacher_course_context["course"]
    topic = teacher_course_context["topic"]

    # Generate candidate
    resp_gen = client.post(
        "/api/v1/ai/generate-questions",
        json={"course_id": str(course.id), "topic_id": str(topic.id), "count": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    cand_id = resp_gen.json()[0]["id"]

    # First approval
    resp1 = client.post(
        f"/api/v1/ai/candidates/{cand_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp1.status_code == 200
    q_id_1 = resp1.json()["approved_question_id"]

    q_count_after_first = db_session.query(Question).count()

    # Second approval (duplicate replay)
    resp2 = client.post(
        f"/api/v1/ai/candidates/{cand_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 200
    q_id_2 = resp2.json()["approved_question_id"]

    assert q_id_1 == q_id_2
    assert db_session.query(Question).count() == q_count_after_first


def test_teacher_rejects_candidate(teacher_course_context: Dict, db_session: Session):
    """P9-12: Teacher rejects candidate; status becomes rejected, rejection reason is recorded, and no question is created."""
    client: TestClient = teacher_course_context["client"]
    token = teacher_course_context["token"]
    course = teacher_course_context["course"]
    topic = teacher_course_context["topic"]

    # Generate candidate
    resp_gen = client.post(
        "/api/v1/ai/generate-questions",
        json={"course_id": str(course.id), "topic_id": str(topic.id), "count": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    cand_id = resp_gen.json()[0]["id"]

    # Reject candidate
    resp_rej = client.post(
        f"/api/v1/ai/candidates/{cand_id}/reject",
        json={"reason": "Pedagogically irrelevant to the current course syllabus."},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_rej.status_code == 200
    assert resp_rej.json()["status"] == "rejected"

    cand = db_session.get(AICandidateQuestion, uuid.UUID(cand_id))
    assert cand.status == "rejected"
    assert cand.rejection_reason == "Pedagogically irrelevant to the current course syllabus."
    assert cand.approved_question_id is None

    # Attempting to approve a rejected candidate is forbidden
    resp_bad_app = client.post(
        f"/api/v1/ai/candidates/{cand_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_bad_app.status_code == 400
