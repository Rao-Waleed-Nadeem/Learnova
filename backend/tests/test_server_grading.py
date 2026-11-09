"""Automated test suite verifying server-authoritative grading for all 5 question formats (SSD-04, SSD-06)."""

import uuid
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.assessment import Assessment, AssessmentQuestion
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.enrollment import Enrollment
from app.models.question import Question
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User


@pytest.fixture
def seed_grading_context(client_with_db: TestClient, db_session: Session):
    """Seed comprehensive assessment containing all 5 question types for grading verification."""
    role_teacher = db_session.query(Role).filter_by(name="teacher").first()
    role_student = db_session.query(Role).filter_by(name="student").first()

    teacher = User(
        email="teacher_grade@learnova.test",
        hashed_password=hash_password("TeacherPass123!"),
        full_name="Teacher Grader",
        role_id=role_teacher.id,
    )
    student = User(
        email="student_grade@learnova.test",
        hashed_password=hash_password("StudentPass123!"),
        full_name="Student Grader",
        role_id=role_student.id,
    )
    db_session.add_all([teacher, student])
    db_session.commit()

    course = Course(title="Comprehensive Science", status="published", creator_id=teacher.id)
    db_session.add(course)
    db_session.commit()

    ct = CourseTeacher(course_id=course.id, teacher_id=teacher.id)
    topic = Topic(course_id=course.id, title="Scientific Method", order=1)
    db_session.add_all([ct, topic])
    db_session.commit()

    enrollment = Enrollment(student_id=student.id, course_id=course.id, status="active")
    db_session.add(enrollment)
    db_session.commit()

    # 1. MCQ Single-choice
    q_mcq = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="multiple_choice",
        difficulty="easy",
        points=2,
        prompt="Which organelle produces ATP?",
        payload={"options": [{"id": "opt_mito", "text": "Mitochondria"}, {"id": "opt_ribo", "text": "Ribosome"}]},
        answer_key={"correct_option_ids": ["opt_mito"]},
    )

    # 2. True/False
    q_tf = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="true_false",
        difficulty="easy",
        points=2,
        prompt="Water boils at 100 degrees Celsius at sea level.",
        payload={},
        answer_key={"correct_bool": True},
    )

    # 3. Fill in the Blank
    q_fill = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="fill_blank",
        difficulty="medium",
        points=3,
        prompt="The process of converting light energy to chemical energy is _______.",
        payload={},
        answer_key={"accepted_answers": ["photosynthesis", "Photosynthesis"], "case_sensitive": False},
    )

    # 4. Matching (4 pairs)
    q_match = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="matching",
        difficulty="hard",
        points=4,
        prompt="Match each state of matter to its property.",
        payload={
            "left_items": [{"id": "p1", "text": "Solid"}, {"id": "p2", "text": "Liquid"}, {"id": "p3", "text": "Gas"}, {"id": "p4", "text": "Plasma"}],
            "right_items": [{"id": "p1", "text": "Fixed Shape"}, {"id": "p2", "text": "Fixed Volume"}, {"id": "p3", "text": "Compressible"}, {"id": "p4", "text": "Ionized"}],
        },
        answer_key={
            "matching_pairs": [
                {"id": "p1", "left": "Solid", "right": "Fixed Shape"},
                {"id": "p2", "left": "Liquid", "right": "Fixed Volume"},
                {"id": "p3", "left": "Gas", "right": "Compressible"},
                {"id": "p4", "left": "Plasma", "right": "Ionized"},
            ]
        },
    )

    # 5. Short Answer Exact Match
    q_short_exact = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="short_answer",
        difficulty="medium",
        points=3,
        prompt="Name the chemical formula for table salt.",
        payload={},
        answer_key={"expected_rubric": "NaCl", "grading_mode": "exact_match", "accepted_answers": ["NaCl", "nacl"]},
    )

    # 6. Short Answer Manual Review
    q_short_manual = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="short_answer",
        difficulty="hard",
        points=5,
        prompt="Explain why peer review is essential to scientific credibility.",
        payload={},
        answer_key={"expected_rubric": "Student must mention reproducibility and bias elimination.", "grading_mode": "manual_review"},
    )

    db_session.add_all([q_mcq, q_tf, q_fill, q_match, q_short_exact, q_short_manual])
    db_session.commit()

    # Objective Assessment (No manual review)
    asm_obj = Assessment(
        course_id=course.id,
        topic_id=topic.id,
        creator_id=teacher.id,
        title="Objective Science Exam",
        type="summative",
        status="published",
        total_points=14,
        passing_score_percent=70,
    )
    db_session.add(asm_obj)
    db_session.commit()

    db_session.add_all([
        AssessmentQuestion(assessment_id=asm_obj.id, question_id=q_mcq.id, order=0, points=2, question_version=1),
        AssessmentQuestion(assessment_id=asm_obj.id, question_id=q_tf.id, order=1, points=2, question_version=1),
        AssessmentQuestion(assessment_id=asm_obj.id, question_id=q_fill.id, order=2, points=3, question_version=1),
        AssessmentQuestion(assessment_id=asm_obj.id, question_id=q_match.id, order=3, points=4, question_version=1),
        AssessmentQuestion(assessment_id=asm_obj.id, question_id=q_short_exact.id, order=4, points=3, question_version=1),
    ])
    db_session.commit()

    # Assessment with Manual Review question
    asm_manual = Assessment(
        course_id=course.id,
        topic_id=topic.id,
        creator_id=teacher.id,
        title="Essay Science Exam",
        type="summative",
        status="published",
        total_points=7,
        passing_score_percent=70,
    )
    db_session.add(asm_manual)
    db_session.commit()

    db_session.add_all([
        AssessmentQuestion(assessment_id=asm_manual.id, question_id=q_mcq.id, order=0, points=2, question_version=1),
        AssessmentQuestion(assessment_id=asm_manual.id, question_id=q_short_manual.id, order=1, points=5, question_version=1),
    ])
    db_session.commit()

    return {
        "teacher": teacher,
        "student": student,
        "q_mcq": q_mcq,
        "q_tf": q_tf,
        "q_fill": q_fill,
        "q_match": q_match,
        "q_short_exact": q_short_exact,
        "q_short_manual": q_short_manual,
        "asm_obj": asm_obj,
        "asm_manual": asm_manual,
    }


