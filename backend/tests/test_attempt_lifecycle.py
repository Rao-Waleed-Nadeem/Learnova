"""Automated test suite verifying Assessment Attempt lifecycle, snapshot isolation, timing, and security (SSD-02, SSD-06)."""

import uuid
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.assessment import Assessment, AssessmentQuestion
from app.models.attempt import AssessmentAttempt, AttemptResponse
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.enrollment import Enrollment
from app.models.question import Question
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User


@pytest.fixture
def seed_lifecycle_context(client_with_db: TestClient, db_session: Session):
    """Seed users, course, topic, questions, published assessment, and enrollments."""
    role_teacher = db_session.query(Role).filter_by(name="teacher").first()
    role_student = db_session.query(Role).filter_by(name="student").first()

    teacher = User(
        email="teacher_life@learnova.test",
        hashed_password=hash_password("TeacherPass123!"),
        full_name="Teacher Lifecycle",
        role_id=role_teacher.id,
    )
    student1 = User(
        email="student1_life@learnova.test",
        hashed_password=hash_password("Student1Pass123!"),
        full_name="Student One",
        role_id=role_student.id,
    )
    student2 = User(
        email="student2_life@learnova.test",
        hashed_password=hash_password("Student2Pass123!"),
        full_name="Student Two",
        role_id=role_student.id,
    )
    db_session.add_all([teacher, student1, student2])
    db_session.commit()

    course = Course(title="Physics Mechanics", status="published", creator_id=teacher.id)
    db_session.add(course)
    db_session.commit()

    ct = CourseTeacher(course_id=course.id, teacher_id=teacher.id)
    topic = Topic(course_id=course.id, title="Newtonian Laws", order=1)
    db_session.add_all([ct, topic])
    db_session.commit()

    # Active enrollment for student 1 only
    enrollment1 = Enrollment(student_id=student1.id, course_id=course.id, status="active")
    db_session.add(enrollment1)
    db_session.commit()

    # Questions in course
    q1 = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="multiple_choice",
        difficulty="medium",
        points=2,
        prompt="First law of motion is also called?",
        payload={"options": [{"id": "opt_inertia", "text": "Law of Inertia"}, {"id": "opt_gravity", "text": "Law of Gravity"}]},
        answer_key={"correct_option_ids": ["opt_inertia"]},
    )
    q2 = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="true_false",
        difficulty="easy",
        points=3,
        prompt="Force equals mass times acceleration.",
        payload={},
        answer_key={"correct_bool": True},
    )
    db_session.add_all([q1, q2])
    db_session.commit()

    # Published Assessment
    asm_pub = Assessment(
        course_id=course.id,
        topic_id=topic.id,
        creator_id=teacher.id,
        title="Newtonian Physics Quiz",
        type="summative",
        status="published",
        total_points=5,
        max_attempts=1,
        time_limit_minutes=30,
        passing_score_percent=70,
    )
    db_session.add(asm_pub)
    db_session.commit()

    aq1 = AssessmentQuestion(assessment_id=asm_pub.id, question_id=q1.id, order=0, points=2, question_version=1)
    aq2 = AssessmentQuestion(assessment_id=asm_pub.id, question_id=q2.id, order=1, points=3, question_version=1)
    db_session.add_all([aq1, aq2])
    db_session.commit()

    # Draft (Unpublished) Assessment
    asm_draft = Assessment(
        course_id=course.id,
        topic_id=topic.id,
        creator_id=teacher.id,
        title="Draft Assessment",
        type="diagnostic",
        status="draft",
        total_points=2,
    )
    db_session.add(asm_draft)
    db_session.commit()

    return {
        "teacher": teacher,
        "student1": student1,
        "student2": student2,
        "course": course,
        "topic": topic,
        "q1": q1,
        "q2": q2,
        "asm_pub": asm_pub,
        "asm_draft": asm_draft,
        "enrollment1": enrollment1,
    }


def auth_header(user: User) -> dict:
    token = create_access_token(subject=str(user.id), role=user.role.name)
    return {"Authorization": f"Bearer {token}"}


