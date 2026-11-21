import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../../types';
import { Trophy, Award, Zap, X, Shield, Users, Eye, EyeOff } from 'lucide-react';
import { StudentNavigationPage } from '../../components/student/StudentLayout';
import { Avatar } from '../../components/ui/Avatar';
import {
  gamificationApi,
  mapBackendLeaderboardToLeaderboard,
  BackendLeaderboardResponse,
} from '../../services/api/gamificationApi';

interface LeaderboardPageProps {
  leaderboard: LeaderboardEntry[];
  currentStudentId: string;
  onNavigate: (page: StudentNavigationPage, params?: Record<string, string>) => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  leaderboard: initialLeaderboard,
  currentStudentId,
  onNavigate,
}) => {
  const cachedOptedInKey = `learnova_leaderboard_opted_in_${currentStudentId}`;
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [optedIn, setOptedIn] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(cachedOptedInKey);
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return true;
  });
  const [isTogglingOptIn, setIsTogglingOptIn] = useState(false);

  useEffect(() => {
    let isMounted = true;
    gamificationApi
      .getLeaderboard()
      .then((res: BackendLeaderboardResponse) => {
        if (!isMounted) return;
        const items = res.entries || res.leaderboard;
        if (items && items.length > 0) {
          setLeaderboardData(items.map(mapBackendLeaderboardToLeaderboard));
        }
        if (res.current_user_opted_in !== undefined) {
          setOptedIn(res.current_user_opted_in);
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(cachedOptedInKey, String(res.current_user_opted_in));
          }
        }
      })
      .catch(() => {
        // Fall back to initial prop
      });

    return () => {
      isMounted = false;
    };
  }, [cachedOptedInKey]);

  const handleToggleOptIn = async () => {
    setIsTogglingOptIn(true);
    try {
      const nextVal = !optedIn;
      setOptedIn(nextVal);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(cachedOptedInKey, String(nextVal));
      }
      await gamificationApi.updateProfile({ is_opted_in_leaderboard: nextVal });
      const res = await gamificationApi.getLeaderboard();
      const items = res.entries || res.leaderboard;
      if (items && items.length > 0) {
        setLeaderboardData(items.map(mapBackendLeaderboardToLeaderboard));
      }
      if (res.current_user_opted_in !== undefined) {
        setOptedIn(res.current_user_opted_in);
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(cachedOptedInKey, String(res.current_user_opted_in));
        }
      }
    } catch (e) {
      console.warn('Failed to update leaderboard privacy:', e);
    } finally {
      setIsTogglingOptIn(false);
    }
  };

  const activeLeaderboard = leaderboardData.length > 0 ? leaderboardData : initialLeaderboard;

  return (
    <div className="space-y-6 max-w-4xl mx-auto view-enter-animation">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <Trophy className="w-7 h-7 text-amber-500" />
          <span>Academic Leaderboard</span>
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Rankings are based strictly on verified XP earned through lesson completions, diagnostics, and exams.
        </p>
      </div>

      {/* Privacy Opt-In Status Banner */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs border border-gray-200/80 dark:border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          {optedIn ? (
            <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <EyeOff className="w-4 h-4 text-gray-500" />
          )}
          <div>
            <span className="font-bold text-gray-900 dark:text-white">
              {optedIn ? 'Your profile is publicly ranked.' : 'You are currently hidden from public rankings.'}
            </span>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {optedIn
                ? 'Your pseudonym and badges are visible to course peers.'
                : 'Opt in to share your verified progress and achievements with other scholars.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleOptIn}
          disabled={isTogglingOptIn}
          className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer self-start sm:self-auto active:scale-[0.98] ${
            optedIn
              ? 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
          }`}
        >
          {isTogglingOptIn ? 'Saving...' : optedIn ? 'Make Private' : 'Opt In to Leaderboard'}
        </button>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs border border-gray-200/80 dark:border-gray-800/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Top Scholars ({activeLeaderboard.length} Ranked)</span>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Verified academic standing across all enrolled scholars
          </span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {activeLeaderboard.map((entry) => {
            const isMe =
              entry.studentId === currentStudentId ||
              Boolean(entry.isCurrentUser && (!currentStudentId || entry.studentId === currentStudentId));

            return (
              <div
                key={entry.studentId}
                className={`p-4 sm:p-5 flex items-center justify-between gap-4 select-none ${
                  isMe
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-inset ring-indigo-500/25'
                    : 'hover:bg-gray-50/60 dark:hover:bg-[#1C212B]'
                }`}
              >
                {/* Left: Rank, Avatar, Name */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                      entry.rank === 1
                        ? 'bg-amber-400 text-amber-950 shadow-xs ring-1 ring-amber-400/50'
                        : entry.rank === 2
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        : entry.rank === 3
                        ? 'bg-amber-700/80 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {entry.rank}
                  </div>

                  <Avatar
                    src={entry.avatar}
                    name={entry.displayName}
                    fallbackText={entry.displayName ? entry.displayName.slice(0, 2).toUpperCase() : 'ST'}
                    className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {entry.displayName}
                      </h4>
                      {isMe && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Level {entry.level} • {entry.earnedBadgesCount} Badges
                    </p>
                  </div>
                </div>

                {/* Right: XP Score */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black text-indigo-900 dark:text-indigo-200 block">
                      {entry.xp} XP
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
