/**
 * @deprecated [Phase 11 Mock Retirement / Slice 10]
 * StorageService has been superseded by live REST API clients:
 * - authApi: Authentication & Profile Security (Slice 1)
 * - coursesApi: Course Catalog & Enrollments (Slice 2)
 * - learningPathApi: Learning Map & DAG Readiness (Slice 3)
 * - curriculumApi: Lessons & Resource Activity (Slice 4)
 * - assessmentApi: Assessment Attempts & Grading (Slice 5)
 * - gamificationApi: Gamification Profile, XP & Badges (Slice 6)
 * - masteryApi: BKT Mastery Matrix (Slice 6)
 * - teacherApi: Curriculum Authoring, Question Bank & Assessment Publishing (Slices 7-8)
 * - adminApi: Platform Overview, User Governance, Audit Logs & System Health (Slice 9)
 *
 * This service is retained solely as an offline fallback and isolated test fixture.
 * Direct persistence mutations here are strictly non-authoritative when a backend session is active.
 */

import type {
  Course,
  Topic,
  Lesson,
  LearningResource,
  QuestionData,
  AICandidateQuestion,
  Assessment,
  AssessmentAttempt,
  TeacherUser,
  StudentUser,
  Enrollment,
  LessonCompletion,
  MasteryState,
  MasteryStatus,
  LearningPathItem,
  GamificationProfile,
  XPEvent,
  XPEventType,
  Badge,
  LeaderboardEntry,
  StudentAssessmentSession,
  StudentAssessmentResult,
  UserAccount,
  UserRole,
  AuditEvent,
  ServiceHealthCheck,
} from '../types/index.ts';
import {
  validateRoleChange,
  validateAccountStatusChange,
  maskIpAddress,
  generateCorrelationId,
} from '../utils/adminLogic.ts';

export const CURRENT_ADMIN: UserAccount = {
  id: 'd9a8cd82-8d83-4b54-bcea-64e0ded0f5d4',
  name: 'Sarah Connor',
  email: 'admin@learnova.edu',
  role: 'administrator',
  isActive: true,
  createdAt: '2026-08-15T08:00:00Z',
  lastActiveAt: '2026-10-18T09:40:00Z',
  avatar: 'SC',
  department: 'System Governance & Security',
};

export const CURRENT_TEACHER: TeacherUser = {
  id: 'c669ebe0-8bf3-43e7-816d-20a5f9b2c53a',
  name: 'Elena Rostova',
  email: 'teacher@learnova.edu',
  role: 'teacher',
  department: 'Faculty of Computer Science',
};

const SEED_USERS: UserAccount[] = [
  {
    id: 'd9a8cd82-8d83-4b54-bcea-64e0ded0f5d4',
    name: 'Sarah Connor',
    email: 'admin@learnova.edu',
    role: 'administrator',
    isActive: true,
    createdAt: '2026-08-15T08:00:00Z',
    lastActiveAt: '2026-10-18T09:40:00Z',
    avatar: 'SC',
    department: 'System Governance & Security',
  },
  {
    id: 'c669ebe0-8bf3-43e7-816d-20a5f9b2c53a',
    name: 'Elena Rostova',
    email: 'teacher@learnova.edu',
    role: 'teacher',
    isActive: true,
    createdAt: '2026-09-01T09:00:00Z',
    lastActiveAt: '2026-10-18T08:15:00Z',
    avatar: 'ER',
    department: 'Faculty of Computer Science',
    assignedCoursesCount: 3,
  },
  {
    id: '3942ea18-ac60-4c94-8d3b-bdb1db7f8b16',
    name: 'Alex Rivera',
    email: 'student@learnova.edu',
    role: 'student',
    isActive: true,
    createdAt: '2026-09-10T10:00:00Z',
    lastActiveAt: '2026-10-18T09:12:00Z',
    avatar: 'AR',
    enrolledCoursesCount: 3,
  },
  {
    id: '7a1f1f7d-1461-4364-9854-cafc519dde9a',
    name: 'haseeb',
    email: 'haseeb@gmail.com',
    role: 'student',
    isActive: true,
    createdAt: '2026-09-15T10:00:00Z',
    lastActiveAt: '2026-10-18T09:12:00Z',
    avatar: 'H',
    enrolledCoursesCount: 0,
  },
];

