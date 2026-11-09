"""Automated tests for Bayesian Knowledge Tracing (BKT) and hybrid mastery scoring (AC-P7-01, AC-P7-02, AC-P7-03)."""

import uuid
from decimal import Decimal
from typing import Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.assessment import Assessment, AssessmentQuestion
from app.models.attempt import AssessmentAttempt, AttemptResponse
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.mastery import MasteryAuditLedger, StudentTopicMastery
from app.models.question import Question
from app.models.role import Role
from app.models.topic import Topic
from app.models.user import User
from app.services.mastery_service import MasteryService


@pytest.fixture
def seed_mastery_context(client_with_db: TestClient, db_session: Session) -> Dict:
    """Seed course, topic, question, assessment, and enrolled student context."""
    teacher_role = db_session.query(Role).filter(Role.name == "teacher").first()
    student_role = db_session.query(Role).filter(Role.name == "student").first()

    teacher = User(
        email=f"teacher_bkt_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw_dummy",
        full_name="Teacher BKT",
        is_active=True,
        role_id=teacher_role.id,
    )
    student = User(
        email=f"student_bkt_{uuid.uuid4().hex[:6]}@learnova.test",
        hashed_password="hashed_pw_dummy",
        full_name="Student BKT",
        is_active=True,
        role_id=student_role.id,
    )
    db_session.add_all([teacher, student])
    db_session.commit()

    course = Course(
        title=f"BKT Mastery Physics {uuid.uuid4().hex[:6]}",
        status="published",
        creator_id=teacher.id,
    )
    db_session.add(course)
    db_session.commit()

    topic = Topic(
        course_id=course.id,
        title="Newtonian Dynamics",
        order=1,
        mastery_threshold=Decimal("0.7000"),
    )
    db_session.add(topic)
    db_session.commit()

    enrollment = Enrollment(
        student_id=student.id,
        course_id=course.id,
        status="active",
    )
    db_session.add(enrollment)
    db_session.commit()

    q1 = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="multiple_choice",
        difficulty="medium",
        points=2,
        version=1,
        status="approved",
        prompt="What opposes relative motion?",
        payload={
            "options": [{"id": "opt_f", "text": "Friction"}, {"id": "opt_g", "text": "Gravity"}],
        },
        answer_key={"correct_option_ids": ["opt_f"]},
    )
    q2 = Question(
        course_id=course.id,
        topic_id=topic.id,
        author_id=teacher.id,
        type="true_false",
        difficulty="easy",
        points=2,
        version=1,
        status="approved",
        prompt="Action and reaction are equal and opposite.",
        payload={},
        answer_key={"correct_bool": True},
    )
    db_session.add_all([q1, q2])
    db_session.commit()

    assessment = Assessment(
        course_id=course.id,
        topic_id=topic.id,
        creator_id=teacher.id,
        title="Dynamics Quiz",
        type="formative",
        total_points=4,
        passing_score_percent=70,
        status="published",
    )
    db_session.add(assessment)
    db_session.commit()

    aq1 = AssessmentQuestion(assessment_id=assessment.id, question_id=q1.id, question_version=1, order=1, points=2)
    aq2 = AssessmentQuestion(assessment_id=assessment.id, question_id=q2.id, question_version=1, order=2, points=2)
    db_session.add_all([aq1, aq2])
    db_session.commit()

    return {
        "teacher": teacher,
        "student": student,
        "course": course,
        "topic": topic,
        "q1": q1,
        "q2": q2,
        "assessment": assessment,
    }


def auth_header(user: User) -> dict:
    token = create_access_token(subject=str(user.id), role=user.role.name)
    return {"Authorization": f"Bearer {token}"}


