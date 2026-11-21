import type {
  QuestionData,
  Topic,
  Lesson,
  LearningResource,
  AICandidateQuestion,
  Difficulty,
  QuestionType,
} from '../types/index.ts';

export interface CandidateFilterOptions {
  searchQuery?: string;
  statusFilter?: 'all' | 'pending_review' | 'approved' | 'rejected';
  typeFilter?: string;
  difficultyFilter?: string;
  lessonId?: string;
  sortField?: 'date' | 'difficulty' | 'points' | 'type';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter learning resources strictly to the selected lesson.
 */
export function filterLessonResources(
  resources: LearningResource[],
  lessonId: string
): LearningResource[] {
  if (!lessonId) return [];
  return resources.filter((r) => r.lessonId === lessonId);
}

export interface TopicLessonGroup {
  topic: Topic;
  lessonGroups: {
    lesson: Lesson;
    questions: QuestionData[];
  }[];
  topicGeneralQuestions: QuestionData[];
}

/**
 * Categorize questions across the strict 3-level hierarchy: Course -> Topic -> Lesson.
 */
export function categorizeQuestionsByHierarchy(
  courseTopics: Topic[],
  courseLessons: Lesson[],
  questions: QuestionData[]
): {
  topicGroups: TopicLessonGroup[];
  generalCourseQuestions: QuestionData[];
} {
  const topicGroups: TopicLessonGroup[] = [];
  const assignedQuestionIds = new Set<string>();

  for (const topic of courseTopics) {
    const topicLessons = courseLessons.filter((l) => l.topicId === topic.id);
    const lessonGroups = topicLessons.map((lesson) => {
      const lq = questions.filter((q) => q.lessonId === lesson.id);
      for (const q of lq) assignedQuestionIds.add(q.id);
      return { lesson, questions: lq };
    });

    const topicGeneral = questions.filter(
      (q) => q.topicId === topic.id && !assignedQuestionIds.has(q.id)
    );
    for (const q of topicGeneral) assignedQuestionIds.add(q.id);

    topicGroups.push({
      topic,
      lessonGroups,
      topicGeneralQuestions: topicGeneral,
    });
  }

  const generalCourseQuestions = questions.filter((q) => !assignedQuestionIds.has(q.id));

  return { topicGroups, generalCourseQuestions };
}

/**
 * Categorize question items hierarchically into lesson buckets for a course.
 */
export function categorizeQuestionsByLesson(
  courseLessons: Lesson[],
  questions: QuestionData[]
): {
  byLesson: Map<string, QuestionData[]>;
  generalQuestions: QuestionData[];
} {
  const byLesson = new Map<string, QuestionData[]>();
  for (const l of courseLessons) {
    byLesson.set(l.id, []);
  }
  const generalQuestions: QuestionData[] = [];

  for (const q of questions) {
    if (q.lessonId && byLesson.has(q.lessonId)) {
      byLesson.get(q.lessonId)!.push(q);
    } else {
      // Fallback matching by topic
      const matching = courseLessons.find((l) => l.topicId === q.topicId);
      if (matching && byLesson.has(matching.id)) {
        byLesson.get(matching.id)!.push(q);
      } else {
        generalQuestions.push(q);
      }
    }
  }

  return { byLesson, generalQuestions };
}

/**
 * Filter and sort AI candidate questions.
 */
export function filterAndSortCandidates(
  candidates: AICandidateQuestion[],
  options: CandidateFilterOptions = {}
): AICandidateQuestion[] {
  const {
    searchQuery = '',
    statusFilter = 'all',
    typeFilter = 'all',
    difficultyFilter = 'all',
    lessonId,
    sortField = 'date',
    sortOrder = 'desc',
  } = options;

  let list = [...candidates];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter(
      (c) =>
        c.prompt.toLowerCase().includes(q) ||
        (c.explanation && c.explanation.toLowerCase().includes(q)) ||
        (c.sourceContext && c.sourceContext.toLowerCase().includes(q))
    );
  }

  if (statusFilter !== 'all') {
    list = list.filter((c) => c.status === statusFilter);
  }

  if (typeFilter !== 'all') {
    list = list.filter((c) => c.type === typeFilter);
  }

  if (difficultyFilter !== 'all') {
    list = list.filter((c) => c.difficulty === difficultyFilter);
  }

  if (lessonId) {
    list = list.filter((c) => c.lessonId === lessonId);
  }

  const diffScore: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

  list.sort((a, b) => {
    let cmp = 0;
    if (sortField === 'date') {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === 'difficulty') {
      cmp = diffScore[a.difficulty] - diffScore[b.difficulty];
    } else if (sortField === 'points') {
      cmp = (a.points || 1) - (b.points || 1);
    } else if (sortField === 'type') {
      cmp = a.type.localeCompare(b.type);
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  return list;
}

/**
 * Bulk reject pending candidates for a course.
 */
export function bulkRejectPendingCandidates(
  candidates: AICandidateQuestion[],
  courseId: string,
  reason: string = 'Bulk rejected by teacher'
): AICandidateQuestion[] {
  return candidates.map((cand) => {
    if (cand.courseId === courseId && cand.status === 'pending_review') {
      return {
        ...cand,
        status: 'rejected' as const,
        rejectionReason: reason,
      };
    }
    return cand;
  });
}
