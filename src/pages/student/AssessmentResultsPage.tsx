import React from 'react';
import { StudentAssessmentResult, Course, Topic } from '../../types';
import {
  CheckCircle2,
  AlertCircle,
  Award,
  Zap,
  ArrowRight,
  Map,
  BookOpen,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { StudentNavigationPage } from '../../components/student/StudentLayout';

interface AssessmentResultsPageProps {
  result: StudentAssessmentResult;
  course?: Course;
  topic?: Topic;
  onNavigate: (page: StudentNavigationPage, params?: Record<string, string>) => void;
}

export const AssessmentResultsPage: React.FC<AssessmentResultsPageProps> = ({
  result,
  course,
  topic,
  onNavigate,
}) => {
  const isPassed = result.scorePercent >= 70;

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* 1. OUTCOME HEADER CARD */}
      <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-5">
        <div
          className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
            isPassed
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
          }`}
        >
          {isPassed ? <CheckCircle2 className="w-8 h-8 stroke-[2.5]" /> : <AlertCircle className="w-8 h-8 stroke-[2.5]" />}
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 inline-block mb-2">
            {result.type === 'diagnostic' ? 'Diagnostic Baseline Calibrated' : result.type === 'adaptive' ? 'Adaptive Practice Completed' : 'Summative Examination Recorded'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            {result.assessmentTitle}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Course: <strong>{course?.title || 'Computer Science'}</strong> {topic ? `• Unit: ${topic.title}` : ''}
          </p>
        </div>

        {/* Score & Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Final Score</span>
            <span className={`text-2xl font-black ${isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {result.scorePercent}%
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Correct Items</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {result.correctCount} / {result.totalQuestions}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Evaluation</span>
            <span className="text-sm font-bold uppercase text-gray-900 dark:text-white">
              {isPassed ? 'Proficient' : 'Developing'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. LEARNING INTERPRETATION CARD */}
      <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Curriculum Mastery Recalibration</span>
        </h3>

        <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs sm:text-sm text-gray-800 dark:text-gray-200 space-y-2">
          <div className="flex items-center justify-between font-bold">
            <span>Calibrated Status:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 uppercase text-xs">
              {result.masteryStatus.replace('_', ' ')} ({result.scorePercent}%)
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
            {result.type === 'diagnostic'
              ? 'Your prerequisite baseline has been calibrated. Recommended topics have been populated into your personalized learning map.'
              : result.type === 'adaptive'
              ? 'Your topic-level cognitive mastery has been updated in the evidence matrix. Downstream prerequisites will reflect this new score.'
              : 'Official summative examination results have been verified. Course syllabus completion has been updated.'}
          </p>
        </div>
      </div>

      {/* 3. GAMIFICATION REWARD STRIP (Visually separated from academic outcome) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50/80 to-amber-100/50 dark:from-amber-950/30 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Verified Experience Reward
            </span>
            <h4 className="text-base font-bold text-amber-950 dark:text-amber-100">
              +{result.xpAwarded} XP Confirmed by Gamification Engine
            </h4>
          </div>
        </div>

        {result.badgeAwarded && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#181C24] border border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-900 dark:text-amber-200">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Badge: {result.badgeAwarded.title}</span>
          </div>
        )}
      </div>

      {/* 4. PRIMARY NEXT RECOMMENDED ACTION */}
      <div className="bg-white dark:bg-[#181C24] border border-[#D9DEE7] dark:border-[#2D3545] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Recommended Next Step
          </span>
          <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
            {result.nextRecommendedAction.label}
          </h4>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('course_map', { courseId: course?.id || '' })}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 transition"
          >
            <Map className="w-4 h-4 inline-block mr-1.5" />
            <span>Course Map</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (result.nextRecommendedAction.type === 'lesson') {
                onNavigate('lesson', {
                  courseId: course?.id || '',
                  topicId: topic?.id || '',
                  lessonId: result.nextRecommendedAction.targetId,
                });
              } else if (result.nextRecommendedAction.type === 'adaptive_practice') {
                onNavigate('practice_player', { assessmentId: 'asm-adapt-1' });
              } else {
                onNavigate('course_map', { courseId: course?.id || '' });
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
          >
            <span>Continue Progression</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
