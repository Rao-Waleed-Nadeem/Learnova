import React, { useState, useEffect } from 'react';
import { AssessmentType } from '../../types';
import { Timer, ArrowLeft, AlertTriangle } from 'lucide-react';

interface AssessmentPlayerShellProps {
  title: string;
  type: AssessmentType;
  currentQuestionIndex: number;
  totalQuestions?: number;
  timeLimitMinutes?: number;
  remainingSeconds?: number;
  onTimerExpire?: () => void;
  onExit: () => void;
  onSubmitAnswer: () => void;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  isLastQuestion?: boolean;
  children: React.ReactNode;
}

export const AssessmentPlayerShell: React.FC<AssessmentPlayerShellProps> = ({
  title,
  type,
  currentQuestionIndex,
  totalQuestions,
  timeLimitMinutes,
  remainingSeconds: initialRemainingSeconds,
  onTimerExpire,
  onExit,
  onSubmitAnswer,
  isSubmitting = false,
  canSubmit = true,
  isLastQuestion = false,
  children,
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (initialRemainingSeconds !== undefined) return initialRemainingSeconds;
    if (timeLimitMinutes) return timeLimitMinutes * 60;
    return 0;
  });

  const isTimed = Boolean(timeLimitMinutes && timeLimitMinutes > 0);

  useEffect(() => {
    if (!isTimed || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimerExpire) onTimerExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimed, secondsLeft, onTimerExpire]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = isTimed && secondsLeft < 300; // < 5 mins
  const progressPercent = totalQuestions && totalQuestions > 0
    ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F1218] text-[#1F2937] dark:text-[#F3F4F6] flex flex-col">
      {/* Distraction-minimized Assessment Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#181C24] border-b border-[#D9DEE7] dark:border-[#2D3545] shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Exit action */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Exit assessment"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit</span>
            </button>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {type === 'diagnostic' ? 'Diagnostic' : type === 'adaptive' ? 'Adaptive Practice' : 'Final Exam'}
                </span>
                <span className="text-sm font-semibold truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {title}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Progress & Timer */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Question Counter */}
            <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
              {totalQuestions ? (
                <>
                  Question <span className="text-gray-900 dark:text-white font-bold">{currentQuestionIndex + 1}</span> of {totalQuestions}
                </>
              ) : (
                <>
                  Item <span className="text-gray-900 dark:text-white font-bold">{currentQuestionIndex + 1}</span> (Adaptive)
                </>
              )}
            </div>

            {/* Authoritative Timer if timed */}
            {isTimed && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs sm:text-sm font-bold border transition-colors ${
                  isLowTime
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-700 dark:text-rose-300 animate-pulse'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                title="Time remaining"
              >
                <Timer className="w-4 h-4" />
                <span>{formatTime(secondsLeft)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Thin progress bar if total is known */}
        {totalQuestions && (
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-1">
            <div
              className="bg-indigo-600 h-1 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}
      </header>

      {/* Main Question Surface */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-between">
        <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 sm:p-8 shadow-xs">
          {children}
        </div>

        {/* Bottom Actions Row */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-6">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="text-xs sm:text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Need to take a break? Exit attempt
          </button>

          <button
            type="button"
            onClick={onSubmitAnswer}
            disabled={!canSubmit || isSubmitting}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
              canSubmit && !isSubmitting
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Submitting response...</span>
              </>
            ) : isLastQuestion ? (
              <span>Submit & Finish Assessment</span>
            ) : (
              <span>Next Question →</span>
            )}
          </button>
        </div>
      </main>

      {/* Leave Assessment Guard Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Leave this assessment?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Your answered questions will be saved. {type === 'final' ? 'Because this is a timed examination, the timer will continue running.' : 'You can return to complete this session anytime.'}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Keep Testing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  onExit();
                }}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                Yes, Exit Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
