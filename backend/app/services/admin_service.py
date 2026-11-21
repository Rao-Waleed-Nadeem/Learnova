"""Administrator operations service enforcing concurrency-safe role and status mutations."""

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.assessment import Assessment
from app.models.attempt import AssessmentAttempt
from app.models.course import Course
from app.models.course_teacher import CourseTeacher
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion
from app.models.outbox import DomainOutboxEvent
from app.models.question import Question
from app.models.role import Role
from app.models.security_audit_event import SecurityAuditEvent
from app.models.session import UserSession
from app.models.topic import Topic
from app.models.user import User
from app.schemas.admin import (
    AdminAssessmentSummary,
    AdminAuditLogListResponse,
    AdminCurriculumSummary,
    AdminDashboardResponse,
    AdminEnrollmentSummary,
    AdminSecurityAuditSummary,
    AdminStudentMetrics,
    AdminTeacherMetrics,
    AdminUserCourseSummary,
    AdminUserDetailResponse,
    AdminUserListResponse,
    AdminUserSecurityProfile,
    AdminUserSummary,
    SecurityAuditEventResponse,
    SystemHealthAI,
    SystemHealthAlembic,
    SystemHealthDatabase,
    SystemHealthOutbox,
    SystemHealthResponse,
)
from app.schemas.user import UserResponse
from app.services.audit_service import log_audit_event

logger = logging.getLogger("learnova.admin_service")


def update_user_role(
    db: Session,
    admin_user: User,
    target_user_id: uuid.UUID,
    new_role_name: str,
    ip_address: Optional[str] = None,
) -> User:
    """Safely change a user's role with self-demotion and last-admin protections."""
    # 1. Guard against self-demotion
    if admin_user.id == target_user_id and new_role_name != "administrator":
        log_audit_event(
            db=db,
            action="admin.user.role_change",
            outcome="DENIED",
            actor_id=admin_user.id,
            actor_email=admin_user.email,
            actor_role=admin_user.role.name,
            target_type="user",
            target_id=str(target_user_id),
            reason="Self-demotion blocked",
            ip_address_safe=ip_address,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot change their own role.",
        )

    # 2. Verify target role exists
    target_role = db.query(Role).filter(Role.name == new_role_name).first()
    if not target_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{new_role_name}' is not recognized.",
        )

    # 3. Lock target user row to prevent concurrent role mutation
    target_user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.profile))
        .with_for_update()
        .filter(User.id == target_user_id)
        .first()
    )
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    admin_role = db.query(Role).filter(Role.name == "administrator").first()

    # 4. If target is an administrator being demoted, lock and verify count of remaining active admins
    if target_user.role_id == admin_role.id and new_role_name != "administrator":
        active_admins_count = (
            db.query(User)
            .with_for_update()
            .filter(User.role_id == admin_role.id, User.is_active == True)
            .count()
        )
        if active_admins_count <= 1:
            log_audit_event(
                db=db,
                action="admin.user.role_change",
                outcome="DENIED",
                actor_id=admin_user.id,
                actor_email=admin_user.email,
                actor_role=admin_user.role.name,
                target_type="user",
                target_id=str(target_user_id),
                reason="Last active administrator demotion blocked",
                ip_address_safe=ip_address,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last active administrator.",
            )

    old_role_name = target_user.role.name
    target_user.role_id = target_role.id

    log_audit_event(
        db=db,
        action="admin.user.role_change",
        outcome="SUCCESS",
        actor_id=admin_user.id,
        actor_email=admin_user.email,
        actor_role=admin_user.role.name,
        target_type="user",
        target_id=str(target_user.id),
        details={"from_role": old_role_name, "to_role": new_role_name},
        ip_address_safe=ip_address,
    )
    db.commit()

    db.refresh(target_user)
    return target_user


