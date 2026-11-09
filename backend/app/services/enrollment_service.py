"""Enrollment domain service managing student course enrollments, lesson completions, and learning maps."""

from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion, ResourceActivity
from app.models.outbox import DomainOutboxEvent
from app.models.resource import LearningResource
from app.models.topic import Topic
from app.models.topic_prerequisite import TopicPrerequisite
from app.models.user import User
from app.schemas.enrollment import (
    EnrollmentResponse,
    LearningMapEdge,
    LearningMapNode,
    LearningMapResponse,
    LessonCompletionResponse,
    ResourceActivityRequest,
    ResourceActivityResponse,
)


class EnrollmentService:
    """Domain service managing enrollment lifecycles, activity persistence, and progress calculation."""

    @classmethod
    def calculate_course_progress(
        cls, db: Session, student_id: UUID, course_id: UUID
    ) -> Tuple[int, int, float]:
        """Dynamically derive completed lessons count, total lessons count, and progress percent.

        Follows DEC-P4-005: dynamically derived from authoritative completion records
        rather than stale denormalized stored fields.
        """
        total_lessons = (
            db.scalar(
                select(func.count(Lesson.id))
                .join(Topic, Topic.id == Lesson.topic_id)
                .where(Topic.course_id == course_id)
            )
            or 0
        )

        completed_lessons = (
            db.scalar(
                select(func.count(LessonCompletion.id)).where(
                    LessonCompletion.student_id == student_id,
                    LessonCompletion.course_id == course_id,
                )
            )
            or 0
        )

        if total_lessons == 0:
            progress_percent = 0.0
        else:
            progress_percent = round((completed_lessons / total_lessons) * 100.0, 2)

        return completed_lessons, total_lessons, progress_percent

    @classmethod
    def enroll_student(
        cls, db: Session, student: User, course_id: UUID
    ) -> Tuple[EnrollmentResponse, bool]:
        """Enroll a student in a course idempotently.

        Returns:
            (EnrollmentResponse, is_new: bool)
            is_new is True if newly created (201 Created), False if already enrolled (200 OK).
        """
        course = db.get(Course, course_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

        # Invariant: Students can enroll only in published courses
        if course.status != "published":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students can enroll only in published courses",
            )

        # Check existing enrollment
        existing = (
            db.execute(
                select(Enrollment).where(
                    Enrollment.student_id == student.id,
                    Enrollment.course_id == course_id,
                )
            )
            .scalars()
            .first()
        )

        if existing:
            comp_cnt, tot_cnt, prog = cls.calculate_course_progress(db, student.id, course_id)
            return (
                EnrollmentResponse(
                    id=existing.id,
                    student_id=existing.student_id,
                    course_id=existing.course_id,
                    course_title=course.title,
                    status=existing.status,
                    enrolled_at=existing.enrolled_at,
                    completed_at=existing.completed_at,
                    progress_percent=prog,
                    completed_lessons_count=comp_cnt,
                    total_lessons_count=tot_cnt,
                    created_at=existing.created_at,
                    updated_at=existing.updated_at,
                ),
                False,
            )

        # Create new enrollment with safe concurrency handling
        enrollment = Enrollment(
            student_id=student.id,
            course_id=course_id,
            status="active",
        )
        db.add(enrollment)
        try:
            db.commit()
            db.refresh(enrollment)
        except IntegrityError:
            db.rollback()
            # Fetch concurrently inserted enrollment
            existing = (
                db.execute(
                    select(Enrollment).where(
                        Enrollment.student_id == student.id,
                        Enrollment.course_id == course_id,
                    )
                )
                .scalars()
                .one()
            )
            comp_cnt, tot_cnt, prog = cls.calculate_course_progress(db, student.id, course_id)
            return (
                EnrollmentResponse(
                    id=existing.id,
                    student_id=existing.student_id,
                    course_id=existing.course_id,
                    course_title=course.title,
                    status=existing.status,
                    enrolled_at=existing.enrolled_at,
                    completed_at=existing.completed_at,
                    progress_percent=prog,
                    completed_lessons_count=comp_cnt,
                    total_lessons_count=tot_cnt,
                    created_at=existing.created_at,
                    updated_at=existing.updated_at,
                ),
                False,
            )

        comp_cnt, tot_cnt, prog = cls.calculate_course_progress(db, student.id, course_id)
        return (
            EnrollmentResponse(
                id=enrollment.id,
                student_id=enrollment.student_id,
                course_id=enrollment.course_id,
                course_title=course.title,
                status=enrollment.status,
                enrolled_at=enrollment.enrolled_at,
                completed_at=enrollment.completed_at,
                progress_percent=prog,
                completed_lessons_count=comp_cnt,
                total_lessons_count=tot_cnt,
                created_at=enrollment.created_at,
                updated_at=enrollment.updated_at,
            ),
            True,
        )

    @classmethod
    def get_student_enrollments(cls, db: Session, student_id: UUID) -> List[EnrollmentResponse]:
        """Fetch all enrollments for a given student with calculated progress percentages."""
        enrollments = (
            db.execute(
                select(Enrollment)
                .where(Enrollment.student_id == student_id)
                .order_by(Enrollment.enrolled_at.desc())
            )
            .scalars()
            .all()
        )

        results: List[EnrollmentResponse] = []
        for enr in enrollments:
            course = db.get(Course, enr.course_id)
            course_title = course.title if course else ""
            comp_cnt, tot_cnt, prog = cls.calculate_course_progress(db, student_id, enr.course_id)
            results.append(
                EnrollmentResponse(
                    id=enr.id,
                    student_id=enr.student_id,
                    course_id=enr.course_id,
                    course_title=course_title,
                    status=enr.status,
                    enrolled_at=enr.enrolled_at,
                    completed_at=enr.completed_at,
                    progress_percent=prog,
                    completed_lessons_count=comp_cnt,
                    total_lessons_count=tot_cnt,
                    created_at=enr.created_at,
                    updated_at=enr.updated_at,
                )
            )
        return results

    @classmethod
    def record_lesson_completion(
        cls, db: Session, student: User, lesson_id: UUID
    ) -> LessonCompletionResponse:
        """Idempotently record completion of a lesson for the authenticated student."""
        lesson = db.get(Lesson, lesson_id)
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

        topic = db.get(Topic, lesson.topic_id)
        if not topic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

        course_id = topic.course_id

        # Verify caller has an active enrollment in this course
        enrollment = (
            db.execute(
                select(Enrollment).where(
                    Enrollment.student_id == student.id,
                    Enrollment.course_id == course_id,
                )
            )
            .scalars()
            .first()
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student is not enrolled in the course for this lesson",
            )

        # Check existing completion (idempotency)
        existing = (
            db.execute(
                select(LessonCompletion).where(
                    LessonCompletion.student_id == student.id,
                    LessonCompletion.lesson_id == lesson_id,
                )
            )
            .scalars()
            .first()
        )

        if existing:
            _, _, prog = cls.calculate_course_progress(db, student.id, course_id)
            return LessonCompletionResponse(
                id=existing.id,
                enrollment_id=existing.enrollment_id,
                student_id=existing.student_id,
                course_id=existing.course_id,
                topic_id=existing.topic_id,
                lesson_id=existing.lesson_id,
                completed_at=existing.completed_at,
                progress_percent=prog,
            )

        completion = LessonCompletion(
            enrollment_id=enrollment.id,
            student_id=student.id,
            course_id=course_id,
            topic_id=topic.id,
            lesson_id=lesson.id,
        )
        db.add(completion)
        try:
            db.commit()
            db.refresh(completion)
        except IntegrityError:
            db.rollback()
            existing = (
                db.execute(
                    select(LessonCompletion).where(
                        LessonCompletion.student_id == student.id,
                        LessonCompletion.lesson_id == lesson_id,
                    )
                )
                .scalars()
                .one()
            )
            _, _, prog = cls.calculate_course_progress(db, student.id, course_id)
            return LessonCompletionResponse(
                id=existing.id,
                enrollment_id=existing.enrollment_id,
                student_id=existing.student_id,
                course_id=existing.course_id,
                topic_id=existing.topic_id,
                lesson_id=existing.lesson_id,
                completed_at=existing.completed_at,
                progress_percent=prog,
            )

        # Atomic Outbox Event Insertion (P8-FIX-01: Gamification processed asynchronously by outbox worker)
        outbox_event = DomainOutboxEvent(
            event_type="lesson.completed",
            aggregate_type="lesson_completion",
            aggregate_id=str(completion.id),
            idempotency_key=f"outbox_lesson_completed_{completion.id}",
            payload={
                "completion_id": str(completion.id),
                "student_id": str(student.id),
                "lesson_id": str(lesson.id),
                "lesson_title": lesson.title,
                "course_id": str(course_id),
                "topic_id": str(topic.id),
            },
            status="pending",
        )
        db.add(outbox_event)
        db.commit()

        _, _, prog = cls.calculate_course_progress(db, student.id, course_id)
        return LessonCompletionResponse(
            id=completion.id,
            enrollment_id=completion.enrollment_id,
            student_id=completion.student_id,
            course_id=completion.course_id,
            topic_id=completion.topic_id,
            lesson_id=completion.lesson_id,
            completed_at=completion.completed_at,
            progress_percent=prog,
        )

    @classmethod
    def record_resource_activity(
        cls,
        db: Session,
        student: User,
        resource_id: UUID,
        data: ResourceActivityRequest,
    ) -> ResourceActivityResponse:
        """Record a student study activity interaction on a resource."""
        resource = db.get(LearningResource, resource_id)
        if not resource:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

        lesson = db.get(Lesson, resource.lesson_id)
        topic = db.get(Topic, lesson.topic_id) if lesson else None
        course_id = topic.course_id if topic else None

        # Verify enrollment
        enrollment = None
        if course_id:
            enrollment = (
                db.execute(
                    select(Enrollment).where(
                        Enrollment.student_id == student.id,
                        Enrollment.course_id == course_id,
                    )
                )
                .scalars()
                .first()
            )
            if not enrollment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Student is not enrolled in the course for this resource",
                )

        activity = ResourceActivity(
            enrollment_id=enrollment.id if enrollment else None,
            student_id=student.id,
            resource_id=resource_id,
            event_type=data.event_type,
            duration_seconds=data.duration_seconds,
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)

        return ResourceActivityResponse(
            id=activity.id,
            enrollment_id=activity.enrollment_id,
            student_id=activity.student_id,
            resource_id=activity.resource_id,
            event_type=activity.event_type,
            duration_seconds=activity.duration_seconds,
            occurred_at=activity.occurred_at,
            created_at=activity.created_at,
        )

    @classmethod
    def get_learning_map(
        cls,
        db: Session,
        course_id: UUID,
        student_id: Optional[UUID] = None,
    ) -> LearningMapResponse:
        """Construct the curriculum DAG with topic readiness evaluation for the student (SSD-02, FR-CRS-05)."""
        course = db.get(Course, course_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

        topics = (
            db.execute(
                select(Topic)
                .where(Topic.course_id == course_id)
                .order_by(Topic.order, Topic.created_at)
            )
            .scalars()
            .all()
        )

        edges_raw = (
            db.execute(
                select(TopicPrerequisite.topic_id, TopicPrerequisite.prerequisite_topic_id)
                .join(Topic, Topic.id == TopicPrerequisite.topic_id)
                .where(Topic.course_id == course_id)
            )
            .fetchall()
        )

        # Build prerequisite lookup: topic_id -> list of prerequisite_topic_ids
        prereqs_by_topic: dict[UUID, list[UUID]] = {t.id: [] for t in topics}
        for topic_id, prereq_id in edges_raw:
            if topic_id in prereqs_by_topic:
                prereqs_by_topic[topic_id].append(prereq_id)

        # Load completed lesson IDs for student if present
        completed_lesson_ids: set[UUID] = set()
        if student_id:
            completed_lesson_ids = set(
                db.execute(
                    select(LessonCompletion.lesson_id).where(
                        LessonCompletion.student_id == student_id,
                        LessonCompletion.course_id == course_id,
                    )
                )
                .scalars()
                .all()
            )

        # Evaluate lesson counts and topic completeness
        topic_lessons_count: dict[UUID, int] = {}
        topic_completed_count: dict[UUID, int] = {}
        topic_is_complete: dict[UUID, bool] = {}

        for topic in topics:
            lesson_ids = (
                db.execute(select(Lesson.id).where(Lesson.topic_id == topic.id)).scalars().all()
            )
            total = len(lesson_ids)
            completed = sum(1 for lid in lesson_ids if lid in completed_lesson_ids)

            topic_lessons_count[topic.id] = total
            topic_completed_count[topic.id] = completed
            # A topic is considered fully learned when all its lessons are completed (or 0 lessons)
            topic_is_complete[topic.id] = (completed == total) if total > 0 else True

        nodes: List[LearningMapNode] = []
        for topic in topics:
            prereq_ids = prereqs_by_topic.get(topic.id, [])
            total = topic_lessons_count[topic.id]
            completed = topic_completed_count[topic.id]

            # Determine readiness
            unmet = [pid for pid in prereq_ids if not topic_is_complete.get(pid, False)]
            if not student_id:
                readiness = "not_evaluated"
            elif unmet:
                readiness = "locked"
            elif completed > 0 and completed < total:
                readiness = "in_progress"
            else:
                readiness = "ready"

            nodes.append(
                LearningMapNode(
                    id=topic.id,
                    title=topic.title,
                    description=topic.description,
                    order=topic.order,
                    mastery_threshold=float(topic.mastery_threshold),
                    prerequisite_ids=prereq_ids,
                    lessons_count=total,
                    completed_lessons_count=completed,
                    readiness=readiness,
                    unmet_prerequisites=unmet,
                )
            )

        # Edges: source = prerequisite, target = dependent topic
        edges = [
            LearningMapEdge(source=prereq_id, target=topic_id)
            for topic_id, prereq_id in edges_raw
        ]

        return LearningMapResponse(
            course_id=course.id,
            course_title=course.title,
            nodes=nodes,
            edges=edges,
        )
