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
  ChevronLeft,
  Sparkles,
  Palette,
  Globe,
} from 'lucide-react';
import { StudentUser, GamificationProfile } from '../../types';
import { DesignStudioWidget } from '../ui/DesignStudioWidget';
import { AppFooter } from '../ui/AppFooter';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';

export type StudentNavigationPage =
  | 'sign_in'
  | 'register'
  | 'dashboard'
  | 'catalog'
  | 'course_details'
  | 'my_learning'
  | 'course_map'
  | 'lesson'
  | 'simplification_studio'
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
  onSwitchToPublic?: () => void;
  onSignOut?: () => void;
  breadcrumbs?: Array<{ label: string; page?: StudentNavigationPage; params?: Record<string, string> }>;
  children?: React.ReactNode;
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
  onSwitchToPublic,
  onSignOut,
  breadcrumbs = [],
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [designStudioOpen, setDesignStudioOpen] = useState(false);
  const { actualTheme, setTheme } = useTheme();
  const isDark = actualTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const navItems = [
    { id: 'dashboard' as StudentNavigationPage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my_learning' as StudentNavigationPage, label: 'My Learning', icon: BookOpen },
    { id: 'catalog' as StudentNavigationPage, label: 'Explore', icon: Compass },
    { id: 'progress' as StudentNavigationPage, label: 'Progress', icon: BarChart2 },
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

      {/* Desktop & Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-[#181C24] border-r border-[#D9DEE7] dark:border-[#2D3545] flex flex-col justify-between transition-all duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64 w-64'}`}
      >
        {/* Brand & Portal Label */}
        <div>
          <div
            className={`h-16 border-b border-[#D9DEE7] dark:border-[#2D3545] flex items-center justify-between transition-all duration-200 ${
              sidebarCollapsed ? 'px-2' : 'px-4'
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src="/learnova-logo.png"
                alt="Learnova"
                className={`object-contain shrink-0 ${
                  sidebarCollapsed ? 'w-7 h-7' : 'h-8 w-auto'
                }`}
                title="Learnova Student Portal"
              />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <span className="font-bold text-base text-gray-900 dark:text-white tracking-tight block truncate">
                    Learnova
                  </span>
                  <span className="block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Student Portal
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`hidden lg:flex text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer ${
                sidebarCollapsed ? 'p-1' : 'p-1.5'
              }`}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>

            {/* Mobile Close Button */}
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
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#E8EEFF] dark:bg-indigo-950/40 text-[#2646B8] dark:text-indigo-300 font-semibold shadow-2xs'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:translate-x-0.5'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  {isActive && <span className="nav-indicator-pill" aria-hidden="true" />}
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-[#2646B8] dark:text-indigo-400'
                        : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                    }`}
                  />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Gamification Progress Mini-Card (Visible when expanded) */}
          {!sidebarCollapsed && (
            <div className="mx-3 my-2 p-2.5 rounded-xl bg-gradient-to-br from-indigo-50/80 to-blue-50/50 dark:from-[#1E232E] dark:to-[#181C24] border border-indigo-100/80 dark:border-indigo-900/40">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Level {gamificationProfile.level}
                </span>
                <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                  {gamificationProfile.xp % 500} / 500 XP
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((gamificationProfile.xp % 500) / 500) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Profile Quick Menu */}
        <div className="p-3 border-t border-[#D9DEE7] dark:border-[#2D3545] space-y-2">
          {/* Student Profile Row */}
          <div
            className={`p-2.5 rounded-xl bg-gray-50/70 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 flex items-center justify-between ${
              sidebarCollapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => handleNavClick('profile')}
              className={`flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition cursor-pointer ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title="View profile and settings"
            >
              <div className="relative">
                <Avatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  fallbackText={currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'ST'}
                  className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0 shadow-xs"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#181C24]" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    Level {gamificationProfile.level} • {gamificationProfile.xp} XP
                  </p>
                </div>
              )}
            </button>

            {!sidebarCollapsed && onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition cursor-pointer"
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
      <div
        className={`flex-1 transition-all duration-300 ease-in-out flex flex-col min-h-screen ${
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        {/* Global Student Header */}
        <header className="sticky top-0 z-30 h-16 frosted-header px-4 sm:px-6 flex items-center justify-between gap-4">
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

          {/* Right: Consolidated Command Dock (XP, Notifications, Theme, Design Studio, Profile) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Gamification XP & Streak Badge */}
            <button
              type="button"
              onClick={() => onNavigate('xp_history')}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition text-xs font-bold"
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

            {/* Utility Capsule Dock */}
            <div className="command-dock">
              {/* Notifications Popover Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-white dark:hover:bg-gray-800 relative transition cursor-pointer"
                  aria-label="Notifications"
                  aria-expanded={showNotifications}
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-[#181C24]" />
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl shadow-xl p-3 z-50 text-xs">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-900 dark:text-white">
                      <span>Notifications</span>
                      <span className="text-[10px] text-indigo-600 font-medium">3 unread</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                        <p className="font-semibold text-indigo-900 dark:text-indigo-200">Streak Milestone</p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-300">4 days active (+70 XP)</p>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">Diagnostic Calibrated</p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-300">Python baseline calibrated</p>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">Badge Earned</p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-300">Streak Sentinel unlocked</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-white dark:hover:bg-gray-800 transition cursor-pointer"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Design Studio Trigger */}
              <button
                type="button"
                data-design-studio-trigger="true"
                onClick={() => setDesignStudioOpen((prev) => !prev)}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  designStudioOpen
                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800'
                }`}
                aria-label="Toggle Design Studio"
                aria-expanded={designStudioOpen}
                aria-controls="design-studio-dialog"
                title="Design Studio (Palettes & Fonts)"
              >
                <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400 pointer-events-none" />
              </button>

              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

              {/* Profile Avatar Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-7 h-7 rounded-full flex items-center justify-center ring-1 ring-transparent hover:ring-indigo-400 transition cursor-pointer"
                  aria-label="User menu"
                >
                <Avatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  fallbackText={currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'ST'}
                  className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs"
                />
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
          <div className="view-enter-animation">
            {children}
          </div>
        </main>

        {/* Quiet Studio-Grade Utility Footer */}
        <AppFooter onOpenDesignStudio={() => setDesignStudioOpen(true)} />
      </div>

      {/* Design Studio Customizer Widget */}
      <DesignStudioWidget
        isOpen={designStudioOpen}
        onClose={() => setDesignStudioOpen(false)}
        onToggle={() => setDesignStudioOpen((prev) => !prev)}
      />
    </div>
  );
};