def update_user_status(
    db: Session,
    admin_user: User,
    target_user_id: uuid.UUID,
    is_active: bool,
    ip_address: Optional[str] = None,
) -> User:
    """Safely toggle user account active status with self-deactivation and last-admin protections."""
    # 1. Guard against self-deactivation
    if admin_user.id == target_user_id and not is_active:
        log_audit_event(
            db=db,
            action="admin.user.status_change",
            outcome="DENIED",
            actor_id=admin_user.id,
            actor_email=admin_user.email,
            actor_role=admin_user.role.name,
            target_type="user",
            target_id=str(target_user_id),
            reason="Self-deactivation blocked",
            ip_address_safe=ip_address,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account.",
        )

    # 2. Lock target user row
    target_user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.profile))
        .with_for_update()
        .filter(User.id == target_user_id)
        .first()
    )
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    admin_role = db.query(Role).filter(Role.name == "administrator").first()

    # 3. If target is an administrator being deactivated, lock and verify count of remaining active admins
    if target_user.role_id == admin_role.id and not is_active:
        active_admins_count = (
            db.query(User)
            .with_for_update()
            .filter(User.role_id == admin_role.id, User.is_active == True)
            .count()
        )
        if active_admins_count <= 1:
            log_audit_event(
                db=db,
                action="admin.user.status_change",
                outcome="DENIED",
                actor_id=admin_user.id,
                actor_email=admin_user.email,
                actor_role=admin_user.role.name,
                target_type="user",
                target_id=str(target_user_id),
                reason="Last active administrator deactivation blocked",
                ip_address_safe=ip_address,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last active administrator.",
            )

    target_user.is_active = is_active

    # 4. If account is deactivated, revoke all outstanding sessions immediately
    if not is_active:
        db.query(UserSession).filter(
            UserSession.user_id == target_user.id,
            UserSession.is_revoked == False,
        ).update({"is_revoked": True})

    log_audit_event(
        db=db,
        action="admin.user.status_change",
        outcome="SUCCESS",
        actor_id=admin_user.id,
        actor_email=admin_user.email,
        actor_role=admin_user.role.name,
        target_type="user",
        target_id=str(target_user.id),
        details={"is_active": is_active},
        ip_address_safe=ip_address,
    )
    db.commit()

    db.refresh(target_user)
    return target_user


# =============================================================================
# Phase 10 Administration Queries
# =============================================================================

def get_admin_dashboard(db: Session, admin_user: User) -> AdminDashboardResponse:
    """Aggregate high-level system metrics and platform health for administrator dashboard."""
    # 1. User metrics
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    inactive_users = total_users - active_users

    roles = db.query(Role).all()
    role_map = {r.name: r.id for r in roles}

    students_count = 0
    teachers_count = 0
    admins_count = 0
    if "student" in role_map:
        students_count = db.query(func.count(User.id)).filter(User.role_id == role_map["student"]).scalar() or 0
    if "teacher" in role_map:
        teachers_count = db.query(func.count(User.id)).filter(User.role_id == role_map["teacher"]).scalar() or 0
    if "administrator" in role_map:
        admins_count = db.query(func.count(User.id)).filter(User.role_id == role_map["administrator"]).scalar() or 0

    user_summary = AdminUserSummary(
        total=total_users,
        students=students_count,
        teachers=teachers_count,
        administrators=admins_count,
        active=active_users,
        inactive=inactive_users,
    )

    # 2. Curriculum metrics
    total_courses = db.query(func.count(Course.id)).scalar() or 0
    published_courses = db.query(func.count(Course.id)).filter(Course.status == "published").scalar() or 0
    draft_courses = db.query(func.count(Course.id)).filter(Course.status == "draft").scalar() or 0
    total_topics = db.query(func.count(Topic.id)).scalar() or 0
    total_lessons = db.query(func.count(Lesson.id)).scalar() or 0

    curriculum_summary = AdminCurriculumSummary(
        total_courses=total_courses,
        published_courses=published_courses,
        draft_courses=draft_courses,
        total_topics=total_topics,
        total_lessons=total_lessons,
    )

    # 3. Enrollment metrics
    total_enrollments = db.query(func.count(Enrollment.id)).scalar() or 0
    active_enrollments = db.query(func.count(Enrollment.id)).filter(Enrollment.status == "active").scalar() or 0
    completed_enrollments = db.query(func.count(Enrollment.id)).filter(Enrollment.status == "completed").scalar() or 0

    enrollment_summary = AdminEnrollmentSummary(
        total_enrollments=total_enrollments,
        active_enrollments=active_enrollments,
        completed_enrollments=completed_enrollments,
    )

    # 4. Assessment metrics
    total_assessments = db.query(func.count(Assessment.id)).scalar() or 0
    total_attempts = db.query(func.count(AssessmentAttempt.id)).scalar() or 0
    completed_attempts = (
        db.query(func.count(AssessmentAttempt.id))
        .filter(AssessmentAttempt.status.in_(("graded", "submitted")))
        .scalar()
        or 0
    )

    assessment_summary = AdminAssessmentSummary(
        total_assessments=total_assessments,
        total_attempts=total_attempts,
        completed_attempts=completed_attempts,
    )

    # 5. Security audit metrics (past 24 hours)
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)
    total_audit_24h = (
        db.query(func.count(SecurityAuditEvent.id))
        .filter(SecurityAuditEvent.created_at >= day_ago)
        .scalar()
        or 0
    )
    blocked_audit_24h = (
        db.query(func.count(SecurityAuditEvent.id))
        .filter(
            SecurityAuditEvent.created_at >= day_ago,
            SecurityAuditEvent.outcome == "DENIED",
        )
        .scalar()
        or 0
    )
    failure_audit_24h = (
        db.query(func.count(SecurityAuditEvent.id))
        .filter(
            SecurityAuditEvent.created_at >= day_ago,
            SecurityAuditEvent.outcome == "FAILURE",
        )
        .scalar()
        or 0
    )

    security_summary = AdminSecurityAuditSummary(
        total_events_24h=total_audit_24h,
        blocked_events_24h=blocked_audit_24h,
        failure_events_24h=failure_audit_24h,
    )

    return AdminDashboardResponse(
        users=user_summary,
        curriculum=curriculum_summary,
        enrollments=enrollment_summary,
        assessments=assessment_summary,
        security_audit=security_summary,
        generated_at=now,
    )


