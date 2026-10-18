import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateQuestion,
  calculateAssessmentTotalPoints,
  calculateAcademicMastery,
  type QuestionData
} from './assessment.ts';

test('validateQuestion rejects empty prompt', () => {
  const issues = validateQuestion({
    prompt: '',
    courseId: 'c1',
    topicId: 't1',
    type: 'multiple_choice',
  });
  assert.ok(issues.some(i => i.field === 'prompt'));
});

test('validateQuestion verifies multiple choice requirements', () => {
  const noCorrect = validateQuestion({
    prompt: 'What is a variable?',
    courseId: 'c1',
    topicId: 't1',
    type: 'multiple_choice',
    options: [
      { id: '1', text: 'Storage container', isCorrect: false },
      { id: '2', text: 'Loop construct', isCorrect: false }
    ]
  });
  assert.ok(noCorrect.some(i => i.message.includes('marked as correct')));

  const valid = validateQuestion({
    prompt: 'What is a variable?',
    courseId: 'c1',
    topicId: 't1',
    type: 'multiple_choice',
    options: [
      { id: '1', text: 'A named storage location', isCorrect: true },
      { id: '2', text: 'A loop keyword', isCorrect: false }
    ]
  });
  assert.equal(valid.length, 0);
});

test('validateQuestion verifies true/false requires selection', () => {
  const missing = validateQuestion({
    prompt: 'Python is a compiled-only language.',
    courseId: 'c1',
    topicId: 't1',
    type: 'true_false',
  });
  assert.ok(missing.some(i => i.field === 'correctBool'));

  const valid = validateQuestion({
    prompt: 'Python is interpreted.',
    courseId: 'c1',
    topicId: 't1',
    type: 'true_false',
    correctBool: true
  });
  assert.equal(valid.length, 0);
});

test('validateQuestion allows matching question without prompt when pairs are valid', () => {
  const validMatching = validateQuestion({
    prompt: '', // No prompt required for matching questions per Requirement C!
    courseId: 'c1',
    topicId: 't1',
    type: 'matching',
    matchingPairs: [
      { id: '1', left: 'HTML', right: 'Markup language' },
      { id: '2', left: 'CSS', right: 'Styling language' },
    ],
  });
  assert.equal(validMatching.length, 0);

  const invalidMatching = validateQuestion({
    prompt: '',
    courseId: 'c1',
    topicId: 't1',
    type: 'matching',
    matchingPairs: [
      { id: '1', left: 'HTML', right: '' }, // empty right item
    ],
  });
  assert.ok(invalidMatching.some(i => i.field === 'matchingPairs'));
});

test('calculateAssessmentTotalPoints aggregates point totals', () => {
  const qList: QuestionData[] = [
    { id: '1', points: 5 } as any,
    { id: '2', points: 10 } as any,
    { id: '3', points: 2 } as any,
  ];
  assert.equal(calculateAssessmentTotalPoints(qList), 17);
});

test('calculateAcademicMastery strictly ignores in_progress attempts', () => {
  const attempts = [
    { topicId: 't1', status: 'completed' as const, scorePercent: 80 },
    { topicId: 't1', status: 'completed' as const, scorePercent: 90 },
    { topicId: 't1', status: 'in_progress' as const, scorePercent: 30 }, // must NOT be counted!
    { topicId: 't2', status: 'completed' as const, scorePercent: 50 },
  ];
  const result = calculateAcademicMastery(attempts, 't1');
  assert.equal(result.completedCount, 2);
  assert.equal(result.masteryPercent, 85);
});
