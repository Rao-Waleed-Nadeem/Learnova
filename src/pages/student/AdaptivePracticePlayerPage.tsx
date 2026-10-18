import React, { useState } from 'react';
import { Assessment, QuestionData, Difficulty } from '../../types';
import { AssessmentPlayerShell } from '../../components/student/AssessmentPlayerShell';
import { QuestionRenderer } from '../../components/student/QuestionRenderer';
import { evaluateQuestionAnswer, getNextAdaptiveQuestion, determineMasteryStatus } from '../../utils/studentLogic';

interface AdaptivePracticePlayerPageProps {
  assessment: Assessment;
  questions: QuestionData[];
  onFinishPractice: (result: {
    assessmentId: string;
    scorePercent: number;
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    masteryStatus: any;
    xpAwarded: number;
  }) => void;
  onExit: () => void;
}

export const AdaptivePracticePlayerPage: React.FC<AdaptivePracticePlayerPageProps> = ({
  assessment,
  questions,
  onFinishPractice,
  onExit,
}) => {
  const [sessionQuestions, setSessionQuestions] = useState<QuestionData[]>(() => {
    // Start with first medium or easy question from bank
    const courseQuestions = questions.filter((q) => q.courseId === assessment.courseId && q.status === 'approved');
    const startQ = courseQuestions.find((q) => q.difficulty === 'medium') || courseQuestions[0];
    return startQ ? [startQ] : [];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [evaluations, setEvaluations] = useState<Record<string, { isCorrect: boolean; score: number; maxScore: number }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const targetSessionLength = 5; // Adaptive practice completes after 5 dynamic questions
  const currentQuestion = sessionQuestions[currentIndex];
  const isLastQuestion = currentIndex >= targetSessionLength - 1;

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const currentEval = currentQuestion ? evaluations[currentQuestion.id] : undefined;
  const canSubmit = currentAnswer !== undefined && currentAnswer !== '' && !isSubmitting;

  const handleAnswerChange = (val: any) => {
    if (!currentQuestion || showFeedback) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));
  };

  const handleSubmitOrContinue = () => {
    if (!canSubmit && !showFeedback) return;

    if (!showFeedback) {
      // Step 1: Grade current question and show immediate pedagogical feedback
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        const evalResult = evaluateQuestionAnswer(currentQuestion, currentAnswer);
        setEvaluations((prev) => ({ ...prev, [currentQuestion.id]: evalResult }));
        setShowFeedback(true);
      }, 300);
    } else {
      // Step 2: Advance to next question or complete session
      setShowFeedback(false);

      if (isLastQuestion) {
        // Complete practice session and evaluate total mastery recalibration
        let earned = 0;
        let possible = 0;
        let corrects = 0;
        let incorrects = 0;

        for (const q of sessionQuestions) {
          const ev = evaluations[q.id];
          if (ev) {
            earned += ev.score;
            possible += ev.maxScore;
            if (ev.isCorrect) corrects += 1;
            else incorrects += 1;
          }
        }

        const scorePercent = possible > 0 ? Math.round((earned / possible) * 100) : 0;
        const masteryStatus = determineMasteryStatus(scorePercent);

        onFinishPractice({
          assessmentId: assessment.id,
          scorePercent,
          totalQuestions: sessionQuestions.length,
          correctCount: corrects,
          incorrectCount: incorrects,
          masteryStatus,
          xpAwarded: 120,
        });
      } else {
        // Find next adaptive question based on whether last answer was correct
        const lastEval = evaluations[currentQuestion.id];
        const usedIds = sessionQuestions.map((q) => q.id);
        const nextQ = getNextAdaptiveQuestion(
          questions.filter((q) => q.courseId === assessment.courseId && q.status === 'approved'),
          currentQuestion.difficulty as Difficulty,
          lastEval?.isCorrect || false,
          usedIds
        );

        if (nextQ) {
          setSessionQuestions((prev) => [...prev, nextQ]);
          setCurrentIndex((prev) => prev + 1);
        } else {
          // If no remaining questions, finish session
          onFinishPractice({
            assessmentId: assessment.id,
            scorePercent: 85,
            totalQuestions: sessionQuestions.length,
            correctCount: sessionQuestions.length,
            incorrectCount: 0,
            masteryStatus: 'mastered',
            xpAwarded: 120,
          });
        }
      }
    }
  };

  if (!currentQuestion) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-gray-500">Initializing adaptive practice item...</p>
      </div>
    );
  }

  return (
    <AssessmentPlayerShell
      title={assessment.title}
      type="adaptive"
      currentQuestionIndex={currentIndex}
      totalQuestions={targetSessionLength}
      timeLimitMinutes={assessment.timeLimitMinutes}
      onTimerExpire={handleSubmitOrContinue}
      onExit={onExit}
      onSubmitAnswer={handleSubmitOrContinue}
      isSubmitting={isSubmitting}
      canSubmit={showFeedback || canSubmit}
      isLastQuestion={isLastQuestion && showFeedback}
    >
      <div className="space-y-4">
        {/* Adaptive Difficulty Indicator Pill */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pb-2 border-b border-gray-100 dark:border-gray-800">
          <span>
            Current Engine Tier:{' '}
            <strong className="text-indigo-600 dark:text-indigo-400 capitalize">
              {currentQuestion.difficulty} Difficulty
            </strong>
          </span>
          <span className="text-[11px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
            SSD-04 Dynamic Selection
          </span>
        </div>

        <QuestionRenderer
          question={currentQuestion}
          answer={currentAnswer}
          onChangeAnswer={handleAnswerChange}
          disabled={isSubmitting || showFeedback}
          showFeedback={showFeedback}
          isCorrect={currentEval?.isCorrect}
        />
      </div>
    </AssessmentPlayerShell>
  );
};
