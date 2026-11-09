"""Pydantic schemas for Gamification, XP ledger, badges, leaderboard, and challenges."""

import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class GamificationProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    student_id: uuid.UUID
    xp: int
    level: int
    current_level_floor_xp: int = 0
    next_level_xp: int = 250
    progress_percent: int = 0
    streak_days: int = 0
    last_active_date: Optional[date] = None
    is_opted_in_leaderboard: bool = True


class GamificationProfileUpdate(BaseModel):
    is_opted_in_leaderboard: bool = Field(
        ..., description="Toggle participation in academic leaderboard"
    )


class XPLedgerItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    event_type: str
    xp_earned: int
    description: str
    related_id: Optional[str] = None
    created_at: datetime


class XPLedgerListResponse(BaseModel):
    items: List[XPLedgerItemResponse]
    total: int
    page: int
    page_size: int


class BadgeItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    icon: str
    category: str
    earned_at: Optional[datetime] = None
    is_unlocked: bool = False


class BadgesListResponse(BaseModel):
    items: List[BadgeItemResponse]
    total_earned: int
    total_available: int


class LeaderboardBadgeSnippet(BaseModel):
    id: str
    title: str
    icon: str
    description: str


class LeaderboardEntryResponse(BaseModel):
    rank: int
    student_id: uuid.UUID
    display_name: str
    avatar: Optional[str] = None
    xp: int
    level: int
    earned_badges_count: int
    badges: List[LeaderboardBadgeSnippet] = []
    is_current_user: bool = False


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntryResponse]
    current_user_entry: Optional[LeaderboardEntryResponse] = None
    total_ranked: int


class ChallengeItemResponse(BaseModel):
    id: str
    title: str
    description: str
    xp_reward: int
    challenge_type: str
    target_value: int
    current_progress: int = 0
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class ChallengesListResponse(BaseModel):
    items: List[ChallengeItemResponse]


class OutboxProcessResultResponse(BaseModel):
    processed_count: int
    failed_count: int
    message: str
