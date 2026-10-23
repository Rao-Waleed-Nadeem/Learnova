import React, { useState } from 'react';
import { Assessment, QuestionData } from '../../types';
import { AssessmentPlayerShell } from '../../components/student/AssessmentPlayerShell';
import { QuestionRenderer } from '../../components/student/QuestionRenderer';
import { evaluateQuestionAnswer, determineMasteryStatus } from '../../utils/studentLogic';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface FinalExamPlayerPageProps {
  assessment: Assessment;
  questions: QuestionData[];
  onFinishExam: (result: {
    assessmentId: string;
    scorePercent: number;
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    masteryStatus: any;
    xpAwarded: number;
    isCourseCompleted: boolean;
  }) => void;
  onExit: () => void;
}

export const FinalExamPlayerPage: React.FC<FinalExamPlayerPageProps> = ({
  assessment,
  questions,
  onFinishExam,
  onExit,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const activeQuestions = questions.filter((q) => assessment.questionIds.includes(q.id));
  const currentQuestion = activeQuestions[currentIndex] || activeQuestions[0];
  const totalQuestions = activeQuestions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const canSubmit = currentAnswer !== undefined && currentAnswer !== '' && !isSubmitting;

  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== '').length;

  const handleAnswerChange = (val: any) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }));
  };

  const handleNextOrFinish = () => {
    if (isLastQuestion) {
      setShowSubmitModal(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleFinalSubmit = () => {
    setIsSubmitting(true);
    setShowSubmitModal(false);

    setTimeout(() => {
      setIsSubmitting(false);

      // Evaluate complete exam paper
      let earned = 0;
      let possible = 0;
      let corrects = 0;
      let incorrects = 0;

      for (const q of activeQuestions) {
        const resp = answers[q.id];
        const res = evaluateQuestionAnswer(q, resp);
        earned += res.score;
        possible += res.maxScore;
        if (res.isCorrect) corrects += 1;
        else incorrects += 1;
      }

      const scorePercent = possible > 0 ? Math.round((earned / possible) * 100) : 0;
      const passingScore = assessment.passingScorePercent || 70;
      const isPassed = scorePercent >= passingScore;
      const masteryStatus = determineMasteryStatus(scorePercent);

      onFinishExam({
        assessmentId: assessment.id,
        scorePercent,
        totalQuestions,
        correctCount: corrects,
        incorrectCount: incorrects,
        masteryStatus,
        xpAwarded: isPassed ? 250 : 100,
        isCourseCompleted: isPassed,
      });
    }, 500);
  };

  if (!currentQuestion) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-gray-500">Exam questions could not be loaded.</p>
        <button type="button" onClick={onExit} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs">
          Return to Course
        </button>
      </div>
    );
  }

  return (
    <>
      <AssessmentPlayerShell
        title={assessment.title}
        type="final"
        currentQuestionIndex={currentIndex}
        totalQuestions={totalQuestions}
        timeLimitMinutes={assessment.timeLimitMinutes || 45}
        onTimerExpire={handleFinalSubmit}
        onExit={onExit}
        onSubmitAnswer={handleNextOrFinish}
        isSubmitting={isSubmitting}
        canSubmit={canSubmit}
        isLastQuestion={isLastQuestion}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pb-2 border-b border-gray-100 dark:border-gray-800">
            <span>
              Examination Paper: <strong>Official Summative Evaluation</strong>
            </span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {answeredCount} of {totalQuestions} Answered
            </span>
          </div>

          <QuestionRenderer
            question={currentQuestion}
            answer={currentAnswer}
            onChangeAnswer={handleAnswerChange}
            disabled={isSubmitting}
          />
        </div>
      </AssessmentPlayerShell>

      {/* Final Submission Confirmation Dialog */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Ready to submit your examination?
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              You have answered <strong>{answeredCount} of {totalQuestions}</strong> questions.
              Once submitted, your final evaluation will be recorded and course completion calculated.
            </p>

            {answeredCount < totalQuestions && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs mb-5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>You have unanswered questions. Unanswered items receive 0 points.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
