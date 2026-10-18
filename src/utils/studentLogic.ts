import type {
  Difficulty,
  MasteryStatus,
  QuestionData,
} from '../types/index.ts';

/**
 * Calculates student level and progress towards the next level from total XP.
 * Level 1: 0 - 250 XP
 * Level 2: 251 - 600 XP (350 XP required)
 * Level 3: 601 - 1050 XP (450 XP required)
 * Level N: previous + (150 + N * 100) XP
 */
export function calculateLevelFromXP(xp: number): {
  level: number;
  currentLevelFloorXP: number;
  nextLevelXP: number;
  progressPercent: number;
} {
  const safeXP = Math.max(0, Math.floor(xp || 0));
  let level = 1;
  let floorXP = 0;
  let span = 250;

  while (safeXP >= floorXP + span) {
    floorXP += span;
    level += 1;
    span = 150 + level * 100;
  }

  const nextLevelXP = floorXP + span;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((safeXP - floorXP) / span) * 100))
  );

  return {
    level,
    currentLevelFloorXP: floorXP,
    nextLevelXP,
    progressPercent,
  };
}

/**
 * Evaluates topic readiness based on prerequisite topic statuses.
 */
export function determineTopicReadiness(
  prerequisiteTopicIds: string[],
  topicMasteryMap: Record<string, { status: MasteryStatus; scorePercent: number }>
): {
  isReady: boolean;
  unmetPrerequisites: string[];
} {
  if (!prerequisiteTopicIds || prerequisiteTopicIds.length === 0) {
    return { isReady: true, unmetPrerequisites: [] };
  }

  const unmet: string[] = [];
  for (const prereqId of prerequisiteTopicIds) {
    const mastery = topicMasteryMap[prereqId];
    if (!mastery) {
      unmet.push(prereqId);
      continue;
    }
    const isPassing =
      mastery.status === 'competent' ||
      mastery.status === 'mastered' ||
      mastery.scorePercent >= 70;
    if (!isPassing) {
      unmet.push(prereqId);
    }
  }

  return {
    isReady: unmet.length === 0,
    unmetPrerequisites: unmet,
  };
}

/**
 * Maps score percent to standard MasteryStatus label.
 */
export function determineMasteryStatus(scorePercent: number): MasteryStatus {
  if (scorePercent === undefined || scorePercent === null || scorePercent < 0) {
    return 'not_assessed';
  }
  if (scorePercent >= 85) return 'mastered';
  if (scorePercent >= 70) return 'competent';
  return 'developing';
}

/**
 * Evaluates a single student response for any of the 5 question types.
 */
export function evaluateQuestionAnswer(
  question: QuestionData,
  studentResponse: any
): {
  isCorrect: boolean;
  score: number;
  maxScore: number;
} {
  const maxScore = question.points || 1;

  if (studentResponse === undefined || studentResponse === null || studentResponse === '') {
    return { isCorrect: false, score: 0, maxScore };
  }

  switch (question.type) {
    case 'multiple_choice': {
      if (question.isMultipleCorrectAllowed) {
        const correctIds = (question.options || [])
          .filter((o) => o.isCorrect)
          .map((o) => o.id);
        const selectedIds = Array.isArray(studentResponse) ? studentResponse : [studentResponse];
        if (correctIds.length === 0) return { isCorrect: false, score: 0, maxScore };
        const allCorrectSelected =
          correctIds.every((id) => selectedIds.includes(id)) &&
          selectedIds.every((id) => correctIds.includes(id));
        return {
          isCorrect: allCorrectSelected,
          score: allCorrectSelected ? maxScore : 0,
          maxScore,
        };
      } else {
        const correctOption = (question.options || []).find((o) => o.isCorrect);
        const isMatch = correctOption ? String(studentResponse) === correctOption.id : false;
        return {
          isCorrect: isMatch,
          score: isMatch ? maxScore : 0,
          maxScore,
        };
      }
    }

    case 'true_false': {
      const expected = Boolean(question.correctBool);
      const actual = studentResponse === true || studentResponse === 'true';
      const isMatch = actual === expected;
      return {
        isCorrect: isMatch,
        score: isMatch ? maxScore : 0,
        maxScore,
      };
    }

    case 'fill_blank': {
      const responseStr = String(studentResponse).trim();
      const accepted = question.acceptedAnswers || [];
      const caseSensitive = question.caseSensitive || false;

      const isMatch = accepted.some((ans) => {
        if (caseSensitive) {
          return ans.trim() === responseStr;
        }
        return ans.trim().toLowerCase() === responseStr.toLowerCase();
      });

      return {
        isCorrect: isMatch,
        score: isMatch ? maxScore : 0,
        maxScore,
      };
    }

    case 'matching': {
      // studentResponse is expected to be a record: { [pairId]: selectedRightText }
      const pairs = question.matchingPairs || [];
      if (pairs.length === 0) return { isCorrect: true, score: maxScore, maxScore };

      let correctMatches = 0;
      for (const pair of pairs) {
        if (studentResponse && studentResponse[pair.id] === pair.right) {
          correctMatches += 1;
        }
      }

      const fraction = correctMatches / pairs.length;
      const isAll = correctMatches === pairs.length;
      const score = Math.round(fraction * maxScore);
      return {
        isCorrect: isAll,
        score,
        maxScore,
      };
    }

    case 'short_answer': {
      const text = String(studentResponse).trim();
      if (text.length < 5) {
        return { isCorrect: false, score: 0, maxScore };
      }
      // If rubric has expected keywords, check how many keywords match
      const rubric = (question.expectedRubric || '').toLowerCase();
      const lowerText = text.toLowerCase();
      if (!rubric) {
        return { isCorrect: true, score: maxScore, maxScore };
      }

      const keywords = rubric
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3);

      if (keywords.length === 0) {
        return { isCorrect: true, score: maxScore, maxScore };
      }

      let matched = 0;
      for (const kw of keywords) {
        if (lowerText.includes(kw)) matched += 1;
      }
      const matchRatio = matched / keywords.length;
      const isPass = matchRatio >= 0.4 || text.length > 20;
      return {
        isCorrect: isPass,
        score: isPass ? maxScore : Math.round(matchRatio * maxScore),
        maxScore,
      };
    }

    default:
      return { isCorrect: false, score: 0, maxScore };
  }
}

/**
 * Pure adaptive question selection algorithm:
 * Adjusts question difficulty sequentially based on previous correctness.
 */
export function getNextAdaptiveQuestion(
  questionBank: QuestionData[],
  targetDifficulty: Difficulty,
  wasLastCorrect: boolean | null,
  usedQuestionIds: string[]
): QuestionData | null {
  const unused = questionBank.filter((q) => !usedQuestionIds.includes(q.id));
  if (unused.length === 0) return null;

  let nextDiff: Difficulty = targetDifficulty;
  if (wasLastCorrect === true) {
    if (targetDifficulty === 'easy') nextDiff = 'medium';
    else if (targetDifficulty === 'medium') nextDiff = 'hard';
  } else if (wasLastCorrect === false) {
    if (targetDifficulty === 'hard') nextDiff = 'medium';
    else if (targetDifficulty === 'medium') nextDiff = 'easy';
  }

  // Find question matching nextDiff
  const exactMatch = unused.find((q) => q.difficulty === nextDiff);
  if (exactMatch) return exactMatch;

  // Fallback to target difficulty
  const targetMatch = unused.find((q) => q.difficulty === targetDifficulty);
  if (targetMatch) return targetMatch;

  // Fallback to any remaining question
  return unused[0] || null;
}