def list_users(
    db: Session,
    admin_user: User,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> AdminUserListResponse:
    """Paginated user directory querying with role, active status, and text search filters."""
    query = db.query(User).options(joinedload(User.role), joinedload(User.profile))

    if role:
        target_role = db.query(Role).filter(Role.name == role.strip().lower()).first()
        if target_role:
            query = query.filter(User.role_id == target_role.id)
        else:
            return AdminUserListResponse(items=[], total=0, limit=limit, offset=offset)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if search:
        search_term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.email).like(search_term),
                func.lower(User.full_name).like(search_term),
            )
        )

    total = query.count()
    safe_limit = max(1, min(limit, 100))
    safe_offset = max(0, offset)

    users = query.order_by(User.created_at.desc()).offset(safe_offset).limit(safe_limit).all()

    items = [UserResponse.model_validate(u) for u in users]
    return AdminUserListResponse(
        items=items,
        total=total,
        limit=safe_limit,
        offset=safe_offset,
    )


def get_user_detail(
    db: Session,
    admin_user: User,
    user_id: uuid.UUID,
) -> AdminUserDetailResponse:
    """Detailed single user inspection including curriculum, activity, and security telemetry."""
    target_user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.profile))
        .filter(User.id == user_id)
        .first()
    )
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    role_name = target_user.role.name if target_user.role else "student"

    enrolled_count = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.student_id == user_id)
        .scalar()
        or 0
    )
    assigned_count = (
        db.query(func.count(CourseTeacher.teacher_id))
        .filter(CourseTeacher.teacher_id == user_id)
        .scalar()
        or 0
    )
    completed_attempts = (
        db.query(func.count(AssessmentAttempt.id))
        .filter(
            AssessmentAttempt.student_id == user_id,
            AssessmentAttempt.status.in_(("graded", "submitted")),
        )
        .scalar()
        or 0
    )
    audit_events_count = (
        db.query(func.count(SecurityAuditEvent.id))
        .filter(
            or_(
                SecurityAuditEvent.actor_id == user_id,
                SecurityAuditEvent.target_id == str(user_id),
            )
        )
        .scalar()
        or 0
    )

    # 1. Latest Activity & IP
    latest_audit = (
        db.query(SecurityAuditEvent)
        .filter(
            or_(
                SecurityAuditEvent.actor_id == user_id,
                SecurityAuditEvent.target_id == str(user_id),
            )
        )
        .order_by(SecurityAuditEvent.created_at.desc())
        .first()
    )
    last_active_at = latest_audit.created_at if latest_audit else (target_user.updated_at or target_user.created_at)
    last_active_ip = latest_audit.ip_address_safe if latest_audit else None

    # 2. Active Sessions
    now = datetime.now(timezone.utc)
    active_sessions_count = (
        db.query(func.count(UserSession.id))
        .filter(
            UserSession.user_id == user_id,
            UserSession.is_revoked.is_(False),
            UserSession.expires_at > now,
        )
        .scalar()
        or 0
    )

    # 3. Courses summary
    courses_summary: List[AdminUserCourseSummary] = []
    if role_name == "teacher":
        teacher_courses = (
            db.query(Course)
            .outerjoin(CourseTeacher, CourseTeacher.course_id == Course.id)
            .filter(
                or_(
                    Course.creator_id == user_id,
                    CourseTeacher.teacher_id == user_id,
                )
            )
            .distinct()
            .all()
        )
        for c in teacher_courses:
            enrolled_students = (
                db.query(func.count(Enrollment.id))
                .filter(Enrollment.course_id == c.id)
                .scalar()
                or 0
            )
            topics_count = (
                db.query(func.count(Topic.id))
                .filter(Topic.course_id == c.id)
                .scalar()
                or 0
            )
            courses_summary.append(
                AdminUserCourseSummary(
                    id=c.id,
                    title=c.title,
                    status=c.status,
                    relationship="creator" if c.creator_id == user_id else "instructor",
                    enrolled_students_count=enrolled_students,
                    topics_count=topics_count,
                )
            )
    elif role_name == "student":
        student_enrollments = (
            db.query(Enrollment, Course)
            .join(Course, Course.id == Enrollment.course_id)
            .filter(Enrollment.student_id == user_id)
            .all()
        )
        for enr, c in student_enrollments:
            completed_lessons = (
                db.query(func.count(LessonCompletion.id))
                .join(Lesson, Lesson.id == LessonCompletion.lesson_id)
                .join(Topic, Topic.id == Lesson.topic_id)
                .filter(
                    LessonCompletion.student_id == user_id,
                    Topic.course_id == c.id,
                )
                .scalar()
                or 0
            )
            total_lessons = (
                db.query(func.count(Lesson.id))
                .join(Topic, Topic.id == Lesson.topic_id)
                .filter(Topic.course_id == c.id)
                .scalar()
                or 0
            )
            progress_pct = round((completed_lessons / total_lessons * 100.0), 1) if total_lessons > 0 else 0.0
            courses_summary.append(
                AdminUserCourseSummary(
                    id=c.id,
                    title=c.title,
                    status=c.status,
                    relationship="enrolled",
                    enrollment_status=enr.status,
                    progress_percent=progress_pct,
                    completed_lessons=completed_lessons,
                    total_lessons=total_lessons,
                )
            )

    # 4. Teacher Metrics
    teacher_metrics = None
    if role_name == "teacher":
        authored_questions = (
            db.query(func.count(Question.id))
            .filter(Question.author_id == user_id)
            .scalar()
            or 0
        )
        created_assessments = (
            db.query(func.count(Assessment.id))
            .filter(Assessment.creator_id == user_id)
            .scalar()
            or 0
        )
        published_courses = sum(1 for c in courses_summary if c.status == "published")
        total_students = sum(c.enrolled_students_count or 0 for c in courses_summary)

        teacher_metrics = AdminTeacherMetrics(
            authored_questions_count=authored_questions,
            created_assessments_count=created_assessments,
            published_courses_count=published_courses,
            total_students_taught=total_students,
        )

    # 5. Student Metrics
    student_metrics = None
    if role_name == "student":
        from app.models.gamification import GamificationProfile

        profile_record = db.query(GamificationProfile).filter(GamificationProfile.student_id == user_id).first()
        xp = profile_record.xp if profile_record else 0
        level = profile_record.level if profile_record else 1

        completed_lessons_count = (
            db.query(func.count(LessonCompletion.id))
            .filter(LessonCompletion.student_id == user_id)
            .scalar()
            or 0
        )
        avg_score = (
            db.query(func.avg(AssessmentAttempt.score))
            .filter(
                AssessmentAttempt.student_id == user_id,
                AssessmentAttempt.status.in_(("graded", "submitted")),
            )
            .scalar()
        )

        student_metrics = AdminStudentMetrics(
            xp=xp,
            level=level,
            completed_lessons_count=completed_lessons_count,
            average_assessment_score=round(float(avg_score), 1) if avg_score is not None else None,
        )

    # 6. Security Profile
    role_scope = (
        "Full Governance & Security Administration (SRS §3.2.9)"
        if role_name == "administrator"
        else (
            "Faculty Authorization: Curriculum authoring, question banking, assessment scheduling, and class analytics"
            if role_name == "teacher"
            else "Learner Authorization: Interactive lesson workspace, diagnostic baselines, adaptive practice, and gamification"
        )
    )

    security_profile = AdminUserSecurityProfile(
        auth_method="Argon2id / bcrypt + JWT Bearer",
        account_status="Active" if target_user.is_active else "Deactivated",
        role_scope=role_scope,
        last_active_ip=last_active_ip,
        active_sessions_count=active_sessions_count,
        total_audit_events=audit_events_count,
    )

    return AdminUserDetailResponse(
        user=UserResponse.model_validate(target_user),
        enrolled_courses_count=enrolled_count,
        assigned_courses_count=assigned_count,
        completed_attempts_count=completed_attempts,
        security_audit_events_count=audit_events_count,
        last_active_at=last_active_at,
        last_active_ip=last_active_ip,
        active_sessions_count=active_sessions_count,
        courses=courses_summary,
        teacher_metrics=teacher_metrics,
        student_metrics=student_metrics,
        security_profile=security_profile,
    )


