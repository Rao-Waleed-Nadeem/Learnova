import React from 'react';
import { Assessment, Course, Topic } from '../../types';
import { ArrowLeft, Clock, HelpCircle, CheckCircle, Play, ShieldAlert } from 'lucide-react';
import { StudentNavigationPage } from '../../components/student/StudentLayout';

interface DiagnosticIntroPageProps {
  assessmentId: string;
  assessments: Assessment[];
  courses: Course[];
  topics: Topic[];
  onStartDiagnostic: (assessmentId: string) => void;
  onNavigate: (page: StudentNavigationPage, params?: Record<string, string>) => void;
}

export const DiagnosticIntroPage: React.FC<DiagnosticIntroPageProps> = ({
  assessmentId,
  assessments,
  courses,
  topics,
  onStartDiagnostic,
  onNavigate,
}) => {
  const assessment = assessments.find((a) => a.id === assessmentId) || assessments.find((a) => a.type === 'diagnostic') || assessments[0];
  const course = courses.find((c) => c.id === assessment?.courseId);
  const topic = topics.find((t) => t.id === assessment?.topicId);

  if (!assessment) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#181C24] rounded-2xl border border-gray-200 dark:border-gray-800">
        <p className="text-sm text-gray-500">Diagnostic assessment not found.</p>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Back button */}
      <button
        type="button"
        onClick={() => onNavigate('course_map', { courseId: course?.id || '' })}
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Course Learning Map</span>
      </button>

      {/* Main Intro Card */}
      <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 inline-block mb-3">
            Diagnostic Baseline Assessment
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            {assessment.title}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Course: <strong>{course?.title}</strong> • Target Unit: <strong>{topic?.title}</strong>
          </p>
        </div>

        {/* Instructions */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 space-y-3">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>Purpose of this Assessment</span>
          </h3>
          <p className="text-xs leading-relaxed">
            This diagnostic establishes your baseline competency in prerequisite concepts. It does not negatively penalize your academic standing; rather, it allows Learnova's adaptive engine to tailor your upcoming learning path and suggest targeted practice where needed.
          </p>
        </div>

        {/* Assessment Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C24]">
            <span className="text-gray-500 dark:text-gray-400 block mb-1">Time Limit</span>
            <div className="flex items-center gap-1 font-bold text-gray-900 dark:text-white">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>{assessment.timeLimitMinutes || 20} Minutes</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C24]">
            <span className="text-gray-500 dark:text-gray-400 block mb-1">Question Count</span>
            <div className="font-bold text-gray-900 dark:text-white">
              {assessment.questionIds.length || 3} Questions
            </div>
          </div>

          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C24] col-span-2 sm:col-span-1">
            <span className="text-gray-500 dark:text-gray-400 block mb-1">XP Reward</span>
            <div className="font-bold text-amber-600 dark:text-amber-400">
              +150 XP on completion
            </div>
          </div>
        </div>

        {/* Start CTA */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigate('course_map', { courseId: course?.id || '' })}
            className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white order-2 sm:order-1"
          >
            Review Syllabus First
          </button>

          <button
            type="button"
            onClick={() => onStartDiagnostic(assessment.id)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Begin Diagnostic Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
