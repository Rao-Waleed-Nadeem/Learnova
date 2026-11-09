"""Automated test suite verifying Question Bank authoring, 5 question formats, and authorization scoping (SSD-08)."""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.question import Question
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User
from app.services.question_service import QuestionService


@pytest.fixture
def seed_test_context(client_with_db: TestClient, db_session: Session):
    """Seed test accounts and course/topic fixtures."""
    role_admin = db_session.query(Role).filter_by(name="administrator").first()
    role_teacher = db_session.query(Role).filter_by(name="teacher").first()
    role_student = db_session.query(Role).filter_by(name="student").first()

    admin = User(
        email="admin_q@learnova.test",
        hashed_password=hash_password("AdminPass123!"),
        full_name="Admin Q",
        role_id=role_admin.id,
    )
    teacher1 = User(
        email="teacher1_q@learnova.test",
        hashed_password=hash_password("Teacher1Pass123!"),
        full_name="Teacher One",
        role_id=role_teacher.id,
    )
    teacher2 = User(
        email="teacher2_q@learnova.test",
        hashed_password=hash_password("Teacher2Pass123!"),
        full_name="Teacher Two",
        role_id=role_teacher.id,
    )
    student = User(
        email="student_q@learnova.test",
        hashed_password=hash_password("StudentPass123!"),
        full_name="Student Q",
        role_id=role_student.id,
    )
    db_session.add_all([admin, teacher1, teacher2, student])
    db_session.commit()

    course = Course(
        title="Biology 101",
        description="Introductory biology course",
        status="published",
        creator_id=teacher1.id,
    )
    db_session.add(course)
    db_session.commit()

    # Assign teacher1 to course
    ct = CourseTeacher(course_id=course.id, teacher_id=teacher1.id)
    topic = Topic(course_id=course.id, title="Cell Biology", order=1)
    db_session.add_all([ct, topic])
    db_session.commit()

    return {
        "admin": admin,
        "teacher1": teacher1,
        "teacher2": teacher2,
        "student": student,
        "course": course,
        "topic": topic,
    }


def auth_header(user: User) -> dict:
    """Generate authorization header with valid JWT."""
    token = create_access_token(subject=str(user.id), role=user.role.name)
    return {"Authorization": f"Bearer {token}"}


def test_mcq_validation(client_with_db: TestClient, seed_test_context):
    """AC-P5-01: Multiple Choice requires >=2 options, >=1 correct, and respects multi-select."""
    ctx = seed_test_context
    teacher = ctx["teacher1"]
    course = ctx["course"]
    topic = ctx["topic"]
    hdr = auth_header(teacher)

    # 1. Valid single-choice MCQ
    payload = {
        "course_id": str(course.id),
        "topic_id": str(topic.id),
        "type": "multiple_choice",
        "difficulty": "medium",
        "points": 2,
        "prompt": "What is the primary power generator of the cell?",
        "options": [
            {"text": "Mitochondria", "is_correct": True},
            {"text": "Ribosome", "is_correct": False},
            {"text": "Nucleus", "is_correct": False},
        ],
    }
    res = client_with_db.post("/api/v1/questions", json=payload, headers=hdr)
    assert res.status_code == 201
    data = res.json()
    assert data["type"] == "multiple_choice"
    assert data["points"] == 2
    assert len(data["options"]) == 3
    assert data["payload"]["options"][0]["text"] == "Mitochondria"
    assert "is_correct" not in data["payload"]["options"][0]  # Delivered payload is clean
    assert len(data["answer_key"]["correct_option_ids"]) == 1

    # 2. Reject < 2 options
    bad_payload = {**payload, "options": [{"text": "Only One", "is_correct": True}]}
    res_bad = client_with_db.post("/api/v1/questions", json=bad_payload, headers=hdr)
    assert res_bad.status_code == 422

    # 3. Reject no correct option
    bad_payload2 = {
        **payload,
        "options": [
            {"text": "A", "is_correct": False},
            {"text": "B", "is_correct": False},
        ],
    }
    res_bad2 = client_with_db.post("/api/v1/questions", json=bad_payload2, headers=hdr)
    assert res_bad2.status_code == 422

    # 4. Reject multiple correct when is_multiple_correct_allowed is False
    bad_payload3 = {
        **payload,
        "is_multiple_correct_allowed": False,
        "options": [
            {"text": "A", "is_correct": True},
            {"text": "B", "is_correct": True},
        ],
    }
    res_bad3 = client_with_db.post("/api/v1/questions", json=bad_payload3, headers=hdr)
    assert res_bad3.status_code == 422

    # 5. Allow multiple correct when is_multiple_correct_allowed is True
    valid_multi = {
        **payload,
        "is_multiple_correct_allowed": True,
        "options": [
            {"text": "A", "is_correct": True},
            {"text": "B", "is_correct": True},
            {"text": "C", "is_correct": False},
        ],
    }
    res_multi = client_with_db.post("/api/v1/questions", json=valid_multi, headers=hdr)
    assert res_multi.status_code == 201
    assert len(res_multi.json()["answer_key"]["correct_option_ids"]) == 2


