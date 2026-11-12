"""Gamification service implementing SRS UC-16, HL-08, level calculations, streaks,
badges, challenges, privacy-aware leaderboards, and asynchronous outbox event processing.
"""

import random
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.attempt import AssessmentAttempt
from app.models.enrollment import Enrollment
from app.models.gamification import (
    Badge,
    Challenge,
    GamificationProfile,
    UserBadge,
    UserChallenge,
    XPLedger,
)
from app.models.lesson import Lesson
from app.models.lesson_completion import LessonCompletion
from app.models.mastery import StudentTopicMastery
from app.models.outbox import DomainOutboxEvent
from app.models.topic import Topic
from app.models.user import User


class GamificationService:
    """Authoritative gamification engine for XP, levels, streaks, badges, and events."""

    @staticmethod
    def calculate_level(xp: int) -> Dict[str, int]:
        """Calculates student level and progression using arithmetic formula:

        Level 1: 0 - 250 XP
        Level 2: 251 - 600 XP (span 350)
        Level 3: 601 - 1050 XP (span 450)
        Level N: span = 150 + N * 100
        """
        safe_xp = max(0, int(xp or 0))
        level = 1
        floor_xp = 0
        span = 250

        while safe_xp >= floor_xp + span:
            floor_xp += span
            level += 1
            span = 150 + level * 100

        next_level_xp = floor_xp + span
        progress_percent = min(
            100, max(0, round(((safe_xp - floor_xp) / span) * 100))
        )

        return {
            "level": level,
            "current_level_floor_xp": floor_xp,
            "next_level_xp": next_level_xp,
            "progress_percent": progress_percent,
        }

    @staticmethod
    def get_or_create_profile(
        db: Session, student_id: uuid.UUID
    ) -> GamificationProfile:
        """Retrieves or creates the student's aggregate gamification profile."""
        profile = (
            db.query(GamificationProfile)
            .filter(GamificationProfile.student_id == student_id)
            .first()
        )
        if not profile:
            profile = GamificationProfile(
                student_id=student_id,
                xp=0,
                level=1,
                streak_days=0,
                last_active_date=None,
                is_opted_in_leaderboard=False,
            )
            db.add(profile)
            db.flush()
        return profile

    @staticmethod
    def update_streak(
        db: Session,
        profile: GamificationProfile,
        activity_date: Optional[date] = None,
    ) -> bool:
        """Evaluates consecutive calendar days for learning streaks.

        Consecutive day -> streak_days += 1, awards daily_streak XP (+30 XP).
        Same day -> streak unchanged.
        Inactivity gap >= 2 days -> streak reset to 1.
        """
        act_date = activity_date or datetime.now(timezone.utc).date()
        last_date = profile.last_active_date

        if last_date == act_date:
            return False

        if last_date == act_date - timedelta(days=1):
            profile.streak_days += 1
            profile.last_active_date = act_date
            db.flush()

            # Award streak bonus XP if consecutive
            idempotency_key = f"xp:{profile.student_id}:daily_streak:{act_date.isoformat()}"
            GamificationService.award_xp_idempotent(
                db,
                student_id=profile.student_id,
                event_type="daily_streak",
                xp_amount=30,
                description=f"Active daily learning streak: {profile.streak_days} days",
                idempotency_key=idempotency_key,
                related_id=f"streak-{profile.streak_days}",
            )
            return True

        # Inactivity gap >= 2 days or first activity
        profile.streak_days = 1
        profile.last_active_date = act_date
        db.flush()
        return True

    @staticmethod
    def award_xp_idempotent(
        db: Session,
        student_id: uuid.UUID,
        event_type: str,
        xp_amount: int,
        description: str,
        idempotency_key: str,
        related_id: Optional[str] = None,
    ) -> Tuple[Optional[XPLedger], bool]:
        """Awards XP atomically and idempotently.

        Guarantees zero double-dipping via unique idempotency_key constraint.
        Returns (ledger_entry, is_newly_awarded).
        """
        existing = (
            db.query(XPLedger)
            .filter(XPLedger.idempotency_key == idempotency_key)
            .first()
        )
        if existing:
            return existing, False

        profile = GamificationService.get_or_create_profile(db, student_id)
        profile.xp += xp_amount

        lvl_info = GamificationService.calculate_level(profile.xp)
        profile.level = lvl_info["level"]

        ledger_entry = XPLedger(
            student_id=student_id,
            event_type=event_type,
            xp_earned=xp_amount,
            description=description,
            related_id=related_id,
            idempotency_key=idempotency_key,
        )
        try:
            with db.begin_nested():
                db.add(ledger_entry)
                db.flush()
        except IntegrityError:
            # Concurrently inserted by another worker transaction: rollback savepoint and return existing
            existing = (
                db.query(XPLedger)
                .filter(XPLedger.idempotency_key == idempotency_key)
                .first()
            )
            if existing:
                return existing, False
            raise

        return ledger_entry, True

    @staticmethod
    def evaluate_badges(
        db: Session, student_id: uuid.UUID
    ) -> List[Badge]:
        """Inspects student academic and engagement records against badge catalog rules.

        Unlocks earned badges and awards +200 bonus XP per newly unlocked badge.
        """
        unlocked_badge_ids = set(
            row[0]
            for row in db.query(UserBadge.badge_id)
            .filter(UserBadge.student_id == student_id)
            .all()
        )

        catalog_badges = db.query(Badge).all()
        newly_unlocked: List[Badge] = []
        profile = GamificationService.get_or_create_profile(db, student_id)

        for badge in catalog_badges:
            if badge.id in unlocked_badge_ids:
                continue

            should_unlock = False

            if badge.id == "badge-first-step":
                # >= 1 lesson completions
                completion_count = (
                    db.query(func.count(LessonCompletion.id))
                    .filter(LessonCompletion.student_id == student_id)
                    .scalar()
                    or 0
                )
                should_unlock = completion_count >= 1

            elif badge.id == "badge-diagnostic":
                # >= 1 completed diagnostic assessments
                diag_count = (
                    db.query(func.count(AssessmentAttempt.id))
                    .join(Assessment, AssessmentAttempt.assessment_id == Assessment.id)
                    .filter(
                        AssessmentAttempt.student_id == student_id,
                        Assessment.type == "diagnostic",
                        AssessmentAttempt.status.in_(["graded", "completed"]),
                    )
                    .scalar()
                    or 0
                )
                should_unlock = diag_count >= 1

            elif badge.id == "badge-syntax-master":
                # Achieved 85%+ mastery in any topic
                mastery_count = (
                    db.query(func.count(StudentTopicMastery.id))
                    .filter(
                        StudentTopicMastery.student_id == student_id,
                        StudentTopicMastery.mastery_score >= 0.8500,
                    )
                    .scalar()
                    or 0
                )
                should_unlock = mastery_count >= 1

            elif badge.id == "badge-streak":
                # >= 3 day learning streak
                should_unlock = profile.streak_days >= 3

            elif badge.id == "badge-adaptive-ace":
                # Scored >= 80% on an adaptive practice attempt
                ace_count = (
                    db.query(func.count(AssessmentAttempt.id))
                    .join(Assessment, AssessmentAttempt.assessment_id == Assessment.id)
                    .filter(
                        AssessmentAttempt.student_id == student_id,
                        Assessment.type == "adaptive",
                        AssessmentAttempt.score_percent >= 80,
                        AssessmentAttempt.status.in_(["graded", "completed"]),
                    )
                    .scalar()
                    or 0
                )
                should_unlock = ace_count >= 1

            elif badge.id == "badge-exam-scholar":
                # Passed a final exam
                exam_pass_count = (
                    db.query(func.count(AssessmentAttempt.id))
                    .join(Assessment, AssessmentAttempt.assessment_id == Assessment.id)
                    .filter(
                        AssessmentAttempt.student_id == student_id,
                        Assessment.type == "final",
                        AssessmentAttempt.passed.is_(True),
                        AssessmentAttempt.status.in_(["graded", "completed"]),
                    )
                    .scalar()
                    or 0
                )
                should_unlock = exam_pass_count >= 1

            elif badge.id == "badge-mastery-titan":
                # 100% of topics in any course syllabus are competent/mastered
                enrollments = (
                    db.query(Enrollment)
                    .filter(Enrollment.student_id == student_id)
                    .all()
                )
                for enr in enrollments:
                    total_topics = (
                        db.query(func.count(Topic.id))
                        .filter(Topic.course_id == enr.course_id)
                        .scalar()
                        or 0
                    )
                    if total_topics > 0:
                        mastered_topics = (
                            db.query(func.count(StudentTopicMastery.id))
                            .filter(
                                StudentTopicMastery.student_id == student_id,
                                StudentTopicMastery.course_id == enr.course_id,
                                StudentTopicMastery.status.in_(
                                    ["competent", "mastered"]
                                ),
                            )
                            .scalar()
                            or 0
                        )
                        if mastered_topics >= total_topics:
                            should_unlock = True
                            break

            if should_unlock:
                user_badge = UserBadge(
                    student_id=student_id,
                    badge_id=badge.id,
                    earned_at=datetime.now(timezone.utc),
                )
                db.add(user_badge)
                db.flush()
                newly_unlocked.append(badge)

                # Award +200 bonus XP for badge earned
                badge_key = f"xp:{student_id}:badge:{badge.id}"
                GamificationService.award_xp_idempotent(
                    db,
                    student_id=student_id,
                    event_type="badge_earned",
                    xp_amount=200,
                    description=f"Earned badge: {badge.title}",
                    idempotency_key=badge_key,
                    related_id=badge.id,
                )

        return newly_unlocked

    @staticmethod
    def evaluate_challenges(
        db: Session,
        student_id: uuid.UUID,
        challenge_type: str,
        increment: int = 1,
    ) -> List[UserChallenge]:
        """Updates progress on active challenges matching the challenge type.

        Awards challenge reward XP upon completion.
        """
        active_challenges = (
            db.query(Challenge)
            .filter(
                Challenge.is_active.is_(True),
                Challenge.challenge_type == challenge_type,
            )
            .all()
        )

        updated_challenges: List[UserChallenge] = []
        for ch in active_challenges:
            user_ch = (
                db.query(UserChallenge)
                .filter(
                    UserChallenge.student_id == student_id,
                    UserChallenge.challenge_id == ch.id,
                )
                .first()
            )
            if not user_ch:
                user_ch = UserChallenge(
                    student_id=student_id,
                    challenge_id=ch.id,
                    current_progress=0,
                    is_completed=False,
                )
                db.add(user_ch)
                db.flush()

            if not user_ch.is_completed:
                user_ch.current_progress += increment
                if user_ch.current_progress >= ch.target_value:
                    user_ch.is_completed = True
                    user_ch.completed_at = datetime.now(timezone.utc)

                    # Award challenge completion XP
                    ch_key = f"xp:{student_id}:challenge:{ch.id}"
                    GamificationService.award_xp_idempotent(
                        db,
                        student_id=student_id,
                        event_type="challenge_completed",
                        xp_amount=ch.xp_reward,
                        description=f"Completed challenge: {ch.title}",
                        idempotency_key=ch_key,
                        related_id=ch.id,
                    )
                db.flush()
                updated_challenges.append(user_ch)

        return updated_challenges

    @staticmethod
    def get_leaderboard(
        db: Session,
        current_user_id: Optional[uuid.UUID] = None,
        course_id: Optional[uuid.UUID] = None,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Generates ranked academic leaderboard honoring privacy opt-in settings."""
        query = (
            db.query(GamificationProfile, User)
            .join(User, GamificationProfile.student_id == User.id)
            .filter(User.is_active.is_(True))
        )

        if course_id:
            query = query.join(
                Enrollment, Enrollment.student_id == GamificationProfile.student_id
            ).filter(Enrollment.course_id == course_id)

        profiles_users = (
            query.order_by(desc(GamificationProfile.xp))
            .limit(limit)
            .all()
        )

        entries = []
        current_user_entry = None

        for rank, (prof, user) in enumerate(profiles_users, start=1):
            is_me = current_user_id is not None and user.id == current_user_id

            # Privacy masking: If opted out and not the current viewing student
            if not prof.is_opted_in_leaderboard and not is_me:
                display_name = "Anonymous Scholar"
                avatar = None
            else:
                display_name = user.full_name
                avatar = (
                    "".join(part[0].upper() for part in user.full_name.split()[:2])
                    if user.full_name
                    else "ST"
                )

            # Retrieve student's unlocked badges
            earned_badges = (
                db.query(Badge)
                .join(UserBadge, Badge.id == UserBadge.badge_id)
                .filter(UserBadge.student_id == user.id)
                .all()
            )

            badge_snippets = [
                {
                    "id": b.id,
                    "title": b.title,
                    "icon": b.icon,
                    "description": b.description,
                }
                for b in earned_badges
            ]

            entry = {
                "rank": rank,
                "student_id": user.id,
                "display_name": display_name,
                "avatar": avatar,
                "xp": prof.xp,
                "level": prof.level,
                "earned_badges_count": len(badge_snippets),
                "badges": badge_snippets,
                "is_current_user": is_me,
            }
            entries.append(entry)

            if is_me:
                current_user_entry = entry

        # If current user is not in top limit, fetch their specific rank
        if current_user_id and not current_user_entry:
            my_prof = GamificationService.get_or_create_profile(
                db, current_user_id
            )
            my_user = db.query(User).filter(User.id == current_user_id).first()
            if my_user:
                higher_xp_count = (
                    db.query(func.count(GamificationProfile.id))
                    .filter(GamificationProfile.xp > my_prof.xp)
                    .scalar()
                    or 0
                )
                my_rank = higher_xp_count + 1
                my_badges = (
                    db.query(Badge)
                    .join(UserBadge, Badge.id == UserBadge.badge_id)
                    .filter(UserBadge.student_id == current_user_id)
                    .all()
                )
                my_badge_snippets = [
                    {
                        "id": b.id,
                        "title": b.title,
                        "icon": b.icon,
                        "description": b.description,
                    }
                    for b in my_badges
                ]
                current_user_entry = {
                    "rank": my_rank,
                    "student_id": my_user.id,
                    "display_name": my_user.full_name,
                    "avatar": "".join(
                        part[0].upper() for part in my_user.full_name.split()[:2]
                    )
                    if my_user.full_name
                    else "ST",
                    "xp": my_prof.xp,
                    "level": my_prof.level,
                    "earned_badges_count": len(my_badge_snippets),
                    "badges": my_badge_snippets,
                    "is_current_user": True,
                }

        return {
            "entries": entries,
            "current_user_entry": current_user_entry,
            "total_ranked": len(entries),
        }

    @staticmethod
    def process_outbox_event(db: Session, event: DomainOutboxEvent) -> bool:
        """Asynchronously and idempotently processes a single domain outbox event."""
        payload = event.payload or {}
        event_type = event.event_type

        if event_type == "assessment.completed":
            student_id = uuid.UUID(str(payload.get("student_id")))
            attempt_id = payload.get("attempt_id")
            assessment_type = payload.get("assessment_type")
            is_passed = payload.get("is_passed", payload.get("passed", False))

            if not assessment_type:
                asm_id = payload.get("assessment_id")
                if asm_id:
                    assessment_type = (
                        db.query(Assessment.type)
                        .filter(Assessment.id == uuid.UUID(str(asm_id)))
                        .scalar()
                    )
            assessment_type = assessment_type or "practice"

            # Determine XP reward
            if assessment_type == "diagnostic":
                xp_amount = 150
                desc = "Completed diagnostic baseline assessment"
            elif assessment_type in ("adaptive", "formative", "practice"):
                xp_amount = 120
                desc = "Completed adaptive practice session"
            elif assessment_type in ("final", "summative"):
                xp_amount = 250 if is_passed else 100
                desc = (
                    "Successfully passed final summative examination"
                    if is_passed
                    else "Completed final summative examination"
                )
            else:
                xp_amount = 100
                desc = f"Completed {assessment_type} assessment"

            key = f"xp:{student_id}:assessment:{attempt_id}"
            GamificationService.award_xp_idempotent(
                db,
                student_id=student_id,
                event_type=f"{assessment_type}_completed",
                xp_amount=xp_amount,
                description=desc,
                idempotency_key=key,
                related_id=str(attempt_id),
            )

            profile = GamificationService.get_or_create_profile(db, student_id)
            GamificationService.update_streak(db, profile)
            GamificationService.evaluate_badges(db, student_id)

            if assessment_type in ("adaptive", "practice"):
                GamificationService.evaluate_challenges(
                    db, student_id, "practice_count", 1
                )

            return True

        elif event_type == "lesson.completed":
            student_id = uuid.UUID(str(payload.get("student_id")))
            lesson_id = payload.get("lesson_id")
            lesson_title = payload.get("lesson_title", "Curriculum unit")

            key = f"xp:{student_id}:lesson:{lesson_id}"
            GamificationService.award_xp_idempotent(
                db,
                student_id=student_id,
                event_type="lesson_completed",
                xp_amount=50,
                description=f"Completed lesson: {lesson_title}",
                idempotency_key=key,
                related_id=str(lesson_id),
            )

            profile = GamificationService.get_or_create_profile(db, student_id)
            GamificationService.update_streak(db, profile)
            GamificationService.evaluate_badges(db, student_id)
            GamificationService.evaluate_challenges(
                db, student_id, "lesson_count", 1
            )
            return True

        elif event_type == "resource.reviewed":
            student_id = uuid.UUID(str(payload.get("student_id")))
            resource_id = payload.get("resource_id")
            resource_title = payload.get("resource_title", "Study resource")

            key = f"xp:{student_id}:resource:{resource_id}"
            GamificationService.award_xp_idempotent(
                db,
                student_id=student_id,
                event_type="resource_reviewed",
                xp_amount=15,
                description=f"Reviewed study resource: {resource_title}",
                idempotency_key=key,
                related_id=str(resource_id),
            )

            profile = GamificationService.get_or_create_profile(db, student_id)
            GamificationService.update_streak(db, profile)
            return True

        return False

    @staticmethod
    def process_pending_outbox_events(
        db: Session,
        limit: int = 50,
        max_attempts: int = 5,
        retry_base_seconds: float = 5.0,
        retry_max_seconds: float = 300.0,
    ) -> Dict[str, Any]:
        """Worker dispatcher draining pending domain outbox events with retry backoff and concurrency locking."""
        now = datetime.now(timezone.utc)
        query = (
            db.query(DomainOutboxEvent)
            .filter(
                DomainOutboxEvent.status == "pending",
                (DomainOutboxEvent.next_attempt_at.is_(None) | (DomainOutboxEvent.next_attempt_at <= now)),
            )
            .order_by(DomainOutboxEvent.created_at)
            .limit(limit)
        )

        # Concurrency safety: use PostgreSQL FOR UPDATE SKIP LOCKED
        try:
            bind = db.get_bind()
            if bind and bind.dialect.name == "postgresql":
                query = query.with_for_update(skip_locked=True)
        except Exception:
            pass

        events = query.all()

        processed = 0
        failed = 0

        for ev in events:
            try:
                # Process inside isolated nested savepoint so failure rolls back partial writes
                with db.begin_nested():
                    success = GamificationService.process_outbox_event(db, ev)
                    if success:
                        ev.status = "published"
                        ev.published_at = datetime.now(timezone.utc)
                        ev.last_error = None
                        processed += 1
                    else:
                        raise ValueError(f"Unsupported or unhandled outbox event type '{ev.event_type}'")
            except Exception as exc:
                # db.begin_nested() rollback guarantees no partial XP/badge writes persist
                ev.retry_count = (ev.retry_count or 0) + 1
                ev.last_error = str(exc)[:500]
                if ev.retry_count >= max_attempts:
                    ev.status = "failed"
                    ev.next_attempt_at = None
                else:
                    delay = min(retry_max_seconds, retry_base_seconds * (2 ** ev.retry_count))
                    # Add small random jitter (0 to 1 second)
                    delay += random.uniform(0.0, 1.0)
                    ev.next_attempt_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
                failed += 1

        db.commit()
        return {
            "processed_count": processed,
            "failed_count": failed,
            "message": f"Processed {processed} events, {failed} failures.",
        }
