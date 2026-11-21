import React, { useState } from 'react';
import {
  BookOpen,
  FileEdit,
  ClipboardCheck,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Course, Assessment, AICandidateQuestion, AssessmentAttempt } from '../../types';

interface DashboardPageProps {
  courses: Course[];
  assessments: Assessment[];
  candidates: AICandidateQuestion[];
  attempts: AssessmentAttempt[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onCreateCourse: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  courses,
  assessments,
  candidates,
  attempts,
  onNavigate,
  onCreateCourse,
}) => {
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Real data metrics
  const totalCourses = courses.length;
  const draftCourses = courses.filter((c) => c.status === 'draft').length;
  const draftAssessments = assessments.filter((a) => a.status === 'draft').length;
  const pendingReviews = candidates.filter((c) => c.status === 'pending_review').length;
  const completedAttempts = attempts.filter((a) => a.status === 'completed');
  const avgScore =
    completedAttempts.length > 0
      ? Math.round(completedAttempts.reduce((acc, curr) => acc + curr.scorePercent, 0) / completedAttempts.length)
      : 0;

  if (showSkeleton) {
    return (
      <div className="space-y-6 animate-pulse view-enter-animation">
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 view-enter-animation">
      <PageHeader
        title="Teacher overview"
        description="Continue building courses, preparing assessments, and reviewing learner progress."
        primaryAction={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={onCreateCourse}
          >
            Create course
          </Button>
        }
        secondaryActions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('analytics')}
          >
            View analytics
          </Button>
        }
      />

      {/* Zero course empty state */}
      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title="No courses yet"
          description="Create your first academic course to begin structuring topics, attaching learning resources, and generating assessment items."
          actionLabel="Create course"
          onAction={onCreateCourse}
        />
      ) : (
        <>
          {/* 4 Data-Driven Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="interactive-card bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Courses Managed</span>
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white">{totalCourses}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">assigned</span>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {courses.filter((c) => c.status === 'published').length} published active
              </div>
            </div>

            <div className="interactive-card bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Draft Content</span>
                <FileEdit className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white">{draftCourses}</span>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">courses in progress</span>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Requires curriculum completion</div>
            </div>

            <div className="interactive-card bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Draft Assessments</span>
                <ClipboardCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white">{draftAssessments}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">awaiting publish</span>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {assessments.filter((a) => a.status === 'published').length} published live
              </div>
            </div>

            <div className="interactive-card bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Average Mastery</span>
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{avgScore}%</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">academic score</span>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Across {completedAttempts.length} completed attempts
              </div>
            </div>
          </div>

          {/* Main 2-column dashboard layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Your Courses & Continue where you left off */}
            <div className="lg:col-span-2 space-y-6">
              {/* Your Courses Card */}
              <div className="bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs rounded-2xl border border-gray-200/80 dark:border-gray-800/80 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white">Your courses</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">All curriculum under your instructor scope</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => onNavigate('courses')}
                  >
                    View all courses
                  </Button>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {courses.map((c) => (
                    <div
                      key={c.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className="font-semibold text-sm text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer truncate"
                            onClick={() => onNavigate('course_overview', { courseId: c.id })}
                          >
                            {c.title}
                          </h3>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{c.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onNavigate('curriculum', { courseId: c.id })}
                        >
                          Curriculum
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onNavigate('course_overview', { courseId: c.id })}
                        >
                          Overview
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Continue where you left off */}
              <div className="bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs rounded-2xl border border-gray-200/80 dark:border-gray-800/80 p-5 shadow-xs">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white mb-1">
                  Continue where you left off
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Jump back into recent draft authoring and assessment configuration
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => onNavigate('curriculum', courses[0]?.id ? { courseId: courses[0].id } : undefined)}
                    className="interactive-card p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all cursor-pointer flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white truncate">
                        Curriculum Editor
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{courses[0]?.title || 'Active Course'}</p>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-1 inline-block">
                        Edit lessons &amp; topics →
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => onNavigate('questions', courses[0]?.id ? { courseId: courses[0].id } : undefined)}
                    className="interactive-card p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all cursor-pointer flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
                      <ClipboardCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white truncate">
                        Question Bank
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">Author &amp; manage questions</p>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1 inline-block">
                        Open Question Bank →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Needs Attention & Actionable items */}
            <div className="space-y-6">
              {/* Needs Attention Panel */}
              <div className="bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs rounded-2xl border border-gray-200/80 dark:border-gray-800/80 p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white">Needs attention</h2>
                </div>

                <div className="space-y-3">
                  {/* AI Review Queue item */}
                  {pendingReviews > 0 ? (
                    <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          AI Questions Pending Review
                        </span>
                        <span className="text-xs font-semibold bg-white dark:bg-[#181C24] text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                          {pendingReviews}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Candidate questions generated by AI service require teacher inspection and approval
                        before entering assessment bank.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onNavigate('ai_review')}
                        className="self-start mt-1"
                      >
                        Review candidates
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>All generated questions reviewed.</span>
                    </div>
                  )}

                  {/* Draft Assessments */}
                  {draftAssessments > 0 && (
                    <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex flex-col gap-2">
                      <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
                        Unpublished Assessments ({draftAssessments})
                      </span>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        You have draft assessments that need question assignment or schedule review.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onNavigate('assessments')}
                        className="self-start"
                      >
                        Open assessments
                      </Button>
                    </div>
                  )}

                  {/* Weak topic advisory from analytics */}
                  <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-[#14171E] border border-gray-200/80 dark:border-gray-800 flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white">Curriculum Diagnostics</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Topic &ldquo;Conditional Logic &amp; Control Flow&rdquo; has a 65% cohort mastery average (below
                      75% threshold).
                    </p>
                    <button
                      onClick={() => onNavigate('analytics')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline text-left cursor-pointer mt-1"
                    >
                      Inspect analytics report →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