def test_start_attempt_enforces_enrollment_and_publication(client_with_db: TestClient, seed_lifecycle_context):
    """AC-P6-01: Starting attempt enforces active enrollment, assessment publication, and student role."""
    ctx = seed_lifecycle_context
    student1 = ctx["student1"]
    student2 = ctx["student2"]  # NOT enrolled
    asm_pub = ctx["asm_pub"]
    asm_draft = ctx["asm_draft"]

    hdr1 = auth_header(student1)
    hdr2 = auth_header(student2)

    # 1. Non-enrolled student cannot start attempt (403 Forbidden)
    res_non_enrolled = client_with_db.post(f"/api/v1/assessments/{asm_pub.id}/attempts", headers=hdr2)
    assert res_non_enrolled.status_code == 403
    assert "not actively enrolled" in res_non_enrolled.json()["detail"]

    # 2. Cannot start attempt on draft assessment (403 Forbidden)
    res_draft = client_with_db.post(f"/api/v1/assessments/{asm_draft.id}/attempts", headers=hdr1)
    assert res_draft.status_code == 403
    assert "unpublished" in res_draft.json()["detail"]

    # 3. Enrolled student successfully starts published assessment (201 Created)
    res_start = client_with_db.post(f"/api/v1/assessments/{asm_pub.id}/attempts", headers=hdr1)
    assert res_start.status_code == 201
    data = res_start.json()
    assert data["status"] == "in_progress"
    assert data["attempt_number"] == 1
    assert data["max_score"] == 5
    assert len(data["questions"]) == 2
    assert data["deadline_at"] is not None

    # Verify student question view contains NO answer keys
    for q in data["questions"]:
        assert "answer_key" not in q
        assert "correct_option_ids" not in q
        assert "correct_bool" not in q


def test_max_attempts_enforced(client_with_db: TestClient, seed_lifecycle_context):
    """AC-P6-02: Starting attempt enforces max_attempts boundary."""
    ctx = seed_lifecycle_context
    student1 = ctx["student1"]
    asm_pub = ctx["asm_pub"]  # max_attempts = 1
    hdr1 = auth_header(student1)

    # First attempt
    res1 = client_with_db.post(f"/api/v1/assessments/{asm_pub.id}/attempts", headers=hdr1)
    assert res1.status_code == 201
    att_id = res1.json()["id"]

    # Submit first attempt
    res_sub = client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr1)
    assert res_sub.status_code == 200

    # Attempt to start second attempt (should be rejected 403 Forbidden)
    res2 = client_with_db.post(f"/api/v1/assessments/{asm_pub.id}/attempts", headers=hdr1)
    assert res2.status_code == 403
    assert "Maximum attempt limit" in res2.json()["detail"]


def test_attempt_question_snapshot_isolation(client_with_db: TestClient, seed_lifecycle_context):
    """AC-P6-03: Attempt question snapshotting permanently isolates attempts from post-publication edits."""
    ctx = seed_lifecycle_context
    teacher = ctx["teacher"]
    student1 = ctx["student1"]
    asm_pub = ctx["asm_pub"]
    q1 = ctx["q1"]

    t_hdr = auth_header(teacher)
    s_hdr = auth_header(student1)

    # 1. Student starts attempt
    res_start = client_with_db.post(f"/api/v1/assessments/{asm_pub.id}/attempts", headers=s_hdr)
    assert res_start.status_code == 201
    att_id = res_start.json()["id"]
    orig_prompt = res_start.json()["questions"][0]["prompt"]
    assert orig_prompt == "First law of motion is also called?"

    # 2. Teacher mutates question in Question Bank
    res_patch = client_with_db.patch(
        f"/api/v1/questions/{q1.id}",
        json={"prompt": "MUTATED PROMPT: What principle governs stationary objects?"},
        headers=t_hdr,
    )
    assert res_patch.status_code == 200

    # 3. Student resumes attempt — prompt MUST remain original snapshot prompt!
    res_resume = client_with_db.get(f"/api/v1/attempts/{att_id}", headers=s_hdr)
    assert res_resume.status_code == 200
    assert res_resume.json()["questions"][0]["prompt"] == orig_prompt


