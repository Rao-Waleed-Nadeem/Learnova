import {
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
} from '../types';
import {
  UserAccount,
  UserRole,
  AuditEvent,
  ServiceHealthCheck,
  validateRoleChange,
  validateAccountStatusChange,
  maskIpAddress,
  generateCorrelationId,
} from '../utils/adminLogic';

export const CURRENT_ADMIN: UserAccount = {
  id: 'adm-sarah',
  name: 'Sarah Connor',
  email: 's.connor@learnova.edu',
  role: 'administrator',
  isActive: true,
  createdAt: '2026-08-15T08:00:00Z',
  lastActiveAt: '2026-10-18T09:40:00Z',
  avatar: 'SC',
  department: 'System Governance & Security',
};

export const CURRENT_TEACHER: TeacherUser = {
  id: 'teacher-101',
  name: 'Dr. Elena Rostova',
  email: 'e.rostova@learnova.edu',
  role: 'teacher',
  department: 'Faculty of Computer Science',
};

const SEED_USERS: UserAccount[] = [
  {
    id: 'adm-sarah',
    name: 'Sarah Connor',
    email: 's.connor@learnova.edu',
    role: 'administrator',
    isActive: true,
    createdAt: '2026-08-15T08:00:00Z',
    lastActiveAt: '2026-10-18T09:40:00Z',
    avatar: 'SC',
    department: 'System Governance & Security',
  },
  {
    id: 'adm-marcus',
    name: 'Marcus Vance',
    email: 'm.vance@learnova.edu',
    role: 'administrator',
    isActive: true,
    createdAt: '2026-08-20T10:00:00Z',
    lastActiveAt: '2026-10-17T15:20:00Z',
    avatar: 'MV',
    department: 'Academic Operations',
  },
  {
    id: 'teacher-101',
    name: 'Dr. Elena Rostova',
    email: 'e.rostova@learnova.edu',
    role: 'teacher',
    isActive: true,
    createdAt: '2026-09-01T09:00:00Z',
    lastActiveAt: '2026-10-18T08:15:00Z',
    avatar: 'ER',
    department: 'Faculty of Computer Science',
    assignedCoursesCount: 3,
  },
  {
    id: 'teacher-102',
    name: 'Prof. Alan Turing',
    email: 'a.turing@learnova.edu',
    role: 'teacher',
    isActive: true,
    createdAt: '2026-09-03T11:00:00Z',
    lastActiveAt: '2026-10-16T14:30:00Z',
    avatar: 'AT',
    department: 'Applied Mathematics & Algorithms',
    assignedCoursesCount: 2,
  },
  {
    id: 'teacher-103',
    name: 'Dr. Ada Lovelace',
    email: 'a.lovelace@learnova.edu',
    role: 'teacher',
    isActive: true,
    createdAt: '2026-09-05T14:00:00Z',
    lastActiveAt: '2026-10-15T16:45:00Z',
    avatar: 'AL',
    department: 'Software Architecture & Engineering',
    assignedCoursesCount: 1,
  },
  {
    id: 'std-alex',
    name: 'Alex Rivera',
    email: 'alex.rivera@learnova.edu',
    role: 'student',
    isActive: true,
    createdAt: '2026-09-10T10:00:00Z',
    lastActiveAt: '2026-10-18T09:12:00Z',
    avatar: 'AR',
    enrolledCoursesCount: 3,
  },
  {
    id: 'std-clara',
    name: 'Clara Vance',
    email: 'clara.v@learnova.edu',
    role: 'student',
    isActive: true,
    createdAt: '2026-09-11T12:00:00Z',
    lastActiveAt: '2026-10-18T07:50:00Z',
    avatar: 'CV',
    enrolledCoursesCount: 2,
  },
  {
    id: 'std-marcus',
    name: 'Marcus Brody',
    email: 'm.brody@learnova.edu',
    role: 'student',
    isActive: false,
    createdAt: '2026-09-12T13:30:00Z',
    lastActiveAt: '2026-10-01T11:20:00Z',
    avatar: 'MB',
    enrolledCoursesCount: 1,
  },
  {
    id: 'std-sarah',
    name: 'Sarah Jenkins',
    email: 'sarah.j@learnova.edu',
    role: 'student',
    isActive: true,
    createdAt: '2026-09-14T09:40:00Z',
    lastActiveAt: '2026-10-17T18:10:00Z',
    avatar: 'SJ',
    enrolledCoursesCount: 2,
  },
  {
    id: 'std-liam',
    name: 'Liam Zhao',
    email: 'liam.zhao@learnova.edu',
    role: 'student',
    isActive: true,
    createdAt: '2026-09-15T15:20:00Z',
    lastActiveAt: '2026-10-17T14:05:00Z',
    avatar: 'LZ',
    enrolledCoursesCount: 1,
  },
  {
    id: 'std-priya',
    name: 'Priya Sharma',
    email: 'priya.s@learnova.edu',
    role: 'student',
    isActive: true,
    createdAt: '2026-09-18T08:30:00Z',
    lastActiveAt: '2026-10-16T17:40:00Z',
    avatar: 'PS',
    enrolledCoursesCount: 2,
  },
  {
    id: 'std-devon',
    name: 'Devon Miller',
    email: 'devon.m@learnova.edu',
    role: 'student',
    isActive: true,
    createdAt: '2026-09-20T16:00:00Z',
    lastActiveAt: '2026-10-15T10:30:00Z',
    avatar: 'DM',
    enrolledCoursesCount: 1,
  },
  {
    id: 'std-hannah',
    name: 'Hannah Scott',
    email: 'hannah.s@learnova.edu',
    role: 'student',
    isActive: true,
    createdAt: '2026-09-22T11:15:00Z',
    lastActiveAt: '2026-10-14T09:15:00Z',
    avatar: 'HS',
    enrolledCoursesCount: 1,
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

const SEED_COURSES: Course[] = [
  {
    id: 'course-cs101',
    title: 'Introduction to Computer Science & Python',
    description: 'Foundational programming concepts, algorithmic reasoning, control structures, and object-oriented principles.',
    status: 'published',
    updatedAt: '2026-10-12T14:30:00Z',
    createdAt: '2026-09-01T09:00:00Z',
    creatorId: 'teacher-101',
    creatorName: 'Dr. Elena Rostova',
    creatorEmail: 'e.rostova@learnova.edu',
    creatorDepartment: 'Faculty of Computer Science',
    creatorAvatar: 'ER',
  },
  {
    id: 'course-cs201',
    title: 'Data Structures and Algorithm Analysis',
    description: 'Linear and non-linear data structures, trees, graphs, sorting strategies, and Big-O computational complexity.',
    status: 'published',
    updatedAt: '2026-10-14T11:15:00Z',
    createdAt: '2026-09-15T10:00:00Z',
    creatorId: 'teacher-102',
    creatorName: 'Prof. Alan Turing',
    creatorEmail: 'a.turing@learnova.edu',
    creatorDepartment: 'Applied Mathematics & Algorithms',
    creatorAvatar: 'AT',
  },
  {
    id: 'course-cs305',
    title: 'Machine Learning Foundations',
    description: 'Supervised and unsupervised learning, optimization pipelines, model validation, and gradient descent.',
    status: 'published',
    updatedAt: '2026-10-08T16:20:00Z',
    createdAt: '2026-10-01T08:30:00Z',
    creatorId: 'teacher-103',
    creatorName: 'Dr. Ada Lovelace',
    creatorEmail: 'a.lovelace@learnova.edu',
    creatorDepartment: 'Software Architecture & Engineering',
    creatorAvatar: 'AL',
  },
];

const SEED_TOPICS: Topic[] = [
  {
    id: 'topic-syntax',
    courseId: 'course-cs101',
    title: 'Syntax, Variables & Data Types',
    description: 'Core scalar types, memory bindings, arithmetic operators, and string formatting.',
    order: 1,
    prerequisiteTopicIds: [],
    masteryThreshold: 75,
    updatedAt: '2026-10-10T12:00:00Z',
    createdAt: '2026-09-02T10:00:00Z',
  },
  {
    id: 'topic-control',
    courseId: 'course-cs101',
    title: 'Conditional Logic & Control Flow',
    description: 'Boolean branching, if-elif-else statements, while loops, and iterator traversal.',
    order: 2,
    prerequisiteTopicIds: ['topic-syntax'],
    masteryThreshold: 75,
    updatedAt: '2026-10-11T15:00:00Z',
    createdAt: '2026-09-05T11:00:00Z',
  },
  {
    id: 'topic-functions',
    courseId: 'course-cs101',
    title: 'Functions & Modular Programming',
    description: 'Subroutines, scope resolution, default parameters, return contracts, and purity.',
    order: 3,
    prerequisiteTopicIds: ['topic-syntax', 'topic-control'],
    masteryThreshold: 80,
    updatedAt: '2026-10-12T16:40:00Z',
    createdAt: '2026-09-10T09:30:00Z',
  },
  {
    id: 'topic-collections',
    courseId: 'course-cs101',
    title: 'Data Collections: Lists & Dictionaries',
    description: 'Sequence indexing, list comprehensions, associative key-value mapping, and set operations.',
    order: 4,
    prerequisiteTopicIds: ['topic-control'],
    masteryThreshold: 75,
    updatedAt: '2026-10-13T10:20:00Z',
    createdAt: '2026-09-12T14:00:00Z',
  },
  {
    id: 'topic-oop',
    courseId: 'course-cs101',
    title: 'Object-Oriented Design & Classes',
    description: 'Class declarations, instances, encapsulating state, inheritance, and dunder methods.',
    order: 5,
    prerequisiteTopicIds: ['topic-functions', 'topic-collections'],
    masteryThreshold: 80,
    updatedAt: '2026-10-14T09:00:00Z',
    createdAt: '2026-09-18T13:00:00Z',
  },
];

const SEED_LESSONS: Lesson[] = [
  {
    id: 'lesson-vars-1',
    topicId: 'topic-syntax',
    courseId: 'course-cs101',
    title: 'Introduction to Primitive Types and Namespaces',
    description: 'Understand integers, floats, booleans, and dynamically bound variable references.',
    order: 1,
    updatedAt: '2026-10-02T10:00:00Z',
    createdAt: '2026-09-02T10:00:00Z',
  },
  {
    id: 'lesson-vars-2',
    topicId: 'topic-syntax',
    courseId: 'course-cs101',
    title: 'String Immutability and Interpolation',
    description: 'Indexing, slicing, and f-string formatting in modern Python.',
    order: 2,
    updatedAt: '2026-10-03T11:00:00Z',
    createdAt: '2026-09-03T11:00:00Z',
  },
  {
    id: 'lesson-ctrl-1',
    topicId: 'topic-control',
    courseId: 'course-cs101',
    title: 'Branching and Short-Circuit Evaluation',
    description: 'Mastering logical expressions with and, or, and not truth tables.',
    order: 1,
    updatedAt: '2026-10-06T14:00:00Z',
    createdAt: '2026-09-06T14:00:00Z',
  },
  {
    id: 'lesson-ctrl-2',
    topicId: 'topic-control',
    courseId: 'course-cs101',
    title: 'Loops: While and For-In Iterations',
    description: 'Definite vs indefinite loop patterns, break, continue, and loop-else blocks.',
    order: 2,
    updatedAt: '2026-10-07T16:00:00Z',
    createdAt: '2026-09-07T16:00:00Z',
  },
  {
    id: 'lesson-fn-1',
    topicId: 'topic-functions',
    courseId: 'course-cs101',
    title: 'Function Definition, Arguments & Return Values',
    description: 'Positional arguments, keyword arguments, and early return guards.',
    order: 1,
    updatedAt: '2026-10-10T10:00:00Z',
    createdAt: '2026-09-10T10:00:00Z',
  },
];

const SEED_RESOURCES: LearningResource[] = [
  {
    id: 'res-1',
    lessonId: 'lesson-vars-1',
    courseId: 'course-cs101',
    title: 'Python Memory Model & Variables Reference',
    type: 'document',
    contentOrUrl: 'https://docs.python.org/3/reference/datamodel.html',
    fileSize: '1.4 MB PDF',
    updatedAt: '2026-10-02T10:00:00Z',
    createdAt: '2026-10-02T10:00:00Z',
  },
  {
    id: 'res-2',
    lessonId: 'lesson-vars-1',
    courseId: 'course-cs101',
    title: 'Scalar Types Example Snippet',
    type: 'code',
    contentOrUrl: `# Variable binding examples\nage: int = 21\ngpa: float = 3.85\nis_enrolled: boolean = True\nstudent_name: str = "Elena Rostova"`,
    updatedAt: '2026-10-03T09:00:00Z',
    createdAt: '2026-10-03T09:00:00Z',
  },
  {
    id: 'res-3',
    lessonId: 'lesson-ctrl-1',
    courseId: 'course-cs101',
    title: 'Control Flow Lecture Recording',
    type: 'video',
    contentOrUrl: 'https://cdn.learnova.edu/lectures/cs101-control-flow.mp4',
    fileSize: '42 mins HD',
    updatedAt: '2026-10-06T15:00:00Z',
    createdAt: '2026-10-06T15:00:00Z',
  },
  {
    id: 'res-4',
    lessonId: 'lesson-ctrl-1',
    courseId: 'course-cs101',
    title: 'Short-Circuit Logic Summary Notes',
    type: 'markdown',
    contentOrUrl: `### Short-Circuit Evaluation Rules\n- In \`A and B\`, if \`A\` is false, \`B\` is never evaluated.\n- In \`A or B\`, if \`A\` is true, \`B\` is never evaluated.\n- Always safeguard null or index references using short-circuiting: \`if lst and lst[0] == 42:\``,
    updatedAt: '2026-10-07T12:00:00Z',
    createdAt: '2026-10-07T12:00:00Z',
  },
];

const SEED_QUESTIONS: QuestionData[] = [
  {
    id: 'q-mc-1',
    courseId: 'course-cs101',
    topicId: 'topic-syntax',
    type: 'multiple_choice',
    prompt: 'Which of the following is true regarding variable assignment in Python?',
    difficulty: 'easy',
    points: 2,
    explanation: 'Variables in Python are symbolic names bound to objects in memory, not fixed type containers.',
    status: 'approved',
    source: 'teacher',
    options: [
      { id: 'opt-1', text: 'Variables store references pointing to objects in heap memory', isCorrect: true },
      { id: 'opt-2', text: 'Variables statically allocate a fixed block of byte registers at compile time', isCorrect: false },
      { id: 'opt-3', text: 'Variables cannot be rebound to objects of differing types', isCorrect: false },
      { id: 'opt-4', text: 'Variable names must begin with a dollar sign ($) symbol', isCorrect: false },
    ],
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'q-tf-1',
    courseId: 'course-cs101',
    topicId: 'topic-syntax',
    type: 'true_false',
    prompt: 'In Python, strings are immutable and cannot have individual characters modified in-place.',
    difficulty: 'easy',
    points: 1,
    explanation: 'Attempting `s[0] = "X"` raises a TypeError because string objects do not support item assignment.',
    status: 'approved',
    source: 'teacher',
    correctBool: true,
    createdAt: '2026-10-02T11:00:00Z',
    updatedAt: '2026-10-02T11:00:00Z',
  },
  {
    id: 'q-fb-1',
    courseId: 'course-cs101',
    topicId: 'topic-control',
    type: 'fill_blank',
    prompt: 'In a conditional statement, the keyword used to check additional mutually exclusive conditions after "if" is [blank].',
    difficulty: 'easy',
    points: 2,
    explanation: 'Python uses "elif" as the abbreviation for else-if.',
    status: 'approved',
    source: 'teacher',
    acceptedAnswers: ['elif', 'elif:'],
    caseSensitive: false,
    createdAt: '2026-10-05T09:00:00Z',
    updatedAt: '2026-10-05T09:00:00Z',
  },
  {
    id: 'q-mat-1',
    courseId: 'course-cs101',
    topicId: 'topic-control',
    type: 'matching',
    prompt: 'Match each loop control statement with its execution behavior:',
    difficulty: 'medium',
    points: 3,
    explanation: 'break exits the loop immediately, continue jumps to next iteration, pass is a null statement.',
    status: 'approved',
    source: 'teacher',
    matchingPairs: [
      { id: 'p1', left: 'break', right: 'Terminates loop execution immediately' },
      { id: 'p2', left: 'continue', right: 'Skips remainder of current iteration and proceeds to next' },
      { id: 'p3', left: 'pass', right: 'Syntactic no-op placeholder that executes nothing' },
    ],
    createdAt: '2026-10-06T14:30:00Z',
    updatedAt: '2026-10-06T14:30:00Z',
  },
  {
    id: 'q-sa-1',
    courseId: 'course-cs101',
    topicId: 'topic-functions',
    type: 'short_answer',
    prompt: 'Explain what happens when a mutable object (like a list) is passed as a default argument in a function definition.',
    difficulty: 'hard',
    points: 4,
    explanation: 'Default arguments are evaluated once at function definition time, so mutations persist across subsequent invocations.',
    status: 'approved',
    source: 'teacher',
    expectedRubric: 'Must state: 1) Default expressions evaluate once at def time, 2) The same list instance is reused, 3) Mutations persist across calls.',
    createdAt: '2026-10-08T15:00:00Z',
    updatedAt: '2026-10-08T15:00:00Z',
  },
  {
    id: 'q-mc-pending',
    courseId: 'course-cs101',
    topicId: 'topic-collections',
    type: 'multiple_choice',
    prompt: 'What is the average time complexity of key lookup in a Python dictionary?',
    difficulty: 'medium',
    points: 2,
    explanation: 'Dictionaries use hash tables with O(1) expected lookup time.',
    status: 'pending_review',
    source: 'ai_generated',
    options: [
      { id: 'opt-a', text: 'O(1) average constant time', isCorrect: true },
      { id: 'opt-b', text: 'O(log n) logarithmic time', isCorrect: false },
      { id: 'opt-c', text: 'O(n) linear scan time', isCorrect: false },
      { id: 'opt-d', text: 'O(n^2) quadratic time', isCorrect: false },
    ],
    createdAt: '2026-10-14T08:00:00Z',
    updatedAt: '2026-10-14T08:00:00Z',
  },
  {
    id: 'q-mc-adapt-1',
    courseId: 'course-cs101',
    topicId: 'topic-syntax',
    type: 'multiple_choice',
    prompt: 'Which arithmetic operator is used in Python for exponentiation (raising to a power)?',
    difficulty: 'easy',
    points: 1,
    explanation: '** is the power operator in Python. ^ is the bitwise XOR operator.',
    status: 'approved',
    source: 'teacher',
    options: [
      { id: 'opt-pow-1', text: '** (double asterisk)', isCorrect: true },
      { id: 'opt-pow-2', text: '^ (caret)', isCorrect: false },
      { id: 'opt-pow-3', text: '// (double slash)', isCorrect: false },
      { id: 'opt-pow-4', text: 'exp()', isCorrect: false },
    ],
    createdAt: '2026-10-02T12:00:00Z',
    updatedAt: '2026-10-02T12:00:00Z',
  },
  {
    id: 'q-mc-adapt-2',
    courseId: 'course-cs101',
    topicId: 'topic-control',
    type: 'multiple_choice',
    prompt: 'What will be the output of: print([x * 2 for x in [1, 2, 3]]) ?',
    difficulty: 'medium',
    points: 2,
    explanation: 'A list comprehension doubles each element sequentially, yielding [2, 4, 6].',
    status: 'approved',
    source: 'teacher',
    options: [
      { id: 'opt-lc-1', text: '[2, 4, 6]', isCorrect: true },
      { id: 'opt-lc-2', text: '[1, 2, 3, 1, 2, 3]', isCorrect: false },
      { id: 'opt-lc-3', text: '[2, 2, 2]', isCorrect: false },
      { id: 'opt-lc-4', text: 'TypeError: list comprehension invalid', isCorrect: false },
    ],
    createdAt: '2026-10-06T15:00:00Z',
    updatedAt: '2026-10-06T15:00:00Z',
  },
  {
    id: 'q-tf-adapt-1',
    courseId: 'course-cs101',
    topicId: 'topic-functions',
    type: 'true_false',
    prompt: 'In Python, functions are first-class citizens and can be passed as arguments to other functions.',
    difficulty: 'medium',
    points: 2,
    explanation: 'Functions are objects in Python, enabling higher-order functions like map, filter, and decorators.',
    status: 'approved',
    source: 'teacher',
    correctBool: true,
    createdAt: '2026-10-09T11:00:00Z',
    updatedAt: '2026-10-09T11:00:00Z',
  },
  {
    id: 'q-mc-adapt-3',
    courseId: 'course-cs101',
    topicId: 'topic-oop',
    type: 'multiple_choice',
    prompt: 'What algorithm does Python 3 use to calculate the Method Resolution Order (MRO) in multiple inheritance?',
    difficulty: 'hard',
    points: 3,
    explanation: 'Python 3 utilizes the C3 Linearization algorithm to enforce monotonicity and consistent resolution order.',
    status: 'approved',
    source: 'teacher',
    options: [
      { id: 'opt-mro-1', text: 'C3 Linearization algorithm', isCorrect: true },
      { id: 'opt-mro-2', text: 'Depth-First Search (DFS) order', isCorrect: false },
      { id: 'opt-mro-3', text: 'Breadth-First Search (BFS) order', isCorrect: false },
      { id: 'opt-mro-4', text: 'Topological Kahn sorting', isCorrect: false },
    ],
    createdAt: '2026-10-14T10:00:00Z',
    updatedAt: '2026-10-14T10:00:00Z',
  },
];

const SEED_AI_CANDIDATES: AICandidateQuestion[] = [
  {
    id: 'cand-1',
    courseId: 'course-cs101',
    topicId: 'topic-collections',
    prompt: 'Which operation creates a shallow copy of a Python dictionary?',
    type: 'multiple_choice',
    difficulty: 'medium',
    points: 2,
    explanation: 'dict.copy() creates a shallow duplicate where nested references are shared.',
    sourceContext: 'Lesson 4 Notes: Python Associative Collections and Copy Semantics',
    status: 'pending_review',
    options: [
      { id: '1', text: 'dict.copy()', isCorrect: true },
      { id: '2', text: 'dict.clone()', isCorrect: false },
      { id: '3', text: 'dict.deepcopy()', isCorrect: false },
      { id: '4', text: 'dict.duplicate()', isCorrect: false },
    ],
    createdAt: '2026-10-14T09:00:00Z',
  },
  {
    id: 'cand-2',
    courseId: 'course-cs101',
    topicId: 'topic-collections',
    prompt: 'Dictionary keys in Python must be hashable and therefore immutable.',
    type: 'true_false',
    difficulty: 'easy',
    points: 1,
    explanation: 'Mutable collections such as lists cannot be used as dictionary keys because their hash could change.',
    sourceContext: 'Data Structures Specification: Mapping Keys',
    status: 'pending_review',
    correctBool: true,
    createdAt: '2026-10-14T09:05:00Z',
  },
  {
    id: 'cand-3',
    courseId: 'course-cs101',
    topicId: 'topic-oop',
    prompt: 'In Python classes, the initial constructor method that instantiates attributes is named [blank].',
    type: 'fill_blank',
    difficulty: 'easy',
    points: 2,
    explanation: '__init__ is the initializer method automatically called upon instance creation.',
    sourceContext: 'OOP Module 5: Class Declaration and Instantiation',
    status: 'pending_review',
    acceptedAnswers: ['__init__', '__init__(self)'],
    caseSensitive: true,
    createdAt: '2026-10-14T09:10:00Z',
  },
];

const SEED_ASSESSMENTS: Assessment[] = [
  {
    id: 'asm-1',
    courseId: 'course-cs101',
    topicId: 'topic-syntax',
    title: 'Diagnostic Quiz: Pre-Course Python Proficiency',
    type: 'diagnostic',
    instructions: 'Evaluate your baseline familiarity with basic types, variable assignment, and string immutability.',
    questionIds: ['q-mc-1', 'q-tf-1', 'q-mc-adapt-1'],
    timeLimitMinutes: 15,
    maxAttempts: 1,
    passingScorePercent: 60,
    status: 'published',
    updatedAt: '2026-10-03T14:00:00Z',
    createdAt: '2026-10-02T10:00:00Z',
  },
  {
    id: 'asm-2',
    courseId: 'course-cs101',
    topicId: 'topic-control',
    title: 'Midterm Evaluation: Core Control Flow and Functions',
    type: 'summative',
    instructions: 'Comprehensive exam testing branching logic, iteration efficiency, and subroutine scope.',
    questionIds: ['q-fb-1', 'q-mat-1', 'q-sa-1'],
    timeLimitMinutes: 45,
    maxAttempts: 2,
    passingScorePercent: 70,
    status: 'published',
    updatedAt: '2026-10-09T16:00:00Z',
    createdAt: '2026-10-05T12:00:00Z',
  },
  {
    id: 'asm-adapt-1',
    courseId: 'course-cs101',
    topicId: 'topic-control',
    title: 'Adaptive Practice: Logic, Loops & Functions',
    type: 'adaptive',
    instructions: 'Dynamic practice session where subsequent question difficulty calibrates to your sequential responses.',
    questionIds: ['q-mc-adapt-1', 'q-mc-adapt-2', 'q-mat-1', 'q-tf-adapt-1', 'q-sa-1'],
    timeLimitMinutes: 20,
    maxAttempts: 5,
    passingScorePercent: 75,
    status: 'published',
    updatedAt: '2026-10-15T12:00:00Z',
    createdAt: '2026-10-15T10:00:00Z',
  },
  {
    id: 'asm-final-1',
    courseId: 'course-cs101',
    topicId: 'topic-oop',
    title: 'CS101 Comprehensive Final Examination',
    type: 'final',
    instructions: 'Formal summative timed examination covering variables, control structures, subroutines, collections, and OOP. Auto-submitted upon timer expiration.',
    questionIds: ['q-mc-1', 'q-tf-1', 'q-fb-1', 'q-mat-1', 'q-mc-adapt-2', 'q-tf-adapt-1', 'q-sa-1', 'q-mc-adapt-3'],
    timeLimitMinutes: 45,
    maxAttempts: 1,
    passingScorePercent: 75,
    status: 'published',
    updatedAt: '2026-10-16T15:00:00Z',
    createdAt: '2026-10-16T09:00:00Z',
  },
  {
    id: 'asm-3',
    courseId: 'course-cs101',
    topicId: 'topic-collections',
    title: 'Formative Review: Lists and Dictionaries',
    type: 'formative',
    instructions: 'Practice questions for associative lookup and sequence manipulation.',
    questionIds: [],
    timeLimitMinutes: 30,
    maxAttempts: 3,
    passingScorePercent: 75,
    status: 'draft',
    updatedAt: '2026-10-14T10:00:00Z',
    createdAt: '2026-10-14T08:00:00Z',
  },
];

const SEED_ATTEMPTS: AssessmentAttempt[] = [
  {
    id: 'att-1',
    learnerId: 'std-101',
    learnerName: 'Alex Chen',
    assessmentId: 'asm-1',
    assessmentTitle: 'Diagnostic Quiz: Pre-Course Python Proficiency',
    courseId: 'course-cs101',
    topicId: 'topic-syntax',
    scorePercent: 100,
    status: 'completed',
    completedAt: '2026-10-04T10:30:00Z',
  },
  {
    id: 'att-2',
    learnerId: 'std-102',
    learnerName: 'Maya Patel',
    assessmentId: 'asm-1',
    assessmentTitle: 'Diagnostic Quiz: Pre-Course Python Proficiency',
    courseId: 'course-cs101',
    topicId: 'topic-syntax',
    scorePercent: 67,
    status: 'completed',
    completedAt: '2026-10-04T11:15:00Z',
  },
  {
    id: 'att-3',
    learnerId: 'std-103',
    learnerName: 'Liam Davis',
    assessmentId: 'asm-1',
    assessmentTitle: 'Diagnostic Quiz: Pre-Course Python Proficiency',
    courseId: 'course-cs101',
    topicId: 'topic-syntax',
    scorePercent: 100,
    status: 'completed',
    completedAt: '2026-10-04T12:00:00Z',
  },
  {
    id: 'att-4',
    learnerId: 'std-104',
    learnerName: 'Sofia Martinez',
    assessmentId: 'asm-1',
    assessmentTitle: 'Diagnostic Quiz: Pre-Course Python Proficiency',
    courseId: 'course-cs101',
    topicId: 'topic-syntax',
    scorePercent: 67,
    status: 'completed',
    completedAt: '2026-10-04T13:45:00Z',
  },
  {
    id: 'att-5',
    learnerId: 'std-105',
    learnerName: 'Noah Kim',
    assessmentId: 'asm-2',
    assessmentTitle: 'Midterm Evaluation: Core Control Flow and Functions',
    courseId: 'course-cs101',
    topicId: 'topic-control',
    scorePercent: 78,
    status: 'completed',
    completedAt: '2026-10-10T14:20:00Z',
  },
  {
    id: 'att-6',
    learnerId: 'std-106',
    learnerName: 'Emma Watson',
    assessmentId: 'asm-2',
    assessmentTitle: 'Midterm Evaluation: Core Control Flow and Functions',
    courseId: 'course-cs101',
    topicId: 'topic-control',
    scorePercent: 55,
    status: 'completed',
    completedAt: '2026-10-10T15:00:00Z',
  },
  {
    id: 'att-7',
    learnerId: 'std-107',
    learnerName: 'Lucas Oliveira',
    assessmentId: 'asm-2',
    assessmentTitle: 'Midterm Evaluation: Core Control Flow and Functions',
    courseId: 'course-cs101',
    topicId: 'topic-control',
    scorePercent: 44,
    status: 'completed',
    completedAt: '2026-10-10T15:40:00Z',
  },
  {
    id: 'att-8',
    learnerId: 'std-108',
    learnerName: 'Zoe Thorne',
    assessmentId: 'asm-2',
    assessmentTitle: 'Midterm Evaluation: Core Control Flow and Functions',
    courseId: 'course-cs101',
    topicId: 'topic-control',
    scorePercent: 89,
    status: 'completed',
    completedAt: '2026-10-10T16:10:00Z',
  },
  {
    id: 'att-9',
    learnerId: 'std-109',
    learnerName: 'Jordan Reed',
    assessmentId: 'asm-2',
    assessmentTitle: 'Midterm Evaluation: Core Control Flow and Functions',
    courseId: 'course-cs101',
    topicId: 'topic-control',
    scorePercent: 50,
    status: 'completed',
    completedAt: '2026-10-11T09:30:00Z',
  },
  {
    id: 'att-10',
    learnerId: 'std-110',
    learnerName: 'Aria Takahashi',
    assessmentId: 'asm-2',
    assessmentTitle: 'Midterm Evaluation: Core Control Flow and Functions',
    courseId: 'course-cs101',
    topicId: 'topic-control',
    scorePercent: 92,
    status: 'completed',
    completedAt: '2026-10-11T10:15:00Z',
  },
];

export const CURRENT_STUDENT: StudentUser = {
  id: 'std-alex',
  name: 'Alex Rivera',
  email: 'a.rivera@learnova.edu',
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

const SEED_ENROLLMENTS: Enrollment[] = [
  // CS101 Enrollments
  {
    id: 'enr-cs101-1',
    studentId: 'std-alex',
    courseId: 'course-cs101',
    status: 'active',
    enrolledAt: '2026-09-16T09:00:00Z',
    progressPercent: 65,
  },
  {
    id: 'enr-cs101-2',
    studentId: 'std-clara',
    courseId: 'course-cs101',
    status: 'active',
    enrolledAt: '2026-09-18T10:15:00Z',
    progressPercent: 45,
  },
  {
    id: 'enr-cs101-3',
    studentId: 'std-marcus',
    courseId: 'course-cs101',
    status: 'active',
    enrolledAt: '2026-09-20T11:30:00Z',
    progressPercent: 30,
  },
  {
    id: 'enr-cs101-4',
    studentId: 'std-sarah',
    courseId: 'course-cs101',
    status: 'active',
    enrolledAt: '2026-09-22T08:45:00Z',
    progressPercent: 85,
  },
  {
    id: 'enr-cs101-5',
    studentId: 'std-liam',
    courseId: 'course-cs101',
    status: 'active',
    enrolledAt: '2026-09-25T14:20:00Z',
    progressPercent: 20,
  },
  {
    id: 'enr-cs101-6',
    studentId: 'std-priya',
    courseId: 'course-cs101',
    status: 'completed',
    enrolledAt: '2026-09-15T09:00:00Z',
    completedAt: '2026-10-12T16:00:00Z',
    progressPercent: 100,
  },

  // CS201 Enrollments
  {
    id: 'enr-cs201-1',
    studentId: 'std-alex',
    courseId: 'course-cs201',
    status: 'active',
    enrolledAt: '2026-09-20T13:00:00Z',
    progressPercent: 50,
  },
  {
    id: 'enr-cs201-2',
    studentId: 'std-clara',
    courseId: 'course-cs201',
    status: 'active',
    enrolledAt: '2026-09-22T15:30:00Z',
    progressPercent: 70,
  },
  {
    id: 'enr-cs201-3',
    studentId: 'std-priya',
    courseId: 'course-cs201',
    status: 'active',
    enrolledAt: '2026-09-26T10:00:00Z',
    progressPercent: 40,
  },
  {
    id: 'enr-cs201-4',
    studentId: 'std-devon',
    courseId: 'course-cs201',
    status: 'active',
    enrolledAt: '2026-09-29T11:45:00Z',
    progressPercent: 15,
  },

  // CS305 Enrollments
  {
    id: 'enr-cs305-1',
    studentId: 'std-alex',
    courseId: 'course-cs305',
    status: 'active',
    enrolledAt: '2026-10-02T09:30:00Z',
    progressPercent: 35,
  },
  {
    id: 'enr-cs305-2',
    studentId: 'std-sarah',
    courseId: 'course-cs305',
    status: 'active',
    enrolledAt: '2026-10-04T14:15:00Z',
    progressPercent: 60,
  },
  {
    id: 'enr-cs305-3',
    studentId: 'std-hannah',
    courseId: 'course-cs305',
    status: 'active',
    enrolledAt: '2026-10-05T16:00:00Z',
    progressPercent: 25,
  },
];

const SEED_LESSON_COMPLETIONS: LessonCompletion[] = [
  {
    id: 'lc-1',
    studentId: 'std-alex',
    courseId: 'course-cs101',
    topicId: 'topic-syntax',
    lessonId: 'lesson-vars-1',
    completedAt: '2026-10-14T10:30:00Z',
  },
  {
    id: 'lc-2',
    studentId: 'std-alex',
    courseId: 'course-cs101',
    topicId: 'topic-syntax',
    lessonId: 'lesson-vars-2',
    completedAt: '2026-10-15T11:45:00Z',
  },
];

const SEED_MASTERY_STATES: MasteryState[] = [
  {
    id: 'ms-syntax',
    studentId: 'std-alex',
    courseId: 'course-cs101',
    topicId: 'topic-syntax',
    scorePercent: 88,
    status: 'mastered',
    lastAssessedAt: '2026-10-14T12:00:00Z',
  },
  {
    id: 'ms-control',
    studentId: 'std-alex',
    courseId: 'course-cs101',
    topicId: 'topic-control',
    scorePercent: 78,
    status: 'competent',
    lastAssessedAt: '2026-10-15T14:30:00Z',
  },
  {
    id: 'ms-functions',
    studentId: 'std-alex',
    courseId: 'course-cs101',
    topicId: 'topic-functions',
    scorePercent: 62,
    status: 'developing',
    lastAssessedAt: '2026-10-16T16:00:00Z',
  },
  {
    id: 'ms-collections',
    studentId: 'std-alex',
    courseId: 'course-cs101',
    topicId: 'topic-collections',
    scorePercent: -1,
    status: 'not_assessed',
  },
  {
    id: 'ms-oop',
    studentId: 'std-alex',
    courseId: 'course-cs101',
    topicId: 'topic-oop',
    scorePercent: -1,
    status: 'not_assessed',
  },
];

const SEED_GAMIFICATION_PROFILE: GamificationProfile = {
  id: 'gp-alex',
  studentId: 'std-alex',
  xp: 520,
  level: 2,
  streakDays: 4,
  lastActiveDate: '2026-10-17',
};

const SEED_XP_EVENTS: XPEvent[] = [
  {
    id: 'xp-1',
    studentId: 'std-alex',
    type: 'lesson_completed',
    xpEarned: 50,
    timestamp: '2026-10-14T10:30:00Z',
    description: 'Completed lesson: Introduction to Primitive Types and Namespaces',
    relatedId: 'lesson-vars-1',
  },
  {
    id: 'xp-2',
    studentId: 'std-alex',
    type: 'lesson_completed',
    xpEarned: 50,
    timestamp: '2026-10-15T11:45:00Z',
    description: 'Completed lesson: String Immutability and Interpolation',
    relatedId: 'lesson-vars-2',
  },
  {
    id: 'xp-3',
    studentId: 'std-alex',
    type: 'diagnostic_completed',
    xpEarned: 150,
    timestamp: '2026-10-16T14:00:00Z',
    description: 'Completed Diagnostic Baseline: Pre-Course Python Proficiency',
    relatedId: 'asm-1',
  },
  {
    id: 'xp-4',
    studentId: 'std-alex',
    type: 'daily_streak',
    xpEarned: 70,
    timestamp: '2026-10-17T08:00:00Z',
    description: '4-day consecutive active study streak bonus',
  },
  {
    id: 'xp-5',
    studentId: 'std-alex',
    type: 'badge_earned',
    xpEarned: 200,
    timestamp: '2026-10-17T08:05:00Z',
    description: 'Unlocked achievement badge: Streak Sentinel',
  },
];

const SEED_BADGES: Badge[] = [
  {
    id: 'badge-first-step',
    title: 'First Step',
    description: 'Enrolled in a course and completed the first curriculum unit.',
    icon: 'Footprints',
    category: 'achievement',
    isUnlocked: true,
    earnedAt: '2026-09-16T09:15:00Z',
  },
  {
    id: 'badge-diagnostic',
    title: 'Diagnostic Pioneer',
    description: 'Completed initial diagnostic baseline assessment to calibrate mastery.',
    icon: 'Compass',
    category: 'achievement',
    isUnlocked: true,
    earnedAt: '2026-10-16T14:00:00Z',
  },
  {
    id: 'badge-syntax-master',
    title: 'Syntax Virtuoso',
    description: 'Achieved 85%+ mastery in Syntax, Variables & Primitive Data Types.',
    icon: 'Code',
    category: 'mastery',
    isUnlocked: true,
    earnedAt: '2026-10-14T12:00:00Z',
  },
  {
    id: 'badge-streak',
    title: 'Streak Sentinel',
    description: 'Maintained a 3-day or greater continuous learning streak.',
    icon: 'Flame',
    category: 'streak',
    isUnlocked: true,
    earnedAt: '2026-10-17T08:05:00Z',
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
    isCurrentUser: true,
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
    const list = this.get<Course[]>('courses', SEED_COURSES);
    return list.map((c) => {
      if (!c.creatorName) {
        if (c.id === 'course-cs101') {
          return {
            ...c,
            creatorId: 'teacher-101',
            creatorName: 'Dr. Elena Rostova',
            creatorEmail: 'e.rostova@learnova.edu',
            creatorDepartment: 'Faculty of Computer Science',
            creatorAvatar: 'ER',
          };
        } else if (c.id === 'course-cs201') {
          return {
            ...c,
            creatorId: 'teacher-102',
            creatorName: 'Prof. Alan Turing',
            creatorEmail: 'a.turing@learnova.edu',
            creatorDepartment: 'Applied Mathematics & Algorithms',
            creatorAvatar: 'AT',
          };
        } else if (c.id === 'course-cs305') {
          return {
            ...c,
            creatorId: 'teacher-103',
            creatorName: 'Dr. Ada Lovelace',
            creatorEmail: 'a.lovelace@learnova.edu',
            creatorDepartment: 'Software Architecture & Engineering',
            creatorAvatar: 'AL',
          };
        } else {
          return {
            ...c,
            creatorId: 'teacher-101',
            creatorName: 'Dr. Elena Rostova',
            creatorEmail: 'e.rostova@learnova.edu',
            creatorDepartment: 'Faculty of Computer Science',
            creatorAvatar: 'ER',
          };
        }
      }
      return c;
    });
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
    const list = this.get<Enrollment[]>('enrollments', SEED_ENROLLMENTS);
    if (!list || list.length <= 1) {
      this.set('enrollments', SEED_ENROLLMENTS);
      return SEED_ENROLLMENTS;
    }
    return list;
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

    const updated = list.map((entry) => {
      if (entry.isCurrentUser || entry.studentId === student.id) {
        return {
          ...entry,
          displayName: student.name,
          xp: profile.xp,
          level: profile.level,
          earnedBadgesCount: badges.length,
          badges: badges.map((b) => ({ id: b.id, title: b.title, icon: b.icon, description: b.description })),
        };
      }
      return entry;
    });

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

  resetAllData(): void {
    localStorage.clear();
  }
}

export const storage = new StorageService();