def auth_header(user: User) -> dict:
    token = create_access_token(subject=str(user.id), role=user.role.name)
    return {"Authorization": f"Bearer {token}"}


def test_grade_multiple_choice_and_anti_tampering(client_with_db: TestClient, seed_grading_context):
    """AC-P6-07: MCQ graded authoritatively; client-supplied score/is_correct fields are strictly ignored."""
    ctx = seed_grading_context
    student = ctx["student"]
    asm = ctx["asm_obj"]
    q_mcq = ctx["q_mcq"]
    hdr = auth_header(student)

    # Start attempt
    res_start = client_with_db.post(f"/api/v1/assessments/{asm.id}/attempts", headers=hdr)
    att_id = res_start.json()["id"]

    # Student attempts to forge score by sending client-side score payload
    tampered_payload = {
        "student_response": "opt_mito",
        "is_correct": False,  # Client tries to send bogus fields
        "score": 999,
        "points_awarded": 999,
    }
    client_with_db.put(f"/api/v1/attempts/{att_id}/responses/{q_mcq.id}", json=tampered_payload, headers=hdr)

    # Submit attempt
    res_sub = client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr)
    assert res_sub.status_code == 200
    data = res_sub.json()

    # Verify server calculated score authoritatively: 2 points for MCQ
    mcq_resp = next(r for r in data["responses"] if r["question_id"] == str(q_mcq.id))
    assert mcq_resp["is_correct"] is True
    assert float(mcq_resp["points_awarded"]) == 2.0


def test_grade_true_false(client_with_db: TestClient, seed_grading_context):
    """AC-P6-08: True/False evaluated against canonical boolean answer."""
    ctx = seed_grading_context
    student = ctx["student"]
    asm = ctx["asm_obj"]
    q_tf = ctx["q_tf"]
    hdr = auth_header(student)

    res_start = client_with_db.post(f"/api/v1/assessments/{asm.id}/attempts", headers=hdr)
    att_id = res_start.json()["id"]

    # Save correct boolean answer
    client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q_tf.id}",
        json={"student_response": True},
        headers=hdr,
    )
    res_sub = client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr)
    data = res_sub.json()

    tf_resp = next(r for r in data["responses"] if r["question_id"] == str(q_tf.id))
    assert tf_resp["is_correct"] is True
    assert float(tf_resp["points_awarded"]) == 2.0


