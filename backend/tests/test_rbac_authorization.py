"""RBAC and course scoping authorization tests."""

import uuid
import pytest
from fastapi import APIRouter, Depends
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_role, require_teacher_assigned_to_course
from app.core.security import create_access_token, hash_password
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.role import Role
from app.models.user import User


def test_student_cannot_access_admin_endpoints(client_with_db: TestClient) -> None:
    """Students attempting to access admin endpoints must receive 403 Forbidden."""
    # Register as student
    reg_res = client_with_db.post(
        "/api/v1/auth/register",
        json={"email": "student_rbac@example.com", "password": "Password123!", "full_name": "Student RBAC"},
    )
    token = reg_res.json()["access_token"]
    student_id = reg_res.json()["user"]["id"]

    res = client_with_db.put(
        f"/api/v1/admin/users/{student_id}/role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "administrator"},
    )
    assert res.status_code == 403
    assert "Required role: administrator" in res.json()["detail"]


def test_teacher_cannot_access_admin_endpoints(client_with_db: TestClient, db_session: Session) -> None:
    """Teachers attempting to access admin endpoints must receive 403 Forbidden."""
    teacher_role = db_session.query(Role).filter(Role.name == "teacher").first()
    teacher = User(
        email="teacher_rbac@example.com",
        hashed_password=hash_password("Pass123!"),
        full_name="Teacher RBAC",
        role_id=teacher_role.id,
        is_active=True,
    )
    db_session.add(teacher)
    db_session.commit()

    token = create_access_token(subject=str(teacher.id), role="teacher")

    res = client_with_db.put(
        f"/api/v1/admin/users/{teacher.id}/role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "administrator"},
    )
    assert res.status_code == 403
    assert "Required role: administrator" in res.json()["detail"]


def test_teacher_course_scoping(db_session: Session) -> None:
    """Directly test require_teacher_assigned_to_course logic for teachers, admins, and students."""
    for r_name, r_desc in [
        ("administrator", "Full system access"),
        ("teacher", "Course management and assessment grading"),
        ("student", "Learner access to assigned courses and materials"),
    ]:
        if not db_session.query(Role).filter(Role.name == r_name).first():
            db_session.add(Role(name=r_name, description=r_desc))
    db_session.commit()

    admin_role = db_session.query(Role).filter(Role.name == "administrator").first()
    teacher_role = db_session.query(Role).filter(Role.name == "teacher").first()
    student_role = db_session.query(Role).filter(Role.name == "student").first()

    admin = User(
        email="adm@example.com",
        hashed_password=hash_password("Pass!"),
        full_name="Admin",
        role_id=admin_role.id,
        role=admin_role,
        is_active=True,
    )
    teacher_assigned = User(
        email="t1@example.com",
        hashed_password=hash_password("Pass!"),
        full_name="Teacher 1",
        role_id=teacher_role.id,
        role=teacher_role,
        is_active=True,
    )
    teacher_unassigned = User(
        email="t2@example.com",
        hashed_password=hash_password("Pass!"),
        full_name="Teacher 2",
        role_id=teacher_role.id,
        role=teacher_role,
        is_active=True,
    )
    student = User(
        email="s@example.com",
        hashed_password=hash_password("Pass!"),
        full_name="Student",
        role_id=student_role.id,
        role=student_role,
        is_active=True,
    )
    db_session.add_all([admin, teacher_assigned, teacher_unassigned, student])
    db_session.commit()

    # Create course
    course = Course(
        title="Physics 101",
        status="published",
        creator_id=admin.id,
    )
    db_session.add(course)
    db_session.commit()

    # Assign teacher 1
    assignment = CourseTeacher(
        course_id=course.id,
        teacher_id=teacher_assigned.id,
    )
    db_session.add(assignment)
    db_session.commit()

    # Admin access is unconditionally allowed
    assert require_teacher_assigned_to_course(course.id, admin, db_session) == admin

    # Assigned teacher is allowed
    assert require_teacher_assigned_to_course(course.id, teacher_assigned, db_session) == teacher_assigned

    # Unassigned teacher is denied (403)
    with pytest.raises(Exception) as exc_info:
        require_teacher_assigned_to_course(course.id, teacher_unassigned, db_session)
    assert exc_info.value.status_code == 403
    assert "not assigned" in exc_info.value.detail

    # Student is denied (403)
    with pytest.raises(Exception) as exc_info:
        require_teacher_assigned_to_course(course.id, student, db_session)
    assert exc_info.value.status_code == 403
