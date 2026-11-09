"""Personalized Learning Path Service for Learnova (FR-MAS-06, FR-MAS-07, SSD-03)."""

import uuid
from typing import Dict, List, Optional, Set

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.attempt import AssessmentAttempt
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion
from app.models.mastery import StudentTopicMastery
from app.models.topic import Topic
from app.schemas.mastery import (
    CourseLearningPathResponse,
    LearningPathItemResponse,
)
from app.services.dag_service import DAGService
from app.services.mastery_service import MasteryService


class LearningPathService:
    """Service dynamically planning sequential personalized learning paths with remediation and acceleration."""

    @classmethod
    def generate_learning_path(
        cls,
        db: Session,
        course_id: uuid.UUID,
        student_id: uuid.UUID,
    ) -> CourseLearningPathResponse:
        """Generate personalized learning path and identify immediate recommended action (SSD-03)."""
        course = db.get(Course, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course not found: {course_id}",
            )

        # 1. Topologically sort course topics respecting prerequisite ordering
        sorted_topics = DAGService.topological_sort(db, course_id)

        # 2. Pre-fetch completed lessons for this student in this course
        completed_rows = (
            db.query(LessonCompletion.lesson_id)
            .filter(
                LessonCompletion.student_id == student_id,
                LessonCompletion.course_id == course_id,
            )
            .all()
        )
        completed_lesson_ids: Set[uuid.UUID] = {row[0] for row in completed_rows}

        # 3. Pre-fetch topic mastery records for this student
        mastery_rows = (
            db.query(StudentTopicMastery)
            .filter(
                StudentTopicMastery.student_id == student_id,
                StudentTopicMastery.course_id == course_id,
            )
            .all()
        )
        mastery_map: Dict[uuid.UUID, StudentTopicMastery] = {m.topic_id: m for m in mastery_rows}

        # 4. Pre-fetch all lessons grouped by topic_id
        all_lessons = (
            db.query(Lesson)
            .join(Topic, Topic.id == Lesson.topic_id)
            .filter(Topic.course_id == course_id)
            .order_by(Lesson.order)
            .all()
        )
        lessons_by_topic: Dict[uuid.UUID, List[Lesson]] = {}
        for l in all_lessons:
            lessons_by_topic.setdefault(l.topic_id, []).append(l)

        items: List[LearningPathItemResponse] = []
        recommended_step: Optional[LearningPathItemResponse] = None

        total_lessons_count = len(all_lessons)
        completed_lessons_count = sum(1 for l in all_lessons if l.id in completed_lesson_ids)
        mastered_topics_count = 0

        # 5. Evaluate topics in topological order
        for topic in sorted_topics:
            readiness = MasteryService.get_topic_readiness(db, topic.id, student_id)
            m = mastery_map.get(topic.id)
            if m and m.status == "mastered":
                mastered_topics_count += 1

            topic_lessons = lessons_by_topic.get(topic.id, [])

            if not readiness.is_ready:
                # Locked topic: prerequisites unmet
                if recommended_step is None:
                    if readiness.diagnostic_assessment_id:
                        recommended_step = LearningPathItemResponse(
                            id=f"rec-diag-{topic.id}",
                            course_id=course_id,
                            topic_id=topic.id,
                            topic_title=topic.title,
                            type="diagnostic",
                            title=f"Prerequisite Diagnostic: {topic.title}",
                            reason=readiness.reason,
                            is_completed=False,
                        )

                # Add lessons as pending/locked
                for lesson in topic_lessons:
                    is_comp = lesson.id in completed_lesson_ids
                    items.append(
                        LearningPathItemResponse(
                            id=f"path-{lesson.id}",
                            course_id=course_id,
                            topic_id=topic.id,
                            topic_title=topic.title,
                            lesson_id=lesson.id,
                            lesson_title=lesson.title,
                            type="lesson",
                            title=lesson.title,
                            reason=f"Locked until prerequisites are satisfied: {readiness.reason}",
                            is_completed=is_comp,
                        )
                    )
            else:
                # Topic is ready!
                uncompleted_in_topic = [l for l in topic_lessons if l.id not in completed_lesson_ids]

                for lesson in topic_lessons:
                    is_comp = lesson.id in completed_lesson_ids
                    items.append(
                        LearningPathItemResponse(
                            id=f"path-{lesson.id}",
                            course_id=course_id,
                            topic_id=topic.id,
                            topic_title=topic.title,
                            lesson_id=lesson.id,
                            lesson_title=lesson.title,
                            type="lesson",
                            title=lesson.title,
                            reason=f"Core curriculum lesson in {topic.title}.",
                            is_completed=is_comp,
                        )
                    )

                if uncompleted_in_topic:
                    # Recommend first uncompleted lesson in this accessible topic
                    if recommended_step is None:
                        next_lesson = uncompleted_in_topic[0]
                        recommended_step = LearningPathItemResponse(
                            id=f"rec-lesson-{next_lesson.id}",
                            course_id=course_id,
                            topic_id=topic.id,
                            topic_title=topic.title,
                            lesson_id=next_lesson.id,
                            lesson_title=next_lesson.title,
                            type="lesson",
                            title=next_lesson.title,
                            reason=f"Continue your sequential curriculum progression in {topic.title}.",
                            is_completed=False,
                        )
                else:
                    # All lessons in this topic are completed!
                    # Check topic mastery for remediation loop vs acceleration
                    if not m or m.status in ("not_assessed", "developing") or m.score_percent < 70:
                        # Remediation Loop! Recommend adaptive practice
                        if recommended_step is None:
                            recommended_step = LearningPathItemResponse(
                                id=f"rec-practice-{topic.id}",
                                course_id=course_id,
                                topic_id=topic.id,
                                topic_title=topic.title,
                                type="adaptive_practice",
                                title=f"Adaptive Practice: {topic.title}",
                                reason=f"Recalibrate your mastery of {topic.title} with targeted practice questions.",
                                is_completed=False,
                            )
                    # If competent or mastered, loop continues to subsequent topics

        # 6. Check for course final examination if all curriculum topics completed & satisfied
        if recommended_step is None:
            final_exam = (
                db.query(Assessment)
                .filter(
                    Assessment.course_id == course_id,
                    Assessment.type == "final",
                    Assessment.status == "published",
                )
                .first()
            )

            if final_exam:
                passed_exam = (
                    db.query(AssessmentAttempt)
                    .filter(
                        AssessmentAttempt.assessment_id == final_exam.id,
                        AssessmentAttempt.student_id == student_id,
                        AssessmentAttempt.passed.is_(True),
                    )
                    .first()
                )
                last_topic = sorted_topics[-1] if sorted_topics else None
                last_tid = last_topic.id if last_topic else course_id
                last_ttitle = last_topic.title if last_topic else course.title

                if not passed_exam:
                    recommended_step = LearningPathItemResponse(
                        id=f"rec-exam-{final_exam.id}",
                        course_id=course_id,
                        topic_id=last_tid,
                        topic_title=last_ttitle,
                        type="final_exam",
                        title=final_exam.title,
                        reason="You have satisfied the syllabus requirements and are ready for the summative examination.",
                        is_completed=False,
                    )
                else:
                    recommended_step = LearningPathItemResponse(
                        id=f"rec-complete-{course_id}",
                        course_id=course_id,
                        topic_id=last_tid,
                        topic_title=last_ttitle,
                        type="course_completed",
                        title="Course Completed!",
                        reason="Congratulations! You have mastered all syllabus topics and passed the final examination.",
                        is_completed=True,
                    )

        # 7. Fallback recommendation if no specific step was found
        if recommended_step is None:
            first_topic = sorted_topics[0] if sorted_topics else None
            first_lesson = lessons_by_topic.get(first_topic.id, [])[0] if first_topic and lessons_by_topic.get(first_topic.id) else None
            recommended_step = LearningPathItemResponse(
                id="rec-start",
                course_id=course_id,
                topic_id=first_topic.id if first_topic else course_id,
                topic_title=first_topic.title if first_topic else course.title,
                lesson_id=first_lesson.id if first_lesson else None,
                lesson_title=first_lesson.title if first_lesson else None,
                type="lesson" if first_lesson else "adaptive_practice",
                title=first_lesson.title if first_lesson else f"Start Learning: {course.title}",
                reason="Begin your learning journey in this course.",
                is_completed=False,
            )

        progress_pct = (
            round((completed_lessons_count / total_lessons_count) * 100.0, 1)
            if total_lessons_count > 0
            else 0.0
        )

        return CourseLearningPathResponse(
            course_id=course_id,
            student_id=student_id,
            recommended_next_step=recommended_step,
            items=items,
            total_topics=len(sorted_topics),
            mastered_topics=mastered_topics_count,
            progress_percent=progress_pct,
        )