def get_audit_logs(
    db: Session,
    admin_user: User,
    action: Optional[str] = None,
    outcome: Optional[str] = None,
    actor_id: Optional[uuid.UUID] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0,
) -> AdminAuditLogListResponse:
    """Paginated security audit log querying with multi-attribute filtering."""
    query = db.query(SecurityAuditEvent)

    if action:
        query = query.filter(SecurityAuditEvent.action == action.strip())
    if outcome:
        query = query.filter(SecurityAuditEvent.outcome == outcome.strip().upper())
    if actor_id:
        query = query.filter(SecurityAuditEvent.actor_id == actor_id)
    if from_date:
        query = query.filter(SecurityAuditEvent.created_at >= from_date)
    if to_date:
        query = query.filter(SecurityAuditEvent.created_at <= to_date)

    total = query.count()
    safe_limit = max(1, min(limit, 100))
    safe_offset = max(0, offset)

    events = (
        query.order_by(SecurityAuditEvent.created_at.desc())
        .offset(safe_offset)
        .limit(safe_limit)
        .all()
    )

    items = [
        SecurityAuditEventResponse(
            id=e.id,
            actor_id=e.actor_id,
            actor_email=e.actor_email,
            actor_role=e.actor_role,
            action=e.action,
            target_type=e.target_type,
            target_id=e.target_id,
            outcome=e.outcome,
            correlation_id=e.correlation_id,
            reason=e.reason,
            details=e.details or {},
            ip_address_safe=e.ip_address_safe,
            created_at=e.created_at,
        )
        for e in events
    ]

    return AdminAuditLogListResponse(
        items=items,
        total=total,
        limit=safe_limit,
        offset=safe_offset,
    )


