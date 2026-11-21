import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  Sparkles,
  ClipboardCheck,
  BarChart3,
  Menu,
  X,
  LogOut,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  ArrowRightLeft,
} from 'lucide-react';
import { DesignStudioWidget } from '../ui/DesignStudioWidget';
import { AppFooter } from '../ui/AppFooter';
import { useTheme } from '../../context/ThemeContext';

export type NavigationPage =
  | 'overview'
  | 'courses'
  | 'course_overview'
  | 'curriculum'
  | 'prerequisites'
  | 'resources'
  | 'questions'
  | 'question_editor'
  | 'ai_review'
  | 'assessments'
  | 'assessment_editor'
  | 'analytics';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface BreadcrumbItem {
  label: string;
  page?: NavigationPage;
  params?: Record<string, string>;
}

interface TeacherLayoutProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage, params?: Record<string, string>) => void;
  selectedCourseId?: string;
  selectedCourseTitle?: string;
  teacherUser?: { name: string; email: string; department?: string };
  onSignOut?: () => void;
  onSwitchPortal?: (portal: 'student' | 'admin' | 'public') => void;
  onSwitchToPublic?: () => void;
  breadcrumbs?: BreadcrumbItem[];
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  children?: React.ReactNode;
}

export const TeacherLayout: React.FC<TeacherLayoutProps> = ({
  currentPage,
  onNavigate,
  teacherUser,
  onSignOut,
  onSwitchPortal,
  onSwitchToPublic,
  breadcrumbs = [],
  toasts,
  onDismissToast,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [designStudioOpen, setDesignStudioOpen] = useState(false);
  const { actualTheme, setTheme } = useTheme();
  const isDark = actualTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const navItems = [
    {
      id: 'overview' as NavigationPage,
      label: 'Overview',
      icon: LayoutDashboard,
      activeMatches: ['overview'],
    },
    {
      id: 'courses' as NavigationPage,
      label: 'Courses',
      icon: BookOpen,
      activeMatches: ['courses', 'course_overview', 'curriculum', 'prerequisites', 'resources'],
    },
    {
      id: 'questions' as NavigationPage,
      label: 'Question Bank',
      icon: ListChecks,
      activeMatches: ['questions', 'question_editor'],
    },
    {
      id: 'ai_review' as NavigationPage,
      label: 'AI Review',
      icon: Sparkles,
      activeMatches: ['ai_review'],
      badge: 'Review',
    },
    {
      id: 'assessments' as NavigationPage,
      label: 'Assessments',
      icon: ClipboardCheck,
      activeMatches: ['assessments', 'assessment_editor'],
    },
    {
      id: 'analytics' as NavigationPage,
      label: 'Analytics',
      icon: BarChart3,
      activeMatches: ['analytics'],
    },
  ];

  const handleNavClick = (page: NavigationPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const userInitials = teacherUser?.name
    ? teacherUser.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : 'ER';

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F1218] text-[#1F2937] dark:text-[#F3F4F6] flex font-sans">
      {/* Toast Notification Stack */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-md text-sm animate-in slide-in-from-top duration-150 ${
              t.type === 'success'
                ? 'bg-[#EAF7F0] text-[#18794E] border-[#18794E]/30'
                : t.type === 'error'
                ? 'bg-[#FEF0EF] text-[#B42318] border-[#B42318]/30'
                : 'bg-[#EFF8FF] text-[#175CD3] border-[#175CD3]/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-medium">{t.message}</span>
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

      {/* ========================================================================= */}
      {/* DESKTOP COLLAPSIBLE LEFT SIDEBAR (Unified with Student & Admin layouts)     */}
      {/* ========================================================================= */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white dark:bg-[#12161F] border-r border-[#D9DEE7] dark:border-[#2D3545] hidden lg:flex flex-col justify-between transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div
            className={`h-16 flex items-center justify-between border-b border-[#D9DEE7] dark:border-[#2D3545] ${
              sidebarCollapsed ? 'px-2 justify-center' : 'px-4'
            }`}
          >
            <div
              onClick={() => onNavigate('overview')}
              className="flex items-center gap-2.5 overflow-hidden cursor-pointer group"
            >
              <img
                src="/learnova-logo.png"
                alt="Learnova"
                className={`object-contain shrink-0 transition-transform group-hover:scale-105 ${
                  sidebarCollapsed ? 'w-7 h-7' : 'h-8 w-auto'
                }`}
                title="Learnova Faculty"
              />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <span className="font-bold text-base text-gray-900 dark:text-white tracking-tight block truncate">
                    Learnova
                  </span>
                  <span className="block text-[10px] font-bold text-[#3156D3] dark:text-indigo-400 uppercase tracking-wider">
                    Teacher Portal
                  </span>
                </div>
              )}
            </div>

            {/* Collapse Toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer ${
                sidebarCollapsed ? 'p-1 mt-2' : 'p-1.5'
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
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1" aria-label="Faculty Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.activeMatches.includes(currentPage);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#E8EEFF] dark:bg-indigo-950/60 text-[#2646B8] dark:text-indigo-300 font-bold shadow-2xs'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:translate-x-0.5'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  {isActive && <span className="nav-indicator-pill" aria-hidden="true" />}
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#2646B8] dark:text-indigo-400'
                          : 'text-gray-400 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                      }`}
                    />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && item.badge && (
                    <span className="text-[9px] font-bold bg-[#FFF5D6] text-[#946200] px-1.5 py-0.5 rounded border border-[#946200]/20 ml-0.5">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Profile Card & Sign Out */}
        <div className="p-3 border-t border-[#D9DEE7] dark:border-[#2D3545]">
          <div
            className={`p-2 rounded-xl bg-gray-50/70 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 flex items-center justify-between ${
              sidebarCollapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <div
              className={`flex items-center gap-2.5 min-w-0 ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-[#E8EEFF] dark:bg-indigo-950/60 text-[#2646B8] dark:text-indigo-300 flex items-center justify-center font-bold text-xs border border-[#2646B8]/20 dark:border-indigo-700/40 shrink-0">
                {userInitials}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {teacherUser?.name || 'Elena Rostova'}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {teacherUser?.department || teacherUser?.email || 'Computer Science'}
                  </p>
                </div>
              )}
            </div>

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

      {/* ========================================================================= */}
      {/* MOBILE NAVIGATION DRAWER                                                  */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/10 dark:bg-black/25 backdrop-blur-xs lg:hidden flex"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-72 bg-white dark:bg-[#181C24] h-full shadow-2xl flex flex-col p-4 animate-in slide-in-from-left duration-200 border-r border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <img src="/learnova-logo.png" alt="Learnova" className="h-7 w-auto object-contain" />
                <div>
                  <p className="font-bold text-sm text-[#1F2937] dark:text-white">Learnova</p>
                  <p className="text-[11px] text-[#3156D3] dark:text-indigo-400 font-semibold">Teacher Portal</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#5B6472] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.activeMatches.includes(currentPage);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-[#E8EEFF] dark:bg-indigo-950/60 text-[#2646B8] dark:text-indigo-300'
                        : 'text-[#5B6472] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold bg-[#FFF5D6] text-[#946200] px-1.5 py-0.5 rounded border border-[#946200]/20">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800">
                <p className="font-bold text-xs text-gray-900 dark:text-white">{teacherUser?.name || 'Elena Rostova'}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{teacherUser?.department || teacherUser?.email || 'Computer Science'}</p>
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTENT VIEWPORT & TOP DEDICATED BREADCRUMB HEADER                   */}
      {/* ========================================================================= */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out flex flex-col min-h-screen ${
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 frosted-header px-4 sm:px-6 flex items-center justify-between gap-4 border-b border-[#D9DEE7] dark:border-[#2D3545]">
          {/* Left: Mobile hamburger & clean spacious Breadcrumb trail */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Open sidebar navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Path Tree */}
            <nav className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate" aria-label="Breadcrumb">
              <button
                type="button"
                onClick={() => onNavigate('overview')}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
              >
                Faculty
              </button>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 mx-1 text-gray-400 shrink-0" />
                  {crumb.page ? (
                    <button
                      type="button"
                      onClick={() => onNavigate(crumb.page!, crumb.params)}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium truncate"
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

          {/* Right Header Command Dock */}
          <div className="flex items-center gap-2 shrink-0">
            {onSwitchPortal && (
              <button
                type="button"
                onClick={() => onSwitchPortal('student')}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition cursor-pointer"
                title="Switch to Student Portal"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Student View</span>
              </button>
            )}

            <div className="command-dock">
              {/* Appearance Mode Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 transition cursor-pointer"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title="Toggle appearance mode"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-600" />
                )}
              </button>

              {/* Documentation Guide Modal Button */}
              <button
                type="button"
                onClick={() => setHelpModalOpen(true)}
                className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 transition cursor-pointer"
                aria-label="Faculty guide & help"
                title="Faculty System Guide"
              >
                <HelpCircle className="w-4 h-4 text-[#3156D3] dark:text-indigo-400" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          <div className="view-enter-animation">
            {children}
          </div>
        </main>

        {/* App Footer */}
        <AppFooter onOpenDesignStudio={() => setDesignStudioOpen(true)} />
      </div>

      {/* Design Studio Widget */}
      <DesignStudioWidget
        isOpen={designStudioOpen}
        onClose={() => setDesignStudioOpen(false)}
        onToggle={() => setDesignStudioOpen((prev) => !prev)}
      />

      {/* Help Modal */}
      {helpModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/10 dark:bg-black/25 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#181C24] rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#D9DEE7] dark:border-[#2D3545] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7] dark:border-[#2D3545]">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#3156D3]" />
                <h3 className="text-base font-bold text-[#1F2937] dark:text-white">
                  Learnova Teacher Portal - System Guide
                </h3>
              </div>
              <button
                onClick={() => setHelpModalOpen(false)}
                className="p-1 text-[#5B6472] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                aria-label="Close help modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 overflow-y-auto space-y-4 text-xs text-[#5B6472] dark:text-gray-300 leading-relaxed">
              <div className="p-3 rounded-lg bg-[#EFF8FF] dark:bg-indigo-950/40 border border-[#175CD3]/20 dark:border-indigo-700/30">
                <p className="font-semibold text-[#175CD3] dark:text-indigo-300 mb-1">Teacher-in-the-Loop Principle</p>
                <p>
                  AI generates candidate questions based on your curriculum topics and learning
                  resources. Every question requires manual teacher review, edit, and explicit
                  approval before it enters the Question Bank or Assessments.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-[#1F2937] dark:text-white text-sm mb-1">
                  Prerequisite Graph (DAG Rules)
                </h4>
                <p>
                  Topics form a Directed Acyclic Graph. The prerequisite manager mathematically
                  prevents self-dependencies and circular chains. Downstream topics cannot unlock
                  until foundational prerequisites are completed by students.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-[#1F2937] dark:text-white text-sm mb-1">
                  Academic Mastery vs Gamification
                </h4>
                <p>
                  Academic mastery percentages are computed strictly from completed assessment
                  submissions. Gamification XP and badges are asynchronous rewards that are never
                  factored into grade metrics or topic mastery calculations.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-[#D9DEE7] dark:border-[#2D3545] flex justify-end">
              <button
                onClick={() => setHelpModalOpen(false)}
                className="bg-[#3156D3] text-white px-4 py-2 rounded-lg font-medium text-xs hover:bg-[#2646B8] cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