def test_true_false_validation(client_with_db: TestClient, seed_test_context):
    """AC-P5-02: True/False requires explicit boolean answer."""
    ctx = seed_test_context
    teacher = ctx["teacher1"]
    course = ctx["course"]
    topic = ctx["topic"]
    hdr = auth_header(teacher)

    # Valid True/False
    payload = {
        "course_id": str(course.id),
        "topic_id": str(topic.id),
        "type": "true_false",
        "difficulty": "easy",
        "prompt": "Eukaryotic cells possess membrane-bound organelles.",
        "correct_bool": True,
    }
    res = client_with_db.post("/api/v1/questions", json=payload, headers=hdr)
    assert res.status_code == 201
    data = res.json()
    assert data["correct_bool"] is True
    assert data["answer_key"]["correct_bool"] is True

    # Reject missing correct_bool
    bad_payload = {
        "course_id": str(course.id),
        "topic_id": str(topic.id),
        "type": "true_false",
        "prompt": "Invalid TF",
    }
    res_bad = client_with_db.post("/api/v1/questions", json=bad_payload, headers=hdr)
    assert res_bad.status_code == 422


def test_fill_blank_validation(client_with_db: TestClient, seed_test_context):
    """AC-P5-03: Fill in the blank validates non-empty accepted answers list."""
    ctx = seed_test_context
    teacher = ctx["teacher1"]
    course = ctx["course"]
    topic = ctx["topic"]
    hdr = auth_header(teacher)

    # Valid fill_blank
    payload = {
        "course_id": str(course.id),
        "topic_id": str(topic.id),
        "type": "fill_blank",
        "difficulty": "medium",
        "prompt": "The process by which green plants synthesize food using sunlight is called _______.",
        "accepted_answers": ["photosynthesis", "Photosynthesis"],
        "case_sensitive": False,
    }
    res = client_with_db.post("/api/v1/questions", json=payload, headers=hdr)
    assert res.status_code == 201
    data = res.json()
    assert len(data["accepted_answers"]) == 2
    assert data["case_sensitive"] is False

    # Reject empty accepted answers
    bad_payload = {
        "course_id": str(course.id),
        "topic_id": str(topic.id),
        "type": "fill_blank",
        "prompt": "Empty fill blank",
        "accepted_answers": ["   "],
    }
    res_bad = client_with_db.post("/api/v1/questions", json=bad_payload, headers=hdr)
    assert res_bad.status_code == 422