def test_bkt_step_and_sequence_mathematical_determinism():
    """AC-P7-03: Corbett & Anderson (1995) formulas produce deterministic, repeatable mathematical values."""
    # Step 1: prior = 0.10, correct = True, p_slip=0.10, p_guess=0.20, p_transit=0.20
    # num = 0.10 * 0.90 = 0.09
    # den = 0.09 + (1 - 0.10) * 0.20 = 0.09 + 0.18 = 0.27
    # posterior = 0.09 / 0.27 = 0.333333
    # p_transit = 0.333333 + (1 - 0.333333) * 0.20 = 0.4667
    step1 = MasteryService.compute_bkt_step(prior=0.10, is_correct=True)
    assert step1 == pytest.approx(0.4667, abs=1e-3)

    # Step 2: prior = 0.4667, correct = False (slip or unlearned)
    step2 = MasteryService.compute_bkt_step(prior=step1, is_correct=False)
    # Incorrect observation reduces belief, then transition slightly increases it
    assert step2 < step1

    # Sequence determinism: [True, True, True] should steadily increase belief towards 1.0
    seq_correct = MasteryService.compute_bkt_sequence([True, True, True], initial_prior=0.10)
    assert seq_correct > 0.80

    # Sequence with all false should remain low
    seq_wrong = MasteryService.compute_bkt_sequence([False, False, False], initial_prior=0.10)
    assert seq_wrong < 0.25


def test_hybrid_mastery_score_and_status_mapping():
    """Verify hybrid formula: 0.60 * score_ratio + 0.40 * bkt_prob and status thresholds."""
    # 1. Perfect score: ratio 1.0, bkt 0.95 -> 0.60 + 0.38 = 0.98 -> 'mastered'
    score1, pct1, status1 = MasteryService.compute_hybrid_mastery(score_ratio=1.0, bkt_prob=0.95)
    assert pct1 == 98
    assert status1 == "mastered"

    # 2. Competent score: ratio 0.75, bkt 0.70 -> 0.45 + 0.28 = 0.73 -> 'competent'
    score2, pct2, status2 = MasteryService.compute_hybrid_mastery(score_ratio=0.75, bkt_prob=0.70)
    assert pct2 == 73
    assert status2 == "competent"

    # 3. Developing score: ratio 0.50, bkt 0.40 -> 0.30 + 0.16 = 0.46 -> 'developing'
    score3, pct3, status3 = MasteryService.compute_hybrid_mastery(score_ratio=0.50, bkt_prob=0.40)
    assert pct3 == 46
    assert status3 == "developing"


def test_unassessed_topic_explicit_handling(client_with_db: TestClient, seed_mastery_context):
    """AC-P7-02: Unassessed topics explicitly report 'not_assessed' and 0% without error or false failure."""
    ctx = seed_mastery_context
    student = ctx["student"]
    course = ctx["course"]
    hdr = auth_header(student)

    res = client_with_db.get(f"/api/v1/courses/{course.id}/mastery", headers=hdr)
    assert res.status_code == 200
    data = res.json()

    assert data["course_id"] == str(course.id)
    assert data["overall_mastery_percent"] == 0
    assert data["not_assessed_count"] == 1
    assert data["mastered_count"] == 0
    assert len(data["topics"]) == 1

    t0 = data["topics"][0]
    assert t0["status"] == "not_assessed"
    assert t0["mastery_score"] == 0.0
    assert t0["score_percent"] == 0
    assert t0["attempts_count"] == 0
    assert t0["last_assessed_at"] is None


def test_recalculate_from_completed_attempt(client_with_db: TestClient, db_session: Session, seed_mastery_context):
    """AC-P7-01: Recalculate mastery from a submitted/graded attempt updates StudentTopicMastery and writes audit ledger."""
    ctx = seed_mastery_context
    student = ctx["student"]
    course = ctx["course"]
    topic = ctx["topic"]
    assessment = ctx["assessment"]
    q1 = ctx["q1"]
    q2 = ctx["q2"]
    hdr = auth_header(student)

    # 1. Start and submit attempt via API
    res_start = client_with_db.post(f"/api/v1/assessments/{assessment.id}/attempts", headers=hdr)
    assert res_start.status_code == 201
    att_id = res_start.json()["id"]

    # Answer both questions correctly
    client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q1.id}",
        json={"student_response": "opt_f"},
        headers=hdr,
    )
    client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q2.id}",
        json={"student_response": True},
        headers=hdr,
    )

    # Submit attempt (triggers server grading and Phase 7 mastery recalculation)
    res_sub = client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr)
    assert res_sub.status_code == 200
    assert res_sub.json()["passed"] is True

    # 2. Verify mastery state persisted in DB
    mastery = (
        db_session.query(StudentTopicMastery)
        .filter(
            StudentTopicMastery.student_id == student.id,
            StudentTopicMastery.topic_id == topic.id,
        )
        .first()
    )
    assert mastery is not None
    assert mastery.status in ("competent", "mastered")
    assert mastery.score_percent >= 70
    assert mastery.attempts_count == 1

    # 3. Verify audit ledger persisted
    ledger = (
        db_session.query(MasteryAuditLedger)
        .filter(
            MasteryAuditLedger.student_id == student.id,
            MasteryAuditLedger.topic_id == topic.id,
        )
        .first()
    )
    assert ledger is not None
    assert ledger.algorithm_used == "BKT_HYBRID_V1"
    assert ledger.new_status == mastery.status

    # 4. Verify API GET /courses/{course_id}/mastery reflects new competent/mastered status
    res_mastery = client_with_db.get(f"/api/v1/courses/{course.id}/mastery", headers=hdr)
    assert res_mastery.status_code == 200
    m_data = res_mastery.json()
    assert m_data["not_assessed_count"] == 0
    assert m_data["overall_mastery_percent"] >= 70


