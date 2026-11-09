"""Lessons and Resources API router managing instructional units, content, and student completions."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_current_active_user,
    get_optional_current_user,
    require_role,
)
from app.db.session import get_db
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.lesson import Lesson
from app.models.resource import LearningResource
from app.models.topic import Topic
from app.models.user import User
from app.schemas.curriculum import (
    LessonCreateRequest,
    LessonResponse,
    LessonUpdateRequest,
    ResourceCreateRequest,
    ResourceResponse,
    ResourceUpdateRequest,
)
from app.schemas.enrollment import (
    LessonCompletionResponse,
    ResourceActivityRequest,
    ResourceActivityResponse,
)
from app.services.curriculum_service import CurriculumService
from app.services.enrollment_service import EnrollmentService

router = APIRouter()


def _verify_lesson_teacher_authorization(db: Session, lesson_id: UUID, current_user: User) -> Lesson:
    """Ensure user is an administrator or assigned teacher for the lesson's course."""
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    topic = db.get(Topic, lesson.topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    user_role = current_user.role.name if current_user.role else ""
    if user_role == "administrator":
        return lesson

    if user_role == "teacher":
        assignment = (
            db.query(CourseTeacher)
            .filter(
                CourseTeacher.course_id == topic.course_id,
                CourseTeacher.teacher_id == current_user.id,
            )
            .first()
        )
        if assignment:
            return lesson

        course = db.get(Course, topic.course_id)
        if course and course.creator_id == current_user.id:
            return lesson

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not authorized to modify lessons for this course.",
    )


def _verify_topic_teacher_authorization(db: Session, topic_id: UUID, current_user: User) -> Topic:
    topic = db.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    user_role = current_user.role.name if current_user.role else ""
    if user_role == "administrator":
        return topic

    if user_role == "teacher":
        assignment = (
            db.query(CourseTeacher)
            .filter(
                CourseTeacher.course_id == topic.course_id,
                CourseTeacher.teacher_id == current_user.id,
            )
            .first()
        )
        if assignment:
            return topic

        course = db.get(Course, topic.course_id)
        if course and course.creator_id == current_user.id:
            return topic

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not authorized to manage content for this course.",
    )


def _verify_resource_teacher_authorization(db: Session, resource_id: UUID, current_user: User) -> LearningResource:
    resource = db.get(LearningResource, resource_id)
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    lesson = db.get(Lesson, resource.lesson_id)
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    topic = db.get(Topic, lesson.topic_id)
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    user_role = current_user.role.name if current_user.role else ""
    if user_role == "administrator":
        return resource

    if user_role == "teacher":
        assignment = (
            db.query(CourseTeacher)
            .filter(
                CourseTeacher.course_id == topic.course_id,
                CourseTeacher.teacher_id == current_user.id,
            )
            .first()
        )
        if assignment:
            return resource

        course = db.get(Course, topic.course_id)
        if course and course.creator_id == current_user.id:
            return resource

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not authorized to modify resources for this course.",
    )


# ============================================================================
# Lesson Endpoints
# ============================================================================

@router.post("/topics/{topic_id}/lessons", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
def create_lesson(
    topic_id: UUID,
    data: LessonCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a new lesson in a topic."""
    _verify_topic_teacher_authorization(db=db, topic_id=topic_id, current_user=current_user)
    return CurriculumService.create_lesson(db=db, topic_id=topic_id, data=data)


@router.get("/lessons/{lesson_id}", response_model=LessonResponse)
def get_lesson(
    lesson_id: UUID,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve lesson details along with associated resources."""
    return CurriculumService.get_lesson(db=db, lesson_id=lesson_id, current_user=current_user)


@router.patch("/lessons/{lesson_id}", response_model=LessonResponse)
def update_lesson(
    lesson_id: UUID,
    data: LessonUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update lesson metadata or order."""
    _verify_lesson_teacher_authorization(db=db, lesson_id=lesson_id, current_user=current_user)
    return CurriculumService.update_lesson(db=db, lesson_id=lesson_id, data=data)


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    lesson_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a lesson and its resources."""
    _verify_lesson_teacher_authorization(db=db, lesson_id=lesson_id, current_user=current_user)
    CurriculumService.delete_lesson(db=db, lesson_id=lesson_id)


# ============================================================================
# Resource Endpoints
# ============================================================================

@router.post("/lessons/{lesson_id}/resources", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def create_resource(
    lesson_id: UUID,
    data: ResourceCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Add a learning resource to a lesson."""
    _verify_lesson_teacher_authorization(db=db, lesson_id=lesson_id, current_user=current_user)
    return CurriculumService.create_resource(db=db, lesson_id=lesson_id, data=data)


@router.patch("/resources/{resource_id}", response_model=ResourceResponse)
def update_resource(
    resource_id: UUID,
    data: ResourceUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update resource content or metadata."""
    _verify_resource_teacher_authorization(db=db, resource_id=resource_id, current_user=current_user)
    return CurriculumService.update_resource(db=db, resource_id=resource_id, data=data)


@router.delete("/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a resource."""
    _verify_resource_teacher_authorization(db=db, resource_id=resource_id, current_user=current_user)
    CurriculumService.delete_resource(db=db, resource_id=resource_id)


# ============================================================================
# Student Completion & Resource Activity Endpoints
# ============================================================================

@router.post("/lessons/{lesson_id}/complete", response_model=LessonCompletionResponse)
def complete_lesson(
    lesson_id: UUID,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    """Idempotently record completion of a lesson for the enrolled student (SSD-01, FR-CRS-06)."""
    return EnrollmentService.record_lesson_completion(db=db, student=current_user, lesson_id=lesson_id)


@router.post("/resources/{resource_id}/activity", response_model=ResourceActivityResponse)
def record_resource_activity(
    resource_id: UUID,
    data: ResourceActivityRequest,
    current_user: User = Depends(require_role("student")),
    db: Session = Depends(get_db),
):
    """Record student study activity/interaction on a learning resource (SSD-03)."""
    return EnrollmentService.record_resource_activity(
        db=db,
        student=current_user,
        resource_id=resource_id,
        data=data,
    )
