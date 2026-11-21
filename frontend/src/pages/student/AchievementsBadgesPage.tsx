import React, { useState } from 'react';
import { Badge, GamificationProfile } from '../../types';
import {
  Award,
  Lock,
  CheckCircle2,
  Zap,
  Flame,
  Compass,
  Code,
  GraduationCap,
  Crown,
  Footprints,
  Calendar,
  X,
} from 'lucide-react';
import { StudentNavigationPage } from '../../components/student/StudentLayout';

interface AchievementsBadgesPageProps {
  badges: Badge[];
  gamificationProfile: GamificationProfile;
  onNavigate: (page: StudentNavigationPage, params?: Record<string, string>) => void;
}

export const AchievementsBadgesPage: React.FC<AchievementsBadgesPageProps> = ({
  badges,
  gamificationProfile,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const filteredBadges = badges.filter((b) => {
    if (filter === 'unlocked') return b.isUnlocked;
    if (filter === 'locked') return !b.isUnlocked;
    return true;
  });

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  const renderBadgeIcon = (iconName: string, isUnlocked: boolean) => {
    const className = `w-7 h-7 ${isUnlocked ? 'text-amber-500' : 'text-gray-400'}`;
    switch (iconName) {
      case 'Footprints':
        return <Footprints className={className} />;
      case 'Compass':
        return <Compass className={className} />;
      case 'Code':
        return <Code className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Zap':
        return <Zap className={className} />;
      case 'GraduationCap':
        return <GraduationCap className={className} />;
      case 'Crown':
        return <Crown className={className} />;
      default:
        return <Award className={className} />;
    }
  };

  return (
    <div className="space-y-6 view-enter-animation">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Achievements & Badges
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Celebrate verified academic milestones, diagnostic baselines, and streak progression.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer active:scale-[0.98] ${
              filter === 'all'
                ? 'bg-white dark:bg-[#181C24] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All Badges ({badges.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unlocked')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer active:scale-[0.98] ${
              filter === 'unlocked'
                ? 'bg-white dark:bg-[#181C24] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('locked')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer active:scale-[0.98] ${
              filter === 'locked'
                ? 'bg-white dark:bg-[#181C24] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Locked ({badges.length - unlockedCount})
          </button>
        </div>
      </div>

      {/* Gamification Progress Bar Banner */}
      <div className="p-6 rounded-2xl bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs border border-gray-200/80 dark:border-gray-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Gamification Profile Status
          </span>
          <div className="text-xl font-black text-gray-900 dark:text-white">
            {unlockedCount} of {badges.length} Achievements Unlocked
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Earned badges contribute to your public leaderboard standing and verifiable learning portfolio.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('xp_history')}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 transition cursor-pointer active:scale-[0.98]"
          >
            XP Activity History
          </button>
          <button
            type="button"
            onClick={() => onNavigate('leaderboard')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-2xs cursor-pointer active:scale-[0.98]"
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* Badges Grid (3 columns desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBadges.map((badge) => (
          <div
            key={badge.id}
            onClick={() => setSelectedBadge(badge)}
            className={`interactive-card p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              badge.isUnlocked
                ? 'bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs border-gray-200/90 dark:border-gray-800/90 hover:border-amber-300 dark:hover:border-amber-600 shadow-xs'
                : 'bg-gray-50/60 dark:bg-[#151820]/80 border-gray-200/70 dark:border-gray-800/70 opacity-75 hover:opacity-100'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    badge.isUnlocked
                      ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/80 shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {renderBadgeIcon(badge.icon, badge.isUnlocked)}
                </div>

                {badge.isUnlocked ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Unlocked</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                {badge.title}
              </h3>

              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {badge.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span className="capitalize font-semibold text-indigo-600 dark:text-indigo-400">
                {badge.category}
              </span>
              {badge.earnedAt && (
                <span>Unlocked {new Date(badge.earnedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Badge Details Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mb-4">
              {renderBadgeIcon(selectedBadge.icon, selectedBadge.isUnlocked)}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {selectedBadge.category} Achievement
              </span>
              {selectedBadge.isUnlocked ? (
                <span className="text-[11px] font-bold text-emerald-600">
                  • Confirmed Unlocked
                </span>
              ) : (
                <span className="text-[11px] font-medium text-gray-400">• Locked</span>
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedBadge.title}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
              {selectedBadge.description}
            </p>

            {selectedBadge.earnedAt && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 mb-6 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Earned on: {new Date(selectedBadge.earnedAt).toLocaleString()}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
