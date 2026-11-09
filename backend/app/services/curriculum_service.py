"""Curriculum domain service handling Topic, Lesson, and Resource management."""

from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.lesson import Lesson
from app.models.resource import LearningResource
from app.models.topic import Topic
from app.models.topic_prerequisite import TopicPrerequisite
from app.models.user import User
from app.schemas.curriculum import (
    LessonCreateRequest,
    LessonResponse,
    LessonUpdateRequest,
    ResourceCreateRequest,
    ResourceResponse,
    ResourceUpdateRequest,
    TopicCreateRequest,
    TopicResponse,
    TopicUpdateRequest,
)


class CurriculumService:
    """Domain service managing Topic, Lesson, and Resource persistence operations."""

    # =========================================================================
    # Topic Operations
    # =========================================================================

    @staticmethod
    def create_topic(db: Session, course_id: UUID, data: TopicCreateRequest) -> TopicResponse:
        """Create a new topic within a course."""
        course = db.get(Course, course_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

        # Determine next order if default
        order = data.order
        if order == 0:
            max_order = db.scalar(
                select(func.max(Topic.order)).where(Topic.course_id == course_id)
            )
            order = (max_order + 1) if max_order is not None else 0

        topic = Topic(
            course_id=course_id,
            title=data.title,
            description=data.description,
            order=order,
            mastery_threshold=data.mastery_threshold,
        )
        db.add(topic)
        db.commit()
        db.refresh(topic)

        return TopicResponse(
            id=topic.id,
            course_id=topic.course_id,
            title=topic.title,
            description=topic.description,
            order=topic.order,
            mastery_threshold=topic.mastery_threshold,
            prerequisite_topic_ids=[],
            lessons=[],
            created_at=topic.created_at,
            updated_at=topic.updated_at,
        )

    @staticmethod
    def update_topic(db: Session, topic_id: UUID, data: TopicUpdateRequest) -> TopicResponse:
        """Update topic metadata and threshold."""
        topic = db.get(Topic, topic_id)
        if not topic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

        if data.title is not None:
            topic.title = data.title
        if data.description is not None:
            topic.description = data.description
        if data.order is not None:
            topic.order = data.order
        if data.mastery_threshold is not None:
            topic.mastery_threshold = data.mastery_threshold

        db.commit()
        db.refresh(topic)

        prereq_ids = (
            db.execute(
                select(TopicPrerequisite.prerequisite_topic_id).where(
                    TopicPrerequisite.topic_id == topic.id
                )
            )
            .scalars()
            .all()
        )

        return TopicResponse(
            id=topic.id,
            course_id=topic.course_id,
            title=topic.title,
            description=topic.description,
            order=topic.order,
            mastery_threshold=topic.mastery_threshold,
            prerequisite_topic_ids=list(prereq_ids),
            lessons=[],
            created_at=topic.created_at,
            updated_at=topic.updated_at,
        )

    @staticmethod
    def delete_topic(db: Session, topic_id: UUID) -> None:
        """Delete a topic and cascade remove its lessons and prerequisite edges."""
        topic = db.get(Topic, topic_id)
        if not topic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

        db.delete(topic)
        db.commit()

    # =========================================================================
    # Lesson Operations
    # =========================================================================

    @staticmethod
    def create_lesson(db: Session, topic_id: UUID, data: LessonCreateRequest) -> LessonResponse:
        """Create a new lesson within a topic."""
        topic = db.get(Topic, topic_id)
        if not topic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

        order = data.order
        if order == 0:
            max_order = db.scalar(
                select(func.max(Lesson.order)).where(Lesson.topic_id == topic_id)
            )
            order = (max_order + 1) if max_order is not None else 0

        lesson = Lesson(
            topic_id=topic_id,
            title=data.title,
            description=data.description,
            order=order,
        )
        db.add(lesson)
        db.commit()
        db.refresh(lesson)

        return LessonResponse(
            id=lesson.id,
            topic_id=lesson.topic_id,
            course_id=topic.course_id,
            title=lesson.title,
            description=lesson.description,
            order=lesson.order,
            resources=[],
            created_at=lesson.created_at,
            updated_at=lesson.updated_at,
        )

    @staticmethod
    def get_lesson(db: Session, lesson_id: UUID, current_user: Optional[User] = None) -> LessonResponse:
        """Fetch lesson details along with associated resources."""
        lesson = db.get(Lesson, lesson_id)
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

        topic = db.get(Topic, lesson.topic_id)
        course_id = topic.course_id if topic else None

        resources = (
            db.execute(
                select(LearningResource)
                .where(LearningResource.lesson_id == lesson.id)
                .order_by(LearningResource.created_at)
            )
            .scalars()
            .all()
        )

        res_list = [
            ResourceResponse(
                id=r.id,
                lesson_id=r.lesson_id,
                course_id=course_id,
                title=r.title,
                type=r.type,
                content_or_url=r.content_or_url,
                file_size_bytes=r.file_size_bytes,
                created_at=r.created_at,
            )
            for r in resources
        ]

        return LessonResponse(
            id=lesson.id,
            topic_id=lesson.topic_id,
            course_id=course_id,
            title=lesson.title,
            description=lesson.description,
            order=lesson.order,
            resources=res_list,
            created_at=lesson.created_at,
            updated_at=lesson.updated_at,
        )

    @staticmethod
    def update_lesson(db: Session, lesson_id: UUID, data: LessonUpdateRequest) -> LessonResponse:
        """Update lesson title, description, or order."""
        lesson = db.get(Lesson, lesson_id)
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

        topic = db.get(Topic, lesson.topic_id)
        course_id = topic.course_id if topic else None

        if data.title is not None:
            lesson.title = data.title
        if data.description is not None:
            lesson.description = data.description
        if data.order is not None:
            lesson.order = data.order

        db.commit()
        db.refresh(lesson)

        return LessonResponse(
            id=lesson.id,
            topic_id=lesson.topic_id,
            course_id=course_id,
            title=lesson.title,
            description=lesson.description,
            order=lesson.order,
            resources=[],
            created_at=lesson.created_at,
            updated_at=lesson.updated_at,
        )

    @staticmethod
    def delete_lesson(db: Session, lesson_id: UUID) -> None:
        """Delete a lesson and cascade remove its resources."""
        lesson = db.get(Lesson, lesson_id)
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

        db.delete(lesson)
        db.commit()

    # =========================================================================
    # Resource Operations
    # =========================================================================

    @staticmethod
    def create_resource(db: Session, lesson_id: UUID, data: ResourceCreateRequest) -> ResourceResponse:
        """Add a learning resource to a lesson."""
        lesson = db.get(Lesson, lesson_id)
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

        topic = db.get(Topic, lesson.topic_id)
        course_id = topic.course_id if topic else None

        resource = LearningResource(
            lesson_id=lesson_id,
            title=data.title,
            type=data.type,
            content_or_url=data.content_or_url,
            file_size_bytes=data.file_size_bytes,
        )
        db.add(resource)
        db.commit()
        db.refresh(resource)

        return ResourceResponse(
            id=resource.id,
            lesson_id=resource.lesson_id,
            course_id=course_id,
            title=resource.title,
            type=resource.type,
            content_or_url=resource.content_or_url,
            file_size_bytes=resource.file_size_bytes,
            created_at=resource.created_at,
        )

    @staticmethod
    def update_resource(db: Session, resource_id: UUID, data: ResourceUpdateRequest) -> ResourceResponse:
        """Update an existing resource."""
        resource = db.get(LearningResource, resource_id)
        if not resource:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

        lesson = db.get(Lesson, resource.lesson_id)
        topic = db.get(Topic, lesson.topic_id) if lesson else None
        course_id = topic.course_id if topic else None

        if data.title is not None:
            resource.title = data.title
        if data.type is not None:
            resource.type = data.type
        if data.content_or_url is not None:
            resource.content_or_url = data.content_or_url
        if data.file_size_bytes is not None:
            resource.file_size_bytes = data.file_size_bytes

        db.commit()
        db.refresh(resource)

        return ResourceResponse(
            id=resource.id,
            lesson_id=resource.lesson_id,
            course_id=course_id,
            title=resource.title,
            type=resource.type,
            content_or_url=resource.content_or_url,
            file_size_bytes=resource.file_size_bytes,
            created_at=resource.created_at,
        )

    @staticmethod
    def delete_resource(db: Session, resource_id: UUID) -> None:
        """Delete a resource."""
        resource = db.get(LearningResource, resource_id)
        if not resource:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

        db.delete(resource)
        db.commit()
