import React, { useState, useEffect } from 'react';
import {
  TeacherLayout,
  NavigationPage as TeacherNavigationPage,
  ToastMessage,
} from './components/teacher/TeacherLayout';
import { storage } from './services/storageService';
import {
  parseUrlToRoute,
  pushHistoryState,
  replaceHistoryState,
  AppRouteState,
} from './services/routerService';
import { authApi, mapUserResponseToStudentUser, UserResponse } from './services/api/authApi';
import {
  coursesApi,
  mapBackendCourseToCourse,
  mapBackendEnrollmentToEnrollment,
  mapBackendCourseDetailToCurriculum,
} from './services/api/coursesApi';
import {
  curriculumApi,
  mapBackendCompletionToCompletion,
} from './services/api/curriculumApi';
import {
  gamificationApi,
  mapBackendProfileToProfile,
  mapBackendBadgeToBadge,
  mapBackendXPToXPEvent,
  mapBackendLeaderboardToLeaderboard,
} from './services/api/gamificationApi';
import {
  masteryApi,
  mapBackendMasteryToMasteryState,
} from './services/api/masteryApi';
import {
  teacherApi,
  mapBackendQuestionToQuestionData,
  mapBackendAssessmentToAssessment,
} from './services/api/teacherApi';
import {
  adminApi,
  AdminDashboardResponse,
  mapBackendUserToUserAccount,
  mapBackendAuditToAuditEvent,
  mapBackendHealthToServiceHealth,
} from './services/api/adminApi';
import {
  Course,
  Topic,
  Lesson,
  LearningResource,
  QuestionData,
  AICandidateQuestion,
  Assessment,
  AssessmentAttempt,
  StudentUser,
  Enrollment,
  LessonCompletion,
  MasteryState,
  GamificationProfile,
  XPEvent,
  Badge,
  LeaderboardEntry,
  StudentAssessmentResult,
} from './types';

// Teacher Portal Pages
import { DashboardPage as TeacherDashboardPage } from './pages/teacher/DashboardPage';
import { CoursesPage } from './pages/teacher/CoursesPage';
import { CourseOverviewPage } from './pages/teacher/CourseOverviewPage';
import { CurriculumEditorPage } from './pages/teacher/CurriculumEditorPage';
import { PrerequisiteManagerPage } from './pages/teacher/PrerequisiteManagerPage';
import { ResourceManagerPage } from './pages/teacher/ResourceManagerPage';
import { QuestionBankPage } from './pages/teacher/QuestionBankPage';
import { QuestionEditorPage } from './pages/teacher/QuestionEditorPage';
import { AIReviewPage } from './pages/teacher/AIReviewPage';
import { AssessmentsPage } from './pages/teacher/AssessmentsPage';
import { AssessmentEditorPage } from './pages/teacher/AssessmentEditorPage';
import { AnalyticsPage } from './pages/teacher/AnalyticsPage';

// Student Portal Components & 18 Pages
import {
  StudentLayout,
  StudentNavigationPage,
} from './components/student/StudentLayout';
import { AuthPage } from './pages/auth/AuthPage';
import { SignInPage } from './pages/student/SignInPage';
import { CreateAccountPage } from './pages/student/CreateAccountPage';
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { CourseCatalogPage } from './pages/student/CourseCatalogPage';
import { CourseDetailsPage } from './pages/student/CourseDetailsPage';
import { MyLearningPage } from './pages/student/MyLearningPage';
import { CourseLearningMapPage } from './pages/student/CourseLearningMapPage';
import { LessonWorkspacePage } from './pages/student/LessonWorkspacePage';
import { SimplificationStudioPage } from './pages/student/SimplificationStudioPage';
import { DiagnosticIntroPage } from './pages/student/DiagnosticIntroPage';
import { DiagnosticPlayerPage } from './pages/student/DiagnosticPlayerPage';
import { AdaptivePracticePlayerPage } from './pages/student/AdaptivePracticePlayerPage';
import { FinalExamPlayerPage } from './pages/student/FinalExamPlayerPage';
import { AssessmentResultsPage } from './pages/student/AssessmentResultsPage';
import { ProgressAnalyticsPage } from './pages/student/ProgressAnalyticsPage';
import { AchievementsBadgesPage } from './pages/student/AchievementsBadgesPage';
import { XPActivityHistoryPage } from './pages/student/XPActivityHistoryPage';
import { LeaderboardPage } from './pages/student/LeaderboardPage';
import { ProfileSettingsPage } from './pages/student/ProfileSettingsPage';

// Admin Portal Components & 7 Core + Optional Pages
import {
  AdminLayout,
  AdminNavigationPage,
} from './components/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { UserDetailsPage } from './pages/admin/UserDetailsPage';
import { RolesAccessPage } from './pages/admin/RolesAccessPage';
import { SecurityAuditLogPage } from './pages/admin/SecurityAuditLogPage';
import { SystemHealthPage } from './pages/admin/SystemHealthPage';
import { AdminProfileSecurityPage } from './pages/admin/AdminProfileSecurityPage';
import { CourseOversightPage } from './pages/admin/CourseOversightPage';
import { AccessDeniedPage } from './pages/admin/AccessDeniedPage';
import { ChangeRoleModal } from './components/admin/ChangeRoleModal';
import { DeactivateAccountModal } from './components/admin/DeactivateAccountModal';
import {
  UserAccount,
  UserRole,
  AuditEvent,
  ServiceHealthCheck,
} from './types';

// Public Marketing & Exploration Pages
import { LandingPage } from './pages/public/LandingPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { PublicNavigationPage } from './services/routerService';

// Wipe legacy localStorage shadow-database keys so ghost data cannot display
if (typeof window !== 'undefined' && window.localStorage) {
  const legacyKeys = [
    'learnova_courses',
    'learnova_topics',
    'learnova_lessons',
    'learnova_resources',
    'learnova_questions',
    'learnova_assessments',
    'learnova_attempts',
    'learnova_candidates',
    'learnova_enrollments',
    'learnova_users',
    'learnova_audit_events',
    'learnova_service_health',
    'learnova_completions',
  ];
  for (const k of legacyKeys) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // Ignore restrictive storage access
    }
  }
}