const SEED_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'aud-seed-1',
    timestamp: '2026-10-18T09:15:22Z',
    actorId: 'adm-sarah',
    actorName: 'Sarah Connor',
    actorEmail: 's.connor@learnova.edu',
    actorRole: 'administrator',
    action: 'ADMIN_LOGIN',
    targetType: 'session',
    targetId: 'sess-8192a',
    targetName: 'Sarah Connor (Admin Session)',
    outcome: 'success',
    correlationId: 'corr-auth-8812',
    reason: 'Multi-factor administrative portal authentication',
    ipAddressSafe: '192.168.1.*** (Masked)',
  },
  {
    id: 'aud-seed-2',
    timestamp: '2026-10-17T16:42:10Z',
    actorId: 'adm-sarah',
    actorName: 'Sarah Connor',
    actorEmail: 's.connor@learnova.edu',
    actorRole: 'administrator',
    action: 'ROLE_CHANGE',
    targetType: 'user',
    targetId: 'teacher-103',
    targetName: 'Dr. Ada Lovelace',
    outcome: 'success',
    correlationId: 'corr-rbac-9411',
    reason: 'Faculty appointment to Computer Systems faculty',
    details: { previousRole: 'student', newRole: 'teacher' },
    ipAddressSafe: '192.168.1.*** (Masked)',
  },
  {
    id: 'aud-seed-3',
    timestamp: '2026-10-17T11:05:44Z',
    actorId: 'adm-marcus',
    actorName: 'Marcus Vance',
    actorEmail: 'm.vance@learnova.edu',
    actorRole: 'administrator',
    action: 'ACCOUNT_DEACTIVATED',
    targetType: 'user',
    targetId: 'std-marcus',
    targetName: 'Marcus Brody',
    outcome: 'success',
    correlationId: 'corr-stat-3109',
    reason: 'Scheduled non-activity dormancy policy compliance',
    ipAddressSafe: '10.0.4.*** (Masked)',
  },
  {
    id: 'aud-seed-4',
    timestamp: '2026-10-16T14:18:03Z',
    actorId: 'teacher-101',
    actorName: 'Dr. Elena Rostova',
    actorEmail: 'e.rostova@learnova.edu',
    actorRole: 'teacher',
    action: 'PASSWORD_CHANGED',
    targetType: 'user',
    targetId: 'teacher-101',
    targetName: 'Dr. Elena Rostova',
    outcome: 'success',
    correlationId: 'corr-pass-5521',
    reason: 'Routine quarterly password rotation',
    ipAddressSafe: '172.16.2.*** (Masked)',
  },
  {
    id: 'aud-seed-5',
    timestamp: '2026-10-15T22:30:19Z',
    actorId: 'unauth-sess',
    actorName: 'Unauthenticated Request',
    actorEmail: 'guest@external.net',
    actorRole: 'student',
    action: 'PERMISSION_OVERRIDE_ATTEMPT',
    targetType: 'system',
    targetId: 'admin-config',
    targetName: 'System Authorization Registry',
    outcome: 'blocked',
    correlationId: 'corr-sec-0199',
    reason: 'Direct API invocation attempt without administrator JWT scope',
    ipAddressSafe: '203.0.113.*** (Masked)',
  },
];

const SEED_SERVICE_HEALTH: ServiceHealthCheck[] = [
  {
    id: 'svc-core-api',
    name: 'Learnova Core REST API',
    category: 'api',
    status: 'healthy',
    latencyMs: 18,
    uptimePercent: 99.99,
    lastChecked: '2026-10-18T09:42:00Z',
    description: 'Express gateway processing curriculum, user, and assessment requests.',
  },
  {
    id: 'svc-postgres',
    name: 'PostgreSQL Relational DB',
    category: 'database',
    status: 'healthy',
    latencyMs: 12,
    uptimePercent: 99.98,
    lastChecked: '2026-10-18T09:42:00Z',
    description: 'Relational storage for course nodes, user accounts, and attempts.',
  },
  {
    id: 'svc-auth-jwt',
    name: 'Auth & JWT Session Broker',
    category: 'auth',
    status: 'healthy',
    latencyMs: 14,
    uptimePercent: 100.0,
    lastChecked: '2026-10-18T09:42:00Z',
    description: 'Role-based access token verification and password security.',
  },
  {
    id: 'svc-dag-worker',
    name: 'DAG Prerequisite Worker',
    category: 'worker',
    status: 'healthy',
    latencyMs: 24,
    uptimePercent: 99.95,
    lastChecked: '2026-10-18T09:42:00Z',
    description: 'Asynchronous DAG cycle detection and mastery recalibration engine.',
  },
  {
    id: 'svc-gemini-ai',
    name: 'External AI Adapter (Gemini)',
    category: 'ai_service',
    status: 'healthy',
    latencyMs: 142,
    uptimePercent: 99.85,
    lastChecked: '2026-10-18T09:42:00Z',
    description: 'LLM adapter for AI question generation and adaptive tutoring.',
    incidentNotes: 'Operating normally within rate-limit quotas.',
  },
  {
    id: 'svc-cache-layer',
    name: 'Adaptive In-Memory Cache',
    category: 'cache',
    status: 'healthy',
    latencyMs: 4,
    uptimePercent: 100.0,
    lastChecked: '2026-10-18T09:42:00Z',
    description: 'Fast topic caching and student session state acceleration.',
  },
];

const CURRENT_STORAGE_VERSION = 'learnova_v6_clean_db';
if (typeof localStorage !== 'undefined') {
  try {
    if (localStorage.getItem('learnova_storage_version') !== CURRENT_STORAGE_VERSION) {
      localStorage.clear();
      localStorage.setItem('learnova_storage_version', CURRENT_STORAGE_VERSION);
    }
  } catch {
    // Ignore storage errors in restrictive environments
  }
}

const SEED_COURSES: Course[] = [];

const SEED_TOPICS: Topic[] = [];

const SEED_LESSONS: Lesson[] = [];

const SEED_RESOURCES: LearningResource[] = [];

const SEED_QUESTIONS: QuestionData[] = [];

