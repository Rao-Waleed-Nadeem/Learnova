import React, { useState } from 'react';
import {
  Course,
  Topic,
  Lesson,
  MasteryState,
  AssessmentAttempt,
  LessonCompletion,
} from '../../types';
import {
  BarChart2,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { StudentNavigationPage } from '../../components/student/StudentLayout';

interface ProgressAnalyticsPageProps {
  courses: Course[];
  topics: Topic[];
  lessons: Lesson[];
  masteryStates: MasteryState[];
  attempts: AssessmentAttempt[];
  completions: LessonCompletion[];
  onNavigate: (page: StudentNavigationPage, params?: Record<string, string>) => void;
}

export const ProgressAnalyticsPage: React.FC<ProgressAnalyticsPageProps> = ({
  courses,
  topics,
  lessons,
  masteryStates,
  attempts,
  completions,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'mastery' | 'attempts' | 'lessons'>('mastery');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');

  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const courseTopics = activeCourse ? topics.filter((t) => t.courseId === activeCourse.id) : [];
  const courseMasteryStates = activeCourse ? masteryStates.filter((m) => m.courseId === activeCourse.id) : [];
  const courseAttempts = activeCourse ? attempts.filter((a) => a.courseId === activeCourse.id) : attempts;
  const courseCompletions = activeCourse ? completions.filter((c) => c.courseId === activeCourse.id) : completions;

  // Counts
  const assessedCount = courseMasteryStates.filter((m) => m.status !== 'not_assessed').length;
  const masteredCount = courseMasteryStates.filter((m) => m.status === 'mastered').length;

  return (
    <div className="space-y-6">
      {/* Header and Course Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Progress & Mastery Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Empirical evidence of your cognitive mastery, sequential attempt history, and syllabus completion.
          </p>
        </div>

        {/* Course Filter Dropdown */}
        {courses.length > 1 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label htmlFor="course-select" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Course:
            </label>
            <select
              id="course-select"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C24] text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1">
            Assessed Topics
          </span>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {assessedCount} <span className="text-sm font-normal text-gray-500">of {courseTopics.length} Units</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
            Mastered Units (85%+)
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {masteredCount} Topics
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
            Completed Lessons
          </span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {courseCompletions.length} Lessons
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-800 flex items-center gap-6 text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('mastery')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'mastery'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          Topic Mastery Matrix
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attempts')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'attempts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          Assessment History ({courseAttempts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'lessons'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          Completed Lessons ({courseCompletions.length})
        </button>
      </div>

      {/* TAB 1: TOPIC MASTERY MATRIX */}
      {activeTab === 'mastery' && (
        <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Syllabus Units & Cognitive Mastery Status
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Threshold: Competent ≥ 70%, Mastered ≥ 85%
            </span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {courseTopics.map((topic, idx) => {
              const state = courseMasteryStates.find((m) => m.topicId === topic.id);
              const score = state?.scorePercent;
              const isAssessed = state && state.status !== 'not_assessed' && score !== undefined && score >= 0;

              return (
                <div
                  key={topic.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-[#1C212B] transition"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {topic.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {topic.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:shrink-0 self-end sm:self-auto">
                    {isAssessed ? (
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden hidden sm:block">
                            <div
                              className={`h-2 rounded-full ${
                                score >= 85 ? 'bg-emerald-500' : score >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                              state.status === 'mastered'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : state.status === 'competent'
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {state.status.toUpperCase()} ({score}%)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 italic px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                        Not assessed yet
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onNavigate('course_map', { courseId: activeCourse.id })}
                      className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      title="View on Map"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ASSESSMENT HISTORY */}
      {activeTab === 'attempts' && (
        <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Assessment Attempt Records
            </h3>
          </div>

          {courseAttempts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-800 text-gray-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Assessment Title</th>
                    <th className="px-5 py-3.5">Score</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Date Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {courseAttempts.map((att) => (
                    <tr key={att.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1C212B]">
                      <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                        {att.assessmentTitle}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`font-black text-sm ${
                            att.scorePercent >= 70 ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {att.scorePercent}%
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {att.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                        {new Date(att.completedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-gray-500">
              No assessment attempts recorded for this course yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMPLETED LESSONS */}
      {activeTab === 'lessons' && (
        <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Verified Completed Lessons
            </h3>
          </div>

          {courseCompletions.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {courseCompletions.map((comp) => {
                const lesson = lessons.find((l) => l.id === comp.lessonId);
                const topic = topics.find((t) => t.id === comp.topicId);

                return (
                  <div key={comp.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                          {lesson?.title || comp.lessonId}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Topic: {topic?.title || 'Curriculum unit'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      Completed {new Date(comp.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-gray-500">
              No completed lessons recorded yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
