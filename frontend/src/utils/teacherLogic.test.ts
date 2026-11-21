import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterLessonResources,
  categorizeQuestionsByLesson,
  categorizeQuestionsByHierarchy,
  filterAndSortCandidates,
  bulkRejectPendingCandidates,
} from './teacherLogic.ts';
import type {
  Topic,
  Lesson,
  LearningResource,
  QuestionData,
  AICandidateQuestion,
} from '../types/index.ts';

test('filterLessonResources strictly returns resources belonging to the selected lesson', () => {
  const sampleResources: LearningResource[] = [
    {
      id: 'res-1',
      lessonId: 'lesson-1',
      courseId: 'course-1',
      title: 'Python Variables Doc',
      type: 'document',
      contentOrUrl: 'https://docs.python.org',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
    {
      id: 'res-2',
      lessonId: 'lesson-1',
      courseId: 'course-1',
      title: 'Code Example',
      type: 'code',
      contentOrUrl: 'x = 10',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
    {
      id: 'res-3',
      lessonId: 'lesson-2',
      courseId: 'course-1',
      title: 'Loops Slides',
      type: 'video',
      contentOrUrl: 'https://video.link',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
  ];

  const l1Res = filterLessonResources(sampleResources, 'lesson-1');
  assert.equal(l1Res.length, 2);
  assert.equal(l1Res[0].id, 'res-1');
  assert.equal(l1Res[1].id, 'res-2');

  const l2Res = filterLessonResources(sampleResources, 'lesson-2');
  assert.equal(l2Res.length, 1);
  assert.equal(l2Res[0].id, 'res-3');

  const emptyRes = filterLessonResources(sampleResources, 'lesson-99');
  assert.equal(emptyRes.length, 0);
});

test('categorizeQuestionsByLesson correctly buckets questions under lesson categories', () => {
  const lessons: Lesson[] = [
    {
      id: 'l-1',
      topicId: 't-1',
      courseId: 'c-1',
      title: 'Lesson 1',
      description: 'Desc 1',
      order: 1,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
    {
      id: 'l-2',
      topicId: 't-2',
      courseId: 'c-1',
      title: 'Lesson 2',
      description: 'Desc 2',
      order: 2,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
  ];

  const questions: QuestionData[] = [
    {
      id: 'q-1',
      courseId: 'c-1',
      topicId: 't-1',
      lessonId: 'l-1',
      type: 'multiple_choice',
      prompt: 'Q1 prompt',
      difficulty: 'easy',
      points: 1,
      status: 'approved',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
    {
      id: 'q-2',
      courseId: 'c-1',
      topicId: 't-2',
      lessonId: 'l-2',
      type: 'true_false',
      prompt: 'Q2 prompt',
      difficulty: 'medium',
      points: 2,
      status: 'approved',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
    {
      id: 'q-3',
      courseId: 'c-1',
      topicId: 't-unmapped',
      type: 'short_answer',
      prompt: 'General course question',
      difficulty: 'hard',
      points: 3,
      status: 'approved',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
  ];

  const { byLesson, generalQuestions } = categorizeQuestionsByLesson(lessons, questions);

  assert.equal(byLesson.get('l-1')?.length, 1);
  assert.equal(byLesson.get('l-1')?.[0].id, 'q-1');
  assert.equal(byLesson.get('l-2')?.length, 1);
  assert.equal(byLesson.get('l-2')?.[0].id, 'q-2');
  assert.equal(generalQuestions.length, 1);
  assert.equal(generalQuestions[0].id, 'q-3');
});

test('filterAndSortCandidates handles searching, filters, and ascending/descending sorting', () => {
  const candidates: AICandidateQuestion[] = [
    {
      id: 'c-1',
      courseId: 'c-1',
      topicId: 't-1',
      lessonId: 'l-1',
      prompt: 'Alpha question on functions',
      explanation: 'Basic explanation',
      sourceContext: 'Notes',
      type: 'multiple_choice',
      difficulty: 'easy',
      points: 1,
      status: 'pending_review',
      createdAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'c-2',
      courseId: 'c-1',
      topicId: 't-1',
      lessonId: 'l-1',
      prompt: 'Zeta question on loops',
      explanation: 'Advanced explanation',
      sourceContext: 'Notes',
      type: 'true_false',
      difficulty: 'hard',
      points: 4,
      status: 'pending_review',
      createdAt: '2026-10-02T10:00:00Z',
    },
    {
      id: 'c-3',
      courseId: 'c-1',
      topicId: 't-1',
      lessonId: 'l-1',
      prompt: 'Beta question on variables',
      explanation: 'Intermediate explanation',
      sourceContext: 'Notes',
      type: 'fill_blank',
      difficulty: 'medium',
      points: 2,
      status: 'rejected',
      createdAt: '2026-10-03T10:00:00Z',
    },
  ];

  // 1. Filter by status
  const pendingOnly = filterAndSortCandidates(candidates, { statusFilter: 'pending_review' });
  assert.equal(pendingOnly.length, 2);

  // 2. Search query filter
  const searchResults = filterAndSortCandidates(candidates, { searchQuery: 'loops' });
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].id, 'c-2');

  // 3. Sort by difficulty ascending (easy -> hard)
  const sortedDiffAsc = filterAndSortCandidates(candidates, {
    sortField: 'difficulty',
    sortOrder: 'asc',
  });
  assert.equal(sortedDiffAsc[0].difficulty, 'easy');
  assert.equal(sortedDiffAsc[2].difficulty, 'hard');

  // 4. Sort by difficulty descending (hard -> easy)
  const sortedDiffDesc = filterAndSortCandidates(candidates, {
    sortField: 'difficulty',
    sortOrder: 'desc',
  });
  assert.equal(sortedDiffDesc[0].difficulty, 'hard');
  assert.equal(sortedDiffDesc[2].difficulty, 'easy');

  // 5. Sort by points descending
  const sortedPoints = filterAndSortCandidates(candidates, {
    sortField: 'points',
    sortOrder: 'desc',
  });
  assert.equal(sortedPoints[0].points, 4);
  assert.equal(sortedPoints[2].points, 1);
});

test('bulkRejectPendingCandidates sets status to rejected with reason for all pending course questions', () => {
  const candidates: AICandidateQuestion[] = [
    {
      id: 'c-1',
      courseId: 'c-1',
      topicId: 't-1',
      prompt: 'Prompt 1',
      explanation: 'Exp',
      sourceContext: 'Ctx',
      type: 'multiple_choice',
      difficulty: 'medium',
      points: 2,
      status: 'pending_review',
      createdAt: '2026-10-01',
    },
    {
      id: 'c-2',
      courseId: 'c-1',
      topicId: 't-1',
      prompt: 'Prompt 2',
      explanation: 'Exp',
      sourceContext: 'Ctx',
      type: 'true_false',
      difficulty: 'easy',
      points: 1,
      status: 'approved',
      createdAt: '2026-10-01',
    },
    {
      id: 'c-3',
      courseId: 'c-2',
      topicId: 't-2',
      prompt: 'Prompt 3',
      explanation: 'Exp',
      sourceContext: 'Ctx',
      type: 'fill_blank',
      difficulty: 'hard',
      points: 3,
      status: 'pending_review',
      createdAt: '2026-10-01',
    },
  ];

  const result = bulkRejectPendingCandidates(candidates, 'c-1', 'Teacher bulk rejected');

  // c-1 was pending -> now rejected
  assert.equal(result.find((c) => c.id === 'c-1')?.status, 'rejected');
  assert.equal(result.find((c) => c.id === 'c-1')?.rejectionReason, 'Teacher bulk rejected');

  // c-2 was already approved -> untouched
  assert.equal(result.find((c) => c.id === 'c-2')?.status, 'approved');

  // c-3 was in c-2 course -> untouched
  assert.equal(result.find((c) => c.id === 'c-3')?.status, 'pending_review');
});

test('categorizeQuestionsByHierarchy strictly enforces Course -> Topic -> Lesson hierarchy', () => {
  const topics: Topic[] = [
    {
      id: 't-1',
      courseId: 'c-1',
      title: 'Topic 1: Syntax',
      description: 'Syntax desc',
      order: 1,
      prerequisiteTopicIds: [],
      masteryThreshold: 75,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
    {
      id: 't-2',
      courseId: 'c-1',
      title: 'Topic 2: Control',
      description: 'Control desc',
      order: 2,
      prerequisiteTopicIds: ['t-1'],
      masteryThreshold: 75,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
  ];

  const lessons: Lesson[] = [
    {
      id: 'l-1a',
      topicId: 't-1',
      courseId: 'c-1',
      title: 'Lesson 1A: Variables',
      description: 'Variables',
      order: 1,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
    {
      id: 'l-1b',
      topicId: 't-1',
      courseId: 'c-1',
      title: 'Lesson 1B: Strings',
      description: 'Strings',
      order: 2,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
    {
      id: 'l-2a',
      topicId: 't-2',
      courseId: 'c-1',
      title: 'Lesson 2A: Branching',
      description: 'Branching',
      order: 1,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
  ];

  const questions: QuestionData[] = [
    {
      id: 'q-1a',
      courseId: 'c-1',
      topicId: 't-1',
      lessonId: 'l-1a',
      type: 'multiple_choice',
      prompt: 'Q 1A',
      difficulty: 'easy',
      points: 1,
      status: 'approved',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
    {
      id: 'q-1b',
      courseId: 'c-1',
      topicId: 't-1',
      lessonId: 'l-1b',
      type: 'true_false',
      prompt: 'Q 1B',
      difficulty: 'medium',
      points: 2,
      status: 'approved',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
    {
      id: 'q-1-gen',
      courseId: 'c-1',
      topicId: 't-1',
      type: 'fill_blank',
      prompt: 'Q 1 General',
      difficulty: 'easy',
      points: 1,
      status: 'approved',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
    {
      id: 'q-2a',
      courseId: 'c-1',
      topicId: 't-2',
      lessonId: 'l-2a',
      type: 'matching',
      prompt: 'Q 2A',
      difficulty: 'hard',
      points: 3,
      status: 'approved',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
  ];

  const { topicGroups, generalCourseQuestions } = categorizeQuestionsByHierarchy(
    topics,
    lessons,
    questions
  );

  assert.equal(topicGroups.length, 2);

  // Topic 1
  const tg1 = topicGroups[0];
  assert.equal(tg1.topic.id, 't-1');
  assert.equal(tg1.lessonGroups.length, 2);
  assert.equal(tg1.lessonGroups[0].lesson.id, 'l-1a');
  assert.equal(tg1.lessonGroups[0].questions.length, 1);
  assert.equal(tg1.lessonGroups[0].questions[0].id, 'q-1a');

  assert.equal(tg1.lessonGroups[1].lesson.id, 'l-1b');
  assert.equal(tg1.lessonGroups[1].questions.length, 1);
  assert.equal(tg1.lessonGroups[1].questions[0].id, 'q-1b');

  assert.equal(tg1.topicGeneralQuestions.length, 1);
  assert.equal(tg1.topicGeneralQuestions[0].id, 'q-1-gen');

  // Topic 2
  const tg2 = topicGroups[1];
  assert.equal(tg2.topic.id, 't-2');
  assert.equal(tg2.lessonGroups.length, 1);
  assert.equal(tg2.lessonGroups[0].lesson.id, 'l-2a');
  assert.equal(tg2.lessonGroups[0].questions.length, 1);
  assert.equal(tg2.lessonGroups[0].questions[0].id, 'q-2a');

  assert.equal(generalCourseQuestions.length, 0);
});
