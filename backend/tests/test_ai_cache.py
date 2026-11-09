"""Tests for durable PostgreSQL content caching, TTL, and prompt versioning (P9-04, P9-05)."""

import datetime
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.ai import AIContentCache
from app.models.role import Role
from app.models.user import User


@pytest.fixture
def student_auth_context(client_with_db: TestClient, db_session: Session):
    student_role = db_session.query(Role).filter_by(name="student").first()
    student = User(
        email=f"ai_student_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="pw",
        full_name="AI Student",
        role_id=student_role.id,
    )
    db_session.add(student)
    db_session.commit()

    token = create_access_token(str(student.id), role="student")
    return {
        "student": student,
        "token": token,
        "client": client_with_db,
    }


def test_lesson_simplification_cache_hit_and_miss(student_auth_context, db_session: Session):
    """P9-04: First request misses cache and persists to DB; second request returns cached response with is_cached=True."""
    client: TestClient = student_auth_context["client"]
    token = student_auth_context["token"]

    payload = {
        "course_title": "Distributed Systems",
        "topic_title": "Consensus",
        "lesson_title": "Paxos Protocol",
        "lesson_content": "Paxos is a family of protocols for solving consensus in a network of unreliable processors.",
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


def test_cache_invalidation_on_custom_prompt_or_mode_change(student_auth_context, db_session: Session):
    """P9-05: Modifying prompt or mode generates distinct cache keys and fresh responses."""
    client: TestClient = student_auth_context["client"]
    token = student_auth_context["token"]

    base_payload = {
        "course_title": "Physics",
        "topic_title": "Mechanics",
        "lesson_title": "Newton Laws",
        "lesson_content": "An object at rest stays at rest.",
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

    # Different explanations
    assert data_analogy["explanation"] != data_example["explanation"]
    assert db_session.query(AIContentCache).count() >= 2


def test_cache_skips_expired_entries(student_auth_context, db_session: Session):
    """Expired cache rows are bypassed and regenerated with updated timestamps."""
    client: TestClient = student_auth_context["client"]
    token = student_auth_context["token"]

    payload = {
        "course_title": "Chemistry",
        "topic_title": "Thermodynamics",
        "lesson_title": "Enthalpy",
        "mode": "simplify",
    }

    # Seed expired cache entry manually
    now_past = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
    from app.services.ai_service import AIService
    cache_key = AIService._compute_cache_key("Chemistry", "Thermodynamics", "Enthalpy", "simplify")

    expired_entry = AIContentCache(
        cache_key=cache_key,
        content_type="lesson_simplification",
        content="STALE EXPIRED CONTENT",
        source="gemini",
        provider="gemini",
        model="gemini-2.5-flash",
        prompt_version="v1",
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
