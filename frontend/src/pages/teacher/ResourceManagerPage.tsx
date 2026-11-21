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
  UploadCloud,
  AlertCircle,
  Check,
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

const ALLOWED_EXTENSIONS = ['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.md', '.txt', '.pdf'];

const getFileExtension = (filename: string): string => {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex !== -1 ? filename.slice(dotIndex).toLowerCase() : '';
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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
  const [modalTab, setModalTab] = useState<'upload' | 'manual'>('upload');
  const [previewResource, setPreviewResource] = useState<LearningResource | null>(null);
  const [editingRes, setEditingRes] = useState<LearningResource | null>(null);
  const [deleteRes, setDeleteRes] = useState<LearningResource | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ResourceType>('document');
  const [formContent, setFormContent] = useState('');
  const [formLessonId, setFormLessonId] = useState<string>(lesson ? lesson.id : allLessons[0]?.id || '');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Multi-file upload states
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const lessonResources = lesson
    ? resources.filter((r) => r.lessonId === lesson.id)
    : resources.filter((r) => r.courseId === course.id);

  const openCreateModal = () => {
    setEditingRes(null);
    setModalTab('upload');
    setStagedFiles([]);
    setUploadError(null);
    setFormTitle('');
    setFormType('document');
    setFormContent('');
    setFormLessonId(lesson ? lesson.id : allLessons[0]?.id || '');
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (r: LearningResource) => {
    setEditingRes(r);
    setModalTab('manual');
    setStagedFiles([]);
    setUploadError(null);
    setFormTitle(r.title);
    setFormType(r.type);
    setFormContent(r.contentOrUrl);
    setFormLessonId(r.lessonId);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const validFiles: File[] = [];
    const rejectedNames: string[] = [];

    files.forEach((file) => {
      const ext = getFileExtension(file.name);
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        validFiles.push(file);
      } else {
        rejectedNames.push(file.name);
      }
    });

    if (rejectedNames.length > 0) {
      setUploadError(
        `Rejected unsupported files: ${rejectedNames.join(', ')}. Only Word (.doc, .docx), PowerPoint (.ppt, .pptx), Excel (.xls, .xlsx), Markdown (.md), Plain Text (.txt), and PDF (.pdf) are allowed.`
      );
    }

    if (validFiles.length > 0) {
      setStagedFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const filteredNew = validFiles.filter((f) => !existingNames.has(f.name));
        return [...prev, ...filteredNew];
      });
    }

    e.target.value = '';
  };

  const handleRemoveStagedFile = (idx: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUploadStagedFiles = () => {
    if (!formLessonId) {
      setUploadError('Please select a target lesson to attach resources.');
      return;
    }
    if (stagedFiles.length === 0) {
      setUploadError('Please select at least one valid file to upload.');
      return;
    }

    stagedFiles.forEach((file, index) => {
      const ext = getFileExtension(file.name);
      const resType: ResourceType = ext === '.md' ? 'markdown' : 'document';
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
      const newResource: LearningResource = {
        id: `res-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
        courseId: course.id,
        lessonId: formLessonId,
        title: cleanTitle,
        type: resType,
        contentOrUrl: `local-file://${file.name}`,
        fileSize: `${formatFileSize(file.size)} (${ext.toUpperCase().replace('.', '')})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onSaveResource(newResource);
    });

    const targetLessonTitle = allLessons.find((l) => l.id === formLessonId)?.title || 'Selected Lesson';
    onNotify('success', `${stagedFiles.length} file(s) attached to "${targetLessonTitle}".`);
    setStagedFiles([]);
    setModalOpen(false);
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
            <span className="text-[#1F2937] dark:text-white dark:text-white dark:text-white font-medium">{lesson.title}</span>
          </div>
          <span className="text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">
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
                className="bg-white dark:bg-[#181C24] rounded-xl border border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] p-5 shadow-2xs flex flex-col justify-between hover:border-[#3156D3] transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#1C212B] dark:bg-[#1C212B] dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800">
                        {getTypeIcon(res.type)}
                      </div>
                      <span className="text-xs uppercase font-semibold text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 tracking-wider">
                        {res.type}
                      </span>
                    </div>
                    {res.fileSize && (
                      <span className="text-[11px] text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {res.fileSize}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-[#1F2937] dark:text-white dark:text-white dark:text-white group-hover:text-[#3156D3] transition-colors line-clamp-1">
                    {res.title}
                  </h3>

                  <p className="text-xs text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 line-clamp-2 mt-1 font-mono bg-gray-50 dark:bg-[#1C212B] dark:bg-[#1C212B] dark:bg-[#1C212B] p-2 rounded border border-gray-100">
                    {res.contentOrUrl}
                  </p>

                  <div className="mt-3 text-[11px] text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">
                    Lesson: <span className="font-medium text-[#1F2937] dark:text-white dark:text-white dark:text-white">{targetLesson?.title || 'General'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[#737D8C] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400">
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
                      className="p-1.5 text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 hover:text-[#1F2937] dark:text-white dark:text-white dark:text-white hover:bg-gray-100 rounded cursor-pointer"
                      title="Edit metadata"
                      aria-label={`Edit ${res.title}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteRes(res)}
                      className="p-1.5 text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 hover:text-[#B42318] hover:bg-[#FEF0EF] rounded cursor-pointer"
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
          <div className="bg-white dark:bg-[#181C24] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#D9DEE7] dark:border-[#2D3545] flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800">
              <h2 className="text-lg font-bold text-[#1F2937] dark:text-white dark:text-white dark:text-white">
                {editingRes ? 'Edit Resource' : 'Attach Learning Resource'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode tabs for new resources */}
            {!editingRes && (
              <div className="flex border-b border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 mt-3 mb-4">
                <button
                  type="button"
                  onClick={() => setModalTab('upload')}
                  className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                    modalTab === 'upload'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload from Computer
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('manual')}
                  className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                    modalTab === 'manual'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Manual Entry / Link / Code
                </button>
              </div>
            )}

            {/* Upload from PC Tab */}
            {!editingRes && modalTab === 'upload' && (
              <div className="flex-1 overflow-y-auto space-y-4">
                <FormField id="upload-lesson-select" label="Target lesson" required error={uploadError && !formLessonId ? uploadError : undefined}>
                  <select
                    id="upload-lesson-select"
                    value={formLessonId}
                    onChange={(e) => setFormLessonId(e.target.value)}
                    className="w-full bg-white dark:bg-[#12161F] dark:text-white border border-[#D9DEE7] dark:border-[#2D3545] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                  >
                    {allLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </FormField>

                <label className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-gray-50 dark:bg-[#1C212B] dark:bg-[#1C212B] dark:bg-[#1C212B]/60 hover:bg-indigo-50/30 transition-colors">
                  <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
                  <span className="text-xs font-semibold text-gray-800">
                    Click or drag files here to select
                  </span>
                  <span className="text-[11px] text-gray-500 mt-1 max-w-xs">
                    Allowed formats: Word (.doc, .docx), PowerPoint (.ppt, .pptx), Excel (.xls, .xlsx), Markdown (.md), Plain Text (.txt), and PDF (.pdf).
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".doc,.docx,.ppt,.pptx,.xls,.xlsx,.md,.txt,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>

                {uploadError && (
                  <div className="p-3 rounded-lg bg-red-50 text-xs text-red-700 border border-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Staged files list */}
                {stagedFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                      <span>Selected Files ({stagedFiles.length})</span>
                      <button
                        type="button"
                        onClick={() => setStagedFiles([])}
                        className="text-red-600 text-[11px] hover:underline cursor-pointer"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {stagedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#1C212B] dark:bg-[#1C212B] dark:bg-[#1C212B] border border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate font-medium text-gray-800">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-white dark:bg-[#12161F] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-800">
                              {formatFileSize(file.size)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveStagedFile(idx)}
                              className="text-gray-400 hover:text-red-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545]">
                  <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="button"
                    disabled={stagedFiles.length === 0}
                    onClick={handleUploadStagedFiles}
                  >
                    Attach {stagedFiles.length} file(s)
                  </Button>
                </div>
              </div>
            )}

            {/* Manual Form Tab */}
            {(editingRes || modalTab === 'manual') && (
              <form onSubmit={handleFormSubmit} className="space-y-4 flex-1 overflow-y-auto">
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
                    className="w-full bg-white dark:bg-[#12161F] dark:text-white border border-[#D9DEE7] dark:border-[#2D3545] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="res-type" label="Resource type" required>
                    <select
                      id="res-type"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as ResourceType)}
                      className="w-full bg-white dark:bg-[#12161F] dark:text-white border border-[#D9DEE7] dark:border-[#2D3545] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
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
                      className="w-full bg-white dark:bg-[#12161F] dark:text-white border border-[#D9DEE7] dark:border-[#2D3545] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
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
                      className="w-full font-mono bg-white dark:bg-[#12161F] dark:text-white border border-[#D9DEE7] dark:border-[#2D3545] text-xs rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                    />
                  ) : (
                    <input
                      id="res-content"
                      type="url"
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white dark:bg-[#12161F] dark:text-white border border-[#D9DEE7] dark:border-[#2D3545] text-sm rounded-lg px-3.5 py-2.5 focus:border-[#3156D3] focus:outline-none"
                    />
                  )}
                </FormField>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545]">
                  <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    {editingRes ? 'Save changes' : 'Attach resource'}
                  </Button>
                </div>
              </form>
            )}
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
          <div className="bg-white dark:bg-[#181C24] rounded-2xl max-w-xl w-full p-6 shadow-xl border border-[#D9DEE7] dark:border-[#2D3545] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545]">
              <div className="flex items-center gap-2">
                {getTypeIcon(previewResource.type)}
                <h3 className="text-base font-bold text-[#1F2937] dark:text-white dark:text-white dark:text-white truncate">{previewResource.title}</h3>
              </div>
              <button
                onClick={() => setPreviewResource(null)}
                className="p-1 text-[#5B6472] dark:text-gray-400 dark:text-gray-400 dark:text-gray-400 hover:bg-gray-100 rounded-lg cursor-pointer"
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
                <div className="bg-gray-50 dark:bg-[#1C212B] dark:bg-[#1C212B] dark:bg-[#1C212B] p-4 rounded-xl border border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 whitespace-pre-wrap leading-relaxed font-sans text-xs text-[#1F2937] dark:text-white dark:text-white dark:text-white">
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

            <div className="pt-3 border-t border-[#D9DEE7] dark:border-[#2D3545] dark:border-[#2D3545] dark:border-[#2D3545] flex justify-end">
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
