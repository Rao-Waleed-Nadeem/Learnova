import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Compass,
  BarChart2,
  Award,
  Trophy,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  Flame,
  Zap,
  ArrowRightLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { StudentUser, GamificationProfile } from '../../types';

export type StudentNavigationPage =
  | 'sign_in'
  | 'register'
  | 'dashboard'
  | 'catalog'
  | 'course_details'
  | 'my_learning'
  | 'course_map'
  | 'lesson'
  | 'diagnostic_intro'
  | 'diagnostic_player'
  | 'practice_player'
  | 'exam_player'
  | 'results'
  | 'progress'
  | 'achievements'
  | 'xp_history'
  | 'leaderboard'
  | 'profile';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface StudentLayoutProps {
  currentPage: StudentNavigationPage;
  onNavigate: (page: StudentNavigationPage, params?: Record<string, string>) => void;
  currentUser: StudentUser;
  gamificationProfile: GamificationProfile;
  toasts?: ToastMessage[];
  onDismissToast?: (id: string) => void;
  onSwitchPortal?: () => void;
  onSwitchToAdmin?: () => void;
  onSignOut?: () => void;
  breadcrumbs?: Array<{ label: string; page?: StudentNavigationPage; params?: Record<string, string> }>;
  children: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({
  currentPage,
  onNavigate,
  currentUser,
  gamificationProfile,
  toasts = [],
  onDismissToast,
  onSwitchPortal,
  onSwitchToAdmin,
  onSignOut,
  breadcrumbs = [],
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    try {
      return document.documentElement.classList.contains('dark');
    } catch {
      return false;
    }
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('learnova_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('learnova_theme', 'light');
    }
  };

  const navItems = [
    { id: 'dashboard' as StudentNavigationPage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my_learning' as StudentNavigationPage, label: 'My Learning', icon: BookOpen },
    { id: 'catalog' as StudentNavigationPage, label: 'Explore Courses', icon: Compass },
    { id: 'progress' as StudentNavigationPage, label: 'Progress & Mastery', icon: BarChart2 },
    { id: 'achievements' as StudentNavigationPage, label: 'Achievements', icon: Award },
    { id: 'leaderboard' as StudentNavigationPage, label: 'Leaderboard', icon: Trophy },
  ];

  const handleNavClick = (page: StudentNavigationPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F1218] text-[#1F2937] dark:text-[#F3F4F6] flex">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop & Mobile Sidebar (248px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-62 bg-white dark:bg-[#181C24] border-r border-[#D9DEE7] dark:border-[#2D3545] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Portal Label */}
        <div>
          <div className="h-16 px-5 border-b border-[#D9DEE7] dark:border-[#2D3545] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                L
              </div>
              <div>
                <span className="font-bold text-base text-gray-900 dark:text-white tracking-tight">
                  Learnova
                </span>
                <span className="block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Student Portal
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded"
              aria-label="Close sidebar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1" aria-label="Student primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#E8EEFF] dark:bg-indigo-950/40 text-[#2646B8] dark:text-indigo-300 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2646B8] dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Portal Switcher & Profile Quick Menu */}
        <div className="p-3 border-t border-[#D9DEE7] dark:border-[#2D3545] space-y-2">
          {/* Portal Switcher Buttons */}
          <div className="space-y-1">
            {onSwitchPortal && (
              <button
                type="button"
                onClick={onSwitchPortal}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition cursor-pointer"
                title="Switch to Teacher Portal"
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Teacher Portal</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
                  Staff
                </span>
              </button>
            )}

            {onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition cursor-pointer"
                title="Switch to Administrator Portal"
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Admin Portal</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium">
                  Admin
                </span>
              </button>
            )}
          </div>

          {/* Student Profile Row */}
          <div className="p-2.5 rounded-xl bg-gray-50/70 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition"
              title="View profile and settings"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {currentUser.name}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  Level {gamificationProfile.level} • {gamificationProfile.xp} XP
                </p>
              </div>
            </button>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="flex-1 lg:pl-62 flex flex-col min-h-screen">
        {/* Global Student Header */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-[#181C24] border-b border-[#D9DEE7] dark:border-[#2D3545] px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left: Mobile Menu Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Open sidebar navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Path */}
            <nav className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate" aria-label="Breadcrumb">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
              >
                Learnova
              </button>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 mx-1 text-gray-400 shrink-0" />
                  {crumb.page ? (
                    <button
                      type="button"
                      onClick={() => onNavigate(crumb.page!, crumb.params)}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right: Gamification Badges, Notifications, Theme & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Gamification XP & Streak Badge */}
            <button
              type="button"
              onClick={() => onNavigate('xp_history')}
              className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition text-xs font-bold"
              title="View XP Activity History"
            >
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{gamificationProfile.streakDays}d</span>
              </span>
              <span className="h-3 w-px bg-amber-300 dark:bg-amber-700" />
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-current text-indigo-600 dark:text-indigo-400" />
                <span>{gamificationProfile.xp} XP</span>
              </span>
            </button>

            {/* Notifications Popover Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative transition"
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-[#181C24]" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl shadow-xl p-3 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-900 dark:text-white">
                    <span>Recent Updates</span>
                    <span className="text-[10px] text-indigo-600 font-medium">3 unread</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                      <p className="font-semibold text-indigo-900 dark:text-indigo-200">Daily Streak Bonus</p>
                      <p className="text-gray-600 dark:text-gray-300">You earned +70 XP for studying 4 days in a row!</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">Diagnostic Calibrated</p>
                      <p className="text-gray-600 dark:text-gray-300">Pre-Course Python Proficiency calibrated baseline mastery.</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">New Achievement Badge</p>
                      <p className="text-gray-600 dark:text-gray-300">Unlocked 'Streak Sentinel' on your profile.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Profile Avatar Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-transparent hover:ring-indigo-300 dark:hover:ring-indigo-700 transition"
                aria-label="User menu"
              >
                {currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase()}
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-xl shadow-xl py-1 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{currentUser.name}</p>
                    <p className="text-gray-500 truncate">{currentUser.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('profile');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-gray-500" />
                    <span>Profile & Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('xp_history');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>XP Activity History</span>
                  </button>
                  {onSignOut && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Global Toast Alerts */}
        {toasts.length > 0 && (
          <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`p-3.5 rounded-xl shadow-lg border text-sm font-medium flex items-center justify-between gap-3 pointer-events-auto transition-all ${
                  toast.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
                    : toast.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100'
                    : 'bg-blue-50 dark:bg-blue-950/90 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100'
                }`}
              >
                <span>{toast.message}</span>
                {onDismissToast && (
                  <button
                    type="button"
                    onClick={() => onDismissToast(toast.id)}
                    className="opacity-60 hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
