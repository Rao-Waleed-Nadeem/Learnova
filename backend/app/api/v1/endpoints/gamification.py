"""FastAPI endpoints for Gamification profile, XP history, badges, leaderboard, and challenges."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.db.session import get_db
from app.models.gamification import Badge, Challenge, UserBadge, UserChallenge, XPLedger
from app.models.user import User
from app.schemas.gamification import (
    AwardXPRequest,
    AwardXPResponse,
    BadgeItemResponse,
    BadgesListResponse,
    ChallengeItemResponse,
    ChallengesListResponse,
    GamificationProfileResponse,
    GamificationProfileUpdate,
    LeaderboardEntryResponse,
    LeaderboardResponse,
    OutboxProcessResultResponse,
    XPLedgerItemResponse,
    XPLedgerListResponse,
)
from app.services.gamification_service import GamificationService

router = APIRouter()


@router.get(
    "/gamification/profile",
    response_model=GamificationProfileResponse,
    status_code=status.HTTP_200_OK,
)
def get_gamification_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve current student's gamification profile, XP, level, and streak."""
    profile = GamificationService.get_or_create_profile(db, current_user.id)
    lvl_info = GamificationService.calculate_level(profile.xp)

    return GamificationProfileResponse(
        student_id=profile.student_id,
        xp=profile.xp,
        level=profile.level,
        current_level_floor_xp=lvl_info["current_level_floor_xp"],
        next_level_xp=lvl_info["next_level_xp"],
        progress_percent=lvl_info["progress_percent"],
        streak_days=profile.streak_days,
        last_active_date=profile.last_active_date,
        is_opted_in_leaderboard=profile.is_opted_in_leaderboard,
    )


