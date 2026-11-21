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
  ChevronLeft,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Sparkles,
  Palette,
  Sun,
  Moon,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { ToastMessage } from '../teacher/TeacherLayout';
import { DesignStudioWidget } from '../ui/DesignStudioWidget';
import { AppFooter } from '../ui/AppFooter';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';

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
  children?: React.ReactNode;
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [designStudioOpen, setDesignStudioOpen] = useState(false);
  const { actualTheme, setTheme } = useTheme();
  const isDark = actualTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
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

      {/* Desktop & Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-[#181C24] border-r border-[#D9DEE7] dark:border-[#2D3545] flex flex-col justify-between transition-all duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64 w-64'}`}
      >
        <div>
          {/* Brand Header */}
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
                title="Learnova Admin Governance"
              />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <span className="font-bold text-base text-gray-900 dark:text-white tracking-tight block truncate">
                    Learnova
                  </span>
                  <span className="block text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    Admin Governance
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
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 font-bold shadow-2xs'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:translate-x-0.5'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  {isActive && <span className="nav-indicator-pill" aria-hidden="true" />}
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-400 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                      }`}
                    />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Live System Health Badge (Expanded) */}
          {!sidebarCollapsed && (
            <div className="mx-3 my-2 p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                100% Operational
              </span>
            </div>
          )}
        </div>

        {/* Bottom Section: Profile, Theme Toggle */}
        <div className="p-3 border-t border-[#D9DEE7] dark:border-[#2D3545] space-y-2">
          {/* Admin Profile Row */}
          <div className="p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/50 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition cursor-pointer"
              title="Administrator profile and security credentials"
            >
              <Avatar
                src={currentAdmin.avatar}
                name={currentAdmin.name}
                fallbackText={currentAdmin.name ? currentAdmin.name.slice(0, 2).toUpperCase() : 'AD'}
                className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs shrink-0 shadow-xs"
              />
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
      <div
        className={`flex-1 transition-all duration-300 ease-in-out flex flex-col min-h-screen ${
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        {/* Global Header */}
        <header className="sticky top-0 z-30 h-16 frosted-header px-4 sm:px-6 flex items-center justify-between gap-4">
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
          <div className="flex items-center gap-2">
            {/* Live Operational Health Status Dot */}
            <button
              type="button"
              onClick={() => onNavigate('health')}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
              title="View system telemetry"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Operational</span>
            </button>

            {/* Utility Command Dock */}
            <div className="command-dock">
              {/* Dark/Light Theme Toggle */}
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

              {/* Design Studio Trigger */}
              <button
                type="button"
                data-design-studio-trigger="true"
                onClick={() => setDesignStudioOpen((prev) => !prev)}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  designStudioOpen
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800'
                }`}
                aria-label="Toggle Design Studio"
                aria-expanded={designStudioOpen}
                aria-controls="design-studio-dialog"
                title="Design Studio (Palettes & Fonts)"
              >
                <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400 pointer-events-none" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
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
