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
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  GraduationCap,
  Bell,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { CURRENT_TEACHER } from '../../services/storageService';
import { ThemeToggle } from '../ui/ThemeToggle';

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

interface TeacherLayoutProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage, params?: Record<string, string>) => void;
  selectedCourseId?: string;
  selectedCourseTitle?: string;
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  children: React.ReactNode;
}

export const TeacherLayout: React.FC<TeacherLayoutProps> = ({
  currentPage,
  onNavigate,
  selectedCourseId,
  selectedCourseTitle,
  toasts,
  onDismissToast,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  const navItems = [
    {
      id: 'overview' as NavigationPage,
      label: 'Overview',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
      activeMatches: ['overview'],
    },
    {
      id: 'courses' as NavigationPage,
      label: 'Courses',
      icon: <BookOpen className="w-5 h-5 shrink-0" />,
      activeMatches: ['courses', 'course_overview', 'curriculum', 'prerequisites', 'resources'],
    },
    {
      id: 'questions' as NavigationPage,
      label: 'Question Bank',
      icon: <ListChecks className="w-5 h-5 shrink-0" />,
      activeMatches: ['questions', 'question_editor'],
    },
    {
      id: 'ai_review' as NavigationPage,
      label: 'AI Review',
      icon: <Sparkles className="w-5 h-5 shrink-0" />,
      activeMatches: ['ai_review'],
      badge: 'Review',
    },
    {
      id: 'assessments' as NavigationPage,
      label: 'Assessments',
      icon: <ClipboardCheck className="w-5 h-5 shrink-0" />,
      activeMatches: ['assessments', 'assessment_editor'],
    },
    {
      id: 'analytics' as NavigationPage,
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5 shrink-0" />,
      activeMatches: ['analytics'],
    },
  ];

  const handleNavClick = (page: NavigationPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#1F2937] flex flex-col font-sans">
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

      <div className="flex flex-1">
        {/* Desktop Sidebar (248px or 72px collapsed) */}
        <aside
          className={`hidden md:flex flex-col border-r border-[#D9DEE7] bg-white transition-all duration-200 select-none z-20 shrink-0 ${
            sidebarCollapsed ? 'w-[72px]' : 'w-[248px]'
          }`}
          aria-label="Main Navigation"
        >
          {/* Brand header */}
          <div className="h-[72px] px-5 border-b border-[#D9DEE7] flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-[#3156D3] text-white flex items-center justify-center shrink-0 shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="font-bold text-base tracking-tight text-[#1F2937] leading-none">
                    Learnova
                  </span>
                  <span className="text-[11px] font-semibold text-[#3156D3] uppercase tracking-wider mt-1">
                    Teacher Portal
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-md text-[#5B6472] hover:bg-gray-100 hover:text-[#1F2937] transition-colors cursor-pointer"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = item.activeMatches.includes(currentPage);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative cursor-pointer group ${
                    isActive
                      ? 'bg-[#E8EEFF] text-[#2646B8] font-semibold'
                      : 'text-[#5B6472] hover:bg-gray-100 hover:text-[#1F2937]'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  {/* Left edge indicator */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#3156D3] rounded-r"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={
                      isActive
                        ? 'text-[#2646B8]'
                        : 'text-[#5B6472] group-hover:text-[#1F2937]'
                    }
                  >
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!sidebarCollapsed && item.badge && (
                    <span className="text-[10px] font-semibold bg-[#FFF5D6] text-[#946200] px-1.5 py-0.5 rounded border border-[#946200]/20">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Course context widget if course is selected */}
          {!sidebarCollapsed && selectedCourseTitle && (
            <div className="mx-3 mb-3 p-2.5 rounded-lg bg-[#F5F7FA] border border-[#D9DEE7] text-xs">
              <span className="text-[10px] font-semibold uppercase text-[#737D8C] block mb-0.5">
                Current Course Context
              </span>
              <p className="font-semibold text-[#1F2937] truncate" title={selectedCourseTitle}>
                {selectedCourseTitle}
              </p>
            </div>
          )}

          {/* Bottom user utility area */}
          <div className="p-3 border-t border-[#D9DEE7]">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left cursor-pointer ${
                  sidebarCollapsed ? 'justify-center p-1.5' : ''
                }`}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-[#E8EEFF] text-[#2646B8] flex items-center justify-center font-bold text-xs shrink-0 border border-[#2646B8]/20">
                  ER
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1F2937] truncate">
                      {CURRENT_TEACHER.name}
                    </p>
                    <p className="text-[11px] text-[#5B6472] truncate">
                      {CURRENT_TEACHER.department}
                    </p>
                  </div>
                )}
              </button>

              {userMenuOpen && (
                <div className="absolute bottom-12 left-0 right-0 bg-white border border-[#D9DEE7] rounded-xl shadow-lg p-2 z-30 flex flex-col gap-1 text-xs animate-in fade-in duration-100">
                  <div className="px-2 py-1.5 border-b border-gray-100">
                    <p className="font-semibold text-[#1F2937]">{CURRENT_TEACHER.name}</p>
                    <p className="text-[#5B6472] text-[11px]">{CURRENT_TEACHER.email}</p>
                    <span className="inline-block mt-1 bg-green-100 text-green-800 text-[10px] px-1.5 py-0.2 rounded font-medium">
                      Role: Instructor (Verified)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setHelpModalOpen(true);
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-[#5B6472] hover:bg-gray-100 hover:text-[#1F2937] transition-colors cursor-pointer w-full text-left"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-[#3156D3]" />
                    <span>Documentation & Help</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-[#B42318] hover:bg-[#FEF0EF] transition-colors cursor-pointer w-full text-left font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Active Session</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile Header and Drawer */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-[72px] bg-white border-b border-[#D9DEE7] px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg text-[#5B6472] hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Open mobile navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 md:hidden">
                <div className="w-7 h-7 rounded-lg bg-[#3156D3] text-white flex items-center justify-center font-bold text-xs">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm tracking-tight text-[#1F2937]">Learnova</span>
              </div>

              {/* Course breadcrumb indicator in top header */}
              {selectedCourseTitle && (
                <div className="hidden lg:flex items-center gap-2 text-xs text-[#5B6472] pl-3 border-l border-gray-200">
                  <span className="text-[#737D8C]">Active Course:</span>
                  <span className="font-semibold text-[#1F2937] max-w-sm truncate bg-[#F5F7FA] px-2 py-0.5 rounded border border-[#D9DEE7]">
                    {selectedCourseTitle}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <ThemeToggle />

              <button
                onClick={() => setHelpModalOpen(true)}
                className="p-2 text-[#5B6472] hover:text-[#3156D3] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer hidden sm:flex items-center gap-1.5 text-xs font-medium"
                title="Teacher Help Guide"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Guide</span>
              </button>

              <div className="w-px h-5 bg-gray-200 hidden sm:block" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E8EEFF] text-[#2646B8] flex items-center justify-center font-bold text-xs border border-[#2646B8]/20">
                  ER
                </div>
                <span className="text-xs font-semibold text-[#1F2937] hidden sm:inline">
                  {CURRENT_TEACHER.name}
                </span>
              </div>
            </div>
          </header>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/45 md:hidden backdrop-blur-xs flex"
              role="dialog"
              aria-modal="true"
            >
              <div className="w-72 bg-white h-full shadow-2xl flex flex-col p-4 animate-in slide-in-from-left duration-200">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#3156D3] text-white flex items-center justify-center">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#1F2937]">Learnova</p>
                      <p className="text-[11px] text-[#3156D3] font-semibold">Teacher Portal</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-[#5B6472] hover:bg-gray-100 rounded-lg cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
                  {navItems.map((item) => {
                    const isActive = item.activeMatches.includes(currentPage);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#E8EEFF] text-[#2646B8] font-semibold'
                            : 'text-[#5B6472] hover:bg-gray-100 text-left'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] font-semibold bg-[#FFF5D6] text-[#946200] px-1.5 py-0.5 rounded border border-[#946200]/20">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div className="pt-4 border-t border-gray-200">
                  <div className="mb-3">
                    <span className="text-[10px] font-semibold uppercase text-[#737D8C] dark:text-[#828B99] block mb-1.5">
                      Theme Mode
                    </span>
                    <ThemeToggle compact />
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#F5F7FA] border border-[#D9DEE7] mb-3">
                    <p className="text-xs font-semibold text-[#1F2937]">{CURRENT_TEACHER.name}</p>
                    <p className="text-[11px] text-[#5B6472]">{CURRENT_TEACHER.email}</p>
                    <p className="text-[10px] text-[#3156D3] font-medium mt-1">
                      {CURRENT_TEACHER.department}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
            </div>
          )}

          {/* Main content viewport */}
          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1440px] w-full mx-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>

      {/* Teacher Portal Documentation Modal */}
      {helpModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#D9DEE7] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7]">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#3156D3]" />
                <h3 className="text-base font-bold text-[#1F2937]">
                  Learnova Teacher Portal - System Guide
                </h3>
              </div>
              <button
                onClick={() => setHelpModalOpen(false)}
                className="p-1 text-[#5B6472] hover:bg-gray-100 rounded-lg cursor-pointer"
                aria-label="Close help modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 overflow-y-auto space-y-4 text-xs text-[#5B6472] leading-relaxed">
              <div className="p-3 rounded-lg bg-[#EFF8FF] border border-[#175CD3]/20">
                <p className="font-semibold text-[#175CD3] mb-1">Teacher-in-the-Loop Principle</p>
                <p>
                  AI generates candidate questions based on your curriculum topics and learning
                  resources. Every question requires manual teacher review, edit, and explicit
                  approval before it enters the Question Bank or Assessments.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-[#1F2937] text-sm mb-1">
                  Prerequisite Graph (DAG Rules)
                </h4>
                <p>
                  Topics form a Directed Acyclic Graph. The prerequisite manager mathematically
                  prevents self-dependencies and circular chains. Downstream topics cannot unlock
                  until foundational prerequisites are completed by students.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-[#1F2937] text-sm mb-1">
                  Academic Mastery vs Gamification
                </h4>
                <p>
                  Academic mastery percentages are computed strictly from completed assessment
                  submissions. Gamification XP and badges are asynchronous rewards that are never
                  factored into grade metrics or topic mastery calculations.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-[#D9DEE7] flex justify-end">
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
