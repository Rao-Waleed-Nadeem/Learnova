"""Question bank domain service handling validation of all 5 question types, authoring CRUD, and security projection."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.question import Question
from app.models.topic import Topic
from app.models.user import User
from app.schemas.question import (
    MCQOptionInput,
    MatchingPairInput,
    QuestionCreateRequest,
    QuestionDetailResponse,
    QuestionStudentResponse,
    QuestionUpdateRequest,
)
from app.services.audit_service import log_audit_event


class QuestionService:
    """Domain service managing the Question Bank, format validation, and teacher/student projections."""

    @staticmethod
    def verify_course_teacher_access(db: Session, course_id: UUID, actor: User) -> Course:
        """Verify that actor has teacher/admin authority over the course."""
        if actor.role.name == "student":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students are not authorized to manage question banks",
            )

        course = db.get(Course, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found",
            )

        if actor.role.name == "teacher":
            is_assigned = (
                course.creator_id == actor.id
                or db.execute(
                    select(CourseTeacher).where(
                        CourseTeacher.course_id == course_id,
                        CourseTeacher.teacher_id == actor.id,
                    )
                ).first()
                is not None
            )
            if not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to manage question bank for this course",
                )

        return course

    @staticmethod
    def validate_and_decompose_format(
        q_type: str,
        options: Optional[List[MCQOptionInput]] = None,
        is_multiple_correct_allowed: Optional[bool] = False,
        correct_bool: Optional[bool] = None,
        accepted_answers: Optional[List[str]] = None,
        case_sensitive: Optional[bool] = False,
        matching_pairs: Optional[List[MatchingPairInput]] = None,
        expected_rubric: Optional[str] = None,
        grading_mode: Optional[str] = "manual_review",
        existing_payload: Optional[Dict[str, Any]] = None,
        existing_answer_key: Optional[Dict[str, Any]] = None,
    ) -> tuple[Dict[str, Any], Dict[str, Any]]:
        """Validate question data according to its discriminated format and decompose into payload & answer_key."""
        payload: Dict[str, Any] = {}
        answer_key: Dict[str, Any] = {}

        if q_type == "multiple_choice":
            # 1. Multiple Choice validation
            raw_options = options
            if raw_options is None and existing_payload and "options" in existing_payload:
                # Reconstruct from existing if not provided
                raw_options = [
                    MCQOptionInput(
                        id=opt.get("id"),
                        text=opt.get("text", ""),
                        is_correct=(
                            opt.get("id") in existing_answer_key.get("correct_option_ids", [])
                            if existing_answer_key
                            else False
                        ),
                    )
                    for opt in existing_payload.get("options", [])
                ]

            if not raw_options or len(raw_options) < 2:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Multiple choice questions must have at least 2 options",
                )

            cleaned_options = []
            correct_ids = []
            for i, opt in enumerate(raw_options):
                opt_text = opt.text.strip()
                if not opt_text:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail="Option text cannot be empty",
                    )
                opt_id = opt.id or f"opt_{i+1}_{uuid.uuid4().hex[:6]}"
                cleaned_options.append({"id": opt_id, "text": opt_text})
                if opt.is_correct:
                    correct_ids.append(opt_id)

            if not correct_ids:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="At least one option must be marked correct",
                )

            allow_multi = bool(is_multiple_correct_allowed)
            if not allow_multi and len(correct_ids) > 1:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Multiple correct answers are not allowed for this question",
                )

            payload = {
                "options": cleaned_options,
                "is_multiple_correct_allowed": allow_multi,
            }
            answer_key = {
                "correct_option_ids": correct_ids,
            }

        elif q_type == "true_false":
            # 2. True / False validation
            effective_bool = correct_bool
            if effective_bool is None and existing_answer_key and "correct_bool" in existing_answer_key:
                effective_bool = existing_answer_key.get("correct_bool")

            if effective_bool is None or not isinstance(effective_bool, bool):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="True/False questions require a valid boolean correct_bool (True or False)",
                )

            payload = {}
            answer_key = {"correct_bool": effective_bool}

        elif q_type == "fill_blank":
            # 3. Fill in the Blank validation
            raw_answers = accepted_answers
            if raw_answers is None and existing_answer_key and "accepted_answers" in existing_answer_key:
                raw_answers = existing_answer_key.get("accepted_answers", [])

            if not raw_answers:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Fill-in-the-blank questions require at least one accepted answer",
                )

            cleaned_answers = [ans.strip() for ans in raw_answers if ans and ans.strip()]
            if not cleaned_answers:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Fill-in-the-blank accepted answers cannot be blank",
                )

            is_case_sensitive = (
                case_sensitive
                if case_sensitive is not None
                else (existing_answer_key.get("case_sensitive", False) if existing_answer_key else False)
            )

            payload = {}
            answer_key = {
                "accepted_answers": cleaned_answers,
                "case_sensitive": bool(is_case_sensitive),
            }

        elif q_type == "matching":
            # 4. Matching validation
            raw_pairs = matching_pairs
            if raw_pairs is None and existing_answer_key and "matching_pairs" in existing_answer_key:
                raw_pairs = [
                    MatchingPairInput(id=p.get("id"), left=p.get("left", ""), right=p.get("right", ""))
                    for p in existing_answer_key.get("matching_pairs", [])
                ]

            if not raw_pairs or len(raw_pairs) < 2:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Matching questions require at least 2 pairs",
                )

            left_items = []
            right_items = []
            stored_pairs = []
            seen_left = set()
            seen_right = set()

            for i, p in enumerate(raw_pairs):
                left_txt = p.left.strip()
                right_txt = p.right.strip()
                if not left_txt or not right_txt:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail="Matching pair items cannot be empty",
                    )
                if left_txt in seen_left:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"Duplicate left matching item: '{left_txt}'",
                    )
                if right_txt in seen_right:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"Duplicate right matching item: '{right_txt}'",
                    )
                seen_left.add(left_txt)
                seen_right.add(right_txt)

                pair_id = p.id or f"pair_{i+1}_{uuid.uuid4().hex[:6]}"
                left_items.append({"id": pair_id, "text": left_txt})
                right_items.append({"id": pair_id, "text": right_txt})
                stored_pairs.append({"id": pair_id, "left": left_txt, "right": right_txt})

            payload = {
                "left_items": left_items,
                "right_items": right_items,
            }
            answer_key = {
                "matching_pairs": stored_pairs,
                "solution_pairs": [{"left_id": sp["id"], "right_id": sp["id"]} for sp in stored_pairs],
            }

        elif q_type == "short_answer":
            # 5. Short Answer validation (DEC-06: No implicit LLM grading)
            rubric = expected_rubric
            if rubric is None and existing_answer_key and "expected_rubric" in existing_answer_key:
                rubric = existing_answer_key.get("expected_rubric")

            if not rubric or not rubric.strip():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Short-answer questions require a non-empty expected_rubric",
                )

            mode = grading_mode or (existing_answer_key.get("grading_mode") if existing_answer_key else "manual_review")
            if mode not in ("manual_review", "exact_match"):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Short-answer grading_mode must be 'manual_review' or 'exact_match'",
                )

            cleaned_accepted = None
            if mode == "exact_match":
                raw_acc = accepted_answers or (existing_answer_key.get("accepted_answers") if existing_answer_key else None)
                if not raw_acc:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail="Exact match short-answer questions require at least one accepted answer",
                    )
                cleaned_accepted = [a.strip() for a in raw_acc if a and a.strip()]
                if not cleaned_accepted:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail="Accepted answers cannot be empty for exact match grading",
                    )

            payload = {}
            answer_key = {
                "expected_rubric": rubric.strip(),
                "grading_mode": mode,
                "accepted_answers": cleaned_accepted,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Unsupported question type: {q_type}",
            )

        return payload, answer_key

    @staticmethod
    def build_detail_response(question: Question) -> QuestionDetailResponse:
        """Reconstruct teacher-facing detail response from question entity."""
        payload = question.payload or {}
        answer_key = question.answer_key or {}

        options = None
        is_multiple_correct_allowed = None
        correct_bool = None
        accepted_answers = None
        case_sensitive = None
        matching_pairs = None
        expected_rubric = None
        grading_mode = None

        if question.type == "multiple_choice":
            raw_opts = payload.get("options", [])
            correct_ids = set(answer_key.get("correct_option_ids", []))
            options = [
                {
                    "id": opt.get("id"),
                    "text": opt.get("text"),
                    "is_correct": opt.get("id") in correct_ids,
                }
                for opt in raw_opts
            ]
            is_multiple_correct_allowed = payload.get("is_multiple_correct_allowed", False)
        elif question.type == "true_false":
            correct_bool = answer_key.get("correct_bool")
        elif question.type == "fill_blank":
            accepted_answers = answer_key.get("accepted_answers", [])
            case_sensitive = answer_key.get("case_sensitive", False)
        elif question.type == "matching":
            matching_pairs = answer_key.get("matching_pairs", [])
        elif question.type == "short_answer":
            expected_rubric = answer_key.get("expected_rubric")
            grading_mode = answer_key.get("grading_mode", "manual_review")
            accepted_answers = answer_key.get("accepted_answers")

        return QuestionDetailResponse(
            id=question.id,
            course_id=question.course_id,
            topic_id=question.topic_id,
            author_id=question.author_id,
            type=question.type,
            difficulty=question.difficulty,
            points=question.points,
            prompt=question.prompt,
            explanation=question.explanation,
            status=question.status,
            source=question.source,
            version=question.version,
            payload=payload,
            answer_key=answer_key,
            options=options,
            is_multiple_correct_allowed=is_multiple_correct_allowed,
            correct_bool=correct_bool,
            accepted_answers=accepted_answers,
            case_sensitive=case_sensitive,
            matching_pairs=matching_pairs,
            expected_rubric=expected_rubric,
            grading_mode=grading_mode,
            created_at=question.created_at,
            updated_at=question.updated_at,
        )

    @staticmethod
    def build_student_projection(question: Question) -> QuestionStudentResponse:
        """Build safe student projection strictly omitting all answer keys, booleans, and rubrics."""
        return QuestionStudentResponse(
            id=question.id,
            course_id=question.course_id,
            topic_id=question.topic_id,
            type=question.type,
            difficulty=question.difficulty,
            points=question.points,
            prompt=question.prompt,
            version=question.version,
            payload=question.payload or {},
            created_at=question.created_at,
        )

    @staticmethod
    def create_question(
        db: Session,
        req: QuestionCreateRequest,
        actor: User,
        commit: bool = True,
    ) -> QuestionDetailResponse:
        """Create a new validated question in the course question bank."""
        QuestionService.verify_course_teacher_access(db, req.course_id, actor)

        # Validate topic exists and belongs to course
        topic = db.get(Topic, req.topic_id)
        if not topic or topic.course_id != req.course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Topic does not belong to the specified course",
            )

        # Check prompt
        if not req.prompt or not req.prompt.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Question prompt cannot be empty",
            )

        # Validate format & decompose into payload and answer_key
        payload, answer_key = QuestionService.validate_and_decompose_format(
            q_type=req.type,
            options=req.options,
            is_multiple_correct_allowed=req.is_multiple_correct_allowed,
            correct_bool=req.correct_bool,
            accepted_answers=req.accepted_answers,
            case_sensitive=req.case_sensitive,
            matching_pairs=req.matching_pairs,
            expected_rubric=req.expected_rubric,
            grading_mode=req.grading_mode,
            existing_payload=req.payload,
            existing_answer_key=req.answer_key,
        )

        question = Question(
            course_id=req.course_id,
            topic_id=req.topic_id,
            author_id=actor.id,
            type=req.type,
            difficulty=req.difficulty,
            points=req.points,
            prompt=req.prompt.strip(),
            explanation=req.explanation,
            status=req.status,
            source=req.source,
            version=1,
            payload=payload,
            answer_key=answer_key,
        )
        db.add(question)
        if commit:
            db.commit()
            db.refresh(question)
        else:
            db.flush()
            db.refresh(question)

        log_audit_event(
            db=db,
            action="question.create",
            outcome="SUCCESS",
            actor_id=actor.id,
            actor_email=actor.email,
            actor_role=actor.role.name if actor.role else None,
            target_id=str(question.id),
            target_type="question",
            details={
                "type": question.type,
                "difficulty": question.difficulty,
                "course_id": str(question.course_id),
                "topic_id": str(question.topic_id),
            },
        )

        return QuestionService.build_detail_response(question)

    @staticmethod
    def get_question(db: Session, question_id: UUID, actor: User) -> QuestionDetailResponse:
        """Retrieve question with authoritative teacher answer key."""
        question = db.get(Question, question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question with ID {question_id} not found",
            )
        QuestionService.verify_course_teacher_access(db, question.course_id, actor)
        return QuestionService.build_detail_response(question)

    @staticmethod
    def list_questions(
        db: Session,
        course_id: UUID,
        actor: User,
        topic_id: Optional[UUID] = None,
        type: Optional[str] = None,
        difficulty: Optional[str] = None,
        status_filter: Optional[str] = None,
    ) -> List[QuestionDetailResponse]:
        """List questions in the question bank for a course."""
        QuestionService.verify_course_teacher_access(db, course_id, actor)

        stmt = select(Question).where(Question.course_id == course_id)
        if topic_id:
            stmt = stmt.where(Question.topic_id == topic_id)
        if type:
            stmt = stmt.where(Question.type == type)
        if difficulty:
            stmt = stmt.where(Question.difficulty == difficulty)
        if status_filter:
            stmt = stmt.where(Question.status == status_filter)
        else:
            # By default exclude archived questions from active bank list
            stmt = stmt.where(Question.status != "archived")

        stmt = stmt.order_by(Question.created_at.desc())
        questions = db.execute(stmt).scalars().all()

        return [QuestionService.build_detail_response(q) for q in questions]

    @staticmethod
    def update_question(
        db: Session,
        question_id: UUID,
        req: QuestionUpdateRequest,
        actor: User,
    ) -> QuestionDetailResponse:
        """Update an existing question and increment version."""
        question = db.get(Question, question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question with ID {question_id} not found",
            )
        QuestionService.verify_course_teacher_access(db, question.course_id, actor)

        if req.topic_id:
            topic = db.get(Topic, req.topic_id)
            if not topic or topic.course_id != question.course_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Topic does not belong to the question's course",
                )
            question.topic_id = req.topic_id

        if req.difficulty:
            question.difficulty = req.difficulty
        if req.points is not None:
            question.points = req.points
        if req.prompt is not None:
            if not req.prompt.strip():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Question prompt cannot be empty",
                )
            question.prompt = req.prompt.strip()
        if req.explanation is not None:
            question.explanation = req.explanation
        if req.status:
            question.status = req.status

        # If any format-related fields were provided, re-decompose
        has_format_update = any(
            x is not None
            for x in (
                req.options,
                req.is_multiple_correct_allowed,
                req.correct_bool,
                req.accepted_answers,
                req.case_sensitive,
                req.matching_pairs,
                req.expected_rubric,
                req.grading_mode,
                req.payload,
                req.answer_key,
            )
        )

        if has_format_update:
            payload, answer_key = QuestionService.validate_and_decompose_format(
                q_type=question.type,
                options=req.options,
                is_multiple_correct_allowed=req.is_multiple_correct_allowed,
                correct_bool=req.correct_bool,
                accepted_answers=req.accepted_answers,
                case_sensitive=req.case_sensitive,
                matching_pairs=req.matching_pairs,
                expected_rubric=req.expected_rubric,
                grading_mode=req.grading_mode,
                existing_payload=question.payload,
                existing_answer_key=question.answer_key,
            )
            question.payload = payload
            question.answer_key = answer_key

        # Increment monotonic version
        question.version += 1
        question.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(question)

        log_audit_event(
            db=db,
            action="question.update",
            outcome="SUCCESS",
            actor_id=actor.id,
            actor_email=actor.email,
            actor_role=actor.role.name if actor.role else None,
            target_id=str(question.id),
            target_type="question",
            details={"version": question.version},
        )

        return QuestionService.build_detail_response(question)

    @staticmethod
    def archive_question(db: Session, question_id: UUID, actor: User) -> QuestionDetailResponse:
        """Safely archive a question without breaking historical assessment references."""
        question = db.get(Question, question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question with ID {question_id} not found",
            )
        QuestionService.verify_course_teacher_access(db, question.course_id, actor)

        question.status = "archived"
        question.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(question)

        log_audit_event(
            db=db,
            action="question.archive",
            outcome="SUCCESS",
            actor_id=actor.id,
            actor_email=actor.email,
            actor_role=actor.role.name if actor.role else None,
            target_id=str(question.id),
            target_type="question",
        )

        return QuestionService.build_detail_response(question)