const SEED_AI_CANDIDATES: AICandidateQuestion[] = [];

const SEED_ASSESSMENTS: Assessment[] = [];

const SEED_ATTEMPTS: AssessmentAttempt[] = [];

export const CURRENT_STUDENT: StudentUser = {
  id: '3942ea18-ac60-4c94-8d3b-bdb1db7f8b16',
  name: 'Alex Rivera',
  email: 'student@learnova.edu',
  avatar: 'AR',
  role: 'student',
  bio: 'Computer Science undergraduate passionate about systems software, algorithms, and AI.',
  joinDate: '2026-09-15',
  preferences: {
    theme: 'light',
    leaderboardOptIn: true,
    emailNotifications: true,
  },
};

const SEED_ENROLLMENTS: Enrollment[] = [];

const SEED_LESSON_COMPLETIONS: LessonCompletion[] = [];

const SEED_MASTERY_STATES: MasteryState[] = [];

const SEED_GAMIFICATION_PROFILE: GamificationProfile = {
  id: 'gp-default',
  studentId: '',
  xp: 0,
  level: 1,
  streakDays: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
};

const SEED_XP_EVENTS: XPEvent[] = [];

const SEED_BADGES: Badge[] = [
  {
    id: 'badge-first-step',
    title: 'First Step',
    description: 'Enrolled in a course and completed the first curriculum unit.',
    icon: 'Footprints',
    category: 'achievement',
    isUnlocked: false,
  },
  {
    id: 'badge-diagnostic',
    title: 'Diagnostic Pioneer',
    description: 'Completed initial diagnostic baseline assessment to calibrate mastery.',
    icon: 'Compass',
    category: 'achievement',
    isUnlocked: false,
  },
  {
    id: 'badge-syntax-master',
    title: 'Syntax Virtuoso',
    description: 'Achieved 85%+ mastery in Syntax, Variables & Primitive Data Types.',
    icon: 'Code',
    category: 'mastery',
    isUnlocked: false,
  },
  {
    id: 'badge-streak',
    title: 'Streak Sentinel',
    description: 'Maintained a 3-day or greater continuous learning streak.',
    icon: 'Flame',
    category: 'streak',
    isUnlocked: false,
  },
  {
    id: 'badge-adaptive-ace',
    title: 'Adaptive Ace',
    description: 'Complete an adaptive practice session with difficulty escalation above 80%.',
    icon: 'Zap',
    category: 'mastery',
    isUnlocked: false,
  },
  {
    id: 'badge-exam-scholar',
    title: 'Summative Scholar',
    description: 'Successfully pass a formal final examination and satisfy course completion criteria.',
    icon: 'GraduationCap',
    category: 'exam',
    isUnlocked: false,
  },
  {
    id: 'badge-mastery-titan',
    title: 'Mastery Titan',
    description: 'Attain 100% topic mastery across all course syllabus units.',
    icon: 'Crown',
    category: 'mastery',
    isUnlocked: false,
  },
];

const SEED_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    studentId: 'std-clara',
    displayName: 'Clara Vance',
    avatar: 'CV',
    xp: 1420,
    level: 4,
    earnedBadgesCount: 4,
    badges: [
      { id: 'b1', title: 'First Step', icon: 'Footprints', description: 'Enrolled and completed first lesson' },
      { id: 'b2', title: 'Diagnostic Pioneer', icon: 'Compass', description: 'Calibrated baseline' },
      { id: 'b3', title: 'Syntax Virtuoso', icon: 'Code', description: '85%+ mastery in Syntax' },
      { id: 'b4', title: 'Adaptive Ace', icon: 'Zap', description: '80%+ on adaptive practice' },
    ],
  },
  {
    rank: 2,
    studentId: 'std-marcus',
    displayName: 'Marcus Brody',
    avatar: 'MB',
    xp: 980,
    level: 3,
    earnedBadgesCount: 2,
    badges: [
      { id: 'b1', title: 'First Step', icon: 'Footprints', description: 'Enrolled and completed first lesson' },
      { id: 'b3', title: 'Syntax Virtuoso', icon: 'Code', description: '85%+ mastery in Syntax' },
    ],
  },
  {
    rank: 3,
    studentId: 'std-sarah',
    displayName: 'Sarah Jenkins',
    avatar: 'SJ',
    xp: 750,
    level: 3,
    earnedBadgesCount: 2,
    badges: [
      { id: 'b1', title: 'First Step', icon: 'Footprints', description: 'Enrolled and completed first lesson' },
      { id: 'b4', title: 'Streak Sentinel', icon: 'Flame', description: '3-day streak' },
    ],
  },
  {
    rank: 4,
    studentId: 'std-alex',
    displayName: 'Alex Rivera',
    avatar: 'AR',
    xp: 520,
    level: 2,
    earnedBadgesCount: 4,
    isCurrentUser: false,
    badges: [
      { id: 'badge-first-step', title: 'First Step', icon: 'Footprints', description: 'Enrolled and completed first lesson' },
      { id: 'badge-diagnostic', title: 'Diagnostic Pioneer', icon: 'Compass', description: 'Completed baseline diagnostic' },
      { id: 'badge-syntax-master', title: 'Syntax Virtuoso', icon: 'Code', description: '85%+ mastery in Syntax' },
      { id: 'badge-streak', title: 'Streak Sentinel', icon: 'Flame', description: '3-day streak maintained' },
    ],
  },
  {
    rank: 5,
    studentId: 'std-liam',
    displayName: 'Liam Zhao',
    avatar: 'LZ',
    xp: 440,
    level: 2,
    earnedBadgesCount: 1,
    badges: [
      { id: 'b1', title: 'First Step', icon: 'Footprints', description: 'Enrolled and completed first lesson' },
    ],
  },
  {
    rank: 6,
    studentId: 'std-priya',
    displayName: 'Priya Sharma',
    avatar: 'PS',
    xp: 380,
    level: 2,
    earnedBadgesCount: 1,
    badges: [
      { id: 'b1', title: 'First Step', icon: 'Footprints', description: 'Enrolled and completed first lesson' },
    ],
  },
  {
    rank: 7,
    studentId: 'std-devon',
    displayName: 'Devon Miller',
    avatar: 'DM',
    xp: 290,
    level: 2,
    earnedBadgesCount: 1,
    badges: [
      { id: 'b1', title: 'First Step', icon: 'Footprints', description: 'Enrolled and completed first lesson' },
    ],
  },
  {
    rank: 8,
    studentId: 'std-hannah',
    displayName: 'Hannah Scott',
    avatar: 'HS',
    xp: 150,
    level: 1,
    earnedBadgesCount: 1,
    badges: [
      { id: 'b1', title: 'First Step', icon: 'Footprints', description: 'Enrolled and completed first lesson' },
    ],
  },
];