export default function App() {
  // Check if current browser path is the root landing page
  const isRootPath =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/' ||
      window.location.pathname === '' ||
      window.location.pathname === '/landing' ||
      window.location.pathname === '/public');

  // Parse initial route from browser URL
  const [initialRoute] = useState<AppRouteState | null>(() => {
    return typeof window !== 'undefined'
      ? parseUrlToRoute(window.location.pathname, window.location.search)
      : null;
  });

  // Session & Authentication State
  const [currentUserAccount, setCurrentUserAccount] = useState<UserResponse | null>(() => authApi.getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(authApi.getAccessToken() || authApi.getStoredUser());
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Portal Mode: parsed from URL, or persisted to localStorage to survive browser reloads
  const [portalMode, setPortalModeState] = useState<'public' | 'student' | 'teacher' | 'admin'>(() => {
    if (isRootPath) return 'public';
    if (initialRoute?.portal) return initialRoute.portal;
    return storage.getPersistedPortalMode() || 'public';
  });

  // Public Marketing & Exploration State
  const [publicPage, setPublicPage] = useState<PublicNavigationPage>(() => {
    if (isRootPath) return 'landing';
    if (initialRoute?.portal === 'public') return initialRoute.page as PublicNavigationPage;
    return 'landing';
  });
  const [publicNavParams, setPublicNavParams] = useState<Record<string, string>>(() => {
    if (initialRoute?.portal === 'public') return initialRoute.params || {};
    return {};
  });

  const handlePublicNavigate = (
    page: PublicNavigationPage,
    params?: Record<string, string>,
    pushHistory = true
  ) => {
    setPublicPage(page);
    setPortalModeState('public');
    if (params) {
      setPublicNavParams(params);
    } else {
      setPublicNavParams({});
    }
    if (pushHistory) {
      pushHistoryState('public', page, params);
    }
  };

  const handlePublicActionNavigate = (
    targetPage: string,
    params?: Record<string, string>
  ) => {
    if (targetPage === 'about') {
      handlePublicNavigate('about', params);
    } else if (targetPage === 'contact') {
      handlePublicNavigate('contact', params);
    } else if (targetPage === 'landing') {
      handlePublicNavigate('landing', params);
    } else if (targetPage === 'courses' || targetPage === 'catalog') {
      if (publicPage === 'landing') {
        const el = document.getElementById('curriculum-grid');
        el?.scrollIntoView({ behavior: 'smooth' });
      } else {
        handlePublicNavigate('landing', { scrollTo: 'curriculum-grid', ...(params || {}) });
      }
    } else if (targetPage === 'sign_in' || targetPage === 'register') {
      setPortalMode('student');
      setStudentPage(targetPage as StudentNavigationPage);
    } else if (targetPage === 'teacher_portal') {
      if (currentUserAccount && (currentUserAccount.role === 'teacher' || currentUserAccount.role === 'administrator')) {
        setPortalMode('teacher');
        setTeacherPage('overview');
      } else {
        setPortalMode('student');
        setStudentPage('sign_in');
        notify('info', 'Please sign in with your teacher credentials to access the Teacher Portal.');
      }
    } else if (targetPage === 'admin_portal') {
      if (currentUserAccount && currentUserAccount.role === 'administrator') {
        setPortalMode('admin');
        setAdminPage('dashboard');
      } else {
        setPortalMode('student');
        setStudentPage('sign_in');
        notify('info', 'Please sign in with your administrator credentials to access the Administrator Portal.');
      }
    } else if (targetPage === 'dashboard') {
      if (currentUserAccount?.role === 'teacher') {
        setPortalMode('teacher');
        setTeacherPage('overview');
      } else if (currentUserAccount?.role === 'administrator') {
        setPortalMode('admin');
        setAdminPage('dashboard');
      } else {
        setPortalMode('student');
        setStudentPage('dashboard');
      }
    } else if (
      targetPage === 'my_learning' ||
      targetPage === 'course_map' ||
      targetPage === 'progress' ||
      targetPage === 'leaderboard' ||
      targetPage === 'achievements' ||
      targetPage === 'profile'
    ) {
      setPortalMode('student');
      setStudentPage(targetPage as StudentNavigationPage);
      if (params) {
        setStudentNavParams(params);
      }
    } else {
      handlePublicNavigate('landing', params);
    }
  };

  const setPortalMode = (mode: 'public' | 'student' | 'teacher' | 'admin', pushHistory = true) => {
    setPortalModeState(mode);
    storage.setPersistedPortalMode(mode);
    if (pushHistory) {
      const targetPage =
        mode === 'public'
          ? publicPage
          : mode === 'student'
          ? studentPage
          : mode === 'teacher'
          ? teacherPage
          : adminPage;
      const targetParams =
        mode === 'public'
          ? publicNavParams
          : mode === 'student'
          ? studentNavParams
          : mode === 'teacher'
          ? teacherNavParams
          : adminNavParams;
      pushHistoryState(mode, targetPage, targetParams);
    }
  };

  // Student State
  const [currentStudent, setCurrentStudent] = useState<StudentUser | null>(() => storage.getStudentUser());
  const [studentPage, setStudentPage] = useState<StudentNavigationPage>(() => {
    if (initialRoute?.portal === 'student') return initialRoute.page as StudentNavigationPage;
    return 'dashboard';
  });
  const [studentNavParams, setStudentNavParams] = useState<Record<string, string>>(() => {
    if (initialRoute?.portal === 'student') return initialRoute.params || {};
    return {};
  });
  const [latestResult, setLatestResult] = useState<StudentAssessmentResult | null>(null);

  // Teacher State
  const [teacherPage, setTeacherPage] = useState<TeacherNavigationPage>(() => {
    if (initialRoute?.portal === 'teacher') return initialRoute.page as TeacherNavigationPage;
    return 'overview';
  });
  const [teacherNavParams, setTeacherNavParams] = useState<Record<string, string>>(() => {
    if (initialRoute?.portal === 'teacher') return initialRoute.params || {};
    return {};
  });

  // Admin State
  const [currentAdmin, setCurrentAdmin] = useState<UserAccount | null>(() => storage.getAdminUser());
  const [adminPage, setAdminPage] = useState<AdminNavigationPage>(() => {
    if (initialRoute?.portal === 'admin') return initialRoute.page as AdminNavigationPage;
    return 'dashboard';
  });
  const [adminNavParams, setAdminNavParams] = useState<Record<string, string>>(() => {
    if (initialRoute?.portal === 'admin') return initialRoute.params || {};
    return {};
  });
  const [allUsers, setAllUsers] = useState<UserAccount[]>(() => storage.getUsers());
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => storage.getAuditEvents());
  const [serviceHealth, setServiceHealth] = useState<ServiceHealthCheck[]>(() => storage.getServiceHealth());
  const [adminDashboardData, setAdminDashboardData] = useState<AdminDashboardResponse | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<UserAccount | null>(null);
  const [statusModalUser, setStatusModalUser] = useState<UserAccount | null>(null);

  // Shared Data Records (Strictly populated via Live REST API)
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [candidates, setCandidates] = useState<AICandidateQuestion[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);

  // Student Domain Records
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [completions, setCompletions] = useState<LessonCompletion[]>([]);
  const [masteryStates, setMasteryStates] = useState<MasteryState[]>([]);
  const [gamificationProfile, setGamificationProfile] = useState<GamificationProfile>(() => storage.getGamificationProfile());
  const [badges, setBadges] = useState<Badge[]>([]);
  const [xpEvents, setXpEvents] = useState<XPEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = (type: 'success' | 'error' | 'info', message: string) => {
    let cleanMessage = message;
    if (typeof message === 'string' && (message.trim().startsWith('[{"') || message.trim().startsWith('{"'))) {
      try {
        const parsed = JSON.parse(message);
        if (Array.isArray(parsed) && parsed[0]?.msg) {
          cleanMessage = parsed.map((p) => p.msg).join('; ');
        } else if (parsed.detail) {
          cleanMessage = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
        }
      } catch {
        cleanMessage = message;
      }
    }
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message: cleanMessage }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Student Navigation
  const handleStudentNavigate = (page: StudentNavigationPage, params?: Record<string, string>, pushHistory = true) => {
    setStudentPage(page);
    if (params) {
      setStudentNavParams((prev) => ({ ...prev, ...params }));
    }
    if (pushHistory) {
      pushHistoryState('student', page, params);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Teacher Navigation
  const handleTeacherNavigate = (page: string, params?: Record<string, string>, pushHistory = true) => {
    setTeacherPage(page as TeacherNavigationPage);
    if (params) {
      setTeacherNavParams((prev) => ({ ...prev, ...params }));
    }
    if (pushHistory) {
      pushHistoryState('teacher', page, params);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin Navigation
  const handleAdminNavigate = (page: AdminNavigationPage, params?: Record<string, string>, pushHistory = true) => {
    setAdminPage(page);
    if (params) {
      setAdminNavParams((prev) => ({ ...prev, ...params }));
    }
    if (pushHistory) {
      pushHistoryState('admin', page, params);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmRoleChange = async (targetUserId: string, newRole: UserRole, reason: string) => {
    try {
      if (authApi.getAccessToken()) {
        await adminApi.changeUserRole(targetUserId, newRole as any);
        const [usersRes, auditRes, dashRes] = await Promise.all([
          adminApi.listUsers({ page_size: 100 }),
          adminApi.getAuditLogs({ page_size: 100 }),
          adminApi.getAdminDashboard().catch(() => null),
        ]);
        if (usersRes?.items) setAllUsers(usersRes.items.map(mapBackendUserToUserAccount));
        if (auditRes?.items) setAuditEvents(auditRes.items.map(mapBackendAuditToAuditEvent));
        if (dashRes) setAdminDashboardData(dashRes);
        notify('success', `Role successfully updated to "${newRole}". Audit event recorded.`);
        return { success: true };
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to modify user role.');
      return { success: false, error: err.message };
    }

    const res = storage.changeUserRole(currentAdmin?.id || 'adm-sarah', targetUserId, newRole, reason);
    if (res.success) {
      setAllUsers(storage.getUsers());
      setAuditEvents(storage.getAuditEvents());
      notify('success', `Role successfully updated to "${newRole}". Audit event recorded.`);
    } else {
      notify('error', res.error || 'Failed to modify user role.');
    }
    return res;
  };

  const handleConfirmStatusChange = async (targetUserId: string, nextStatus: boolean, reason: string) => {
    try {
      if (authApi.getAccessToken()) {
        await adminApi.toggleUserStatus(targetUserId, nextStatus);
        const [usersRes, auditRes, dashRes] = await Promise.all([
          adminApi.listUsers({ page_size: 100 }),
          adminApi.getAuditLogs({ page_size: 100 }),
          adminApi.getAdminDashboard().catch(() => null),
        ]);
        if (usersRes?.items) setAllUsers(usersRes.items.map(mapBackendUserToUserAccount));
        if (auditRes?.items) setAuditEvents(auditRes.items.map(mapBackendAuditToAuditEvent));
        if (dashRes) setAdminDashboardData(dashRes);
        notify('success', `Account ${nextStatus ? 'reactivated' : 'deactivated'} successfully.`);
        return { success: true };
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to update account status.');
      return { success: false, error: err.message };
    }

    const res = storage.toggleUserStatus(currentAdmin?.id || 'adm-sarah', targetUserId, nextStatus, reason);
    if (res.success) {
      setAllUsers(storage.getUsers());
      setAuditEvents(storage.getAuditEvents());
      notify('success', `Account ${nextStatus ? 'reactivated' : 'deactivated'} successfully.`);
    } else {
      notify('error', res.error || 'Failed to update account status.');
    }
    return res;
  };

  const handleRefreshHealth = async () => {
    try {
      if (authApi.getAccessToken()) {
        const health = await adminApi.getSystemHealth();
        const mapped = mapBackendHealthToServiceHealth(health);
        setServiceHealth(mapped);
        notify('info', 'Telemetry refreshed with live diagnostic pings.');
        return mapped;
      }
    } catch (err: any) {
      console.warn('Live health ping warning:', err);
    }
    const updated = await storage.refreshHealthChecks();
    setServiceHealth([...updated]);
    notify('info', 'Telemetry refreshed with live diagnostic pings.');
    return updated;
  };

  const handleUpdateAdminProfile = async (updated: UserAccount) => {
    try {
      if (authApi.getAccessToken()) {
        await authApi.updateProfile({
          full_name: updated.name,
          department: updated.department,
        });
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to sync admin profile with server');
      return;
    }
    storage.saveAdminUser(updated);
    setCurrentAdmin(updated);
    setAllUsers(storage.getUsers());
  };

  const handleUpdateAdminPassword = async (newPass: string, currentPass?: string) => {
    try {
      if (authApi.getAccessToken() && currentPass) {
        await authApi.changePassword({
          current_password: currentPass,
          new_password: newPass,
        });
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update administrative credentials on server' };
    }

    storage.logAuditEvent({
      actorId: currentAdmin?.id || 'adm-sarah',
      actorName: currentAdmin?.name || 'Sarah Connor',
      actorEmail: currentAdmin?.email || 's.connor@learnova.edu',
      actorRole: 'administrator',
      action: 'PASSWORD_CHANGED',
      targetType: 'user',
      targetId: currentAdmin?.id || 'adm-sarah',
      targetName: currentAdmin?.name || 'Sarah Connor',
      outcome: 'success',
      reason: 'Administrator rotated credentials via Profile & Security portal',
    });
    setAuditEvents(storage.getAuditEvents());
    return { success: true };
  };

  const handleAdminSignOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    }
    storage.clearSessionCredentials();
    authApi.setAccessToken(null);
    authApi.setStoredUser(null);
    storage.logAuditEvent({
      actorId: currentAdmin?.id || 'adm-sarah',
      actorName: currentAdmin?.name || 'Sarah Connor',
      actorEmail: currentAdmin?.email || 's.connor@learnova.edu',
      actorRole: 'administrator',
      action: 'SESSION_TERMINATED',
      targetType: 'session',
      targetId: 'admin-session',
      targetName: 'Sarah Connor (Admin Session)',
      outcome: 'success',
      reason: 'User initiated administrative sign-out',
    });
    setAuditEvents(storage.getAuditEvents());
    setCurrentAdmin(null);
    setCurrentUserAccount(null);
    setIsAuthenticated(false);
    notify('info', 'Administrative session terminated.');
  };

  const getAdminBreadcrumbs = () => {
    const list: Array<{ label: string; page?: AdminNavigationPage; params?: Record<string, string> }> = [];
    if (adminPage === 'dashboard') {
      list.push({ label: 'Dashboard' });
    } else if (adminPage === 'users') {
      list.push({ label: 'User Management' });
    } else if (adminPage === 'user_details') {
      const u = allUsers.find((user) => user.id === adminNavParams.userId);
      list.push({ label: 'User Management', page: 'users' });
      list.push({ label: u?.name || 'Account Details' });
    } else if (adminPage === 'roles') {
      list.push({ label: 'Roles & Access' });
    } else if (adminPage === 'audit') {
      list.push({ label: 'Security Audit Log' });
    } else if (adminPage === 'health') {
      list.push({ label: 'System Health' });
    } else if (adminPage === 'oversight') {
      list.push({ label: 'Course Oversight' });
    } else if (adminPage === 'profile') {
      list.push({ label: 'Profile & Security' });
    }
    return list;
  };

  // UUID format guard to prevent 422 errors on legacy/offline seed data
  const isUuid = (val: any): boolean => {
    return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  };

  // Student Actions
  const handleEnrollCourse = async (courseId: string) => {
    try {
      if (authApi.getAccessToken() && isUuid(courseId)) {
        const backendEnr = await coursesApi.enrollCourse(courseId);
        const mapped = mapBackendEnrollmentToEnrollment(backendEnr);
        setEnrollments((prev) => {
          const exists = prev.some((e) => e.courseId === courseId);
          if (exists) {
            return prev.map((e) => (e.courseId === courseId ? mapped : e));
          }
          return [mapped, ...prev];
        });
        storage.saveEnrollment(mapped);
        const crs = courses.find((c) => c.id === courseId);
        notify('success', `Successfully enrolled in ${crs?.title || 'course'}!`);
        return;
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to enroll in course on server.');
      throw err;
    }

    const enr = storage.enrollCourse(courseId);
    setEnrollments(storage.getEnrollments());
    notify('success', `Successfully enrolled in ${storage.getCourse(courseId)?.title || 'course'}!`);
  };

  const handleMarkLessonComplete = async (lessonId: string, courseId: string, topicId: string) => {
    try {
      if (authApi.getAccessToken()) {
        const wasAlready = completions.some((c) => c.lessonId === lessonId);
        const backendRes = await curriculumApi.completeLesson(lessonId);
        const mapped = mapBackendCompletionToCompletion(backendRes);
        setCompletions((prev) => {
          const updated = [...prev.filter((c) => c.lessonId !== lessonId), mapped];
          storage.saveLessonCompletions(updated);
          return updated;
        });

        // Keep local storage in sync as fallback
        storage.completeLesson(lessonId, courseId, topicId);

        // Update enrollment progress
        if (backendRes.progress_percent !== null && backendRes.progress_percent !== undefined) {
          setEnrollments((prev) =>
            prev.map((e) =>
              e.courseId === courseId
                ? { ...e, progressPercent: Math.round(backendRes.progress_percent!) }
                : e
            )
          );
        }

        // Fetch refreshed gamification state directly from database
        try {
          const [updatedProfile, updatedBadges, updatedXp, updatedLeaderboard] = await Promise.all([
            gamificationApi.getProfile().catch(() => null),
            gamificationApi.getBadges().catch(() => null),
            gamificationApi.getXPHistory().catch(() => null),
            gamificationApi.getLeaderboard().catch(() => null),
          ]);
          if (updatedProfile) {
            const mappedProf = mapBackendProfileToProfile(updatedProfile);
            setGamificationProfile(mappedProf);
            storage.saveGamificationProfile(mappedProf);
          } else {
            setGamificationProfile(storage.getGamificationProfile());
          }
          if (updatedBadges && updatedBadges.items) {
            const mappedBadges = updatedBadges.items.map(mapBackendBadgeToBadge);
            setBadges(mappedBadges);
            storage.saveBadges(mappedBadges);
          }
          if (updatedXp && updatedXp.items) {
            setXpEvents(updatedXp.items.map(mapBackendXPToXPEvent));
          } else {
            setXpEvents(storage.getXPEvents());
          }
          const lbItems = updatedLeaderboard?.entries || updatedLeaderboard?.leaderboard;
          if (lbItems) {
            setLeaderboard(lbItems.map(mapBackendLeaderboardToLeaderboard));
          } else {
            setLeaderboard(storage.getLeaderboard());
          }
        } catch {
          setGamificationProfile(storage.getGamificationProfile());
          setXpEvents(storage.getXPEvents());
          setLeaderboard(storage.getLeaderboard());
        }

        if (wasAlready) {
          notify('info', 'This lesson was already marked complete. Progress is up to date.');
        } else {
          notify('success', 'Lesson marked complete! +50 XP awarded.');
        }
        return;
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to record lesson completion on server');
      throw err;
    }

    const { completion, xpAwarded } = storage.completeLesson(lessonId, courseId, topicId);
    setCompletions(storage.getLessonCompletions());
    setEnrollments(storage.getEnrollments());
    setGamificationProfile(storage.getGamificationProfile());
    setXpEvents(storage.getXPEvents());
    setLeaderboard(storage.getLeaderboard());
    notify('success', `Lesson marked complete! +${xpAwarded} XP awarded.`);
  };

  const handleFinishDiagnostic = async (res: {
    assessmentId: string;
    scorePercent: number;
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    masteryStatus: any;
    xpAwarded: number;
  }) => {
    const asm = assessments.find((a) => a.id === res.assessmentId);
    const crsId = asm?.courseId || courses[0]?.id || '';
    const topId = asm?.topicId || topics[0]?.id || '';

    // Update mastery state
    storage.saveMasteryState({
      id: `ms-${topId}`,
      studentId: currentStudent?.id || 'std-alex',
      courseId: crsId,
      topicId: topId,
      scorePercent: res.scorePercent,
      status: res.masteryStatus,
      lastAssessedAt: new Date().toISOString(),
    });
    setMasteryStates(storage.getMasteryStates());

    // Award XP in backend database & local cache
    storage.awardXP('diagnostic_completed', res.xpAwarded, `Completed diagnostic: ${asm?.title || 'Baseline assessment'}`, asm?.id);

    try {
      if (authApi.getAccessToken()) {
        const awardRes = await gamificationApi.awardXP({
          event_type: 'diagnostic_completed',
          xp_amount: res.xpAwarded,
          description: `Completed diagnostic: ${asm?.title || 'Baseline assessment'}`,
          related_id: asm?.id,
        });
        if (awardRes?.profile) {
          const mapped = mapBackendProfileToProfile(awardRes.profile);
          setGamificationProfile(mapped);
          storage.saveGamificationProfile(mapped);
        } else {
          setGamificationProfile(storage.getGamificationProfile());
        }
        const [updatedXp, updatedLeaderboard] = await Promise.all([
          gamificationApi.getXPHistory().catch(() => null),
          gamificationApi.getLeaderboard().catch(() => null),
        ]);
        if (updatedXp?.items) setXpEvents(updatedXp.items.map(mapBackendXPToXPEvent));
        else setXpEvents(storage.getXPEvents());
        const lbItems = updatedLeaderboard?.entries || updatedLeaderboard?.leaderboard;
        if (lbItems) setLeaderboard(lbItems.map(mapBackendLeaderboardToLeaderboard));
        else setLeaderboard(storage.getLeaderboard());
      } else {
        setGamificationProfile(storage.getGamificationProfile());
        setXpEvents(storage.getXPEvents());
        setLeaderboard(storage.getLeaderboard());
      }
    } catch {
      setGamificationProfile(storage.getGamificationProfile());
      setXpEvents(storage.getXPEvents());
      setLeaderboard(storage.getLeaderboard());
    }

    const resultObj: StudentAssessmentResult = {
      id: `res-${Date.now()}`,
      sessionId: `sess-${Date.now()}`,
      assessmentId: res.assessmentId,
      assessmentTitle: asm?.title || 'Diagnostic Assessment',
      type: 'diagnostic',
      studentId: currentStudent?.id || 'std-alex',
      courseId: crsId,
      topicId: topId,
      scorePercent: res.scorePercent,
      totalQuestions: res.totalQuestions,
      correctCount: res.correctCount,
      incorrectCount: res.incorrectCount,
      masteryStatus: res.masteryStatus,
      xpAwarded: res.xpAwarded,
      nextRecommendedAction: {
        type: 'course_map',
        targetId: crsId,
        label: 'View Calibrated Course Learning Map',
      },
      completedAt: new Date().toISOString(),
    };

    storage.saveAssessmentResult(resultObj);
    setLatestResult(resultObj);
    handleStudentNavigate('results');
    notify('success', `Diagnostic calibrated! +${res.xpAwarded} XP confirmed.`);
  };

  const handleFinishPractice = async (res: {
    assessmentId: string;
    scorePercent: number;
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    masteryStatus: any;
    xpAwarded: number;
  }) => {
    const asm = assessments.find((a) => a.id === res.assessmentId);
    const crsId = asm?.courseId || courses[0]?.id || '';
    const topId = asm?.topicId || topics[0]?.id || '';

    storage.saveMasteryState({
      id: `ms-${topId}`,
      studentId: currentStudent?.id || 'std-alex',
      courseId: crsId,
      topicId: topId,
      scorePercent: res.scorePercent,
      status: res.masteryStatus,
      lastAssessedAt: new Date().toISOString(),
    });
    setMasteryStates(storage.getMasteryStates());

    storage.awardXP('practice_completed', res.xpAwarded, `Completed adaptive practice: ${asm?.title || 'Topic practice'}`, asm?.id);

    // If score >= 85%, unlock Adaptive Ace badge!
    let awardedBadge: Badge | undefined;
    if (res.scorePercent >= 85) {
      awardedBadge = storage.unlockBadge('badge-adaptive-ace');
      setBadges(storage.getBadges());
    }

    try {
      if (authApi.getAccessToken()) {
        const awardRes = await gamificationApi.awardXP({
          event_type: 'practice_completed',
          xp_amount: res.xpAwarded,
          description: `Completed adaptive practice: ${asm?.title || 'Topic practice'}`,
          related_id: asm?.id,
        });
        if (awardRes?.profile) {
          const mapped = mapBackendProfileToProfile(awardRes.profile);
          setGamificationProfile(mapped);
          storage.saveGamificationProfile(mapped);
        } else {
          setGamificationProfile(storage.getGamificationProfile());
        }
        const [updatedXp, updatedBadges, updatedLeaderboard] = await Promise.all([
          gamificationApi.getXPHistory().catch(() => null),
          gamificationApi.getBadges().catch(() => null),
          gamificationApi.getLeaderboard().catch(() => null),
        ]);
        if (updatedXp?.items) setXpEvents(updatedXp.items.map(mapBackendXPToXPEvent));
        else setXpEvents(storage.getXPEvents());
        if (updatedBadges?.items) setBadges(updatedBadges.items.map(mapBackendBadgeToBadge));
        const lbItems = updatedLeaderboard?.entries || updatedLeaderboard?.leaderboard;
        if (lbItems) setLeaderboard(lbItems.map(mapBackendLeaderboardToLeaderboard));
        else setLeaderboard(storage.getLeaderboard());
      } else {
        setGamificationProfile(storage.getGamificationProfile());
        setXpEvents(storage.getXPEvents());
        setLeaderboard(storage.getLeaderboard());
      }
    } catch {
      setGamificationProfile(storage.getGamificationProfile());
      setXpEvents(storage.getXPEvents());
      setLeaderboard(storage.getLeaderboard());
    }

    const resultObj: StudentAssessmentResult = {
      id: `res-${Date.now()}`,
      sessionId: `sess-${Date.now()}`,
      assessmentId: res.assessmentId,
      assessmentTitle: asm?.title || 'Adaptive Practice Session',
      type: 'adaptive',
      studentId: currentStudent?.id || 'std-alex',
      courseId: crsId,
      topicId: topId,
      scorePercent: res.scorePercent,
      totalQuestions: res.totalQuestions,
      correctCount: res.correctCount,
      incorrectCount: res.incorrectCount,
      masteryStatus: res.masteryStatus,
      xpAwarded: res.xpAwarded,
      badgeAwarded: awardedBadge,
      nextRecommendedAction: {
        type: 'course_map',
        targetId: crsId,
        label: 'Return to Course Learning Map',
      },
      completedAt: new Date().toISOString(),
    };

    storage.saveAssessmentResult(resultObj);
    setLatestResult(resultObj);
    handleStudentNavigate('results');
    notify('success', `Adaptive practice complete! Mastery recalibrated.`);
  };

  const handleFinishExam = async (res: {
    assessmentId: string;
    scorePercent: number;
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    masteryStatus: any;
    xpAwarded: number;
    isCourseCompleted: boolean;
  }) => {
    const asm = assessments.find((a) => a.id === res.assessmentId);
    const crsId = asm?.courseId || courses[0]?.id || '';
    const topId = asm?.topicId || topics[topics.length - 1]?.id || '';

    storage.awardXP('exam_completed', res.xpAwarded, `Completed Final Examination: ${asm?.title || 'Course Final'}`, asm?.id);

    let awardedBadge: Badge | undefined;
    if (res.isCourseCompleted) {
      awardedBadge = storage.unlockBadge('badge-exam-scholar');
      setBadges(storage.getBadges());
      // Update enrollment as completed
      const enr = enrollments.find((e) => e.courseId === crsId);
      if (enr) {
        enr.status = 'completed';
        enr.progressPercent = 100;
        enr.completedAt = new Date().toISOString();
        storage.saveEnrollment(enr);
        setEnrollments(storage.getEnrollments());
      }
    }

    try {
      if (authApi.getAccessToken()) {
        const awardRes = await gamificationApi.awardXP({
          event_type: 'exam_completed',
          xp_amount: res.xpAwarded,
          description: `Completed Final Examination: ${asm?.title || 'Course Final'}`,
          related_id: asm?.id,
        });
        if (awardRes?.profile) {
          const mapped = mapBackendProfileToProfile(awardRes.profile);
          setGamificationProfile(mapped);
          storage.saveGamificationProfile(mapped);
        } else {
          setGamificationProfile(storage.getGamificationProfile());
        }
        const [updatedXp, updatedBadges, updatedLeaderboard] = await Promise.all([
          gamificationApi.getXPHistory().catch(() => null),
          gamificationApi.getBadges().catch(() => null),
          gamificationApi.getLeaderboard().catch(() => null),
        ]);
        if (updatedXp?.items) setXpEvents(updatedXp.items.map(mapBackendXPToXPEvent));
        else setXpEvents(storage.getXPEvents());
        if (updatedBadges?.items) setBadges(updatedBadges.items.map(mapBackendBadgeToBadge));
        const lbItems = updatedLeaderboard?.entries || updatedLeaderboard?.leaderboard;
        if (lbItems) setLeaderboard(lbItems.map(mapBackendLeaderboardToLeaderboard));
        else setLeaderboard(storage.getLeaderboard());
      } else {
        setGamificationProfile(storage.getGamificationProfile());
        setXpEvents(storage.getXPEvents());
        setLeaderboard(storage.getLeaderboard());
      }
    } catch {
      setGamificationProfile(storage.getGamificationProfile());
      setXpEvents(storage.getXPEvents());
      setLeaderboard(storage.getLeaderboard());
    }

    const resultObj: StudentAssessmentResult = {
      id: `res-${Date.now()}`,
      sessionId: `sess-${Date.now()}`,
      assessmentId: res.assessmentId,
      assessmentTitle: asm?.title || 'Comprehensive Final Examination',
      type: 'final',
      studentId: currentStudent?.id || 'std-alex',
      courseId: crsId,
      topicId: topId,
      scorePercent: res.scorePercent,
      totalQuestions: res.totalQuestions,
      correctCount: res.correctCount,
      incorrectCount: res.incorrectCount,
      masteryStatus: res.masteryStatus,
      xpAwarded: res.xpAwarded,
      badgeAwarded: awardedBadge,
      nextRecommendedAction: {
        type: 'course_map',
        targetId: crsId,
        label: 'Review Course Completion Status',
      },
      completedAt: new Date().toISOString(),
    };

    storage.saveAssessmentResult(resultObj);
    setLatestResult(resultObj);
    handleStudentNavigate('results');
    notify('success', `Examination submitted! +${res.xpAwarded} XP awarded.`);
  };

  const refreshStudentCourseData = async () => {
    try {
      const [backendCourses, backendEnrollments, backendCompletions] = await Promise.all([
        coursesApi.listCourses(0, 50, 'catalog').catch(() => null),
        coursesApi.getMyEnrollments().catch(() => null),
        curriculumApi.getLessonCompletions().catch(() => null),
      ]);

      if (backendCompletions) {
        const mappedCompletions = backendCompletions.map(mapBackendCompletionToCompletion);
        setCompletions(mappedCompletions);
        storage.saveLessonCompletions(mappedCompletions);
      }

      if (backendCourses && backendCourses.length > 0) {
        const mappedCourses = backendCourses.map(mapBackendCourseToCourse);
        setCourses(mappedCourses);

        // Fetch course details for full syllabus hierarchy
        const detailPromises = backendCourses.map((c) =>
          coursesApi.getCourseDetail(c.id).catch(() => null)
        );
        const details = await Promise.all(detailPromises);

        const allTopics: Topic[] = [];
        const allLessons: Lesson[] = [];
        const allResources: LearningResource[] = [];

        for (const d of details) {
          if (!d) continue;
          const parsed = mapBackendCourseDetailToCurriculum(d);
          allTopics.push(...parsed.topics);
          allLessons.push(...parsed.lessons);
          allResources.push(...parsed.resources);
        }

        if (allTopics.length > 0) setTopics(allTopics);
        if (allLessons.length > 0) setLessons(allLessons);
        if (allResources.length > 0) setResources(allResources);
      }

      if (backendEnrollments) {
        const mappedEnrollments = backendEnrollments.map(mapBackendEnrollmentToEnrollment);
        setEnrollments(mappedEnrollments);

        // If enrolled courses exist, hydrate topic mastery states from backend
        if (backendEnrollments.length > 0) {
          const masteryPromises = backendEnrollments.map((e) =>
            masteryApi.getCourseMastery(e.course_id).catch(() => null)
          );
          const masteryResults = await Promise.all(masteryPromises);
          const allMastery: MasteryState[] = [];
          for (const m of masteryResults) {
            if (!m || !m.topics) continue;
            for (const item of m.topics) {
              allMastery.push(mapBackendMasteryToMasteryState(item));
            }
          }
          if (allMastery.length > 0) {
            setMasteryStates(allMastery);
          }
        }
      }

      // Hydrate Gamification & Leaderboard in parallel
      const [gProfile, gBadges, gXp, gLeaderboard] = await Promise.all([
        gamificationApi.getProfile().catch(() => null),
        gamificationApi.getBadges().catch(() => null),
        gamificationApi.getXPHistory().catch(() => null),
        gamificationApi.getLeaderboard().catch(() => null),
      ]);

      if (gProfile) {
        const mapped = mapBackendProfileToProfile(gProfile);
        setGamificationProfile(mapped);
        storage.saveGamificationProfile(mapped);
      }
      if (gBadges && gBadges.items) {
        const mappedBadges = gBadges.items.map(mapBackendBadgeToBadge);
        setBadges(mappedBadges);
        storage.saveBadges(mappedBadges);
      }
      if (gXp && gXp.items) {
        setXpEvents(gXp.items.map(mapBackendXPToXPEvent));
      }
      if (gLeaderboard) {
        const lbItems = gLeaderboard.entries || gLeaderboard.leaderboard;
        if (lbItems && lbItems.length > 0) {
          setLeaderboard(lbItems.map(mapBackendLeaderboardToLeaderboard));
        }
      }
    } catch (e) {
      console.warn('Failed to hydrate student course data from API:', e);
    }
  };

  const refreshTeacherCourseData = async () => {
    try {
      const backendCourses = await coursesApi.listCourses().catch(() => null);
      if (backendCourses) {
        const mappedCourses = backendCourses.map(mapBackendCourseToCourse);
        setCourses(mappedCourses);

        if (backendCourses.length === 0) {
          setTopics([]);
          setLessons([]);
          setResources([]);
          setQuestions([]);
          setAssessments([]);
          return;
        }

        const detailPromises = backendCourses.map((c) =>
          coursesApi.getCourseDetail(c.id).catch(() => null)
        );
        const details = await Promise.all(detailPromises);

        const allTopics: Topic[] = [];
        const allLessons: Lesson[] = [];
        const allResources: LearningResource[] = [];

        for (const d of details) {
          if (!d) continue;
          const parsed = mapBackendCourseDetailToCurriculum(d);
          allTopics.push(...parsed.topics);
          allLessons.push(...parsed.lessons);
          allResources.push(...parsed.resources);
        }

        setTopics(allTopics);
        setLessons(allLessons);
        setResources(allResources);

        // Fetch questions and assessments across ALL teacher courses
        const questionPromises = backendCourses.map((c) =>
          teacherApi.listQuestions(c.id).catch(() => [])
        );
        const assessmentPromises = backendCourses.map((c) =>
          teacherApi.listAssessments(c.id).catch(() => [])
        );

        const [questionsByCourse, assessmentsByCourse] = await Promise.all([
          Promise.all(questionPromises),
          Promise.all(assessmentPromises),
        ]);

        const allQuestions = questionsByCourse.flat().filter(Boolean).map(mapBackendQuestionToQuestionData);
        const allAssessments = assessmentsByCourse.flat().filter(Boolean).map(mapBackendAssessmentToAssessment);

        setQuestions(allQuestions);
        setAssessments(allAssessments);
      } else {
        setCourses([]);
        setTopics([]);
        setLessons([]);
        setResources([]);
        setQuestions([]);
        setAssessments([]);
      }
    } catch (e) {
      console.warn('Failed to hydrate teacher course data from API:', e);
    }
  };

  const refreshAdminData = async () => {
    try {
      const [usersRes, auditRes, healthRes, dashboardRes, coursesRes] = await Promise.all([
        adminApi.listUsers({ page_size: 100 }).catch(() => null),
        adminApi.getAuditLogs({ page_size: 100 }).catch(() => null),
        adminApi.getSystemHealth().catch(() => null),
        adminApi.getAdminDashboard().catch(() => null),
        coursesApi.listCourses().catch(() => null),
      ]);

      if (usersRes && usersRes.items) {
        setAllUsers(usersRes.items.map(mapBackendUserToUserAccount));
      }
      if (auditRes && auditRes.items) {
        setAuditEvents(auditRes.items.map(mapBackendAuditToAuditEvent));
      }
      if (healthRes) {
        setServiceHealth(mapBackendHealthToServiceHealth(healthRes));
      }
      if (dashboardRes) {
        setAdminDashboardData(dashboardRes);
      }
      if (coursesRes && coursesRes.length > 0) {
        setCourses(coursesRes.map(mapBackendCourseToCourse));
      }
    } catch (e) {
      console.warn('Failed to hydrate admin data from API:', e);
    }
  };

  const refreshPublicData = async () => {
    try {
      const [backendCourses, leaderboardRes] = await Promise.all([
        coursesApi.listCourses().catch(() => null),
        gamificationApi.getLeaderboard().catch(() => null),
      ]);

      if (backendCourses && backendCourses.length > 0) {
        const mappedCourses = backendCourses.map(mapBackendCourseToCourse);
        setCourses(mappedCourses);

        const detailPromises = backendCourses.map((c) =>
          coursesApi.getCourseDetail(c.id).catch(() => null)
        );
        const details = await Promise.all(detailPromises);
        const allTopics: Topic[] = [];
        const allLessons: Lesson[] = [];
        const allResources: LearningResource[] = [];

        for (const d of details) {
          if (!d) continue;
          const parsed = mapBackendCourseDetailToCurriculum(d);
          allTopics.push(...parsed.topics);
          allLessons.push(...parsed.lessons);
          allResources.push(...parsed.resources);
        }

        setTopics(allTopics);
        setLessons(allLessons);
        setResources(allResources);
      } else {
        setCourses([]);
        setTopics([]);
        setLessons([]);
        setResources([]);
      }

      const lbItems = leaderboardRes?.entries || leaderboardRes?.leaderboard;
      if (lbItems && lbItems.length > 0) {
        setLeaderboard(lbItems.map(mapBackendLeaderboardToLeaderboard));
      }
    } catch (e) {
      console.warn('Failed to hydrate public course data from API:', e);
    }
  };

  // Restore live session on mount from localStorage / refresh cookie and hydrate data
  useEffect(() => {
    let isMounted = true;

    const restoreAndHydrateSession = async () => {
      try {
        const user = await authApi.restoreSession();
        if (!isMounted) return;

        if (user) {
          setCurrentUserAccount(user);
          setIsAuthenticated(true);
          const savedPortal = storage.getPersistedPortalMode();
          const targetPortal = (initialRoute?.portal as 'student' | 'teacher' | 'admin') || savedPortal;

          if (user.role === 'student') {
            const student = mapUserResponseToStudentUser(user);
            setCurrentStudent(student);
            storage.saveStudentUser(student);
            if (!isRootPath && initialRoute?.portal !== 'public') {
              setPortalMode(targetPortal || 'student', false);
            }
            // Await live hydration before dismissing loading screen
            await refreshStudentCourseData();
          } else if (user.role === 'teacher') {
            if (!isRootPath && initialRoute?.portal !== 'public') {
              setPortalMode(targetPortal || 'teacher', false);
            }
            await refreshTeacherCourseData();
          } else if (user.role === 'administrator') {
            const adminAccount: UserAccount = {
              id: user.id,
              name: user.full_name,
              email: user.email,
              role: 'administrator',
              isActive: user.is_active,
              createdAt: user.created_at,
              lastActiveAt: user.created_at,
              department: user.profile?.department || undefined,
              avatar: user.profile?.avatar_url || undefined,
            };
            setCurrentAdmin(adminAccount);
            storage.saveAdminUser(adminAccount);
            if (!isRootPath && initialRoute?.portal !== 'public') {
              setPortalMode(targetPortal || 'admin', false);
            }
            await refreshAdminData();
          }
        } else {
          // No active session restored (token expired, 401 on /me, or unauthenticated)
          authApi.clearSession();
          storage.clearSessionCredentials();
          setCurrentUserAccount(null);
          setCurrentStudent(null);
          setCurrentAdmin(null);
          setIsAuthenticated(false);
          await refreshPublicData();
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
        authApi.clearSession();
        storage.clearSessionCredentials();
        setCurrentUserAccount(null);
        setCurrentStudent(null);
        setCurrentAdmin(null);
        setIsAuthenticated(false);
        await refreshPublicData();
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };

    restoreAndHydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronize browser history and handle Back/Forward button clicks (popstate)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const routeState = (event.state as AppRouteState) || parseUrlToRoute(window.location.pathname, window.location.search);
      if (!routeState) return;

      setPortalModeState(routeState.portal);
      storage.setPersistedPortalMode(routeState.portal);

      if (routeState.portal === 'public') {
        setPublicPage(routeState.page as PublicNavigationPage);
        setPublicNavParams(routeState.params || {});
      } else if (routeState.portal === 'student') {
        setStudentPage(routeState.page as StudentNavigationPage);
        setStudentNavParams(routeState.params || {});
      } else if (routeState.portal === 'teacher') {
        setTeacherPage(routeState.page as TeacherNavigationPage);
        setTeacherNavParams(routeState.params || {});
      } else if (routeState.portal === 'admin') {
        setAdminPage(routeState.page as AdminNavigationPage);
        setAdminNavParams(routeState.params || {});
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);

    // Initial URL synchronization: Ensure the browser URL accurately reflects active portal and page
    if (typeof window !== 'undefined') {
      const activePortal = isRootPath ? 'public' : (initialRoute?.portal || portalMode);
      const activePage = isRootPath
        ? 'landing'
        : (activePortal === 'public'
          ? publicPage
          : activePortal === 'student'
          ? studentPage
          : activePortal === 'teacher'
          ? teacherPage
          : adminPage);
      const activeParams = isRootPath
        ? {}
        : (activePortal === 'public'
          ? publicNavParams
          : activePortal === 'student'
          ? studentNavParams
          : activePortal === 'teacher'
          ? teacherNavParams
          : adminNavParams);
      replaceHistoryState(activePortal, activePage, activeParams);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleAuthSuccess = (user: UserResponse, token: string) => {
    authApi.setAccessToken(token);
    authApi.setStoredUser(user);
    setCurrentUserAccount(user);
    setIsAuthenticated(true);

    if (user.role === 'student') {
      const student = mapUserResponseToStudentUser(user);
      setCurrentStudent(student);
      storage.saveStudentUser(student);
      setPortalMode('student', false);
      const targetPage = initialRoute?.portal === 'student' ? (initialRoute.page as StudentNavigationPage) : 'dashboard';
      setStudentPage(targetPage);
      pushHistoryState('student', targetPage, initialRoute?.portal === 'student' ? initialRoute.params : undefined);
      refreshStudentCourseData();
      notify('success', `Welcome back, ${user.full_name}!`);
    } else if (user.role === 'teacher') {
      setPortalMode('teacher', false);
      const targetPage = initialRoute?.portal === 'teacher' ? (initialRoute.page as TeacherNavigationPage) : 'overview';
      setTeacherPage(targetPage);
      pushHistoryState('teacher', targetPage, initialRoute?.portal === 'teacher' ? initialRoute.params : undefined);
      refreshTeacherCourseData();
      notify('success', `Welcome to the Teacher Portal, ${user.full_name}!`);
    } else if (user.role === 'administrator') {
      const adminAccount: UserAccount = {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: 'administrator',
        isActive: user.is_active,
        createdAt: user.created_at,
        lastActiveAt: user.created_at,
        department: user.profile?.department || undefined,
        avatar: user.profile?.avatar_url || undefined,
      };
      setCurrentAdmin(adminAccount);
      storage.saveAdminUser(adminAccount);
      setPortalMode('admin', false);
      const targetPage = initialRoute?.portal === 'admin' ? (initialRoute.page as AdminNavigationPage) : 'dashboard';
      setAdminPage(targetPage);
      pushHistoryState('admin', targetPage, initialRoute?.portal === 'admin' ? initialRoute.params : undefined);
      refreshAdminData();
      notify('success', `Administrator access granted: ${user.full_name}`);
    }
  };

  const handleGlobalSignOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors during logout
    }
    storage.clearSessionCredentials();
    authApi.setAccessToken(null);
    authApi.setStoredUser(null);
    setCurrentUserAccount(null);
    setCurrentStudent(null);
    setCurrentAdmin(null);
    setIsAuthenticated(false);
    setStudentPage('dashboard');
    replaceHistoryState('student', 'dashboard');
    notify('info', 'You have been signed out.');
    refreshPublicData();
  };

  const handleUpdateStudentProfile = (updated: StudentUser) => {
    storage.saveStudentUser(updated);
    setCurrentStudent(updated);
    setLeaderboard(storage.getLeaderboard());
  };

  const handleStudentSignOut = handleGlobalSignOut;

  const handleStudentSignInSuccess = (user: StudentUser) => {
    storage.saveStudentUser(user);
    setCurrentStudent(user);
    setStudentPage('dashboard');
    notify('success', `Welcome back, ${user.name}!`);
    refreshStudentCourseData();
  };

  // Compute breadcrumbs for student layout
  const getStudentBreadcrumbs = () => {
    const list: Array<{ label: string; page?: StudentNavigationPage; params?: Record<string, string> }> = [];

    if (studentPage === 'dashboard') {
      list.push({ label: 'Dashboard' });
    } else if (studentPage === 'catalog') {
      list.push({ label: 'Course Catalog' });
    } else if (studentPage === 'course_details') {
      const crs = courses.find((c) => c.id === studentNavParams.courseId);
      list.push({ label: 'Course Catalog', page: 'catalog' });
      list.push({ label: crs?.title || 'Course Details' });
    } else if (studentPage === 'my_learning') {
      list.push({ label: 'My Learning' });
    } else if (studentPage === 'course_map') {
      const crs = courses.find((c) => c.id === studentNavParams.courseId);
      list.push({ label: 'My Learning', page: 'my_learning' });
      list.push({ label: crs?.title || 'Course Learning Map' });
    } else if (studentPage === 'lesson') {
      const crs = courses.find((c) => c.id === studentNavParams.courseId);
      const lsn = lessons.find((l) => l.id === studentNavParams.lessonId);
      list.push({ label: crs?.title || 'Course', page: 'course_map', params: { courseId: crs?.id || '' } });
      list.push({ label: lsn?.title || 'Lesson Workspace' });
    } else if (studentPage === 'simplification_studio') {
      const crs = courses.find((c) => c.id === studentNavParams.courseId);
      const lsn = lessons.find((l) => l.id === studentNavParams.lessonId);
      list.push({ label: crs?.title || 'Course', page: 'course_map', params: { courseId: crs?.id || '' } });
      if (lsn) {
        list.push({
          label: lsn.title,
          page: 'lesson',
          params: { courseId: crs?.id || '', topicId: studentNavParams.topicId || '', lessonId: lsn.id },
        });
      }
      list.push({ label: 'AI Simplification Studio' });
    } else if (studentPage === 'diagnostic_intro') {
      list.push({ label: 'Course Learning Map', page: 'course_map' });
      list.push({ label: 'Diagnostic Assessment Introduction' });
    } else if (studentPage === 'results') {
      list.push({ label: 'Assessment Results' });
    } else if (studentPage === 'progress') {
      list.push({ label: 'Progress & Mastery' });
    } else if (studentPage === 'achievements') {
      list.push({ label: 'Achievements & Badges' });
    } else if (studentPage === 'xp_history') {
      list.push({ label: 'XP Activity History' });
    } else if (studentPage === 'leaderboard') {
      list.push({ label: 'Leaderboard' });
    } else if (studentPage === 'profile') {
      list.push({ label: 'Profile & Settings' });
    }

    return list;
  };

  // =========================================================================
  // VIEW ROUTING: AUTHENTICATION GATE & SESSION RESTORE
  // =========================================================================
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F1218] flex flex-col items-center justify-center p-4 font-sans">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-2xl shadow-xl shadow-indigo-500/25">
            L
          </div>
          <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-500/30 border-t-indigo-600 animate-spin" />
        </div>
        <p className="text-base font-bold text-gray-800 dark:text-gray-100 tracking-tight">
          Loading your learning dashboard...
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          Synchronizing verified achievements & courses
        </p>
      </div>
    );
  }

  // =========================================================================
  // VIEW ROUTING: PUBLIC SITE (LANDING, ABOUT, CONTACT)
  // =========================================================================
  if (portalMode === 'public') {
    const studentUser = currentUserAccount?.role === 'student'
      ? {
          id: currentUserAccount.id,
          name: currentUserAccount.full_name || currentUserAccount.email,
          email: currentUserAccount.email,
          role: 'student' as const,
          joinDate: currentUserAccount.created_at || '',
          preferences: { theme: 'dark' as const, leaderboardOptIn: true, emailNotifications: true },
        }
      : null;

    if (publicPage === 'about') {
      return (
        <AboutPage
          currentStudent={studentUser}
          currentUser={currentUserAccount}
          onNavigate={handlePublicActionNavigate}
          onSwitchToTeacher={() => {
            if (currentUserAccount && (currentUserAccount.role === 'teacher' || currentUserAccount.role === 'administrator')) {
              setPortalMode('teacher');
              setTeacherPage('overview');
            } else {
              setPortalMode('student');
              setStudentPage('sign_in');
              notify('info', 'Please sign in with your teacher credentials to access the Teacher Portal.');
            }
          }}
          onSwitchToAdmin={() => {
            if (currentUserAccount && currentUserAccount.role === 'administrator') {
              setPortalMode('admin');
              setAdminPage('dashboard');
            } else {
              setPortalMode('student');
              setStudentPage('sign_in');
              notify('info', 'Please sign in with your administrator credentials to access the Administrator Portal.');
            }
          }}
        />
      );
    }

    if (publicPage === 'contact') {
      return (
        <ContactPage
          currentStudent={studentUser}
          currentUser={currentUserAccount}
          serviceHealth={serviceHealth}
          onNavigate={handlePublicActionNavigate}
          onSwitchToTeacher={() => {
            if (currentUserAccount && (currentUserAccount.role === 'teacher' || currentUserAccount.role === 'administrator')) {
              setPortalMode('teacher');
              setTeacherPage('overview');
            } else {
              setPortalMode('student');
              setStudentPage('sign_in');
              notify('info', 'Please sign in with your teacher credentials to access the Teacher Portal.');
            }
          }}
          onSwitchToAdmin={() => {
            if (currentUserAccount && currentUserAccount.role === 'administrator') {
              setPortalMode('admin');
              setAdminPage('dashboard');
            } else {
              setPortalMode('student');
              setStudentPage('sign_in');
              notify('info', 'Please sign in with your administrator credentials to access the Administrator Portal.');
            }
          }}
        />
      );
    }

    // Default to Landing Page
    return (
      <LandingPage
        courses={courses}
        enrollments={enrollments}
        leaderboard={leaderboard}
        currentStudent={studentUser}
        currentUser={currentUserAccount}
        navParams={publicNavParams}
        onNavigate={handlePublicActionNavigate}
        onSwitchToTeacher={() => {
          if (currentUserAccount && (currentUserAccount.role === 'teacher' || currentUserAccount.role === 'administrator')) {
            setPortalMode('teacher');
            setTeacherPage('overview');
          } else {
            setPortalMode('student');
            setStudentPage('sign_in');
            notify('info', 'Please sign in with your teacher credentials to access the Teacher Portal.');
          }
        }}
        onSwitchToAdmin={() => {
          if (currentUserAccount && currentUserAccount.role === 'administrator') {
            setPortalMode('admin');
            setAdminPage('dashboard');
          } else {
            setPortalMode('student');
            setStudentPage('sign_in');
            notify('info', 'Please sign in with your administrator credentials to access the Administrator Portal.');
          }
        }}
        onEnrollCourse={async (courseId) => {
          if (currentUserAccount) {
            await handleEnrollCourse(courseId);
          } else {
            setPortalMode('student');
            setStudentPage('sign_in');
          }
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // =========================================================================
  // VIEW ROUTING: STUDENT PORTAL
  // =========================================================================
  if (portalMode === 'student') {
    if (!currentStudent || studentPage === 'sign_in' || studentPage === 'register') {
      return (
        <AuthPage
          initialMode={studentPage === 'register' ? 'register' : 'signin'}
          onAuthSuccess={handleAuthSuccess}
        />
      );
    }

    // Full-screen distraction-minimized Assessment Players
    if (studentPage === 'diagnostic_player') {
      const asm = assessments.find((a) => a.id === studentNavParams.assessmentId) || assessments.find((a) => a.type === 'diagnostic') || assessments[0];
      return (
        <DiagnosticPlayerPage
          assessment={asm}
          questions={questions}
          onFinishDiagnostic={handleFinishDiagnostic}
          onExit={() => handleStudentNavigate('course_map', { courseId: asm?.courseId || '' })}
        />
      );
    }

    if (studentPage === 'practice_player') {
      const asm = assessments.find((a) => a.id === studentNavParams.assessmentId) || assessments.find((a) => a.type === 'adaptive') || assessments[0];
      return (
        <AdaptivePracticePlayerPage
          assessment={asm}
          questions={questions}
          onFinishPractice={handleFinishPractice}
          onExit={() => handleStudentNavigate('course_map', { courseId: asm?.courseId || '' })}
        />
      );
    }

    if (studentPage === 'exam_player') {
      const asm = assessments.find((a) => a.id === studentNavParams.assessmentId) || assessments.find((a) => a.type === 'final') || assessments[0];
      return (
        <FinalExamPlayerPage
          assessment={asm}
          questions={questions}
          onFinishExam={handleFinishExam}
          onExit={() => handleStudentNavigate('course_map', { courseId: asm?.courseId || '' })}
        />
      );
    }

    // Standard Student Pages inside StudentLayout Shell
    return (
      <StudentLayout
        currentPage={studentPage}
        onNavigate={handleStudentNavigate}
        currentUser={currentStudent}
        gamificationProfile={gamificationProfile}
        toasts={toasts}
        onDismissToast={handleDismissToast}
        onSignOut={handleStudentSignOut}
        breadcrumbs={getStudentBreadcrumbs()}
      >
        {/* STU-03: Dashboard */}
        {studentPage === 'dashboard' && (
          <StudentDashboardPage
            currentUser={currentStudent}
            gamificationProfile={gamificationProfile}
            enrollments={enrollments}
            courses={courses}
            topics={topics}
            lessons={lessons}
            masteryStates={masteryStates}
            badges={badges}
            recentAttempts={attempts}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-04: Course Catalog */}
        {studentPage === 'catalog' && (
          <CourseCatalogPage
            courses={courses}
            topics={topics}
            enrollments={enrollments}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-05: Course Details & Enrollment */}
        {studentPage === 'course_details' && (
          <CourseDetailsPage
            courseId={studentNavParams.courseId || courses[0]?.id || ''}
            courses={courses}
            topics={topics}
            lessons={lessons}
            enrollments={enrollments}
            onEnroll={handleEnrollCourse}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-06: My Learning */}
        {studentPage === 'my_learning' && (
          <MyLearningPage
            courses={courses}
            topics={topics}
            lessons={lessons}
            enrollments={enrollments}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-07: Course Learning Map */}
        {studentPage === 'course_map' && (
          <CourseLearningMapPage
            courseId={studentNavParams.courseId || enrollments[0]?.courseId || courses[0]?.id || ''}
            courses={courses}
            topics={topics}
            lessons={lessons}
            resources={resources}
            enrollments={enrollments}
            masteryStates={masteryStates}
            assessments={assessments}
            completedLessonIds={new Set(completions.map((c) => c.lessonId))}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-08: Lesson Workspace & Resources */}
        {studentPage === 'lesson' && (
          <LessonWorkspacePage
            courseId={studentNavParams.courseId || courses[0]?.id || ''}
            topicId={studentNavParams.topicId || topics[0]?.id || ''}
            lessonId={studentNavParams.lessonId || lessons[0]?.id || ''}
            courses={courses}
            topics={topics}
            lessons={lessons}
            resources={resources}
            isCompleted={completions.some((c) => c.lessonId === (studentNavParams.lessonId || lessons[0]?.id))}
            onMarkComplete={handleMarkLessonComplete}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-08b: Dedicated AI Simplification Studio */}
        {studentPage === 'simplification_studio' && (
          <SimplificationStudioPage
            courseId={studentNavParams.courseId || courses[0]?.id || ''}
            topicId={studentNavParams.topicId || topics[0]?.id || ''}
            lessonId={studentNavParams.lessonId || lessons[0]?.id || ''}
            courses={courses}
            topics={topics}
            lessons={lessons}
            resources={resources}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-09: Diagnostic Assessment Introduction */}
        {studentPage === 'diagnostic_intro' && (
          <DiagnosticIntroPage
            assessmentId={studentNavParams.assessmentId || assessments.find((a) => a.type === 'diagnostic')?.id || ''}
            assessments={assessments}
            courses={courses}
            topics={topics}
            onStartDiagnostic={(id) => handleStudentNavigate('diagnostic_player', { assessmentId: id })}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-13: Assessment Results */}
        {studentPage === 'results' && latestResult && (
          <AssessmentResultsPage
            result={latestResult}
            course={courses.find((c) => c.id === latestResult.courseId)}
            topic={topics.find((t) => t.id === latestResult.topicId)}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-14: Progress and Analytics */}
        {studentPage === 'progress' && (
          <ProgressAnalyticsPage
            courses={courses}
            topics={topics}
            lessons={lessons}
            masteryStates={masteryStates}
            attempts={attempts}
            completions={completions}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-15: Achievements & Badges */}
        {studentPage === 'achievements' && (
          <AchievementsBadgesPage
            badges={badges}
            gamificationProfile={gamificationProfile}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-16: XP Activity History */}
        {studentPage === 'xp_history' && (
          <XPActivityHistoryPage
            xpEvents={xpEvents}
            gamificationProfile={gamificationProfile}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-17: Leaderboard */}
        {studentPage === 'leaderboard' && (
          <LeaderboardPage
            leaderboard={leaderboard}
            currentStudentId={currentStudent.id}
            onNavigate={handleStudentNavigate}
          />
        )}

        {/* STU-18: Profile and Settings */}
        {studentPage === 'profile' && (
          <ProfileSettingsPage
            currentUser={currentStudent}
            gamificationProfile={gamificationProfile}
            onUpdateProfile={handleUpdateStudentProfile}
            onSignOut={handleStudentSignOut}
            onNotify={notify}
            onNavigate={handleStudentNavigate}
          />
        )}
      </StudentLayout>
    );
  }

  // =========================================================================
  // VIEW ROUTING: ADMINISTRATOR PORTAL
  // =========================================================================
  if (portalMode === 'admin') {
    if (!currentUserAccount || currentUserAccount.role !== 'administrator') {
      return (
        <AuthPage
          initialMode="signin"
          onAuthSuccess={handleAuthSuccess}
        />
      );
    }

    return (
      <AdminLayout
        currentPage={adminPage}
        onNavigate={handleAdminNavigate}
        currentAdmin={currentAdmin || {
          id: currentUserAccount.id,
          name: currentUserAccount.full_name,
          email: currentUserAccount.email,
          role: 'administrator',
          isActive: currentUserAccount.is_active,
          createdAt: currentUserAccount.created_at,
          lastActiveAt: currentUserAccount.created_at,
          department: currentUserAccount.profile?.department || 'Platform Governance',
          avatar: currentUserAccount.profile?.avatar_url || undefined,
        }}
        toasts={toasts}
        onDismissToast={handleDismissToast}
        onSignOut={handleAdminSignOut}
        breadcrumbs={getAdminBreadcrumbs()}
      >
        {/* ADM-01: Admin Dashboard */}
        {adminPage === 'dashboard' && (
          <AdminDashboardPage
            users={allUsers}
            auditEvents={auditEvents}
            serviceHealth={serviceHealth}
            onNavigate={handleAdminNavigate}
            dashboardData={adminDashboardData}
          />
        )}

        {/* ADM-02: User Management */}
        {adminPage === 'users' && (
          <UserManagementPage
            users={allUsers}
            currentAdminId={currentAdmin.id}
            onNavigate={handleAdminNavigate}
            onRequestRoleChange={(u) => setRoleModalUser(u)}
            onRequestStatusChange={(u) => setStatusModalUser(u)}
          />
        )}

        {/* ADM-03: User Details */}
        {adminPage === 'user_details' && (
          <UserDetailsPage
            userId={adminNavParams.userId || allUsers[0]?.id || ''}
            users={allUsers}
            auditEvents={auditEvents}
            currentAdminId={currentAdmin.id}
            onNavigate={handleAdminNavigate}
            onRequestRoleChange={(u) => setRoleModalUser(u)}
            onRequestStatusChange={(u) => setStatusModalUser(u)}
          />
        )}

        {/* ADM-04: Roles & Access */}
        {adminPage === 'roles' && (
          <RolesAccessPage
            users={allUsers}
            currentAdminId={currentAdmin.id}
            onConfirmRoleChange={handleConfirmRoleChange}
          />
        )}

        {/* ADM-05: Security Audit Log */}
        {adminPage === 'audit' && (
          <SecurityAuditLogPage
            auditEvents={auditEvents}
          />
        )}

        {/* ADM-06: System Health */}
        {adminPage === 'health' && (
          <SystemHealthPage
            serviceHealth={serviceHealth}
            onRefreshHealth={handleRefreshHealth}
          />
        )}

        {/* ADM-07: Profile & Security */}
        {adminPage === 'profile' && (
          <AdminProfileSecurityPage
            currentAdmin={currentAdmin}
            onUpdateAdminProfile={handleUpdateAdminProfile}
            onUpdatePassword={handleUpdateAdminPassword}
            onSignOut={handleAdminSignOut}
            onNotify={notify}
          />
        )}

        {/* ADM-08*: Course Oversight */}
        {adminPage === 'oversight' && (
          <CourseOversightPage
            courses={courses}
            topics={topics}
            lessons={lessons}
            users={allUsers}
            enrollments={enrollments}
          />
        )}

        {/* Change Role Modal */}
        <ChangeRoleModal
          isOpen={roleModalUser !== null}
          onClose={() => setRoleModalUser(null)}
          targetUser={roleModalUser}
          currentAdminId={currentAdmin.id}
          onConfirmRoleChange={handleConfirmRoleChange}
        />

        {/* Deactivate / Reactivate Account Modal */}
        <DeactivateAccountModal
          isOpen={statusModalUser !== null}
          onClose={() => setStatusModalUser(null)}
          targetUser={statusModalUser}
          currentAdminId={currentAdmin.id}
          onConfirmStatusChange={handleConfirmStatusChange}
        />
      </AdminLayout>
    );
  }

  // =========================================================================
  // VIEW ROUTING: TEACHER PORTAL (Preserved intact)
  // =========================================================================
  const activeCourseId = teacherNavParams.courseId || courses[0]?.id;
  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  const handleSaveCourse = async (c: Course) => {
    try {
      if (authApi.getAccessToken()) {
        const existing = courses.find((item) => item.id === c.id);
        if (existing && isUuid(c.id)) {
          if (c.status === 'published' && existing.status !== 'published') {
            await teacherApi.publishCourse(c.id);
          } else if (c.status === 'archived' && existing.status !== 'archived') {
            await teacherApi.archiveCourse(c.id);
          } else if (c.status === 'draft' && existing.status !== 'draft') {
            await teacherApi.draftCourse(c.id);
          }
          await teacherApi.updateCourse(c.id, {
            title: c.title,
            description: c.description,
          });
        } else {
          const created = await teacherApi.createCourse({
            title: c.title,
            description: c.description,
          });
          if (created && created.id) {
            c.id = created.id;
          }
        }
        storage.saveCourse(c);
        await refreshTeacherCourseData();
        notify('success', `Course "${c.title}" saved.`);
        return;
      }
    } catch (err: any) {
      console.warn('Backend course save error:', err);
      notify('error', err.message || 'Failed to save course to database.');
      return;
    }
    storage.saveCourse(c);
    setCourses(storage.getCourses());
    notify('success', `Course "${c.title}" saved.`);
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      if (authApi.getAccessToken() && isUuid(id)) {
        await teacherApi.deleteCourse(id);
        await refreshTeacherCourseData();
        notify('info', 'Course deleted from system.');
        return;
      }
    } catch (err: any) {
      console.warn('Backend course delete error:', err);
      notify('error', err.message || 'Failed to delete course.');
      return;
    }
    storage.deleteCourse(id);
    setCourses(storage.getCourses());
    notify('info', 'Course deleted.');
  };

  const handleSaveTopic = async (t: Topic): Promise<Topic> => {
    let savedTopic = { ...t };
    const rawThreshold = Number(t.masteryThreshold);
    const normalizedThreshold =
      !isNaN(rawThreshold) && rawThreshold > 1 ? rawThreshold / 100 : (!isNaN(rawThreshold) ? rawThreshold : 0.75);

    try {
      if (authApi.getAccessToken() && isUuid(t.courseId)) {
        const existing = topics.find((item) => item.id === t.id);
        if (existing && isUuid(t.id)) {
          await teacherApi.updateTopic(t.id, {
            title: t.title,
            description: t.description,
            order: t.order,
            mastery_threshold: normalizedThreshold,
          });
          if (t.prerequisiteTopicIds && t.prerequisiteTopicIds.every(isUuid)) {
            await teacherApi.updateTopicPrerequisites(t.id, t.prerequisiteTopicIds);
          }
        } else if (isUuid(t.courseId)) {
          const created = await teacherApi.createTopic(t.courseId, {
            title: t.title,
            description: t.description,
            order: t.order,
            mastery_threshold: normalizedThreshold,
          });
          if (created && created.id) {
            savedTopic.id = created.id;
          }
          if (t.prerequisiteTopicIds && t.prerequisiteTopicIds.length > 0 && t.prerequisiteTopicIds.every(isUuid)) {
            await teacherApi.updateTopicPrerequisites(savedTopic.id, t.prerequisiteTopicIds);
          }
        }
      }
    } catch (err: any) {
      console.warn('Backend topic save notice:', err);
      notify('error', err.message || 'Failed to sync topic with server');
      throw err;
    }
    setTopics((prev) => {
      const idx = prev.findIndex((item) => item.id === savedTopic.id || item.id === t.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedTopic;
        return next;
      }
      return [...prev, savedTopic];
    });
    await refreshTeacherCourseData();
    return savedTopic;
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      if (authApi.getAccessToken() && isUuid(id)) {
        await teacherApi.deleteTopic(id);
      }
    } catch (err: any) {
      console.warn('Backend topic delete notice:', err);
    }
    setTopics((prev) => prev.filter((t) => t.id !== id));
    setLessons((prev) => prev.filter((l) => l.topicId !== id));
    await refreshTeacherCourseData();
  };

  const handleSaveLesson = async (l: Lesson): Promise<Lesson> => {
    let savedLesson = { ...l };
    try {
      if (authApi.getAccessToken() && isUuid(l.topicId)) {
        const existing = lessons.find((item) => item.id === l.id);
        if (existing && isUuid(l.id)) {
          await teacherApi.updateLesson(l.id, {
            title: l.title,
            description: l.description,
            order: l.order,
          });
        } else if (isUuid(l.topicId)) {
          const created = await teacherApi.createLesson(l.topicId, {
            title: l.title,
            description: l.description,
            order: l.order,
          });
          if (created && created.id) {
            savedLesson.id = created.id;
          }
        }
      }
    } catch (err: any) {
      console.warn('Backend lesson save notice:', err);
      notify('error', err.message || 'Failed to sync lesson with server');
      throw err;
    }
    setLessons((prev) => {
      const idx = prev.findIndex((item) => item.id === savedLesson.id || item.id === l.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedLesson;
        return next;
      }
      return [...prev, savedLesson];
    });
    await refreshTeacherCourseData();
    return savedLesson;
  };

  const handleDeleteLesson = async (id: string) => {
    try {
      if (authApi.getAccessToken() && isUuid(id)) {
        await teacherApi.deleteLesson(id);
      }
    } catch (err: any) {
      console.warn('Backend lesson delete notice:', err);
    }
    setLessons((prev) => prev.filter((l) => l.id !== id));
    setResources((prev) => prev.filter((r) => r.lessonId !== id));
    await refreshTeacherCourseData();
  };

  const handleSaveResource = async (r: LearningResource) => {
    try {
      if (authApi.getAccessToken()) {
        const existing = resources.find((item) => item.id === r.id);
        if (existing) {
          await teacherApi.updateResource(r.id, {
            title: r.title,
            type: r.type,
            content_or_url: r.contentOrUrl,
          });
        } else {
          const created = await teacherApi.createResource(r.lessonId, {
            title: r.title,
            type: r.type,
            content_or_url: r.contentOrUrl,
          });
          if (created && created.id) {
            r.id = created.id;
          }
        }
      }
    } catch (err: any) {
      console.warn('Backend resource save notice:', err);
    }
    storage.saveResource(r);
    setResources(storage.getResources());
    notify('success', 'Resource saved.');
  };

  const handleDeleteResource = async (id: string) => {
    try {
      if (authApi.getAccessToken()) {
        await teacherApi.deleteResource(id);
      }
    } catch (err: any) {
      console.warn('Backend resource delete notice:', err);
    }
    storage.deleteResource(id);
    setResources(storage.getResources());
    notify('info', 'Resource removed.');
  };

  const handleSaveQuestion = async (q: QuestionData) => {
    try {
      if (authApi.getAccessToken()) {
        const existing = questions.find((item) => item.id === q.id);
        if (existing && isUuid(q.id)) {
          await teacherApi.updateQuestion(q.id, {
            prompt: q.prompt,
            explanation: q.explanation,
            difficulty: q.difficulty,
            points: q.points,
            options: q.options?.map((opt) => ({
              id: opt.id,
              text: opt.text,
              is_correct: opt.isCorrect,
            })),
            correct_bool: q.correctBool,
            accepted_answers: q.acceptedAnswers,
            matching_pairs: q.matchingPairs?.map((pair) => ({
              id: pair.id,
              left: pair.left,
              right: pair.right,
            })),
            expected_rubric: q.expectedRubric,
          });
        } else {
          const created = await teacherApi.createQuestion({
            course_id: q.courseId,
            topic_id: q.topicId,
            type: q.type,
            difficulty: q.difficulty,
            points: q.points,
            prompt: q.prompt,
            explanation: q.explanation,
            options: q.options?.map((opt) => ({
              id: opt.id,
              text: opt.text,
              is_correct: opt.isCorrect,
            })),
            correct_bool: q.correctBool,
            accepted_answers: q.acceptedAnswers,
            matching_pairs: q.matchingPairs?.map((pair) => ({
              id: pair.id,
              left: pair.left,
              right: pair.right,
            })),
            expected_rubric: q.expectedRubric,
          });
          if (created && created.id) {
            q.id = created.id;
          }
        }
        storage.saveQuestion(q);
        await refreshTeacherCourseData();
        notify('success', 'Question saved to bank.');
        return;
      }
    } catch (err: any) {
      console.warn('Backend question save error:', err);
      notify('error', err.message || 'Failed to save question to bank.');
      return;
    }
    storage.saveQuestion(q);
    setQuestions(storage.getQuestions());
    notify('success', 'Question saved to bank.');
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      if (authApi.getAccessToken() && isUuid(id)) {
        await teacherApi.archiveQuestion(id);
        storage.deleteQuestion(id);
        await refreshTeacherCourseData();
        notify('info', 'Question removed.');
        return;
      }
    } catch (err: any) {
      console.warn('Backend question archive error:', err);
      notify('error', err.message || 'Failed to archive question.');
      return;
    }
    storage.deleteQuestion(id);
    setQuestions(storage.getQuestions());
    notify('info', 'Question removed.');
  };

  const handleSaveGeneratedCandidates = (newCandidates: AICandidateQuestion[]) => {
    storage.saveCandidates(newCandidates);
    setCandidates(storage.getCandidates());
    notify('success', `${newCandidates.length} candidate questions generated.`);
  };

  const handleUpdateCandidateStatus = (id: string, status: 'approved' | 'rejected', reason?: string) => {
    storage.updateCandidateStatus(id, status, reason);
    setCandidates(storage.getCandidates());
    setQuestions(storage.getQuestions());
    notify(status === 'approved' ? 'success' : 'info', `Candidate question ${status}.`);
  };

  const handleDeleteCandidate = (id: string) => {
    storage.deleteCandidate(id);
    setCandidates(storage.getCandidates());
    notify('info', 'Candidate question removed.');
  };

  const handleSaveAssessment = async (a: Assessment) => {
    try {
      if (authApi.getAccessToken()) {
        const existing = assessments.find((item) => item.id === a.id);
        if (existing && isUuid(a.id)) {
          if (a.status === 'published' && existing.status !== 'published') {
            await teacherApi.publishAssessment(a.id);
          }
          await teacherApi.updateAssessment(a.id, {
            title: a.title,
            instructions: a.instructions,
            time_limit_minutes: a.timeLimitMinutes,
            passing_score_percent: a.passingScorePercent,
            questions: a.questionIds.map((qid, idx) => ({ question_id: qid, order: idx + 1 })),
          });
        } else {
          const created = await teacherApi.createAssessment({
            course_id: a.courseId,
            topic_id: a.topicId,
            title: a.title,
            type: a.type as any,
            instructions: a.instructions,
            time_limit_minutes: a.timeLimitMinutes,
            passing_score_percent: a.passingScorePercent,
            questions: a.questionIds.map((qid, idx) => ({ question_id: qid, order: idx + 1 })),
          });
          if (created && created.id) {
            a.id = created.id;
            if (a.status === 'published') {
              await teacherApi.publishAssessment(created.id);
            }
          }
        }
        storage.saveAssessment(a);
        await refreshTeacherCourseData();
        notify('success', `Assessment "${a.title}" saved.`);
        return;
      }
    } catch (err: any) {
      console.warn('Backend assessment save error:', err);
      notify('error', err.message || 'Failed to save assessment.');
      return;
    }
    storage.saveAssessment(a);
    setAssessments(storage.getAssessments());
    notify('success', `Assessment "${a.title}" saved.`);
  };

  const handleDeleteAssessment = async (id: string) => {
    storage.deleteAssessment(id);
    if (authApi.getAccessToken()) {
      await refreshTeacherCourseData();
    } else {
      setAssessments(storage.getAssessments());
    }
    notify('info', 'Assessment deleted.');
  };

  const editingQuestion = questions.find((q) => q.id === teacherNavParams.questionId);
  const editingAssessment = assessments.find((a) => a.id === teacherNavParams.assessmentId);

  // Compute breadcrumbs for teacher layout
  const getTeacherBreadcrumbs = () => {
    const list: Array<{ label: string; page?: TeacherNavigationPage; params?: Record<string, string> }> = [];

    if (teacherPage === 'overview') {
      list.push({ label: 'Overview' });
    } else if (teacherPage === 'courses') {
      list.push({ label: 'Course Management' });
    } else if (teacherPage === 'course_overview') {
      list.push({ label: 'Courses', page: 'courses' });
      list.push({ label: activeCourse?.title || 'Course Overview' });
    } else if (teacherPage === 'curriculum') {
      list.push({ label: 'Courses', page: 'courses' });
      if (activeCourse) {
        list.push({ label: activeCourse.title, page: 'course_overview', params: { courseId: activeCourse.id } });
      }
      list.push({ label: 'Curriculum Editor' });
    } else if (teacherPage === 'prerequisites') {
      list.push({ label: 'Courses', page: 'courses' });
      if (activeCourse) {
        list.push({ label: activeCourse.title, page: 'course_overview', params: { courseId: activeCourse.id } });
      }
      list.push({ label: 'Prerequisites (DAG)' });
    } else if (teacherPage === 'resources') {
      list.push({ label: 'Courses', page: 'courses' });
      if (activeCourse) {
        list.push({ label: activeCourse.title, page: 'course_overview', params: { courseId: activeCourse.id } });
      }
      list.push({ label: 'Learning Resources' });
    } else if (teacherPage === 'questions') {
      list.push({ label: 'Question Bank' });
    } else if (teacherPage === 'question_editor') {
      list.push({ label: 'Question Bank', page: 'questions' });
      list.push({ label: editingQuestion?.id ? 'Edit Question' : 'Create Question' });
    } else if (teacherPage === 'ai_review') {
      list.push({ label: 'Question Bank', page: 'questions' });
      list.push({ label: 'AI Review & Governance (SSD-08)' });
    } else if (teacherPage === 'assessments') {
      list.push({ label: 'Assessments' });
    } else if (teacherPage === 'assessment_editor') {
      list.push({ label: 'Assessments', page: 'assessments' });
      list.push({ label: editingAssessment?.id ? 'Edit Assessment' : 'New Assessment' });
    } else if (teacherPage === 'analytics') {
      if (teacherNavParams.courseId && activeCourse) {
        list.push({ label: 'Analytics', page: 'analytics' });
        list.push({ label: activeCourse.title });
      } else {
        list.push({ label: 'Analytics & Reports' });
      }
    }

    return list;
  };

  // Strictly enforce authentication & teacher role: the only way to enter is by logging in!
  if (!currentUserAccount || (currentUserAccount.role !== 'teacher' && currentUserAccount.role !== 'administrator')) {
    return (
      <AuthPage
        initialMode="signin"
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <TeacherLayout
      currentPage={teacherPage}
      onNavigate={handleTeacherNavigate}
      selectedCourseId={activeCourse?.id}
      selectedCourseTitle={activeCourse?.title}
      teacherUser={{
        name: currentUserAccount.full_name,
        email: currentUserAccount.email,
        department: currentUserAccount.profile?.department || 'Department of Computer Science',
      }}
      onSignOut={handleGlobalSignOut}
      breadcrumbs={getTeacherBreadcrumbs()}
      toasts={toasts}
      onDismissToast={handleDismissToast}
    >

      {teacherPage === 'overview' && (
        <TeacherDashboardPage
          courses={courses}
          assessments={assessments}
          candidates={candidates}
          attempts={attempts}
          onNavigate={handleTeacherNavigate}
          onCreateCourse={() => handleTeacherNavigate('courses')}
        />
      )}

      {teacherPage === 'courses' && (
        <CoursesPage
          courses={courses}
          topics={topics}
          lessons={lessons}
          onNavigate={handleTeacherNavigate}
          onSaveCourse={handleSaveCourse}
          onDeleteCourse={handleDeleteCourse}
        />
      )}

      {teacherPage === 'course_overview' && activeCourse && (
        <CourseOverviewPage
          course={activeCourse}
          topics={topics.filter((t) => t.courseId === activeCourse.id)}
          lessons={lessons.filter((l) => l.courseId === activeCourse.id)}
          resources={resources.filter((r) => r.courseId === activeCourse.id)}
          assessments={assessments.filter((a) => a.courseId === activeCourse.id)}
          onNavigate={handleTeacherNavigate}
          onUpdateCourse={handleSaveCourse}
        />
      )}

      {teacherPage === 'curriculum' && activeCourse && (
        <CurriculumEditorPage
          course={activeCourse}
          topics={topics.filter((t) => t.courseId === activeCourse.id)}
          lessons={lessons.filter((l) => l.courseId === activeCourse.id)}
          resources={resources.filter((r) => r.courseId === activeCourse.id)}
          assessments={assessments.filter((a) => a.courseId === activeCourse.id)}
          onNavigate={handleTeacherNavigate}
          onSaveTopic={handleSaveTopic}
          onDeleteTopic={handleDeleteTopic}
          onSaveLesson={handleSaveLesson}
          onDeleteLesson={handleDeleteLesson}
          onSaveAssessment={handleSaveAssessment}
          onSaveResource={handleSaveResource}
          onNotify={notify}
        />
      )}

      {teacherPage === 'prerequisites' && activeCourse && (
        <PrerequisiteManagerPage
          course={activeCourse}
          currentTopic={topics.find((t) => t.id === teacherNavParams.topicId) || topics.filter((t) => t.courseId === activeCourse.id)[0]}
          allTopics={topics.filter((t) => t.courseId === activeCourse.id)}
          onNavigate={handleTeacherNavigate}
          onSavePrerequisites={(tId, pIds) => {
            const topic = topics.find((t) => t.id === tId);
            if (topic) {
              handleSaveTopic({ ...topic, prerequisiteTopicIds: pIds });
            }
          }}
          onNotify={notify}
        />
      )}

      {teacherPage === 'resources' && activeCourse && (
        <ResourceManagerPage
          course={activeCourse}
          topic={topics.find((t) => t.id === teacherNavParams.topicId)}
          lesson={lessons.find((l) => l.id === teacherNavParams.lessonId)}
          resources={resources.filter((r) => r.courseId === activeCourse.id)}
          allLessons={lessons.filter((l) => l.courseId === activeCourse.id)}
          onNavigate={handleTeacherNavigate}
          onSaveResource={handleSaveResource}
          onDeleteResource={handleDeleteResource}
          onNotify={notify}
        />
      )}

      {teacherPage === 'questions' && (
        <QuestionBankPage
          courses={courses}
          topics={topics}
          lessons={lessons}
          questions={questions}
          initialCourseId={teacherNavParams.courseId}
          initialTopicId={teacherNavParams.topicId}
          initialLessonId={teacherNavParams.lessonId}
          onNavigate={handleTeacherNavigate}
          onDeleteQuestion={handleDeleteQuestion}
          onNotify={notify}
        />
      )}

      {teacherPage === 'question_editor' && (
        <QuestionEditorPage
          initialQuestion={editingQuestion as any}
          courses={courses}
          topics={topics}
          onNavigate={handleTeacherNavigate}
          onSaveQuestion={handleSaveQuestion}
          onNotify={notify}
        />
      )}

      {teacherPage === 'ai_review' && (
        <AIReviewPage
          courses={courses}
          topics={topics}
          lessons={lessons}
          resources={resources}
          candidates={candidates}
          initialCourseId={teacherNavParams.courseId}
          initialTopicId={teacherNavParams.topicId}
          initialLessonId={teacherNavParams.lessonId}
          onNavigate={handleTeacherNavigate}
          onSaveGeneratedCandidates={handleSaveGeneratedCandidates}
          onUpdateCandidateStatus={handleUpdateCandidateStatus}
          onDeleteCandidate={handleDeleteCandidate}
          onNotify={notify}
        />
      )}

      {teacherPage === 'assessments' && (
        <AssessmentsPage
          assessments={assessments}
          courses={courses}
          topics={topics}
          questions={questions}
          onNavigate={handleTeacherNavigate}
          onSaveAssessment={handleSaveAssessment}
          onDeleteAssessment={handleDeleteAssessment}
          onNotify={notify}
        />
      )}

      {teacherPage === 'assessment_editor' && (
        <AssessmentEditorPage
          initialAssessment={editingAssessment}
          courses={courses}
          topics={topics}
          questions={questions}
          onNavigate={handleTeacherNavigate}
          onSaveAssessment={handleSaveAssessment}
          onNotify={notify}
        />
      )}

      {teacherPage === 'analytics' && (
        <AnalyticsPage
          courses={courses}
          topics={topics}
          assessments={assessments}
          attempts={attempts}
          selectedCourseId={teacherNavParams.courseId}
          onNavigate={handleTeacherNavigate}
          onNotify={notify}
        />
      )}
    </TeacherLayout>
  );
}
