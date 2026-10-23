import React, { useState } from 'react';
import { Sparkles, X, Send, BookOpen, Lightbulb, Code2, HelpCircle, RefreshCw, Layers } from 'lucide-react';

interface AIHelperPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle: string;
  topicTitle: string;
  courseTitle: string;
  lessonContent: string;
}

export const AIHelperPanel: React.FC<AIHelperPanelProps> = ({
  isOpen,
  onClose,
  lessonTitle,
  topicTitle,
  courseTitle,
  lessonContent,
}) => {
  const [mode, setMode] = useState<'simplify' | 'analogy' | 'example' | 'custom'>('simplify');
  const [customPrompt, setCustomPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [source, setSource] = useState<'gemini' | 'gemini_cache' | 'academic_cache' | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchExplanation = async (selectedMode: 'simplify' | 'analogy' | 'example' | 'custom', promptOverride?: string) => {
    setIsLoading(true);
    setError(null);
    setMode(selectedMode);

    try {
      const res = await fetch('/api/ai/simplify-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle,
          topicTitle,
          courseTitle,
          lessonContent,
          mode: selectedMode,
          customPrompt: promptOverride !== undefined ? promptOverride : customPrompt,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate response. Please try again.');
      }

      const data = await res.json();
      if (data.success) {
        setResponse(data.explanation);
        setSource(data.source);
        setIsCached(Boolean(data.isCached));
      } else {
        throw new Error(data.message || 'Error occurred while contacting academic tutor.');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not connect to AI service. Using cached concepts.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || isLoading) return;
    handleFetchExplanation('custom', customPrompt.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="AI Lesson Helper"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#181C24] h-full shadow-2xl flex flex-col border-l border-[#D9DEE7] dark:border-[#2D3545] animate-in slide-in-from-right duration-200">
        {/* Panel Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-[#1C212B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                AI Lesson Assistant
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[260px]">
                Context: {lessonTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close AI helper"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Preset Chips */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Instant Explanations:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFetchExplanation('simplify')}
                disabled={isLoading}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition text-center ${
                  mode === 'simplify' && response
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Simplify</span>
              </button>

              <button
                type="button"
                onClick={() => handleFetchExplanation('analogy')}
                disabled={isLoading}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition text-center ${
                  mode === 'analogy' && response
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Analogy</span>
              </button>

              <button
                type="button"
                onClick={() => handleFetchExplanation('example')}
                disabled={isLoading}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition text-center ${
                  mode === 'example' && response
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Code2 className="w-4 h-4 text-emerald-600" />
                <span>Example</span>
              </button>
            </div>
          </div>

          {/* AI Response Display */}
          {isLoading && (
            <div className="p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 text-center space-y-3">
              <div className="w-8 h-8 mx-auto border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                Generating educational clarification...
              </p>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                Analyzing lesson syllabus: "{lessonTitle}"
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={() => handleFetchExplanation(mode)}
                  className="mt-2 text-xs font-semibold underline hover:no-underline text-rose-700 dark:text-rose-300"
                >
                  Retry request
                </button>
              </div>
            </div>
          )}

          {response && !isLoading && (
            <div className="space-y-3">
              {/* Context & Source badge */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    Source:{' '}
                    <strong className="text-gray-700 dark:text-gray-300">
                      {source === 'gemini' ? 'Gemini 2.5 Flash' : source === 'gemini_cache' ? 'Verified Cached Response' : 'Academic Syllabus Cache'}
                    </strong>
                  </span>
                </div>
                {isCached && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium border border-emerald-200 dark:border-emerald-800">
                    Cached
                  </span>
                )}
              </div>

              {/* Rendered content */}
              <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-[#181C24] text-sm text-gray-800 dark:text-gray-200 leading-relaxed space-y-3 whitespace-pre-wrap font-sans">
                {response}
              </div>
            </div>
          )}

          {!response && !isLoading && !error && (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-500 dark:text-gray-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-indigo-400 opacity-60" />
              <p className="text-sm font-medium">Have questions about this lesson?</p>
              <p className="text-xs">
                Click one of the instant chips above or ask a specific question below. The official lesson notes will stay safe and accessible at all times.
              </p>
            </div>
          )}
        </div>

        {/* Custom Question Footer Form */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C24] shrink-0">
          <form onSubmit={handleCustomSubmit} className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ask about this lesson (e.g. 'Why use a tuple?')..."
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!customPrompt.trim() || isLoading}
                className={`absolute right-1.5 top-1.5 p-1.5 rounded-lg transition ${
                  customPrompt.trim() && !isLoading
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }`}
                aria-label="Send custom question"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
              AI responses are supplemental aids grounded in the official syllabus.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
