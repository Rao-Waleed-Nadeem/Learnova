"""Knowledge Tracing & Dynamic Mastery Service for Learnova (FR-MAS-01 - FR-MAS-08, SSD-02, SSD-04)."""

import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.attempt import AssessmentAttempt, AttemptResponse
from app.models.course import Course
from app.models.mastery import MasteryAuditLedger, StudentTopicMastery
from app.models.question import Question
from app.models.topic import Topic
from app.models.topic_prerequisite import TopicPrerequisite
from app.models.user import User
from app.schemas.mastery import (
    CourseMasteryResponse,
    MasteryRecalculateResponse,
    TopicMasteryItem,
    TopicMasteryRecalculateItem,
    TopicPrerequisiteStatus,
    TopicReadinessResponse,
)
from app.services.audit_service import log_audit_event

logger = logging.getLogger(__name__)


class MasteryService:
    """Core domain service for Bayesian Knowledge Tracing (BKT), topic mastery, and readiness."""

    # Classical Corbett & Anderson (1995) default BKT parameters
    DEFAULT_P_TRANSIT = 0.20  # Probability of learning transition
    DEFAULT_P_GUESS = 0.20    # Probability of guessing correctly
    DEFAULT_P_SLIP = 0.10     # Probability of slip (careless mistake)
    DEFAULT_PRIOR = 0.10      # Prior probability of knowing skill before assessment

    @classmethod
    def compute_bkt_step(
        cls,
        prior: float,
        is_correct: bool,
        p_transit: float = DEFAULT_P_TRANSIT,
        p_guess: float = DEFAULT_P_GUESS,
        p_slip: float = DEFAULT_P_SLIP,
    ) -> float:
        """Compute single-step Bayesian Knowledge Tracing posterior and transition probability."""
        clamped_prior = max(0.0001, min(0.9999, float(prior)))

        if is_correct:
            num = clamped_prior * (1.0 - p_slip)
            den = num + (1.0 - clamped_prior) * p_guess
        else:
            num = clamped_prior * p_slip
            den = num + (1.0 - clamped_prior) * (1.0 - p_guess)

        den = max(1e-9, den)
        posterior = num / den

        # Transition update: probability of knowing skill at next step
        p_learned = posterior + (1.0 - posterior) * p_transit
        return max(0.0001, min(0.9999, round(p_learned, 4)))

    @classmethod
    def compute_bkt_sequence(
        cls,
        observations: List[bool],
        initial_prior: float = DEFAULT_PRIOR,
        p_transit: float = DEFAULT_P_TRANSIT,
        p_guess: float = DEFAULT_P_GUESS,
        p_slip: float = DEFAULT_P_SLIP,
    ) -> float:
        """Compute final BKT posterior probability across a sequential batch of item observations."""
        current_p = initial_prior
        for obs in observations:
            current_p = cls.compute_bkt_step(
                prior=current_p,
                is_correct=obs,
                p_transit=p_transit,
                p_guess=p_guess,
                p_slip=p_slip,
            )
        return round(current_p, 4)

    @classmethod
    def compute_hybrid_mastery(
        cls,
        score_ratio: float,
        bkt_prob: float,
    ) -> Tuple[Decimal, int, str]:
        """Compute hybrid mastery score blending exam performance (60%) and Bayesian skill belief (40%)."""
        clamped_ratio = max(0.0, min(1.0, float(score_ratio)))
        clamped_bkt = max(0.0, min(1.0, float(bkt_prob)))

        # Hybrid formula approved in DEC-P7-001
        hybrid = 0.60 * clamped_ratio + 0.40 * clamped_bkt
        score_dec = Decimal(str(round(hybrid, 4)))
        score_percent = int(round(float(score_dec) * 100))

        if score_percent >= 85:
            status_label = "mastered"
        elif score_percent >= 70:
            status_label = "competent"
        else:
            status_label = "developing"

        return score_dec, score_percent, status_label

    @classmethod
    def recalculate_from_attempt(
        cls,
        db: Session,
        attempt_id: uuid.UUID,
        actor: Optional[User] = None,
    ) -> MasteryRecalculateResponse:
        """Authoritative mastery recalculation triggered strictly upon completed assessment (DEC-03)."""
        attempt = db.get(AssessmentAttempt, attempt_id)
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment attempt not found: {attempt_id}",
            )

        # Invariant check: In-progress or abandoned attempts cannot recalculate mastery
        if attempt.status not in ("graded", "submitted"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mastery recalculation is only permitted on completed assessment attempts (current status: {attempt.status})",
            )

        assessment = db.get(Assessment, attempt.assessment_id)
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated assessment not found",
            )

        student_id = attempt.student_id
        course_id = assessment.course_id

        # Gather item responses for this attempt
        responses = (
            db.query(AttemptResponse)
            .filter(AttemptResponse.attempt_id == attempt.id)
            .all()
        )

        # P7-FIX-03: Attribution resolution
        # 1. If Assessment.topic_id is set, it is authoritative.
        # 2. Otherwise, inspect attempt snapshot / question metadata and group responses by question topic_id.
        responses_by_topic: Dict[uuid.UUID, List[AttemptResponse]] = {}

        if assessment.topic_id:
            responses_by_topic[assessment.topic_id] = list(responses)
        else:
            # Multi-topic assessment or assessment without explicit topic:
            # Map snapshot questions to topic_ids
            snap_questions = attempt.snapshot_data.get("questions", []) if attempt.snapshot_data else []
            snap_q_topic_map: Dict[uuid.UUID, uuid.UUID] = {}
            for sq in snap_questions:
                sq_id = sq.get("id")
                sq_tid = sq.get("topic_id")
                if sq_id and sq_tid:
                    try:
                        snap_q_topic_map[uuid.UUID(str(sq_id))] = uuid.UUID(str(sq_tid))
                    except (ValueError, TypeError):
                        pass

            for r in responses:
                t_id = snap_q_topic_map.get(r.question_id)
                if not t_id:
                    # Fallback to current question record in DB if snapshot lacks topic_id
                    q_row = db.get(Question, r.question_id)
                    if q_row and q_row.topic_id:
                        t_id = q_row.topic_id
                if t_id:
                    responses_by_topic.setdefault(t_id, []).append(r)

        # P7-FIX-03: Never fallback to first question topic or first course topic.
        # If no reliable topic mapping exists, do not fabricate mastery; log controlled diagnostic and raise 400.
        if not responses_by_topic:
            logger.warning(
                "Controlled diagnostic: Cannot recalculate mastery for attempt %s. "
                "Assessment has no topic_id and questions contain no topic metadata. Mastery unchanged.",
                attempt.id,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Controlled diagnostic: Cannot recalibrate mastery. No reliable topic metadata associated with assessment questions. Mastery left unchanged.",
            )

        updated_items: List[TopicMasteryRecalculateItem] = []
        now = datetime.now(timezone.utc)
        actor_id = actor.id if actor else student_id
        actor_email = actor.email if actor else None
        actor_role = actor.role.name if actor and actor.role else "student"

        for t_id, topic_responses in responses_by_topic.items():
            target_topic = db.get(Topic, t_id)
            topic_title = target_topic.title if target_topic else "Unknown Topic"

            topic_total_pts = sum(float(r.points_awarded or 0.0) for r in topic_responses)
            topic_max_pts = sum(float(r.points_possible or 1.0) for r in topic_responses)
            score_ratio = topic_total_pts / topic_max_pts if topic_max_pts > 0 else 0.0
            observations = [bool(r.is_correct) for r in topic_responses]

            existing_mastery = (
                db.query(StudentTopicMastery)
                .filter(
                    StudentTopicMastery.student_id == student_id,
                    StudentTopicMastery.topic_id == t_id,
                )
                .first()
            )

            # Idempotency check: if this attempt was already processed for this topic, skip mutation
            if existing_mastery and existing_mastery.last_attempt_id == attempt.id:
                updated_items.append(
                    TopicMasteryRecalculateItem(
                        topic_id=t_id,
                        topic_title=topic_title,
                        previous_score=float(existing_mastery.mastery_score),
                        new_score=float(existing_mastery.mastery_score),
                        previous_status=existing_mastery.status,
                        new_status=existing_mastery.status,
                        score_percent=existing_mastery.score_percent,
                        bkt_probability=float(existing_mastery.bkt_probability) if existing_mastery.bkt_probability is not None else None,
                        attempts_count=existing_mastery.attempts_count,
                    )
                )
                continue

            prior = float(existing_mastery.bkt_probability) if existing_mastery and existing_mastery.bkt_probability is not None else cls.DEFAULT_PRIOR
            if assessment.type == "diagnostic":
                prior = cls.DEFAULT_PRIOR

            final_bkt = cls.compute_bkt_sequence(observations, initial_prior=prior)
            new_score, new_percent, new_status = cls.compute_hybrid_mastery(score_ratio, final_bkt)

            prev_score: Optional[float] = None
            prev_status: Optional[str] = None

            if existing_mastery:
                prev_score = float(existing_mastery.mastery_score)
                prev_status = existing_mastery.status
                existing_mastery.mastery_score = new_score
                existing_mastery.score_percent = new_percent
                existing_mastery.status = new_status
                existing_mastery.bkt_probability = Decimal(str(final_bkt))
                existing_mastery.attempts_count += 1
                existing_mastery.last_attempt_id = attempt.id
                existing_mastery.last_assessed_at = now
                existing_mastery.updated_at = now
                current_attempts_count = existing_mastery.attempts_count
            else:
                new_record = StudentTopicMastery(
                    student_id=student_id,
                    course_id=course_id,
                    topic_id=t_id,
                    mastery_score=new_score,
                    score_percent=new_percent,
                    status=new_status,
                    bkt_probability=Decimal(str(final_bkt)),
                    attempts_count=1,
                    last_attempt_id=attempt.id,
                    last_assessed_at=now,
                )
                db.add(new_record)
                current_attempts_count = 1

            # Chronological audit ledger (P7-FIX-04: algorithm_used="BKT_HYBRID_V1")
            ledger_entry = MasteryAuditLedger(
                student_id=student_id,
                topic_id=t_id,
                attempt_id=attempt.id,
                previous_score=Decimal(str(prev_score)) if prev_score is not None else None,
                new_score=new_score,
                previous_status=prev_status,
                new_status=new_status,
                assessment_type=assessment.type,
                algorithm_used="BKT_HYBRID_V1",
            )
            db.add(ledger_entry)

            # Audit logging
            log_audit_event(
                db=db,
                action="mastery.recalculated",
                outcome="success",
                actor_id=actor_id,
                actor_email=actor_email,
                actor_role=actor_role,
                target_type="topic_mastery",
                target_id=str(t_id),
                details={
                    "attempt_id": str(attempt.id),
                    "previous_score": prev_score,
                    "new_score": float(new_score),
                    "status": new_status,
                    "score_percent": new_percent,
                    "bkt_probability": final_bkt,
                },
            )

            updated_items.append(
                TopicMasteryRecalculateItem(
                    topic_id=t_id,
                    topic_title=topic_title,
                    previous_score=prev_score,
                    new_score=float(new_score),
                    previous_status=prev_status,
                    new_status=new_status,
                    score_percent=new_percent,
                    bkt_probability=final_bkt,
                    attempts_count=current_attempts_count,
                )
            )

        # P7-FIX-01: Note that DomainOutboxEvent is NOT mutated here.
        # Outbox event status ownership belongs strictly to the Phase 8 gamification consumer.

        db.commit()

        # Build response (primary topic summary with optional updated_topics list)
        primary = updated_items[0]
        return MasteryRecalculateResponse(
            topic_id=primary.topic_id,
            topic_title=primary.topic_title,
            previous_score=primary.previous_score,
            new_score=primary.new_score,
            previous_status=primary.previous_status,
            new_status=primary.new_status,
            score_percent=primary.score_percent,
            bkt_probability=primary.bkt_probability,
            attempts_count=primary.attempts_count,
            message=f"Cognitive mastery recalculated successfully for {len(updated_items)} topic(s).",
            updated_topics=updated_items,
        )

    @classmethod
    def get_course_mastery(
        cls,
        db: Session,
        course_id: uuid.UUID,
        student_id: uuid.UUID,
    ) -> CourseMasteryResponse:
        """Retrieve topic mastery states for a course, explicitly handling unassessed topics (AC-P7-02)."""
        course = db.get(Course, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course not found: {course_id}",
            )

        topics = (
            db.query(Topic)
            .filter(Topic.course_id == course_id)
            .order_by(Topic.order)
            .all()
        )

        mastery_rows = (
            db.query(StudentTopicMastery)
            .filter(
                StudentTopicMastery.student_id == student_id,
                StudentTopicMastery.course_id == course_id,
            )
            .all()
        )
        mastery_map: Dict[uuid.UUID, StudentTopicMastery] = {m.topic_id: m for m in mastery_rows}

        topic_items: List[TopicMasteryItem] = []
        mastered_count = 0
        competent_count = 0
        developing_count = 0
        not_assessed_count = 0

        for t in topics:
            m = mastery_map.get(t.id)
            if m:
                status_val = m.status
                score_val = float(m.mastery_score)
                pct_val = m.score_percent
                bkt_val = float(m.bkt_probability) if m.bkt_probability is not None else None
                attempts_val = m.attempts_count
                assessed_at = m.last_assessed_at

                if status_val == "mastered":
                    mastered_count += 1
                elif status_val == "competent":
                    competent_count += 1
                elif status_val == "developing":
                    developing_count += 1
                else:
                    not_assessed_count += 1
            else:
                # Explicit unassessed representation
                status_val = "not_assessed"
                score_val = 0.0
                pct_val = 0
                bkt_val = None
                attempts_val = 0
                assessed_at = None
                not_assessed_count += 1

            topic_items.append(
                TopicMasteryItem(
                    topic_id=t.id,
                    topic_title=t.title,
                    course_id=course_id,
                    mastery_score=score_val,
                    score_percent=pct_val,
                    status=status_val,
                    bkt_probability=bkt_val,
                    attempts_count=attempts_val,
                    last_assessed_at=assessed_at,
                )
            )

        total_topics = len(topics)
        overall_pct = (
            int(round(sum(item.score_percent for item in topic_items) / total_topics))
            if total_topics > 0
            else 0
        )

        return CourseMasteryResponse(
            course_id=course_id,
            student_id=student_id,
            topics=topic_items,
            overall_mastery_percent=overall_pct,
            mastered_count=mastered_count,
            competent_count=competent_count,
            developing_count=developing_count,
            not_assessed_count=not_assessed_count,
        )

    @classmethod
    def get_topic_readiness(
        cls,
        db: Session,
        topic_id: uuid.UUID,
        student_id: uuid.UUID,
    ) -> TopicReadinessResponse:
        """Evaluate topic access readiness by inspecting prerequisite DAG compliance (SSD-02)."""
        topic = db.get(Topic, topic_id)
        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Topic not found: {topic_id}",
            )

        # Query prerequisite edges where this topic is the dependent
        prereq_edges = (
            db.query(TopicPrerequisite)
            .filter(TopicPrerequisite.topic_id == topic_id)
            .all()
        )

        if not prereq_edges:
            return TopicReadinessResponse(
                topic_id=topic_id,
                topic_title=topic.title,
                is_ready=True,
                unmet_prerequisites=[],
                diagnostic_assessment_id=None,
                reason="Topic has no prerequisites and is ready for study.",
            )

        # Check student's mastery in each prerequisite topic
        prereq_topic_ids = [p.prerequisite_topic_id for p in prereq_edges]
        prereq_topics = db.query(Topic).filter(Topic.id.in_(prereq_topic_ids)).all()
        prereq_topic_map = {t.id: t for t in prereq_topics}

        # P7-FIX-05: Enforce that all prerequisite topics belong to the same course as the dependent topic
        for p_topic in prereq_topics:
            if p_topic.course_id != topic.course_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Prerequisite topic {p_topic.id} does not belong to the same course as topic {topic_id}.",
                )

        mastery_rows = (
            db.query(StudentTopicMastery)
            .filter(
                StudentTopicMastery.student_id == student_id,
                StudentTopicMastery.topic_id.in_(prereq_topic_ids),
            )
            .all()
        )
        mastery_map = {m.topic_id: m for m in mastery_rows}

        unmet: List[TopicPrerequisiteStatus] = []
        for p_id in prereq_topic_ids:
            p_topic = prereq_topic_map.get(p_id)
            title = p_topic.title if p_topic else "Prerequisite Topic"
            req_mastery = float(p_topic.mastery_threshold) if p_topic and p_topic.mastery_threshold is not None else 0.7500

            m = mastery_map.get(p_id)
            cur_mastery = float(m.mastery_score) if m else 0.0
            cur_status = m.status if m else "not_assessed"

            # P7-FIX-02: Strictly require numeric threshold to be satisfied.
            # A status label must NOT bypass a higher configured numerical threshold.
            is_sat = cur_mastery >= req_mastery
            if not is_sat:
                unmet.append(
                    TopicPrerequisiteStatus(
                        prerequisite_topic_id=p_id,
                        prerequisite_title=title,
                        required_mastery=req_mastery,
                        current_mastery=cur_mastery,
                        status=cur_status,
                        is_satisfied=False,
                    )
                )

        is_ready = len(unmet) == 0

        # If not ready, find if course has a published diagnostic assessment
        diag_id: Optional[uuid.UUID] = None
        if not is_ready:
            diag_assessment = (
                db.query(Assessment)
                .filter(
                    Assessment.course_id == topic.course_id,
                    Assessment.type == "diagnostic",
                    Assessment.status == "published",
                )
                .first()
            )
            if diag_assessment:
                diag_id = diag_assessment.id

        reason = (
            "All prerequisite knowledge criteria satisfied."
            if is_ready
            else f"Topic has {len(unmet)} unmet prerequisite(s). Complete prerequisite topics or take diagnostic test."
        )

        return TopicReadinessResponse(
            topic_id=topic_id,
            topic_title=topic.title,
            is_ready=is_ready,
            unmet_prerequisites=unmet,
            diagnostic_assessment_id=diag_id,
            reason=reason,
        )
