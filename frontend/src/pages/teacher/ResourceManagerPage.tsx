import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Video,
  Code2,
  ExternalLink,
  BookOpen,
  Trash2,
  Edit3,
  Eye,
  FileCheck,
  ArrowLeft,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Course, Topic, Lesson, LearningResource, ResourceType } from '../../types';

interface ResourceManagerPageProps {
  course: Course;
  topic?: Topic;
  lesson?: Lesson;
  resources: LearningResource[];
  allLessons: Lesson[];
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSaveResource: (res: LearningResource) => void;
  onDeleteResource: (id: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const ResourceManagerPage: React.FC<ResourceManagerPageProps> = ({
  course,
  topic,
  lesson,
  resources,
  allLessons,
  onNavigate,
  onSaveResource,
  onDeleteResource,
  onNotify,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [previewResource, setPreviewResource] = useState<LearningResource | null>(null);
  const [editingRes, setEditingRes] = useState<LearningResource | null>(null);
  const [deleteRes, setDeleteRes] = useState<LearningResource | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ResourceType>('document');
  const [formContent, setFormContent] = useState('');
  const [formLessonId, setFormLessonId] = useState<string>(lesson ? lesson.id : allLessons[0]?.id || '');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const lessonResources = lesson
    ? resources.filter((r) => r.lessonId === lesson.id)
    : resources.filter((r) => r.courseId === course.id);

  const openCreateModal = () => {
    setEditingRes(null);
    setFormTitle('');
    setFormType('document');
    setFormContent('');
    setFormLessonId(lesson ? lesson.id : allLessons[0]?.id || '');
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (r: LearningResource) => {
    setEditingRes(r);
    setFormTitle(r.title);
    setFormType(r.type);
    setFormContent(r.contentOrUrl);
    setFormLessonId(r.lessonId);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formTitle.trim()) {
      errors.title = 'Resource title is required.';
    }
    if (!formContent.trim()) {
      errors.content = 'Content, notes or resource URL is required.';
    }
    if (!formLessonId) {
      errors.lessonId = 'Select a lesson to attach this resource to.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const saved: LearningResource = {
      id: editingRes ? editingRes.id : `res-${Date.now()}`,
      courseId: course.id,
      lessonId: formLessonId,
      title: formTitle.trim(),
      type: formType,
      contentOrUrl: formContent.trim(),
      fileSize:
        formType === 'document'
          ? '1.2 MB PDF'
          : formType === 'video'
          ? 'Stream URL'
          : `${formContent.length} chars`,
      updatedAt: new Date().toISOString(),
      createdAt: editingRes ? editingRes.createdAt : new Date().toISOString(),
    };

    onSaveResource(saved);
    setModalOpen(false);
    onNotify('success', editingRes ? 'Resource updated.' : 'Resource attached to lesson.');
  };

  const handleDeleteConfirm = () => {
    if (deleteRes) {
      onDeleteResource(deleteRes.id);
      setDeleteRes(null);
      onNotify('info', 'Resource removed.');
    }
  };

  const getTypeIcon = (type: ResourceType) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4 text-purple-600" />;
      case 'code':
        return <Code2 className="w-4 h-4 text-emerald-600" />;
      case 'markdown':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'link':
        return <ExternalLink className="w-4 h-4 text-blue-600" />;
      default:
        return <FileCheck className="w-4 h-4 text-[#3156D3]" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Courses', onClick: () => onNavigate('courses') },
          { label: course.title, onClick: () => onNavigate('course_overview', { courseId: course.id }) },
          { label: 'Curriculum', onClick: () => onNavigate('curriculum', { courseId: course.id }) },
          { label: lesson ? `${lesson.title} - Resources` : 'Learning Resources', active: true },
        ]}
        title="Learning Resources"
        description="Attach educational materials, documents, lecture recordings, and interactive code snippets to curriculum lessons."
        courseBadge={course.title}
        primaryAction={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
          >
            Add resource
          </Button>
        }
        secondaryActions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => onNavigate('curriculum', { courseId: course.id })}
          >
            Curriculum
          </Button>
        }
      />

      {lesson && (
        <div className="p-3.5 rounded-lg bg-[#E8EEFF] border border-[#3156D3]/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#2646B8]">Selected Lesson Context:</span>
            <span className="text-[#1F2937] font-medium">{lesson.title}</span>
          </div>
          <span className="text-[#5B6472]">
            {lessonResources.length} resource(s) attached
          </span>
        </div>
      )}

      {lessonResources.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No learning resources attached yet"
          description="Upload or paste syllabus slides, video lecture URLs, markdown study guides, or sample source code."
          actionLabel="Add resource"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lessonResources.map((res) => {
            const targetLesson = allLessons.find((l) => l.id === res.lessonId);

            return (
              <div
                key={res.id}
                className="bg-white rounded-xl border border-[#D9DEE7] p-5 shadow-2xs flex flex-col justify-between hover:border-[#3156D3] transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                        {getTypeIcon(res.type)}
                      </div>
                      <span className="text-xs uppercase font-semibold text-[#5B6472] tracking-wider">
                        {res.type}
                      </span>
                    </div>
                    {res.fileSize && (
                      <span className="text-[11px] text-[#737D8C] bg-gray-100 px-2 py-0.5 rounded">
                        {res.fileSize}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-[#1F2937] group-hover:text-[#3156D3] transition-colors line-clamp-1">
                    {res.title}
                  </h3>

                  <p className="text-xs text-[#5B6472] line-clamp-2 mt-1 font-mono bg-gray-50 p-2 rounded border border-gray-100">
                    {res.contentOrUrl}
                  </p>

                  <div className="mt-3 text-[11px] text-[#737D8C]">
                    Lesson: <span className="font-medium text-[#1F2937]">{targetLesson?.title || 'General'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[#737D8C]">
                    {new Date(res.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => setPreviewResource(res)}
                    >
                      Preview
                    </Button>
                    <button
                      onClick={() => openEditModal(res)}
                      className="p-1.5 text-[#5B6472] hover:text-[#1F2937] hover:bg-gray-100 rounded cursor-pointer"
                      title="Edit metadata"
                      aria-label={`Edit ${res.title}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteRes(res)}
                      className="p-1.5 text-[#5B6472] hover:text-[#B42318] hover:bg-[#FEF0EF] rounded cursor-pointer"
                      title="Delete resource"
                      aria-label={`Delete ${res.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Resource Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#D9DEE7]">
            <h2 className="text-lg font-bold text-[#1F2937] mb-1">
              {editingRes ? 'Edit Resource' : 'Attach Learning Resource'}
            </h2>
            <p className="text-xs text-[#5B6472] mb-5">
              Choose the resource format and attach it to a lesson in this course.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <FormField
                id="res-title"
                label="Resource title"
                required
                error={formErrors.title}
                helperText="E.g., Python Data Model Reference, Lecture 3 Recording"
              >
                <input
                  id="res-title"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField id="res-type" label="Resource type" required>
                  <select
                    id="res-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ResourceType)}
                    className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                  >
                    <option value="document">Document / PDF</option>
                    <option value="video">Video URL</option>
                    <option value="markdown">Markdown Notes</option>
                    <option value="code">Code Snippet</option>
                    <option value="link">External Reference Link</option>
                  </select>
                </FormField>

                <FormField id="res-lesson" label="Target lesson" required error={formErrors.lessonId}>
                  <select
                    id="res-lesson"
                    value={formLessonId}
                    onChange={(e) => setFormLessonId(e.target.value)}
                    className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                  >
                    {allLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField
                id="res-content"
                label={formType === 'markdown' || formType === 'code' ? 'Code or Markdown Text' : 'URL or Content Path'}
                required
                error={formErrors.content}
                helperText={
                  formType === 'video' || formType === 'document' || formType === 'link'
                    ? 'Enter valid HTTP/HTTPS URL or repository path.'
                    : 'Paste valid markdown or source code.'
                }
              >
                {formType === 'markdown' || formType === 'code' ? (
                  <textarea
                    id="res-content"
                    rows={5}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder={
                      formType === 'code'
                        ? 'def example_function():\n    return 42'
                        : '### Study notes\n- Point 1\n- Point 2'
                    }
                    className="w-full font-mono bg-white border border-[#D9DEE7] text-xs rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                  />
                ) : (
                  <input
                    id="res-content"
                    type="url"
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white border border-[#D9DEE7] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                  />
                )}
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D9DEE7]">
                <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {editingRes ? 'Save changes' : 'Attach resource'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-[#D9DEE7] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7]">
              <div className="flex items-center gap-2">
                {getTypeIcon(previewResource.type)}
                <h3 className="text-base font-bold text-[#1F2937] truncate">{previewResource.title}</h3>
              </div>
              <button
                onClick={() => setPreviewResource(null)}
                className="p-1 text-[#5B6472] hover:bg-gray-100 rounded-lg cursor-pointer"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 text-xs">
              {previewResource.type === 'code' ? (
                <pre className="bg-[#1F2937] text-gray-100 p-4 rounded-xl font-mono overflow-x-auto text-xs leading-relaxed">
                  {previewResource.contentOrUrl}
                </pre>
              ) : previewResource.type === 'markdown' ? (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 whitespace-pre-wrap leading-relaxed font-sans text-xs text-[#1F2937]">
                  {previewResource.contentOrUrl}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[#EFF8FF] border border-[#175CD3]/20 text-xs">
                    <p className="font-semibold text-[#175CD3]">External Media Reference</p>
                    <p className="mt-1 font-mono text-gray-700 break-all">{previewResource.contentOrUrl}</p>
                  </div>
                  <a
                    href={previewResource.contentOrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-[#3156D3] text-white px-4 py-2 rounded-lg font-medium text-xs hover:bg-[#2646B8]"
                  >
                    <span>Open in new tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#D9DEE7] flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setPreviewResource(null)}>
                Close preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Resource Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteRes}
        title="Remove learning resource?"
        targetObject={deleteRes?.title}
        consequence="This will unlink the material from its lesson. Learners will no longer see this resource."
        isDestructive
        confirmLabel="Remove resource"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteRes(null)}
      />
    </div>
  );
};
