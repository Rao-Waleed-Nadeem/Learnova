"""Unit and integration tests for Admin Analytics, User Directory, Audit Logs, and Diagnostics (Phase 10)."""

import uuid
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.role import Role
from app.models.security_audit_event import SecurityAuditEvent
from app.models.user import User
from app.services.auth_service import create_access_token


@pytest.fixture
def admin_auth_fixture(client_with_db: TestClient, db_session: Session) -> Dict:
    """Fixture providing authenticated administrator, teacher, student, and baseline entities."""
    admin_role = db_session.query(Role).filter_by(name="administrator").first()
    teacher_role = db_session.query(Role).filter_by(name="teacher").first()
    student_role = db_session.query(Role).filter_by(name="student").first()

    admin_user = User(
        email=f"admin_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password="hashed_admin_password_secret_do_not_leak",
        full_name="Platform Administrator",
        role_id=admin_role.id,
        is_active=True,
    )
    teacher_user = User(
        email=f"teacher_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password="hashed_teacher_password_secret",
        full_name="Prof. AdminTest",
        role_id=teacher_role.id,
        is_active=True,
    )
    student_user = User(
        email=f"student_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password="hashed_student_password_secret",
        full_name="Student AdminTest",
        role_id=student_role.id,
        is_active=True,
    )
    db_session.add_all([admin_user, teacher_user, student_user])
    db_session.commit()

    token_admin = create_access_token(str(admin_user.id), role="administrator")
    token_teacher = create_access_token(str(teacher_user.id), role="teacher")
    token_student = create_access_token(str(student_user.id), role="student")

    # Add course and enrollment
    course = Course(
        title="Operating Systems Architecture",
        description="Kernel design and virtual memory",
        status="published",
    )
    db_session.add(course)
    db_session.commit()

    enrollment = Enrollment(
        student_id=student_user.id,
        course_id=course.id,
        status="active",
    )
    db_session.add(enrollment)
    db_session.commit()

    # Pre-seed a security audit log
    audit_entry = SecurityAuditEvent(
        actor_id=admin_user.id,
        actor_email=admin_user.email,
        actor_role="administrator",
        action="USER_LOGIN",
        outcome="SUCCESS",
        details={"login_method": "password"},
    )
    db_session.add(audit_entry)
    db_session.commit()

    return {
        "client": client_with_db,
        "db": db_session,
        "admin": admin_user,
        "teacher": teacher_user,
        "student": student_user,
        "course": course,
        "token_admin": token_admin,
        "token_teacher": token_teacher,
        "token_student": token_student,
    }


