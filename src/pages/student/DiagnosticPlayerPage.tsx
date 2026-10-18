import React, { useState } from 'react';
import { Assessment, QuestionData } from '../../types';
import { AssessmentPlayerShell } from '../../components/student/AssessmentPlayerShell';
import { QuestionRenderer } from '../../components/student/QuestionRenderer';
import { evaluateQuestionAnswer, determineMasteryStatus } from '../../utils/studentLogic';

interface DiagnosticPlayerPageProps {
  assessment: Assessment;
  questions: QuestionData[];
  onFinishDiagnostic: (result: {
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

export const DiagnosticPlayerPage: React.FC<DiagnosticPlayerPageProps> = ({
  assessment,
  questions,
  onFinishDiagnostic,
  onExit,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active question set for this diagnostic
  const activeQuestions = questions.filter((q) => assessment.questionIds.includes(q.id));
  const currentQuestion = activeQuestions[currentIndex] || activeQuestions[0];
  const totalQuestions = activeQuestions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const canSubmit = currentAnswer !== undefined && currentAnswer !== '' && !isSubmitting;

  const handleAnswerChange = (val: any) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));
  };

  const handleSubmitAnswer = () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      if (isLastQuestion) {
        // Evaluate all answers
        let earnedPoints = 0;
        let totalPossible = 0;
        let correctCount = 0;
        let incorrectCount = 0;

        for (const q of activeQuestions) {
          const resp = answers[q.id];
          const evalResult = evaluateQuestionAnswer(q, resp);
          earnedPoints += evalResult.score;
          totalPossible += evalResult.maxScore;
          if (evalResult.isCorrect) correctCount += 1;
          else incorrectCount += 1;
        }

        const scorePercent = totalPossible > 0 ? Math.round((earnedPoints / totalPossible) * 100) : 0;
        const masteryStatus = determineMasteryStatus(scorePercent);

        onFinishDiagnostic({
          assessmentId: assessment.id,
          scorePercent,
          totalQuestions,
          correctCount,
          incorrectCount,
          masteryStatus,
          xpAwarded: 150,
        });
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 350);
  };

  if (!currentQuestion) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-gray-500">No questions found in this assessment.</p>
        <button type="button" onClick={onExit} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs">
          Return to Map
        </button>
      </div>
    );
  }

  return (
    <AssessmentPlayerShell
      title={assessment.title}
      type="diagnostic"
      currentQuestionIndex={currentIndex}
      totalQuestions={totalQuestions}
      timeLimitMinutes={assessment.timeLimitMinutes}
      onTimerExpire={handleSubmitAnswer}
      onExit={onExit}
      onSubmitAnswer={handleSubmitAnswer}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
      isLastQuestion={isLastQuestion}
    >
      <QuestionRenderer
        question={currentQuestion}
        answer={currentAnswer}
        onChangeAnswer={handleAnswerChange}
        disabled={isSubmitting}
      />
    </AssessmentPlayerShell>
  );
};
