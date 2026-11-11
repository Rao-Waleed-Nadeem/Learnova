"""Domain service managing candidate question generation, quarantined persistence, and teacher review."""

import uuid
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.ai.adapter import AIGenerateRequest, GeminiServiceAdapter, ILLMServiceAdapter
from app.core.config import settings
from app.models.ai import AICandidateQuestion
from app.models.course import Course
from app.models.question import Question
from app.models.topic import Topic
from app.models.user import User
from app.schemas.ai import (
    AIGenerateQuestionsRequest,
    AICandidateUpdateRequest,
)
from app.schemas.question import QuestionCreateRequest
from app.services.audit_service import log_audit_event
from app.services.question_service import QuestionService


class AICandidateService:
    """Service governing quarantined candidate questions, teacher inspection, and promotion."""

    _adapter: Optional[ILLMServiceAdapter] = None

    @classmethod
    def get_adapter(cls) -> ILLMServiceAdapter:
        if cls._adapter is None:
            cls._adapter = GeminiServiceAdapter(
                api_key=settings.GEMINI_API_KEY,
                model=settings.GEMINI_MODEL,
                timeout_seconds=settings.AI_TIMEOUT_SECONDS,
            )
        return cls._adapter

    @classmethod
    def set_adapter(cls, adapter: ILLMServiceAdapter) -> None:
        cls._adapter = adapter

    @staticmethod
    def generate_candidate_questions(
        db: Session,
        req: AIGenerateQuestionsRequest,
        actor: User,
    ) -> List[AICandidateQuestion]:
        """Generate candidate questions via LLM and quarantine them in pending_review status."""
        # 1. Verify course teacher access
        QuestionService.verify_course_teacher_access(db, req.course_id, actor)

        # 2. Verify topic exists and belongs to course
        topic = db.get(Topic, req.topic_id)
        if not topic or topic.course_id != req.course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Topic does not belong to the specified course",
            )

        course = db.get(Course, req.course_id)
        course_title = course.title if course else "Course"
        topic_title = topic.title if topic else "Topic"

        # 3. Call adapter
        adapter = AICandidateService.get_adapter()
        adapter_req = AIGenerateRequest(
            course_title=course_title,
            topic_title=topic_title,
            source_content=req.source_content or "",
            question_types=req.question_types or ["multiple_choice"],
            difficulty=req.difficulty,
            count=req.count,
        )

        gen_result = adapter.generate_questions(adapter_req)

        # 4. Persist drafts into ai_question_candidates table (QUARANTINED)
        saved_candidates: List[AICandidateQuestion] = []
        for draft in gen_result.candidates:
            cand = AICandidateQuestion(
                course_id=req.course_id,
                topic_id=req.topic_id,
                author_id=actor.id,
                type=draft.type,
                difficulty=draft.difficulty,
                points=draft.points,
                prompt=draft.prompt,
                explanation=draft.explanation,
                source_context=draft.source_context or f"Curriculum topic: {topic_title}",
                payload=draft.payload,
                answer_key=draft.answer_key,
                status="pending_review",
                provider=gen_result.source,
                model=settings.GEMINI_MODEL,
                prompt_version="v1",
            )
            db.add(cand)
            saved_candidates.append(cand)

        db.commit()
        for cand in saved_candidates:
            db.refresh(cand)

        log_audit_event(
            db,
            action="ai_candidates_generated",
            outcome="success",
            actor_id=actor.id,
            target_type="course",
            target_id=str(req.course_id),
            details={
                "topic_id": str(req.topic_id),
                "count": len(saved_candidates),
                "source": gen_result.source,
            },
        )

        return saved_candidates

    @staticmethod
    def list_candidates(
        db: Session,
        course_id: UUID,
        actor: User,
        topic_id: Optional[UUID] = None,
        status_filter: Optional[str] = None,
    ) -> List[AICandidateQuestion]:
        """List quarantined candidate questions for an authorized course."""
        QuestionService.verify_course_teacher_access(db, course_id, actor)

        query = db.query(AICandidateQuestion).filter(AICandidateQuestion.course_id == course_id)
        if topic_id:
            query = query.filter(AICandidateQuestion.topic_id == topic_id)
        if status_filter:
            query = query.filter(AICandidateQuestion.status == status_filter)

        return query.order_by(desc(AICandidateQuestion.created_at)).all()

    @staticmethod
    def get_candidate(
        db: Session,
        candidate_id: UUID,
        actor: User,
    ) -> AICandidateQuestion:
        """Inspect a single candidate question."""
        cand = db.get(AICandidateQuestion, candidate_id)
        if not cand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidate question with ID {candidate_id} not found",
            )
        QuestionService.verify_course_teacher_access(db, cand.course_id, actor)
        return cand

    @staticmethod
    def update_candidate(
        db: Session,
        candidate_id: UUID,
        updates: AICandidateUpdateRequest,
        actor: User,
    ) -> AICandidateQuestion:
        """Allow assigned teacher to edit candidate question properties before approval."""
        cand = AICandidateService.get_candidate(db, candidate_id, actor)

        if cand.status != "pending_review":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot edit candidate question with status '{cand.status}'",
            )

        if updates.prompt is not None:
            prompt_str = updates.prompt.strip()
            if not prompt_str:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Prompt cannot be empty",
                )
            cand.prompt = prompt_str
        if updates.difficulty is not None:
            cand.difficulty = updates.difficulty
        if updates.points is not None:
            cand.points = updates.points
        if updates.explanation is not None:
            cand.explanation = updates.explanation
        if updates.payload is not None:
            cand.payload = updates.payload
        if updates.answer_key is not None:
            cand.answer_key = updates.answer_key

        db.commit()
        db.refresh(cand)
        return cand

    @staticmethod
    def approve_candidate(
        db: Session,
        candidate_id: UUID,
        actor: User,
    ) -> Question:
        """Promote quarantined candidate question to official Question Bank through QuestionService atomically."""
        # 1. Lock the candidate row for concurrency safety across multiple workers
        cand = (
            db.query(AICandidateQuestion)
            .filter(AICandidateQuestion.id == candidate_id)
            .with_for_update()
            .first()
        )
        if not cand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidate question with ID {candidate_id} not found",
            )

        # 2. Check teacher course authorization under the lock
        QuestionService.verify_course_teacher_access(db, cand.course_id, actor)

        # 3. Idempotency check under row lock: if already approved, return existing question
        if cand.status == "approved" and cand.approved_question_id:
            official_q = db.get(Question, cand.approved_question_id)
            if official_q:
                return official_q

        if cand.status == "rejected":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot approve a rejected candidate question without re-generating",
            )

        # 4. Convert candidate into QuestionCreateRequest
        q_create = QuestionCreateRequest(
            course_id=cand.course_id,
            topic_id=cand.topic_id,
            type=cand.type,
            difficulty=cand.difficulty,
            points=cand.points,
            prompt=cand.prompt,
            explanation=cand.explanation,
            status="approved",
            source="ai_generated",
            payload=cand.payload,
            answer_key=cand.answer_key,
        )

        try:
            # 5. Create official question WITHOUT committing yet (commit=False)
            detail_resp = QuestionService.create_question(db, q_create, actor, commit=False)
            created_question = db.get(Question, detail_resp.id)

            # 6. Link and mark candidate as approved in the SAME transaction
            cand.status = "approved"
            cand.approved_question_id = created_question.id

            # 7. Audit logging
            log_audit_event(
                db,
                action="ai_candidate_approved",
                outcome="success",
                actor_id=actor.id,
                target_type="question",
                target_id=str(created_question.id),
                details={
                    "candidate_id": str(cand.id),
                    "course_id": str(cand.course_id),
                    "topic_id": str(cand.topic_id),
                },
            )

            # 8. Single atomic commit
            db.commit()
            db.refresh(cand)
            db.refresh(created_question)
            return created_question
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def reject_candidate(
        db: Session,
        candidate_id: UUID,
        reason: Optional[str],
        actor: User,
    ) -> AICandidateQuestion:
        """Reject quarantined candidate question with audit log and concurrency locking."""
        cand = (
            db.query(AICandidateQuestion)
            .filter(AICandidateQuestion.id == candidate_id)
            .with_for_update()
            .first()
        )
        if not cand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidate question with ID {candidate_id} not found",
            )
        QuestionService.verify_course_teacher_access(db, cand.course_id, actor)

        # Idempotent rejection
        if cand.status == "rejected":
            return cand

        if cand.status == "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reject a candidate that has already been approved into the Question Bank",
            )

        cand.status = "rejected"
        cand.rejection_reason = reason
        db.commit()
        db.refresh(cand)

        log_audit_event(
            db,
            action="ai_candidate_rejected",
            outcome="success",
            actor_id=actor.id,
            target_type="ai_question_candidate",
            target_id=str(cand.id),
            details={"reason": reason},
        )

        return cand
