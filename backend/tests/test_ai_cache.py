"""Tests for durable PostgreSQL content caching, content-aware invalidation, TTL, and prompt versioning (P9-04, P9-05)."""

import datetime
import hashlib
import uuid
from typing import Dict
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.ai import AIContentCache
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User
from app.services.ai_service import AIService


@pytest.fixture
def student_auth_context(client_with_db: TestClient, db_session: Session) -> Dict:
    teacher_role = db_session.query(Role).filter_by(name="teacher").first()
    student_role = db_session.query(Role).filter_by(name="student").first()

    teacher = User(
        email=f"cache_teacher_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Cache Teacher",
        role_id=teacher_role.id,
    )
    student = User(
        email=f"cache_student_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="Cache Student",
        role_id=student_role.id,
    )
    db_session.add_all([teacher, student])
    db_session.commit()

    course = Course(title="Distributed Systems", status="published", creator_id=teacher.id)
    db_session.add(course)
    db_session.commit()

    ct = CourseTeacher(course_id=course.id, teacher_id=teacher.id)
    topic = Topic(course_id=course.id, title="Consensus", order=1)
    db_session.add_all([ct, topic])
    db_session.commit()

    lesson = Lesson(
        topic_id=topic.id,
        title="Paxos Protocol",
        order=1,
        description="Paxos is a family of protocols for solving consensus in a network of unreliable processors.",
    )
    db_session.add(lesson)
    db_session.commit()

    enr = Enrollment(student_id=student.id, course_id=course.id, status="active")
    db_session.add(enr)
    db_session.commit()

    token = create_access_token(str(student.id), role="student")
    return {
        "student": student,
        "teacher": teacher,
        "course": course,
        "topic": topic,
        "lesson": lesson,
        "token": token,
        "client": client_with_db,
        "db": db_session,
    }