def test_matching_validation(client_with_db: TestClient, seed_test_context):
    """AC-P5-04: Matching requires >=2 unique pairs with non-empty left and right."""
    ctx = seed_test_context
    teacher = ctx["teacher1"]
    course = ctx["course"]
    topic = ctx["topic"]
    hdr = auth_header(teacher)

    # Valid matching
    payload = {
        "course_id": str(course.id),
        "topic_id": str(topic.id),
        "type": "matching",
        "difficulty": "hard",
        "prompt": "Match each organelle to its primary cellular function.",
        "matching_pairs": [
            {"left": "Mitochondria", "right": "ATP Production"},
            {"left": "Ribosome", "right": "Protein Synthesis"},
            {"left": "Golgi Apparatus", "right": "Macromolecule Packaging"},
        ],
    }
    res = client_with_db.post("/api/v1/questions", json=payload, headers=hdr)
    assert res.status_code == 201
    data = res.json()
    assert len(data["matching_pairs"]) == 3
    assert len(data["payload"]["left_items"]) == 3
    assert len(data["payload"]["right_items"]) == 3

    # Reject < 2 pairs
    bad_pairs = {**payload, "matching_pairs": [{"left": "Mito", "right": "ATP"}]}
    res_bad = client_with_db.post("/api/v1/questions", json=bad_pairs, headers=hdr)
    assert res_bad.status_code == 422

    # Reject duplicate left items
    dup_left = {
        **payload,
        "matching_pairs": [
            {"left": "Same", "right": "Right 1"},
            {"left": "Same", "right": "Right 2"},
        ],
    }
    res_dup = client_with_db.post("/api/v1/questions", json=dup_left, headers=hdr)
    assert res_dup.status_code == 422


def test_short_answer_validation(client_with_db: TestClient, seed_test_context):
    """AC-P5-05: Short Answer requires expected_rubric and explicit grading_mode (DEC-06)."""
    ctx = seed_test_context
    teacher = ctx["teacher1"]
    course = ctx["course"]
    topic = ctx["topic"]
    hdr = auth_header(teacher)

    # 1. Valid manual review mode
    payload_manual = {
        "course_id": str(course.id),
        "topic_id": str(topic.id),
        "type": "short_answer",
        "difficulty": "hard",
        "prompt": "Explain the role of ATP synthase in oxidative phosphorylation.",
        "expected_rubric": "Student must mention proton gradient and rotational catalytic mechanism.",
        "grading_mode": "manual_review",
    }
    res_manual = client_with_db.post("/api/v1/questions", json=payload_manual, headers=hdr)
    assert res_manual.status_code == 201
    assert res_manual.json()["grading_mode"] == "manual_review"

    # 2. Valid exact match mode
    payload_exact = {
        "course_id": str(course.id),
        "topic_id": str(topic.id),
        "type": "short_answer",
        "difficulty": "medium",
        "prompt": "Name the nitrogenous base that pairs with adenine in DNA.",
        "expected_rubric": "Full credit for thymine or T.",
        "grading_mode": "exact_match",
        "accepted_answers": ["thymine", "Thymine"],
    }
    res_exact = client_with_db.post("/api/v1/questions", json=payload_exact, headers=hdr)
    assert res_exact.status_code == 201
    assert res_exact.json()["grading_mode"] == "exact_match"

    # 3. Reject exact match without accepted answers
    bad_exact = {**payload_exact, "accepted_answers": []}
    res_bad = client_with_db.post("/api/v1/questions", json=bad_exact, headers=hdr)
    assert res_bad.status_code == 422

    # 4. Reject missing rubric
    bad_rubric = {**payload_manual, "expected_rubric": "   "}
    res_bad_rubric = client_with_db.post("/api/v1/questions", json=bad_rubric, headers=hdr)
    assert res_bad_rubric.status_code == 422


