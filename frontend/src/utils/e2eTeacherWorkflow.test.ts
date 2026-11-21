/**
 * E2E Test Suite: Complete Teacher Workflow
 * Guided by e2e-testing-patterns skill:
 * 1. Teacher Authentication & Session Validation
 * 2. Teacher Dashboard KPI Retrieval
 * 3. Course Creation, Modification & Publication
 * 4. Topic Hierarchy & DAG Prerequisite Cycle Prevention
 * 5. Lesson Creation, Updating & Learning Resource Authoring
 * 6. Question Bank Manual Question Authoring & Validation
 * 7. AI Question Candidate Generation & Review (Approve/Reject)
 * 8. Assessment Composition, Scheduling & Publication Gate
 * 9. Teacher Analytics, Topic Heatmap & Score Distribution
 * 10. Full React UI Rendering for all Teacher Pages, Editors & Layout Shell
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
import { storage } from '../services/storageService.ts';
import { validatePrerequisiteAddition } from './dag.ts';
import { validateQuestion } from './assessment.ts';

// Teacher Portal UI Pages
import { DashboardPage as TeacherDashboardPage } from '../pages/teacher/DashboardPage.tsx';
import { CoursesPage } from '../pages/teacher/CoursesPage.tsx';
import { CourseOverviewPage } from '../pages/teacher/CourseOverviewPage.tsx';
import { CurriculumEditorPage } from '../pages/teacher/CurriculumEditorPage.tsx';
import { PrerequisiteManagerPage } from '../pages/teacher/PrerequisiteManagerPage.tsx';
import { ResourceManagerPage } from '../pages/teacher/ResourceManagerPage.tsx';
import { QuestionBankPage } from '../pages/teacher/QuestionBankPage.tsx';
import { QuestionEditorPage } from '../pages/teacher/QuestionEditorPage.tsx';
import { AIReviewPage } from '../pages/teacher/AIReviewPage.tsx';
import { AssessmentsPage } from '../pages/teacher/AssessmentsPage.tsx';
import { AssessmentEditorPage } from '../pages/teacher/AssessmentEditorPage.tsx';
import { AnalyticsPage } from '../pages/teacher/AnalyticsPage.tsx';
import { TeacherLayout } from '../components/teacher/TeacherLayout.tsx';

const BACKEND_BASE = 'http://127.0.0.1:8000/api/v1';

describe('Teacher Complete Workflow E2E Suite', () => {
  let teacherToken = '';
  let teacherUserId = '';
  let createdCourseId = '';
  let topic1Id = '';
  let topic2Id = '';
  let createdLessonId = '';
  let createdLesson2Id = '';
  let createdResourceId = '';
  let createdQuestionId = '';
  let generatedCandidateId = '';
  let createdAssessmentId = '';

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const courseTitle = `Distributed Systems & Architecture ${uniqueSuffix}`;

  describe('Phase 1: Teacher Authentication & Overview Dashboard', () => {
    test('POST /auth/login authenticates teacher credentials and issues JWT', async () => {
      const res = await fetch(`${BACKEND_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'teacher@learnova.edu',
          password: 'teacher123',
        }),
      });

      assert.equal(res.status, 200, 'Teacher login must return 200 OK');
      const data = await res.json();
      assert.ok(data.access_token, 'Access token must be present');
      assert.equal(data.user.role, 'teacher');
      teacherToken = data.access_token;
      teacherUserId = data.user.id;
      authApi.setAccessToken(teacherToken);
      authApi.setStoredUser(data.user);
    });

    test('GET /teacher/dashboard retrieves teacher assigned courses and active assessments', async () => {
      const res = await fetch(`${BACKEND_BASE}/teacher/dashboard`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });

      assert.equal(res.status, 200, 'Teacher dashboard must return 200');
      const dash = await res.json();
      assert.ok(Array.isArray(dash.assigned_courses));
      assert.ok(dash.assigned_courses.length >= 1, 'Teacher must have assigned courses');
      assert.ok(typeof dash.total_students_reach === 'number');
    });
  });

  describe('Phase 2: Course Creation & Curriculum Architecture', () => {
    test('POST /courses creates a new course in draft status', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          title: courseTitle,
          description: 'Advanced patterns in distributed computing, Paxos consensus, and reactive pipelines.',
        }),
      });

      assert.equal(res.status, 201, 'Course creation must return 201 Created');
      const course = await res.json();
      assert.ok(course.id, 'Course ID must be defined');
      assert.equal(course.title, courseTitle);
      assert.equal(course.status, 'draft');
      createdCourseId = course.id;
    });

    test('PATCH /courses/{id} updates course title and description', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses/${createdCourseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          title: `${courseTitle} (Refined)`,
          description: 'Refined course description with hands-on architectural blueprints.',
        }),
      });

      assert.equal(res.status, 200, 'Course update must return 200 OK');
      const updated = await res.json();
      assert.equal(updated.title, `${courseTitle} (Refined)`);
    });

    test('POST /courses/{id}/topics creates Topic 1 (Foundations)', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses/${createdCourseId}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          title: 'Foundations of Distributed Systems',
          description: 'Network topology, synchronous vs asynchronous models, latency bounds.',
          order: 1,
          mastery_threshold: 0.8,
        }),
      });

      assert.equal(res.status, 201, 'Topic 1 creation must return 201 Created');
      const topic = await res.json();
      assert.ok(topic.id);
      assert.equal(topic.course_id, createdCourseId);
      topic1Id = topic.id;
    });

    test('POST /topics/{id}/lessons adds instructional unit to Topic 1', async () => {
      const res = await fetch(`${BACKEND_BASE}/topics/${topic1Id}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          title: 'Network Partitions and Split-Brain Resolution',
          description: 'Partition detection, fencing tokens, quorum leases, and reconciliation.',
          order: 1,
        }),
      });

      assert.equal(res.status, 201, 'Lesson 1 creation must return 201 Created');
      const lesson = await res.json();
      assert.ok(lesson.id);
      assert.equal(lesson.topic_id, topic1Id);
      createdLessonId = lesson.id;
    });

    test('POST /courses/{id}/topics creates Topic 2 (Consensus Protocols)', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses/${createdCourseId}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          title: 'Consensus Protocols (Raft & Paxos)',
          description: 'Leader election, log replication, quorum intersections, and heartbeat mechanics.',
          order: 2,
          mastery_threshold: 0.85,
        }),
      });

      assert.equal(res.status, 201, 'Topic 2 creation must return 201 Created');
      const topic = await res.json();
      assert.ok(topic.id);
      topic2Id = topic.id;
    });

    test('POST /topics/{id}/lessons adds instructional unit to Topic 2', async () => {
      const res = await fetch(`${BACKEND_BASE}/topics/${topic2Id}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          title: 'Raft Log Replication and Safety Invariants',
          description: 'Terms, log indices, committed entries, and state machine transitions.',
          order: 1,
        }),
      });

      assert.equal(res.status, 201, 'Lesson 2 creation must return 201 Created');
      const lesson = await res.json();
      assert.ok(lesson.id);
      assert.equal(lesson.topic_id, topic2Id);
      createdLesson2Id = lesson.id;
    });

    test('PUT /topics/{id}/prerequisites establishes DAG dependency (Topic 2 depends on Topic 1)', async () => {
      const res = await fetch(`${BACKEND_BASE}/topics/${topic2Id}/prerequisites`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          prerequisite_topic_ids: [topic1Id],
        }),
      });

      assert.equal(res.status, 200, 'Prerequisite update must return 200 OK');
      const edgeData = await res.json();
      assert.equal(edgeData.topic_id, topic2Id);
      assert.ok(edgeData.prerequisite_topic_ids.includes(topic1Id));
    });

    test('DAG cycle detection blocks circular prerequisite addition', () => {
      const graph = {
        [topic2Id]: [topic1Id],
      };
      // Attempting to add topic2 as prerequisite of topic1 creates a cycle
      const cycleCheck = validatePrerequisiteAddition(graph, topic1Id, topic2Id);
      assert.equal(cycleCheck.valid, false, 'Circular dependency must be rejected');
      assert.match(cycleCheck.error || '', /circular prerequisite path/i);
    });

    test('POST /courses/{id}/publish publishes course to catalog after topics have lessons', async () => {
      const res = await fetch(`${BACKEND_BASE}/courses/${createdCourseId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
      });

      assert.equal(res.status, 200, 'Course publication must succeed');
      const published = await res.json();
      assert.equal(published.status, 'published');
    });
  });

  describe('Phase 3: Lesson Updating & Learning Resource Authoring', () => {
    test('PATCH /lessons/{id} updates lesson metadata', async () => {
      const res = await fetch(`${BACKEND_BASE}/lessons/${createdLessonId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          title: 'Network Partitions & Quorum Fencing Tokens',
          description: 'Updated comprehensive lesson guide on distributed consensus fencing.',
        }),
      });

      assert.equal(res.status, 200, 'Lesson update must return 200 OK');
      const lesson = await res.json();
      assert.equal(lesson.title, 'Network Partitions & Quorum Fencing Tokens');
    });

    test('POST /lessons/{id}/resources attaches rich markdown study resource', async () => {
      const res = await fetch(`${BACKEND_BASE}/lessons/${createdLessonId}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          title: 'Distributed Consensus & Fencing Reference Manual',
          type: 'markdown',
          content_or_url: '# Fencing Tokens\nFencing tokens are monotonically increasing integers issued by lock servers to invalidate stale clients.',
        }),
      });

      assert.equal(res.status, 201, 'Resource creation must return 201 Created');
      const resource = await res.json();
      assert.ok(resource.id);
      assert.equal(resource.lesson_id, createdLessonId);
      createdResourceId = resource.id;
    });
  });

  describe('Phase 4: Question Bank Authoring & Validation', () => {
    test('validateQuestion identifies empty prompts and missing correct options', () => {
      const emptyIssues = validateQuestion({
        prompt: '',
        courseId: createdCourseId,
        topicId: topic1Id,
        type: 'multiple_choice',
        difficulty: 'medium',
        points: 2,
        options: [{ id: '1', text: 'Option A', isCorrect: true }],
      });
      assert.ok(emptyIssues.length > 0, 'Empty prompt must generate validation issues');
      assert.ok(emptyIssues.some((i) => i.field === 'prompt'));

      const noCorrectIssues = validateQuestion({
        prompt: 'What is a fencing token?',
        courseId: createdCourseId,
        topicId: topic1Id,
        type: 'multiple_choice',
        difficulty: 'medium',
        points: 2,
        options: [
          { id: '1', text: 'Option A', isCorrect: false },
          { id: '2', text: 'Option B', isCorrect: false },
        ],
      });
      assert.ok(noCorrectIssues.length > 0, 'No correct option must generate validation issues');
      assert.ok(noCorrectIssues.some((i) => i.field === 'options'));
    });

    test('POST /questions creates a Multiple Choice Question in the bank', async () => {
      const res = await fetch(`${BACKEND_BASE}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          course_id: createdCourseId,
          topic_id: topic1Id,
          type: 'multiple_choice',
          difficulty: 'medium',
          points: 2,
          prompt: 'What primary failure mode is mitigated by utilizing monotonically increasing fencing tokens?',
          explanation: 'Fencing tokens reject stale write requests from clients experiencing transient network pauses.',
          options: [
            { text: 'Split-brain stale writes from paused clients', is_correct: true },
            { text: 'Packet corruption in transit', is_correct: false },
            { text: 'Hardware clock drift in milliseconds', is_correct: false },
            { text: 'Exhaustion of database connection pools', is_correct: false },
          ],
        }),
      });

      assert.equal(res.status, 201, 'Question authoring must return 201 Created');
      const question = await res.json();
      assert.ok(question.id);
      assert.equal(question.course_id, createdCourseId);
      assert.equal(question.type, 'multiple_choice');
      createdQuestionId = question.id;
    });

    test('GET /questions lists questions filtered by course and topic', async () => {
      const res = await fetch(`${BACKEND_BASE}/questions?course_id=${createdCourseId}&topic_id=${topic1Id}`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });

      assert.equal(res.status, 200, 'Questions listing must return 200');
      const list = await res.json();
      assert.ok(Array.isArray(list));
      const match = list.find((q: any) => q.id === createdQuestionId);
      assert.ok(match, 'Authored question must be listed');
    });

    test('POST /questions creates a True/False Question in the bank', async () => {
      const res = await fetch(`${BACKEND_BASE}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          course_id: createdCourseId,
          topic_id: topic1Id,
          type: 'true_false',
          difficulty: 'easy',
          points: 1,
          prompt: 'A network partition can cause two nodes to believe they are both the active leader.',
          explanation: 'Without a consensus quorum or fencing tokens, split-brain scenarios emerge.',
          answer_key: { correct_bool: true },
        }),
      });

      assert.equal(res.status, 201, 'True/False question creation must return 201 Created');
      const question = await res.json();
      assert.ok(question.id);
      assert.equal(question.type, 'true_false');
    });
  });

  describe('Phase 5: AI Candidate Question Generation & Governance', () => {
    test('POST /ai/generate-questions triggers quarantined candidate generation', async () => {
      const res = await fetch(`${BACKEND_BASE}/ai/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          course_id: createdCourseId,
          topic_id: topic1Id,
          lesson_id: createdLessonId,
          question_count: 2,
          difficulty: 'medium',
          type: 'multiple_choice',
          focus_prompt: 'Generate questions evaluating student understanding of fencing tokens and network partitions.',
        }),
      });

      assert.equal(res.status, 201, 'AI Question generation must return 201 Created');
      const candidates = await res.json();
      assert.ok(Array.isArray(candidates));
      assert.ok(candidates.length > 0, 'At least 1 candidate must be generated');

      const firstCand = candidates[0];
      assert.ok(firstCand.id);
      assert.equal(firstCand.status, 'pending_review');
      generatedCandidateId = firstCand.id;
    });

    test('GET /ai/candidates lists quarantined candidate questions for course', async () => {
      const res = await fetch(`${BACKEND_BASE}/ai/candidates?course_id=${createdCourseId}`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });

      assert.equal(res.status, 200, 'Candidate listing must return 200');
      const result = await res.json();
      assert.ok(Array.isArray(result.items));
      const match = result.items.find((c: any) => c.id === generatedCandidateId);
      assert.ok(match, 'Generated candidate must be found in review queue');
    });

    test('POST /ai/candidates/{id}/approve promotes candidate into Question Bank', async () => {
      const res = await fetch(`${BACKEND_BASE}/ai/candidates/${generatedCandidateId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
      });

      assert.equal(res.status, 200, 'Candidate approval must succeed');
      const approval = await res.json();
      assert.equal(approval.success, true);
      assert.ok(approval.approved_question_id, 'Approved question ID must be returned');
    });

    test('POST /ai/candidates/{id}/reject rejects candidate with feedback reason', async () => {
      // Find remaining pending candidate in course review queue
      const resList = await fetch(`${BACKEND_BASE}/ai/candidates?course_id=${createdCourseId}&status=pending_review`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const listData = await resList.json();
      const candToReject = listData.items && listData.items.find((c: any) => c.id !== generatedCandidateId);

      if (candToReject) {
        const rejectRes = await fetch(`${BACKEND_BASE}/ai/candidates/${candToReject.id}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${teacherToken}`,
          },
          body: JSON.stringify({ reason: 'Question requires deeper architectural scenario context.' }),
        });
        assert.equal(rejectRes.status, 200, 'Candidate rejection must return 200 OK');
        const rejectData = await rejectRes.json();
        assert.equal(rejectData.status, 'rejected');
      }
    });
  });

  describe('Phase 6: Assessment Composition, Publication & Scheduling', () => {
    test('POST /assessments creates a summative assessment draft', async () => {
      const res = await fetch(`${BACKEND_BASE}/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          course_id: createdCourseId,
          topic_id: topic1Id,
          title: 'Distributed Systems Unit 1 Comprehensive Exam',
          type: 'summative',
          instructions: 'Complete all questions. Monitored session with 45-minute countdown timer.',
          time_limit_minutes: 45,
          passing_score_percent: 75,
          questions: [{ question_id: createdQuestionId, order: 1, points: 2 }],
        }),
      });

      assert.equal(res.status, 201, 'Assessment creation must return 201 Created');
      const asm = await res.json();
      assert.ok(asm.id);
      assert.equal(asm.status, 'draft');
      createdAssessmentId = asm.id;
    });

    test('POST /assessments/{id}/publish executes quality gate and publishes assessment', async () => {
      const res = await fetch(`${BACKEND_BASE}/assessments/${createdAssessmentId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
      });

      assert.equal(res.status, 200, 'Assessment publish must return 200 OK');
      const asm = await res.json();
      assert.equal(asm.status, 'published');
    });
  });

  describe('Phase 7: Teacher Course Analytics & Telemetry', () => {
    test('GET /teacher/courses/{id}/analytics retrieves cohort metrics and topic mastery heatmap', async () => {
      const res = await fetch(`${BACKEND_BASE}/teacher/courses/${createdCourseId}/analytics`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });

      assert.equal(res.status, 200, 'Teacher course analytics must return 200');
      const analytics = await res.json();
      assert.equal(analytics.course_id, createdCourseId);
      assert.ok(typeof analytics.enrolled_students_count === 'number');
      assert.ok(Array.isArray(analytics.topic_mastery_distribution));
    });
  });

  describe('Phase 8: Full React UI Rendering for all Teacher Pages & Layout', () => {
    const mockTeacher = {
      id: teacherUserId || 'tch-test-id',
      name: 'Elena Rostova',
      email: 'teacher@learnova.edu',
      department: 'Computer Science & Engineering',
    };

    const mockCourses = storage.getCourses();
    const mockTopics = storage.getTopics();
    const mockLessons = storage.getLessons();
    const mockResources = storage.getResources();
    const mockQuestions = storage.getQuestions();
    const mockCandidates = storage.getCandidates();
    const mockAssessments = storage.getAssessments();
    const mockAttempts = storage.getAttempts();

    const activeCourse = mockCourses[0];

    test('Tab 1: TeacherDashboardPage renders course metrics and quick links', () => {
      const html = renderToString(
        React.createElement(TeacherDashboardPage, {
          courses: mockCourses,
          assessments: mockAssessments,
          candidates: mockCandidates,
          attempts: mockAttempts,
          onNavigate: () => {},
          onCreateCourse: () => {},
        })
      );
      assert.ok(html.includes('view-enter-animation'));
      assert.ok(html.includes('Courses') || html.includes('Teaching Dashboard'));
    });

    test('Tab 2: CoursesPage renders course management table and status indicators', () => {
      const html = renderToString(
        React.createElement(CoursesPage, {
          courses: mockCourses,
          topics: mockTopics,
          lessons: mockLessons,
          onNavigate: () => {},
          onSaveCourse: () => {},
          onDeleteCourse: () => {},
        })
      );
      assert.ok(html.includes('Courses'));
      assert.ok(html.includes('Create course') || html.includes('Manage'));
    });

    test('Tab 3: CourseOverviewPage renders syllabus stats and action hubs', () => {
      if (activeCourse) {
        const html = renderToString(
          React.createElement(CourseOverviewPage, {
            course: activeCourse,
            topics: mockTopics.filter((t) => t.courseId === activeCourse.id),
            lessons: mockLessons.filter((l) => l.courseId === activeCourse.id),
            resources: mockResources.filter((r) => r.courseId === activeCourse.id),
            assessments: mockAssessments.filter((a) => a.courseId === activeCourse.id),
            onNavigate: () => {},
            onUpdateCourse: () => {},
          })
        );
        assert.ok(html.includes('Overview') || html.includes('Curriculum') || html.includes('Syllabus'));
      }
    });

    test('Tab 4: CurriculumEditorPage renders topics tree and re-ordering controls', () => {
      if (activeCourse) {
        const html = renderToString(
          React.createElement(CurriculumEditorPage, {
            course: activeCourse,
            topics: mockTopics.filter((t) => t.courseId === activeCourse.id),
            lessons: mockLessons.filter((l) => l.courseId === activeCourse.id),
            resources: mockResources.filter((r) => r.courseId === activeCourse.id),
            assessments: mockAssessments.filter((a) => a.courseId === activeCourse.id),
            onNavigate: () => {},
            onSaveTopic: async (t) => t,
            onDeleteTopic: () => {},
            onSaveLesson: async (l) => l,
            onDeleteLesson: () => {},
            onSaveAssessment: () => {},
            onSaveResource: () => {},
            onNotify: () => {},
          })
        );
        assert.ok(html.includes('Curriculum') || html.includes('Topics') || html.includes('Lessons'));
      }
    });

    test('Tab 5: PrerequisiteManagerPage renders DAG visualizer and edge controls', () => {
      if (activeCourse) {
        const html = renderToString(
          React.createElement(PrerequisiteManagerPage, {
            course: activeCourse,
            currentTopic: mockTopics[0],
            allTopics: mockTopics.filter((t) => t.courseId === activeCourse.id),
            onNavigate: () => {},
            onSavePrerequisites: () => {},
            onNotify: () => {},
          })
        );
        assert.ok(html.includes('Prerequisite') || html.includes('DAG') || html.includes('Dependencies'));
      }
    });

    test('Tab 6: ResourceManagerPage renders uploaded study materials and type badges', () => {
      if (activeCourse) {
        const html = renderToString(
          React.createElement(ResourceManagerPage, {
            course: activeCourse,
            topic: mockTopics[0],
            lesson: mockLessons[0],
            resources: mockResources.filter((r) => r.courseId === activeCourse.id),
            allLessons: mockLessons.filter((l) => l.courseId === activeCourse.id),
            onNavigate: () => {},
            onSaveResource: () => {},
            onDeleteResource: () => {},
            onNotify: () => {},
          })
        );
        assert.ok(html.includes('Resource') || html.includes('Learning Resources') || html.includes('Materials'));
      }
    });

    test('Tab 7: QuestionBankPage renders question repository with difficulty filters', () => {
      const html = renderToString(
        React.createElement(QuestionBankPage, {
          courses: mockCourses,
          topics: mockTopics,
          lessons: mockLessons,
          questions: mockQuestions,
          onNavigate: () => {},
          onDeleteQuestion: () => {},
          onNotify: () => {},
        })
      );
      assert.ok(html.includes('Question Bank') || html.includes('Questions'));
    });

    test('Tab 8: QuestionEditorPage renders question authoring form with options & rubric', () => {
      const html = renderToString(
        React.createElement(QuestionEditorPage, {
          initialQuestion: mockQuestions[0] as any,
          courses: mockCourses,
          topics: mockTopics,
          onNavigate: () => {},
          onSaveQuestion: () => {},
          onNotify: () => {},
        })
      );
      assert.ok(html.includes('Question') || html.includes('Prompt') || html.includes('Options'));
    });

    test('Tab 9: AIReviewPage renders quarantined candidates with approve/reject buttons', () => {
      const html = renderToString(
        React.createElement(AIReviewPage, {
          courses: mockCourses,
          topics: mockTopics,
          lessons: mockLessons,
          resources: mockResources,
          candidates: mockCandidates,
          onNavigate: () => {},
          onSaveGeneratedCandidates: () => {},
          onUpdateCandidateStatus: () => {},
          onDeleteCandidate: () => {},
          onNotify: () => {},
        })
      );
      assert.ok(html.includes('AI') || html.includes('Candidates') || html.includes('Review'));
    });

    test('Tab 10: AssessmentsPage renders published and scheduled assessments list', () => {
      const html = renderToString(
        React.createElement(AssessmentsPage, {
          assessments: mockAssessments,
          courses: mockCourses,
          topics: mockTopics,
          questions: mockQuestions,
          onNavigate: () => {},
          onSaveAssessment: () => {},
          onDeleteAssessment: () => {},
          onNotify: () => {},
        })
      );
      assert.ok(html.includes('Assessments') || html.includes('Quizzes') || html.includes('Exams'));
    });

    test('Tab 11: AssessmentEditorPage renders timing, scoring and question attachment list', () => {
      const html = renderToString(
        React.createElement(AssessmentEditorPage, {
          initialAssessment: mockAssessments[0],
          courses: mockCourses,
          topics: mockTopics,
          questions: mockQuestions,
          onNavigate: () => {},
          onSaveAssessment: () => {},
          onNotify: () => {},
        })
      );
      assert.ok(html.includes('Assessment') || html.includes('Questions') || html.includes('Time Limit'));
    });

    test('Tab 12: AnalyticsPage renders teacher cohort analytics and score distribution graphs', () => {
      const html = renderToString(
        React.createElement(AnalyticsPage, {
          courses: mockCourses,
          topics: mockTopics,
          assessments: mockAssessments,
          attempts: mockAttempts,
          selectedCourseId: mockCourses[0]?.id,
          onNavigate: () => {},
          onNotify: () => {},
        })
      );
      assert.ok(html.includes('Analytics') || html.includes('Mastery') || html.includes('Cohort'));
    });

    test('Layout: TeacherLayout renders breadcrumb routing tree and quick switches', () => {
      const html = renderToString(
        React.createElement(
          TeacherLayout,
          {
            currentPage: 'overview',
            onNavigate: () => {},
            selectedCourseId: activeCourse?.id,
            selectedCourseTitle: activeCourse?.title,
            teacherUser: mockTeacher,
            onSignOut: () => {},
            onSwitchPortal: () => {},
            onSwitchToPublic: () => {},
            breadcrumbs: [{ label: 'Courses' }, { label: 'Software Architecture' }],
            toasts: [],
            onDismissToast: () => {},
          },
          React.createElement('div', { id: 'teacher-workspace' }, 'Teacher Content')
        )
      );
      assert.ok(html.includes('Learnova'));
      assert.ok(html.includes('Teacher Portal') || html.includes('Teacher'));
      assert.ok(html.includes('Teacher Content'));
    });
  });
});
