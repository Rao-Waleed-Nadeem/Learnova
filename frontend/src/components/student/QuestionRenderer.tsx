import React from 'react';
import { QuestionData } from '../../types';
import { Check, CheckCircle2, AlertCircle } from 'lucide-react';

interface QuestionRendererProps {
  question: QuestionData;
  answer: any;
  onChangeAnswer: (answer: any) => void;
  disabled?: boolean;
  showFeedback?: boolean;
  isCorrect?: boolean;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  answer,
  onChangeAnswer,
  disabled = false,
  showFeedback = false,
  isCorrect,
}) => {
  return (
    <div className="space-y-6">
      {/* Question Prompt */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {question.type.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {question.points} {question.points === 1 ? 'point' : 'points'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800">
            Difficulty: {question.difficulty}
          </span>
        </div>
        <h3 className="text-lg md:text-xl font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
          {question.prompt}
        </h3>
      </div>

      {/* Answer Controls by QuestionType */}
      {question.type === 'multiple_choice' && (
        <div className="space-y-3" role="radiogroup" aria-label="Multiple choice options">
          {(question.options || []).map((opt, idx) => {
            const isSelected = answer === opt.id;
            const letter = String.fromCharCode(65 + idx);
            return (
              <label
                key={opt.id}
                className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer min-h-[52px] ${
                  disabled ? 'cursor-not-allowed opacity-80' : 'hover:border-indigo-300 dark:hover:border-indigo-600'
                } ${
                  isSelected
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C24]'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={opt.id}
                  checked={isSelected}
                  onChange={() => !disabled && onChangeAnswer(opt.id)}
                  disabled={disabled}
                  className="sr-only"
                />
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : letter}
                </span>
                <span className="text-base text-gray-800 dark:text-gray-200 pt-0.5">
                  {opt.text}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="True or False choices">
          {[
            { label: 'True', val: true },
            { label: 'False', val: false },
          ].map((item) => {
            const isSelected = answer === item.val;
            return (
              <button
                type="button"
                key={item.label}
                disabled={disabled}
                onClick={() => !disabled && onChangeAnswer(item.val)}
                className={`flex items-center justify-center gap-3 p-5 rounded-xl border text-lg font-medium transition-all ${
                  disabled ? 'cursor-not-allowed opacity-80' : 'hover:border-indigo-300'
                } ${
                  isSelected
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C24] text-gray-800 dark:text-gray-200'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSelected ? 'bg-indigo-600 text-white' : 'border border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'fill_blank' && (
        <div className="space-y-3">
          <label htmlFor={`input-${question.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Type your answer below:
          </label>
          <input
            id={`input-${question.id}`}
            type="text"
            value={answer || ''}
            disabled={disabled}
            onChange={(e) => onChangeAnswer(e.target.value)}
            placeholder="Type your exact keyword or expression here..."
            className="w-full px-4 py-3 text-base rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C24] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Check your spelling carefully before submitting.
          </p>
        </div>
      )}

      {question.type === 'matching' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Match each concept on the left with the corresponding definition:
          </p>
          <div className="space-y-3">
            {(question.matchingPairs || []).map((pair) => {
              const currentVal = (answer && answer[pair.id]) || '';
              // Gather available options for the right side
              const options = (question.matchingPairs || []).map((p) => p.right);
              return (
                <div
                  key={pair.id}
                  className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C24] flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="font-semibold text-gray-800 dark:text-gray-200 text-sm md:w-1/3">
                    {pair.left}
                  </div>
                  <div className="md:w-2/3">
                    <select
                      value={currentVal}
                      disabled={disabled}
                      onChange={(e) => {
                        const updated = { ...(answer || {}), [pair.id]: e.target.value };
                        onChangeAnswer(updated);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Select matching definition --</option>
                      {options.map((opt, oIdx) => (
                        <option key={oIdx} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {question.type === 'short_answer' && (
        <div className="space-y-3">
          <label htmlFor={`textarea-${question.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Your written response:
          </label>
          <textarea
            id={`textarea-${question.id}`}
            rows={4}
            value={answer || ''}
            disabled={disabled}
            onChange={(e) => onChangeAnswer(e.target.value)}
            placeholder="Explain your reasoning clearly and cite relevant architectural concepts..."
            className="w-full px-4 py-3 text-base rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C24] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Minimum recommended length: 1-3 sentences.</span>
            <span>{(answer || '').length} characters</span>
          </div>
        </div>
      )}

      {/* Review Feedback if permitted */}
      {showFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            isCorrect
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}
        >
          {isCorrect ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-semibold mb-1">
              {isCorrect ? 'Correct!' : 'Incorrect or Partially Complete'}
            </p>
            {question.explanation && <p className="opacity-90">{question.explanation}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