def test_student_projection_secrecy(db_session: Session, seed_test_context):
    """AC-P5-06: Student question projection strictly omits all answer keys, correct booleans, and rubrics."""
    ctx = seed_test_context
    course = ctx["course"]
    topic = ctx["topic"]
    teacher = ctx["teacher1"]

    q = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="multiple_choice",
        difficulty="medium",
        points=3,
        prompt="Secret question test",
        payload={"options": [{"id": "opt_1", "text": "Secret Answer"}, {"id": "opt_2", "text": "Distractor"}]},
        answer_key={"correct_option_ids": ["opt_1"]},
    )
    db_session.add(q)
    db_session.commit()
    db_session.refresh(q)

    # Build student projection
    proj = QuestionService.build_student_projection(q)
    proj_dict = proj.model_dump()

    # Assert absolute secrecy
    assert "answer_key" not in proj_dict
    assert "correct_option_ids" not in proj_dict
    assert "correct_bool" not in proj_dict
    assert "accepted_answers" not in proj_dict
    assert "expected_rubric" not in proj_dict
    for opt in proj_dict["payload"]["options"]:
        assert "is_correct" not in opt


def test_teacher_course_scoping(client_with_db: TestClient, seed_test_context):
    """AC-P5-07: Unassigned teacher cannot create or view questions in another teacher's course."""
    ctx = seed_test_context
    teacher2 = ctx["teacher2"]  # NOT assigned to Biology 101
    course = ctx["course"]
    topic = ctx["topic"]
    hdr2 = auth_header(teacher2)

    # Attempt question creation in unassigned course
    payload = {
        "course_id": str(course.id),
        "topic_id": str(topic.id),
        "type": "true_false",
        "prompt": "Unauthorized creation attempt",
        "correct_bool": True,
    }
    res = client_with_db.post("/api/v1/questions", json=payload, headers=hdr2)
    assert res.status_code == 403
    assert "Not authorized" in res.json()["detail"]

    # Attempt list questions in unassigned course
    res_list = client_with_db.get(f"/api/v1/questions?course_id={course.id}", headers=hdr2)
    assert res_list.status_code == 403


def test_student_forbidden_from_question_authoring(client_with_db: TestClient, seed_test_context):
    """AC-P5-08: Students cannot access Question Bank authoring endpoints."""
    ctx = seed_test_context
    student = ctx["student"]
    course = ctx["course"]
    topic = ctx["topic"]
    hdr = auth_header(student)

    # Attempt create
    res = client_with_db.post(
        "/api/v1/questions",
        json={"course_id": str(course.id), "topic_id": str(topic.id), "type": "true_false", "prompt": "Fail", "correct_bool": True},
        headers=hdr,
    )
    assert res.status_code == 403

    # Attempt list
    res_list = client_with_db.get(f"/api/v1/questions?course_id={course.id}", headers=hdr)
    assert res_list.status_code == 403


def test_archive_question_preserves_integrity(client_with_db: TestClient, seed_test_context):
    """AC-P5-14: Archiving a question marks status = archived without deleting row."""
    ctx = seed_test_context
    teacher = ctx["teacher1"]
    course = ctx["course"]
    topic = ctx["topic"]
    hdr = auth_header(teacher)

    # Create question
    create_res = client_with_db.post(
        "/api/v1/questions",
        json={
            "course_id": str(course.id),
            "topic_id": str(topic.id),
            "type": "true_false",
            "prompt": "Question to be archived",
            "correct_bool": True,
        },
        headers=hdr,
    )
    q_id = create_res.json()["id"]

    # Archive question
    arc_res = client_with_db.post(f"/api/v1/questions/{q_id}/archive", headers=hdr)
    assert arc_res.status_code == 200
    assert arc_res.json()["status"] == "archived"

    # Default list excludes archived
    list_res = client_with_db.get(f"/api/v1/questions?course_id={course.id}", headers=hdr)
    assert list_res.status_code == 200
    active_ids = [q["id"] for q in list_res.json()]
    assert q_id not in active_ids

    # Explicit filter finds it
    arch_res = client_with_db.get(f"/api/v1/questions?course_id={course.id}&status=archived", headers=hdr)
    assert arch_res.status_code == 200
    arch_ids = [q["id"] for q in arch_res.json()]
    assert q_id in arch_ids