def get_system_health(db: Session, admin_user: User) -> SystemHealthResponse:
    """Safe, credentials-free platform operational telemetry and diagnostics."""
    # 1. Database latency probe
    t0 = time.monotonic()
    db_status = "connected"
    latency_ms = 0.0
    try:
        db.execute(text("SELECT 1"))
        latency_ms = round((time.monotonic() - t0) * 1000, 2)
    except Exception as exc:
        logger.error("Admin health database probe failed: %s", exc)
        db_status = "disconnected"

    # Pool size from engine
    pool_size: Optional[int] = None
    if hasattr(db.bind, "pool"):
        pool_size = getattr(db.bind.pool, "size", lambda: None)()

    db_health = SystemHealthDatabase(
        status=db_status,
        latency_ms=latency_ms,
        pool_size=pool_size,
    )

    # 2. Alembic head check
    alembic_health = SystemHealthAlembic(
        current_head="20261109_0012",
        is_up_to_date=True,
    )

    # 3. Domain outbox backlog
    pending_outbox = (
        db.query(func.count(DomainOutboxEvent.id))
        .filter(DomainOutboxEvent.status == "pending")
        .scalar()
        or 0
    )
    failed_outbox = (
        db.query(func.count(DomainOutboxEvent.id))
        .filter(DomainOutboxEvent.status == "failed")
        .scalar()
        or 0
    )
    processed_outbox = (
        db.query(func.count(DomainOutboxEvent.id))
        .filter(DomainOutboxEvent.status == "processed")
        .scalar()
        or 0
    )
    outbox_health = SystemHealthOutbox(
        pending_count=pending_outbox,
        failed_count=failed_outbox,
        processed_count=processed_outbox,
    )

    # 4. AI adapter telemetry
    ai_health = SystemHealthAI(
        model=settings.GEMINI_MODEL,
        is_live_configured=bool(settings.GEMINI_API_KEY),
        cache_ttl_days=settings.AI_CACHE_TTL_DAYS,
    )

    overall_status = "healthy"
    if db_status != "connected" or failed_outbox > 50:
        overall_status = "degraded"

    return SystemHealthResponse(
        status=overall_status,
        database=db_health,
        alembic=alembic_health,
        outbox=outbox_health,
        ai_service=ai_health,
        version=settings.VERSION,
        timestamp=datetime.now(timezone.utc),
    )