def test_recalculate_rejected_on_in_progress_attempt(client_with_db: TestClient, seed_mastery_context):
    """AC-P7-01 (Boundary Invariant): In-progress attempts cannot recalculate mastery."""
    ctx = seed_mastery_context
    student = ctx["student"]
    assessment = ctx["assessment"]
    hdr = auth_header(student)

    # Start attempt (status = in_progress)
    res_start = client_with_db.post(f"/api/v1/assessments/{assessment.id}/attempts", headers=hdr)
    att_id = res_start.json()["id"]

    # Attempt direct recalculation while in progress
    res_recalc = client_with_db.post(f"/api/v1/mastery/recalculate/{att_id}", headers=hdr)
    assert res_recalc.status_code == 400
    assert "only permitted on completed assessment attempts" in res_recalc.json()["detail"]


def test_multi_topic_assessment_attribution(
    client_with_db: TestClient, db_session: Session, seed_mastery_context
):
    """P7-FIX-03, P7-C09: Assessment without topic_id groups responses and calculates mastery per topic."""
    ctx = seed_mastery_context
    teacher = ctx["teacher"]
    student = ctx["student"]
    course = ctx["course"]
    topic_1 = ctx["topic"]
    q1 = ctx["q1"]  # belongs to topic_1
    hdr = auth_header(student)

    # 1. Create a second topic in the course
    topic_2 = Topic(
        course_id=course.id,
        title="Thermodynamics",
        order=2,
        mastery_threshold=Decimal("0.7000"),
    )
    db_session.add(topic_2)
    db_session.commit()

    # 2. Create question belonging to topic_2
    q_topic2 = Question(
        course_id=course.id,
        topic_id=topic_2.id,
        author_id=teacher.id,
        type="true_false",
        difficulty="medium",
        points=2,
        version=1,
        status="approved",
        prompt="Entropy never decreases in an isolated system.",
        payload={},
        answer_key={"correct_bool": True},
    )
    db_session.add(q_topic2)
    db_session.commit()

    # 3. Create comprehensive multi-topic exam (Assessment.topic_id = None)
    midterm = Assessment(
        course_id=course.id,
        topic_id=None,  # Multi-topic!
        creator_id=teacher.id,
        title="Physics Midterm Exam",
        type="summative",
        total_points=4,
        passing_score_percent=50,
        status="published",
    )
    db_session.add(midterm)
    db_session.commit()

    aq1 = AssessmentQuestion(assessment_id=midterm.id, question_id=q1.id, question_version=1, order=1, points=2)
    aq2 = AssessmentQuestion(assessment_id=midterm.id, question_id=q_topic2.id, question_version=1, order=2, points=2)
    db_session.add_all([aq1, aq2])
    db_session.commit()

    # 4. Start attempt
    res_start = client_with_db.post(f"/api/v1/assessments/{midterm.id}/attempts", headers=hdr)
    assert res_start.status_code == 201
    att_id = res_start.json()["id"]

    # 5. Answer q1 (Topic 1) correctly, answer q_topic2 (Topic 2) incorrectly
    client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q1.id}",
        json={"student_response": "opt_f"},
        headers=hdr,
    )
    client_with_db.put(
        f"/api/v1/attempts/{att_id}/responses/{q_topic2.id}",
        json={"student_response": False},  # Wrong!
        headers=hdr,
    )

    # 6. Submit attempt
    res_sub = client_with_db.post(f"/api/v1/attempts/{att_id}/submit", headers=hdr)
    assert res_sub.status_code == 200

    # 7. Verify Topic 1 mastery was updated independently with correct answer
    m_topic1 = (
        db_session.query(StudentTopicMastery)
        .filter(
            StudentTopicMastery.student_id == student.id,
            StudentTopicMastery.topic_id == topic_1.id,
        )
        .first()
    )
    assert m_topic1 is not None
    assert m_topic1.score_percent >= 70
    assert m_topic1.status in ("competent", "mastered")

    # 8. Verify Topic 2 mastery was updated independently with incorrect answer
    m_topic2 = (
        db_session.query(StudentTopicMastery)
        .filter(
            StudentTopicMastery.student_id == student.id,
            StudentTopicMastery.topic_id == topic_2.id,
        )
        .first()
    )
    assert m_topic2 is not None
    assert m_topic2.score_percent < 50
    assert m_topic2.status == "developing"

    # 9. Verify separate audit ledger rows for both topics
    ledger1 = (
        db_session.query(MasteryAuditLedger)
        .filter(
            MasteryAuditLedger.student_id == student.id,
            MasteryAuditLedger.topic_id == topic_1.id,
            MasteryAuditLedger.attempt_id == uuid.UUID(att_id),
        )
        .first()
    )
    ledger2 = (
        db_session.query(MasteryAuditLedger)
        .filter(
            MasteryAuditLedger.student_id == student.id,
            MasteryAuditLedger.topic_id == topic_2.id,
            MasteryAuditLedger.attempt_id == uuid.UUID(att_id),
        )
        .first()
    )
    assert ledger1 is not None
    assert ledger2 is not None
    assert ledger1.new_status != ledger2.new_status


