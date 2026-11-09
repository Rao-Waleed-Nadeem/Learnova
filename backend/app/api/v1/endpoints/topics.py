"""Topics API router managing syllabus nodes and prerequisite graph edges."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_current_active_user,
    require_teacher_assigned_to_course,
)
from app.db.session import get_db
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.topic import Topic
from app.models.user import User
from app.schemas.curriculum import (
    TopicCreateRequest,
    TopicPrerequisiteResponse,
    TopicPrerequisiteUpdateRequest,
    TopicResponse,
    TopicUpdateRequest,
)
from app.services.curriculum_service import CurriculumService
from app.services.dag_service import DAGService

router = APIRouter()


def _verify_topic_teacher_authorization(db: Session, topic_id: UUID, current_user: User) -> Topic:
    """Ensure current user is an administrator or assigned teacher for the topic's course."""
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
        detail="You are not authorized to modify topics for this course.",
    )


@router.post("/courses/{course_id}/topics", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(
    course_id: UUID,
    data: TopicCreateRequest,
    current_user: User = Depends(require_teacher_assigned_to_course),
    db: Session = Depends(get_db),
):
    """Create a new topic in a course."""
    return CurriculumService.create_topic(db=db, course_id=course_id, data=data)


@router.patch("/topics/{topic_id}", response_model=TopicResponse)
def update_topic(
    topic_id: UUID,
    data: TopicUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update topic metadata, order, and mastery threshold."""
    _verify_topic_teacher_authorization(db=db, topic_id=topic_id, current_user=current_user)
    return CurriculumService.update_topic(db=db, topic_id=topic_id, data=data)


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(
    topic_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a topic and its associated lessons and prerequisite edges."""
    _verify_topic_teacher_authorization(db=db, topic_id=topic_id, current_user=current_user)
    CurriculumService.delete_topic(db=db, topic_id=topic_id)


@router.put("/topics/{topic_id}/prerequisites", response_model=TopicPrerequisiteResponse)
def update_topic_prerequisites(
    topic_id: UUID,
    data: TopicPrerequisiteUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Atomically validate and replace prerequisite edges for a topic (FR-CRS-04, SSD-07)."""
    topic = _verify_topic_teacher_authorization(db=db, topic_id=topic_id, current_user=current_user)
    updated_prereqs = DAGService.validate_and_update_prerequisites(
        db=db,
        topic=topic,
        new_prerequisite_ids=data.prerequisite_topic_ids,
    )
    return TopicPrerequisiteResponse(
        topic_id=topic.id,
        prerequisite_topic_ids=updated_prereqs,
    )
