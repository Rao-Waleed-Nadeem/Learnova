"""Assessment domain service managing assessment authoring, question composition, and publication quality gates."""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import Assessment, AssessmentQuestion
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.question import Question
from app.models.topic import Topic
from app.models.user import User
from app.schemas.assessment import (
    AssessmentCreateRequest,
    AssessmentQuestionResponse,
    AssessmentQuestionStudentResponse,
    AssessmentResponse,
    AssessmentStudentResponse,
    AssessmentUpdateRequest,
)
from app.services.audit_service import log_audit_event
from app.services.question_service import QuestionService


class AssessmentService:
    """Domain service managing Assessment creation, composition, version pinning, and publication gates."""

    @staticmethod
    def verify_course_teacher_access(db: Session, course_id: UUID, actor: User) -> Course:
        """Verify that actor has teacher/admin authority over the course."""
        if actor.role.name == "student":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students are not authorized to author assessments",
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
                    detail="Not authorized to author assessments for this course",
                )

        return course

    @staticmethod
    def build_response(assessment: Assessment) -> AssessmentResponse:
        """Construct authoritative teacher assessment response with questions."""
        q_responses: List[AssessmentQuestionResponse] = []
        for aq in assessment.assessment_questions:
            q_detail = QuestionService.build_detail_response(aq.question) if aq.question else None
            q_responses.append(
                AssessmentQuestionResponse(
                    id=aq.id,
                    assessment_id=aq.assessment_id,
                    question_id=aq.question_id,
                    order=aq.order,
                    points=aq.points,
                    question_version=aq.question_version,
                    question=q_detail,
                )
            )

        return AssessmentResponse(
            id=assessment.id,
            course_id=assessment.course_id,
            topic_id=assessment.topic_id,
            creator_id=assessment.creator_id,
            title=assessment.title,
            type=assessment.type,
            instructions=assessment.instructions,
            time_limit_minutes=assessment.time_limit_minutes,
            max_attempts=assessment.max_attempts,
            passing_score_percent=assessment.passing_score_percent,
            schedule_date=assessment.schedule_date,
            status=assessment.status,
            total_points=assessment.total_points,
            questions_count=len(q_responses),
            questions=q_responses,
            created_at=assessment.created_at,
            updated_at=assessment.updated_at,
        )

    @staticmethod
    def build_student_response(assessment: Assessment) -> AssessmentStudentResponse:
        """Construct safe student assessment projection (omitting all answer keys and rubrics)."""
        student_qs: List[AssessmentQuestionStudentResponse] = []
        for aq in assessment.assessment_questions:
            q_proj = QuestionService.build_student_projection(aq.question) if aq.question else None
            student_qs.append(
                AssessmentQuestionStudentResponse(
                    id=aq.id,
                    assessment_id=aq.assessment_id,
                    question_id=aq.question_id,
                    order=aq.order,
                    points=aq.points,
                    question_version=aq.question_version,
                    question=q_proj,
                )
            )

        return AssessmentStudentResponse(
            id=assessment.id,
            course_id=assessment.course_id,
            topic_id=assessment.topic_id,
            title=assessment.title,
            type=assessment.type,
            instructions=assessment.instructions,
            time_limit_minutes=assessment.time_limit_minutes,
            max_attempts=assessment.max_attempts,
            passing_score_percent=assessment.passing_score_percent,
            schedule_date=assessment.schedule_date,
            status=assessment.status,
            total_points=assessment.total_points,
            questions_count=len(student_qs),
            questions=student_qs,
            created_at=assessment.created_at,
        )

    @staticmethod
    def create_assessment(db: Session, req: AssessmentCreateRequest, actor: User) -> AssessmentResponse:
        """Create a new assessment and attach initial questions with version pinning."""
        AssessmentService.verify_course_teacher_access(db, req.course_id, actor)

        if req.topic_id:
            topic = db.get(Topic, req.topic_id)
            if not topic or topic.course_id != req.course_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Topic does not belong to the specified course",
                )

        assessment = Assessment(
            course_id=req.course_id,
            topic_id=req.topic_id,
            creator_id=actor.id,
            title=req.title.strip(),
            type=req.type,
            instructions=req.instructions,
            time_limit_minutes=req.time_limit_minutes,
            max_attempts=req.max_attempts,
            passing_score_percent=req.passing_score_percent,
            schedule_date=req.schedule_date,
            status="draft",
            total_points=0,
        )
        db.add(assessment)
        db.flush()

        total_points = 0
        if req.questions:
            seen_questions = set()
            for idx, item in enumerate(req.questions):
                if item.question_id in seen_questions:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Duplicate question {item.question_id} in assessment composition",
                    )
                seen_questions.add(item.question_id)

                question = db.get(Question, item.question_id)
                if not question:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Question with ID {item.question_id} not found",
                    )
                if question.course_id != req.course_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Question {item.question_id} does not belong to course {req.course_id}",
                    )

                assigned_pts = item.points if item.points is not None else question.points
                if assigned_pts <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"Points for question {item.question_id} must be positive",
                    )

                aq = AssessmentQuestion(
                    assessment_id=assessment.id,
                    question_id=question.id,
                    order=item.order if item.order is not None else idx,
                    points=assigned_pts,
                    question_version=question.version,  # Pin version snapshot
                )
                db.add(aq)
                total_points += assigned_pts

        assessment.total_points = total_points
        db.commit()
        db.refresh(assessment)

        log_audit_event(
            db=db,
            action="assessment.create",
            outcome="SUCCESS",
            actor_id=actor.id,
            actor_email=actor.email,
            actor_role=actor.role.name if actor.role else None,
            target_id=str(assessment.id),
            target_type="assessment",
            details={
                "type": assessment.type,
                "course_id": str(assessment.course_id),
                "total_points": assessment.total_points,
            },
        )

        return AssessmentService.build_response(assessment)

    @staticmethod
    def get_assessment(db: Session, assessment_id: UUID, actor: User) -> AssessmentResponse:
        """Retrieve assessment definition with authoritative question bank details."""
        assessment = db.get(Assessment, assessment_id)
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment with ID {assessment_id} not found",
            )
        AssessmentService.verify_course_teacher_access(db, assessment.course_id, actor)
        return AssessmentService.build_response(assessment)

    @staticmethod
    def get_student_assessment(db: Session, assessment_id: UUID, student: User) -> AssessmentStudentResponse:
        """Retrieve safe assessment projection for enrolled student."""
        assessment = db.get(Assessment, assessment_id)
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment with ID {assessment_id} not found",
            )
        if assessment.status != "published":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Assessment is not published",
            )
        return AssessmentService.build_student_response(assessment)

    @staticmethod
    def list_assessments(
        db: Session,
        course_id: UUID,
        actor: User,
        topic_id: Optional[UUID] = None,
        type: Optional[str] = None,
        status_filter: Optional[str] = None,
    ) -> List[AssessmentResponse]:
        """List assessments for a course scoped by caller authority."""
        if actor.role.name == "student":
            # Students can only list published assessments
            stmt = select(Assessment).where(
                Assessment.course_id == course_id,
                Assessment.status == "published",
            )
        else:
            AssessmentService.verify_course_teacher_access(db, course_id, actor)
            stmt = select(Assessment).where(Assessment.course_id == course_id)
            if status_filter:
                stmt = stmt.where(Assessment.status == status_filter)

        if topic_id:
            stmt = stmt.where(Assessment.topic_id == topic_id)
        if type:
            stmt = stmt.where(Assessment.type == type)

        stmt = stmt.order_by(Assessment.created_at.desc())
        assessments = db.execute(stmt).scalars().all()

        return [AssessmentService.build_response(a) for a in assessments]

    @staticmethod
    def update_assessment(
        db: Session,
        assessment_id: UUID,
        req: AssessmentUpdateRequest,
        actor: User,
    ) -> AssessmentResponse:
        """Update assessment metadata and optionally re-compose questions."""
        assessment = db.get(Assessment, assessment_id)
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment with ID {assessment_id} not found",
            )
        AssessmentService.verify_course_teacher_access(db, assessment.course_id, actor)

        if req.title is not None:
            if not req.title.strip():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Assessment title cannot be empty",
                )
            assessment.title = req.title.strip()

        if req.topic_id is not None:
            topic = db.get(Topic, req.topic_id)
            if not topic or topic.course_id != assessment.course_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Topic does not belong to the assessment's course",
                )
            assessment.topic_id = req.topic_id

        if req.type is not None:
            assessment.type = req.type
        if req.instructions is not None:
            assessment.instructions = req.instructions
        if req.time_limit_minutes is not None:
            assessment.time_limit_minutes = req.time_limit_minutes
        if req.max_attempts is not None:
            assessment.max_attempts = req.max_attempts
        if req.passing_score_percent is not None:
            assessment.passing_score_percent = req.passing_score_percent
        if req.schedule_date is not None:
            assessment.schedule_date = req.schedule_date

        # Update questions if provided
        if req.questions is not None:
            # Enforce lock on published assessments (DEC-P5-003)
            if assessment.status == "published":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot modify question composition on an already published assessment",
                )

            # Clear existing questions
            db.execute(
                select(AssessmentQuestion).where(AssessmentQuestion.assessment_id == assessment.id)
            )
            for old_aq in list(assessment.assessment_questions):
                db.delete(old_aq)
            db.flush()

            total_points = 0
            seen_questions = set()
            for idx, item in enumerate(req.questions):
                if item.question_id in seen_questions:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Duplicate question {item.question_id} in assessment composition",
                    )
                seen_questions.add(item.question_id)

                question = db.get(Question, item.question_id)
                if not question:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Question with ID {item.question_id} not found",
                    )
                if question.course_id != assessment.course_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Question {item.question_id} does not belong to course {assessment.course_id}",
                    )

                assigned_pts = item.points if item.points is not None else question.points
                if assigned_pts <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"Points for question {item.question_id} must be positive",
                    )

                aq = AssessmentQuestion(
                    assessment_id=assessment.id,
                    question_id=question.id,
                    order=item.order if item.order is not None else idx,
                    points=assigned_pts,
                    question_version=question.version,  # Pin current version
                )
                db.add(aq)
                total_points += assigned_pts

            assessment.total_points = total_points

        assessment.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(assessment)

        log_audit_event(
            db=db,
            action="assessment.update",
            outcome="SUCCESS",
            actor_id=actor.id,
            actor_email=actor.email,
            actor_role=actor.role.name if actor.role else None,
            target_id=str(assessment.id),
            target_type="assessment",
            details={"total_points": assessment.total_points},
        )

        return AssessmentService.build_response(assessment)

    @staticmethod
    def publish_assessment(db: Session, assessment_id: UUID, actor: User) -> AssessmentResponse:
        """Validate assessment publication quality gates and transition to published status."""
        assessment = db.get(Assessment, assessment_id)
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment with ID {assessment_id} not found",
            )
        AssessmentService.verify_course_teacher_access(db, assessment.course_id, actor)

        # Quality Gate 1: Must contain at least 1 question
        if not assessment.assessment_questions or len(assessment.assessment_questions) == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Assessment must contain at least 1 question before publication",
            )

        # Quality Gate 2: Total points must be greater than 0
        if assessment.total_points <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Assessment total points must be greater than 0 before publication",
            )

        assessment.status = "published"
        assessment.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(assessment)

        log_audit_event(
            db=db,
            action="assessment.publish",
            outcome="SUCCESS",
            actor_id=actor.id,
            actor_email=actor.email,
            actor_role=actor.role.name if actor.role else None,
            target_id=str(assessment.id),
            target_type="assessment",
            details={
                "total_points": assessment.total_points,
                "questions_count": len(assessment.assessment_questions),
            },
        )

        return AssessmentService.build_response(assessment)
