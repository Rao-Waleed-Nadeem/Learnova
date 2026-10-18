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
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormField } from '../components/ui/FormField';
import { Course, Topic, Lesson, LearningResource, Assessment, CourseStatus } from '../types';

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
    <div className="space-y-8">
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
      <div className="bg-white rounded-xl border border-[#D9DEE7] p-6 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center divide-x divide-gray-100">
          <div className="px-2">
            <span className="text-xs uppercase font-semibold text-[#737D8C] block mb-1">Topics</span>
            <span className="text-2xl font-bold text-[#1F2937]">{topics.length}</span>
            <span className="text-[11px] text-[#5B6472] block mt-0.5">curriculum units</span>
          </div>
          <div className="px-2">
            <span className="text-xs uppercase font-semibold text-[#737D8C] block mb-1">Lessons</span>
            <span className="text-2xl font-bold text-[#1F2937]">{lessons.length}</span>
            <span className="text-[11px] text-[#5B6472] block mt-0.5">structured lessons</span>
          </div>
          <div className="px-2">
            <span className="text-xs uppercase font-semibold text-[#737D8C] block mb-1">Resources</span>
            <span className="text-2xl font-bold text-[#1F2937]">{resources.length}</span>
            <span className="text-[11px] text-[#5B6472] block mt-0.5">attached materials</span>
          </div>
          <div className="px-2">
            <span className="text-xs uppercase font-semibold text-[#737D8C] block mb-1">Assessments</span>
            <span className="text-2xl font-bold text-[#1F2937]">{assessments.length}</span>
            <span className="text-[11px] text-[#5B6472] block mt-0.5">evaluation tests</span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-[#5B6472]">
          <span>
            Created: {new Date(course.createdAt).toLocaleDateString()} • Last updated:{' '}
            {new Date(course.updatedAt).toLocaleDateString()}
          </span>
          <span className="font-medium text-[#3156D3]">
            {course.status === 'published' ? 'Active in learner catalogue' : 'Private to instructor'}
          </span>
        </div>
      </div>

      {/* 4 Main Navigation Cards */}
      <div>
        <h2 className="text-base font-bold text-[#1F2937] mb-3">Course Management Workspaces</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Curriculum */}
          <div
            onClick={() => onNavigate('curriculum', { courseId: course.id })}
            className="bg-white p-5 rounded-xl border border-[#D9DEE7] hover:border-[#3156D3] hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#E8EEFF] text-[#3156D3] flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-[#5B6472] bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                  {topics.length} Topics
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#1F2937] group-hover:text-[#3156D3] transition-colors">
                Curriculum &amp; Hierarchy
              </h3>
              <p className="text-xs text-[#5B6472] mt-1.5 leading-relaxed">
                Structure the course syllabus into topics, sub-lessons, reorder nodes, and manage
                acyclic prerequisite dependencies.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-[#3156D3]">
              <span>Open Curriculum Editor</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Learning Resources */}
          <div
            onClick={() => onNavigate('resources', { courseId: course.id })}
            className="bg-white p-5 rounded-xl border border-[#D9DEE7] hover:border-[#3156D3] hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#EFF8FF] text-[#175CD3] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-[#5B6472] bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                  {resources.length} Files/Links
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#1F2937] group-hover:text-[#3156D3] transition-colors">
                Learning Resources
              </h3>
              <p className="text-xs text-[#5B6472] mt-1.5 leading-relaxed">
                Attach syllabi, lecture video links, Markdown study notes, and sample code snippets
                directly to course lessons.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-[#3156D3]">
              <span>Manage Learning Resources</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Assessments */}
          <div
            onClick={() => onNavigate('assessments', { courseId: course.id })}
            className="bg-white p-5 rounded-xl border border-[#D9DEE7] hover:border-[#3156D3] hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF5D6] text-[#946200] flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-[#5B6472] bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                  {assessments.length} Tests
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#1F2937] group-hover:text-[#3156D3] transition-colors">
                Assessments &amp; Quizzes
              </h3>
              <p className="text-xs text-[#5B6472] mt-1.5 leading-relaxed">
                Build diagnostic, formative, and summative assessments from the question bank with custom
                timing and attempt rules.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-[#3156D3]">
              <span>Open Course Assessments</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Analytics */}
          <div
            onClick={() => onNavigate('analytics', { courseId: course.id })}
            className="bg-white p-5 rounded-xl border border-[#D9DEE7] hover:border-[#3156D3] hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF7F0] text-[#18794E] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-[#18794E] bg-[#EAF7F0] px-2 py-0.5 rounded border border-[#18794E]/20">
                  Academic Mastery
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#1F2937] group-hover:text-[#3156D3] transition-colors">
                Course Progress &amp; Analytics
              </h3>
              <p className="text-xs text-[#5B6472] mt-1.5 leading-relaxed">
                Inspect topic mastery heatmaps, cohort attempt score distributions, and identify struggling
                curriculum units.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-[#3156D3]">
              <span>View Course Analytics</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Course Preparation Checklist */}
      <div className="bg-white rounded-xl border border-[#D9DEE7] p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-[#1F2937] mb-1">Suggested Preparation Checklist</h3>
        <p className="text-xs text-[#5B6472] mb-4">
          Recommended authoring milestones before publishing this course to students.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div
            className={`p-3 rounded-lg border flex items-center gap-2.5 ${
              hasTopics
                ? 'bg-[#EAF7F0] border-[#18794E]/20 text-[#18794E]'
                : 'bg-gray-50 border-gray-200 text-[#5B6472]'
            }`}
          >
            {hasTopics ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#18794E]" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#946200]" />
            )}
            <span className="font-medium">1+ Curriculum Topics</span>
          </div>

          <div
            className={`p-3 rounded-lg border flex items-center gap-2.5 ${
              hasLessons
                ? 'bg-[#EAF7F0] border-[#18794E]/20 text-[#18794E]'
                : 'bg-gray-50 border-gray-200 text-[#5B6472]'
            }`}
          >
            {hasLessons ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#18794E]" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#946200]" />
            )}
            <span className="font-medium">Structured Lessons</span>
          </div>

          <div
            className={`p-3 rounded-lg border flex items-center gap-2.5 ${
              hasResources
                ? 'bg-[#EAF7F0] border-[#18794E]/20 text-[#18794E]'
                : 'bg-gray-50 border-gray-200 text-[#5B6472]'
            }`}
          >
            {hasResources ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#18794E]" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#946200]" />
            )}
            <span className="font-medium">Learning Materials</span>
          </div>

          <div
            className={`p-3 rounded-lg border flex items-center gap-2.5 ${
              hasAssessments
                ? 'bg-[#EAF7F0] border-[#18794E]/20 text-[#18794E]'
                : 'bg-gray-50 border-gray-200 text-[#5B6472]'
            }`}
          >
            {hasAssessments ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#18794E]" />
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#D9DEE7]">
            <h2 className="text-lg font-bold text-[#1F2937] mb-1">Edit Course Details</h2>
            <p className="text-xs text-[#5B6472] mb-5">
              Update academic title, summary, or publication status.
            </p>

            <form onSubmit={handleSaveDetails} className="space-y-4">
              <FormField id="edit-title" label="Course title" required>
                <input
                  id="edit-title"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                />
              </FormField>

              <FormField id="edit-desc" label="Course description" required>
                <textarea
                  id="edit-desc"
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                />
              </FormField>

              <FormField id="edit-status" label="Course status">
                <select
                  id="edit-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as CourseStatus)}
                  className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D9DEE7]">
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
