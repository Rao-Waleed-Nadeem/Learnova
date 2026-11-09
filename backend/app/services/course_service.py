"""Course management domain service handling catalog discovery, CRUD, and publication gates."""

from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.lesson import Lesson
from app.models.resource import LearningResource
from app.models.security_audit_event import SecurityAuditEvent
from app.models.topic import Topic
from app.models.topic_prerequisite import TopicPrerequisite
from app.models.user import User
from app.schemas.curriculum import (
    CourseCreateRequest,
    CourseDetailResponse,
    CourseResponse,
    CourseUpdateRequest,
    LessonResponse,
    ResourceResponse,
    TopicResponse,
)
from app.services.audit_service import log_audit_event
from app.services.dag_service import DAGService


class CourseService:
    """Domain service managing course discovery, authorization scoping, and publication gates."""

    @staticmethod
    def list_courses(
        db: Session,
        current_user: Optional[User] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[CourseResponse]:
        """List courses according to the caller's role and authorization boundaries."""
        stmt = select(Course)

        if current_user is None or current_user.role.name == "student":
            # Public / student: only published courses
            stmt = stmt.where(Course.status == "published")
        elif current_user.role.name == "teacher":
            # Teacher: assigned/created courses + published courses
            assigned_subquery = (
                select(CourseTeacher.course_id).where(CourseTeacher.teacher_id == current_user.id)
            )
            stmt = stmt.where(
                or_(
                    Course.status == "published",
                    Course.creator_id == current_user.id,
                    Course.id.in_(assigned_subquery),
                )
            )
        # Administrators see all courses (no extra filter)

        stmt = stmt.order_by(Course.created_at.desc()).offset(skip).limit(limit)
        courses = db.execute(stmt).scalars().all()

        results: List[CourseResponse] = []
        for course in courses:
            topics_count = db.scalar(
                select(func.count(Topic.id)).where(Topic.course_id == course.id)
            ) or 0
            lessons_count = db.scalar(
                select(func.count(Lesson.id))
                .join(Topic, Topic.id == Lesson.topic_id)
                .where(Topic.course_id == course.id)
            ) or 0

            creator_name = course.creator.full_name if course.creator else None

            results.append(
                CourseResponse(
                    id=course.id,
                    title=course.title,
                    description=course.description,
                    status=course.status,
                    creator_id=course.creator_id,
                    creator_name=creator_name,
                    topics_count=topics_count,
                    lessons_count=lessons_count,
                    created_at=course.created_at,
                    updated_at=course.updated_at,
                )
            )
        return results

    @staticmethod
    def get_course_detail(
        db: Session,
        course_id: UUID,
        current_user: Optional[User] = None,
    ) -> CourseDetailResponse:
        """Fetch course details with syllabus hierarchy (topics, lessons, resources)."""
        course = db.get(Course, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found",
            )

        # Visibility check
        if course.status != "published":
            if not current_user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
            if current_user.role.name == "student":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Course is not published")
            elif current_user.role.name == "teacher":
                is_assigned = (
                    course.creator_id == current_user.id
                    or db.execute(
                        select(CourseTeacher).where(
                            CourseTeacher.course_id == course.id,
                            CourseTeacher.teacher_id == current_user.id,
                        )
                    ).first()
                    is not None
                )
                if not is_assigned:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Not authorized to inspect this course",
                    )

        # Query topics with ordered lessons and resources
        topics = (
            db.execute(
                select(Topic)
                .where(Topic.course_id == course.id)
                .order_by(Topic.order, Topic.created_at)
            )
            .scalars()
            .all()
        )

        # Load all prerequisite edges in course
        prereq_edges = (
            db.execute(
                select(TopicPrerequisite.topic_id, TopicPrerequisite.prerequisite_topic_id)
                .join(Topic, Topic.id == TopicPrerequisite.topic_id)
                .where(Topic.course_id == course.id)
            )
            .fetchall()
        )
        prereq_map: dict[UUID, list[UUID]] = {t.id: [] for t in topics}
        for t_id, p_id in prereq_edges:
            if t_id in prereq_map:
                prereq_map[t_id].append(p_id)

        topic_responses: List[TopicResponse] = []
        total_lessons_count = 0

        for topic in topics:
            lessons = (
                db.execute(
                    select(Lesson)
                    .where(Lesson.topic_id == topic.id)
                    .order_by(Lesson.order, Lesson.created_at)
                )
                .scalars()
                .all()
            )
            total_lessons_count += len(lessons)

            lesson_responses: List[LessonResponse] = []
            for lesson in lessons:
                resources = (
                    db.execute(
                        select(LearningResource)
                        .where(LearningResource.lesson_id == lesson.id)
                        .order_by(LearningResource.created_at)
                    )
                    .scalars()
                    .all()
                )
                resource_responses = [
                    ResourceResponse(
                        id=res.id,
                        lesson_id=res.lesson_id,
                        course_id=course.id,
                        title=res.title,
                        type=res.type,
                        content_or_url=res.content_or_url,
                        file_size_bytes=res.file_size_bytes,
                        created_at=res.created_at,
                    )
                    for res in resources
                ]

                lesson_responses.append(
                    LessonResponse(
                        id=lesson.id,
                        topic_id=lesson.topic_id,
                        course_id=course.id,
                        title=lesson.title,
                        description=lesson.description,
                        order=lesson.order,
                        resources=resource_responses,
                        created_at=lesson.created_at,
                        updated_at=lesson.updated_at,
                    )
                )

            topic_responses.append(
                TopicResponse(
                    id=topic.id,
                    course_id=course.id,
                    title=topic.title,
                    description=topic.description,
                    order=topic.order,
                    mastery_threshold=topic.mastery_threshold,
                    prerequisite_topic_ids=prereq_map.get(topic.id, []),
                    lessons=lesson_responses,
                    created_at=topic.created_at,
                    updated_at=topic.updated_at,
                )
            )

        creator_name = course.creator.full_name if course.creator else None

        return CourseDetailResponse(
            id=course.id,
            title=course.title,
            description=course.description,
            status=course.status,
            creator_id=course.creator_id,
            creator_name=creator_name,
            topics_count=len(topics),
            lessons_count=total_lessons_count,
            topics=topic_responses,
            created_at=course.created_at,
            updated_at=course.updated_at,
        )

    @staticmethod
    def create_course(
        db: Session,
        data: CourseCreateRequest,
        creator: User,
    ) -> CourseResponse:
        """Create a new course in draft status and assign the creator as a teacher."""
        course = Course(
            title=data.title,
            description=data.description,
            status="draft",
            creator_id=creator.id,
        )
        db.add(course)
        db.flush()

        # If creator is teacher, record assignment
        if creator.role.name == "teacher":
            assignment = CourseTeacher(
                course_id=course.id,
                teacher_id=creator.id,
            )
            db.add(assignment)

        # Audit event
        log_audit_event(
            db=db,
            actor_id=creator.id,
            actor_email=creator.email,
            actor_role=creator.role.name,
            action="course.create",
            target_type="course",
            target_id=str(course.id),
            outcome="SUCCESS",
            details={"title": course.title, "status": course.status},
        )
        db.commit()
        db.refresh(course)

        return CourseResponse(
            id=course.id,
            title=course.title,
            description=course.description,
            status=course.status,
            creator_id=course.creator_id,
            creator_name=creator.full_name,
            topics_count=0,
            lessons_count=0,
            created_at=course.created_at,
            updated_at=course.updated_at,
        )

    @staticmethod
    def update_course(
        db: Session,
        course_id: UUID,
        data: CourseUpdateRequest,
        actor: User,
    ) -> CourseResponse:
        """Update course metadata (title, description)."""
        course = db.get(Course, course_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

        if data.title is not None:
            course.title = data.title
        if data.description is not None:
            course.description = data.description

        log_audit_event(
            db=db,
            actor_id=actor.id,
            actor_email=actor.email,
            actor_role=actor.role.name,
            action="course.update",
            target_type="course",
            target_id=str(course.id),
            outcome="SUCCESS",
            details={"title": course.title},
        )
        db.commit()
        db.refresh(course)

        topics_count = db.scalar(select(func.count(Topic.id)).where(Topic.course_id == course.id)) or 0
        lessons_count = db.scalar(
            select(func.count(Lesson.id))
            .join(Topic, Topic.id == Lesson.topic_id)
            .where(Topic.course_id == course.id)
        ) or 0

        return CourseResponse(
            id=course.id,
            title=course.title,
            description=course.description,
            status=course.status,
            creator_id=course.creator_id,
            creator_name=course.creator.full_name if course.creator else None,
            topics_count=topics_count,
            lessons_count=lessons_count,
            created_at=course.created_at,
            updated_at=course.updated_at,
        )

    @staticmethod
    def publish_course(
        db: Session,
        course_id: UUID,
        actor: User,
    ) -> CourseResponse:
        """Validate course structural integrity and publish the course (DEC-P4-003).

        Quality Gate:
        1. Course must contain at least 1 topic.
        2. Every topic must contain at least 1 lesson.
        3. The prerequisite DAG must be strictly acyclic.
        """
        course = db.get(Course, course_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

        # 1. Topic count check
        topics = db.execute(select(Topic).where(Topic.course_id == course.id)).scalars().all()
        if not topics:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Course publication failed: course must have at least one topic.",
            )

        # 2. Topic lessons check
        for topic in topics:
            lesson_count = db.scalar(
                select(func.count(Lesson.id)).where(Lesson.topic_id == topic.id)
            ) or 0
            if lesson_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Course publication failed: topic '{topic.title}' (ID {topic.id}) has no lessons.",
                )

        # 3. Acyclicity check
        DAGService.validate_course_graph_is_acyclic(db, course.id)

        # Transition to published
        course.status = "published"

        log_audit_event(
            db=db,
            actor_id=actor.id,
            actor_email=actor.email,
            actor_role=actor.role.name,
            action="course.publish",
            target_type="course",
            target_id=str(course.id),
            outcome="SUCCESS",
            details={"status": "published", "topics_count": len(topics)},
        )
        db.commit()
        db.refresh(course)

        total_lessons = db.scalar(
            select(func.count(Lesson.id))
            .join(Topic, Topic.id == Lesson.topic_id)
            .where(Topic.course_id == course.id)
        ) or 0

        return CourseResponse(
            id=course.id,
            title=course.title,
            description=course.description,
            status=course.status,
            creator_id=course.creator_id,
            creator_name=course.creator.full_name if course.creator else None,
            topics_count=len(topics),
            lessons_count=total_lessons,
            created_at=course.created_at,
            updated_at=course.updated_at,
        )
