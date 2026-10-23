import React, { useState, useEffect } from 'react';
import {
  TeacherLayout,
  NavigationPage as TeacherNavigationPage,
  ToastMessage,
} from './components/teacher/TeacherLayout';
import { storage, CURRENT_TEACHER } from './services/storageService';
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
import { SignInPage } from './pages/student/SignInPage';
import { CreateAccountPage } from './pages/student/CreateAccountPage';
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { CourseCatalogPage } from './pages/student/CourseCatalogPage';
import { CourseDetailsPage } from './pages/student/CourseDetailsPage';
import { MyLearningPage } from './pages/student/MyLearningPage';
import { CourseLearningMapPage } from './pages/student/CourseLearningMapPage';
import { LessonWorkspacePage } from './pages/student/LessonWorkspacePage';
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

export default function App() {
  // Portal Mode: defaults to student mode, with support for teacher and admin
  const [portalMode, setPortalMode] = useState<'student' | 'teacher' | 'admin'>('student');

  // Student State
  const [currentStudent, setCurrentStudent] = useState<StudentUser | null>(() => storage.getStudentUser());
  const [studentPage, setStudentPage] = useState<StudentNavigationPage>('dashboard');
  const [studentNavParams, setStudentNavParams] = useState<Record<string, string>>({});
  const [latestResult, setLatestResult] = useState<StudentAssessmentResult | null>(null);

  // Teacher State
  const [teacherPage, setTeacherPage] = useState<TeacherNavigationPage>('overview');
  const [teacherNavParams, setTeacherNavParams] = useState<Record<string, string>>({});

  // Admin State
  const [currentAdmin, setCurrentAdmin] = useState<UserAccount | null>(() => storage.getAdminUser());
  const [adminPage, setAdminPage] = useState<AdminNavigationPage>('dashboard');
  const [adminNavParams, setAdminNavParams] = useState<Record<string, string>>({});
  const [allUsers, setAllUsers] = useState<UserAccount[]>(() => storage.getUsers());
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => storage.getAuditEvents());
  const [serviceHealth, setServiceHealth] = useState<ServiceHealthCheck[]>(() => storage.getServiceHealth());
  const [roleModalUser, setRoleModalUser] = useState<UserAccount | null>(null);
  const [statusModalUser, setStatusModalUser] = useState<UserAccount | null>(null);

  // Shared Data Records
  const [courses, setCourses] = useState<Course[]>(() => storage.getCourses());
  const [topics, setTopics] = useState<Topic[]>(() => storage.getTopics());
  const [lessons, setLessons] = useState<Lesson[]>(() => storage.getLessons());
  const [resources, setResources] = useState<LearningResource[]>(() => storage.getResources());
  const [questions, setQuestions] = useState<QuestionData[]>(() => storage.getQuestions());
  const [candidates, setCandidates] = useState<AICandidateQuestion[]>(() => storage.getCandidates());
  const [assessments, setAssessments] = useState<Assessment[]>(() => storage.getAssessments());
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>(() => storage.getAttempts());

  // Student Domain Records
  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => storage.getEnrollments());
  const [completions, setCompletions] = useState<LessonCompletion[]>(() => storage.getLessonCompletions());
  const [masteryStates, setMasteryStates] = useState<MasteryState[]>(() => storage.getMasteryStates());
  const [gamificationProfile, setGamificationProfile] = useState<GamificationProfile>(() => storage.getGamificationProfile());
  const [badges, setBadges] = useState<Badge[]>(() => storage.getBadges());
  const [xpEvents, setXpEvents] = useState<XPEvent[]>(() => storage.getXPEvents());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => storage.getLeaderboard());

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Student Navigation
  const handleStudentNavigate = (page: StudentNavigationPage, params?: Record<string, string>) => {
    setStudentPage(page);
    if (params) {
      setStudentNavParams((prev) => ({ ...prev, ...params }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Teacher Navigation
  const handleTeacherNavigate = (page: string, params?: Record<string, string>) => {
    setTeacherPage(page as TeacherNavigationPage);
    if (params) {
      setTeacherNavParams((prev) => ({ ...prev, ...params }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin Navigation
  const handleAdminNavigate = (page: AdminNavigationPage, params?: Record<string, string>) => {
    setAdminPage(page);
    if (params) {
      setAdminNavParams((prev) => ({ ...prev, ...params }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmRoleChange = async (targetUserId: string, newRole: UserRole, reason: string) => {
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
    const updated = await storage.refreshHealthChecks();
    setServiceHealth([...updated]);
    notify('info', 'Telemetry refreshed with live diagnostic pings.');
    return updated;
  };

  const handleUpdateAdminProfile = (updated: UserAccount) => {
    storage.saveAdminUser(updated);
    setCurrentAdmin(updated);
    setAllUsers(storage.getUsers());
  };

  const handleUpdateAdminPassword = async (newPass: string) => {
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

  const handleAdminSignOut = () => {
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
    setAdminPage('access_denied');
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

  // Student Actions
  const handleEnrollCourse = (courseId: string) => {
    const enr = storage.enrollCourse(courseId);
    setEnrollments(storage.getEnrollments());
    notify('success', `Successfully enrolled in ${storage.getCourse(courseId)?.title || 'course'}!`);
  };

  const handleMarkLessonComplete = (lessonId: string, courseId: string, topicId: string) => {
    const { completion, xpAwarded } = storage.completeLesson(lessonId, courseId, topicId);
    setCompletions(storage.getLessonCompletions());
    setEnrollments(storage.getEnrollments());
    setGamificationProfile(storage.getGamificationProfile());
    setXpEvents(storage.getXPEvents());
    setLeaderboard(storage.getLeaderboard());
    notify('success', `Lesson marked complete! +${xpAwarded} XP awarded.`);
  };

  const handleFinishDiagnostic = (res: {
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

    // Award XP
    storage.awardXP('diagnostic_completed', res.xpAwarded, `Completed diagnostic: ${asm?.title || 'Baseline assessment'}`, asm?.id);
    setGamificationProfile(storage.getGamificationProfile());
    setXpEvents(storage.getXPEvents());
    setLeaderboard(storage.getLeaderboard());

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

  const handleFinishPractice = (res: {
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

    setGamificationProfile(storage.getGamificationProfile());
    setXpEvents(storage.getXPEvents());
    setLeaderboard(storage.getLeaderboard());

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

  const handleFinishExam = (res: {
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

    setGamificationProfile(storage.getGamificationProfile());
    setXpEvents(storage.getXPEvents());
    setLeaderboard(storage.getLeaderboard());

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

  const handleUpdateStudentProfile = (updated: StudentUser) => {
    storage.saveStudentUser(updated);
    setCurrentStudent(updated);
    setLeaderboard(storage.getLeaderboard());
  };

  const handleStudentSignOut = () => {
    setCurrentStudent(null);
    setStudentPage('sign_in');
    notify('info', 'You have been signed out.');
  };

  const handleStudentSignInSuccess = (user: StudentUser) => {
    storage.saveStudentUser(user);
    setCurrentStudent(user);
    setStudentPage('dashboard');
    notify('success', `Welcome back, ${user.name}!`);
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
  // VIEW ROUTING: STUDENT PORTAL
  // =========================================================================
  if (portalMode === 'student') {
    // If not authenticated or on auth screens
    if (!currentStudent || studentPage === 'sign_in') {
      return (
        <SignInPage
          onSignInSuccess={handleStudentSignInSuccess}
          onNavigateToRegister={() => setStudentPage('register')}
          onSwitchToTeacher={() => setPortalMode('teacher')}
          onSwitchToAdmin={() => setPortalMode('admin')}
        />
      );
    }

    if (studentPage === 'register') {
      return (
        <CreateAccountPage
          onRegisterSuccess={handleStudentSignInSuccess}
          onNavigateToSignIn={() => setStudentPage('sign_in')}
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
        onSwitchPortal={() => setPortalMode('teacher')}
        onSwitchToAdmin={() => setPortalMode('admin')}
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
    if (!currentAdmin || adminPage === 'access_denied') {
      return (
        <AccessDeniedPage
          onSwitchPortal={(portal) => {
            if (portal === 'admin') {
              setCurrentAdmin(storage.getAdminUser());
              setAdminPage('dashboard');
              notify('success', 'Authenticated with Administrator credentials.');
            } else {
              setPortalMode(portal);
            }
          }}
        />
      );
    }

    return (
      <AdminLayout
        currentPage={adminPage}
        onNavigate={handleAdminNavigate}
        currentAdmin={currentAdmin}
        toasts={toasts}
        onDismissToast={handleDismissToast}
        onSwitchPortal={(portal) => setPortalMode(portal)}
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

  const handleSaveCourse = (c: Course) => {
    storage.saveCourse(c);
    setCourses(storage.getCourses());
    notify('success', `Course "${c.title}" saved.`);
  };

  const handleDeleteCourse = (id: string) => {
    storage.deleteCourse(id);
    setCourses(storage.getCourses());
    notify('info', 'Course deleted.');
  };

  const handleSaveTopic = (t: Topic) => {
    storage.saveTopic(t);
    setTopics(storage.getTopics());
  };

  const handleDeleteTopic = (id: string) => {
    storage.deleteTopic(id);
    setTopics(storage.getTopics());
  };

  const handleSaveLesson = (l: Lesson) => {
    storage.saveLesson(l);
    setLessons(storage.getLessons());
  };

  const handleDeleteLesson = (id: string) => {
    storage.deleteLesson(id);
    setLessons(storage.getLessons());
  };

  const handleSaveResource = (r: LearningResource) => {
    storage.saveResource(r);
    setResources(storage.getResources());
    notify('success', 'Resource saved.');
  };

  const handleDeleteResource = (id: string) => {
    storage.deleteResource(id);
    setResources(storage.getResources());
    notify('info', 'Resource removed.');
  };

  const handleSaveQuestion = (q: QuestionData) => {
    storage.saveQuestion(q);
    setQuestions(storage.getQuestions());
    notify('success', 'Question saved to bank.');
  };

  const handleDeleteQuestion = (id: string) => {
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

  const handleSaveAssessment = (a: Assessment) => {
    storage.saveAssessment(a);
    setAssessments(storage.getAssessments());
    notify('success', `Assessment "${a.title}" saved.`);
  };

  const handleDeleteAssessment = (id: string) => {
    storage.deleteAssessment(id);
    setAssessments(storage.getAssessments());
    notify('info', 'Assessment deleted.');
  };

  const editingQuestion = questions.find((q) => q.id === teacherNavParams.questionId);
  const editingAssessment = assessments.find((a) => a.id === teacherNavParams.assessmentId);

  return (
    <TeacherLayout
      currentPage={teacherPage}
      onNavigate={handleTeacherNavigate}
      selectedCourseId={activeCourse?.id}
      selectedCourseTitle={activeCourse?.title}
      toasts={toasts}
      onDismissToast={handleDismissToast}
    >
      {/* Switch to Student or Admin Portal Banner */}
      <div className="mb-6 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-semibold">
        <span className="text-indigo-900 dark:text-indigo-200">
          Teacher Portal Mode active. Switch workspaces:
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPortalMode('student')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition cursor-pointer"
          >
            Switch to Student Portal →
          </button>
          <button
            type="button"
            onClick={() => setPortalMode('admin')}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition cursor-pointer"
          >
            Switch to Admin Portal →
          </button>
        </div>
      </div>

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
          onNavigate={handleTeacherNavigate}
          onSaveTopic={handleSaveTopic}
          onDeleteTopic={handleDeleteTopic}
          onSaveLesson={handleSaveLesson}
          onDeleteLesson={handleDeleteLesson}
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
          questions={questions}
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
          resources={resources}
          candidates={candidates}
          onNavigate={handleTeacherNavigate}
          onSaveGeneratedCandidates={handleSaveGeneratedCandidates}
          onUpdateCandidateStatus={handleUpdateCandidateStatus}
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