def test_interim_response_upsert_and_validation(client_with_db: TestClient, seed_lifecycle_context):
    """AC-P6-04: Interim response saving persists student answers idempotently; rejects foreign questions."""
    ctx = seed_lifecycle_context
    student1 = ctx["student1"]
    asm_pub = ctx["asm_pub"]
    q1 = ctx["q1"]
    hdr1 = auth_header(student1)

    # Start attempt
    res_start = client_with_db.post(f"/api/v1/assessments/{asm_pub.id}/attempts", headers=hdr1)
    att_id = res_start.json()["id"]

    # 1. Save initial response
    res_save1 = client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q1.id}",
        json={"student_response": "opt_gravity", "response_time_seconds": 15},
        headers=hdr1,
    )
    assert res_save1.status_code == 200
    assert res_save1.json()["student_response"] == "opt_gravity"

    # 2. Update response (idempotent upsert)
    res_save2 = client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q1.id}",
        json={"student_response": "opt_inertia", "response_time_seconds": 25},
        headers=hdr1,
    )
    assert res_save2.status_code == 200
    assert res_save2.json()["student_response"] == "opt_inertia"

    # 3. Reject foreign question not in attempt
    foreign_qid = uuid.uuid4()
    res_foreign = client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{foreign_qid}",
        json={"student_response": "anything"},
        headers=hdr1,
    )
    assert res_foreign.status_code == 400
    assert "not part of this assessment attempt" in res_foreign.json()["detail"]


def test_server_authoritative_deadline_and_expiry(client_with_db: TestClient, db_session: Session, seed_lifecycle_context):
    """AC-P6-05: Server-authoritative UTC timing auto-submits or rejects late responses past deadline_at (DEC-07)."""
    ctx = seed_lifecycle_context
    student1 = ctx["student1"]
    asm_pub = ctx["asm_pub"]
    q1 = ctx["q1"]
    hdr1 = auth_header(student1)

    res_start = client_with_db.post(f"/api/v1/assessments/{asm_pub.id}/attempts", headers=hdr1)
    att_id = res_start.json()["id"]

    # Simulate expired deadline in DB (started 35 mins ago with 30-min duration, expired 5 mins ago)
    now = datetime.now(timezone.utc)
    att = db_session.get(AssessmentAttempt, uuid.UUID(att_id))
    att.started_at = now - timedelta(minutes=35)
    att.deadline_at = now - timedelta(minutes=5)
    db_session.commit()

    # Attempt to record response after deadline
    res_late = client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q1.id}",
        json={"student_response": "opt_inertia"},
        headers=hdr1,
    )
    assert res_late.status_code == 400
    assert "deadline has expired" in res_late.json()["detail"]

    # Verify attempt transitioned to expired status
    db_session.refresh(att)
    assert att.status == "expired"


def test_cross_student_attempt_isolation(client_with_db: TestClient, seed_lifecycle_context):
    """AC-P6-06: Cross-student attempt access is strictly forbidden (403 Forbidden)."""
    ctx = seed_lifecycle_context
    student1 = ctx["student1"]
    student2 = ctx["student2"]
    asm_pub = ctx["asm_pub"]
    q1 = ctx["q1"]

    hdr1 = auth_header(student1)
    hdr2 = auth_header(student2)

    # Student 1 creates attempt
    res_start = client_with_db.post(f"/api/v1/assessments/{asm_pub.id}/attempts", headers=hdr1)
    att_id = res_start.json()["id"]

    # Student 2 attempts to inspect Student 1's attempt (403 Forbidden)
    res_get = client_with_db.get(f"/api/v1/attempts/{att_id}", headers=hdr2)
    assert res_get.status_code == 403

    # Student 2 attempts to answer Student 1's attempt (403 Forbidden)
    res_ans = client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q1.id}",
        json={"student_response": "opt_inertia"},
        headers=hdr2,
    )
    assert res_ans.status_code == 403

    # Student 2 attempts to submit Student 1's attempt (403 Forbidden)
    res_sub = client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr2)
    assert res_sub.status_code == 403