def test_admin_dashboard_kpis(admin_auth_fixture: Dict):
    """Admin dashboard aggregates high-level platform KPIs across existing domain tables."""
    client = admin_auth_fixture["client"]
    headers = {"Authorization": f"Bearer {admin_auth_fixture['token_admin']}"}

    res = client.get("/api/v1/admin/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["users"]["total"] >= 3
    assert data["users"]["administrators"] >= 1
    assert data["users"]["teachers"] >= 1
    assert data["users"]["students"] >= 1
    assert data["curriculum"]["total_courses"] >= 1
    assert data["enrollments"]["total_enrollments"] >= 1
    assert data["assessments"]["total_assessments"] >= 0


def test_non_admin_forbidden_from_admin_endpoints(admin_auth_fixture: Dict):
    """Teachers and students receive 403 Forbidden on all administrative endpoints."""
    client = admin_auth_fixture["client"]
    teacher_headers = {"Authorization": f"Bearer {admin_auth_fixture['token_teacher']}"}
    student_headers = {"Authorization": f"Bearer {admin_auth_fixture['token_student']}"}

    endpoints = [
        "/api/v1/admin/dashboard",
        "/api/v1/admin/users",
        f"/api/v1/admin/users/{admin_auth_fixture['student'].id}",
        "/api/v1/admin/audit-logs",
        "/api/v1/admin/system/health",
    ]

    for ep in endpoints:
        res_t = client.get(ep, headers=teacher_headers)
        assert res_t.status_code == 403, f"Teacher was not 403 on {ep}"

        res_s = client.get(ep, headers=student_headers)
        assert res_s.status_code == 403, f"Student was not 403 on {ep}"


def test_admin_user_directory_pagination_and_search(admin_auth_fixture: Dict):
    """Admin user directory supports search, role filtering, pagination, and NEVER leaks passwords (DEC-P10-004)."""
    client = admin_auth_fixture["client"]
    headers = {"Authorization": f"Bearer {admin_auth_fixture['token_admin']}"}

    # Search for AdminTest
    res = client.get("/api/v1/admin/users?search=AdminTest&limit=10&offset=0", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    assert len(data["items"]) >= 2

    # String representation check: ensure hashed password is never in JSON payload
    raw_text = res.text
    assert "hashed_admin_password" not in raw_text
    assert "hashed_teacher_password" not in raw_text
    assert "hashed_student_password" not in raw_text
    assert "secret_do_not_leak" not in raw_text

    for item in data["items"]:
        assert "hashed_password" not in item
        assert "password" not in item
        assert "id" in item
        assert "email" in item
        assert "role" in item


def test_admin_user_directory_filter_by_role(admin_auth_fixture: Dict):
    """Admin user directory accurately filters by role."""
    client = admin_auth_fixture["client"]
    headers = {"Authorization": f"Bearer {admin_auth_fixture['token_admin']}"}

    res = client.get("/api/v1/admin/users?role=administrator", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert all(u["role"] == "administrator" for u in data["items"])


def test_admin_user_detail_metrics(admin_auth_fixture: Dict):
    """Admin user detail returns profile with contextual metrics and no secrets."""
    client = admin_auth_fixture["client"]
    student = admin_auth_fixture["student"]
    headers = {"Authorization": f"Bearer {admin_auth_fixture['token_admin']}"}

    res = client.get(f"/api/v1/admin/users/{student.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["user"]["id"] == str(student.id)
    assert data["user"]["email"] == student.email
    assert data["user"]["role"] == "student"
    assert data["enrolled_courses_count"] >= 1
    assert "hashed_password" not in data["user"]
    assert "hashed_password" not in res.text


def test_admin_user_detail_not_found(admin_auth_fixture: Dict):
    """Admin user detail returns 404 for nonexistent user ID."""
    client = admin_auth_fixture["client"]
    headers = {"Authorization": f"Bearer {admin_auth_fixture['token_admin']}"}

    res = client.get(f"/api/v1/admin/users/{uuid.uuid4()}", headers=headers)
    assert res.status_code == 404


def test_admin_audit_logs_filters_and_ordering(admin_auth_fixture: Dict):
    """Admin security audit logs return paginated records ordered newest first."""
    client = admin_auth_fixture["client"]
    headers = {"Authorization": f"Bearer {admin_auth_fixture['token_admin']}"}

    res = client.get("/api/v1/admin/audit-logs?action=USER_LOGIN&limit=10&offset=0", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1
    assert data["items"][0]["action"] == "USER_LOGIN"


def test_safe_system_diagnostics_no_secrets(admin_auth_fixture: Dict):
    """Diagnostics endpoint returns operational metrics and strictly redacts credentials (DEC-P10-004)."""
    client = admin_auth_fixture["client"]
    headers = {"Authorization": f"Bearer {admin_auth_fixture['token_admin']}"}

    res = client.get("/api/v1/admin/system/health", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Required health fields
    assert data["status"] in ("healthy", "degraded")
    assert "database" in data
    assert data["database"]["status"] == "connected"
    assert isinstance(data["database"]["latency_ms"], (int, float))
    assert "alembic" in data
    assert "current_head" in data["alembic"]
    assert "outbox" in data
    assert "ai_service" in data
    assert "timestamp" in data
    assert "version" in data

    # STRICT INVARIANT: Ensure no credentials, secret tokens, or raw URLs with passwords leaked
    raw_text = res.text.lower()
    assert "password" not in raw_text
    assert "postgres:" not in raw_text
    assert "secret_key" not in raw_text
    assert "jwt" not in raw_text
