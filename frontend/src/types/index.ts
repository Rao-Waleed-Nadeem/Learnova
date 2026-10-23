export type CourseStatus = 'draft' | 'published' | 'archived';
export type AssessmentStatus = 'draft' | 'published' | 'scheduled' | 'completed' | 'archived';
export type AssessmentType = 'diagnostic' | 'formative' | 'summative' | 'adaptive' | 'final';
export type QuestionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
export type ResourceType = 'document' | 'video' | 'markdown' | 'code' | 'link';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'matching'
  | 'short_answer';

export interface Course {
  id: string;
  title: string;
  description: string;
  status: CourseStatus;
  updatedAt: string;
  createdAt: string;
  creatorId?: string;
  creatorName?: string;
  creatorEmail?: string;
  creatorDepartment?: string;
  creatorAvatar?: string;
}

export interface Topic {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  prerequisiteTopicIds: string[];
  masteryThreshold: number; // e.g. 75
  updatedAt: string;
  createdAt: string;
}

export interface Lesson {
  id: string;
  topicId: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  updatedAt: string;
  createdAt: string;
}

export interface LearningResource {
  id: string;
  lessonId: string;
  courseId: string;
  title: string;
  type: ResourceType;
  contentOrUrl: string;
  fileSize?: string;
  updatedAt: string;
  createdAt: string;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface QuestionData {
  id: string;
  courseId: string;
  topicId: string;
  type: QuestionType;
  prompt: string;
  difficulty: Difficulty;
  points: number;
  explanation?: string;
  status: QuestionStatus;
  source?: 'teacher' | 'ai_generated';
  options?: { id: string; text: string; isCorrect: boolean }[];
  isMultipleCorrectAllowed?: boolean;
  correctBool?: boolean;
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  matchingPairs?: MatchingPair[];
  expectedRubric?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AICandidateQuestion {
  id: string;
  courseId: string;
  topicId: string;
  prompt: string;
  type: QuestionType;
  difficulty: Difficulty;
  points: number;
  explanation: string;
  sourceContext: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  isMultipleCorrectAllowed?: boolean;
  correctBool?: boolean;
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  matchingPairs?: MatchingPair[];
  expectedRubric?: string;
  status: 'pending_review' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

export interface Assessment {
  id: string;
  courseId: string;
  topicId: string;
  title: string;
  type: AssessmentType;
  instructions: string;
  questionIds: string[];
  timeLimitMinutes?: number;
  maxAttempts?: number;
  passingScorePercent?: number;
  scheduleDate?: string;
  status: AssessmentStatus;
  updatedAt: string;
  createdAt: string;
}

export interface AssessmentAttempt {
  id: string;
  learnerId: string;
  learnerName: string;
  assessmentId: string;
  assessmentTitle: string;
  courseId: string;
  topicId: string;
  scorePercent: number;
  status: 'in_progress' | 'completed';
  completedAt: string;
}

export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  role: 'teacher';
  department: string;
}

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'student';
  bio?: string;
  joinDate: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    leaderboardOptIn: boolean;
    emailNotifications: boolean;
  };
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: 'active' | 'completed';
  enrolledAt: string;
  completedAt?: string;
  progressPercent?: number;
}

export interface LessonCompletion {
  id: string;
  studentId: string;
  courseId: string;
  topicId: string;
  lessonId: string;
  completedAt: string;
}

export type MasteryStatus = 'not_assessed' | 'developing' | 'competent' | 'mastered';

export interface MasteryState {
  id: string;
  studentId: string;
  courseId: string;
  topicId: string;
  scorePercent: number;
  status: MasteryStatus;
  lastAssessedAt?: string;
}

export interface LearningPathItem {
  id: string;
  courseId: string;
  topicId: string;
  lessonId?: string;
  type: 'lesson' | 'diagnostic' | 'adaptive_practice' | 'final_exam';
  title: string;
  reason: string;
  isCompleted: boolean;
}

export interface GamificationProfile {
  id: string;
  studentId: string;
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string;
}

export type XPEventType =
  | 'lesson_completed'
  | 'diagnostic_completed'
  | 'practice_completed'
  | 'exam_completed'
  | 'daily_streak'
  | 'badge_earned';

export interface XPEvent {
  id: string;
  studentId: string;
  type: XPEventType;
  xpEarned: number;
  timestamp: string;
  description: string;
  relatedId?: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'achievement' | 'streak' | 'mastery' | 'exam';
  earnedAt?: string;
  isUnlocked: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  displayName: string;
  avatar?: string;
  xp: number;
  level: number;
  earnedBadgesCount: number;
  badges: Array<{
    id: string;
    title: string;
    icon: string;
    description: string;
  }>;
  isCurrentUser?: boolean;
}

export interface StudentAssessmentSession {
  id: string;
  assessmentId: string;
  studentId: string;
  courseId: string;
  topicId: string;
  type: AssessmentType;
  startedAt: string;
  timeLimitMinutes?: number;
  remainingSeconds?: number;
  currentQuestionIndex: number;
  responses: Record<string, any>; // questionId -> answer
  questionIds: string[];
  status: 'in_progress' | 'submitted' | 'expired';
}

export interface StudentAssessmentResult {
  id: string;
  sessionId: string;
  assessmentId: string;
  assessmentTitle: string;
  type: AssessmentType;
  studentId: string;
  courseId: string;
  topicId: string;
  scorePercent: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  masteryStatus: MasteryStatus;
  xpAwarded: number;
  badgeAwarded?: Badge;
  nextRecommendedAction: {
    type: 'lesson' | 'adaptive_practice' | 'course_map' | 'diagnostic' | 'final_exam';
    targetId: string;
    label: string;
  };
  completedAt: string;
}

export type {
  UserRole,
  UserAccount,
  AuditActionType,
  AuditOutcome,
  AuditEvent,
  ServiceHealthCheck,
} from '../utils/adminLogic';

