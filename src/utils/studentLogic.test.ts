import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLevelFromXP,
  determineTopicReadiness,
  determineMasteryStatus,
  evaluateQuestionAnswer,
  getNextAdaptiveQuestion,
} from './studentLogic.ts';
import type { QuestionData } from '../types/index.ts';

test('calculateLevelFromXP computes levels and progression correctly', () => {
  const atZero = calculateLevelFromXP(0);
  assert.equal(atZero.level, 1);
  assert.equal(atZero.progressPercent, 0);

  const midLevel1 = calculateLevelFromXP(125);
  assert.equal(midLevel1.level, 1);
  assert.equal(midLevel1.progressPercent, 50);

  const level2Start = calculateLevelFromXP(250);
  assert.equal(level2Start.level, 2);
  assert.equal(level2Start.progressPercent, 0);

  const highXP = calculateLevelFromXP(1200);
  assert.ok(highXP.level >= 3);
});

test('determineTopicReadiness accurately handles prerequisites and mastery requirements', () => {
  const noPrereqs = determineTopicReadiness([], {});
  assert.equal(noPrereqs.isReady, true);
  assert.equal(noPrereqs.unmetPrerequisites.length, 0);

  const masteryMap = {
    'topic-1': { status: 'mastered' as const, scorePercent: 90 },
    'topic-2': { status: 'developing' as const, scorePercent: 55 },
  };

  const checkTopic3 = determineTopicReadiness(['topic-1'], masteryMap);
  assert.equal(checkTopic3.isReady, true);

  const checkTopic4 = determineTopicReadiness(['topic-1', 'topic-2'], masteryMap);
  assert.equal(checkTopic4.isReady, false);
  assert.deepEqual(checkTopic4.unmetPrerequisites, ['topic-2']);
});

test('determineMasteryStatus maps percentage boundaries correctly', () => {
  assert.equal(determineMasteryStatus(-1), 'not_assessed');
  assert.equal(determineMasteryStatus(50), 'developing');
  assert.equal(determineMasteryStatus(75), 'competent');
  assert.equal(determineMasteryStatus(92), 'mastered');
});

test('evaluateQuestionAnswer handles multiple choice questions', () => {
  const mcq: QuestionData = {
    id: 'q1',
    courseId: 'c1',
    topicId: 't1',
    type: 'multiple_choice',
    prompt: 'What is 2+2?',
    difficulty: 'easy',
    points: 2,
    status: 'approved',
    options: [
      { id: 'opt-a', text: '3', isCorrect: false },
      { id: 'opt-b', text: '4', isCorrect: true },
      { id: 'opt-c', text: '5', isCorrect: false },
    ],
    createdAt: '',
    updatedAt: '',
  };

  const correctRes = evaluateQuestionAnswer(mcq, 'opt-b');
  assert.equal(correctRes.isCorrect, true);
  assert.equal(correctRes.score, 2);

  const wrongRes = evaluateQuestionAnswer(mcq, 'opt-a');
  assert.equal(wrongRes.isCorrect, false);
  assert.equal(wrongRes.score, 0);
});

test('evaluateQuestionAnswer handles true/false and fill in blank', () => {
  const tf: QuestionData = {
    id: 'q2',
    courseId: 'c1',
    topicId: 't1',
    type: 'true_false',
    prompt: 'Earth is round',
    difficulty: 'easy',
    points: 1,
    status: 'approved',
    correctBool: true,
    createdAt: '',
    updatedAt: '',
  };

  assert.equal(evaluateQuestionAnswer(tf, true).isCorrect, true);
  assert.equal(evaluateQuestionAnswer(tf, false).isCorrect, false);

  const fib: QuestionData = {
    id: 'q3',
    courseId: 'c1',
    topicId: 't1',
    type: 'fill_blank',
    prompt: 'Python was created by Guido van [blank]',
    difficulty: 'medium',
    points: 3,
    status: 'approved',
    acceptedAnswers: ['Rossum', 'van Rossum'],
    caseSensitive: false,
    createdAt: '',
    updatedAt: '',
  };

  assert.equal(evaluateQuestionAnswer(fib, 'rossum').isCorrect, true);
  assert.equal(evaluateQuestionAnswer(fib, 'Torvalds').isCorrect, false);
});

test('getNextAdaptiveQuestion escalates and de-escalates difficulty based on performance', () => {
  const bank: QuestionData[] = [
    { id: 'q-easy-1', courseId: 'c1', topicId: 't1', type: 'true_false', prompt: 'E1', difficulty: 'easy', points: 1, status: 'approved', createdAt: '', updatedAt: '' },
    { id: 'q-med-1', courseId: 'c1', topicId: 't1', type: 'true_false', prompt: 'M1', difficulty: 'medium', points: 2, status: 'approved', createdAt: '', updatedAt: '' },
    { id: 'q-hard-1', courseId: 'c1', topicId: 't1', type: 'true_false', prompt: 'H1', difficulty: 'hard', points: 3, status: 'approved', createdAt: '', updatedAt: '' },
  ];

  // Starting at easy and answering correctly should escalate to medium
  const nextAfterCorrect = getNextAdaptiveQuestion(bank, 'easy', true, ['q-easy-1']);
  assert.equal(nextAfterCorrect?.id, 'q-med-1');

  // Starting at hard and answering incorrectly should de-escalate to medium
  const nextAfterWrong = getNextAdaptiveQuestion(bank, 'hard', false, ['q-hard-1']);
  assert.equal(nextAfterWrong?.id, 'q-med-1');
});
