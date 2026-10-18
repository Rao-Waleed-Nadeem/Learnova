import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  History,
  Activity,
  BookOpen,
  UserCog,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { ToastMessage } from '../layout/TeacherLayout';

export type AdminNavigationPage =
  | 'dashboard'
  | 'users'
  | 'user_details'
  | 'roles'
  | 'audit'
  | 'health'
  | 'oversight'
  | 'profile'
  | 'access_denied';

interface BreadcrumbItem {
  label: string;
  page?: AdminNavigationPage;
  params?: Record<string, string>;
}

interface AdminLayoutProps {
  currentPage: AdminNavigationPage;
  onNavigate: (page: AdminNavigationPage, params?: Record<string, string>) => void;
  currentAdmin: UserAccount;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  onSwitchPortal: (portal: 'student' | 'teacher') => void;
  onSignOut: () => void;
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentPage,
  onNavigate,
  currentAdmin,
  toasts,
  onDismissToast,
  onSwitchPortal,
  onSignOut,
  breadcrumbs = [],
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
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
    {
      id: 'dashboard' as AdminNavigationPage,
      label: 'Dashboard',
      icon: LayoutDashboard,
      activeMatches: ['dashboard'],
    },
    {
      id: 'users' as AdminNavigationPage,
      label: 'User Management',
      icon: Users,
      activeMatches: ['users', 'user_details'],
    },
    {
      id: 'roles' as AdminNavigationPage,
      label: 'Roles & Access',
      icon: ShieldCheck,
      activeMatches: ['roles'],
    },
    {
      id: 'audit' as AdminNavigationPage,
      label: 'Security Audit Log',
      icon: History,
      activeMatches: ['audit'],
    },
    {
      id: 'health' as AdminNavigationPage,
      label: 'System Health',
      icon: Activity,
      activeMatches: ['health'],
    },
    {
      id: 'oversight' as AdminNavigationPage,
      label: 'Course Oversight',
      icon: BookOpen,
      activeMatches: ['oversight'],
      badge: 'Read-only',
    },
  ];

  const handleNavClick = (page: AdminNavigationPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F1218] text-[#1F2937] dark:text-[#F3F4F6] flex">
      {/* Toast Notification Stack */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm animate-in slide-in-from-top duration-150 ${
              t.type === 'success'
                ? 'bg-[#EAF7F0] text-[#18794E] border-[#18794E]/30 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800'
                : t.type === 'error'
                ? 'bg-[#FEF0EF] text-[#B42318] border-[#B42318]/30 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800'
                : 'bg-[#EFF8FF] text-[#175CD3] border-[#175CD3]/30 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-semibold text-xs sm:text-sm">{t.message}</span>
            </div>
            <button
              onClick={() => onDismissToast(t.id)}
              className="text-current opacity-70 hover:opacity-100 p-0.5 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop & Mobile Sidebar (w-64) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#181C24] border-r border-[#D9DEE7] dark:border-[#2D3545] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-[#D9DEE7] dark:border-[#2D3545] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-base text-gray-900 dark:text-white tracking-tight">
                  Learnova
                </span>
                <span className="block text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Admin Governance
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1" aria-label="Administrator navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.activeMatches.includes(currentPage);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 font-bold'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-400 dark:text-gray-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Portal Switcher, Profile, Theme Toggle */}
        <div className="p-3 border-t border-[#D9DEE7] dark:border-[#2D3545] space-y-2">
          {/* Switch Portal Section */}
          <div className="p-2 rounded-xl bg-gray-50/80 dark:bg-[#12161F] border border-gray-200/80 dark:border-gray-800/80 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
              Switch Workspace
            </p>
            <button
              type="button"
              onClick={() => onSwitchPortal('teacher')}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Teacher Portal</span>
              </div>
              <span className="text-[10px] text-gray-400">Staff</span>
            </button>
            <button
              type="button"
              onClick={() => onSwitchPortal('student')}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Student Portal</span>
              </div>
              <span className="text-[10px] text-gray-400">Learner</span>
            </button>
          </div>

          {/* Admin Profile Row */}
          <div className="p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/50 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition cursor-pointer"
              title="Administrator profile and security credentials"
            >
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {currentAdmin.avatar || currentAdmin.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {currentAdmin.name}
                </p>
                <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate">
                  {currentAdmin.department || 'System Admin'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition cursor-pointer"
              title="Sign out of administrative session"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Global Header */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-[#181C24] border-b border-[#D9DEE7] dark:border-[#2D3545] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Path */}
            <nav className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate" aria-label="Breadcrumb">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="hover:text-purple-600 dark:hover:text-purple-400 font-medium"
              >
                Governance
              </button>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400 shrink-0" />
                  {crumb.page ? (
                    <button
                      type="button"
                      onClick={() => onNavigate(crumb.page!, crumb.params)}
                      className="hover:text-purple-600 dark:hover:text-purple-400 truncate"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="font-semibold text-gray-900 dark:text-white truncate">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right Header: Health indicator, Security Badge, Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Live Operational Health Status Dot */}
            <button
              type="button"
              onClick={() => onNavigate('health')}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
              title="View system telemetry"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Telemetry: Active</span>
            </button>

            {/* Dark/Light Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              aria-label="Toggle theme mode"
              title="Toggle theme mode"
            >
              {isDark ? (
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
