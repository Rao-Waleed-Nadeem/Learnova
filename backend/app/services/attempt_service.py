"""Assessment attempt domain service managing student lifecycle, timing, snapshots, and adaptive selection."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.attempt import AssessmentAttempt, AttemptResponse
from app.models.course_teacher import CourseTeacher
from app.models.enrollment import Enrollment
from app.models.question import Question
from app.models.user import User
from app.schemas.attempt import (
    AssessmentAttemptResponse,
    AttemptAdaptiveNextQuestionResponse,
    AttemptResponseItem,
    AttemptResponseSaveRequest,
    AttemptStartRequest,
)
from app.services.audit_service import log_audit_event
from app.services.question_service import QuestionService


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure a datetime is UTC offset-aware for cross-dialect compatibility (SQLite/PostgreSQL)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class AttemptService:
    """Domain service managing the creation, timing, snapshotting, and interim responses of assessment attempts."""

    @staticmethod
    def build_attempt_response(attempt: AssessmentAttempt) -> AssessmentAttemptResponse:
        """Construct a student-safe projection of the attempt (answer keys strictly omitted)."""
        snap_questions = attempt.snapshot_data.get("questions", [])
        safe_questions: List[Dict[str, Any]] = []

        for sq in snap_questions:
            # Deliverable question projection: prompt, points, payload (no answer_key)
            safe_questions.append({
                "id": sq.get("id"),
                "order": sq.get("order", 0),
                "points": sq.get("points", 1),
                "type": sq.get("type"),
                "difficulty": sq.get("difficulty"),
                "prompt": sq.get("prompt"),
                "payload": sq.get("payload", {}),
            })

        response_items = [
            AttemptResponseItem.model_validate(r) for r in attempt.responses
        ]

        return AssessmentAttemptResponse(
            id=attempt.id,
            assessment_id=attempt.assessment_id,
            student_id=attempt.student_id,
            enrollment_id=attempt.enrollment_id,
            attempt_number=attempt.attempt_number,
            status=attempt.status,
            started_at=attempt.started_at,
            deadline_at=attempt.deadline_at,
            current_difficulty=attempt.current_difficulty,
            max_score=attempt.max_score,
            questions=safe_questions,
            responses=response_items,
            created_at=attempt.created_at,
        )

    @staticmethod
    def start_attempt(
        db: Session,
        assessment_id: UUID,
        student: User,
        req: Optional[AttemptStartRequest] = None,
    ) -> AssessmentAttemptResponse:
        """Start a new assessment attempt for an enrolled student or resume active attempt."""
        if student.role.name != "student" and student.role.name != "administrator":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only students can start assessment attempts",
            )

        assessment = db.get(Assessment, assessment_id)
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment with ID {assessment_id} not found",
            )

        # 1. Enforce publication gate
        if assessment.status != "published":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot start an attempt on an unpublished assessment",
            )

        # 2. Enforce active enrollment
        enrollment = db.execute(
            select(Enrollment).where(
                Enrollment.course_id == assessment.course_id,
                Enrollment.student_id == student.id,
                Enrollment.status == "active",
            )
        ).scalar_one_or_none()

        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student is not actively enrolled in this course",
            )

        # 3. Check for existing in-progress attempt
        existing_attempt = db.execute(
            select(AssessmentAttempt).where(
                AssessmentAttempt.assessment_id == assessment_id,
                AssessmentAttempt.student_id == student.id,
                AssessmentAttempt.status == "in_progress",
            )
        ).scalar_one_or_none()

        now = datetime.now(timezone.utc)
        if existing_attempt:
            # Check deadline expiry on existing attempt
            existing_deadline = ensure_utc(existing_attempt.deadline_at)
            if existing_deadline and now > existing_deadline:
                # Trigger auto-submit on expiry (DEC-07)
                from app.services.grading_service import GradingService
                GradingService.auto_submit_expired_attempt(db, existing_attempt)
            else:
                # Return active in-progress attempt (idempotent start)
                return AttemptService.build_attempt_response(existing_attempt)

        # 4. Enforce max_attempts limit
        attempt_count = db.execute(
            select(func.count(AssessmentAttempt.id)).where(
                AssessmentAttempt.assessment_id == assessment_id,
                AssessmentAttempt.student_id == student.id,
            )
        ).scalar() or 0

        if assessment.max_attempts and attempt_count >= assessment.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Maximum attempt limit ({assessment.max_attempts}) reached for this assessment",
            )

        # 5. Calculate authoritative UTC deadline
        started_at = now
        deadline_at = None
        if assessment.time_limit_minutes:
            deadline_at = started_at + timedelta(minutes=assessment.time_limit_minutes)

        # 6. Snapshot questions and scoring rules (DEC-P6-001)
        snap_questions = []
        total_max_score = 0
        for aq in assessment.assessment_questions:
            q = aq.question
            if not q:
                continue
            snap_questions.append({
                "id": str(q.id),
                "order": aq.order,
                "points": aq.points,
                "question_version": aq.question_version,
                "type": q.type,
                "difficulty": q.difficulty,
                "prompt": q.prompt,
                "payload": q.payload or {},
                "answer_key": q.answer_key or {},  # Stored in server snapshot for grading
                "topic_id": str(q.topic_id) if q.topic_id else None,
            })
            total_max_score += aq.points

        initial_difficulty = (req.initial_difficulty if req else None) or "medium"
        snapshot_data = {
            "title": assessment.title,
            "type": assessment.type,
            "instructions": assessment.instructions,
            "passing_score_percent": assessment.passing_score_percent,
            "questions": snap_questions,
        }

        attempt = AssessmentAttempt(
            assessment_id=assessment.id,
            student_id=student.id,
            enrollment_id=enrollment.id,
            attempt_number=attempt_count + 1,
            status="in_progress",
            started_at=started_at,
            deadline_at=deadline_at,
            max_score=total_max_score,
            current_difficulty=initial_difficulty,
            snapshot_data=snapshot_data,
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        log_audit_event(
            db=db,
            action="assessment.attempt.start",
            outcome="SUCCESS",
            actor_id=student.id,
            actor_email=student.email,
            actor_role=student.role.name if student.role else None,
            target_id=str(attempt.id),
            target_type="assessment_attempt",
            details={
                "assessment_id": str(assessment.id),
                "attempt_number": attempt.attempt_number,
                "max_score": attempt.max_score,
            },
        )

        return AttemptService.build_attempt_response(attempt)

    @staticmethod
    def get_attempt(db: Session, attempt_id: UUID, user: User) -> AssessmentAttemptResponse:
        """Retrieve student-safe view of an attempt, auto-submitting if expired."""
        attempt = db.get(AssessmentAttempt, attempt_id)
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment attempt with ID {attempt_id} not found",
            )

        # Authorization check
        if user.role.name == "student":
            if attempt.student_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to inspect another student's attempt",
                )
        elif user.role.name == "teacher":
            # Verify course teacher access
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
                        detail="Not authorized to inspect attempts for this course",
                    )

        # Check deadline expiry if still in progress
        now = datetime.now(timezone.utc)
        deadline = ensure_utc(attempt.deadline_at)
        if attempt.status == "in_progress" and deadline and now > deadline:
            from app.services.grading_service import GradingService
            GradingService.auto_submit_expired_attempt(db, attempt)
            db.refresh(attempt)

        return AttemptService.build_attempt_response(attempt)

    @staticmethod
    def record_response(
        db: Session,
        attempt_id: UUID,
        question_id: UUID,
        req: AttemptResponseSaveRequest,
        student: User,
    ) -> AttemptResponseItem:
        """Save or update an interim question response idempotently during an active attempt."""
        attempt = db.get(AssessmentAttempt, attempt_id)
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment attempt with ID {attempt_id} not found",
            )

        if attempt.student_id != student.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to submit answers to another student's attempt",
            )

        if attempt.status != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot record responses on a completed or expired attempt",
            )

        # Server-authoritative deadline validation
        now = datetime.now(timezone.utc)
        deadline = ensure_utc(attempt.deadline_at)
        if deadline and now > deadline:
            from app.services.grading_service import GradingService
            GradingService.auto_submit_expired_attempt(db, attempt)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assessment deadline has expired; attempt auto-submitted",
            )

        # Validate question belongs to the attempt's snapshotted questions
        snap_questions = attempt.snapshot_data.get("questions", [])
        target_q = next((q for q in snap_questions if q.get("id") == str(question_id)), None)
        if not target_q:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Question {question_id} is not part of this assessment attempt",
            )

        # Idempotent upsert against unique constraint (attempt_id, question_id)
        existing_resp = db.execute(
            select(AttemptResponse).where(
                AttemptResponse.attempt_id == attempt.id,
                AttemptResponse.question_id == question_id,
            )
        ).scalar_one_or_none()

        if existing_resp:
            existing_resp.student_response = req.student_response
            existing_resp.response_time_seconds = req.response_time_seconds
            existing_resp.updated_at = now
            resp_entity = existing_resp
        else:
            resp_entity = AttemptResponse(
                attempt_id=attempt.id,
                question_id=question_id,
                question_version=target_q.get("question_version", 1),
                student_response=req.student_response,
                points_possible=target_q.get("points", 1),
                response_time_seconds=req.response_time_seconds,
            )
            db.add(resp_entity)

        db.commit()
        db.refresh(resp_entity)
        return AttemptResponseItem.model_validate(resp_entity)

    @staticmethod
    def get_next_adaptive_question(
        db: Session,
        attempt_id: UUID,
        student: User,
    ) -> AttemptAdaptiveNextQuestionResponse:
        """Select next practice question using session-local difficulty adjustment (DEC-03)."""
        attempt = db.get(AssessmentAttempt, attempt_id)
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment attempt with ID {attempt_id} not found",
            )

        if attempt.student_id != student.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this attempt",
            )

        assessment = db.get(Assessment, attempt.assessment_id)
        if not assessment or assessment.type != "adaptive":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Next question selection is only supported for adaptive assessments",
            )

        if attempt.status != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attempt is not in progress",
            )

        now = datetime.now(timezone.utc)
        deadline = ensure_utc(attempt.deadline_at)
        if deadline and now > deadline:
            from app.services.grading_service import GradingService
            GradingService.auto_submit_expired_attempt(db, attempt)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assessment deadline has expired",
            )

        # 1. Identify used question IDs in this attempt
        snap_questions = attempt.snapshot_data.get("questions", [])
        used_ids = {UUID(q["id"]) for q in snap_questions}

        # 2. Check correctness of last response
        was_last_correct = None
        if attempt.responses:
            last_resp = sorted(attempt.responses, key=lambda r: r.created_at, reverse=True)[0]
            last_snap_q = next((q for q in snap_questions if q["id"] == str(last_resp.question_id)), None)
            if last_snap_q:
                from app.services.grading_service import GradingService
                is_corr, _, _ = GradingService.evaluate_response(
                    q_type=last_snap_q.get("type", "multiple_choice"),
                    student_resp=last_resp.student_response,
                    answer_key=last_snap_q.get("answer_key", {}),
                    max_points=last_snap_q.get("points", 1),
                )
                was_last_correct = is_corr

        # 3. Determine next target difficulty sequentially (easy <-> medium <-> hard)
        curr_diff = attempt.current_difficulty or "medium"
        next_diff = curr_diff
        if was_last_correct is True:
            if curr_diff == "easy":
                next_diff = "medium"
            elif curr_diff == "medium":
                next_diff = "hard"
        elif was_last_correct is False:
            if curr_diff == "hard":
                next_diff = "medium"
            elif curr_diff == "medium":
                next_diff = "easy"

        # 4. Query question bank for unused candidate
        stmt = select(Question).where(
            Question.course_id == assessment.course_id,
            Question.status == "approved",
            Question.id.not_in(used_ids) if used_ids else True,
        )
        if assessment.topic_id:
            stmt = stmt.where(Question.topic_id == assessment.topic_id)

        all_candidates = db.execute(stmt).scalars().all()
        if not all_candidates:
            return AttemptAdaptiveNextQuestionResponse(
                attempt_id=attempt.id,
                current_difficulty=next_diff,
                question=None,
            )

        # Filter by next_diff, then curr_diff, then first available
        target_q = next((q for q in all_candidates if q.difficulty == next_diff), None)
        if not target_q:
            target_q = next((q for q in all_candidates if q.difficulty == curr_diff), None)
        if not target_q:
            target_q = all_candidates[0]

        # 5. Append candidate to attempt's immutable snapshot
        new_order = len(snap_questions)
        snap_questions.append({
            "id": str(target_q.id),
            "order": new_order,
            "points": target_q.points,
            "question_version": target_q.version,
            "type": target_q.type,
            "difficulty": target_q.difficulty,
            "prompt": target_q.prompt,
            "payload": target_q.payload or {},
            "answer_key": target_q.answer_key or {},
            "topic_id": str(target_q.topic_id) if target_q.topic_id else None,
        })
        attempt.snapshot_data["questions"] = snap_questions
        attempt.current_difficulty = next_diff
        attempt.max_score += target_q.points
        attempt.updated_at = now
        db.commit()

        return AttemptAdaptiveNextQuestionResponse(
            attempt_id=attempt.id,
            current_difficulty=next_diff,
            question=QuestionService.build_student_projection(target_q),
        )
