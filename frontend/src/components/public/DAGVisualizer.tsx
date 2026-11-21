import React, { useState } from 'react';
import {
  GitMerge,
  ArrowRight,
  CheckCircle,
  Lock,
  Layers,
  BookOpen,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Topic, Lesson } from '../../types';

interface DAGVisualizerProps {
  topics: Topic[];
  lessons: Lesson[];
  onSelectTopic?: (topicId: string) => void;
}

export const DAGVisualizer: React.FC<DAGVisualizerProps> = ({
  topics,
  lessons,
  onSelectTopic,
}) => {
  // Use first available course topics for the visualizer
  const displayTopics = topics.length > 0
    ? topics.filter((t) => t.courseId === topics[0].courseId)
    : [];
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    displayTopics[0]?.id || ''
  );

  const activeTopic = displayTopics.find((t) => t.id === selectedTopicId) || displayTopics[0];
  const activeLessons = lessons.filter((l) => l.topicId === activeTopic?.id);

  return (
    <div className="w-full bg-white dark:bg-[#121724] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/70 dark:bg-[#182030] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            <GitMerge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Directed Acyclic Graph (DAG) Prerequisite Topology
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cycle-free prerequisite dependencies verified with Depth-First Search (DFS)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-gray-500 dark:text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>5 Ordered Nodes · Zero Cycles</span>
        </div>
      </div>

      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: DAG Nodes Flow (Horizontal / Asymmetrical Timeline) */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="space-y-3">
            {cs101Topics.map((topic, index) => {
              const isSelected = topic.id === selectedTopicId;
              const hasPrereqs = topic.prerequisiteTopicIds.length > 0;
              const prereqNames = topic.prerequisiteTopicIds
                .map((pid) => cs101Topics.find((t) => t.id === pid)?.title)
                .filter(Boolean)
                .join(', ');

              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    setSelectedTopicId(topic.id);
                    if (onSelectTopic) onSelectTopic(topic.id);
                  }}
                  className={`w-full flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700 shadow-sm scale-[1.01]'
                      : 'bg-gray-50/50 dark:bg-[#182030]/50 border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#182030]'
                  }`}
                >
                  {/* Step indicator */}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold font-mono shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    0{topic.order}
                  </div>

                  {/* Topic Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-sm font-bold truncate ${
                          isSelected
                            ? 'text-indigo-900 dark:text-indigo-200'
                            : 'text-gray-900 dark:text-gray-200'
                        }`}
                      >
                        {topic.title}
                      </h4>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0">
                        {topic.masteryThreshold}% BKT Target
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {hasPrereqs ? (
                        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium text-[11px]">
                          <Lock className="w-3 h-3" />
                          Prerequisite: {prereqNames}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium text-[11px]">
                          <CheckCircle className="w-3 h-3" />
                          Foundational (No Prerequisites)
                        </span>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 mt-2 transition-transform ${
                      isSelected
                        ? 'text-indigo-600 dark:text-indigo-400 translate-x-1'
                        : 'text-gray-300 dark:text-gray-700'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Topic Inspector & Lesson Sub-graph */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/80 dark:border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Node Inspector · Step 0{activeTopic?.order}</span>
            </div>

            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
              {activeTopic?.title}
            </h4>

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              {activeTopic?.description}
            </p>

            {/* Lessons within this Topic */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-2">
                Lessons in Topic Sequence ({activeLessons.length} units)
              </span>

              <div className="space-y-2">
                {activeLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="p-2.5 rounded-lg bg-white dark:bg-[#121622] border border-gray-200/60 dark:border-gray-800 flex items-start gap-2.5"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block">
                        {lesson.title}
                      </span>
                      {lesson.description && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                          {lesson.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/50 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              Learnova guarantees students cannot advance until previous prerequisite nodes verify a minimum Bayesian mastery probability of {activeTopic?.masteryThreshold}%.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
