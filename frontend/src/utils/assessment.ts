/**
 * Learnova Assessment & Question Rules
 * Pure calculations and validation routines.
 */

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'matching'
  | 'short_answer';

export type Difficulty = 'easy' | 'medium' | 'hard';

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
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
  source?: 'teacher' | 'ai_generated';
  // Type-specific answers
  options?: { id: string; text: string; isCorrect: boolean }[]; // multiple_choice
  isMultipleCorrectAllowed?: boolean; // multiple_choice
  correctBool?: boolean; // true_false
  acceptedAnswers?: string[]; // fill_blank
  caseSensitive?: boolean; // fill_blank
  matchingPairs?: MatchingPair[]; // matching
  expectedRubric?: string; // short_answer
  createdAt: string;
  updatedAt: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

/**
 * Validates question payload against domain rules for each type.
 */
export function validateQuestion(q: Partial<QuestionData>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (q.type !== 'matching' && (!q.prompt || !q.prompt.trim())) {
    issues.push({ field: 'prompt', message: 'Question prompt is required.' });
  }

  if (!q.courseId) {
    issues.push({ field: 'courseId', message: 'Course association is required.' });
  }

  if (!q.topicId) {
    issues.push({ field: 'topicId', message: 'Topic association is required.' });
  }

  if (!q.type) {
    issues.push({ field: 'type', message: 'Question type is required.' });
    return issues;
  }

  switch (q.type) {
    case 'multiple_choice': {
      const options = q.options || [];
      if (options.length < 2) {
        issues.push({ field: 'options', message: 'At least 2 options are required.' });
      }
      const hasEmpty = options.some((opt) => !opt.text || !opt.text.trim());
      if (hasEmpty) {
        issues.push({ field: 'options', message: 'Option text cannot be empty.' });
      }
      const hasCorrect = options.some((opt) => opt.isCorrect);
      if (!hasCorrect) {
        issues.push({ field: 'options', message: 'At least one option must be marked as correct.' });
      }
      break;
    }

    case 'true_false': {
      if (q.correctBool === undefined || q.correctBool === null) {
        issues.push({ field: 'correctBool', message: 'Select whether True or False is the correct answer.' });
      }
      break;
    }

    case 'fill_blank': {
      const answers = q.acceptedAnswers || [];
      if (answers.length === 0 || !answers.some((a) => a.trim())) {
        issues.push({ field: 'acceptedAnswers', message: 'At least one accepted answer is required.' });
      }
      break;
    }

    case 'matching': {
      const pairs = q.matchingPairs || [];
      if (pairs.length < 2) {
        issues.push({ field: 'matchingPairs', message: 'At least 2 matching pairs are required.' });
      }
      const incomplete = pairs.some((p) => !p.left.trim() || !p.right.trim());
      if (incomplete) {
        issues.push({ field: 'matchingPairs', message: 'All matching pair items must be non-empty.' });
      }
      break;
    }

    case 'short_answer': {
      if (!q.expectedRubric || !q.expectedRubric.trim()) {
        issues.push({ field: 'expectedRubric', message: 'Sample expected answer or grading criteria is required.' });
      }
      break;
    }
  }

  return issues;
}

/**
 * Calculates total points of an assessment.
 */
export function calculateAssessmentTotalPoints(questions: QuestionData[]): number {
  return questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
}

/**
 * Calculates academic mastery percentage for a topic based strictly on
 * completed assessment attempt scores. Decoupled from gamification (XP/badges).
 */
export function calculateAcademicMastery(
  attempts: { topicId: string; status: 'in_progress' | 'completed'; scorePercent: number }[],
  topicId: string
): { masteryPercent: number; completedCount: number } {
  // Mastery invariant: only completed assessments count!
  const completed = attempts.filter((a) => a.topicId === topicId && a.status === 'completed');
  if (completed.length === 0) {
    return { masteryPercent: 0, completedCount: 0 };
  }

  const sum = completed.reduce((acc, a) => acc + a.scorePercent, 0);
  const avg = Math.round(sum / completed.length);
  return { masteryPercent: avg, completedCount: completed.length };
}
