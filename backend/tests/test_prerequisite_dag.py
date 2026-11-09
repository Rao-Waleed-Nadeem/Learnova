"""Automated unit and integration tests for Topic Prerequisite DAG Cycle Rejection (FR-CRS-04, SSD-07)."""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.role import Role
from app.models.topic import Topic
from app.models.topic_prerequisite import TopicPrerequisite
from app.models.user import User


@pytest.fixture
def teacher_and_course(db_session: Session):
    """Seed teacher user and a course with 4 topics (A, B, C, D)."""
    role_teacher = db_session.query(Role).filter_by(name="teacher").first()
    teacher = User(
        email="dag_teacher@learnova.test",
        hashed_password=hash_password("TeacherPass123!"),
        full_name="DAG Teacher",
        role_id=role_teacher.id,
    )
    db_session.add(teacher)
    db_session.flush()

    course = Course(title="Algorithms Course", status="draft", creator_id=teacher.id)
    db_session.add(course)
    db_session.flush()

    assignment = CourseTeacher(course_id=course.id, teacher_id=teacher.id)
    db_session.add(assignment)

    # Topics A, B, C, D
    tA = Topic(course_id=course.id, title="Topic A", order=1)
    tB = Topic(course_id=course.id, title="Topic B", order=2)
    tC = Topic(course_id=course.id, title="Topic C", order=3)
    tD = Topic(course_id=course.id, title="Topic D", order=4)
    db_session.add_all([tA, tB, tC, tD])
    db_session.commit()

    return {
        "teacher": teacher,
        "course": course,
        "topics": {"A": tA, "B": tB, "C": tC, "D": tD},
    }


def auth_header(user: User) -> dict:
    token = create_access_token(subject=str(user.id), role=user.role.name)
    return {"Authorization": f"Bearer {token}"}


def test_self_prerequisite_rejected(client_with_db: TestClient, teacher_and_course):
    """AC-P4-08: A topic cannot depend on itself (self-edge)."""
    ctx = teacher_and_course
    teacher = ctx["teacher"]
    tA = ctx["topics"]["A"]

    res = client_with_db.put(
        f"/api/v1/topics/{tA.id}/prerequisites",
        json={"prerequisite_topic_ids": [str(tA.id)]},
        headers=auth_header(teacher),
    )
    assert res.status_code == 400
    assert "cannot depend on itself" in res.json()["detail"].lower()


def test_direct_cycle_rejected(client_with_db: TestClient, db_session: Session, teacher_and_course):
    """AC-P4-09: Direct circular dependency (A -> B and B -> A) is rejected with 400."""
    ctx = teacher_and_course
    teacher = ctx["teacher"]
    tA = ctx["topics"]["A"]
    tB = ctx["topics"]["B"]

    # 1. Set A depends on B
    res1 = client_with_db.put(
        f"/api/v1/topics/{tA.id}/prerequisites",
        json={"prerequisite_topic_ids": [str(tB.id)]},
        headers=auth_header(teacher),
    )
    assert res1.status_code == 200

    # 2. Attempt to make B depend on A (creates A -> B -> A)
    res2 = client_with_db.put(
        f"/api/v1/topics/{tB.id}/prerequisites",
        json={"prerequisite_topic_ids": [str(tA.id)]},
        headers=auth_header(teacher),
    )
    assert res2.status_code == 400
    detail = res2.json()["detail"]
    assert "circular dependency" in detail["message"].lower()
    assert str(tA.id) in detail["cycle_path"]
    assert str(tB.id) in detail["cycle_path"]


def test_transitive_cycle_rejected(client_with_db: TestClient, teacher_and_course):
    """AC-P4-10: Multi-hop transitive cycle (A -> B -> C -> A) is rejected with 400."""
    ctx = teacher_and_course
    teacher = ctx["teacher"]
    tA = ctx["topics"]["A"]
    tB = ctx["topics"]["B"]
    tC = ctx["topics"]["C"]

    # 1. A depends on B
    res1 = client_with_db.put(
        f"/api/v1/topics/{tA.id}/prerequisites",
        json={"prerequisite_topic_ids": [str(tB.id)]},
        headers=auth_header(teacher),
    )
    assert res1.status_code == 200

    # 2. B depends on C
    res2 = client_with_db.put(
        f"/api/v1/topics/{tB.id}/prerequisites",
        json={"prerequisite_topic_ids": [str(tC.id)]},
        headers=auth_header(teacher),
    )
    assert res2.status_code == 200

    # 3. Attempt to make C depend on A (creates A -> B -> C -> A)
    res3 = client_with_db.put(
        f"/api/v1/topics/{tC.id}/prerequisites",
        json={"prerequisite_topic_ids": [str(tA.id)]},
        headers=auth_header(teacher),
    )
    assert res3.status_code == 400
    detail = res3.json()["detail"]
    assert "circular dependency" in detail["message"].lower()
    assert len(detail["cycle_path"]) >= 3


def test_cross_course_prerequisite_rejected(client_with_db: TestClient, db_session: Session, teacher_and_course):
    """Prerequisites referencing a topic from an unrelated course are rejected."""
    ctx = teacher_and_course
    teacher = ctx["teacher"]
    tA = ctx["topics"]["A"]

    # Create another unrelated course and topic
    c_other = Course(title="Other Course", status="draft", creator_id=teacher.id)
    db_session.add(c_other)
    db_session.flush()
    t_other = Topic(course_id=c_other.id, title="Other Topic", order=1)
    db_session.add(t_other)
    db_session.commit()

    res = client_with_db.put(
        f"/api/v1/topics/{tA.id}/prerequisites",
        json={"prerequisite_topic_ids": [str(t_other.id)]},
        headers=auth_header(teacher),
    )
    assert res.status_code == 400
    assert "same course" in res.json()["detail"].lower()


def test_valid_acyclic_dag_replacement(client_with_db: TestClient, db_session: Session, teacher_and_course):
    """Valid diamond DAG (A -> B, A -> C, B -> D, C -> D) succeeds and replaces edges atomically."""
    ctx = teacher_and_course
    teacher = ctx["teacher"]
    tA = ctx["topics"]["A"]
    tB = ctx["topics"]["B"]
    tC = ctx["topics"]["C"]
    tD = ctx["topics"]["D"]

    # B depends on D
    res_b = client_with_db.put(
        f"/api/v1/topics/{tB.id}/prerequisites",
        json={"prerequisite_topic_ids": [str(tD.id)]},
        headers=auth_header(teacher),
    )
    assert res_b.status_code == 200

    # C depends on D
    res_c = client_with_db.put(
        f"/api/v1/topics/{tC.id}/prerequisites",
        json={"prerequisite_topic_ids": [str(tD.id)]},
        headers=auth_header(teacher),
    )
    assert res_c.status_code == 200

    # A depends on B and C
    res_a = client_with_db.put(
        f"/api/v1/topics/{tA.id}/prerequisites",
        json={"prerequisite_topic_ids": [str(tB.id), str(tC.id)]},
        headers=auth_header(teacher),
    )
    assert res_a.status_code == 200
    prereqs = res_a.json()["prerequisite_topic_ids"]
    assert len(prereqs) == 2
    assert str(tB.id) in prereqs
    assert str(tC.id) in prereqs

    # Replace A's prerequisites with only D
    res_replace = client_with_db.put(
        f"/api/v1/topics/{tA.id}/prerequisites",
        json={"prerequisite_topic_ids": [str(tD.id)]},
        headers=auth_header(teacher),
    )
    assert res_replace.status_code == 200
    assert res_replace.json()["prerequisite_topic_ids"] == [str(tD.id)]
