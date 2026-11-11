/**
 * Gamification and Leaderboard API Client (SSD-05, SSD-06, FR-GAM-01 - FR-GAM-07).
 * Communicates with backend endpoints (/api/v1/gamification/*).
 */

import { authApi } from './authApi';
import { GamificationProfile, Badge, XPEvent, LeaderboardEntry } from '../../types';

export interface BackendGamificationProfileResponse {
  student_id: string;
  xp: number;
  level: number;
  current_level_floor_xp: number;
  next_level_xp: number;
  progress_percent: number;
  streak_days: number;
  last_active_date?: string | null;
  is_opted_in_leaderboard: boolean;
}

export interface BackendBadgeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'achievement' | 'streak' | 'mastery' | 'exam';
  earned_at?: string | null;
  is_unlocked: boolean;
}

export interface BackendBadgesResponse {
  items: BackendBadgeItem[];
  total_earned: number;
  total_available: number;
}

export interface BackendXPLedgerItem {
  id: string;
  student_id: string;
  event_type: string;
  xp_earned: number;
  description: string;
  related_id?: string | null;
  created_at: string;
}

export interface BackendXPLedgerResponse {
  items: BackendXPLedgerItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface BackendLeaderboardEntry {
  rank: number;
  student_id: string;
  display_name: string;
  avatar?: string | null;
  xp: number;
  level: number;
  earned_badges_count: number;
  badges: Array<{ id: string; title: string; icon: string; description: string }>;
  is_current_user?: boolean;
}

export interface BackendLeaderboardResponse {
  leaderboard: BackendLeaderboardEntry[];
  current_user_rank?: number | null;
  current_user_opted_in: boolean;
  total_participants: number;
}

export function mapBackendProfileToProfile(p: BackendGamificationProfileResponse): GamificationProfile {
  return {
    id: `gprof-${p.student_id}`,
    studentId: p.student_id,
    xp: p.xp,
    level: p.level,
    streakDays: p.streak_days,
    lastActiveDate: p.last_active_date || new Date().toISOString(),
  };
}

export function mapBackendBadgeToBadge(b: BackendBadgeItem): Badge {
  return {
    id: b.id,
    title: b.title,
    description: b.description,
    icon: b.icon,
    category: b.category,
    earnedAt: b.earned_at || undefined,
    isUnlocked: b.is_unlocked,
  };
}

export function mapBackendXPToXPEvent(x: BackendXPLedgerItem): XPEvent {
  return {
    id: x.id,
    studentId: x.student_id,
    type: x.event_type as any,
    xpEarned: x.xp_earned,
    timestamp: x.created_at,
    description: x.description,
    relatedId: x.related_id || undefined,
  };
}

export function mapBackendLeaderboardToLeaderboard(l: BackendLeaderboardEntry): LeaderboardEntry {
  return {
    rank: l.rank,
    studentId: l.student_id,
    displayName: l.display_name,
    avatar: l.avatar || undefined,
    xp: l.xp,
    level: l.level,
    earnedBadgesCount: l.earned_badges_count,
    badges: l.badges,
    isCurrentUser: l.is_current_user,
  };
}

class GamificationApiClient {
  /**
   * Retrieve current student's gamification profile.
   */
  public async getProfile(): Promise<BackendGamificationProfileResponse> {
    return authApi.request<BackendGamificationProfileResponse>('/gamification/profile', {
      method: 'GET',
    });
  }

  /**
   * Update student gamification profile (leaderboard privacy opt-in toggle).
   */
  public async updateProfile(payload: { is_opted_in_leaderboard: boolean }): Promise<BackendGamificationProfileResponse> {
    return authApi.request<BackendGamificationProfileResponse>('/gamification/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Retrieve chronological XP activity history.
   */
  public async getXPHistory(page = 1, pageSize = 20): Promise<BackendXPLedgerResponse> {
    return authApi.request<BackendXPLedgerResponse>(`/gamification/xp-history?page=${page}&page_size=${pageSize}`, {
      method: 'GET',
    });
  }

  /**
   * Retrieve badge catalog with student unlocked status.
   */
  public async getBadges(): Promise<BackendBadgesResponse> {
    return authApi.request<BackendBadgesResponse>('/gamification/badges', {
      method: 'GET',
    });
  }

  /**
   * Retrieve privacy-aware ranked academic leaderboard.
   */
  public async getLeaderboard(courseId?: string, limit = 50): Promise<BackendLeaderboardResponse> {
    const query = courseId ? `?course_id=${courseId}&limit=${limit}` : `?limit=${limit}`;
    return authApi.request<BackendLeaderboardResponse>(`/gamification/leaderboard${query}`, {
      method: 'GET',
    });
  }
}

export const gamificationApi = new GamificationApiClient();
