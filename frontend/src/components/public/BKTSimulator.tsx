import React, { useState } from 'react';
import {
  Brain,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
} from 'lucide-react';

interface QuestionScenario {
  id: string;
  topicTitle: string;
  prompt: string;
  correctAnswer: boolean;
  explanation: string;
}

const SAMPLE_SCENARIOS: QuestionScenario[] = [
  {
    id: 'bkt-q1',
    topicTitle: 'Syntax & Memory Bindings',
    prompt: 'In Python, strings are immutable objects; any mutation operation allocates a new string in memory.',
    correctAnswer: true,
    explanation: 'Strings in Python cannot be mutated in place. Slicing and concatenating instantiate new string objects.',
  },
  {
    id: 'bkt-q2',
    topicTitle: 'Conditional Control Flow',
    prompt: 'Short-circuit evaluation in "expr1 and expr2" executes expr2 even if expr1 evaluates to False.',
    correctAnswer: false,
    explanation: 'In Python, "and" stops evaluation immediately when the first operand evaluates to False.',
  },
  {
    id: 'bkt-q3',
    topicTitle: 'Scope Resolution & LEGB',
    prompt: 'Variables declared inside a function without the "global" keyword reside exclusively in local namespace.',
    correctAnswer: true,
    explanation: 'Python resolves names using Local, Enclosing, Global, Built-in (LEGB) scoping rules.',
  },
  {
    id: 'bkt-q4',
    topicTitle: 'Associative Hash Maps',
    prompt: 'A Python list can be utilized directly as a dictionary key because lists are indexed sequences.',
    correctAnswer: false,
    explanation: 'Dictionary keys must be hashable and immutable. Lists are mutable and unhashable.',
  },
];

export const BKTSimulator: React.FC = () => {
  // BKT Canonical Parameters (matching backend/app/services/mastery_service.py)
  const P_TRANSIT = 0.15; // Learning transit probability between questions
  const P_SLIP = 0.10;    // Probability of incorrect response despite knowing concept
  const P_GUESS = 0.20;   // Probability of correct response by guessing
  const MASTERY_THRESHOLD = 0.80; // 80% competency threshold

  const [masteryProb, setMasteryProb] = useState<number>(0.20); // P(L_0) prior knowledge
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState<number>(0);
  const [history, setHistory] = useState<{ step: number; isCorrect: boolean; newMastery: number }[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; isCorrect: boolean } | null>(null);

  const currentScenario = SAMPLE_SCENARIOS[currentScenarioIndex % SAMPLE_SCENARIOS.length];
  const isMastered = masteryProb >= MASTERY_THRESHOLD;

  const handleAnswer = (selectedAnswer: boolean) => {
    const isCorrect = selectedAnswer === currentScenario.correctAnswer;
    const prevProb = masteryProb;

    // Bayesian Knowledge Tracing update formula
    let posterior: number;
    if (isCorrect) {
      const numerator = prevProb * (1 - P_SLIP);
      const denominator = numerator + (1 - prevProb) * P_GUESS;
      posterior = denominator > 0 ? numerator / denominator : prevProb;
    } else {
      const numerator = prevProb * P_SLIP;
      const denominator = numerator + (1 - prevProb) * (1 - P_GUESS);
      posterior = denominator > 0 ? numerator / denominator : prevProb;
    }

    // Apply knowledge transit: P(L_n) = posterior + (1 - posterior) * P_TRANSIT
    const updated = Math.min(0.999, Math.max(0.01, posterior + (1 - posterior) * P_TRANSIT));

    setMasteryProb(updated);
    setHistory((prev) => [
      ...prev,
      { step: prev.length + 1, isCorrect, newMastery: updated },
    ]);

    setFeedback({
      isCorrect,
      message: isCorrect
        ? `Correct observation recorded. Bayesian posterior updated to ${(updated * 100).toFixed(1)}%.`
        : `Incorrect response registered (Slip: ${(P_SLIP * 100).toFixed(0)}%). Posterior recalibrated to ${(updated * 100).toFixed(1)}%.`,
    });

    // Advance question index
    setCurrentScenarioIndex((prev) => prev + 1);
  };

  const handleReset = () => {
    setMasteryProb(0.20);
    setCurrentScenarioIndex(0);
    setHistory([]);
    setFeedback(null);
  };

  const masteryPercent = Math.round(masteryProb * 100);

  return (
    <div className="w-full bg-white dark:bg-[#131826] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/70 dark:bg-[#182030] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Interactive Bayesian Knowledge Tracing (BKT) Engine
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Real-time latent cognitive mastery state modeling (P_L0 = 0.20, P_T = 0.15)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isMastered ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 animate-in fade-in">
              <Award className="w-3.5 h-3.5" />
              Mastery Threshold Certified (≥80%)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              <TrendingUp className="w-3.5 h-3.5" />
              Target: 80% for DAG Unlock
            </span>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors"
            title="Reset simulation"
            aria-label="Reset simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Probability Gauge & Parameters */}
        <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/70 dark:border-gray-800">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Latent Mastery Probability P(L_n)
              </span>
              <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {masteryPercent}%
              </span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="relative w-full h-3.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-500 ease-out rounded-full ${
                  isMastered ? 'bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, masteryPercent))}%` }}
              />
              {/* 80% Threshold Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                style={{ left: '80%' }}
                title="80% Mastery Requirement"
              />
            </div>

            {/* BKT Math Formula Breakdown */}
            <div className="p-3 rounded-lg bg-white dark:bg-[#121622] border border-gray-200/60 dark:border-gray-800 text-[11px] font-mono text-gray-600 dark:text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>P(T) Transit Rate:</span>
                <span className="text-gray-900 dark:text-white font-semibold">15% per attempt</span>
              </div>
              <div className="flex justify-between">
                <span>P(S) Slip / P(G) Guess:</span>
                <span className="text-gray-900 dark:text-white font-semibold">10% / 20%</span>
              </div>
              <div className="flex justify-between">
                <span>Observation Sequence:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {history.length > 0 ? history.map((h) => (h.isCorrect ? '✓' : '✗')).join(' ') : 'None yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback note */}
          {feedback && (
            <div
              className={`mt-4 p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${
                feedback.isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
              }`}
            >
              {feedback.isCorrect ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Right Column: Live Interactive Question Scenario */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Topic: {currentScenario.topicTitle}
              </span>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Evaluation Step #{history.length + 1}
              </span>
            </div>

            <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed mb-4">
              &ldquo;{currentScenario.prompt}&rdquo;
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              Click an answer below to trigger server-authoritative Bayesian mastery recalculation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={() => handleAnswer(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-400 dark:hover:border-emerald-700 text-gray-900 dark:text-white font-semibold text-xs transition-all cursor-pointer shadow-2xs hover:shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Evaluate as TRUE</span>
            </button>

            <button
              type="button"
              onClick={() => handleAnswer(false)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-400 dark:hover:border-amber-700 text-gray-900 dark:text-white font-semibold text-xs transition-all cursor-pointer shadow-2xs hover:shadow-sm"
            >
              <XCircle className="w-4 h-4 text-amber-500" />
              <span>Evaluate as FALSE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