function getLocalStorageStore(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

class StorageService {
  private get<T>(key: string, seed: T): T {
    try {
      const data = localStorage.getItem(`learnova_${key}`);
      if (!data) {
        localStorage.setItem(`learnova_${key}`, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(data);
    } catch {
      return seed;
    }
  }

  private set<T>(key: string, val: T): void {
    try {
      localStorage.setItem(`learnova_${key}`, JSON.stringify(val));
    } catch (e) {
      console.warn('Storage set error:', e);
    }
  }

  // Courses
  getCourses(): Course[] {
    return this.get<Course[]>('courses', SEED_COURSES);
  }

  getCourse(id: string): Course | undefined {
    return this.getCourses().find((c) => c.id === id);
  }

  saveCourse(course: Course): Course {
    const list = this.getCourses();
    const idx = list.findIndex((c) => c.id === course.id);
    if (idx >= 0) {
      list[idx] = { ...course, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...course, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set('courses', list);
    return course;
  }

  deleteCourse(id: string): void {
    const list = this.getCourses().filter((c) => c.id !== id);
    this.set('courses', list);
  }

  // Topics
  getTopics(courseId?: string): Topic[] {
    const all = this.get<Topic[]>('topics', SEED_TOPICS);
    return courseId ? all.filter((t) => t.courseId === courseId) : all;
  }

  getTopic(id: string): Topic | undefined {
    return this.getTopics().find((t) => t.id === id);
  }

  saveTopic(topic: Topic): Topic {
    const list = this.getTopics();
    const idx = list.findIndex((t) => t.id === topic.id);
    if (idx >= 0) {
      list[idx] = { ...topic, updatedAt: new Date().toISOString() };
    } else {
      list.push({ ...topic, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set('topics', list);
    return topic;
  }

  deleteTopic(id: string): void {
    const list = this.getTopics().filter((t) => t.id !== id);
    this.set('topics', list);
  }

  // Lessons
  getLessons(topicId?: string): Lesson[] {
    const all = this.get<Lesson[]>('lessons', SEED_LESSONS);
    return topicId ? all.filter((l) => l.topicId === topicId) : all;
  }

  getLesson(id: string): Lesson | undefined {
    return this.getLessons().find((l) => l.id === id);
  }

  saveLesson(lesson: Lesson): Lesson {
    const list = this.getLessons();
    const idx = list.findIndex((l) => l.id === lesson.id);
    if (idx >= 0) {
      list[idx] = { ...lesson, updatedAt: new Date().toISOString() };
    } else {
      list.push({ ...lesson, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set('lessons', list);
    return lesson;
  }

  deleteLesson(id: string): void {
    const list = this.getLessons().filter((l) => l.id !== id);
    this.set('lessons', list);
  }

  // Learning Resources
  getResources(lessonId?: string): LearningResource[] {
    const all = this.get<LearningResource[]>('resources', SEED_RESOURCES);
    return lessonId ? all.filter((r) => r.lessonId === lessonId) : all;
  }

  saveResource(resource: LearningResource): LearningResource {
    const list = this.getResources();
    const idx = list.findIndex((r) => r.id === resource.id);
    if (idx >= 0) {
      list[idx] = { ...resource, updatedAt: new Date().toISOString() };
    } else {
      list.push({ ...resource, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set('resources', list);
    return resource;
  }

  deleteResource(id: string): void {
    const list = this.getResources().filter((r) => r.id !== id);
    this.set('resources', list);
  }

  // Questions
  getQuestions(courseId?: string): QuestionData[] {
    const all = this.get<QuestionData[]>('questions', SEED_QUESTIONS);
    return courseId ? all.filter((q) => q.courseId === courseId) : all;
  }

  getQuestion(id: string): QuestionData | undefined {
    return this.getQuestions().find((q) => q.id === id);
  }

  saveQuestion(question: QuestionData): QuestionData {
    const list = this.getQuestions();
    const idx = list.findIndex((q) => q.id === question.id);
    if (idx >= 0) {
      list[idx] = { ...question, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...question, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set('questions', list);
    return question;
  }

  deleteQuestion(id: string): void {
    const list = this.getQuestions().filter((q) => q.id !== id);
    this.set('questions', list);
  }

  // AI Candidates
  getCandidates(): AICandidateQuestion[] {
    return this.get<AICandidateQuestion[]>('candidates', SEED_AI_CANDIDATES);
  }

  saveCandidates(candidates: AICandidateQuestion[]): void {
    const existing = this.getCandidates();
    const updated = [...candidates, ...existing];
    this.set('candidates', updated);
  }

  updateCandidateStatus(id: string, status: 'approved' | 'rejected', reason?: string): AICandidateQuestion | undefined {
    const list = this.getCandidates();
    const cand = list.find((c) => c.id === id);
    if (cand) {
      cand.status = status;
      if (reason) cand.rejectionReason = reason;
      this.set('candidates', list);

      // If approved, persist directly to Question Bank as approved question!
      if (status === 'approved') {
        const approvedQ: QuestionData = {
          id: `q-approved-${cand.id}`,
          courseId: cand.courseId,
          topicId: cand.topicId,
          lessonId: cand.lessonId,
          type: cand.type,
          prompt: cand.prompt,
          difficulty: cand.difficulty,
          points: cand.points || 2,
          explanation: cand.explanation,
          status: 'approved',
          source: 'ai_generated',
          options: cand.options,
          correctBool: cand.correctBool,
          acceptedAnswers: cand.acceptedAnswers,
          matchingPairs: cand.matchingPairs,
          expectedRubric: cand.expectedRubric,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.saveQuestion(approvedQ);
      }
    }
    return cand;
  }

  deleteCandidate(id: string): void {
    const list = this.getCandidates().filter((c) => c.id !== id);
    this.set('candidates', list);
  }

  deleteCandidates(ids: string[]): void {
    const idSet = new Set(ids);
    const list = this.getCandidates().filter((c) => !idSet.has(c.id));
    this.set('candidates', list);
  }

  // Assessments
  getAssessments(courseId?: string): Assessment[] {
    const all = this.get<Assessment[]>('assessments', SEED_ASSESSMENTS);
    return courseId ? all.filter((a) => a.courseId === courseId) : all;
  }

  getAssessment(id: string): Assessment | undefined {
    return this.getAssessments().find((a) => a.id === id);
  }

  saveAssessment(assessment: Assessment): Assessment {
    const list = this.getAssessments();
    const idx = list.findIndex((a) => a.id === assessment.id);
    if (idx >= 0) {
      list[idx] = { ...assessment, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...assessment, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set('assessments', list);
    return assessment;
  }

  deleteAssessment(id: string): void {
    const list = this.getAssessments().filter((a) => a.id !== id);
    this.set('assessments', list);
  }

  // Attempts
  getAttempts(courseId?: string): AssessmentAttempt[] {
    const all = this.get<AssessmentAttempt[]>('attempts', SEED_ATTEMPTS);
    return courseId ? all.filter((a) => a.courseId === courseId) : all;
  }

  // -------------------------------------------------------------
  // STUDENT MODULE METHODS
  // -------------------------------------------------------------
  getStudentUser(): StudentUser {
    return this.get<StudentUser>('student_user', CURRENT_STUDENT);
  }

  saveStudentUser(user: StudentUser): StudentUser {
    this.set('student_user', user);
    return user;
  }

  getEnrollments(): Enrollment[] {
    return this.get<Enrollment[]>('enrollments', SEED_ENROLLMENTS);
  }

  getEnrollment(courseId: string): Enrollment | undefined {
    return this.getEnrollments().find((e) => e.courseId === courseId);
  }

  saveEnrollment(enrollment: Enrollment): Enrollment {
    const list = this.getEnrollments();
    const idx = list.findIndex((e) => e.id === enrollment.id || e.courseId === enrollment.courseId);
    if (idx >= 0) {
      list[idx] = enrollment;
    } else {
      list.push(enrollment);
    }
    this.set('enrollments', list);
    return enrollment;
  }

  enrollCourse(courseId: string): Enrollment {
    const list = this.getEnrollments();
    const existing = list.find((e) => e.courseId === courseId);
    if (existing) return existing;

    const newEnr: Enrollment = {
      id: `enr-${Date.now()}`,
      studentId: this.getStudentUser().id,
      courseId,
      status: 'active',
      enrolledAt: new Date().toISOString(),
      progressPercent: 0,
    };
    list.unshift(newEnr);
    this.set('enrollments', list);
    return newEnr;
  }

  getLessonCompletions(): LessonCompletion[] {
    return this.get<LessonCompletion[]>('lesson_completions', SEED_LESSON_COMPLETIONS);
  }

  saveLessonCompletions(completions: LessonCompletion[]): void {
    this.set('lesson_completions', completions);
  }

  isLessonCompleted(lessonId: string): boolean {
    return this.getLessonCompletions().some((c) => c.lessonId === lessonId);
  }

  completeLesson(lessonId: string, courseId: string, topicId: string): { completion: LessonCompletion; xpAwarded: number } {
    const list = this.getLessonCompletions();
    const existing = list.find((c) => c.lessonId === lessonId);
    if (existing) {
      return { completion: existing, xpAwarded: 0 };
    }

    const completion: LessonCompletion = {
      id: `lc-${Date.now()}`,
      studentId: this.getStudentUser().id,
      courseId,
      topicId,
      lessonId,
      completedAt: new Date().toISOString(),
    };
    list.push(completion);
    this.set('lesson_completions', list);

    // Update enrollment progress percentage
    const courseLessons = this.getLessons().filter((l) => l.courseId === courseId);
    const completedCourseLessons = list.filter((c) => c.courseId === courseId);
    const progressPercent = courseLessons.length > 0
      ? Math.min(100, Math.round((completedCourseLessons.length / courseLessons.length) * 100))
      : 0;

    const enrollments = this.getEnrollments();
    const enr = enrollments.find((e) => e.courseId === courseId);
    if (enr) {
      enr.progressPercent = progressPercent;
      this.set('enrollments', enrollments);
    }

    // Award XP (SRS event-based gamification)
    this.awardXP('lesson_completed', 50, `Completed lesson: ${this.getLesson(lessonId)?.title || 'Curriculum unit'}`, lessonId);

    return { completion, xpAwarded: 50 };
  }

  getMasteryStates(courseId?: string): MasteryState[] {
    const all = this.get<MasteryState[]>('mastery_states', SEED_MASTERY_STATES);
    return courseId ? all.filter((m) => m.courseId === courseId) : all;
  }

  getMasteryState(topicId: string): MasteryState | undefined {
    return this.getMasteryStates().find((m) => m.topicId === topicId);
  }

  saveMasteryState(state: MasteryState): MasteryState {
    const list = this.getMasteryStates();
    const idx = list.findIndex((m) => m.topicId === state.topicId);
    if (idx >= 0) {
      list[idx] = { ...state, lastAssessedAt: new Date().toISOString() };
    } else {
      list.push({ ...state, lastAssessedAt: new Date().toISOString() });
    }
    this.set('mastery_states', list);
    return state;
  }

  getGamificationProfile(): GamificationProfile {
    return this.get<GamificationProfile>('gamification_profile', SEED_GAMIFICATION_PROFILE);
  }

  saveGamificationProfile(gp: GamificationProfile): GamificationProfile {
    this.set('gamification_profile', gp);
    return gp;
  }

  getXPEvents(): XPEvent[] {
    return this.get<XPEvent[]>('xp_events', SEED_XP_EVENTS);
  }

  awardXP(type: XPEventType, xpAmount: number, description: string, relatedId?: string): XPEvent {
    const event: XPEvent = {
      id: `xp-ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: this.getStudentUser().id,
      type,
      xpEarned: xpAmount,
      timestamp: new Date().toISOString(),
      description,
      relatedId,
    };

    const events = this.getXPEvents();
    events.unshift(event);
    this.set('xp_events', events);

    // Update profile
    const profile = this.getGamificationProfile();
    const newXP = profile.xp + xpAmount;
    let level = 1;
    let floorXP = 0;
    let span = 250;
    while (newXP >= floorXP + span) {
      floorXP += span;
      level += 1;
      span = 150 + level * 100;
    }
    profile.xp = newXP;
    profile.level = level;
    profile.lastActiveDate = new Date().toISOString().split('T')[0];
    this.saveGamificationProfile(profile);

    return event;
  }

  getBadges(): Badge[] {
    return this.get<Badge[]>('badges', SEED_BADGES);
  }

  saveBadges(badges: Badge[]): void {
    this.set('badges', badges);
  }

  unlockBadge(badgeId: string): Badge | undefined {
    const badges = this.getBadges();
    const b = badges.find((badge) => badge.id === badgeId);
    if (b && !b.isUnlocked) {
      b.isUnlocked = true;
      b.earnedAt = new Date().toISOString();
      this.set('badges', badges);
      this.awardXP('badge_earned', 200, `Earned badge: ${b.title}`, b.id);
    }
    return b;
  }

  getLeaderboard(): LeaderboardEntry[] {
    const list = this.get<LeaderboardEntry[]>('leaderboard', SEED_LEADERBOARD);
    const profile = this.getGamificationProfile();
    const student = this.getStudentUser();
    const badges = this.getBadges().filter((b) => b.isUnlocked);

    let hasCurrent = false;
    const updated = list.map((entry) => {
      const isMe = entry.studentId === student.id || (student.name && entry.displayName === student.name);
      if (isMe) {
        hasCurrent = true;
        return {
          ...entry,
          studentId: student.id,
          displayName: student.name,
          avatar: student.avatar || (student.name ? student.name.slice(0, 2).toUpperCase() : 'ST'),
          xp: profile.xp,
          level: profile.level,
          earnedBadgesCount: badges.length,
          isCurrentUser: true,
          badges: badges.map((b) => ({ id: b.id, title: b.title, icon: b.icon, description: b.description })),
        };
      }
      return {
        ...entry,
        isCurrentUser: false,
      };
    });

    if (!hasCurrent && student?.id) {
      updated.push({
        rank: updated.length + 1,
        studentId: student.id,
        displayName: student.name,
        avatar: student.avatar || (student.name ? student.name.slice(0, 2).toUpperCase() : 'ST'),
        xp: profile.xp,
        level: profile.level,
        earnedBadgesCount: badges.length,
        isCurrentUser: true,
        badges: badges.map((b) => ({ id: b.id, title: b.title, icon: b.icon, description: b.description })),
      });
    }

    updated.sort((a, b) => b.xp - a.xp);
    return updated.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }

  getAssessmentSessions(): StudentAssessmentSession[] {
    return this.get<StudentAssessmentSession[]>('student_sessions', []);
  }

  getAssessmentSession(id: string): StudentAssessmentSession | undefined {
    return this.getAssessmentSessions().find((s) => s.id === id);
  }

  saveAssessmentSession(session: StudentAssessmentSession): StudentAssessmentSession {
    const list = this.getAssessmentSessions();
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      list[idx] = session;
    } else {
      list.unshift(session);
    }
    this.set('student_sessions', list);
    return session;
  }

  getAssessmentResults(): StudentAssessmentResult[] {
    return this.get<StudentAssessmentResult[]>('student_results', []);
  }

  getAssessmentResult(sessionId: string): StudentAssessmentResult | undefined {
    return this.getAssessmentResults().find((r) => r.sessionId === sessionId || r.id === sessionId);
  }

  saveAssessmentResult(result: StudentAssessmentResult): StudentAssessmentResult {
    const list = this.getAssessmentResults();
    const idx = list.findIndex((r) => r.id === result.id || r.sessionId === result.sessionId);
    if (idx >= 0) {
      list[idx] = result;
    } else {
      list.unshift(result);
    }
    this.set('student_results', list);
    return result;
  }

  getRecommendedNextStep(courseId: string): LearningPathItem {
    const topics = this.getTopics(courseId);
    const completedLessonIds = new Set(this.getLessonCompletions().map((lc) => lc.lessonId));
    const masteryStates = this.getMasteryStates(courseId);

    // Look for first uncompleted lesson in an unlocked topic
    for (const t of topics) {
      const lessons = this.getLessons(t.id);
      const uncompletedLesson = lessons.find((l) => !completedLessonIds.has(l.id));
      if (uncompletedLesson) {
        return {
          id: `rec-${uncompletedLesson.id}`,
          courseId,
          topicId: t.id,
          lessonId: uncompletedLesson.id,
          type: 'lesson',
          title: uncompletedLesson.title,
          reason: `Continue your sequential curriculum progression in ${t.title}.`,
          isCompleted: false,
        };
      }

      // If all lessons in this topic are completed, but mastery is developing
      const m = masteryStates.find((state) => state.topicId === t.id);
      if (m && (m.status === 'developing' || m.scorePercent < 75)) {
        return {
          id: `rec-practice-${t.id}`,
          courseId,
          topicId: t.id,
          type: 'adaptive_practice',
          title: `Adaptive Practice: ${t.title}`,
          reason: `Recalibrate your mastery of ${t.title} with targeted practice questions.`,
          isCompleted: false,
        };
      }
    }

    // Check for final examination
    const finalExam = this.getAssessments(courseId).find((a) => a.type === 'final');
    if (finalExam) {
      return {
        id: `rec-exam-${finalExam.id}`,
        courseId,
        topicId: topics[topics.length - 1]?.id || '',
        type: 'final_exam',
        title: finalExam.title,
        reason: 'You have satisfied the syllabus requirements and are ready for the summative examination.',
        isCompleted: false,
      };
    }

    // Default fallback to first lesson
    const firstLesson = this.getLessons(topics[0]?.id)[0];
    return {
      id: `rec-start-${topics[0]?.id || '1'}`,
      courseId,
      topicId: topics[0]?.id || '',
      lessonId: firstLesson?.id,
      type: 'lesson',
      title: firstLesson?.title || 'Course Overview',
      reason: 'Start learning from the foundational syllabus unit.',
      isCompleted: false,
    };
  }

  // =========================================================================
  // ADMIN GOVERNANCE & AUDIT METHODS
  // =========================================================================

  getAdminUser(): UserAccount {
    return this.get<UserAccount>('admin_user', CURRENT_ADMIN);
  }

  saveAdminUser(admin: UserAccount): UserAccount {
    this.set('admin_user', admin);
    // Also synchronize in the all-users list
    this.saveUser(admin);
    return admin;
  }

  getUsers(): UserAccount[] {
    return this.get<UserAccount[]>('all_users', SEED_USERS);
  }

  getUser(id: string): UserAccount | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  saveUser(user: UserAccount): UserAccount {
    const list = this.getUsers();
    const idx = list.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      list[idx] = { ...user };
    } else {
      list.push(user);
    }
    this.set('all_users', list);
    return user;
  }

  changeUserRole(
    actorId: string,
    targetUserId: string,
    newRole: UserRole,
    reason: string = 'Administrative role reassignment'
  ): { success: boolean; error?: string; user?: UserAccount } {
    const actor = this.getUser(actorId) || this.getAdminUser();
    const target = this.getUser(targetUserId);

    if (!target) {
      return { success: false, error: 'Target user account not found.' };
    }

    const validation = validateRoleChange(actor, target, newRole, this.getUsers());
    if (!validation.valid) {
      this.logAuditEvent({
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'ROLE_CHANGE',
        targetType: 'user',
        targetId: target.id,
        targetName: target.name,
        outcome: 'blocked',
        reason: validation.error,
        details: { requestedRole: newRole, currentRole: target.role },
      });
      return { success: false, error: validation.error };
    }

    const previousRole = target.role;
    target.role = newRole;
    this.saveUser(target);

    // If current admin was modified
    if (actor.id === target.id) {
      this.saveAdminUser(target);
    }

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'ROLE_CHANGE',
      targetType: 'user',
      targetId: target.id,
      targetName: target.name,
      outcome: 'success',
      reason,
      details: { previousRole, newRole },
    });

    return { success: true, user: target };
  }

  toggleUserStatus(
    actorId: string,
    targetUserId: string,
    nextActiveState: boolean,
    reason: string = nextActiveState ? 'Account reactivated' : 'Account deactivated'
  ): { success: boolean; error?: string; user?: UserAccount } {
    const actor = this.getUser(actorId) || this.getAdminUser();
    const target = this.getUser(targetUserId);

    if (!target) {
      return { success: false, error: 'Target user account not found.' };
    }

    const validation = validateAccountStatusChange(actor, target, nextActiveState, this.getUsers());
    if (!validation.valid) {
      this.logAuditEvent({
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: nextActiveState ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
        targetType: 'user',
        targetId: target.id,
        targetName: target.name,
        outcome: 'blocked',
        reason: validation.error,
      });
      return { success: false, error: validation.error };
    }

    target.isActive = nextActiveState;
    this.saveUser(target);

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: nextActiveState ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
      targetType: 'user',
      targetId: target.id,
      targetName: target.name,
      outcome: 'success',
      reason,
      details: { previousState: !nextActiveState, newState: nextActiveState },
    });

    return { success: true, user: target };
  }

  getAuditEvents(): AuditEvent[] {
    return this.get<AuditEvent[]>('audit_events', SEED_AUDIT_EVENTS);
  }

  logAuditEvent(eventData: {
    actorId: string;
    actorName: string;
    actorEmail: string;
    actorRole: UserRole;
    action: any;
    targetType: 'user' | 'role' | 'system' | 'session';
    targetId: string;
    targetName: string;
    outcome: 'success' | 'failure' | 'blocked';
    reason?: string;
    details?: Record<string, any>;
  }): AuditEvent {
    const events = this.getAuditEvents();
    const newEvent: AuditEvent = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      correlationId: generateCorrelationId(),
      ipAddressSafe: maskIpAddress('192.168.1.100'),
      ...eventData,
    };
    events.unshift(newEvent);
    this.set('audit_events', events);
    return newEvent;
  }

  getServiceHealth(): ServiceHealthCheck[] {
    return this.get<ServiceHealthCheck[]>('service_health', SEED_SERVICE_HEALTH);
  }

  async refreshHealthChecks(): Promise<ServiceHealthCheck[]> {
    // Simulate real diagnostic ping
    await new Promise((r) => setTimeout(r, 400));
    const list = this.getServiceHealth();
    const updated = list.map((svc) => ({
      ...svc,
      lastChecked: new Date().toISOString(),
      // Add realistic jitter to response times
      latencyMs: Math.max(2, Math.round(svc.latencyMs + (Math.random() * 6 - 3))),
    }));
    this.set('service_health', updated);
    return updated;
  }

  getPersistedPortalMode(): 'student' | 'teacher' | 'admin' | 'public' | null {
    return this.get<'student' | 'teacher' | 'admin' | 'public' | null>('portal_mode', null);
  }

  setPersistedPortalMode(mode: 'student' | 'teacher' | 'admin' | 'public' | null): void {
    if (mode) {
      this.set('portal_mode', mode);
    } else {
      const store = getLocalStorageStore();
      if (store) {
        store.removeItem('learnova_portal_mode');
      }
    }
  }

  clearSessionCredentials(): void {
    const store = getLocalStorageStore();
    if (store) {
      store.removeItem('learnova_access_token');
      store.removeItem('learnova_current_user');
      store.removeItem('learnova_portal_mode');
      store.removeItem('learnova_student_user');
      store.removeItem('learnova_admin_user');
      store.removeItem('learnova_badges');
      store.removeItem('learnova_gamification_profile');
      store.removeItem('learnova_enrollments');
      store.removeItem('learnova_lesson_completions');
      store.removeItem('learnova_mastery_states');
      store.removeItem('learnova_xp_events');
    }
  }

  resetAllData(): void {
    const store = getLocalStorageStore();
    if (store) {
      store.clear();
    }
  }
}

export const storage = new StorageService();