def test_lesson_simplification_cache_hit_and_miss(student_auth_context: Dict, db_session: Session):
    """P9-04: First request misses cache and persists to DB; second request returns cached response with is_cached=True."""
    client: TestClient = student_auth_context["client"]
    token = student_auth_context["token"]
    lesson = student_auth_context["lesson"]

    payload = {
        "lesson_id": str(lesson.id),
        "mode": "simplify",
    }

    # 1. First call: miss
    resp1 = client.post(
        "/api/v1/ai/simplify-lesson",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["success"] is True
    assert data1["is_cached"] is False
    assert data1["source"] in ("gemini", "deterministic_fallback")

    # Verify persisted in database
    db_entry = db_session.query(AIContentCache).first()
    assert db_entry is not None
    assert db_entry.content == data1["explanation"]
    assert db_entry.prompt_version == "v2"

    # 2. Second call: hit
    resp2 = client.post(
        "/api/v1/ai/simplify-lesson",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["success"] is True
    assert data2["is_cached"] is True
    assert data2["explanation"] == data1["explanation"]
    assert data2["source"] in ("gemini_cache", "academic_cache")


def test_cache_invalidation_when_lesson_content_changes(student_auth_context: Dict, db_session: Session):
    """P9-05: Modifying persisted lesson content changes content hash, invalidates cache, and produces fresh response."""
    client: TestClient = student_auth_context["client"]
    token = student_auth_context["token"]
    lesson = student_auth_context["lesson"]

    payload = {
        "lesson_id": str(lesson.id),
        "mode": "simplify",
    }

    # 1. First call: cache original content
    resp1 = client.post(
        "/api/v1/ai/simplify-lesson",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp1.status_code == 200
    assert resp1.json()["is_cached"] is False
    initial_explanation = resp1.json()["explanation"]

    # Verify cache count is 1
    assert db_session.query(AIContentCache).count() == 1

    # 2. Teacher updates persisted lesson content in database!
    lesson.description = "REVISED LESSON CONTENT: Raft consensus algorithm replaces Paxos for simpler understandability."
    db_session.commit()

    # 3. Request explanation again: must MISS cache because content hash changed!
    resp2 = client.post(
        "/api/v1/ai/simplify-lesson",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["is_cached"] is False  # FRESH generation, NOT stale cache hit!
    assert db_session.query(AIContentCache).count() == 2  # New cache entry added


def test_cache_invalidation_on_custom_prompt_or_mode_change(student_auth_context: Dict, db_session: Session):
    """P9-05: Modifying prompt or mode generates distinct cache keys and fresh responses."""
    client: TestClient = student_auth_context["client"]
    token = student_auth_context["token"]
    lesson = student_auth_context["lesson"]

    base_payload = {
        "lesson_id": str(lesson.id),
    }

    # Call with analogy mode
    resp_analogy = client.post(
        "/api/v1/ai/simplify-lesson",
        json={**base_payload, "mode": "analogy"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_analogy.status_code == 200
    data_analogy = resp_analogy.json()

    # Call with example mode
    resp_example = client.post(
        "/api/v1/ai/simplify-lesson",
        json={**base_payload, "mode": "example"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_example.status_code == 200
    data_example = resp_example.json()

    # Different explanations and distinct cache entries
    assert data_analogy["explanation"] != data_example["explanation"]
    assert db_session.query(AIContentCache).count() >= 2


def test_cache_skips_expired_entries(student_auth_context: Dict, db_session: Session):
    """Expired cache rows are bypassed and refreshed with updated timestamps."""
    client: TestClient = student_auth_context["client"]
    token = student_auth_context["token"]
    lesson = student_auth_context["lesson"]

    payload = {
        "lesson_id": str(lesson.id),
        "mode": "simplify",
    }

    # Pre-seed an expired cache entry manually
    now_past = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=2)
    content_hash = hashlib.sha256((lesson.description or "").encode("utf-8")).hexdigest()[:16]
    cache_key = AIService._compute_cache_key(
        lesson_id=lesson.id,
        content_hash=content_hash,
        mode="simplify",
        custom_prompt=None,
        prompt_version="v2",
    )

    expired_entry = AIContentCache(
        cache_key=cache_key,
        content_type="lesson_simplification",
        content="STALE EXPIRED CONTENT",
        source="gemini",
        provider="gemini",
        model="gemini-2.5-flash",
        prompt_version="v2",
        created_at=now_past,
        expires_at=now_past,
    )
    db_session.add(expired_entry)
    db_session.commit()

    # Request explanation: should bypass expired entry and generate fresh content
    resp = client.post(
        "/api/v1/ai/simplify-lesson",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["explanation"] != "STALE EXPIRED CONTENT"
    assert data["is_cached"] is False


def test_old_v1_cache_entries_never_falsely_hit(student_auth_context: Dict, db_session: Session):
    """Old v1 cache entries without content hash never falsely match v2 keys."""
    client: TestClient = student_auth_context["client"]
    token = student_auth_context["token"]
    lesson = student_auth_context["lesson"]

    # Seed old v1 cache key
    old_raw = f"c:distributed systems::t:consensus::l:paxos protocol::m:simplify::p:::v:v1"
    old_key = hashlib.sha256(old_raw.encode("utf-8")).hexdigest()

    old_entry = AIContentCache(
        cache_key=old_key,
        content_type="lesson_simplification",
        content="OLD V1 LEGACY CONTENT",
        source="gemini",
        provider="gemini",
        model="gemini-2.5-flash",
        prompt_version="v1",
        created_at=datetime.datetime.now(datetime.timezone.utc),
        expires_at=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30),
    )
    db_session.add(old_entry)
    db_session.commit()

    # Request explanation with new system: must NOT hit old v1 key!
    resp = client.post(
        "/api/v1/ai/simplify-lesson",
        json={"lesson_id": str(lesson.id), "mode": "simplify"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["explanation"] != "OLD V1 LEGACY CONTENT"
    assert data["is_cached"] is False
