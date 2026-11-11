"""Domain service for Student and Teacher Analytics aggregations (Phase 10)."""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Set, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.attempt import AssessmentAttempt
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.enrollment import Enrollment
from app.models.gamification import GamificationProfile, UserBadge
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion, ResourceActivity
from app.models.mastery import StudentTopicMastery
from app.models.resource import LearningResource
from app.models.topic import Topic
from app.models.user import User
from app.schemas.analytics import (
    AssessmentSummaryItem,
    AtRiskStudentItem,
    ScoreDistributionBands,
    StudentAnalyticsResponse,
    StudentAttemptListItem,
    StudentAttemptsListResponse,
    StudentAttemptTrendItem,
    StudentDashboardResponse,
    StudentEnrolledCourseSummary,
    StudentGamificationSummary,
    StudentMasterySummary,
    StudentRecentActivity,
    StudentRecentAttempt,
    StudentTopicMasteryItem,
    TeacherAssignedCourseSummary,
    TeacherCourseAnalyticsResponse,
    TeacherDashboardResponse,
    TeacherStudentCourseAnalyticsResponse,
    TopicMasteryDistributionItem,
)
from app.services.question_service import QuestionService

logger = logging.getLogger("learnova.services.analytics")


class AnalyticsService:
    """Core domain service computing server-authoritative analytics for students and teachers."""

    # =========================================================================
    # Student Analytics Methods
    # =========================================================================

    @staticmethod
    def get_student_dashboard(db: Session, student: User) -> StudentDashboardResponse:
        """Aggregate student-owned dashboard metrics across enrolled courses."""
        # 1. Fetch active enrollments
        enrollments = (
            db.query(Enrollment)
            .filter(
                Enrollment.student_id == student.id,
                Enrollment.status.in_(("active", "completed")),
            )
            .all()
        )

        enrolled_course_summaries: List[StudentEnrolledCourseSummary] = []
        all_enrolled_topic_ids: Set[uuid.UUID] = set()

        for enr in enrollments:
            course = db.get(Course, enr.course_id)
            if not course:
                continue

            # Query topics in course
            course_topics = db.query(Topic).filter(Topic.course_id == course.id).all()
            topic_ids = [t.id for t in course_topics]
            all_enrolled_topic_ids.update(topic_ids)

            # Lessons count in course
            total_lessons = 0
            if topic_ids:
                total_lessons = (
                    db.query(func.count(Lesson.id))
                    .filter(Lesson.topic_id.in_(topic_ids))
                    .scalar()
                    or 0
                )

            # Completed lessons count in course for student
            completed_lessons = 0
            if total_lessons > 0:
                completed_lessons = (
                    db.query(func.count(LessonCompletion.id))
                    .join(Lesson, LessonCompletion.lesson_id == Lesson.id)
                    .filter(
                        LessonCompletion.student_id == student.id,
                        Lesson.topic_id.in_(topic_ids),
                    )
                    .scalar()
                    or 0
                )

            progress_percent = min(100, int((completed_lessons / total_lessons) * 100)) if total_lessons > 0 else 0

            # Average course mastery (assessed topics only)
            avg_mastery_percent: Optional[int] = None
            if topic_ids:
                assessed_masteries = (
                    db.query(StudentTopicMastery.mastery_score)
                    .filter(
                        StudentTopicMastery.student_id == student.id,
                        StudentTopicMastery.topic_id.in_(topic_ids),
                        StudentTopicMastery.status != "not_assessed",
                    )
                    .all()
                )
                if assessed_masteries:
                    scores = [float(m[0]) for m in assessed_masteries if m[0] is not None]
                    if scores:
                        avg_mastery_percent = int(round((sum(scores) / len(scores)) * 100))

            enrolled_course_summaries.append(
                StudentEnrolledCourseSummary(
                    course_id=course.id,
                    course_title=course.title,
                    course_description=course.description,
                    enrolled_at=enr.enrolled_at,
                    progress_percent=progress_percent,
                    completed_lessons=completed_lessons,
                    total_lessons=total_lessons,
                    average_mastery_percent=avg_mastery_percent,
                )
            )

        # 2. Overall Mastery Summary across all enrolled topics
        total_topics = len(all_enrolled_topic_ids)
        mastered_count = 0
        competent_count = 0
        developing_count = 0
        assessed_scores: List[float] = []

        if all_enrolled_topic_ids:
            mastery_records = (
                db.query(StudentTopicMastery)
                .filter(
                    StudentTopicMastery.student_id == student.id,
                    StudentTopicMastery.topic_id.in_(all_enrolled_topic_ids),
                )
                .all()
            )
            for rec in mastery_records:
                if rec.status == "mastered":
                    mastered_count += 1
                elif rec.status == "competent":
                    competent_count += 1
                elif rec.status == "developing":
                    developing_count += 1
                
                if rec.status != "not_assessed" and rec.mastery_score is not None:
                    assessed_scores.append(float(rec.mastery_score))

        assessed_count = mastered_count + competent_count + developing_count
        not_assessed_count = max(0, total_topics - assessed_count)
        overall_avg_mastery: Optional[int] = None
        if assessed_scores:
            overall_avg_mastery = int(round((sum(assessed_scores) / len(assessed_scores)) * 100))

        mastery_summary = StudentMasterySummary(
            total_topics=total_topics,
            mastered_count=mastered_count,
            competent_count=competent_count,
            developing_count=developing_count,
            not_assessed_count=not_assessed_count,
            overall_average_mastery=overall_avg_mastery,
        )

        # 3. Recent completed assessment attempts (top 5)
        recent_attempts_raw = (
            db.query(AssessmentAttempt)
            .filter(AssessmentAttempt.student_id == student.id)
            .order_by(AssessmentAttempt.created_at.desc())
            .limit(5)
            .all()
        )
        recent_attempts: List[StudentRecentAttempt] = []
        for att in recent_attempts_raw:
            assessment = db.get(Assessment, att.assessment_id)
            if not assessment:
                continue
            course = db.get(Course, assessment.course_id)
            course_title = course.title if course else "Course"

            is_passing: Optional[bool] = None
            if att.score_percent is not None and assessment.passing_score_percent is not None:
                is_passing = att.score_percent >= assessment.passing_score_percent

            recent_attempts.append(
                StudentRecentAttempt(
                    attempt_id=att.id,
                    assessment_id=assessment.id,
                    assessment_title=assessment.title,
                    course_id=assessment.course_id,
                    course_title=course_title,
                    score_percent=att.score_percent,
                    status=att.status,
                    is_passing=is_passing,
                    submitted_at=att.submitted_at,
                )
            )

        # 4. Recent learning activities (merged top 5 lesson completions and resource activities)
        recent_activities: List[StudentRecentActivity] = []
        lesson_comps = (
            db.query(LessonCompletion)
            .filter(LessonCompletion.student_id == student.id)
            .order_by(LessonCompletion.completed_at.desc())
            .limit(5)
            .all()
        )
        for lc in lesson_comps:
            lesson = db.get(Lesson, lc.lesson_id)
            if not lesson:
                continue
            topic = db.get(Topic, lesson.topic_id)
            course_id = topic.course_id if topic else uuid.uuid4()
            course = db.get(Course, course_id) if topic else None
            recent_activities.append(
                StudentRecentActivity(
                    id=lc.id,
                    activity_type="lesson_completion",
                    title=lesson.title,
                    course_id=course_id,
                    course_title=course.title if course else "Course",
                    completed_at=lc.completed_at,
                )
            )

        resource_acts = (
            db.query(ResourceActivity)
            .filter(ResourceActivity.student_id == student.id)
            .order_by(ResourceActivity.created_at.desc())
            .limit(5)
            .all()
        )
        for ra in resource_acts:
            resource = db.get(LearningResource, ra.resource_id)
            if not resource:
                continue
            lesson = db.get(Lesson, resource.lesson_id)
            topic = db.get(Topic, lesson.topic_id) if lesson else None
            course_id = topic.course_id if topic else uuid.uuid4()
            course = db.get(Course, course_id) if topic else None
            recent_activities.append(
                StudentRecentActivity(
                    id=ra.id,
                    activity_type="resource_study",
                    title=resource.title,
                    course_id=course_id,
                    course_title=course.title if course else "Course",
                    completed_at=ra.created_at,
                )
            )

        # Sort combined activities newest first and limit to 5
        recent_activities.sort(key=lambda x: x.completed_at, reverse=True)
        recent_activities = recent_activities[:5]

        # 5. Gamification summary (strictly isolated from mastery)
        gamification_summary: Optional[StudentGamificationSummary] = None
        profile = (
            db.query(GamificationProfile)
            .filter(GamificationProfile.student_id == student.id)
            .first()
        )
        if profile:
            badges_count = (
                db.query(func.count(UserBadge.id))
                .filter(UserBadge.student_id == student.id)
                .scalar()
                or 0
            )
            gamification_summary = StudentGamificationSummary(
                xp=profile.xp,
                level=profile.level,
                streak_days=profile.streak_days,
                badges_count=badges_count,
                is_opted_in_leaderboard=profile.is_opted_in_leaderboard,
            )

        return StudentDashboardResponse(
            student_id=student.id,
            student_name=student.full_name,
            enrolled_courses=enrolled_course_summaries,
            mastery_summary=mastery_summary,
            recent_attempts=recent_attempts,
            recent_activity=recent_activities,
            gamification=gamification_summary,
        )

    @staticmethod
    def get_student_analytics(
        db: Session,
        student: User,
        course_id: Optional[uuid.UUID] = None,
    ) -> StudentAnalyticsResponse:
        """Detailed personal topic mastery breakdown, weak topics, and score trajectory."""
        # 1. Scope courses
        if course_id:
            # Enforce enrollment
            enr = (
                db.query(Enrollment)
                .filter(
                    Enrollment.student_id == student.id,
                    Enrollment.course_id == course_id,
                    Enrollment.status.in_(("active", "completed")),
                )
                .first()
            )
            if not enr:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Student is not actively enrolled in this course.",
                )
            courses = [db.get(Course, course_id)]
        else:
            enrollments = (
                db.query(Enrollment)
                .filter(
                    Enrollment.student_id == student.id,
                    Enrollment.status.in_(("active", "completed")),
                )
                .all()
            )
            courses = [db.get(Course, e.course_id) for e in enrollments]

        topic_mastery_items: List[StudentTopicMasteryItem] = []
        weak_topic_items: List[StudentTopicMasteryItem] = []

        for crs in courses:
            if not crs:
                continue
            topics = db.query(Topic).filter(Topic.course_id == crs.id).order_by(Topic.order).all()
            for top in topics:
                stm = (
                    db.query(StudentTopicMastery)
                    .filter(
                        StudentTopicMastery.student_id == student.id,
                        StudentTopicMastery.topic_id == top.id,
                    )
                    .first()
                )

                mastery_score: Optional[float] = None
                mastery_percent: Optional[int] = None
                status_label = "not_assessed"
                last_assessed: Optional[datetime] = None

                if stm and stm.status != "not_assessed" and stm.mastery_score is not None:
                    mastery_score = float(stm.mastery_score)
                    mastery_percent = int(round(mastery_score * 100))
                    status_label = stm.status
                    last_assessed = stm.last_assessed_at

                # Invariant: Never classify not_assessed as weak
                threshold = int(round(float(top.mastery_threshold) * 100)) if top.mastery_threshold is not None else 75
                is_weak = (
                    status_label != "not_assessed"
                    and mastery_percent is not None
                    and mastery_percent < threshold
                )

                item = StudentTopicMasteryItem(
                    topic_id=top.id,
                    topic_title=top.title,
                    course_id=crs.id,
                    course_title=crs.title,
                    mastery_score=mastery_score,
                    mastery_percent=mastery_percent,
                    status=status_label,
                    threshold=threshold,
                    is_weak=is_weak,
                    last_assessed_at=last_assessed,
                )
                topic_mastery_items.append(item)
                if is_weak:
                    weak_topic_items.append(item)

        # 2. Attempt score trajectory trends (completed and graded attempts only)
        attempt_query = (
            db.query(AssessmentAttempt)
            .join(Assessment, AssessmentAttempt.assessment_id == Assessment.id)
            .filter(
                AssessmentAttempt.student_id == student.id,
                AssessmentAttempt.status.in_(("graded", "submitted")),
            )
        )
        if course_id:
            attempt_query = attempt_query.filter(Assessment.course_id == course_id)

        completed_attempts = attempt_query.order_by(AssessmentAttempt.created_at.asc()).all()

        attempt_trends: List[StudentAttemptTrendItem] = []
        for att in completed_attempts:
            if att.score_percent is not None:
                asmt = db.get(Assessment, att.assessment_id)
                asmt_title = asmt.title if asmt else "Assessment"
                sub_at = att.submitted_at or att.created_at
                attempt_trends.append(
                    StudentAttemptTrendItem(
                        attempt_id=att.id,
                        assessment_id=att.assessment_id,
                        assessment_title=asmt_title,
                        score_percent=att.score_percent,
                        submitted_at=sub_at,
                    )
                )

        # 3. Overall Activity Counts
        lessons_comp_query = db.query(func.count(LessonCompletion.id)).filter(
            LessonCompletion.student_id == student.id
        )
        resources_query = db.query(func.count(ResourceActivity.id)).filter(
            ResourceActivity.student_id == student.id
        )
        total_attempts_query = db.query(func.count(AssessmentAttempt.id)).filter(
            AssessmentAttempt.student_id == student.id
        )

        if course_id:
            lessons_comp_query = (
                lessons_comp_query.join(Lesson, LessonCompletion.lesson_id == Lesson.id)
                .join(Topic, Lesson.topic_id == Topic.id)
                .filter(Topic.course_id == course_id)
            )
            total_attempts_query = total_attempts_query.join(
                Assessment, AssessmentAttempt.assessment_id == Assessment.id
            ).filter(Assessment.course_id == course_id)

        lessons_completed_count = lessons_comp_query.scalar() or 0
        resources_studied_count = resources_query.scalar() or 0
        total_attempts_count = total_attempts_query.scalar() or 0

        return StudentAnalyticsResponse(
            student_id=student.id,
            course_id=course_id,
            topic_masteries=topic_mastery_items,
            weak_topics=weak_topic_items,
            attempt_trends=attempt_trends,
            lessons_completed_count=lessons_completed_count,
            resources_studied_count=resources_studied_count,
            total_attempts_count=total_attempts_count,
        )

    @staticmethod
    def get_student_attempts(
        db: Session,
        student: User,
        course_id: Optional[uuid.UUID] = None,
        assessment_id: Optional[uuid.UUID] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> StudentAttemptsListResponse:
        """Paginated list of assessment attempts for authenticated student."""
        query = (
            db.query(AssessmentAttempt)
            .join(Assessment, AssessmentAttempt.assessment_id == Assessment.id)
            .filter(AssessmentAttempt.student_id == student.id)
        )

        if course_id:
            query = query.filter(Assessment.course_id == course_id)
        if assessment_id:
            query = query.filter(AssessmentAttempt.assessment_id == assessment_id)

        total = query.count()

        safe_limit = max(1, min(limit, 100))
        safe_offset = max(0, offset)

        attempts = (
            query.order_by(AssessmentAttempt.created_at.desc())
            .offset(safe_offset)
            .limit(safe_limit)
            .all()
        )

        items: List[StudentAttemptListItem] = []
        for att in attempts:
            assessment = db.get(Assessment, att.assessment_id)
            if not assessment:
                continue
            course = db.get(Course, assessment.course_id)
            course_title = course.title if course else "Course"

            is_passing: Optional[bool] = None
            if att.score_percent is not None and assessment.passing_score_percent is not None:
                is_passing = att.score_percent >= assessment.passing_score_percent

            items.append(
                StudentAttemptListItem(
                    attempt_id=att.id,
                    assessment_id=assessment.id,
                    assessment_title=assessment.title,
                    course_id=assessment.course_id,
                    course_title=course_title,
                    score_percent=att.score_percent,
                    status=att.status,
                    is_passing=is_passing,
                    attempt_number=att.attempt_number,
                    started_at=att.created_at,
                    submitted_at=att.submitted_at,
                )
            )

        return StudentAttemptsListResponse(
            items=items,
            total=total,
            limit=safe_limit,
            offset=safe_offset,
        )

    # =========================================================================
    # Teacher Analytics Methods
    # =========================================================================

    @staticmethod
    def get_teacher_dashboard(db: Session, teacher: User) -> TeacherDashboardResponse:
        """Overview metrics across all courses assigned to authenticated teacher."""
        teacher_role = teacher.role.name if teacher.role else "teacher"

        # Resolve assigned courses
        if teacher_role == "administrator":
            courses = db.query(Course).all()
        else:
            assignments = db.query(CourseTeacher).filter(CourseTeacher.teacher_id == teacher.id).all()
            assigned_ids = [a.course_id for a in assignments]
            courses = db.query(Course).filter(Course.id.in_(assigned_ids)).all() if assigned_ids else []

        assigned_summaries: List[TeacherAssignedCourseSummary] = []
        total_unique_students: Set[uuid.UUID] = set()
        total_active_assessments = 0

        for crs in courses:
            # Enrolled students count
            enrolled_ids = [
                e.student_id
                for e in db.query(Enrollment.student_id)
                .filter(Enrollment.course_id == crs.id, Enrollment.status == "active")
                .all()
            ]
            total_unique_students.update(enrolled_ids)

            # Topics and assessments count
            topics = db.query(Topic).filter(Topic.course_id == crs.id).all()
            topic_ids = [t.id for t in topics]
            assessments = db.query(Assessment).filter(Assessment.course_id == crs.id).all()

            published_assessments_count = sum(1 for a in assessments if a.status == "published")
            total_active_assessments += published_assessments_count

            # Average mastery across enrolled students in this course
            avg_mastery: Optional[int] = None
            if topic_ids and enrolled_ids:
                scores = (
                    db.query(StudentTopicMastery.mastery_score)
                    .filter(
                        StudentTopicMastery.topic_id.in_(topic_ids),
                        StudentTopicMastery.student_id.in_(enrolled_ids),
                        StudentTopicMastery.status != "not_assessed",
                    )
                    .all()
                )
                valid_scores = [float(s[0]) for s in scores if s[0] is not None]
                if valid_scores:
                    avg_mastery = int(round((sum(valid_scores) / len(valid_scores)) * 100))

            assigned_summaries.append(
                TeacherAssignedCourseSummary(
                    course_id=crs.id,
                    title=crs.title,
                    status=crs.status,
                    enrolled_students_count=len(enrolled_ids),
                    total_topics=len(topics),
                    total_assessments=len(assessments),
                    average_mastery_percent=avg_mastery,
                )
            )

        return TeacherDashboardResponse(
            teacher_id=teacher.id,
            assigned_courses=assigned_summaries,
            total_students_reach=len(total_unique_students),
            total_active_assessments=total_active_assessments,
        )

    @staticmethod
    def get_course_analytics(
        db: Session,
        course_id: uuid.UUID,
        teacher: User,
        timeframe: Optional[str] = "all",
    ) -> TeacherCourseAnalyticsResponse:
        """Comprehensive course-level class performance, topic heatmap, and weak concepts."""
        # 1. Authorize teacher course access
        QuestionService.verify_course_teacher_access(db, course_id, teacher)

        course = db.get(Course, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found.",
            )

        # 2. Enrolled students
        enrollments = (
            db.query(Enrollment)
            .filter(Enrollment.course_id == course_id, Enrollment.status == "active")
            .all()
        )
        enrolled_student_ids = [e.student_id for e in enrollments]
        enrolled_students_count = len(enrolled_student_ids)

        # 3. Topic mastery distribution (Heatmap)
        topics = db.query(Topic).filter(Topic.course_id == course_id).order_by(Topic.order).all()
        topic_distributions: List[TopicMasteryDistributionItem] = []
        weak_concepts: List[TopicMasteryDistributionItem] = []
        class_mastery_percents: List[int] = []

        # Student-level weak topic tracker for at-risk calculations
        student_weak_counts: Dict[uuid.UUID, int] = {sid: 0 for sid in enrolled_student_ids}
        student_mastery_accum: Dict[uuid.UUID, List[float]] = {sid: [] for sid in enrolled_student_ids}

        for top in topics:
            threshold = int(round(float(top.mastery_threshold) * 100)) if top.mastery_threshold is not None else 75
            mastered_cnt = 0
            competent_cnt = 0
            developing_cnt = 0
            assessed_cnt = 0
            topic_scores: List[float] = []

            if enrolled_student_ids:
                records = (
                    db.query(StudentTopicMastery)
                    .filter(
                        StudentTopicMastery.topic_id == top.id,
                        StudentTopicMastery.student_id.in_(enrolled_student_ids),
                    )
                    .all()
                )
                rec_by_student = {r.student_id: r for r in records}

                for sid in enrolled_student_ids:
                    rec = rec_by_student.get(sid)
                    if rec and rec.status != "not_assessed" and rec.mastery_score is not None:
                        score_val = float(rec.mastery_score)
                        score_pct = int(round(score_val * 100))
                        topic_scores.append(score_val)
                        assessed_cnt += 1
                        student_mastery_accum[sid].append(score_val)

                        if rec.status == "mastered":
                            mastered_cnt += 1
                        elif rec.status == "competent":
                            competent_cnt += 1
                        elif rec.status == "developing":
                            developing_cnt += 1

                        if score_pct < threshold:
                            student_weak_counts[sid] += 1

            not_assessed_cnt = max(0, enrolled_students_count - assessed_cnt)
            avg_topic_mastery: Optional[int] = None
            if topic_scores:
                avg_topic_mastery = int(round((sum(topic_scores) / len(topic_scores)) * 100))
                class_mastery_percents.append(avg_topic_mastery)

            # Invariant: Never classify not_assessed as weak
            is_class_weak = (
                avg_topic_mastery is not None
                and assessed_cnt > 0
                and avg_topic_mastery < threshold
            )

            dist_item = TopicMasteryDistributionItem(
                topic_id=top.id,
                topic_title=top.title,
                threshold=threshold,
                average_mastery_percent=avg_topic_mastery,
                assessed_students_count=assessed_cnt,
                mastered_count=mastered_cnt,
                competent_count=competent_cnt,
                developing_count=developing_cnt,
                not_assessed_count=not_assessed_cnt,
                is_class_weak=is_class_weak,
            )
            topic_distributions.append(dist_item)
            if is_class_weak:
                weak_concepts.append(dist_item)

        overall_avg_mastery: Optional[int] = None
        if class_mastery_percents:
            overall_avg_mastery = int(round(sum(class_mastery_percents) / len(class_mastery_percents)))

        # 4. Assessment score distribution bands across completed attempts
        attempt_query = (
            db.query(AssessmentAttempt)
            .join(Assessment, AssessmentAttempt.assessment_id == Assessment.id)
            .filter(
                Assessment.course_id == course_id,
                AssessmentAttempt.status.in_(("graded", "submitted")),
            )
        )
        now = datetime.now(timezone.utc)
        if timeframe == "30d":
            attempt_query = attempt_query.filter(AssessmentAttempt.created_at >= now - timedelta(days=30))
        elif timeframe == "7d":
            attempt_query = attempt_query.filter(AssessmentAttempt.created_at >= now - timedelta(days=7))

        course_completed_attempts = attempt_query.all()

        bands = {"0-49%": 0, "50-69%": 0, "70-84%": 0, "85-100%": 0}
        for att in course_completed_attempts:
            if att.score_percent is not None:
                pct = att.score_percent
                if pct < 50:
                    bands["0-49%"] += 1
                elif pct < 70:
                    bands["50-69%"] += 1
                elif pct < 85:
                    bands["70-84%"] += 1
                else:
                    bands["85-100%"] += 1

        score_distribution = ScoreDistributionBands(**bands)

        # 5. Assessment summaries
        assessments = db.query(Assessment).filter(Assessment.course_id == course_id).all()
        assessment_summaries: List[AssessmentSummaryItem] = []
        for asmt in assessments:
            asmt_attempts = (
                db.query(AssessmentAttempt)
                .filter(AssessmentAttempt.assessment_id == asmt.id)
                .all()
            )
            completed_asmt_attempts = [
                a for a in asmt_attempts if a.status in ("graded", "submitted") and a.score_percent is not None
            ]
            scores = [a.score_percent for a in completed_asmt_attempts if a.score_percent is not None]

            avg_score = int(round(sum(scores) / len(scores))) if scores else None
            high_score = max(scores) if scores else None
            low_score = min(scores) if scores else None

            assessment_summaries.append(
                AssessmentSummaryItem(
                    assessment_id=asmt.id,
                    title=asmt.title,
                    type=asmt.type,
                    total_attempts=len(asmt_attempts),
                    completed_attempts=len(completed_asmt_attempts),
                    average_score_percent=avg_score,
                    highest_score_percent=high_score,
                    lowest_score_percent=low_score,
                )
            )

        # 6. At-risk students identification
        at_risk_students: List[AtRiskStudentItem] = []
        for sid, weak_cnt in student_weak_counts.items():
            if weak_cnt > 0:
                stu_user = db.get(User, sid)
                if not stu_user:
                    continue
                stu_scores = student_mastery_accum.get(sid, [])
                stu_avg = int(round((sum(stu_scores) / len(stu_scores)) * 100)) if stu_scores else None
                at_risk_students.append(
                    AtRiskStudentItem(
                        student_id=stu_user.id,
                        student_name=stu_user.full_name,
                        student_email=stu_user.email,
                        weak_topics_count=weak_cnt,
                        average_mastery_percent=stu_avg,
                    )
                )

        # Sort at-risk students by weak topics count DESC
        at_risk_students.sort(key=lambda s: s.weak_topics_count, reverse=True)

        return TeacherCourseAnalyticsResponse(
            course_id=course.id,
            course_title=course.title,
            enrolled_students_count=enrolled_students_count,
            overall_average_mastery=overall_avg_mastery,
            topic_mastery_distribution=topic_distributions,
            weak_concepts=weak_concepts,
            score_distribution=score_distribution,
            assessment_summaries=assessment_summaries,
            at_risk_students=at_risk_students,
        )

    @staticmethod
    def get_teacher_student_analytics(
        db: Session,
        course_id: uuid.UUID,
        student_id: uuid.UUID,
        teacher: User,
    ) -> TeacherStudentCourseAnalyticsResponse:
        """Teacher drilldown into a specific enrolled student's performance within assigned course."""
        # 1. Authorize teacher course access
        QuestionService.verify_course_teacher_access(db, course_id, teacher)

        # 2. Verify student exists and enrollment in this course
        student_user = db.get(User, student_id)
        if not student_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with ID {student_id} not found.",
            )

        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.course_id == course_id,
                Enrollment.student_id == student_id,
                Enrollment.status.in_(("active", "completed")),
            )
            .first()
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student is not actively enrolled in this course.",
            )

        course = db.get(Course, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found.",
            )

        # 3. Topic masteries and weak topics
        topics = db.query(Topic).filter(Topic.course_id == course_id).order_by(Topic.order).all()
        topic_ids = [t.id for t in topics]

        # Lesson completion progress
        total_lessons = 0
        completed_lessons = 0
        if topic_ids:
            total_lessons = (
                db.query(func.count(Lesson.id))
                .filter(Lesson.topic_id.in_(topic_ids))
                .scalar()
                or 0
            )
            if total_lessons > 0:
                completed_lessons = (
                    db.query(func.count(LessonCompletion.id))
                    .join(Lesson, LessonCompletion.lesson_id == Lesson.id)
                    .filter(
                        LessonCompletion.student_id == student_id,
                        Lesson.topic_id.in_(topic_ids),
                    )
                    .scalar()
                    or 0
                )

        progress_percent = min(100, int((completed_lessons / total_lessons) * 100)) if total_lessons > 0 else 0

        topic_masteries: List[StudentTopicMasteryItem] = []
        weak_topics: List[StudentTopicMasteryItem] = []
        assessed_scores: List[float] = []

        for top in topics:
            threshold = int(round(float(top.mastery_threshold) * 100)) if top.mastery_threshold is not None else 75
            stm = (
                db.query(StudentTopicMastery)
                .filter(
                    StudentTopicMastery.student_id == student_id,
                    StudentTopicMastery.topic_id == top.id,
                )
                .first()
            )

            mastery_score: Optional[float] = None
            mastery_percent: Optional[int] = None
            status_label = "not_assessed"
            last_assessed: Optional[datetime] = None

            if stm and stm.status != "not_assessed" and stm.mastery_score is not None:
                mastery_score = float(stm.mastery_score)
                mastery_percent = int(round(mastery_score * 100))
                status_label = stm.status
                last_assessed = stm.last_assessed_at
                assessed_scores.append(mastery_score)

            is_weak = (
                status_label != "not_assessed"
                and mastery_percent is not None
                and mastery_percent < threshold
            )

            item = StudentTopicMasteryItem(
                topic_id=top.id,
                topic_title=top.title,
                course_id=course_id,
                course_title=course.title,
                mastery_score=mastery_score,
                mastery_percent=mastery_percent,
                status=status_label,
                threshold=threshold,
                is_weak=is_weak,
                last_assessed_at=last_assessed,
            )
            topic_masteries.append(item)
            if is_weak:
                weak_topics.append(item)

        avg_mastery: Optional[int] = None
        if assessed_scores:
            avg_mastery = int(round((sum(assessed_scores) / len(assessed_scores)) * 100))

        return TeacherStudentCourseAnalyticsResponse(
            course_id=course.id,
            course_title=course.title,
            student_id=student_user.id,
            student_name=student_user.full_name,
            student_email=student_user.email,
            enrolled_at=enrollment.enrolled_at,
            progress_percent=progress_percent,
            completed_lessons=completed_lessons,
            total_lessons=total_lessons,
            average_mastery_percent=avg_mastery,
            topic_masteries=topic_masteries,
            weak_topics=weak_topics,
        )

    @staticmethod
    def get_teacher_student_attempts(
        db: Session,
        course_id: uuid.UUID,
        student_id: uuid.UUID,
        teacher: User,
        limit: int = 20,
        offset: int = 0,
    ) -> StudentAttemptsListResponse:
        """Teacher inspection of a specific enrolled student's assessment attempts in assigned course."""
        # 1. Authorize teacher course access
        QuestionService.verify_course_teacher_access(db, course_id, teacher)

        # 2. Verify student exists and enrollment in course
        student_user = db.get(User, student_id)
        if not student_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with ID {student_id} not found.",
            )

        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.course_id == course_id,
                Enrollment.student_id == student_id,
                Enrollment.status.in_(("active", "completed")),
            )
            .first()
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student is not actively enrolled in this course.",
            )

        # Delegate to query attempts scoped to this student and course
        return AnalyticsService.get_student_attempts(
            db=db,
            student=student_user,
            course_id=course_id,
            limit=limit,
            offset=offset,
        )
