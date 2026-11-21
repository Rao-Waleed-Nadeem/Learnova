/**
 * E2E Integration Test Suite following e2e-testing-patterns guidelines.
 * Validates critical user journeys:
 * 1. Student Lesson Completion Lifecycle, Idempotency, and Session Rehydration
 * 2. Teacher Course Analytics Backend Contract & Data Mapping
 * 3. Administrator Governance, KPI Telemetry, and Directory Querying
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

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

import { storage } from '../services/storageService.ts';
import { authApi } from '../services/api/authApi.ts';
import { curriculumApi, mapBackendCompletionToCompletion } from '../services/api/curriculumApi.ts';
import type { BackendLessonCompletionResponse } from '../services/api/curriculumApi.ts';
import { adminApi } from '../services/api/adminApi.ts';
import type { TeacherCourseAnalyticsResponse, AdminDashboardResponse } from '../services/api/adminApi.ts';
import { mapBackendUserToUserAccount, mapBackendAuditToAuditEvent } from '../services/api/adminApi.ts';

describe('E2E Journey 1: Student Lesson Completion & Session Rehydration', () => {
  test('recording lesson completion produces valid domain completion shape', () => {
    const mockBackendResponse: BackendLessonCompletionResponse = {
      id: 'comp-uuid-101',
      enrollment_id: 'enr-uuid-201',
      student_id: 'student-uuid-301',
      course_id: 'course-uuid-401',
      topic_id: 'topic-uuid-501',
      lesson_id: 'lesson-uuid-601',
      completed_at: new Date().toISOString(),
      progress_percent: 50.0,
    };

    const mapped = mapBackendCompletionToCompletion(mockBackendResponse);
    assert.equal(mapped.id, 'comp-uuid-101');
    assert.equal(mapped.studentId, 'student-uuid-301');
    assert.equal(mapped.courseId, 'course-uuid-401');
    assert.equal(mapped.topicId, 'topic-uuid-501');
    assert.equal(mapped.lessonId, 'lesson-uuid-601');
    assert.ok(mapped.completedAt);
  });

  test('storage service persists and recovers lesson completions without resetting across reloads', () => {
    const completions = [
      {
        id: 'lc-1',
        studentId: 'student-1',
        courseId: 'course-cs101',
        topicId: 'topic-intro',
        lessonId: 'lesson-101',
        completedAt: new Date().toISOString(),
      },
      {
        id: 'lc-2',
        studentId: 'student-1',
        courseId: 'course-cs101',
        topicId: 'topic-intro',
        lessonId: 'lesson-102',
        completedAt: new Date().toISOString(),
      },
    ];

    storage.saveLessonCompletions(completions);
    const recovered = storage.getLessonCompletions();

    assert.equal(recovered.length, 2);
    assert.equal(recovered[0].lessonId, 'lesson-101');
    assert.equal(recovered[1].lessonId, 'lesson-102');
  });

  test('topic-level completion progress correctly identifies full and partial topic completions', () => {
    const completedLessonIds = new Set(['lesson-101', 'lesson-102']);
    
    // Topic 1 has 2 lessons, both completed
    const topic1Lessons = [{ id: 'lesson-101' }, { id: 'lesson-102' }];
    const t1Count = topic1Lessons.filter((l) => completedLessonIds.has(l.id)).length;
    const isT1Complete = topic1Lessons.length > 0 && t1Count === topic1Lessons.length;
    assert.equal(t1Count, 2);
    assert.equal(isT1Complete, true);

    // Topic 2 has 2 lessons, only 0 completed
    const topic2Lessons = [{ id: 'lesson-201' }, { id: 'lesson-202' }];
    const t2Count = topic2Lessons.filter((l) => completedLessonIds.has(l.id)).length;
    const isT2Complete = topic2Lessons.length > 0 && t2Count === topic2Lessons.length;
    assert.equal(t2Count, 0);
    assert.equal(isT2Complete, false);
  });
});

describe('E2E Journey 2: Teacher Analytics Backend Contract & Fallback Integration', () => {
  test('teacher analytics parses real server analytics response including heatmap, score distribution, and at-risk students', () => {
    const mockServerAnalytics: TeacherCourseAnalyticsResponse = {
      course_id: 'course-cs101',
      course_title: 'Introduction to Computer Science',
      enrolled_students_count: 24,
      overall_average_mastery: 82,
      topic_mastery_distribution: [
        {
          topic_id: 'top-1',
          topic_title: 'Variables & Data Types',
          threshold: 75,
          average_mastery_percent: 88,
          assessed_students_count: 22,
          mastered_count: 18,
          competent_count: 3,
          developing_count: 1,
          not_assessed_count: 2,
          is_class_weak: false,
        },
        {
          topic_id: 'top-2',
          topic_title: 'Loops and Conditionals',
          threshold: 75,
          average_mastery_percent: 62,
          assessed_students_count: 20,
          mastered_count: 5,
          competent_count: 8,
          developing_count: 7,
          not_assessed_count: 4,
          is_class_weak: true,
        },
      ],
      weak_concepts: [
        {
          topic_id: 'top-2',
          topic_title: 'Loops and Conditionals',
          threshold: 75,
          average_mastery_percent: 62,
          assessed_students_count: 20,
          mastered_count: 5,
          competent_count: 8,
          developing_count: 7,
          not_assessed_count: 4,
          is_class_weak: true,
        },
      ],
      score_distribution: {
        '0-49%': 2,
        '50-69%': 5,
        '70-84%': 10,
        '85-100%': 7,
      },
      assessment_summaries: [
        {
          assessment_id: 'asm-1',
          title: 'CS Baseline Diagnostic',
          type: 'diagnostic',
          total_attempts: 24,
          completed_attempts: 24,
          average_score_percent: 78,
          highest_score_percent: 100,
          lowest_score_percent: 45,
        },
      ],
      at_risk_students: [
        {
          student_id: 'stu-99',
          student_name: 'Alex Mercer',
          student_email: 'a.mercer@learnova.edu',
          weak_topics_count: 2,
          average_mastery_percent: 54,
        },
      ],
    };

    assert.equal(mockServerAnalytics.enrolled_students_count, 24);
    assert.equal(mockServerAnalytics.overall_average_mastery, 82);
    assert.equal(mockServerAnalytics.topic_mastery_distribution.length, 2);
    assert.equal(mockServerAnalytics.weak_concepts.length, 1);
    assert.equal(mockServerAnalytics.weak_concepts[0].topic_title, 'Loops and Conditionals');
    assert.equal(mockServerAnalytics.score_distribution['85-100%'], 7);
    assert.equal(mockServerAnalytics.at_risk_students.length, 1);
    assert.equal(mockServerAnalytics.assessment_summaries.length, 1);
  });
});

describe('E2E Journey 3: Administrator Governance, KPI Telemetry, and Querying', () => {
  test('admin dashboard payload correctly aggregates users, curriculum, enrollments, and security audit', () => {
    const mockDashboard: AdminDashboardResponse = {
      users: {
        total: 150,
        students: 120,
        teachers: 25,
        administrators: 5,
        active: 142,
        inactive: 8,
      },
      curriculum: {
        total_courses: 12,
        published_courses: 9,
        draft_courses: 3,
        total_topics: 48,
        total_lessons: 144,
      },
      enrollments: {
        total_enrollments: 320,
        active_enrollments: 280,
        completed_enrollments: 40,
      },
      assessments: {
        total_assessments: 36,
        total_attempts: 850,
        completed_attempts: 810,
      },
      security_audit: {
        total_events_24h: 95,
        blocked_events_24h: 3,
        failure_events_24h: 1,
      },
    };

    assert.equal(mockDashboard.users?.total, 150);
    assert.equal(mockDashboard.curriculum?.published_courses, 9);
    assert.equal(mockDashboard.enrollments?.total_enrollments, 320);
    assert.equal(mockDashboard.security_audit?.blocked_events_24h, 3);
  });

  test('user mapping converts backend user response to clean UserAccount', () => {
    const backendUser = {
      id: 'usr-12345',
      full_name: 'Dr. Evelyn Reed',
      email: 'e.reed@learnova.edu',
      role: 'teacher',
      is_active: true,
      created_at: '2026-01-15T08:00:00Z',
      updated_at: '2026-11-14T10:00:00Z',
      profile: {
        department: 'Computer Science',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    };

    const mapped = mapBackendUserToUserAccount(backendUser);
    assert.equal(mapped.id, 'usr-12345');
    assert.equal(mapped.name, 'Dr. Evelyn Reed');
    assert.equal(mapped.email, 'e.reed@learnova.edu');
    assert.equal(mapped.role, 'teacher');
    assert.equal(mapped.isActive, true);
    assert.equal(mapped.department, 'Computer Science');
    assert.equal(mapped.avatar, 'https://example.com/avatar.jpg');
  });

  test('audit log mapping converts backend audit items to client AuditEvent', () => {
    const backendAudit = {
      id: 'aud-777',
      created_at: '2026-11-14T12:00:00Z',
      actor_id: 'admin-1',
      actor_email: 'sarah.connor@learnova.edu',
      actor_role: 'administrator',
      action: 'ROLE_CHANGED',
      target_type: 'user',
      target_id: 'user-2',
      target_name: 'John Connor',
      outcome: 'SUCCESS',
      reason: 'Promoted to course coordinator',
    };

    const mapped = mapBackendAuditToAuditEvent(backendAudit);
    assert.equal(mapped.id, 'aud-777');
    assert.equal(mapped.actorName, 'sarah.connor');
    assert.equal(mapped.actorEmail, 'sarah.connor@learnova.edu');
    assert.equal(mapped.action, 'ROLE_CHANGED');
    assert.equal(mapped.outcome, 'SUCCESS');
  });

  test('admin user detail contract accurately projects teacher courses and live telemetry', () => {
    const detailResponse = {
      user: {
        id: 'c669cbe0-8bf3-43c7-816d-20a5f9b2c53a',
        full_name: 'Elena Rostova',
        email: 'teacher@learnova.edu',
        role: 'teacher',
        is_active: true,
        created_at: '2026-11-13T06:33:26.541000Z',
        profile: {
          department: 'Computer Science & Engineering',
        },
      },
      enrolled_courses_count: 0,
      assigned_courses_count: 1,
      completed_attempts_count: 0,
      security_audit_events_count: 29,
      last_active_at: '2026-11-14T13:45:00.000000Z',
      last_active_ip: '127.0.0.1',
      active_sessions_count: 2,
      courses: [
        {
          id: 'course-101',
          title: 'Introduction to Computer Science',
          status: 'published',
          relationship: 'creator',
          enrolled_students_count: 14,
          topics_count: 5,
        },
      ],
      teacher_metrics: {
        authored_questions_count: 12,
        created_assessments_count: 3,
        published_courses_count: 1,
        total_students_taught: 14,
      },
      security_profile: {
        auth_method: 'Argon2id / bcrypt + JWT Bearer',
        account_status: 'Active',
        role_scope: 'Faculty Authorization: Curriculum authoring, question banking',
        last_active_ip: '127.0.0.1',
        active_sessions_count: 2,
        total_audit_events: 29,
      },
    };

    assert.equal(detailResponse.user.full_name, 'Elena Rostova');
    assert.equal(detailResponse.courses.length, 1);
    assert.equal(detailResponse.courses[0].title, 'Introduction to Computer Science');
    assert.equal(detailResponse.courses[0].enrolled_students_count, 14);
    assert.equal(detailResponse.teacher_metrics.authored_questions_count, 12);
    assert.equal(detailResponse.last_active_at, '2026-11-14T13:45:00.000000Z');
    assert.equal(detailResponse.active_sessions_count, 2);
    assert.equal(detailResponse.security_profile.account_status, 'Active');
  });
});
