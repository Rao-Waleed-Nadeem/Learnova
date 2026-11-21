import React, { useState } from 'react';
import {
  Layers,
  FileText,
  ClipboardCheck,
  BarChart3,
  Edit3,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormField } from '../../components/ui/FormField';
import { Course, Topic, Lesson, LearningResource, Assessment, CourseStatus } from '../../types';

interface CourseOverviewPageProps {
  course: Course;
  topics: Topic[];
  lessons: Lesson[];
  resources: LearningResource[];
  assessments: Assessment[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onUpdateCourse: (course: Course) => void;
}

export const CourseOverviewPage: React.FC<CourseOverviewPageProps> = ({
  course,
  topics,
  lessons,
  resources,
  assessments,
  onNavigate,
  onUpdateCourse,
}) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // Edit form state
  const [formTitle, setFormTitle] = useState(course.title);
  const [formDesc, setFormDesc] = useState(course.description);
  const [formStatus, setFormStatus] = useState<CourseStatus>(course.status);

  // Suggested preparation checklist items
  const hasTopics = topics.length > 0;
  const hasLessons = lessons.length > 0;
  const hasResources = resources.length > 0;
  const hasAssessments = assessments.length > 0;
  const allReady = hasTopics && hasLessons && hasResources;

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    onUpdateCourse({
      ...course,
      title: formTitle.trim(),
      description: formDesc.trim(),
      status: formStatus,
      updatedAt: new Date().toISOString(),
    });
    setEditModalOpen(false);
  };

  const handlePublishConfirm = () => {
    onUpdateCourse({
      ...course,
      status: 'published',
      updatedAt: new Date().toISOString(),
    });
    setPublishDialogOpen(false);
  };

  return (
    <div className="space-y-8 view-enter-animation">
      <PageHeader
        breadcrumbs={[
          { label: 'Courses', onClick: () => onNavigate('courses') },
          { label: course.title, active: true },
        ]}
        title={course.title}
        description={course.description}
        status={course.status}
        primaryAction={
          <Button
            variant="primary"
            leftIcon={<Layers className="w-4 h-4" />}
            onClick={() => onNavigate('curriculum', { courseId: course.id })}
          >
            Edit curriculum
          </Button>
        }
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={() => {
                setFormTitle(course.title);
                setFormDesc(course.description);
                setFormStatus(course.status);
                setEditModalOpen(true);
              }}
            >
              Edit details
            </Button>
            {course.status !== 'published' && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                onClick={() => setPublishDialogOpen(true)}
              >
                Publish course
              </Button>
            )}
          </div>
        }
      />

      {/* Top Summary Metadata Panel */}
      <div className="bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs rounded-2xl border border-gray-200/80 dark:border-gray-800/80 p-6 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:divide-x divide-gray-100 dark:divide-gray-800">
          <div className="px-2">
            <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">Topics</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white">{topics.length}</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">curriculum units</span>
          </div>
          <div className="px-2">
            <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">Lessons</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white">{lessons.length}</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">structured lessons</span>
          </div>
          <div className="px-2">
            <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">Resources</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white">{resources.length}</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">attached materials</span>
          </div>
          <div className="px-2">
            <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">Assessments</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white">{assessments.length}</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">evaluation tests</span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Created: {new Date(course.createdAt).toLocaleDateString()} • Last updated:{' '}
            {new Date(course.updatedAt).toLocaleDateString()}
          </span>
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            {course.status === 'published' ? 'Active in learner catalogue' : 'Private to instructor'}
          </span>
        </div>
      </div>

      {/* 4 Main Navigation Cards */}
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white mb-3">Course Management Workspaces</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Curriculum */}
          <div
            onClick={() => onNavigate('curriculum', { courseId: course.id })}
            className="interactive-card bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                  {topics.length} Topics
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Curriculum &amp; Hierarchy
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                Structure the course syllabus into topics, sub-lessons, reorder nodes, and manage
                acyclic prerequisite dependencies.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <span>Open Curriculum Editor</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Learning Resources */}
          <div
            onClick={() => onNavigate('resources', { courseId: course.id })}
            className="interactive-card bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                  {resources.length} Files/Links
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Learning Resources
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                Attach syllabi, lecture video links, Markdown study notes, and sample code snippets
                directly to course lessons.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <span>Manage Learning Resources</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Assessments */}
          <div
            onClick={() => onNavigate('assessments', { courseId: course.id })}
            className="interactive-card bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                  {assessments.length} Tests
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Assessments &amp; Quizzes
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                Build diagnostic, formative, and summative assessments from the question bank with custom
                timing and attempt rules.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <span>Open Course Assessments</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Analytics */}
          <div
            onClick={() => onNavigate('analytics', { courseId: course.id })}
            className="interactive-card bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Academic Mastery
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Course Progress &amp; Analytics
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                Inspect topic mastery heatmaps, cohort attempt score distributions, and identify struggling
                curriculum units.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <span>View Course Analytics</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Course Preparation Checklist */}
      <div className="bg-white/90 dark:bg-[#181C24]/90 backdrop-blur-xs rounded-2xl border border-gray-200/80 dark:border-gray-800/80 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white dark:text-white dark:text-white dark:text-white mb-1">Suggested Preparation Checklist</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Recommended authoring milestones before publishing this course to students.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              hasTopics
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {hasTopics ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <span className="font-medium">1+ Curriculum Topics</span>
          </div>

          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              hasLessons
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {hasLessons ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <span className="font-medium">Structured Lessons</span>
          </div>

          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              hasResources
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {hasResources ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <span className="font-medium">Learning Materials</span>
          </div>

          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              hasAssessments
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {hasAssessments ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#946200]" />
            )}
            <span className="font-medium">Assessments Attached</span>
          </div>
        </div>
      </div>

      {/* Edit Details Modal */}
      {editModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/15 dark:bg-black/25 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#181C24] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545]">
            <h2 className="text-lg font-bold text-[#1F2937] dark:text-white dark:text-white dark:text-white dark:text-white mb-1">Edit Course Details</h2>
            <p className="text-xs text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 mb-5">
              Update academic title, summary, or publication status.
            </p>

            <form onSubmit={handleSaveDetails} className="space-y-4">
              <FormField id="edit-title" label="Course title" required>
                <input
                  id="edit-title"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-gray-700 text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                />
              </FormField>

              <FormField id="edit-desc" label="Course description" required>
                <textarea
                  id="edit-desc"
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-gray-700 text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                />
              </FormField>

              <FormField
                id="edit-status"
                label="Course status"
                helperText={
                  formStatus === 'archived'
                    ? 'Archiving will automatically unenroll all students and make the course eligible for deletion.'
                    : 'Draft courses are instructor-only. Published courses are accessible to students.'
                }
              >
                <select
                  id="edit-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as CourseStatus)}
                  className="w-full bg-white dark:bg-[#1E232E] border border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-gray-700 text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                >
                  <option value="draft">Draft (Private)</option>
                  <option value="published">Published (Active)</option>
                  <option value="archived">Archived (Unenrolls students)</option>
                </select>
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545]">
                <Button variant="secondary" type="button" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation for Publishing */}
      <ConfirmDialog
        isOpen={publishDialogOpen}
        title="Publish course to learners?"
        targetObject={course.title}
        consequence="Once published, enrolled students can view published topics, resources, and take active assessments."
        confirmLabel="Publish course"
        onConfirm={handlePublishConfirm}
        onCancel={() => setPublishDialogOpen(false)}
      />
    </div>
  );
};
