import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, Layers, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { Course, Topic } from '../../types';

export interface SearchResultItem {
  id: string;
  type: 'course' | 'topic' | 'concept';
  title: string;
  subtitle: string;
  category: string;
  courseId?: string;
  targetPage?: 'courses' | 'course_details' | 'about';
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  topics: Topic[];
  onSelectResult: (item: SearchResultItem) => void;
}

const ARCHITECTURE_CONCEPTS: SearchResultItem[] = [
  {
    id: 'concept-bkt',
    type: 'concept',
    title: 'Bayesian Knowledge Tracing (BKT)',
    subtitle: 'Probabilistic modeling of latent student mastery states with slip and guess parameters',
    category: 'Cognitive Science',
    targetPage: 'about',
  },
  {
    id: 'concept-dag',
    type: 'concept',
    title: 'Directed Acyclic Graph (DAG) Prerequisites',
    subtitle: 'Cycle-free topological prerequisite tree ensuring strictly ordered cognitive progression',
    category: 'Curriculum Topology',
    targetPage: 'about',
  },
  {
    id: 'concept-ssd08',
    type: 'concept',
    title: 'Teacher-Governed AI Quarantine (SSD-08)',
    subtitle: 'Quarantined AI question candidates requiring faculty inspection and atomic row-locked promotion',
    category: 'Faculty Governance',
    targetPage: 'about',
  },
  {
    id: 'concept-outbox',
    type: 'concept',
    title: 'Durable Transactional Outbox Processor',
    subtitle: 'PostgreSQL advisory-locked outbox queue consuming mastery recalculations and XP events',
    category: 'System Reliability',
    targetPage: 'about',
  },
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  courses,
  topics,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Build searchable index from real courses, topics, and architecture concepts
  const results: SearchResultItem[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default to prominent courses & concepts
      return [
        ...courses.slice(0, 3).map((c) => ({
          id: c.id,
          type: 'course' as const,
          title: c.title,
          subtitle: `${c.creatorDepartment || 'Faculty of Computer Science'} · ${c.creatorName}`,
          category: 'Course',
          courseId: c.id,
          targetPage: 'course_details' as const,
        })),
        ...ARCHITECTURE_CONCEPTS.slice(0, 2),
      ];
    }

    const matches: SearchResultItem[] = [];

    // Search courses
    courses.forEach((c) => {
      if (
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.creatorName?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: c.id,
          type: 'course',
          title: c.title,
          subtitle: `${c.creatorDepartment || 'Faculty'} · ${c.creatorName}`,
          category: 'Course',
          courseId: c.id,
          targetPage: 'course_details',
        });
      }
    });

    // Search topics
    topics.forEach((t) => {
      if (t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) {
        const parentCourse = courses.find((c) => c.id === t.courseId);
        matches.push({
          id: t.id,
          type: 'topic',
          title: t.title,
          subtitle: parentCourse ? `Within: ${parentCourse.title}` : 'Curriculum Topic',
          category: 'Topic',
          courseId: t.courseId,
          targetPage: 'course_details',
        });
      }
    });

    // Search concepts
    ARCHITECTURE_CONCEPTS.forEach((concept) => {
      if (
        concept.title.toLowerCase().includes(q) ||
        concept.subtitle.toLowerCase().includes(q) ||
        concept.category.toLowerCase().includes(q)
      ) {
        matches.push(concept);
      }
    });

    return matches.slice(0, 8);
  }, [query, courses, topics]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        onSelectResult(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelectResult]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search Learnova Curriculum & Architecture"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#121722] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transform transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-gray-200 dark:border-gray-800">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, curriculum topics, BKT engine..."
            className="w-full bg-transparent text-sm md:text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block ml-3 px-2 py-0.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-gray-100 dark:divide-gray-800/50">
          {results.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
              <p className="font-medium text-gray-700 dark:text-gray-300">No results found for &ldquo;{query}&rdquo;</p>
              <p className="mt-1 text-xs">Try searching for &ldquo;Python&rdquo;, &ldquo;Algorithms&rdquo;, &ldquo;BKT&rdquo;, or &ldquo;DAG&rdquo;.</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => onSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-gray-900 dark:text-white'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        item.type === 'course'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          : item.type === 'topic'
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                      }`}
                    >
                      {item.type === 'course' && <BookOpen className="w-4 h-4" />}
                      {item.type === 'topic' && <Layers className="w-4 h-4" />}
                      {item.type === 'concept' && <ShieldCheck className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{item.title}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected
                        ? 'text-indigo-600 dark:text-indigo-400 translate-x-1'
                        : 'text-gray-400 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-[#0E131F] border-t border-gray-200 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-2xs font-mono mr-1">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-2xs font-mono mr-1">
                ↓
              </kbd>
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-2xs font-mono mr-1">
                ↵
              </kbd>
              Select
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Learnova Knowledge Index</span>
          </div>
        </div>
      </div>
    </div>
  );
};
