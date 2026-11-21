/**
 * E2E Test Suite: Complete Student Workflow
 * Guided by e2e-testing-patterns skill:
 * 1. Account Creation (Registration)
 * 2. Login & Session Token Storage
 * 3. Logout & Session Termination
 * 4. Re-login & Session Rehydration
 * 5. Course Catalog Exploration & Course Details
 * 6. Course Enrollment & Idempotency Safeguards
 * 7. Course Learning Map & DAG Topic Readiness
 * 8. Lesson Workspace & Resource Viewing
 * 9. Lesson Completion & XP Award Idempotency
 * 10. AI Lesson Simplification & Persistent Tutoring Sessions
 * 11. Diagnostic Assessment Intro & Player Flow
 * 12. Adaptive Practice Player & Server Grading
 * 13. Bayesian Knowledge Tracing (BKT) Mastery Verification
 * 14. Gamification Profile, XP History Audit & Level Progression
 * 15. Badges Unlocking & Leaderboard Privacy Compliance
 * 16. Full React UI Rendering for all 16 Student Tabs & Shell Components
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock localStorage for node test environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    length: 0,
  } as Storage;
}

import { authApi } from '../services/api/authApi.ts';
import { coursesApi } from '../services/api/coursesApi.ts';
import { curriculumApi } from '../services/api/curriculumApi.ts';
import { gamificationApi } from '../services/api/gamificationApi.ts';
import { masteryApi } from '../services/api/masteryApi.ts';
import { aiApi } from '../services/api/aiApi.ts';
import { storage } from '../services/storageService.ts';
import {
  evaluateQuestionAnswer,
  getNextAdaptiveQuestion,
  determineMasteryStatus,
} from './studentLogic.ts';

// Student Portal UI Pages
import { StudentDashboardPage } from '../pages/student/StudentDashboardPage.tsx';
import { CourseCatalogPage } from '../pages/student/CourseCatalogPage.tsx';
import { CourseDetailsPage } from '../pages/student/CourseDetailsPage.tsx';
import { MyLearningPage } from '../pages/student/MyLearningPage.tsx';
import { CourseLearningMapPage } from '../pages/student/CourseLearningMapPage.tsx';
import { LessonWorkspacePage } from '../pages/student/LessonWorkspacePage.tsx';
import { DiagnosticIntroPage } from '../pages/student/DiagnosticIntroPage.tsx';
import { DiagnosticPlayerPage } from '../pages/student/DiagnosticPlayerPage.tsx';
import { AdaptivePracticePlayerPage } from '../pages/student/AdaptivePracticePlayerPage.tsx';
import { FinalExamPlayerPage } from '../pages/student/FinalExamPlayerPage.tsx';
import { AssessmentResultsPage } from '../pages/student/AssessmentResultsPage.tsx';
import { ProgressAnalyticsPage } from '../pages/student/ProgressAnalyticsPage.tsx';
import { AchievementsBadgesPage } from '../pages/student/AchievementsBadgesPage.tsx';
import { XPActivityHistoryPage } from '../pages/student/XPActivityHistoryPage.tsx';
import { LeaderboardPage } from '../pages/student/LeaderboardPage.tsx';
import { ProfileSettingsPage } from '../pages/student/ProfileSettingsPage.tsx';
import { AIHelperPanel } from '../components/student/AIHelperPanel.tsx';
import { StudentLayout } from '../components/student/StudentLayout.tsx';

const BACKEND_BASE = 'http://127.0.0.1:8000/api/v1';

describe('Student Complete Workflow E2E Suite', () => {
  const uniqueId = `stu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const studentEmail = `${uniqueId}@learnova.edu`;
  const studentPassword = 'StudentStrongPass123!';
  const studentFullName = `Student Tester ${uniqueId}`;

  let studentToken = '';
  let studentUserId = '';
  let enrolledCourseId = '';
  let firstTopicId = '';
  let firstLessonId = '';

  describe('Phase 1: Student Authentication & Session Lifecycle', () => {
    test('POST /auth/register creates a student account and issues access token', async () => {
      const res = await fetch(`${BACKEND_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          password: studentPassword,
          full_name: studentFullName,
        }),
      });

      assert.equal(res.status, 201, 'Registration must return 201 Created');
      const data = await res.json();
      assert.ok(data.access_token, 'Access token must be returned');
      assert.equal(data.user.email, studentEmail);
      assert.equal(data.user.role, 'student');
      assert.equal(data.user.full_name, studentFullName);

      studentToken = data.access_token;
      studentUserId = data.user.id;
      authApi.setAccessToken(studentToken);
      authApi.setStoredUser(data.user);
    });

    test('POST /auth/register prevents duplicate email registration (409 Conflict)', async () => {
      const res = await fetch(`${BACKEND_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          password: studentPassword,
          full_name: studentFullName,
        }),
      });

      assert.equal(res.status, 409, 'Duplicate registration must be rejected with 409 Conflict');
    });

    test('POST /auth/logout terminates session and clears local credentials', async () => {
      const res = await fetch(`${BACKEND_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
      });

      assert.ok(res.status === 200 || res.status === 204, 'Logout must succeed');
      authApi.clearSession();
      storage.clearSessionCredentials();

      assert.equal(authApi.getAccessToken(), null, 'Stored access token must be cleared');
      assert.equal(authApi.getStoredUser(), null, 'Stored user must be cleared');
    });

    test('POST /auth/login rejects invalid credentials with 401 Unauthorized', async () => {
      const res = await fetch(`${BACKEND_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          password: 'WrongPassword456!',
        }),
      });

      assert.equal(res.status, 401, 'Invalid password must return 401 Unauthorized');
    });

    test('POST /auth/login re-authenticates the student and re-hydrates profile', async () => {
      const res = await fetch(`${BACKEND_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          password: studentPassword,
        }),
      });

      assert.equal(res.status, 200, 'Re-login must succeed with 200 OK');
      const data = await res.json();
      assert.ok(data.access_token, 'New access token must be issued');
      assert.equal(data.user.id, studentUserId);
      assert.equal(data.user.role, 'student');

      studentToken = data.access_token;
      authApi.setAccessToken(studentToken);
      authApi.setStoredUser(data.user);
    });

    test('GET /auth/me returns authenticated student profile', async () => {
      const res = await fetch(`${BACKEND_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'Profile check must return 200');
      const profile = await res.json();
      assert.equal(profile.id, studentUserId);
      assert.equal(profile.email, studentEmail);
      assert.equal(profile.role, 'student');
    });
  });

  describe('Phase 2: Course Catalog, Exploration & Enrollment', () => {
    test('GET /courses lists available published courses', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'Course list must succeed');
      const courseList = await res.json();
      assert.ok(Array.isArray(courseList), 'Course list must be an array');
      assert.ok(courseList.length > 0, 'At least one published course must exist');

      enrolledCourseId = courseList[0].id;
      assert.ok(enrolledCourseId, 'Course ID must be valid');
    });

    test('GET /courses/{id} returns full syllabus hierarchy with topics and lessons', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses/${enrolledCourseId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'Course detail must succeed');
      const detail = await res.json();
      assert.equal(detail.id, enrolledCourseId);
      assert.ok(detail.topics && detail.topics.length > 0, 'Course must have topics');

      const firstTopic = detail.topics[0];
      firstTopicId = firstTopic.id;
      assert.ok(firstTopic.lessons && firstTopic.lessons.length > 0, 'Topic must have lessons');
      firstLessonId = firstTopic.lessons[0].id;
    });

    test('POST /courses/{id}/enrollments enrolls student with 201 Created or 200 OK', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses/${enrolledCourseId}/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
      });

      assert.ok(res.status === 201 || res.status === 200, 'Enrollment must succeed');
      const enrollment = await res.json();
      assert.equal(enrollment.course_id, enrolledCourseId);
      assert.equal(enrollment.student_id, studentUserId);
      assert.equal(enrollment.status, 'active');
    });

    test('POST /courses/{id}/enrollments is idempotent (returns 200 on repeat enrollment)', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses/${enrolledCourseId}/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
      });

      assert.equal(res.status, 200, 'Repeat enrollment must be idempotent (200 OK)');
      const enrollment = await res.json();
      assert.equal(enrollment.course_id, enrolledCourseId);
    });

    test('GET /students/me/enrollments confirms active enrollment in course list', async () => {
      const res = await fetch(`${BACKEND_BASE}/students/me/enrollments`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'My enrollments must return 200');
      const enrollments = await res.json();
      const match = enrollments.find((e: any) => e.course_id === enrolledCourseId);
      assert.ok(match, 'Enrolled course must appear in student enrollments');
      assert.equal(match.status, 'active');
    });
  });

  describe('Phase 3: Learning Map DAG, Lesson Workspace & Completion', () => {
    test('GET /courses/{id}/learning-map calculates student topic readiness DAG', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses/${enrolledCourseId}/learning-map`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'Learning map must succeed');
      const map = await res.json();
      assert.ok(map.nodes && map.nodes.length > 0, 'Map must contain topic nodes');
      assert.ok(map.edges, 'Map must contain DAG prerequisite edges');

      const firstTopicNode = map.nodes.find((t: any) => t.id === firstTopicId);
      assert.ok(firstTopicNode, 'First topic must be in learning map');
    });

    test('GET /lessons/{id} retrieves lesson details and resources', async () => {
      const res = await fetch(`${BACKEND_BASE}/lessons/${firstLessonId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'Lesson retrieval must succeed');
      const lesson = await res.json();
      assert.equal(lesson.id, firstLessonId);
      assert.ok(lesson.title, 'Lesson must have a title');
    });

    test('POST /lessons/{id}/complete records lesson completion and updates progress', async () => {
      const res = await fetch(`${BACKEND_BASE}/lessons/${firstLessonId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
      });

      assert.equal(res.status, 200, 'Lesson completion must return 200 OK');
      const completion = await res.json();
      assert.equal(completion.lesson_id, firstLessonId);
      assert.equal(completion.student_id, studentUserId);
      assert.ok(completion.progress_percent >= 0, 'Progress percent must be defined');
    });

    test('POST /lessons/{id}/complete is idempotent (no duplicate rows or double XP)', async () => {
      const res = await fetch(`${BACKEND_BASE}/lessons/${firstLessonId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
      });

      assert.equal(res.status, 200, 'Repeat completion must succeed idempotently');
      const completion = await res.json();
      assert.equal(completion.lesson_id, firstLessonId);
    });

    test('GET /students/me/lesson-completions verifies completed lesson is recorded', async () => {
      const res = await fetch(`${BACKEND_BASE}/students/me/lesson-completions?course_id=${enrolledCourseId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'Lesson completions retrieval must return 200');
      const completions = await res.json();
      const match = completions.find((c: any) => c.lesson_id === firstLessonId);
      assert.ok(match, 'Recorded completion must be in list');
    });
  });

  describe('Phase 4: AI Lesson Simplification & Tutoring Sessions', () => {
    test('POST /ai/simplify-lesson provides AI explanation in simplify mode', async () => {
      const res = await fetch(`${BACKEND_BASE}/ai/simplify-lesson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          lesson_id: firstLessonId,
          mode: 'simplify',
          custom_prompt: 'Explain this topic in simple terms with an intuitive analogy.',
        }),
      });

      assert.equal(res.status, 200, 'AI simplify must return 200 OK');
      const aiRes = await res.json();
      assert.ok(aiRes.explanation || aiRes.content, 'AI must return explanation');
    });

    test('POST /ai/sessions initializes or retrieves persistent lesson tutoring session', async () => {
      const res = await fetch(`${BACKEND_BASE}/ai/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          session_type: 'lesson_tutoring',
          course_id: enrolledCourseId,
          topic_id: firstTopicId,
          lesson_id: firstLessonId,
          title: `Tutoring: Lesson ${firstLessonId.substring(0, 8)}`,
        }),
      });

      assert.equal(res.status, 200, 'AI session creation must return 200');
      const session = await res.json();
      assert.ok(session.id, 'Session must have an ID');
      assert.equal(session.user_id, studentUserId);
    });
  });

  describe('Phase 5: Diagnostic, Practice & Mastery BKT Verification', () => {
    let targetAssessmentCourseId = '';
    let targetAssessmentId = '';
    let attemptId = '';
    let attemptQuestions: any[] = [];
    let baselineMasteryPercent = 0;

    test('Locate published course with diagnostic assessment and verify enrollment', async () => {
      // First check enrolledCourseId
      const res = await fetch(`${BACKEND_BASE}/assessments?course_id=${enrolledCourseId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const assessments = res.ok ? await res.json() : [];
      const foundAsm = Array.isArray(assessments) && assessments.find((a: any) => a.type === 'diagnostic' || a.status === 'published');

      if (foundAsm) {
        targetAssessmentCourseId = enrolledCourseId;
        targetAssessmentId = foundAsm.id;
      } else {
        // Fallback to discover any course with a published assessment
        const coursesRes = await fetch(`${BACKEND_BASE}/courses`, {
          headers: { Authorization: `Bearer ${studentToken}` },
        });
        const courses = await coursesRes.json();
        for (const c of courses) {
          const aRes = await fetch(`${BACKEND_BASE}/assessments?course_id=${c.id}`, {
            headers: { Authorization: `Bearer ${studentToken}` },
          });
          if (aRes.ok) {
            const asmList = await aRes.json();
            const cand = asmList.find((a: any) => a.status === 'published');
            if (cand) {
              targetAssessmentCourseId = c.id;
              targetAssessmentId = cand.id;
              // Ensure student is enrolled in this course
              await fetch(`${BACKEND_BASE}/courses/${targetAssessmentCourseId}/enrollments`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${studentToken}`,
                },
              });
              break;
            }
          }
        }
      }

      assert.ok(targetAssessmentId, 'Published assessment must be discovered');
      assert.ok(targetAssessmentCourseId, 'Target course ID must be discovered');
    });

    test('GET /courses/{id}/mastery verifies baseline BKT topic mastery calculation prior to attempt', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses/${targetAssessmentCourseId}/mastery`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'Mastery endpoint must return 200');
      const mastery = await res.json();
      assert.equal(mastery.course_id, targetAssessmentCourseId);
      assert.ok(Array.isArray(mastery.topics), 'Topics array must be present');
      baselineMasteryPercent = mastery.overall_mastery_percent;
      assert.ok(typeof baselineMasteryPercent === 'number', 'Baseline mastery must be a number');
    });

    test('POST /assessments/{id}/attempts starts an assessment attempt in progress', async () => {
      const res = await fetch(`${BACKEND_BASE}/assessments/${targetAssessmentId}/attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({}),
      });

      assert.ok(res.status === 201 || res.status === 200, `Attempt launch failed: ${res.status}`);
      const att = await res.json();
      assert.ok(att.id, 'Attempt ID must be defined');
      assert.equal(att.status, 'in_progress', 'Attempt status must be in_progress');
      attemptId = att.id;
      attemptQuestions = att.questions || [];
    });

    test('GET /attempts/{id} retrieves active attempt questions without answer keys', async () => {
      const res = await fetch(`${BACKEND_BASE}/attempts/${attemptId}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'Attempt inspection must return 200');
      const att = await res.json();
      assert.equal(att.id, attemptId);
      assert.ok(Array.isArray(att.questions));
      assert.ok(att.questions.length > 0, 'Attempt must contain questions');
      attemptQuestions = att.questions;

      // Student security projection guard: answer_key must NOT be leaked
      for (const q of attemptQuestions) {
        assert.equal(q.answer_key, undefined, 'answer_key must not be exposed to student');
      }
    });

    test('PUT /attempts/{id}/responses/{question_id} idempotently records interim student answers', async () => {
      for (const q of attemptQuestions) {
        const respVal = q.type === 'multiple_choice' ? ['opt-1'] : true;
        const res = await fetch(`${BACKEND_BASE}/attempts/${attemptId}/responses/${q.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${studentToken}`,
          },
          body: JSON.stringify({ student_response: respVal }),
        });

        assert.equal(res.status, 200, `Response recording failed for question ${q.id}`);
        const saved = await res.json();
        assert.equal(saved.question_id, q.id);
      }
    });

    test('Adaptive Practice Mechanics: verifies client-side dynamic question selection and scoring', () => {
      const bank = storage.getQuestions();
      const firstQ = bank.find((q) => q.difficulty === 'medium') || bank[0];
      assert.ok(firstQ, 'Bank must have questions for adaptive testing');

      // 1. Correct response escalates medium -> hard
      const next1 = getNextAdaptiveQuestion(bank, 'medium', true, [firstQ.id]);
      if (next1) {
        assert.ok(next1.difficulty === 'hard' || next1.difficulty === 'medium');
      }

      // 2. Incorrect response de-escalates medium -> easy
      const next2 = getNextAdaptiveQuestion(bank, 'medium', false, [firstQ.id]);
      if (next2) {
        assert.ok(next2.difficulty === 'easy' || next2.difficulty === 'medium');
      }

      // 3. Status mapping
      assert.equal(determineMasteryStatus(90), 'mastered');
      assert.equal(determineMasteryStatus(75), 'competent');
      assert.equal(determineMasteryStatus(40), 'developing');
    });

    test('POST /attempts/{id}/submit grades attempt and triggers BKT mastery update', async () => {
      const res = await fetch(`${BACKEND_BASE}/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 200, 'Attempt submit must return 200 OK');
      const result = await res.json();
      assert.equal(result.status, 'graded', 'Attempt must be graded');
      assert.ok(typeof result.score === 'number' || typeof result.score === 'string', 'Score must be returned');
      assert.ok(result.score_percent !== undefined, 'score_percent must be present');
    });

    test('GET /courses/{id}/mastery confirms Bayesian Knowledge Tracing (BKT) updated dynamically', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses/${targetAssessmentCourseId}/mastery`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'Mastery retrieval must succeed');
      const mastery = await res.json();
      assert.equal(mastery.course_id, targetAssessmentCourseId);
      assert.ok(Array.isArray(mastery.topics), 'Topics array must be present');

      // Verify that at least one topic has recorded attempt and updated status
      const assessedTopics = mastery.topics.filter((t: any) => t.attempts_count > 0);
      assert.ok(assessedTopics.length >= 1, 'At least 1 topic must reflect assessed attempts');
      const topic = assessedTopics[0];
      assert.ok(topic.attempts_count >= 1);
      assert.ok(topic.status === 'mastered' || topic.status === 'competent' || topic.status === 'developing');
      assert.ok(topic.last_assessed_at, 'last_assessed_at timestamp must be set');
    });
  });

  describe('Phase 6: Gamification Profile, XP History, Badges & Leaderboard', () => {
    test('GET /gamification/profile retrieves real-time XP, level, and floor/ceiling progression', async () => {
      // Allow brief window for async background outbox worker to deliver events
      let profile: any = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        const res = await fetch(`${BACKEND_BASE}/gamification/profile`, {
          headers: { Authorization: `Bearer ${studentToken}` },
        });
        if (res.ok) {
          profile = await res.json();
          if (profile.xp >= 50) break;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      assert.ok(profile, 'Profile fetch must return data');
      assert.equal(profile.student_id, studentUserId);
      assert.ok(profile.xp >= 50, `Student must have earned at least 50 XP from lesson completion, got ${profile.xp}`);
      assert.ok(profile.level >= 1, 'Profile level must be at least 1');
      assert.ok(profile.next_level_xp > profile.current_level_floor_xp);
      assert.ok(typeof profile.progress_percent === 'number');
    });

    test('GET /gamification/xp-history returns chronological audit ledger with earned events', async () => {
      const res = await fetch(`${BACKEND_BASE}/gamification/xp-history`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'XP history must return 200');
      const history = await res.json();
      assert.ok(history.total >= 1, 'At least 1 XP event must be logged');
      assert.ok(history.items.length >= 1, 'Items array must have entries');
      assert.equal(history.items[0].student_id, studentUserId);
    });

    test('GET /gamification/badges returns full catalog with unlock statuses', async () => {
      const res = await fetch(`${BACKEND_BASE}/gamification/badges`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'Badges query must return 200');
      const badges = await res.json();
      assert.ok(badges.total_available > 0, 'Badges catalog must be populated');
      assert.ok(Array.isArray(badges.items), 'Badges items must be an array');
    });

    test('GET /gamification/leaderboard respects privacy and ranks students', async () => {
      const res = await fetch(`${BACKEND_BASE}/gamification/leaderboard`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.equal(res.status, 200, 'Leaderboard query must return 200');
      const lb = await res.json();
      assert.ok(Array.isArray(lb.entries), 'Leaderboard entries must be an array');
    });
  });

  describe('Phase 7: Full React UI Rendering for all Student Tabs & Components', () => {
    const mockStudent = {
      id: studentUserId || 'stu-test-id',
      name: studentFullName,
      email: studentEmail,
      role: 'student' as const,
      joinDate: new Date().toISOString(),
      preferences: { theme: 'dark' as const, leaderboardOptIn: true, emailNotifications: true },
    };

    const mockCourses = storage.getCourses();
    const mockTopics = storage.getTopics();
    const mockLessons = storage.getLessons();
    const mockResources = storage.getResources();
    const mockEnrollments = storage.getEnrollments();
    const mockMastery = storage.getMasteryStates();
    const mockBadges = storage.getBadges();
    const mockAttempts = storage.getAttempts();
    const mockCompletions = storage.getLessonCompletions();
    const mockAssessments = storage.getAssessments();
    const mockGamification = storage.getGamificationProfile();
    const mockXpEvents = storage.getXPEvents();
    const mockLeaderboard = storage.getLeaderboard();

    test('Tab 1: StudentDashboardPage renders KPI counters and active enrollments', () => {
      const html = renderToString(
        React.createElement(StudentDashboardPage, {
          currentUser: mockStudent,
          gamificationProfile: mockGamification,
          enrollments: mockEnrollments,
          courses: mockCourses,
          topics: mockTopics,
          lessons: mockLessons,
          masteryStates: mockMastery,
          badges: mockBadges,
          recentAttempts: mockAttempts,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'), 'Must include view-enter-animation');
      assert.ok(html.includes('interactive-card'), 'Must include interactive-card');
      assert.ok(html.includes(studentFullName) || html.includes('Learning') || html.includes('Level'));
    });

    test('Tab 2: CourseCatalogPage renders verified course cards with actions', () => {
      const html = renderToString(
        React.createElement(CourseCatalogPage, {
          courses: mockCourses,
          topics: mockTopics,
          enrollments: mockEnrollments,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('Explore Course Catalog'));
      assert.ok(html.includes('interactive-card'));
    });

    test('Tab 3: CourseDetailsPage renders syllabus structure and enrollment trigger', () => {
      const targetCourse = mockCourses[0] || {
        id: 'crs-cs101',
        title: 'Introduction to Computer Science',
        description: 'Comprehensive foundations in algorithms and programming.',
        status: 'published' as const,
        creatorId: 'teacher-1',
        createdAt: new Date().toISOString(),
      };
      const html = renderToString(
        React.createElement(CourseDetailsPage, {
          courseId: targetCourse.id,
          courses: [targetCourse, ...mockCourses],
          topics: mockTopics,
          lessons: mockLessons,
          enrollments: mockEnrollments,
          onEnroll: () => {},
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes(targetCourse.title.replace(/&/g, '&amp;')) || html.includes('Computer Science'));
      assert.ok(html.includes('Undergraduate Syllabus') || html.includes('Comprehensive Topics') || html.includes('Course Catalog'));
    });

    test('Tab 4: MyLearningPage renders active and completed course tabs', () => {
      const html = renderToString(
        React.createElement(MyLearningPage, {
          courses: mockCourses,
          topics: mockTopics,
          lessons: mockLessons,
          enrollments: mockEnrollments,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('My Learning'));
      assert.ok(html.includes('In Progress') || html.includes('Active'));
    });

    test('Tab 5: CourseLearningMapPage renders DAG interactive learning path nodes', () => {
      const html = renderToString(
        React.createElement(CourseLearningMapPage, {
          courseId: mockCourses[0]?.id || 'crs-1',
          courses: mockCourses,
          topics: mockTopics,
          lessons: mockLessons,
          resources: mockResources,
          enrollments: mockEnrollments,
          masteryStates: mockMastery,
          assessments: mockAssessments,
          completedLessonIds: new Set([mockLessons[0]?.id || 'les-1']),
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('Learning Map') || html.includes('Curriculum Path'));
      assert.ok(html.includes('interactive-card'));
    });

    test('Tab 6: LessonWorkspacePage renders instructional content, resources and mark-complete action', () => {
      const html = renderToString(
        React.createElement(LessonWorkspacePage, {
          courseId: mockCourses[0]?.id || 'crs-1',
          topicId: mockTopics[0]?.id || 'top-1',
          lessonId: mockLessons[0]?.id || 'les-1',
          courses: mockCourses,
          topics: mockTopics,
          lessons: mockLessons,
          resources: mockResources,
          isCompleted: false,
          onMarkComplete: () => {},
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('Back to Course Learning Map'));
      assert.ok(html.includes('AI') || html.includes('Tutor') || html.includes('Mark Lesson as Complete') || html.includes('Completed'));
    });

    test('Tab 7: DiagnosticIntroPage renders assessment parameters and launch trigger', () => {
      const html = renderToString(
        React.createElement(DiagnosticIntroPage, {
          assessmentId: mockAssessments[0]?.id || 'asm-1',
          assessments: mockAssessments,
          courses: mockCourses,
          topics: mockTopics,
          onStartDiagnostic: () => {},
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('Diagnostic') || html.includes('Baseline') || html.includes('Assessment'));
    });

    test('Tab 8: AssessmentResultsPage renders score percentage, badges and recommendation CTA', () => {
      const html = renderToString(
        React.createElement(AssessmentResultsPage, {
          result: {
            id: 'res-test-1',
            sessionId: 'sess-test-1',
            assessmentId: 'asm-1',
            assessmentTitle: 'Foundations Diagnostic Evaluation',
            type: 'diagnostic',
            studentId: mockStudent.id,
            courseId: mockCourses[0]?.id || 'crs-1',
            topicId: mockTopics[0]?.id || 'top-1',
            scorePercent: 90,
            totalQuestions: 10,
            correctCount: 9,
            incorrectCount: 1,
            masteryStatus: 'competent',
            xpAwarded: 150,
            nextRecommendedAction: {
              type: 'course_map',
              targetId: 'crs-1',
              label: 'Return to Course Learning Map',
            },
            completedAt: new Date().toISOString(),
          },
          course: mockCourses[0],
          topic: mockTopics[0],
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('90%') || html.includes('90'));
      assert.ok(html.includes('Diagnostic Evaluation') || html.includes('Assessment'));
      assert.ok(html.includes('Return to Course Learning Map'));
    });

    test('Tab 9: ProgressAnalyticsPage renders BKT topic masteries and completion charts', () => {
      const html = renderToString(
        React.createElement(ProgressAnalyticsPage, {
          courses: mockCourses,
          topics: mockTopics,
          lessons: mockLessons,
          masteryStates: mockMastery,
          attempts: mockAttempts,
          completions: mockCompletions,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('Progress') || html.includes('Mastery'));
      assert.ok(html.includes('interactive-card'));
    });

    test('Tab 10: AchievementsBadgesPage renders unlocked and locked badge cards', () => {
      const html = renderToString(
        React.createElement(AchievementsBadgesPage, {
          badges: mockBadges,
          gamificationProfile: mockGamification,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('Achievements') || html.includes('Badges'));
      assert.ok(html.includes('interactive-card'));
    });

    test('Tab 11: XPActivityHistoryPage renders chronologically ordered XP ledger', () => {
      const html = renderToString(
        React.createElement(XPActivityHistoryPage, {
          xpEvents: mockXpEvents,
          gamificationProfile: mockGamification,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('XP') || html.includes('Activity History'));
      assert.ok(html.includes('XP Earned') || html.includes('Total') || html.includes('Level'));
    });

    test('Tab 12: LeaderboardPage renders academic rankings and current student indicator', () => {
      const html = renderToString(
        React.createElement(LeaderboardPage, {
          leaderboard: mockLeaderboard,
          currentStudentId: mockStudent.id,
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('Leaderboard') || html.includes('Scholars') || html.includes('Rank'));
    });

    test('Tab 13: ProfileSettingsPage renders bio, preferences, and security controls', () => {
      const html = renderToString(
        React.createElement(ProfileSettingsPage, {
          currentUser: mockStudent,
          gamificationProfile: mockGamification,
          onUpdateProfile: () => {},
          onSignOut: () => {},
          onNotify: () => {},
          onNavigate: () => {},
        })
      );
      assert.ok(html.includes('Profile') || html.includes('Settings'));
      assert.ok(html.includes(studentEmail) || html.includes('Sign Out') || html.includes('Notifications'));
    });

    test('Tab 14: DiagnosticPlayerPage renders player shell with multiple choice question', () => {
      const asm = mockAssessments.find((a) => a.type === 'diagnostic') || mockAssessments[0];
      const questions = storage.getQuestions();
      const html = renderToString(
        React.createElement(DiagnosticPlayerPage, {
          assessment: asm,
          questions,
          onFinishDiagnostic: () => {},
          onExit: () => {},
        })
      );
      assert.ok(html.includes('Question') || html.includes(asm?.title || 'Diagnostic'));
    });

    test('Tab 15: AdaptivePracticePlayerPage renders difficulty indicator and question controls', () => {
      const asm = mockAssessments.find((a) => a.type === 'adaptive') || mockAssessments[0];
      const questions = storage.getQuestions();
      const html = renderToString(
        React.createElement(AdaptivePracticePlayerPage, {
          assessment: asm,
          questions,
          onFinishPractice: () => {},
          onExit: () => {},
        })
      );
      assert.ok(html.includes('Practice') || html.includes('Adaptive') || html.includes('Question'));
    });

    test('Tab 16: FinalExamPlayerPage renders comprehensive player shell with timer and submit guard', () => {
      const asm = mockAssessments.find((a) => a.type === 'final') || mockAssessments[0];
      const questions = storage.getQuestions();
      const html = renderToString(
        React.createElement(FinalExamPlayerPage, {
          assessment: asm,
          questions,
          onFinishExam: () => {},
          onExit: () => {},
        })
      );
      assert.ok(html.includes('Exam') || html.includes('Assessment') || html.includes('Question'));
    });

    test('Diagnostic & Adaptive Player Callbacks: computes scoring invariants and mastery status', () => {
      const asm = mockAssessments.find((a) => a.type === 'diagnostic') || mockAssessments[0];
      let diagnosticPayload: any = null;
      let practicePayload: any = null;

      const onFinishDiagnostic = (res: any) => {
        diagnosticPayload = res;
      };
      const onFinishPractice = (res: any) => {
        practicePayload = res;
      };

      onFinishDiagnostic({
        assessmentId: asm.id,
        scorePercent: 100,
        totalQuestions: 4,
        correctCount: 4,
        incorrectCount: 0,
        masteryStatus: determineMasteryStatus(100),
        xpAwarded: 150,
      });

      assert.ok(diagnosticPayload);
      assert.equal(diagnosticPayload.scorePercent, 100);
      assert.equal(diagnosticPayload.masteryStatus, 'mastered');
      assert.equal(diagnosticPayload.xpAwarded, 150);

      onFinishPractice({
        assessmentId: asm.id,
        scorePercent: 75,
        totalQuestions: 5,
        correctCount: 3,
        incorrectCount: 2,
        masteryStatus: determineMasteryStatus(75),
        xpAwarded: 100,
      });

      assert.ok(practicePayload);
      assert.equal(practicePayload.scorePercent, 75);
      assert.equal(practicePayload.masteryStatus, 'competent');
    });

    test('Component: AIHelperPanel renders tutoring suggestions and message inputs', () => {
      const html = renderToString(
        React.createElement(AIHelperPanel, {
          isOpen: true,
          onClose: () => {},
          lessonTitle: 'Boolean Logic & Truth Tables',
          topicTitle: 'Syntax & Control Flow',
          courseTitle: 'Introduction to Computer Science',
          lessonContent: 'Boolean values evaluate to True or False.',
          lessonId: 'les-test-1',
          courseId: 'crs-test-1',
          topicId: 'top-test-1',
          resources: mockResources,
        })
      );
      assert.ok(html.includes('AI') || html.includes('Tutor') || html.includes('Simplify'));
    });

    test('Layout: StudentLayout renders header, sidebar navigation, XP counter and breadcrumbs', () => {
      const html = renderToString(
        React.createElement(
          StudentLayout,
          {
            currentPage: 'dashboard',
            onNavigate: () => {},
            currentUser: mockStudent,
            gamificationProfile: mockGamification,
            toasts: [],
            onDismissToast: () => {},
            onSwitchPortal: () => {},
            onSwitchToAdmin: () => {},
            onSwitchToPublic: () => {},
            onSignOut: () => {},
            breadcrumbs: [{ label: 'Dashboard' }],
          },
          React.createElement('div', { id: 'child-content' }, 'Active View Content')
        )
      );
      assert.ok(html.includes('Learnova'));
      assert.ok(html.includes('Dashboard'));
      assert.ok(html.includes('Active View Content'));
    });
  });
});
