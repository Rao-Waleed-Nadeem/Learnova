import React, { useState } from 'react';
import { LeaderboardEntry } from '../../types';
import { Trophy, Award, Zap, X, Shield, Users } from 'lucide-react';
import { StudentNavigationPage } from '../../components/student/StudentLayout';

interface LeaderboardPageProps {
  leaderboard: LeaderboardEntry[];
  currentStudentId: string;
  onNavigate: (page: StudentNavigationPage, params?: Record<string, string>) => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  leaderboard,
  currentStudentId,
  onNavigate,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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

      {/* Leaderboard Table / Cards */}
      <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Top Scholars ({leaderboard.length} Ranked)</span>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Click any scholar to inspect public badges
          </span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {leaderboard.map((entry) => {
            const isMe = entry.isCurrentUser || entry.studentId === currentStudentId;

            return (
              <div
                key={entry.studentId}
                onClick={() => setSelectedEntry(entry)}
                className={`p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition ${
                  isMe
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-l-4 border-indigo-600'
                    : 'hover:bg-gray-50/60 dark:hover:bg-[#1C212B]'
                }`}
              >
                {/* Left: Rank, Avatar, Name */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                      entry.rank === 1
                        ? 'bg-amber-400 text-amber-950 shadow-xs'
                        : entry.rank === 2
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        : entry.rank === 3
                        ? 'bg-amber-700 text-amber-100'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {entry.rank}
                  </div>

                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {entry.avatar || entry.displayName.slice(0, 2).toUpperCase()}
                  </div>

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

                {/* Right: XP & Inspect Badges Action */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black text-indigo-900 dark:text-indigo-200 block">
                      {entry.xp} XP
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEntry(entry);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:inline">View Badges</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Peer Badges Inspection Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setSelectedEntry(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                {selectedEntry.avatar || selectedEntry.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedEntry.displayName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Rank #{selectedEntry.rank} • Level {selectedEntry.level} • {selectedEntry.xp} XP
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                Public Unlocked Badges ({selectedEntry.badges.length})
              </span>

              {selectedEntry.badges.length > 0 ? (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedEntry.badges.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 flex items-center gap-3 text-xs"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{b.title}</h4>
                        <p className="text-gray-500 dark:text-gray-400">{b.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No public badges displayed.</p>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