def test_grade_fill_blank_normalization(client_with_db: TestClient, seed_grading_context):
    """AC-P6-09: Fill in the Blank normalization matches case-insensitively with whitespace trimmed."""
    ctx = seed_grading_context
    student = ctx["student"]
    asm = ctx["asm_obj"]
    q_fill = ctx["q_fill"]
    hdr = auth_header(student)

    res_start = client_with_db.post(f"/api/v1/assessments/{asm.id}/attempts", headers=hdr)
    att_id = res_start.json()["id"]

    # Save with surrounding spaces and mixed case ("  pHoToSyNtHeSiS  ")
    client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q_fill.id}",
        json={"student_response": "  pHoToSyNtHeSiS  "},
        headers=hdr,
    )
    res_sub = client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr)
    data = res_sub.json()

    fill_resp = next(r for r in data["responses"] if r["question_id"] == str(q_fill.id))
    assert fill_resp["is_correct"] is True
    assert float(fill_resp["points_awarded"]) == 3.0


def test_grade_matching_proportional_credit(client_with_db: TestClient, seed_grading_context):
    """AC-P6-10: Matching questions award proportional partial credit based on correct pair fraction."""
    ctx = seed_grading_context
    student = ctx["student"]
    asm = ctx["asm_obj"]
    q_match = ctx["q_match"]  # 4 pairs, 4 points
    hdr = auth_header(student)

    res_start = client_with_db.post(f"/api/v1/assessments/{asm.id}/attempts", headers=hdr)
    att_id = res_start.json()["id"]

    # Match 2 correct pairs out of 4 (50% = 2 points out of 4)
    partial_matching_resp = {
        "p1": "Fixed Shape",   # Correct
        "p2": "Fixed Volume",  # Correct
        "p3": "Wrong Distractor", # Incorrect
        "p4": "Wrong Distractor", # Incorrect
    }
    client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q_match.id}",
        json={"student_response": partial_matching_resp},
        headers=hdr,
    )
    res_sub = client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr)
    data = res_sub.json()

    match_resp = next(r for r in data["responses"] if r["question_id"] == str(q_match.id))
    assert match_resp["is_correct"] is False  # Not all correct
    assert float(match_resp["points_awarded"]) == 2.0  # 50% partial credit
    assert "Matched 2 of 4 pairs" in match_resp["feedback"]


def test_grade_short_answer_modes(client_with_db: TestClient, seed_grading_context):
    """AC-P6-11: Short Answer exact match grades automatically; manual review transitions to pending_manual_review (DEC-06)."""
    ctx = seed_grading_context
    student = ctx["student"]
    asm_obj = ctx["asm_obj"]
    asm_manual = ctx["asm_manual"]
    q_short_exact = ctx["q_short_exact"]
    q_short_manual = ctx["q_short_manual"]
    hdr = auth_header(student)

    # 1. Exact match test
    res1 = client_with_db.post(f"/api/v1/assessments/{asm_obj.id}/attempts", headers=hdr)
    att1_id = res1.json()["id"]
    client_with_db.put(
        f"/api/v1/attempts/{att1_id}/responses/{q_short_exact.id}",
        json={"student_response": "nacl"},
        headers=hdr,
    )
    res_sub1 = client_with_db.post(f"/api/v1/attempts/{att1_id}/submit", headers=hdr)
    assert res_sub1.status_code == 200
    exact_resp = next(r for r in res_sub1.json()["responses"] if r["question_id"] == str(q_short_exact.id))
    assert exact_resp["is_correct"] is True
    assert float(exact_resp["points_awarded"]) == 3.0

    # 2. Manual review test (DEC-06: No implicit LLM call)
    res2 = client_with_db.post(f"/api/v1/assessments/{asm_manual.id}/attempts", headers=hdr)
    att2_id = res2.json()["id"]
    client_with_db.put(
        f"/api/v1/attempts/{att2_id}/responses/{q_short_manual.id}",
        json={"student_response": "Independent researchers scrutinize experimental data to eliminate bias."},
        headers=hdr,
    )
    res_sub2 = client_with_db.post(f"/api/v1/attempts/{att2_id}/submit", headers=hdr)
    assert res_sub2.status_code == 200
    data2 = res_sub2.json()

    # Verify attempt status is pending_manual_review
    assert data2["status"] == "pending_manual_review"
    manual_resp = next(r for r in data2["responses"] if r["question_id"] == str(q_short_manual.id))
    assert manual_resp["is_correct"] is None
    assert manual_resp["points_awarded"] is None
    assert "Pending teacher manual review" in manual_resp["feedback"]
