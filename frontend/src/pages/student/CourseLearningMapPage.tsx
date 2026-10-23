import React, { useState } from 'react';
import {
  Course,
  Topic,
  Lesson,
  LearningResource,
  Enrollment,
  MasteryState,
  Assessment,
} from '../../types';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Lock,
  Play,
  Sparkles,
  BookOpen,
  FileText,
  AlertCircle,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { StudentNavigationPage } from '../../components/student/StudentLayout';
import { determineTopicReadiness } from '../../utils/studentLogic';

interface CourseLearningMapPageProps {
  courseId: string;
  courses: Course[];
  topics: Topic[];
  lessons: Lesson[];
  resources: LearningResource[];
  enrollments: Enrollment[];
  masteryStates: MasteryState[];
  assessments: Assessment[];
  completedLessonIds: Set<string>;
  onNavigate: (page: StudentNavigationPage, params?: Record<string, string>) => void;
}

export const CourseLearningMapPage: React.FC<CourseLearningMapPageProps> = ({
  courseId,
  courses,
  topics,
  lessons,
  resources,
  enrollments,
  masteryStates,
  assessments,
  completedLessonIds,
  onNavigate,
}) => {
  const course = courses.find((c) => c.id === courseId) || courses[0];
  const courseTopics = course ? topics.filter((t) => t.courseId === course.id).sort((a, b) => a.order - b.order) : [];
  const enr = enrollments.find((e) => e.courseId === course?.id);

  // Expanded topics state: default first topic expanded
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (courseTopics[0]) init[courseTopics[0].id] = true;
    if (courseTopics[1]) init[courseTopics[1].id] = true;
    return init;
  });

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Build topic mastery lookup map
  const masteryMap: Record<string, { status: any; scorePercent: number }> = {};
  for (const m of masteryStates) {
    masteryMap[m.topicId] = { status: m.status, scorePercent: m.scorePercent };
  }

  // Find assessments for this course
  const courseAssessments = assessments.filter((a) => a.courseId === course?.id && a.status === 'published');
  const diagnostic = courseAssessments.find((a) => a.type === 'diagnostic');
  const adaptive = courseAssessments.find((a) => a.type === 'adaptive');
  const finalExam = courseAssessments.find((a) => a.type === 'final');

  // Check if student meets prerequisites for final exam
  const allTopicsMastered = courseTopics.every((t) => {
    const m = masteryMap[t.id];
    return m && (m.status === 'competent' || m.status === 'mastered');
  });

  return (
    <div className="space-y-6">
      {/* Course Overview Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Course Learning Map
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {courseTopics.length} Topics
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {course?.title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
              {course?.description}
            </p>
          </div>

          <div className="md:w-60 shrink-0 bg-gray-50 dark:bg-[#1C212B] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-gray-600 dark:text-gray-400">Course Progress</span>
              <span className="text-indigo-600 dark:text-indigo-400">{enr?.progressPercent || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${enr?.progressPercent || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Curriculum Tree (8 cols) & Right Assessment Status (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Curriculum Topic Tree (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Curriculum Structure & Lesson Sequence
          </h2>

          <div className="space-y-4">
            {courseTopics.map((topic, index) => {
              const isExpanded = Boolean(expandedTopics[topic.id]);
              const topicLessons = lessons.filter((l) => l.topicId === topic.id).sort((a, b) => a.order - b.order);
              const readiness = determineTopicReadiness(topic.prerequisiteTopicIds, masteryMap);
              const mastery = masteryMap[topic.id];

              // Prerequisite titles
              const prereqTopics = courseTopics.filter((t) => topic.prerequisiteTopicIds.includes(t.id));

              return (
                <div
                  key={topic.id}
                  className={`rounded-2xl border transition-all ${
                    readiness.isReady
                      ? 'bg-white dark:bg-[#181C24] border-[#D9DEE7] dark:border-[#2D3545] shadow-xs'
                      : 'bg-gray-50/70 dark:bg-[#14171E] border-gray-200 dark:border-gray-800 opacity-90'
                  }`}
                >
                  {/* Topic Header Accordion Button */}
                  <button
                    type="button"
                    onClick={() => toggleTopic(topic.id)}
                    className="w-full p-4 sm:p-5 flex items-start justify-between gap-4 text-left cursor-pointer"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                          readiness.isReady
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                        }`}
                      >
                        {readiness.isReady ? index + 1 : <Lock className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">
                            {topic.title}
                          </h3>

                          {/* Mastery Status Pill */}
                          {mastery ? (
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                mastery.status === 'mastered'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : mastery.status === 'competent'
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                  : mastery.status === 'developing'
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              {mastery.status === 'not_assessed'
                                ? 'Not assessed yet'
                                : `${mastery.status.toUpperCase()} (${mastery.scorePercent}%)`}
                            </span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700">
                              Not assessed yet
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                          {topic.description}
                        </p>

                        {/* Blocked Prerequisite Warning */}
                        {!readiness.isReady && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>
                              Requires foundational completion in:{' '}
                              <strong>{prereqTopics.map((p) => p.title).join(', ')}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-gray-400">
                      <span className="text-xs hidden sm:inline">
                        {topicLessons.length} {topicLessons.length === 1 ? 'lesson' : 'lessons'}
                      </span>
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                  </button>

                  {/* Expanded Lessons List */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800/80 px-4 sm:px-5 py-3 space-y-2 bg-gray-50/40 dark:bg-[#161A22] rounded-b-2xl">
                      {topicLessons.map((lesson) => {
                        const isDone = completedLessonIds.has(lesson.id);
                        const lessonResources = resources.filter((r) => r.lessonId === lesson.id);

                        return (
                          <div
                            key={lesson.id}
                            className="p-3 rounded-xl bg-white dark:bg-[#181C24] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-600 text-white'
                                    : 'border border-gray-300 dark:border-gray-700 text-gray-400'
                                }`}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                                ) : (
                                  <span className="text-[10px] font-bold">{lesson.order}</span>
                                )}
                              </span>

                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {lesson.title}
                                </h4>
                                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                  <span>{lessonResources.length} learning resources</span>
                                  {isDone && <span className="text-emerald-600 font-medium">• Completed</span>}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                onNavigate('lesson', {
                                  courseId: course.id,
                                  topicId: topic.id,
                                  lessonId: lesson.id,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1 shrink-0 transition"
                            >
                              <span>{isDone ? 'Review' : 'Open'}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Assessment Availability & Next Action (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Diagnostic Baseline Card */}
          {diagnostic && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Diagnostic Baseline
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {diagnostic.timeLimitMinutes} min
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {diagnostic.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Calibrates your baseline topic mastery and generates your initial recommended learning sequence.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('diagnostic_intro', { assessmentId: diagnostic.id })}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>Take Diagnostic Assessment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Adaptive Practice Card */}
          {adaptive && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Adaptive Practice
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Interactive
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {adaptive.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Item difficulty adjusts after each answer. Your responses recalibrate topic mastery after completion.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('practice_player', { assessmentId: adaptive.id })}
                className="w-full py-2.5 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Adaptive Practice</span>
              </button>
            </div>
          )}

          {/* Final Examination Card */}
          {finalExam && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Summative Exam
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {finalExam.timeLimitMinutes} min
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {finalExam.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Formal summative exam covering all topics in {course?.title}. Auto-submitted upon expiration.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('exam_player', { assessmentId: finalExam.id })}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Start Final Examination</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
