"""Server-authoritative assessment grading service and transactional outbox event emission."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.attempt import AssessmentAttempt, AttemptResponse
from app.models.course_teacher import CourseTeacher
from app.models.outbox import DomainOutboxEvent
from app.models.user import User
from app.schemas.attempt import AssessmentResultResponse, AttemptResponseItem
from app.services.audit_service import log_audit_event


class GradingService:
    """Domain service executing server-authoritative grading and transactional outbox event creation."""

    @staticmethod
    def evaluate_response(
        q_type: str,
        student_resp: Any,
        answer_key: Dict[str, Any],
        max_points: int,
    ) -> Tuple[Optional[bool], Optional[Decimal], Optional[str]]:
        """Evaluate a student answer against server-held answer key without implicit LLM calls (DEC-06)."""
        if student_resp is None or student_resp == "":
            return False, Decimal("0.00"), "Unanswered"

        max_pts = Decimal(max_points)

        # 1. Multiple Choice
        if q_type == "multiple_choice":
            correct_ids = set(answer_key.get("correct_option_ids", []))
            if not correct_ids:
                return False, Decimal("0.00"), "No answer key configured"

            if isinstance(student_resp, list):
                selected = {str(x) for x in student_resp}
            else:
                selected = {str(student_resp)}

            is_correct = selected == correct_ids
            awarded = max_pts if is_correct else Decimal("0.00")
            feedback = "Correct" if is_correct else "Incorrect"
            return is_correct, awarded, feedback

        # 2. True / False
        elif q_type == "true_false":
            expected = answer_key.get("correct_bool")
            if expected is None:
                return False, Decimal("0.00"), "No answer key configured"

            actual = None
            if isinstance(student_resp, bool):
                actual = student_resp
            elif isinstance(student_resp, str):
                if student_resp.lower() in ("true", "1"):
                    actual = True
                elif student_resp.lower() in ("false", "0"):
                    actual = False

            is_correct = actual == expected
            awarded = max_pts if is_correct else Decimal("0.00")
            feedback = "Correct" if is_correct else "Incorrect"
            return is_correct, awarded, feedback

        # 3. Fill in the Blank
        elif q_type == "fill_blank":
            accepted = [ans.strip() for ans in answer_key.get("accepted_answers", []) if ans]
            if not accepted:
                return False, Decimal("0.00"), "No accepted answers configured"

            case_sensitive = answer_key.get("case_sensitive", False)
            resp_str = str(student_resp).strip()

            if case_sensitive:
                is_correct = any(resp_str == ans for ans in accepted)
            else:
                is_correct = any(resp_str.lower() == ans.lower() for ans in accepted)

            awarded = max_pts if is_correct else Decimal("0.00")
            feedback = "Correct" if is_correct else "Incorrect"
            return is_correct, awarded, feedback

        # 4. Matching (Proportional partial credit)
        elif q_type == "matching":
            matching_pairs = answer_key.get("matching_pairs", [])
            if not matching_pairs:
                return True, max_pts, "No pairs configured"

            total_pairs = len(matching_pairs)
            correct_count = 0

            # student_resp is expected to be a dict: {pair_id: selected_right_text} or {left_text: right_text}
            if isinstance(student_resp, dict):
                for p in matching_pairs:
                    pid = p.get("id")
                    left = p.get("left")
                    right = p.get("right")
                    # Check by pair id or left text
                    if student_resp.get(pid) == right or student_resp.get(left) == right:
                        correct_count += 1

            is_correct = correct_count == total_pairs
            fraction = Decimal(correct_count) / Decimal(total_pairs)
            awarded = (fraction * max_pts).quantize(Decimal("0.01"))
            feedback = f"Matched {correct_count} of {total_pairs} pairs"
            return is_correct, awarded, feedback

        # 5. Short Answer (DEC-06: No implicit LLM grading)
        elif q_type == "short_answer":
            mode = answer_key.get("grading_mode", "manual_review")

            if mode == "exact_match":
                accepted = [ans.strip().lower() for ans in answer_key.get("accepted_answers", []) if ans]
                resp_str = str(student_resp).strip().lower()
                is_correct = any(resp_str == ans for ans in accepted)
                awarded = max_pts if is_correct else Decimal("0.00")
                feedback = "Exact match verified" if is_correct else "Does not match expected answer"
                return is_correct, awarded, feedback
            else:
                # manual_review mode: leave un-scored, flag for teacher review
                return None, None, "Pending teacher manual review against expected rubric"

        return False, Decimal("0.00"), f"Unsupported question type: {q_type}"

    @staticmethod
    def build_result_response(attempt: AssessmentAttempt) -> AssessmentResultResponse:
        """Construct authoritative result response."""
        response_items = [
            AttemptResponseItem.model_validate(r) for r in attempt.responses
        ]
        return AssessmentResultResponse(
            id=attempt.id,
            assessment_id=attempt.assessment_id,
            student_id=attempt.student_id,
            enrollment_id=attempt.enrollment_id,
            attempt_number=attempt.attempt_number,
            status=attempt.status,
            started_at=attempt.started_at,
            submitted_at=attempt.submitted_at,
            completed_at=attempt.completed_at,
            score=attempt.score,
            max_score=attempt.max_score,
            score_percent=attempt.score_percent,
            passed=attempt.passed,
            responses=response_items,
            created_at=attempt.created_at,
        )

    @staticmethod
    def submit_attempt(
        db: Session,
        attempt_id: UUID,
        student: User,
    ) -> AssessmentResultResponse:
        """Grade attempt authoritatively and transactionally emit outbox completion event."""
        attempt = db.get(AssessmentAttempt, attempt_id)
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment attempt with ID {attempt_id} not found",
            )

        if attempt.student_id != student.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to submit another student's attempt",
            )

        # Idempotent replay: if already submitted/graded, return existing result without re-grading (DEC-P6-004)
        if attempt.status in ("graded", "submitted", "pending_manual_review"):
            return GradingService.build_result_response(attempt)

        assessment = db.get(Assessment, attempt.assessment_id)
        if not assessment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

        now = datetime.now(timezone.utc)
        snap_questions = attempt.snapshot_data.get("questions", [])

        # Map existing responses by question_id
        resp_map = {r.question_id: r for r in attempt.responses}

        total_score = Decimal("0.00")
        total_max = Decimal("0.00")
        has_pending_manual = False

        for sq in snap_questions:
            qid = UUID(sq["id"])
            pts = int(sq.get("points", 1))
            total_max += Decimal(pts)
            existing_resp = resp_map.get(qid)

            if existing_resp:
                is_corr, awarded, feedback = GradingService.evaluate_response(
                    q_type=sq.get("type", "multiple_choice"),
                    student_resp=existing_resp.student_response,
                    answer_key=sq.get("answer_key", {}),
                    max_points=pts,
                )
                existing_resp.is_correct = is_corr
                existing_resp.points_awarded = awarded
                existing_resp.feedback = feedback
                existing_resp.updated_at = now

                if awarded is not None:
                    total_score += awarded
                else:
                    has_pending_manual = True
            else:
                # Unanswered question awards 0 points (DEC-07)
                unanswered_resp = AttemptResponse(
                    attempt_id=attempt.id,
                    question_id=qid,
                    question_version=sq.get("question_version", 1),
                    student_response=None,
                    is_correct=False,
                    points_awarded=Decimal("0.00"),
                    points_possible=pts,
                    feedback="Unanswered",
                )
                db.add(unanswered_resp)

        # Compute percentage
        score_percent = (
            ((total_score / total_max) * Decimal("100.00")).quantize(Decimal("0.01"))
            if total_max > 0
            else Decimal("0.00")
        )

        # Check passing threshold
        pass_threshold = attempt.snapshot_data.get("passing_score_percent")
        passed = (score_percent >= Decimal(pass_threshold)) if pass_threshold is not None else True

        final_status = "pending_manual_review" if has_pending_manual else "graded"

        attempt.status = final_status
        attempt.submitted_at = now
        attempt.completed_at = now
        attempt.score = total_score
        attempt.max_score = int(total_max)
        attempt.score_percent = score_percent
        attempt.passed = passed
        attempt.updated_at = now

        # Atomic Outbox Event Insertion (DEC-P6-003)
        outbox_event = DomainOutboxEvent(
            event_type="assessment.completed",
            aggregate_type="assessment_attempt",
            aggregate_id=str(attempt.id),
            idempotency_key=f"asm_completed_{attempt.id}",
            payload={
                "attempt_id": str(attempt.id),
                "assessment_id": str(attempt.assessment_id),
                "assessment_type": assessment.type,
                "student_id": str(attempt.student_id),
                "enrollment_id": str(attempt.enrollment_id),
                "course_id": str(assessment.course_id),
                "topic_id": str(assessment.topic_id) if assessment.topic_id else None,
                "score_percent": float(score_percent),
                "passed": passed,
                "is_passed": passed,
                "status": final_status,
                "completed_at": now.isoformat(),
            },
            status="pending",
        )
        db.add(outbox_event)
        db.commit()
        db.refresh(attempt)

        # Trigger Phase 7 Mastery Recalibration (DEC-P7-004)
        if final_status == "graded":
            try:
                from app.services.mastery_service import MasteryService

                MasteryService.recalculate_from_attempt(db=db, attempt_id=attempt.id, actor=student)
            except Exception:
                # Failure in mastery recalculation does not fail attempt grading
                pass

        # P8-FIX-01: Gamification is fully decoupled; the outbox event remains pending
        # and will be processed asynchronously by the outbox event worker.

        log_audit_event(
            db=db,
            action="assessment.attempt.submit",
            outcome="SUCCESS",
            actor_id=student.id,
            actor_email=student.email,
            actor_role=student.role.name if student.role else None,
            target_id=str(attempt.id),
            target_type="assessment_attempt",
            details={
                "score": float(total_score),
                "max_score": int(total_max),
                "score_percent": float(score_percent),
                "passed": passed,
                "status": final_status,
            },
        )

        return GradingService.build_result_response(attempt)

    @staticmethod
    def auto_submit_expired_attempt(db: Session, attempt: AssessmentAttempt) -> None:
        """Auto-submit an expired attempt under server-authoritative UTC clock (DEC-07)."""
        if attempt.status != "in_progress":
            return

        assessment = db.get(Assessment, attempt.assessment_id)
        now = datetime.now(timezone.utc)
        snap_questions = attempt.snapshot_data.get("questions", [])
        resp_map = {r.question_id: r for r in attempt.responses}

        total_score = Decimal("0.00")
        total_max = Decimal("0.00")
        has_pending_manual = False

        for sq in snap_questions:
            qid = UUID(sq["id"])
            pts = int(sq.get("points", 1))
            total_max += Decimal(pts)
            existing_resp = resp_map.get(qid)

            if existing_resp:
                is_corr, awarded, feedback = GradingService.evaluate_response(
                    q_type=sq.get("type", "multiple_choice"),
                    student_resp=existing_resp.student_response,
                    answer_key=sq.get("answer_key", {}),
                    max_points=pts,
                )
                existing_resp.is_correct = is_corr
                existing_resp.points_awarded = awarded
                existing_resp.feedback = feedback
                existing_resp.updated_at = now

                if awarded is not None:
                    total_score += awarded
                else:
                    has_pending_manual = True
            else:
                unanswered_resp = AttemptResponse(
                    attempt_id=attempt.id,
                    question_id=qid,
                    question_version=sq.get("question_version", 1),
                    student_response=None,
                    is_correct=False,
                    points_awarded=Decimal("0.00"),
                    points_possible=pts,
                    feedback="Expired unanswered",
                )
                db.add(unanswered_resp)

        score_percent = (
            ((total_score / total_max) * Decimal("100.00")).quantize(Decimal("0.01"))
            if total_max > 0
            else Decimal("0.00")
        )
        pass_threshold = attempt.snapshot_data.get("passing_score_percent")
        passed = (score_percent >= Decimal(pass_threshold)) if pass_threshold is not None else True

        attempt.status = "expired"
        attempt.submitted_at = now
        attempt.completed_at = now
        attempt.score = total_score
        attempt.max_score = int(total_max)
        attempt.score_percent = score_percent
        attempt.passed = passed
        attempt.updated_at = now

        # Insert outbox event
        if assessment:
            outbox_event = DomainOutboxEvent(
                event_type="assessment.completed",
                aggregate_type="assessment_attempt",
                aggregate_id=str(attempt.id),
                idempotency_key=f"asm_completed_{attempt.id}",
                payload={
                    "attempt_id": str(attempt.id),
                    "assessment_id": str(attempt.assessment_id),
                    "assessment_type": assessment.type,
                    "student_id": str(attempt.student_id),
                    "enrollment_id": str(attempt.enrollment_id),
                    "course_id": str(assessment.course_id),
                    "topic_id": str(assessment.topic_id) if assessment.topic_id else None,
                    "score_percent": float(score_percent),
                    "passed": passed,
                    "is_passed": passed,
                    "status": "expired",
                    "completed_at": now.isoformat(),
                },
                status="pending",
            )
            db.add(outbox_event)

        db.commit()

    @staticmethod
    def get_attempt_result(db: Session, attempt_id: UUID, user: User) -> AssessmentResultResponse:
        """Retrieve authoritative result for an attempt with role-based scoping."""
        attempt = db.get(AssessmentAttempt, attempt_id)
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment attempt with ID {attempt_id} not found",
            )

        if user.role.name == "student":
            if attempt.student_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to inspect another student's result",
                )
        elif user.role.name == "teacher":
            assessment = db.get(Assessment, attempt.assessment_id)
            if assessment:
                is_assigned = db.execute(
                    select(CourseTeacher).where(
                        CourseTeacher.course_id == assessment.course_id,
                        CourseTeacher.teacher_id == user.id,
                    )
                ).first() is not None or assessment.course.creator_id == user.id
                if not is_assigned:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Not authorized to inspect results for this course",
                    )

        return GradingService.build_result_response(attempt)