@router.patch(
    "/gamification/profile",
    response_model=GamificationProfileResponse,
    status_code=status.HTTP_200_OK,
)
def update_gamification_profile(
    payload: GamificationProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update gamification profile preferences (e.g. leaderboard privacy opt-in)."""
    profile = GamificationService.get_or_create_profile(db, current_user.id)
    profile.is_opted_in_leaderboard = payload.is_opted_in_leaderboard
    db.commit()
    db.refresh(profile)

    lvl_info = GamificationService.calculate_level(profile.xp)
    return GamificationProfileResponse(
        student_id=profile.student_id,
        xp=profile.xp,
        level=profile.level,
        current_level_floor_xp=lvl_info["current_level_floor_xp"],
        next_level_xp=lvl_info["next_level_xp"],
        progress_percent=lvl_info["progress_percent"],
        streak_days=profile.streak_days,
        last_active_date=profile.last_active_date,
        is_opted_in_leaderboard=profile.is_opted_in_leaderboard,
    )


@router.post(
    "/gamification/events",
    response_model=AwardXPResponse,
    status_code=status.HTTP_200_OK,
    summary="Award XP and evaluate gamification milestones",
)
def record_gamification_event(
    payload: AwardXPRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AwardXPResponse:
    """Award XP to the authenticated student, update streaks, and evaluate badges and challenges."""
    profile = GamificationService.get_or_create_profile(db, current_user.id)

    key = payload.idempotency_key or f"xp:{current_user.id}:{payload.event_type}:{payload.related_id or uuid.uuid4().hex}"
    ledger_entry, is_newly_awarded = GamificationService.award_xp_idempotent(
        db=db,
        student_id=current_user.id,
        event_type=payload.event_type,
        xp_amount=payload.xp_amount,
        description=payload.description,
        idempotency_key=key,
        related_id=payload.related_id,
    )

    # Track unlocked badges before and after evaluation
    existing_badge_rows = (
        db.query(UserBadge.badge_id)
        .filter(UserBadge.student_id == current_user.id)
        .all()
    )
    existing_badge_ids = {row[0] for row in existing_badge_rows}

    GamificationService.update_streak(db, profile)
    GamificationService.evaluate_badges(db, current_user.id)

    # Evaluate challenge progression based on event type
    if payload.event_type in ("lesson_completed", "lesson.completed"):
        GamificationService.evaluate_challenges(db, current_user.id, "lesson_count", 1)
    elif payload.event_type in ("practice_completed", "adaptive_completed"):
        GamificationService.evaluate_challenges(db, current_user.id, "practice_count", 1)

    db.commit()
    db.refresh(profile)

    new_badge_rows = (
        db.query(UserBadge.badge_id)
        .filter(UserBadge.student_id == current_user.id)
        .all()
    )
    new_badge_ids = {row[0] for row in new_badge_rows}
    newly_unlocked = list(new_badge_ids - existing_badge_ids)

    lvl_info = GamificationService.calculate_level(profile.xp)
    profile_response = GamificationProfileResponse(
        student_id=profile.student_id,
        xp=profile.xp,
        level=profile.level,
        current_level_floor_xp=lvl_info["current_level_floor_xp"],
        next_level_xp=lvl_info["next_level_xp"],
        progress_percent=lvl_info["progress_percent"],
        streak_days=profile.streak_days,
        last_active_date=profile.last_active_date,
        is_opted_in_leaderboard=profile.is_opted_in_leaderboard,
    )

    return AwardXPResponse(
        profile=profile_response,
        xp_awarded=payload.xp_amount if is_newly_awarded else 0,
        is_newly_awarded=is_newly_awarded,
        newly_unlocked_badges=newly_unlocked,
    )


@router.get(
    "/gamification/xp-history",
    response_model=XPLedgerListResponse,
    status_code=status.HTTP_200_OK,
)
def get_xp_history(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve chronological, paginated XP events for authenticated student."""
    total = (
        db.query(func.count(XPLedger.id))
        .filter(XPLedger.student_id == current_user.id)
        .scalar()
        or 0
    )

    offset = (page - 1) * page_size
    entries = (
        db.query(XPLedger)
        .filter(XPLedger.student_id == current_user.id)
        .order_by(XPLedger.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return XPLedgerListResponse(
        items=[
            XPLedgerItemResponse(
                id=entry.id,
                student_id=entry.student_id,
                event_type=entry.event_type,
                xp_earned=entry.xp_earned,
                description=entry.description,
                related_id=entry.related_id,
                created_at=entry.created_at,
            )
            for entry in entries
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/gamification/badges",
    response_model=BadgesListResponse,
    status_code=status.HTTP_200_OK,
)
def get_student_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve badge catalog with student unlocked status and earned timestamps."""
    # Trigger rule evaluation to ensure any newly earned badges are unlocked
    GamificationService.evaluate_badges(db, current_user.id)
    db.commit()

    all_badges = db.query(Badge).order_by(Badge.id).all()
    user_badges_map = {
        ub.badge_id: ub.earned_at
        for ub in db.query(UserBadge)
        .filter(UserBadge.student_id == current_user.id)
        .all()
    }

    badge_items = []
    total_earned = 0

    for b in all_badges:
        is_unlocked = b.id in user_badges_map
        earned_at = user_badges_map.get(b.id)
        if is_unlocked:
            total_earned += 1

        badge_items.append(
            BadgeItemResponse(
                id=b.id,
                title=b.title,
                description=b.description,
                icon=b.icon,
                category=b.category,
                earned_at=earned_at,
                is_unlocked=is_unlocked,
            )
        )

    return BadgesListResponse(
        items=badge_items,
        total_earned=total_earned,
        total_available=len(all_badges),
    )


@router.get(
    "/gamification/leaderboard",
    response_model=LeaderboardResponse,
    status_code=status.HTTP_200_OK,
)
def get_leaderboard(
    course_id: Optional[uuid.UUID] = Query(None, description="Filter by course"),
    limit: int = Query(50, ge=1, le=100, description="Max scholars returned"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve privacy-aware ranked academic leaderboard."""
    result = GamificationService.get_leaderboard(
        db=db,
        current_user_id=current_user.id,
        course_id=course_id,
        limit=limit,
    )

    return LeaderboardResponse(
        entries=[
            LeaderboardEntryResponse(**entry) for entry in result["entries"]
        ],
        current_user_entry=LeaderboardEntryResponse(**result["current_user_entry"])
        if result["current_user_entry"]
        else None,
        current_user_opted_in=result.get("current_user_opted_in", True),
        total_ranked=result["total_ranked"],
    )


@router.get(
    "/gamification/challenges",
    response_model=ChallengesListResponse,
    status_code=status.HTTP_200_OK,
)
def get_student_challenges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve active learning challenges and authenticated student's progress."""
    active_challenges = (
        db.query(Challenge)
        .filter(Challenge.is_active.is_(True))
        .order_by(Challenge.id)
        .all()
    )

    user_challenges_map = {
        uc.challenge_id: uc
        for uc in db.query(UserChallenge)
        .filter(UserChallenge.student_id == current_user.id)
        .all()
    }

    challenge_items = []
    for ch in active_challenges:
        user_ch = user_challenges_map.get(ch.id)
        progress = user_ch.current_progress if user_ch else 0
        is_completed = user_ch.is_completed if user_ch else False
        completed_at = user_ch.completed_at if user_ch else None

        challenge_items.append(
            ChallengeItemResponse(
                id=ch.id,
                title=ch.title,
                description=ch.description,
                xp_reward=ch.xp_reward,
                challenge_type=ch.challenge_type,
                target_value=ch.target_value,
                current_progress=progress,
                is_completed=is_completed,
                completed_at=completed_at,
                expires_at=ch.expires_at,
            )
        )

    return ChallengesListResponse(items=challenge_items)


@router.post(
    "/gamification/process-events",
    response_model=OutboxProcessResultResponse,
    status_code=status.HTTP_200_OK,
)
def process_outbox_events(
    limit: int = Query(50, ge=1, le=500, description="Max events to drain"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("administrator")),
):
    """Worker endpoint to drain and process pending domain outbox events (admin only)."""
    result = GamificationService.process_pending_outbox_events(db=db, limit=limit)
    return OutboxProcessResultResponse(**result)
