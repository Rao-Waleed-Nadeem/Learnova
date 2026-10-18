import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  Download,
  Filter,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Layers,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Course, Topic, Assessment, AssessmentAttempt } from '../types';
import { calculateAcademicMastery } from '../utils/assessment';

interface AnalyticsPageProps {
  courses: Course[];
  topics: Topic[];
  assessments: Assessment[];
  attempts: AssessmentAttempt[];
  selectedCourseId?: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  courses,
  topics,
  assessments,
  attempts,
  selectedCourseId,
  onNavigate,
  onNotify,
}) => {
  const [courseFilter, setCourseFilter] = useState<string>(
    selectedCourseId || courses[0]?.id || ''
  );
  const [timeframe, setTimeframe] = useState<'all' | '30d' | '7d'>('all');
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual');

  const activeCourse = courses.find((c) => c.id === courseFilter);
  const courseTopics = topics.filter((t) => t.courseId === courseFilter);
  const courseAssessments = assessments.filter((a) => a.courseId === courseFilter);
  const courseAttempts = attempts.filter((a) => a.courseId === courseFilter);

  // Completed attempts only for academic mastery
  const completedAttempts = courseAttempts.filter((a) => a.status === 'completed');

  // Compute mastery per topic
  const topicMasteryData = useMemo(() => {
    return courseTopics.map((topic) => {
      const topicAttempts = completedAttempts.filter((a) => a.topicId === topic.id);
      const { masteryPercent, completedCount } = calculateAcademicMastery(
        completedAttempts,
        topic.id
      );

      // Weak topic identification based on syllabus masteryThreshold
      const threshold = topic.masteryThreshold || 75;
      const isWeak = completedCount > 0 && masteryPercent < threshold;

      return {
        topic,
        masteryPercent,
        completedCount,
        threshold,
        isWeak,
      };
    });
  }, [courseTopics, completedAttempts]);

  // Overall metrics
  const uniqueLearners = new Set(courseAttempts.map((a) => a.learnerId)).size;
  const overallAvgMastery =
    completedAttempts.length > 0
      ? Math.round(
          completedAttempts.reduce((acc, curr) => acc + curr.scorePercent, 0) /
            completedAttempts.length
        )
      : 0;

  // Score distribution bands: 0-49, 50-69, 70-84, 85-100
  const scoreDistribution = useMemo(() => {
    const bands = {
      '0-49%': 0,
      '50-69%': 0,
      '70-84%': 0,
      '85-100%': 0,
    };
    completedAttempts.forEach((a) => {
      if (a.scorePercent < 50) bands['0-49%']++;
      else if (a.scorePercent < 70) bands['50-69%']++;
      else if (a.scorePercent < 85) bands['70-84%']++;
      else bands['85-100%']++;
    });
    return bands;
  }, [completedAttempts]);

  // Export report
  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Learner,Assessment,Score,Status,CompletedAt']
        .concat(
          completedAttempts.map(
            (a) =>
              `"${a.learnerName}","${a.assessmentTitle}",${a.scorePercent}%,${a.status},"${a.completedAt}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `learnova_analytics_${activeCourse?.title || 'course'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('success', 'Analytics data exported to CSV.');
  };

  const weakTopics = topicMasteryData.filter((d) => d.isWeak);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Teacher Analytics"
        description="Review topic mastery, assessment score distributions, attempt histories, and diagnose curriculum areas needing instruction."
        primaryAction={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExport}
          >
            Export analytics (CSV)
          </Button>
        }
      />

      {/* Course and Timeframe Filter Bar */}
      <div className="bg-white rounded-xl border border-[#D9DEE7] p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1F2937]">
            <BookOpen className="w-4 h-4 text-[#3156D3]" />
            <span>Course Scope:</span>
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="bg-white border border-[#D9DEE7] text-xs font-medium rounded-lg px-3 py-2 focus:border-[#3156D3] focus:outline-none"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#737D8C] hidden sm:inline">Timeframe:</span>
          <div className="inline-flex rounded-lg border border-[#D9DEE7] p-0.5 bg-gray-50 text-xs">
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                timeframe === 'all' ? 'bg-white text-[#3156D3] shadow-xs' : 'text-[#5B6472]'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeframe('30d')}
              className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                timeframe === '30d' ? 'bg-white text-[#3156D3] shadow-xs' : 'text-[#5B6472]'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Section A: Course Progress Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#D9DEE7] shadow-2xs">
          <div className="flex items-center justify-between text-[#5B6472]">
            <span className="text-xs font-semibold uppercase tracking-wider">Cohort Learners</span>
            <Users className="w-4 h-4 text-[#3156D3]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#1F2937]">{uniqueLearners}</span>
            <span className="text-xs text-[#5B6472]">active students</span>
          </div>
          <p className="text-xs text-[#5B6472] mt-2">
            In {activeCourse?.title || 'Selected course'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#D9DEE7] shadow-2xs">
          <div className="flex items-center justify-between text-[#5B6472]">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Academic Mastery</span>
            <TrendingUp className="w-4 h-4 text-[#18794E]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#1F2937]">{overallAvgMastery}%</span>
            <span className="text-xs text-[#18794E] font-medium">mean score</span>
          </div>
          <p className="text-xs text-[#5B6472] mt-2">
            Derived from {completedAttempts.length} completed assessments
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#D9DEE7] shadow-2xs">
          <div className="flex items-center justify-between text-[#5B6472]">
            <span className="text-xs font-semibold uppercase tracking-wider">Weak Topics Flagged</span>
            <AlertTriangle className="w-4 h-4 text-[#946200]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#1F2937]">{weakTopics.length}</span>
            <span className="text-xs text-[#946200] font-medium">below mastery threshold</span>
          </div>
          <p className="text-xs text-[#5B6472] mt-2">
            Requires targeted remedial instruction
          </p>
        </div>
      </div>

      {/* Academic Mastery Decoupling Note */}
      <div className="p-3.5 rounded-lg bg-[#EFF8FF] border border-[#175CD3]/20 flex items-center justify-between text-xs text-[#175CD3]">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>
            <strong>Academic Integrity Rule:</strong> Academic mastery is calculated strictly from
            completed assessment attempts. Student gamification XP and badges are decoupled.
          </span>
        </div>
      </div>

      {/* Section E: Weak-Topic Identification */}
      {weakTopics.length > 0 && (
        <div className="bg-white rounded-xl border border-[#D9DEE7] p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#946200]" />
            <h2 className="text-sm font-bold text-[#1F2937]">
              Struggling Topics Diagnostic ({weakTopics.length})
            </h2>
          </div>
          <p className="text-xs text-[#5B6472]">
            The adaptive engine flagged the following topics because the cohort mastery score is below
            the topic threshold.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {weakTopics.map(({ topic, masteryPercent, threshold, completedCount }) => (
              <div
                key={topic.id}
                className="p-4 rounded-xl border border-[#946200]/30 bg-[#FFF5D6]/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-[#1F2937]">{topic.title}</span>
                    <span className="text-xs font-bold text-[#946200] bg-[#FFF5D6] px-2 py-0.5 rounded border border-[#946200]/30">
                      {masteryPercent}% Mastery
                    </span>
                  </div>
                  <p className="text-xs text-[#5B6472] line-clamp-2">{topic.description}</p>
                  <p className="text-[11px] text-[#737D8C] mt-2">
                    Required syllabus threshold: {threshold}% • Sample: {completedCount} completed submissions
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onNavigate('curriculum', { courseId: courseFilter })}
                    className="text-[#3156D3] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect curriculum unit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      onNavigate('resources', {
                        courseId: courseFilter,
                        topicId: topic.id,
                      })
                    }
                    className="text-[#5B6472] hover:text-[#1F2937] flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View resources</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section B: Topic Mastery Heatmap */}
      <div className="bg-white rounded-xl border border-[#D9DEE7] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9DEE7]">
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">Topic Mastery Heatmap</h2>
            <p className="text-xs text-[#5B6472]">
              Cohort mastery performance across curriculum topics
            </p>
          </div>

          {/* Accessible view switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#737D8C]">View:</span>
            <div className="inline-flex rounded-lg border border-[#D9DEE7] p-0.5 bg-gray-50 text-xs">
              <button
                onClick={() => setViewMode('visual')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                  viewMode === 'visual' ? 'bg-white text-[#3156D3] shadow-xs' : 'text-[#5B6472]'
                }`}
              >
                Heatmap
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-[#3156D3] shadow-xs' : 'text-[#5B6472]'
                }`}
              >
                Table alternative
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-[#5B6472] flex-wrap bg-gray-50 p-2.5 rounded-lg border border-gray-200">
          <span className="font-bold text-[#1F2937]">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#18794E]" />
            <span>Advanced (85-100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#3156D3]" />
            <span>Proficient (70-84%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#946200]" />
            <span>Needs Attention (&lt;70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-300" />
            <span>No attempts yet</span>
          </div>
        </div>

        {viewMode === 'visual' ? (
          <div className="space-y-3">
            {topicMasteryData.map(({ topic, masteryPercent, completedCount, threshold }) => {
              const bgBar =
                completedCount === 0
                  ? 'bg-gray-200'
                  : masteryPercent >= 85
                  ? 'bg-[#18794E]'
                  : masteryPercent >= 70
                  ? 'bg-[#3156D3]'
                  : 'bg-[#946200]';

              return (
                <div key={topic.id} className="p-3 rounded-lg border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1F2937]">{topic.title}</span>
                    <span className="font-bold text-[#1F2937]">
                      {completedCount === 0 ? 'No attempts' : `${masteryPercent}% (Pass: ${threshold}%)`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bgBar} transition-all duration-300`}
                      style={{ width: `${Math.max(masteryPercent, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-[#5B6472]">
                <tr>
                  <th className="p-2.5">Topic</th>
                  <th className="p-2.5 text-center">Mastery Score</th>
                  <th className="p-2.5 text-center">Required Threshold</th>
                  <th className="p-2.5 text-center">Completed Attempts</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {topicMasteryData.map(({ topic, masteryPercent, completedCount, threshold, isWeak }) => (
                  <tr key={topic.id}>
                    <td className="p-2.5 font-medium text-[#1F2937]">{topic.title}</td>
                    <td className="p-2.5 text-center font-bold">
                      {completedCount === 0 ? '-' : `${masteryPercent}%`}
                    </td>
                    <td className="p-2.5 text-center">{threshold}%</td>
                    <td className="p-2.5 text-center">{completedCount}</td>
                    <td className="p-2.5 text-center">
                      {isWeak ? (
                        <span className="text-[#946200] font-semibold">Needs attention</span>
                      ) : completedCount > 0 ? (
                        <span className="text-[#18794E] font-semibold">On track</span>
                      ) : (
                        <span className="text-[#737D8C]">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section C: Score Distribution Histogram */}
      <div className="bg-white rounded-xl border border-[#D9DEE7] p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#D9DEE7]">
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">Score Distribution</h2>
            <p className="text-xs text-[#5B6472]">
              Spread of student score percentages across all assessments in this course
            </p>
          </div>
          <span className="text-xs text-[#737D8C]">{completedAttempts.length} total attempts</span>
        </div>

        <div className="grid grid-cols-4 gap-3 pt-2">
          {Object.entries(scoreDistribution).map(([band, count]) => {
            const maxVal = Math.max(...Object.values(scoreDistribution), 1);
            const heightPercent = Math.round((count / maxVal) * 100);

            return (
              <div key={band} className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-[#1F2937]">{count}</span>
                <div className="w-full bg-gray-100 h-28 rounded-lg flex items-end p-1">
                  <div
                    className="w-full bg-[#3156D3] rounded-md transition-all duration-300"
                    style={{ height: `${Math.max(heightPercent, 6)}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-[#5B6472]">{band}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section D: Attempt History Table */}
      <div className="bg-white rounded-xl border border-[#D9DEE7] overflow-hidden shadow-2xs space-y-2">
        <div className="p-5 pb-3 border-b border-[#D9DEE7] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">Attempt History</h2>
            <p className="text-xs text-[#5B6472]">
              Individual assessment submissions under authorized teacher scope
            </p>
          </div>
          <span className="text-xs font-semibold text-[#5B6472] bg-gray-100 px-2.5 py-0.5 rounded-full">
            {completedAttempts.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F5F7FA] border-b text-[#5B6472] font-semibold">
                <th className="py-3 px-5">Learner</th>
                <th className="py-3 px-4">Assessment Title</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-center">Score</th>
                <th className="py-3 px-4 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9DEE7]">
              {completedAttempts.map((att) => {
                const passed = att.scorePercent >= 70;

                return (
                  <tr key={att.id} className="hover:bg-gray-50">
                    <td className="py-3 px-5 font-semibold text-[#1F2937]">{att.learnerName}</td>
                    <td className="py-3 px-4 text-[#5B6472]">{att.assessmentTitle}</td>
                    <td className="py-3 px-3 text-[#737D8C]">
                      {new Date(att.completedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-[#1F2937]">
                      {att.scorePercent}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full border ${
                          passed
                            ? 'bg-[#EAF7F0] text-[#18794E] border-[#18794E]/20'
                            : 'bg-[#FEF0EF] text-[#B42318] border-[#B42318]/20'
                        }`}
                      >
                        {passed ? 'Passed' : 'Needs Review'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
