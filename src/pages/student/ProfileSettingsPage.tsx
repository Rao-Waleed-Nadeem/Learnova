import React, { useState } from 'react';
import { StudentUser, GamificationProfile } from '../../types';
import {
  User,
  Mail,
  Shield,
  Eye,
  CheckCircle2,
  Lock,
  Save,
  LogOut,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { StudentNavigationPage } from '../../components/student/StudentLayout';

interface ProfileSettingsPageProps {
  currentUser: StudentUser;
  gamificationProfile: GamificationProfile;
  onUpdateProfile: (updated: StudentUser) => void;
  onSignOut: () => void;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  onNavigate: (page: StudentNavigationPage) => void;
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({
  currentUser,
  gamificationProfile,
  onUpdateProfile,
  onSignOut,
  onNotify,
  onNavigate,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(currentUser.preferences.leaderboardOptIn);
  const [emailNotifications, setEmailNotifications] = useState(currentUser.preferences.emailNotifications);
  const [themePref, setThemePref] = useState<'light' | 'dark' | 'system'>(currentUser.preferences.theme || 'light');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      setIsSaving(false);
      const updated: StudentUser = {
        ...currentUser,
        name: name.trim(),
        email: email.trim(),
        bio: bio.trim(),
        preferences: {
          ...currentUser.preferences,
          leaderboardOptIn,
          emailNotifications,
          theme: themePref,
        },
      };

      onUpdateProfile(updated);
      onNotify('success', 'Profile and preferences successfully updated.');
    }, 350);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      onNotify('error', 'Please provide both current and new password.');
      return;
    }
    if (newPassword.length < 8) {
      onNotify('error', 'New password must be at least 8 characters long.');
      return;
    }

    onNotify('success', 'Security credentials updated securely.');
    setCurrentPassword('');
    setNewPassword('');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Profile & Account Settings
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage your student identity, privacy preferences, and security credentials.
        </p>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Personal Identity */}
        <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shrink-0">
              {currentUser.avatar || name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {name || 'Student'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Level {gamificationProfile.level} Scholar • Joined {currentUser.joinDate}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-name" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Full Display Name
              </label>
              <input
                id="p-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C24] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="p-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                University Email Address
              </label>
              <input
                id="p-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C24] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="p-bio" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Academic Bio & Interests
            </label>
            <textarea
              id="p-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell instructors and peers about your academic interests..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C24] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Section 2: Privacy & Gamification Preferences */}
        <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Privacy & Public Standing</span>
          </h3>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={leaderboardOptIn}
                onChange={(e) => setLeaderboardOptIn(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white block">
                  Include on public student leaderboard
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  When enabled, your display name and unlocked badges appear in class rankings.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white block">
                  Study reminders & streak alerts
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Receive notifications when adaptive assessments or streak bonuses become available.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Security: Password Change */}
      <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-600" />
          <span>Security & Password</span>
        </h3>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="curr-pass" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Current Password
              </label>
              <input
                id="curr-pass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C24] text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label htmlFor="new-pass" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                New Password
              </label>
              <input
                id="new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C24] text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 transition"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* Account Session & Sign Out */}
      <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
            Sign out of Learnova
          </h4>
          <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-0.5">
            End your current student session safely on this computer.
          </p>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition flex items-center gap-1.5 self-start sm:self-auto shadow-2xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
