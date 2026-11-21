import { describe, it } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';

import { storage, CURRENT_ADMIN, CURRENT_TEACHER, CURRENT_STUDENT } from '../services/storageService.ts';
import { Course, Topic, Lesson, Assessment } from '../types/index.ts';

// Student Portal Pages
import { StudentDashboardPage } from '../pages/student/StudentDashboardPage.tsx';
import { CourseCatalogPage } from '../pages/student/CourseCatalogPage.tsx';
import { CourseLearningMapPage } from '../pages/student/CourseLearningMapPage.tsx';
import { ProgressAnalyticsPage } from '../pages/student/ProgressAnalyticsPage.tsx';
import { AchievementsBadgesPage } from '../pages/student/AchievementsBadgesPage.tsx';
import { LeaderboardPage } from '../pages/student/LeaderboardPage.tsx';
import { ProfileSettingsPage } from '../pages/student/ProfileSettingsPage.tsx';

// Admin Portal Pages
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage.tsx';
import { UserManagementPage } from '../pages/admin/UserManagementPage.tsx';
import { RolesAccessPage } from '../pages/admin/RolesAccessPage.tsx';
import { SecurityAuditLogPage } from '../pages/admin/SecurityAuditLogPage.tsx';
import { SystemHealthPage } from '../pages/admin/SystemHealthPage.tsx';
import { CourseOversightPage } from '../pages/admin/CourseOversightPage.tsx';
import { AdminProfileSecurityPage } from '../pages/admin/AdminProfileSecurityPage.tsx';

// Teacher Portal Pages & Layout
import { DashboardPage } from '../pages/teacher/DashboardPage.tsx';
import { CoursesPage } from '../pages/teacher/CoursesPage.tsx';
import { CourseOverviewPage } from '../pages/teacher/CourseOverviewPage.tsx';
import { AnalyticsPage } from '../pages/teacher/AnalyticsPage.tsx';
import { TeacherLayout } from '../components/teacher/TeacherLayout.tsx';

// UI components
import { Button } from '../components/ui/Button.tsx';

