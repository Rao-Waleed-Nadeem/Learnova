"""Mastery and Learning Path endpoints for Learnova (FR-MAS-01 - FR-MAS-08, SSD-02, SSD-03)."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.attempt import AssessmentAttempt
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.topic import Topic
from app.models.user import User
from app.schemas.mastery import (
    CourseLearningPathResponse,
    CourseMasteryResponse,
    MasteryRecalculateResponse,
    TopicReadinessResponse,
)
from app.services.learning_path_service import LearningPathService
from app.services.mastery_service import MasteryService

router = APIRouter()


@router.get("/courses/{course_id}/mastery", response_model=CourseMasteryResponse)
def get_course_mastery(
    course_id: uuid.UUID,
    student_id: Optional[uuid.UUID] = Query(None, description="Optional target student ID for teachers/admins"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve topic mastery states for a course (FR-MAS-01, AC-P7-02)."""
    target_student_id = current_user.id
    user_role = current_user.role.name if current_user.role else "student"

    if student_id and student_id != current_user.id:
        if user_role not in ("teacher", "administrator"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students are not authorized to view mastery states of other students.",
            )
        target_student_id = student_id
    else:
        # Enforce active enrollment for students
        if user_role == "student":
            enrollment = (
                db.query(Enrollment)
                .filter(
                    Enrollment.student_id == current_user.id,
                    Enrollment.course_id == course_id,
                    Enrollment.status.in_(("active", "completed")),
                )
                .first()
            )
            if not enrollment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Student is not actively enrolled in this course.",
                )

    return MasteryService.get_course_mastery(
        db=db,
        course_id=course_id,
        student_id=target_student_id,
    )


@router.get("/courses/{course_id}/learning-path", response_model=CourseLearningPathResponse)
def get_course_learning_path(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate dynamic personalized learning path and identify immediate recommended action (SSD-03)."""
    user_role = current_user.role.name if current_user.role else "student"

    # Enforce active enrollment for students
    if user_role == "student":
        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course_id,
                Enrollment.status.in_(("active", "completed")),
            )
            .first()
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student is not actively enrolled in this course.",
            )

    return LearningPathService.generate_learning_path(
        db=db,
        course_id=course_id,
        student_id=current_user.id,
    )


@router.get("/topics/{topic_id}/readiness", response_model=TopicReadinessResponse)
def get_topic_readiness(
    topic_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Evaluate topic access readiness by inspecting prerequisite DAG compliance (SSD-02)."""
    topic = db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic not found: {topic_id}",
        )

    user_role = current_user.role.name if current_user.role else "student"
    if user_role == "student":
        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == topic.course_id,
                Enrollment.status.in_(("active", "completed")),
            )
            .first()
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student is not actively enrolled in the course for this topic.",
            )

    return MasteryService.get_topic_readiness(
        db=db,
        topic_id=topic_id,
        student_id=current_user.id,
    )


@router.post("/mastery/recalculate/{attempt_id}", response_model=MasteryRecalculateResponse)
def recalculate_mastery_from_attempt(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recalculate and persist topic cognitive mastery from completed assessment attempt (DEC-03)."""
    attempt = db.get(AssessmentAttempt, attempt_id)
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment attempt not found: {attempt_id}",
        )

    user_role = current_user.role.name if current_user.role else "student"
    if attempt.student_id != current_user.id and user_role not in ("teacher", "administrator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot recalibrate mastery for another student's attempt.",
        )

    return MasteryService.recalculate_from_attempt(
        db=db,
        attempt_id=attempt_id,
        actor=current_user,
    )


# Blueprint 8.4 Aliases for student convenience
@router.get("/students/me/mastery", response_model=CourseMasteryResponse)
def get_my_course_mastery(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Alias for GET /courses/{course_id}/mastery for current authenticated student."""
    return get_course_mastery(course_id=course_id, student_id=None, db=db, current_user=current_user)


@router.get("/students/me/learning-path", response_model=CourseLearningPathResponse)
def get_my_learning_path(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Alias for GET /courses/{course_id}/learning-path for current authenticated student."""
    return get_course_learning_path(course_id=course_id, db=db, current_user=current_user)