def test_missing_topic_metadata_leaves_mastery_unmutated(
    db_session: Session, seed_mastery_context
):
    """P7-FIX-03, P7-C10: Assessment without topic metadata raises controlled diagnostic; leaves mastery unchanged."""
    from sqlalchemy import text

    ctx = seed_mastery_context
    teacher = ctx["teacher"]
    student = ctx["student"]
    course = ctx["course"]

    # 1. Create Enrollment
    enrollment = (
        db_session.query(Enrollment)
        .filter(Enrollment.student_id == student.id, Enrollment.course_id == course.id)
        .first()
    )

    # 2. Create Assessment with NO topic_id
    orphan_exam = Assessment(
        course_id=course.id,
        topic_id=None,
        creator_id=teacher.id,
        title="Untyped Exam",
        type="summative",
        total_points=1,
        status="published",
    )
    db_session.add(orphan_exam)
    db_session.commit()

    # 3. Create completed attempt with question snapshot lacking topic_id and unresolvable question_id
    unresolvable_q_id = uuid.uuid4()
    attempt = AssessmentAttempt(
        assessment_id=orphan_exam.id,
        student_id=student.id,
        enrollment_id=enrollment.id,
        attempt_number=1,
        status="graded",
        score=1,
        max_score=1,
        passed=True,
        snapshot_data={"questions": [{"id": str(unresolvable_q_id), "topic_id": None}]},
    )
    db_session.add(attempt)
    db_session.commit()

    # Temporarily disable foreign keys in SQLite to insert orphan response simulating legacy corrupted data
    db_session.execute(text("PRAGMA foreign_keys = OFF"))
    resp = AttemptResponse(
        attempt_id=attempt.id,
        question_id=unresolvable_q_id,
        question_version=1,
        student_response={"text": "True"},
        is_correct=True,
        points_awarded=Decimal("1.00"),
        points_possible=1,
    )
    db_session.add(resp)
    db_session.commit()
    db_session.execute(text("PRAGMA foreign_keys = ON"))

    # 4. Attempt mastery recalculation
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        MasteryService.recalculate_from_attempt(db_session, attempt.id, actor=student)

    assert exc_info.value.status_code == 400
    assert "Controlled diagnostic" in exc_info.value.detail
    assert "Mastery left unchanged" in exc_info.value.detail

    # 5. Verify zero mastery records created
    m_count = (
        db_session.query(StudentTopicMastery)
        .filter(StudentTopicMastery.student_id == student.id)
        .count()
    )
    assert m_count == 0