describe('UI Rendering & Studio-Grade Micro-Interactions Verification', () => {
  const mockCourse: Course = {
    id: '44444444-4444-4444-4444-444444444444',
    title: 'Introduction to Computer Science & Python',
    description: 'Foundational programming concepts, algorithmic reasoning, control structures.',
    status: 'published',
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-10-18T08:15:00Z',
  };
  const mockTopic: Topic = {
    id: 'a1111111-1111-1111-1111-111111111111',
    courseId: mockCourse.id,
    title: 'Syntax, Variables & Data Types',
    description: 'Core scalar types and arithmetic operators.',
    order: 1,
    masteryThreshold: 0.75,
  };
  const mockLesson: Lesson = {
    id: 'b1111111-1111-1111-1111-111111111111',
    topicId: mockTopic.id,
    courseId: mockCourse.id,
    title: 'Variables, Expressions & Statements',
    description: 'Syntax fundamentals and variable definitions.',
    order: 1,
  };

  const mockAssessment: Assessment = {
    id: 'asm-11111111-1111-1111-1111-111111111111',
    courseId: mockCourse.id,
    title: 'Diagnostic Quiz: Pre-Course Python Proficiency',
    type: 'diagnostic',
    timeLimitMinutes: 20,
    passingScorePercent: 70,
    questionIds: [],
    status: 'published',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  };

  const courses: Course[] = [mockCourse];
  const topics: Topic[] = [mockTopic];
  const lessons: Lesson[] = [mockLesson];
  const resources = storage.getResources();
  const enrollments = storage.getEnrollments();
  const masteryStates = storage.getMasteryStates();
  const badges = storage.getBadges();
  const attempts = storage.getAttempts();
  const completions = storage.getLessonCompletions();
  const assessments: Assessment[] = [mockAssessment];
  const users = storage.getUsers();
  const auditEvents = storage.getAuditEvents();
  const serviceHealth = storage.getServiceHealth();
  const gamificationProfile = storage.getGamificationProfile();
  const leaderboard = storage.getLeaderboard();
  const candidates = storage.getCandidates();

  describe('Student Portal UI Rendering', () => {
    it('StudentDashboardPage renders cleanly with view-enter-animation and interactive-card', () => {
      const html = renderToString(
        React.createElement(StudentDashboardPage, {
          currentUser: CURRENT_STUDENT,
          gamificationProfile,
          enrollments,
          courses,
          topics,
          lessons,
          masteryStates,
          badges,
          recentAttempts: attempts,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('interactive-card'), 'Must include interactive-card');
      assert.ok(html.includes('Resume Lesson') || html.includes('Continue Learning'), 'Must include CTA');
    });

    it('CourseCatalogPage renders cleanly with view-enter-animation and interactive-card', () => {
      const html = renderToString(
        React.createElement(CourseCatalogPage, {
          courses,
          topics,
          enrollments,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('interactive-card'), 'Must include interactive-card');
      assert.ok(html.includes('Explore Course Catalog'), 'Must include page heading');
    });

    it('CourseLearningMapPage renders cleanly with view-enter-animation and interactive-card', () => {
      const html = renderToString(
        React.createElement(CourseLearningMapPage, {
          courseId: courses[0]?.id || '',
          courses,
          topics,
          lessons,
          resources,
          enrollments,
          masteryStates,
          assessments,
          completedLessonIds: new Set(['les-1']),
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('interactive-card'), 'Must include interactive-card');
      assert.ok(html.includes('Course Learning Map'), 'Must include page heading');
    });

    it('ProgressAnalyticsPage renders cleanly with view-enter-animation and interactive-card', () => {
      const html = renderToString(
        React.createElement(ProgressAnalyticsPage, {
          courses,
          topics,
          lessons,
          masteryStates,
          attempts,
          completions,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('interactive-card'), 'Must include interactive-card');
      assert.ok(html.includes('Progress &amp; Mastery Analytics') || html.includes('Progress & Mastery Analytics'), 'Must include page heading');
    });

    it('AchievementsBadgesPage renders cleanly with view-enter-animation and interactive-card', () => {
      const html = renderToString(
        React.createElement(AchievementsBadgesPage, {
          badges,
          gamificationProfile,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('interactive-card'), 'Must include interactive-card');
      assert.ok(html.includes('Achievements &amp; Badges') || html.includes('Achievements & Badges'), 'Must include page heading');
    });

    it('LeaderboardPage renders cleanly with view-enter-animation', () => {
      const html = renderToString(
        React.createElement(LeaderboardPage, {
          leaderboard,
          currentStudentId: CURRENT_STUDENT.id,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('Academic Leaderboard'), 'Must include page heading');
      assert.ok(html.includes('Top Scholars'), 'Must include table header');
    });

    it('ProfileSettingsPage renders cleanly with view-enter-animation', () => {
      const html = renderToString(
        React.createElement(ProfileSettingsPage, {
          currentUser: CURRENT_STUDENT,
          gamificationProfile,
          onUpdateProfile: () => {},
          onSignOut: () => {},
          onNotify: () => {},
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('Profile &amp; Account Settings') || html.includes('Profile & Account Settings'), 'Must include page heading');
    });
  });

  describe('Administrator Portal UI Rendering', () => {
    it('AdminDashboardPage renders cleanly with view-enter-animation and interactive-card', () => {
      const html = renderToString(
        React.createElement(AdminDashboardPage, {
          users,
          auditEvents,
          serviceHealth,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('interactive-card'), 'Must include interactive-card');
      assert.ok(html.includes('Administration Overview'), 'Must include page heading');
    });

    it('UserManagementPage renders cleanly with view-enter-animation', () => {
      const html = renderToString(
        React.createElement(UserManagementPage, {
          users,
          currentAdminId: CURRENT_ADMIN.id,
          onNavigate: () => {},
          onRequestRoleChange: () => {},
          onRequestStatusChange: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('User Management'), 'Must include page heading');
    });

    it('RolesAccessPage renders cleanly with view-enter-animation and interactive-card', () => {
      const html = renderToString(
        React.createElement(RolesAccessPage, {
          users,
          currentAdminId: CURRENT_ADMIN.id,
          onConfirmRoleChange: async () => ({ success: true }),
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('interactive-card'), 'Must include interactive-card');
      assert.ok(html.includes('Roles &amp; Access Control') || html.includes('Roles & Access Control'), 'Must include page heading');
    });

    it('SecurityAuditLogPage renders cleanly with view-enter-animation', () => {
      const html = renderToString(
        React.createElement(SecurityAuditLogPage, {
          auditEvents,
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('Security Audit Log'), 'Must include page heading');
    });

    it('SystemHealthPage renders cleanly with view-enter-animation and interactive-card', () => {
      const html = renderToString(
        React.createElement(SystemHealthPage, {
          serviceHealth,
          onRefreshHealth: async () => serviceHealth,
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('interactive-card'), 'Must include interactive-card');
      assert.ok(html.includes('System Health &amp; Telemetry') || html.includes('System Health & Telemetry'), 'Must include page heading');
    });

    it('CourseOversightPage renders cleanly with view-enter-animation', () => {
      const html = renderToString(
        React.createElement(CourseOversightPage, {
          courses,
          topics,
          lessons,
          users,
          enrollments,
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('Course &amp; Content Oversight') || html.includes('Course & Content Oversight'), 'Must include page heading');
    });

    it('AdminProfileSecurityPage renders cleanly with view-enter-animation', () => {
      const html = renderToString(
        React.createElement(AdminProfileSecurityPage, {
          currentAdmin: CURRENT_ADMIN,
          onUpdateAdminProfile: () => {},
          onUpdatePassword: async () => ({ success: true }),
          onSignOut: () => {},
          onNotify: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('Profile &amp; Security Credentials') || html.includes('Profile & Security Credentials'), 'Must include page heading');
    });
  });

  describe('Teacher Portal UI Rendering', () => {
    it('DashboardPage renders cleanly with view-enter-animation and interactive-card', () => {
      const html = renderToString(
        React.createElement(DashboardPage, {
          courses,
          assessments,
          candidates,
          attempts,
          onNavigate: () => {},
          onCreateCourse: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('interactive-card'), 'Must include interactive-card');
      assert.ok(html.includes('Teacher overview'), 'Must include page heading');
    });

    it('CoursesPage renders cleanly with view-enter-animation and interactive-card', () => {
      const html = renderToString(
        React.createElement(CoursesPage, {
          courses,
          topics,
          lessons,
          onNavigate: () => {},
          onSaveCourse: () => {},
          onDeleteCourse: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('Courses'), 'Must include page heading');
    });

    it('CourseOverviewPage renders cleanly with view-enter-animation and interactive-card', () => {
      const html = renderToString(
        React.createElement(CourseOverviewPage, {
          course: courses[0],
          topics,
          lessons,
          resources,
          assessments,
          onNavigate: () => {},
          onUpdateCourse: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('interactive-card'), 'Must include interactive-card');
      assert.ok(html.includes('Introduction to Computer Science'), 'Must include course title');
    });

    it('AnalyticsPage renders cleanly with view-enter-animation and interactive-card', () => {
      const html = renderToString(
        React.createElement(AnalyticsPage, {
          courses,
          topics,
          assessments,
          attempts,
          selectedCourseId: courses[0]?.id,
          onNavigate: () => {},
          onNotify: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('interactive-card'), 'Must include interactive-card');
      assert.ok(html.includes('Teacher Analytics'), 'Must include page heading');
    });

    it('TeacherLayout renders top section breadcrumb routing tree and workspace view', () => {
      const html = renderToString(
        React.createElement(
          TeacherLayout,
          {
            currentPage: 'curriculum',
            onNavigate: () => {},
            breadcrumbs: [
              { label: 'Courses', page: 'courses' },
              { label: 'Introduction to Computer Science', page: 'course_overview', params: { courseId: 'c-1' } },
              { label: 'Curriculum Editor' },
            ],
            toasts: [],
            onDismissToast: () => {},
          },
          React.createElement('div', null, 'Curriculum Editor Body')
        )
      );

      // Verify breadcrumb routing tree is present in top header
      assert.ok(html.includes('aria-label="Breadcrumb"'), 'Must have breadcrumb navigation');
      assert.ok(html.includes('Faculty'), 'Must have Faculty root breadcrumb');
      assert.ok(html.includes('Courses'), 'Must include Courses crumb');
      assert.ok(html.includes('Introduction to Computer Science'), 'Must include Course title crumb');
      assert.ok(html.includes('Curriculum Editor'), 'Must include active page crumb');
    });
  });

  describe('UI Button Theme Token Inheritance', () => {
    it('Button primary variant adopts var(--color-primary-600) and var(--color-focus-ring)', () => {
      const html = renderToString(
        React.createElement(Button, { variant: 'primary' }, 'Save Changes')
      );
      assert.ok(html.includes('var(--color-primary-600)'), 'Primary button uses var(--color-primary-600)');
      assert.ok(html.includes('var(--color-focus-ring)'), 'Primary button uses var(--color-focus-ring)');
    });

    it('Button outline variant adopts var(--color-primary-600) and var(--color-primary-100)', () => {
      const html = renderToString(
        React.createElement(Button, { variant: 'outline' }, 'Cancel')
      );
      assert.ok(html.includes('var(--color-primary-600)'), 'Outline button uses var(--color-primary-600)');
      assert.ok(html.includes('var(--color-primary-100)'), 'Outline button uses var(--color-primary-100)');
    });
  });
});
